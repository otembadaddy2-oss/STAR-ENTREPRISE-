/* X SAPHIR — ARENA : le dessin des combattants.
   Chaque combattant est un squelette (hanche, torse, tête, deux bras, deux jambes) dessiné au trait d'encre épais :
   contour noir, aplats de couleur, reflets, lueur de la couleur du héros. Les poses sont des angles (en degrés) :
   0 = le membre pend vers le bas, 90 = il part vers l'avant, 180 = il monte tout droit. Même squelette pour les quatre
   combattants : ce sont les palettes et les accessoires (cheveux, cornes, brassards…) qui les distinguent. */
(function (root) {
  'use strict';
  var XS = root.XS = root.XS || {};
  var KEYS = ['hx', 'tl', 'hd', 'fu', 'ff', 'bu', 'bf', 'ft', 'fs', 'bt', 'bs', 'rot', 'hh', 'open'];
  var D2R = Math.PI / 180;

  // ---------- poses de base ----------
  function P(o, base) { var r = {}; for (var i = 0; i < KEYS.length; i++) { var k = KEYS[i]; r[k] = o && o[k] !== undefined ? o[k] : (base && base[k] !== undefined ? base[k] : (k === 'hh' ? null : 0)); } return r; }
  var IDLE = P({ hx: 0, tl: 7, hd: -3, fu: 52, ff: 128, bu: 34, bf: 142, ft: 24, fs: -6, bt: -26, bs: -12, rot: 0 });
  var CROUCH = P({ hx: 2, tl: 22, hd: -8, fu: 58, ff: 124, bu: 38, bf: 138, ft: 72, fs: -22, bt: -52, bs: -30 });
  var JUMP = P({ hx: 0, tl: 4, hd: 0, fu: 70, ff: 150, bu: 40, bf: 150, ft: 52, fs: -22, bt: -6, bs: 26 });
  var BLOCK = P({ hx: -4, tl: 2, hd: 2, fu: 92, ff: 168, bu: 80, bf: 164, ft: 34, fs: -14, bt: -34, bs: -18 });
  var CBLOCK = P({ hx: -2, tl: 18, hd: 0, fu: 96, ff: 168, bu: 86, bf: 164, ft: 74, fs: -22, bt: -54, bs: -30 });
  var HIT = P({ hx: -10, tl: -16, hd: -22, fu: 20, ff: 70, bu: -10, bf: 50, ft: 14, fs: -10, bt: -30, bs: -18 });
  var CHIT = P({ hx: -8, tl: 4, hd: -20, fu: 22, ff: 74, bu: -6, bf: 54, ft: 66, fs: -26, bt: -54, bs: -32 });
  var AIRHIT = P({ hx: 0, tl: -20, hd: -30, fu: 130, ff: 150, bu: 150, bf: 130, ft: 40, fs: 10, bt: -20, bs: 14, rot: 40 });
  var LIE = P({ hx: 0, tl: 0, hd: 0, fu: 20, ff: 30, bu: -10, bf: 20, ft: 12, fs: 6, bt: -10, bs: 4, rot: 90 });
  var WIN = P({ hx: 0, tl: -6, hd: -6, fu: 160, ff: 176, bu: 30, bf: 136, ft: 20, fs: -8, bt: -24, bs: -12 });
  var INTRO = P({ hx: 0, tl: 12, hd: 4, fu: 70, ff: 140, bu: 60, bf: 150, ft: 34, fs: -10, bt: -36, bs: -16 });

  // ---------- coups : poses d'armement (W) et d'extension (A) ----------
  var MOVES = {
    lp:  { W: { fu: 14, ff: 150, tl: 2 }, A: { fu: 90, ff: 88, tl: 14, hx: 8 } },
    hp:  { W: { fu: -8, ff: 96, bu: 52, bf: 130, tl: -6, hx: -8 }, A: { fu: 94, ff: 92, bu: 70, bf: 120, tl: 26, hx: 18, ft: 44, fs: 2, bt: -34, bs: -16 } },
    lk:  { W: { ft: 54, fs: 8, tl: -4 }, A: { ft: 86, fs: 84, tl: -12, hx: 2, bt: -8, bs: -4 } },
    hk:  { W: { ft: 40, fs: -22, tl: -8 }, A: { ft: 118, fs: 104, tl: -26, hx: -2, bt: -4, bs: -2, fu: 40, ff: 120, bu: 70, bf: 150 } },
    clp: { base: 'c', W: { fu: 30, ff: 150 }, A: { fu: 90, ff: 90, tl: 28 } },
    chp: { base: 'c', W: { fu: -6, ff: 80, tl: 24 }, A: { fu: 168, ff: 176, tl: 6, hx: 8, ft: 28, fs: -4, bt: -30, bs: -14 } },
    clk: { base: 'c', W: { ft: 60, fs: -10 }, A: { ft: 82, fs: 74, tl: 30, bt: -76, bs: -48, hh: 34 } },
    chk: { base: 'c', W: { tl: 36, ft: 60, fs: -20, bt: -70, bs: -40 }, A: { ft: 86, fs: 80, tl: 34, bt: -86, bs: -56, hh: 30, fu: 140, ff: 120, bu: 160, bf: 150 } },
    jlp: { W: { fu: 40, ff: 140 }, A: { fu: 90, ff: 88, tl: 12, ft: 60, fs: -14, bt: -14, bs: 32 } },
    jhp: { W: { fu: 20, ff: 120, tl: -6 }, A: { fu: 84, ff: 120, bu: 100, bf: 130, tl: 20, ft: 66, fs: -10, bt: -20, bs: 30 } },
    jlk: { W: { ft: 60, fs: -20 }, A: { ft: 96, fs: 84, tl: -10, bt: -20, bs: 26 } },
    jhk: { W: { ft: 56, fs: -26, tl: -10 }, A: { ft: 112, fs: 130, tl: -24, bt: -10, bs: 30, fu: 60, ff: 130 } },
    thr: { W: { fu: 70, ff: 100, bu: 70, bf: 100, tl: 10 }, A: { fu: 96, ff: 96, bu: 90, bf: 98, tl: 22, hx: 10, ft: 42, fs: -6 } },
    // coups spéciaux, par type d'animation
    fire: { W: { fu: 40, ff: 120, bu: 30, bf: 120, tl: -2, hx: -6 }, A: { fu: 92, ff: 92, bu: 86, bf: 88, tl: 14, hx: 10, ft: 40, fs: -4, bt: -36, bs: -16 } },
    dp:   { W: { fu: 10, ff: 70, tl: 6, ft: 50, fs: -20, bt: -30, bs: -14 }, A: { fu: 172, ff: 178, bu: 60, bf: 130, tl: -4, ft: 32, fs: 6, bt: 10, bs: 40 } },
    lunge: { W: { tl: 20, fu: 30, ff: 110, ft: 60, fs: -10, bt: -50, bs: -20 }, A: { tl: 62, hd: 10, fu: 100, ff: 96, bu: 120, bf: 150, ft: 56, fs: -6, bt: -50, bs: -14, hx: 14 } },
    beam: { W: { fu: 40, ff: 120, bu: 40, bf: 120, tl: -8, ft: 40, fs: -10, bt: -40, bs: -20 }, A: { fu: 92, ff: 90, bu: 88, bf: 90, tl: 16, hx: 10, ft: 42, fs: -4, bt: -38, bs: -16 }, open: 1 }
  };
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }
  function mix(a, b, t) { var r = {}; for (var i = 0; i < KEYS.length; i++) { var k = KEYS[i]; if (k === 'hh') r.hh = (a.hh == null && b.hh == null) ? null : (a.hh == null ? b.hh : (b.hh == null ? a.hh : lerp(a.hh, b.hh, t))); else r[k] = lerp(a[k], b[k], t); } return r; }

  function movePose(f) {
    var mv = f.move; if (!mv) return IDLE;
    var key = mv.anim && MOVES[mv.anim] ? mv.anim : mv.id;
    var def = MOVES[key] || MOVES.hp;
    var base = def.base === 'c' ? CROUCH : (f.y > 4 || mv.st === 'air' ? JUMP : IDLE);
    var W = P(def.W, base), A = P(def.A, base); if (def.open) A.open = 1;
    var su = mv.su, ac = mv.ac > 90 ? 28 : mv.ac, rc = mv.rc, mf = f.mf;
    if (mv.st === 'air') { rc = 8; }
    if (mf <= su) { var u = mf / Math.max(1, su); return u < 0.55 ? mix(base, W, ease(u / 0.55)) : mix(W, A, ease((u - 0.55) / 0.45)); }
    if (mf <= su + ac) return A;
    return mix(A, base, ease((mf - su - ac) / Math.max(1, rc)));
  }

  function cycle(base, a, t) { var r = P(null, base); r.ft = base.ft + a * Math.sin(t); r.fs = base.fs - Math.abs(a) * 0.5 * (Math.cos(t) + 1) * 0.5; r.bt = base.bt - a * Math.sin(t); r.bs = base.bs - Math.abs(a) * 0.5 * (1 - Math.cos(t)) * 0.5; r.fu = base.fu - a * 0.5 * Math.sin(t); r.bu = base.bu + a * 0.5 * Math.sin(t); return r; }

  function poseFor(f) {
    var t = f.animT || 0, st = f.state;
    if (st === 'attack') return movePose(f);
    if (st === 'idle') { var q = IDLE, b = Math.sin(t * 0.11) * 2.5; return P({ tl: q.tl + b * 0.4, fu: q.fu + b, bu: q.bu - b, ff: q.ff - b * 0.8, bf: q.bf + b * 0.8, hh: null }, q); }
    if (st === 'crouch') return P({ tl: CROUCH.tl + Math.sin(t * 0.1) * 1.5 }, CROUCH);
    if (st === 'walkF') { var base = P({ tl: 14, fu: 50, ff: 124 }, IDLE); return cycle(base, 30, t * 0.26); }
    if (st === 'walkB') { var bb = P({ tl: -2, fu: 56, ff: 132, hx: -4 }, IDLE); return cycle(bb, -24, t * 0.24); }
    if (st === 'dashF') { var u2 = Math.min(1, f.sf / 22); return P({ tl: 34 - u2 * 10, hd: 6, fu: 20, ff: 80, bu: 14, bf: 74, ft: 66, fs: 6, bt: -50, bs: -10, hx: 8 }, IDLE); }
    if (st === 'dashB') { return P({ tl: -10, hd: -6, fu: 60, ff: 130, bu: 40, bf: 140, ft: 30, fs: -10, bt: -40, bs: -26, hx: -8 }, IDLE); }
    if (st === 'air') { var up = f.vy > 0; return P({ ft: up ? 62 : 40, fs: up ? -26 : -10, bt: up ? -8 : -22, bs: up ? 24 : 12, fu: up ? 66 : 96, ff: up ? 148 : 160 }, JUMP); }
    if (st === 'block') return f.blockCrouch ? CBLOCK : BLOCK;
    if (st === 'hit') { var sh = Math.max(0, 1 - f.sf / 8); var h = f.hitKind === 'crouch' ? CHIT : HIT; return P({ tl: h.tl - sh * 8, hd: h.hd - sh * 8 }, h); }
    if (st === 'airhit') { var r = P({ rot: Math.min(80, 20 + f.sf * 6 * (f.vy > 0 ? 0.6 : 1)) }, AIRHIT); return r; }
    if (st === 'knockdown') { return P({ rot: 90, hx: 0 }, LIE); }
    if (st === 'getup') { var gu = 1 - f.kdT / 18; var g = mix(LIE, CROUCH, ease(gu)); return g; }
    if (st === 'ko') { var spin = Math.min(90, f.sf * 7); return P({ rot: f.y > 4 ? Math.min(150, f.sf * 9) : 90 }, AIRHIT); }
    if (st === 'thrown') { return P({ rot: 120 - f.sf * 3, tl: -10, fu: 160, ff: 160, bu: 170, bf: 160, ft: 30, fs: 40, bt: 10, bs: 60 }, AIRHIT); }
    if (st === 'tech') return P({ hx: -8, tl: -8, fu: 50, ff: 100, bu: 40, bf: 100 }, IDLE);
    if (st === 'win') { var w = Math.sin(t * 0.16) * 6; return P({ fu: WIN.fu + w, bu: WIN.bu - w * 0.5 }, WIN); }
    if (st === 'intro') { var k = Math.min(1, (f.animT % 400) / 40); return mix(IDLE, INTRO, ease(Math.min(1, t / 30))); }
    return IDLE;
  }

  // ---------- squelette ----------
  var LT = 42, LS = 42, TORSO = 50, HEADR = 24, UA = 28, FA = 28;
  function dir(a) { return [Math.sin(a * D2R), -Math.cos(a * D2R)]; }
  function build(p, s) {
    var J = {}, hip = [p.hx * s, 0];
    var tl = p.tl * D2R, sh = [hip[0] + Math.sin(tl) * TORSO * s, hip[1] + Math.cos(tl) * TORSO * s];
    var hd = (p.tl + p.hd) * D2R, head = [sh[0] + Math.sin(hd) * HEADR * s, sh[1] + Math.cos(hd) * HEADR * s];
    function arm(a1, a2, off) { var s0 = [sh[0] + off[0] * s, sh[1] + off[1] * s], d1 = dir(a1), e = [s0[0] + d1[0] * UA * s, s0[1] + d1[1] * UA * s], d2 = dir(a2), w = [e[0] + d2[0] * FA * s, e[1] + d2[1] * FA * s], h = [w[0] + d2[0] * 8 * s, w[1] + d2[1] * 8 * s]; return { s: s0, e: e, w: w, h: h }; }
    function leg(a1, a2) { var d1 = dir(a1), k = [hip[0] + d1[0] * LT * s, hip[1] + d1[1] * LT * s], d2 = dir(a2), an = [k[0] + d2[0] * LS * s, k[1] + d2[1] * LS * s], to = [an[0] + Math.cos(a2 * D2R) * 16 * s, an[1] + Math.sin(a2 * D2R) * 16 * s]; return { h: hip, k: k, a: an, t: to }; }
    J.hip = hip; J.sh = sh; J.head = head; J.fa = arm(p.fu, p.ff, [3, -2]); J.ba = arm(p.bu, p.bf, [-3, -4]); J.fl = leg(p.ft, p.fs); J.bl = leg(p.bt, p.bs);
    return J;
  }
  function rotate(J, deg) {
    if (!deg) return J; var c = Math.cos(deg * D2R), sn = Math.sin(deg * D2R);
    function r(pt) { return [pt[0] * c - pt[1] * sn, pt[0] * sn + pt[1] * c]; }
    // rotation positive = on tombe en arrière (la tête part vers l'arrière) : sens trigonométrique avec x vers l'avant
    var out = {}; for (var k in J) { var v = J[k]; if (v.length === 2 && typeof v[0] === 'number') out[k] = r(v); else { out[k] = {}; for (var kk in v) out[k][kk] = r(v[kk]); } } return out;
  }
  function lowest(J) { var m = 1e9, pts = [J.head, J.fa.h, J.ba.h, J.fa.e, J.ba.e, J.fl.a, J.bl.a, J.fl.t, J.bl.t, J.fl.k, J.bl.k, J.hip]; for (var i = 0; i < pts.length; i++) { var y = pts[i][1] - (i === 0 ? 17 : (i === 11 ? 12 : 7)); if (y < m) m = y; } return m; }

  // ---------- pinceau ----------
  function cap(ctx, a, b, w1, w2) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / l, ny = dx / l;
    ctx.beginPath(); ctx.moveTo(a[0] + nx * w1 / 2, a[1] + ny * w1 / 2); ctx.lineTo(b[0] + nx * w2 / 2, b[1] + ny * w2 / 2); ctx.lineTo(b[0] - nx * w2 / 2, b[1] - ny * w2 / 2); ctx.lineTo(a[0] - nx * w1 / 2, a[1] - ny * w1 / 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(a[0], a[1], w1 / 2, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.arc(b[0], b[1], w2 / 2, 0, 6.3); ctx.fill();
  }
  function limb(ctx, a, b, w1, w2, col, ink, ol, hi) {
    ctx.fillStyle = ink; cap(ctx, a, b, w1 + ol * 2, w2 + ol * 2);
    ctx.fillStyle = col; cap(ctx, a, b, w1, w2);
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / l, ny = dx / l;
    if (ny > 0) { nx = -nx; ny = -ny; }          // la lumière vient d'en haut : (nx, ny) regarde vers le haut de l'écran
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.26)'; ctx.lineWidth = Math.max(1.5, w1 * 0.38);   // ombre sous le membre
    ctx.beginPath(); ctx.moveTo(a[0] - nx * w1 * 0.3, a[1] - ny * w1 * 0.3); ctx.lineTo(b[0] - nx * w2 * 0.3, b[1] - ny * w2 * 0.3); ctx.stroke();
    if (hi) { ctx.strokeStyle = hi; ctx.lineWidth = Math.max(1.2, w1 * 0.16); ctx.beginPath(); ctx.moveTo(a[0] + nx * w1 * 0.26, a[1] + ny * w1 * 0.26); ctx.lineTo(b[0] + nx * w2 * 0.26, b[1] + ny * w2 * 0.26); ctx.stroke(); }
  }

  // un combattant : (x, y) = pied du combattant à l'écran ; s = échelle écran ; J en repère (x avant, y haut)
  function drawFighter(ctx, f, sx, gy, zoom, o) {
    o = o || {};
    var C = f.C, pal = C.palette, s = C.scale;
    var pose = poseFor(f);
    var J = build(pose, s);
    J = rotate(J, pose.rot);
    var grounded = f.y <= 2 && f.state !== 'air' && f.state !== 'airhit' && f.state !== 'ko' && f.state !== 'thrown' && !(f.state === 'attack' && f.y > 2);
    var base;
    if (grounded) { var hh = pose.hh; base = (hh != null && !pose.rot) ? hh * s : -lowest(J); }
    else base = f.y + 84 * s;
    var face = f.face, k = zoom;
    function W(pt) { return [sx + pt[0] * face * k, gy - (pt[1] + base) * k]; }
    var ink = pal.ink, ol = Math.max(2.4, 3.6 * k * s), kw = k * s;
    var JT = { hip: W(J.hip), sh: W(J.sh), head: W(J.head) };
    ['fa', 'ba'].forEach(function (n) { JT[n] = { s: W(J[n].s), e: W(J[n].e), w: W(J[n].w), h: W(J[n].h) }; });
    ['fl', 'bl'].forEach(function (n) { JT[n] = { h: W(J[n].h), k: W(J[n].k), a: W(J[n].a), t: W(J[n].t) }; });
    o.joints = JT;
    var ctxA = ctx; ctxA.save(); ctxA.lineJoin = 'round'; ctxA.lineCap = 'round';
    if (f.flash > 0) { o.flash = true; }
    var dark = pal.suit, light = pal.suitLight, skin = pal.skin, skinD = pal.skinDark, gold = pal.gold, glow = pal.glow;
    if (o.tint) { dark = light = skin = skinD = gold = o.tint; }
    var cid = f.cid;
    var armW = (cid === 'kormal' ? 17 : 13) * kw, legW = (cid === 'kormal' ? 20 : 16.5) * kw, torsoW = (cid === 'kormal' ? 40 : cid === 'ayanda' ? 30 : 29) * kw;
    var hand = function (a, col) { ctxA.fillStyle = ink; ctxA.beginPath(); ctxA.arc(a[0], a[1], armW * 0.78 + ol, 0, 6.3); ctxA.fill(); ctxA.fillStyle = col; ctxA.beginPath(); ctxA.arc(a[0], a[1], armW * 0.78, 0, 6.3); ctxA.fill(); ctxA.fillStyle = 'rgba(255,255,255,0.35)'; ctxA.beginPath(); ctxA.arc(a[0] - armW * 0.2, a[1] - armW * 0.25, armW * 0.22, 0, 6.3); ctxA.fill(); };
    var foot = function (an, to, col) { limb(ctxA, [an[0] - 3 * kw, an[1]], to, legW * 0.86, legW * 0.6, col, ink, ol, null); };

    // lueur / aura derrière le combattant
    if (!o.noGlow && (f.state === 'attack' && f.move && (f.move.type === 'super' || f.move.type === 'special') || f.rage >= 100)) {
      var gr = ctxA.createRadialGradient(JT.sh[0], JT.sh[1], 8, JT.sh[0], JT.sh[1], 150 * kw);
      var gcol = glow; gr.addColorStop(0, hexA(gcol, f.rage >= 100 ? 0.5 : 0.35)); gr.addColorStop(1, hexA(gcol, 0)); ctxA.fillStyle = gr; ctxA.beginPath(); ctxA.arc(JT.sh[0], JT.sh[1], 150 * kw, 0, 6.3); ctxA.fill();
    }
    // ombre au sol
    if (!o.noShadow) { var shw = (grounded ? 1 : Math.max(0.35, 1 - f.y / 260)); ctxA.fillStyle = 'rgba(0,0,0,' + (0.32 * shw) + ')'; ctxA.beginPath(); ctxA.ellipse(sx, gy + 2, 52 * kw * shw, 9 * kw * shw, 0, 0, 6.3); ctxA.fill(); }

    // cheveux longs / tresses derrière
    hairBack(ctxA, cid, JT, f, k, s, pal, ink, ol);

    // bras arrière, jambe arrière
    limb(ctxA, JT.ba.s, JT.ba.e, armW, armW * 0.86, cid === 'ayanda' ? skin : (cid === 'kormal' ? skin : dark), ink, ol, null);
    limb(ctxA, JT.ba.e, JT.ba.w, armW * 0.86, armW * 0.74, armWear(cid, 'f', skin, light, pal), ink, ol, null); hand(JT.ba.h, handCol(cid, skin, gold));
    limb(ctxA, JT.bl.h, JT.bl.k, legW * 1.1, legW * 0.95, legWear(cid, 't', dark, skin, pal), ink, ol, null);
    limb(ctxA, JT.bl.k, JT.bl.a, legW * 0.95, legW * 0.72, legWear(cid, 's', dark, skin, pal), ink, ol, null); foot(JT.bl.a, JT.bl.t, bootCol(cid, dark, gold, pal));

    // torse
    torso(ctxA, cid, JT, f, k, s, pal, ink, ol, torsoW, o);

    // tête
    head(ctxA, cid, JT, f, k, s, pal, ink, ol, pose, o);

    // jambe avant
    limb(ctxA, JT.fl.h, JT.fl.k, legW * 1.15, legW, legWear(cid, 't', dark, skin, pal), ink, ol, hexA(glow, 0.45));
    limb(ctxA, JT.fl.k, JT.fl.a, legW, legW * 0.74, legWear(cid, 's', dark, skin, pal), ink, ol, hexA(glow, 0.4)); foot(JT.fl.a, JT.fl.t, bootCol(cid, dark, gold, pal));
    kneeGuard(ctxA, cid, JT.fl.k, k * s, pal, ink, ol);

    // bras avant
    limb(ctxA, JT.fa.s, JT.fa.e, armW * 1.05, armW * 0.9, cid === 'ayanda' ? skin : (cid === 'kormal' ? skin : dark), ink, ol, hexA(glow, 0.4));
    limb(ctxA, JT.fa.e, JT.fa.w, armW * 0.92, armW * 0.8, armWear(cid, 'f', skin, light, pal), ink, ol, hexA(glow, 0.45)); hand(JT.fa.h, handCol(cid, skin, gold));
    armBand(ctxA, cid, JT.fa, k * s, pal, ink, ol);

    // accessoires devant (cubes de Nia)
    if (cid === 'nia') cubes(ctxA, JT, f, k, s, pal, ink, ol);

    // flash de coup subi : le combattant devient blanc une fraction de seconde
    ctxA.restore();
    return JT;
  }

  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function handCol(cid, skin, gold) { return cid === 'nia' || cid === 'calpros' ? gold : (cid === 'ayanda' ? skin : skin); }
  function armWear(cid, p, skin, light, pal) { return cid === 'calpros' || cid === 'nia' ? light : (cid === 'ayanda' ? skin : pal.suitLight); }
  function legWear(cid, p, dark, skin, pal) { return cid === 'ayanda' ? (p === 't' ? skin : pal.suit) : (cid === 'kormal' ? pal.suit : dark); }
  function bootCol(cid, dark, gold, pal) { return cid === 'kormal' ? pal.suitLight : (cid === 'ayanda' ? pal.suitLight : dark); }

  function kneeGuard(ctx, cid, k, ks, pal, ink, ol) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(k[0], k[1], 7.4 * ks + ol * 0.6, 0, 6.3); ctx.fill(); ctx.fillStyle = pal.gold; ctx.beginPath(); ctx.arc(k[0], k[1], 6.2 * ks, 0, 6.3); ctx.fill(); }
  function armBand(ctx, cid, A, ks, pal, ink, ol) { var m = [(A.e[0] + A.w[0]) / 2, (A.e[1] + A.w[1]) / 2]; ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(m[0], m[1], 6.2 * ks + ol * 0.6, 0, 6.3); ctx.fill(); ctx.fillStyle = pal.gold; ctx.beginPath(); ctx.arc(m[0], m[1], 5 * ks, 0, 6.3); ctx.fill(); }

  function torso(ctx, cid, J, f, k, s, pal, ink, ol, tw, o) {
    var hip = J.hip, sh = J.sh, dx = sh[0] - hip[0], dy = sh[1] - hip[1], l = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / l, ny = dx / l;
    var wH = tw * 0.82, wS = tw * 1.08;
    var body = cid === 'ayanda' ? pal.suit : (cid === 'kormal' ? pal.skin : pal.suit);
    limb(ctx, hip, sh, wH, wS, body, ink, ol, hexA(pal.glow, 0.35));
    // plastron / détails
    var mid = [hip[0] + dx * 0.62, hip[1] + dy * 0.62];
    var ang = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(mid[0], mid[1]); ctx.rotate(ang - Math.PI / 2 * (f.face > 0 ? 1 : -1) * 0 );
    ctx.restore();
    if (cid === 'calpros') {
      limb(ctx, [hip[0] + dx * 0.38, hip[1] + dy * 0.38], [hip[0] + dx * 0.92, hip[1] + dy * 0.92], wH * 0.8, wS * 0.88, pal.suitLight, ink, ol * 0.6, null);
      ctx.fillStyle = pal.gold; ctx.strokeStyle = ink; ctx.lineWidth = ol * 0.6; ctx.beginPath(); ctx.arc(mid[0] + nx * 1, mid[1] + ny * 1, 5.3 * k * s, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = pal.glow2; ctx.beginPath(); ctx.arc(mid[0], mid[1], 2.6 * k * s, 0, 6.3); ctx.fill();
    } else if (cid === 'nia') {
      limb(ctx, [hip[0] + dx * 0.4, hip[1] + dy * 0.4], [hip[0] + dx * 0.95, hip[1] + dy * 0.95], wH * 0.78, wS * 0.86, pal.suitLight, ink, ol * 0.6, null);
      ctx.fillStyle = pal.gold; ctx.beginPath(); ctx.arc(mid[0], mid[1], 5 * k * s, 0, 6.3); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = ol * 0.55; ctx.stroke();
      ctx.fillStyle = ink; ctx.font = 'bold ' + 8 * k * s + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('X', mid[0], mid[1] + 3 * k * s);
    } else if (cid === 'ayanda') {
      // bustier doré + pagne léopard
      limb(ctx, [hip[0] + dx * 0.55, hip[1] + dy * 0.55], [hip[0] + dx * 0.94, hip[1] + dy * 0.94], wH * 0.9, wS * 0.98, pal.suitLight, ink, ol * 0.6, null);
      ctx.strokeStyle = pal.gold; ctx.lineWidth = 2.4 * k * s; ctx.beginPath(); ctx.moveTo(hip[0] + dx * 0.55 + nx * wH * 0.5, hip[1] + dy * 0.55 + ny * wH * 0.5); ctx.lineTo(hip[0] + dx * 0.55 - nx * wH * 0.5, hip[1] + dy * 0.55 - ny * wH * 0.5); ctx.stroke();
      var sk = [hip[0] - dx * 0.05, hip[1] - dy * 0.05 - 1]; ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(sk[0], sk[1] + 8 * k * s, 17 * k * s + ol, 13 * k * s + ol, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = pal.gold; ctx.beginPath(); ctx.ellipse(sk[0], sk[1] + 8 * k * s, 17 * k * s, 13 * k * s, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#4a2a14'; for (var i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(sk[0] + (i - 2) * 6.5 * k * s, sk[1] + 8 * k * s + ((i % 2) ? 3 : -2) * k * s, 2.1 * k * s, 0, 6.3); ctx.fill(); }
    } else { // kormal : armure noire, fissures de lave, pagne déchiré
      limb(ctx, [hip[0] + dx * 0.35, hip[1] + dy * 0.35], [hip[0] + dx * 0.96, hip[1] + dy * 0.96], wH * 0.85, wS * 0.94, pal.suit, ink, ol * 0.7, null);
      ctx.strokeStyle = pal.glow; ctx.lineWidth = 2.1 * k * s; ctx.beginPath(); ctx.moveTo(hip[0] + dx * 0.4 + nx * 6 * k * s, hip[1] + dy * 0.4 + ny * 6 * k * s); ctx.lineTo(hip[0] + dx * 0.6 - nx * 4 * k * s, hip[1] + dy * 0.6 - ny * 4 * k * s); ctx.lineTo(hip[0] + dx * 0.78 + nx * 3 * k * s, hip[1] + dy * 0.78 + ny * 3 * k * s); ctx.lineTo(hip[0] + dx * 0.92 - nx * 6 * k * s, hip[1] + dy * 0.92 - ny * 6 * k * s); ctx.stroke();
      // pagne déchiré
      ctx.fillStyle = pal.suit; ctx.strokeStyle = ink; ctx.lineWidth = ol * 0.8; ctx.beginPath(); var cx = hip[0], cy = hip[1] + 4 * k * s; ctx.moveTo(cx - 14 * k * s, cy); ctx.lineTo(cx + 14 * k * s, cy); ctx.lineTo(cx + 10 * k * s, cy + 26 * k * s); ctx.lineTo(cx + 3 * k * s, cy + 20 * k * s); ctx.lineTo(cx - 2 * k * s, cy + 31 * k * s); ctx.lineTo(cx - 9 * k * s, cy + 21 * k * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // ceinture
    ctx.strokeStyle = pal.gold; ctx.lineWidth = 3 * k * s; ctx.beginPath(); ctx.moveTo(hip[0] - nx * wH * 0.5, hip[1] - ny * wH * 0.5); ctx.lineTo(hip[0] + nx * wH * 0.5, hip[1] + ny * wH * 0.5); ctx.stroke();
    // épaulière
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(sh[0], sh[1], (cid === 'kormal' ? 13 : 9.5) * k * s + ol * 0.6, 0, 6.3); ctx.fill();
    ctx.fillStyle = cid === 'kormal' ? pal.suit : (cid === 'ayanda' ? pal.gold : pal.suitLight); ctx.beginPath(); ctx.arc(sh[0], sh[1], (cid === 'kormal' ? 12 : 8.4) * k * s, 0, 6.3); ctx.fill();
    if (cid === 'kormal') { ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = ol; var dxs = f.face > 0 ? 1 : -1; for (var q = -1; q <= 1; q++) { ctx.beginPath(); ctx.moveTo(sh[0] + q * 7 * k * s - 3 * k * s, sh[1] - 9 * k * s); ctx.lineTo(sh[0] + q * 7 * k * s + dxs * 0, sh[1] - 24 * k * s); ctx.lineTo(sh[0] + q * 7 * k * s + 3 * k * s, sh[1] - 9 * k * s); ctx.closePath(); ctx.fill(); } }
  }

  function hairBack(ctx, cid, J, f, k, s, pal, ink, ol) {
    var h = J.head, ks = k * s, t = (f.animT || 0) * 0.12, sw = Math.sin(t) * 2 * ks, fl = f.state === 'airhit' || f.state === 'hit' ? 8 * ks : 0;
    var back = -1; // les cheveux partent vers l'arrière du combattant (x écran opposé à sa face) : face>0 → vers la gauche
    var bx = f.face > 0 ? -1 : 1;
    if (cid === 'nia') { // longue tresse
      ctx.strokeStyle = ink; ctx.lineWidth = 10 * ks + ol * 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(h[0] + bx * 8 * ks, h[1] - 2 * ks); ctx.quadraticCurveTo(h[0] + bx * (30 + fl) * ks, h[1] + 12 * ks + sw, h[0] + bx * (38 + fl) * ks, h[1] + 50 * ks + sw); ctx.stroke();
      ctx.strokeStyle = pal.hair; ctx.lineWidth = 10 * ks; ctx.beginPath(); ctx.moveTo(h[0] + bx * 8 * ks, h[1] - 2 * ks); ctx.quadraticCurveTo(h[0] + bx * (30 + fl) * ks, h[1] + 12 * ks + sw, h[0] + bx * (38 + fl) * ks, h[1] + 50 * ks + sw); ctx.stroke();
      ctx.strokeStyle = pal.gold; ctx.lineWidth = 3 * ks; ctx.beginPath(); ctx.moveTo(h[0] + bx * 28 * ks, h[1] + 24 * ks + sw * 0.5); ctx.lineTo(h[0] + bx * 33 * ks, h[1] + 24 * ks + sw * 0.5); ctx.stroke();
    } else if (cid === 'ayanda') {
      for (var i = 0; i < 3; i++) { var ang = i * 0.5; ctx.strokeStyle = ink; ctx.lineWidth = 6.5 * ks + ol * 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(h[0] + bx * 4 * ks, h[1] + (4 - i * 5) * ks); ctx.quadraticCurveTo(h[0] + bx * (24 + fl + i * 4) * ks, h[1] + (14 + i * 2) * ks + sw, h[0] + bx * (30 + fl + i * 6) * ks, h[1] + (46 + i * 8) * ks + sw); ctx.stroke(); ctx.strokeStyle = pal.hair; ctx.lineWidth = 6.5 * ks; ctx.stroke(); ctx.strokeStyle = pal.gold; ctx.lineWidth = 2.6 * ks; ctx.beginPath(); var ex = h[0] + bx * (28 + fl + i * 5) * ks, ey = h[1] + (36 + i * 7) * ks + sw; ctx.moveTo(ex - 2 * ks, ey); ctx.lineTo(ex + 2 * ks, ey); ctx.stroke(); }
    } else if (cid === 'kormal') { // cape rouge déchirée
      ctx.fillStyle = ink; ctx.beginPath(); var sh = J.sh; ctx.moveTo(sh[0] + bx * 4 * ks, sh[1]); ctx.lineTo(sh[0] + bx * (36 + fl) * ks, sh[1] - 6 * ks + sw); ctx.lineTo(sh[0] + bx * (46 + fl) * ks, sh[1] - 70 * ks + sw); ctx.lineTo(sh[0] + bx * (30 + fl) * ks, sh[1] - 62 * ks); ctx.lineTo(sh[0] + bx * (24 + fl) * ks, sh[1] - 88 * ks + sw); ctx.lineTo(sh[0] + bx * 8 * ks, sh[1] - 74 * ks); ctx.closePath(); ctx.fill();
      ctx.fillStyle = pal.suitLight; ctx.beginPath(); ctx.moveTo(sh[0] + bx * 4 * ks, sh[1] - 2 * ks); ctx.lineTo(sh[0] + bx * (32 + fl) * ks, sh[1] - 8 * ks + sw); ctx.lineTo(sh[0] + bx * (41 + fl) * ks, sh[1] - 64 * ks + sw); ctx.lineTo(sh[0] + bx * (29 + fl) * ks, sh[1] - 58 * ks); ctx.lineTo(sh[0] + bx * (23 + fl) * ks, sh[1] - 80 * ks + sw); ctx.lineTo(sh[0] + bx * 8 * ks, sh[1] - 70 * ks); ctx.closePath(); ctx.fill();
    }
  }

  function head(ctx, cid, J, f, k, s, pal, ink, ol, pose, o) {
    var h = J.head, ks = k * s, fx = f.face > 0 ? 1 : -1, r = (cid === 'kormal' ? 18 : 16.5) * ks;
    var hurt = f.state === 'hit' || f.state === 'airhit' || f.state === 'ko' || f.state === 'knockdown';
    // cou
    limb(ctx, J.sh, [h[0], h[1] - 2 * ks], 9 * ks, 9 * ks, pal.skin, ink, ol, null);
    // crâne
    ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(h[0], h[1], r + ol, r * 1.08 + ol, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = pal.skin; ctx.beginPath(); ctx.ellipse(h[0], h[1], r, r * 1.08, 0, 0, 6.3); ctx.fill();
    // ombre du visage
    ctx.fillStyle = hexA(pal.skinDark, 0.5); ctx.beginPath(); ctx.ellipse(h[0] - fx * r * 0.3, h[1] + r * 0.28, r * 0.72, r * 0.62, 0, 0, 6.3); ctx.fill();
    // cheveux / casque selon le héros
    if (cid === 'calpros') {
      ctx.fillStyle = pal.hair; ctx.strokeStyle = ink; ctx.lineWidth = ol * 0.7; ctx.beginPath(); ctx.ellipse(h[0] - fx * r * 0.1, h[1] - r * 0.35, r * 1.02, r * 0.78, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
      // bandeau lumineux
      ctx.strokeStyle = pal.glow; ctx.lineWidth = 2.4 * ks; ctx.beginPath(); ctx.moveTo(h[0] - fx * r * 0.9, h[1] - r * 0.12); ctx.lineTo(h[0] + fx * r * 0.95, h[1] - r * 0.18); ctx.stroke();
    } else if (cid === 'nia') {
      ctx.fillStyle = pal.hair; ctx.beginPath(); ctx.ellipse(h[0] - fx * r * 0.18, h[1] - r * 0.28, r * 1.08, r * 0.86, 0, Math.PI * 0.96, Math.PI * 2.04); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = ol * 0.7; ctx.beginPath(); ctx.ellipse(h[0] - fx * r * 0.18, h[1] - r * 0.28, r * 1.08, r * 0.86, 0, Math.PI * 0.96, Math.PI * 2.04); ctx.stroke();
      ctx.fillStyle = pal.gold; ctx.beginPath(); ctx.arc(h[0] - fx * r * 0.2, h[1] + r * 0.55, 3 * ks, 0, 6.3); ctx.fill();
    } else if (cid === 'ayanda') {
      ctx.fillStyle = pal.hair; ctx.beginPath(); ctx.ellipse(h[0] - fx * r * 0.3, h[1] - r * 0.2, r * 1.12, r * 0.95, 0, Math.PI * 0.9, Math.PI * 2.05); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = ol * 0.7; ctx.stroke();
      ctx.strokeStyle = pal.gold; ctx.lineWidth = 2.6 * ks; ctx.beginPath(); ctx.moveTo(h[0] - fx * r * 0.9, h[1] - r * 0.42); ctx.lineTo(h[0] + fx * r * 0.9, h[1] - r * 0.52); ctx.stroke();
    } else { // cornes
      ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = ol; for (var side = -1; side <= 1; side += 2) { ctx.beginPath(); ctx.moveTo(h[0] + side * r * 0.45, h[1] - r * 0.7); ctx.quadraticCurveTo(h[0] + side * r * 1.5, h[1] - r * 1.1, h[0] + side * r * 1.0, h[1] - r * 2.1); ctx.quadraticCurveTo(h[0] + side * r * 0.95, h[1] - r * 1.2, h[0] + side * r * 0.1, h[1] - r * 0.85); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = pal.suitLight; for (side = -1; side <= 1; side += 2) { ctx.beginPath(); ctx.moveTo(h[0] + side * r * 0.5, h[1] - r * 0.78); ctx.quadraticCurveTo(h[0] + side * r * 1.35, h[1] - r * 1.1, h[0] + side * r * 0.98, h[1] - r * 1.95); ctx.quadraticCurveTo(h[0] + side * r * 0.9, h[1] - r * 1.15, h[0] + side * r * 0.18, h[1] - r * 0.9); ctx.closePath(); ctx.fill(); }
    }
    // œil, sourcil, bouche (tournés vers l'avant)
    var ex = h[0] + fx * r * 0.46, ey = h[1] - r * 0.02;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.3, r * (hurt ? 0.1 : 0.17), 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = hurt ? '#222' : pal.eye; ctx.beginPath(); ctx.arc(ex + fx * r * 0.08, ey, r * (hurt ? 0.07 : 0.13), 0, 6.3); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 2.4 * ks; ctx.beginPath(); ctx.moveTo(ex - fx * r * 0.34, ey - r * (hurt ? 0.04 : 0.26)); ctx.lineTo(ex + fx * r * 0.38, ey - r * (hurt ? 0.3 : 0.12)); ctx.stroke();
    if (cid === 'kormal') { ctx.fillStyle = pal.glow; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.26, r * 0.12, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + fx * r * 0.05, ey, r * 0.07, 0, 6.3); ctx.fill(); }
    var shout = f.state === 'attack' && f.move && (f.move.type === 'special' || f.move.type === 'super' || f.mf > f.move.su - 2 && f.mf < f.move.su + 6) || hurt;
    ctx.strokeStyle = ink; ctx.fillStyle = '#2a0a0a'; ctx.lineWidth = 2 * ks; if (shout) { ctx.beginPath(); ctx.ellipse(h[0] + fx * r * 0.42, h[1] + r * 0.52, r * 0.2, r * 0.22, 0, 0, 6.3); ctx.fill(); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(h[0] + fx * r * 0.22, h[1] + r * 0.55); ctx.lineTo(h[0] + fx * r * 0.62, h[1] + r * 0.5); ctx.stroke(); }
    // reflet sur le front
    ctx.strokeStyle = hexA('#ffffff', 0.3); ctx.lineWidth = 2 * ks; ctx.beginPath(); ctx.arc(h[0], h[1], r * 0.82, -2.2, -1.6); ctx.stroke();
  }

  function cubes(ctx, J, f, k, s, pal, ink, ol) {
    var t = (f.animT || 0) * 0.04, c = J.fa.h, ks = k * s;
    var show = f.state === 'idle' || f.state === 'walkF' || f.state === 'walkB' || f.state === 'crouch' || f.state === 'intro' || f.state === 'win' || (f.state === 'attack' && f.move && f.move.proj);
    if (!show) return;
    for (var i = 0; i < 3; i++) {
      var a = t + i * 2.1, cx = J.sh[0] + Math.cos(a) * 38 * ks * (f.face > 0 ? 1 : -1) * 0.9, cy = J.sh[1] + 18 * ks + Math.sin(a * 1.3) * 18 * ks, sz = (6 - i) * ks;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.fillStyle = ink; ctx.fillRect(-sz - ol * 0.6, -sz - ol * 0.6, sz * 2 + ol * 1.2, sz * 2 + ol * 1.2); ctx.fillStyle = pal.suitLight; ctx.fillRect(-sz, -sz, sz * 2, sz * 2); ctx.fillStyle = pal.gold; ctx.fillRect(-sz * 0.5, -sz * 0.5, sz, sz); ctx.restore();
    }
  }

  XS.Draw = { drawFighter: drawFighter, poseFor: poseFor, build: build, IDLE: IDLE, hexA: hexA, mix: mix, POSES: { IDLE: IDLE, CROUCH: CROUCH, JUMP: JUMP, BLOCK: BLOCK, HIT: HIT, AIRHIT: AIRHIT, LIE: LIE, WIN: WIN, INTRO: INTRO }, MOVES: MOVES, P: P };
  if (typeof module !== 'undefined' && module.exports) module.exports = XS.Draw;
})(typeof window !== 'undefined' ? window : globalThis);
