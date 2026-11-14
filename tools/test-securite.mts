// Test de sécurité : connexion du personnel (limite d'essais), jeton de configuration, confirmation des paiements Marketplace.
// Lancer : service postgresql start ; NETLIFY_DB_URL=postgres://postgres:kt@localhost:5432/kt npx tsx tools/test-securite.mts
process.env.JWT_SECRET = "secret-de-test-assez-long-0123456789-abcdef"; process.env.SETUP_TOKEN = "jeton-config-de-test";
delete process.env.MARKETPLACE_PAYMENT_WEBHOOK_SECRET; process.env.MARKETPLACE_PAYMENT_WEBHOOK_SECRET = "secret-webhook-test";
if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = "postgres://postgres:kt@localhost:5432/kt";
const { ensureSchema, db } = await import("../netlify/functions/_db.mts");
const { issueToken } = await import("../netlify/functions/_auth.mts");
const auth = (await import("../netlify/functions/api-auth.mts")).default;
const pay = (await import("../netlify/functions/api-marketplace-payments.mts")).default;
const bcrypt = (await import("bcryptjs")).default;
let ko = 0; const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
await ensureSchema(); const { sql } = db();
const ctx = {} as never;
const login = (user: string, pass: string, ip: string) => auth(new Request("https://t.test/api/auth", { method: "POST", headers: { "x-nf-client-connection-ip": ip, "content-type": "application/json" }, body: JSON.stringify({ action: "login", username: user, password: pass }) }), ctx);
const nom = "testsec" + Math.floor(Math.random() * 1e6);
await sql`INSERT INTO accounts (username, password_hash, display_name, org, role) VALUES (${nom}, ${await bcrypt.hash("BonMotDePasse123", 4)}, 'Test', 'star_entreprise', 'admin')`;
try {
  ok((await login(nom, "BonMotDePasse123", "10.0.0.1")).status === 200, "bon mot de passe : connexion acceptée");
  let dernier = 0; for (let i = 0; i < 5; i++) dernier = (await login(nom, "mauvais" + i, "10.0.0.2")).status;
  ok(dernier === 401, "5 mauvais essais : toujours « identifiants incorrects »");
  const bloque = await login(nom, "BonMotDePasse123", "10.0.0.2");
  ok(bloque.status === 429, "6e essai depuis la même connexion : bloqué, même avec le BON mot de passe");
  ok((await login(nom, "BonMotDePasse123", "10.0.0.3")).status === 200, "le pirate bloqué ne verrouille pas le vrai propriétaire (autre connexion)");
  ok((await login("inconnu" + nom, "x", "10.0.0.9")).status === 401, "identifiant inconnu : même message d'erreur");
  // jeton de configuration
  const boot = (tok: string, ip: string) => auth(new Request("https://t.test/api/auth", { method: "POST", headers: { "x-nf-client-connection-ip": ip, "content-type": "application/json" }, body: JSON.stringify({ action: "bootstrap", setupToken: tok, username: "zz" + nom, password: "unmotdepasselong1" }) }), ctx);
  let s = 0; for (let i = 0; i < 5; i++) s = (await boot("faux" + i, "10.0.1.1")).status;
  ok(s === 403, "jeton de configuration faux : refusé");
  ok((await boot("jeton-config-de-test", "10.0.1.1")).status === 429, "…et après 5 essais : bloqué même avec le bon jeton");
  ok((await boot("jeton-config-de-test", "10.0.1.2")).status === 200, "le bon jeton fonctionne depuis une connexion non bloquée");
  await sql`DELETE FROM accounts WHERE username = ${"zz" + nom}`;

  // Marketplace : un visiteur ne peut plus se déclarer « payé »
  const u = (await sql`INSERT INTO marketplace_users (email, password_hash, nom) VALUES (${'v' + Math.floor(Math.random() * 1e9) + '@t.test'}, 'x', 'Vendeur') RETURNING id`) as { id: number }[];
  const l = (await sql`INSERT INTO marketplace_listings (seller_id, titre, prix) VALUES (${u[0].id}, 'Test', 1000) RETURNING id`) as { id: number }[];
  await sql`INSERT INTO marketplace_listing_payments (listing_id, montant_attendu) VALUES (${l[0].id}, 2000)`;
  const post = (corps: unknown, h: Record<string, string> = {}) => pay(new Request("https://t.test/api/marketplace-payments", { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify(corps) }), ctx);
  const c = { kind: "listing", id: l[0].id, montantRecu: 2000, methode: "mobile_money", reference: "REF1" };
  let r = await post(c); let d = (await r.json()) as any;
  ok(r.status === 202 && d.statut === "en_verification", "visiteur : sa déclaration est enregistrée « en vérification »");
  ok(((await sql`SELECT statut FROM marketplace_listings WHERE id = ${l[0].id}`) as any[])[0].statut === "en_attente_paiement", "…et l'annonce n'est PAS activée");
  r = await post(c, { "x-webhook-secret": "mauvais" }); ok(r.status === 401, "mauvais secret de webhook : refusé");
  const staff = await issueToken({ sub: "1", username: "carry", displayName: "Carry", org: "star_entreprise", role: "admin" });
  const publicTok = await issueToken({ sub: "5", username: "x", displayName: "x", org: "star_vibe", role: "member" });
  r = await post(c, { authorization: "Bearer " + publicTok }); d = (await r.json()) as any;
  ok(r.status === 202 && d.statut === "en_verification", "un compte KOMYO ordinaire ne peut pas confirmer");
  r = await post(c, { authorization: "Bearer " + staff }); d = (await r.json()) as any;
  ok(r.status === 200 && d.statut === "valide", "le personnel confirme : annonce activée");
  ok(((await sql`SELECT statut FROM marketplace_listings WHERE id = ${l[0].id}`) as any[])[0].statut === "active", "…l'annonce est active");
  await sql`DELETE FROM marketplace_users WHERE id = ${u[0].id}`;
} catch (e) { console.log("ÉCHEC : exception", e); ko++; }
await sql`DELETE FROM accounts WHERE username LIKE 'testsec%' OR username LIKE 'zztestsec%'`;
await sql`DELETE FROM staff_login_guard WHERE key LIKE 'auth:%'`;
console.log(ko ? "ECHECS : " + ko : "TOUS LES TESTS OK"); process.exit(ko ? 1 : 0);
