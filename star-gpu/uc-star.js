/*!
 * UC STAR v1.0 : « Unified Compute », technologie de calcul parallèle de STAR ENTREPRISE.
 * Principe : on écrit UNE formule, UC STAR la fait calculer en parallèle par le GPU de l'appareil
 * (milliers de calculs en même temps) ou, à défaut, par le processeur central. Même résultat des deux côtés.
 * Elle s'appuie sur STAR GPU (fichier star-gpu.js, à charger avant celui-ci). Ce n'est PAS CUDA : c'est notre propre couche,
 * volontairement simple, qui marche sur téléphone et PC dans le navigateur, sans installation.
 *
 *   const uc = UCStar.create();                      // ou UCStar.create(StarGPU.create())
 *   uc.map(tableau, 'sin(x)*u0 + 1', [2])             // une formule sur chaque élément (x), u0..u3 = réglages
 *   uc.zip(a, b, 'a*b + x')                           // deux tableaux ensemble (a et b)
 *   uc.generate(1000000, 'sin(i*0.001)')              // crée 1 million de valeurs (i = position, n = nombre total)
 *   uc.reduce(tableau, 'sum' | 'min' | 'max')         // résumer un tableau en un seul nombre
 *   uc.mapReduce(tableau, 'x*x', 'sum')               // formule puis résumé, sans repasser par le processeur
 *   uc.matmul(A, B, m, k, n) ; uc.dense(X, W, biais, m, k, n, 'relu')   // IA (via STAR GPU)
 *   uc.backend                                         // 'gpu' ou 'cpu'
 * Précision : le GPU calcule en 32 bits, le processeur en 64 bits. Sur les formules lisses l'écart est minuscule ; sur les formules à saut (fract, floor, step)
 * un point juste au bord du saut peut tomber de l'autre côté : c'est normal.
 * Fonctions permises dans les formules : sin cos tan abs sqrt exp log pow min max floor ceil fract mix clamp step smoothstep sign, PI.
 * © STAR ENTREPRISE, Brazzaville. Fichier à conserver et à réutiliser librement dans les projets du groupe.
 */
(function (racine) {
  'use strict';
  var VERSION = '1.0';
  var FONCTIONS = ['sin', 'cos', 'tan', 'abs', 'sqrt', 'exp', 'log', 'pow', 'min', 'max', 'floor', 'ceil', 'fract', 'mix', 'clamp', 'step', 'smoothstep', 'sign'];
  var VARIABLES = ['x', 'a', 'b', 'i', 'n', 'u0', 'u1', 'u2', 'u3', 'PI'];
  var JS_AIDE = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs, sqrt: Math.sqrt, exp: Math.exp, log: Math.log, pow: Math.pow, min: Math.min, max: Math.max, floor: Math.floor, ceil: Math.ceil,
    fract: function (v) { return v - Math.floor(v); }, mix: function (p, q, t) { return p + (q - p) * t; },
    clamp: function (v, lo, hi) { return Math.min(Math.max(v, lo), hi); }, step: function (e, v) { return v < e ? 0 : 1; },
    smoothstep: function (e0, e1, v) { var t = Math.min(Math.max((v - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); },
    sign: function (v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
  };

  // Vérifie la formule (liste blanche) et la traduit pour le GPU (nombres décimaux obligatoires en GLSL)
  function verifier(expr) {
    if (typeof expr !== 'string' || !expr.trim() || expr.length > 400) throw new Error('UC STAR : formule vide ou trop longue.');
    if (!/^[\w\s+\-*\/().,<>=?:!&|]*$/.test(expr)) throw new Error('UC STAR : caractère interdit dans la formule « ' + expr + ' ».');
    expr.replace(/[A-Za-z_]\w*/g, function (m) {
      if (FONCTIONS.indexOf(m) < 0 && VARIABLES.indexOf(m) < 0) throw new Error('UC STAR : mot inconnu « ' + m + ' » dans la formule.');
      return m;
    });
  }
  function versGLSL(expr) {
    return expr.replace(/([A-Za-z_]\w*)|(\d+\.?\d*(?:[eE][+-]?\d+)?)/g, function (m, id, nb) { return id ? id : (/[.eE]/.test(nb) ? nb : nb + '.0'); });
  }
  function versJS(expr) {
    var args = ['x', 'a', 'b', 'i', 'n', 'u0', 'u1', 'u2', 'u3', 'PI'].concat(FONCTIONS);
    var f = new Function(args.join(','), '"use strict";return (' + expr + ');');
    return function (x, a, b, i, n, u) { return f.apply(null, [x, a, b, i, n, u[0], u[1], u[2], u[3], Math.PI].concat(FONCTIONS.map(function (k) { return JS_AIDE[k]; }))); };
  }

  var VS = '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}';
  function fsKernel(expr) {
    return '#version 300 es\nprecision highp float;precision highp sampler2D;\nuniform sampler2D tx;uniform sampler2D tb;uniform vec4 dims;uniform vec4 u;out float sortie;\nconst float PI=3.14159265358979;\n' +
      'void main(){ivec2 o=ivec2(gl_FragCoord.xy);float i=float(o.y)*dims.x+float(o.x);float n=dims.z;\n' +
      'float x=texelFetch(tx,o,0).r;float a=x;float b=texelFetch(tb,o,0).r;float u0=u.x,u1=u.y,u2=u.z,u3=u.w;\n' +
      'sortie=(' + versGLSL(expr) + ');}';
  }
  var FS_REDUIRE = '#version 300 es\nprecision highp float;precision highp sampler2D;\nuniform sampler2D src;uniform ivec2 taille;uniform float valides;uniform int mode;out float sortie;\n' +
    'float lire(ivec2 p){if(p.x>=taille.x||p.y>=taille.y)return mode==0?0.:(mode==1?3.4e38:-3.4e38);' +
    'float idx=float(p.y)*float(taille.x)+float(p.x);if(idx>=valides)return mode==0?0.:(mode==1?3.4e38:-3.4e38);return texelFetch(src,p,0).r;}\n' +
    'float comb(float p,float q){return mode==0?p+q:(mode==1?min(p,q):max(p,q));}\n' +
    'void main(){ivec2 o=ivec2(gl_FragCoord.xy)*2;float s=comb(comb(lire(o),lire(o+ivec2(1,0))),comb(lire(o+ivec2(0,1)),lire(o+ivec2(1,1))));sortie=s;}';

  var REDUCTIONS = { sum: { m: 0, id: 0, f: function (p, q) { return p + q; } }, min: { m: 1, id: Infinity, f: Math.min }, max: { m: 2, id: -Infinity, f: Math.max } };

  function create(gpuOuCanvas, options) {
    var gpu = gpuOuCanvas && gpuOuCanvas.compute ? gpuOuCanvas : (typeof StarGPU !== 'undefined' ? StarGPU.create(gpuOuCanvas, options) : null);
    if (!gpu) throw new Error('UC STAR : charge d\'abord star-gpu.js.');
    var gl = gpu.gl, ok = !!(gl && gpu.info.ok && gpu.info.calculFlottant && gpu.info.precisionOk !== false);
    var uc = { version: VERSION, gpu: gpu, backend: ok ? 'gpu' : 'cpu', cache: {} };
    uc.info = { version: VERSION, backend: uc.backend, renderer: gpu.info.renderer, maxTexture: gpu.info.maxTexture };

    var vide = ok ? gl.createVertexArray() : null, progs = {}, factice = null;
    function programme(cle, fs) {
      if (progs[cle]) return progs[cle];
      function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error('UC STAR : formule refusée par le GPU : ' + gl.getShaderInfoLog(o)); return o; }
      var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('UC STAR : ' + gl.getProgramInfoLog(p));
      var u = {}, nb = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (var k = 0; k < nb; k++) { var nm = gl.getActiveUniform(p, k).name; u[nm] = gl.getUniformLocation(p, nm); }
      return (progs[cle] = { p: p, u: u });
    }
    function tex(w, h, data) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, data || null);
      return t;
    }
    function cible(w, h) {
      var t = tex(w, h, null), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { gl.deleteTexture(t); gl.deleteFramebuffer(f); return null; }
      return { t: t, f: f, w: w, h: h };
    }
    function liberer(c) { if (c) { gl.deleteTexture(c.t); gl.deleteFramebuffer(c.f); } }
    function forme(N) { var max = gpu.info.maxTexture, W = Math.min(Math.max(N, 1), Math.min(max, 2048)), H = Math.ceil(N / W); return H > max ? null : { W: W, H: H }; }
    function remplir(donnees, N, f) { var t = new Float32Array(f.W * f.H); t.set(donnees.length > N ? donnees.subarray ? donnees.subarray(0, N) : donnees.slice(0, N) : donnees); return t; }
    function plein() { gl.bindVertexArray(vide); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    function unif4(v) { v = v || []; return [v[0] || 0, v[1] || 0, v[2] || 0, v[3] || 0]; }

    // ---- Version processeur central (secours et vérification) ----
    function cpuKernel(expr, a, b, N, u) {
      var f = versJS(expr), sortie = new Float32Array(N); u = unif4(u);
      for (var i = 0; i < N; i++) sortie[i] = f(a ? a[i] : 0, a ? a[i] : 0, b ? b[i] : 0, i, N, u);
      return sortie;
    }

    // ---- Noyau GPU : une formule appliquée à chaque case ----
    function gpuKernel(expr, a, b, N, u) {
      var f = forme(N); if (!f) return null;
      var pr = programme('k:' + expr, fsKernel(expr)); u = unif4(u);
      var ta = tex(f.W, f.H, a ? remplir(a, N, f) : null), tb = tex(f.W, f.H, b ? remplir(b, N, f) : null), c = cible(f.W, f.H);
      if (!c) { gl.deleteTexture(ta); gl.deleteTexture(tb); return null; }
      gl.useProgram(pr.p); gl.bindFramebuffer(gl.FRAMEBUFFER, c.f); gl.viewport(0, 0, f.W, f.H); gl.disable(gl.BLEND);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ta); gl.uniform1i(pr.u.tx, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tb); gl.uniform1i(pr.u.tb, 1);
      gl.uniform4f(pr.u.dims, f.W, f.H, N, 0); gl.uniform4f(pr.u.u, u[0], u[1], u[2], u[3]); plein();
      return { c: c, ta: ta, tb: tb, f: f };
    }
    function lire(r, N) {
      var plein = new Float32Array(r.f.W * r.f.H);
      gl.bindFramebuffer(gl.FRAMEBUFFER, r.c.f); gl.readPixels(0, 0, r.f.W, r.f.H, gl.RED, gl.FLOAT, plein);
      var err = gl.getError(); gl.deleteTexture(r.ta); gl.deleteTexture(r.tb); liberer(r.c);
      return err === gl.NO_ERROR ? plein.slice(0, N) : null;
    }
    function lancer(expr, a, b, N, u) {
      verifier(expr);
      if (ok) { try { var r = gpuKernel(expr, a, b, N, u); if (r) { var sortie = lire(r, N); if (sortie) return sortie; } } catch (e) { /* formule non acceptée par ce GPU : repli sur le processeur */ } }
      return cpuKernel(expr, a, b, N, u);
    }

    uc.map = function (donnees, expr, u) { return lancer(expr, donnees, null, donnees.length, u); };
    uc.zip = function (a, b, expr, u) { if (a.length !== b.length) throw new Error('UC STAR : les deux tableaux doivent avoir la même longueur.'); return lancer(expr, a, b, a.length, u); };
    uc.generate = function (N, expr, u) { return lancer(expr, null, null, N, u); };

    // ---- Résumer un tableau en un nombre (somme, minimum, maximum) ----
    function reduireCPU(v, op) { var R = REDUCTIONS[op], s = R.id; for (var i = 0; i < v.length; i++) s = R.f(s, v[i]); return s; }
    function reduireGPU(source, N, f, op) {
      // source : { t, w, h } texture des valeurs ; N valeurs valides
      var R = REDUCTIONS[op], pr = programme('reduire', FS_REDUIRE), courant = { t: source, w: f.W, h: f.H, propre: false }, valides = N;
      while (courant.w > 1 || courant.h > 1) {
        var w2 = Math.ceil(courant.w / 2), h2 = Math.ceil(courant.h / 2), c = cible(w2, h2);
        if (!c) { if (courant.propre) gl.deleteTexture(courant.t); return null; }
        gl.useProgram(pr.p); gl.bindFramebuffer(gl.FRAMEBUFFER, c.f); gl.viewport(0, 0, w2, h2); gl.disable(gl.BLEND);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, courant.t); gl.uniform1i(pr.u.src, 0);
        gl.uniform2i(pr.u.taille, courant.w, courant.h); gl.uniform1f(pr.u.valides, valides); gl.uniform1i(pr.u.mode, R.m); plein();
        if (courant.propre) gl.deleteTexture(courant.t); gl.deleteFramebuffer(c.f);
        courant = { t: c.t, w: w2, h: h2, propre: true }; valides = 1e30;
      }
      var cf = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, cf); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, courant.t, 0);
      var out = new Float32Array(1); gl.readPixels(0, 0, 1, 1, gl.RED, gl.FLOAT, out);
      var err = gl.getError(); gl.deleteFramebuffer(cf); if (courant.propre) gl.deleteTexture(courant.t);
      return err === gl.NO_ERROR ? out[0] : null;
    }
    uc.reduce = function (donnees, op) {
      if (!REDUCTIONS[op]) throw new Error('UC STAR : résumé inconnu « ' + op + ' » (sum, min, max).');
      var N = donnees.length; if (!N) return REDUCTIONS[op].id;
      if (ok) {
        var f = forme(N);
        if (f) { var t = tex(f.W, f.H, remplir(donnees, N, f)); var r = reduireGPU(t, N, f, op); gl.deleteTexture(t); if (r !== null) return r; }
      }
      return reduireCPU(donnees, op);
    };
    uc.mapReduce = function (donnees, expr, op, u) {
      verifier(expr); if (!REDUCTIONS[op]) throw new Error('UC STAR : résumé inconnu « ' + op + ' » (sum, min, max).');
      var N = donnees.length;
      if (ok) {
        var k = null; try { k = gpuKernel(expr, donnees, null, N, u); } catch (e) { k = null; }
        if (k) { var r = reduireGPU(k.c.t, N, k.f, op); gl.deleteTexture(k.ta); gl.deleteTexture(k.tb); gl.deleteFramebuffer(k.c.f); gl.deleteTexture(k.c.t); if (r !== null) return r; }
      }
      return reduireCPU(cpuKernel(expr, donnees, null, N, u), op);
    };

    uc.matmul = function (A, B, m, k, n) { return gpu.compute.matmul(A, B, m, k, n); };
    uc.dense = function (X, W, biais, m, k, n, act) { return gpu.compute.dense(X, W, biais, m, k, n, act); };

    // Mesure honnête : chaque appareil a son résultat ; le GPU gagne surtout sur de grands tableaux
    uc.benchmark = function (N) {
      N = N || 1000000; var d = new Float32Array(N); for (var i = 0; i < N; i++) d[i] = (i % 1000) / 1000;
      var expr = 'sin(x*6.2831)*cos(x*3.1415)+sqrt(x)*u0';
      var t0 = performance.now(); var c = cpuKernel(expr, d, null, N, [0.5]); var tCpu = performance.now() - t0;
      uc.map(d.subarray(0, 1000), expr, [0.5]); // échauffement
      t0 = performance.now(); var g = uc.map(d, expr, [0.5]); var tUc = performance.now() - t0;
      var ec = 0; for (var j = 0; j < N; j += 997) ec = Math.max(ec, Math.abs(c[j] - g[j]));
      return { N: N, backend: uc.backend, cpuMs: Math.round(tCpu), ucMs: Math.round(tUc), rapport: Math.round(tCpu / Math.max(tUc, 1) * 10) / 10, ecartMax: ec };
    };
    return uc;
  }

  var UCStar = { version: VERSION, create: create, verifier: verifier, versGLSL: versGLSL };
  if (typeof module !== 'undefined' && module.exports) module.exports = UCStar; else racine.UCStar = UCStar;
})(typeof self !== 'undefined' ? self : this);
