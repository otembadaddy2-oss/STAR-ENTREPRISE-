// KOMYO — tableau de bord en direct du Backend (staff STAR ENTREPRISE uniquement).
// Une seule requête GET renvoie : comptes, abonnés par offre, paiements en attente, revenus confirmés (aujourd'hui, 7 j, 30 j, total),
// installations, visites, vidéos, et le fil des derniers mouvements. La page l'actualise toute seule toutes les 10 secondes.
// Aucune donnée sensible : les numéros sont masqués dans le fil, aucune adresse IP, aucun code secret.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

const STAFF_ORG = "star_entreprise";

type Row = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0) || 0;
const masque = (t: unknown) => { const d = String(t ?? "").replace(/\D/g, ""); return d.length >= 6 ? `…${d.slice(-4)}` : "—"; };

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const staff = await requireAuth(req);
  if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
  await ensureSchema();
  const { sql } = db();

  const [comptes, parOffre, attentes, rev, inst, vis, vid, flux] = await Promise.all([
    sql`SELECT COUNT(*) FILTER (WHERE NOT guest) AS total,
               COUNT(*) FILTER (WHERE NOT guest AND created_at > now() - interval '24 hours') AS h24,
               COUNT(*) FILTER (WHERE NOT guest AND created_at > now() - interval '7 days') AS j7,
               COUNT(*) FILTER (WHERE guest) AS invites
        FROM starvibe_accounts`,
    sql`SELECT plan, COUNT(DISTINCT account_id) AS n FROM starvibe_subscriptions
        WHERE statut = 'actif' AND montant_attendu > 0 AND expires_at > now() GROUP BY plan`,
    sql`SELECT
          (SELECT COUNT(*) FROM starvibe_subscriptions WHERE statut = 'en_attente_paiement') AS abonnements,
          (SELECT COUNT(*) FROM starvibe_keydou_requests WHERE statut = 'en_attente_paiement') AS keydou,
          (SELECT COUNT(*) FROM starvibe_pub WHERE statut = 'en_attente_paiement') AS annonces,
          (SELECT COUNT(*) FROM starvibe_pin_resets WHERE statut = 'en_attente') AS pin`,
    sql`SELECT periode, source, SUM(m) AS total, COUNT(*) AS nb FROM (
          SELECT 'abonnement' AS source, montant_recu AS m, started_at AS t FROM starvibe_subscriptions WHERE statut = 'actif' AND montant_attendu > 0 AND started_at IS NOT NULL
          UNION ALL SELECT 'keydou', montant_recu, paid_at FROM starvibe_keydou_requests WHERE statut = 'paye' AND paid_at IS NOT NULL
          UNION ALL SELECT 'annonce', montant_recu, started_at FROM starvibe_pub WHERE statut = 'actif' AND started_at IS NOT NULL
        ) x, LATERAL (VALUES ('jour', t >= date_trunc('day', now())), ('j7', t > now() - interval '7 days'), ('j30', t > now() - interval '30 days'), ('total', true)) AS p(periode, ok)
        WHERE ok GROUP BY periode, source`,
    sql`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE installed_at > now() - interval '24 hours') AS h24,
               COUNT(*) FILTER (WHERE last_seen > now() - interval '15 minutes') AS en_ligne FROM starvibe_installs`,
    sql`SELECT COUNT(*) FILTER (WHERE jour = CURRENT_DATE) AS appareils_jour,
               COALESCE(SUM(pages) FILTER (WHERE jour = CURRENT_DATE), 0) AS pages_jour,
               COUNT(*) FILTER (WHERE derniere > now() - interval '5 minutes') AS en_ce_moment,
               COUNT(DISTINCT appareil) FILTER (WHERE jour > CURRENT_DATE - 7) AS appareils_7j,
               COALESCE(SUM(pages) FILTER (WHERE jour > CURRENT_DATE - 7), 0) AS pages_7j
        FROM starvibe_visites`,
    sql`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE moderation_statut = 'en_attente') AS a_moderer,
               COALESCE(SUM(vues_count), 0) AS vues, COALESCE(SUM(likes_count), 0) AS likes FROM starvibe_videos`,
    sql`SELECT * FROM (
          SELECT a.created_at AS t, 'compte' AS type, 'Nouveau compte ' || COALESCE(NULLIF(a.pays, ''), '') AS txt, a.telephone AS tel FROM starvibe_accounts a WHERE NOT a.guest
          UNION ALL SELECT s.started_at, 'abonnement', 'Abonnement ' || s.plan || ' payé : ' || s.montant_recu || ' FCFA', a.telephone FROM starvibe_subscriptions s JOIN starvibe_accounts a ON a.id = s.account_id WHERE s.statut = 'actif' AND s.montant_attendu > 0 AND s.started_at IS NOT NULL
          UNION ALL SELECT s.created_at, 'attente', 'Paiement en attente ' || s.plan || ' : ' || s.montant_attendu || ' FCFA', a.telephone FROM starvibe_subscriptions s JOIN starvibe_accounts a ON a.id = s.account_id WHERE s.statut = 'en_attente_paiement'
          UNION ALL SELECT k.paid_at, 'keydou', 'Demande Keydou payée : ' || k.montant_recu || ' FCFA', a.telephone FROM starvibe_keydou_requests k JOIN starvibe_accounts a ON a.id = k.account_id WHERE k.statut = 'paye' AND k.paid_at IS NOT NULL
          UNION ALL SELECT p.started_at, 'annonce', 'Annonce activée (' || p.jours || ' j) : ' || p.montant_recu || ' FCFA', a.telephone FROM starvibe_pub p JOIN starvibe_accounts a ON a.id = p.account_id WHERE p.statut = 'actif' AND p.started_at IS NOT NULL
          UNION ALL SELECT i.installed_at, 'install', 'Installation ' || i.platform, '' FROM starvibe_installs i
        ) e WHERE t IS NOT NULL ORDER BY t DESC LIMIT 40`,
  ]) as Row[][];

  const c = comptes[0] || {}, at = attentes[0] || {}, ins = inst[0] || {}, v = vis[0] || {}, vd = vid[0] || {};
  const revenus: Record<string, Record<string, number>> = { jour: {}, j7: {}, j30: {}, total: {} };
  for (const r of rev) { revenus[String(r.periode)][String(r.source)] = n(r.total); }
  for (const p of Object.keys(revenus)) revenus[p].tous = Object.values(revenus[p]).reduce((a, b) => a + b, 0);
  const offre = (p: string) => n((parOffre.find((r) => r.plan === p) || {}).n);

  return json({
    maintenant: new Date().toISOString(),
    comptes: { total: n(c.total), h24: n(c.h24), j7: n(c.j7), invitesKeydou: n(c.invites) },
    abonnes: { famille: offre("famille"), business: offre("business"), total: offre("famille") + offre("business") },
    enAttente: { abonnements: n(at.abonnements), keydou: n(at.keydou), annonces: n(at.annonces), pinOublies: n(at.pin) },
    revenusFcfa: revenus,
    installations: { total: n(ins.total), h24: n(ins.h24), enLigne: n(ins.en_ligne) },
    visites: { appareilsAujourdhui: n(v.appareils_jour), pagesAujourdhui: n(v.pages_jour), enCeMoment: n(v.en_ce_moment), appareils7j: n(v.appareils_7j), pages7j: n(v.pages_7j) },
    videos: { total: n(vd.total), aModerer: n(vd.a_moderer), vues: n(vd.vues), jaime: n(vd.likes) },
    flux: flux.map((r) => ({ at: r.t, type: r.type, texte: String(r.txt || "").trim(), tel: masque(r.tel) })),
  });
};

export const config: Config = {
  path: "/api/starvibe-dashboard",
};
