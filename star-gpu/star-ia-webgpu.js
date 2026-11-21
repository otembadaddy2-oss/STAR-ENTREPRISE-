/*!
 * © STAR ENTREPRISE, Brazzaville. Tous droits réservés. Utilisation sous licence (voir LICENCE.txt) : contact@starentreprise.com · WhatsApp +242 06 656 50 50
 * STAR IA — moteur WebGPU (étapes 1 et 2 : produit matrice × vecteur 4 et 8 bits + un mot complet du modèle Qwen2 sur le GPU).
 * WebGPU donne de vrais « compute shaders » et la mémoire partagée rapide du GPU (SMEM). Ce module est OPTIONNEL :
 * si le navigateur ne propose pas WebGPU, STAR IA continue avec le moteur WebGL2 (star-ia.js), rien ne change pour l'utilisateur.
 *
 *   var wg = await StarIAWebGPU.ouvrir();            // null si WebGPU est absent
 *   var h  = wg.envoyer(matrice);                    // matrice { kind:'q8'|'q4', rows, cols, q|p, s } comme dans star-ia.js
 *   var y  = await wg.produit(h, x);                 // Float32Array(rows)
 *
 * Honnête : le gain de vitesse dépend de l'appareil. Il se mesure, il ne se promet pas.
 */
(function (racine) {
  'use strict';
  var VERSION = '0.2';
  var VOIES = 16, RANGEES = 4, TAILLE_GROUPE = VOIES * RANGEES;   // 16 « voies » par rangée, 4 rangées par groupe de 64 fils

  // Une rangée de poids = une suite de blocs de 32 valeurs, chacun avec son échelle (nombre flottant).
  // q8 : 8 mots de 32 bits par bloc (4 valeurs signées de 8 bits par mot).
  // q4 : 4 mots de 32 bits par bloc (disposition ggml : l'octet j porte la valeur j en bas et la valeur j+16 en haut).
  function shaderProduit(kind) {
    var corps = kind === 'q8'
      ? 'for (var t = 0u; t < 8u; t = t + 1u) {\n' +
        '  let v = W[wbase + t];\n' +
        '  let xv = X[xbase + t];\n' +
        '  let a = vec4<f32>(f32(bitcast<i32>(v << 24u) >> 24u), f32(bitcast<i32>(v << 16u) >> 24u), f32(bitcast<i32>(v << 8u) >> 24u), f32(bitcast<i32>(v) >> 24u));\n' +
        '  acc = acc + dot(a, xv);\n' +
        '}\n'
      : 'for (var t = 0u; t < 4u; t = t + 1u) {\n' +
        '  let v = W[wbase + t];\n' +
        '  let xl = X[xbase + t];\n' +
        '  let xh = X[xbase + 4u + t];\n' +
        '  let lo = vec4<f32>(f32((v & 15u)) - 8.0, f32((v >> 8u) & 15u) - 8.0, f32((v >> 16u) & 15u) - 8.0, f32((v >> 24u) & 15u) - 8.0);\n' +
        '  let hi = vec4<f32>(f32((v >> 4u) & 15u) - 8.0, f32((v >> 12u) & 15u) - 8.0, f32((v >> 20u) & 15u) - 8.0, f32((v >> 28u) & 15u) - 8.0);\n' +
        '  acc = acc + dot(lo, xl) + dot(hi, xh);\n' +
        '}\n';
    var motsParBloc = kind === 'q8' ? '8u' : '4u';
    return '' +
      'struct P { nb: u32, rows: u32, wpr: u32, r0: u32, ha: u32, a1: u32, a2: u32, a3: u32 };\n' +
      '@group(0) @binding(0) var<storage, read> W: array<u32>;\n' +
      '@group(0) @binding(1) var<storage, read> S: array<f32>;\n' +
      '@group(0) @binding(2) var<storage, read> X: array<vec4<f32>>;\n' +
      '@group(0) @binding(3) var<storage, read_write> Y: array<f32>;\n' +
      '@group(0) @binding(4) var<uniform> U: P;\n' +
      '@group(0) @binding(5) var<storage, read> A: array<f32>;\n' +
      'var<workgroup> red: array<f32, ' + TAILLE_GROUPE + '>;\n' +   // la mémoire partagée rapide (SMEM) sert à additionner les voies
      '@compute @workgroup_size(' + TAILLE_GROUPE + ')\n' +
      'fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_id) li: vec3<u32>) {\n' +
      '  let voie = li.x % ' + VOIES + 'u;\n' +
      '  let row = wg.x * ' + RANGEES + 'u + li.x / ' + VOIES + 'u;\n' +
      '  var sum = 0.0;\n' +
      '  if (row < U.rows) {\n' +
      '    for (var b = voie; b < U.nb; b = b + ' + VOIES + 'u) {\n' +
      '      var acc = 0.0;\n' +
      '      let wbase = row * U.wpr + b * ' + motsParBloc + ';\n' +
      '      let xbase = b * 8u;\n' +
      corps +
      '      sum = sum + S[row * U.nb + b] * acc;\n' +
      '    }\n' +
      '  }\n' +
      '  red[li.x] = sum;\n' +
      '  workgroupBarrier();\n' +
      '  for (var s = ' + (VOIES / 2) + 'u; s > 0u; s = s >> 1u) {\n' +
      '    if (voie < s) { red[li.x] = red[li.x] + red[li.x + s]; }\n' +
      '    workgroupBarrier();\n' +
      '  }\n' +
      '  if (voie == 0u && row < U.rows) {\n' +
      '    var r = red[li.x];\n' +
      '    if (U.ha == 1u) { r = r + A[U.r0 + row]; }\n' +   // biais ou résidu ajouté directement (comme le moteur WebGL2)
      '    Y[U.r0 + row] = r;\n' +
      '  }\n' +
      '}\n';
  }

  // Normalisation RMS : un seul groupe de 256 fils, la mémoire partagée additionne les carrés.
  function shaderRMS(n, eps) {
    return '' +
      '@group(0) @binding(0) var<storage, read> X: array<f32>;\n' +
      '@group(0) @binding(1) var<storage, read> Wn: array<f32>;\n' +
      '@group(0) @binding(2) var<storage, read_write> O: array<f32>;\n' +
      'var<workgroup> red: array<f32, 256>;\n' +
      '@compute @workgroup_size(256)\n' +
      'fn main(@builtin(local_invocation_id) li: vec3<u32>) {\n' +
      '  var s = 0.0;\n' +
      '  for (var i = li.x; i < ' + n + 'u; i = i + 256u) { s = s + X[i] * X[i]; }\n' +
      '  red[li.x] = s;\n' +
      '  workgroupBarrier();\n' +
      '  for (var k = 128u; k > 0u; k = k >> 1u) {\n' +
      '    if (li.x < k) { red[li.x] = red[li.x] + red[li.x + k]; }\n' +
      '    workgroupBarrier();\n' +
      '  }\n' +
      '  let kk = inverseSqrt(red[0] / ' + n + '.0 + ' + eps.toExponential(8) + ');\n' +
      '  for (var i = li.x; i < ' + n + 'u; i = i + 256u) { O[i] = X[i] * kk * Wn[i]; }\n' +
      '}\n';
  }

  // RoPE sur les têtes de q, et écriture de k (avec RoPE) et de v dans la mémoire des mots déjà vus (cache).
  function shaderRope(HD, QD, KVD) {
    return '' +
      'struct Dyn { pos: u32, np: u32, a: u32, b: u32 };\n' +
      '@group(0) @binding(0) var<storage, read> QKV: array<f32>;\n' +
      '@group(0) @binding(1) var<storage, read> ROT: array<f32>;\n' +
      '@group(0) @binding(2) var<storage, read_write> QR: array<f32>;\n' +
      '@group(0) @binding(3) var<storage, read_write> CK: array<f32>;\n' +
      '@group(0) @binding(4) var<storage, read_write> CV: array<f32>;\n' +
      '@group(0) @binding(5) var<uniform> D: Dyn;\n' +
      'fn rope(off: u32, e: u32) -> f32 {\n' +
      '  let i = e % ' + HD + 'u;\n' +
      '  if (i < ' + (HD / 2) + 'u) { return QKV[off + e] * ROT[i] - QKV[off + e + ' + (HD / 2) + 'u] * ROT[' + (HD / 2) + 'u + i]; }\n' +
      '  let ii = i - ' + (HD / 2) + 'u;\n' +
      '  return QKV[off + e] * ROT[ii] + QKV[off + e - ' + (HD / 2) + 'u] * ROT[' + (HD / 2) + 'u + ii];\n' +
      '}\n' +
      '@compute @workgroup_size(64)\n' +
      'fn main(@builtin(global_invocation_id) g: vec3<u32>) {\n' +
      '  let e = g.x;\n' +
      '  if (e < ' + QD + 'u) { QR[e] = rope(0u, e); }\n' +
      '  if (e < ' + KVD + 'u) {\n' +
      '    CK[D.pos * ' + KVD + 'u + e] = rope(' + QD + 'u, e);\n' +
      '    CV[D.pos * ' + KVD + 'u + e] = QKV[' + (QD + KVD) + 'u + e];\n' +
      '  }\n' +
      '}\n';
  }

  // Attention : un groupe de 64 fils par tête. Les scores et le vecteur q vivent dans la mémoire partagée rapide (SMEM).
  function shaderAttention(HD, KVD, REP, CTX) {
    return '' +
      'struct Dyn { pos: u32, np: u32, a: u32, b: u32 };\n' +
      '@group(0) @binding(0) var<storage, read> QR: array<f32>;\n' +
      '@group(0) @binding(1) var<storage, read> CK: array<f32>;\n' +
      '@group(0) @binding(2) var<storage, read> CV: array<f32>;\n' +
      '@group(0) @binding(3) var<storage, read_write> ATT: array<f32>;\n' +
      '@group(0) @binding(4) var<uniform> D: Dyn;\n' +
      'var<workgroup> sc: array<f32, ' + CTX + '>;\n' +
      'var<workgroup> qs: array<f32, ' + HD + '>;\n' +
      'var<workgroup> red: array<f32, 64>;\n' +
      '@compute @workgroup_size(64)\n' +
      'fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_id) li: vec3<u32>) {\n' +
      '  let h = wg.x; let kvh = h / ' + REP + 'u; let np = D.np; let lid = li.x;\n' +
      '  for (var i = lid; i < ' + HD + 'u; i = i + 64u) { qs[i] = QR[h * ' + HD + 'u + i]; }\n' +
      '  workgroupBarrier();\n' +
      '  var mx = -3.0e38;\n' +
      '  for (var t = lid; t < np; t = t + 64u) {\n' +
      '    var s = 0.0; let base = t * ' + KVD + 'u + kvh * ' + HD + 'u;\n' +
      '    for (var i = 0u; i < ' + HD + 'u; i = i + 1u) { s = s + qs[i] * CK[base + i]; }\n' +
      '    s = s * ' + (1 / Math.sqrt(HD)).toExponential(9) + ';\n' +
      '    sc[t] = s; mx = max(mx, s);\n' +
      '  }\n' +
      '  red[lid] = mx;\n' +
      '  workgroupBarrier();\n' +
      '  for (var k = 32u; k > 0u; k = k >> 1u) { if (lid < k) { red[lid] = max(red[lid], red[lid + k]); } workgroupBarrier(); }\n' +
      '  let m = red[0];\n' +
      '  workgroupBarrier();\n' +
      '  var sm = 0.0;\n' +
      '  for (var t = lid; t < np; t = t + 64u) { let e = exp(sc[t] - m); sc[t] = e; sm = sm + e; }\n' +
      '  red[lid] = sm;\n' +
      '  workgroupBarrier();\n' +
      '  for (var k = 32u; k > 0u; k = k >> 1u) { if (lid < k) { red[lid] = red[lid] + red[lid + k]; } workgroupBarrier(); }\n' +
      '  let total = red[0];\n' +
      '  for (var d = lid; d < ' + HD + 'u; d = d + 64u) {\n' +
      '    var acc = 0.0;\n' +
      '    for (var t = 0u; t < np; t = t + 1u) { acc = acc + sc[t] * CV[t * ' + KVD + 'u + kvh * ' + HD + 'u + d]; }\n' +
      '    ATT[h * ' + HD + 'u + d] = acc / total;\n' +
      '  }\n' +
      '}\n';
  }

  function shaderSwiglu(FF) {
    return '' +
      '@group(0) @binding(0) var<storage, read> GU: array<f32>;\n' +
      '@group(0) @binding(1) var<storage, read_write> ACT: array<f32>;\n' +
      '@compute @workgroup_size(64)\n' +
      'fn main(@builtin(global_invocation_id) g: vec3<u32>) {\n' +
      '  let j = g.x;\n' +
      '  if (j < ' + FF + 'u) { let a = GU[j]; ACT[j] = a / (1.0 + exp(-a)) * GU[' + FF + 'u + j]; }\n' +
      '}\n';
  }

  async function ouvrir(options) {
    options = options || {};
    if (typeof navigator === 'undefined' || !navigator.gpu) return null;
    var ad = null; try { ad = await navigator.gpu.requestAdapter(); } catch (e) { return null; }
    if (!ad) return null;
    var dev = null; try { dev = await ad.requestDevice(); } catch (e) { return null; }
    var api = creer(dev, options);
    var info = {}; try { info = ad.info || (ad.requestAdapterInfo ? await ad.requestAdapterInfo() : {}); } catch (e) { }
    api.adaptateur = { fabricant: info.vendor || '', architecture: info.architecture || '', description: info.description || info.device || '' };
    api.fonctions = Array.from(ad.features || []);
    return api;
  }

  function creer(dev, options) {
    options = options || {};
    var U = GPUBufferUsage, L = dev.limits, pipelines = {}, perdu = null;
    dev.lost.then(function (i) { perdu = i && i.message ? i.message : 'périphérique perdu'; });
    var octetsMax = Math.min(options.octetsMaxTampon || 128 * 1024 * 1024, L.maxStorageBufferBindingSize, L.maxBufferSize);
    var groupesMax = L.maxComputeWorkgroupsPerDimension;
    var erreurs = [];
    if (dev.addEventListener) dev.addEventListener('uncapturederror', function (e) { erreurs.push(e.error && e.error.message ? e.error.message : String(e.error)); });

    function pipeline(cle, code) {
      if (pipelines[cle]) return pipelines[cle];
      var mod = dev.createShaderModule({ code: code });
      return (pipelines[cle] = dev.createComputePipeline({ layout: 'auto', compute: { module: mod, entryPoint: 'main' } }));
    }
    function tampon(taille, usage) { return dev.createBuffer({ size: Math.max(16, Math.ceil(taille / 16) * 16), usage: usage }); }
    function mot32(t) { return new Uint32Array(t.buffer, t.byteOffset, t.byteLength >> 2); }
    var S_RW = U.STORAGE | U.COPY_DST | U.COPY_SRC;
    function vide(n) { return tampon(n * 4, S_RW); }
    function depuis(f32) { var b = tampon(f32.length * 4, S_RW); dev.queue.writeBuffer(b, 0, f32); return b; }
    var factice = tampon(16, U.STORAGE | U.COPY_DST), xBufs = {};

    var api = {
      version: VERSION, device: dev, limites: { octetsMaxTampon: octetsMax, memoirePartagee: L.maxComputeWorkgroupStorageSize },
      erreurs: erreurs, tampon: tampon,
      autoTest: function (StarIA, o) { return autoTest(api, StarIA, o); },
      // Envoie une matrice (q8 ou q4) sur le GPU, découpée en morceaux qui respectent la taille maximale d'un tampon.
      envoyer: function (m) {
        if (m.kind !== 'q8' && m.kind !== 'q4') throw new Error('STAR IA WebGPU : seuls les poids 4 et 8 bits sont pris en charge');
        var cols = m.cols, nb = cols / 32, octRang = m.kind === 'q8' ? cols : cols / 2, wpr = octRang / 4, src = m.kind === 'q8' ? m.q : m.p;
        var rangsMax = Math.max(RANGEES, Math.floor(octetsMax / octRang / RANGEES) * RANGEES);
        rangsMax = Math.min(rangsMax, groupesMax * RANGEES, Math.max(RANGEES, Math.floor(octetsMax / (nb * 4) / RANGEES) * RANGEES));
        var pip = pipeline(m.kind, shaderProduit(m.kind)), morceaux = [];
        for (var r0 = 0; r0 < m.rows; r0 += rangsMax) {
          var n = Math.min(rangsMax, m.rows - r0);
          var bw = tampon(n * octRang, U.STORAGE | U.COPY_DST), bs = tampon(n * nb * 4, U.STORAGE | U.COPY_DST);
          dev.queue.writeBuffer(bw, 0, mot32(src.subarray(r0 * octRang, (r0 + n) * octRang)));
          dev.queue.writeBuffer(bs, 0, m.s.subarray(r0 * nb, (r0 + n) * nb));
          morceaux.push({ bw: bw, bs: bs, n: n, r0: r0 });
        }
        return { kind: m.kind, rows: m.rows, cols: cols, nb: nb, wpr: wpr, morceaux: morceaux, pip: pip, by: null, rb: null, liaisons: [] };
      },
      liberer: function (h) {
        h.morceaux.forEach(function (c) { c.bw.destroy(); c.bs.destroy(); });
        h.liaisons.forEach(function (l) { l.us.forEach(function (u) { u.destroy(); }); });
        if (h.by) h.by.destroy(); if (h.rb) h.rb.destroy();
      },
      // Prépare les « branchements » d'un produit : entrée bx, sortie bout, et (option) un vecteur bA ajouté au résultat (biais ou résidu).
      lier: function (h, bx, bout, bA) {
        var us = [], gps = h.morceaux.map(function (c) {
          var bu = tampon(32, U.UNIFORM | U.COPY_DST); us.push(bu);
          dev.queue.writeBuffer(bu, 0, new Uint32Array([h.nb, c.n, h.wpr, c.r0, bA ? 1 : 0, 0, 0, 0]));
          return dev.createBindGroup({ layout: h.pip.getBindGroupLayout(0), entries: [
            { binding: 0, resource: { buffer: c.bw } }, { binding: 1, resource: { buffer: c.bs } }, { binding: 2, resource: { buffer: bx } },
            { binding: 3, resource: { buffer: bout } }, { binding: 4, resource: { buffer: bu } }, { binding: 5, resource: { buffer: bA || factice } }] });
        });
        var l = { pip: h.pip, gps: gps, ns: h.morceaux.map(function (c) { return c.n; }), us: us }; h.liaisons.push(l); return l;
      },
      lancer: function (pass, l) {
        pass.setPipeline(l.pip);
        for (var i = 0; i < l.gps.length; i++) { pass.setBindGroup(0, l.gps[i]); pass.dispatchWorkgroups(Math.ceil(l.ns[i] / RANGEES)); }
      },
      produit: async function (h, x) {
        if (perdu) throw new Error('STAR IA WebGPU : ' + perdu);
        var cols = h.cols, bx = xBufs[cols];
        if (!bx) bx = xBufs[cols] = tampon(cols * 4, U.STORAGE | U.COPY_DST);
        if (!h.by) { h.by = tampon(h.rows * 4, U.STORAGE | U.COPY_SRC); h.rb = tampon(h.rows * 4, U.MAP_READ | U.COPY_DST); h.lp = api.lier(h, bx, h.by, null); }
        var xb = x.length === cols ? x : (function () { var t = new Float32Array(cols); t.set(x.subarray(0, cols)); return t; })();
        dev.queue.writeBuffer(bx, 0, xb);
        var enc = dev.createCommandEncoder(), pass = enc.beginComputePass(); api.lancer(pass, h.lp); pass.end();
        enc.copyBufferToBuffer(h.by, 0, h.rb, 0, h.rows * 4); dev.queue.submit([enc.finish()]);
        await h.rb.mapAsync(GPUMapMode.READ);
        var out = new Float32Array(h.rb.getMappedRange(0, h.rows * 4).slice(0)); h.rb.unmap();
        return out;
      },

      // ---- Un mot complet du modèle, sur le GPU ----
      // cfg : { dim, ffn, tetes, tetesKV, hd, q, kvd, ctx, couches, eps, base, vocab } (comme dans star-ia.js)
      // couches[l] : { an, fn (Float32Array), biais (Float32Array|null), h : { qkv, o, gu, d } (poignées de envoyer) } ; norme : Float32Array ; sortieH : poignée
      creerPipeline: function (cfg, couches, norme, sortieH) {
        var D = cfg.dim, QD = cfg.q, KVD = cfg.kvd, HD = cfg.hd, FF = cfg.ffn, CTX = cfg.ctx, REP = cfg.tetes / cfg.tetesKV, H = cfg.tetes, V = cfg.vocab;
        if ((CTX + HD + 64) * 4 > L.maxComputeWorkgroupStorageSize) throw new Error('STAR IA WebGPU : mémoire partagée trop petite pour ' + CTX + ' mots');
        if (HD % 2) throw new Error('STAR IA WebGPU : taille de tête impaire');
        var pRMS = pipeline('rms' + D + '_' + cfg.eps, shaderRMS(D, cfg.eps)), pROPE = pipeline('rope' + HD + '_' + QD + '_' + KVD, shaderRope(HD, QD, KVD)),
          pATT = pipeline('att' + HD + '_' + KVD + '_' + REP + '_' + CTX, shaderAttention(HD, KVD, REP, CTX)), pSW = pipeline('sw' + FF, shaderSwiglu(FF));
        var Xa = vide(D), Xb = vide(D), H1 = vide(D), QKV = vide(QD + 2 * KVD), QR = vide(QD), ATT = vide(QD), GU = vide(2 * FF), ACT = vide(FF), ROT = vide(HD), LOG = vide(V);
        var DYN = tampon(16, U.UNIFORM | U.COPY_DST), RB = tampon(V * 4, U.MAP_READ | U.COPY_DST), NF = depuis(norme);
        function bg(pip, tamp) { return dev.createBindGroup({ layout: pip.getBindGroupLayout(0), entries: tamp.map(function (b, i) { return { binding: i, resource: { buffer: b } }; }) }); }
        var etapes = [];
        couches.forEach(function (Lc) {
          var an = depuis(Lc.an), fn = depuis(Lc.fn), bs = Lc.biais ? depuis(Lc.biais) : null, cK = vide(CTX * KVD), cV = vide(CTX * KVD);
          etapes.push({
            rms1: bg(pRMS, [Xa, an, H1]), qkv: api.lier(Lc.h.qkv, H1, QKV, bs), rope: bg(pROPE, [QKV, ROT, QR, cK, cV, DYN]), att: bg(pATT, [QR, cK, cV, ATT, DYN]),
            o: api.lier(Lc.h.o, ATT, Xb, Xa), rms2: bg(pRMS, [Xb, fn, H1]), gu: api.lier(Lc.h.gu, H1, GU, null), sw: bg(pSW, [GU, ACT]), d: api.lier(Lc.h.d, ACT, Xa, Xb)
          });
        });
        var rmsFin = bg(pRMS, [Xa, NF, H1]), sortie = api.lier(sortieH, H1, LOG, null);
        var rotBuf = new Float32Array(HD), invFreq = new Float32Array(HD / 2), dyn = new Uint32Array(4), xbuf = new Float32Array(D);
        for (var f = 0; f < HD / 2; f++) invFreq[f] = Math.pow(cfg.base, -2 * f / HD);
        function un(pass, pip, g, n) { pass.setPipeline(pip); pass.setBindGroup(0, g); pass.dispatchWorkgroups(n); }
        return {
          // Diagnostic : temps d'un appel de chaque sorte d'opération sur CET appareil (1 appel puis 1+R appels : la différence enlève le coût de l'attente).
          // Ne touche pas à la conversation : seule la case du mot suivant (position pos) est réécrite.
          profil: async function (pos, R) {
            R = R || 8; var E = etapes[0], L = etapes.length, out = [], self = this;
            dyn[0] = pos; dyn[1] = pos + 1; dev.queue.writeBuffer(DYN, 0, dyn);
            async function temps(f, k) { var t0 = performance.now(), enc = dev.createCommandEncoder(), pass = enc.beginComputePass(); for (var i = 0; i < k; i++) f(pass); pass.end(); dev.queue.submit([enc.finish()]); await dev.queue.onSubmittedWorkDone(); return performance.now() - t0; }
            async function mesurer(nom, appels, f) {
              await temps(f, 2); var a = Infinity, b = Infinity;
              for (var e = 0; e < 3; e++) { a = Math.min(a, await temps(f, 1)); b = Math.min(b, await temps(f, 1 + R)); }
              out.push({ nom: nom, ms: Math.max(0, (b - a) / R), appels: appels });
            }
            await mesurer('Normalisations (RMS)', 2 * L, function (p) { un(p, pRMS, E.rms1, 1); });
            await mesurer('Produit qkv (questions, clés, valeurs)', L, function (p) { api.lancer(p, E.qkv); });
            await mesurer('Positions (RoPE) et écriture dans la mémoire', L, function (p) { un(p, pROPE, E.rope, Math.ceil(QD / 64)); });
            await mesurer('Attention (scores, softmax, somme pondérée)', L, function (p) { un(p, pATT, E.att, H); });
            await mesurer('Produit o (sortie de l\'attention)', L, function (p) { api.lancer(p, E.o); });
            await mesurer('Produit gu (porte et montée)', L, function (p) { api.lancer(p, E.gu); });
            await mesurer('SwiGLU', L, function (p) { un(p, pSW, E.sw, Math.ceil(FF / 64)); });
            await mesurer('Produit d (descente)', L, function (p) { api.lancer(p, E.d); });
            await mesurer('Dernière étape : choix parmi tout le vocabulaire', 1, function (p) { un(p, pRMS, rmsFin, 1); api.lancer(p, sortie); });
            var lec = Infinity; for (var q = 0; q < 4; q++) { await temps(function () { }, 1); var t0 = performance.now(), enc2 = dev.createCommandEncoder(); enc2.copyBufferToBuffer(LOG, 0, RB, 0, V * 4); dev.queue.submit([enc2.finish()]); await RB.mapAsync(GPUMapMode.READ); new Float32Array(RB.getMappedRange(0, V * 4).slice(0)); RB.unmap(); lec = Math.min(lec, performance.now() - t0); }
            out.push({ nom: 'Lecture des scores (GPU vers processeur)', ms: lec, appels: 1 });
            var xz = new Float32Array(D), reel = Infinity; await self.avancer(xz, pos, true);
            for (var r = 0; r < 3; r++) { var t1 = performance.now(); await self.avancer(xz, pos, true); reel = Math.min(reel, performance.now() - t1); }
            return { moteur: 'WebGPU', position: pos, couches: L, categories: out, reelMs: reel };
          },
          // Un mot : renvoie null (pas de scores demandés) ou une promesse de Float32Array(vocab)
          avancer: function (xEmbed, pos, voulLogits) {
            if (perdu) throw new Error('STAR IA WebGPU : ' + perdu);
            xbuf.set(xEmbed.length > D ? xEmbed.subarray(0, D) : xEmbed); dev.queue.writeBuffer(Xa, 0, xbuf);
            for (var f2 = 0; f2 < HD / 2; f2++) { var ang = pos * invFreq[f2]; rotBuf[f2] = Math.cos(ang); rotBuf[HD / 2 + f2] = Math.sin(ang); }
            dev.queue.writeBuffer(ROT, 0, rotBuf); dyn[0] = pos; dyn[1] = pos + 1; dev.queue.writeBuffer(DYN, 0, dyn);
            var enc = dev.createCommandEncoder(), pass = enc.beginComputePass();
            for (var l = 0; l < etapes.length; l++) {
              var E = etapes[l];
              un(pass, pRMS, E.rms1, 1); api.lancer(pass, E.qkv);
              un(pass, pROPE, E.rope, Math.ceil(QD / 64)); un(pass, pATT, E.att, H);
              api.lancer(pass, E.o); un(pass, pRMS, E.rms2, 1); api.lancer(pass, E.gu);
              un(pass, pSW, E.sw, Math.ceil(FF / 64)); api.lancer(pass, E.d);
            }
            if (!voulLogits) { pass.end(); dev.queue.submit([enc.finish()]); return null; }
            un(pass, pRMS, rmsFin, 1); api.lancer(pass, sortie); pass.end();
            enc.copyBufferToBuffer(LOG, 0, RB, 0, V * 4); dev.queue.submit([enc.finish()]);
            return RB.mapAsync(GPUMapMode.READ).then(function () { var o = new Float32Array(RB.getMappedRange(0, V * 4).slice(0)); RB.unmap(); return o; });
          },
          liberer: function () { /* les tampons sont rendus avec le périphérique */ }
        };
      }
    };
    return api;
  }

  // Auto-test, comme celui du moteur WebGL2 : le résultat WebGPU doit égaler celui du processeur, sinon on ne l'utilise pas.
  // StarIA = le module star-ia.js (fournit matvecCPU). Renvoie { ok, cas:[...] }.
  async function autoTest(api, StarIA, options) {
    options = options || {};
    var rng = 12345; function al() { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff - 0.5; }
    var cas = [['q8', 4864, 300], ['q4', 896, 530], ['q8', 64, 4200], ['q4', 64, 4200], ['q8', 896, 3], ['q4', 128, 7], ['q8', 896, 4097]], res = [], ok = true;
    for (var ci = 0; ci < cas.length; ci++) {
      var kind = cas[ci][0], cols = cas[ci][1], rows = cas[ci][2], n = rows * cols, w = new Float32Array(n), i, b, j;
      for (i = 0; i < n; i++) w[i] = al() * 0.2;
      var nb = n / 32, m;
      if (kind === 'q8') {
        var q = new Int8Array(n), s = new Float32Array(nb);
        for (b = 0; b < nb; b++) { var mx = 0; for (j = 0; j < 32; j++) mx = Math.max(mx, Math.abs(w[b * 32 + j])); var d = mx / 127, id = d ? 1 / d : 0; s[b] = d; for (j = 0; j < 32; j++) q[b * 32 + j] = Math.round(w[b * 32 + j] * id); }
        m = { kind: 'q8', rows: rows, cols: cols, q: q, s: s };
      } else {
        var p = new Uint8Array(n / 2), s4 = new Float32Array(nb);
        for (b = 0; b < nb; b++) { var mx4 = 0; for (j = 0; j < 32; j++) mx4 = Math.max(mx4, Math.abs(w[b * 32 + j])); var d4 = mx4 / 7 || 1e-6; s4[b] = d4; for (j = 0; j < 16; j++) { var lo = Math.max(0, Math.min(15, Math.round(w[b * 32 + j] / d4) + 8)), hi = Math.max(0, Math.min(15, Math.round(w[b * 32 + j + 16] / d4) + 8)); p[b * 16 + j] = lo | (hi << 4); } }
        m = { kind: 'q4', rows: rows, cols: cols, p: p, s: s4 };
      }
      var x = new Float32Array(cols); for (i = 0; i < cols; i++) x[i] = al() * 2;
      var ref = new Float32Array(rows); StarIA.matvecCPU(m, x, ref);
      var h = api.envoyer(m), y = await api.produit(h, x); api.liberer(h);
      var e = 0, mv = 0; for (i = 0; i < rows; i++) { e = Math.max(e, Math.abs(y[i] - ref[i])); mv = Math.max(mv, Math.abs(ref[i])); }
      var bon = e <= 2e-3 * Math.max(1, mv); if (!bon) ok = false;
      res.push({ kind: kind, cols: cols, rows: rows, morceaux: h.morceaux.length, ecart: e, max: mv, ok: bon });
    }
    return { ok: ok, cas: res };
  }

  var StarIAWebGPU = { version: VERSION, ouvrir: ouvrir, creer: creer, autoTest: autoTest, shader: shaderProduit };
  if (typeof module !== 'undefined' && module.exports) module.exports = StarIAWebGPU; else racine.StarIAWebGPU = StarIAWebGPU;
})(typeof self !== 'undefined' ? self : this);
