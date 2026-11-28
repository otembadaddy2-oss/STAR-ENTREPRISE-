// Charge : 50 personnes écrivent à Sarah EN MÊME TEMPS (2 messages rapprochés puis un 3e). Vrai code, vraie base locale, faux Meta et faux service d'IA (200 à 600 ms de réflexion).
// Lancer : NETLIFY_DB_URL=postgres://postgres:kt@localhost:5432/kt npx tsx tools/test-sarah-charge.mts
import { createHmac } from "node:crypto";
process.env.JWT_SECRET = "secret-de-test-assez-long-0123456789-abcdef"; process.env.ANTHROPIC_API_KEY = "faux";
process.env.WHATSAPP_VERIFY_TOKEN = "mot"; process.env.WHATSAPP_APP_SECRET = "secret-app-meta-de-test"; delete process.env.SMTP_PASS;
if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = "postgres://postgres:kt@localhost:5432/kt";
const { ensureSchema, db } = await import("../netlify/functions/_db.mts");
const { ecrireReglage, CLES } = await import("../netlify/functions/_sarah.mts");
const apiSarah = (await import("../netlify/functions/api-sarah-whatsapp.mts")).default;
const fond = (await import("../netlify/functions/sarah-whatsapp-background.mts")).default;
let ko = 0; const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
await ensureSchema(); const { sql } = db();
await sql`DELETE FROM starvibe_sarah_msg`; await sql`DELETE FROM starvibe_sarah_contacts`;
const PHONE = "109876543210123"; await ecrireReglage(sql as never, CLES.phone, PHONE); await ecrireReglage(sql as never, CLES.actif, "on"); await ecrireReglage(sql as never, CLES.urgence, "off");
const { chiffrer } = await import("../netlify/functions/_entreprise.mts"); await ecrireReglage(sql as never, CLES.token, chiffrer("jeton-test"));
const envois: { a: string; texte: string }[] = []; let appelsIA = 0; const vraiFetch = globalThis.fetch;
globalThis.fetch = (async (u: string | URL, o?: RequestInit) => {
  const url = String(u);
  if (url.includes("/v1/messages")) { appelsIA++; const c = JSON.parse(String(o?.body)); const d = c.messages[c.messages.length - 1].content as string;
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 400)); const m = d.match(/MSG-(\d+)-(\d)/g) || [];
    return new Response(JSON.stringify({ content: [{ type: "text", text: "Réponse pour " + (m[m.length - 1] || "?") }], usage: { input_tokens: 900, output_tokens: 30 } }), { status: 200 }); }
  if (url.includes("sarah-whatsapp-background")) { void fond(new Request(url, { method: "POST", body: String(o?.body), headers: o?.headers as HeadersInit })).catch((e) => console.log("ERREUR FOND", e)); return new Response("", { status: 202 }); }   // comme chez Netlify : 202 tout de suite, le travail continue derrière
  if (url.includes("graph.facebook.com")) { const c = JSON.parse(String(o?.body)); if (c.text) envois.push({ a: c.to, texte: c.text.body }); return new Response("{}", { status: 200 }); }
  return vraiFetch(u as string, o as RequestInit);
}) as typeof fetch;
let n = 0;
const envoyer = async (de: string, t: string) => {
  const id = "wamid.C" + (++n) + Math.random().toString(36).slice(2, 7);
  const corps = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: PHONE }, contacts: [{ wa_id: de, profile: { name: "Client " + de.slice(-3) } }], messages: [{ id, from: de, type: "text", text: { body: t } }] } }] }] });
  return apiSarah(new Request("https://t.test/api/sarah-whatsapp", { method: "POST", body: corps, headers: { "x-hub-signature-256": "sha256=" + createHmac("sha256", process.env.WHATSAPP_APP_SECRET!).update(corps).digest("hex") } }), {} as never);
};
const N = 50; const numero = (k: number) => "24205" + String(6000000 + k); const att = (ms: number) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
// vague 1 : 50 personnes écrivent le même instant, 2 messages rapprochés chacune
const r1 = await Promise.all(Array.from({ length: N }, async (_, k) => { const a = await envoyer(numero(k), `Bonjour MSG-${k}-1`); const b = await envoyer(numero(k), `Une question MSG-${k}-2`); return [a.status, b.status]; }));
ok(r1.every(([a, b]) => a === 200 && b === 200), "50 personnes, 100 messages en même temps : Meta reçoit « 200 » à chaque fois (réponse immédiate)");
await att(3500);
// vague 2 : un 3e message de chacune
const r2 = await Promise.all(Array.from({ length: N }, async (_, k) => (await envoyer(numero(k), `Merci MSG-${k}-3`)).status));
ok(r2.every((s) => s === 200), "50 troisièmes messages en même temps : tous acceptés");
await att(3500);
const duree = Date.now() - t0;
let tousRepondus = 0, melange = 0, doublons = 0, dernierBon = 0;
for (let k = 0; k < N; k++) {
  const mes = envois.filter((e) => e.a === numero(k));
  if (mes.length >= 2) tousRepondus++;
  if (mes.some((e) => /MSG-(\d+)-/.test(e.texte) && !e.texte.includes(`MSG-${k}-`))) melange++;
  if (mes.length > 3) doublons++;
  if (mes.length && mes[mes.length - 1].texte.includes(`MSG-${k}-3`)) dernierBon++;
}
ok(tousRepondus === N, `chaque personne a reçu sa réponse (${tousRepondus}/${N})`);
ok(melange === 0, "aucune réponse envoyée à la mauvaise personne (conversations bien séparées)");
ok(dernierBon === N, `la dernière réponse de chacune répond bien à son dernier message (${dernierBon}/${N})`);
ok(doublons === 0, "personne n'a reçu plus de 3 réponses pour 3 messages (pas de réponses en double)");
ok(envois.length >= N * 2 && envois.length <= N * 3, `réponses envoyées : ${envois.length} pour ${N * 3} messages (les messages en rafale reçoivent une seule réponse) ; appels à l'IA : ${appelsIA}`);
const bases = ((await sql`SELECT COUNT(*) AS n FROM starvibe_sarah_contacts`) as { n: string }[])[0];
ok(Number(bases.n) === N, "50 conversations distinctes enregistrées, une par personne");
console.log(`Durée totale du test (dont 7 s d'attente) : ${(duree / 1000).toFixed(1)} s`);
globalThis.fetch = vraiFetch; console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTous les contrôles passent"); process.exit(ko ? 1 : 0);
