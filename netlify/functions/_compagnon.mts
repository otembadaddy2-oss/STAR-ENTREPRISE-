// Keydou Compagnon : l'assistant personnel de KOMYO (version testeurs).
// Règles décidées par Carry (8/11/2026) :
//  - retient rendez-vous, anniversaires, habitudes ; JAMAIS les médicaments ;
//  - culture générale, recherche Internet avec sources, aveu quand il n'est pas sûr ;
//  - deux niveaux : Essentiel (65 messages par jour) et Complet (200 messages par jour) ;
//  - limite atteinte : « reviens dans 4 h 12 min » (fenêtre glissante de 24 heures) ;
//  - consentement avant tout, et possibilité de tout effacer ;
//  - jamais gratuit : accès par abonnement validé (ou testeur invité par l'équipe pendant les essais).
import webpush from "web-push";
import { vapidKeys } from "./_push.mts";

export type Niveau = "essentiel" | "complet";
export const LIMITES: Record<Niveau, { label: string; messages: number; recherches: number; rappels: number }> = {
  essentiel: { label: "Essentiel", messages: 65, recherches: 5, rappels: 10 },
  complet: { label: "Complet", messages: 200, recherches: 30, rappels: 500 },
};
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
export interface Acces { niveau: Niveau; source: "abonnement" | "test"; fin: string | null }
// deno-lint-ignore no-explicit-any
export async function accesDe(sql: any, accountId: number): Promise<Acces | null> {
  const ab = (await sql`
    SELECT plan, expires_at FROM starvibe_subscriptions
    WHERE account_id = ${accountId} AND plan IN ('compagnon', 'compagnon_complet') AND statut = 'actif' AND montant_attendu > 0 AND expires_at > now()
    ORDER BY (plan = 'compagnon_complet') DESC, expires_at DESC LIMIT 1
  `) as { plan: string; expires_at: string }[];
  if (ab[0]) return { niveau: ab[0].plan === "compagnon_complet" ? "complet" : "essentiel", source: "abonnement", fin: ab[0].expires_at };
  const t = (await sql`SELECT test, niveau_test FROM starvibe_compagnon_profil WHERE account_id = ${accountId}`) as { test: boolean; niveau_test: string }[];
  if (t[0]?.test) return { niveau: t[0].niveau_test === "complet" ? "complet" : "essentiel", source: "test", fin: null };
  return null;
}

export interface Etat {
  messagesUtilises: number; messagesMax: number; recherchesUtilisees: number; recherchesMax: number;
  rappelsActifs: number; rappelsMax: number; revenirDans: string; revenirDansMs: number;
}
// deno-lint-ignore no-explicit-any
export async function etatQuota(sql: any, accountId: number, niveau: Niveau): Promise<Etat> {
  const lim = LIMITES[niveau];
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
3. Pour une information récente, un chiffre, un prix, un fait que tu ne connais pas avec certitude, tu CHERCHES sur Internet si l'outil est disponible, et tu dis d'où vient l'information. Si tu n'es pas sûr, tu le dis franchement. Tu n'inventes jamais un chiffre, une adresse, un numéro de téléphone, une citation ni une source.
4. Tu es un assistant, pas un médecin, un avocat ou un conseiller financier : pour la santé, le droit ou l'argent tu donnes des repères généraux et tu invites à consulter un professionnel pour toute décision importante.

RÈGLES ABSOLUES
- MÉDICAMENTS : tu ne retiens JAMAIS de rappel de médicament, de traitement, de dose ou d'ordonnance, et tu n'en parles pas comme d'un rappel. Tu expliques gentiment que c'est trop important pour risquer une erreur et tu renvoies vers le médecin ou le pharmacien. Tu peux en revanche rappeler un rendez-vous médical (consultation, analyses).
- Jamais de code secret, de code PIN, de mot de passe ni de numéro de carte : si on t'en donne un, tu demandes de ne pas le partager et tu ne le retiens pas.
- Tu ne prétends jamais avoir fait une chose que tu n'as pas faite : un rappel n'existe que si tu l'as ajouté dans le champ "rappels" ci-dessous.
- Tu ne donnes aucune information sur d'autres personnes. Tu ne fais rien d'illégal ni de dangereux.
- Tu ne présentes pas de promesse de gain, de guérison ou de résultat garanti.

FORMAT DE SORTIE : un seul objet JSON, sans texte autour :
{"reponse":"ton message à la personne","rappels":[{"titre":"…","quand":"AAAA-MM-JJTHH:MM","repetition":"","avant_minutes":0}],"notes":["…"],"supprimer_rappels":[]}
- "quand" est l'heure LOCALE de la personne (le fuseau est donné dans le contexte), jamais en UTC.
- "repetition" vaut "", "jour", "semaine", "mois" ou "an". "avant_minutes" (0 à 2880) ajoute un premier rappel à l'avance (1440 = la veille à la même heure).
- "notes" : faits durables utiles à retenir (préférences, prénoms des proches, habitudes), formulés en une courte phrase. Jamais de médicaments ni de secrets.
- "supprimer_rappels" : numéros de rappels à supprimer si la personne le demande.
- Laisse les listes vides quand il n'y a rien à ajouter. Ne mets rien dans "rappels" si la personne n'a pas demandé de rappel.`;
}

// ---------- Fin d'abonnement ----------
export const OFFRES_TXT = "Essentiel 5 000 FCFA ou Complet 19 $ par mois";
export function texteFinAbonnement(fin: Date): string {
  const quand = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Brazzaville", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(fin);
  return `Ton abonnement Keydou Compagnon se termine le ${quand} (heure de Brazzaville). Pour continuer à profiter de Keydou, réabonne-toi ou reconduis ton abonnement mensuel : ${OFFRES_TXT}.`;
}
// La personne a-t-elle déjà eu (ou a-t-elle) un abonnement Compagnon payé ? Elle peut alors toujours le reconduire.
// deno-lint-ignore no-explicit-any
export async function aDejaAbonne(sql: any, accountId: number): Promise<{ deja: boolean; fin: string | null }> {
  const r = (await sql`SELECT MAX(expires_at) AS fin, COUNT(*) AS n FROM starvibe_subscriptions WHERE account_id = ${accountId} AND plan IN ('compagnon', 'compagnon_complet') AND statut = 'actif' AND montant_attendu > 0`) as { fin: string | null; n: string }[];
  return { deja: Number(r[0]?.n || 0) > 0, fin: r[0]?.fin || null };
}
