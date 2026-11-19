// Captures de contrôle visuel : monstres de tous les types, tirs, explosions, planètes (jeu ASTRO QUEST). Lancer : node tools/capture-monstres-astro.cjs
const http = require("http"), fs = require("fs"), path = require("path"); const { chromium } = require("playwright"); const racine = process.cwd();
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/json" };
const srv = http.createServer((rq, rs) => { const f = path.normalize(path.join(racine, decodeURIComponent(new URL(rq.url, "http://x").pathname))); if (f.startsWith(racine) && fs.existsSync(f) && fs.statSync(f).isFile()) { rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(fs.readFileSync(f)); } else { rs.writeHead(404); rs.end(); } });
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port; const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const page = await ctx.newPage(); page.on("pageerror", (e) => console.log("ERREUR", e.message));
  await page.goto(base + "/jeu-astro/index.html"); await page.waitForSelector("#bJouer");
  const A = (f, arg) => page.evaluate(f, arg);
  // niveau 5 (tous les monstres, triple tir), beaucoup de monstres à l'écran, on ne vise pas
  await page.click("#bJouer"); await A(() => { const a = window.__astro; a.S.niveau = 4; a.debutNiveau(); a.S.cible = 999; a.S.bouclier = 3; });
  await page.evaluate(() => { const S = window.__astro.S; const types = ['blob', 'poulpe', 'soucoupe', 'piquant']; types.forEach((t, i) => { S.ennemis.push({ type: t, ph: i, x: 60 + i * 80, y: 150 + (i % 2) * 90, vx: t === 'soucoupe' ? 30 : 0, vy: 8, hp: 99, r: t === 'poulpe' ? 19 : t === 'soucoupe' ? 22 : t === 'piquant' ? 21 : 17, pts: 10, tir: 9, hit: 0, t: 0, ox: 60 + i * 80, amp: 10, dure: 99 }); }); S.tx = 190; S.ty = 600; });
  await new Promise((r) => setTimeout(r, 900)); await page.screenshot({ path: "/tmp/astro-m1-monstres.png" });
  await A(() => { const S = window.__astro.S; S.ennemis.forEach((e) => { e.hp = 1; }); });
  await new Promise((r) => setTimeout(r, 700)); await page.screenshot({ path: "/tmp/astro-m2-explosions.png" });
  // Saturne (niveau 5) : planète et gardien ; Jupiter ; Neptune
  for (const [n, nom] of [[3, "jupiter"], [4, "saturne"], [6, "neptune"]]) {
    await A((n) => { const a = window.__astro; a.S.niveau = n; a.S.ennemis.length = 0; a.debutNiveau(); a.S.cible = 0; }, n); await new Promise((r) => setTimeout(r, 4600)); await page.screenshot({ path: `/tmp/astro-m3-${nom}.png` });
  }
  await nav.close(); srv.close(); console.log("captures écrites");
})();
