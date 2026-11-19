// DISCUSSIONS KOMYO — messages entre amis Myo, avec notification sur le téléphone de l'ami (même si KOMYO est fermé).
//
// Règles de sécurité (les mêmes principes que Myo) :
//  - on ne s'écrit qu'entre AMIS Myo (invitation acceptée), jamais entre inconnus ;
//  - pour l'instant, réservé aux ADULTES (18 ans et plus) : DM_MINEURS = false (à ouvrir plus tard avec contrôle parental) ;
//  - aucune discussion dans un sens ou dans l'autre si l'un a bloqué l'autre (le blocage se fait par l'API Myo et met fin à l'amitié) ;
//  - limites contre le harcèlement : 30 messages par 10 minutes et 400 par jour et par personne ; 1 000 caractères par message ;
//  - signalement : l'équipe KOMYO est prévenue ; 3 personnes différentes qui signalent la même personne en 7 jours mettent son envoi en pause.
//
// GET  ?pushkey=1                    : clé publique pour activer les notifications.
// GET  ?conversations=1              : mes amis avec le dernier message et le nombre de non lus.
// GET  ?avec=<profilId>[&apres=<id>] : la discussion avec cet ami (les messages reçus passent en « lu »).
// GET  ?nonlus=1                     : nombre total de messages non lus (pastille).
// GET  ?photo=<clé>                  : une photo envoyée dans une discussion (réservée aux deux personnes de la discussion).
// POST { action: "envoyer", profilId, texte } | { action: "photo", profilId, image } | { action: "signaler", profilId, motif, joindre?: boolean } | { action: "notifier", subscription, label }
//
// Photos : le téléphone réduit l'image (1280 px, JPEG) avant l'envoi ; elle est rangée dans Netlify Blobs sous la clé « petit-grand/identifiant »
// (les deux numéros de compte) et le message contient seulement le repère [[photo:clé]]. Le « j'aime » KOMYO est le repère [[jaime]].
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { pushAll, vapidKeys } from "./_push.mts";
import { pushCompte } from "./_compagnon.mts";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

const ORG = "star_vibe";
const DM_MINEURS = false;
const LIMITE_10_MIN = 30;
const LIMITE_JOUR = 400;
const SIGNALEURS_POUR_PAUSE = 3;
const JOURS_SIGNALEMENT = 7;
const PHOTO_MAX_OCTETS = 2_000_000;        // après réduction sur le téléphone une photo fait ~150 à 400 Ko
const PHOTOS_PAR_JOUR = 40;
const RE_PHOTO = /^\[\[photo:(\d+-\d+\/[0-9a-f-]{36})\]\]$/;
let magasinTest: { get: (k: string, o?: unknown) => Promise<unknown>; set: (k: string, v: ArrayBuffer, o?: unknown) => Promise<unknown> } | null = null;
export function __utiliserMagasinPhotos(m: typeof magasinTest) { magasinTest = m; }   // pour les tests : pas de vrai stockage
const magasinPhotos = () => (magasinTest || getStore({ name: "dm-photos", consistency: "strong" })) as NonNullable<typeof magasinTest>;
// Ce que voit la liste / la notification à la place du repère technique.
const apercu = (t: string) => (RE_PHOTO.test(t) ? "📷 Photo" : t === "[[jaime]]" ? "👍 J'aime" : t);
function typeImage(b: Uint8Array): string | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

const photoUrl = (k: string | null | undefined) => (k ? `/api/starvibe-photo?key=${encodeURIComponent(k)}` : null);
function clean(v: unknown, n: number): string { return String(v ?? "").replace(/\u0000/g, "").trim().slice(0, n); }
function ageFromDate(dateStr: string): number | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

interface Perso { id: number; account_id: number; nom: string; date_naissance: string; photo_key: string | null }

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const session = await requireAuth(req);
  if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
  const moi = Number(session.sub);
  const url = new URL(req.url);

  const profilDe = async (account: number): Promise<Perso | null> => {
    const r = (await sql`SELECT id, account_id, nom, date_naissance, photo_key FROM starvibe_profiles WHERE account_id = ${account} AND type_profil = 'personnel' ORDER BY id ASC LIMIT 1`) as Perso[];
    return r[0] || null;
  };
  const profilParId = async (id: number): Promise<Perso | null> => {
    const r = (await sql`SELECT id, account_id, nom, date_naissance, photo_key FROM starvibe_profiles WHERE id = ${id} AND type_profil = 'personnel' LIMIT 1`) as Perso[];
    return r[0] || null;
  };
  const adulte = (p: Perso): boolean => { const a = ageFromDate(p.date_naissance); return a !== null && a >= 18; };
  const sontAmis = async (a: number, b: number): Promise<boolean> =>
    ((await sql`SELECT 1 AS x FROM starvibe_myo WHERE statut = 'acceptee' AND ((de_account = ${a} AND vers_account = ${b}) OR (de_account = ${b} AND vers_account = ${a})) LIMIT 1`) as unknown[]).length > 0;
  const bloques = async (a: number, b: number): Promise<boolean> =>
    ((await sql`SELECT 1 AS x FROM starvibe_blocks WHERE (blocker = ${a} AND blocked = ${b}) OR (blocker = ${b} AND blocked = ${a}) LIMIT 1`) as unknown[]).length > 0;
  const enPause = async (account: number): Promise<boolean> => {
    const r = (await sql`SELECT COUNT(DISTINCT de_account)::int AS n FROM starvibe_dm_signalements WHERE contre_account = ${account} AND created_at > now() - make_interval(days => ${JOURS_SIGNALEMENT})`) as { n: number }[];
    return (r[0]?.n || 0) >= SIGNALEURS_POUR_PAUSE;
  };
  // Peut-on discuter avec cette personne ? (mêmes conditions pour lire et pour écrire, sauf la pause d'envoi)
  const verifier = async (moiP: Perso, cible: Perso): Promise<{ ok: boolean; raison?: string; code?: string }> => {
    if (cible.account_id === moi) return { ok: false, raison: "Tu ne peux pas t'écrire à toi-même.", code: "soi" };
    if (await bloques(moi, cible.account_id)) return { ok: false, raison: "Cette discussion n'est pas disponible.", code: "bloque" };
    if (!(await sontAmis(moi, cible.account_id))) return { ok: false, raison: "Tu peux écrire uniquement à tes amis KOMYO. Invite cette personne d'abord.", code: "pas_amis" };
    if (!DM_MINEURS && !(adulte(moiP) && adulte(cible))) return { ok: false, raison: "Les discussions entre amis sont réservées pour l'instant aux personnes de 18 ans et plus.", code: "mineur" };
    return { ok: true };
  };

  const monProfil = await profilDe(moi);
  if (!monProfil) return json({ error: "Crée d'abord ton profil KOMYO." }, 403);

  if (req.method === "GET") {
    if (url.searchParams.get("pushkey")) return json({ publicKey: vapidKeys().publicKey });

    if (url.searchParams.get("nonlus")) {
      const r = (await sql`SELECT COUNT(*)::int AS n FROM starvibe_dm WHERE vers_account = ${moi} AND lu_at IS NULL`) as { n: number }[];
      return json({ nonLus: r[0]?.n || 0 });
    }

    if (url.searchParams.get("conversations")) {
      const autorise = DM_MINEURS || adulte(monProfil);
      if (!autorise) return json({ autorise: false, message: "Les discussions entre amis sont réservées pour l'instant aux personnes de 18 ans et plus.", conversations: [] });
      const rows = (await sql`
        SELECT p.id AS profil_id, p.nom, p.photo_key, p.account_id, p.date_naissance,
          (SELECT d.texte FROM starvibe_dm d WHERE (d.de_account = ${moi} AND d.vers_account = p.account_id) OR (d.de_account = p.account_id AND d.vers_account = ${moi}) ORDER BY d.id DESC LIMIT 1) AS dernier,
          (SELECT d.created_at FROM starvibe_dm d WHERE (d.de_account = ${moi} AND d.vers_account = p.account_id) OR (d.de_account = p.account_id AND d.vers_account = ${moi}) ORDER BY d.id DESC LIMIT 1) AS dernier_at,
          (SELECT d.de_account FROM starvibe_dm d WHERE (d.de_account = ${moi} AND d.vers_account = p.account_id) OR (d.de_account = p.account_id AND d.vers_account = ${moi}) ORDER BY d.id DESC LIMIT 1) AS dernier_de,
          (SELECT COUNT(*)::int FROM starvibe_dm d WHERE d.de_account = p.account_id AND d.vers_account = ${moi} AND d.lu_at IS NULL) AS non_lus
        FROM starvibe_myo m
        JOIN starvibe_profiles p ON p.account_id = (CASE WHEN m.de_account = ${moi} THEN m.vers_account ELSE m.de_account END) AND p.type_profil = 'personnel'
        WHERE m.statut = 'acceptee' AND (m.de_account = ${moi} OR m.vers_account = ${moi})
          AND NOT EXISTS (SELECT 1 FROM starvibe_blocks b WHERE (b.blocker = ${moi} AND b.blocked = p.account_id) OR (b.blocker = p.account_id AND b.blocked = ${moi}))
        LIMIT 200
      `) as { profil_id: number; nom: string; photo_key: string | null; account_id: number; date_naissance: string; dernier: string | null; dernier_at: string | null; dernier_de: number | null; non_lus: number }[];
      const liste = rows
        .filter((r) => DM_MINEURS || (ageFromDate(r.date_naissance) ?? 0) >= 18)
        .map((r) => ({ profilId: r.profil_id, nom: r.nom, photoUrl: photoUrl(r.photo_key), dernier: r.dernier ? { texte: apercu(String(r.dernier)).slice(0, 120), deMoi: r.dernier_de === moi, date: r.dernier_at } : null, nonLus: r.non_lus }))
        .sort((a, b) => (b.nonLus - a.nonLus) || (new Date(b.dernier?.date || 0).getTime() - new Date(a.dernier?.date || 0).getTime()) || a.nom.localeCompare(b.nom));
      return json({ autorise: true, conversations: liste });
    }

    if (url.searchParams.get("photo")) {
      const cle = String(url.searchParams.get("photo"));
      const m = /^(\d+)-(\d+)\/[0-9a-f-]{36}$/.exec(cle);
      if (!m || (Number(m[1]) !== moi && Number(m[2]) !== moi)) return json({ error: "Photo introuvable." }, 404);
      const autre = Number(m[1]) === moi ? Number(m[2]) : Number(m[1]);
      if (await bloques(moi, autre)) return json({ error: "Photo introuvable." }, 404);
      const blob = (await magasinPhotos().get(cle, { type: "arrayBuffer" })) as ArrayBuffer | null;
      if (!blob) return json({ error: "Photo introuvable." }, 404);
      const meta = typeImage(new Uint8Array(blob)) || "image/jpeg";
      return new Response(blob, { status: 200, headers: { "content-type": meta, "cache-control": "private, max-age=86400", "x-content-type-options": "nosniff" } });
    }

    if (url.searchParams.get("avec")) {
      const cible = await profilParId(Number(url.searchParams.get("avec")));
      if (!cible) return json({ error: "Personne introuvable." }, 404);
      const v = await verifier(monProfil, cible);
      if (!v.ok) return json({ error: v.raison, code: v.code }, 403);
      const apres = Math.max(0, Number(url.searchParams.get("apres")) || 0);
      const msgs = (await sql`
        SELECT id, de_account, texte, created_at, lu_at FROM starvibe_dm
        WHERE id > ${apres} AND ((de_account = ${moi} AND vers_account = ${cible.account_id}) OR (de_account = ${cible.account_id} AND vers_account = ${moi}))
        ORDER BY id ASC LIMIT 200
      `) as { id: number; de_account: number; texte: string; created_at: string; lu_at: string | null }[];
      await sql`UPDATE starvibe_dm SET lu_at = now() WHERE de_account = ${cible.account_id} AND vers_account = ${moi} AND lu_at IS NULL`;
      return json({
        ami: { profilId: cible.id, nom: cible.nom, photoUrl: photoUrl(cible.photo_key) },
        messages: msgs.map((m) => ({ id: m.id, moi: m.de_account === moi, texte: m.texte, date: m.created_at, lu: !!m.lu_at })),
        enPause: await enPause(moi),
      });
    }
    return json({ error: "Requête inconnue" }, 400);
  }

  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = String(body.action || "");

  // Activer les notifications sur ce téléphone (même table que les rappels de Keydou).
  if (action === "notifier") {
    const sub = (body.subscription || {}) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: "Abonnement invalide" }, 400);
    await sql`INSERT INTO starvibe_compagnon_push (account_id, endpoint, p256dh, auth, label) VALUES (${moi}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${clean(body.label, 60)})
      ON CONFLICT (endpoint) DO UPDATE SET account_id = ${moi}, p256dh = ${sub.keys.p256dh}, auth = ${sub.keys.auth}`;
    return json({ ok: true });
  }

  const cible = await profilParId(Number(body.profilId));
  if (!cible) return json({ error: "Personne introuvable." }, 404);

  // Enregistre un message (texte, photo ou « j'aime ») après toutes les vérifications, et prévient l'ami.
  const poster = async (stocke: string, extraLimite?: () => Promise<Response | null>): Promise<Response> => {
    const v = await verifier(monProfil, cible);
    if (!v.ok) return json({ error: v.raison, code: v.code }, 403);
    if (await enPause(moi)) return json({ error: "Ton envoi de messages est en pause le temps d'un contrôle par l'équipe KOMYO.", code: "pause" }, 403);
    const r10 = (await sql`SELECT COUNT(*)::int AS n FROM starvibe_dm WHERE de_account = ${moi} AND created_at > now() - interval '10 minutes'`) as { n: number }[];
    if ((r10[0]?.n || 0) >= LIMITE_10_MIN) return json({ error: "Doucement : trop de messages en peu de temps. Réessaie dans quelques minutes.", code: "limite" }, 429);
    const rj = (await sql`SELECT COUNT(*)::int AS n FROM starvibe_dm WHERE de_account = ${moi} AND created_at > now() - interval '24 hours'`) as { n: number }[];
    if ((rj[0]?.n || 0) >= LIMITE_JOUR) return json({ error: "Tu as atteint la limite de messages pour aujourd'hui. Reviens demain.", code: "limite_jour" }, 429);
    if (extraLimite) { const refus = await extraLimite(); if (refus) return refus; }
    const ins = (await sql`INSERT INTO starvibe_dm (de_account, vers_account, texte) VALUES (${moi}, ${cible.account_id}, ${stocke}) RETURNING id, created_at`) as { id: number; created_at: string }[];
    // La notification ne bloque jamais l'envoi : si elle échoue, le message est quand même là.
    let notifie = 0;
    const court = apercu(stocke);
    try {
      notifie = await pushCompte(sql, cible.account_id, { title: monProfil.nom, body: court.length > 90 ? court.slice(0, 90) + "…" : court, tag: `dm-${monProfil.id}`, url: `/starvibe/discussions.html?avec=${monProfil.id}` });
    } catch (e) { console.error("notification message", e); }
    return json({ ok: true, message: { id: ins[0].id, moi: true, texte: stocke, date: ins[0].created_at, lu: false }, notifie: notifie > 0 });
  };

  if (action === "envoyer") {
    let texte = clean(body.texte, 1000);
    if (!texte) return json({ error: "Écris un message.", code: "vide" }, 400);
    // Seul le « j'aime » KOMYO est un repère autorisé : un repère de photo ne peut venir que du téléchargement d'une vraie photo.
    if (texte !== "[[jaime]]") texte = texte.replace(/\[\[/g, "[ [");
    return poster(texte);
  }

  if (action === "photo") {
    const brut = String(body.image || "");
    const m = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(brut);
    if (!m) return json({ error: "Photo non valide.", code: "photo" }, 400);
    const octets = Uint8Array.from(Buffer.from(m[1], "base64"));
    if (octets.length > PHOTO_MAX_OCTETS) return json({ error: "Photo trop lourde. Réessaie avec une autre photo.", code: "photo_lourde" }, 413);
    const mime = typeImage(octets);
    if (!mime) return json({ error: "Photo non valide.", code: "photo" }, 400);
    const a = Math.min(moi, cible.account_id), b = Math.max(moi, cible.account_id);
    const cle = `${a}-${b}/${randomUUID()}`;
    return poster(`[[photo:${cle}]]`, async () => {
      const rp = (await sql`SELECT COUNT(*)::int AS n FROM starvibe_dm WHERE de_account = ${moi} AND texte LIKE '[[photo:%' AND created_at > now() - interval '24 hours'`) as { n: number }[];
      if ((rp[0]?.n || 0) >= PHOTOS_PAR_JOUR) return json({ error: "Tu as envoyé beaucoup de photos aujourd'hui. Reviens demain.", code: "photos_jour" }, 429);
      await magasinPhotos().set(cle, octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer, { metadata: { typeMime: mime, de: moi } });
      return null;
    });
  }

  if (action === "signaler") {
    if (cible.account_id === moi) return json({ error: "Personne introuvable." }, 404);
    const motif = clean(body.motif, 300);
    // On ne peut signaler que quelqu'un avec qui on a une discussion (reçue ou envoyée) : évite les signalements en masse sur des inconnus.
    const lien = (await sql`SELECT 1 AS x FROM starvibe_dm WHERE (de_account = ${moi} AND vers_account = ${cible.account_id}) OR (de_account = ${cible.account_id} AND vers_account = ${moi}) LIMIT 1`) as unknown[];
    if (!lien.length) return json({ error: "Tu ne peux signaler que quelqu'un avec qui tu as discuté." }, 400);
    let extrait = "";
    if (body.joindre === true) {
      const l = (await sql`SELECT de_account, texte, created_at FROM starvibe_dm WHERE (de_account = ${moi} AND vers_account = ${cible.account_id}) OR (de_account = ${cible.account_id} AND vers_account = ${moi}) ORDER BY id DESC LIMIT 10`) as { de_account: number; texte: string; created_at: string }[];
      extrait = l.reverse().map((m) => `${m.de_account === moi ? "Moi" : cible.nom} : ${RE_PHOTO.test(m.texte) ? "[photo]" : m.texte}`).join("\n").slice(0, 4000);
    }
    await sql`INSERT INTO starvibe_dm_signalements (de_account, contre_account, motif, extrait) VALUES (${moi}, ${cible.account_id}, ${motif}, ${extrait})`;
    const n = (await sql`SELECT COUNT(DISTINCT de_account)::int AS n FROM starvibe_dm_signalements WHERE contre_account = ${cible.account_id} AND created_at > now() - make_interval(days => ${JOURS_SIGNALEMENT})`) as { n: number }[];
    try {
      await pushAll(sql, { title: "⚠️ Signalement d'un message KOMYO", body: `${monProfil.nom} signale ${cible.nom}${motif ? " : " + motif.slice(0, 80) : ""} (${n[0]?.n || 1} personne(s) en ${JOURS_SIGNALEMENT} jours)`, tag: "dm-signalement" });
    } catch (e) { console.error("alerte signalement", e); }
    return json({ ok: true, message: "Merci. L'équipe KOMYO va regarder. Tu peux aussi bloquer cette personne pour ne plus recevoir ses messages.", enPause: (n[0]?.n || 0) >= SIGNALEURS_POUR_PAUSE });
  }

  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = { path: "/api/starvibe-dm" };
