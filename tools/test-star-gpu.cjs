// Test navigateur de STAR GPU (WebGL2). Lancer depuis la racine du dépôt : node tools/test-star-gpu.cjs
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const racine = process.cwd();
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript" };
const srv = http.createServer((rq, rs) => {
  const f = path.normalize(path.join(racine, decodeURIComponent(new URL(rq.url, "http://x").pathname)));
  if (f.startsWith(racine) && fs.existsSync(f) && fs.statSync(f).isFile()) { rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "text/plain" }); rs.end(fs.readFileSync(f)); } else { rs.writeHead(404); rs.end(); }
});
let ko = 0; const ok = (c, m) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port;
  const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const erreurs = [];
  page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error") erreurs.push("console: " + m.text()); });
  await page.goto(base + "/star-gpu/index.html"); await page.waitForTimeout(1500);

  const info = await page.evaluate(() => window.__gpu.info);
  ok(info.ok, "WebGL2 disponible : " + info.renderer);
  ok(info.calculFlottant, "calcul flottant (EXT_color_buffer_float) disponible"); ok(info.precisionOk === true, "contrôle de précision 32 bits réussi");

  // Matrices : le GPU doit donner le même résultat que le processeur central
  const mat = await page.evaluate(() => {
    const m = 37, k = 53, n = 29, A = new Float32Array(m * k), B = new Float32Array(k * n);
    for (let i = 0; i < A.length; i++) A[i] = Math.sin(i * 0.7); for (let i = 0; i < B.length; i++) B[i] = Math.cos(i * 0.31);
    const g = window.__gpu, C1 = g.compute.matmul(A, B, m, k, n), C2 = g.cpu.matmul(A, B, m, k, n);
    let e = 0; for (let i = 0; i < C1.length; i++) e = Math.max(e, Math.abs(C1[i] - C2[i]));
    // Petit réseau : dense + relu
    const X = new Float32Array([1, -2, 3, 0.5]), W = new Float32Array([1, 0, 0, 1, 1, 1, -1, 2]), b = new Float32Array([0.5, -10]);
    const y = Array.from(g.compute.dense(X, W, b, 1, 4, 2, "relu"));
    return { e, len: C1.length, y };
  });
  ok(mat.len === 37 * 29 && mat.e < 1e-3, "multiplication de matrices 37×53 · 53×29 identique au processeur central (écart " + mat.e.toExponential(1) + ")");
  // X·W = [1*1+(-2)*0+3*1+0.5*(-1), 1*0+(-2)*1+3*1+0.5*2] = [3.5, 2] ; +biais = [4, -8] ; relu = [4, 0]
  ok(Math.abs(mat.y[0] - 4) < 1e-4 && mat.y[1] === 0, "couche de neurones (dense + relu) correcte : " + mat.y.join(", "));

  // Filtres : couleur connue -> résultat attendu
  const px = await page.evaluate(() => {
    const s = document.createElement("canvas"); s.width = 4; s.height = 4; const c = s.getContext("2d"); c.fillStyle = "rgb(200,100,50)"; c.fillRect(0, 0, 4, 4);
    const g = StarGPU.create(document.createElement("canvas"));
    const gris = g.image(s).filter("grayscale", 1).readPixels(), neg = g.image(s).filter("invert").readPixels(), ori = g.image(s).readPixels();
    const clair = g.image(s).filter("brightness", 0.2).readPixels();
    return { gris: Array.from(gris.slice(0, 4)), neg: Array.from(neg.slice(0, 4)), ori: Array.from(ori.slice(0, 4)), clair: Array.from(clair.slice(0, 4)) };
  });
  const luma = Math.round(0.299 * 200 + 0.587 * 100 + 0.114 * 50);
  ok(px.ori[0] === 200 && px.ori[1] === 100 && px.ori[2] === 50, "image sans filtre lue telle quelle : " + px.ori.join(","));
  ok(Math.abs(px.gris[0] - luma) <= 2 && px.gris[0] === px.gris[1] && px.gris[1] === px.gris[2], "filtre gris correct (" + px.gris.join(",") + ", attendu ≈ " + luma + ")");
  ok(Math.abs(px.neg[0] - 55) <= 1 && Math.abs(px.neg[1] - 155) <= 1 && Math.abs(px.neg[2] - 205) <= 1, "filtre négatif correct : " + px.neg.join(","));
  ok(Math.abs(px.clair[0] - 251) <= 2 && px.clair[0] > px.ori[0], "luminosité +0,2 correcte : " + px.clair.join(","));

  // Sprites : un carré rouge dessiné au bon endroit
  const sp = await page.evaluate(() => {
    const cv = document.createElement("canvas"); cv.width = 100; cv.height = 100; const g = StarGPU.create(cv), lot = g.sprites(10);
    lot.fond(0, 0, 0, 1); lot.add({ x: 25, y: 25, w: 20, h: 20, color: [1, 0, 0, 1] }); lot.draw(null, 100, 100);
    const gl = g.gl, p = new Uint8Array(4), lire = (x, y) => { gl.readPixels(x, 100 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p); return Array.from(p); };
    return { dedans: lire(25, 25), dehors: lire(75, 75), n: lot.count };
  });
  ok(sp.dedans[0] === 255 && sp.dedans[1] === 0 && sp.dehors[0] === 0, "sprite rouge dessiné au bon endroit (dedans " + sp.dedans.join(",") + ", dehors " + sp.dehors.join(",") + ")");

  // Démonstration : animation, milliers de sprites, benchmark
  const fps = await page.evaluate(() => window.__fps); ok(fps > 0, "la démo anime 5000 sprites : " + fps + " images/seconde (logiciel de secours du bac à sable, pas un vrai GPU)");
  await page.click("#bBench"); await page.waitForTimeout(500);
  const b = await page.evaluate(() => window.__bench); ok(b && b.ecartMax < 1e-2, "mesure 256×256 : processeur " + b.cpuMs + " ms, GPU " + b.gpuMs + " ms, écart " + b.ecartMax.toExponential(1));
  await page.click("[data-f='sepia']"); await page.waitForTimeout(200); await page.screenshot({ path: "/tmp/star-gpu-demo.png", fullPage: true });

  // Secours : sans WebGL2 la bibliothèque doit quand même calculer
  const sec = await page.evaluate(() => { const g = StarGPU.create(null, { forceCpu: true }); return { ok: g.info.ok, c: Array.from(g.compute.matmul(new Float32Array([1, 2, 3, 4]), new Float32Array([5, 6, 7, 8]), 2, 2, 2)) }; });
  ok(sec.ok === false && sec.c.join() === "19,22,43,50", "secours sans WebGL2 : calcul correct sur le processeur central");
  ok(erreurs.length === 0, "aucune erreur dans la console " + erreurs.slice(0, 3).join(" | "));
  await nav.close(); srv.close(); console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUS LES TESTS PASSENT"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.log("ÉCHEC : exception", e); process.exit(1); });
