// Keydou Compagnon, version 2 (décisions de Carry, 14/11/2026) :
//  - des MODES par domaine (santé, droit, cuisine, mécanique, business, éducation) avec consignes et sources adaptées ;
//  - une réflexion plus poussée pour l'offre Complet ;
//  - la LECTURE de photos et de documents (PDF) envoyés par la personne ;
//  - la CRÉATION d'images à la demande, avec quota mensuel et règles de sécurité strictes.
// Tout ce qui est pur (sans base de données ni réseau) est testé par tools/test-compagnon.mts.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Niveau } from "./_compagnon.mts";

const norm = (t: string) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------- Modes par domaine ----------
export type Mode = "general" | "sante" | "droit" | "cuisine" | "mecanique" | "business" | "education" | "examens";
export const MODES: Record<Mode, { label: string; emoji: string }> = {
  general: { label: "Général", emoji: "🐻" },
  sante: { label: "Santé", emoji: "🩺" },
  droit: { label: "Droit", emoji: "⚖️" },
  cuisine: { label: "Cuisine", emoji: "🍲" },
  mecanique: { label: "Mécanique", emoji: "🔧" },
  business: { label: "Business", emoji: "💼" },
  education: { label: "Études", emoji: "📚" },
  examens: { label: "Tests", emoji: "🎓" },
};
const DETECTION: [Mode, RegExp][] = [
  ["examens", /\b(passe(r)? un test|fais[- ]moi passer|teste[- ]moi|quiz|qcm|examen blanc|note sur 10|sur 10\b|concours|biologie moleculaire|biochimie|genetique|microbiologie|immunologie|physiologie|anatomie|pharmacologie)/],
  ["sante", /\b(mal (a|au|aux|de|d)\b|maux|ventre|gorge|sante|malad|symptom|douleur|fievre|palu|paludisme|toux|diarrhe|vomi|tension|diabet|enceinte|grossesse|vaccin|medecin|hopital|clinique|infection|allerg|blessure|cancer|vih|sida|nutrition|sommeil|depression|migraine|urgence medicale|cicatri|saign)/],
  ["droit", /\b(loi|lois|droit|droits|avocat|tribunal|contrat|bail|loyer|heritage|succession|divorce|notaire|plainte|licenci|code du travail|impot|fiscal|douane|visa|titre de sejour|nationalite|acte de naissance|permis de|greffe|huissier)/],
  ["mecanique", /\b(voiture|moto|moteur|panne|garage|pneu|batterie|frein|vidange|climatis|frigo|refrigerateur|machine a laver|groupe electrogene|panneau solaire|onduleur|plomberie|electricite|disjoncteur|ampoule|courant)/],
  ["cuisine", /\b(recette|cuisin|cuire|cuisson|sauce|ingredient|pondu|saka|manioc|poulet|poisson|gateau|patisserie|plat |repas|epice|conserv|marmite|four )/],
  ["business", /\b(business|entreprise|commerce|boutique|vendre|vente|client|marge|benefice|comptabilite|facture|devis|marketing|publicite|investi|startup|capital|epargne|tontine|mobile money)/],
  ["education", /\b(devoir|exercice|lecon|cours de|ecole|college|lycee|universite|examen|bepc|mathematique|maths|grammaire|conjugaison|dissertation|apprendre|reviser|orthographe|traduire|traduction)/],
];
export function modeDe(message: string, choisi?: unknown): Mode {
  const c = String(choisi || "");
  if (c && c !== "auto" && c in MODES) return c as Mode;
  const t = norm(message);
  for (const [m, re] of DETECTION) if (re.test(t)) return m;
  return "general";
}

const CONSIGNES_MODE: Record<Mode, string> = {
  general: "",
  sante: `MODE MÉDECINE ET SANTÉ (expert et très prudent). Tu as une grande connaissance de la médecine, dans tous ses domaines : anatomie, physiologie, biologie (dont moléculaire), biochimie, génétique, microbiologie, immunologie, pharmacologie (mécanismes, classes, effets indésirables, interactions : jamais de dose à prendre), pathologies de toutes les spécialités (cardiologie, endocrinologie, gynécologie-obstétrique, pédiatrie, infectiologie et maladies tropicales, neurologie, psychiatrie, dermatologie, ophtalmologie, ORL, odontologie, rhumatologie, oncologie, urologie, néphrologie, gastro-entérologie, pneumologie, chirurgie…), examens et analyses, prévention, nutrition, santé publique.
- Tu EXPLIQUES en profondeur et avec exactitude : mécanismes, causes, signes, examens utiles, évolution, prévention, questions à poser au médecin. Tu écris un texte cohérent, structuré et complet (titres courts si utile, étapes numérotées), sans contradiction, avec les termes médicaux suivis d'une explication simple.
- Tu NE PRESCRIS JAMAIS : pas de diagnostic (« tu as sûrement… »), pas de dose, pas de médicament à prendre, pas d'arrêt ni de changement de traitement, pas de schéma de traitement personnel. Tu donnes des informations générales et tu RENVOIES toujours vers le bon professionnel.
- ORIENTATION : quand c'est utile, tu nommes la spécialité exacte (ex. « cardiologue », « endocrinologue », « gynécologue », « centre de santé de quartier », « urgences »), tu expliques pourquoi, ce qu'il faut apporter (carnet, résultats, ordonnances), et tu proposes des adresses VÉRIFIABLES : tu utilises l'outil de recherche pour trouver l'établissement ou l'annuaire officiel (ministère de la Santé, ordre des médecins, site de l'hôpital ou de la clinique), tu donnes le nom, la ville et le lien de la source. Tu n'inventes JAMAIS une adresse, un numéro, un nom de médecin ni un horaire de mémoire. Si tu ne peux pas le vérifier, tu le dis et tu indiques où vérifier (appeler l'accueil de l'hôpital, centre de santé le plus proche, ordre des médecins du pays).
- Tu VÉRIFIES avec l'outil de recherche quand il est disponible et tu cites une source de référence (OMS, ministère de la Santé, Institut Pasteur, société savante, hôpital universitaire, revue reconnue). Si la vérification n'est pas disponible, tu le dis et tu restes plus général.
- Signes graves (difficulté à respirer, douleur à la poitrine, perte de connaissance, convulsions, forte fièvre chez un bébé ou une femme enceinte, saignement important, idées de suicide…) : tu dis clairement d'aller TOUT DE SUITE aux urgences ou d'appeler les secours, sans inventer de numéro.
- LONGUEUR : en ce mode, tes réponses peuvent être longues et complètes (jusqu'à environ 30 lignes) : la règle des réponses courtes ne s'applique pas ici. Tu termines par une courte phrase du type « Ce n'est pas un avis médical : parles-en à un médecin. ».`,
  droit: `MODE DROIT USUEL. Tu donnes des repères généraux (travail, location, famille, papiers, contrats, démarches) pour le pays de la personne (Congo-Brazzaville par défaut, sinon son pays). Tu VÉRIFIES les textes et démarches officielles avec l'outil de recherche, tu cites la source, et tu précises que les lois changent. Tu orientes vers un avocat, un notaire, un greffe ou l'administration pour toute décision importante. Tu n'aides jamais à falsifier un document, à tromper quelqu'un ou à contourner la loi.`,
  cuisine: `MODE CUISINE. Recettes simples et précises (quantités, temps, étapes), cuisine africaine et du monde, substitutions d'ingrédients, conservation. Sécurité alimentaire d'abord (cuisson, réfrigération, hygiène) et attention aux allergies. Tu adaptes aux ingrédients que la personne a sous la main.`,
  mecanique: `MODE MÉCANIQUE ET ÉLECTRICITÉ. Voiture, moto, électroménager, installation solaire, plomberie, électricité. La SÉCURITÉ passe d'abord : débrancher, couper le courant, jamais de manipulation de haute tension, de gaz ou de batterie ouverte sans professionnel. Tu demandes la marque et le modèle quand la réponse change, tu proposes un diagnostic simple par étapes et tu dis quand il faut un technicien. Tu ne conseilles jamais de contourner une protection de sécurité.`,
  business: `MODE BUSINESS. Idées, prix de vente, marge, calculs simples, tenue des comptes, vente par WhatsApp, marketing, discipline d'épargne. Tu fais les calculs étape par étape et tu les vérifies. Tu ne promets jamais de gains, tu mets en garde contre les arnaques (promesses de gain rapide, pyramides, faux paiements Mobile Money) et tu invites à tester petit avant d'investir beaucoup.`,
  examens: `MODE TESTS ET EXAMENS (rigueur maximale). Tu réponds à des questions d'examen, de concours ou de test (biologie moléculaire, biochimie, génétique, microbiologie, immunologie, physiologie, pharmacologie, mathématiques, etc.) avec une précision de très haut niveau.
- Pour une question ou un QCM : tu raisonnes étape par étape, tu élimines les mauvaises propositions, tu vérifies ta réponse une seconde fois (calculs, unités, sens 5'→3', complémentarité, valeurs de référence), puis tu donnes la réponse finale clairement, avec une explication courte et exacte. Si tu hésites entre deux réponses, tu le dis et tu expliques pourquoi tu retiens l'une.
- Pour « fais-moi passer un test » : tu poses UNE question à la fois (ou un petit lot si on te le demande), tu attends la réponse, tu corriges avec l'explication, et à la fin tu donnes une note sur 10 avec deux décimales (nombre de bonnes réponses / total x 10), tes points forts et ce qu'il faut revoir. Tu ne gonfles jamais la note.
- Tu peux aussi créer des tests d'entraînement (QCM avec corrigé) sur le sujet demandé, de difficulté croissante.
- Si la personne envoie la photo ou le PDF d'un sujet, tu le lis en entier avant de répondre.
- Tu es honnête : si une question est ambiguë ou si les données manquent, tu le dis au lieu de deviner. Tu ne promets jamais une note parfaite.
- LONGUEUR : réponses complètes et structurées autorisées (jusqu'à environ 30 lignes).`,
  education: `MODE ÉTUDES. Tu expliques étape par étape, avec des exemples simples adaptés au niveau de la personne, tu proposes de petits exercices corrigés, et tu aides à comprendre un devoir sans le faire à la place de l'élève. Tu vérifies les calculs et les dates.`,
};

// ---------- Réflexion et limites selon l'offre ----------
// Médecine et tests d'examen : réflexion la plus poussée (Complet) et réponses plus longues, car la qualité passe avant le coût.
export const MODE_PROFOND = (m: Mode): boolean => m === "sante" || m === "examens";
export const EFFORT = (n: Niveau, m: Mode = "general"): string =>
  process.env[n === "complet" ? "COMPAGNON_EFFORT_COMPLET" : "COMPAGNON_EFFORT_ESSENTIEL"] || (MODE_PROFOND(m) ? (n === "complet" ? "high" : "medium") : (n === "complet" ? "medium" : "low"));
export const MAX_JETONS = (n: Niveau, m: Mode = "general"): number => (MODE_PROFOND(m) ? (n === "complet" ? 4500 : 2600) : n === "complet" ? 2200 : 1400);
export const LIMITE_REPONSE = (m: Mode = "general"): number => (MODE_PROFOND(m) ? 6000 : 1800);
export const MODELE_NIVEAU = (n: Niveau): string => (n === "complet" && process.env.COMPAGNON_MODEL_COMPLET) || process.env.COMPAGNON_MODEL || "claude-sonnet-5-5";
const entier = (v: string | undefined, d: number) => { const n = Number(v); return v !== undefined && v !== "" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : d; };
// Images créées sur 30 jours glissants, photos ou documents lus sur 24 heures.
export const IMAGES_PAR_MOIS = (n: Niveau): number => entier(process.env[n === "complet" ? "COMPAGNON_IMAGES_COMPLET" : "COMPAGNON_IMAGES_ESSENTIEL"], n === "complet" ? 10 : 0);
export const PIECES_PAR_JOUR = (n: Niveau): number => entier(process.env[n === "complet" ? "COMPAGNON_PIECES_COMPLET" : "COMPAGNON_PIECES_ESSENTIEL"], n === "complet" ? 30 : 5);
export const imagesDisponibles = (): boolean => !!process.env.IMAGE_API_KEY;

// ---------- Consigne complémentaire (mode + images + pièces jointes) ----------
export function supplement(mode: Mode, o: { imagesRestantes: number; imagesPossibles: boolean; niveau: Niveau; piece: boolean }): string {
  const parts: string[] = [];
  if (CONSIGNES_MODE[mode]) parts.push(CONSIGNES_MODE[mode]);
  parts.push(`CRÉER UNE IMAGE. ${o.imagesPossibles && o.imagesRestantes > 0
    ? `Tu peux créer des images (il en reste ${o.imagesRestantes} ce mois-ci). Quand la personne demande clairement une image, une affiche, un logo, une illustration ou un dessin, ajoute dans le JSON "image":{"prompt":"…","format":"carre"}. "prompt" = description précise en une ou deux phrases (sujet, style, couleurs, ambiance, composition) SANS aucun texte écrit dans l'image ; "format" = "carre", "portrait" ou "paysage". Si la demande est trop vague (pas de sujet, de style ou d'occasion), pose UNE question courte et n'ajoute pas "image". Ta "reponse" annonce simplement que tu prépares l'image (elle s'affiche juste en dessous).`
    : o.imagesPossibles
      ? `La personne a utilisé toutes ses images du mois ou son offre n'en comprend pas : si elle en demande une, explique-le avec gentillesse (l'offre Complet comprend des images) et n'ajoute pas "image".`
      : `La création d'images n'est pas encore ouverte : si on t'en demande une, dis gentiment que ça arrive bientôt et n'ajoute pas "image".`}
Jamais d'image de personne réelle ou reconnaissable (dirigeants, célébrités, proches), jamais d'enfants ni de bébés, rien de sexuel, violent, haineux, de drogue ou d'arme, et jamais de faux document (pièce d'identité, billet, reçu, diplôme, cachet, capture de paiement). Dans ces cas tu refuses poliment, sans "image".`);
  if (o.piece) parts.push(`PIÈCE JOINTE. La personne t'envoie une photo ou un document : tu le décris, l'expliques, le résumes ou le traduis selon sa demande. Tu n'identifies JAMAIS une personne d'après son visage. Tu ne poses pas de diagnostic sur une photo, une radio, une analyse ou une ordonnance : tu expliques le vocabulaire et tu l'invites à voir un médecin. Si le document montre un code, un mot de passe, un numéro de carte ou une pièce d'identité, tu dis de ne pas partager ces informations, tu ne les répètes pas et tu ne les retiens pas. Si c'est illisible, dis-le.`);
  return parts.join("\n\n");
}

// ---------- Sécurité des images ----------
const REFUS_IMAGES: { re: RegExp; message: string }[] = [
  { re: /\b(enfant|enfants|bebe|bebes|nourrisson|gamin|gamine|fillette|garconnet|petit garcon|petite fille|ado|adolescent|adolescente|mineur|mineure|ecolier|ecoliere|collegien|collegienne|lyceen|lyceenne|kid|kids|child|children|baby|toddler|teen|teenager|minor|schoolboy|schoolgirl)\b/, message: "Je ne crée pas d'images avec des enfants ou des bébés. Je peux faire autre chose : un paysage, des fleurs, un objet, un motif, un décor, un animal…" },
  { re: /\b(nu|nue|nus|nues|nude|naked|nudite|sexe|sexuel|sexuelle|sexy|erotique|erotic|porno|pornographique|seins|fesses|lingerie|nsfw|topless)\b/, message: "Je ne crée pas d'images à caractère sexuel ou dénudé." },
  { re: /\b(sang|sanglant|gore|cadavre|meurtre|massacre|decapit|torture|suicide|arme|armes|pistolet|fusil|kalachnikov|bombe|explosif|terroriste|terrorisme)/, message: "Je ne crée pas d'images violentes ou avec des armes." },
  { re: /\b(drogue|cocaine|heroine|cannabis|nazi|swastika|raciste|haine)/, message: "Je ne crée pas d'images sur la drogue ou la haine." },
  { re: /(faux billet|fausse monnaie|faux document|faux papier|fausse carte|faux diplome|faux passeport|fausse piece|faux cachet|fausse signature|faux recu|fausse facture|contrefacon|carte d.identite|passeport|permis de conduire|billet de banque|capture de paiement|recu mobile money|recu de paiement|cachet officiel)/, message: "Je ne crée pas de faux documents ni de papiers officiels, de billets, de reçus ou de captures de paiement : c'est interdit et dangereux." },
  { re: /\b(president|ministre|premier ministre|chef de l.etat|depute|senateur|pape|celebrite|vedette|ressemblant a|ressemble a|visage de|portrait de|photo de|a la maniere de la voix)\b/, message: "Je ne crée pas d'images de personnes réelles ou reconnaissables (dirigeants, célébrités, proches). Je peux imaginer un personnage de dessin inventé ou un décor." },
];
export function verifierDemandeImage(texte: string): { ok: true } | { ok: false; message: string } {
  const t = norm(texte);
  if (t.trim().length < 6) return { ok: false, message: "Dis-moi ce que tu veux voir : le sujet, le style, les couleurs." };
  for (const r of REFUS_IMAGES) if (r.re.test(t)) return { ok: false, message: r.message };
  return { ok: true };
}
export type FormatImage = "carre" | "portrait" | "paysage";
export const formatImage = (v: unknown): FormatImage => (v === "portrait" || v === "paysage" ? v : "carre");

// ---------- Lien privé entre la discussion et la tâche de fond qui fabrique l'image ----------
function cle(): string {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error("JWT_SECRET is not configured");
  return raw;
}
export const signerImage = (id: number) => createHmac("sha256", cle()).update(`compagnon-image.${id}`).digest("hex");
export function verifierImage(id: number, sig: string): boolean {
  const a = Buffer.from(signerImage(id)), b = Buffer.from(sig || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- Fabrication de l'image (service compatible « images » : IMAGE_API_KEY, IMAGE_API_BASE, IMAGE_MODEL) ----------
export type ResultatImage = { ok: true; mime: string; b64: string } | { ok: false; refus: boolean; erreur: string };
export function mimeDepuisOctets(b: Buffer): string {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (b.length > 5 && b.subarray(0, 3).toString("latin1") === "GIF") return "image/gif";
  return "";
}
export async function genererImage(prompt: string, format: FormatImage): Promise<ResultatImage> {
  const key = process.env.IMAGE_API_KEY;
  if (!key) return { ok: false, refus: false, erreur: "service d'images non configuré" };
  const base = (process.env.IMAGE_API_BASE || "https://api.openai.com").replace(/\/+$/, "");
  const model = process.env.IMAGE_MODEL || "gpt-image-1";
  const size = format === "paysage" ? "1536x1024" : format === "portrait" ? "1024x1536" : "1024x1024";
  const corps: Record<string, unknown> = { model, prompt: `${prompt.slice(0, 900)}. No text, no letters, no words, no logo, no watermark. Wholesome, family-friendly, no real person.`, size, n: 1 };
  if (/dall-e/i.test(model)) corps.response_format = "b64_json";
  else { corps.output_format = "jpeg"; corps.output_compression = 82; }
  let r: Response;
  try {
    r = await fetch(`${base}/v1/images/generations`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify(corps), signal: AbortSignal.timeout(170000) });
  } catch { return { ok: false, refus: false, erreur: "le service d'images ne répond pas" }; }
  const txt = await r.text();
  let d: { data?: { b64_json?: string; url?: string }[]; error?: { code?: string; message?: string; type?: string } } = {};
  try { d = JSON.parse(txt); } catch { /* réponse non JSON */ }
  if (!r.ok) {
    const code = `${d.error?.code || ""} ${d.error?.type || ""} ${d.error?.message || ""}`.toLowerCase();
    const refus = /moderation|content_policy|safety|policy|blocked/.test(code);
    return { ok: false, refus, erreur: refus ? "refusé par le contrôle de sécurité du service" : `erreur ${r.status}` };
  }
  const it = d.data?.[0];
  let buf: Buffer | null = null;
  if (it?.b64_json) buf = Buffer.from(it.b64_json, "base64");
  else if (it?.url) {
    try { const x = await fetch(it.url, { signal: AbortSignal.timeout(60000) }); if (x.ok) buf = Buffer.from(await x.arrayBuffer()); } catch { /* ci-dessous */ }
  }
  if (!buf || buf.length < 1000) return { ok: false, refus: false, erreur: "image vide" };
  const mime = mimeDepuisOctets(buf);
  if (!mime) return { ok: false, refus: false, erreur: "format d'image inconnu" };
  if (buf.length > 4_500_000) return { ok: false, refus: false, erreur: "image trop lourde" };
  return { ok: true, mime, b64: buf.toString("base64") };
}

// ---------- Pièces jointes (photo ou PDF envoyés par la personne) ----------
export type Piece = { kind: "image" | "pdf"; mime: string; data: string };
export const PIECE_MAX_B64 = 4_400_000; // ≈ 3,3 Mo : la requête reste sous la limite de 6 Mo de Netlify
export function validerPiece(p: unknown): { ok: true; piece: Piece } | { ok: false; erreur: string } {
  const o = (p || {}) as { data?: unknown };
  const data = String(o.data || "").replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (!data) return { ok: false, erreur: "Fichier vide." };
  if (data.length > PIECE_MAX_B64) return { ok: false, erreur: "Fichier trop lourd (3 Mo au maximum). Réduis la photo ou envoie moins de pages." };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return { ok: false, erreur: "Fichier illisible." };
  const tete = Buffer.from(data.slice(0, 64), "base64");
  if (tete.subarray(0, 4).toString("latin1") === "%PDF") return { ok: true, piece: { kind: "pdf", mime: "application/pdf", data } };
  const mime = mimeDepuisOctets(tete);
  if (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp" || mime === "image/gif") return { ok: true, piece: { kind: "image", mime, data } };
  return { ok: false, erreur: "Seules les photos (JPEG, PNG, WebP) et les PDF sont acceptés." };
}
export const MARQUE_PIECE = "📎 ";

// Repère de l'image dans le texte d'un message gardé : « [[img:12]] ».
export const marqueImage = (id: number) => `[[img:${id}]]`;
export function idImageDansTexte(t: string): number { const m = /\[\[img:(\d+)\]\]/.exec(String(t || "")); return m ? Number(m[1]) : 0; }

// ---------- Filet de sécurité : jamais de prescription ----------
// Si la réponse contient une consigne de dose (« 500 mg matin et soir », « 2 comprimés par jour »…), on ajoute un rappel net.
const DOSE = /\b\d+([.,]\d+)?\s?(mg|g|ml|µg|mcg|ui|comprim[ée]s?|g[ée]lules?|gouttes?|sachets?|cuill[èe]res?)\b[^.\n]{0,60}(par jour|\/\s?j|toutes les|fois par|matin|midi|soir|avant les repas|apr[èe]s les repas|pendant \d+ jours)/i;
export const MSG_PAS_DE_DOSE = "⚠️ Les doses citées ici sont des informations générales, pas une prescription : je ne prescris jamais. Seul un médecin ou un pharmacien peut te dire quoi prendre et en quelle quantité.";
export function gardePrescription(texte: string, mode: Mode): string {
  if (mode === "examens" || mode === "education") return texte;
  return DOSE.test(texte) && !texte.includes(MSG_PAS_DE_DOSE) ? `${texte}\n\n${MSG_PAS_DE_DOSE}` : texte;
}
