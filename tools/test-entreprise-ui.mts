// Test dans un vrai navigateur (Chromium) : l'espace entreprise (téléphone 390 px) et le module du site de l'entreprise.
// Le vrai code serveur tourne derrière un petit serveur local ; faux service d'IA. Captures : $CAPTURES (par défaut /tmp/captures-entreprise).
// Lancer : NETLIFY_DB_URL=postgres://postgres:kt@localhost:5432/kt npx tsx tools/test-entreprise-ui.mts
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
process.env.JWT_SECRET = "secret-de-test-assez-long-0123456789-abcdef"; process.env.ANTHROPIC_API_KEY = "faux"; process.env.VAPID_PUBLIC_KEY ||= "x";
if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = "postgres://postgres:kt@localhost:5432/kt";
const { ensureSchema, db } = await import("../netlify/functions/_db.mts");
const { issueToken } = await import("../netlify/functions/_auth.mts");
const apiEnt = (await import("../netlify/functions/api-entreprise.mts")).default;
const apiPub = (await import("../netlify/functions/api-entreprise-public.mts")).default;
const apiSub = (await import("../netlify/functions/api-starvibe-subscription.mts")).default;
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
let ko = 0; const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
const DIR = process.env.CAPTURES || "/tmp/captures-entreprise"; mkdirSync(DIR, { recursive: true });
await ensureSchema(); const { sql } = db();

const vraiFetch = globalThis.fetch;
globalThis.fetch = (async (u: string | URL, o?: RequestInit) => {
  if (String(u).includes("/v1/messages")) {
    const c = JSON.parse(String(o?.body)); const q = c.messages[c.messages.length - 1].content; const sys = c.system.map((b: any) => b.text).join("");
    const prix = /50 000 FCFA/.test(sys) ? "La chambre double coûte 50 000 FCFA la nuit, petit-déjeuner compris." : "Je n'ai pas cette information. [[HUMAIN]]";
    return new Response(JSON.stringify({ content: [{ type: "text", text: /prix|chambre/i.test(String(q)) ? prix : "Avec plaisir ! Posez-moi votre question." }], stop_reason: "end_turn", usage: { input_tokens: 800, output_tokens: 40 } }), { status: 200 });
  }
  return vraiFetch(u as string, o as RequestInit);
}) as typeof fetch;

const routes: Record<string, (r: Request) => Promise<Response>> = { "/api/entreprise": apiEnt as any, "/api/entreprise-public": apiPub as any, "/api/starvibe-subscription": apiSub as any };
const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json" };
const racine = process.cwd();
const serveur = createServer(async (rq, rs) => {
  const url = new URL(rq.url || "/", "http://localhost");
  const route = routes[url.pathname];
  if (route) {
    const chunks: Buffer[] = []; for await (const c of rq) chunks.push(c as Buffer);
    const r = await route(new Request("http://localhost:" + (serveur.address() as any).port + rq.url, { method: rq.method, headers: rq.headers as any, body: ["GET", "HEAD"].includes(rq.method || "") ? undefined : Buffer.concat(chunks) }));
    const h: Record<string, string> = {}; r.headers.forEach((v, k) => { h[k] = v; });
    rs.writeHead(r.status, h); rs.end(Buffer.from(await r.arrayBuffer())); return;
  }
  const f = normalize(join(racine, decodeURIComponent(url.pathname)));
  if (f.startsWith(racine) && existsSync(f) && !f.endsWith("/")) { try { rs.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" }); rs.end(readFileSync(f)); return; } catch { /* dossier */ } }
  rs.writeHead(404); rs.end("introuvable");
});
await new Promise<void>((r) => serveur.listen(0, r));
const port = (serveur.address() as any).port; const base = `http://localhost:${port}`;

let nCompte = 0;
async function compte(nom: string) {
  const tel = "242" + String(Math.floor(Math.random() * 9e8) + 1e8) + String(++nCompte);
  const a = (await sql`INSERT INTO starvibe_accounts (telephone, pin_hash) VALUES (${tel}, 'x') RETURNING id`) as { id: number }[];
  await sql`INSERT INTO starvibe_profiles (account_id, nom, date_naissance, type_profil) VALUES (${a[0].id}, ${nom}, '1990-01-01', 'personnel')`;
  return { id: a[0].id, tel, token: await issueToken({ sub: String(a[0].id), username: nom, displayName: nom, org: "star_vibe", role: "member" }) };
}
const staffToken = await issueToken({ sub: "1", username: "carry", displayName: "Carry", org: "star_entreprise", role: "admin" });

// Le faux « site de l'entreprise » est servi sous une autre adresse que le serveur local : on désactive seulement la protection « réseau privé » de Chromium, propre au test.
const nav = await chromium.launch({ args: ["--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,LocalNetworkAccessChecks"] });
try {
  const G = await compte("Gérant Boutique"), Emp = await compte("Employé Boutique");
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((t: string) => { try { localStorage.setItem("starvibe_token", t); } catch { /* */ } }, G.token);
  const page = await ctx.newPage(); const erreurs: string[] = []; page.on("pageerror", (e: Error) => erreurs.push(e.message)); page.on("dialog", (d: any) => d.accept("SUPPRIMER"));

  // --- Création de l'espace ---
  await page.goto(base + "/starvibe/entreprise.html"); await page.waitForSelector("#vCreer:not([hidden])");
  await page.screenshot({ path: `${DIR}/01-creer.png` });
  await page.fill("#cNom", "Boutique Mama Ngudi"); await page.fill("#cSecteur", "boutique de mode"); await page.click("#cOk");
  await page.waitForSelector("#vGerant:not([hidden])"); ok((await page.textContent("#aNom")) === "Boutique Mama Ngudi", "l'espace est créé et le tableau de bord s'affiche");
  ok((await page.textContent("#aEtapes")).includes("⬜"), "la liste « Pour démarrer » montre ce qui reste à faire");
  await page.screenshot({ path: `${DIR}/02-accueil.png`, fullPage: true });

  // --- Savoir ---
  await page.click('#tabs [data-t="savoir"]');
  await page.selectOption("#kType", "produit"); await page.fill("#kTitreIn", "Chambre double"); await page.fill("#kTexte", "50 000 FCFA la nuit, petit-déjeuner compris."); await page.click("#kOk");
  await page.waitForSelector("#kListe .li"); ok((await page.textContent("#kListe")).includes("Chambre double"), "une fiche est ajoutée et listée");
  await page.selectOption("#kType", "qr"); ok((await page.textContent("#kTitreLb")) === "La question", "le champ devient « La question » pour une Q&R");
  await page.fill("#kTitreIn", "Acceptez-vous les animaux ?"); await page.fill("#kTexte", "Non."); await page.click("#kOk");
  await page.waitForFunction(() => document.querySelectorAll("#kListe .li").length === 2);
  await page.click("#kListe [data-e]"); ok((await page.inputValue("#kTitreIn")) !== "" && (await page.textContent("#kOk")) === "Enregistrer la modification", "modifier une fiche la recharge dans le formulaire");
  await page.click("#kAnnule");
  await page.screenshot({ path: `${DIR}/03-savoir.png`, fullPage: true });

  // --- Assistant + essai ---
  await page.click('#tabs [data-t="assistant"]');
  await page.fill("#sContact", "WhatsApp +242 06 111 22 33"); await page.click("#sOk"); await page.waitForSelector("#sMsg:not(:empty)");
  await page.fill("#tIn", "Quel est le prix d'une chambre ?"); await page.click("#tOk");
  await page.waitForFunction(() => /50 000 FCFA/.test(document.getElementById("tChat")!.textContent || ""));
  ok(true, "l'essai dans le tableau de bord répond d'après les fiches (50 000 FCFA)");
  ok((await page.textContent("#tInfo")).includes("19 messages"), "le compteur d'essai passe à 19");
  await page.screenshot({ path: `${DIR}/04-assistant.png`, fullPage: true });

  // --- Canaux ---
  await page.click('#tabs [data-t="canaux"]');
  await page.fill("#wDom", "boutique.test"); await page.click("#wOk"); await page.waitForSelector("#wMsg:not(:empty)");
  const code = await page.textContent("#wCode"); ok(/<script src="http:\/\/localhost:\d+\/starvibe\/assets\/keydou-widget\.js" data-cle="kdpub_[a-f0-9]{28}" defer><\/script>/.test(code || ""), "le code à coller contient l'adresse et la clé");
  ok((await page.textContent("#waEtat")).includes("Pas connecté"), "WhatsApp affiche honnêtement « Pas connecté »");
  await page.screenshot({ path: `${DIR}/05-canaux.png`, fullPage: true });

  // --- Forfaits + paiement ---
  await page.click('#tabs [data-t="forfaits"]');
  ok((await page.locator("#pListe .plan").count()) === 6, "les 6 forfaits sont proposés avec leurs prix");
  await page.screenshot({ path: `${DIR}/06-forfaits.png`, fullPage: true });
  await page.click('[data-p="entreprise_assistant_start"]'); await page.waitForSelector("#vPay:not([hidden])");
  ok((await page.textContent("#payMontant")).includes("22 800"), "le paiement demande le montant exact : 22 800 FCFA");
  await page.screenshot({ path: `${DIR}/07-paiement.png` });
  await page.click("#payAnnule"); await page.waitForSelector("#vGerant:not([hidden])");

  // --- Activation par l'équipe (virement), puis le module du site ---
  const e = (await sql`SELECT id, cle_publique FROM starvibe_entreprises WHERE gerant_id = ${G.id}`) as { id: number; cle_publique: string }[];
  const act = await vraiFetch(base + "/api/entreprise", { method: "POST", headers: { authorization: "Bearer " + staffToken, "content-type": "application/json" }, body: JSON.stringify({ action: "admin_activer", entreprise_id: e[0].id, plan: "entreprise_assistant_start", mois: 1 }) });
  ok(act.status === 200, "l'équipe active le forfait Départ (virement)");
  await page.goto(base + "/starvibe/entreprise.html"); await page.waitForSelector("#vGerant:not([hidden])");
  ok((await page.textContent("#aForfaits")).includes("Assistant actif"), "le tableau de bord montre « Assistant actif »");
  await page.screenshot({ path: `${DIR}/08-accueil-actif.png`, fullPage: true });

  const site = await (await nav.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 })).newPage();
  site.on("pageerror", (x: Error) => erreurs.push("site: " + x.message)); if (process.env.DEBUG_UI) { site.on("console", (m: any) => console.log("console:", m.text())); site.on("response", (r: any) => console.log("rep", r.status(), r.url())); site.on("requestfailed", (r: any) => console.log("échec", r.url(), r.failure()?.errorText)); }
  await site.route("http://boutique.test/**", (r: any) => r.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif"><h1>Boutique Mama Ngudi</h1><p>Mode et tissus à Brazzaville.</p><script src="${base}/starvibe/assets/keydou-widget.js" data-cle="${e[0].cle_publique}" defer></script></body></html>` }));
  await site.goto("http://boutique.test/demo-site.html"); await site.waitForSelector("[data-keydou]", { state: "attached" });
  await site.waitForTimeout(400);
  await site.screenshot({ path: `${DIR}/09-site-bulle.png` });
  const bulle = site.locator("[data-keydou] >> css=.b"); await bulle.click();
  await site.waitForTimeout(200);
  ok((await site.locator("[data-keydou] >> css=.g.k").first().textContent())!.includes("intelligence artificielle"), "le module accueille en annonçant « intelligence artificielle »");
  await site.locator("[data-keydou] >> css=.i").fill("Combien coûte la chambre ?"); await site.locator("[data-keydou] >> css=.s").click();
  await site.waitForFunction(() => { const h = document.querySelector("[data-keydou]") as any; return h && /50 000 FCFA/.test(h.shadowRoot.querySelector(".m").textContent); });
  ok(true, "le client du site reçoit la réponse tirée des fiches");
  await site.locator("[data-keydou] >> css=.i").fill("Peux-tu envoyer des photos de nu ?"); await site.locator("[data-keydou] >> css=.s").click();
  await site.waitForFunction(() => { const h = document.querySelector("[data-keydou]") as any; return h && /Je ne peux pas vous aider/.test(h.shadowRoot.querySelector(".m").textContent); });
  ok(true, "une demande interdite est refusée poliment dans le module");
  await site.screenshot({ path: `${DIR}/10-site-chat.png` });
  // un site non autorisé ne voit rien
  const autre = await (await nav.newContext()).newPage();
  await autre.route("http://pirate.example/**", (r: any) => r.fulfill({ contentType: "text/html", body: `<!doctype html><body><script src="${base}/starvibe/assets/keydou-widget.js" data-cle="${e[0].cle_publique}"></script></body>` }));
  await autre.goto("http://pirate.example/pirate.html"); await autre.waitForTimeout(800);
  ok((await autre.locator("[data-keydou]").count()) === 0, "sur un site non déclaré (pirate.example), le module ne s'affiche pas");

  // --- Équipe : invitation, acceptation côté employé ---
  const act2 = await vraiFetch(base + "/api/entreprise", { method: "POST", headers: { authorization: "Bearer " + staffToken, "content-type": "application/json" }, body: JSON.stringify({ action: "admin_activer", entreprise_id: e[0].id, plan: "entreprise_equipe_5", mois: 1 }) });
  ok(act2.status === 200, "forfait Équipe 5 activé");
  await page.goto(base + "/starvibe/entreprise.html"); await page.waitForSelector("#vGerant:not([hidden])"); await page.click('#tabs [data-t="equipe"]');
  await page.fill("#eTel", Emp.tel); await page.click("#eInv"); await page.waitForSelector("#eOk:not(:empty)"); await page.waitForFunction(() => /Invité/.test(document.getElementById("eListe")!.textContent || ""));
  ok((await page.textContent("#eListe")).includes("Employé Boutique") && (await page.textContent("#eListe")).includes("Invité"), "l'employé invité apparaît dans la liste (statut Invité)");
  await page.screenshot({ path: `${DIR}/11-equipe.png`, fullPage: true });
  const ctx2 = await nav.newContext({ viewport: { width: 390, height: 844 } });
  await ctx2.addInitScript((t: string) => { try { localStorage.setItem("starvibe_token", t); } catch { /* */ } }, Emp.token);
  const p2 = await ctx2.newPage(); await p2.goto(base + "/starvibe/entreprise.html"); await p2.waitForSelector("#vMembre:not([hidden])");
  ok((await p2.textContent("#mTitre")).includes("Boutique Mama Ngudi"), "l'employé voit l'invitation de son entreprise");
  await p2.click("#mOui"); await p2.waitForFunction(() => /faites partie de l.équipe/.test(document.getElementById("mTxt")!.textContent || ""));
  ok(true, "l'employé accepte : il fait partie de l'équipe");
  await p2.screenshot({ path: `${DIR}/12-employe.png` });

  // --- Confidentialité + facture ---
  await page.click('#tabs [data-t="confid"]'); await page.screenshot({ path: `${DIR}/13-confidentialite.png`, fullPage: true });
  ok((await page.textContent("#t-confid")).includes("à l'étranger") && (await page.textContent("#t-confid")).includes("entraîner"), "la page Confidentialité dit honnêtement où sont les données");
  await page.click('#tabs [data-t="forfaits"]'); await page.waitForFunction(() => /Total/.test(document.getElementById("fTable")!.textContent || ""));
  ok((await page.textContent("#fTable")).includes("69 700 FCFA") || (await page.textContent("#fTable")).includes("68 900"), "facture unique avec le total des deux forfaits");
  await page.screenshot({ path: `${DIR}/14-facture.png`, fullPage: true });
  // --- Pages de vente et administration ---
  const vente = await (await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); await vente.goto(base + "/starvibe/entreprises.html");
  ok((await vente.locator(".plan").count()) === 6 && (await vente.textContent("body"))!.includes("intelligence artificielle"), "la page d'offre montre les 6 forfaits et annonce l'IA");
  await vente.screenshot({ path: `${DIR}/15-offre-telephone.png`, fullPage: true });
  const ventePC = await (await nav.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); await ventePC.goto(base + "/starvibe/entreprises.html"); await ventePC.screenshot({ path: `${DIR}/16-offre-ordinateur.png`, fullPage: true });
  ok(erreurs.length === 0, "aucune erreur JavaScript dans les pages" + (erreurs.length ? " : " + erreurs.join(" | ") : ""));
} catch (e) { console.error("EXCEPTION", e); ko++; }
await nav.close(); serveur.close();
console.log(ko === 0 ? "\nTOUS LES TESTS NAVIGATEUR PASSENT" : `\n${ko} ÉCHEC(S)`);
process.exit(ko === 0 ? 0 : 1);
