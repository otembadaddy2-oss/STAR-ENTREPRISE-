// Charge : N personnes (comptes distincts, essai gratuit) posent chacune UNE question différente au même instant.
// Vrai code serveur + vraie base PostgreSQL locale ; l'IA est simulée (réponse qui reprend la question, 800 ms de délai).
// Vérifie : aucune erreur, aucune réponse mélangée entre personnes, un seul message compté par personne.
// Lancer : service postgresql start ; NETLIFY_DB_URL=postgres://postgres:kt@localhost:5432/kt npx tsx tools/test-compagnon-charge.mts [N]
process.env.JWT_SECRET = "secret-de-test-assez-long-0123456789-abcdef";
process.env.ANTHROPIC_API_KEY = "faux"; process.env.VAPID_PUBLIC_KEY ||= "x";
if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = "postgres://postgres:kt@localhost:5432/kt";
const N = Number(process.argv[2] || 50);
const { ensureSchema, db } = await import("../netlify/functions/_db.mts");
const { issueToken } = await import("../netlify/functions/_auth.mts");
const api = (await import("../netlify/functions/api-starvibe-compagnon.mts")).default;
let ko = 0; const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
await ensureSchema(); const { sql } = db();
const vraiFetch = globalThis.fetch; let enCours = 0, pic = 0;
globalThis.fetch = (async (u: string | URL, o?: { body?: string }) => {
  const url = String(u);
  if (url.includes("/v1/messages")) {
    enCours++; pic = Math.max(pic, enCours); const corps = JSON.parse(String(o?.body));
    const dernier = corps.messages[corps.messages.length - 1]; const q = typeof dernier.content === "string" ? dernier.content : dernier.content.map((x: any) => x.text || "").join(" ");
    await new Promise((r) => setTimeout(r, 800)); enCours--;
    return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ reponse: "Réponse à : " + q, seuil: false, rappels: [], notes: [], supprimer_rappels: [], image: null }) }], stop_reason: "end_turn", usage: { input_tokens: 50, output_tokens: 20 } }), { status: 200 });
  }
  return vraiFetch(u as string, o as RequestInit);
}) as typeof fetch;
const sujets = ["la photosynthèse", "un panneau solaire", "la recette du saka-saka", "le droit du travail", "un moteur qui chauffe", "le paludisme", "un plan d'affaires", "la table de 7", "l'histoire du Congo", "un CV"];
const gens: { id: number; token: string; q: string }[] = [];
for (let i = 0; i < N; i++) {
  const tel = "242" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  const a = (await sql`INSERT INTO starvibe_accounts (telephone, pin_hash) VALUES (${tel}, 'x') RETURNING id`) as { id: number }[];
  await sql`INSERT INTO starvibe_compagnon_profil (account_id, consentement_at, consentement_version) VALUES (${a[0].id}, now(), 'v1')`;
  const token = await issueToken({ sub: String(a[0].id), username: "p" + i, displayName: "p" + i, org: "star_vibe", role: "member" });
  gens.push({ id: a[0].id, token, q: `Question n°${i + 1} : explique-moi ${sujets[i % sujets.length]}` });
}
const debut = Date.now();
const reps = await Promise.all(gens.map(async (g) => { const t = Date.now(); const r = await api(new Request("https://t.test/api/starvibe-compagnon", { method: "POST", headers: { authorization: "Bearer " + g.token, "content-type": "application/json" }, body: JSON.stringify({ action: "chat", message: g.q }) })); const d = (await r.json()) as Record<string, any>; return { g, status: r.status, d, ms: Date.now() - t }; }));
const total = Date.now() - debut;
const bons = reps.filter((x) => x.status === 200 && typeof x.d.reponse === "string");
ok(bons.length === N, `${N} personnes en même temps : ${bons.length} réponses reçues, ${N - bons.length} erreurs`);
ok(bons.every((x) => x.d.reponse.includes(x.g.q)), "chaque personne reçoit la réponse à SA question (aucun mélange)");
const compte = (await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_messages WHERE account_id = ANY(${gens.map((g) => g.id)}) AND role = 'user'`) as { n: string }[];
ok(Number(compte[0].n) === N, `un message compté par personne (${compte[0].n} sur ${N})`);
const lents = reps.map((x) => x.ms).sort((a, b) => a - b);
console.log(`Temps total ${total} ms ; réponse la plus rapide ${lents[0]} ms, la plus lente ${lents[lents.length - 1]} ms (délai de l'IA simulée : 800 ms) ; pic de ${pic} appels IA simultanés`);
await sql`DELETE FROM starvibe_compagnon_messages WHERE account_id = ANY(${gens.map((g) => g.id)})`;
console.log(ko ? "ECHECS : " + ko : "TOUS LES TESTS OK"); process.exit(ko ? 1 : 0);
