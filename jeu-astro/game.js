/* ASTRO QUEST — jeu d'aventure spatial éducatif (astronomie, niveau collège). Créé par STAR ENTREPRISE.
   Tout est dessiné par le code (aucune image à télécharger) : le jeu est léger, fonctionne hors connexion et s'installe comme une application.
   Règles : tu pilotes une fusée qui tire toute seule, tu détruis les monstres, puis le gardien de la planète te pose une question
   (quiz à cliquer). Bonne réponse : atterrissage et niveau suivant. Mauvaise réponse : « Mauvaise réponse » puis une seconde chance
   avec une autre question. Deuxième erreur : GAME OVER. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  var TAU = Math.PI * 2;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t, 0, 1); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var RAPIDE = /[?&]rapide/.test(location.search);        // essai : niveaux très courts
  var REDUIT = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var MONDES = window.ASTRO_MONDES;
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* mode privé */ } }
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4l2.9 6.2 6.7.8-5 4.6 1.3 6.7L12 17.4l-5.9 3.3 1.3-6.7-5-4.6 6.7-.8z"/></svg>';
  var ICO_SON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" fill="none" stroke-width="1.7" stroke-linecap="round"/></svg>', ICO_MUET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke-width="1.7" stroke-linecap="round"/></svg>';

  /* ====================== Écran ====================== */
  var cvs = $('c'), ctx = cvs.getContext('2d'), jeu = $('jeu');
  var W = 360, H = 640, SC = 1, CSSW = 360, CSSH = 640, fondsAJour = false;
  function redim() {
    var iw = window.innerWidth, ih = window.innerHeight;
    var asp = clamp(iw / ih, 360 / 860, 360 / 560);
    CSSW = Math.min(iw, ih * asp); CSSH = ih;
    jeu.style.width = CSSW + 'px';
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = Math.round(CSSW * dpr); cvs.height = Math.round(CSSH * dpr);
    W = 360; H = Math.round(360 * CSSH / CSSW); SC = CSSW * dpr / W;
    fondsAJour = false;
  }

  /* ====================== Sons (synthétisés, aucun fichier) ====================== */
  var AU = {
    ctx: null, muet: lsGet('astro_muet', '0') === '1',
    init: function () { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } },
    ton: function (f, d, type, v, glisse, retard) {
      if (!this.ctx || this.muet) return; var c = this.ctx, t = c.currentTime + (retard || 0);
      var o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      if (glisse) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + glisse), t + d);
      g.gain.setValueAtTime(v || .06, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + .02);
    },
    bruit: function (d, v, coupure) {
      if (!this.ctx || this.muet) return; var c = this.ctx, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), x = b.getChannelData(0);
      for (var i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = coupure || 900; g.gain.value = v || .15; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
    },
    laser: function () { this.ton(880, .09, 'sawtooth', .025, -520); },
    boum: function (g) { this.bruit(g ? .55 : .3, g ? .3 : .16, g ? 500 : 1100); this.ton(120, .25, 'sine', .08, -70); },
    bon: function () { [523, 659, 784, 1047].forEach(function (f, i) { AU.ton(f, .22, 'triangle', .07, 0, i * .09); }); },
    mauvais: function () { this.ton(180, .35, 'sawtooth', .07, -90); this.ton(150, .4, 'square', .04, -80, .12); },
    pose: function () { this.bruit(1.2, .12, 500); this.ton(90, .6, 'sine', .08, -30, 1.0); },
    decolle: function () { this.bruit(2.2, .16, 700); },
    clic: function () { this.ton(660, .06, 'triangle', .05); },
    bouclier: function () { this.ton(500, .18, 'sine', .06, 500); },
    touche: function () { this.ton(140, .2, 'square', .06, -60); this.bruit(.2, .1, 700); }
  };
  function vibre(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignoré */ } }

  /* ====================== Bruit et textures de planètes (dessinées par le code) ====================== */
  function hash(ix, iy) { var h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, per) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    function h(a, b) { return hash(((a % per) + per) % per, b); }
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
  }
  function fbm(x, y, per, oct) { var s = 0, a = .5, f = 1; for (var i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, per * f); f *= 2; a *= .5; } return s; }
  function rgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function palCol(cols, t) { t = clamp(t, 0, 1); return t < .5 ? mix(cols[0], cols[1], t * 2) : mix(cols[1], cols[2], (t - .5) * 2); }

  var TW = 384, TH = 192;
  function creerTexture(type, couleurs) {
    var c = document.createElement('canvas'); c.width = TW; c.height = TH; var x = c.getContext('2d'), img = x.createImageData(TW, TH), d = img.data;
    var cols = couleurs.map(rgb), P = 6;
    for (var j = 0; j < TH; j++) {
      for (var i = 0; i < TW; i++) {
        var u = i / TW * P, v = j / TH * (P / 2), lat = j / TH, n = fbm(u, v, P, 5), col;
        if (type === 'terre') {
          var land = fbm(u * .9 + 3, v * .9, P, 5), mer = mix(rgb('#0a2f6b'), rgb('#2a78d6'), fbm(u * 2, v * 2, P * 2, 3));
          col = land > .53 ? mix(rgb('#2f8f3f'), rgb('#b8a45a'), clamp((land - .53) * 4 + fbm(u * 3, v * 3, P * 3, 2) - .4, 0, 1)) : mer;
          var nu = fbm(u * 1.6 + 9, v * 1.6 + 4, P * 1.6, 5); if (nu > .52) col = mix(col, [255, 255, 255], clamp((nu - .52) * 5, 0, .85));
          if (lat < .08 || lat > .92) col = mix(col, [245, 250, 255], .9);
        } else if (type === 'nuages') {
          var w = fbm(u + fbm(u * 2, v * 2, P * 2, 3) * 1.4, v + fbm(u * 2 + 5, v * 2, P * 2, 3) * 1.4, P, 4); col = palCol(cols, w * 1.3);
        } else if (type === 'bandes' || type === 'anneaux') {
          var bd = Math.sin(lat * (type === 'bandes' ? 30 : 22) + fbm(u * 1.5, v * 3, P * 1.5, 4) * 5) * .5 + .5; col = palCol(cols, bd * .85 + n * .25);
          if (type === 'bandes') { var dx = (i / TW - .62) * 5.2, dy = (lat - .64) * 8; var spot = dx * dx + dy * dy; if (spot < 1) col = mix(col, rgb('#b5441d'), (1 - spot) * .9); }
        } else if (type === 'rouge') {
          col = palCol(cols, n * 1.35 - .05); if (n < .38) col = mix(col, [70, 25, 12], .45); if (lat < .07 || lat > .93) col = mix(col, [250, 245, 240], .85);
        } else if (type === 'glace') {
          col = palCol(cols, .35 + Math.sin(lat * 18 + n * 2) * .12 + n * .3);
        } else if (type === 'bleu') {
          col = palCol(cols, n * .9 + Math.sin(lat * 14 + n * 3) * .12); var st = fbm(u * 3 + 20, v * 6, P * 3, 3); if (st > .6) col = mix(col, [200, 225, 255], clamp((st - .6) * 3, 0, .8));
          var ex = (i / TW - .3) * 6, ey = (lat - .55) * 9; if (ex * ex + ey * ey < 1) col = mix(col, [10, 20, 80], .7);
        } else if (type === 'naine') {
          col = palCol(cols, n * 1.25); var hx = (i / TW - .55) * 4.2, hy = (lat - .55) * 4.6; if (hx * hx + hy * hy < 1) col = mix(col, [250, 240, 228], .7 * (1 - Math.sqrt(hx * hx + hy * hy)));
        } else { col = palCol(cols, n * 1.3); }
        var k = (j * TW + i) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    if (type === 'roche' || type === 'naine' || type === 'rouge') {   // cratères
      for (var q = 0; q < (type === 'roche' ? 70 : 28); q++) {
        var cx = rnd(0, TW), cy = rnd(10, TH - 10), cr = rnd(2, type === 'roche' ? 13 : 9);
        for (var w2 = -1; w2 <= 1; w2++) {
          var g = x.createRadialGradient(cx + w2 * TW, cy, cr * .2, cx + w2 * TW, cy, cr);
          g.addColorStop(0, 'rgba(0,0,0,.38)'); g.addColorStop(.75, 'rgba(0,0,0,.12)'); g.addColorStop(.9, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          x.fillStyle = g; x.beginPath(); x.arc(cx + w2 * TW, cy, cr, 0, TAU); x.fill();
        }
      }
    }
    return c;
  }
  var TEX = {}, TERRE = null;
  function preparerTextures() { MONDES.forEach(function (m, i) { TEX[i] = creerTexture(m.type === 'nuages' || m.type === 'bandes' || m.type === 'anneaux' || m.type === 'glace' || m.type === 'bleu' || m.type === 'naine' || m.type === 'rouge' ? m.type : 'roche', m.couleurs); }); TERRE = creerTexture('terre', ['#2a78d6', '#2f8f3f', '#b8a45a']); }

  function dessinerAnneaux(c, cx, cy, r, arriere) {
    c.save(); c.translate(cx, cy); c.rotate(-.3); c.scale(1, .3);
    var bandes = [[1.28, .1, 'rgba(214,190,140,.55)'], [1.42, .16, 'rgba(240,222,170,.8)'], [1.62, .12, 'rgba(200,175,125,.6)'], [1.78, .06, 'rgba(235,215,165,.45)'], [1.9, .04, 'rgba(180,155,110,.35)']];
    bandes.forEach(function (b) { c.beginPath(); c.arc(0, 0, r * b[0], arriere ? Math.PI : 0, arriere ? TAU : Math.PI); c.lineWidth = r * b[1]; c.strokeStyle = b[2]; c.stroke(); });
    c.restore();
  }
  // Planète « sphère » : texture qui tourne + ombre + halo d'atmosphère
  function dessinerPlanete(c, tex, cx, cy, r, rot, halo, anneaux, vdec) {
    if (window.ASTRO_PREMIUM && window.ASTRO_PREMIUM.planete(c, tex, cx, cy, r, rot, halo, anneaux, vdec)) return;
    c.save();
    if (anneaux) dessinerAnneaux(c, cx, cy, r, true);
    c.globalCompositeOperation = 'lighter';
    var gl = c.createRadialGradient(cx, cy, r * .9, cx, cy, r * 1.4); gl.addColorStop(0, halo + '.45)'); gl.addColorStop(1, halo + '0)'); c.fillStyle = gl; c.beginPath(); c.arc(cx, cy, r * 1.4, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip();
    var sc = (2 * r) / tex.height, tw = tex.width * sc, off = ((rot % 1) + 1) % 1 * tw;
    var vy = (vdec || 0) * 2 * r;   // décalage vertical : pour un sol vu de près, on montre le milieu de la texture (pas les pôles)
    for (var rg = 0; rg < (vy > 0 ? 2 : 1); rg++) { var yy = cy - r - vy + rg * 2 * r; c.drawImage(tex, cx - r - off, yy, tw, 2 * r); c.drawImage(tex, cx - r - off + tw, yy, tw, 2 * r); c.drawImage(tex, cx - r - off + 2 * tw, yy, tw, 2 * r); }
    var sh = c.createRadialGradient(cx - r * .42, cy - r * .5, r * .08, cx, cy, r * 1.08);
    sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(.4, 'rgba(0,0,0,0)'); sh.addColorStop(.8, 'rgba(0,4,20,.55)'); sh.addColorStop(1, 'rgba(0,4,20,.9)');
    c.fillStyle = sh; c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    c.restore();
    c.globalCompositeOperation = 'lighter';
    var rim = c.createRadialGradient(cx, cy, r * .93, cx, cy, r * 1.04); rim.addColorStop(0, halo + '0)'); rim.addColorStop(.6, halo + '.5)'); rim.addColorStop(1, halo + '0)');
    c.fillStyle = rim; c.beginPath(); c.arc(cx, cy, r * 1.04, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
    if (anneaux) dessinerAnneaux(c, cx, cy, r, false);   // moitié avant de l'anneau, devant la planète
    c.restore();
  }
  function haloDe(m) { var c = rgb(m.couleurs[1]); return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ','; }

  /* ====================== Fonds : nébuleuse + étoiles ====================== */
  var neb = null, nebMonde = -1, stars = [];
  function creerNebuleuse(niv) {
    if (window.ASTRO_PREMIUM) return window.ASTRO_PREMIUM.nebuleuse(W, H, MONDES[Math.max(0, niv)].nebuleuse);
    var m = MONDES[Math.max(0, niv)], c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#03041a'); g.addColorStop(.5, '#080c30'); g.addColorStop(1, '#04051c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';
    for (var k = 0; k < 7; k++) {
      var col = m.nebuleuse[k % 2], bx = rnd(0, W), by = rnd(0, H), br = rnd(90, 220);
      for (var w = -1; w <= 1; w++) {
        var gr = x.createRadialGradient(bx, by + w * H, 0, bx, by + w * H, br); gr.addColorStop(0, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',.22)'); gr.addColorStop(.5, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',.07)'); gr.addColorStop(1, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0)');
        x.fillStyle = gr; x.fillRect(0, 0, W, H);
      }
    }
    return c;
  }
  function initEtoiles() {
    stars = [];
    [[70, .6, 12], [44, 1.05, 32], [24, 1.7, 64]].forEach(function (L, l) {
      for (var i = 0; i < L[0]; i++) stars.push({ big: l === 2 && i < 5, x: rnd(0, W), y: rnd(0, H), r: L[1] * rnd(.7, 1.25), v: L[2], l: l, tw: rnd(0, TAU), teinte: Math.random() < .2 ? '#ffd9a8' : Math.random() < .3 ? '#b8d4ff' : '#ffffff' });
    });
  }

  /* ====================== Dessins : fusée, monstres, gardien ====================== */
  function dessinerFusee(c, x, y, o) {
    if (window.ASTRO_PREMIUM) return window.ASTRO_PREMIUM.fusee(c, x, y, o);
    o = o || {}; var s = o.s || 1, fl = o.flamme == null ? 1 : o.flamme, T = o.t || 0;
    c.save(); c.translate(x, y); c.rotate(o.incl || 0); c.scale(s, s);
    if (o.bouclier) {   // bulle de protection
      var bg = c.createRadialGradient(0, -2, 10, 0, -2, 38); bg.addColorStop(0, 'rgba(77,225,255,0)'); bg.addColorStop(.8, 'rgba(77,225,255,.12)'); bg.addColorStop(1, 'rgba(120,240,255,.55)');
      c.fillStyle = bg; c.beginPath(); c.arc(0, -2, 38, 0, TAU); c.fill();
    }
    if (fl > 0) {   // flamme
      var L = 30 * fl * (.8 + Math.random() * .4); c.globalCompositeOperation = 'lighter';
      var g = c.createLinearGradient(0, 18, 0, 18 + L); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,225,110,.95)'); g.addColorStop(.65, 'rgba(255,110,30,.65)'); g.addColorStop(1, 'rgba(255,50,0,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-8, 18); c.quadraticCurveTo(-2, 18 + L * .7, 0, 18 + L * 1.15); c.quadraticCurveTo(2, 18 + L * .7, 8, 18); c.fill();
      var g2 = c.createLinearGradient(0, 18, 0, 18 + L * .6); g2.addColorStop(0, 'rgba(140,220,255,.9)'); g2.addColorStop(1, 'rgba(60,120,255,0)');
      c.fillStyle = g2; c.beginPath(); c.moveTo(-4, 18); c.quadraticCurveTo(0, 18 + L * .55, 4, 18); c.fill(); c.globalCompositeOperation = 'source-over';
    }
    if (o.pattes) { c.strokeStyle = '#9aa7bd'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-8, 14); c.lineTo(-17, 29); c.moveTo(8, 14); c.lineTo(17, 29); c.stroke(); c.fillStyle = '#6f7d96'; c.fillRect(-21, 28, 9, 3); c.fillRect(12, 28, 9, 3); }
    c.fillStyle = '#c92a2a'; c.beginPath(); c.moveTo(-8, 2); c.lineTo(-20, 24); c.quadraticCurveTo(-12, 21, -8, 17); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(8, 2); c.lineTo(20, 24); c.quadraticCurveTo(12, 21, 8, 17); c.closePath(); c.fill();
    c.fillStyle = '#e8503f'; c.beginPath(); c.moveTo(-8, 2); c.lineTo(-20, 24); c.lineTo(-15, 22); c.lineTo(-8, 8); c.closePath(); c.fill(); c.beginPath(); c.moveTo(8, 2); c.lineTo(20, 24); c.lineTo(15, 22); c.lineTo(8, 8); c.closePath(); c.fill();
    var bd = c.createLinearGradient(-10, 0, 10, 0); bd.addColorStop(0, '#9aa8c0'); bd.addColorStop(.35, '#ffffff'); bd.addColorStop(.7, '#dfe6f2'); bd.addColorStop(1, '#8794ac');
    c.fillStyle = bd; c.beginPath(); c.moveTo(0, -32); c.bezierCurveTo(11, -20, 11, 8, 9, 20); c.lineTo(-9, 20); c.bezierCurveTo(-11, 8, -11, -20, 0, -32); c.fill();
    c.save(); c.clip(); c.fillStyle = '#e03b3b'; c.beginPath(); c.moveTo(-12, -14); c.lineTo(12, -14); c.lineTo(12, -40); c.lineTo(-12, -40); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-7, -40, 3, 28); c.fillStyle = '#e03b3b'; c.fillRect(-12, 11, 24, 4); c.restore();
    c.fillStyle = '#55606f'; c.fillRect(-5, 19, 10, 4);
    var wg = c.createRadialGradient(-1.5, -7, 1, 0, -5, 6.5); wg.addColorStop(0, '#d6f3ff'); wg.addColorStop(.5, '#4fb3ff'); wg.addColorStop(1, '#144a8f');
    c.fillStyle = wg; c.strokeStyle = '#6f7f99'; c.lineWidth = 2; c.beginPath(); c.arc(0, -5, 5.6, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(-2, -7, 1.6, 0, TAU); c.fill();
    c.restore();
  }
  function dessinerBlob(c, e, t, px, py) {
    var r = e.r; c.save(); c.translate(e.x, e.y); var w = 1 + .07 * Math.sin(t * 6 + e.ph); c.scale(w, 1 / w);
    c.globalCompositeOperation = 'lighter'; var gl = c.createRadialGradient(0, 0, r * .3, 0, 0, r * 1.7); gl.addColorStop(0, 'rgba(110,255,120,.35)'); gl.addColorStop(1, 'rgba(110,255,120,0)'); c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 1.7, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    var bd = c.createRadialGradient(-r * .3, -r * .4, r * .1, 0, 0, r * 1.1); bd.addColorStop(0, '#d2ffb4'); bd.addColorStop(.5, '#46c94f'); bd.addColorStop(1, '#17702f');
    c.fillStyle = bd; c.beginPath(); for (var k = 0; k <= 16; k++) { var a = k / 16 * TAU, rr = r * (1 + .09 * Math.sin(k * 2.3 + t * 4 + e.ph)); c[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr * .92); } c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-r * .35, -r * .5, r * .28, r * .14, -.5, 0, TAU); c.fill();
    var ang = Math.atan2(py - e.y, px - e.x);
    [[-.38, -.12, .3], [.38, -.12, .3], [0, -.45, .2]].forEach(function (E) { c.fillStyle = '#fff'; c.beginPath(); c.arc(E[0] * r, E[1] * r, E[2] * r, 0, TAU); c.fill(); c.fillStyle = '#1b0f2e'; c.beginPath(); c.arc(E[0] * r + Math.cos(ang) * r * .1, E[1] * r + Math.sin(ang) * r * .1, E[2] * r * .5, 0, TAU); c.fill(); });
    c.strokeStyle = '#0e4a22'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-r * .3, r * .38); for (var z = 0; z < 5; z++) c.lineTo(-r * .3 + z * r * .15, r * (.38 + (z % 2 ? .12 : 0))); c.stroke();
    c.restore();
  }
  function dessinerPoulpe(c, e, t, px, py) {
    var r = e.r; c.save(); c.translate(e.x, e.y);
    c.globalCompositeOperation = 'lighter'; var gl = c.createRadialGradient(0, 0, r * .3, 0, 0, r * 1.8); gl.addColorStop(0, 'rgba(190,90,255,.35)'); gl.addColorStop(1, 'rgba(190,90,255,0)'); c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 1.8, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    c.lineCap = 'round'; for (var i = -2; i <= 2; i++) {
      c.strokeStyle = i % 2 ? '#7d2fc8' : '#9d4ee8'; c.lineWidth = 4.2 - Math.abs(i) * .5; c.beginPath(); c.moveTo(i * r * .28, r * .25);
      var y = r * .25; for (var s = 1; s <= 3; s++) { y += r * .32; c.quadraticCurveTo(i * r * .3 + Math.sin(t * 5 + i + s) * r * .34, y - r * .16, i * r * .3 + Math.sin(t * 5 + i + s + 1) * r * .22, y); } c.stroke();
    }
    var bd = c.createRadialGradient(-r * .3, -r * .5, r * .1, 0, -r * .1, r * 1.1); bd.addColorStop(0, '#e2b8ff'); bd.addColorStop(.5, '#a24df0'); bd.addColorStop(1, '#4a1a8c');
    c.fillStyle = bd; c.beginPath(); c.moveTo(-r, r * .3); c.bezierCurveTo(-r, -r * 1.25, r, -r * 1.25, r, r * .3); c.quadraticCurveTo(0, r * .5, -r, r * .3); c.fill();
    var ang = Math.atan2(py - e.y, px - e.x);
    [-1, 1].forEach(function (sg) { c.fillStyle = '#fff6a8'; c.beginPath(); c.ellipse(sg * r * .38, -r * .12, r * .24, r * .3, sg * .2, 0, TAU); c.fill(); c.fillStyle = '#2a0a4d'; c.beginPath(); c.arc(sg * r * .38 + Math.cos(ang) * 2.5, -r * .12 + Math.sin(ang) * 2.5, r * .13, 0, TAU); c.fill(); });
    c.restore();
  }
  function dessinerSoucoupe(c, e, t) {
    var r = e.r; c.save(); c.translate(e.x, e.y);
    c.globalCompositeOperation = 'lighter'; var gl = c.createRadialGradient(0, r * .2, r * .2, 0, r * .2, r * 1.6); gl.addColorStop(0, 'rgba(80,220,255,' + (.25 + (e.tir > .85 ? .4 : 0)) + ')'); gl.addColorStop(1, 'rgba(80,220,255,0)'); c.fillStyle = gl; c.beginPath(); c.arc(0, r * .2, r * 1.6, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    var dm = c.createRadialGradient(0, -r * .35, 2, 0, -r * .2, r * .7); dm.addColorStop(0, 'rgba(210,250,255,.85)'); dm.addColorStop(1, 'rgba(70,170,230,.55)');
    c.fillStyle = dm; c.beginPath(); c.arc(0, -r * .05, r * .6, Math.PI, TAU); c.fill();
    c.fillStyle = '#4fe07a'; c.beginPath(); c.arc(0, -r * .22, r * .2, 0, TAU); c.fill(); c.fillStyle = '#0a2a14'; c.beginPath(); c.arc(-r * .07, -r * .25, r * .05, 0, TAU); c.arc(r * .07, -r * .25, r * .05, 0, TAU); c.fill();
    var dk = c.createLinearGradient(0, -r * .2, 0, r * .45); dk.addColorStop(0, '#e6edf8'); dk.addColorStop(.5, '#9aa8c4'); dk.addColorStop(1, '#4b5878');
    c.fillStyle = dk; c.beginPath(); c.ellipse(0, r * .08, r, r * .36, 0, 0, TAU); c.fill();
    for (var i = -2; i <= 2; i++) { c.fillStyle = ((Math.floor(t * 4) + i) % 2) ? '#ffe566' : '#ff6bd5'; c.beginPath(); c.arc(i * r * .38, r * .12, 2.3, 0, TAU); c.fill(); }
    c.restore();
  }
  function dessinerPiquant(c, e, t, px, py) {
    var r = e.r; c.save(); c.translate(e.x, e.y); c.rotate(t * .8 + e.ph);
    c.globalCompositeOperation = 'lighter'; var gl = c.createRadialGradient(0, 0, r * .4, 0, 0, r * 1.8); gl.addColorStop(0, 'rgba(255,90,60,.4)'); gl.addColorStop(1, 'rgba(255,90,60,0)'); c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 1.8, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#8a1a14'; for (var i = 0; i < 10; i++) { var a = i / 10 * TAU; c.beginPath(); c.moveTo(Math.cos(a - .18) * r * .75, Math.sin(a - .18) * r * .75); c.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); c.lineTo(Math.cos(a + .18) * r * .75, Math.sin(a + .18) * r * .75); c.fill(); }
    var bd = c.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); bd.addColorStop(0, '#ffb066'); bd.addColorStop(.5, '#f0452c'); bd.addColorStop(1, '#8a1a14'); c.fillStyle = bd; c.beginPath(); c.arc(0, 0, r * .8, 0, TAU); c.fill();
    c.rotate(-(t * .8 + e.ph)); var ang = Math.atan2(py - e.y, px - e.x);
    [-1, 1].forEach(function (sg) { c.fillStyle = '#fff'; c.beginPath(); c.arc(sg * r * .3, -r * .08, r * .22, 0, TAU); c.fill(); c.fillStyle = '#300'; c.beginPath(); c.arc(sg * r * .3 + Math.cos(ang) * 2, -r * .08 + Math.sin(ang) * 2, r * .1, 0, TAU); c.fill(); c.strokeStyle = '#300'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(sg * r * .55, -r * .38); c.lineTo(sg * r * .08, -r * .22); c.stroke(); });
    c.restore();
  }
  var DESSIN = window.ASTRO_PREMIUM ? { blob: window.ASTRO_PREMIUM.drone, poulpe: window.ASTRO_PREMIUM.chasseur, soucoupe: window.ASTRO_PREMIUM.soucoupe, piquant: window.ASTRO_PREMIUM.mine } : { blob: dessinerBlob, poulpe: dessinerPoulpe, soucoupe: dessinerSoucoupe, piquant: dessinerPiquant };

  // Le gardien de la planète (grand, flottant, aura de la couleur du monde)
  function dessinerGardien(c, x, y, s, t, humeur, halo) {
    if (window.ASTRO_PREMIUM) return window.ASTRO_PREMIUM.gardien(c, x, y, s, t, humeur, halo);
    c.save(); c.translate(x, y + Math.sin(t * 2) * 4); c.scale(s, s);
    c.globalCompositeOperation = 'lighter'; var au = c.createRadialGradient(0, -10, 10, 0, -10, 95); au.addColorStop(0, halo + '.5)'); au.addColorStop(1, halo + '0)'); c.fillStyle = au; c.beginPath(); c.arc(0, -10, 95, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    var cp = c.createLinearGradient(0, 0, 0, 80); cp.addColorStop(0, '#3a2480'); cp.addColorStop(1, '#150a40'); c.fillStyle = cp;
    c.beginPath(); c.moveTo(-34, 5); c.bezierCurveTo(-52, 45, -46, 70, -40, 78); for (var i = 0; i <= 6; i++) c.lineTo(-40 + i * 13.3, 78 + (i % 2 ? 10 : 0) + Math.sin(t * 3 + i) * 3); c.bezierCurveTo(46, 70, 52, 45, 34, 5); c.fill();
    c.strokeStyle = '#ffd24d'; c.lineWidth = 2; c.beginPath(); c.moveTo(-34, 5); c.bezierCurveTo(-52, 45, -46, 70, -40, 78); c.moveTo(34, 5); c.bezierCurveTo(52, 45, 46, 70, 40, 78); c.stroke();
    c.strokeStyle = '#6a3ad0'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-26, -58); c.bezierCurveTo(-44, -78, -62, -66, -56, -90); c.moveTo(26, -58); c.bezierCurveTo(44, -78, 62, -66, 56, -90); c.stroke();
    c.strokeStyle = '#ffd24d'; c.lineWidth = 2; c.stroke();
    var hd = c.createRadialGradient(-10, -50, 4, 0, -30, 46); hd.addColorStop(0, '#d6f5d0'); hd.addColorStop(.6, '#7fc98a'); hd.addColorStop(1, '#2f7a52'); c.fillStyle = hd; c.beginPath(); c.ellipse(0, -30, 33, 39, 0, 0, TAU); c.fill();
    var ye = humeur === 'rire' ? 5 : 11; [-1, 1].forEach(function (sg) { c.fillStyle = '#12082e'; c.beginPath(); c.ellipse(sg * 14, -34, 9, ye, sg * .4, 0, TAU); c.fill(); c.globalCompositeOperation = 'lighter'; c.fillStyle = humeur === 'rire' ? '#ff4d6d' : '#ff5fd2'; c.beginPath(); c.arc(sg * 14, -34, 3.6, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; });
    c.fillStyle = '#12082e'; c.beginPath(); c.ellipse(0, -54, 5, 6, 0, 0, TAU); c.fill(); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#4de1ff'; c.beginPath(); c.arc(0, -54, 2.4, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    c.strokeStyle = '#12482e'; c.lineWidth = 2.4; c.beginPath(); if (humeur === 'rire') { c.fillStyle = '#7a1428'; c.ellipse(0, -9, 12, 8, 0, 0, TAU); c.fill(); c.stroke(); } else { c.arc(0, -14, 11, .2, Math.PI - .2); c.stroke(); }
    [-1, 1].forEach(function (sg) { var oy = Math.sin(t * 2.4 + sg) * 5; c.globalCompositeOperation = 'lighter'; var og = c.createRadialGradient(sg * 54, 26 + oy, 0, sg * 54, 26 + oy, 15); og.addColorStop(0, 'rgba(255,255,255,.95)'); og.addColorStop(.35, halo + '.8)'); og.addColorStop(1, halo + '0)'); c.fillStyle = og; c.beginPath(); c.arc(sg * 54, 26 + oy, 15, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; });
    c.restore();
  }

  function dessinerTour(c, x, y, t) {   // tour de lancement sur Terre
    c.save(); c.translate(x, y); c.fillStyle = '#1a2038'; c.fillRect(-4, -86, 8, 86); c.fillRect(-34, -2, 68, 4);
    c.strokeStyle = '#2d3a63'; c.lineWidth = 2; for (var i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-4, -i * 17); c.lineTo(4, -(i + 1) * 17); c.stroke(); }
    c.fillStyle = '#26305a'; c.fillRect(-4, -70, 22, 5); c.fillRect(-4, -46, 22, 5);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = (Math.floor(t * 2) % 2) ? '#ff4d6d' : '#661a2a'; c.beginPath(); c.arc(0, -90, 3, 0, TAU); c.fill(); c.restore();
  }

  /* ====================== État du jeu ====================== */
  var S = {
    mode: 'titre', t: 0, tm: 0, niveau: 0, score: 0, bouclier: 3, tue: 0, cible: 10, erreurs: 0,
    x: 180, y: 500, tx: 180, ty: 500, incl: 0, inv: 0, tirT: 0, spawnT: 0,
    balles: [], ennemis: [], tirsE: [], parts: [], textes: [], bonus: [],
    planete: { cy: -200, r: 92, vis: false, rot: 0 }, sol: { vis: false, y: 0 }, gardien: { vis: false, s: 0, humeur: '', sortie: 0 },
    shake: 0, warp: 1, defile: 0, tex: null, anneaux: false, essai: 1, questions: [], quizPret: false, rayon: 0, meilleur: Number(lsGet('astro_best', '0')) || 0
  };
  function monde() { return MONDES[S.niveau]; }

  /* ====================== Particules et effets ====================== */
  function addPart(p) { if (S.parts.length > 420) S.parts.shift(); S.parts.push(p); }
  function fumee(x, y, n, gros) { for (var i = 0; i < n; i++) addPart({ k: 'fum', x: x + rnd(-6, 6), y: y, vx: rnd(-40, 40), vy: rnd(-10, 50) * (gros ? 1 : .5), r: rnd(6, 14) * (gros ? 1.5 : 1), vr: rnd(14, 30), vie: rnd(.7, 1.4), max: 1.4, a: gros ? .55 : .35 }); }
  function explosion(x, y, taille, teinte) {
    var n = Math.round(16 * taille);
    for (var i = 0; i < n; i++) { var a = rnd(0, TAU), v = rnd(30, 190) * taille; addPart({ k: 'feu', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rnd(3, 9) * taille, vie: rnd(.3, .7), max: .7, c: teinte || [255, 160, 50] }); }
    for (var j = 0; j < 10 * taille; j++) { var b = rnd(0, TAU), w = rnd(120, 300) * taille; addPart({ k: 'etin', x: x, y: y, vx: Math.cos(b) * w, vy: Math.sin(b) * w, r: 1.8, vie: rnd(.25, .6), max: .6, c: [255, 240, 180] }); }
    addPart({ k: 'anneau', x: x, y: y, r: 4, vr: 220 * taille, vie: .35, max: .35, c: teinte || [255, 190, 90] });
    addPart({ k: 'flash', x: x, y: y, r: 34 * taille, vie: .14, max: .14 });
    fumee(x, y, Math.round(4 * taille), false);
    if (!REDUIT) S.shake = Math.max(S.shake, 3 * taille);
  }
  function texteFlottant(x, y, txt, col) { S.textes.push({ x: x, y: y, txt: txt, vie: .9, col: col || '#ffe566' }); }
  function annoncer(html) { var a = $('annonce'); a.innerHTML = html; a.classList.remove('go'); void a.offsetWidth; a.classList.add('go'); }
  function flashRouge() { var f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

  /* ====================== Ennemis ====================== */
  function typesDispo() { var n = S.niveau; var t = ['blob']; if (n >= 1) t.push('poulpe'); if (n >= 2) t.push('soucoupe'); if (n >= 3) t.push('piquant'); return t; }
  function creerEnnemi() {
    var type = typesDispo()[Math.floor(Math.random() * typesDispo().length)], v = 52 + S.niveau * 6, e = { type: type, ph: rnd(0, TAU), x: rnd(30, W - 30), y: -30, vx: 0, vy: v, hp: 1, r: 17, pts: 10, tir: rnd(.3, 1), hit: 0, t: 0, ox: 0 };
    if (type === 'blob') { e.r = 17; e.hp = S.niveau >= 4 ? 2 : 1; e.vy = v * rnd(.9, 1.2); e.amp = rnd(25, 55); e.ox = e.x; }
    if (type === 'poulpe') { e.r = 19; e.hp = 2; e.pts = 20; e.vy = v * 1.15; }
    if (type === 'soucoupe') { e.r = 22; e.hp = 2; e.pts = 30; e.y = rnd(50, 170); e.x = Math.random() < .5 ? -30 : W + 30; e.vx = (e.x < 0 ? 1 : -1) * rnd(55, 90); e.vy = 0; e.dure = 9; }
    if (type === 'piquant') { e.r = 21; e.hp = 3; e.pts = 40; e.vy = v * .8; e.amp = 18; e.ox = e.x; }
    S.ennemis.push(e);
  }
  function tuerEnnemi(e) {
    S.ennemis.splice(S.ennemis.indexOf(e), 1); S.tue++; S.score += e.pts; texteFlottant(e.x, e.y - 10, '+' + e.pts);
    explosion(e.x, e.y, e.r > 20 ? 1.35 : 1, e.type === 'blob' ? [120, 255, 120] : e.type === 'poulpe' ? [200, 110, 255] : e.type === 'soucoupe' ? [110, 220, 255] : [255, 120, 70]); AU.boum(false); vibre(12);
    if (S.bouclier < 3 && Math.random() < .07) S.bonus.push({ x: e.x, y: e.y, vy: 60 });
    majHud();
  }
  function toucherJoueur() {
    if (S.inv > 0 || S.mode !== 'vol') return; S.inv = 1.4; S.bouclier--; AU.touche(); vibre(60); flashRouge(); if (!REDUIT) S.shake = 7;
    explosion(S.x, S.y - 6, .7, [90, 220, 255]); majHud();
    if (S.bouclier <= 0) reparation();
  }
  function reparation() {
    S.mode = 'repar'; S.tm = 0; explosion(S.x, S.y, 2.2); AU.boum(true); S.ennemis.length = 0; S.tirsE.length = 0; S.balles.length = 0;
    annoncer('RÉPARATION<small>Bouclier détruit : le niveau recommence</small>'); S.score = Math.max(0, S.score - 50); majHud();
  }

  /* ====================== Interface (HUD) ====================== */
  function majHud() {
    $('hScore').textContent = S.score; $('hNiv').innerHTML = 'NIVEAU ' + (S.niveau + 1) + ' · ' + monde().planete.toUpperCase();
    var b = $('boucl').children; for (var i = 0; i < 3; i++) b[i].className = i < S.bouclier ? '' : 'off';
    $('prog').firstElementChild.style.width = Math.min(100, S.tue / S.cible * 100) + '%';
  }
  function montrer(id) { ['titre', 'regles', 'quiz', 'pose', 'fin', 'gagne', 'pauseE'].forEach(function (k) { $(k).classList.toggle('on', k === id); }); }
  function hud(on) { $('hud').classList.toggle('on', on); $('btns').classList.toggle('on', on); }

  /* ====================== Déroulé d'une partie ====================== */
  function nouvellePartie() {
    AU.init(); S.niveau = 0; S.score = 0; S.erreurs = 0; S.bouclier = 3; S.warp = 1; S.balles.length = S.ennemis.length = S.tirsE.length = S.parts.length = S.textes.length = S.bonus.length = 0;
    S.x = S.tx = W / 2; S.y = S.ty = H - 150; S.planete.vis = false; S.gardien.vis = false; S.tex = TERRE; S.anneaux = false;
    preparerFond(0); majHud(); hud(false); montrer(null);
    S.mode = 'lancement'; S.tm = 0; S.sol = { vis: true, y: H - 122, tex: TERRE, halo: 'rgba(90,170,255,', anneaux: false }; S.compte = 0;
  }
  function preparerFond(niv) { neb = creerNebuleuse(niv); nebMonde = niv; fondsAJour = true; }
  function debutNiveau() {
    var n = S.niveau; S.cible = RAPIDE ? 2 : 8 + n * 3; S.tue = 0; S.bouclier = 3; S.inv = 1.5; S.spawnT = 1; S.planete.vis = false; S.gardien.vis = false; S.gardien.humeur = ''; S.gardien.sortie = 0; S.sol.vis = false;
    S.ennemis.length = 0; S.tirsE.length = 0; S.warp = 1; S.mode = 'vol'; S.tm = 0; preparerFond(n); majHud(); hud(true);
    annoncer('NIVEAU ' + (n + 1) + '<small>' + monde().planete.toUpperCase() + '</small>');
  }
  function arrivee() {
    S.mode = 'arrivee'; S.tm = 0; S.planete.vis = true; S.planete.vdec = 0; S.planete.cy = -140; S.planete.r = monde().type === 'bandes' || monde().type === 'anneaux' ? 104 : 90;
    S.tex = TEX[S.niveau]; S.anneaux = monde().type === 'anneaux'; S.tirsE.length = 0; S.gardien.vis = true; S.gardien.s = 0; annoncer('PLANÈTE EN VUE !<small>' + monde().planete.toUpperCase() + '</small>');
  }
  function ouvrirQuiz() {
    S.mode = 'gardien'; S.tm = 0; S.gardien.vis = true; S.gardien.s = 0; S.gardien.humeur = ''; var ord = shuffle([0, 1, 2]); S.questions = [monde().questions[ord[0]], monde().questions[ord[1]]]; S.essai = 1;
    poserQuestion(); hud(true);
  }
  function poserQuestion() {
    var q = S.questions[S.essai - 1], m = monde(); $('qGard').textContent = m.gardien; $('qChance').textContent = S.essai === 1 ? 'Question 1 sur 2' : 'Seconde chance'; $('qtxt').textContent = q.q;
    var opts = shuffle([{ t: q.ok, b: true }].concat(q.faux.map(function (f) { return { t: f, b: false }; }))), box = $('qrep'); box.innerHTML = '';
    opts.forEach(function (o, i) { var b = document.createElement('button'); b.className = 'rep'; b.type = 'button'; b.innerHTML = '<b>' + 'ABCD'.charAt(i) + '</b><span></span>'; b.lastChild.textContent = o.t; b.dataset.bon = o.b ? '1' : '0'; b.addEventListener('click', function () { repondre(b); }); box.appendChild(b); });
    $('msg').textContent = ''; $('msg').className = ''; montrer('quiz');
    requestAnimationFrame(function () { var r = $('quiz').querySelector('.carte').getBoundingClientRect(); S.panneauHaut = (r.top - jeu.getBoundingClientRect().top) / CSSH * H; S.ty = clamp(S.panneauHaut - 60, 150, H - 170); S.tx = W / 2; });
  }
  function repondre(btn) {
    var q = S.questions[S.essai - 1], bons = Array.prototype.slice.call($('qrep').children); bons.forEach(function (b) { b.disabled = true; }); AU.init(); var ok = btn.dataset.bon === '1';
    if (ok) {
      btn.classList.add('bon'); $('msg').className = 'ok'; $('msg').textContent = 'Bonne réponse'; AU.bon(); S.score += S.essai === 1 ? 100 : 50; majHud(); S.gardien.humeur = 'salut';
      for (var i = 0; i < 24; i++) addPart({ k: 'etin', x: W / 2 + rnd(-40, 40), y: 210, vx: rnd(-120, 120), vy: rnd(-160, 20), r: 2.2, vie: rnd(.5, 1), max: 1, c: [255, 230, 120] });
      setTimeout(atterrir, 1250);
    } else {
      btn.classList.add('mauvais'); bons.forEach(function (b) { if (b.dataset.bon === '1') b.classList.add('revele'); }); S.erreurs++; AU.mauvais(); vibre(120); flashRouge(); if (!REDUIT) S.shake = 8; S.gardien.humeur = 'rire';
      $('msg').className = 'ko'; $('msg').textContent = 'Mauvaise réponse. La bonne réponse était : ' + q.ok;
      if (S.essai === 1) setTimeout(function () { S.essai = 2; S.gardien.humeur = ''; poserQuestion(); }, 2300);
      else setTimeout(perdu, 2300);
    }
  }
  function atterrir() {
    montrer(null); hud(true); S.mode = 'atterrissage'; S.tm = 0; S.gardien.sortie = 1; S.ty = S.y; AU.pose(); S.sol.tex = TEX[S.niveau]; S.sol.halo = haloDe(monde()); S.sol.anneaux = false;
    S.p0 = { cy: S.planete.cy, r: S.planete.r, y: S.y };
  }
  function pose() {
    var etoiles = S.essai === 1 ? (S.bouclier >= 2 ? 3 : 2) : 1; S.score += S.bouclier * 20; majHud(); S.derniereEtoiles = etoiles;
    $('pPlan').textContent = monde().planete.toUpperCase(); $('pEtoiles').innerHTML = [1, 2, 3].map(function (i) { return '<i class="' + (i <= etoiles ? '' : 'vide') + '" style="animation-delay:' + (i * .18) + 's">' + STAR_SVG + '</i>'; }).join('');
    $('pScore').textContent = S.score; $('pFait').textContent = monde().fait; $('bSuite').textContent = S.niveau === MONDES.length - 1 ? 'TERMINER LA MISSION' : 'DÉCOLLER VERS ' + MONDES[S.niveau + 1].planete.toUpperCase();
    montrer('pose'); S.mode = 'pose'; hud(false);
  }
  function suite() {
    AU.init(); AU.clic();
    if (S.niveau === MONDES.length - 1) return victoire();
    S.niveau++; montrer(null); S.mode = 'decollage'; S.tm = 0; AU.decolle(); S.planete.vis = false; hud(true); majHud(); preparerFond(S.niveau);
  }
  function perdu() {
    montrer(null); hud(false); S.mode = 'fin'; S.tm = 0; S.rayon = 0; AU.mauvais();
  }
  function sauveScore() { var nouveau = S.score > S.meilleur; if (nouveau) { S.meilleur = S.score; lsSet('astro_best', String(S.score)); } return nouveau; }
  function afficherGameOver() {
    S.gardien.vis = false; var nouveau = sauveScore(); $('fScore').textContent = S.score; $('fBest').innerHTML = nouveau ? '<span class="nouv">NOUVEAU RECORD !</span>' : 'Meilleur score : <b>' + S.meilleur + '</b>';
    $('fMsg').textContent = 'Le gardien de ' + monde().planete + ' t\'a barré la route au niveau ' + (S.niveau + 1) + '.';
    var q1 = S.questions[0], q2 = S.questions[1]; $('fCorrection').innerHTML = '<b>Pour progresser :</b><br>• ' + q1.q + ' → <b>' + q1.ok + '</b><br>• ' + q2.q + ' → <b>' + q2.ok + '</b>'; montrer('fin');
  }
  function victoire() {
    montrer(null); hud(false); S.mode = 'gagne'; S.tm = 0; S.planete.vis = false; S.sol.vis = false; preparerFond(7); var nouveau = sauveScore(); var et = S.erreurs === 0 ? 3 : S.erreurs <= 2 ? 2 : 1;
    $('gEtoiles').innerHTML = [1, 2, 3].map(function (i) { return '<i class="' + (i <= et ? '' : 'vide') + '" style="animation-delay:' + (i * .2) + 's">' + STAR_SVG + '</i>'; }).join(''); $('gScore').textContent = S.score;
    $('gBest').innerHTML = nouveau ? '<span class="nouv">NOUVEAU RECORD !</span>' : 'Meilleur score : <b>' + S.meilleur + '</b>'; S.x = S.tx = W / 2; S.y = H - 150; AU.bon();
    setTimeout(function () { if (S.mode === 'gagne') montrer('gagne'); }, 900);
  }
  function versTitre() { S.mode = 'titre'; hud(false); montrer('titre'); $('best').textContent = S.meilleur; S.sol.vis = false; S.planete.vis = false; S.gardien.vis = false; S.x = S.tx = W / 2; S.y = S.ty = H - 150; S.ennemis.length = S.tirsE.length = S.balles.length = 0; preparerFond(4); }

  /* ====================== Mise à jour (physique du jeu) ====================== */
  var clavier = {}, glisse = null;
  function tirer() {
    var n = S.niveau; var cx = S.x, y = S.y - 28;
    function b(dx, vx) { S.balles.push({ x: cx + dx, y: y, vx: vx || 0, vy: -560 }); }
    if (n < 2) b(0); else if (n < 5) { b(-7); b(7); } else { b(0); b(-10, -45); b(10, 45); }
    AU.laser();
  }
  function majEtoiles(dt, mult) { for (var i = 0; i < stars.length; i++) { var s = stars[i]; s.y += s.v * dt * mult; if (s.y > H + 4) { s.y = -4; s.x = rnd(0, W); } } S.defile = (S.defile + 22 * dt * mult) % H; }
  function majParticules(dt) {
    for (var i = S.parts.length - 1; i >= 0; i--) {
      var p = S.parts[i]; p.vie -= dt; if (p.vie <= 0) { S.parts.splice(i, 1); continue; }
      if (p.k === 'anneau') { p.r += p.vr * dt; continue; } if (p.k === 'flash') continue;
      p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'fum') { p.r += p.vr * dt; p.vx *= .98; } else { p.vx *= .985; p.vy *= .985; }
    }
    for (var j = S.textes.length - 1; j >= 0; j--) { var t = S.textes[j]; t.vie -= dt; t.y -= 34 * dt; if (t.vie <= 0) S.textes.splice(j, 1); }
  }
  function flammeFusee(dt, force) { if (Math.random() < 28 * dt * (force || 1)) addPart({ k: 'feu', x: S.x + rnd(-3, 3), y: S.y + 24, vx: rnd(-14, 14), vy: rnd(90, 190), r: rnd(2.5, 5), vie: rnd(.18, .38), max: .38, c: [255, 170, 70] }); }

  function majVol(dt) {
    // déplacement
    var kx = (clavier.ArrowRight || clavier.d ? 1 : 0) - (clavier.ArrowLeft || clavier.q || clavier.a ? 1 : 0), ky = (clavier.ArrowDown || clavier.s ? 1 : 0) - (clavier.ArrowUp || clavier.z || clavier.w ? 1 : 0);
    if (kx || ky) { S.tx = clamp(S.tx + kx * 330 * dt, 22, W - 22); S.ty = clamp(S.ty + ky * 330 * dt, 90, H - 60); }
    var ox = S.x; S.x += (S.tx - S.x) * Math.min(1, dt * 14); S.y += (S.ty - S.y) * Math.min(1, dt * 14); S.incl = lerp(S.incl, clamp((S.x - ox) * .09, -.38, .38), Math.min(1, dt * 10));
    if (S.inv > 0) S.inv -= dt;
    // tirs du joueur
    S.tirT -= dt; if (S.tirT <= 0 && (S.mode === 'vol' || S.mode === 'arrivee')) { S.tirT = .17; tirer(); }
    // apparition des ennemis
    if (S.mode === 'vol') { S.spawnT -= dt; if (S.spawnT <= 0) { creerEnnemi(); S.spawnT = Math.max(.5, 1.25 - S.niveau * .07) * rnd(.8, 1.2); } if (S.tue >= S.cible) arrivee(); }
    var i, j;
    for (i = S.balles.length - 1; i >= 0; i--) { var b = S.balles[i]; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y < -20) S.balles.splice(i, 1); }
    for (i = S.ennemis.length - 1; i >= 0; i--) {
      var e = S.ennemis[i]; e.t += dt; if (e.hit > 0) e.hit -= dt;
      if (e.type === 'blob' || e.type === 'piquant') { e.y += e.vy * dt; e.x = e.ox + Math.sin(e.t * 2 + e.ph) * e.amp; }
      else if (e.type === 'poulpe') { e.y += e.vy * dt; e.x += clamp((S.x - e.x) * .6, -55, 55) * dt; }
      else if (e.type === 'soucoupe') { e.x += e.vx * dt; e.y += Math.sin(e.t * 2) * 12 * dt; e.dure -= dt; e.tir -= dt; if (e.tir < 0 && e.y < H - 200 && S.mode === 'vol') { e.tir = rnd(1.5, 2.4); var dx = S.x - e.x, dy = S.y - e.y, d = Math.hypot(dx, dy) || 1, v = 150 + S.niveau * 8; S.tirsE.push({ x: e.x, y: e.y + 10, vx: dx / d * v, vy: dy / d * v }); } if (e.dure < 0 && (e.x < -40 || e.x > W + 40)) { S.ennemis.splice(i, 1); continue; } if (e.x < -60 || e.x > W + 60) e.vx = -e.vx; }
      if (e.y > H + 40) { S.ennemis.splice(i, 1); continue; }
      for (j = S.balles.length - 1; j >= 0; j--) { var bb = S.balles[j]; if (Math.abs(bb.x - e.x) < e.r + 3 && Math.abs(bb.y - e.y) < e.r + 8) { S.balles.splice(j, 1); e.hp--; e.hit = .1; if (e.hp <= 0) { tuerEnnemi(e); e = null; break; } else { addPart({ k: 'etin', x: bb.x, y: bb.y, vx: rnd(-70, 70), vy: rnd(-70, 20), r: 1.6, vie: .25, max: .25, c: [255, 255, 200] }); AU.ton(300, .05, 'square', .03); } } }
      if (e && S.inv <= 0 && Math.hypot(e.x - S.x, e.y - S.y) < e.r + 11) { S.ennemis.splice(S.ennemis.indexOf(e), 1); explosion(e.x, e.y, 1); toucherJoueur(); if (S.mode === 'repar') return; }
    }
    for (i = S.tirsE.length - 1; i >= 0; i--) { var t = S.tirsE[i]; t.x += t.vx * dt; t.y += t.vy * dt; if (t.y > H + 20 || t.y < -20 || t.x < -20 || t.x > W + 20) { S.tirsE.splice(i, 1); continue; } if (S.inv <= 0 && Math.hypot(t.x - S.x, t.y - S.y) < 14) { S.tirsE.splice(i, 1); toucherJoueur(); if (S.mode === 'repar') return; } }
    for (i = S.bonus.length - 1; i >= 0; i--) { var bo = S.bonus[i]; bo.y += bo.vy * dt; if (bo.y > H + 20) { S.bonus.splice(i, 1); continue; } if (Math.hypot(bo.x - S.x, bo.y - S.y) < 26) { S.bonus.splice(i, 1); if (S.bouclier < 3) S.bouclier++; AU.bouclier(); texteFlottant(S.x, S.y - 30, '+1 bouclier', '#8fe9ff'); majHud(); } }
  }

  function majPlanete(dt) { S.planete.rot += dt * .018; }

  function mettreAJour(dt) {
    S.t += dt; S.tm += dt; S.planete.rot += dt * .02; if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 14);
    var m = S.mode;
    if (m === 'titre') { majEtoiles(dt, .8); flammeFusee(dt, .7); S.y = H - 150 + Math.sin(S.t * 2) * 4; majParticules(dt); return; }
    if (m === 'lancement') {
      var t = S.tm; var chiffres = [[.3, '3'], [1.15, '2'], [2, '1'], [2.85, 'DÉCOLLAGE !']]; if (S.compte < chiffres.length && t >= chiffres[S.compte][0]) { annoncer(chiffres[S.compte][1]); AU.ton(S.compte === 3 ? 880 : 520, .18, 'square', .05); S.compte++; }
      var p = clamp((t - 3.1) / 3, 0, 1); S.warp = 1 + p * p * 9; S.sol.y = H - 122 + p * p * (H + 260);
      if (t > 2.2 && t < 5) { fumee(S.x, S.sol.y - 4, 2, true); if (Math.random() < .5) fumee(S.x + rnd(-30, 30), S.sol.y - 4, 1, true); }
      if (t > 3.1) { flammeFusee(dt, 2.6); if (!REDUIT) S.shake = Math.max(S.shake, (1 - p) * 3 + .6); if (t < 3.15) AU.decolle(); }
      S.y = H - 150 - (t > 3.1 ? Math.sin(t * 40) * (1 - p) * 1.5 : 0); majEtoiles(dt, S.warp); majParticules(dt);
      if (t >= 6.1) { S.sol.vis = false; S.warp = 1; debutNiveau(); } return;
    }
    if (m === 'decollage') {
      var p2 = clamp(S.tm / 2.4, 0, 1); S.warp = 1 + p2 * p2 * 8; S.sol.y = H - 122 + p2 * p2 * (H + 400); S.x = S.tx = W / 2; S.y = H - 150; flammeFusee(dt, 2.4); if (S.tm < 1.2) fumee(S.x, S.sol.y - 4, 2, true);
      if (!REDUIT) S.shake = Math.max(S.shake, (1 - p2) * 2.5); majEtoiles(dt, S.warp); majParticules(dt); if (S.tm >= 2.6) { S.sol.vis = false; debutNiveau(); } return;
    }
    if (m === 'vol' || m === 'arrivee') {
      majEtoiles(dt, 1); majVol(dt); flammeFusee(dt, 1); majParticules(dt);
      if (m === 'arrivee') {
        var pa = ease(S.tm / 2.8); S.planete.cy = lerp(-140, 128, pa); S.gardien.s = clamp((S.tm - 2.2) / .8, 0, 1);
        S.tx = lerp(S.tx, W / 2, Math.min(1, dt * 1.5)); S.ty = lerp(S.ty, H - 170, Math.min(1, dt * 1.5));
        if (S.tm > 3.1) { S.balles.length = 0; S.ennemis.forEach(function (e) { explosion(e.x, e.y, .8); }); S.ennemis.length = 0; ouvrirQuiz(); }
      } else if (!S.planete.vis) majPlanete(dt);
      return;
    }
    if (m === 'repar') { majEtoiles(dt, 1); majParticules(dt); if (S.tm > 1.6) { S.bouclier = 3; S.tue = 0; debutNiveau(); } return; }
    if (m === 'gardien') {
      majEtoiles(dt, .35); majParticules(dt); S.x += (S.tx - S.x) * Math.min(1, dt * 4); S.y += (S.ty - S.y + Math.sin(S.t * 2) * 3) * Math.min(1, dt * 4); S.incl = lerp(S.incl, 0, dt * 6); flammeFusee(dt, .5); S.gardien.s = lerp(S.gardien.s, 1, dt * 5); return;
    }
    if (m === 'atterrissage') {
      var T = S.tm, pp = ease(T / 2.6), P = monde();
      S.planete.cy = lerp(S.p0.cy, H + 398, pp); S.planete.r = lerp(S.p0.r, 520, pp); S.planete.vdec = lerp(0, .42, pp); S.gardien.s = lerp(S.gardien.s, 0, dt * 6); majEtoiles(dt, lerp(.35, 0, pp)); S.x += (W / 2 - S.x) * Math.min(1, dt * 3);
      var yFin = H - 150; S.y = lerp(S.p0.y, yFin - 30, pp) ; if (T > 2.6) { S.y = lerp(S.y, yFin, Math.min(1, (T - 2.6) * 2.5)); }
      flammeFusee(dt, T < 2.9 ? 1.4 : .3); if (T > 2.5 && T < 3.3 && Math.random() < .8) fumee(S.x + rnd(-24, 24), H - 118, 1, true);
      if (T > 2.9 && !S.posee) { S.posee = true; if (!REDUIT) S.shake = 4; for (var k = 0; k < 18; k++) fumee(S.x + rnd(-30, 30), H - 118, 1, true); }
      majParticules(dt);
      if (T > 3.9) { S.posee = false; S.planete.vis = false; S.sol.vis = true; S.sol.y = H - 122; S.sol.tex = TEX[S.niveau]; S.sol.halo = haloDe(P); S.sol.anneaux = false; pose(); } return;
    }
    if (m === 'pose') { majEtoiles(dt, 0); majParticules(dt); return; }
    if (m === 'fin') {
      var T2 = S.tm; majEtoiles(dt, .3); majParticules(dt); S.rayon = clamp((T2 - .4) / .5, 0, 1);
      if (T2 > .9 && !S.boum) { S.boum = true; explosion(S.x, S.y, 3, [255, 80, 60]); AU.boum(true); vibre(200); flashRouge(); }
      if (T2 > 2.2) { S.boum = false; afficherGameOver(); S.mode = 'finattente'; } return;
    }
    if (m === 'finattente') { majEtoiles(dt, .2); majParticules(dt); return; }
    if (m === 'gagne') {
      majEtoiles(dt, 2); majParticules(dt); S.y -= 0; flammeFusee(dt, 2);
      if (Math.random() < 6 * dt) { var fx = rnd(40, W - 40), fy = rnd(80, H * .5), cc = [[255, 120, 120], [120, 255, 160], [120, 200, 255], [255, 230, 120], [255, 140, 240]][Math.floor(rnd(0, 5))]; for (var q = 0; q < 26; q++) { var a = rnd(0, TAU), v = rnd(50, 150); addPart({ k: 'feu', x: fx, y: fy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rnd(2, 4), vie: rnd(.7, 1.3), max: 1.3, c: cc }); } AU.ton(rnd(500, 900), .1, 'triangle', .03); } return;
    }
    if (m === 'pause') return;
  }

  /* ====================== Dessin ====================== */
  function dessiner() {
    if (!fondsAJour) { if (nebMonde < 0) nebMonde = 0; neb = creerNebuleuse(nebMonde); fondsAJour = true; }
    var c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cvs.width, cvs.height); c.setTransform(SC, 0, 0, SC, 0, 0);
    if (S.shake > 0 && !REDUIT) c.translate(rnd(-S.shake, S.shake), rnd(-S.shake, S.shake));
    // fond
    c.drawImage(neb, 0, S.defile % H, W, H); c.drawImage(neb, 0, (S.defile % H) - H, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], al = .55 + .45 * Math.sin(S.t * 2 + s.tw), len = S.warp > 1.6 ? s.r * (1 + (S.warp - 1) * (s.l + .4) * 2.2) : 0;
      if (s.big && !len && window.ASTRO_PREMIUM) { window.ASTRO_PREMIUM.etoileBrillante(c, s.x, s.y, s.r * 1.4, al, s.teinte); continue; }
      c.globalAlpha = al; c.fillStyle = s.teinte; if (len) c.fillRect(s.x - s.r / 2, s.y - len, s.r, len + s.r); else { c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;
    if (S.mode === 'titre') dessinerDecorTitre(c);
    if (S.planete.vis) { var P = monde(); dessinerPlanete(c, S.tex, W / 2, S.planete.cy, S.planete.r, S.planete.rot, haloDe(P), S.anneaux && S.mode !== 'atterrissage', S.planete.vdec); }
    if (S.sol.vis) { dessinerPlanete(c, S.sol.tex, W / 2, S.sol.y + 520, 520, S.planete.rot, S.sol.halo, false, S.sol.tex === TERRE ? .46 : .42); if (S.mode === 'lancement' || (S.sol.tex === TERRE)) dessinerTour(c, W / 2 + 58, S.sol.y + 2, S.t); }
    if (S.gardien.vis && S.gardien.s > .02) { var m = monde(); dessinerGardien(c, W / 2, 232, .72 * ease(S.gardien.s) * (S.mode === 'gardien' && S.gardien.humeur === 'rire' ? 1 + Math.sin(S.t * 30) * .03 : 1), S.t, S.gardien.humeur, haloDe(m)); }
    // bonus
    S.bonus.forEach(function (b) { c.globalCompositeOperation = 'lighter'; var g = c.createRadialGradient(b.x, b.y, 2, b.x, b.y, 20); g.addColorStop(0, 'rgba(180,250,255,1)'); g.addColorStop(1, 'rgba(60,180,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, 20, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(b.x - 6, b.y); c.lineTo(b.x + 6, b.y); c.moveTo(b.x, b.y - 6); c.lineTo(b.x, b.y + 6); c.stroke(); });
    // ennemis
    S.ennemis.forEach(function (e) { DESSIN[e.type](c, e, S.t, S.x, S.y); if (e.hit > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,255,255,' + (e.hit * 6) + ')'; c.beginPath(); c.arc(e.x, e.y, e.r, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; } });
    // tirs ennemis
    S.tirsE.forEach(function (t) { c.globalCompositeOperation = 'lighter'; var g = c.createRadialGradient(t.x, t.y, 0, t.x, t.y, 11); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,90,120,.9)'); g.addColorStop(1, 'rgba(255,40,80,0)'); c.fillStyle = g; c.beginPath(); c.arc(t.x, t.y, 11, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; });
    // particules (fumée dessous, feu additif dessus)
    S.parts.forEach(function (p) { if (p.k !== 'fum') return; var a = p.a * (p.vie / p.max); c.fillStyle = 'rgba(190,200,220,' + a + ')'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); });
    // fusée
    var vis = S.mode !== 'fin' || !S.boum, hors = S.mode === 'pose' || S.mode === 'finattente' || S.mode === 'repar';
    if (vis && S.mode !== 'finattente' && S.mode !== 'repar') {
      var clign = S.inv > 0 && S.mode === 'vol' && Math.floor(S.t * 14) % 2; if (!clign) {
        var fl = S.mode === 'pose' ? 0 : (S.mode === 'atterrissage' ? (S.tm > 2.9 ? .15 : 1.1) : (S.mode === 'lancement' && S.tm < 3.1 ? 0 : 1)); var pattes = S.mode === 'pose' || (S.mode === 'atterrissage' && S.tm > 1.8) || (S.mode === 'lancement' && S.tm < 3.5) || (S.mode === 'decollage' && S.tm < 1.0);
        dessinerFusee(c, S.x, S.y, { incl: S.incl, flamme: fl, bouclier: S.inv > 0 && S.mode === 'vol', pattes: pattes, t: S.t });
      }
    }
    if (S.mode === 'fin' && S.rayon > 0) { c.globalCompositeOperation = 'lighter'; var gx = W / 2, gy = 250; var gr = c.createLinearGradient(gx, gy, S.x, S.y); gr.addColorStop(0, 'rgba(255,60,90,.95)'); gr.addColorStop(1, 'rgba(255,200,200,.9)'); c.strokeStyle = gr; c.lineWidth = 7 * S.rayon + Math.random() * 3; c.beginPath(); c.moveTo(gx, gy); c.lineTo(lerp(gx, S.x, S.rayon), lerp(gy, S.y, S.rayon)); c.stroke(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke(); c.globalCompositeOperation = 'source-over'; }
    // tirs du joueur
    c.globalCompositeOperation = 'lighter';
    S.balles.forEach(function (b) { var g = c.createLinearGradient(b.x, b.y - 14, b.x, b.y + 10); g.addColorStop(0, 'rgba(120,240,255,0)'); g.addColorStop(.5, 'rgba(160,250,255,1)'); g.addColorStop(1, 'rgba(255,255,255,.9)'); c.strokeStyle = g; c.lineWidth = 4.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(b.x, b.y - 14); c.lineTo(b.x, b.y + 8); c.stroke(); c.strokeStyle = 'rgba(77,225,255,.28)'; c.lineWidth = 9; c.stroke(); });
    S.parts.forEach(function (p) {
      if (p.k === 'fum') return; var f = p.vie / p.max;
      if (p.k === 'feu') { var col = p.c, g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2 * (.5 + f)); g.addColorStop(0, 'rgba(255,255,230,' + f + ')'); g.addColorStop(.4, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + f * .8 + ')'); g.addColorStop(1, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0)'); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r * 2.2 * (.5 + f), 0, TAU); c.fill(); }
      else if (p.k === 'etin') { c.fillStyle = 'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',' + f + ')'; c.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r * 1.6, p.r * 1.6); }
      else if (p.k === 'anneau') { c.strokeStyle = 'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',' + f * .8 + ')'; c.lineWidth = 3 * f + 1; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.stroke(); }
      else if (p.k === 'flash') { var gf = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); gf.addColorStop(0, 'rgba(255,255,255,' + f + ')'); gf.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gf; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
    });
    c.globalCompositeOperation = 'source-over';
    // textes flottants
    c.font = '700 14px "JetBrains Mono","Inter Display",system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,30,.8)';
    S.textes.forEach(function (t) { c.globalAlpha = clamp(t.vie * 2, 0, 1); c.fillStyle = t.col; c.strokeText(t.txt, t.x, t.y); c.fillText(t.txt, t.x, t.y); }); c.globalAlpha = 1;
  }
  function dessinerDecorTitre(c) {
    dessinerPlanete(c, TEX[4], W * .78, 170 + Math.sin(S.t * .6) * 6, 78, S.t * .01, haloDe(MONDES[4]), true);
    dessinerPlanete(c, TEX[2], W * .12, H * .56, 34, S.t * .015, haloDe(MONDES[2]), false);
    var ph = (S.t * .35) % 1; if (ph < .35) { c.globalCompositeOperation = 'lighter'; var x0 = lerp(W + 20, -40, ph / .35), y0 = lerp(60, 300, ph / .35), g = c.createLinearGradient(x0, y0, x0 + 80, y0 - 40); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + 80, y0 - 40); c.stroke(); c.globalCompositeOperation = 'source-over'; }
  }

  /* ====================== Boucle ====================== */
  var dernier = 0;
  function boucle(ts) {
    var dt = Math.min(.04, (ts - dernier) / 1000 || 0); dernier = ts;
    if (S.mode !== 'pause') mettreAJour(dt); dessiner(); requestAnimationFrame(boucle);
  }

  /* ====================== Commandes ====================== */
  function pos(e) { var r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
  jeu.addEventListener('pointerdown', function (e) { if (e.target.closest('button') || e.target.closest('.carte')) return; var p = pos(e); glisse = { id: e.pointerId, dx: S.x - p.x, dy: S.y - p.y }; try { jeu.setPointerCapture(e.pointerId); } catch (x) { /* ignoré */ } });
  jeu.addEventListener('pointermove', function (e) { if (!glisse || e.pointerId !== glisse.id || (S.mode !== 'vol' && S.mode !== 'arrivee')) return; var p = pos(e); S.tx = clamp(p.x + glisse.dx, 22, W - 22); S.ty = clamp(p.y + glisse.dy, 90, H - 60); });
  function finGlisse(e) { if (glisse && e.pointerId === glisse.id) glisse = null; }
  jeu.addEventListener('pointerup', finGlisse); jeu.addEventListener('pointercancel', finGlisse);
  window.addEventListener('keydown', function (e) { clavier[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; if (e.key === 'p' || e.key === 'Escape') basculerPause(); if (e.key.indexOf('Arrow') === 0) e.preventDefault(); });
  window.addEventListener('keyup', function (e) { clavier[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });

  var modeAvantPause = '';
  function basculerPause() {
    if (S.mode === 'pause') { S.mode = modeAvantPause; montrer(modeAvantPause === 'gardien' ? 'quiz' : null); return; }
    if (S.mode === 'vol' || S.mode === 'arrivee') { modeAvantPause = S.mode; S.mode = 'pause'; montrer('pauseE'); }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden && (S.mode === 'vol' || S.mode === 'arrivee')) basculerPause(); });

  $('bJouer').addEventListener('click', function () { AU.init(); AU.clic(); nouvellePartie(); });
  $('bRegles').addEventListener('click', function () { AU.init(); AU.clic(); montrer('regles'); });
  $('bRegOk').addEventListener('click', function () { AU.clic(); montrer('titre'); });
  $('bSuite').addEventListener('click', suite);
  $('bRejouer').addEventListener('click', function () { AU.clic(); nouvellePartie(); });
  $('bRej2').addEventListener('click', function () { AU.clic(); nouvellePartie(); });
  $('bMenu').addEventListener('click', function () { AU.clic(); versTitre(); });
  $('bMenu2').addEventListener('click', function () { AU.clic(); versTitre(); });
  $('bPause').addEventListener('click', basculerPause);
  $('bReprendre').addEventListener('click', basculerPause);
  $('bQuitter').addEventListener('click', function () { S.mode = 'titre'; versTitre(); });
  function majBoutonSon() { $('bSon').innerHTML = AU.muet ? ICO_MUET : ICO_SON; }
  $('bSon').addEventListener('click', function () { AU.muet = !AU.muet; lsSet('astro_muet', AU.muet ? '1' : '0'); majBoutonSon(); AU.init(); AU.clic(); });

  /* ====================== Installation sur le téléphone (PWA) ====================== */
  var invite = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); invite = e; $('install').style.display = 'inline-block'; });
  $('install').addEventListener('click', function () { if (!invite) return; invite.prompt(); invite.userChoice.then(function () { invite = null; $('install').style.display = 'none'; }); });
  window.addEventListener('appinstalled', function () { $('install').style.display = 'none'; });
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !navigator.standalone) $('ios').style.display = 'block';
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () { /* hors connexion non disponible */ });

  /* ====================== Démarrage ====================== */
  redim(); window.addEventListener('resize', redim); window.addEventListener('orientationchange', function () { setTimeout(redim, 200); });
  preparerTextures(); initEtoiles(); preparerFond(4); majBoutonSon(); $('best').textContent = S.meilleur; S.x = S.tx = W / 2; S.y = S.ty = H - 150;
  if (RAPIDE) { var nv = Number((/[?&]niveau=(\d)/.exec(location.search) || [0, 1])[1]); S.niveau = clamp(nv - 1, 0, 7); }
  // Accès pour les tests automatiques (n'influence pas le jeu)
  window.__astro = { S: S, nouvellePartie: nouvellePartie, debutNiveau: debutNiveau, MONDES: MONDES, ouvrirQuiz: ouvrirQuiz, arrivee: arrivee, preparerFond: preparerFond, TEX: TEX };
  requestAnimationFrame(boucle);
})();
