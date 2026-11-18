/*!
 * STAR GPU v1.0 : bibliothèque de calcul graphique de STAR ENTREPRISE (un seul fichier, aucune dépendance).
 * Elle utilise le VRAI processeur graphique de l'appareil (téléphone ou PC) via WebGL2.
 * Trois services : 1) filtres d'images  2) milliers de sprites pour les jeux  3) calcul de matrices pour l'IA.
 *
 * Utilisation :  <script src="star-gpu.js"></script>
 *   const gpu = StarGPU.create();            // ou StarGPU.create(canvasExistant)
 *   gpu.info                                  // { ok, renderer, maxTexture, calculFlottant }
 *   gpu.image(img).filter('grayscale',1).filter('blur',4).toCanvas(canvas)
 *   const lot = gpu.sprites(5000); lot.add({x,y,w,h,rot,color:[r,g,b,a]}); lot.draw(texture)
 *   gpu.compute.matmul(A, B, m, k, n)         // A : m×k, B : k×n -> Float32Array m×n
 *   gpu.compute.dense(X, W, biais, m, k, n, 'relu')
 * Si WebGL2 manque, le calcul bascule automatiquement sur le processeur central (gpu.info.ok === false).
 * © STAR ENTREPRISE, Brazzaville. Fichier à conserver et à réutiliser librement dans les projets du groupe.
 */
(function (racine) {
  'use strict';
  var VERSION = '1.0';

  // ---------- Calcul de référence sur le processeur central (sert aussi de secours et de comparaison) ----------
  var cpu = {
    matmul: function (A, B, m, k, n) {
      var C = new Float32Array(m * n);
      for (var i = 0; i < m; i++) for (var p = 0; p < k; p++) {
        var a = A[i * k + p], ligne = i * n, bl = p * n;
        for (var j = 0; j < n; j++) C[ligne + j] += a * B[bl + j];
      }
      return C;
    }
  };

  function activer(C, biais, m, n, act) {
    for (var i = 0; i < m; i++) for (var j = 0; j < n; j++) {
      var v = C[i * n + j] + (biais ? biais[j] : 0);
      if (act === 'relu') v = v > 0 ? v : 0;
      else if (act === 'sigmoid') v = 1 / (1 + Math.exp(-v));
      else if (act === 'tanh') v = Math.tanh(v);
      C[i * n + j] = v;
    }
    return C;
  }

  // ---------- Shaders ----------
  var VS_PLEIN_ECRAN = '#version 300 es\nout vec2 uv;\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}';

  var FS_FILTRE = '#version 300 es\nprecision highp float;\nin vec2 uv;out vec4 sortie;\n' +
    'uniform sampler2D src;uniform vec2 px;uniform vec2 dir;uniform vec4 p;uniform int mode;\n' +
    'void main(){vec4 c=texture(src,uv);\n' +
    'if(mode==0){c.rgb=(c.rgb-.5)*p.y+.5+p.x;}\n' +                                   // luminosité (p.x) et contraste (p.y)
    'else if(mode==1){float g=dot(c.rgb,vec3(.299,.587,.114));c.rgb=mix(c.rgb,vec3(g),p.x);}\n' + // gris
    'else if(mode==2){vec3 s=vec3(dot(c.rgb,vec3(.393,.769,.189)),dot(c.rgb,vec3(.349,.686,.168)),dot(c.rgb,vec3(.272,.534,.131)));c.rgb=mix(c.rgb,s,p.x);}\n' + // sépia
    'else if(mode==3){float w[5]=float[5](.2270,.1945,.1216,.0540,.0162);vec4 s=c*w[0];for(int i=1;i<5;i++){vec2 o=dir*px*float(i)*p.x;s+=(texture(src,uv+o)+texture(src,uv-o))*w[i];}c=s;}\n' + // flou (une passe)
    'else if(mode==4){vec4 s=texture(src,uv+vec2(px.x,0.))+texture(src,uv-vec2(px.x,0.))+texture(src,uv+vec2(0.,px.y))+texture(src,uv-vec2(0.,px.y));c.rgb=c.rgb*(1.+4.*p.x)-s.rgb*p.x;}\n' + // netteté
    'else if(mode==5){float d=distance(uv,vec2(.5));c.rgb*=1.-smoothstep(.25,.85,d)*p.x;}\n' +                // vignette
    'else if(mode==6){float g=dot(c.rgb,vec3(.299,.587,.114));c.rgb=mix(vec3(g),c.rgb,p.x);}\n' +             // saturation
    'else if(mode==7){c.rgb=1.-c.rgb;}\n' +                                                                    // négatif
    'sortie=vec4(clamp(c.rgb,0.,1.),c.a);}';

  var VS_SPRITE = '#version 300 es\nprecision highp float;\n' +
    'layout(location=0) in vec2 coin;layout(location=1) in vec4 rect;layout(location=2) in vec4 uvr;layout(location=3) in vec4 coul;layout(location=4) in float rot;\n' +
    'uniform vec2 ecran;out vec2 uv;out vec4 couleur;\n' +
    'void main(){vec2 l=(coin-.5)*rect.zw;float c=cos(rot),s=sin(rot);vec2 r=vec2(l.x*c-l.y*s,l.x*s+l.y*c);vec2 pos=rect.xy+r;\n' +
    'gl_Position=vec4(pos.x/ecran.x*2.-1.,1.-pos.y/ecran.y*2.,0.,1.);uv=mix(uvr.xy,uvr.zw,coin);couleur=coul;}';
  var FS_SPRITE = '#version 300 es\nprecision highp float;\nin vec2 uv;in vec4 couleur;out vec4 sortie;\n' +
    'uniform sampler2D tex;uniform int texture_active;\n' +
    'void main(){vec4 t=texture_active==1?texture(tex,uv):vec4(1.);sortie=t*couleur;if(sortie.a<.003)discard;}';

  var FS_MATMUL = '#version 300 es\nprecision highp float;\nout float sortie;\n' +
    'uniform sampler2D A;uniform sampler2D B;uniform int k;\n' +
    'void main(){ivec2 o=ivec2(gl_FragCoord.xy);float s=0.;for(int p=0;p<k;p++){s+=texelFetch(A,ivec2(p,o.y),0).r*texelFetch(B,ivec2(o.x,p),0).r;}sortie=s;}';

  var FS_BLIT = '#version 300 es\nprecision highp float;\nin vec2 uv;out vec4 sortie;uniform sampler2D src;void main(){sortie=texture(src,uv);}';

  // ---------- Création ----------
  function create(canvas, options) {
    options = options || {};
    var cv = canvas || (typeof document !== 'undefined' ? document.createElement('canvas') : null);
    var gl = null;
    try {
      if (cv && !options.forceCpu) gl = cv.getContext('webgl2', { premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true, alpha: true });
    } catch (e) { gl = null; }
    var gpu = { version: VERSION, canvas: cv, gl: gl, cpu: cpu };
    gpu.info = { ok: !!gl, version: VERSION, renderer: 'processeur central (secours)', maxTexture: 0, calculFlottant: false };

    if (!gl) {
      gpu.compute = {
        matmul: function (A, B, m, k, n) { return cpu.matmul(A, B, m, k, n); },
        dense: function (X, W, b, m, k, n, act) { return activer(cpu.matmul(X, W, m, k, n), b, m, n, act); }
      };
      var manque = function () { throw new Error('STAR GPU : WebGL2 indisponible sur cet appareil (calcul matrice seulement).'); };
      gpu.image = manque; gpu.sprites = manque; gpu.texture = manque;
      return gpu;
    }

    var ext = gl.getExtension('EXT_color_buffer_float');
    var dbg = gl.getExtension('WEBGL_debug_renderer_info');
    gpu.info.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gpu.info.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    gpu.info.calculFlottant = !!ext;

    function compiler(vs, fs) {
      function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader : ' + gl.getShaderInfoLog(s)); return s; }
      var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Programme : ' + gl.getProgramInfoLog(p));
      var u = {}; var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) { var nom = gl.getActiveUniform(p, i).name; u[nom] = gl.getUniformLocation(p, nom); }
      return { p: p, u: u };
    }
    var progs = {};
    function prog(nom) {
      if (progs[nom]) return progs[nom];
      var d = { filtre: [VS_PLEIN_ECRAN, FS_FILTRE], sprite: [VS_SPRITE, FS_SPRITE], matmul: [VS_PLEIN_ECRAN, FS_MATMUL], blit: [VS_PLEIN_ECRAN, FS_BLIT] }[nom];
      return (progs[nom] = compiler(d[0], d[1]));
    }

    function creerTexture(w, h, interne, format, type, data, lineaire) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, lineaire ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, lineaire ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, interne, w, h, 0, format, type, data || null);
      return t;
    }
    function cible(w, h) {
      var t = creerTexture(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, null, true);
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return { tex: t, fbo: f, w: w, h: h };
    }
    var vide = gl.createVertexArray();
    function plein(c) { gl.bindVertexArray(vide); gl.drawArrays(gl.TRIANGLES, 0, 3); }

    // ---- Textures (pour les sprites) ----
    gpu.texture = function (source) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      return t;
    };

    // ---- 1) Images : une chaîne de filtres calculée sur le GPU ----
    gpu.image = function (source) {
      var w = source.naturalWidth || source.videoWidth || source.width, h = source.naturalHeight || source.videoHeight || source.height;
      if (!w || !h) throw new Error('STAR GPU : image vide.');
      var max = gpu.info.maxTexture;
      if (w > max || h > max) { var e = Math.min(max / w, max / h); w = Math.floor(w * e); h = Math.floor(h * e); }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      var t0 = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t0);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      var A = cible(w, h), B = cible(w, h), courant = { tex: t0 }, suivant = A, autre = B;
      var api = { width: w, height: h };
      function passe(mode, p, dir) {
        var pr = prog('filtre'); gl.useProgram(pr.p);
        gl.bindFramebuffer(gl.FRAMEBUFFER, suivant.fbo); gl.viewport(0, 0, w, h); gl.disable(gl.BLEND);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, courant.tex); gl.uniform1i(pr.u.src, 0);
        gl.uniform2f(pr.u.px, 1 / w, 1 / h); gl.uniform2f(pr.u.dir, dir ? dir[0] : 0, dir ? dir[1] : 0);
        gl.uniform4f(pr.u.p, p[0] || 0, p[1] || 0, p[2] || 0, p[3] || 0); gl.uniform1i(pr.u.mode, mode);
        plein();
        courant = suivant; suivant = (suivant === A) ? B : A;
      }
      var noms = { brightness: 0, contrast: 0, grayscale: 1, sepia: 2, sharpen: 4, vignette: 5, saturation: 6, invert: 7 };
      api.filter = function (nom, valeur) {
        var v = valeur === undefined ? 1 : valeur;
        if (nom === 'blur') { passe(3, [v], [1, 0]); passe(3, [v], [0, 1]); }
        else if (nom === 'brightness') passe(0, [v, 1]);                  // v entre -1 et 1
        else if (nom === 'contrast') passe(0, [0, v]);                    // 1 = inchangé
        else if (noms[nom] !== undefined) passe(noms[nom], [v]);
        else throw new Error('STAR GPU : filtre inconnu « ' + nom + ' » (blur, brightness, contrast, grayscale, sepia, sharpen, vignette, saturation, invert).');
        return api;
      };
      api.toCanvas = function (c) {
        c = c || cv; c.width = w; c.height = h;
        var ctx = gl.canvas === c ? gl : null;
        if (ctx) { var pr = prog('blit'); gl.useProgram(pr.p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, courant.tex); gl.uniform1i(pr.u.src, 0); plein(); }
        else { var d = api.readPixels(), im = new ImageData(d, w, h); c.getContext('2d').putImageData(im, 0, 0); }
        return c;
      };
      api.readPixels = function () {
        var brut = new Uint8ClampedArray(w * h * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, courant.fbo || A.fbo);
        if (!courant.fbo) { // aucune passe n'a encore eu lieu : copie directe
          var pr = prog('blit'); gl.useProgram(pr.p); gl.bindFramebuffer(gl.FRAMEBUFFER, A.fbo); gl.viewport(0, 0, w, h);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t0); gl.uniform1i(pr.u.src, 0); plein();
          gl.bindFramebuffer(gl.FRAMEBUFFER, A.fbo);
        }
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, brut);
        var res = new Uint8ClampedArray(w * h * 4), ligne = w * 4; // l'image GL est à l'envers : on la remet à l'endroit
        for (var y = 0; y < h; y++) res.set(brut.subarray((h - 1 - y) * ligne, (h - y) * ligne), y * ligne);
        return res;
      };
      return api;
    };

    // ---- 2) Sprites : des milliers de images dessinées en UN seul appel au GPU ----
    gpu.sprites = function (capacite) {
      capacite = capacite || 10000;
      var FLT = 13, data = new Float32Array(capacite * FLT), n = 0; // par sprite : rect(4) uv(4) couleur(4) rotation(1)
      var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      var coins = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, coins);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      var inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, inst); gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
      var oct = FLT * 4, dec = [[1, 4, 0], [2, 4, 16], [3, 4, 32], [4, 1, 48]];
      dec.forEach(function (d) { gl.enableVertexAttribArray(d[0]); gl.vertexAttribPointer(d[0], d[1], gl.FLOAT, false, oct, d[2]); gl.vertexAttribDivisor(d[0], 1); });
      var lot = {
        get count() { return n; },
        clear: function () { n = 0; return lot; },
        add: function (s) {
          if (n >= capacite) return false;
          var o = n * FLT, c = s.color || [1, 1, 1, 1], u = s.uv || [0, 0, 1, 1];
          data[o] = s.x; data[o + 1] = s.y; data[o + 2] = s.w; data[o + 3] = s.h === undefined ? s.w : s.h;
          data[o + 4] = u[0]; data[o + 5] = u[1]; data[o + 6] = u[2]; data[o + 7] = u[3];
          data[o + 8] = c[0]; data[o + 9] = c[1]; data[o + 10] = c[2]; data[o + 11] = c[3] === undefined ? 1 : c[3];
          data[o + 12] = s.rot || 0; n++; return true;
        },
        draw: function (texture, largeur, hauteur) {
          var W = largeur || gl.drawingBufferWidth, H = hauteur || gl.drawingBufferHeight;
          var pr = prog('sprite'); gl.useProgram(pr.p);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.uniform2f(pr.u.ecran, W, H);
          if (texture) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture); gl.uniform1i(pr.u.tex, 0); gl.uniform1i(pr.u.texture_active, 1); }
          else gl.uniform1i(pr.u.texture_active, 0);
          gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, inst);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, n * FLT));
          gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
          return n;
        },
        fond: function (r, g, b, a) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.clearColor(r, g, b, a === undefined ? 1 : a); gl.clear(gl.COLOR_BUFFER_BIT); return lot; }
      };
      return lot;
    };

    // ---- 3) Calcul pour l'IA : multiplication de matrices sur le GPU ----
    function matmulGPU(A, B, m, k, n) {
      var max = gpu.info.maxTexture;
      if (!ext || m > max || n > max || k > max) return cpu.matmul(A, B, m, k, n);
      var tA = creerTexture(k, m, gl.R32F, gl.RED, gl.FLOAT, A), tB = creerTexture(n, k, gl.R32F, gl.RED, gl.FLOAT, B);
      var tC = creerTexture(n, m, gl.R32F, gl.RED, gl.FLOAT, null), f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tC, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { gl.deleteTexture(tA); gl.deleteTexture(tB); gl.deleteTexture(tC); gl.deleteFramebuffer(f); return cpu.matmul(A, B, m, k, n); }
      var pr = prog('matmul'); gl.useProgram(pr.p); gl.viewport(0, 0, n, m); gl.disable(gl.BLEND);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tA); gl.uniform1i(pr.u.A, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tB); gl.uniform1i(pr.u.B, 1);
      gl.uniform1i(pr.u.k, k); plein();
      var C = new Float32Array(m * n);
      gl.readPixels(0, 0, n, m, gl.RED, gl.FLOAT, C); // peut échouer sur certains appareils : on retombe alors sur le CPU
      var err = gl.getError();
      gl.deleteTexture(tA); gl.deleteTexture(tB); gl.deleteTexture(tC); gl.deleteFramebuffer(f);
      if (err !== gl.NO_ERROR) return cpu.matmul(A, B, m, k, n);
      return C;
    }
    gpu.compute = {
      matmul: function (A, B, m, k, n) { return matmulGPU(A, B, m, k, n); },
      dense: function (X, W, b, m, k, n, act) { return activer(matmulGPU(X, W, m, k, n), b, m, n, act); }
    };

    // ---- Mesure de vitesse (honnête : le GPU n'est pas toujours plus rapide sur de petites tailles) ----
    gpu.benchmark = function (taille) {
      taille = taille || 256; var N = taille * taille, A = new Float32Array(N), B = new Float32Array(N);
      for (var i = 0; i < N; i++) { A[i] = Math.sin(i * 0.01); B[i] = Math.cos(i * 0.013); }
      var t0 = performance.now(); var Cc = cpu.matmul(A, B, taille, taille, taille); var tCpu = performance.now() - t0;
      matmulGPU(A, B, taille, taille, taille); // échauffement (compilation)
      t0 = performance.now(); var Cg = matmulGPU(A, B, taille, taille, taille); var tGpu = performance.now() - t0;
      var ecart = 0; for (var j = 0; j < N; j += 97) ecart = Math.max(ecart, Math.abs(Cc[j] - Cg[j]));
      return { taille: taille, cpuMs: Math.round(tCpu * 10) / 10, gpuMs: Math.round(tGpu * 10) / 10, rapport: Math.round(tCpu / Math.max(tGpu, 0.01) * 10) / 10, ecartMax: ecart };
    };
    return gpu;
  }

  var StarGPU = { version: VERSION, create: create, cpu: cpu };
  if (typeof module !== 'undefined' && module.exports) module.exports = StarGPU; else racine.StarGPU = StarGPU;
})(typeof self !== 'undefined' ? self : this);
