// Test navigateur de la page STAR IA avec WebGPU : choix du moteur, chargement en arrière-plan, conversation, bouton « Comparer ».
// GPU simulé par logiciel : on vérifie le fonctionnement et l'exactitude, pas la vitesse.
// Pour tester la page en UN seul fichier (celle du dossier de vente) : PAGE=/tmp/star-tech/STAR-TECH-demo.html ...
// Lancer : NODE_PATH=$(npm root -g) node tools/test-star-ia-webgpu-page.cjs [dossier-modeles=/tmp/ia-test]
const http = require("http"), fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const racine = process.cwd(), dir = process.argv[2] || "/tmp/ia-test", MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript" };
const srv = http.createServer((rq, rs) => {
  const u = new URL(rq.url, "http://x"); const f = (process.env.PAGE && u.pathname === "/star-gpu/index.html") ? process.env.PAGE : u.pathname.startsWith("/modeles/") ? path.join(dir, path.basename(u.pathname)) : path.normalize(path.join(racine, decodeURIComponent(u.pathname)));
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { rs.writeHead(404); return rs.end("non"); }
  rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "content-length": fs.statSync(f).size }); fs.createReadStream(f).pipe(rs);
});
let ko = 0; const ok = (c, m) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port;
  const nav = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-angle=swiftshader", "--use-webgpu-adapter=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"] });
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage(), erreurs = [];
  page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) erreurs.push("console: " + m.text()); });
  await page.goto(base + "/star-gpu/index.html"); await page.waitForTimeout(600);
  ok(!(await page.locator("#iaMoteur option[value=webgpu]").isDisabled()), "l'option WebGPU est proposée (WebGPU présent)");
  ok((await page.inputValue("#iaMoteur")) === "webgl2", "moteur par défaut : WebGL2 (éprouvé)");
  // 1. WebGPU choisi, calcul en arrière-plan
  await page.selectOption("#iaMoteur", "webgpu"); await page.setInputFiles("#iaFic", path.join(dir, "test-q8_0.gguf")); await page.waitForSelector("#iaChat:not([hidden])", { timeout: 90000 });
  let etat = await page.textContent("#iaEtat"); ok(/Calcul : WebGPU \(auto-test réussi\)/.test(etat), "modèle chargé avec WebGPU : " + etat.replace(/\n/g, " | "));
  ok(/en arrière-plan/.test(etat) && (await page.evaluate(() => window.__ia.arrierePlan === true)), "WebGPU fonctionne dans le travailleur en arrière-plan (l'écran reste libre)");
  ok((await page.evaluate(() => window.__ia.position)) > 5, "message système déjà calculé au chargement");
  await page.fill("#iaSaisie", "Bonjour"); await page.click("#iaEnvoi"); await page.waitForFunction(() => !document.getElementById("iaEnvoi").disabled, null, { timeout: 60000 });
  const stats = await page.textContent("#iaStats"); ok(/mots\/seconde/.test(stats) && /calcul : WebGPU/.test(stats), "conversation en WebGPU : " + stats.split("\n")[0]);
  ok((await page.locator("#iaFil .ia").last().textContent()).length > 0 && !/Erreur/.test(await page.locator("#iaFil .ia").last().textContent()), "une réponse s'affiche");
  const motsWG = await page.evaluate(() => (window.__ia.nouvelleConversation(), window.__ia.discuter([{ role: "user", content: "Bonjour" }], { maxTokens: 8, temperature: 0, repetition: 1 })).then((r) => r.ids));
  // 2. Même modèle, WebGL2 : mêmes mots (déterminisme température 0)
  await page.selectOption("#iaMoteur", "webgl2"); await page.setInputFiles("#iaFic", []); await page.setInputFiles("#iaFic", path.join(dir, "test-q8_0.gguf"));   // (le champ doit être vidé : le même fichier ne redéclencherait rien)
  await page.waitForFunction(() => /Calcul : /.test(document.getElementById("iaEtat").textContent) && window.__ia && window.__ia.gpu.mode !== "WebGPU", null, { timeout: 90000 });
  etat = await page.textContent("#iaEtat"); ok(/GPU intégral/.test(etat), "WebGL2 toujours disponible, comme avant : " + etat.split("\n")[2]);
  const motsGL = await page.evaluate(() => (window.__ia.nouvelleConversation(), window.__ia.discuter([{ role: "user", content: "Bonjour" }], { maxTokens: 8, temperature: 0, repetition: 1 })).then((r) => r.ids));
  ok(JSON.stringify(motsWG) === JSON.stringify(motsGL), "mêmes mots avec WebGPU et WebGL2 : " + motsWG.join(","));
  // 3. Bouton « Comparer »
  await page.click("#iaComp"); await page.waitForFunction(() => window.__comparaison, null, { timeout: 240000 });
  const cmp = await page.evaluate(() => window.__comparaison), texte = await page.textContent("#iaComparaison");
  ok(cmp.lignes.length >= 4 && /WebGL2 \(calcul réel : GPU intégral\)/.test(texte) && /WebGPU \(calcul réel : WebGPU\)/.test(texte) && /Résultat/.test(texte), "la comparaison affiche les deux moteurs et un résultat :\n" + texte);
  ok(cmp.res.webgl2 > 0 && cmp.res.webgpu > 0, "deux vitesses mesurées (GPU simulé : chiffres sans valeur réelle) " + JSON.stringify(cmp.res));
  ok(!(await page.locator("#iaComp").isDisabled()), "le bouton est de nouveau utilisable");
  ok(!erreurs.length, "aucune erreur dans la console " + JSON.stringify(erreurs));
  await nav.close(); srv.close(); console.log(ko ? ko + " ÉCHEC(S)" : "TOUT EST JUSTE"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.error("ÉCHEC", e.message); process.exit(1); });
