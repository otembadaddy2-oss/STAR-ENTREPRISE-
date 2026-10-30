// ANNONCES KOMYO — un petit message qui défile en bas de l'écran de tous les abonnés connectés, au même moment, quelques secondes,
// pendant la durée payée : 1 semaine d'essai (2 000 FCFA), 2 semaines (4 000 FCFA) ou 1 mois (10 000 FCFA). Pensé pour la promotion de musique, d'événements, de boutiques…
//
// Règles :
//  - le message est affiché SEULEMENT après paiement confirmé par le staff (montant EXACT) ET relecture du texte par le staff ;
//  - réservé aux personnes de 18 ans et + ; jamais affiché dans PIOUPIOU ;
//  - toutes les applications calculent à partir de l'heure du serveur quelle annonce s'affiche : même annonce, même moment, partout.
//
// GET  ?actives=1 | ?plans=1 | ?mes=1 | ?admin=1 (staff)
// POST { action: "creer", texte, lien, categorie, plan } | { action: "confirmer", pubId, montantRecu, reference } (staff) | { action: "refuser", pubId, motif } (staff)
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { recuAnnonce } from "./_recu.mts";

const ORG = "star_vibe";
const STAFF_ORG = "star_entreprise";
const NUMERO_RECEPTION = "+242 06 656 50 50";
const PLANS: Record<string, { label: string; jours: number; montant: number }> = {
  une_semaine: { label: "1 semaine (essai)", jours: 7, montant: 2000 },
  deux_semaines: { label: "2 semaines", jours: 14, montant: 4000 },
  un_mois: { label: "1 mois", jours: 30, montant: 10000 },
};
const CATEGORIES = ["musique", "evenement", "business", "autre"];
const CYCLE_SEC = 45;   // une annonce s'affiche toutes les 45 secondes…
const MONTRE_SEC = 9;   // …pendant 9 secondes

function clean(v: unknown, n: number): string { return String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n); }
function ageFromDate(dateStr: string): number | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
// lien autorisé : page KOMYO (relative) ou adresse https
function lienValide(l: string): boolean { return l === "" || /^https:\/\/[^\s]{4,190}$/.test(l) || /^(fil|eclat|myo|pioupiou|promouvoir)\.html(\?[a-z0-9=&_-]{0,60})?$/i.test(l); }

interface PubRow { id: number; account_id: number; texte: string; lien: string; categorie: string; plan: string; jours: number; montant_attendu: number; montant_recu: number | null; statut: string; refus_motif: string; started_at: string | null; expires_at: string | null; created_at: string; telephone?: string; auteur_nom?: string }
const toApi = (r: PubRow) => ({ id: r.id, texte: r.texte, lien: r.lien, categorie: r.categorie, plan: r.plan, planLabel: PLANS[r.plan]?.label || r.plan, jours: r.jours, montantAttendu: r.montant_attendu, statut: r.statut, refusMotif: r.refus_motif, startedAt: r.started_at, expiresAt: r.expires_at, createdAt: r.created_at, referencePaiement: `PUB-${r.id}`, numeroReception: NUMERO_RECEPTION });

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const sql = db();
  const url = new URL(req.url);

  // ---------- côté staff ----------
  const estStaff = async () => { const s = await requireAuth(req); return s && s.org === STAFF_ORG ? s : null; };

  if (req.method === "GET" && url.searchParams.get("admin") === "1") {
    if (!(await estStaff())) return json({ error: "Non autorisé" }, 403);
    const rows = (await sql`
      SELECT g.*, a.telephone, p.nom AS auteur_nom FROM starvibe_pub g
      JOIN starvibe_accounts a ON a.id = g.account_id
      LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil = 'personnel'
      WHERE g.statut = 'en_attente_paiement' ORDER BY g.created_at ASC LIMIT 50
    `) as PubRow[];
    return json({ annonces: rows.map((r) => ({ ...toApi(r), telephone: r.telephone, auteur: r.auteur_nom || "" })) });
  }
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const action = clean(body.action, 20);
    if (action === "confirmer" || action === "refuser") {
      if (!(await estStaff())) return json({ error: "Non autorisé" }, 403);
      const pubId = Number(body.pubId);
      const r = (await sql`SELECT * FROM starvibe_pub WHERE id = ${pubId} LIMIT 1`) as PubRow[];
      if (!r[0]) return json({ error: "Annonce introuvable" }, 404);
      if (r[0].statut !== "en_attente_paiement") return json({ error: `Cette annonce est déjà « ${r[0].statut} »` }, 409);
      if (action === "refuser") {
        await sql`UPDATE starvibe_pub SET statut = 'refusee', refus_motif = ${clean(body.motif, 200)} WHERE id = ${pubId}`;
        return json({ statut: "refusee" });
      }
      const montantRecu = Math.round(Number(body.montantRecu));
      if (!Number.isFinite(montantRecu)) return json({ error: "montantRecu requis" }, 400);
      const valide = montantRecu === r[0].montant_attendu;   // montant EXACT, sinon rien ne s'active
      await sql`
        UPDATE starvibe_pub SET montant_recu = ${montantRecu}, reference_transaction = ${clean(body.reference, 120)},
          statut = ${valide ? "actif" : "paiement_invalide"},
          started_at = ${valide ? sql`now()` : null},
          expires_at = ${valide ? sql`now() + (${r[0].jours} * interval '1 day')` : null}
        WHERE id = ${pubId}
      `;
      if (valide) await recuAnnonce(sql, pubId, PLANS[r[0].plan]?.label || "");
      return json({ statut: valide ? "actif" : "paiement_invalide", message: valide ? `Annonce activée pour ${r[0].jours} jours.` : `Montant reçu (${montantRecu}) différent du montant attendu (${r[0].montant_attendu}) : annonce non activée.` });
    }
  }

  // ---------- côté abonné ----------
  const session = await requireAuth(req);
  if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
  const accountId = Number(session.sub);

  if (req.method === "GET") {
    if (url.searchParams.get("plans")) return json({ plans: PLANS, categories: CATEGORIES, numeroReception: NUMERO_RECEPTION, texteMax: 100 });
    if (url.searchParams.get("mes")) {
      const rows = (await sql`SELECT * FROM starvibe_pub WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 30`) as PubRow[];
      return json({ annonces: rows.map(toApi) });
    }
    if (url.searchParams.get("actives")) {
      const rows = (await sql`SELECT id, texte, lien, categorie FROM starvibe_pub WHERE statut = 'actif' AND expires_at > now() ORDER BY id ASC LIMIT 40`) as { id: number; texte: string; lien: string; categorie: string }[];
      return json({ now: Date.now(), cycleSec: CYCLE_SEC, montreSec: MONTRE_SEC, annonces: rows });
    }
    return json({ error: "Demande inconnue" }, 400);
  }

  if (req.method === "POST") {
    if (clean(body.action, 20) === "creer") {
      const texte = clean(body.texte, 100), lien = clean(body.lien, 200), plan = clean(body.plan, 20);
      const categorie = CATEGORIES.includes(clean(body.categorie, 20)) ? clean(body.categorie, 20) : "autre";
      if (texte.length < 6) return json({ error: "Écris un message d'au moins 6 caractères." }, 400);
      if (!PLANS[plan]) return json({ error: "Choisis une durée." }, 400);
      if (!lienValide(lien)) return json({ error: "Le lien doit commencer par https:// (ou être une page KOMYO)." }, 400);
      const prof = (await sql`SELECT date_naissance FROM starvibe_profiles WHERE account_id = ${accountId} AND type_profil = 'personnel' ORDER BY id ASC LIMIT 1`) as { date_naissance: string }[];
      const age = prof[0] ? ageFromDate(prof[0].date_naissance) : null;
      if (age === null || age < 18) return json({ error: "Les annonces sont réservées aux personnes de 18 ans et plus." }, 403);
      const enAttente = (await sql`SELECT COUNT(*)::int AS n FROM starvibe_pub WHERE account_id = ${accountId} AND statut = 'en_attente_paiement'`) as { n: number }[];
      if ((enAttente[0]?.n || 0) >= 5) return json({ error: "Tu as déjà 5 annonces en attente de paiement. Paie ou attends leur validation." }, 429);
      const p = PLANS[plan];
      const rows = (await sql`
        INSERT INTO starvibe_pub (account_id, texte, lien, categorie, plan, jours, montant_attendu)
        VALUES (${accountId}, ${texte}, ${lien}, ${categorie}, ${plan}, ${p.jours}, ${p.montant}) RETURNING *
      `) as PubRow[];
      return json({ annonce: toApi(rows[0]) }, 201);
    }
  }
  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = {
  path: "/api/starvibe-pub",
};
