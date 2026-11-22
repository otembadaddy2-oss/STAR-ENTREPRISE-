// Captures d'aperçu visuel du jeu ASTRO QUEST (version premium). Lancer : NODE_PATH=$(npm root -g) node tools/capture-astro-apercu.cjs [dossier-sortie]
const http = require("http"), fs = require("fs"), path = require("path"); const { chromium } = require("playwright"); const racine = process.cwd(), sortie = process.argv[2] || "/tmp/astro-apercu";
fs.mkdirSync(sortie, { recursive: true });
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/json", ".woff2": "font/woff2" };
const srv = http.createServer((rq, rs) => { const f = path.normalize(path.join(racine, decodeURIComponent(new URL(rq.url, "http://x").pathname))); if (f.startsWith(racine) && fs.existsSync(f) && fs.statSync(f).isFile()) { rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(rs); } else { rs.writeHead(404); rs.end(); } });
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port; const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }), page = await ctx.newPage(), erreurs = [];
  page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message + " | " + (e.stack || "").split("\n").slice(1, 4).join(" ; "))); page.on("console", (m) => { if (m.type() === "error") erreurs.push("console: " + m.text()); });
  const att = (ms) => new Promise((r) => setTimeout(r, ms));
  await page.goto(base + "/jeu-astro/index.html"); await page.waitForSelector("#bJouer"); await att(900); await page.screenshot({ path: sortie + "/1-titre.png" });
  await page.click("#bRegles"); await att(500); await page.screenshot({ path: sortie + "/2-regles.png" }); await page.click("#bRegOk"); await att(300);
  await page.click("#bJouer"); await page.evaluate(() => { const a = window.__astro; a.S.niveau = 4; a.debutNiveau(); a.S.cible = 999; a.S.bouclier = 3; });
  await page.evaluate(() => { const S = window.__astro.S; const types = ['blob', 'poulpe', 'soucoupe', 'piquant']; types.forEach((t, i) => { S.ennemis.push({ type: t, ph: i, x: 60 + i * 80, y: 150 + (i % 2) * 90, vx: 0, vy: 0, r: 24, hp: 3, t: 0, hit: 0, tir: 0, pts: 10 }); }); });
  await att(1100); await page.screenshot({ path: sortie + "/3-vol-ennemis.png" });
  for (const [n, nom] of [[4, "saturne"], [3, "jupiter"], [2, "mars"], [6, "neptune"]]) {
    await page.evaluate((n) => { const a = window.__astro; a.S.niveau = n; a.S.ennemis.length = 0; a.debutNiveau(); a.S.cible = 0; }, n); await att(4800); await page.screenshot({ path: `${sortie}/4-${nom}-gardien.png` });
  }
  console.log("erreurs:", erreurs); await nav.close(); srv.close();
})();
