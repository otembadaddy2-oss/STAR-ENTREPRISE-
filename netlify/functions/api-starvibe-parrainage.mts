// KOMYO — Parrainage.
// Membre (GET)            : mon code, mon lien, mes amis connectés ce mois-ci, ma place, mes médailles gagnées.
// Équipe (GET ?equipe=1)  : classement du mois (?mois=AAAA-MM), avec les 3 médailles et le bouton « envoyer le message ».
// Équipe (POST)           : { action: "envoyer", mois, rang } → message de félicitations dans la messagerie du gagnant (une seule fois par mois et par rang).
// Aucune activation automatique de l'avantage : l'équipe le choisit ensuite avec le gagnant.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { poster } from "./_msg.mts";
import { MIN_AMIS, MEDAILLES, classement, codeDe, moisLocal, moisValide } from "./_parrainage.mts";

const masque = (t: string) => { const d = String(t || "").replace(/\D/g, ""); return d.length >= 6 ? `…${d.slice(-4)}` : "—"; };
const deMed = (n: string) => (n === "bronze" ? "de bronze" : n === "argent" ? "d'argent" : "d'or");
const base = () => (process.env.URL || "https://komyo.starentreprise.com").replace(/\/$/, "");

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);
  const url = new URL(req.url);
  const equipe = session.org === "star_entreprise";

  // ---------- ÉQUIPE ----------
  if (url.searchParams.get("equipe") === "1" || req.method === "POST") {
    if (!equipe) return json({ error: "Non autorisé" }, 403);
    if (req.method === "GET") {
      const mois = moisValide(url.searchParams.get("mois") || "") ? String(url.searchParams.get("mois")) : moisLocal();
      const cl = await classement(sql, mois);
      const envoyes = (await sql`SELECT rang, account_id FROM starvibe_parrainage_gagnants WHERE mois = ${mois}`) as { rang: number; account_id: number }[];
      let place = 0;
      const lignes = cl.slice(0, 20).map((l) => {
        const classe = l.amis >= MIN_AMIS;
        const rang = classe ? ++place : 0;
        const m = rang >= 1 && rang <= 3 ? MEDAILLES[rang] : null;
        return { rang: rang || null, parrainId: l.parrainId, nom: l.nom, tel: masque(l.tel), amis: l.amis, classe, medaille: m ? m.nom : null, jours: m ? m.jours : null, dejaEnvoye: !!(rang && envoyes.find((e) => e.rang === rang && e.account_id === l.parrainId)) };
      });
      return json({ mois, minimum: MIN_AMIS, lignes });
    }
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
    if (body.action !== "envoyer") return json({ error: "Action inconnue" }, 400);
    const mois = moisValide(String(body.mois || "")) ? String(body.mois) : "";
    const rang = Number(body.rang);
    if (!mois || !(rang >= 1 && rang <= 3)) return json({ error: "Mois ou rang invalide" }, 400);
    const cl = (await classement(sql, mois)).filter((l) => l.amis >= MIN_AMIS);
    const g = cl[rang - 1];
    if (!g) return json({ error: `Personne n'est encore ${rang === 1 ? "1er" : rang + "e"} avec au moins ${MIN_AMIS} amis connectés ce mois-là.` }, 409);
    const med = MEDAILLES[rang];
    const ins = (await sql`INSERT INTO starvibe_parrainage_gagnants (mois, rang, account_id, amis) VALUES (${mois}, ${rang}, ${g.parrainId}, ${g.amis}) ON CONFLICT DO NOTHING RETURNING rang`) as unknown[];
    if (!ins.length) return json({ error: "Le message de ce rang a déjà été envoyé pour ce mois." }, 409);
    const [annee, mm] = mois.split("-");
    const nomMois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][Number(mm) - 1];
    await poster(sql, g.parrainId, {
      kind: "info",
      titre: `${med.emoji} Médaille ${deMed(med.nom)} KOMYO : bravo !`,
      texte: `Bravo ${g.nom || ""} ! En ${nomMois} ${annee}, ${g.amis} de tes amis se sont connectés sur KOMYO grâce à toi : tu es n°${rang} du classement du parrainage et tu gagnes la médaille ${deMed(med.nom)} ${med.emoji}.\n\nTon avantage : ${med.jours} jours de Pack « Les bonnes habitudes » (PIOUPIOU), ou un autre avantage que nous choisirons ensemble. L'équipe KOMYO va te contacter pour te le remettre : rien ne s'active sans toi.\nMerci d'avoir fait grandir KOMYO !`,
      lien: `${base()}/starvibe/parrainage.html`,
    });
    return json({ ok: true, rang, medaille: med.nom, jours: med.jours, parrainId: g.parrainId });
  }

  // ---------- MEMBRE ----------
  if (session.org !== "star_vibe") return json({ error: "Non authentifié" }, 401);
  const accountId = Number(session.sub);
  const code = await codeDe(sql, accountId);
  const mois = moisLocal();
  const cl = await classement(sql, mois);
  const moi = cl.find((l) => l.parrainId === accountId);
  const amis = moi ? moi.amis : 0;
  const qualifies = cl.filter((l) => l.amis >= MIN_AMIS);
  const idx = qualifies.findIndex((l) => l.parrainId === accountId);
  const gagnees = (await sql`SELECT mois, rang, amis FROM starvibe_parrainage_gagnants WHERE account_id = ${accountId} ORDER BY mois DESC LIMIT 24`) as { mois: string; rang: number; amis: number }[];
  return json({
    code, lien: `${base()}/starvibe/inscription.html?ref=${code}`, mois, minimum: MIN_AMIS, amis, restants: Math.max(0, MIN_AMIS - amis),
    rang: idx >= 0 ? idx + 1 : null,
    medailles: gagnees.map((g) => ({ mois: g.mois, rang: g.rang, medaille: MEDAILLES[g.rang]?.nom || "", jours: MEDAILLES[g.rang]?.jours || 0, amis: g.amis })),
  });
};

export const config: Config = { path: "/api/starvibe-parrainage" };
