// KOMYO BUSINESS — BOUTIQUES (API). La logique est dans _boutique.mts.
// Public : GET ?liste=1[&service=…&ville=…] | GET ?id=N (boutique + articles)
// Vendeur (compte KOMYO) : GET ?ma=1 | POST { action: "ouvrir" | "article_ajouter" | "article_retirer" | "confirmer" | "annuler" | "frais_declarer" }
// Client (compte KOMYO) : POST { action: "commander", boutiqueId, lignes:[{articleId,qte}] } | { action: "declarer_paye", commandeId } | { action: "annuler", commandeId } | GET ?mes_commandes=1
// Staff : GET ?admin=1 | POST { action: "frais_confirmer", fraisId } | { action: "pause" | "reactiver", boutiqueId }
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { ouvrirBoutique, ajouterArticle, retirerArticle, creerCommande, declarerPaye, confirmerCommande, annulerCommande, genererFrais, declarerFrais, confirmerFrais, boutiqueOuverte, businessActif, SERVICES_BOUTIQUE, FRAIS_SEMAINE, NUMERO_KOMYO, propre } from "./_boutique.mts";
import { poster } from "./_msg.mts";

const ORG = "star_vibe";
const STAFF_ORG = "star_entreprise";
const rep = (r: { ok: boolean; error?: string; status?: number; data?: unknown }) => r.ok ? json({ ok: true, ...(r.data && typeof r.data === "object" ? (r.data as object) : {}) }) : json({ error: r.error }, r.status || 400);

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);
  const g = (k: string) => url.searchParams.get(k);

  // ----- public -----
  if (req.method === "GET" && g("liste") === "1") {
    const service = propre(g("service"), 30), ville = propre(g("ville"), 40);
    const rows = (await sql`
      SELECT b.id, b.nom, b.description, b.ville, b.services, (SELECT COUNT(*)::int FROM starvibe_articles a WHERE a.boutique_id = b.id AND a.actif) AS n_articles
      FROM starvibe_boutiques b
      WHERE b.statut = 'active'
        AND EXISTS (SELECT 1 FROM starvibe_subscriptions s WHERE s.account_id = b.account_id AND s.plan = 'business' AND s.statut = 'actif' AND s.montant_attendu > 0 AND s.expires_at > now())
        AND (${service} = '' OR b.services @> ${JSON.stringify([service])}::jsonb) AND (${ville} = '' OR lower(b.ville) = lower(${ville}))
      ORDER BY b.id DESC LIMIT 60
    `) as Record<string, unknown>[];
    return json({ services: SERVICES_BOUTIQUE, boutiques: rows.filter((r) => Number(r.n_articles) > 0).map((r) => ({ id: r.id, nom: r.nom, description: r.description, ville: r.ville, services: r.services, nArticles: r.n_articles })) });
  }
  if (req.method === "GET" && g("id")) {
    const id = Number(g("id"));
    const b = await boutiqueOuverte(sql, id);
    if (!b) return json({ error: "Cette boutique n'est pas ouverte pour le moment." }, 404);
    const info = ((await sql`SELECT nom, description, ville, services FROM starvibe_boutiques WHERE id = ${id}`) as Record<string, unknown>[])[0];
    const articles = (await sql`SELECT id, titre, description, prix FROM starvibe_articles WHERE boutique_id = ${id} AND actif = true ORDER BY id LIMIT 80`) as Record<string, unknown>[];
    return json({ boutique: { id, ...info }, articles, services: SERVICES_BOUTIQUE });
  }

  // ----- staff -----
  const session = await requireAuth(req);
  if (session?.org === STAFF_ORG) {
    if (req.method === "GET" && g("admin") === "1") {
      const frais = (await sql`SELECT f.id, f.boutique_id, f.semaine, f.ventes_n, f.ventes_total, f.montant, f.statut, b.nom FROM starvibe_frais f JOIN starvibe_boutiques b ON b.id = f.boutique_id WHERE f.statut IN ('a_payer','declare') ORDER BY f.statut = 'declare' DESC, f.id DESC LIMIT 100`) as Record<string, unknown>[];
      const boutiques = (await sql`SELECT id, nom, ville, statut, pause_motif, created_at FROM starvibe_boutiques ORDER BY id DESC LIMIT 100`) as Record<string, unknown>[];
      return json({ frais: frais.map((f) => ({ ...f, reference: `FRS-${f.id}` })), boutiques });
    }
    if (req.method === "POST") {
      let b: Record<string, unknown>; try { b = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
      if (b.action === "frais_confirmer") return rep(await confirmerFrais(sql, Number(b.fraisId)));
      if (b.action === "pause" || b.action === "reactiver") {
        const id = Number(b.boutiqueId);
        const r = (await sql`UPDATE starvibe_boutiques SET statut = ${b.action === "pause" ? "pause" : "active"}, pause_motif = ${b.action === "pause" ? "staff" : ""} WHERE id = ${id} RETURNING account_id`) as { account_id: number }[];
        if (!r[0]) return json({ error: "Boutique introuvable" }, 404);
        await poster(sql, r[0].account_id, b.action === "pause"
          ? { kind: "boutique", titre: "⏸️ Ta boutique est en pause", texte: "L'équipe KOMYO a mis ta boutique en pause. Écris-nous à contact@starentreprise.com pour en parler." }
          : { kind: "boutique", titre: "✅ Ta boutique est rouverte", texte: "Tes clients peuvent de nouveau commander." });
        return json({ ok: true });
      }
    }
  }

  // ----- compte KOMYO -----
  if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
  const accountId = Number(session.sub);

  if (req.method === "GET" && g("ma") === "1") {
    const b = ((await sql`SELECT * FROM starvibe_boutiques WHERE account_id = ${accountId} LIMIT 1`) as Record<string, unknown>[])[0];
    const business = await businessActif(sql, accountId);
    if (!b) return json({ boutique: null, business, services: SERVICES_BOUTIQUE, fraisSemaine: FRAIS_SEMAINE });
    await genererFrais(sql, Number(b.id));
    const fresh = ((await sql`SELECT * FROM starvibe_boutiques WHERE id = ${b.id}`) as Record<string, unknown>[])[0];
    const articles = (await sql`SELECT id, titre, description, prix FROM starvibe_articles WHERE boutique_id = ${b.id} AND actif = true ORDER BY id`) as Record<string, unknown>[];
    const commandes = (await sql`
      SELECT c.id, c.lignes, c.total, c.statut, c.created_at, c.paid_at, p.nom AS client FROM starvibe_commandes c
      LEFT JOIN starvibe_profiles p ON p.account_id = c.client_account_id AND p.type_profil = 'personnel'
      WHERE c.boutique_id = ${b.id} ORDER BY c.id DESC LIMIT 40
    `) as Record<string, unknown>[];
    const frais = (await sql`SELECT id, semaine, ventes_n, ventes_total, montant, statut FROM starvibe_frais WHERE boutique_id = ${b.id} ORDER BY id DESC LIMIT 12`) as Record<string, unknown>[];
    return json({ boutique: fresh, business, articles, commandes: commandes.map((c) => ({ ...c, reference: `CMD-${c.id}` })), frais: frais.map((f) => ({ ...f, reference: `FRS-${f.id}` })), services: SERVICES_BOUTIQUE, fraisSemaine: FRAIS_SEMAINE, numeroKomyo: NUMERO_KOMYO });
  }
  if (req.method === "GET" && g("mes_commandes") === "1") {
    const rows = (await sql`
      SELECT c.id, c.lignes, c.total, c.statut, c.created_at, b.nom AS boutique, b.numero_paiement FROM starvibe_commandes c
      JOIN starvibe_boutiques b ON b.id = c.boutique_id WHERE c.client_account_id = ${accountId} ORDER BY c.id DESC LIMIT 30
    `) as Record<string, unknown>[];
    return json({ commandes: rows.map((c) => ({ ...c, reference: `CMD-${c.id}`, numero_paiement: ["en_attente", "declaree"].includes(String(c.statut)) ? c.numero_paiement : undefined })) });
  }

  if (req.method === "POST") {
    let b: Record<string, unknown>; try { b = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    switch (b.action) {
      case "ouvrir": return rep(await ouvrirBoutique(sql, accountId, b));
      case "article_ajouter": return rep(await ajouterArticle(sql, accountId, b));
      case "article_retirer": return rep(await retirerArticle(sql, accountId, Number(b.articleId)));
      case "commander": return rep(await creerCommande(sql, accountId, Number(b.boutiqueId), b.lignes));
      case "declarer_paye": return rep(await declarerPaye(sql, accountId, Number(b.commandeId)));
      case "confirmer": return rep(await confirmerCommande(sql, accountId, Number(b.commandeId)));
      case "annuler": return rep(await annulerCommande(sql, accountId, Number(b.commandeId)));
      case "frais_declarer": return rep(await declarerFrais(sql, accountId, Number(b.fraisId)));
    }
  }
  return json({ error: "Requête inconnue" }, 400);
};

export const config: Config = { path: "/api/starvibe-boutique" };
