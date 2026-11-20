/*!
 * STAR IA v1.0 — moteur de modèles de langage de STAR ENTREPRISE (fait partie de STAR GPU).
 * Lit un fichier GGUF (Qwen2 / Qwen2.5 et architectures proches), le fait tourner mot par mot,
 * sur le GPU de l'appareil (WebGL2, poids compressés en 4 ou 8 bits) ou, à défaut, sur le processeur.
 *
 * Usage :
 *   var src  = StarIA.sourceBlob(fichierOuBlob)            // ou StarIA.sourceUrl(url) ; en Node : StarIA.sourceBuffer(buf)
 *   var m    = await StarIA.charger(src, { gpu: StarGPU.create(), progression: function (p, texte) {} });
 *   var rep  = await m.discuter([{ role: 'user', content: 'Bonjour !' }], { maxTokens: 200, onToken: function (t) {} });
 *
 * Honnête : ce n'est pas CUDA ni une puce. C'est du logiciel qui utilise le GPU de l'appareil. La vitesse dépend de l'appareil.
 */
(function (racine) {
  'use strict';
  var VERSION = '1.0';

  // =====================================================================================
  // 1. Lecture du fichier GGUF
  // =====================================================================================
  var TYPES = { // type GGUF : { b : éléments par bloc, o : octets par bloc }
    0: { n: 'F32', b: 1, o: 4 }, 1: { n: 'F16', b: 1, o: 2 }, 2: { n: 'Q4_0', b: 32, o: 18 }, 3: { n: 'Q4_1', b: 32, o: 20 },
    6: { n: 'Q5_0', b: 32, o: 22 }, 7: { n: 'Q5_1', b: 32, o: 24 }, 8: { n: 'Q8_0', b: 32, o: 34 }, 14: { n: 'Q6_K', b: 256, o: 210 }, 30: { n: 'BF16', b: 1, o: 2 }
  };
  function f16(h) {
    var s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 31, m = h & 1023;
    if (e === 0) return s * m * 5.960464477539063e-8;
    if (e === 31) return m ? NaN : s * Infinity;
    return s * (1 + m / 1024) * Math.pow(2, e - 15);
  }
  var F16TAB = null;
  function f16tab() { if (!F16TAB) { F16TAB = new Float32Array(65536); for (var i = 0; i < 65536; i++) F16TAB[i] = f16(i); } return F16TAB; }

  function lireEntete(buf, base) {
    var dv = new DataView(buf), p = 0, td = new TextDecoder();
    function u32() { var v = dv.getUint32(p, true); p += 4; return v; }
    function u64() { var lo = dv.getUint32(p, true), hi = dv.getUint32(p + 4, true); p += 8; return hi * 4294967296 + lo; }
    function str() { var n = u64(); if (p + n > buf.byteLength) throw new RangeError('fin'); var s = td.decode(new Uint8Array(buf, p, n)); p += n; return s; }
    function val(t) {
      switch (t) {
        case 0: return dv.getUint8(p++); case 1: return dv.getInt8(p++);
        case 2: p += 2; return dv.getUint16(p - 2, true); case 3: p += 2; return dv.getInt16(p - 2, true);
        case 4: return u32(); case 5: p += 4; return dv.getInt32(p - 4, true); case 6: p += 4; return dv.getFloat32(p - 4, true);
        case 7: return dv.getUint8(p++) !== 0; case 8: return str();
        case 9: { var tt = u32(), n = u64(), a = new Array(n); for (var i = 0; i < n; i++) a[i] = val(tt); return a; }
        case 10: return u64(); case 11: return u64(); case 12: p += 8; return dv.getFloat64(p - 8, true);
        default: throw new Error('GGUF : type de valeur inconnu ' + t);
      }
    }
    if (dv.getUint32(0, true) !== 0x46554747) throw new Error('Ce fichier n\'est pas un modèle GGUF.');
    p = 4; var version = u32(); if (version < 2 || version > 3) throw new Error('Version GGUF non prise en charge : ' + version);
    var nt = u64(), nkv = u64(), kv = {}, tensors = [];
    for (var i = 0; i < nkv; i++) { var k = str(), t = u32(); kv[k] = val(t); }
    for (var j = 0; j < nt; j++) {
      var nom = str(), nd = u32(), dims = []; for (var d = 0; d < nd; d++) dims.push(u64());
      var type = u32(), off = u64(); tensors.push({ nom: nom, dims: dims, type: type, off: off });
    }
    var align = kv['general.alignment'] || 32, debut = Math.ceil(p / align) * align;
    return { kv: kv, tensors: tensors, dataStart: debut, version: version };
  }

  // Sources de fichiers : une même interface { taille, lire(debut, fin) -> Promise<ArrayBuffer> }
  function sourceBuffer(buf) { var u = buf instanceof Uint8Array ? buf : new Uint8Array(buf); return { taille: u.byteLength, lire: function (a, b) { return Promise.resolve(u.buffer.slice(u.byteOffset + a, u.byteOffset + b)); } }; }
  function sourceBlob(blob) { return { taille: blob.size, lire: function (a, b) { return blob.slice(a, b).arrayBuffer(); } }; }
  function sourceUrl(url) {
    var taille = null;
    return {
      get taille() { return taille; }, url: url,
      init: function () { return fetch(url, { headers: { Range: 'bytes=0-0' } }).then(function (r) { var m = /\/(\d+)$/.exec(r.headers.get('content-range') || ''); taille = m ? +m[1] : +r.headers.get('content-length'); return r.arrayBuffer(); }); },
      lire: function (a, b) { return fetch(url, { headers: { Range: 'bytes=' + a + '-' + (b - 1) } }).then(function (r) { if (!r.ok && r.status !== 206) throw new Error('Téléchargement impossible (' + r.status + ')'); return r.arrayBuffer(); }); }
    };
  }

  async function ouvrirGGUF(src) {
    if (src.init) await src.init();
    var essai = 4 * 1024 * 1024, max = src.taille;
    for (;;) {
      var n = Math.min(essai, max), buf = await src.lire(0, n);
      try { var h = lireEntete(buf); return { src: src, kv: h.kv, tensors: h.tensors, dataStart: h.dataStart, version: h.version, parNom: (function () { var o = {}; h.tensors.forEach(function (t) { o[t.nom] = t; }); return o; })() }; }
      catch (e) { if ((e instanceof RangeError) && n < max) { essai *= 4; continue; } throw e; }
    }
  }
  function nbElements(t) { var n = 1; t.dims.forEach(function (d) { n *= d; }); return n; }
  function octetsTenseur(t) { var i = TYPES[t.type]; if (!i) throw new Error('Format de poids non pris en charge (type ' + t.type + '). Prends un fichier q8_0 ou q4_0.'); return nbElements(t) / i.b * i.o; }
  async function lireTenseur(g, t) { var o = g.dataStart + t.off; return new Uint8Array(await g.src.lire(o, o + octetsTenseur(t))); }

  // =====================================================================================
  // 2. Poids : lecture d'un tenseur vers un format interne (f32, q8 ou q4)
  //    q8 : { kind:'q8', rows, cols, q:Int8Array, s:Float32Array(rows*cols/32) }
  //    q4 : { kind:'q4', rows, cols, p:Uint8Array(rows*cols/2) (disposition ggml), s:Float32Array }
  //    f32: { kind:'f32', rows, cols, w:Float32Array }
  // =====================================================================================
  function dequantiser(type, u, nElem) {
    // renvoie un Float32Array de nElem valeurs (rangées contiguës)
    var out = new Float32Array(nElem), dv = new DataView(u.buffer, u.byteOffset, u.byteLength), T = f16tab(), i, b, j;
    switch (type) {
      case 0: for (i = 0; i < nElem; i++) out[i] = dv.getFloat32(i * 4, true); break;
      case 1: for (i = 0; i < nElem; i++) out[i] = T[dv.getUint16(i * 2, true)]; break;
      case 30: { var tmp = new DataView(new ArrayBuffer(4)); for (i = 0; i < nElem; i++) { tmp.setUint16(2, dv.getUint16(i * 2, true), true); out[i] = tmp.getFloat32(0, true); } break; }
      case 8: for (b = 0; b < nElem / 32; b++) { var o8 = b * 34, d8 = T[dv.getUint16(o8, true)]; for (j = 0; j < 32; j++) out[b * 32 + j] = d8 * dv.getInt8(o8 + 2 + j); } break;
      case 2: for (b = 0; b < nElem / 32; b++) { var o4 = b * 18, d4 = T[dv.getUint16(o4, true)]; for (j = 0; j < 16; j++) { var by = u[o4 + 2 + j]; out[b * 32 + j] = d4 * ((by & 15) - 8); out[b * 32 + j + 16] = d4 * ((by >> 4) - 8); } } break;
      case 3: for (b = 0; b < nElem / 32; b++) { var o1 = b * 20, d1 = T[dv.getUint16(o1, true)], m1 = T[dv.getUint16(o1 + 2, true)]; for (j = 0; j < 16; j++) { var b1 = u[o1 + 4 + j]; out[b * 32 + j] = d1 * (b1 & 15) + m1; out[b * 32 + j + 16] = d1 * (b1 >> 4) + m1; } } break;
      case 6: for (b = 0; b < nElem / 32; b++) { var o5 = b * 22, d5 = T[dv.getUint16(o5, true)], qh = dv.getUint32(o5 + 2, true); for (j = 0; j < 16; j++) { var b5 = u[o5 + 6 + j]; out[b * 32 + j] = d5 * (((b5 & 15) | (((qh >>> j) & 1) << 4)) - 16); out[b * 32 + j + 16] = d5 * (((b5 >> 4) | (((qh >>> (j + 16)) & 1) << 4)) - 16); } } break;
      case 7: for (b = 0; b < nElem / 32; b++) { var o51 = b * 24, d51 = T[dv.getUint16(o51, true)], m51 = T[dv.getUint16(o51 + 2, true)], qh1 = dv.getUint32(o51 + 4, true); for (j = 0; j < 16; j++) { var b51 = u[o51 + 8 + j]; out[b * 32 + j] = d51 * ((b51 & 15) | (((qh1 >>> j) & 1) << 4)) + m51; out[b * 32 + j + 16] = d51 * ((b51 >> 4) | (((qh1 >>> (j + 16)) & 1) << 4)) + m51; } } break;
      case 14: for (b = 0; b < nElem / 256; b++) {
        var o6 = b * 210, d6 = T[dv.getUint16(o6 + 208, true)], ql = o6, qhh = o6 + 128, sc = o6 + 192, y = b * 256;
        for (var half = 0; half < 2; half++) {
          for (var l = 0; l < 32; l++) {
            var is = l >> 4, q1 = ((u[ql + l] & 15) | (((u[qhh + l] >> 0) & 3) << 4)) - 32, q2 = ((u[ql + l + 32] & 15) | (((u[qhh + l] >> 2) & 3) << 4)) - 32,
              q3 = ((u[ql + l] >> 4) | (((u[qhh + l] >> 4) & 3) << 4)) - 32, q4 = ((u[ql + l + 32] >> 4) | (((u[qhh + l] >> 6) & 3) << 4)) - 32;
            out[y + l] = d6 * dv.getInt8(sc + is) * q1; out[y + l + 32] = d6 * dv.getInt8(sc + is + 2) * q2; out[y + l + 64] = d6 * dv.getInt8(sc + is + 4) * q3; out[y + l + 96] = d6 * dv.getInt8(sc + is + 6) * q4;
          }
          y += 128; ql += 64; qhh += 32; sc += 8;
        }
      } break;
      default: throw new Error('Format de poids non pris en charge (type ' + type + ').');
    }
    return out;
  }

  function quantiserQ8(w, rows, cols) {
    var nb = rows * cols / 32, q = new Int8Array(rows * cols), s = new Float32Array(nb);
    for (var b = 0; b < nb; b++) {
      var m = 0, o = b * 32, j; for (j = 0; j < 32; j++) { var a = Math.abs(w[o + j]); if (a > m) m = a; }
      var d = m / 127, id = d ? 1 / d : 0; s[b] = d;
      for (j = 0; j < 32; j++) q[o + j] = Math.round(w[o + j] * id);
    }
    return { kind: 'q8', rows: rows, cols: cols, q: q, s: s };
  }
  var SEUIL_F32 = 16 * 1024 * 1024; // en dessous : on garde les nombres flottants (petits modèles, normes, biais)

  function tenseurVersMat(t, u, forceF32) {
    var cols = t.dims[0], rows = t.dims.length > 1 ? t.dims[1] : 1, n = rows * cols, dv = new DataView(u.buffer, u.byteOffset, u.byteLength), T = f16tab();
    if (t.type === 8 && !forceF32) {
      var nb = n / 32, q = new Int8Array(n), s = new Float32Array(nb);
      for (var b = 0; b < nb; b++) { s[b] = T[dv.getUint16(b * 34, true)]; for (var j = 0; j < 32; j++) q[b * 32 + j] = dv.getInt8(b * 34 + 2 + j); }
      return { kind: 'q8', rows: rows, cols: cols, q: q, s: s };
    }
    if (t.type === 2 && !forceF32) {
      var nb4 = n / 32, p = new Uint8Array(n / 2), s4 = new Float32Array(nb4);
      for (var c = 0; c < nb4; c++) { s4[c] = T[dv.getUint16(c * 18, true)]; p.set(u.subarray(c * 18 + 2, c * 18 + 18), c * 16); }
      return { kind: 'q4', rows: rows, cols: cols, p: p, s: s4 };
    }
    var w = dequantiser(t.type, u, n);
    if (forceF32 || n <= SEUIL_F32 || cols % 32) return { kind: 'f32', rows: rows, cols: cols, w: w };
    return quantiserQ8(w, rows, cols);
  }
  function versQ8(m) {
    if (m.kind === 'q8') return m;
    if (m.kind === 'f32') return quantiserQ8(m.w, m.rows, m.cols);
    var q = new Int8Array(m.rows * m.cols), n = m.rows * m.cols / 32;
    for (var b = 0; b < n; b++) for (var j = 0; j < 16; j++) { var by = m.p[b * 16 + j]; q[b * 32 + j] = (by & 15) - 8; q[b * 32 + j + 16] = (by >> 4) - 8; }
    return { kind: 'q8', rows: m.rows, cols: m.cols, q: q, s: m.s };
  }
  function concatMats(liste) {
    var cols = liste[0].cols, rows = 0, kind = liste[0].kind, i;
    liste.forEach(function (m) { if (m.cols !== cols) throw new Error('STAR IA : matrices incompatibles'); rows += m.rows; if (m.kind !== kind) kind = 'mix'; });
    var r = 0, out;
    if (kind === 'mix') { liste = liste.map(function (m) { return m.kind === 'f32' ? m : versQ8(m); }); kind = liste.every(function (m) { return m.kind === 'q8'; }) ? 'q8' : 'f32'; if (kind === 'f32') liste = liste.map(function (m) { return m.kind === 'f32' ? m : { kind: 'f32', rows: m.rows, cols: m.cols, w: ligneVersF32(m) }; }); }
    if (kind === 'f32') { out = { kind: 'f32', rows: rows, cols: cols, w: new Float32Array(rows * cols) }; for (i = 0; i < liste.length; i++) { out.w.set(liste[i].w, r * cols); r += liste[i].rows; } return out; }
    if (kind === 'q8') { out = { kind: 'q8', rows: rows, cols: cols, q: new Int8Array(rows * cols), s: new Float32Array(rows * cols / 32) }; for (i = 0; i < liste.length; i++) { out.q.set(liste[i].q, r * cols); out.s.set(liste[i].s, r * cols / 32); r += liste[i].rows; } return out; }
    out = { kind: 'q4', rows: rows, cols: cols, p: new Uint8Array(rows * cols / 2), s: new Float32Array(rows * cols / 32) };
    for (i = 0; i < liste.length; i++) { out.p.set(liste[i].p, r * cols / 2); out.s.set(liste[i].s, r * cols / 32); r += liste[i].rows; }
    return out;
  }
  function ligneVersF32(m) { var w = new Float32Array(m.rows * m.cols); for (var r = 0; r < m.rows; r++) w.set(ligne(m, r), r * m.cols); return w; }
  // Une rangée du tableau (dé-quantifiée) : sert à choisir le vecteur d'un mot (embedding)
  function ligne(m, r, out) {
    var c = m.cols; out = out || new Float32Array(c);
    if (m.kind === 'f32') { out.set(m.w.subarray(r * c, r * c + c)); return out; }
    var nb = c / 32, b, j, o = r * nb;
    if (m.kind === 'q8') { for (b = 0; b < nb; b++) { var d = m.s[o + b]; for (j = 0; j < 32; j++) out[b * 32 + j] = d * m.q[(o + b) * 32 + j]; } return out; }
    for (b = 0; b < nb; b++) { var d4 = m.s[o + b]; for (j = 0; j < 16; j++) { var by = m.p[(o + b) * 16 + j]; out[b * 32 + j] = d4 * ((by & 15) - 8); out[b * 32 + j + 16] = d4 * ((by >> 4) - 8); } }
    return out;
  }

  // Produit matrice × vecteur sur le processeur : y[r] = somme_j M[r][j] * x[j]
  function matvecCPU(m, x, y, r0, r1) {
    var c = m.cols, nb = c / 32, r, b, j, acc, s;
    r0 = r0 || 0; r1 = r1 === undefined ? m.rows : r1;
    if (m.kind === 'f32') { for (r = r0; r < r1; r++) { s = 0; var o = r * c; for (j = 0; j < c; j++) s += m.w[o + j] * x[j]; y[r] = s; } return y; }
    var q = m.q, p = m.p, sc = m.s;
    for (r = r0; r < r1; r++) {
      acc = 0;
      if (m.kind === 'q8') { for (b = 0; b < nb; b++) { s = 0; var ob = (r * nb + b) * 32, xj = b * 32; for (j = 0; j < 32; j++) s += q[ob + j] * x[xj + j]; acc += s * sc[r * nb + b]; } }
      else { for (b = 0; b < nb; b++) { s = 0; var op = (r * nb + b) * 16, xb = b * 32; for (j = 0; j < 16; j++) { var by = p[op + j]; s += ((by & 15) - 8) * x[xb + j] + ((by >> 4) - 8) * x[xb + j + 16]; } acc += s * sc[r * nb + b]; } }
      y[r] = acc;
    }
    return y;
  }

  // =====================================================================================
  // 3. Produit matrice × vecteur sur le GPU (WebGL2), poids 4 ou 8 bits lus directement dans des textures
  // =====================================================================================
  var VS = '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}';
  var ENTETE = '#version 300 es\nprecision highp float;precision highp int;precision highp sampler2D;precision highp usampler2D;\nuniform usampler2D W;uniform sampler2D S;uniform sampler2D X;uniform int NB;out float o;\n' +
    'float xv(int j){return texelFetch(X,ivec2(j&127,j>>7),0).r;}\n';
  var FS_Q8 = ENTETE + 'void main(){int r=int(gl_FragCoord.x);float sum=0.;for(int b=0;b<NB;b++){float sc=texelFetch(S,ivec2(b,r),0).r;float acc=0.;\n' +
    'for(int t=0;t<8;t++){uint v=texelFetch(W,ivec2(b*8+t,r),0).r;int j=b*32+t*4;\n' +
    'int a0=int(v&255u);a0-=(a0&128)<<1;int a1=int((v>>8u)&255u);a1-=(a1&128)<<1;int a2=int((v>>16u)&255u);a2-=(a2&128)<<1;int a3=int((v>>24u)&255u);a3-=(a3&128)<<1;\n' +
    'acc+=float(a0)*xv(j)+float(a1)*xv(j+1)+float(a2)*xv(j+2)+float(a3)*xv(j+3);}\nsum+=sc*acc;}o=sum;}';
  var FS_Q4 = ENTETE + 'void main(){int r=int(gl_FragCoord.x);float sum=0.;for(int b=0;b<NB;b++){float sc=texelFetch(S,ivec2(b,r),0).r;float acc=0.;\n' +
    'for(int t=0;t<4;t++){uint v=texelFetch(W,ivec2(b*4+t,r),0).r;int j=b*32+t*4;\n' +
    'for(int k=0;k<4;k++){uint by=(v>>(8u*uint(k)))&255u;acc+=float(int(by&15u)-8)*xv(j+k)+float(int(by>>4u)-8)*xv(j+16+k);}}\nsum+=sc*acc;}o=sum;}';
  var LIGNES_PAR_MORCEAU = 4096;

  function creerGPU(gl) {
    var vide = gl.createVertexArray(), progs = {}, xTex = {}, sorties = {};
    function prog(cle, fs) {
      if (progs[cle]) return progs[cle];
      function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error('STAR IA : shader refusé : ' + gl.getShaderInfoLog(o)); return o; }
      var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('STAR IA : ' + gl.getProgramInfoLog(p));
      return (progs[cle] = { p: p, W: gl.getUniformLocation(p, 'W'), S: gl.getUniformLocation(p, 'S'), X: gl.getUniformLocation(p, 'X'), NB: gl.getUniformLocation(p, 'NB') });
    }
    function tex(fmtInt, fmt, type, w, h, data) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage2D(gl.TEXTURE_2D, 0, fmtInt, w, h, 0, fmt, type, data || null); return t;
    }
    function mot32(typed) { return new Uint32Array(typed.buffer, typed.byteOffset, typed.byteLength >> 2); }
    var g = {
      // Envoie une matrice (q8 ou q4) sur le GPU, par morceaux de 4096 rangées
      envoyer: function (m) {
        if (m.kind === 'f32') throw new Error('STAR IA : pas de GPU pour les poids flottants');
        var cols = m.cols, nb = cols / 32, mots = m.kind === 'q8' ? cols / 4 : cols / 8, octRang = m.kind === 'q8' ? cols : cols / 2, morceaux = [];
        for (var r0 = 0; r0 < m.rows; r0 += LIGNES_PAR_MORCEAU) {
          var n = Math.min(LIGNES_PAR_MORCEAU, m.rows - r0), src = m.kind === 'q8' ? m.q : m.p;
          var w = mot32(src.subarray(r0 * octRang, (r0 + n) * octRang)), sc = m.s.subarray(r0 * nb, (r0 + n) * nb);
          var wt = tex(gl.R32UI, gl.RED_INTEGER, gl.UNSIGNED_INT, mots, n, w), st = tex(gl.R32F, gl.RED, gl.FLOAT, nb, n, sc);
          morceaux.push({ wt: wt, st: st, n: n });
        }
        return { kind: m.kind, rows: m.rows, cols: cols, nb: nb, morceaux: morceaux };
      },
      liberer: function (h) { h.morceaux.forEach(function (c) { gl.deleteTexture(c.wt); gl.deleteTexture(c.st); }); },
      produit: function (h, x, y) {
        var cols = h.cols, ch = Math.ceil(cols / 128), xt = xTex[cols];
        if (!xt) { xt = xTex[cols] = tex(gl.R32F, gl.RED, gl.FLOAT, 128, ch, null); }
        var xb = new Float32Array(128 * ch); xb.set(x.length > cols ? x.subarray(0, cols) : x);
        gl.bindTexture(gl.TEXTURE_2D, xt); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 128, ch, gl.RED, gl.FLOAT, xb);
        var W = Math.min(h.rows, LIGNES_PAR_MORCEAU), H = h.morceaux.length, cle = W + 'x' + H, so = sorties[cle];
        if (!so) { var t = tex(gl.R32F, gl.RED, gl.FLOAT, W, H, null), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('STAR IA : cible flottante refusée'); so = sorties[cle] = { t: t, f: f, W: W, H: H }; }
        var pr = prog(h.kind, h.kind === 'q8' ? FS_Q8 : FS_Q4);
        gl.useProgram(pr.p); gl.bindFramebuffer(gl.FRAMEBUFFER, so.f); gl.disable(gl.BLEND); gl.bindVertexArray(vide);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, xt); gl.uniform1i(pr.X, 2); gl.uniform1i(pr.NB, h.nb); gl.uniform1i(pr.W, 0); gl.uniform1i(pr.S, 1);
        for (var i = 0; i < H; i++) {
          var c = h.morceaux[i]; gl.viewport(0, i, c.n, 1);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, c.wt); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, c.st);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        var lu = new Float32Array(W * H); gl.readPixels(0, 0, W, H, gl.RED, gl.FLOAT, lu);
        if (gl.getError() !== gl.NO_ERROR) throw new Error('STAR IA : lecture GPU impossible');
        for (var k = 0; k < H; k++) { var n = h.morceaux[k].n; y.set(lu.subarray(k * W, k * W + n), k * LIGNES_PAR_MORCEAU); }
        return y;
      }
    };
    return g;
  }

  // Auto-test : le GPU de l'appareil doit donner le même résultat que le processeur, sinon on n'utilise pas le GPU
  function autoTestGPU(g) {
    var rng = 12345; function al() { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff - 0.5; }
    var rapport = { q8: null, q4: null, q8Gros: null, q4Gros: null };
    [['q8', 4864, 300], ['q4', 896, 530], ['q8', 64, 4200], ['q4', 64, 4200]].forEach(function (cas, ci) {
      var kind = cas[0], cols = cas[1], rows = cas[2], n = rows * cols, w = new Float32Array(n); for (var i = 0; i < n; i++) w[i] = al() * 0.2;
      var m = quantiserQ8(w, rows, cols);
      if (kind === 'q4') { // fabrique une matrice 4 bits
        var p = new Uint8Array(n / 2), s = new Float32Array(n / 32);
        for (var b = 0; b < n / 32; b++) { var mx = 0; for (var j = 0; j < 32; j++) mx = Math.max(mx, Math.abs(w[b * 32 + j])); var d = mx / 7 || 1e-6; s[b] = d; for (var jj = 0; jj < 16; jj++) { var lo = Math.max(0, Math.min(15, Math.round(w[b * 32 + jj] / d) + 8)), hi = Math.max(0, Math.min(15, Math.round(w[b * 32 + jj + 16] / d) + 8)); p[b * 16 + jj] = lo | (hi << 4); } }
        m = { kind: 'q4', rows: rows, cols: cols, p: p, s: s };
      }
      var x = new Float32Array(cols); for (var k = 0; k < cols; k++) x[k] = al() * 2;
      var ref = new Float32Array(rows); matvecCPU(m, x, ref);
      var h = g.envoyer(m), y = new Float32Array(rows); g.produit(h, x, y); g.liberer(h);
      var e = 0, mxv = 0; for (var r = 0; r < rows; r++) { e = Math.max(e, Math.abs(y[r] - ref[r])); mxv = Math.max(mxv, Math.abs(ref[r])); }
      var ok1 = e <= 2e-3 * Math.max(1, mxv); rapport[kind + (ci > 1 ? 'Gros' : '')] = { ecart: e, max: mxv, ok: ok1 };
    });
    rapport.ok = rapport.q8.ok && rapport.q4.ok && rapport.q8Gros.ok && rapport.q4Gros.ok; return rapport;
  }

  // =====================================================================================
  // 4. Mots : tokenizer BPE sur octets (Qwen2)
  // =====================================================================================
  var PRE_QWEN2 = /(?:'[sS]|'[tT]|'[rR][eE]|'[vV][eE]|'[mM]|'[lL][lL]|'[dD])|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
  function octetsVersUnicode() {
    var bs = [], cs = [], n = 0, b;
    for (b = 33; b < 127; b++) bs.push(b); for (b = 161; b < 173; b++) bs.push(b); for (b = 174; b < 256; b++) bs.push(b);
    cs = bs.slice(); var tab = {};
    for (b = 0; b < 256; b++) if (bs.indexOf(b) < 0) { bs.push(b); cs.push(256 + n); n++; }
    for (var i = 0; i < bs.length; i++) tab[bs[i]] = String.fromCharCode(cs[i]);
    return tab;
  }
  function creerTokenizer(kv) {
    var tokens = kv['tokenizer.ggml.tokens'], types = kv['tokenizer.ggml.token_type'] || [], merges = kv['tokenizer.ggml.merges'] || [];
    if (!tokens) throw new Error('Ce fichier ne contient pas de vocabulaire.');
    var modele = kv['tokenizer.ggml.model'];
    if (modele && modele !== 'gpt2') throw new Error('Tokenizer « ' + modele + ' » non pris en charge (modèles type Qwen2 / GPT-2 seulement).');
    var id = new Map(), rang = new Map(), B2U = octetsVersUnicode(), U2B = {}, i;
    for (var k in B2U) U2B[B2U[k]] = +k;
    for (i = 0; i < tokens.length; i++) id.set(tokens[i], i);
    for (i = 0; i < merges.length; i++) rang.set(merges[i], i);
    var speciaux = []; for (i = 0; i < tokens.length; i++) if (types[i] === 3 || types[i] === 4) speciaux.push({ s: tokens[i], id: i });
    speciaux.sort(function (a, b) { return b.s.length - a.s.length; });
    var cache = new Map(), enc = new TextEncoder();
    function bpe(mot) {
      if (cache.has(mot)) return cache.get(mot);
      var parts = Array.from(mot);
      while (parts.length > 1) {
        var meilleur = -1, rg = Infinity;
        for (var j = 0; j < parts.length - 1; j++) { var r = rang.get(parts[j] + ' ' + parts[j + 1]); if (r !== undefined && r < rg) { rg = r; meilleur = j; } }
        if (meilleur < 0) break;
        parts.splice(meilleur, 2, parts[meilleur] + parts[meilleur + 1]);
      }
      var ids = parts.map(function (p) { var v = id.get(p); if (v === undefined) throw new Error('mot inconnu ' + p); return v; });
      cache.set(mot, ids); return ids;
    }
    function encoderTexte(t) {
      var out = [], m; PRE_QWEN2.lastIndex = 0; var re = new RegExp(PRE_QWEN2.source, 'gu');
      while ((m = re.exec(t)) !== null) {
        if (m[0] === '') { re.lastIndex++; continue; }
        var bytes = enc.encode(m[0]), s = ''; for (var j = 0; j < bytes.length; j++) s += B2U[bytes[j]];
        Array.prototype.push.apply(out, bpe(s));
      }
      return out;
    }
    return {
      taille: tokens.length, speciaux: speciaux,
      id: function (s) { return id.get(s); },
      encoder: function (texte, avecSpeciaux) {
        if (avecSpeciaux === false || !speciaux.length) return encoderTexte(texte);
        var out = [], reste = texte;
        while (reste.length) {
          var pos = -1, sp = null;
          for (var q = 0; q < speciaux.length; q++) { var p = reste.indexOf(speciaux[q].s); if (p >= 0 && (pos < 0 || p < pos || (p === pos && speciaux[q].s.length > sp.s.length))) { pos = p; sp = speciaux[q]; } }
          if (pos < 0) { Array.prototype.push.apply(out, encoderTexte(reste)); break; }
          if (pos > 0) Array.prototype.push.apply(out, encoderTexte(reste.slice(0, pos)));
          out.push(sp.id); reste = reste.slice(pos + sp.s.length);
        }
        return out;
      },
      // Décodeur « au fil de l'eau » : renvoie le texte nouveau à chaque mot (gère les caractères coupés en plusieurs mots)
      decodeur: function () {
        var dec = new TextDecoder('utf-8'), brut = [];
        return { ajouter: function (tid) {
          var s = tokens[tid]; if (s === undefined || types[tid] === 3) return '';
          var bytes = []; for (var c of s) { var b = U2B[c]; if (b === undefined) { bytes.push.apply(bytes, Array.from(enc.encode(c))); } else bytes.push(b); }
          return dec.decode(new Uint8Array(bytes), { stream: true });
        } };
      },
      decoder: function (ids) { var d = this.decodeur(), s = ''; ids.forEach(function (t) { s += d.ajouter(t); }); return s; }
    };
  }

  // =====================================================================================
  // 5. Le modèle (architecture Qwen2 : RMSNorm, attention avec RoPE et groupes de clés, SwiGLU)
  // =====================================================================================
  function rmsnorm(x, w, eps, out) {
    var n = x.length, s = 0, i; for (i = 0; i < n; i++) s += x[i] * x[i];
    var k = 1 / Math.sqrt(s / n + eps); for (i = 0; i < n; i++) out[i] = x[i] * k * w[i]; return out;
  }
  function vecteur(m) { return m.kind === 'f32' ? m.w : ligne(m, 0); }

  // =====================================================================================
  // 5b. Calcul « tout sur le GPU » : toutes les opérations d'un mot (normalisation, RoPE, attention, SwiGLU, produits)
  //     s'enchaînent sur le GPU, sans aller-retour avec le processeur. Une seule lecture à la fin de chaque mot.
  //     Les vecteurs sont rangés dans des textures de 128 colonnes : l'élément j est en (j % 128, j / 128).
  // =====================================================================================
  var ENT = '#version 300 es\nprecision highp float;precision highp int;precision highp sampler2D;precision highp usampler2D;\n' +
    'float Vv(sampler2D t,int j){return texelFetch(t,ivec2(j&127,j>>7),0).r;}\nint IDX(){return int(gl_FragCoord.y)*128+int(gl_FragCoord.x);}\nout float o;\n';
  var P4 = 'vec4 P4(sampler2D t,int k){return texelFetch(t,ivec2(k&31,k>>5),0);}\n';
  var ENT4 = ENT.replace('out float o;', 'out vec4 o;').replace('int IDX()', 'int IDX4()').replace('int IDX4(){return int(gl_FragCoord.y)*128+int(gl_FragCoord.x);}', 'int IDX4(){return (int(gl_FragCoord.y)*32+int(gl_FragCoord.x))*4;}');
  var MV = 'uniform usampler2D W;uniform sampler2D S;uniform sampler2D X;uniform sampler2D A;uniform int NB;uniform int R0;uniform int NR;uniform int NC;uniform int HA;\n' +
    'void main(){int r=IDX();int rr=r-R0;if(r>=NR||rr<0||rr>=NC){o=0.;return;}float sum=0.;for(int b=0;b<NB;b++){float sc=texelFetch(S,ivec2(b,rr),0).r;float acc=0.;\n';
  var FS_MV8 = ENT + P4 + MV + 'for(int t=0;t<8;t++){uint v=texelFetch(W,ivec2(b*8+t,rr),0).r;vec4 xv=P4(X,b*8+t);\n' +
    'int a0=int(v&255u);a0-=(a0&128)<<1;int a1=int((v>>8u)&255u);a1-=(a1&128)<<1;int a2=int((v>>16u)&255u);a2-=(a2&128)<<1;int a3=int((v>>24u)&255u);a3-=(a3&128)<<1;\n' +
    'acc+=float(a0)*xv.x+float(a1)*xv.y+float(a2)*xv.z+float(a3)*xv.w;}\nsum+=sc*acc;}if(HA==1)sum+=Vv(A,r);o=sum;}';
  var FS_MV4 = ENT + P4 + MV + 'for(int t=0;t<4;t++){uint v=texelFetch(W,ivec2(b*4+t,rr),0).r;vec4 xl=P4(X,b*8+t),xh=P4(X,b*8+4+t);\n' +
    'int l0=int(v&15u)-8,h0=int((v>>4u)&15u)-8,l1=int((v>>8u)&15u)-8,h1=int((v>>12u)&15u)-8,l2=int((v>>16u)&15u)-8,h2=int((v>>20u)&15u)-8,l3=int((v>>24u)&15u)-8,h3=int((v>>28u)&15u)-8;\n' +
    'acc+=float(l0)*xl.x+float(l1)*xl.y+float(l2)*xl.z+float(l3)*xl.w+float(h0)*xh.x+float(h1)*xh.y+float(h2)*xh.z+float(h3)*xh.w;}\nsum+=sc*acc;}if(HA==1)sum+=Vv(A,r);o=sum;}';
  var FS_RMS = ENT4 + 'uniform sampler2D X;uniform sampler2D Wn;uniform int N;uniform float EPS;void main(){int e=IDX4();if(e>=N){o=vec4(0.);return;}float s=0.;for(int i=0;i<N;i++){float v=Vv(X,i);s+=v*v;}float k=inversesqrt(s/float(N)+EPS);\n' +
    'o=vec4(Vv(X,e)*k*Vv(Wn,e),e+1<N?Vv(X,e+1)*k*Vv(Wn,e+1):0.,e+2<N?Vv(X,e+2)*k*Vv(Wn,e+2):0.,e+3<N?Vv(X,e+3)*k*Vv(Wn,e+3):0.);}';
  var ROPE = 'uniform sampler2D QKV;uniform sampler2D ROT;uniform int OFF;uniform int HD;uniform int NQ;\n' +
    'float rope(int e){int i=e%HD;int HALF=HD/2;if(i<HALF){float a=Vv(QKV,OFF+e),b=Vv(QKV,OFF+e+HALF);return a*Vv(ROT,i)-b*Vv(ROT,HALF+i);}int ii=i-HALF;float a=Vv(QKV,OFF+e-HALF),b=Vv(QKV,OFF+e);return b*Vv(ROT,ii)+a*Vv(ROT,HALF+ii);}\n';
  var FS_ROPEQ = ENT + ROPE + 'void main(){int j=IDX();if(j>=NQ){o=0.;return;}o=rope(j);}';
  var FS_KW = ENT + ROPE + 'void main(){o=rope(int(gl_FragCoord.x));}';
  var FS_VW = ENT + ROPE + 'void main(){o=Vv(QKV,OFF+int(gl_FragCoord.x));}';
  var FS_SCORES = ENT + 'uniform sampler2D Q;uniform sampler2D K;uniform int HD;uniform int REP;uniform float SC;void main(){int t=int(gl_FragCoord.x),h=int(gl_FragCoord.y);int kvh=h/REP;float s=0.;for(int i=0;i<HD;i++)s+=Vv(Q,h*HD+i)*texelFetch(K,ivec2(kvh*HD+i,t),0).r;o=s*SC;}';
  var FS_STATS = ENT + 'uniform sampler2D S;uniform int NP;void main(){int x=int(gl_FragCoord.x),h=int(gl_FragCoord.y);float m=-3.4e38;for(int t=0;t<NP;t++)m=max(m,texelFetch(S,ivec2(t,h),0).r);if(x==0){o=m;return;}float s=0.;for(int t=0;t<NP;t++)s+=exp(texelFetch(S,ivec2(t,h),0).r-m);o=s;}';
  var FS_ATT = ENT4 + 'uniform sampler2D S;uniform sampler2D ST;uniform sampler2D Vc;uniform int NP;uniform int HD;uniform int REP;uniform int QD;\n' +
    'void main(){int j=IDX4();if(j>=QD){o=vec4(0.);return;}int h=j/HD,d=j%HD,kvh=h/REP;float m=texelFetch(ST,ivec2(0,h),0).r,sm=texelFetch(ST,ivec2(1,h),0).r;vec4 acc=vec4(0.);int c=kvh*HD+d;\n' +
    'for(int t=0;t<NP;t++){float p=exp(texelFetch(S,ivec2(t,h),0).r-m);acc+=p*vec4(texelFetch(Vc,ivec2(c,t),0).r,texelFetch(Vc,ivec2(c+1,t),0).r,texelFetch(Vc,ivec2(c+2,t),0).r,texelFetch(Vc,ivec2(c+3,t),0).r);}o=acc/sm;}';
  var FS_SWIGLU = ENT4 + 'uniform sampler2D G;uniform int FF;float sw(int j){if(j>=FF)return 0.;float g=Vv(G,j);return g/(1.+exp(-g))*Vv(G,FF+j);}void main(){int e=IDX4();o=vec4(sw(e),sw(e+1),sw(e+2),sw(e+3));}';

  function creerPipeline(gl, cfg, couches, norme, sortieH) {
    var progs = {}, vide = gl.createVertexArray(), D = cfg.dim, QD = cfg.q, KVD = cfg.kvd, HD = cfg.hd, H = cfg.tetes, REP = cfg.tetes / cfg.tetesKV, CTX = cfg.ctx;
    function prog(cle, fs) {
      if (progs[cle]) return progs[cle];
      function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error('STAR IA : shader refusé (' + cle + ') : ' + gl.getShaderInfoLog(o)); return o; }
      var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('STAR IA : ' + gl.getProgramInfoLog(p));
      var u = {}, nb = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (var k = 0; k < nb; k++) { var nm = gl.getActiveUniform(p, k).name; u[nm] = gl.getUniformLocation(p, nm); }
      return (progs[cle] = { p: p, u: u });
    }
    function tex(w, h) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, null); return t;
    }
    function cible(w, h) {
      var t = tex(w, h), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('STAR IA : cible flottante refusée');
      return { t: t, f: f, w: w, h: h };
    }
    function vec(n) { var h = Math.max(1, Math.ceil(n / 128)), c = cible(128, h); c.n = n; return c; }
    // vecteur rangé par groupes de 4 (RGBA32F, 32 groupes par ligne) : sert d'entrée aux produits, 4 fois moins de lectures
    function vec4(n) {
      var h = Math.max(1, Math.ceil(n / 128)), t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 32, h, 0, gl.RGBA, gl.FLOAT, null);
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('STAR IA : cible RGBA flottante refusée');
      return { t: t, f: f, w: 32, h: h, n: n };
    }
    function remplirVec(v, arr) { var b = new Float32Array(128 * v.h); b.set(arr.length > v.n ? arr.subarray(0, v.n) : arr); gl.bindTexture(gl.TEXTURE_2D, v.t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 128, v.h, gl.RED, gl.FLOAT, b); }
    function passe(pr, cb, vx, vy, vw, vh, texs, ints, flottants) {
      gl.useProgram(pr.p); gl.bindFramebuffer(gl.FRAMEBUFFER, cb.f); gl.viewport(vx, vy, vw, vh);
      var u = 0; for (var nom in texs) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, texs[nom]); gl.uniform1i(pr.u[nom] || null, u); u++; }
      for (var k in ints) gl.uniform1i(pr.u[k] || null, ints[k]); for (var k2 in flottants) gl.uniform1f(pr.u[k2] || null, flottants[k2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindVertexArray(vide); gl.disable(gl.BLEND);
    var pMV = { q8: prog('mv8', FS_MV8), q4: prog('mv4', FS_MV4) }, pRMS = prog('rms', FS_RMS), pRQ = prog('ropeq', FS_ROPEQ), pKW = prog('kw', FS_KW), pVW = prog('vw', FS_VW),
      pSC = prog('scores', FS_SCORES), pST = prog('stats', FS_STATS), pAT = prog('att', FS_ATT), pSW = prog('swiglu', FS_SWIGLU);
    function mv(h, x, out, ajout) {
      var pr = pMV[h.kind];
      for (var i = 0; i < h.morceaux.length; i++) { var c = h.morceaux[i], vy = i * 32, vh = Math.min(32, out.h - vy);
        passe(pr, out, 0, vy, 128, vh, { W: c.wt, S: c.st, X: x.t, A: (ajout || x).t }, { NB: h.nb, R0: i * LIGNES_PAR_MORCEAU, NR: h.rows, NC: c.n, HA: ajout ? 1 : 0 }, {}); }
    }
    function rms(x, wn, out) { passe(pRMS, out, 0, 0, 32, out.h, { X: x.t, Wn: wn.t }, { N: D }, { EPS: cfg.eps }); }
    // vecteurs de travail
    var Xa = vec(D), Xb = vec(D), H1 = vec4(D), QKV = vec(QD + 2 * KVD), QR = vec(QD), ATT = vec4(QD), GU = vec(2 * cfg.ffn), ACT = vec4(cfg.ffn), ROT = vec(HD), LOG = vec(cfg.vocab);
    var S = cible(CTX, H), ST = cible(2, H), NF = vec(D); remplirVec(NF, vecteur(norme));
    var cK = [], cV = [], poids = [];
    for (var l = 0; l < cfg.couches; l++) {
      var L = couches[l], an = vec(D), fn = vec(D), bs = null; remplirVec(an, L.an); remplirVec(fn, L.fn); if (L.biais) { bs = vec(QD + 2 * KVD); remplirVec(bs, L.biais); }
      poids.push({ an: an, fn: fn, bs: bs, h: L.h }); cK.push(cible(KVD, CTX)); cV.push(cible(KVD, CTX));
    }
    var rotBuf = new Float32Array(HD), invFreq = new Float32Array(HD / 2); for (var f = 0; f < HD / 2; f++) invFreq[f] = Math.pow(cfg.base, -2 * f / HD);
    var logitsBuf = new Float32Array(128 * LOG.h);
    return {
      // Un mot : met le vecteur du mot en entrée, enchaîne les couches sur le GPU, lit les scores seulement si demandé
      avancer: function (xEmbed, pos, voulLogits) {
        remplirVec(Xa, xEmbed);
        for (var f2 = 0; f2 < HD / 2; f2++) { var ang = pos * invFreq[f2]; rotBuf[f2] = Math.cos(ang); rotBuf[HD / 2 + f2] = Math.sin(ang); } remplirVec(ROT, rotBuf);
        var np = pos + 1, cur = Xa, nxt = Xb;
        for (var l2 = 0; l2 < poids.length; l2++) {
          var P = poids[l2];
          rms(cur, P.an, H1);
          mv(P.h.qkv, H1, QKV, P.bs);
          passe(pRQ, QR, 0, 0, 128, QR.h, { QKV: QKV.t, ROT: ROT.t }, { OFF: 0, HD: HD, NQ: QD }, {});
          passe(pKW, cK[l2], 0, pos, KVD, 1, { QKV: QKV.t, ROT: ROT.t }, { OFF: QD, HD: HD, NQ: 0 }, {});
          passe(pVW, cV[l2], 0, pos, KVD, 1, { QKV: QKV.t, ROT: ROT.t }, { OFF: QD + KVD, HD: HD, NQ: 0 }, {});
          passe(pSC, S, 0, 0, np, H, { Q: QR.t, K: cK[l2].t }, { HD: HD, REP: REP }, { SC: 1 / Math.sqrt(HD) });
          passe(pST, ST, 0, 0, 2, H, { S: S.t }, { NP: np }, {});
          passe(pAT, ATT, 0, 0, 32, ATT.h, { S: S.t, ST: ST.t, Vc: cV[l2].t }, { NP: np, HD: HD, REP: REP, QD: QD }, {});
          mv(P.h.o, ATT, nxt, cur);
          rms(nxt, P.fn, H1);
          mv(P.h.gu, H1, GU, null);
          passe(pSW, ACT, 0, 0, 32, ACT.h, { G: GU.t }, { FF: cfg.ffn }, {});
          mv(P.h.d, ACT, cur, nxt);
        }
        if (!voulLogits) { gl.flush(); return null; }
        rms(cur, NF, H1); mv(sortieH, H1, LOG, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, LOG.f); gl.readPixels(0, 0, 128, LOG.h, gl.RED, gl.FLOAT, logitsBuf);
        if (gl.getError() !== gl.NO_ERROR) throw new Error('STAR IA : lecture GPU impossible');
        return logitsBuf.subarray(0, cfg.vocab);
      }
    };
  }

  async function charger(src, options) {
    options = options || {};
    var prog = options.progression || function () {}, g = await ouvrirGGUF(src), kv = g.kv, arch = kv['general.architecture'];
    if (arch !== 'qwen2') throw new Error('Ce modèle (architecture « ' + arch + ' ») n\'est pas pris en charge pour l\'instant : STAR IA lit les modèles Qwen2 et Qwen2.5 (fichiers .gguf).');
    var pre = kv['tokenizer.ggml.pre']; if (pre && pre !== 'qwen2') throw new Error('Découpage de texte « ' + pre + ' » non pris en charge : seuls les modèles Qwen2 / Qwen2.5 le sont pour l\'instant.');
    var P = arch + '.', cfg = {
      arch: arch, couches: kv[P + 'block_count'], dim: kv[P + 'embedding_length'], ffn: kv[P + 'feed_forward_length'], tetes: kv[P + 'attention.head_count'],
      tetesKV: kv[P + 'attention.head_count_kv'] || kv[P + 'attention.head_count'], eps: kv[P + 'attention.layer_norm_rms_epsilon'] || 1e-6, base: kv[P + 'rope.freq_base'] || 10000,
      ctx: Math.min(kv[P + 'context_length'] || 2048, options.contexteMax || 2048), nom: kv['general.name'] || ''
    };
    cfg.hd = kv[P + 'attention.key_length'] || (cfg.dim / cfg.tetes); cfg.q = cfg.tetes * cfg.hd; cfg.kvd = cfg.tetesKV * cfg.hd;
    var tok = creerTokenizer(kv), gpuInfo = { utilise: false, raison: 'pas de GPU demandé' }, gpuApi = null, gl = options.gpu && options.gpu.gl ? options.gpu.gl : null;
    if (gl && options.gpu.info && options.gpu.info.calculFlottant && options.gpu.info.precisionOk !== false && options.utiliserGPU !== false) {
      try { gpuApi = creerGPU(gl); var rap = autoTestGPU(gpuApi); gpuInfo = { utilise: rap.ok, test: rap, raison: rap.ok ? 'auto-test réussi' : 'le GPU de cet appareil ne donne pas des résultats exacts : processeur utilisé' }; if (!rap.ok) gpuApi = null; }
      catch (e) { gpuApi = null; gpuInfo = { utilise: false, raison: 'GPU non utilisable : ' + e.message }; }
    } else if (options.gpu) gpuInfo.raison = 'GPU sans calcul flottant ou précision insuffisante';

    var total = g.tensors.length, fait = 0, M = {};
    async function prendre(nom, forceF32, requis) {
      var t = g.parNom[nom]; if (!t) { if (requis === false) return null; throw new Error('Poids manquant dans le fichier : ' + nom); }
      var u = await lireTenseur(g, t), m = tenseurVersMat(t, u, forceF32); fait++; prog(fait / total, nom); return m;
    }
    function versGPU(m) { return gpuApi && m.kind !== 'f32' ? gpuApi.envoyer(m) : null; }
    var embed = await prendre('token_embd.weight'), sortie = await prendre('output.weight', false, false), couches = [];
    var norme = await prendre('output_norm.weight', true);
    cfg.vocab = embed.rows;
    var wSortie = sortie || embed, sortieH = null;
    if (wSortie.kind === 'f32' && wSortie.rows * wSortie.cols > SEUIL_F32) wSortie = quantiserQ8(wSortie.w, wSortie.rows, wSortie.cols);
    sortieH = versGPU(wSortie);
    for (var l = 0; l < cfg.couches; l++) {
      var p = 'blk.' + l + '.', L = {};
      L.an = vecteur(await prendre(p + 'attn_norm.weight', true)); L.fn = vecteur(await prendre(p + 'ffn_norm.weight', true));
      var q = await prendre(p + 'attn_q.weight'), k = await prendre(p + 'attn_k.weight'), v = await prendre(p + 'attn_v.weight');
      L.qkv = concatMats([q, k, v]); q = k = v = null;
      var bq = await prendre(p + 'attn_q.bias', true, false), bk = await prendre(p + 'attn_k.bias', true, false), bv = await prendre(p + 'attn_v.bias', true, false);
      L.biais = bq ? (function (a, b2, c) { var o = new Float32Array(a.length + b2.length + c.length); o.set(a, 0); o.set(b2, a.length); o.set(c, a.length + b2.length); return o; })(vecteur(bq), vecteur(bk), vecteur(bv)) : null;
      L.o = await prendre(p + 'attn_output.weight');
      var gate = await prendre(p + 'ffn_gate.weight'), up = await prendre(p + 'ffn_up.weight'); L.gu = concatMats([gate, up]); gate = up = null;
      L.d = await prendre(p + 'ffn_down.weight');
      L.h = { qkv: versGPU(L.qkv), o: versGPU(L.o), gu: versGPU(L.gu), d: versGPU(L.d) };
      if (gpuApi) { ['qkv', 'o', 'gu', 'd'].forEach(function (n) { if (L.h[n]) { if (n === 'qkv') L.qkv = { kind: 'gpu', rows: L.qkv.rows, cols: L.qkv.cols }; else if (n === 'o') L.o = { kind: 'gpu', rows: L.o.rows, cols: L.o.cols }; else if (n === 'gu') L.gu = { kind: 'gpu', rows: L.gu.rows, cols: L.gu.cols }; else L.d = { kind: 'gpu', rows: L.d.rows, cols: L.d.cols }; } }); }
      couches.push(L); prog(Math.min(0.99, fait / total), 'couche ' + (l + 1) + '/' + cfg.couches);
    }
    if (sortieH && wSortie !== embed) { /* la matrice de sortie est distincte : rien à garder */ }
    var sortieCPU = sortieH ? null : wSortie;
    if (sortieH && !sortie) { /* l'embedding sert encore à lire les mots : on le garde sur le processeur */ }

    // ---- état de la conversation (cache des clés/valeurs) ----
    var hd = cfg.hd, kvd = cfg.kvd, cacheK = [], cacheV = [];
    function viderCache() { cacheK = []; cacheV = []; for (var i = 0; i < cfg.couches; i++) { cacheK.push(new Float32Array(cfg.ctx * kvd)); cacheV.push(new Float32Array(cfg.ctx * kvd)); } }
    function libererCache() { cacheK = []; cacheV = []; }
    var pipe = null;   // calcul « tout sur le GPU » (voir creerPipeline) ; null = on garde le mode GPU + processeur
    var pos = 0, tampon = { x: new Float32Array(cfg.dim), h: new Float32Array(cfg.dim), att: new Float32Array(cfg.q), sc: new Float32Array(cfg.ctx) };
    var invFreq = new Float32Array(hd / 2); for (var f = 0; f < hd / 2; f++) invFreq[f] = Math.pow(cfg.base, -2 * f / hd);
    function produit(L, nom, h, x, y) {
      var hh = L.h && L.h[nom];
      if (hh) return gpuApi.produit(hh, x, y);
      return matvecCPU(L[nom], x, y);
    }
    var statsGPU = { appels: 0 };

    function avancer(token, voulLogits) {
      if (pos >= cfg.ctx) throw new Error('STAR IA : conversation trop longue pour la mémoire du modèle (' + cfg.ctx + ' mots).');
      if (pipe) { ligne(embed, token, tampon.x); var r = pipe.avancer(tampon.x, pos, voulLogits); pos++; return r; }
      return avancerHybride(token, voulLogits);
    }
    function avancerHybride(token, voulLogits) {
      if (!cacheK.length) viderCache();
      var D = cfg.dim, x = tampon.x, h = tampon.h; ligne(embed, token, x);
      var qkvN = cfg.q + 2 * kvd, qkv = new Float32Array(qkvN + 8), att = tampon.att, rep = cfg.tetes / cfg.tetesKV, echelle = 1 / Math.sqrt(hd), sc = tampon.sc, nPos = pos + 1;
      var o = new Float32Array(D + 8), gu = new Float32Array(2 * cfg.ffn + 8), dd = new Float32Array(D + 8), act = new Float32Array(cfg.ffn);
      for (var l = 0; l < cfg.couches; l++) {
        var L = couches[l];
        rmsnorm(x, L.an, cfg.eps, h);
        produit(L, 'qkv', null, h, qkv); if (L.biais) for (var i = 0; i < qkvN; i++) qkv[i] += L.biais[i];
        // RoPE (paires (i, i + hd/2), comme Qwen2 / NeoX) sur les têtes de q et de k
        var cs = new Float32Array(hd / 2), sn = new Float32Array(hd / 2);
        for (var f2 = 0; f2 < hd / 2; f2++) { var ang = pos * invFreq[f2]; cs[f2] = Math.cos(ang); sn[f2] = Math.sin(ang); }
        function tourner(off, nt) { for (var t = 0; t < nt; t++) { var b0 = off + t * hd; for (var j = 0; j < hd / 2; j++) { var a = qkv[b0 + j], b = qkv[b0 + j + hd / 2]; qkv[b0 + j] = a * cs[j] - b * sn[j]; qkv[b0 + j + hd / 2] = b * cs[j] + a * sn[j]; } } }
        tourner(0, cfg.tetes); tourner(cfg.q, cfg.tetesKV);
        cacheK[l].set(qkv.subarray(cfg.q, cfg.q + kvd), pos * kvd); cacheV[l].set(qkv.subarray(cfg.q + kvd, cfg.q + 2 * kvd), pos * kvd);
        var K = cacheK[l], V = cacheV[l];
        for (var th = 0; th < cfg.tetes; th++) {
          var kvh = (th / rep) | 0, qo = th * hd, mx = -Infinity, t, j2;
          for (t = 0; t < nPos; t++) { var s = 0, ko = t * kvd + kvh * hd; for (j2 = 0; j2 < hd; j2++) s += qkv[qo + j2] * K[ko + j2]; s *= echelle; sc[t] = s; if (s > mx) mx = s; }
          var somme = 0; for (t = 0; t < nPos; t++) { sc[t] = Math.exp(sc[t] - mx); somme += sc[t]; }
          var inv = 1 / somme; for (j2 = 0; j2 < hd; j2++) att[qo + j2] = 0;
          for (t = 0; t < nPos; t++) { var pw = sc[t] * inv, vo = t * kvd + kvh * hd; for (j2 = 0; j2 < hd; j2++) att[qo + j2] += pw * V[vo + j2]; }
        }
        produit(L, 'o', null, att, o); for (var i2 = 0; i2 < D; i2++) x[i2] += o[i2];
        rmsnorm(x, L.fn, cfg.eps, h);
        produit(L, 'gu', null, h, gu);
        for (var i3 = 0; i3 < cfg.ffn; i3++) { var gt = gu[i3]; act[i3] = gt / (1 + Math.exp(-gt)) * gu[cfg.ffn + i3]; }
        produit(L, 'd', null, act, dd); for (var i4 = 0; i4 < D; i4++) x[i4] += dd[i4];
      }
      pos++;
      if (!voulLogits) return null;
      rmsnorm(x, norme.kind === 'f32' ? norme.w : ligne(norme, 0), cfg.eps, h);
      var logits = new Float32Array(cfg.vocab + 8);
      if (sortieH) gpuApi.produit(sortieH, h, logits); else matvecCPU(sortieCPU, h, logits);
      return logits.subarray(0, cfg.vocab);
    }

    function echantillonner(logits, o, historique) {
      var temp = o.temperature === undefined ? 0.7 : o.temperature, n = logits.length, i;
      var rp = o.repetition === undefined ? 1.1 : o.repetition;
      if (rp !== 1 && historique.length) { var vus = new Set(historique.slice(-64)); vus.forEach(function (t) { if (t < n) logits[t] = logits[t] > 0 ? logits[t] / rp : logits[t] * rp; }); }
      if (temp <= 0) { var bi = 0, bv = -Infinity; for (i = 0; i < n; i++) if (logits[i] > bv) { bv = logits[i]; bi = i; } return bi; }
      var topK = o.topK || 40, topP = o.topP || 0.9, idx = Array.from({ length: n }, function (_, j) { return j; });
      // sélection partielle des topK
      var cand = []; var seuil = -Infinity;
      for (i = 0; i < n; i++) { var v = logits[i]; if (cand.length < topK || v > seuil) { cand.push(i); if (cand.length > topK * 2) { cand.sort(function (a, b) { return logits[b] - logits[a]; }); cand.length = topK; seuil = logits[cand[topK - 1]]; } } }
      cand.sort(function (a, b) { return logits[b] - logits[a]; }); cand.length = Math.min(cand.length, topK);
      var m0 = logits[cand[0]], pr = cand.map(function (j) { return Math.exp((logits[j] - m0) / temp); }), s = pr.reduce(function (a, b) { return a + b; }, 0);
      pr = pr.map(function (p) { return p / s; });
      var cum = 0, garde = 0; for (i = 0; i < pr.length; i++) { cum += pr[i]; garde = i + 1; if (cum >= topP) break; }
      var s2 = 0; for (i = 0; i < garde; i++) s2 += pr[i]; var r = (o.aleatoire ? o.aleatoire() : Math.random()) * s2, acc = 0;
      for (i = 0; i < garde; i++) { acc += pr[i]; if (r <= acc) return cand[i]; }
      return cand[garde - 1];
    }

    // ---- Calcul « tout sur le GPU » : utilisé seulement s'il redonne les mêmes scores que le mode GPU + processeur ----
    gpuInfo.mode = gpuApi ? 'GPU + processeur' : 'processeur';
    if (gpuApi && options.toutGPU !== false && sortieH && couches.every(function (L) { return L.h && L.h.qkv && L.h.o && L.h.gu && L.h.d; }) && cfg.ctx <= gl.getParameter(gl.MAX_TEXTURE_SIZE) && cfg.vocab > 12) {
      try {
        var pp = creerPipeline(gl, cfg, couches, norme, sortieH), idA = 3, idB = 11, xa = new Float32Array(cfg.dim), xb = new Float32Array(cfg.dim);
        pos = 0; avancerHybride(idA, false); var l1 = Float32Array.from(avancerHybride(idB, true)); libererCache(); pos = 0;
        ligne(embed, idA, xa); pp.avancer(xa, 0, false); ligne(embed, idB, xb); var l2 = pp.avancer(xb, 1, true), ee = 0, mm = 0;
        for (var qi = 0; qi < l1.length; qi++) { ee = Math.max(ee, Math.abs(l1[qi] - l2[qi])); mm = Math.max(mm, Math.abs(l1[qi])); }
        gpuInfo.testIntegral = { ecartRel: ee / Math.max(mm, 1e-9) };
        if (ee / Math.max(mm, 1e-9) < 2e-3) { pipe = pp; gpuInfo.mode = 'GPU intégral'; } else gpuInfo.raison += ' ; le mode GPU intégral ne donne pas les mêmes résultats sur cet appareil : mode GPU + processeur gardé';
      } catch (e) { pipe = null; pos = 0; gpuInfo.raison += ' ; mode GPU intégral indisponible (' + e.message + ')'; }
    }
    gpuInfo.texte = gpuApi ? gpuInfo.mode + ' (auto-test réussi)' : 'processeur — ' + gpuInfo.raison;
    var modele = {
      version: VERSION, cfg: cfg, tokenizer: tok, gpu: gpuInfo, kv: kv,
      get position() { return pos; },
      reinitialiser: function () { pos = 0; },
      // Donne des mots au modèle (sans rien générer) et renvoie les scores du dernier
      nourrir: function (ids, logitsFin) { var lg = null; for (var i = 0; i < ids.length; i++) lg = avancer(ids[i], logitsFin && i === ids.length - 1); return lg; },
      logits: function (ids) { pos = 0; return Float32Array.from(this.nourrir(ids, true)); },
      // Génère à la suite des mots donnés
      generer: async function (ids, o) {
        o = o || {}; var maxT = o.maxTokens || 128, sortieIds = [], t0 = performance.now(), lg = this.nourrir(ids, true), dec = tok.decodeur(), texte = '', hist = ids.slice();
        var fin = [tok.id('<|im_end|>'), tok.id('<|endoftext|>'), kv['tokenizer.ggml.eos_token_id']].filter(function (v) { return v !== undefined; });
        var tPrem = performance.now(), nGen = 0;
        for (var i = 0; i < maxT; i++) {
          for (var z = tok.taille; z < lg.length; z++) lg[z] = -Infinity;   // les lignes de réserve du modèle (au-delà du vocabulaire) ne sont jamais choisies
          var nxt = echantillonner(lg, o, hist); if (fin.indexOf(nxt) >= 0) { if (o.nourrirFin !== false && pos < cfg.ctx) avancer(nxt, false); break; }
          sortieIds.push(nxt); hist.push(nxt); nGen++; var morceau = dec.ajouter(nxt); texte += morceau; if (o.onToken) o.onToken(morceau, nxt);
          if (o.signal && o.signal.annule) break;
          if (pos >= cfg.ctx) break;
          lg = avancer(nxt, true);
          if (o.pauseMs) await new Promise(function (r) { setTimeout(r, o.pauseMs); }); else if (i % 2 === 1) await new Promise(function (r) { setTimeout(r, 0); }); // laisse respirer l'écran du téléphone (mode Économie : pause plus longue)
        }
        var t1 = performance.now(); return { texte: texte, ids: sortieIds, motsParSeconde: nGen > 1 ? (nGen - 1) / ((t1 - tPrem) / 1000) : 0, msPremier: tPrem - t0 };
      },
      // Conversation façon ChatML (Qwen) ; garde la mémoire d'un message à l'autre
      gabarit: function (messages, ouvrirReponse) {
        var s = ''; messages.forEach(function (m) { s += '<|im_start|>' + m.role + '\n' + m.content + '<|im_end|>\n'; }); if (ouvrirReponse !== false) s += '<|im_start|>assistant\n'; return s;
      },
      discuter: async function (messages, o) {
        // messages = tout l'historique ; on ne donne au modèle que les nouveaux messages (le cache garde le reste)
        o = o || {}; var dejaVu = this._vu || 0, nouveaux = messages.slice(dejaVu), txt = '';
        if (dejaVu === 0 && messages[0].role !== 'system') txt += '<|im_start|>system\n' + (o.systeme || 'Réponds en français, de façon brève.') + '<|im_end|>\n';
        txt += this.gabarit(nouveaux, true);
        var ids = tok.encoder(txt, true), res = await this.generer(ids, o); this._vu = messages.length + 1; return res;
      },
      nouvelleConversation: function () { pos = 0; this._vu = 0; }
    };
    prog(1, 'prêt');
    return modele;
  }

  // =====================================================================================
  // 6. Calcul en arrière-plan (Web Worker) : l'écran ne se fige plus pendant que le modèle réfléchit.
  //    Le travailleur reçoit le code de STAR GPU et de STAR IA (texte) et charge le modèle avec son propre GPU (OffscreenCanvas).
  // =====================================================================================
  function travailleurMain() {
    var modele = null, signal = null;
    function envoyer(type, d) { var o = { type: type }; for (var k in d) o[k] = d[k]; self.postMessage(o); }
    self.onmessage = async function (e) {
      var m = e.data;
      try {
        if (m.type === 'charger') {
          if (typeof OffscreenCanvas === 'undefined') throw new Error('OffscreenCanvas absent');
          var gpu = StarGPU.create(new OffscreenCanvas(1, 1));
          modele = await StarIA.charger(StarIA.sourceBlob(m.blob), { gpu: gpu, toutGPU: m.toutGPU, contexteMax: m.contexteMax, progression: function (p, n) { envoyer('progression', { p: p, n: n }); } });
          envoyer('pret', { cfg: modele.cfg, gpu: modele.gpu, gpuPrincipalOk: !!(gpu.info && gpu.info.ok) });
        } else if (m.type === 'discuter') {
          signal = { annule: false }; var o = {}; for (var k in m.options) o[k] = m.options[k]; o.signal = signal; o.onToken = function (t) { envoyer('token', { t: t }); };
          var r = await modele.discuter(m.messages, o);
          envoyer('fin', { texte: r.texte, ids: r.ids, motsParSeconde: r.motsParSeconde, msPremier: r.msPremier, position: modele.position });
        } else if (m.type === 'stop') { if (signal) signal.annule = true; }
        else if (m.type === 'nouvelle') { modele.nouvelleConversation(); envoyer('position', { position: 0 }); }
      } catch (err) { envoyer('erreur', { message: err && err.message ? err.message : String(err), phase: m.type }); }
    };
  }
  // sources = [texte de star-gpu.js, texte de star-ia.js]. Renvoie un objet qui s'utilise comme celui de charger() (discuter, nouvelleConversation, cfg, gpu, position).
  function chargerEnArrierePlan(blob, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof Blob === 'undefined' || !options.sources) return reject(new Error('arrière-plan non disponible'));
      var w, url, attente = null, pos = 0, minuteur = null, pret = false, proxy;
      try {
        url = URL.createObjectURL(new Blob([options.sources[0], '\n', options.sources[1], '\n(', travailleurMain.toString(), ')();'], { type: 'text/javascript' }));
        w = new Worker(url);
      } catch (e) { return reject(e); }
      function fin() { if (minuteur) { clearInterval(minuteur); minuteur = null; } }
      w.onerror = function (ev) { fin(); var msg = new Error('arrière-plan : ' + (ev && ev.message ? ev.message : 'erreur du travailleur')); if (!pret) { w.terminate(); reject(msg); } else if (attente) { var a = attente; attente = null; a.rej(msg); } };
      w.onmessage = function (e) {
        var m = e.data;
        if (m.type === 'progression') { if (options.progression) options.progression(m.p, m.n); }
        else if (m.type === 'pret') {
          pret = true;
          proxy = {
            version: VERSION, cfg: m.cfg, gpu: m.gpu, arrierePlan: true, gpuPrincipalOk: m.gpuPrincipalOk,
            get position() { return pos; },
            discuter: function (messages, o) {
              o = o || {};
              return new Promise(function (res, rej) {
                attente = { res: res, rej: rej, onToken: o.onToken };
                var opts = {}; for (var k in o) if (typeof o[k] !== 'function' && k !== 'signal') opts[k] = o[k];
                if (o.signal) minuteur = setInterval(function () { if (o.signal.annule) { w.postMessage({ type: 'stop' }); fin(); } }, 80);
                w.postMessage({ type: 'discuter', messages: messages, options: opts });
              });
            },
            nouvelleConversation: function () { pos = 0; w.postMessage({ type: 'nouvelle' }); },
            terminer: function () { fin(); w.terminate(); URL.revokeObjectURL(url); }
          };
          resolve(proxy);
        }
        else if (m.type === 'token') { if (attente && attente.onToken) attente.onToken(m.t); }
        else if (m.type === 'fin') { fin(); pos = m.position; var a = attente; attente = null; if (a) a.res({ texte: m.texte, ids: m.ids, motsParSeconde: m.motsParSeconde, msPremier: m.msPremier }); }
        else if (m.type === 'position') pos = m.position;
        else if (m.type === 'erreur') { fin(); var err = new Error(m.message); if (!pret) { w.terminate(); err.phase = m.phase; reject(err); } else if (attente) { var b = attente; attente = null; b.rej(err); } }
      };
      w.postMessage({ type: 'charger', blob: blob, toutGPU: options.toutGPU, contexteMax: options.contexteMax });
    });
  }

  var StarIA = {
    version: VERSION, charger: charger, chargerEnArrierePlan: chargerEnArrierePlan, sourceBuffer: sourceBuffer, sourceBlob: sourceBlob, sourceUrl: sourceUrl, ouvrirGGUF: ouvrirGGUF, lireTenseur: lireTenseur,
    dequantiser: dequantiser, tenseurVersMat: tenseurVersMat, matvecCPU: matvecCPU, creerTokenizer: creerTokenizer, creerGPU: creerGPU, autoTestGPU: autoTestGPU, TYPES: TYPES, ligne: ligne
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = StarIA; else racine.StarIA = StarIA;
})(typeof self !== 'undefined' ? self : this);
