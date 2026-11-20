// Test navigateur de la section « 5. STAR IA » de la démo : fichier local, téléchargement par adresse (avec garde en mémoire du navigateur), conversation, arrêt, erreurs.
// Lancer : node tools/test-star-ia-ui.cjs [dossier-modeles=/tmp/ia-test]
const http = require("http"), fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const racine = process.cwd(), dir = process.argv[2] || "/tmp/ia-test", MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript" };
let demandesModele = 0;
const srv = http.createServer((rq, rs) => {
  const u = new URL(rq.url, "http://x"); let f;
  if (u.pathname.startsWith("/modeles/")) { demandesModele++; f = path.join(dir, path.basename(u.pathname)); } else f = path.normalize(path.join(racine, decodeURIComponent(u.pathname)));
  if (u.pathname === "/modeles/introuvable.gguf" || !fs.existsSync(f) || !fs.statSync(f).isFile()) { rs.writeHead(404); return rs.end("non"); }
  rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "content-length": fs.statSync(f).size }); fs.createReadStream(f).pipe(rs);
});
let ko = 0; const ok = (c, m) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
const texte = (page, sel) => page.textContent(sel);
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port;
  const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } }), page = await ctx.newPage(), erreurs = [];
  page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) erreurs.push("console: " + m.text()); });
  await page.goto(base + "/star-gpu/index.html"); await page.waitForTimeout(600);
  ok(await page.locator("#iaChat").isHidden(), "la conversation est cachée tant qu'aucun modèle n'est chargé");
  // 1. Fichier choisi sur l'appareil
  await page.setInputFiles("#iaFic", path.join(dir, "test-q8_0.gguf")); await page.waitForSelector("#iaChat:not([hidden])", { timeout: 60000 });
  const etat = await texte(page, "#iaEtat"); ok(/prêt/.test(etat) && /GPU intégral \(auto-test réussi\)/.test(etat), "modèle chargé depuis un fichier local, GPU utilisé : " + etat.replace(/\n/g, " | "));
  ok(/en arrière-plan/.test(etat) && (await page.evaluate(() => window.__ia.arrierePlan === true)), "le calcul tourne en arrière-plan (l'écran reste libre)");
  const pos0 = await page.evaluate(() => window.__ia.position);
  ok(pos0 > 5, "le message système est déjà calculé au chargement (position de départ " + pos0 + ")");
  ok((await page.inputValue("#iaTemp")) === "0.3" && (await page.inputValue("#iaLong")) === "208", "réglages de départ : créativité basse (0,3), longueur 208");
  ok(/peut se tromper/.test(await texte(page, "#iaAvert")) && (await page.locator("#iaAvert").isVisible()), "l'avertissement « petit modèle, peut se tromper » est visible");
  // l'écran reste réactif pendant la réponse : on mesure le plus long « trou » du fil principal pendant que le modèle réfléchit
  await page.evaluate(() => { window.__trous = { max: 0, n: 0 }; let t = performance.now(); window.__minut = setInterval(() => { const m = performance.now(); window.__trous.max = Math.max(window.__trous.max, m - t); window.__trous.n++; t = m; }, 20); });
  await page.fill("#iaSaisie", "Bonjour"); await page.fill("#iaLong", "32"); await page.click("#iaEnvoi");
  await page.waitForFunction(() => document.querySelectorAll("#iaFil .bu.ia").length === 1 && /mots\/seconde/.test(document.getElementById("iaStats").textContent), null, { timeout: 60000 });
  const trous = await page.evaluate(() => { clearInterval(window.__minut); return window.__trous; }); ok(trous.n > 20 && trous.max < 500, "écran réactif pendant la réponse : plus long arrêt de la page " + Math.round(trous.max) + " ms sur " + trous.n + " mesures");
  const bulles = await page.$$eval("#iaFil .bu", (e) => e.map((x) => x.className + ":" + x.textContent.length)); ok(bulles.length === 2 && /moi/.test(bulles[0]) && /ia/.test(bulles[1]), "un message envoyé, une réponse affichée : " + bulles.join(" "));
  const st1 = await texte(page, "#iaStats"); ok(/mots\/seconde/.test(st1) && /Détail : \d+ ms pour calculer un mot/.test(st1), "la vitesse et le détail du temps sont affichés : " + st1.replace(/\n/g, " | "));
  { const nm = +/(\d+) mots/.exec(st1)[1]; ok(nm < 32 || /coupée/.test(st1), "réponse coupée par la longueur max : le message le dit (" + nm + " mots)"); }
  await page.fill("#iaSaisie", "Et toi ?"); await page.click("#iaEnvoi"); await page.waitForFunction(() => document.querySelectorAll("#iaFil .bu.ia").length === 2 && !document.getElementById("iaEnvoi").disabled, null, { timeout: 60000 });
  const pos = await page.evaluate(() => window.__ia.position); ok(pos > pos0 + 10, "la mémoire de conversation continue sur le 2e message (position " + pos + ", départ " + pos0 + ")");
  await page.click("#iaNouv"); await page.waitForFunction((p) => window.__ia.position === p, pos0, { timeout: 10000 }); ok((await page.evaluate(() => window.__ia.position)) === pos0 && (await page.$$("#iaFil .bu")).length === 0, "« Nouvelle conversation » vide l'écran et repart du message système déjà calculé (position " + pos0 + ")");
  // message trop long pour la mémoire du modèle : erreur claire, état intact, la conversation reprend normalement ensuite
  await page.fill("#iaSaisie", "Bonjour ".repeat(900)); await page.click("#iaEnvoi");
  await page.waitForFunction(() => /trop long/.test(document.getElementById("iaFil").textContent), null, { timeout: 60000 });
  ok(await page.evaluate(() => !document.getElementById("iaEnvoi").disabled), "message trop long : erreur claire affichée et bouton Envoyer de nouveau disponible");
  await page.fill("#iaSaisie", "Salut"); await page.fill("#iaLong", "32"); await page.click("#iaEnvoi");
  await page.waitForFunction(() => document.querySelectorAll("#iaFil .bu.ia").length === 2 && /mots\/seconde/.test(document.getElementById("iaStats").textContent), null, { timeout: 60000 });
  ok(true, "après l'erreur, la conversation continue normalement");
  await page.click("#iaNouv"); await page.waitForFunction(() => document.querySelectorAll("#iaFil .bu").length === 0, null, { timeout: 10000 });
  // 2. Arrêt d'une génération longue
  await page.fill("#iaLong", "400"); await page.fill("#iaSaisie", "Raconte"); await page.click("#iaEnvoi");
  await page.waitForFunction(() => document.querySelector("#iaFil .bu.ia") && document.querySelector("#iaFil .bu.ia").textContent.length > 2, null, { timeout: 60000 });
  await page.click("#iaStop"); await page.waitForFunction(() => /arrêté/.test(document.getElementById("iaStats").textContent), null, { timeout: 60000 }); ok(true, "le bouton Arrêter interrompt la réponse");
  // 3. Téléchargement par adresse + garde dans le navigateur
  await page.fill("#iaUrl", base + "/modeles/test-q4_0.gguf"); const avant = demandesModele; await page.evaluate(() => { document.getElementById("iaEtat").textContent = ""; }); await page.click("#iaUrlGo");
  try { await page.waitForFunction(() => /prêt/.test(document.getElementById("iaEtat").textContent), null, { timeout: 60000 }); } catch (e) { console.log("  état à l'échec :", JSON.stringify(await texte(page, "#iaEtat")), erreurs.slice(0, 3)); throw e; }
  ok(demandesModele === avant + 1, "téléchargement par adresse : le modèle est demandé une fois (" + (demandesModele - avant) + ")");
  await page.reload(); await page.waitForTimeout(500); await page.fill("#iaUrl", base + "/modeles/test-q4_0.gguf"); const avant2 = demandesModele; await page.click("#iaUrlGo");
  await page.waitForSelector("#iaChat:not([hidden])", { timeout: 60000 }); ok(demandesModele === avant2, "après rechargement de la page, le modèle vient de la mémoire du navigateur : 0 téléchargement (" + (demandesModele - avant2) + ")");
  // 4. Erreurs claires
  await page.fill("#iaUrl", base + "/modeles/introuvable.gguf"); await page.click("#iaUrlGo"); await page.waitForFunction(() => /Impossible/.test(document.getElementById("iaEtat").textContent), null, { timeout: 30000 });
  ok(/code 404/.test(await texte(page, "#iaEtat")) && (await page.locator("#iaChat").isHidden()), "adresse introuvable : message clair, conversation cachée : " + (await texte(page, "#iaEtat")));
  fs.writeFileSync(path.join(dir, "faux.gguf"), "ceci n'est pas un modele"); await page.setInputFiles("#iaFic", path.join(dir, "faux.gguf"));
  await page.waitForFunction(() => /GGUF/.test(document.getElementById("iaEtat").textContent), null, { timeout: 30000 }); ok(true, "mauvais fichier refusé : " + (await texte(page, "#iaEtat")));
  await page.fill("#iaUrl", "pas une adresse"); await page.click("#iaUrlGo"); ok(/https/.test(await texte(page, "#iaEtat")), "adresse invalide expliquée");
  await page.screenshot({ path: path.join(dir, "capture-ui.png") });
  ok(erreurs.length === 0, "aucune erreur dans la console " + erreurs.slice(0, 3).join(" | "));
  await nav.close(); srv.close(); console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUS LES TESTS PASSENT"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.log("ÉCHEC : exception", e); process.exit(1); });
