// MYO — le système d'invitation de KOMYO : on invite quelqu'un à le suivre et à devenir ami.
// La personne invitée reçoit automatiquement un petit message (Oui / Non). Oui = vous êtes amis ; Non = l'invitation est refusée.
//
// Règles de sécurité :
//  - seuls les profils personnels peuvent inviter et être invités (jamais les profils enfants PIOUPIOU) ;
//  - pas d'invitation entre un adulte (18 ans et +) et un mineur ;
//  - après un refus, la même personne ne peut pas réinviter pendant 30 jours ;
//  - 30 invitations au maximum par 24 heures et par compte.
//
// GET  ?recues=1 | ?amis=1 | ?envoyees=1 | ?etat=<profilId> | ?chercher=<texte>
// POST { action: "inviter", profilId } | { action: "repondre", id, reponse: "oui"|"non" } | { action: "retirer", profilId }
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

const ORG = "star_vibe";
const MAX_PAR_JOUR = 30;
const JOURS_APRES_REFUS = 30;

function clean(v: unknown, n: number): string { return String(v ?? "").trim().slice(0, n); }
function ageFromDate(dateStr: string): number | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
const photoUrl = (k: string | null | undefined) => (k ? `/api/starvibe-photo?key=${encodeURIComponent(k)}` : null);

interface Perso { id: number; account_id: number; nom: string; date_naissance: string; photo_key: string | null }

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const sql = db();
  const session = await requireAuth(req);
  if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
  const moi = Number(session.sub);
  const url = new URL(req.url);

  const monProfil = async (): Promise<Perso | null> => {
    const r = (await sql`SELECT id, account_id, nom, date_naissance, photo_key FROM starvibe_profiles WHERE account_id = ${moi} AND type_profil = 'personnel' ORDER BY id ASC LIMIT 1`) as Perso[];
    return r[0] || null;
  };
  const profilParId = async (id: number): Promise<Perso | null> => {
    const r = (await sql`SELECT id, account_id, nom, date_naissance, photo_key FROM starvibe_profiles WHERE id = ${id} AND type_profil = 'personnel' LIMIT 1`) as Perso[];
    return r[0] || null;
  };
  const adulte = (p: Perso): boolean | null => { const a = ageFromDate(p.date_naissance); return a === null ? null : a >= 18; };
  const compatibles = (a: Perso, b: Perso): boolean => { const x = adulte(a), y = adulte(b); return x !== null && y !== null && x === y; };

  type Ligne = { id: number; de_account: number; vers_account: number; statut: string; created_at: string; repondu_at: string | null };
  const entre = async (a: number, b: number): Promise<Ligne[]> =>
    (await sql`SELECT * FROM starvibe_myo WHERE (de_account = ${a} AND vers_account = ${b}) OR (de_account = ${b} AND vers_account = ${a})`) as Ligne[];
  const relation = (lignes: Ligne[]): string => {
    if (lignes.some((l) => l.statut === "acceptee")) return "amis";
    const rec = lignes.find((l) => l.vers_account === moi && l.statut === "en_attente");
    if (rec) return "recue";
    const env = lignes.find((l) => l.de_account === moi && l.statut === "en_attente");
    if (env) return "envoyee";
    const ref = lignes.find((l) => l.de_account === moi && l.statut === "refusee" && l.repondu_at && Date.now() - new Date(l.repondu_at).getTime() < JOURS_APRES_REFUS * 86400000);
    if (ref) return "attente";   // refusée récemment : on n'écrit pas « refusée » à l'inviteur
    return "aucune";
  };

  // ---------------- lecture ----------------
  if (req.method === "GET") {
    if (url.searchParams.get("recues")) {
      const rows = (await sql`
        SELECT m.id, m.created_at, p.id AS profil_id, p.nom, p.photo_key
        FROM starvibe_myo m
        JOIN starvibe_profiles p ON p.account_id = m.de_account AND p.type_profil = 'personnel'
        WHERE m.vers_account = ${moi} AND m.statut = 'en_attente'
        ORDER BY m.id DESC LIMIT 20
      `) as { id: number; created_at: string; profil_id: number; nom: string; photo_key: string | null }[];
      return json({ invitations: rows.map((r) => ({ id: r.id, createdAt: r.created_at, de: { profilId: r.profil_id, nom: r.nom, photoUrl: photoUrl(r.photo_key) } })) });
    }
    if (url.searchParams.get("amis")) {
      const rows = (await sql`
        SELECT m.repondu_at, p.id AS profil_id, p.nom, p.photo_key
        FROM starvibe_myo m
        JOIN starvibe_profiles p ON p.type_profil = 'personnel' AND p.account_id = CASE WHEN m.de_account = ${moi} THEN m.vers_account ELSE m.de_account END
        WHERE (m.de_account = ${moi} OR m.vers_account = ${moi}) AND m.statut = 'acceptee'
        ORDER BY p.nom ASC LIMIT 500
      `) as { repondu_at: string; profil_id: number; nom: string; photo_key: string | null }[];
      return json({ amis: rows.map((r) => ({ profilId: r.profil_id, nom: r.nom, photoUrl: photoUrl(r.photo_key), depuis: r.repondu_at })) });
    }
    if (url.searchParams.get("envoyees")) {
      const rows = (await sql`
        SELECT m.id, m.created_at, p.id AS profil_id, p.nom, p.photo_key
        FROM starvibe_myo m
        JOIN starvibe_profiles p ON p.account_id = m.vers_account AND p.type_profil = 'personnel'
        WHERE m.de_account = ${moi} AND m.statut = 'en_attente'
        ORDER BY m.id DESC LIMIT 50
      `) as { id: number; created_at: string; profil_id: number; nom: string; photo_key: string | null }[];
      return json({ envoyees: rows.map((r) => ({ id: r.id, createdAt: r.created_at, a: { profilId: r.profil_id, nom: r.nom, photoUrl: photoUrl(r.photo_key) } })) });
    }
    const etat = Number(url.searchParams.get("etat"));
    if (etat) {
      const cible = await profilParId(etat);
      if (!cible) return json({ etat: "inconnu" });
      if (cible.account_id === moi) return json({ etat: "moi" });
      return json({ etat: relation(await entre(moi, cible.account_id)) });
    }
    const q = clean(url.searchParams.get("chercher"), 40);
    if (q) {
      if (q.length < 2) return json({ profils: [] });
      const mien = await monProfil();
      const motif = `%${q.replace(/[%_\\]/g, "")}%`;
      const rows = (await sql`
        SELECT id, account_id, nom, date_naissance, photo_key FROM starvibe_profiles
        WHERE type_profil = 'personnel' AND account_id <> ${moi} AND nom ILIKE ${motif}
        ORDER BY nom ASC LIMIT 20
      `) as Perso[];
      const out = [];
      for (const p of rows) {
        if (mien && !compatibles(mien, p)) continue;
        out.push({ profilId: p.id, nom: p.nom, photoUrl: photoUrl(p.photo_key), etat: relation(await entre(moi, p.account_id)) });
        if (out.length >= 10) break;
      }
      return json({ profils: out });
    }
    return json({ error: "Demande inconnue" }, 400);
  }

  // ---------------- actions ----------------
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* corps vide */ }
  const action = clean(body.action, 20);
  const mien = await monProfil();
  if (!mien) return json({ error: "Il faut un profil personnel pour utiliser Myo." }, 403);

  if (action === "inviter") {
    const cible = await profilParId(Number(body.profilId));
    if (!cible) return json({ error: "Personne introuvable." }, 404);
    if (cible.account_id === moi) return json({ error: "Tu ne peux pas t'inviter toi-même." }, 400);
    if (!compatibles(mien, cible)) return json({ error: "Les invitations entre adultes et mineurs ne sont pas possibles sur KOMYO." }, 403);
    const lignes = await entre(moi, cible.account_id);
    const rel = relation(lignes);
    if (rel === "amis") return json({ etat: "amis" });
    if (rel === "envoyee") return json({ etat: "envoyee" });
    if (rel === "attente") return json({ error: "Invitation impossible pour le moment. Réessaie plus tard." }, 429);
    const jour = (await sql`SELECT COUNT(*)::int AS n FROM starvibe_myo WHERE de_account = ${moi} AND created_at > now() - interval '24 hours'`) as { n: number }[];
    if ((jour[0]?.n || 0) >= MAX_PAR_JOUR) return json({ error: "Tu as envoyé beaucoup d'invitations aujourd'hui. Réessaie demain." }, 429);
    // la personne m'avait déjà invité : on devient amis tout de suite
    const inverse = lignes.find((l) => l.de_account === cible.account_id && l.vers_account === moi && l.statut === "en_attente");
    if (inverse) {
      await sql`UPDATE starvibe_myo SET statut = 'acceptee', repondu_at = now() WHERE id = ${inverse.id}`;
      return json({ etat: "amis" });
    }
    await sql`
      INSERT INTO starvibe_myo (de_account, vers_account) VALUES (${moi}, ${cible.account_id})
      ON CONFLICT (de_account, vers_account) DO UPDATE SET statut = 'en_attente', created_at = now(), repondu_at = NULL
    `;
    return json({ etat: "envoyee" }, 201);
  }

  if (action === "repondre") {
    const id = Number(body.id), reponse = clean(body.reponse, 5).toLowerCase();
    if (!id || (reponse !== "oui" && reponse !== "non")) return json({ error: "Réponse invalide." }, 400);
    const r = (await sql`SELECT * FROM starvibe_myo WHERE id = ${id} AND vers_account = ${moi} AND statut = 'en_attente' LIMIT 1`) as Ligne[];
    if (!r[0]) return json({ error: "Cette invitation n'existe plus." }, 404);
    await sql`UPDATE starvibe_myo SET statut = ${reponse === "oui" ? "acceptee" : "refusee"}, repondu_at = now() WHERE id = ${id}`;
    return json({ etat: reponse === "oui" ? "amis" : "refusee" });
  }

  if (action === "retirer") {
    const cible = await profilParId(Number(body.profilId));
    if (!cible) return json({ error: "Personne introuvable." }, 404);
    await sql`DELETE FROM starvibe_myo WHERE statut = 'acceptee' AND ((de_account = ${moi} AND vers_account = ${cible.account_id}) OR (de_account = ${cible.account_id} AND vers_account = ${moi}))`;
    return json({ etat: "aucune" });
  }

  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = {
  path: "/api/starvibe-myo",
};
