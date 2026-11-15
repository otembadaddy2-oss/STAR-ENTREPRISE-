// Keydou Compagnon : l'assistant personnel de KOMYO (version testeurs).
// Règles décidées par Carry (8/11/2026) :
//  - retient rendez-vous, anniversaires, habitudes ; JAMAIS les médicaments ;
//  - culture générale, vérification avec sources, aveu quand il n'est pas sûr ;
//  - deux niveaux : Essentiel (65 messages par jour) et Complet (200 messages par jour) ;
//  - limite atteinte : « reviens dans 4 h 12 min » (fenêtre glissante de 24 heures) ;
//  - consentement avant tout, et possibilité de tout effacer ;
//  - essai gratuit de 5 messages (tout membre), puis accès par abonnement validé (ou testeur invité par l'équipe).
import webpush from "web-push";
import { vapidKeys } from "./_push.mts";

// « essai » : tout membre KOMYO peut installer Keydou ; sans abonnement il a quelques messages d'essai, puis on lui propose l'offre.
export type Niveau = "essai" | "essentiel" | "complet" | "premium" | "prestige";
export const ESSAI_MESSAGES = 5;   // en tout, pas par jour
// Les quatre abonnements (paiement par dépôt Mobile Money) et le niveau qu'ils ouvrent.
export const NIVEAU_DU_PLAN: Record<string, Niveau> = { compagnon: "essentiel", compagnon_complet: "complet", compagnon_premium: "premium", compagnon_prestige: "prestige" };
export const PLANS_COMPAGNON_IDS = Object.keys(NIVEAU_DU_PLAN);
export const RANG: Record<Niveau, number> = { essai: 0, essentiel: 1, complet: 2, premium: 3, prestige: 4 };
export const estPro = (n: Niveau): boolean => RANG[n] >= RANG.complet;   // Complet, Premium, Prestige : modes approfondis, voix, tests notés
export const niveauValide = (v: unknown): Niveau => (["essentiel", "complet", "premium", "prestige"].includes(String(v)) ? (String(v) as Niveau) : "essentiel");
// Avantages par niveau (tout ce qui est annoncé aux clients vient d'ici : rien n'est promis sans être appliqué).
export interface Avantages { label: string; messages: number; recherches: number; rappels: number; images: number; pieces: number; voix: number; notes: number; historique: number; jetonsGeneral: number; jetonsProfond: number; effortGeneral: string; effortProfond: string; longueurReponse: number; remisePack: number }
export const AVANTAGES: Record<Niveau, Avantages> = {
  essai:     { label: "Essai gratuit", messages: ESSAI_MESSAGES, recherches: 0,   rappels: 0,    images: 2,   pieces: 0,  voix: 0,  notes: 80,  historique: 12, jetonsGeneral: 1400, jetonsProfond: 2600, effortGeneral: "low",    effortProfond: "medium", longueurReponse: 1800, remisePack: 0 },
  essentiel: { label: "Essentiel",     messages: 65,  recherches: 10,  rappels: 10,   images: 10,  pieces: 5,  voix: 0,  notes: 80,  historique: 12, jetonsGeneral: 1400, jetonsProfond: 2600, effortGeneral: "low",    effortProfond: "medium", longueurReponse: 1800, remisePack: 0 },
  complet:   { label: "Complet",       messages: 200, recherches: 30,  rappels: 500,  images: 35,  pieces: 30, voix: 6,  notes: 80,  historique: 12, jetonsGeneral: 2200, jetonsProfond: 4500, effortGeneral: "medium", effortProfond: "high",   longueurReponse: 1800, remisePack: 0 },
  premium:   { label: "Premium",       messages: 350, recherches: 60,  rappels: 1000, images: 70,  pieces: 50, voix: 15, notes: 150, historique: 20, jetonsGeneral: 3000, jetonsProfond: 6000, effortGeneral: "medium", effortProfond: "high",   longueurReponse: 2600, remisePack: 10 },
  prestige:  { label: "Prestige",      messages: 500, recherches: 100, rappels: 2000, images: 120, pieces: 80, voix: 30, notes: 300, historique: 30, jetonsGeneral: 4000, jetonsProfond: 8000, effortGeneral: "high",   effortProfond: "high",   longueurReponse: 3500, remisePack: 20 },
};
export const MSG_ESSAI_FINI = "Tu as utilisé tes 5 messages d'essai. Pour continuer avec Keydou et profiter de toutes ses options (rappels, photos et documents, recherches vérifiées, images, voix), choisis ton offre : Essentiel à 5 000 FCFA par mois, Complet (Pro) à 19 $, Premium à 35 $ ou Prestige à 49 $ par mois. Touche « Voir les offres ».";
export const MSG_OPTION_ABONNE = "Cette option est comprise dans l'abonnement : Essentiel 5 000 FCFA par mois, ou Complet (Pro) 19 $, Premium 35 $, Prestige 49 $ par mois pour encore plus d'options.";
export const LIMITES: Record<Niveau, { label: string; messages: number; recherches: number; rappels: number }> = Object.fromEntries(
  (Object.keys(AVANTAGES) as Niveau[]).map((n) => [n, { label: AVANTAGES[n].label, messages: AVANTAGES[n].messages, recherches: AVANTAGES[n].recherches, rappels: AVANTAGES[n].rappels }])) as Record<Niveau, { label: string; messages: number; recherches: number; rappels: number }>;
export const FENETRE_MS = 24 * 3600 * 1000;
export const CONSENTEMENT_VERSION = "v1";
export const REPETITIONS = ["", "jour", "semaine", "mois", "an"];
export const MODELE = () => process.env.COMPAGNON_MODEL || "claude-sonnet-5-5";

// ---------- Médicaments : refusés partout (rappels, notes) ----------
const MEDOC = /m[ée]dicament|\bm[ée]ds?\b|comprim[ée]|pilule|g[ée]lule|sirop|insuline|antibioti|antipalud|parac[ée]tamol|ibuprof|posologie|ordonnance|cachets?\b|prendre (mon|ma|mes) (traitement|rem[èe]de)|mon traitement/i;
export const parleDeMedicaments = (t: string) => MEDOC.test(String(t || ""));

// ---------- Durées : « 4 h 12 min » ----------
export function formatDuree(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")} min`;
}

// Fenêtre glissante : `dates` = heures (ms) des messages envoyés pendant les 24 dernières heures, du plus ancien au plus récent.
// Renvoie le temps à attendre (ms) avant de pouvoir écrire de nouveau, 0 si la limite n'est pas atteinte.
export function delaiRetour(dates: number[], limite: number, maintenant: number): number {
  if (dates.length < limite) return 0;
  const gene = dates[dates.length - limite]; // le message qui doit sortir de la fenêtre pour libérer une place
  return Math.max(0, gene + FENETRE_MS - maintenant);
}

// ---------- Fuseau horaire ----------
export function fuseauValide(tz: unknown): string {
  const z = String(tz || "").slice(0, 60);
  try { new Intl.DateTimeFormat("fr-FR", { timeZone: z }); return z || "Africa/Brazzaville"; } catch { return "Africa/Brazzaville"; }
}
function decalageMs(utcMs: number, tz: string): number {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs;
}
// « 2026-03-13T18:00 » à l'heure locale de `tz` → instant UTC. null si le texte est invalide.
export function localVersUtc(s: string, tz: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(s || ""));
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if (!Number.isFinite(guess)) return null;
  let t = guess - decalageMs(guess, tz);
  t = guess - decalageMs(t, tz);
  return new Date(t);
}
export function heureLocale(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}
// Prochaine échéance d'un rappel qui se répète (toujours après `apres`).
export function suivante(quand: Date, rep: string, apres: Date): Date {
  const d = new Date(quand.getTime());
  const pas = () => {
    if (rep === "jour") d.setUTCDate(d.getUTCDate() + 1);
    else if (rep === "semaine") d.setUTCDate(d.getUTCDate() + 7);
    else if (rep === "mois") d.setUTCMonth(d.getUTCMonth() + 1);
    else if (rep === "an") d.setUTCFullYear(d.getUTCFullYear() + 1);
    else return false;
    return true;
  };
  for (let i = 0; i < 4000 && d.getTime() <= apres.getTime(); i++) if (!pas()) break;
  return d;
}

// ---------- Droits d'accès ----------
export interface Acces { niveau: Niveau; source: "abonnement" | "test" | "essai" | "entreprise"; fin: string | null; entrepriseId?: number; entrepriseNom?: string }
// Poste d'une équipe : le membre a accepté l'invitation de son entreprise, et l'entreprise a un forfait Équipe en cours (payé par le gérant).
// Un poste ouvre le niveau « Complet ». Les plans d'équipe sont décrits dans _entreprise.mts ; ici seule la lecture est nécessaire.
// deno-lint-ignore no-explicit-any
export async function accesEquipe(sql: any, accountId: number): Promise<Acces | null> {
  const r = (await sql`
    SELECT e.id, e.nom, MAX(s.expires_at) AS fin
    FROM starvibe_entreprise_membres m
    JOIN starvibe_entreprises e ON e.id = m.entreprise_id AND e.ferme = false
    JOIN starvibe_subscriptions s ON s.account_id = e.gerant_id AND s.plan LIKE 'entreprise_equipe_%' AND s.statut = 'actif' AND s.montant_attendu > 0 AND s.expires_at > now()
    WHERE m.account_id = ${accountId} AND m.statut = 'actif'
    GROUP BY e.id, e.nom LIMIT 1
  `) as { id: number; nom: string; fin: string }[];
  return r[0] ? { niveau: "complet", source: "entreprise", fin: r[0].fin, entrepriseId: r[0].id, entrepriseNom: r[0].nom } : null;
}
// deno-lint-ignore no-explicit-any
export async function accesDe(sql: any, accountId: number): Promise<Acces | null> {
  const ab = (await sql`
    SELECT plan, expires_at FROM starvibe_subscriptions
    WHERE account_id = ${accountId} AND plan IN ('compagnon', 'compagnon_complet', 'compagnon_premium', 'compagnon_prestige') AND statut = 'actif' AND montant_attendu > 0 AND expires_at > now()
    ORDER BY (CASE plan WHEN 'compagnon_prestige' THEN 4 WHEN 'compagnon_premium' THEN 3 WHEN 'compagnon_complet' THEN 2 ELSE 1 END) DESC, expires_at DESC LIMIT 1
  `) as { plan: string; expires_at: string }[];
  const eq = await accesEquipe(sql, accountId);
  if (ab[0] && (!eq || RANG[NIVEAU_DU_PLAN[ab[0].plan] || "essentiel"] >= RANG[eq.niveau])) return { niveau: NIVEAU_DU_PLAN[ab[0].plan] || "essentiel", source: "abonnement", fin: ab[0].expires_at };
  if (eq) return eq;
  const t = (await sql`SELECT test, niveau_test FROM starvibe_compagnon_profil WHERE account_id = ${accountId}`) as { test: boolean; niveau_test: string }[];
  if (t[0]?.test) return { niveau: niveauValide(t[0].niveau_test), source: "test", fin: null };
  // Jamais abonné : essai gratuit (tout le monde peut télécharger Keydou). Un ancien abonné qui n'a pas reconduit n'a pas de nouvel essai.
  if (!(await aDejaAbonne(sql, accountId)).deja) return { niveau: "essai", source: "essai", fin: null };
  return null;
}

export interface Etat {
  messagesUtilises: number; messagesMax: number; recherchesUtilisees: number; recherchesMax: number;
  rappelsActifs: number; rappelsMax: number; revenirDans: string; revenirDansMs: number;
}
// deno-lint-ignore no-explicit-any
export async function etatQuota(sql: any, accountId: number, niveau: Niveau): Promise<Etat> {
  const lim = LIMITES[niveau];
  if (niveau === "essai") {   // l'essai se compte en tout, sans délai de retour
    const n = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_messages WHERE account_id = ${accountId} AND role = 'user'`) as { n: string }[])[0]?.n || 0);
    return { messagesUtilises: n, messagesMax: lim.messages, recherchesUtilisees: 0, recherchesMax: 0, rappelsActifs: 0, rappelsMax: 0, revenirDans: "", revenirDansMs: 0 };
  }
  const msgs = (await sql`SELECT created_at, role, recherches FROM starvibe_compagnon_messages WHERE account_id = ${accountId} AND created_at > now() - interval '24 hours' ORDER BY created_at ASC`) as { created_at: string; role: string; recherches: number }[];
  const users = msgs.filter((m) => m.role === "user").map((m) => new Date(m.created_at).getTime());
  const recherches = msgs.reduce((n, m) => n + (m.recherches || 0), 0);
  const act = (await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_rappels WHERE account_id = ${accountId} AND actif = true`) as { n: string }[];
  const ms = delaiRetour(users, lim.messages, Date.now());
  return { messagesUtilises: users.length, messagesMax: lim.messages, recherchesUtilisees: recherches, recherchesMax: lim.recherches, rappelsActifs: Number(act[0]?.n || 0), rappelsMax: lim.rappels, revenirDans: ms > 0 ? formatDuree(ms) : "", revenirDansMs: ms };
}

// ---------- Notifications du téléphone du membre ----------
// deno-lint-ignore no-explicit-any
export async function pushCompte(sql: any, accountId: number, payload: { title: string; body: string; tag?: string; url?: string }): Promise<number> {
  const { publicKey, privateKey } = vapidKeys();
  webpush.setVapidDetails("mailto:contact@starentreprise.com", publicKey, privateKey);
  const subs = (await sql`SELECT id, endpoint, p256dh, auth FROM starvibe_compagnon_push WHERE account_id = ${accountId}`) as { id: number; endpoint: string; p256dh: string; auth: string }[];
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...payload, url: payload.url || "/starvibe/compagnon.html" }), { TTL: 6 * 3600, urgency: "high" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sql`DELETE FROM starvibe_compagnon_push WHERE id = ${s.id}`;
    }
  }
  return sent;
}

// ---------- Consigne de Keydou Compagnon ----------
export function consigne(): string {
  return `Tu es Keydou, l'assistant personnel de KOMYO (STAR ENTREPRISE, Congo-Brazzaville) : un ours chaleureux, sérieux et fiable qui accompagne une personne au quotidien. Tu parles français simple, avec chaleur, en réponses courtes (2 à 6 phrases) sauf si on te demande du détail. Tu réponds dans la langue de la personne.

CE QUE TU FAIS
1. Tu retiens ce qu'on te demande de retenir : rendez-vous, anniversaires, habitudes (marcher, lire, prier, appeler un proche…), idées, listes. Tu crées des rappels avec une date et une heure précises ; si l'heure manque, tu proposes une heure raisonnable ou tu la demandes en une phrase.
2. Tu réponds avec une vraie culture générale (histoire, géographie, sciences, religions, langues, cuisine, droit usuel, finances de base, santé générale, culture africaine et mondiale…).
3. Pour une information récente, un chiffre, un prix, une question technique (appareil, démarche, fait précis) ou un fait que tu ne connais pas avec certitude, tu VÉRIFIES avec l'outil de recherche s'il est disponible, puis tu réponds. Tu ne parles pas de ton fonctionnement : tu dis simplement « j'ai vérifié » si c'est utile. Si tu n'es pas sûr, tu le dis franchement. Tu n'inventes jamais un chiffre, une adresse, un numéro de téléphone, une citation ni une source.
SOURCE : toute réponse qui apporte un fait, un chiffre ou un conseil technique se termine par une dernière ligne « Source : … » avec la source la plus fiable (site officiel du fabricant ou de l'institution, notice, encyclopédie reconnue). Si tu n'as pas pu vérifier, écris « Source : connaissance générale, à vérifier » et dis-le dans ta réponse. Une conversation simple (salutations, rappel ajouté) n'a pas besoin de source.
Conseils pratiques sur un appareil (électroménager…) : donne la réponse générale, demande la référence exacte du modèle si elle change la réponse, et rappelle de débrancher l'appareil avant de l'ouvrir ; pour toute partie électrique ou sous garantie, conseille un technicien.
3 bis. QUALITÉ : tu réfléchis avant de répondre, comme un ami très cultivé. Tu comprends ce que la personne veut vraiment, tu fais les calculs étape par étape, tu donnes d'abord la réponse puis l'explication utile, tu proposes la prochaine étape. Quand tu n'es pas sûr, tu le dis et tu dis comment vérifier. Tu ne prétends jamais tout savoir : ta force est la fiabilité, pas l'assurance.
3 ter. ENTREPRISES : si on te demande si Keydou peut servir une entreprise (équipe d'employés, ou assistant qui répond aux clients sur un site ou WhatsApp), tu expliques simplement : forfaits Équipe (5, 10 ou 25 personnes, à partir de 79 $ par mois) et Assistant pour les clients (à partir de 39 $ par mois), une seule facture, et tu invites à ouvrir « Keydou pour mon entreprise » dans le menu de KOMYO ou à écrire à l'équipe STAR ENTREPRISE. Tu ne promets aucune date pour WhatsApp (connexion avec l'équipe) et tu ne donnes jamais de chiffres de marge ou de coût.
4. Tu es un assistant, pas un médecin, un avocat ou un conseiller financier : pour la santé, le droit ou l'argent tu donnes des repères généraux et tu invites à consulter un professionnel pour toute décision importante.

RÈGLES ABSOLUES
- MÉDICAMENTS : tu ne retiens JAMAIS de rappel de médicament, de traitement, de dose ou d'ordonnance, et tu n'en parles pas comme d'un rappel. Tu expliques gentiment que c'est trop important pour risquer une erreur et tu renvoies vers le médecin ou le pharmacien. Tu peux en revanche rappeler un rendez-vous médical (consultation, analyses).
- Jamais de code secret, de code PIN, de mot de passe ni de numéro de carte : si on t'en donne un, tu demandes de ne pas le partager et tu ne le retiens pas.
- Tu ne prétends jamais avoir fait une chose que tu n'as pas faite : un rappel n'existe que si tu l'as ajouté dans le champ "rappels" ci-dessous.
- Tu ne donnes aucune information sur d'autres personnes. Tu ne fais rien d'illégal ni de dangereux.
- Tu ne présentes pas de promesse de gain, de guérison ou de résultat garanti.

FORMAT DE SORTIE : un seul objet JSON, sans texte autour :
{"reponse":"ton message à la personne","seuil":false,"rappels":[{"titre":"…","quand":"AAAA-MM-JJTHH:MM","repetition":"","avant_minutes":0}],"notes":["…"],"supprimer_rappels":[],"image":null}
- "image" vaut null SAUF quand la personne demande une image et que les instructions complémentaires t'y autorisent : {"prompt":"…","format":"carre"}.
- "seuil" vaut true UNIQUEMENT si le contexte dit que tes vérifications du jour sont épuisées ET que la question demandait vraiment une vérification ou une information récente ; sinon false. Ne parle pas toi-même du seuil : le système ajoute le message.
- "quand" est l'heure LOCALE de la personne (le fuseau est donné dans le contexte), jamais en UTC.
- "repetition" vaut "", "jour", "semaine", "mois" ou "an". "avant_minutes" (0 à 2880) ajoute un premier rappel à l'avance (1440 = la veille à la même heure).
- "notes" : faits durables utiles à retenir (préférences, prénoms des proches, habitudes), formulés en une courte phrase. Jamais de médicaments ni de secrets.
- "supprimer_rappels" : numéros de rappels à supprimer si la personne le demande.
- Laisse les listes vides quand il n'y a rien à ajouter. Ne mets rien dans "rappels" si la personne n'a pas demandé de rappel.`;
}

// ---------- Fin d'abonnement ----------
export const OFFRES_TXT = "Essentiel 5 000 FCFA, Complet 19 $, Premium 35 $ ou Prestige 49 $ par mois";
export function texteFinAbonnement(fin: Date): string {
  const quand = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Brazzaville", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(fin);
  return `Ton abonnement Keydou Compagnon se termine le ${quand} (heure de Brazzaville). Pour continuer à profiter de Keydou, réabonne-toi ou reconduis ton abonnement mensuel : ${OFFRES_TXT}.`;
}
// La personne a-t-elle déjà eu (ou a-t-elle) un abonnement Compagnon payé ? Elle peut alors toujours le reconduire.
// deno-lint-ignore no-explicit-any
export async function aDejaAbonne(sql: any, accountId: number): Promise<{ deja: boolean; fin: string | null }> {
  const r = (await sql`SELECT MAX(expires_at) AS fin, COUNT(*) AS n FROM starvibe_subscriptions WHERE account_id = ${accountId} AND plan IN ('compagnon', 'compagnon_complet', 'compagnon_premium', 'compagnon_prestige') AND statut = 'actif' AND montant_attendu > 0`) as { fin: string | null; n: string }[];
  return { deja: Number(r[0]?.n || 0) > 0, fin: r[0]?.fin || null };
}

// ---------- Application Keydou installable (icône à part) ----------
// Le manifeste n'est servi qu'à une personne dont l'abonnement est valide (ou testeur invité) : sans lui, le navigateur
// ne propose aucune installation. Jeton court dérivé du secret du serveur, jamais le jeton de connexion.
export function manifesteKeydou() {
  const I = "/starvibe/assets/img/icons/";
  return {
    id: "/starvibe/compagnon.html",
    name: "Keydou Compagnon",
    short_name: "Keydou",
    description: "Ton assistant personnel : rappels, culture générale, réponses vérifiées avec leurs sources.",
    start_url: "/starvibe/compagnon.html?app=1",
    scope: "/starvibe/compagnon.html",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FFFBF3",
    theme_color: "#FF6B4A",
    lang: "fr",
    icons: [
      { src: I + "keydou-192-v1.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: I + "keydou-512-v1.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: I + "keydou-192-maskable-v1.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: I + "keydou-512-maskable-v1.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

// Keydou Compagnon est ouvert à tous en permanence (téléchargement libre, essai puis abonnement). Seule une fermeture d'urgence décidée par l'équipe l'arrête.
// deno-lint-ignore no-explicit-any
export async function compagnonOuvert(sql: any): Promise<boolean> {
  return ((await sql`SELECT value FROM starvibe_settings WHERE key = 'compagnon_ferme_urgence'`) as { value: string }[])[0]?.value !== "on";
}

// ---------- Crédits d'images : packs achetés par dépôt Mobile Money (même système que les abonnements) ----------
// Un pack ajoute des images en plus du quota du mois ; le solde ne se périme pas. Une image qui échoue n'est pas décomptée.
// Prix décidés pour couvrir le coût du service d'images avec une marge : réglables ici.
export const PACKS_IMAGES: Record<string, { images: number; montant: number; label: string }> = {
  credit_images_10: { images: 10, montant: Number(process.env.PACK_IMAGES_10_FCFA) > 0 ? Math.round(Number(process.env.PACK_IMAGES_10_FCFA)) : 1200, label: "Pack 10 images" },
  credit_images_30: { images: 30, montant: Number(process.env.PACK_IMAGES_30_FCFA) > 0 ? Math.round(Number(process.env.PACK_IMAGES_30_FCFA)) : 3000, label: "Pack 30 images" },
};
// Les abonnés Premium (-10 %) et Prestige (-20 %) paient leurs packs d'images moins cher ; montant arrondi à 10 FCFA.
export const prixPack = (plan: string, niveau: Niveau): number => { const p = PACKS_IMAGES[plan]; if (!p) return 0; return Math.round((p.montant * (100 - AVANTAGES[niveau].remisePack)) / 100 / 10) * 10; };
export const estPackImages = (plan: string): boolean => Object.prototype.hasOwnProperty.call(PACKS_IMAGES, plan);
export const PACKS_TXT = (niveau: Niveau = "essentiel") => Object.entries(PACKS_IMAGES).map(([id, p]) => `${p.images} images ${prixPack(id, niveau).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} FCFA`).join(", ");
// deno-lint-ignore no-explicit-any
export async function creditsImages(sql: any, accountId: number): Promise<number> {
  const achetes = (await sql`SELECT plan, COUNT(*) AS n FROM starvibe_subscriptions WHERE account_id = ${accountId} AND plan LIKE 'credit_images_%' AND statut = 'actif' AND montant_attendu > 0 GROUP BY plan`) as { plan: string; n: string }[];
  const total = achetes.reduce((t, a) => t + (PACKS_IMAGES[a.plan]?.images || 0) * Number(a.n), 0);
  const utilises = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_images WHERE account_id = ${accountId} AND credit = true AND statut IN ('attente', 'ok')`) as { n: string }[])[0]?.n || 0);
  return Math.max(0, total - utilises);
}
