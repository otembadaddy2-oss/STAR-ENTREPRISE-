// Keydou Compagnon, version 2 (décisions de Carry, 14/11/2026) :
//  - des MODES par domaine (santé, droit, cuisine, mécanique, business, éducation) avec consignes et sources adaptées ;
//  - une réflexion plus poussée pour l'offre Complet ;
//  - la LECTURE de photos et de documents (PDF) envoyés par la personne ;
//  - la CRÉATION d'images à la demande, avec quota mensuel et règles de sécurité strictes.
// Tout ce qui est pur (sans base de données ni réseau) est testé par tools/test-compagnon.mts.
import { createHmac, timingSafeEqual } from "node:crypto";
import { AVANTAGES, RANG, type Niveau } from "./_compagnon.mts";

const norm = (t: string) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------- Modes par domaine ----------
export type Mode = "general" | "sante" | "redaction" | "droit" | "cuisine" | "mecanique" | "business" | "education" | "examens";
export const MODES: Record<Mode, { label: string; emoji: string }> = {
  general: { label: "Général", emoji: "🐻" },
  sante: { label: "Santé", emoji: "🩺" },
  redaction: { label: "Rédaction", emoji: "✍️" },
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
  ["redaction", /\b(ecris[- ]moi|ecris (une|un|le|la|des|mon|ma)|redige|rediger|redaction|composer? (une|un)|lettre (de|au|a|d)|une lettre|un courrier|un mail|un courriel|un e-?mail|un discours|un poeme|une chanson|un slogan|une annonce|un post\b|une publication|un scenario|un script|une histoire|une presentation|un compte[- ]rendu|un cv\b|lettre de motivation|un message (pour|a|d)|texte (de|pour|d)|une demande (de|d|au|a)|brief creatif|storyboard|prompt (pour|d)|idee de video|une video|une animation)/],
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
  redaction: `MODE RÉDACTION ET CRÉATION. Tu écris comme un excellent rédacteur professionnel : lettres et courriers officiels, e-mails, demandes administratives, discours, annonces, posts pour les réseaux sociaux, slogans, histoires, poèmes, chansons, scénarios, scripts de vidéo, CV et lettres de motivation, comptes rendus, résumés, traductions.
- Tu livres le TEXTE COMPLET, prêt à copier et à envoyer, dans un français soigné et correct (ou la langue demandée), avec le ton demandé (officiel, chaleureux, commercial, poétique…). Des phrases précises, jamais de remplissage ni de généralités.
- S'il manque une information indispensable (destinataire, date, nom, montant), tu écris quand même le texte avec des champs clairs « [à compléter] » et tu poses UNE seule question à la fin. Tu n'inventes JAMAIS un chiffre, un nom, une loi, un article de loi ou une référence officielle.
- Courrier officiel : lieu et date, objet, formule d'appel exacte (« Monsieur le Ministre, »), corps structuré, formule de politesse soutenue, liste des pièces jointes si utile, signature.
- À la fin, tu proposes UNE amélioration utile (version plus courte, plus formelle, traduction, version pour WhatsApp).
- IMAGES, VIDÉOS, ANIMATIONS : tu sais écrire le BRIEF créatif complet (idée, scènes numérotées avec leur durée, style visuel, ambiance, musique, texte à l'écran, format vertical, carré ou horizontal) et le prompt prêt à coller dans des outils comme Higgsfield, Adobe Firefly, Blender ou Canva. Pour une image simple, tu peux la créer toi-même si les instructions complémentaires t'y autorisent. Tu ne dis JAMAIS que tu as créé une vidéo ou une animation : tu n'as pas encore ces outils branchés, tu le dis simplement et tu donnes le brief.
- Tu ne rédiges rien d'illégal ou de trompeur : pas de faux document, de fausse signature, de faux avis ni de message de harcèlement.
- LONGUEUR : en ce mode, tes réponses peuvent être longues et complètes (jusqu'à environ 40 lignes) : la règle des réponses courtes ne s'applique pas ici.`,
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
const NOM_ENV = (n: Niveau) => n.toUpperCase();
export const EFFORT = (n: Niveau, m: Mode = "general"): string =>
  process.env[`COMPAGNON_EFFORT_${NOM_ENV(n)}`] || (MODE_PROFOND(m) ? AVANTAGES[n].effortProfond : AVANTAGES[n].effortGeneral);
export const MAX_JETONS = (n: Niveau, m: Mode = "general"): number => (MODE_PROFOND(m) || m === "redaction" ? AVANTAGES[n].jetonsProfond : AVANTAGES[n].jetonsGeneral);
export const LIMITE_REPONSE = (m: Mode = "general", n: Niveau = "complet"): number => (MODE_PROFOND(m) || m === "redaction" ? Math.max(6000, Math.round(AVANTAGES[n].longueurReponse * 3.3)) : AVANTAGES[n].longueurReponse);
export const MODELE_NIVEAU = (n: Niveau): string => (RANG[n] >= RANG.complet && process.env[`COMPAGNON_MODEL_${NOM_ENV(n)}`]) || (n === "complet" && process.env.COMPAGNON_MODEL_COMPLET) || process.env.COMPAGNON_MODEL || "claude-sonnet-5-5";
const entier = (v: string | undefined, d: number) => { const n = Number(v); return v !== undefined && v !== "" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : d; };
// Images créées sur 30 jours glissants, photos ou documents lus sur 24 heures.
// Décision de Carry : essai 2 images en tout (30 jours glissants), Essentiel 10 par mois, Complet 35 par mois.
export const IMAGES_PAR_MOIS = (n: Niveau): number => entier(process.env[`COMPAGNON_IMAGES_${NOM_ENV(n)}`], AVANTAGES[n].images);
export const PIECES_PAR_JOUR = (n: Niveau): number => entier(process.env[`COMPAGNON_PIECES_${NOM_ENV(n)}`], AVANTAGES[n].pieces);
// Une vraie clé est un seul mot sans espace (lettres, chiffres, - _ .) d'au moins 16 signes : un texte collé par erreur n'ouvre pas la fonction.
export const cleValide = (v: string | undefined): boolean => /^[A-Za-z0-9._\-]{16,}$/.test(String(v || "").trim());
export const imagesDisponibles = (): boolean => cleValide(process.env.IMAGE_API_KEY);

// ---------- Consigne complémentaire (mode + images + pièces jointes) ----------
export function supplement(mode: Mode, o: { imagesRestantes: number; imagesPossibles: boolean; niveau: Niveau; piece: boolean }): string {
  const parts: string[] = [];
  if (CONSIGNES_MODE[mode]) parts.push(CONSIGNES_MODE[mode]);
  parts.push(`CRÉER UNE IMAGE. ${o.imagesPossibles && o.imagesRestantes > 0
    ? `Tu peux créer des images (il en reste ${o.imagesRestantes} ce mois-ci). Quand la personne demande clairement une image, une affiche, un logo, une illustration ou un dessin, ajoute dans le JSON "image":{"prompt":"…","format":"carre"}. "prompt" = description précise en une ou deux phrases (sujet, style, couleurs, ambiance, composition) SANS aucun texte écrit dans l'image ; "format" = "carre", "portrait" ou "paysage". Si la demande est trop vague (pas de sujet, de style ou d'occasion), pose UNE question courte et n'ajoute pas "image". Ta "reponse" annonce simplement que tu prépares l'image (elle s'affiche juste en dessous).`
    : o.imagesPossibles
      ? `La personne a utilisé toutes ses images du mois ou son offre n'en comprend pas : si elle en demande une, explique-le avec gentillesse (l'offre Complet comprend des images) et n'ajoute pas "image".`
      : `La création d'images n'est pas encore ouverte : si on t'en demande une, dis gentiment que ça arrive bientôt et n'ajoute pas "image".`}
Jamais d'image de personne réelle ou reconnaissable (dirigeants, célébrités, proches) : si on te demande la photo d'une vraie personne ou une photo libre de droits, tu ne la fabriques pas ; tu cherches avec l'outil de recherche une source vérifiée (Wikimedia Commons, Unsplash, Pexels…), tu donnes le lien et la licence indiquée, tu précises de vérifier les conditions d'usage (mention de l'auteur, usage commercial) et tu ne prétends jamais qu'une photo est libre de droits sans l'avoir vérifié sur la page de la source. Jamais d'enfants ni de bébés, rien de sexuel, violent, haineux, de drogue ou d'arme, et jamais de faux document (pièce d'identité, billet, reçu, diplôme, cachet, capture de paiement). Dans ces cas tu refuses poliment, sans "image".`);
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
  { re: /\b(president|ministre|premier ministre|chef de l.etat|depute|senateur|pape|celebrite|vedette|ressemblant a|ressemble a|visage de|portrait de|photo de|a la maniere de la voix)\b/, message: "Je ne crée pas d'images de personnes réelles ou reconnaissables (dirigeants, célébrités, proches). Je peux imaginer un personnage inventé ou un décor. Pour une photo libre de droits, demande-moi une source vérifiée avec sa licence (Wikimedia Commons, Unsplash, Pexels) : je te donne le lien." },
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
// Raison technique d'un échec : gardée pour l'équipe et les testeurs ; jamais de clé (« sk-… » masqué), 220 signes au plus.
export const nettoyerErreur = (t: string, max = 220): string => String(t || "").replace(/sk-[A-Za-z0-9_\-]{6,}/g, "sk-…").replace(/\s+/g, " ").trim().slice(0, max);
// Modèles d'images : on demande au service ce qu'il propose pour cette clé (les noms changent avec le temps), le plus récent d'abord.
export function ordonnerModelesImage(ids: string[]): string[] {
  const note = (id: string): number => {
    const m = /^gpt-image-(\d+(?:\.\d+)?)/.exec(id);
    if (m) return 1000 + Number(m[1]) * 10 - (/mini/.test(id) ? 5 : 0) - (/-\d{4}-\d{2}-\d{2}$/.test(id) ? 1 : 0);
    if (/^dall-e-3$/.test(id)) return 10;
    return 0;
  };
  return [...new Set(ids)].filter((id) => note(id) > 0).sort((x, y) => note(y) - note(x));
}
let cacheModeles: { at: number; liste: string[] } | null = null;
async function modelesImage(base: string, key: string): Promise<string[]> {
  if (cacheModeles && Date.now() - cacheModeles.at < 10 * 60000) return cacheModeles.liste;
  try {
    const r = await fetch(`${base}/v1/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
    if (r.ok) {
      const d = (await r.json()) as { data?: { id?: string }[] };
      const liste = ordonnerModelesImage((d.data || []).map((x) => String(x.id || "")));
      if (liste.length) { cacheModeles = { at: Date.now(), liste }; return liste; }
    }
  } catch { /* on retombe sur la liste de secours */ }
  return ["gpt-image-2", "gpt-image-1.5", "gpt-image-1"];
}
export async function genererImage(prompt: string, format: FormatImage): Promise<ResultatImage> {
  const key = String(process.env.IMAGE_API_KEY || "").trim();
  if (!key) return { ok: false, refus: false, erreur: "service d'images non configuré" };
  const base = (process.env.IMAGE_API_BASE || "https://api.openai.com").replace(/\/+$/, "");
  const candidats = process.env.IMAGE_MODEL ? [process.env.IMAGE_MODEL] : (await modelesImage(base, key)).slice(0, 3);
  const essais: string[] = [];
  for (const model of candidats) {
    const dalle = /dall-e/i.test(model);
    const size = dalle ? (format === "paysage" ? "1792x1024" : format === "portrait" ? "1024x1792" : "1024x1024") : (format === "paysage" ? "1536x1024" : format === "portrait" ? "1024x1536" : "1024x1024");
    for (const avecFormat of [true, false]) {
      const corps: Record<string, unknown> = { model, prompt: `${prompt.slice(0, 900)}. No text, no letters, no words, no logo, no watermark. Wholesome, family-friendly, no real person.`, size, n: 1 };
      if (dalle) corps.response_format = "b64_json";
      else if (avecFormat) { corps.output_format = "jpeg"; corps.output_compression = 82; }
      let r: Response;
      try {
        r = await fetch(`${base}/v1/images/generations`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify(corps), signal: AbortSignal.timeout(170000) });
      } catch (e) { return { ok: false, refus: false, erreur: `le service d'images ne répond pas (${nettoyerErreur(String((e as Error)?.name || "") + " " + String((e as Error)?.message || ""))})` }; }
      const txt = await r.text();
      let d: { data?: { b64_json?: string; url?: string }[]; error?: { code?: string; message?: string; type?: string } } = {};
      try { d = JSON.parse(txt); } catch { /* réponse non JSON */ }
      if (!r.ok) {
        const msg = `${d.error?.code || ""} ${d.error?.type || ""} ${d.error?.message || ""}`;
        const refus = /moderation|content_policy|safety|policy|blocked/i.test(msg);
        if (refus) return { ok: false, refus: true, erreur: "refusé par le contrôle de sécurité du service" };
        const modeleAbsent = r.status === 400 || r.status === 403 || r.status === 404 ? /does not exist|not have access|model_not_found|must be verified|not supported|unsupported model/i.test(msg) : false;
        const paramInconnu = !dalle && avecFormat && r.status === 400 && /output_format|output_compression|unknown parameter|unrecognized/i.test(msg);
        essais.push(`${model}: ${r.status} ${nettoyerErreur(d.error?.code ? `${d.error.code} ${d.error.message || ""}` : (d.error?.message || txt))}`);
        if (paramInconnu) continue;          // même modèle, sans le réglage du format de sortie
        if (modeleAbsent) break;              // modèle suivant
        return { ok: false, refus: false, erreur: nettoyerErreur(`erreur ${essais[essais.length - 1]}`) };
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
  }
  return { ok: false, refus: false, erreur: nettoyerErreur(`aucun modèle d'image utilisable : ${essais.join(" | ")}`, 420) };
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

// ---------- Voix de Keydou sur les réponses (même voix que la vidéo de présentation et le site) ----------
// Service : ElevenLabs (VOIX_API_KEY, secrète). Voix « Chloé » validée par Carry (VOIX_ID), modèle eleven_v4 (VOIX_MODELE).
// Chaque lecture coûte de l'argent (environ 1 crédit par signe) : quota par jour et longueur limitée, voir tools/COMPAGNON-v2-notes.
export const voixDisponible = (): boolean => cleValide(process.env.VOIX_API_KEY);
export const VOIX_PAR_JOUR = (n: Niveau): number => entier(process.env[`COMPAGNON_VOIX_${NOM_ENV(n)}`], AVANTAGES[n].voix);
export const VOIX_SIGNES_MAX = 450;
// Texte à lire : sans mise en forme, sans lien, sans ligne « Source », sans repère d'image, coupé à la fin d'une phrase.
export function texteAVoix(brut: string): string {
  let t = String(brut || "").replace(/\[\[img:\d+\]\]/g, " ").replace(/^\s*Sources?\s*:.*$/gim, " ").replace(/https?:\/\/\S+/g, " ").replace(/\p{Extended_Pictographic}/gu, " ").replace(/[*_#`>|]/g, " ").replace(/\s+/g, " ").trim();
  if (t.length <= VOIX_SIGNES_MAX) return t;
  const coupe = t.slice(0, VOIX_SIGNES_MAX); const fin = Math.max(coupe.lastIndexOf(". "), coupe.lastIndexOf("! "), coupe.lastIndexOf("? "), coupe.lastIndexOf(" : "));
  return (fin > 120 ? coupe.slice(0, fin + 1) : coupe.replace(/\s+\S*$/, "")).trim();
}
export type ResultatVoix = { ok: true; b64: string } | { ok: false; erreur: string };
export async function genererVoix(texte: string): Promise<ResultatVoix> {
  const key = String(process.env.VOIX_API_KEY || "").trim();
  if (!key) return { ok: false, erreur: "voix non configurée" };
  const voix = process.env.VOIX_ID || "I6eWD84OrEngt4S4Antm";
  let r: Response;
  try {
    r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voix)}?output_format=mp3_44100_64`, {
      method: "POST", headers: { "content-type": "application/json", "xi-api-key": key },
      body: JSON.stringify({ text: `[warm, friendly, smiling] ${texte}`, model_id: process.env.VOIX_MODELE || "eleven_v4" }), signal: AbortSignal.timeout(25000),
    });
  } catch { return { ok: false, erreur: "le service de voix ne répond pas" }; }
  if (!r.ok) return { ok: false, erreur: `erreur ${r.status}` };
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 800) return { ok: false, erreur: "audio vide" };
  return { ok: true, b64: buf.toString("base64") };
}

// ---------- Ce que Keydou (assistant de l'application KOMYO) dit du Compagnon : suit l'interrupteur « Ouvert à l'abonnement » en direct ----------
const TEXTE_COMPAGNON_OUVERT = "Keydou Compagnon est OUVERT À TOUS : tout membre KOMYO peut le télécharger et l'installer sur son téléphone (gratuit à installer). Sans abonnement, il a 5 messages d'essai en tout, avec 2 images offertes ; ensuite Keydou l'invite à s'abonner, et seuls les abonnés ont les avantages. Offres, payées en Mobile Money MTN ou Airtel (accès ouvert dès que le dépôt est reconnu) : Essentiel 5 000 FCFA par mois : 65 messages par jour, 10 rappels actifs, 5 photos ou documents lus par jour, 10 images créées par mois, 10 recherches vérifiées par jour. Complet (Pro) 19 $ par mois (environ 11 100 FCFA) : 200 messages par jour, 500 rappels actifs, 30 photos ou documents par jour, 35 images par mois, 30 recherches vérifiées par jour, médecine approfondie, tests notés sur 10, réflexion plus poussée, lecture des réponses avec la voix de Keydou (6 par jour). Premium 35 $ par mois (environ 20 400 FCFA) : 350 messages par jour, 1 000 rappels actifs, 50 photos ou documents par jour, 70 images par mois, 60 recherches vérifiées par jour, 15 lectures avec la voix de Keydou par jour, une mémoire plus longue (il retient plus de choses et se souvient de plus de messages), des réponses plus longues et plus détaillées, 10 % de remise sur les packs d'images. Prestige 49 $ par mois (environ 28 600 FCFA) : 500 messages par jour, 2 000 rappels actifs, 80 photos ou documents par jour, 120 images par mois, 100 recherches vérifiées par jour, 30 lectures avec la voix de Keydou par jour, la mémoire la plus longue, une réflexion approfondie même pour les questions courantes, les réponses les plus détaillées, 20 % de remise sur les packs d'images. Crédits d'images : quand le quota d'images du mois est épuisé, un abonné peut acheter un pack, payé par dépôt Mobile Money comme l'abonnement (pack de 10 images : 1 200 FCFA ; pack de 30 images : 3 000 FCFA) ; les images achetées s'ajoutent au quota et ne se périment pas ; l'essai gratuit ne peut pas en acheter (il faut d'abord s'abonner). Ce qu'il sait faire : retenir les rendez-vous, anniversaires et habitudes et prévenir au bon moment ; répondre dans plusieurs domaines (santé, droit, cuisine, mécanique, business, études, tests) ; en médecine il explique mais ne prescrit JAMAIS (aucune dose, aucun médicament à prendre) et oriente vers le bon spécialiste avec des adresses à vérifier ; en mode Tests il corrige des questions et note sur 10 sans jamais gonfler la note ni promettre une note parfaite ; il lit les photos et les PDF ; il crée des images à la demande (refus de tout enfant ou bébé, contenu sexuel ou violent, drogue, faux documents et personnes réelles ; une demande refusée ne compte pas ; pour une photo libre de droits, il donne un lien vers une source vérifiée avec sa licence). Il ne retient jamais les médicaments ni les codes secrets. Il vérifie et cite ses sources mais ne remplace ni un médecin, ni un avocat, ni un autre professionnel : ne garantis jamais qu'une réponse est exacte à 100 %. Les connecteurs vers d'autres services (Gmail, Canva…) ne sont pas encore ouverts : ne promets aucune date. Installation : carte « Keydou Compagnon » sur la page d'accueil de KOMYO."; 
const TEXTE_COMPAGNON_FERME = "Keydou Compagnon n'est PAS encore ouvert au public : il est réservé aux testeurs invités par l'équipe. Ne promets ni date d'ouverture ni installation. Prix : Essentiel 5 000 FCFA ou Complet 19 $ par mois. Si on demande ce qu'il sait faire : c'est un assistant personnel qui retient les rendez-vous, anniversaires et habitudes, prévient au bon moment et répond dans plusieurs domaines ; en médecine il ne prescrit jamais. N'annonce rien de plus. Dis que les membres seront prévenus dès l'ouverture.";
export const texteCompagnonPourKeydou = (ouvert: boolean): string => (ouvert ? TEXTE_COMPAGNON_OUVERT : TEXTE_COMPAGNON_FERME);

// ---------- Connecteurs et capacités (affichés dans Paramètres) : l'état vient des clés réellement posées, jamais inventé ----------
// Un connecteur est « actif » (connecté), « bientot » (pas connecté : pas encore ouvert) ou « erreur » (impossible de se connecter : un vrai échec récent).
export type Connecteur = { id: string; nom: string; groupe: string; statut: "actif" | "bientot" | "erreur"; detail: string; raison?: string };
// Santé réelle des connecteurs : gardée en base (clé « compagnon_sante »), mise à jour à chaque vrai appel et par la vérification.
export type Sante = Record<string, { ok: boolean; at: number; raison: string }>;
export const SANTE_FRAIS_MS = 60 * 60 * 1000;   // une panne reste signalée une heure, puis le connecteur est de nouveau essayé
// Les échecs qui prouvent que le connecteur lui-même est mauvais (clé refusée, modèle inaccessible, crédit épuisé) ; un refus de sécurité sur une image n'en est pas un.
export const ECHEC_DE_CONNEXION = /invalid_api_key|incorrect api key|unauthorized|\b401\b|\b403\b|does not exist|model_not_found|must be verified|billing|quota|insufficient|payment|not configured|non configuré|ne répond pas/i;
export const enPanne = (sante: Sante, id: string, maintenant = Date.now()): boolean => !!sante[id] && !sante[id].ok && maintenant - sante[id].at < SANTE_FRAIS_MS;
// deno-lint-ignore no-explicit-any
export async function lireSante(sql: any): Promise<Sante> {
  try { return JSON.parse(((await sql`SELECT value FROM starvibe_settings WHERE key = 'compagnon_sante'`) as { value: string }[])[0]?.value || "{}") as Sante; } catch { return {}; }
}
// deno-lint-ignore no-explicit-any
export async function noterSante(sql: any, id: string, ok: boolean, raison = ""): Promise<void> {
  try {
    const s = await lireSante(sql); s[id] = { ok, at: Date.now(), raison: ok ? "" : String(raison).slice(0, 160) };
    await sql`INSERT INTO starvibe_settings (key, value) VALUES ('compagnon_sante', ${JSON.stringify(s)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  } catch { /* la santé n'est qu'une information : jamais bloquante */ }
}
// Vérification active (gratuite) : le service d'images est interrogé pour de vrai ; seule une clé refusée (401) est une panne certaine.
// deno-lint-ignore no-explicit-any
export async function verifierConnecteurs(sql: any): Promise<Sante> {
  const base = (process.env.IMAGE_API_BASE || "https://api.openai.com").replace(/\/+$/, "");
  if (imagesDisponibles()) {
    try {
      const r = await fetch(`${base}/v1/models`, { headers: { authorization: `Bearer ${String(process.env.IMAGE_API_KEY).trim()}` }, signal: AbortSignal.timeout(8000) });
      if (r.status === 401) await noterSante(sql, "images", false, "clé refusée par le service d'images");
      else if (r.ok) await noterSante(sql, "images", true);
    } catch { /* réseau : on ne change rien */ }
  }
  return await lireSante(sql);
}
export function connecteurs(sante: Sante = {}, maintenant = Date.now()): Connecteur[] {
  const bientot = (id: string, nom: string, groupe: string, detail: string): Connecteur => ({ id, nom, groupe, statut: "bientot", detail });
  // Un connecteur dont la clé est posée est « actif » ; si son dernier vrai appel a échoué récemment, il est « erreur » et Keydou ne s'en sert pas.
  const vivant = (id: string, nom: string, groupe: string, dispo: boolean, detailOk: string, detailPas: string): Connecteur => {
    if (!dispo) return { id, nom, groupe, statut: "bientot", detail: detailPas };
    const h = sante[id];
    if (h && !h.ok && maintenant - h.at < SANTE_FRAIS_MS) return { id, nom, groupe, statut: "erreur", detail: "Impossible de se connecter pour le moment : Keydou ne l'utilise pas", raison: h.raison };
    return { id, nom, groupe, statut: "actif", detail: detailOk };
  };
  const bientotPerso = "Il demandera ton autorisation personnelle ; pas encore ouvert";
  return [
    vivant("claude", "Claude (Anthropic)", "Intelligence", true, "Le cerveau de Keydou : réponses, réflexion, lecture des photos et des PDF", ""),
    vivant("recherche", "Recherche web vérifiée", "Intelligence", true, "Informations à jour, avec leurs sources", ""),
    bientot("chatgpt", "ChatGPT (OpenAI)", "Intelligence", "Second avis d'un autre modèle ; pas encore ouvert"),
    bientot("grok", "Grok (xAI)", "Intelligence", "Pas encore ouvert"),
    bientot("llama", "Llama (Meta)", "Intelligence", "Pas encore ouvert"),
    vivant("images", "Images (OpenAI)", "Création", imagesDisponibles(), "Keydou crée des images à ta demande", "En cours d'activation"),
    vivant("voix", "Voix de Keydou (ElevenLabs)", "Création", voixDisponible(), "Keydou lit ses réponses avec sa vraie voix", "En cours d'activation"),
    bientot("kling", "Kling AI (vidéo)", "Création", "Créer de courtes vidéos ; pas encore ouvert"),
    bientot("canva", "Canva", "Création", bientotPerso),
    bientot("adobe", "Adobe", "Création", bientotPerso),
    { id: "rappels", nom: "Rappels et notifications", groupe: "Productivité", statut: "actif", detail: "Keydou te prévient au bon moment sur ton téléphone" } as Connecteur,
    bientot("gmail", "Gmail", "Productivité", bientotPerso),
    bientot("agenda", "Google Agenda", "Productivité", bientotPerso),
    bientot("drive", "Google Drive", "Productivité", bientotPerso),
    bientot("github", "GitHub", "Développement", bientotPerso),
    bientot("whatsapp", "WhatsApp Business", "Communication", bientotPerso),
  ];
}
export type CapaciteInfo = { id: string; nom: string; actif: boolean; detail: string };
export function listeCapacites(n: Niveau): CapaciteInfo[] {
  const images = imagesDisponibles() && IMAGES_PAR_MOIS(n) > 0, voix = voixDisponible() && VOIX_PAR_JOUR(n) > 0;
  return [
    { id: "discussion", nom: "Discussion avec Keydou", actif: true, detail: n === "essai" ? "5 messages d'essai, puis abonnement" : "Questions du quotidien et culture générale" },
    { id: "domaines", nom: "Domaines d'expertise", actif: n !== "essai", detail: n === "essai" ? "Avec l'abonnement" : "Santé (sans prescription), droit, cuisine, mécanique, business, études, tests notés sur 10" },
    { id: "sources", nom: "Réponses vérifiées avec sources", actif: n !== "essai", detail: n === "essai" ? "Avec l'abonnement" : "Recherche sur Internet, sources citées" },
    { id: "pieces", nom: "Lecture de photos et de PDF", actif: n !== "essai", detail: n === "essai" ? "Avec l'abonnement" : `${PIECES_PAR_JOUR(n)} fichiers par jour` },
    { id: "images", nom: "Création d'images", actif: images, detail: images ? (n === "essai" ? `${IMAGES_PAR_MOIS(n)} images d'essai` : `${IMAGES_PAR_MOIS(n)} images par mois`) : (n === "essai" ? "Avec l'abonnement" : imagesDisponibles() ? "Réservée à l'offre Complet" : "En cours d'activation") },
    { id: "voix", nom: "Voix de Keydou", actif: voix, detail: voix ? `${VOIX_PAR_JOUR(n)} lectures par jour` : (n === "essai" ? "Avec l'offre Complet" : "Voix de ton téléphone en attendant") },
    { id: "rappels", nom: "Rappels et mémoire", actif: n !== "essai", detail: n === "essai" ? "Avec l'abonnement" : "Rendez-vous, anniversaires, habitudes ; jamais de médicaments ni de codes secrets" },
  ];
}

