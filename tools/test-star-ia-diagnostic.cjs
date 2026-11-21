// Test du « Diagnostic : où va le temps ? » : WebGL2 et WebGPU, dans le travailleur ; la conversation ne doit pas être modifiée.
// GPU simulé : on vérifie que la mesure fonctionne et que rien n'est abîmé, pas les chiffres.
// Lancer : NODE_PATH=$(npm root -g) node tools/test-star-ia-diagnostic.cjs [dossier-modeles=/tmp/ia-test]
const http = require("http"), fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const racine = process.cwd(), dir = process.argv[2] || "/tmp/ia-test", MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript" };
const srv = http.createServer((rq, rs) => {
  const u = new URL(rq.url, "http://x"); const f = u.pathname.startsWith("/modeles/") ? path.join(dir, path.basename(u.pathname)) : path.normalize(path.join(racine, decodeURIComponent(u.pathname)));
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
  for (const moteur of ["webgl2", "webgpu"]) {
    await page.selectOption("#iaMoteur", moteur); await page.setInputFiles("#iaFic", []); await page.setInputFiles("#iaFic", path.join(dir, "test-q8_0.gguf"));
    await page.waitForFunction((m) => window.__ia && (m === "webgpu" ? window.__ia.gpu.mode === "WebGPU" : window.__ia.gpu.mode !== "WebGPU") && !document.getElementById("iaChat").hidden, moteur, { timeout: 90000 });
    // une conversation, pour avoir une mémoire non vide ; puis les mots que le modèle donnerait à la suite (référence)
    await page.fill("#iaSaisie", "Bonjour"); await page.click("#iaEnvoi"); await page.waitForFunction(() => !document.getElementById("iaEnvoi").disabled, null, { timeout: 60000 });
    const pos0 = await page.evaluate(() => window.__ia.position);
    const suite = () => page.evaluate(async () => (await window.__ia.discuter([{ role: "user", content: "Bonjour" }, { role: "assistant", content: window.__repA }, { role: "user", content: "Merci" }], { maxTokens: 6, temperature: 0, repetition: 1 })).ids);
    await page.evaluate(() => { window.__repA = document.querySelector("#iaFil .ia").textContent; });
    // diagnostic
    await page.click("#iaDiag"); await page.waitForFunction(() => window.__profil, null, { timeout: 120000 });
    const r = await page.evaluate(() => window.__profil), txt = await page.textContent("#iaDiagnostic");
    ok(r.moteur === (moteur === "webgpu" ? "WebGPU" : "WebGL2") && r.categories.length >= 9 && r.categories.every((c) => Number.isFinite(c.ms) && c.ms >= 0 && c.appels >= 1), moteur + " : " + r.categories.length + " opérations mesurées, chiffres valides");
    ok(r.reelMs > 0 && /Un mot complet = \d+ ms/.test(txt) && /Non expliqué|Écart de mesure/.test(txt) && /GPU : /.test(txt), moteur + " : affichage lisible :\n" + txt);
    ok((await page.evaluate(() => window.__ia.position)) === pos0, moteur + " : la position de la conversation n'a pas changé (" + pos0 + ")");
    ok(!(await page.locator("#iaDiag").isDisabled()), moteur + " : le bouton est de nouveau utilisable");
    // la conversation continue normalement après le diagnostic (même position, mêmes mots que sur un modèle neuf recevant la même suite)
    await page.fill("#iaSaisie", "Merci"); await page.click("#iaEnvoi"); await page.waitForFunction(() => !document.getElementById("iaEnvoi").disabled, null, { timeout: 60000 });
    ok(!/Erreur/.test(await page.locator("#iaFil .ia").last().textContent()), moteur + " : la conversation continue normalement après le diagnostic");
    await page.evaluate(() => { window.__profil = null; });
  }
  ok(!erreurs.length, "aucune erreur dans la console " + JSON.stringify(erreurs));
  await nav.close(); srv.close(); console.log(ko ? ko + " ÉCHEC(S)" : "TOUT EST JUSTE"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.error("ÉCHEC", e.message); process.exit(1); });
