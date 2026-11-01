// Envoi d'e-mails de l'équipe (boîte contact@starentreprise.com, Hostinger Email).
// Le mot de passe de la boîte n'est JAMAIS dans le code : il se met dans Netlify → Environment variables (SMTP_PASS).
// Sans SMTP_PASS, rien n'est envoyé et le message reste quand même enregistré dans le back-office.
import nodemailer from "nodemailer";

export interface MailContact { nom: string; contact: string; message: string; email?: string }

const HOST = () => process.env.SMTP_HOST || "smtp.hostinger.com";
const PORT = () => Number(process.env.SMTP_PORT) || 465;
const USER = () => process.env.SMTP_USER || "contact@starentreprise.com";
const TO = () => process.env.CONTACT_TO || "contact@starentreprise.com";

// Pur et testable : construit le message sans l'envoyer. L'adresse du visiteur n'est utilisée que pour « Répondre ».
export function messageContact(m: MailContact) {
  const oneLine = (s: string, n: number) => String(s || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
  const reponse = /^[^\s@<>,;]{1,64}@[^\s@<>,;]{1,63}\.[^\s@<>,;]{2,}$/.test(m.email || "") ? (m.email as string) : undefined;
  const nom = oneLine(m.nom, 80) || "Visiteur KOMYO";
  return {
    from: `"KOMYO — formulaire" <${USER()}>`,
    to: TO(),
    replyTo: reponse,
    subject: `Message KOMYO de ${nom}`,
    text: `Nouveau message reçu depuis le formulaire de KOMYO.\n\nDe : ${nom}\nPour répondre : ${oneLine(m.contact, 120) || "(non indiqué)"}\n\n${String(m.message || "").slice(0, 4000)}\n\n—\nEnvoyé automatiquement par komyo.starentreprise.com`,
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
export function messageAccuse(email: string) {
  return {
    from: `"Keydou — KOMYO" <${USER()}>`,
    to: email,
    subject: "KOMYO : nous avons bien reçu ton message",
    text: "Bonjour,\n\nTon message est bien arrivé à l'équipe STAR ENTREPRISE (KOMYO). Nous te répondons dès que possible.\n\nEn attendant, tu peux découvrir KOMYO sur komyo.starentreprise.com : l'application vidéo pour apprendre, créer et partager.\n\nÀ très vite,\nKeydou, de l'équipe STAR ENTREPRISE\n\n—\nCet e-mail est un accusé de réception automatique. Si tu n'as écrit à personne, tu peux l'ignorer.",
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
