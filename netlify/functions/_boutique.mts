// KOMYO BUSINESS — BOUTIQUES (logique métier, testable sans réseau).
//
// Principe :
//  - le vendeur a un abonnement Business actif et ouvre sa boutique (il coche ses services, ajoute ses articles) ;
//  - le client commande, paie LE VENDEUR directement par Mobile Money (KOMYO ne touche pas l'argent des ventes),
//    puis le vendeur confirme la réception ; à cet instant le client reçoit son ACCUSÉ DE RÉCEPTION dans sa messagerie KOMYO
//    et le vendeur sa notification de vente ;
//  - KOMYO facture 500 FCFA par semaine AVEC ventes (semaine = lundi à dimanche, heure de Brazzaville), payable au +242 06 656 50 50
//    et confirmé par l'équipe. Non payé 7 jours après l'échéance : la boutique est mise en pause, puis rouverte au paiement.
import { poster } from "./_msg.mts";
import { recuVente, recuFrais } from "./_recu.mts";

// deno-lint-ignore no-explicit-any
type Sql = any;
export const FRAIS_SEMAINE = 500;
export const NUMERO_KOMYO = "+242 06 656 50 50";
export const SERVICES_BOUTIQUE: Record<string, string> = {
  alimentation: "Alimentation et restauration", mode: "Mode et vêtements", beaute: "Beauté et coiffure", maison: "Maison et décoration",
  electronique: "Électronique et téléphones", services: "Services (réparation, livraison, cours…)", artisanat: "Artisanat et art",
  musique: "Musique et spectacles", bien_etre: "Bien-être (non médical)", autre: "Autre",
};
export const PRIX_MIN = 100, PRIX_MAX = 5_000_000, MAX_ARTICLES = 60, MAX_QTE = 20;

export const propre = (v: unknown, n: number): string => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, n);
const fcfa = (n: number) => Number(n).toLocaleString("fr-FR").replace(/[  ]/g, " ");
type R<T = unknown> = { ok: true; data: T } | { ok: false; error: string; status?: number };
const non = (error: string, status = 400): { ok: false; error: string; status: number } => ({ ok: false, error, status });

function ageDe(dateStr: string): number | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) return null;
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

export async function businessActif(sql: Sql, accountId: number): Promise<boolean> {
  const r = (await sql`SELECT 1 FROM starvibe_subscriptions WHERE account_id = ${accountId} AND plan = 'business' AND statut = 'actif' AND montant_attendu > 0 AND expires_at > now() LIMIT 1`) as unknown[];
  return r.length > 0;
}

export async function ouvrirBoutique(sql: Sql, accountId: number, b: Record<string, unknown>): Promise<R<{ id: number }>> {
  if (!(await businessActif(sql, accountId))) return non("Il faut un abonnement KOMYO Business actif pour ouvrir une boutique.", 402);
  const prof = (await sql`SELECT date_naissance FROM starvibe_profiles WHERE account_id = ${accountId} AND type_profil = 'personnel' ORDER BY id LIMIT 1`) as { date_naissance: string }[];
  const age = prof[0] ? ageDe(prof[0].date_naissance) : null;
  if (age === null || age < 18) return non("La boutique est réservée aux personnes de 18 ans et plus.", 403);
  if (b.accepte !== true) return non("Accepte les règles de la boutique (articles légaux, pas d'arnaque).");
  const nom = propre(b.nom, 60);
  if (nom.length < 2) return non("Donne un nom à ta boutique.");
  const numero = propre(b.numeroPaiement, 30);
  if (numero.replace(/\D/g, "").length < 8) return non("Indique le numéro Mobile Money où tes clients te paient.");
  const services = (Array.isArray(b.services) ? b.services : []).map((x) => propre(x, 30)).filter((x, i, a) => SERVICES_BOUTIQUE[x] && a.indexOf(x) === i).slice(0, 5);
  if (!services.length) return non("Coche au moins un service (jusqu'à 5).");
  const existe = (await sql`SELECT id FROM starvibe_boutiques WHERE account_id = ${accountId} LIMIT 1`) as { id: number }[];
  if (existe[0]) {
    await sql`UPDATE starvibe_boutiques SET nom = ${nom}, description = ${propre(b.description, 400)}, ville = ${propre(b.ville, 40)}, numero_paiement = ${numero}, services = ${JSON.stringify(services)}::jsonb WHERE id = ${existe[0].id}`;
    return { ok: true, data: { id: existe[0].id } };
  }
  const r = (await sql`
    INSERT INTO starvibe_boutiques (account_id, nom, description, ville, numero_paiement, services)
    VALUES (${accountId}, ${nom}, ${propre(b.description, 400)}, ${propre(b.ville, 40)}, ${numero}, ${JSON.stringify(services)}::jsonb) RETURNING id
  `) as { id: number }[];
  await poster(sql, accountId, { kind: "boutique", titre: "🏪 Ta boutique KOMYO Business est ouverte", texte: `Bravo ! « ${nom} » est ouverte. Ajoute tes articles : tes clients te paient directement par Mobile Money, tu confirmes la réception, et chacun reçoit son reçu dans sa messagerie KOMYO. KOMYO prend ${FRAIS_SEMAINE} FCFA seulement les semaines où tu as des ventes.` });
  return { ok: true, data: { id: r[0].id } };
}

export async function ajouterArticle(sql: Sql, accountId: number, a: Record<string, unknown>): Promise<R<{ id: number }>> {
  const b = ((await sql`SELECT id FROM starvibe_boutiques WHERE account_id = ${accountId} LIMIT 1`) as { id: number }[])[0];
  if (!b) return non("Ouvre d'abord ta boutique.", 404);
  const titre = propre(a.titre, 80), prix = Math.round(Number(a.prix));
  if (titre.length < 2) return non("Donne un nom à l'article.");
  if (!Number.isFinite(prix) || prix < PRIX_MIN || prix > PRIX_MAX) return non(`Le prix doit être entre ${fcfa(PRIX_MIN)} et ${fcfa(PRIX_MAX)} FCFA.`);
  const n = ((await sql`SELECT COUNT(*)::int AS n FROM starvibe_articles WHERE boutique_id = ${b.id} AND actif = true`) as { n: number }[])[0].n;
  if (n >= MAX_ARTICLES) return non(`Maximum ${MAX_ARTICLES} articles.`);
  const r = (await sql`INSERT INTO starvibe_articles (boutique_id, titre, description, prix) VALUES (${b.id}, ${titre}, ${propre(a.description, 300)}, ${prix}) RETURNING id`) as { id: number }[];
  return { ok: true, data: { id: r[0].id } };
}

export async function retirerArticle(sql: Sql, accountId: number, articleId: number): Promise<R<null>> {
  await sql`UPDATE starvibe_articles SET actif = false WHERE id = ${articleId} AND boutique_id IN (SELECT id FROM starvibe_boutiques WHERE account_id = ${accountId})`;
  return { ok: true, data: null };
}

/** Une boutique accepte des commandes si elle est active ET que son vendeur a toujours un abonnement Business actif. */
export async function boutiqueOuverte(sql: Sql, boutiqueId: number): Promise<{ id: number; account_id: number; nom: string; numero_paiement: string } | null> {
  const b = ((await sql`SELECT id, account_id, nom, numero_paiement, statut FROM starvibe_boutiques WHERE id = ${boutiqueId} LIMIT 1`) as Record<string, unknown>[])[0];
  if (!b || b.statut !== "active" || !(await businessActif(sql, Number(b.account_id)))) return null;
  return b as unknown as { id: number; account_id: number; nom: string; numero_paiement: string };
}

export async function creerCommande(sql: Sql, clientId: number, boutiqueId: number, lignesIn: unknown): Promise<R<{ id: number; reference: string; total: number; numeroPaiement: string; boutique: string }>> {
  await genererFrais(sql, boutiqueId);
  const b = await boutiqueOuverte(sql, boutiqueId);
  if (!b) return non("Cette boutique n'est pas ouverte pour le moment.", 409);
  if (Number(b.account_id) === clientId) return non("Tu ne peux pas commander dans ta propre boutique.", 403);
  const demandes = (Array.isArray(lignesIn) ? lignesIn : []).slice(0, 12) as { articleId?: unknown; qte?: unknown }[];
  if (!demandes.length) return non("Choisis au moins un article.");
  const lignes: { articleId: number; titre: string; prix: number; qte: number }[] = [];
  for (const d of demandes) {
    const id = Number(d.articleId), qte = Math.round(Number(d.qte) || 1);
    if (!id || qte < 1 || qte > MAX_QTE) return non(`Quantité entre 1 et ${MAX_QTE}.`);
    const a = ((await sql`SELECT id, titre, prix FROM starvibe_articles WHERE id = ${id} AND boutique_id = ${boutiqueId} AND actif = true LIMIT 1`) as { id: number; titre: string; prix: number }[])[0];
    if (!a) return non("Un article n'est plus disponible.", 409);
    lignes.push({ articleId: a.id, titre: a.titre, prix: a.prix, qte });
  }
  const total = lignes.reduce((s, l) => s + l.prix * l.qte, 0);
  if (total > PRIX_MAX) return non("Montant trop élevé pour une commande.");
  const r = (await sql`INSERT INTO starvibe_commandes (boutique_id, client_account_id, lignes, total) VALUES (${boutiqueId}, ${clientId}, ${JSON.stringify(lignes)}::jsonb, ${total}) RETURNING id`) as { id: number }[];
  const id = r[0].id;
  await poster(sql, Number(b.account_id), { kind: "commande", titre: `🛒 Nouvelle commande CMD-${id} — ${fcfa(total)} FCFA`, texte: `${lignes.map((l) => `${l.qte} × ${l.titre}`).join(", ")}. Le client va te payer par Mobile Money sur ton numéro. Quand tu as bien reçu l'argent, confirme la commande dans « Ma boutique » : le client recevra son reçu.` });
  return { ok: true, data: { id, reference: `CMD-${id}`, total, numeroPaiement: b.numero_paiement, boutique: b.nom } };
}

export async function declarerPaye(sql: Sql, clientId: number, commandeId: number): Promise<R<null>> {
  const c = ((await sql`UPDATE starvibe_commandes SET statut = 'declaree', declare_at = now() WHERE id = ${commandeId} AND client_account_id = ${clientId} AND statut = 'en_attente' RETURNING boutique_id, total`) as { boutique_id: number; total: number }[])[0];
  if (!c) return non("Commande introuvable ou déjà traitée.", 404);
  const b = ((await sql`SELECT account_id FROM starvibe_boutiques WHERE id = ${c.boutique_id}`) as { account_id: number }[])[0];
  await poster(sql, b.account_id, { kind: "commande", titre: `💬 Le client dit avoir payé CMD-${commandeId}`, texte: `Vérifie ton Mobile Money : ${fcfa(c.total)} FCFA attendus. Si c'est bien reçu, confirme la commande dans « Ma boutique ».` });
  return { ok: true, data: null };
}

export async function confirmerCommande(sql: Sql, vendeurId: number, commandeId: number): Promise<R<null>> {
  const c = ((await sql`
    UPDATE starvibe_commandes SET statut = 'payee', paid_at = now()
    WHERE id = ${commandeId} AND statut IN ('en_attente', 'declaree') AND boutique_id IN (SELECT id FROM starvibe_boutiques WHERE account_id = ${vendeurId})
    RETURNING id
  `) as { id: number }[])[0];
  if (!c) return non("Commande introuvable ou déjà traitée.", 404);
  await recuVente(sql, commandeId);   // accusé de réception au client + notification de vente au vendeur, dans leurs messageries
  return { ok: true, data: null };
}

export async function annulerCommande(sql: Sql, accountId: number, commandeId: number): Promise<R<null>> {
  const r = (await sql`
    UPDATE starvibe_commandes SET statut = 'annulee'
    WHERE id = ${commandeId} AND statut IN ('en_attente', 'declaree') AND (client_account_id = ${accountId} OR boutique_id IN (SELECT id FROM starvibe_boutiques WHERE account_id = ${accountId}))
    RETURNING id
  `) as unknown[];
  return r.length ? { ok: true, data: null } : non("Commande introuvable ou déjà traitée.", 404);
}

// ---------- frais hebdomadaires ----------

/** Crée (une seule fois) la facture de chaque semaine terminée AVEC ventes ; met en pause une boutique en retard ; la rouvre quand tout est payé. */
export async function genererFrais(sql: Sql, boutiqueId: number): Promise<void> {
  try {
    const b = ((await sql`SELECT id, account_id, nom, statut, pause_motif FROM starvibe_boutiques WHERE id = ${boutiqueId}`) as Record<string, unknown>[])[0];
    if (!b) return;
    const semaines = (await sql`
      SELECT (date_trunc('week', paid_at AT TIME ZONE 'Africa/Brazzaville'))::date AS sem, COUNT(*)::int AS n, COALESCE(SUM(total), 0)::int AS total
      FROM starvibe_commandes
      WHERE boutique_id = ${boutiqueId} AND statut = 'payee' AND paid_at IS NOT NULL
        AND date_trunc('week', paid_at AT TIME ZONE 'Africa/Brazzaville') < date_trunc('week', now() AT TIME ZONE 'Africa/Brazzaville')
      GROUP BY 1
    `) as { sem: string | Date; n: number; total: number }[];
    for (const w of semaines) {
      const sem = typeof w.sem === "string" ? w.sem.slice(0, 10) : new Date(w.sem).toISOString().slice(0, 10);
      const ins = (await sql`
        INSERT INTO starvibe_frais (boutique_id, semaine, ventes_n, ventes_total, montant) VALUES (${boutiqueId}, ${sem}, ${w.n}, ${w.total}, ${FRAIS_SEMAINE})
        ON CONFLICT (boutique_id, semaine) DO NOTHING RETURNING id
      `) as { id: number }[];
      if (ins[0]) await poster(sql, Number(b.account_id), {
        kind: "frais", titre: `🧾 Facture KOMYO Business FRS-${ins[0].id} — ${FRAIS_SEMAINE} FCFA`,
        texte: `Semaine du ${sem} : ${w.n} vente(s) pour ${fcfa(w.total)} FCFA. Frais KOMYO : ${FRAIS_SEMAINE} FCFA (seulement les semaines avec ventes). Paie par Mobile Money au ${NUMERO_KOMYO} avec la référence FRS-${ins[0].id}, puis touche « J'ai payé » dans Ma boutique. Sans paiement sous 7 jours, ta boutique est mise en pause (tes clients ne peuvent plus commander) jusqu'au règlement.`,
      });
    }
    const retard = ((await sql`SELECT COUNT(*)::int AS n FROM starvibe_frais WHERE boutique_id = ${boutiqueId} AND statut IN ('a_payer', 'declare') AND created_at < now() - interval '7 days'`) as { n: number }[])[0].n;
    if (retard > 0 && b.statut === "active") {
      await sql`UPDATE starvibe_boutiques SET statut = 'pause', pause_motif = 'frais' WHERE id = ${boutiqueId}`;
      await poster(sql, Number(b.account_id), { kind: "frais", titre: "⏸️ Ta boutique est en pause", texte: `Une facture KOMYO de ${FRAIS_SEMAINE} FCFA n'est pas réglée depuis plus de 7 jours. Paie-la au ${NUMERO_KOMYO} : ta boutique rouvre dès que l'équipe confirme.` });
    } else if (retard === 0 && b.statut === "pause" && b.pause_motif === "frais") {
      await sql`UPDATE starvibe_boutiques SET statut = 'active', pause_motif = '' WHERE id = ${boutiqueId}`;
      await poster(sql, Number(b.account_id), { kind: "boutique", titre: "✅ Ta boutique est rouverte", texte: "Merci ! Tes clients peuvent de nouveau commander." });
    }
  } catch (e) { console.error("genererFrais", e); }
}

export async function declarerFrais(sql: Sql, vendeurId: number, fraisId: number): Promise<R<null>> {
  const r = (await sql`UPDATE starvibe_frais SET statut = 'declare', declare_at = now() WHERE id = ${fraisId} AND statut = 'a_payer' AND boutique_id IN (SELECT id FROM starvibe_boutiques WHERE account_id = ${vendeurId}) RETURNING id`) as unknown[];
  return r.length ? { ok: true, data: null } : non("Facture introuvable ou déjà réglée.", 404);
}

export async function confirmerFrais(sql: Sql, fraisId: number): Promise<R<null>> {
  const f = ((await sql`UPDATE starvibe_frais SET statut = 'paye', paid_at = now() WHERE id = ${fraisId} AND statut IN ('a_payer', 'declare') RETURNING boutique_id`) as { boutique_id: number }[])[0];
  if (!f) return non("Facture introuvable ou déjà réglée.", 404);
  await recuFrais(sql, fraisId);
  await genererFrais(sql, f.boutique_id);   // rouvre la boutique si c'était la seule facture en retard
  return { ok: true, data: null };
}
