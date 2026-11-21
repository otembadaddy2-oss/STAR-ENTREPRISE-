// Test de l'étape 2 : un modèle complet (Qwen2 de test) calculé en WebGPU doit redonner les mêmes scores que le processeur
// et que la référence llama.cpp. GPU simulé par logiciel : seule l'exactitude est vérifiée, pas la vitesse.
// Préparer : python3 tools/ia/fabrique-gguf-test.py /tmp/ia-test && python3 tools/ia/reference-llamacpp.py /tmp/ia-test /tmp/ia-test/ref.json
// Lancer : NODE_PATH=$(npm root -g) node tools/test-star-ia-webgpu-modele.cjs [dossier-modeles=/tmp/ia-test]
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const racine = process.cwd(), dir = process.argv[2] || "/tmp/ia-test", ref = JSON.parse(fs.readFileSync(path.join(dir, "ref.json"), "utf8"));
const srv = http.createServer((rq, rs) => {
  const u = new URL(rq.url, "http://x"); const f = u.pathname.startsWith("/modeles/") ? path.join(dir, path.basename(u.pathname)) : path.normalize(path.join(racine, decodeURIComponent(u.pathname)));
  if (!(f.startsWith(racine) || f.startsWith(dir)) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { rs.writeHead(404); return rs.end(); }
  rs.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html; charset=utf-8" : f.endsWith(".js") ? "text/javascript" : "application/octet-stream" }); fs.createReadStream(f).pipe(rs);
});
let ko = 0; const ok = (c, m) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port;
  const nav = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-angle=swiftshader", "--use-webgpu-adapter=swiftshader", "--no-sandbox"] });
  const page = await nav.newPage(); const erreurs = [];
  page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error") erreurs.push("console: " + m.text()); });
  await page.goto(base + "/tools/test-webgpu-telephone.html");
  await page.addScriptTag({ url: "/star-gpu/star-ia.js" }); await page.addScriptTag({ url: "/star-gpu/star-ia-webgpu.js" });
  const res = await page.evaluate(async (refLogits) => {
    const out = {}, wg = await StarIAWebGPU.ouvrir(); if (!wg) return { absent: true };
    const ecart = (a, b) => { let e = 0, m = 0; for (let i = 0; i < a.length; i++) { e = Math.max(e, Math.abs(a[i] - b[i])); m = Math.max(m, Math.abs(b[i])); } return e / Math.max(m, 1e-9); };
    const prompt = "<|im_start|>user\nBonjour<|im_end|>\n<|im_start|>assistant\n";
    for (const f of ["test-q8_0.gguf", "test-q4_0.gguf", "test-mixte.gguf"]) {
      const blob = await (await fetch("/modeles/" + f)).blob(), src = StarIA.sourceBlob(blob), seq = refLogits[f].seq;
      const mw = await StarIA.charger(src, { webgpu: wg }), mc = await StarIA.charger(src, { utiliserGPU: false });
      const lw = await mw.logits(seq), lc = mc.logits(seq);
      out[f] = { mode: mw.gpu.mode, raison: mw.gpu.raison, test: mw.gpu.testIntegral, ecartWebGPUCPU: ecart(lw, lc), ecartRef: ecart(lw, refLogits[f.replace("test-", "deq-")].dernier) };
      mw.reinitialiser(); const g1 = await mw.generer(mw.tokenizer.encoder(prompt, true), { maxTokens: 10, temperature: 0, repetition: 1 });
      mc.reinitialiser(); const g2 = await mc.generer(mc.tokenizer.encoder(prompt, true), { maxTokens: 10, temperature: 0, repetition: 1 });
      out[f].memesMots = JSON.stringify(g1.ids) === JSON.stringify(g2.ids); out[f].nMots = g1.ids.length; out[f].texte = g1.texte;
      // discussion avec message système gardé en mémoire (préchauffage), puis suite de conversation
      const o = { maxTokens: 6, temperature: 0, repetition: 1 }, msgs = [{ role: "user", content: "Bonjour" }], a = await mw.discuter(msgs, o), b = await mc.discuter(msgs, o);
      out[f].discuter = JSON.stringify(a.ids) === JSON.stringify(b.ids);
    }
    out.erreursGPU = wg.erreurs; return out;
  }, ref.logits);
  console.log(JSON.stringify(res, null, 1));
  if (res.absent) { ok(false, "WebGPU absent"); }
  else for (const f of ["test-q8_0.gguf", "test-q4_0.gguf", "test-mixte.gguf"]) {
    const r = res[f], mixte = f === "test-mixte.gguf";   // « mixte » contient des poids non compressés : WebGPU doit refuser proprement et laisser le processeur travailler
    if (mixte) ok(r.mode === "processeur" && /non compressés/.test(r.raison), f + " : repli propre sur le processeur (" + r.raison + ")"); else ok(r.mode === "WebGPU", f + " : mode WebGPU (" + r.mode + " — " + r.raison + ")");
    ok(r.ecartWebGPUCPU < 2e-3, f + " : écart WebGPU/processeur " + r.ecartWebGPUCPU); ok(r.ecartRef < 2e-3, f + " : écart avec llama.cpp " + r.ecartRef);
    ok(r.memesMots && r.nMots > 0, f + " : mêmes mots générés (" + r.nMots + ")"); ok(r.discuter, f + " : discuter identique");
  }
  if (res.erreursGPU) ok(!res.erreursGPU.length, "aucune erreur GPU " + JSON.stringify(res.erreursGPU));
  ok(!erreurs.length, "aucune erreur de page " + JSON.stringify(erreurs));
  await nav.close(); srv.close(); console.log(ko ? ko + " ÉCHEC(S)" : "TOUT EST JUSTE"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.error("ÉCHEC", e.message); process.exit(1); });
