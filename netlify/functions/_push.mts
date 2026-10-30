// Notifications sur le téléphone du staff + reconnaissance automatique des dépôts.
// Aucune nouvelle clé à configurer : les clés VAPID, le code du webhook SMS et les
// liens "Oui / Non" sont dérivés de JWT_SECRET, qui reste secret côté serveur.
import { createHmac, createECDH, timingSafeEqual } from "node:crypto";
import webpush from "web-push";

function root(): string {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error("JWT_SECRET is not configured");
  return raw;
}
const b64url = (b: Buffer) => b.toString("base64url");

export function vapidKeys() {
  const priv = createHmac("sha256", root()).update("keydou-vapid-v1").digest();
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(priv);
  return { publicKey: b64url(ecdh.getPublicKey()), privateKey: b64url(priv) };
}

// Code secret à copier dans l'application de transfert de SMS (webhook).
export function smsSecret(): string {
  return createHmac("sha256", root()).update("keydou-sms-v1").digest("hex").slice(0, 32);
}
export function checkSmsSecret(given: string): boolean {
  const a = Buffer.from(smsSecret()), b = Buffer.from(given || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Lien de décision "Oui / Non" lié à une demande précise, valable 24 h.
export function decisionToken(kind: string, id: number): { exp: number; t: string } {
  const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
  const t = createHmac("sha256", root()).update(`decide:${kind}:${id}:${exp}`).digest("hex").slice(0, 40);
  return { exp, t };
}
export function checkDecisionToken(kind: string, id: number, exp: number, t: string): boolean {
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  const good = createHmac("sha256", root()).update(`decide:${kind}:${id}:${exp}`).digest("hex").slice(0, 40);
  const a = Buffer.from(good), b = Buffer.from(String(t || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string; // page ouverte au toucher de la notification
  actions?: { action: string; title: string }[];
  decide?: { kind: string; id: number; exp: number; t: string };
}

// Envoie à tous les téléphones enregistrés ; supprime ceux qui ne répondent plus.
// deno-lint-ignore no-explicit-any
export async function pushAll(sql: any, payload: PushPayload): Promise<number> {
  const { publicKey, privateKey } = vapidKeys();
  webpush.setVapidDetails("mailto:contact@starentreprise.com", publicKey, privateKey);
  const subs = (await sql`SELECT id, endpoint, p256dh, auth FROM starvibe_push_subs`) as { id: number; endpoint: string; p256dh: string; auth: string }[];
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "high" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sql`DELETE FROM starvibe_push_subs WHERE id = ${s.id}`;
    }
  }
  return sent;
}

// ---------- Lecture des SMS de dépôt ----------
export interface SmsParsed { montant: number | null; numero: string; reference: number | null; ambigu: boolean; depot: boolean }
const NUM_RECEPTION = "066565050";

function toInt(raw: string): number {
  return Number(raw.replace(/[\s.,]/g, ""));
}

export function parseSms(message: string): SmsParsed {
  const t = String(message || "").replace(/ /g, " ");
  // Montant : de préférence celui qui suit "reçu / dépôt / transfert", sinon le seul montant du message.
  const amountRe = "(\\d{1,3}(?:[ .,]\\d{3})+|\\d+)";
  const unit = "\\s*(?:FCFA|XAF|CFA|F\\b)";
  let montant: number | null = null, ambigu = false;
  const near = new RegExp("(?:re[cç]u|received|d[ée]p[oô]t|cr[ée]dit[ée]?)\\D{0,30}?" + amountRe + unit, "i").exec(t);
  if (near) montant = toInt(near[1]);
  else {
    const all = [...t.matchAll(new RegExp(amountRe + unit, "gi"))].map((m) => toInt(m[1]));
    const uniq = [...new Set(all)];
    if (uniq.length === 1) montant = uniq[0];
    else if (uniq.length > 1) ambigu = true;
  }
  // Numéro de l'expéditeur : numéro congolais (04/05/06 + 7 chiffres) autre que le numéro de réception.
  const phones = new Set<string>();
  for (const m of t.matchAll(/(?:\+?242[\s.-]?)?(0[4-6](?:[\s.-]?\d){7})/g)) {
    const d = m[1].replace(/\D/g, "");
    if (d !== NUM_RECEPTION) phones.add(d);
  }
  const numero = phones.size === 1 ? [...phones][0] : "";
  const ref = /KDU-?\s?(\d+)/i.exec(t);
  // Seuls les SMS de réception d'argent comptent : jamais un SMS d'envoi ou de solde.
  const depot = /re[cç]u|received|d[ée]p[oô]t|cr[ée]dit/i.test(t) && !/envoy[eé]|sent to|retrait|paiement de/i.test(t);
  return { montant, numero, reference: ref ? Number(ref[1]) : null, ambigu, depot };
}

export const last9 = (s: string) => String(s || "").replace(/\D/g, "").slice(-9);
