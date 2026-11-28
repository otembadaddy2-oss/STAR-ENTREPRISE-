// Serveur local pour essayer la console de Sarah dans un vrai navigateur : vraies fonctions + vraie base locale,
// FAUX Meta et FAUX service d'IA (aucun réseau). Lancer : NETLIFY_DB_URL=postgres://postgres:kt@localhost:5432/kt npx tsx tools/serveur-sarah-local.mts
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
process.env.JWT_SECRET = "secret-de-test-assez-long-0123456789-abcdef"; process.env.ANTHROPIC_API_KEY = "faux";
process.env.WHATSAPP_VERIFY_TOKEN = "mot-de-verification"; process.env.WHATSAPP_APP_SECRET = "secret-app-meta-de-test";
const PORT = Number(process.env.PORT) || 8791; const RACINE = process.cwd();
const { ensureSchema, db } = await import("../netlify/functions/_db.mts");
const { issueToken } = await import("../netlify/functions/_auth.mts");
const apiAdmin = (await import("../netlify/functions/api-sarah-admin.mts")).default;
const apiWa = (await import("../netlify/functions/api-sarah-whatsapp.mts")).default;
const fond = (await import("../netlify/functions/sarah-whatsapp-background.mts")).default;
await ensureSchema(); const { sql } = db();
await sql`DELETE FROM starvibe_sarah_msg`; await sql`DELETE FROM starvibe_sarah_contacts`; await sql`DELETE FROM starvibe_settings WHERE key LIKE 'sarah_%'`;
const envois: { a: string; texte: string }[] = [];
const vraiFetch = globalThis.fetch;
globalThis.fetch = (async (u: string | URL, o?: RequestInit) => {
  const url = String(u);
  if (url.includes("/v1/messages")) { const c = JSON.parse(String(o?.body)); const d = c.messages[c.messages.length - 1].content as string;
    const t = /paiement|payé/i.test(d) ? "Merci, je transmets à l'équipe qui vérifie votre paiement.\n[[HUMAIN: paiement à vérifier]]" : "Bonjour et bienvenue chez STAR ENTREPRISE ! Je suis Sarah. Comment puis-je vous aider ?";
    return new Response(JSON.stringify({ content: [{ type: "text", text: t }], usage: { input_tokens: 900, output_tokens: 40 } }), { status: 200 }); }
  if (url.includes("sarah-whatsapp-background")) { await fond(new Request(url, { method: "POST", body: String(o?.body), headers: o?.headers as HeadersInit })); return new Response("", { status: 202 }); }
  if (url.includes("graph.facebook.com")) {
    if ((o?.method || "GET") === "GET") return new Response(JSON.stringify({ display_phone_number: "+242 05 597 24 27", verified_name: "STAR ENTREPRISE", quality_rating: "GREEN" }), { status: 200 });
    const c = JSON.parse(String(o?.body)); if (c.text) envois.push({ a: c.to, texte: c.text.body }); return new Response("{}", { status: 200 }); }
  return vraiFetch(u as string, o as RequestInit);
}) as typeof fetch;
const token = await issueToken({ sub: "1", username: "carry", displayName: "Carry", org: "star_entreprise", role: "admin" });
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
createServer(async (rq, rs) => {
  try {
    const u = new URL(rq.url || "/", `http://localhost:${PORT}`);
    if (u.pathname === "/__token") { rs.end(token); return; }
    if (u.pathname === "/__envois") { rs.setHeader("content-type", "application/json"); rs.end(JSON.stringify(envois)); return; }
    if (u.pathname === "/__client") {   // simule un client WhatsApp : /__client?de=242055000111&t=Bonjour
      const de = u.searchParams.get("de") || "242055000111"; const id = "wamid." + Math.random().toString(36).slice(2);
      const corps = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: u.searchParams.get("pid") || "109876543210123" }, contacts: [{ wa_id: de, profile: { name: u.searchParams.get("nom") || "Client Test" } }], messages: [{ id, from: de, type: "text", text: { body: u.searchParams.get("t") || "Bonjour" } }] } }] }] });
      const r = await apiWa(new Request(`http://localhost:${PORT}/api/sarah-whatsapp`, { method: "POST", body: corps, headers: { "x-hub-signature-256": "sha256=" + createHmac("sha256", process.env.WHATSAPP_APP_SECRET!).update(corps).digest("hex") } }), {} as never);
      rs.end(String(r.status)); return;
    }
    if (u.pathname === "/api/sarah-admin" || u.pathname === "/api/sarah-whatsapp") {
      const chunks: Buffer[] = []; for await (const c of rq) chunks.push(c as Buffer);
      const req = new Request(`http://localhost:${PORT}${rq.url}`, { method: rq.method, headers: rq.headers as Record<string, string>, body: ["GET", "HEAD"].includes(rq.method || "GET") ? undefined : Buffer.concat(chunks) });
      const r = await (u.pathname === "/api/sarah-admin" ? apiAdmin : apiWa)(req, {} as never);
      rs.statusCode = r.status; rs.setHeader("content-type", r.headers.get("content-type") || "text/plain"); rs.end(Buffer.from(await r.arrayBuffer())); return;
    }
    const chemin = normalize(join(RACINE, decodeURIComponent(u.pathname))); if (!chemin.startsWith(RACINE)) { rs.statusCode = 403; rs.end(); return; }
    const data = await readFile(chemin); rs.setHeader("content-type", TYPES[extname(chemin)] || "application/octet-stream"); rs.end(data);
  } catch { rs.statusCode = 404; rs.end("404"); }
}).listen(PORT, "127.0.0.1", () => console.log("prêt http://127.0.0.1:" + PORT));
