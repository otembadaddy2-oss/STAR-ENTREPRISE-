// Test navigateur de STAR IA sur GPU (WebGL2) : mêmes résultats que le processeur. Le bac à sable n'a pas de vrai GPU : seule l'exactitude est vérifiée, pas la vitesse.
// Lancer : node tools/test-star-ia-gpu.cjs [dossier-modeles=/tmp/ia-test]
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const racine = process.cwd(), dir = process.argv[2] || "/tmp/ia-test", ref = JSON.parse(fs.readFileSync(path.join(dir, "ref.json"), "utf8"));
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".gguf": "application/octet-stream" };
const srv = http.createServer((rq, rs) => {
  const u = new URL(rq.url, "http://x"); let f = u.pathname.startsWith("/modeles/") ? path.join(dir, path.basename(u.pathname)) : path.normalize(path.join(racine, decodeURIComponent(u.pathname)));
  if (!(f.startsWith(racine) || f.startsWith(dir)) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { rs.writeHead(404); return rs.end(); }
  const taille = fs.statSync(f).size, r = /bytes=(\d+)-(\d*)/.exec(rq.headers.range || "");
  if (r) { const a = +r[1], b = r[2] ? Math.min(+r[2], taille - 1) : taille - 1; rs.writeHead(206, { "content-type": MIME[path.extname(f)] || "text/plain", "content-range": `bytes ${a}-${b}/${taille}`, "content-length": b - a + 1, "access-control-allow-origin": "*" }); fs.createReadStream(f, { start: a, end: b }).pipe(rs); }
  else { rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "text/plain", "content-length": taille }); fs.createReadStream(f).pipe(rs); }
});
let ko = 0; const ok = (c, m) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port;
  const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const erreurs = [];
  page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error") erreurs.push("console: " + m.text()); });
  await page.goto(base + "/star-gpu/index.html"); await page.waitForTimeout(500);
  await page.addScriptTag({ url: "/star-gpu/star-ia.js" });
  const res = await page.evaluate(async (refLogits) => {
    const out = {}, gpu = StarGPU.create(); out.gpuOk = gpu.info.ok && gpu.info.calculFlottant && gpu.info.precisionOk;
    const ecart = (a, b) => { let e = 0, m = 0; for (let i = 0; i < a.length; i++) { e = Math.max(e, Math.abs(a[i] - b[i])); m = Math.max(m, Math.abs(b[i])); } return e / Math.max(m, 1e-9); };
    out.autotest = StarIA.autoTestGPU(StarIA.creerGPU(gpu.gl));
    for (const f of ["test-q8_0.gguf", "test-q4_0.gguf", "test-mixte.gguf"]) {
      const blob = await (await fetch("/modeles/" + f)).blob(), src = StarIA.sourceBlob(blob);
      const mg = await StarIA.charger(src, { gpu }), mc = await StarIA.charger(src, { utiliserGPU: false }), seq = refLogits[f].seq;
      const lg = mg.logits(seq), lc = mc.logits(seq);
      out[f] = { mode: mg.gpu.mode, testIntegral: mg.gpu.testIntegral, raison: mg.gpu.raison, gpuUtilise: mg.gpu.utilise, ecartGpuCpu: ecart(lg, lc), ecartRef: ecart(lg, refLogits[f.replace("test-", "deq-")] ? [] : []), nbCouches: mg.cfg.couches };
      mg.reinitialiser(); const g1 = await mg.generer(mg.tokenizer.encoder("<|im_start|>user\nBonjour<|im_end|>\n<|im_start|>assistant\n", true), { maxTokens: 8, temperature: 0, repetition: 1 });
      mc.reinitialiser(); const g2 = await mc.generer(mc.tokenizer.encoder("<|im_start|>user\nBonjour<|im_end|>\n<|im_start|>assistant\n", true), { maxTokens: 8, temperature: 0, repetition: 1 });
      let k = 0; while (k < g1.ids.length && g1.ids[k] === g2.ids[k]) k++; out[f].prefixe = k; out[f].memesMots = k >= Math.min(4, g1.ids.length) && g1.ids.length === g2.ids.length; out[f].mots = g1.ids.length; out[f].g1 = g1.ids; out[f].g2 = g2.ids;
    }
    // message système gardé en mémoire : GPU = processeur = calcul complet depuis zéro, avant et après « nouvelle conversation », et suite de conversation
    { const blob = await (await fetch("/modeles/test-q8_0.gguf")).blob(), src = StarIA.sourceBlob(blob), mg = await StarIA.charger(src, { gpu }), mc = await StarIA.charger(src, { utiliserGPU: false });
      const o = { maxTokens: 8, temperature: 0, repetition: 1, systeme: mg.systemeDefaut }, msgs = [{ role: "user", content: "Bonjour" }], enc = (t) => mg.tokenizer.encoder(t, true), depart = mg.positionDepart, posChargement = mg.position;
      const a = await mg.discuter(msgs, o); mg.nouvelleConversation(); const posNouv = mg.position, a2 = await mg.discuter(msgs, o);
      const sys = "<|im_start|>system\n" + mg.systemeDefaut + "<|im_end|>\n", plein = enc(sys + "<|im_start|>user\nBonjour<|im_end|>\n<|im_start|>assistant\n"); mg.reinitialiser(); const r = await mg.generer(plein, o);
      const c = await mc.discuter(msgs, o), accord = (x, y) => { let k = 0; while (k < x.length && x[k] === y[k]) k++; return k >= Math.min(4, x.length) && x.length === y.length; };
      const suite = msgs.concat([{ role: "assistant", content: a.texte }, { role: "user", content: "Et toi ?" }]); mg.reinitialiser(); await mg.discuter(msgs, o); const b = await mg.discuter(suite, { maxTokens: 4, temperature: 0, repetition: 1 });
      const imEnd = mg.tokenizer.id("<|im_end|>"), seq = enc(sys).concat(enc("<|im_start|>user\nBonjour<|im_end|>\n<|im_start|>assistant\n"), (await (async () => { mg.reinitialiser(); const t = await mg.discuter(msgs, o); return t.ids; })()), enc("<|im_end|>\n<|im_start|>user\nEt toi ?<|im_end|>\n<|im_start|>assistant\n")), lg = Float32Array.from(mg.logits(seq)); let am = 0; for (let i = 0; i < lg.length; i++) if (lg[i] > lg[am]) am = i;
      out.systeme = { mode: mg.gpu.mode, depart, posChargement, posNouv, a: a.ids, a2: a2.ids, r: r.ids, c: c.ids, memeAvecApres: accord(a.ids, a2.ids) && accord(a.ids, r.ids), memeCpu: accord(a.ids, c.ids), suiteMot: b.ids[0], suiteRef: am, suiteTermine: a.termine || false };
    }
    // chargement par adresse web avec « Range » (comme depuis Hugging Face)
    const mu = await StarIA.charger(StarIA.sourceUrl("/modeles/test-q8_0.gguf"), { gpu }); out.parUrl = { gpu: mu.gpu.utilise, mots: (await mu.generer(mu.tokenizer.encoder("Salut", true), { maxTokens: 3, temperature: 0 })).ids.length };
    return out;
  }, ref.logits);
  ok(res.gpuOk, "le GPU du bac à sable (logiciel) a les nombres flottants 32 bits et la précision requise");
  ok(res.autotest.ok, "auto-test GPU : 4 matrices (8 et 4 bits, petites et de plus de 4096 rangées) identiques au processeur : " + ["q8", "q4", "q8Gros", "q4Gros"].map((k) => k + " " + res.autotest[k].ecart.toExponential(1)).join(", "));
  for (const f of ["test-q8_0.gguf", "test-q4_0.gguf", "test-mixte.gguf"]) {
    const r = res[f]; ok(r.gpuUtilise && (r.mode === "GPU intégral" || (f === "test-mixte.gguf" && r.mode === "GPU + processeur")) && (!r.testIntegral || r.testIntegral.ecartRel < 1e-3) && r.ecartGpuCpu < 1e-4 && r.memesMots, f + " : mode " + r.mode + " (auto-test intégral " + (r.testIntegral ? r.testIntegral.ecartRel.toExponential(1) : "—") + (r.mode !== "GPU intégral" ? " ; " + r.raison : "") + "), GPU utilisé, scores GPU = processeur (écart relatif " + r.ecartGpuCpu.toExponential(1) + "), les 4 premiers mots générés sont les mêmes (" + r.mots + " mots ; GPU " + r.g1.join(",") + " / processeur " + r.g2.join(",") + ")");
  }
  { const x = res.systeme; ok(x.mode === "GPU intégral" && x.depart > 5 && x.posChargement === x.depart && x.posNouv === x.depart, "message système précalculé au chargement (" + x.depart + " mots) et repris à chaque nouvelle conversation, mode " + x.mode); ok(x.memeAvecApres && x.memeCpu, "réponse identique avec message système mémorisé, après nouvelle conversation, calcul complet et processeur : " + x.a.join(",") + " | " + x.a2.join(",") + " | " + x.r.join(",") + " | " + x.c.join(",")); ok(x.suiteMot === x.suiteRef, "suite de conversation sur GPU : 1er mot de la 2e réponse " + x.suiteMot + " = " + x.suiteRef + " (calcul complet)"); }
  ok(res.parUrl.gpu && res.parUrl.mots === 3, "chargement par adresse web (téléchargement par morceaux « Range ») : " + JSON.stringify(res.parUrl));
  ok(erreurs.length === 0, "aucune erreur dans la console " + erreurs.slice(0, 3).join(" | "));
  await nav.close(); srv.close(); console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUS LES TESTS PASSENT"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.log("ÉCHEC : exception", e); process.exit(1); });
