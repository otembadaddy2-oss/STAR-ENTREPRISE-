// Test navigateur de UC STAR + garde-fou « version en un seul fichier » de STAR GPU. Lancer : node tools/test-uc-star.cjs
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
  // Garde-fou : aucune balise fermante de script dans les bibliothèques (sinon la version « un seul fichier » casse, bug vu sur téléphone)
  for (const f of ["star-gpu/star-gpu.js", "star-gpu/uc-star.js"]) ok(!/<\/script/i.test(fs.readFileSync(f, "utf8")), f + " ne contient pas de balise </script> (sûr à insérer dans une page)");
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port;
  const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const erreurs = [];
  page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error") erreurs.push("console: " + m.text()); });
  await page.goto(base + "/star-gpu/index.html"); await page.waitForTimeout(800);
  await page.addScriptTag({ url: "/star-gpu/uc-star.js" });

  const r = await page.evaluate(() => {
    const uc = UCStar.create(), out = { backend: uc.backend };
    const N = 100003, d = new Float32Array(N); for (let i = 0; i < N; i++) d[i] = ((i * 37) % 1000) / 100 - 5; // valeurs de -5 à 5
    const cpu = UCStar.create(null, { forceCpu: true }); out.cpuBackend = cpu.backend;
    const ecart = (A, B) => { let e = 0; for (let i = 0; i < A.length; i++) e = Math.max(e, Math.abs(A[i] - B[i])); return e; };
    const expr = "sin(x)*u0 + sqrt(abs(x)) - clamp(x, -1, 2) + (x > 1 ? 3 : 0.5) + i*0.00001";
    const g = uc.map(d, expr, [1.5]), c = cpu.map(d, expr, [1.5]); out.eMap = ecart(g, c); out.lenMap = g.length;
    const d2 = d.map((v) => v * 0.5), g2 = uc.zip(d, d2, "a*b + x*u1", [0, 2]), c2 = cpu.zip(d, d2, "a*b + x*u1", [0, 2]); out.eZip = ecart(g2, c2);
    const gg = uc.generate(250000, "sin(i*0.001)*n*0.000001 + smoothstep(0.2,0.8,0.5+0.5*sin(i*0.01))"), gc = cpu.generate(250000, "sin(i*0.001)*n*0.000001 + smoothstep(0.2,0.8,0.5+0.5*sin(i*0.01))"); out.eGen = ecart(gg, gc); out.lenGen = gg.length;
    // Résumés : somme (tolérance relative), min, max, avec une taille qui n'est pas un multiple de la largeur
    const pos = new Float32Array(N).map((_, i) => (i % 100) + 1);
    out.sum = [uc.reduce(pos, "sum"), cpu.reduce(pos, "sum")]; out.min = [uc.reduce(d, "min"), cpu.reduce(d, "min")]; out.max = [uc.reduce(d, "max"), cpu.reduce(d, "max")];
    out.mr = [uc.mapReduce(pos, "x*x", "sum"), cpu.mapReduce(pos, "x*x", "sum")];
    out.petit = [uc.reduce(new Float32Array([4, -2, 9]), "max"), uc.reduce(new Float32Array([7]), "min"), uc.reduce(new Float32Array(0), "sum")];
    // IA via STAR GPU
    out.mm = Array.from(uc.matmul(new Float32Array([1, 2, 3, 4]), new Float32Array([5, 6, 7, 8]), 2, 2, 2));
    // Sécurité des formules
    const refus = (e) => { try { uc.map(new Float32Array([1]), e); return false; } catch (x) { return x.message; } };
    out.refus = [refus("alert(1)"), refus("x; fetch('/')"), refus("window.x"), refus("")];
    out.million = [uc.mapReduce(new Float32Array(1000000).fill(0.5), 'x*x', 'sum'), uc.reduce(new Float32Array(1000000).fill(0.5), 'sum')];
    out.reduceGpu = [uc.reduceGpu, uc.info.reduceGpu];
    const ucCpuSomme = UCStar.create(uc.gpu, { reduceGpu: false });
    out.sommeSecours = [ucCpuSomme.mapReduce(new Float32Array(1000000).fill(0.5), 'x*x', 'sum'), ucCpuSomme.reduceGpu];
    out.bench = uc.benchmark(200000);
    return out;
  });
  ok(r.backend === "gpu" && r.cpuBackend === "cpu", "UC STAR choisit le GPU quand il existe et le processeur en secours (" + r.backend + " / " + r.cpuBackend + ")");
  ok(r.lenMap === 100003 && r.eMap < 2e-3, "map : formule avec sin, sqrt, clamp, condition identique GPU/processeur sur 100 003 valeurs (écart " + r.eMap.toExponential(1) + ")");
  ok(r.eZip < 2e-3, "zip : deux tableaux ensemble identique (écart " + r.eZip.toExponential(1) + ")");
  ok(r.lenGen === 250000 && r.eGen < 2e-3, "generate : 250 000 valeurs créées à partir d'une formule, identique (écart " + r.eGen.toExponential(1) + ")");
  ok(Math.abs(r.sum[0] - r.sum[1]) / r.sum[1] < 1e-4, "somme de 100 003 valeurs : " + r.sum.join(" vs "));
  ok(r.min[0] === r.min[1] && r.max[0] === r.max[1], "minimum " + r.min[0] + " et maximum " + r.max[0] + " exacts (taille non multiple)");
  ok(Math.abs(r.mr[0] - r.mr[1]) / r.mr[1] < 1e-4, "mapReduce (somme des carrés) : " + r.mr.join(" vs "));
  ok(r.petit[0] === 9 && r.petit[1] === 7 && r.petit[2] === 0, "cas limites (3 valeurs, 1 valeur, tableau vide) corrects : " + r.petit.join(", "));
  ok(r.mm.join() === "19,22,43,50", "matmul passe par STAR GPU : " + r.mm.join(","));
  ok(r.refus.every((m) => typeof m === "string" && /UC STAR/.test(m)), "les formules dangereuses sont refusées : " + r.refus.map((m) => m.slice(0, 40)).join(" | "));
  ok(Math.abs(r.million[0] - 250000) < 1 && Math.abs(r.million[1] - 500000) < 1, "somme de 1 000 000 de valeurs exacte (cas relevé sur téléphone : 250 000 attendu) : " + r.million.join(" / "));
  ok(r.reduceGpu[0] === true && r.reduceGpu[1] === true, "auto-test des sommes sur GPU réussi (" + r.reduceGpu.join("/") + ")");
  ok(Math.abs(r.sommeSecours[0] - 250000) < 1 && r.sommeSecours[1] === false, "si l'auto-test des sommes échoue, le processeur donne 250000 : " + r.sommeSecours.join(" / "));
  console.log("INFO mesure (bac à sable sans vrai GPU, sans valeur de vitesse) : " + JSON.stringify(r.bench));
  ok(erreurs.length === 0, "aucune erreur dans la console " + erreurs.slice(0, 3).join(" | "));
  await nav.close(); srv.close(); console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUS LES TESTS PASSENT"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.log("ÉCHEC : exception", e); process.exit(1); });
