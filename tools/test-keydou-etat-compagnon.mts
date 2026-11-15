// Vérifie que Keydou (assistant de l'application KOMYO) parle du Compagnon : ouvert à tous en permanence (essai puis abonnement), sauf fermeture d'urgence.
// Lancer : NETLIFY_DB_URL=postgres://postgres:kt@localhost:5432/kt npx tsx tools/test-keydou-etat-compagnon.mts
process.env.JWT_SECRET = "secret-de-test-assez-long-0123456789-abcdef"; process.env.ANTHROPIC_API_KEY = "faux";
if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = "postgres://postgres:kt@localhost:5432/kt";
const { ensureSchema, db } = await import("../netlify/functions/_db.mts");
const keydou = (await import("../netlify/functions/api-starvibe-keydou.mts")).default;
let ko = 0; const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
await ensureSchema(); const { sql } = db();
const vus: string[] = []; const vrai = globalThis.fetch;
globalThis.fetch = (async (u: string | URL, o?: { body?: string }) => {
  if (String(u).includes("/v1/messages")) { const c = JSON.parse(String(o?.body)); vus.push(String(c.system?.[0]?.text || "")); return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ reponse: "ok", services: [], ville: "", sos: false }) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 }); }
  return vrai(u as string, o as RequestInit);
}) as typeof fetch;
const avant = ((await sql`SELECT value FROM starvibe_settings WHERE key = 'compagnon_ferme_urgence'`) as { value: string }[])[0]?.value;
const poser = (v: string) => sql`INSERT INTO starvibe_settings (key, value) VALUES ('compagnon_ferme_urgence', ${v}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
const demander = (n: number) => keydou(new Request("https://t.test/api/starvibe-keydou", { method: "POST", headers: { "content-type": "application/json", "x-nf-client-connection-ip": "10.7.7." + n }, body: JSON.stringify({ action: "chat", message: "C'est quoi Keydou Compagnon ?" }) }), {} as never);
try {
  await poser("off"); let r = await demander(1);
  ok(r.status === 200 && vus.length === 1 && /Keydou Compagnon est OUVERT/.test(vus[0]) && /ne prescrit JAMAIS/.test(vus[0]) && !/PAS encore ouvert/.test(vus[0]) && /5 messages en tout/.test(vus[0]) && !/jamais gratuit/i.test(vus[0]), "ouvert en permanence : Keydou annonce le Compagnon ouvert à tous, avec l'essai et les offres");
  await poser("on"); r = await demander(2);
  ok(vus.length === 2 && /PAS encore ouvert/.test(vus[1]) && !/Keydou Compagnon est OUVERT/.test(vus[1]), "fermeture d'urgence : Keydou dit « pas encore ouvert », sans date");
  ok(/SÉCURITÉ : personne n'a accès au système/.test(vus[1]) && /solaire/.test(vus[1]), "la règle de sécurité et les autres consignes sont toujours présentes");
} catch (e) { console.log("ÉCHEC : exception", e); ko++; }
if (avant === undefined) await sql`DELETE FROM starvibe_settings WHERE key = 'compagnon_ferme_urgence'`; else await poser(avant);
await sql`DELETE FROM starvibe_settings WHERE key LIKE 'chat:10.7.7.%'`;
console.log(ko ? "ECHECS : " + ko : "TOUS LES TESTS OK"); process.exit(ko ? 1 : 0);
