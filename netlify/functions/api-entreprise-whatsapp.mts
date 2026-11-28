// WhatsApp Business (API Cloud de Meta) : adresse unique de réception des messages des clients de toutes les entreprises.
//   GET  ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…   → vérification demandée par Meta quand on enregistre l'adresse.
//   POST (signature « X-Hub-Signature-256 » de Meta)               → messages reçus ; la réponse est préparée par la tâche de fond (Meta veut un « 200 » rapide).
// Variables à définir sur Netlify (sinon le service reste fermé, honnêtement : « Pas connecté ») :
//   WHATSAPP_VERIFY_TOKEN (mot choisi par STAR ENTREPRISE, à recopier chez Meta) et WHATSAPP_APP_SECRET (secret de l'application Meta).
// Le numéro WhatsApp et le jeton d'accès de chaque entreprise sont enregistrés par l'équipe STAR ENTREPRISE (administration), jeton chiffré.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db } from "./_db.mts";
import { signatureMetaValide, signerCorps } from "./_entreprise.mts";
import { configSarah, extraireMessages, transmettreVersSarah } from "./_sarah.mts";

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const attendu = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!attendu) return new Response("WhatsApp n'est pas configuré", { status: 503 });
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === attendu) return new Response(String(url.searchParams.get("hub.challenge") || ""), { status: 200 });
    return new Response("Refusé", { status: 403 });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secretApp = process.env.WHATSAPP_APP_SECRET || "";
  if (!secretApp) return new Response("WhatsApp n'est pas configuré", { status: 503 });
  const brut = await req.text();
  if (!signatureMetaValide(brut, req.headers.get("x-hub-signature-256"), secretApp)) return new Response("Signature invalide", { status: 401 });
  let d: { entry?: { changes?: { value?: { metadata?: { phone_number_id?: string }; messages?: { id?: string; from?: string; type?: string; text?: { body?: string } }[] } }[] }[] } = {};
  try { d = JSON.parse(brut); } catch { return new Response("ok"); }
  await ensureSchema();
  const { sql } = db();
  const envois: Promise<unknown>[] = [];
  // Si Sarah (service à la clientèle) utilise la même application Meta, ses messages lui sont transmis ici ; les autres numéros restent aux assistants d'entreprise.
  const sarah = await configSarah(sql as never);
  if (sarah.actif && sarah.phoneId) envois.push(transmettreVersSarah(req.url, extraireMessages(d).filter((m) => m.phone === sarah.phoneId)));
  for (const en of d.entry || []) for (const ch of en.changes || []) {
    const v = ch.value; const phone = String(v?.metadata?.phone_number_id || "");
    if (!phone || (sarah.actif && phone === sarah.phoneId)) continue;
    const e = (await sql`SELECT id FROM starvibe_entreprises WHERE wa_phone_id = ${phone} AND wa_actif = true AND ferme = false`) as { id: number }[];
    if (!e[0]) continue;
    for (const m of v?.messages || []) {
      if (!m.id || !m.from) continue;
      const corps = JSON.stringify({ phone, from: m.from, id: m.id, type: m.type || "text", texte: m.type === "text" ? String(m.text?.body || "") : "" });
      envois.push(fetch(new URL("/.netlify/functions/entreprise-whatsapp-background", req.url), { method: "POST", headers: { "content-type": "application/json", "x-sig": signerCorps(corps) }, body: corps, signal: AbortSignal.timeout(4000) }).catch(() => null));
    }
  }
  await Promise.all(envois);
  return new Response("ok");
};

export const config: Config = { path: "/api/entreprise-whatsapp" };
