// Vérifie le mode « Performance » de X SAPHIR ARENA : nombre d'images dessinées par seconde selon le réglage. Lancer : node tools/test-arena-perf.cjs
const http = require("http"), fs = require("fs"), path = require("path"); const { chromium } = require("playwright");
const racine = process.cwd(), MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((rq, rs) => { const f = path.normalize(path.join(racine, decodeURIComponent(new URL(rq.url, "http://x").pathname))); if (f.startsWith(racine) && fs.existsSync(f) && fs.statSync(f).isFile()) { rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "text/plain" }); rs.end(fs.readFileSync(f)); } else { rs.writeHead(404); rs.end(); } });
let ko = 0; const ok = (c, m) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port, nav = await chromium.launch(); const res = {};
  for (const perf of ["max", "auto", "eco"]) {
    const page = await (await nav.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 })).newPage(); const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message));
    await page.addInitScript((p) => { try { localStorage.setItem("xs_arena_v1", JSON.stringify({ perf: p })); } catch (e) {} }, perf);
    await page.goto(base + "/arena/index.html"); await page.waitForTimeout(3500);
    const r = await page.evaluate(async () => { let n = 0; const o = XS.Render.prototype.draw; XS.Render.prototype.draw = function () { n++; return o.apply(this, arguments); }; await new Promise((r) => setTimeout(r, 2000)); XS.Render.prototype.draw = o; return { n, w: document.getElementById("cv").width }; });
    res[perf] = r; ok(erreurs.length === 0, perf + " : aucune erreur " + erreurs.join("|"));
    await page.close();
  }
  console.log("images dessinées en 2 s :", JSON.stringify(res));
  ok(res.max.n >= 40, "Maximum : le jeu dessine bien en continu (" + res.max.n + " images en 2 s ; ce bac à sable n'a pas de vrai GPU, donc moins qu'un téléphone)");
  ok(res.eco.n > 0 && res.eco.n <= res.max.n * 0.75, "Économie : environ moitié moins d'images dessinées (" + res.eco.n + " contre " + res.max.n + ")");
  ok(res.eco.w < res.max.w, "Économie : image plus légère (" + res.eco.w + " px de large contre " + res.max.w + ")");
  ok(res.auto.n >= res.eco.n, "Auto : pas moins fluide que l'économie (" + res.auto.n + ")");
  await nav.close(); srv.close(); console.log(ko ? ko + " ÉCHEC(S)" : "TOUS LES TESTS PASSENT"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.log("ÉCHEC", e); process.exit(1); });
