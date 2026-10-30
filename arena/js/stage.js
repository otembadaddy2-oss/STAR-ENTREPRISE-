/* X SAPHIR — ARENA : les décors. Tout est dessiné au pinceau (aucune image) : ciel, soleil, skyline, mer, foule, sol.
   Plusieurs plans qui défilent à des vitesses différentes (parallaxe) donnent la profondeur. */
(function (root) {
  'use strict';
  var XS = root.XS = root.XS || {};
  var W = 960, H = 540, GROUND = 462, HORIZON = 292;

  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function mixHex(a, b, t) { var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); function c(s) { return Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); } return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')'; }

  // position écran d'un point du décor (x monde) pour un plan de parallaxe p (0 = fixe, 1 = colle au sol)
  function px(wx, cam, zoom, p) { var zl = 1 + (zoom - 1) * p; return W / 2 + (wx - 800) * zl + (800 - cam) * zoom * p; }
  function pw(w, zoom, p) { return w * (1 + (zoom - 1) * p); }

  // ---------- éléments communs ----------
  function sky(ctx, st, t) {
    var g = ctx.createLinearGradient(0, 0, 0, HORIZON + 30); st.sky.forEach(function (c, i) { g.addColorStop(i / (st.sky.length - 1), c); }); ctx.fillStyle = g; ctx.fillRect(0, 0, W, HORIZON + 30);
  }
  function stars(ctx, t, cam, zoom, seed, n) {
    var r = rng(seed); for (var i = 0; i < n; i++) { var x = r() * 1700, y = r() * HORIZON * 0.95, s = 0.6 + r() * 1.6, tw = 0.5 + 0.5 * Math.sin(t * 0.03 + i * 1.7); ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.65 * tw) + ')'; var sx = px(x, cam, zoom, 0.05); ctx.fillRect(sx, y, s, s); }
  }
  function sunDisc(ctx, st, cam, zoom) {
    var sx = px(st.sun.x * 1600, cam, zoom, 0.06), sy = st.sun.y * H * 0.72, r = st.sun.r;
    var g = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * 3.2); g.addColorStop(0, hexA(st.sun.c, 0.75)); g.addColorStop(0.35, hexA(st.sun.c, 0.22)); g.addColorStop(1, hexA(st.sun.c, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, HORIZON + 40);
    ctx.fillStyle = st.sun.c; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.3); ctx.fill();
  }
  function ground(ctx, st, cam, zoom, t, tone) {
    var g = ctx.createLinearGradient(0, GROUND - 40, 0, H); g.addColorStop(0, tone[0]); g.addColorStop(1, tone[1]); ctx.fillStyle = g; ctx.fillRect(0, GROUND - 40, W, H - GROUND + 40);
    // lignes de perspective du sol
    ctx.strokeStyle = hexA(st.accent, 0.22); ctx.lineWidth = 1.5;
    for (var i = -12; i <= 12; i++) { var wx = 800 + i * 130; var x0 = px(wx, cam, zoom, 1); var x1 = W / 2 + (x0 - W / 2) * 2.4; ctx.beginPath(); ctx.moveTo(x0, GROUND - 40); ctx.lineTo(x1, H); ctx.stroke(); }
    ctx.strokeStyle = hexA(st.accent, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND - 38); ctx.lineTo(W, GROUND - 38); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, GROUND - 36); ctx.lineTo(W, GROUND - 36); ctx.stroke();
  }
  function crowd(ctx, cam, zoom, t, cols, seed, p, y0, scale) {
    var r = rng(seed);
    for (var i = 0; i < 90; i++) {
      var wx = -100 + i * 20 + r() * 14, sx = px(wx, cam, zoom, p), h = (30 + r() * 14) * scale, bob = Math.sin(t * 0.09 + i * 1.3) * 4 * scale, up = r() < 0.4 ? 1 : 0, c = cols[Math.floor(r() * cols.length)];
      if (sx < -40 || sx > W + 40) continue;
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx, y0 - h * 0.5 + bob, 6 * scale, h * 0.5, 0, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.arc(sx, y0 - h - 3 * scale + bob, 5.2 * scale, 0, 6.3); ctx.fill();
      if (up) { ctx.strokeStyle = c; ctx.lineWidth = 3 * scale; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx + 3 * scale, y0 - h * 0.8 + bob); ctx.lineTo(sx + 8 * scale, y0 - h * 1.35 + bob + Math.sin(t * 0.2 + i) * 3); ctx.stroke(); }
    }
  }

  // ---------- Pointe-Noire : le port au crépuscule ----------
  function drawPointeNoire(ctx, st, cam, zoom, t) {
    sky(ctx, st, t); sunDisc(ctx, st, cam, zoom);
    // nuages étirés
    var r = rng(11); for (var c = 0; c < 6; c++) { var cx = px(r() * 1600, cam, zoom, 0.08), cy = 60 + r() * 130, cw = 160 + r() * 200; ctx.fillStyle = hexA('#ffcf9a', 0.12 + r() * 0.1); ctx.beginPath(); ctx.ellipse(cx + Math.sin(t * 0.004 + c) * 12, cy, cw, 16 + r() * 10, 0, 0, 6.3); ctx.fill(); }
    // mer
    var wg = ctx.createLinearGradient(0, HORIZON, 0, GROUND - 40); wg.addColorStop(0, st.water[0]); wg.addColorStop(1, st.water[1]); ctx.fillStyle = wg; ctx.fillRect(0, HORIZON, W, GROUND - HORIZON);
    var sx = px(st.sun.x * 1600, cam, zoom, 0.06);
    for (var i = 0; i < 14; i++) { var yy = HORIZON + 6 + i * 11, ww = 30 + i * 12 + Math.sin(t * 0.05 + i) * 10; ctx.fillStyle = hexA(st.sun.c, 0.55 - i * 0.032); ctx.fillRect(sx - ww / 2 + Math.sin(t * 0.04 + i * 2) * 8, yy, ww, 2.4); }
    // navire cargo au loin
    var shx = px(1180, cam, zoom, 0.14); ctx.fillStyle = '#1a1230'; ctx.beginPath(); ctx.moveTo(shx - 150, HORIZON + 4); ctx.lineTo(shx + 160, HORIZON + 4); ctx.lineTo(shx + 120, HORIZON - 16); ctx.lineTo(shx - 130, HORIZON - 16); ctx.closePath(); ctx.fill(); ctx.fillRect(shx + 50, HORIZON - 44, 36, 28); ctx.fillStyle = '#ffd08a'; for (var w = 0; w < 5; w++) ctx.fillRect(shx + 55 + w * 6, HORIZON - 38, 3, 4);
    for (var k = 0; k < 6; k++) { ctx.fillStyle = ['#7a2f6b', '#2a3f6e', '#a8452e', '#2e5a63'][k % 4]; ctx.fillRect(shx - 120 + k * 36, HORIZON - 30, 30, 14); }
    // grues du port
    function crane(wx, hgt, flip) { var x = px(wx, cam, zoom, 0.26), sc = 1 + (zoom - 1) * 0.26; ctx.strokeStyle = '#150d2c'; ctx.fillStyle = '#150d2c'; ctx.lineWidth = 5 * sc; ctx.beginPath(); ctx.moveTo(x - 24 * sc, HORIZON + 22); ctx.lineTo(x - 14 * sc, HORIZON + 22 - hgt * sc); ctx.moveTo(x + 24 * sc, HORIZON + 22); ctx.lineTo(x + 14 * sc, HORIZON + 22 - hgt * sc); ctx.stroke(); ctx.lineWidth = 6 * sc; ctx.beginPath(); ctx.moveTo(x - 60 * sc * flip, HORIZON + 22 - hgt * sc + 8); ctx.lineTo(x + 120 * sc * flip, HORIZON + 22 - hgt * sc - 4); ctx.stroke(); ctx.lineWidth = 2 * sc; ctx.beginPath(); ctx.moveTo(x + 100 * sc * flip, HORIZON + 22 - hgt * sc - 2); ctx.lineTo(x + 100 * sc * flip, HORIZON + 22 - hgt * sc + 40 + Math.sin(t * 0.03) * 6); ctx.stroke(); ctx.fillStyle = '#ff6a3a'; ctx.fillRect(x - 3 * sc, HORIZON + 22 - hgt * sc - 8, 6 * sc, 6 * sc); }
    crane(300, 150, 1); crane(760, 190, -1); crane(1300, 160, 1);
    // piles de conteneurs
    var rr = rng(23); for (var s = 0; s < 14; s++) { var bx = px(80 + s * 115, cam, zoom, 0.5), sc2 = 1 + (zoom - 1) * 0.5, n = 1 + Math.floor(rr() * 3), cw = 56 * sc2; for (var q = 0; q < n; q++) { ctx.fillStyle = mixHex(['#8a2f2f', '#2f5a8a', '#b07a2a', '#2f7a5a', '#6a3a8a'][Math.floor(rr() * 5)], '#150d2c', 0.45); ctx.fillRect(bx - cw / 2, GROUND - 44 - (q + 1) * 20 * sc2 - 8, cw, 19 * sc2); ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (var l = 1; l < 6; l++) ctx.fillRect(bx - cw / 2 + l * cw / 6, GROUND - 44 - (q + 1) * 20 * sc2 - 8, 1.5, 19 * sc2); } }
    // lampadaires
    for (var m = 0; m < 6; m++) { var lx = px(120 + m * 290, cam, zoom, 0.8), sc3 = 1 + (zoom - 1) * 0.8; ctx.fillStyle = '#0f0a22'; ctx.fillRect(lx - 2 * sc3, GROUND - 130 * sc3 - 38, 4 * sc3, 130 * sc3); ctx.fillRect(lx - 2 * sc3, GROUND - 130 * sc3 - 38, 20 * sc3, 4 * sc3); var gl = ctx.createRadialGradient(lx + 16 * sc3, GROUND - 124 * sc3 - 38, 2, lx + 16 * sc3, GROUND - 124 * sc3 - 38, 60 * sc3); gl.addColorStop(0, 'rgba(255,214,140,0.9)'); gl.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = gl; ctx.fillRect(lx - 50 * sc3, GROUND - 200 * sc3 - 38, 140 * sc3, 140 * sc3); }
    crowd(ctx, cam, zoom, t, ['#0b0719', '#120a26', '#1a0f33'], 5, 0.9, GROUND - 36, 1.15 + (zoom - 1) * 0.9);
    ground(ctx, st, cam, zoom, t, ['#3a2a52', '#140d26']);
    // bollards au premier plan
    for (var b = 0; b < 4; b++) { var bx2 = px(260 + b * 360, cam, zoom, 1.05); ctx.fillStyle = '#0b0719'; ctx.fillRect(bx2 - 10 * zoom, H - 30 * zoom, 20 * zoom, 30 * zoom); ctx.fillStyle = '#ffb347'; ctx.fillRect(bx2 - 10 * zoom, H - 30 * zoom, 20 * zoom, 4 * zoom); }
  }

  // ---------- Brazzaville : nuit astrale sur le fleuve ----------
  function drawBrazzaville(ctx, st, cam, zoom, t) {
    sky(ctx, st, t); stars(ctx, t, cam, zoom, 7, 120);
    // voie lactée / aurore astrale
    for (var a = 0; a < 3; a++) { var ag = ctx.createLinearGradient(0, 40 + a * 30, W, 120 + a * 40); ag.addColorStop(0, 'rgba(110,80,255,0)'); ag.addColorStop(0.5, hexA(['#7a5cff', '#37d6ff', '#ff6ad8'][a], 0.16)); ag.addColorStop(1, 'rgba(110,80,255,0)'); ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(0, 90 + a * 24 + Math.sin(t * 0.01 + a) * 10); ctx.bezierCurveTo(W * 0.3, 20 + a * 30, W * 0.6, 160 + a * 20, W, 70 + a * 28); ctx.lineTo(W, 130 + a * 30); ctx.bezierCurveTo(W * 0.6, 210 + a * 20, W * 0.3, 80 + a * 30, 0, 150 + a * 24); ctx.closePath(); ctx.fill(); }
    sunDisc(ctx, st, cam, zoom);
    // rive de Kinshasa au loin
    var r = rng(31); ctx.fillStyle = '#0a1636'; for (var i = 0; i < 40; i++) { var x = px(i * 42 - 60, cam, zoom, 0.12), h = 20 + r() * 50; ctx.fillRect(x, HORIZON - h + 6, 30 * (1 + (zoom - 1) * 0.12), h); }
    // fleuve
    var wg = ctx.createLinearGradient(0, HORIZON + 6, 0, GROUND - 40); wg.addColorStop(0, st.water[0]); wg.addColorStop(1, st.water[1]); ctx.fillStyle = wg; ctx.fillRect(0, HORIZON + 6, W, GROUND - HORIZON - 6);
    var mx = px(st.sun.x * 1600, cam, zoom, 0.06);
    for (var k = 0; k < 12; k++) { ctx.fillStyle = hexA('#d9e8ff', 0.4 - k * 0.03); var ww = 20 + k * 6 + Math.sin(t * 0.05 + k) * 6; ctx.fillRect(mx - ww / 2 + Math.sin(t * 0.03 + k) * 6, HORIZON + 10 + k * 12, ww, 2.2); }
    // gratte-ciels de Brazzaville
    var rr = rng(47); for (var b = 0; b < 16; b++) { var bx = px(30 + b * 100 + rr() * 30, cam, zoom, 0.34), sc = 1 + (zoom - 1) * 0.34, bw = (44 + rr() * 40) * sc, bh = (90 + rr() * 160) * sc; ctx.fillStyle = '#081330'; ctx.fillRect(bx - bw / 2, GROUND - 40 - bh, bw, bh); ctx.fillStyle = 'rgba(120,190,255,0.7)'; for (var wy = 0; wy < bh - 10; wy += 12 * sc) for (var wx = 6; wx < bw - 6; wx += 9 * sc) if (rr() < 0.38) ctx.fillRect(bx - bw / 2 + wx, GROUND - 40 - bh + wy + 6, 4 * sc, 5 * sc); ctx.fillStyle = '#6ad7ff'; ctx.fillRect(bx - 1, GROUND - 40 - bh - 14 * sc, 2 * sc, 14 * sc); }
    // lanternes volantes
    var lr = rng(91); for (var l = 0; l < 14; l++) { var lx = px(lr() * 1600, cam, zoom, 0.55), ly = 90 + lr() * 250 - ((t * (0.15 + lr() * 0.25)) % 260) + 260; ly = ((ly % 300) + 300) % 300 + 40; var lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, 22); lg.addColorStop(0, 'rgba(255,200,110,0.95)'); lg.addColorStop(1, 'rgba(255,160,60,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, 22, 0, 6.3); ctx.fill(); }
    // lampadaires de la promenade
    for (var m = 0; m < 6; m++) { var px2 = px(110 + m * 300, cam, zoom, 0.85), sc3 = 1 + (zoom - 1) * 0.85; ctx.fillStyle = '#050a1c'; ctx.fillRect(px2 - 2 * sc3, GROUND - 124 * sc3 - 38, 4 * sc3, 124 * sc3); var gl = ctx.createRadialGradient(px2, GROUND - 126 * sc3 - 38, 2, px2, GROUND - 126 * sc3 - 38, 70 * sc3); gl.addColorStop(0, 'rgba(120,220,255,0.95)'); gl.addColorStop(1, 'rgba(120,220,255,0)'); ctx.fillStyle = gl; ctx.fillRect(px2 - 70 * sc3, GROUND - 200 * sc3 - 38, 140 * sc3, 140 * sc3); }
    crowd(ctx, cam, zoom, t, ['#040816', '#07102a', '#0b1838'], 9, 0.92, GROUND - 36, 1.15 + (zoom - 1) * 0.9);
    ground(ctx, st, cam, zoom, t, ['#16346e', '#050d26']);
  }

  var STAGES = { 'pointe-noire': drawPointeNoire, 'brazzaville': drawBrazzaville };
  function drawStage(ctx, st, cam, zoom, t) { (STAGES[st.id] || drawPointeNoire)(ctx, st, cam, zoom, t); }

  XS.Stage = { draw: drawStage, GROUND: GROUND, HORIZON: HORIZON, W: W, H: H, px: px };
  if (typeof module !== 'undefined' && module.exports) module.exports = XS.Stage;
})(typeof window !== 'undefined' ? window : globalThis);
