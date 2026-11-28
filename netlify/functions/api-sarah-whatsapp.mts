// Sarah sur WhatsApp (service à la clientèle) : adresse de réception des messages envoyés par Meta (API Cloud de WhatsApp).
//   GET  ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…   → vérification demandée par Meta quand on enregistre l'adresse.
//   POST (signature « X-Hub-Signature-256 » de Meta)               → messages reçus ; la réponse est préparée par la tâche de fond (Meta veut un « 200 » rapide).
// Variables Netlify : WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET (ou SARAH_WA_APP_SECRET si Sarah a sa propre application Meta), ANTHROPIC_API_KEY, JWT_SECRET.
// Le numéro (identifiant « phone_number_id ») et le jeton d'accès se saisissent dans la console starvibe/sarah-admin.html (jeton chiffré).
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db } from "./_db.mts";
import { configSarah, extraireMessages, signatureMetaValide, transmettreVersSarah } from "./_sarah.mts";

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const attendu = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!attendu) return new Response("WhatsApp n'est pas configuré", { status: 503 });
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === attendu) return new Response(String(url.searchParams.get("hub.challenge") || ""), { status: 200 });
    return new Response("Refusé", { status: 403 });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secretApp = process.env.SARAH_WA_APP_SECRET || process.env.WHATSAPP_APP_SECRET || "";
  if (!secretApp) return new Response("WhatsApp n'est pas configuré", { status: 503 });
  const brut = await req.text();
  if (!signatureMetaValide(brut, req.headers.get("x-hub-signature-256"), secretApp)) return new Response("Signature invalide", { status: 401 });
  let d: unknown = {}; try { d = JSON.parse(brut); } catch { return new Response("ok"); }
  await ensureSchema();
  const { sql } = db();
  const cfg = await configSarah(sql as never);
  if (!cfg.actif || !cfg.phoneId) return new Response("ok");   // ligne pas connectée : on accuse réception, sans répondre
  await transmettreVersSarah(req.url, extraireMessages(d).filter((m) => m.phone === cfg.phoneId));
  return new Response("ok");
};

export const config: Config = { path: "/api/sarah-whatsapp" };
