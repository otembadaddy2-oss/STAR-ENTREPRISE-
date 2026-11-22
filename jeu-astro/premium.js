/* ASTRO QUEST — habillage « premium » : vaisseau, ennemis, gardien holographique, planètes sphériques éclairées, anneaux, nébuleuse et étoiles.
   © STAR ENTREPRISE, Brazzaville. Ce fichier ne contient que du dessin (canvas 2D, aucune image externe) : le jeu reste léger et fonctionne hors connexion. */
(function () {
  'use strict';
  var TAU = Math.PI * 2, P = window.ASTRO_PREMIUM = {};
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  /* ------------------------------------------------------------------ bruit (périodique en hauteur : le fond défile sans couture) */
  function hash(ix, iy) { var h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y, py) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    function h(a, b) { return hash(a, ((b % py) + py) % py); }
    return h(xi, yi) * (1 - u) * (1 - v) + h(xi + 1, yi) * u * (1 - v) + h(xi, yi + 1) * (1 - u) * v + h(xi + 1, yi + 1) * u * v;
  }
  function fbm(x, y, py, oct) { var s = 0, a = .5, f = 1, n = 0; for (var i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, py * f); n += a; f *= 2; a *= .5; } return s / n; }

  /* ------------------------------------------------------------------ vaisseau */
  P.fusee = function (c, x, y, o) {
    o = o || {}; var s = o.s || 1, fl = o.flamme == null ? 1 : o.flamme, T = o.t || 0;
    c.save(); c.translate(x, y); c.rotate(o.incl || 0); c.scale(s, s);
    if (o.bouclier) {   // bouclier : bulle avec reflet de bord (Fresnel)
      var bg = c.createRadialGradient(0, -2, 16, 0, -2, 41); bg.addColorStop(0, 'rgba(95,227,255,0)'); bg.addColorStop(.7, 'rgba(95,227,255,.07)'); bg.addColorStop(.93, 'rgba(175,246,255,.5)'); bg.addColorStop(1, 'rgba(95,227,255,0)');
      c.fillStyle = bg; c.beginPath(); c.arc(0, -2, 41, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(190,248,255,.35)'; c.lineWidth = .8; c.beginPath(); c.arc(0, -2, 37.5, 0, TAU); c.stroke();
    }
    if (fl > 0) {   // deux jets de plasma
      c.globalCompositeOperation = 'lighter';
      [-6.5, 6.5].forEach(function (nx) {
        var L = 27 * fl * (.8 + Math.random() * .4);
        var g = c.createLinearGradient(0, 20, 0, 20 + L); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.16, 'rgba(160,232,255,.9)'); g.addColorStop(.55, 'rgba(70,140,255,.45)'); g.addColorStop(1, 'rgba(50,70,255,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(nx - 3.3, 20); c.quadraticCurveTo(nx - 1.2, 20 + L * .7, nx, 20 + L); c.quadraticCurveTo(nx + 1.2, 20 + L * .7, nx + 3.3, 20); c.fill();
        var hg = c.createRadialGradient(nx, 20, 0, nx, 20, 11); hg.addColorStop(0, 'rgba(200,244,255,.85)'); hg.addColorStop(1, 'rgba(80,160,255,0)'); c.fillStyle = hg; c.beginPath(); c.arc(nx, 20, 11, 0, TAU); c.fill();
      });
      c.globalCompositeOperation = 'source-over';
    }
    if (o.pattes) {   // train d'atterrissage
      c.strokeStyle = '#8a95ab'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-9, 12); c.lineTo(-17, 28); c.moveTo(9, 12); c.lineTo(17, 28); c.stroke();
      c.fillStyle = '#586277'; c.fillRect(-21, 27.5, 9, 3); c.fillRect(12, 27.5, 9, 3);
    }
    [-1, 1].forEach(function (sg) {   // ailes en flèche
      c.save(); c.scale(sg, 1);
      var g = c.createLinearGradient(-4, -6, -27, 24); g.addColorStop(0, '#5d677f'); g.addColorStop(.5, '#2d3448'); g.addColorStop(1, '#161a28');
      c.fillStyle = g; c.beginPath(); c.moveTo(-5, -9); c.lineTo(-25, 17); c.lineTo(-27.5, 24.5); c.lineTo(-19.5, 22); c.lineTo(-8, 16); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(196,210,234,.6)'; c.lineWidth = .9; c.beginPath(); c.moveTo(-5, -9); c.lineTo(-25, 17); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = .7; c.beginPath(); c.moveTo(-9, 2); c.lineTo(-21.5, 19.5); c.moveTo(-8.5, 9); c.lineTo(-16.5, 19.5); c.stroke();
      c.strokeStyle = 'rgba(233,196,106,.9)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-10.5, 0.5); c.lineTo(-23, 18); c.stroke();
      var on = .45 + .55 * Math.max(0, Math.sin(T * 7 + (sg > 0 ? 0 : 2.4)));   // feux de bout d'aile
      c.globalCompositeOperation = 'lighter'; var lg = c.createRadialGradient(-26.5, 23.5, 0, -26.5, 23.5, 7); lg.addColorStop(0, sg < 0 ? 'rgba(255,90,120,' + on + ')' : 'rgba(80,255,160,' + on + ')'); lg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = lg; c.beginPath(); c.arc(-26.5, 23.5, 7, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
      c.restore();
    });
    var bd = c.createLinearGradient(-10, 0, 10, 0); bd.addColorStop(0, '#59647b'); bd.addColorStop(.3, '#eef2f8'); bd.addColorStop(.55, '#b6c0d2'); bd.addColorStop(1, '#465067');
    c.fillStyle = bd; c.beginPath(); c.moveTo(0, -36); c.bezierCurveTo(5, -27, 8.4, -12, 8.8, 6); c.lineTo(7.2, 20.5); c.lineTo(-7.2, 20.5); c.lineTo(-8.8, 6); c.bezierCurveTo(-8.4, -12, -5, -27, 0, -36); c.closePath(); c.fill();
    c.save(); c.clip();
    c.fillStyle = '#242a3b'; c.fillRect(-10, -37, 20, 10);   // nez
    c.fillStyle = 'rgba(255,255,255,.34)'; c.fillRect(-5.2, -37, 1.8, 58);   // reflet lumineux
    c.fillStyle = '#e9c46a'; c.fillRect(-10, 2.5, 20, 1.3); c.fillRect(-10, 13, 20, .8);   // filets or
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(2.5, -37, 8, 58);   // côté à l'ombre
    c.restore();
    var cg = c.createLinearGradient(0, -20, 0, -1); cg.addColorStop(0, '#061028'); cg.addColorStop(.55, '#1e5d9a'); cg.addColorStop(1, '#0a1a3c');
    c.fillStyle = cg; c.beginPath(); c.ellipse(0, -10, 3.7, 8.6, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(210,235,255,.85)'; c.lineWidth = .9; c.beginPath(); c.arc(0, -10, 3.7, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-1.2, -15, .9, 2.6, .15, 0, TAU); c.fill();
    c.fillStyle = '#1a1f2e'; c.fillRect(-10, 17.5, 6.5, 5); c.fillRect(3.5, 17.5, 6.5, 5);   // tuyères
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(170,236,255,.95)'; c.beginPath(); c.arc(-6.7, 22.3, 2.2, 0, TAU); c.arc(6.7, 22.3, 2.2, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    c.restore();
  };

  /* ------------------------------------------------------------------ ennemis (mêmes noms que dans le jeu : blob, poulpe, soucoupe, piquant) */
  function lueur(c, r, col, a) { c.globalCompositeOperation = 'lighter'; var g = c.createRadialGradient(0, 0, r * .2, 0, 0, r * 1.9); g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 1.9, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; }
  function oeil(c, r, ang, col) {   // capteur lumineux qui suit le joueur
    if (!isFinite(ang)) ang = 0;
    c.fillStyle = '#05070f'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(180,195,225,.55)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    var ox = Math.cos(ang) * r * .3, oy = Math.sin(ang) * r * .3; c.globalCompositeOperation = 'lighter';
    var g = c.createRadialGradient(ox, oy, 0, ox, oy, r * .85); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(' + col + ',.95)'); g.addColorStop(1, 'rgba(' + col + ',0)'); c.fillStyle = g; c.beginPath(); c.arc(ox, oy, r * .85, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
  }
  P.drone = function (c, e, t, px, py) {   // drone blindé : sphère de métal, anneau équatorial, œil ambré
    var r = e.r; if (!(r > 0) || !isFinite(e.x + e.y)) return; c.save(); c.translate(e.x, e.y + Math.sin(t * 3 + e.ph) * 1.5); lueur(c, r, '255,170,60', .22);
    var bd = c.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.05); bd.addColorStop(0, '#b9c3d6'); bd.addColorStop(.35, '#5d687f'); bd.addColorStop(.8, '#1c2132'); bd.addColorStop(1, '#0b0e18');
    c.fillStyle = bd; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1; for (var k = -1; k <= 1; k += 2) { c.beginPath(); c.ellipse(0, k * r * .55, r * .82, r * .16, 0, 0, TAU); c.stroke(); }
    c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip(); c.fillStyle = '#394258'; c.fillRect(-r, -r * .11, 2 * r, r * .22); c.fillStyle = 'rgba(210,225,255,.35)'; c.fillRect(-r, -r * .11, 2 * r, 1.2); c.restore();
    c.strokeStyle = '#2a3144'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -r); c.lineTo(0, -r * 1.35); c.stroke();
    c.globalCompositeOperation = 'lighter'; c.fillStyle = Math.floor(t * 3 + e.ph) % 2 ? 'rgba(255,70,90,.95)' : 'rgba(255,70,90,.25)'; c.beginPath(); c.arc(0, -r * 1.38, 1.8, 0, TAU); c.fill();
    [-1, 1].forEach(function (sg) { var g = c.createRadialGradient(sg * r * .62, -r * .82, 0, sg * r * .62, -r * .82, r * .4); g.addColorStop(0, 'rgba(120,200,255,.8)'); g.addColorStop(1, 'rgba(120,200,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(sg * r * .62, -r * .82, r * .4, 0, TAU); c.fill(); });
    c.globalCompositeOperation = 'source-over';
    c.translate(0, r * .05); oeil(c, r * .36, Math.atan2(py - e.y, px - e.x), '255,176,56');
    c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(-r * .4, -r * .55, r * .22, r * .1, -.6, 0, TAU); c.fill();
    c.restore();
  };
  P.chasseur = function (c, e, t, px, py) {   // chasseur furtif : flèche sombre, veines d'énergie violettes
    var r = e.r; if (!(r > 0) || !isFinite(e.x + e.y)) return; c.save(); c.translate(e.x, e.y); lueur(c, r, '190,100,255', .2); c.rotate(Math.sin(t * 2.4 + e.ph) * .06);
    var g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#7b66b0'); g.addColorStop(.45, '#33274f'); g.addColorStop(1, '#120c24');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, r * 1.05); c.lineTo(-r * 1.05, -r * .55); c.lineTo(-r * .5, -r * .3); c.lineTo(-r * .3, -r * .75); c.lineTo(0, -r * .5); c.lineTo(r * .3, -r * .75); c.lineTo(r * .5, -r * .3); c.lineTo(r * 1.05, -r * .55); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(205,190,240,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, r * 1.05); c.lineTo(-r * 1.05, -r * .55); c.moveTo(0, r * 1.05); c.lineTo(r * 1.05, -r * .55); c.stroke();
    var vi = .55 + .45 * Math.sin(t * 5 + e.ph); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(200,110,255,' + (.55 + .35 * vi) + ')'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, r * .6); c.lineTo(0, -r * .35); c.moveTo(-r * .2, r * .3); c.lineTo(-r * .7, -r * .35); c.moveTo(r * .2, r * .3); c.lineTo(r * .7, -r * .35); c.stroke();
    [-1, 1].forEach(function (sg) { var gg = c.createRadialGradient(sg * r * .86, -r * .62, 0, sg * r * .86, -r * .62, r * .45); gg.addColorStop(0, 'rgba(150,200,255,.85)'); gg.addColorStop(1, 'rgba(150,200,255,0)'); c.fillStyle = gg; c.beginPath(); c.arc(sg * r * .86, -r * .62, r * .45, 0, TAU); c.fill(); });
    c.globalCompositeOperation = 'source-over'; c.translate(0, r * .1); c.scale(1, .55); oeil(c, r * .34, Math.atan2(py - e.y, px - e.x), '255,95,210');
    c.restore();
  };
  P.soucoupe = function (c, e, t) {   // vaisseau-sentinelle : disque de titane, dôme fumé, faisceau de charge
    var r = e.r; if (!(r > 0) || !isFinite(e.x + e.y)) return; c.save(); c.translate(e.x, e.y); var tir = e.tir > .85;
    lueur(c, r, '90,220,255', .16 + (tir ? .3 : 0));
    if (tir) { c.globalCompositeOperation = 'lighter'; var bm = c.createLinearGradient(0, r * .2, 0, r * 1.6); bm.addColorStop(0, 'rgba(120,230,255,.5)'); bm.addColorStop(1, 'rgba(120,230,255,0)'); c.fillStyle = bm; c.beginPath(); c.moveTo(-r * .3, r * .2); c.lineTo(r * .3, r * .2); c.lineTo(r * .7, r * 1.6); c.lineTo(-r * .7, r * 1.6); c.fill(); c.globalCompositeOperation = 'source-over'; }
    var dm = c.createRadialGradient(-r * .1, -r * .4, 1, 0, -r * .15, r * .65); dm.addColorStop(0, 'rgba(200,235,255,.75)'); dm.addColorStop(.5, 'rgba(40,70,120,.8)'); dm.addColorStop(1, 'rgba(8,14,30,.95)');
    c.fillStyle = dm; c.beginPath(); c.arc(0, -r * .02, r * .55, Math.PI, TAU); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(190,220,255,.55)'; c.lineWidth = 1; c.beginPath(); c.arc(0, -r * .02, r * .55, Math.PI * 1.1, Math.PI * 1.55); c.stroke();
    var dk = c.createLinearGradient(0, -r * .25, 0, r * .42); dk.addColorStop(0, '#dfe6f2'); dk.addColorStop(.35, '#8995ad'); dk.addColorStop(.7, '#3a4359'); dk.addColorStop(1, '#161a28');
    c.fillStyle = dk; c.beginPath(); c.ellipse(0, r * .1, r, r * .34, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, r * .12, r * .7, r * .22, 0, 0, TAU); c.stroke();
    c.globalCompositeOperation = 'lighter'; for (var i = -3; i <= 3; i++) { var on = (Math.floor(t * 5) + i + 9) % 3 === 0; c.fillStyle = on ? 'rgba(130,235,255,1)' : 'rgba(60,110,150,.55)'; c.beginPath(); c.arc(i * r * .26, r * .13 + (1 - Math.abs(i) / 3) * r * .12, 1.7, 0, TAU); c.fill(); }
    c.globalCompositeOperation = 'source-over'; c.restore();
  };
  P.mine = function (c, e, t, px, py) {   // mine à pointes : cœur incandescent qui pulse
    var r = e.r, pul = .55 + .45 * Math.sin(t * 6 + e.ph); if (!(r > 0) || !isFinite(e.x + e.y)) return; c.save(); c.translate(e.x, e.y); lueur(c, r, '255,80,50', .2 + .15 * pul);
    c.save(); c.rotate(t * .7 + e.ph);
    for (var i = 0; i < 12; i++) { var a = i / 12 * TAU, long = i % 2 ? 1.28 : 1.45; var g = c.createLinearGradient(Math.cos(a) * r * .7, Math.sin(a) * r * .7, Math.cos(a) * r * long, Math.sin(a) * r * long); g.addColorStop(0, '#6a7389'); g.addColorStop(1, '#1b2030'); c.fillStyle = g; c.beginPath(); c.moveTo(Math.cos(a - .15) * r * .72, Math.sin(a - .15) * r * .72); c.lineTo(Math.cos(a) * r * long, Math.sin(a) * r * long); c.lineTo(Math.cos(a + .15) * r * .72, Math.sin(a + .15) * r * .72); c.fill(); }
    c.restore();
    var bd = c.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * .85); bd.addColorStop(0, '#8d95aa'); bd.addColorStop(.5, '#3a4157'); bd.addColorStop(1, '#10131f'); c.fillStyle = bd; c.beginPath(); c.arc(0, 0, r * .8, 0, TAU); c.fill();
    c.globalCompositeOperation = 'lighter'; var cg = c.createRadialGradient(0, 0, 0, 0, 0, r * .5); cg.addColorStop(0, 'rgba(255,240,200,' + (.7 + .3 * pul) + ')'); cg.addColorStop(.35, 'rgba(255,110,50,' + (.7 * pul + .25) + ')'); cg.addColorStop(1, 'rgba(255,60,30,0)'); c.fillStyle = cg; c.beginPath(); c.arc(0, 0, r * .5, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, r * .56, 0, TAU); c.stroke();
    c.restore();
  };

  /* ------------------------------------------------------------------ gardien holographique */
  P.gardien = function (c, x, y, s, t, humeur, halo) {
    var col = humeur === 'rire' ? 'rgba(255,70,110,' : humeur === 'salut' ? 'rgba(70,235,150,' : halo;
    c.save(); c.translate(x, y + Math.sin(t * 2) * 4); c.scale(s, s);
    c.globalCompositeOperation = 'lighter'; var au = c.createRadialGradient(0, -6, 10, 0, -6, 105); au.addColorStop(0, col + '.42)'); au.addColorStop(1, col + '0)'); c.fillStyle = au; c.beginPath(); c.arc(0, -6, 105, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    // robe : projection translucide qui se dissout vers le bas
    function robe() { c.beginPath(); c.moveTo(-17, -4); c.bezierCurveTo(-36, 0, -42, 28, -44, 78); for (var i = 0; i <= 8; i++) c.lineTo(-44 + i * 11, 78 + (i % 2 ? 7 : 0) + Math.sin(t * 3 + i * 1.3) * 3); c.bezierCurveTo(42, 28, 36, 0, 17, -4); c.closePath(); }
    var rg = c.createLinearGradient(0, -4, 0, 86); rg.addColorStop(0, col + '.55)'); rg.addColorStop(.6, col + '.2)'); rg.addColorStop(1, col + '0)');
    c.globalCompositeOperation = 'lighter'; robe(); c.fillStyle = rg; c.fill();
    c.save(); robe(); c.clip(); c.fillStyle = col + '.16)'; var off = (t * 26) % 4; for (var yy = -6 - off; yy < 90; yy += 4) c.fillRect(-50, yy, 100, 1.4);   // lignes de balayage
    var core = c.createRadialGradient(0, 22, 0, 0, 22, 28); core.addColorStop(0, 'rgba(255,255,255,.55)'); core.addColorStop(1, col + '0)'); c.fillStyle = core; c.fillRect(-40, -6, 80, 60); c.restore();
    c.strokeStyle = col + '.9)'; c.lineWidth = 1.3; robe(); c.stroke();
    c.globalCompositeOperation = 'source-over';
    // épaulières et plastron
    c.strokeStyle = 'rgba(235,240,255,.75)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-34, 4); c.quadraticCurveTo(0, -12, 34, 4); c.stroke();
    c.globalCompositeOperation = 'lighter'; c.fillStyle = col + '.95)'; c.beginPath(); c.moveTo(0, 12); c.lineTo(-6, 22); c.lineTo(0, 32); c.lineTo(6, 22); c.closePath(); c.fill(); c.globalCompositeOperation = 'source-over';
    // casque
    var hg = c.createRadialGradient(-10, -52, 3, 0, -36, 40); hg.addColorStop(0, '#46557a'); hg.addColorStop(.5, '#141a30'); hg.addColorStop(1, '#070a16');
    c.fillStyle = hg; c.beginPath(); c.ellipse(0, -36, 26, 31, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(210,225,255,.55)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, -36, 26, 31, 0, Math.PI * 1.05, Math.PI * 1.65); c.stroke();
    var fl = humeur === 'rire' ? .7 + .3 * Math.sin(t * 40) : 1;   // visière : couleur selon l'humeur
    c.globalCompositeOperation = 'lighter'; var vg = c.createLinearGradient(-22, 0, 22, 0); vg.addColorStop(0, col + '0)'); vg.addColorStop(.2, col + (.95 * fl) + ')'); vg.addColorStop(.8, col + (.95 * fl) + ')'); vg.addColorStop(1, col + '0)');
    c.fillStyle = vg; c.beginPath(); if (humeur === 'rire') { c.moveTo(-22, -42); c.lineTo(22, -42); c.lineTo(17, -31); c.lineTo(-17, -31); } else { c.moveTo(-22, -40); c.quadraticCurveTo(0, -35, 22, -40); c.lineTo(18, -31); c.quadraticCurveTo(0, -27, -18, -31); } c.closePath(); c.fill();
    var sg = c.createRadialGradient(0, -36, 0, 0, -36, 26); sg.addColorStop(0, col + '.3)'); sg.addColorStop(1, col + '0)'); c.fillStyle = sg; c.beginPath(); c.arc(0, -36, 26, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(0, -57, 2.1, 0, TAU); c.fill();   // troisième capteur
    // couronne orbitale
    c.strokeStyle = col + '.75)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, -66, 38, 8, 0, 0, TAU); c.stroke();
    for (var n = 0; n < 4; n++) { var a = t * 1.3 + n * TAU / 4, nx = Math.cos(a) * 38, ny = -66 + Math.sin(a) * 8; c.fillStyle = 'rgba(255,255,255,' + (.5 + .4 * Math.sin(a)) + ')'; c.beginPath(); c.arc(nx, ny, 2, 0, TAU); c.fill(); }
    // orbes de lumière (mains)
    [-1, 1].forEach(function (sg2) { var oy = Math.sin(t * 2.4 + sg2) * 5, og = c.createRadialGradient(sg2 * 56, 24 + oy, 0, sg2 * 56, 24 + oy, 15); og.addColorStop(0, 'rgba(255,255,255,.95)'); og.addColorStop(.35, col + '.8)'); og.addColorStop(1, col + '0)'); c.fillStyle = og; c.beginPath(); c.arc(sg2 * 56, 24 + oy, 15, 0, TAU); c.fill(); });
    c.globalCompositeOperation = 'source-over'; c.restore();
  };

  /* ------------------------------------------------------------------ planètes : vraie sphère éclairée (relief de la texture, terminateur, assombrissement du bord, brillance des océans, atmosphère) */
  var CACHE = [], TEXD = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;
  function donneesTexture(tex) {
    var d = TEXD && TEXD.get(tex); if (d) return d;
    d = tex.getContext('2d').getImageData(0, 0, tex.width, tex.height); if (TEXD) TEXD.set(tex, d); return d;
  }
  var LX = -.56, LY = -.46, LZ = .69; (function () { var n = Math.sqrt(LX * LX + LY * LY + LZ * LZ); LX /= n; LY /= n; LZ /= n; })();
  function sphere(R) {   // géométrie précalculée d'une sphère de rayon R pixels (longitude, latitude, lumière, voile d'atmosphère)
    for (var i = 0; i < CACHE.length; i++) if (CACHE[i].R === R) return CACHE[i];
    var D = 2 * R, n = D * D, lon = new Float32Array(n), lat = new Float32Array(n), lum = new Float32Array(n), spe = new Float32Array(n), rim = new Float32Array(n), ins = new Uint8Array(n);   // ins : couverture du pixel, 0 à 255 (bord adouci)
    for (var j = 0; j < D; j++) for (var k = 0; k < D; k++) {
      var x = (k + .5 - R) / R, y = (j + .5 - R) / R, q = x * x + y * y, id = j * D + k, dist = Math.sqrt(q), cov = clamp((1 - dist) * R + .5, 0, 1); if (cov <= 0) continue;
      if (q > .9999) { x /= dist; y /= dist; q = .9999; }
      var z = Math.sqrt(1 - q); ins[id] = Math.round(cov * 255); lon[id] = Math.atan2(x, z) / TAU + .25; lat[id] = Math.asin(y) / Math.PI + .5;
      var dif = x * LX + y * LY + z * LZ, d = Math.max(0, dif); lum[id] = .035 + .965 * Math.pow(smooth(-.05, .95, dif), .85) * (.55 + .45 * Math.pow(z, .35));
      var hx = LX, hy = LY, hz = LZ + 1, hl = Math.sqrt(hx * hx + hy * hy + hz * hz), nh = Math.max(0, (x * hx + y * hy + z * hz) / hl); spe[id] = Math.pow(nh, 38) * d;
      rim[id] = Math.pow(1 - z, 3.2) * (.25 + .75 * smooth(-.4, .6, dif));
    }
    var o = { R: R, D: D, lon: lon, lat: lat, lum: lum, spe: spe, rim: rim, ins: ins, cv: null, im: null }; var cv = document.createElement('canvas'); cv.width = cv.height = D; o.cv = cv; o.cx = cv.getContext('2d'); o.im = o.cx.createImageData(D, D);
    CACHE.push(o); if (CACHE.length > 6) CACHE.shift(); return o;
  }
  function cielMarbre(halo) { var m = /rgba\((\d+),(\d+),(\d+)/.exec(halo); return m ? [+m[1], +m[2], +m[3]] : [120, 180, 255]; }
  function anneaux(c, cx, cy, r, arriere) {
    c.save(); c.translate(cx, cy); c.rotate(-.3); c.scale(1, .27); c.lineCap = 'butt';
    for (var k = 0; k < 46; k++) {
      var f = k / 45, rr = r * (1.2 + f * .82), vide = f > .46 && f < .54;   // division de Cassini
      var dens = .35 + .65 * Math.abs(Math.sin(k * 1.7) * Math.cos(k * .53)) + (f > .2 && f < .72 ? .2 : -.1); if (vide) dens *= .12;
      var tt = .45 + .55 * Math.sin(f * 3.1 + .4), cc = [Math.round(176 + 62 * tt), Math.round(150 + 58 * tt), Math.round(104 + 50 * tt)];
      c.strokeStyle = 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',' + clamp(dens * .62, 0, .88) + ')'; c.lineWidth = r * .02 + .6; c.beginPath(); c.arc(0, 0, rr, arriere ? Math.PI : 0, arriere ? TAU : Math.PI); c.stroke();
    }
    c.restore();
  }
  P.planete = function (c, tex, cx, cy, r, rot, halo, avecAnneaux, vdec) {
    var R = Math.round(r / 4) * 4; if (R < 8) R = 8;
    if (r > 200) return false;   // très grosse planète (vue du sol) : le jeu garde son dessin d'origine
    var S = sphere(R), td = donneesTexture(tex), tw = td.width, th = td.height, tp = td.data, im = S.im, o = im.data, D = S.D, n = D * D, ha = cielMarbre(halo), off = ((rot % 1) + 1) % 1;
    if (avecAnneaux) anneaux(c, cx, cy, r, true);
    c.save(); c.globalCompositeOperation = 'lighter';   // halo d'atmosphère
    var gl = c.createRadialGradient(cx, cy, r * .96, cx, cy, r * 1.32); gl.addColorStop(0, halo + '.5)'); gl.addColorStop(.35, halo + '.16)'); gl.addColorStop(1, halo + '0)'); c.fillStyle = gl; c.beginPath(); c.arc(cx, cy, r * 1.32, 0, TAU); c.fill(); c.restore();
    var cl = off * tw;
    for (var i = 0; i < n; i++) {
      var p = i * 4; if (!S.ins[i]) { o[p + 3] = 0; continue; }
      var u = S.lon[i] + off; u -= Math.floor(u); var fx = u * tw - .5, fy = S.lat[i] * th - .5, x0 = Math.floor(fx), y0 = Math.floor(fy), wx = fx - x0, wy = fy - y0;
      var xa = ((x0 % tw) + tw) % tw, xb = (xa + 1) % tw, ya = clamp(y0, 0, th - 1), yb = clamp(y0 + 1, 0, th - 1), ix = clamp((u * tw) | 0, 0, tw - 1), iy = clamp((S.lat[i] * th) | 0, 0, th - 1), l = S.lum[i];
      var q00 = (ya * tw + xa) * 4, q10 = (ya * tw + xb) * 4, q01 = (yb * tw + xa) * 4, q11 = (yb * tw + xb) * 4, w00 = (1 - wx) * (1 - wy), w10 = wx * (1 - wy), w01 = (1 - wx) * wy, w11 = wx * wy;   // échantillonnage doux (bilinéaire) : pas de gros pixels
      var tr = tp[q00] * w00 + tp[q10] * w10 + tp[q01] * w01 + tp[q11] * w11, tg = tp[q00 + 1] * w00 + tp[q10 + 1] * w10 + tp[q01 + 1] * w01 + tp[q11 + 1] * w11, tb = tp[q00 + 2] * w00 + tp[q10 + 2] * w10 + tp[q01 + 2] * w01 + tp[q11 + 2] * w11, t4 = (iy * tw + ix) * 4;
      // relief : la clarté de la texture donne de petits reliefs éclairés
      var t5 = (iy * tw + ((ix + 1) % tw)) * 4, rel = ((tp[t5] + tp[t5 + 1] + tp[t5 + 2]) - (tr + tg + tb)) / 765, shade = l * (1 + rel * 2.4 * (l + .15));
      var ocean = tb > tr * 1.35 && tb > tg * 1.1 ? 1 : 0, sp = S.spe[i] * (ocean ? .3 : .06);
      var rm = S.rim[i];
      o[p] = clamp(tr * shade * 1.04 + 255 * sp + ha[0] * rm * .7, 0, 255); o[p + 1] = clamp(tg * shade * 1.04 + 255 * sp + ha[1] * rm * .7, 0, 255); o[p + 2] = clamp(tb * shade * 1.08 + 255 * sp + ha[2] * rm * .8 + 6 * (1 - l), 0, 255); o[p + 3] = S.ins[i];
    }
    S.cx.putImageData(im, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(S.cv, cx - R, cy - R, D, D);
    if (avecAnneaux) anneaux(c, cx, cy, r, false);
    return true;
  };

  /* ------------------------------------------------------------------ nébuleuse (nuages colorés, poussières sombres, amas d'étoiles), répétable en hauteur */
  P.nebuleuse = function (W, H, couleurs) {
    var w = Math.round(W / 2), h = Math.round(H / 2), c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
    var A = couleurs[0], B = couleurs[1], py = 5, sx = 4.2 / w * 1.0, sy = py / h, ox = rnd(0, 50), oy = rnd(0, py);
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var X = i * sx + ox, Y = j * sy, q = fbm(X, Y, py, 5), q2 = fbm(X * 2 + 11, Y * 2 + 3 * py, py * 2, 4), ph = fbm(X + 40, Y + 9, py, 3);
      var dens = smooth(.46, .78, q) * (.45 + .75 * q2), poussiere = smooth(.5, .72, fbm(X * 3 + 70, Y * 3, py * 3, 4)) * smooth(.4, .7, dens + .25);
      var mixc = smooth(.35, .65, ph), cr = A[0] + (B[0] - A[0]) * mixc, cg = A[1] + (B[1] - A[1]) * mixc, cb = A[2] + (B[2] - A[2]) * mixc;
      var g = 3 + 5 * (j / h), r0 = 2 + 3 * (1 - j / h) * 0 + 1, b0 = 10 + 18 * (.5 + .5 * Math.sin(j / h * TAU));   // fond : bleu nuit profond
      var k = (j * w + i) * 4, a = dens * .72 * (1 - poussiere * .8);
      d[k] = clamp(r0 + cr * a * .8 + 40 * a * a * a, 0, 255); d[k + 1] = clamp(g + cg * a * .75 + 40 * a * a * a, 0, 255); d[k + 2] = clamp(b0 + cb * a * .85 + 55 * a * a * a, 0, 255); d[k + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    var out = document.createElement('canvas'); out.width = W; out.height = H; var o = out.getContext('2d'); o.imageSmoothingQuality = 'high'; o.drawImage(c, 0, 0, W, H);
    o.globalCompositeOperation = 'lighter';   // amas d'étoiles lointaines
    for (var s = 0; s < 360; s++) { var sx0 = rnd(0, W), sy0 = rnd(0, H), a0 = rnd(.15, .6) * (Math.random() < .08 ? 1.6 : 1); o.fillStyle = 'rgba(' + (200 + (Math.random() * 55 | 0)) + ',' + (210 + (Math.random() * 45 | 0)) + ',255,' + a0 + ')'; o.fillRect(sx0, sy0, rnd(.5, 1.1), rnd(.5, 1.1)); }
    o.globalCompositeOperation = 'source-over'; return out;
  };
  P.etoileBrillante = function (c, x, y, r, al, teinte) {   // étoile avec halo et branches de diffraction
    c.globalAlpha = al; c.globalCompositeOperation = 'lighter';
    var g = c.createRadialGradient(x, y, 0, x, y, r * 7); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.12, 'rgba(210,225,255,.35)'); g.addColorStop(1, 'rgba(120,160,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 7, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(235,242,255,.55)'; c.lineWidth = .7; c.beginPath(); c.moveTo(x - r * 9, y); c.lineTo(x + r * 9, y); c.moveTo(x, y - r * 9); c.lineTo(x, y + r * 9); c.stroke();
    c.fillStyle = teinte; c.beginPath(); c.arc(x, y, r * .9, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  };
})();
