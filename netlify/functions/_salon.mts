// Le Salon KOMYO : appel vidéo en groupe (famille ou amis) sur LiveKit Cloud.
// Ce module ne contient AUCUN secret : l'adresse du projet et les clés viennent des variables d'environnement Netlify
// LIVEKIT_URL (wss://…livekit.cloud), LIVEKIT_API_KEY et LIVEKIT_API_SECRET.
import { SignJWT } from "jose";

export type Niveau = "gratuit" | "famille";
// Limites (décision de Carry) : Famille jusqu'à 10 personnes ; sans abonnement, le seuil de 4 personnes n'est pas annoncé (message au 5e participant).
export const LIMITES: Record<Niveau, { label: string; personnes: number; minutes: number; salonsParSemaine: number | null; minutesParticipantsParMois: number | null }> = {
  gratuit: { label: "Gratuit", personnes: 4, minutes: 20, salonsParSemaine: 2, minutesParticipantsParMois: null },
  famille: { label: "Famille", personnes: 10, minutes: 60, salonsParSemaine: null, minutesParticipantsParMois: 1500 },
};
export const TARIF_MINUTE_USD = 0.0005;   // LiveKit Cloud (offre Ship), par minute et par personne : à confirmer sur la page officielle

// Règle des places : tout le monde peut ouvrir un salon et inviter ; à partir du 5e participant, la personne qui a ouvert le salon doit avoir l'abonnement Famille.
// La salle LiveKit est toujours créée avec le plafond Famille (10) ; c'est l'API qui fait respecter le seuil gratuit avant de remettre un jeton.
export const SEUIL_SANS_ABONNEMENT = 4;
export const PLAFOND_SALLE = 10;
export function placeRefusee(hoteSansAbonnement: boolean, presents: number, dejaDansLaSalle: boolean): boolean {
  return hoteSansAbonnement && !dejaDansLaSalle && presents >= SEUIL_SANS_ABONNEMENT;
}
export const MSG_PLACES_INVITE = "Ce salon a atteint son nombre de places gratuites. Pour réunir 5 personnes ou plus, la personne qui l'a ouvert doit passer à l'abonnement Famille (1 500 FCFA pour 30 jours). Elle vient d'être prévenue.";
export const MSG_PLACES_HOTE = "Quelqu'un veut rejoindre ton salon, mais vous êtes déjà 4. Pour réunir 5 personnes ou plus, passe à l'abonnement Famille (1 500 FCFA pour 30 jours).";

export function niveauDe(famille: boolean): Niveau { return famille ? "famille" : "gratuit"; }
// Pendant le test fermé, les testeurs invités par l'équipe ont les capacités Famille (10 personnes, 60 minutes) et aucun plafond de salons.
export function niveauEffectif(famille: boolean, testeur: boolean): Niveau { return famille || testeur ? "famille" : "gratuit"; }
export function verdictPour(niveau: Niveau, testeur: boolean, salonsSemaine: number, minutesParticipantsMois: number): { ok: boolean; raison: string } {
  return testeur ? { ok: true, raison: "" } : verdictCreation(niveau, salonsSemaine, minutesParticipantsMois);
}

// Peut-on créer un nouveau salon ? Retourne un message clair pour la personne, sans jargon.
export function verdictCreation(niveau: Niveau, salonsSemaine: number, minutesParticipantsMois: number): { ok: boolean; raison: string } {
  const l = LIMITES[niveau];
  if (l.salonsParSemaine !== null && salonsSemaine >= l.salonsParSemaine) {
    return { ok: false, raison: `Tu as déjà ouvert ${l.salonsParSemaine} salons cette semaine. Reviens la semaine prochaine, ou passe à l'abonnement Famille pour des salons plus longs et plus grands.` };
  }
  if (l.minutesParticipantsParMois !== null && minutesParticipantsMois >= l.minutesParticipantsParMois) {
    return { ok: false, raison: "Tu as utilisé tout ton temps de Salon de ce mois-ci. Il se renouvelle dans quelques jours." };
  }
  return { ok: true, raison: "" };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sans 0, O, 1, I pour éviter les erreurs de lecture
export function nouveauCode(longueur = 8): string {
  const b = new Uint8Array(longueur); crypto.getRandomValues(b);
  let c = ""; for (const x of b) c += ALPHABET[x % ALPHABET.length];
  return c;
}
export const codeValide = (c: string) => /^[A-HJ-NP-Z2-9]{8}$/.test(c);

// Minutes-participant estimées pour une entrée : le temps restant du salon (estimation prudente, jamais sous-estimée).
export function minutesEstimees(finAt: Date, maintenant = new Date()): number {
  return Math.max(1, Math.ceil((finAt.getTime() - maintenant.getTime()) / 60000));
}

export function configLk() {
  const url = (process.env.LIVEKIT_URL || "").trim();
  const key = (process.env.LIVEKIT_API_KEY || "").trim();
  const secret = (process.env.LIVEKIT_API_SECRET || "").trim();
  return { url, key, secret, pret: !!(url && key && secret) };
}
export const httpDe = (wss: string) => wss.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:").replace(/\/+$/, "");

async function signer(claims: Record<string, unknown>, identite: string, dureeSec: number): Promise<string> {
  const { key, secret } = configLk();
  if (!key || !secret) throw new Error("Le Salon n'est pas encore branché (clés LiveKit manquantes).");
  return await new SignJWT(claims).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuer(key).setSubject(identite)
    .setNotBefore(Math.floor(Date.now() / 1000) - 10).setExpirationTime(Math.floor(Date.now() / 1000) + dureeSec).sign(new TextEncoder().encode(secret));
}

// Jeton pour entrer dans un salon (valable seulement jusqu'à la fin prévue du salon : le coût est ainsi borné).
export async function jetonEntree(salon: string, identite: string, nom: string, dureeSec: number): Promise<string> {
  return await signer({ name: nom, video: { room: salon, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true } }, identite, Math.max(60, Math.min(dureeSec, 3 * 3600)));
}

// Appels d'administration (créer, retirer, couper, fermer) : service « RoomService » de LiveKit.
export async function lkAdmin(methode: string, corps: Record<string, unknown>, salon?: string): Promise<Record<string, unknown>> {
  const { url } = configLk();
  const grant = methode === "CreateRoom" ? { roomCreate: true } : { roomAdmin: true, room: salon || "" };
  const jeton = await signer({ video: grant }, "komyo-serveur", 60);
  const r = await fetch(`${httpDe(url)}/twirp/livekit.RoomService/${methode}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${jeton}` }, body: JSON.stringify(corps) });
  const t = await r.text(); let d: Record<string, unknown> = {};
  try { d = t ? JSON.parse(t) : {}; } catch { /* réponse vide */ }
  if (!r.ok) throw new Error(`LiveKit ${methode} : ${r.status} ${String(d.msg || t).slice(0, 160)}`);
  return d;
}
export async function creerPiece(code: string, max: number, dureeMin: number) {
  return await lkAdmin("CreateRoom", { name: code, max_participants: max, empty_timeout: 300, departure_timeout: 20, metadata: JSON.stringify({ fin: Date.now() + dureeMin * 60000 }) });
}
// Si la pièce a disparu (vide plus de 5 minutes), LiveKit la recrée à l'entrée SANS nos limites : on la remet d'abord avec le bon plafond.
export async function assurerPiece(code: string, max: number, finAt: Date) {
  const restant = Math.max(1, Math.ceil((finAt.getTime() - Date.now()) / 60000));
  try { await creerPiece(code, max, restant); } catch { /* la pièce existe déjà ou le service est lent : l'entrée reste possible */ }
}
// Qui est dans la salle en ce moment (identités). Une erreur du service vidéo donne une liste vide : l'entrée reste possible.
export async function presentsDans(code: string): Promise<string[]> {
  try {
    const l = (await lkAdmin("ListParticipants", { room: code }, code)) as { participants?: { identity: string }[] };
    return (l.participants || []).map((p) => p.identity);
  } catch { return []; }
}
// Message privé à un participant de la salle (par exemple l'hôte). Sans gravité si ça échoue.
export async function prevenir(code: string, identite: string, message: Record<string, unknown>): Promise<void> {
  try {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(message))));
    await lkAdmin("SendData", { room: code, data, kind: "RELIABLE", destination_identities: [identite], topic: "salon" }, code);
  } catch { /* le message d'erreur donné à l'invité suffit */ }
}
export async function retirer(code: string, identite: string) { return await lkAdmin("RemoveParticipant", { room: code, identity: identite }, code); }
export async function fermerPiece(code: string) { return await lkAdmin("DeleteRoom", { room: code }, code); }
export async function couperMicro(code: string, identite: string): Promise<number> {
  const l = (await lkAdmin("ListParticipants", { room: code }, code)) as { participants?: { identity: string; tracks?: { sid: string; type: string | number; muted?: boolean }[] }[] };
  const p = (l.participants || []).find((x) => x.identity === identite);
  let n = 0;
  for (const t of p?.tracks || []) {
    if ((t.type === "AUDIO" || t.type === 0) && !t.muted) { await lkAdmin("MutePublishedTrack", { room: code, identity: identite, track_sid: t.sid, muted: true }, code); n++; }
  }
  return n;
}
