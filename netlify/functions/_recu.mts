// KOMYO — REÇUS ET ACCUSÉS DE RÉCEPTION.
// À chaque paiement confirmé (abonnement Famille/Business, annonce, demande Keydou, achat dans une boutique KOMYO Business, frais hebdomadaires),
// la personne reçoit un reçu détaillé DANS SA MESSAGERIE KOMYO (gratuit, instantané) : ce qu'elle a acheté, le montant, la date,
// et jusqu'à quand c'est valable (espace enfants, annonce…), avec la facture KOMYO (logo + slogan).
//
// Option : envoi WhatsApp par l'API officielle de Meta (payante, désactivée tant que WHATSAPP_TOKEN et WHATSAPP_PHONE_ID ne sont pas
// dans Netlify). L'équipe peut aussi renvoyer le reçu en un geste par un lien WhatsApp pré-rempli (gratuit).
// Un paiement ne doit JAMAIS échouer à cause d'un reçu : tout est protégé par try/catch.
import { createHmac, timingSafeEqual } from "node:crypto";
import { chiffres, indicatif } from "./_tel.mts";
import { poster } from "./_msg.mts";

export type KindRecu = "abo" | "keydou" | "pub" | "vente" | "frais" | "renouv";
export interface RecuInfo {
  titre: string;            // ce qui a été acheté
  montant: number;          // FCFA
  payeLe: Date;
  debut?: Date | null;
  fin?: Date | null;        // date d'expiration (espace enfants, annonce…)
  detail: string;           // ce que ça donne, en une phrase
  reference: string;        // ex. KOMYO-12, KDU-5, PUB-3
  methode?: string;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** Date en français à l'heure de Brazzaville (UTC+1, sans changement d'heure). */
export function dateFr(d: Date, avecHeure = false): string {
  const t = new Date(d.getTime() + 3600_000);
  const s = `${t.getUTCDate() === 1 ? "1er" : t.getUTCDate()} ${MOIS[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
  return avecHeure ? `${s} à ${String(t.getUTCHours()).padStart(2, "0")}h${String(t.getUTCMinutes()).padStart(2, "0")}` : s;
}

/** Numéro au format WhatsApp (chiffres seuls, avec indicatif). Sans indicatif : Congo (+242), comme partout dans KOMYO. */
export function numeroWhatsApp(brut: string): string {
  const { digits, explicite } = chiffres(brut);
  if (digits.length < 8) return "";
  if (explicite) return indicatif(digits) ? digits : "";
  if (digits.startsWith("242") && digits.length >= 11) return digits;
  return "242" + (digits.length === 8 ? "0" + digits : digits);
}

/** Texte complet du reçu (affiché dans l'application et envoyé tel quel en lien WhatsApp). */
export function texteRecu(numero: string, r: RecuInfo, role: "client" | "payeur" | "beneficiaire" | "vendeur" = "client", nomAutre = "", lien = ""): string {
  const l: string[] = [];
  l.push(`🧾 Reçu KOMYO n° ${numero}`);
  l.push("");
  if (role === "payeur" && nomAutre) l.push(`Vous avez offert : ${r.titre} à ${nomAutre}.`);
  else if (role === "beneficiaire" && nomAutre) l.push(`${nomAutre} vous a offert : ${r.titre}.`);
  else if (role === "vendeur") l.push(`Vente confirmée : ${r.titre}${nomAutre ? ` (client : ${nomAutre})` : ""}`);
  else l.push(`Achat : ${r.titre}`);
  l.push(`Montant : ${r.montant.toLocaleString("fr-FR").replace(/[  ]/g, " ")} FCFA`);
  l.push(`Payé le : ${dateFr(r.payeLe, true)}${r.methode ? ` (${r.methode.replace(/_/g, " ")})` : ""}`);
  if (r.fin) l.push(`Valable jusqu'au : ${dateFr(r.fin)}`);
  l.push(`Détail : ${r.detail}`);
  l.push(`Référence : ${r.reference}`);
  if (lien) l.push(`Votre facture (avec le logo KOMYO) : ${lien}`);
  l.push("");
  if (r.fin) l.push("Un rappel vous sera envoyé 3 jours avant la fin.");
  l.push("Merci de votre confiance.");
  l.push("KOMYO, le monde en mouvement.");
  l.push("Ne partagez jamais votre code PIN Mobile Money ni votre mot de passe.");
  return l.join("\n");
}

/** Lien de la facture (page KOMYO avec logo et slogan, imprimable en PDF). Signé : impossible à deviner. */
const jeton = (id: number) => createHmac("sha256", process.env.JWT_SECRET || "").update(`facture:${id}`).digest("hex").slice(0, 40);
export function lienFacture(id: number): string {
  if (!process.env.JWT_SECRET) return "";
  const base = (process.env.URL || "https://komyo.starentreprise.com").replace(/\/$/, "");
  return `${base}/starvibe/recu.html?id=${id}&t=${jeton(id)}`;
}
export function jetonFactureValide(id: number, t: string): boolean {
  if (!process.env.JWT_SECRET) return false;
  const a = Buffer.from(jeton(id)), b = Buffer.from(String(t || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Variables du modèle WhatsApp approuvé (pas de retour à la ligne autorisé par Meta dans une variable). */
export function variablesModele(numero: string, r: RecuInfo, lien = ""): string[] {
  const un = (s: string) => String(s).replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 300);
  return [
    un(numero), un(r.titre), `${r.montant.toLocaleString("fr-FR").replace(/[  ]/g, " ")}`, dateFr(r.payeLe, true),
    r.fin ? dateFr(r.fin) : "sans limite (paiement unique)", un(r.detail) + " — Réf. " + un(r.reference), lien || "disponible dans votre application KOMYO",
  ];
}

/** Texte à enregistrer dans Meta (catégorie UTILITAIRE), nom « komyo_recu », langue fr. */
export const MODELE_META =
  "Bonjour ! Voici votre reçu KOMYO n° {{1}}.\nAchat : {{2}}\nMontant : {{3}} FCFA\nPayé le : {{4}}\nValable jusqu'au : {{5}}\nDétail : {{6}}\nVotre facture : {{7}}\nMerci de votre confiance. KOMYO, le monde en mouvement.";

export async function envoyerWhatsApp(telephoneWa: string, variables: string[]): Promise<{ etat: "envoye" | "a_envoyer" | "echec"; id?: string; erreur?: string }> {
  const token = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { etat: "a_envoyer" };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: telephoneWa, type: "template",
        template: { name: process.env.WHATSAPP_TEMPLATE_RECU || "komyo_recu", language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "fr" },
          components: [{ type: "body", parameters: variables.map((text) => ({ type: "text", text })) }] },
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await r.json().catch(() => ({}))) as { messages?: { id?: string }[]; error?: { message?: string } };
    if (!r.ok) return { etat: "echec", erreur: String(data.error?.message || `HTTP ${r.status}`).slice(0, 300) };
    return { etat: "envoye", id: data.messages?.[0]?.id };
  } catch (e) {
    return { etat: "echec", erreur: String((e as Error)?.message || e).slice(0, 300) };
  }
}

// deno-lint-ignore no-explicit-any
type Sql = any;

async function emettre(sql: Sql, kind: KindRecu, refId: number, role: string, accountId: number | null, telephone: string, r: RecuInfo, nomAutre = "") {
  const deja = (await sql`SELECT 1 FROM starvibe_recus WHERE kind = ${kind} AND ref_id = ${refId} AND role = ${role} LIMIT 1`) as unknown[];
  if (deja.length) return;   // reçu déjà émis : pas de doublon, pas de numéro sauté
  const wa = numeroWhatsApp(telephone);
  const ins = (await sql`
    INSERT INTO starvibe_recus (kind, ref_id, role, account_id, telephone, titre, montant, expire_le, statut)
    VALUES (${kind}, ${refId}, ${role}, ${accountId}, ${wa || telephone || ""}, ${r.titre}, ${r.montant}, ${r.fin ?? null}, ${accountId ? "messagerie" : wa ? "a_envoyer" : "sans_numero"})
    ON CONFLICT (kind, ref_id, role) DO NOTHING RETURNING id
  `) as { id: number }[];
  if (!ins[0]) return;   // reçu déjà émis (paiement confirmé deux fois : un seul reçu)
  const id = ins[0].id;
  const numero = `REC-${new Date().getUTCFullYear()}-${String(id).padStart(6, "0")}`;
  const lien = lienFacture(id);
  const texte = texteRecu(numero, r, role as "client", nomAutre, lien);
  const variables = variablesModele(numero, r, lien);
  await sql`UPDATE starvibe_recus SET numero = ${numero}, texte = ${texte}, variables = ${JSON.stringify(variables)}::jsonb WHERE id = ${id}`;
  await poster(sql, accountId, { kind: role === "vendeur" ? "vente" : "recu", titre: `🧾 ${role === "vendeur" ? "Vente" : "Reçu"} ${numero} — ${r.titre}`, texte, lien });
  if (!wa || !process.env.WHATSAPP_TOKEN) return;   // envoi WhatsApp automatique : seulement si l'option Meta est branchée
  const res = await envoyerWhatsApp(wa, variables);
  await sql`UPDATE starvibe_recus SET statut = ${res.etat}, erreur = ${res.erreur || ""}, wa_message_id = ${res.id || ""}, envoye_le = ${res.etat === "envoye" ? sql`now()` : null} WHERE id = ${id}`;
}

/** Reçu d'un abonnement Famille / Business (le bénéficiaire et, s'il est différent, le payeur). */
export async function recuAbonnement(sql: Sql, subId: number): Promise<void> {
  try {
    const s = ((await sql`
      SELECT s.*, a.telephone AS tel_benef, p.telephone AS tel_payeur
      FROM starvibe_subscriptions s
      JOIN starvibe_accounts a ON a.id = s.account_id
      LEFT JOIN starvibe_accounts p ON p.id = s.payeur_account_id
      WHERE s.id = ${subId} AND s.statut = 'actif' AND s.montant_attendu > 0 LIMIT 1
    `) as Record<string, unknown>[])[0];
    if (!s) return;
    const plan = String(s.plan);
    const titre = plan === "famille" ? "Abonnement Famille PIOUPIOU (1 mois)" : plan === "business" ? "Abonnement Business KOMYO (1 mois)" : `Abonnement ${plan}`;
    const detail = plan === "famille"
      ? "dessins animés éducatifs premium pour les 3 à 6 ans, profils enfants illimités, priorité de modération"
      : plan === "business" ? "mise en avant de vos vidéos et statistiques (vues, durée regardée, j'aime)" : "services KOMYO";
    const info: RecuInfo = {
      titre, montant: Number(s.montant_recu ?? s.montant_attendu), payeLe: new Date(String(s.started_at || s.updated_at)),
      debut: s.started_at ? new Date(String(s.started_at)) : null, fin: s.expires_at ? new Date(String(s.expires_at)) : null,
      detail, reference: `KOMYO-${subId}`, methode: String(s.methode || ""),
    };
    const nomBenef = String(s.beneficiaire_nom || "");
    const cadeau = s.payeur_account_id && Number(s.payeur_account_id) !== Number(s.account_id);
    if (cadeau) {
      await emettre(sql, "abo", subId, "payeur", Number(s.payeur_account_id), String(s.tel_payeur || ""), info, nomBenef || "un proche");
      await emettre(sql, "abo", subId, "beneficiaire", Number(s.account_id), String(s.tel_benef || ""), info, "Un proche");
    } else {
      await emettre(sql, "abo", subId, "client", Number(s.account_id), String(s.tel_benef || ""), info);
    }
  } catch (e) { console.error("recuAbonnement", e); }
}

/** Reçu d'une demande Keydou payée (1 000 FCFA, une seule fois). `libelle` = les besoins, en clair. */
export async function recuKeydou(sql: Sql, requestId: number, libelle = ""): Promise<void> {
  try {
    const q = ((await sql`
      SELECT k.*, a.telephone AS tel FROM starvibe_keydou_requests k JOIN starvibe_accounts a ON a.id = k.account_id
      WHERE k.id = ${requestId} AND k.statut = 'paye' LIMIT 1
    `) as Record<string, unknown>[])[0];
    if (!q) return;
    await emettre(sql, "keydou", requestId, "client", Number(q.account_id), String(q.tel || ""), {
      titre: `Keydou — ${libelle || "recherche de services"}${q.ville ? ` (${q.ville})` : ""}`,
      montant: Number(q.montant_recu ?? q.montant_attendu), payeLe: new Date(String(q.paid_at || q.updated_at)),
      detail: "adresses et numéros reçus dans l'application ; à confirmer par appel avant de vous déplacer. Paiement unique pour 1 à 3 besoins",
      reference: `KDU-${requestId}`, methode: "mobile money",
    });
  } catch (e) { console.error("recuKeydou", e); }
}

/** Reçu d'une annonce visible par tous (durée payée, date de fin). */
export async function recuAnnonce(sql: Sql, pubId: number, libellePlan = ""): Promise<void> {
  try {
    const p = ((await sql`
      SELECT g.*, a.telephone AS tel FROM starvibe_pub g JOIN starvibe_accounts a ON a.id = g.account_id
      WHERE g.id = ${pubId} AND g.statut = 'actif' LIMIT 1
    `) as Record<string, unknown>[])[0];
    if (!p) return;
    await emettre(sql, "pub", pubId, "client", Number(p.account_id), String(p.tel || ""), {
      titre: `Annonce visible par tous — ${libellePlan || `${p.jours} jours`}`,
      montant: Number(p.montant_recu ?? p.montant_attendu), payeLe: new Date(String(p.started_at || p.created_at)),
      debut: p.started_at ? new Date(String(p.started_at)) : null, fin: p.expires_at ? new Date(String(p.expires_at)) : null,
      detail: `votre message défile en bas de l'écran de tous les abonnés pendant ${p.jours} jours`,
      reference: `PUB-${pubId}`,
    });
  } catch (e) { console.error("recuAnnonce", e); }
}

/** Accusé de réception d'un achat dans une boutique KOMYO Business : le client reçoit son reçu, le vendeur sa notification de vente. */
export async function recuVente(sql: Sql, commandeId: number): Promise<void> {
  try {
    const c = ((await sql`
      SELECT c.*, b.nom AS boutique_nom, b.account_id AS vendeur_id, av.telephone AS tel_vendeur, ac.telephone AS tel_client
      FROM starvibe_commandes c
      JOIN starvibe_boutiques b ON b.id = c.boutique_id
      JOIN starvibe_accounts av ON av.id = b.account_id
      JOIN starvibe_accounts ac ON ac.id = c.client_account_id
      WHERE c.id = ${commandeId} AND c.statut = 'payee' LIMIT 1
    `) as Record<string, unknown>[])[0];
    if (!c) return;
    const lignes = (Array.isArray(c.lignes) ? c.lignes : []) as { titre: string; prix: number; qte: number }[];
    const resume = lignes.map((x) => `${x.qte} × ${x.titre}`).join(", ");
    const info: RecuInfo = {
      titre: `Achat chez ${c.boutique_nom}`, montant: Number(c.total), payeLe: new Date(String(c.paid_at || c.created_at)),
      detail: resume || "commande KOMYO Business", reference: `CMD-${commandeId}`, methode: "mobile money, payé directement au vendeur",
    };
    await emettre(sql, "vente", commandeId, "client", Number(c.client_account_id), String(c.tel_client || ""), info);
    await emettre(sql, "vente", commandeId, "vendeur", Number(c.vendeur_id), String(c.tel_vendeur || ""), { ...info, titre: `Vente à un client KOMYO — ${resume || "commande"}` }, `commande CMD-${commandeId}`);
  } catch (e) { console.error("recuVente", e); }
}

/** Reçu des frais hebdomadaires de la boutique (500 FCFA, semaines avec ventes). */
export async function recuFrais(sql: Sql, fraisId: number): Promise<void> {
  try {
    const f = ((await sql`
      SELECT f.*, b.nom AS boutique_nom, b.account_id AS vendeur_id, a.telephone AS tel
      FROM starvibe_frais f JOIN starvibe_boutiques b ON b.id = f.boutique_id JOIN starvibe_accounts a ON a.id = b.account_id
      WHERE f.id = ${fraisId} AND f.statut = 'paye' LIMIT 1
    `) as Record<string, unknown>[])[0];
    if (!f) return;
    await emettre(sql, "frais", fraisId, "client", Number(f.vendeur_id), String(f.tel || ""), {
      titre: `Frais KOMYO Business — semaine du ${dateFr(new Date(String(f.semaine) + "T12:00:00Z"))}`,
      montant: Number(f.montant), payeLe: new Date(String(f.paid_at || f.created_at)),
      detail: `${f.ventes_n} vente(s) dans la semaine pour ${Number(f.ventes_total).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ")} FCFA — boutique ${f.boutique_nom}`,
      reference: `FRS-${fraisId}`, methode: "mobile money",
    });
  } catch (e) { console.error("recuFrais", e); }
}

/** Reçu du renouvellement d'une boutique (dette de frais réglée). */
export async function recuRenouvellement(sql: Sql, renId: number): Promise<void> {
  try {
    const r = ((await sql`
      SELECT n.*, b.nom AS boutique_nom, b.account_id AS vendeur_id, a.telephone AS tel
      FROM starvibe_renouvellements n JOIN starvibe_boutiques b ON b.id = n.boutique_id JOIN starvibe_accounts a ON a.id = b.account_id
      WHERE n.id = ${renId} AND n.statut = 'valide' LIMIT 1
    `) as Record<string, unknown>[])[0];
    if (!r) return;
    const nb = Array.isArray(r.frais_ids) ? (r.frais_ids as unknown[]).length : 0;
    await emettre(sql, "renouv", renId, "client", Number(r.vendeur_id), String(r.tel || ""), {
      titre: `Renouvellement de la boutique ${r.boutique_nom}`,
      montant: Number(r.montant), payeLe: new Date(String(r.valide_at || r.created_at)),
      detail: `dette de frais KOMYO Business réglée (${nb} semaine(s)) — ${r.nom_prenom}, ${r.activites}. Ta boutique est ouverte`,
      reference: `RNV-${renId}`, methode: "mobile money",
    });
  } catch (e) { console.error("recuRenouvellement", e); }
}
