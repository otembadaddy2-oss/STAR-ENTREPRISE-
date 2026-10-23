/* X SAPHIR — ARENA : le rendu d'un combat (caméra, décor, combattants, coups spéciaux, interface de combat).
   Le moteur (core.js) dit ce qui se passe ; ici on le met en images. Tout est dessiné en 960×540 logiques puis mis à l'échelle. */
(function (root) {
  'use strict';
  var XS = root.XS = root.XS || {};
  var Stage = XS.Stage, Draw = XS.Draw, FXC = XS.FX, Data = XS.Data, Core = XS.Core;
  var W = 960, H = 540, GROUND = Stage ? Stage.GROUND : 462;
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function R(a, b) { return a + Math.random() * (b - a); }

  var TXT = {
    fr: { round: 'MANCHE', fight: 'COMBAT !', ko: 'K.O.', perfect: 'PARFAIT', timeup: 'TEMPS ÉCOULÉ', draw: 'ÉGALITÉ', hits: 'COUPS', hit: 'COUP', dmg: 'DÉGÂTS', super: 'SUPER', superReady: 'SUPER PRÊT !', wins: 'GAGNE', final: 'DERNIÈRE MANCHE', training: 'ENTRAÎNEMENT' },
    en: { round: 'ROUND', fight: 'FIGHT!', ko: 'K.O.', perfect: 'PERFECT', timeup: 'TIME UP', draw: 'DRAW', hits: 'HITS', hit: 'HIT', dmg: 'DAMAGE', super: 'SUPER', superReady: 'SUPER READY!', wins: 'WINS', final: 'FINAL ROUND', training: 'TRAINING' }
  };
  var FONT = 'Impact, "Arial Black", "Haettenschweiler", sans-serif';

  function Render(canvas, opts) {
    opts = opts || {};
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.art = opts.art || {}; this.portraits = opts.portraits || {}; this.lang = opts.lang || 'fr';
    this.fx = new FXC(); this.t = 0; this.zoom = 1.2; this.cam = 800; this.ann = null; this.shown = [1, 1]; this.chip = [1, 1]; this.ghosts = [[], []];
    this.stage = Data.stages[0]; this.scale = 1; this.showInputs = false; this.comboPop = [0, 0]; this.lastCombo = [0, 0]; this.fxOn = opts.fx !== false; this.hudOn = true; this.names = null;
    this.resize();
  }
  Render.prototype.tr = function (k) { return (TXT[this.lang] || TXT.fr)[k]; };
  Render.prototype.resize = function () {
    var dpr = Math.min(2, root.devicePixelRatio || 1), w = this.cv.clientWidth || W, s = clamp(w * dpr / W, 0.75, 2.2);
    var nw = Math.round(W * s), nh = Math.round(H * s); if (this.cv.width !== nw) { this.cv.width = nw; this.cv.height = nh; } this.scale = s;
  };
  Render.prototype.setStage = function (id) { for (var i = 0; i < Data.stages.length; i++) if (Data.stages[i].id === id) this.stage = Data.stages[i]; };
  Render.prototype.reset = function (match) { this.fx.reset(); this.ann = null; this.shown = [1, 1]; this.chip = [1, 1]; this.ghosts = [[], []]; this.zoom = 1.15; this.cam = 800; this.lastCombo = [0, 0]; };
  Render.prototype.announce = function (txt, dur, col, big) { this.ann = { txt: txt, t: 0, dur: dur || 70, col: col || '#fff', big: big }; };

  // ---------- événements du moteur → effets ----------
  Render.prototype.onEvents = function (m) {
    var fx = this.fx, ev = m.events, self = this;
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i], C;
      if (e.t === 'hit') { C = Data.chars[e.cid]; fx.hit(e, C.palette.glow, e.big); if (e.combo >= 3 && !e.big) fx.shake = Math.max(fx.shake, 3); }
      else if (e.t === 'block') fx.block(e);
      else if (e.t === 'ko') { fx.ko(e); this.announce(this.tr('ko'), 150, '#ff3b3b', true); }
      else if (e.t === 'super') { fx.cutin(e, Data.chars[e.cid]); }
      else if (e.t === 'special') { var f = m.f[e.who]; fx.callout(f.x + f.face * 10, 205 + f.y, e.name.toUpperCase(), f.C.palette.glow2 || '#fff'); }
      else if (e.t === 'proj') { fx.p.push({ t: 'ring', x: e.x, y: e.y, r: 40, life: 10, max: 10, col: Data.chars[m.f[e.who].cid].palette.glow }); }
      else if (e.t === 'projhit') { fx.p.push({ t: 'ring', x: e.x, y: e.y, r: 60, life: 12, max: 12, col: '#fff' }); }
      else if (e.t === 'land') fx.dust(e.x, e.big ? 9 : 4, e.big);
      else if (e.t === 'jump') fx.dust(e.x, 3, false);
      else if (e.t === 'dash') { fx.dust(e.x, 6, true); }
      else if (e.t === 'tech') { fx.p.push({ t: 'ring', x: e.x, y: 90, r: 90, life: 12, max: 12, col: '#fff' }); fx.callout(e.x, 190, this.lang === 'fr' ? 'BRISÉ !' : 'TECH!', '#fff'); }
      else if (e.t === 'round') { this.fx.reset(); this.ghosts = [[], []]; this.shown = [1, 1]; this.chip = [1, 1]; var last = m.wins[0] === m.winsNeeded - 1 && m.wins[1] === m.winsNeeded - 1; this.announce(last ? this.tr('final') : this.tr('round') + ' ' + e.n, 100, '#fff'); }
      else if (e.t === 'fight') { this.announce(this.tr('fight'), 60, '#ffd34a', true); this.fx.shake = 6; }
      else if (e.t === 'roundEnd') { if (e.perfect) this.perfectAt = m.frame; if (e.timeUp) this.announce(this.tr('timeup'), 100, '#fff'); }
      else if (e.t === 'win') { var wf = m.f[e.who]; this.announce(wf.C.nom + ' ' + this.tr('wins'), 150, wf.C.palette.glow2 || '#fff', true); }
    }
  };
  Render.prototype.tick = function (m) { this.t++; this.fx.update(); if (this.ann) { this.ann.t++; if (this.ann.t > this.ann.dur) this.ann = null; } };

  // ---------- coordonnées ----------
  Render.prototype.view = function () { var z = this.zoom, c = this.cam, self = this; return { zoom: z, cam: c, X: function (wx) { return W / 2 + (wx - c) * z; }, Y: function (wy) { return GROUND - wy * z; } }; };

  // ---------- projectiles ----------
  Render.prototype.drawProj = function (ctx, p, v, t) {
    var X = v.X(p.x), Y = v.Y(p.y), z = v.zoom, r = p.r * z, dir = p.vx >= 0 ? 1 : -1, pal = Data.chars[p.cid].palette, g;
    var flick = 1 + Math.sin(t * 0.7 + p.id) * 0.08;
    function trail(col, len, w) { var gr = ctx.createLinearGradient(X, Y, X - dir * len * z, Y); gr.addColorStop(0, hexA(col, 0.85)); gr.addColorStop(1, hexA(col, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(X, Y - w * z); ctx.lineTo(X - dir * len * z, Y); ctx.lineTo(X, Y + w * z); ctx.closePath(); ctx.fill(); }
    if (p.kind === 'saphir') {
      trail('#5fd0ff', 130, r * 0.95); g = ctx.createRadialGradient(X, Y, 2, X, Y, r * 1.9); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(120,225,255,0.95)'); g.addColorStop(1, 'rgba(40,120,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, r * 1.9 * flick, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#05030a'; ctx.lineWidth = 4 * z; ctx.fillStyle = '#e6fbff'; ctx.beginPath(); ctx.ellipse(X, Y, r * 0.75, r * 0.95, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#5fd0ff'; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.arc(X, Y, r * 1.2, dir > 0 ? -1.1 : Math.PI - 1.1, dir > 0 ? 1.1 : Math.PI + 1.1); ctx.stroke();
    } else if (p.kind === 'disc') {
      trail('#ffcf4a', 100, r * 0.7); ctx.save(); ctx.translate(X, Y); ctx.rotate(t * 0.35 * dir); ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, 6.3); ctx.fill(); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill(); ctx.fillStyle = '#3b3f4c'; for (var i = 0; i < 6; i++) { ctx.rotate(1.047); ctx.fillRect(r * 0.38, -3 * z, r * 0.6, 6 * z); } ctx.fillStyle = '#fff2b8'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 6.3); ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(255,230,140,0.7)'; ctx.lineWidth = 2.5 * z; ctx.beginPath(); ctx.arc(X, Y, r * (1.5 + Math.sin(t * 0.4) * 0.1), 0, 6.3); ctx.stroke();
    } else if (p.kind === 'fire') {
      trail('#ff7a1a', 150, r * 0.9); for (var f = 0; f < 5; f++) { var ox = -dir * (f * 14 + Math.sin(t * 0.5 + f) * 4) * z, oy = Math.sin(t * 0.4 + f * 2) * 6 * z; g = ctx.createRadialGradient(X + ox, Y + oy, 1, X + ox, Y + oy, r * (1.4 - f * 0.18)); g.addColorStop(0, '#fff7b0'); g.addColorStop(0.4, '#ffb02a'); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X + ox, Y + oy, r * (1.4 - f * 0.18) * flick, 0, 6.3); ctx.fill(); }
      ctx.strokeStyle = '#05030a'; ctx.lineWidth = 3 * z; ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(X, Y, r * 0.7, 0, 6.3); ctx.fill(); ctx.stroke();
    } else if (p.kind === 'dark') {
      trail('#ff2a3d', 150, r * 0.9); g = ctx.createRadialGradient(X, Y, 2, X, Y, r * 1.8); g.addColorStop(0, '#000'); g.addColorStop(0.5, 'rgba(120,0,20,0.95)'); g.addColorStop(1, 'rgba(255,30,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, r * 1.8 * flick, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#ff3b4d'; ctx.lineWidth = 3 * z; for (var b = 0; b < 4; b++) { var a0 = t * 0.3 + b * 1.6; ctx.beginPath(); ctx.moveTo(X + Math.cos(a0) * r * 0.5, Y + Math.sin(a0) * r * 0.5); ctx.lineTo(X + Math.cos(a0 + 0.4) * r * 1.2, Y + Math.sin(a0 + 0.4) * r * 1.2); ctx.lineTo(X + Math.cos(a0 - 0.1) * r * 1.7, Y + Math.sin(a0 - 0.1) * r * 1.7); ctx.stroke(); }
      ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.arc(X, Y, r * 0.8, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#ff2a3d'; ctx.lineWidth = 2.5 * z; ctx.stroke();
    } else { // pull : onde magnétique
      for (var q = 0; q < 3; q++) { ctx.strokeStyle = hexA('#ffcf4a', 0.9 - q * 0.25); ctx.lineWidth = (5 - q) * z; ctx.beginPath(); ctx.arc(X - dir * q * 18 * z, Y, r * (1 + q * 0.4), dir > 0 ? -1.1 : Math.PI - 1.1, dir > 0 ? 1.1 : Math.PI + 1.1); ctx.stroke(); }
    }
  };

  // ---------- effets de coups spéciaux et de supers (pendant l'action) ----------
  Render.prototype.moveFx = function (ctx, f, v, t) {
    var mv = f.move; if (f.state !== 'attack' || !mv) return;
    var mf = f.mf, su = mv.su, ac = mv.ac > 90 ? 30 : mv.ac, z = v.zoom, fx = v.X(f.x), pal = f.C.palette, face = f.face, act = mf > su && mf <= su + ac, u = (mf - su) / Math.max(1, ac);
    var hipY = v.Y(f.y + 80);
    if (mv.type === 'super') {
      if (mv.vis === 'beam' && mf > su - 2 && mf < su + ac + 8) {
        var len = 700 * Math.min(1, (mf - su + 4) / 5), wH = (50 + Math.sin(t * 0.9) * 8) * z * Math.min(1, (su + ac + 8 - mf) / 8), x0 = fx + face * 40 * z, y0 = v.Y(f.y + 108);
        var g = ctx.createLinearGradient(x0, y0 - wH, x0, y0 + wH); g.addColorStop(0, hexA(pal.glow, 0)); g.addColorStop(0.35, hexA(pal.glow, 0.85)); g.addColorStop(0.5, '#fff'); g.addColorStop(0.65, hexA(pal.glow, 0.85)); g.addColorStop(1, hexA(pal.glow, 0)); ctx.fillStyle = g; ctx.fillRect(face > 0 ? x0 : x0 - len * z, y0 - wH, len * z, wH * 2);
        ctx.strokeStyle = '#05030a'; ctx.lineWidth = 3; ctx.strokeRect(face > 0 ? x0 : x0 - len * z, y0 - wH * 0.42, len * z, wH * 0.84);
        for (var i = 0; i < 7; i++) { ctx.fillStyle = '#fff'; var sx2 = x0 + face * R(20, len) * z; ctx.beginPath(); ctx.arc(sx2, y0 + R(-wH, wH), R(2, 6) * z, 0, 6.3); ctx.fill(); }
        var gr = ctx.createRadialGradient(x0, y0, 4, x0, y0, 70 * z); gr.addColorStop(0, '#fff'); gr.addColorStop(1, hexA(pal.glow, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x0, y0, 70 * z, 0, 6.3); ctx.fill();
      } else if (mv.vis === 'discharge' && mf > su - 4 && mf < su + ac + 10) {
        var cx = fx, cy = hipY, rr = 210 * z * Math.min(1, (mf - su + 6) / 8);
        ctx.strokeStyle = hexA(pal.glow, 0.9); ctx.lineWidth = 4 * z; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.3); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.arc(cx, cy, rr * 0.96, 0, 6.3); ctx.stroke();
        for (var b = 0; b < 8; b++) { var a = b / 8 * 6.283 + t * 0.3, px = cx, py = cy; ctx.strokeStyle = b % 2 ? '#fff' : pal.glow; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(px, py); for (var s = 1; s <= 6; s++) { var d = rr * s / 6; ctx.lineTo(cx + Math.cos(a) * d + R(-10, 10) * z, cy + Math.sin(a) * d * 0.8 + R(-10, 10) * z); } ctx.stroke(); }
        var gg = ctx.createRadialGradient(cx, cy, 5, cx, cy, rr); gg.addColorStop(0, hexA(pal.glow2, 0.55)); gg.addColorStop(1, hexA(pal.glow, 0)); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.3); ctx.fill();
      } else if (mv.vis === 'wings' && mf > su - 6) {
        var sp = Math.min(1, (mf - su + 8) / 10), wx = fx - face * 10 * z, wy = v.Y(f.y + 125);
        for (var w = 0; w < 2; w++) { var sgn = w ? 1 : -1; for (var fe = 0; fe < 7; fe++) { var ang = -0.4 + fe * 0.3, len2 = (170 - fe * 8) * z * sp, ex = wx - face * Math.cos(ang) * len2, ey = wy - Math.sin(ang + (w ? 0.35 : -0.05)) * len2 * 0.9 + sgn * 0; var gl = ctx.createLinearGradient(wx, wy, ex, ey); gl.addColorStop(0, '#fff7b0'); gl.addColorStop(0.5, '#ff9a1a'); gl.addColorStop(1, 'rgba(255,60,0,0)'); ctx.strokeStyle = gl; ctx.lineWidth = (16 - fe) * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo((wx + ex) / 2, (wy + ey) / 2 - 24 * z * (w ? 1 : -0.3), ex, ey); ctx.stroke(); } }
      } else if (mv.vis === 'eruption' && mf > su - 2 && mf < su + ac + 14) {
        for (var p = 0; p < 7; p++) { var delay = su + p * 3, local = mf - delay; if (local < 0) continue; var hgt = Math.sin(clamp(local / 20, 0, 1) * 3.14) * 190 * z, ox = fx + face * (90 + p * 82) * z, wd = 26 * z; var gr2 = ctx.createLinearGradient(ox, v.Y(0), ox, v.Y(0) - hgt); gr2.addColorStop(0, '#2a0508'); gr2.addColorStop(0.35, '#ff2a3d'); gr2.addColorStop(0.75, '#ffb02a'); gr2.addColorStop(1, 'rgba(255,230,160,0.6)'); ctx.fillStyle = gr2; ctx.beginPath(); ctx.moveTo(ox - wd, v.Y(0)); ctx.lineTo(ox - wd * 0.35, v.Y(0) - hgt); ctx.lineTo(ox + wd * 0.2, v.Y(0) - hgt * 1.12); ctx.lineTo(ox + wd, v.Y(0)); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#05030a'; ctx.lineWidth = 3; ctx.stroke(); }
      }
      return;
    }
    // coups spéciaux
    if (mv.vis === 'flame' && mf > 0 && mf < su + ac + 8) {
      for (var k = 0; k < 6; k++) { var fy = v.Y(f.y + 20 + k * 26), fxx = fx + face * (12 + Math.sin(t * 0.6 + k) * 8) * z, rr2 = (30 - k * 2) * z; var g3 = ctx.createRadialGradient(fxx, fy, 1, fxx, fy, rr2); g3.addColorStop(0, '#fff7b0'); g3.addColorStop(0.45, '#ffa51a'); g3.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(fxx, fy, rr2, 0, 6.3); ctx.fill(); }
    } else if (mv.vis === 'spikes' && mf > su - 2 && mf < su + ac + 10) {
      for (var s2 = 0; s2 < 4; s2++) { var lc = mf - su - s2 * 2; if (lc < 0) continue; var hh = Math.min(1, lc / 4) * (80 + s2 * 20) * z * Math.min(1, (su + ac + 10 - mf) / 8), ox2 = fx + face * (50 + s2 * 34) * z; ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.moveTo(ox2 - 15 * z, v.Y(0)); ctx.lineTo(ox2 + face * 8 * z, v.Y(0) - hh); ctx.lineTo(ox2 + 15 * z, v.Y(0)); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#c4232f'; ctx.beginPath(); ctx.moveTo(ox2 - 10 * z, v.Y(0)); ctx.lineTo(ox2 + face * 8 * z, v.Y(0) - hh * 0.92); ctx.lineTo(ox2 + 8 * z, v.Y(0)); ctx.closePath(); ctx.fill(); }
    } else if (mv.vis === 'pillar' && mf > su - 2 && mf < su + ac + 14) {
      var ph = Math.min(1, (mf - su + 3) / 5) * 190 * z * Math.min(1, (su + ac + 14 - mf) / 10), ox3 = fx + face * 52 * z; ctx.fillStyle = '#05030a'; ctx.fillRect(ox3 - 26 * z, v.Y(0) - ph, 52 * z, ph); var gp = ctx.createLinearGradient(ox3 - 22 * z, 0, ox3 + 22 * z, 0); gp.addColorStop(0, '#5a6073'); gp.addColorStop(0.5, '#e9b73c'); gp.addColorStop(1, '#3b3f4c'); ctx.fillStyle = gp; ctx.fillRect(ox3 - 22 * z, v.Y(0) - ph + 4 * z, 44 * z, ph - 4 * z); ctx.fillStyle = '#05030a'; for (var bb = 0; bb < 5; bb++) ctx.fillRect(ox3 - 22 * z, v.Y(0) - ph + 20 * z + bb * 34 * z, 44 * z, 3 * z);
    } else if (act && (mv.id === 'hp' || mv.id === 'hk' || mv.id === 'chp' || mv.id === 'chk' || mv.id === 'jhp' || mv.id === 'jhk' || mv.anim === 'dp' || mv.anim === 'lunge') && mv.box) {
      // croissant de lame qui suit le geste
      var reach = (mv.box[0] + mv.box[2]) * z, up = (mv.anim === 'dp' || mv.id === 'chp');
      var a0 = up ? -0.2 : -0.9, a1 = up ? -2.3 : 0.9, cxx = fx, cyy = up ? v.Y(f.y + 50) : v.Y(f.y + (mv.box[1] + mv.box[3] / 2)), sw = u * 0.8 + 0.2;
      ctx.save(); ctx.translate(cxx, cyy); ctx.scale(face, 1); ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - u * 0.7)) + ')'; ctx.beginPath(); ctx.arc(0, 0, reach * 0.95, a0, a0 + (a1 - a0) * sw, a1 < a0); ctx.arc(0, 0, reach * 0.62, a0 + (a1 - a0) * sw, a0, a1 > a0); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    if (mv.trail && mf > su - 2 && mf < su + ac + 6) { ctx.strokeStyle = hexA(pal.glow, 0.5); ctx.lineWidth = 3 * z; for (var l = 0; l < 4; l++) { var ly = v.Y(f.y + 40 + l * 28); ctx.beginPath(); ctx.moveTo(fx - face * 20 * z, ly); ctx.lineTo(fx - face * (80 + l * 20) * z, ly); ctx.stroke(); } }
  };

  // ---------- interface de combat ----------
  Render.prototype.barPath = function (ctx, x, y, w, h, side, slant) { // parallélogramme dont l'extérieur est vertical
    ctx.beginPath(); if (side === 0) { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - slant, y + h); ctx.lineTo(x, y + h); } else { ctx.moveTo(x + slant, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); } ctx.closePath();
  };
  Render.prototype.text = function (ctx, txt, x, y, size, fill, stroke, align, skew) {
    ctx.save(); ctx.translate(x, y); if (skew) ctx.transform(1, 0, skew, 1, 0, 0); ctx.font = 'italic 900 ' + size + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.lineJoin = 'round';
    var lw = Math.max(3, size * 0.2);
    ctx.lineWidth = lw + size * 0.07; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.strokeText(txt, 0, size * 0.07);          // ombre portée (épaisseur 3D)
    ctx.lineWidth = lw; ctx.strokeStyle = stroke || '#05030a'; ctx.strokeText(txt, 0, 0);
    if (size >= 16 && /^#[0-9a-f]{6}$/i.test(fill || '')) { // verre : dégradé avec reflet net au milieu
      var g = ctx.createLinearGradient(0, -size * 0.85, 0, size * 0.12); g.addColorStop(0, '#ffffff'); g.addColorStop(0.42, mixc(fill, '#ffffff', 0.55)); g.addColorStop(0.5, fill); g.addColorStop(1, mixc(fill, '#000000', 0.38)); ctx.fillStyle = g;
    } else ctx.fillStyle = fill || '#fff';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  };
  function mixc(a, b, t) { var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); function c(s) { return Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); } return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')'; }
  Render.prototype.hud = function (ctx, m) {
    var BW = 372, BH = 22, BY = 20, slant = 14, i;
    for (i = 0; i < 2; i++) {
      var f = m.f[i], pal = f.C.palette, x = i === 0 ? 62 : W - 62 - BW, hp = clamp(f.hp / f.maxHp, 0, 1);
      this.shown[i] += (hp - this.shown[i]) * 0.5; if (this.chip[i] > hp) this.chip[i] -= Math.max(0.0035, (this.chip[i] - hp) * 0.05); if (this.chip[i] < hp) this.chip[i] = hp;
      // fond
      ctx.fillStyle = '#05030a'; this.barPath(ctx, x - 4, BY - 4, BW + 8, BH + 8, i, slant + 2); ctx.fill();
      ctx.fillStyle = '#2a1620'; this.barPath(ctx, x, BY, BW, BH, i, slant); ctx.fill();
      // blessure récente (orange)
      ctx.save(); this.barPath(ctx, x, BY, BW, BH, i, slant); ctx.clip();
      var cw = BW * this.chip[i], sw = BW * this.shown[i];
      ctx.fillStyle = '#ff7a1a'; ctx.fillRect(i === 0 ? x : x + BW - cw, BY, cw, BH);
      var g = ctx.createLinearGradient(0, BY, 0, BY + BH); var low = hp < 0.3; g.addColorStop(0, low ? '#ff6a6a' : '#fff59a'); g.addColorStop(0.5, low ? '#e0242c' : '#ffd21a'); g.addColorStop(1, low ? '#8a0f1c' : '#e08a00');
      ctx.fillStyle = g; ctx.fillRect(i === 0 ? x : x + BW - sw, BY, sw, BH);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(i === 0 ? x : x + BW - sw, BY + 2, sw, 4);
      ctx.restore();
      ctx.strokeStyle = pal.glow; ctx.lineWidth = 2; this.barPath(ctx, x, BY, BW, BH, i, slant); ctx.stroke();
      // portrait
      var img = this.portraits[f.cid], px = i === 0 ? 8 : W - 8 - 52, py = 8;
      ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.arc(px + 26, py + 26, 30, 0, 6.3); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(px + 26, py + 26, 25, 0, 6.3); ctx.clip(); if (img && img.complete && img.naturalWidth) { var fc = f.C.face; ctx.drawImage(img, fc[0], fc[1], fc[2], fc[3], px + 1, py + 1, 50, 50); } else { ctx.fillStyle = pal.suit; ctx.fillRect(px, py, 52, 52); } ctx.restore();
      ctx.strokeStyle = pal.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + 26, py + 26, 26, 0, 6.3); ctx.stroke();
      // nom
      this.text(ctx, f.C.nom, i === 0 ? x : x + BW, BY + BH + 20, 19, '#fff', '#05030a', i === 0 ? 'left' : 'right', -0.12);
      if (f.cpu && m.mode !== 'versus') this.text(ctx, 'CPU', i === 0 ? x + 150 : x + BW - 150, BY + BH + 19, 12, '#ffcf4a', '#05030a', i === 0 ? 'left' : 'right', -0.12);
      // manches gagnées
      for (var r = 0; r < m.winsNeeded; r++) { var cx = i === 0 ? x + BW + 2 - 4 - 0 + 0 : x - 2; var rx = i === 0 ? W / 2 - 52 - r * 18 : W / 2 + 52 + r * 18, ry = 62; ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.moveTo(rx, ry - 9); ctx.lineTo(rx + 9, ry); ctx.lineTo(rx, ry + 9); ctx.lineTo(rx - 9, ry); ctx.closePath(); ctx.fill(); ctx.fillStyle = r < f.rounds ? '#ffd34a' : '#2a1d3a'; ctx.beginPath(); ctx.moveTo(rx, ry - 6.5); ctx.lineTo(rx + 6.5, ry); ctx.lineTo(rx, ry + 6.5); ctx.lineTo(rx - 6.5, ry); ctx.closePath(); ctx.fill(); }
    }
    // chrono
    ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.moveTo(W / 2, 10); ctx.lineTo(W / 2 + 40, 36); ctx.lineTo(W / 2, 62); ctx.lineTo(W / 2 - 40, 36); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 3; ctx.stroke();
    var inf = m.mode === 'training' && m.training.infinite; this.text(ctx, inf ? '∞' : String(Math.max(0, m.timer)), W / 2, 47, inf ? 34 : 33, m.timer <= 10 && !inf ? '#ff5a5a' : '#fff', '#05030a', 'center', 0);
    // jauges de super
    for (i = 0; i < 2; i++) {
      var ff = m.f[i], sx = i === 0 ? 30 : W - 30 - 330, sw2 = 330, sy = H - 34, full = ff.rage >= 100, pulse = 0.5 + 0.5 * Math.sin(this.t * 0.25);
      ctx.fillStyle = '#05030a'; this.barPath(ctx, sx - 3, sy - 3, sw2 + 6, 20, i, 12); ctx.fill(); ctx.fillStyle = '#1a1230'; this.barPath(ctx, sx, sy, sw2, 14, i, 10); ctx.fill();
      ctx.save(); this.barPath(ctx, sx, sy, sw2, 14, i, 10); ctx.clip(); var rw = sw2 * clamp(ff.rage / 100, 0, 1); var gg = ctx.createLinearGradient(sx, 0, sx + sw2, 0); gg.addColorStop(0, '#2b6fff'); gg.addColorStop(1, full ? '#ffe27a' : '#5fd0ff'); ctx.fillStyle = full ? hexA('#ffd34a', 0.7 + 0.3 * pulse) : gg; ctx.fillRect(i === 0 ? sx : sx + sw2 - rw, sy, rw, 14); ctx.restore();
      ctx.strokeStyle = full ? '#ffd34a' : '#8aa6ff'; ctx.lineWidth = full ? 3 : 2; this.barPath(ctx, sx, sy, sw2, 14, i, 10); ctx.stroke();
      this.text(ctx, full ? this.tr('superReady') : this.tr('super'), i === 0 ? sx + 4 : sx + sw2 - 4, sy - 6, full ? 17 : 13, full ? '#ffe27a' : '#cfe0ff', '#05030a', i === 0 ? 'left' : 'right', -0.12);
    }
    // compteur de coups
    for (i = 0; i < 2; i++) {
      var ff2 = m.f[i], vis = ff2.lastCombo >= 2 && m.frame - ff2.lastHitFrame < 110;
      if (ff2.lastCombo !== this.lastCombo[i]) { this.comboPop[i] = 1; this.lastCombo[i] = ff2.lastCombo; } this.comboPop[i] *= 0.86;
      if (!vis) continue; var al = clamp((110 - (m.frame - ff2.lastHitFrame)) / 30, 0, 1), sc = 1 + this.comboPop[i] * 0.45, cx2 = i === 0 ? 70 : W - 70, cy2 = 190;
      ctx.save(); ctx.globalAlpha = al; ctx.translate(cx2, cy2); ctx.scale(sc, sc);
      this.text(ctx, String(ff2.lastCombo), i === 0 ? -6 : 6, 0, 76, '#ffd34a', '#05030a', i === 0 ? 'left' : 'right', -0.12);
      var nw = String(ff2.lastCombo).length * 38; this.text(ctx, this.tr('hits'), i === 0 ? nw : -nw, -4, 24, '#fff', '#05030a', i === 0 ? 'left' : 'right', -0.12);
      this.text(ctx, ff2.lastComboDmg + ' ' + this.tr('dmg'), i === 0 ? -4 : 4, 28, 16, '#ffb0a0', '#05030a', i === 0 ? 'left' : 'right', -0.12); ctx.restore();
    }
    // historique des commandes (entraînement)
    if (this.showInputs) { var h = m.f[0].hist, y0 = 140, shown = 0, last = null; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left'; var rows = [];
      for (i = h.length - 1; i >= 0 && rows.length < 12; i--) { var key = h[i].d + ':' + (h[i].b & 127); if (key !== last) { rows.push(h[i]); last = key; } }
      var arrows = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 5: '·', 6: '→', 7: '↖', 8: '↑', 9: '↗' };
      rows.forEach(function (e, idx) { var b = e.b, s = arrows[e.d] + ' ' + (b & 1 ? 'P ' : '') + (b & 2 ? 'PP ' : '') + (b & 4 ? 'K ' : '') + (b & 8 ? 'KK ' : '') + (b & 16 ? 'SUP ' : '') + (b & 32 ? 'SP ' : '') + (b & 64 ? 'THR' : ''); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(8, y0 + idx * 17 - 12, 150, 16); ctx.fillStyle = idx === 0 ? '#ffd34a' : '#cfe0ff'; ctx.fillText(s, 12, y0 + idx * 17); }); }
    // annonce
    if (this.ann) {
      var a = this.ann, u = a.t / a.dur, inn = clamp(a.t / 8, 0, 1), out = clamp((a.dur - a.t) / 10, 0, 1), s2 = (a.big ? 1.5 : 1) * (1 + (1 - inn) * 1.6) * (1 + (1 - Math.min(1, a.t / 12)) * 0.0), al2 = Math.min(inn, out);
      ctx.save(); ctx.globalAlpha = al2; ctx.translate(W / 2, H * 0.4); ctx.scale(s2, s2); this.text(ctx, a.txt, 0, 0, a.big ? 74 : 64, a.col, '#05030a', 'center', -0.12); ctx.restore();
    }
    if (this.perfectAt && m.frame - this.perfectAt < 90 && m.frame - this.perfectAt > 0 && m.phase !== 'intro') { var pu = (m.frame - this.perfectAt) / 90; ctx.save(); ctx.globalAlpha = clamp(1 - pu, 0, 1); this.text(ctx, this.tr('perfect'), W / 2, H * 0.56, 54, '#ffd34a', '#05030a', 'center', -0.12); ctx.restore(); }
  };

  // ---------- une image ----------
  Render.prototype.draw = function (m) {
    var ctx = this.ctx, s = this.scale, a = m.f[0], b = m.f[1], fx = this.fx;
    var dist = Math.abs(a.x - b.x), target = clamp(W / (dist + 400), 0.86, 1.32);
    var cut = fx.cut; if (cut) target *= 1.08;
    this.zoom += (target + fx.zoomPunch - this.zoom) * 0.14;
    var viewW = W / this.zoom, tx = (a.x + b.x) / 2; if (cut) tx = m.f[cut.who].x * 0.6 + tx * 0.4;
    tx = clamp(tx, viewW / 2, 1600 - viewW / 2); this.cam += (tx - this.cam) * 0.16;
    fx.lowFx = this.lowFx; fx.flashOn = this.flashOn !== false; var shk = fx.shake * (this.lowFx ? 0.35 : 1), v = this.view(), ox = (Math.random() - 0.5) * 2 * shk, oy = (Math.random() - 0.5) * 2 * shk * 0.7;
    ctx.setTransform(s, 0, 0, s, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(ox, oy);
    ctx.translate(W / 2, H / 2); ctx.scale(1.03, 1.03); ctx.translate(-W / 2, -H / 2);   // léger débord : le tremblement ne montre jamais le bord
    Stage.draw(ctx, this.stage, this.cam, this.zoom, this.t);
    // image rémanente
    var self = this;
    [0, 1].forEach(function (i) { var f = m.f[i], g = self.ghosts[i], fast = f.state === 'dashF' || (f.state === 'attack' && f.move && (f.move.trail || f.move.type === 'super' && f.move.mv)); if (fast && !self.lowFx && self.t % 2 === 0 && m.hitstop === 0) g.push({ f: Object.assign({}, f), life: 9 }); if (g.length > 8) g.shift(); for (var k = g.length - 1; k >= 0; k--) { g[k].life--; if (g[k].life <= 0) { g.splice(k, 1); continue; } ctx.globalAlpha = 0.28 * g[k].life / 9; Draw.drawFighter(ctx, g[k].f, v.X(g[k].f.x), GROUND, v.zoom, { tint: f.C.palette.glow, noGlow: true, noShadow: true }); ctx.globalAlpha = 1; } });
    // ordre de dessin : celui qui prend le coup derrière
    var order = (a.state === 'hit' || a.state === 'airhit' || a.state === 'ko' || a.state === 'knockdown' || a.state === 'block' || a.state === 'thrown') ? [a, b] : [b, a];
    if (a.state === 'attack' && b.state !== 'attack') order = [b, a]; else if (b.state === 'attack' && a.state !== 'attack') order = [a, b];
    // supers qui frappent derrière les combattants
    order.forEach(function (f) { self.moveFx(ctx, f, v, self.t); });
    order.forEach(function (f) {
      var jx = 0, jy = 0; if (m.hitstop > 0 && (f.state === 'hit' || f.state === 'block' || f.state === 'airhit' || f.state === 'thrown')) { jx = (Math.random() - 0.5) * 7; jy = (Math.random() - 0.5) * 3; }
      Draw.drawFighter(ctx, f, v.X(f.x) + jx, GROUND + jy, v.zoom, {});
      if (f.flash > 3) { ctx.globalAlpha = 0.55; Draw.drawFighter(ctx, f, v.X(f.x) + jx, GROUND + jy, v.zoom, { tint: '#ffffff', noGlow: true, noShadow: true }); ctx.globalAlpha = 1; }
    });
    m.proj.forEach(function (p) { self.drawProj(ctx, p, v, self.t); });
    fx.drawWorld(ctx, v);
    ctx.restore();
    // vignette
    var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.0); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (m.phase === 'ko' && m.slow < 1) { ctx.fillStyle = 'rgba(80,0,10,0.18)'; ctx.fillRect(0, 0, W, H); }
    fx.drawScreen(ctx, { sx: function (x) { return v.X(x); }, sy: function (y) { return v.Y(y); } });
    if (this.hudOn) this.hud(ctx, m);
    fx.drawCutin(ctx, this.art);
  };

  XS.Render = Render;
  if (typeof module !== 'undefined' && module.exports) module.exports = Render;
})(typeof window !== 'undefined' ? window : globalThis);
