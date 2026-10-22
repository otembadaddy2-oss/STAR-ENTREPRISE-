// KOMYO — suivi des installations de l'application (abonnés), pour le backend STAR ENTREPRISE.
//
// - POST (public, appelé en silence par la page) : "installed" quand le navigateur annonce
//   l'installation, "launch" quand KOMYO est ouverte comme une application (iPhone compris,
//   qui n'annonce rien), "link" quand une personne se connecte après coup. Une ligne par
//   appareil. Le nom et le numéro ne viennent QUE du compte connecté (jeton) : le client ne
//   peut pas en envoyer lui-même.
// - GET ?stats=1 (staff) : toutes les installations + les compteurs, pour le tableau de bord et l'Excel.
import type { Context, Config } from "@netlify/functions";
import { createHash } from "node:crypto";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

const ORG = "star_vibe";
const GUEST_ORG = "keydou_guest";
const STAFF_ORG = "star_entreprise";
const MAX_NEUFS_PAR_HEURE = 25; // nouveaux appareils par connexion Internet (un cybercafé, un bureau…)

type Row = Record<string, unknown>;

function clean(v: unknown, max: number): string {
  return String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
}

// Appareil et navigateur déduits de l'en-tête User-Agent (rien d'autre n'est gardé de cet en-tête).
function appareil(ua: string): { platform: string; navigateur: string } {
  let platform = "Autre";
  if (/iPad/.test(ua)) platform = "iPad";
  else if (/iPhone|iPod/.test(ua)) platform = "iPhone";
  else if (/Android/i.test(ua)) platform = /Mobile/i.test(ua) ? "Android (téléphone)" : "Android (tablette)";
  else if (/CrOS/.test(ua)) platform = "Chromebook";
  else if (/Windows/.test(ua)) platform = "Windows";
  else if (/Macintosh/.test(ua)) platform = /Mobile/.test(ua) ? "iPad" : "Mac";
  else if (/Linux/.test(ua)) platform = "Linux";
  let navigateur = "Autre";
  if (/EdgiOS|EdgA|Edg\//.test(ua)) navigateur = "Edge";
  else if (/SamsungBrowser/.test(ua)) navigateur = "Samsung Internet";
  else if (/OPR\/|OPiOS|Opera/.test(ua)) navigateur = "Opera";
  else if (/FxiOS|Firefox/.test(ua)) navigateur = "Firefox";
  else if (/CriOS|Chrome/.test(ua)) navigateur = "Chrome";
  else if (/Safari/.test(ua)) navigateur = "Safari";
  return { platform, navigateur };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const sql = db();
  const url = new URL(req.url);

  // --- Staff : le tableau de bord des abonnés, en direct ---
  if (req.method === "GET") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
    const limit = Math.min(10000, Math.max(1, Number(url.searchParams.get("limit")) || 5000));
    const rows = (await sql`
      SELECT id, install_id, source, platform, navigateur, invite, nom, telephone, ville, launches, installed_at, last_seen, account_id
      FROM starvibe_installs ORDER BY installed_at DESC LIMIT ${limit}
    `) as Row[];
    const cpt = (await sql`
      SELECT
        COUNT(*) FILTER (WHERE guest = false) AS comptes,
        COUNT(*) FILTER (WHERE guest = true) AS invites
      FROM starvibe_accounts
    `) as { comptes: string; invites: string }[];
    return json({
      now: new Date().toISOString(),
      comptesKomyo: Number(cpt[0]?.comptes || 0),
      clientsKeydouSansCompte: Number(cpt[0]?.invites || 0),
      installs: rows.map((r) => ({
        id: String(r.id), date: r.installed_at, derniere: r.last_seen, ouvertures: Number(r.launches || 0),
        appareil: r.platform, navigateur: r.navigateur, nom: r.nom || "", telephone: r.telephone || "", ville: r.ville || "",
        origine: r.account_id ? (r.invite ? "Client Keydou (sans compte)" : "Compte KOMYO") : "Pas encore identifié",
        via: r.source === "installed" ? "Installation annoncée" : "Ouverte en application",
      })),
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { return json({ error: "JSON invalide" }, 400); }
  const installId = clean(body.installId, 64);
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(installId)) return json({ error: "Identifiant invalide" }, 400);
  const event = clean(body.event, 12);
  if (!["installed", "launch", "link"].includes(event)) return json({ error: "Événement inconnu" }, 400);

  const { platform, navigateur } = appareil(req.headers.get("user-agent") || "");

  // Identité : uniquement depuis le jeton (compte KOMYO ou client Keydou sans compte).
  let accountId: number | null = null, invite = false, nom = "", telephone = "", ville = "";
  const session = await requireAuth(req);
  if (session && (session.org === ORG || session.org === GUEST_ORG)) {
    const a = (await sql`
      SELECT a.id, a.telephone, a.ville, a.guest, a.guest_nom, a.guest_tel, p.nom AS profil_nom
      FROM starvibe_accounts a
      LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil = 'personnel'
      WHERE a.id = ${Number(session.sub)} LIMIT 1
    `) as Row[];
    if (a[0]) {
      accountId = Number(a[0].id);
      invite = Boolean(a[0].guest);
      nom = clean(invite ? a[0].guest_nom : a[0].profil_nom, 120);
      telephone = clean(invite ? a[0].guest_tel : a[0].telephone, 30);
      ville = clean(a[0].ville, 40);
    }
  }

  const ipBrute = clean(req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "", 60);
  const ipHash = ipBrute ? createHash("sha256").update(ipBrute + ":" + (process.env.JWT_SECRET || "")).digest("hex").slice(0, 24) : "";

  const existe = (await sql`SELECT id FROM starvibe_installs WHERE install_id = ${installId} LIMIT 1`) as Row[];
  if (!existe[0]) {
    if (ipHash) {
      const n = (await sql`SELECT COUNT(*) AS n FROM starvibe_installs WHERE ip_hash = ${ipHash} AND installed_at > now() - interval '1 hour'`) as { n: string }[];
      if (Number(n[0]?.n) >= MAX_NEUFS_PAR_HEURE) return json({ ok: true }); // on ignore sans le dire
    }
    await sql`
      INSERT INTO starvibe_installs (install_id, source, platform, navigateur, account_id, invite, nom, telephone, ville, launches, ip_hash)
      VALUES (${installId}, ${event === "installed" ? "installed" : "launch"}, ${platform}, ${navigateur}, ${accountId}, ${invite}, ${nom}, ${telephone}, ${ville}, ${event === "launch" ? 1 : 0}, ${ipHash})
    `;
    return json({ ok: true });
  }

  await sql`
    UPDATE starvibe_installs SET
      last_seen = now(),
      launches = launches + ${event === "launch" ? 1 : 0},
      source = CASE WHEN ${event} = 'installed' THEN 'installed' ELSE source END,
      platform = ${platform}, navigateur = ${navigateur},
      account_id = COALESCE(${accountId}, account_id),
      invite = CASE WHEN ${accountId}::int IS NULL THEN invite ELSE ${invite} END,
      nom = CASE WHEN ${nom} <> '' THEN ${nom} ELSE nom END,
      telephone = CASE WHEN ${telephone} <> '' THEN ${telephone} ELSE telephone END,
      ville = CASE WHEN ${ville} <> '' THEN ${ville} ELSE ville END
    WHERE install_id = ${installId}
  `;
  return json({ ok: true });
};

export const config: Config = {
  path: "/api/starvibe-installs",
};
