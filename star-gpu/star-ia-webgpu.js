/*!
 * © STAR ENTREPRISE, Brazzaville. Tous droits réservés. Utilisation sous licence (voir LICENCE.txt) : contact@starentreprise.com · WhatsApp +242 06 656 50 50
 * STAR IA — moteur WebGPU (étape 1 : produit matrice × vecteur, poids 4 et 8 bits).
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
  var VERSION = '0.1';
  var VOIES = 16, RANGEES = 4, TAILLE_GROUPE = VOIES * RANGEES;   // 16 « voies » par rangée, 4 rangées par groupe de 64 fils

  // Une rangée de poids = une suite de blocs de 32 valeurs, chacun avec son échelle (nombre flottant).
  // q8 : 8 mots de 32 bits par bloc (4 valeurs signées de 8 bits par mot).
  // q4 : 4 mots de 32 bits par bloc (disposition ggml : l'octet j porte la valeur j en bas et la valeur j+16 en haut).
  function shader(kind) {
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
      'struct P { nb: u32, rows: u32, wpr: u32, r0: u32 };\n' +
      '@group(0) @binding(0) var<storage, read> W: array<u32>;\n' +
      '@group(0) @binding(1) var<storage, read> S: array<f32>;\n' +
      '@group(0) @binding(2) var<storage, read> X: array<vec4<f32>>;\n' +
      '@group(0) @binding(3) var<storage, read_write> Y: array<f32>;\n' +
      '@group(0) @binding(4) var<uniform> U: P;\n' +
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
      '  if (voie == 0u && row < U.rows) { Y[U.r0 + row] = red[li.x]; }\n' +
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
    var U = GPUBufferUsage, L = dev.limits, pipelines = {}, xBufs = {}, perdu = null;
    dev.lost.then(function (i) { perdu = i && i.message ? i.message : 'périphérique perdu'; });
    var octetsMax = Math.min(options.octetsMaxTampon || 128 * 1024 * 1024, L.maxStorageBufferBindingSize, L.maxBufferSize);
    var groupesMax = L.maxComputeWorkgroupsPerDimension;
    var erreurs = [];
    dev.addEventListener && dev.addEventListener('uncapturederror', function (e) { erreurs.push(e.error && e.error.message ? e.error.message : String(e.error)); });

    function pipeline(kind) {
      if (pipelines[kind]) return pipelines[kind];
      var mod = dev.createShaderModule({ code: shader(kind) });
      return (pipelines[kind] = dev.createComputePipeline({ layout: 'auto', compute: { module: mod, entryPoint: 'main' } }));
    }
    function tampon(taille, usage) { return dev.createBuffer({ size: Math.max(16, Math.ceil(taille / 4) * 4), usage: usage }); }
    function mot32(t) { return new Uint32Array(t.buffer, t.byteOffset, t.byteLength >> 2); }

    var api = {
      version: VERSION, device: dev, limites: { octetsMaxTampon: octetsMax, memoirePartagee: L.maxComputeWorkgroupStorageSize },
      erreurs: erreurs,
      // Envoie une matrice (q8 ou q4) sur le GPU, découpée en morceaux qui respectent la taille maximale d'un tampon.
      envoyer: function (m) {
        if (m.kind !== 'q8' && m.kind !== 'q4') throw new Error('STAR IA WebGPU : seuls les poids 4 et 8 bits sont pris en charge');
        var cols = m.cols, nb = cols / 32, octRang = m.kind === 'q8' ? cols : cols / 2, wpr = octRang / 4, src = m.kind === 'q8' ? m.q : m.p;
        var rangsMax = Math.max(RANGEES, Math.floor(octetsMax / octRang / RANGEES) * RANGEES);
        rangsMax = Math.min(rangsMax, groupesMax * RANGEES, Math.floor(octetsMax / (nb * 4) / RANGEES) * RANGEES);
        var pip = pipeline(m.kind), morceaux = [];
        for (var r0 = 0; r0 < m.rows; r0 += rangsMax) {
          var n = Math.min(rangsMax, m.rows - r0);
          var bw = tampon(n * octRang, U.STORAGE | U.COPY_DST), bs = tampon(n * nb * 4, U.STORAGE | U.COPY_DST), bu = tampon(16, U.UNIFORM | U.COPY_DST);
          dev.queue.writeBuffer(bw, 0, mot32(src.subarray(r0 * octRang, (r0 + n) * octRang)));
          dev.queue.writeBuffer(bs, 0, m.s.subarray(r0 * nb, (r0 + n) * nb));
          dev.queue.writeBuffer(bu, 0, new Uint32Array([nb, n, wpr, r0]));
          morceaux.push({ bw: bw, bs: bs, bu: bu, n: n });
        }
        var by = tampon(m.rows * 4, U.STORAGE | U.COPY_SRC), rb = tampon(m.rows * 4, U.MAP_READ | U.COPY_DST);
        var h = { kind: m.kind, rows: m.rows, cols: cols, nb: nb, morceaux: morceaux, by: by, rb: rb, pip: pip };
        return h;
      },
      liberer: function (h) { h.morceaux.forEach(function (c) { c.bw.destroy(); c.bs.destroy(); c.bu.destroy(); }); h.by.destroy(); h.rb.destroy(); },
      // Place le calcul dans un encodeur (sert à l'étape 2 : enchaîner plusieurs produits sans repasser par le processeur)
      encoder: function (enc, h, bx, by) {
        var pass = enc.beginComputePass(); pass.setPipeline(h.pip);
        h.morceaux.forEach(function (c) {
          var bg = dev.createBindGroup({ layout: h.pip.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: c.bw } }, { binding: 1, resource: { buffer: c.bs } }, { binding: 2, resource: { buffer: bx } }, { binding: 3, resource: { buffer: by || h.by } }, { binding: 4, resource: { buffer: c.bu } }] });
          pass.setBindGroup(0, bg); pass.dispatchWorkgroups(Math.ceil(c.n / RANGEES));
        });
        pass.end();
      },
      produit: async function (h, x) {
        if (perdu) throw new Error('STAR IA WebGPU : ' + perdu);
        var cols = h.cols, bx = xBufs[cols];
        if (!bx) bx = xBufs[cols] = tampon(cols * 4, U.STORAGE | U.COPY_DST);
        var xb = x.length === cols ? x : (function () { var t = new Float32Array(cols); t.set(x.subarray(0, cols)); return t; })();
        dev.queue.writeBuffer(bx, 0, xb);
        var enc = dev.createCommandEncoder(); api.encoder(enc, h, bx);
        enc.copyBufferToBuffer(h.by, 0, h.rb, 0, h.rows * 4); dev.queue.submit([enc.finish()]);
        await h.rb.mapAsync(GPUMapMode.READ);
        var out = new Float32Array(h.rb.getMappedRange(0, h.rows * 4).slice(0)); h.rb.unmap();
        return out;
      }
    };
    return api;
  }

  // Auto-test, comme celui du moteur WebGL2 : le résultat WebGPU doit égaler celui du processeur, sinon on ne l'utilise pas.
  // StarIA = le module star-ia.js (fournit matvecCPU et tenseurVersMat). Renvoie { ok, cas:[...] }.
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

  var StarIAWebGPU = { version: VERSION, ouvrir: ouvrir, creer: creer, autoTest: autoTest, shader: shader };
  if (typeof module !== 'undefined' && module.exports) module.exports = StarIAWebGPU; else racine.StarIAWebGPU = StarIAWebGPU;
})(typeof self !== 'undefined' ? self : this);
