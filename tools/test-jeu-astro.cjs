// Test navigateur du jeu ASTRO QUEST (téléphone 390x844) : parcours complet, captures dans /tmp/astro-*.png
// Lancer depuis la racine du dépôt : node tools/test-jeu-astro.cjs
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const racine = process.cwd();
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((rq, rs) => {
  const p = new URL(rq.url, "http://x").pathname; const f = path.normalize(path.join(racine, decodeURIComponent(p)));
  if (f.startsWith(racine) && fs.existsSync(f) && fs.statSync(f).isFile()) { rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(fs.readFileSync(f)); } else { rs.writeHead(404); rs.end(); }
});
let ko = 0; const ok = (c, m) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
const att = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port;
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36" });
  const page = await ctx.newPage(); const erreurs = [];
  page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error") erreurs.push("console: " + m.text()); });
  const etat = () => page.evaluate(() => window.__astro.S.mode);
  const attendreMode = async (mode, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await etat()) === mode) return true; await att(120); } return false; };
  const viser = () => page.evaluate(() => { if (window.__vise) return; window.__vise = setInterval(() => { const S = window.__astro.S; if (S.mode !== 'vol') return; const e = S.ennemis.filter((x) => x.y > 20).sort((a, b) => b.y - a.y)[0]; if (e) { S.tx = e.x; S.ty = 560; } else { S.tx = 180; } }, 40); });

  // 1. Écran titre
  const t0 = Date.now(); await page.goto(base + "/jeu-astro/index.html?rapide"); await page.waitForSelector("#bJouer");
  ok(Date.now() - t0 < 4000, "le jeu s'affiche en moins de 4 secondes (textures de planètes comprises) : " + (Date.now() - t0) + " ms");
  await att(700); await page.screenshot({ path: "/tmp/astro-1-titre.png" });
  ok(/ASTRO/.test(await page.textContent(".logo")) && /STAR ENTREPRISE/.test(await page.textContent(".signature")), "écran titre : nom du jeu et signature STAR ENTREPRISE");
  await page.click("#bRegles"); await att(300); await page.screenshot({ path: "/tmp/astro-2-regles.png" }); ok(/seconde chance/i.test(await page.textContent("#regles")), "les règles expliquent la seconde chance"); await page.click("#bRegOk");

  // 2. Lancement
  await page.click("#bJouer"); await att(1500); await page.screenshot({ path: "/tmp/astro-3-compte.png" });
  ok((await etat()) === "lancement", "le décollage commence par un compte à rebours");
  await att(2800); await page.screenshot({ path: "/tmp/astro-4-decollage.png" });
  ok(await attendreMode("vol", 8000), "après le décollage, le niveau 1 démarre");
  await viser(); await att(1500); await page.screenshot({ path: "/tmp/astro-5-combat.png" });
  const n1 = await page.evaluate(() => window.__astro.S.ennemis.length + window.__astro.S.balles.length);
  ok(n1 > 0, "des monstres et des tirs sont à l'écran");

  // 3. Les monstres meurent, la planète arrive, le gardien pose sa question
  ok(await attendreMode("arrivee", 40000), "détruire les monstres fait apparaître la planète");
  await att(1800); await page.screenshot({ path: "/tmp/astro-6-planete.png" });
  ok(await attendreMode("gardien", 10000), "le gardien de la planète apparaît");
  await page.waitForSelector("#quiz.on .rep"); await att(500); await page.screenshot({ path: "/tmp/astro-7-quiz.png" });
  const q1 = await page.textContent("#qtxt");
  ok((await page.$$("#qrep .rep")).length === 4 && /Question 1/.test(await page.textContent("#qChance")), "quiz à cliquer : 4 réponses, question 1");

  // 4. Mauvaise réponse -> seconde chance -> mauvaise réponse -> GAME OVER
  await page.click("#qrep .rep[data-bon='0']"); await att(500); await page.screenshot({ path: "/tmp/astro-8-mauvaise.png" });
  ok(/Mauvaise réponse/.test(await page.textContent("#msg")), "une mauvaise réponse affiche « Mauvaise réponse »");
  await att(2200);
  const q2 = await page.textContent("#qtxt"); ok(q2 !== q1 && /Seconde chance/.test(await page.textContent("#qChance")), "seconde chance avec une AUTRE question");
  await page.click("#qrep .rep[data-bon='0']"); await att(2600); await page.screenshot({ path: "/tmp/astro-9-fin-rayon.png" });
  ok(await attendreMode("finattente", 6000), "deuxième erreur : fin de partie");
  await att(400); await page.screenshot({ path: "/tmp/astro-10-gameover.png" });
  ok(await page.isVisible("#fin") && /GAME OVER/.test(await page.textContent("#fin")), "écran GAME OVER");
  ok(/Pour progresser/.test(await page.textContent("#fCorrection")), "le Game Over rappelle les bonnes réponses (pour apprendre)");

  // 5. Rejouer : bonne réponse -> atterrissage -> niveau suivant
  await page.click("#bRejouer"); await page.evaluate(() => { window.__astro.S.tm = 6.2; }); ok(await attendreMode("vol", 5000), "REJOUER relance une partie"); await viser();
  ok(await attendreMode("gardien", 50000), "niveau 1 terminé"); await page.waitForSelector("#quiz.on .rep");
  await page.click("#qrep .rep[data-bon='1']"); await att(500); ok(/Bonne réponse/.test(await page.textContent("#msg")), "une bonne réponse est félicitée");
  ok(await attendreMode("atterrissage", 5000), "bonne réponse : atterrissage"); await att(1500); await page.screenshot({ path: "/tmp/astro-11-atterrissage.png" });
  ok(await attendreMode("pose", 8000), "atterrissage réussi"); await att(900); await page.screenshot({ path: "/tmp/astro-12-pose.png" });
  ok(/MERCURE/.test(await page.textContent("#pPlan")) && (await page.textContent("#pFait")).length > 20, "panneau d'atterrissage : planète, étoiles, « Le savais-tu ? »");
  await page.click("#bSuite"); ok(await attendreMode("decollage", 2000), "on redécolle vers la planète suivante"); await att(1200); await page.screenshot({ path: "/tmp/astro-13-redecolle.png" });
  ok(await attendreMode("vol", 6000), "niveau 2 : Vénus"); ok(/VÉNUS/.test(await page.textContent("#hNiv")), "le niveau 2 est Vénus");
  await att(1500); await page.screenshot({ path: "/tmp/astro-14-niveau2.png" });

  // 6. Pause
  await page.click("#bPause"); ok((await etat()) === "pause" && (await page.isVisible("#pauseE")), "la pause fonctionne"); await page.click("#bReprendre"); ok((await etat()) === "vol", "on reprend la partie");

  // 7. Dernier niveau -> victoire
  await page.evaluate(() => { const A = window.__astro; A.S.niveau = 7; A.debutNiveau(); }); await viser();
  ok(await attendreMode("gardien", 50000), "niveau 8 (Pluton) : gardien"); await page.waitForSelector("#quiz.on .rep"); await att(400); await page.screenshot({ path: "/tmp/astro-15-pluton.png" });
  await page.click("#qrep .rep[data-bon='1']"); ok(await attendreMode("pose", 12000), "atterrissage sur Pluton"); ok(/TERMINER/.test(await page.textContent("#bSuite")), "dernier niveau : bouton « Terminer la mission »");
  await page.click("#bSuite"); await att(1800); await page.screenshot({ path: "/tmp/astro-16-victoire.png" });
  ok(await page.isVisible("#gagne") && /Explorateur/.test(await page.textContent("#gagne")), "écran de victoire");

  // 8. Installation et hors connexion
  ok(await page.evaluate(() => fetch("manifest.webmanifest").then((r) => r.json()).then((m) => m.display === "fullscreen" && m.icons.length >= 3)), "manifeste d'installation valide (plein écran, icônes)");
  ok(erreurs.length === 0, "aucune erreur dans la console " + erreurs.slice(0, 3).join(" | "));
  await nav.close(); srv.close(); console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUS LES TESTS PASSENT"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.log("ÉCHEC : exception", e); process.exit(1); });
