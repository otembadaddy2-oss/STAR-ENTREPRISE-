// Test de STAR IA contre llama.cpp (référence) sur de petits modèles GGUF de test.
// Préparer : python3 tools/ia/fabrique-gguf-test.py /tmp/ia-test && python3 tools/ia/reference-llamacpp.py /tmp/ia-test /tmp/ia-test/ref.json
// Lancer :   node tools/test-star-ia.cjs [dossier=/tmp/ia-test]
const fs = require("fs"), path = require("path"), IA = require("../star-gpu/star-ia.js");
const dir = process.argv[2] || "/tmp/ia-test", ref = JSON.parse(fs.readFileSync(path.join(dir, "ref.json"), "utf8"));
let ko = 0; const ok = (c, m) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
const charge = (f, opt) => IA.charger(IA.sourceBuffer(fs.readFileSync(path.join(dir, f))), opt || {});
const ecartRel = (a, b) => { let e = 0, m = 0; for (let i = 0; i < a.length; i++) { e = Math.max(e, Math.abs(a[i] - b[i])); m = Math.max(m, Math.abs(b[i])); } return { e, m, rel: e / Math.max(m, 1e-9) }; };
(async () => {
  // 1. Mots (tokenizer)
  const m0 = await charge("test-f32.gguf"); let tousOk = true, n = 0;
  for (const [t, attendu] of Object.entries(ref.tokens)) { const mien = m0.tokenizer.encoder(t, true); n++; if (JSON.stringify(mien) !== JSON.stringify(attendu)) { tousOk = false; console.log("  différent pour", JSON.stringify(t), "\n   mien    ", mien.join(","), "\n   attendu ", attendu.join(",")); } }
  ok(tousOk, "tokenizer identique à llama.cpp sur " + n + " textes (français, anglais, accents, emoji, chiffres, espaces, jetons spéciaux)");
  const aller = "Bonjour, ça va ? 🙂 L'été à Brazzaville.", dec = m0.tokenizer.decoder(m0.tokenizer.encoder(aller, true));
  ok(dec === aller, "encoder puis décoder redonne le même texte : " + JSON.stringify(dec));
  // 1b. Formats de poids : STAR IA doit décompresser exactement comme la bibliothèque officielle « gguf » (python/dump-quant-ref.py)
  if (fs.existsSync(path.join(dir, "q-info.json"))) {
    const qi = JSON.parse(fs.readFileSync(path.join(dir, "q-info.json"), "utf8")), noms = [];
    for (const [nom, inf] of Object.entries(qi)) {
      const raw = new Uint8Array(fs.readFileSync(path.join(dir, "q-" + nom + ".bin"))), b = fs.readFileSync(path.join(dir, "q-" + nom + ".f32")), ref32 = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
      const mien = IA.dequantiser(inf.type, raw, inf.n); let e = 0; for (let i = 0; i < ref32.length; i++) e = Math.max(e, Math.abs(mien[i] - ref32[i]));
      if (e > 1e-6) { ok(false, "format " + nom + " : écart " + e); } else noms.push(nom);
    }
    ok(noms.length === Object.keys(qi).length, "décompression identique à la bibliothèque officielle pour " + noms.join(", "));
  }
  // 2. Scores (logits) : processeur, puis comparaison à llama.cpp, pour chaque format de poids
  const comparer = async (f, refNom, seuil, etiquette) => {
    const m = await charge(f), r = ref.logits[refNom], lg = m.logits(r.seq), e = ecartRel(lg, r.dernier);
    let am = 0, ar = 0; for (let i = 0; i < lg.length; i++) { if (lg[i] > lg[am]) am = i; if (r.dernier[i] > r.dernier[ar]) ar = i; }
    // au début et au milieu de la phrase aussi (vérifie le cache des clés/valeurs et RoPE à plusieurs positions)
    const pre = Float32Array.from(m.logits(r.seq.slice(0, 1))), e1 = ecartRel(pre, r.premier), mil = Math.floor(r.seq.length / 2), e2 = ecartRel(m.logits(r.seq.slice(0, mil + 1)), r.milieu);
    ok(e.rel < seuil && e1.rel < seuil && e2.rel < seuil && (etiquette !== 'exact' || am === ar), f + " vs " + refNom + " : écart relatif " + e.rel.toExponential(1) + " (début " + e1.rel.toExponential(1) + ", milieu " + e2.rel.toExponential(1) + "), même mot " + am + "/" + ar);
  };
  await comparer("test-f32.gguf", "test-f32.gguf", 2e-3, "exact");
  await comparer("test-f16.gguf", "test-f16.gguf", 2e-3, "exact");
  // Poids compressés : STAR IA doit retrouver EXACTEMENT ce que donnent ces poids, calculés par llama.cpp en flottants
  await comparer("test-q8_0.gguf", "deq-q8_0.gguf", 2e-3, "exact");
  await comparer("test-q4_0.gguf", "deq-q4_0.gguf", 2e-3, "exact");
  await comparer("test-mixte.gguf", "deq-mixte.gguf", 2e-3, "exact");   // embedding en Q6_K + le reste en Q4_0, comme un vrai fichier
  // Information : llama.cpp arrondit aussi le vecteur d'entrée sur 8 bits quand les poids sont compressés, d'où un petit écart voulu
  for (const f of ["test-q8_0.gguf", "test-q4_0.gguf", "test-mixte.gguf"]) { const m = await charge(f), e = ecartRel(m.logits(ref.logits[f].seq), ref.logits[f].dernier); ok(e.rel < 0.08, f + " vs llama.cpp quantifié : écart relatif " + e.rel.toExponential(1) + " (attendu : quelques %, car llama.cpp arrondit aussi le vecteur d'entrée)"); }
  // 3. Génération : conversation complète, déterministe, et la mémoire (cache) donne les mêmes résultats que sans cache
  const mq = await charge("test-q8_0.gguf"), prompt = mq.tokenizer.encoder("<|im_start|>user\nBonjour<|im_end|>\n<|im_start|>assistant\n", true);
  mq.reinitialiser(); const g1 = await mq.generer(prompt, { maxTokens: 12, temperature: 0, repetition: 1 });
  mq.reinitialiser(); const l1 = Float32Array.from(mq.nourrir(prompt.concat(g1.ids.slice(0, 3)), true)), l2 = mq.logits(prompt.concat(g1.ids.slice(0, 3)));
  ok(g1.ids.length >= 1 && ecartRel(l1, l2).rel < 1e-6, "génération : " + g1.ids.length + " mots produits, et recalcul identique avec/sans cache");
  const mq2 = await charge("test-q8_0.gguf"); const g2 = await mq2.generer(prompt, { maxTokens: 12, temperature: 0, repetition: 1 });
  ok(JSON.stringify(g1.ids) === JSON.stringify(g2.ids), "génération déterministe (température 0) : mêmes mots à chaque fois");
  const conv = []; conv.push({ role: "user", content: "Salut" }); const rc = await mq.discuter(conv, { maxTokens: 5, temperature: 0 });
  conv.push({ role: "assistant", content: rc.texte }); conv.push({ role: "user", content: "Et toi ?" }); const rc2 = await mq.discuter(conv, { maxTokens: 5, temperature: 0 });
  ok(typeof rc2.texte === "string" && mq.position > 10, "conversation sur plusieurs messages (mémoire gardée, position " + mq.position + ")");
  // 4. Cas d'erreur propres
  let msg = ""; try { await IA.charger(IA.sourceBuffer(Buffer.from("pas un modèle du tout, pas un modèle du tout"))); } catch (e) { msg = e.message; }
  ok(/GGUF/.test(msg), "un mauvais fichier est refusé clairement : " + msg);
  console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUS LES TESTS PASSENT"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.log("ÉCHEC : exception", e); process.exit(1); });
