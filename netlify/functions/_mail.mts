// Envoi d'e-mails de l'équipe (boîte contact@starentreprise.com, Hostinger Email).
// Le mot de passe de la boîte n'est JAMAIS dans le code : il se met dans Netlify → Environment variables (SMTP_PASS).
// Sans SMTP_PASS, rien n'est envoyé et le message reste quand même enregistré dans le back-office.
import nodemailer from "nodemailer";

export interface MailContact { nom: string; contact: string; message: string; email?: string }

const HOST = () => process.env.SMTP_HOST || "smtp.hostinger.com";
const PORT = () => Number(process.env.SMTP_PORT) || 465;
const USER = () => process.env.SMTP_USER || "contact@starentreprise.com";
const TO = () => process.env.CONTACT_TO || "contact@starentreprise.com";


// ----- Signature officielle KOMYO : logo + slogan + adresse, au bas de chaque e-mail important -----
const SITE = "https://komyo.starentreprise.com";
export const SLOGAN = "KOMYO, le monde en mouvement";
export const LOGO_MAIL = `${SITE}/starvibe/assets/img/icons/komyo-logo-officiel-mail-v1.png`;
export const SIGNATURE_TEXTE = `\n\n—\nKOMYO — le monde en mouvement\nkomyo.starentreprise.com · une application STAR ENTREPRISE\ncontact@starentreprise.com`;
const esc = (t: string) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
export function signatureHtml(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:2px solid #E8A93D;width:100%;max-width:540px"><tr>` +
    `<td style="padding-top:14px;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#241536">` +
    `<b style="font-size:16px;color:#241536">KOMYO — le monde en mouvement</b><br>` +
    `<a href="${SITE}" style="color:#c2410c;font-weight:bold;text-decoration:none">komyo.starentreprise.com</a><br>` +
    `<span style="color:#6b5f80;font-size:12px">Une application STAR ENTREPRISE · contact@starentreprise.com</span></td>` +
    `<td style="padding-top:14px;vertical-align:middle;text-align:right;width:130px"><a href="${SITE}"><img src="${LOGO_MAIL}" alt="KOMYO" width="116" style="display:block;margin-left:auto;border:0;max-width:116px;height:auto"></a></td>` +
    `</tr></table>`;
}
// Texte brut -> HTML (échappé) avec la signature : le texte reste lisible partout, la version HTML porte le logo.
export function enHtml(texte: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#241536">${esc(texte).replace(/\n/g, "<br>")}${signatureHtml()}</div>`;
}

// Pur et testable : construit le message sans l'envoyer. L'adresse du visiteur n'est utilisée que pour « Répondre ».
export function messageContact(m: MailContact) {
  const oneLine = (s: string, n: number) => String(s || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
  const reponse = /^[^\s@<>,;]{1,64}@[^\s@<>,;]{1,63}\.[^\s@<>,;]{2,}$/.test(m.email || "") ? (m.email as string) : undefined;
  const nom = oneLine(m.nom, 80) || "Visiteur KOMYO";
  const corps = `Nouveau message reçu depuis le formulaire de KOMYO.\n\nDe : ${nom}\nPour répondre : ${oneLine(m.contact, 120) || "(non indiqué)"}\n\n${String(m.message || "").slice(0, 4000)}`;
  return {
    from: `"KOMYO — formulaire" <${USER()}>`,
    to: TO(),
    replyTo: reponse,
    subject: `Message KOMYO de ${nom}`,
    text: corps + SIGNATURE_TEXTE,
    html: enHtml(corps),
  };
}

// Retourne true si le message est parti, false sinon (jamais d'exception : le visiteur ne doit pas voir d'erreur technique).
export async function envoyerContact(m: MailContact): Promise<boolean> {
  const pass = process.env.SMTP_PASS;
  if (!pass) return false;
  try {
    const t = nodemailer.createTransport({ host: HOST(), port: PORT(), secure: PORT() === 465, auth: { user: USER(), pass }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 });
    await t.sendMail(messageContact(m));
    return true;
  } catch {
    return false;
  }
}

// Accusé de réception pour la personne qui a écrit via le formulaire (aucun texte du visiteur n'y est repris).
const ACCUSE_CORPS = "Bonjour,\n\nTon message est bien arrivé à l'équipe STAR ENTREPRISE (KOMYO). Nous te répondons dès que possible.\n\nEn attendant, tu peux découvrir KOMYO sur komyo.starentreprise.com : l'application vidéo pour apprendre, créer et partager.\n\nÀ très vite,\nKeydou, de l'équipe STAR ENTREPRISE\n\nCet e-mail est un accusé de réception automatique. Si tu n'as écrit à personne, tu peux l'ignorer.";
export function messageAccuse(email: string) {
  return {
    from: `"Keydou — KOMYO" <${USER()}>`,
    to: email,
    subject: "KOMYO : nous avons bien reçu ton message",
    text: ACCUSE_CORPS + SIGNATURE_TEXTE,
    html: enHtml(ACCUSE_CORPS),
  };
}

export async function envoyerAccuse(email: string): Promise<boolean> {
  const pass = process.env.SMTP_PASS;
  if (!pass) return false;
  try {
    const t = nodemailer.createTransport({ host: HOST(), port: PORT(), secure: PORT() === 465, auth: { user: USER(), pass }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 });
    await t.sendMail(messageAccuse(email));
    return true;
  } catch {
    return false;
  }
}
