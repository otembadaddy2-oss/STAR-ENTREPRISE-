/* X SAPHIR — ARENA : les effets spéciaux « façon Street Fighter 6 ».
   Taches d'encre et de peinture qui éclaboussent l'écran, flashs de couleur, lignes de vitesse, caméra qui tremble,
   étincelles, poussière, ondes de choc, et le grand plan de la super (« cut-in »). Les événements du moteur de combat
   (coup, blocage, K.O., super…) déclenchent chacun leur effet. */
(function (root) {
  'use strict';
  var XS = root.XS = root.XS || {};
  var W = 960, H = 540;
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function R(a, b) { return a + Math.random() * (b - a); }
  function easeOut(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }

  function blob(n, spiky) { var pts = [], i; for (i = 0; i < n; i++) { var a = i / n * 6.2832, r = spiky ? (i % 2 ? R(0.45, 0.7) : R(0.9, 1.35)) : R(0.72, 1.25); pts.push([Math.cos(a) * r, Math.sin(a) * r]); } return pts; }
  function drawBlob(ctx, pts, x, y, r, rot) {
    ctx.beginPath(); var n = pts.length, c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    for (var i = 0; i <= n; i++) { var p = pts[i % n], q = pts[(i + 1) % n], ax = p[0], ay = p[1], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; var X = x + (mx * c - my * s) * r, Y = y + (mx * s + my * c) * r; if (i === 0) ctx.moveTo(X, Y); else ctx.quadraticCurveTo(x + (ax * c - ay * s) * r, y + (ax * s + ay * c) * r, X, Y); }
    ctx.closePath(); ctx.fill();
  }

  function FX() { this.reset(); }
  FX.prototype.reset = function () { this.p = []; this.stains = []; this.flashes = []; this.lines = []; this.cut = null; this.shake = 0; this.zoomPunch = 0; this.koT = 0; this.texts = []; this.freezeShake = 0; };

  // x, y en monde ; col = couleur du héros
  FX.prototype.hit = function (e, col, big) {
    var pw = e.power || 40, sz = 22 + pw * 0.42 + (big ? 22 : 0);
    this.p.push({ t: 'splat', x: e.x, y: e.y, r: sz, life: big ? 20 : 14, max: big ? 20 : 14, col: col, pts: blob(big ? 18 : 12, true), pts2: blob(10, false), rot: R(0, 6.28), face: e.face });
    this.p.push({ t: 'burst', x: e.x, y: e.y, r: sz * 2.2, life: 9, max: 9, n: big ? 16 : 10, rot: R(0, 6.28) });
    this.p.push({ t: 'ring', x: e.x, y: e.y, r: sz * (big ? 3.2 : 2.2), life: 12, max: 12, col: col });
    var n = big ? 16 : 7; for (var i = 0; i < n; i++) { var a = (e.face > 0 ? 0 : Math.PI) + R(-1.1, 1.1), v = R(3, big ? 15 : 9); this.p.push({ t: 'spark', x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.9 + R(0, 3), life: R(10, 22), max: 22, col: i % 3 === 0 ? '#fff' : col, w: R(1.6, 3.4) }); }
    this.shake = Math.max(this.shake, clamp(2 + pw * 0.045 + (big ? 6 : 0), 2, 18));
    if (big || pw >= 80) { this.zoomPunch = Math.max(this.zoomPunch, big ? 0.07 : 0.03); }
    if (big) { var strong = pw >= 90 || e.type === 'super' ? e.combo <= 1 || e.type !== 'super' : false; if (!this.lastBig || this.age - this.lastBig > 10) { this.flashes.push({ col: '#ffffff', a: 0.5, life: 5, max: 5 }); this.flashes.push({ col: col, a: 0.28, life: 9, max: 9 }); this.lines.push({ x: e.x, y: e.y, life: 12, max: 12, col: '#fff', n: 26 }); this.splatter(col, 2 + Math.floor(pw / 60)); this.lastBig = this.age; } }
    else if (pw >= 60) { this.splatter(col, 2); }
  };
  FX.prototype.splatter = function (col, n) { // taches de peinture projetées sur l'écran (graffiti)
    if (this.stains.length > 7) return;
    n = Math.min(n, 3);
    for (var i = 0; i < n; i++) { var edge = Math.random() < 0.7, x = edge ? (Math.random() < 0.5 ? R(20, 190) : R(W - 190, W - 20)) : R(60, W - 60), y = R(90, H - 90), r = R(12, 44); this.stains.push({ x: x, y: y, r: r, col: i % 3 === 2 ? '#111' : col, life: 42, max: 42, pts: blob(14, true), rot: R(0, 6.28), drops: [R(-1, 1), R(-1, 1), R(0.4, 1)] }); }
  };
  FX.prototype.block = function (e) {
    this.p.push({ t: 'ring', x: e.x, y: e.y, r: 54, life: 10, max: 10, col: '#bfe6ff' });
    this.p.push({ t: 'shield', x: e.x, y: e.y, r: 38, life: 12, max: 12, face: e.face });
    for (var i = 0; i < 6; i++) { var a = (e.face > 0 ? 0 : Math.PI) + R(-1, 1); this.p.push({ t: 'spark', x: e.x, y: e.y, vx: Math.cos(a) * R(2, 7), vy: Math.sin(a) * R(2, 7), life: 12, max: 12, col: '#d8f0ff', w: 2 }); }
    this.shake = Math.max(this.shake, 2.5);
  };
  FX.prototype.dust = function (x, n, big) { for (var i = 0; i < n; i++) this.p.push({ t: 'dust', x: x + R(-18, 18), y: 2, vx: R(-2, 2) * (big ? 2 : 1), vy: R(0.5, 2.2), r: R(6, big ? 22 : 13), life: R(18, 34), max: 34 }); };
  FX.prototype.callout = function (x, y, txt, col) { this.texts.push({ x: x, y: y, txt: txt, col: col, life: 46, max: 46 }); };
  FX.prototype.ko = function (e) { this.koT = 1; this.shake = 24; this.flashes.push({ col: '#ffffff', a: 0.95, life: 9, max: 9 }); this.flashes.push({ col: '#ff2a3d', a: 0.4, life: 22, max: 22 }); this.lines.push({ x: e.x, y: e.y, life: 26, max: 26, col: '#fff', n: 40 }); this.splatter('#ff2a3d', 8); this.zoomPunch = 0.12; };
  FX.prototype.cutin = function (e, C) { this.cut = { who: e.who, name: e.name, cid: e.cid, C: C, t: 0, dur: 56 }; this.shake = Math.max(this.shake, 6); this.flashes.push({ col: C.palette.glow, a: 0.7, life: 6, max: 6 }); };

  FX.prototype.update = function () {
    var i; this.age = (this.age || 0) + 1;
    for (i = this.p.length - 1; i >= 0; i--) { var q = this.p[i]; q.life--; if (q.t === 'spark') { q.x += q.vx; q.y += q.vy; q.vy -= 0.5; q.vx *= 0.96; } else if (q.t === 'dust') { q.x += q.vx; q.y += q.vy; q.vx *= 0.94; q.vy *= 0.96; } if (q.life <= 0) this.p.splice(i, 1); }
    for (i = this.stains.length - 1; i >= 0; i--) { if (--this.stains[i].life <= 0) this.stains.splice(i, 1); }
    for (i = this.flashes.length - 1; i >= 0; i--) { if (--this.flashes[i].life <= 0) this.flashes.splice(i, 1); }
    for (i = this.lines.length - 1; i >= 0; i--) { if (--this.lines[i].life <= 0) this.lines.splice(i, 1); }
    for (i = this.texts.length - 1; i >= 0; i--) { this.texts[i].life--; this.texts[i].y += 0.6; if (this.texts[i].life <= 0) this.texts.splice(i, 1); }
    if (this.cut) { this.cut.t++; if (this.cut.t >= this.cut.dur) this.cut = null; }
    this.shake *= 0.84; if (this.shake < 0.15) this.shake = 0; this.zoomPunch *= 0.88;
  };

  // ---------- dessin dans le monde (v.X(wx) / v.Y(wy) donnent l'écran) ----------
  FX.prototype.drawWorld = function (ctx, v) {
    for (var i = 0; i < this.p.length; i++) {
      var q = this.p[i], u = 1 - q.life / q.max, X = v.X(q.x), Y = v.Y(q.y), z = v.zoom;
      if (q.t === 'splat') {
        var s = (0.55 + easeOut(Math.min(1, u * 3)) * 0.65) * q.r * z, fade = q.life / q.max;
        ctx.globalAlpha = Math.min(1, fade * 2.2);
        ctx.fillStyle = '#05030a'; drawBlob(ctx, q.pts, X, Y, s * 1.12, q.rot);
        ctx.fillStyle = q.col; drawBlob(ctx, q.pts2, X + 2, Y - 2, s * 0.86, q.rot + 1);
        ctx.fillStyle = '#fff'; drawBlob(ctx, q.pts2, X + 3, Y - 3, s * 0.42, q.rot + 2);
        ctx.globalAlpha = 1;
      } else if (q.t === 'burst') {
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - u) + ')'; ctx.lineWidth = 2.6 * z; ctx.lineCap = 'round';
        for (var k = 0; k < q.n; k++) { var a = q.rot + k / q.n * 6.283, r0 = q.r * (0.25 + u * 0.4), r1 = q.r * (0.55 + u * 0.7); ctx.beginPath(); ctx.moveTo(X + Math.cos(a) * r0 * z, Y + Math.sin(a) * r0 * z); ctx.lineTo(X + Math.cos(a) * r1 * z, Y + Math.sin(a) * r1 * z); ctx.stroke(); }
      } else if (q.t === 'ring') {
        ctx.strokeStyle = hexA(q.col, 1 - u); ctx.lineWidth = (6 - u * 5) * z; ctx.beginPath(); ctx.arc(X, Y, q.r * easeOut(u) * z, 0, 6.3); ctx.stroke();
      } else if (q.t === 'shield') {
        ctx.strokeStyle = 'rgba(190,230,255,' + (1 - u) + ')'; ctx.lineWidth = 5 * z; ctx.beginPath(); ctx.arc(X, Y, q.r * z * (0.7 + u * 0.5), q.face > 0 ? Math.PI * 0.62 : -Math.PI * 0.38, q.face > 0 ? Math.PI * 1.38 : Math.PI * 0.38); ctx.stroke();
      } else if (q.t === 'spark') {
        ctx.strokeStyle = q.col; ctx.globalAlpha = q.life / q.max; ctx.lineWidth = q.w * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - q.vx * z * 1.6, Y + q.vy * z * 1.6); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (q.t === 'dust') {
        ctx.fillStyle = 'rgba(210,200,190,' + (0.35 * (q.life / q.max)) + ')'; ctx.beginPath(); ctx.arc(X, Y - 4 * z, q.r * (1 + u * 0.8) * z, 0, 6.3); ctx.fill();
      }
    }
    for (i = 0; i < this.texts.length; i++) {
      var t = this.texts[i], a = Math.min(1, t.life / 14), sc = 1 + (1 - t.life / t.max) * 0.1;
      ctx.save(); ctx.translate(v.X(t.x), v.Y(t.y)); ctx.rotate(-0.07); ctx.scale(sc, sc); ctx.globalAlpha = a; ctx.font = 'italic 900 ' + Math.round(22 * v.zoom) + 'px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 7 * v.zoom; ctx.strokeStyle = '#05030a'; ctx.strokeText(t.txt, 0, 0); ctx.fillStyle = t.col; ctx.fillText(t.txt, 0, 0); ctx.restore();
    }
  };

  // ---------- dessin plein écran ----------
  FX.prototype.drawScreen = function (ctx, ctl) {
    var i;
    if (!this.lowFx) for (i = 0; i < this.stains.length; i++) {
      var s = this.stains[i], u = 1 - s.life / s.max, a = s.life < 20 ? s.life / 20 : 1, r = s.r * (0.6 + easeOut(Math.min(1, u * 5)) * 0.4);
      ctx.globalAlpha = a * 0.6; ctx.fillStyle = s.col; drawBlob(ctx, s.pts, s.x, s.y, r, s.rot);
      ctx.beginPath(); ctx.arc(s.x + s.drops[0] * r * 1.6, s.y + s.drops[1] * r * 1.6, r * 0.2 * s.drops[2], 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.arc(s.x - s.drops[1] * r * 1.4, s.y + s.drops[0] * r * 1.3, r * 0.14, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (!this.lowFx) for (i = 0; i < this.lines.length; i++) {
      var l = this.lines[i], u2 = 1 - l.life / l.max; ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - u2)) + ')'; ctx.lineWidth = 2.2; ctx.beginPath();
      var cx = ctl.sx(l.x), cy = ctl.sy(l.y); for (var k = 0; k < l.n; k++) { var an = k / l.n * 6.283 + (k % 3) * 0.05, r0 = 90 + Math.random() * 120, r1 = r0 + 160 + Math.random() * 260; ctx.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); ctx.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); } ctx.stroke();
    }
    for (i = 0; i < this.flashes.length && this.flashOn !== false; i++) { var f = this.flashes[i]; ctx.globalAlpha = f.a * (f.life / f.max) * (this.lowFx ? 0.5 : 1); ctx.fillStyle = f.col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  };

  // ---------- le grand plan de la super ----------
  FX.prototype.drawCutin = function (ctx, art) {
    var c = this.cut; if (!c) return;
    var t = c.t, d = c.dur, pal = c.C.palette, slideIn = easeOut(Math.min(1, t / 10)), out = t > d - 8 ? (t - (d - 8)) / 8 : 0, a = 1 - out;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(4,2,12,0.74)'; ctx.fillRect(0, 0, W, H);
    // rayons derrière
    ctx.save(); ctx.translate(W * 0.5, H * 0.5); var rot = t * 0.01; ctx.fillStyle = hexA(pal.glow, 0.16);
    for (var i = 0; i < 18; i++) { ctx.beginPath(); ctx.moveTo(0, 0); var a0 = rot + i / 18 * 6.283, a1 = a0 + 0.1; ctx.lineTo(Math.cos(a0) * 900, Math.sin(a0) * 900); ctx.lineTo(Math.cos(a1) * 900, Math.sin(a1) * 900); ctx.closePath(); ctx.fill(); } ctx.restore();
    // bande diagonale de couleur
    var bandY = H * 0.5 + (1 - slideIn) * 120, side = c.who === 0 ? 1 : -1;
    ctx.save(); ctx.translate(W / 2, bandY); ctx.rotate(-0.12 * side);
    var g = ctx.createLinearGradient(-W, 0, W, 0); g.addColorStop(0, hexA(pal.glow, 0)); g.addColorStop(0.25, hexA(pal.glow, 0.95)); g.addColorStop(0.75, hexA(pal.suitLight, 0.95)); g.addColorStop(1, hexA(pal.suitLight, 0));
    ctx.fillStyle = g; ctx.fillRect(-W, -86, W * 2, 172); ctx.fillStyle = '#05030a'; ctx.fillRect(-W, -92, W * 2, 6); ctx.fillRect(-W, 86, W * 2, 6);
    ctx.restore();
    // portrait du héros qui glisse
    var img = art && art[c.cid];
    var px = (c.who === 0 ? -1 : 1) * (1 - slideIn) * 500 + (c.who === 0 ? W * 0.3 : W * 0.7), size = 420 + Math.sin(t * 0.12) * 6;
    if (img && img.complete && img.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.moveTo(px - size * 0.5, H * 0.5 + 150); ctx.lineTo(px - size * 0.32, H * 0.5 - size * 0.45); ctx.lineTo(px + size * 0.5, H * 0.5 - size * 0.5); ctx.lineTo(px + size * 0.32, H * 0.5 + 150); ctx.closePath(); ctx.clip(); var fc = c.C.face || [0, 0, img.naturalWidth, img.naturalHeight]; ctx.drawImage(img, fc[0], fc[1], fc[2], fc[3], px - size * 0.5, H * 0.5 - size * 0.5 + 10, size, size); ctx.restore();
      ctx.strokeStyle = '#05030a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px - size * 0.5, H * 0.5 + 150); ctx.lineTo(px - size * 0.32, H * 0.5 - size * 0.45); ctx.lineTo(px + size * 0.5, H * 0.5 - size * 0.5); ctx.lineTo(px + size * 0.32, H * 0.5 + 150); ctx.closePath(); ctx.stroke(); }
    // nom de la super
    ctx.save(); ctx.translate(W * 0.5 + (c.who === 0 ? 1 : -1) * (1 - slideIn) * -400, H * 0.5 + 6); ctx.rotate(-0.12 * side); ctx.font = 'italic 900 76px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    var tx = c.who === 0 ? 150 : -150; ctx.lineWidth = 16; ctx.strokeStyle = '#05030a'; ctx.strokeText(c.name, tx, 20); ctx.fillStyle = '#fff'; ctx.fillText(c.name, tx, 20);
    var tg = ctx.createLinearGradient(0, -30, 0, 40); tg.addColorStop(0, '#fff'); tg.addColorStop(0.5, pal.glow2 || '#fff'); tg.addColorStop(1, pal.glow); ctx.fillStyle = tg; ctx.fillText(c.name, tx, 20); ctx.restore();
    ctx.restore();
  };

  XS.FX = FX;
  if (typeof module !== 'undefined' && module.exports) module.exports = FX;
})(typeof window !== 'undefined' ? window : globalThis);
