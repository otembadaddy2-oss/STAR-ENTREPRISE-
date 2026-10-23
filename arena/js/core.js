/* X SAPHIR — ARENA : le moteur de combat.
   Simulation à pas fixe (60 images par seconde), sans aucun dessin : on lui donne les commandes de chaque joueur
   à chaque image, il rend l'état du combat et les événements (coups, blocages, K.O.…) que le décor, les effets
   et le son utilisent. Même entrées → même combat (utile pour les tests, et plus tard pour le jeu en ligne). */
(function (root) {
  'use strict';
  var XS = root.XS = root.XS || {};
  var Data = XS.Data || (typeof require !== 'undefined' ? require('./data.js') : null);

  var STAGE_W = 1600, WALL_L = 70, WALL_R = STAGE_W - 70, GRAV = 0.56, MAXD = 640;
  var BTN = { LP: 1, HP: 2, LK: 4, HK: 8, SUP: 16, SP: 32, THR: 64 };
  var ATTACKS = BTN.LP | BTN.HP | BTN.LK | BTN.HK;

  function dirNum(x, y) { // x : -1 gauche, 0, 1 droite ; y : -1 bas, 0, 1 haut → pavé numérique
    if (y < 0) return x < 0 ? 1 : (x > 0 ? 3 : 2);
    if (y > 0) return x < 0 ? 7 : (x > 0 ? 9 : 8);
    return x < 0 ? 4 : (x > 0 ? 6 : 5);
  }
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // ---------- reconnaissance des mouvements (↓↘→, →↓↘, ↓↙←, ↓↘→↓↘→) ----------
  var MOTIONS = {
    '236': [[1, 2], [3], [6, 9]],
    '623': [[6, 9], [1, 2], [3]],
    '214': [[2, 3], [1], [4, 7]],
    '236236': [[1, 2], [3], [6, 9], [1, 2], [3], [6, 9]]
  };
  function matchMotion(hist, key, win, recent) {
    var groups = MOTIONS[key], gi = 0, last = -1, start = Math.max(0, hist.length - win);
    for (var i = start; i < hist.length; i++) {
      var d = hist[i].d;
      if (groups[gi].indexOf(d) !== -1) { last = i; gi++; if (gi === groups.length) break; }
    }
    // une direction « neutre » ou en trop entre deux étapes n'annule pas le mouvement ; il faut seulement que la fin soit récente
    return gi === groups.length && last >= hist.length - recent;
  }

  // ---------- combattants ----------
  function makeFighter(side, cid, opts) {
    var C = Data.chars[cid];
    return {
      side: side, cid: cid, C: C, cpu: !!(opts && opts.cpu), level: (opts && opts.level) || 3,
      x: 0, y: 0, vx: 0, vy: 0, px: 0, face: side === 0 ? 1 : -1,
      hp: C.hp, maxHp: C.hp, rage: 0, ragePulse: 0,
      state: 'idle', sf: 0, move: null, mf: 0, hitDone: false, contact: false, hits: 0, nextMulti: 0, airAtk: false,
      stun: 0, hitKind: 'stand', kdT: 0, inv: 0, juggles: 0, cHits: 0, cDmg: 0, lastCombo: 0, lastComboDmg: 0,
      hist: [], btnPrev: 0, press: [], curD: 5, curBtn: 0, dashCool: 0, throwPress: -99, tapRaw: 0,
      flash: 0, shake: 0, lastHitFrame: -999, lastTrail: 0, win: false, rounds: 0, animT: 0, aiState: null,
      superCut: null, thrownT: 0, grabbed: null, landLag: 0, chainLock: 0
    };
  }

  function actionable(f) {
    return f.state === 'idle' || f.state === 'crouch' || f.state === 'walkF' || f.state === 'walkB';
  }
  function grounded(f) { return f.y <= 0.001 && f.state !== 'air' && f.state !== 'airhit' && f.state !== 'jump'; }
  function hurtbox(f) {
    var h = f.state === 'crouch' || (f.state === 'hit' && f.hitKind === 'crouch') || (f.state === 'block' && f.blockCrouch) ? 100 : 160;
    if (f.state === 'air' || f.state === 'jump' || f.state === 'airhit') return { x1: f.x - 28, x2: f.x + 28, y1: f.y + 25, y2: f.y + 150 };
    if (f.state === 'knockdown' || f.state === 'ko') return { x1: f.x - 70, x2: f.x + 70, y1: f.y, y2: f.y + 40 };
    return { x1: f.x - 30, x2: f.x + 30, y1: f.y, y2: f.y + h };
  }
  function boxWorld(f, b) { // b = [avant, bas, largeur, hauteur]
    var x1 = f.face > 0 ? f.x + b[0] : f.x - b[0] - b[2];
    return { x1: x1, x2: x1 + b[2], y1: f.y + b[1], y2: f.y + b[1] + b[3] };
  }
  function overlap(a, b) { return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1; }

  // ---------- le combat ----------
  function Match(opts) {
    this.opts = opts || {};
    this.rand = rng(this.opts.seed || 12345);
    this.mode = this.opts.mode || 'versus';
    this.winsNeeded = this.opts.winsNeeded || 2;
    this.f = [
      makeFighter(0, this.opts.p1 || 'calpros', this.opts.cpu1 || null),
      makeFighter(1, this.opts.p2 || 'kormal', this.opts.cpu2 || { cpu: true, level: 3 })
    ];
    this.proj = []; this.events = []; this.frame = 0; this.round = 1; this.phase = 'intro'; this.pt = 0;
    this.timer = 99; this.tick = 0; this.hitstop = 0; this.freeze = 0; this.freezeWho = -1; this.slow = 1;
    this.wins = [0, 0]; this.winner = -1; this.matchOver = false; this.lastKoBig = false;
    this.training = this.opts.training || { dummy: 'stand', block: 'none', rage: false, infinite: true };
    this.nextId = 1; this.cam = { x: STAGE_W / 2 };
    this.resetRound(true);
  }
  Match.prototype.emit = function (e) { e.f = this.frame; this.events.push(e); };

  Match.prototype.resetRound = function (first) {
    var self = this, mid = STAGE_W / 2;
    this.f.forEach(function (f, i) {
      var keep = { rounds: f.rounds };
      var n = makeFighter(i, f.cid, { cpu: f.cpu, level: f.level });
      n.rounds = keep.rounds;
      self.f[i] = n;
      n.x = mid + (i === 0 ? -170 : 170); n.face = i === 0 ? 1 : -1; n.state = 'intro'; n.sf = 0;
      if (self.mode === 'training' && self.training.rage) n.rage = 100;
    });
    this.proj = []; this.phase = 'intro'; this.pt = 0; this.timer = 99; this.tick = 0; this.hitstop = 0; this.freeze = 0; this.slow = 1;
    this.emit({ t: 'round', n: this.round });
  };

  // ----- entrées -----
  function pushInput(f, inp) {
    var rx = (inp.x || 0) * f.face, d = dirNum(rx, inp.y || 0), b = inp.btn || 0;
    var pressed = b & ~f.btnPrev;
    var e = { d: d, b: b, p: pressed, macro: null };
    if ((b & BTN.SP) && (pressed & ATTACKS)) e.macro = (inp.y || 0) > 0 ? '623' : (rx < 0 ? '214' : '236');
    f.hist.push(e); if (f.hist.length > 48) f.hist.shift();
    f.curD = d; f.curBtn = b; f.btnPrev = b;
    if (pressed & ATTACKS) { f.press.push({ b: pressed & ATTACKS, fr: f.animT, macro: e.macro }); }
    if (pressed & BTN.THR) f.throwPress = f.animT;
    if (pressed & BTN.SUP) f.press.push({ b: BTN.SUP, fr: f.animT, macro: (b & BTN.SP) ? 'S' : null });
    f.press = f.press.filter(function (p) { return f.animT - p.fr <= 6; });
    return e;
  }

  function moveTotal(mv) { return mv.su + (mv.ac > 90 ? 40 : mv.ac) + mv.rc; }

  // choisit le coup demandé par les commandes (spécial, super, projection, coup normal)
  function chooseMove(f, allowNormals, cancelFrom) {
    var C = f.C, hist = f.hist, press = f.press;
    var throwReq = f.animT - f.throwPress <= 3 && f.state !== 'air';
    if (!press.length && !throwReq) return null;
    var last = press.length ? press[press.length - 1] : { b: 0 };
    // SUPER
    var wantsSup = false;
    for (var i = 0; i < press.length; i++) { if (press[i].b === BTN.SUP) wantsSup = true; }
    if (f.rage >= 100 && f.state !== 'air') {
      if (wantsSup) return C.sup;
      if ((last.b & ATTACKS) && matchMotion(hist, '236236', 34, 12)) return C.sup;
    }
    // SPÉCIAUX
    var atk = null;
    for (var j = press.length - 1; j >= 0; j--) { if (press[j].b & ATTACKS) { atk = press[j]; break; } }
    if (atk && f.state !== 'air') {
      var strength = (atk.b & (BTN.HP | BTN.HK)) ? 'H' : 'L', key = null;
      if (atk.macro) key = atk.macro;
      else if (matchMotion(hist, '623', 18, 9)) key = '623';
      else if (matchMotion(hist, '236', 18, 9)) key = '236';
      else if (matchMotion(hist, '214', 18, 9)) key = '214';
      if (key && C.specials[key]) {
        var sp = C.specials[key][strength];
        // une seule boule d'énergie à la fois : sinon on retombe sur le coup normal
        if (sp.proj && f.match && f.match.proj.some(function (p) { return p.owner === f.side; })) sp = null;
        if (sp) return sp;
      }
    }
    if (!allowNormals) return null;
    // PROJECTION : poing léger + pied léger ensemble (ou touche dédiée)
    if (f.state !== 'air') {
      var lp = false, lk = false, bothClose = false;
      for (var k = 0; k < press.length; k++) { if (press[k].b & BTN.LP) lp = press[k].fr; if (press[k].b & BTN.LK) lk = press[k].fr; }
      if (lp !== false && lk !== false && Math.abs(lp - lk) <= 3) bothClose = true;
      if (bothClose || (f.animT - f.throwPress <= 3 && f.curD <= 6)) return C.normals.thr;
    }
    // COUPS NORMAUX
    if (atk) {
      var nm = (atk.b & BTN.LP) ? 'lp' : (atk.b & BTN.HP) ? 'hp' : (atk.b & BTN.LK) ? 'lk' : 'hk';
      var air = f.state === 'air';
      var cr = !air && (f.curD === 1 || f.curD === 2 || f.curD === 3);
      var id = air ? 'j' + nm : (cr ? 'c' + nm : nm);
      return C.normals[id] || null;
    }
    return null;
  }

  Match.prototype.startMove = function (f, mv) {
    f.move = mv; f.mf = 0; f.hitDone = false; f.contact = false; f.hits = 0; f.nextMulti = 0; f.state = 'attack';
    f.press = []; f.chainLock = 0; f.hitThis = false; f.blockedThis = false;
    if (mv.type === 'super') {
      f.rage = 0; f.inv = mv.su + 3; this.freeze = 56; this.freezeWho = f.side;
      this.emit({ t: 'super', who: f.side, name: mv.cut || mv.name, cid: f.cid });
    } else if (mv.type === 'special') {
      this.emit({ t: 'special', who: f.side, name: mv.name, id: mv.id });
    } else {
      this.emit({ t: 'swing', who: f.side, id: mv.id, heavy: mv.dmg >= 60 });
    }
    if (mv.hop) { f.vy = mv.hop; f.y = 0.01; f.airHop = true; } else f.airHop = false;
  };

  // ----- un pas de simulation d'un combattant -----
  Match.prototype.stepFighter = function (f, o, inp, active) {
    f.match = this; f.animT++;
    var e = pushInput(f, inp || { x: 0, y: 0, btn: 0 });
    var C = f.C;
    if (f.flash > 0) f.flash--;
    if (f.inv > 0 && f.state !== 'knockdown') f.inv--;
    if (f.dashCool > 0) f.dashCool--;
    f.sf++;

    // l'adversaire doit être remis debout dès que le combattant reprend la main (fin de combo)
    if (actionable(o) || o.state === 'intro') { /* géré côté o */ }

    var st = f.state;
    // --- phases passives
    if (st === 'intro') { return; }
    if (st === 'win') { return; }
    if (st === 'ko') {
      f.x += f.vx; f.y += f.vy; f.vy -= GRAV;
      if (f.y <= 0) { f.y = 0; if (Math.abs(f.vy) > 4 && !f.bounced) { f.vy = -f.vy * 0.35; f.vx *= 0.6; f.bounced = true; this.emit({ t: 'land', who: f.side, big: true, x: f.x }); } else { f.vy = 0; f.vx *= 0.8; } }
      f.x = clamp(f.x, WALL_L - 20, WALL_R + 20);
      return;
    }
    if (st === 'hit' || st === 'block') {
      f.x += f.px; f.px *= 0.82; if (Math.abs(f.px) < 0.05) f.px = 0;
      f.stun--;
      if (f.stun <= 0) { f.state = (f.curD === 1 || f.curD === 2 || f.curD === 3) ? 'crouch' : 'idle'; f.sf = 0; f.juggles = 0; }
      return;
    }
    if (st === 'airhit') {
      f.x += f.vx; f.y += f.vy; f.vy -= GRAV;
      if (f.y <= 0) { f.y = 0; f.vy = 0; f.state = 'knockdown'; f.kdT = 34; f.sf = 0; f.inv = 0; f.px = f.vx * 0.5; f.vx = 0; this.emit({ t: 'land', who: f.side, big: true, x: f.x }); }
      f.x = clamp(f.x, WALL_L - 10, WALL_R + 10);
      return;
    }
    if (st === 'knockdown') {
      f.x += f.px; f.px *= 0.85;
      f.kdT--; if (f.kdT <= 0) { f.state = 'getup'; f.sf = 0; f.kdT = 18; f.inv = 0; }
      return;
    }
    if (st === 'getup') { f.kdT--; if (f.kdT <= 0) { f.state = 'idle'; f.sf = 0; f.cHits = 0; } return; }
    if (st === 'thrown') {
      f.thrownT--;
      if (f.thrownT <= 0) { f.state = 'airhit'; f.vy = 6.5; f.sf = 0; f.inv = 0; f.vx = o.face * 3.6; }
      return;
    }
    if (st === 'tech') { f.stun--; f.x += f.px; f.px *= 0.8; if (f.stun <= 0) { f.state = 'idle'; f.sf = 0; } return; }

    // --- orientation
    if ((actionable(f) || st === 'dashF' || st === 'dashB') && Math.abs(o.x - f.x) > 4) f.face = o.x >= f.x ? 1 : -1;

    // --- coups en cours
    if (st === 'attack') { this.stepAttack(f, o); return; }

    // --- en l'air
    if (st === 'air') {
      f.x += f.vx; f.y += f.vy; f.vy -= GRAV;
      var mvA = chooseMove(f, true);
      if (mvA && mvA.st === 'air' && !f.airAtk && f.y > 28) { f.airAtk = true; this.startMove(f, mvA); f.state = 'attack'; f.vx = f.vx; return; }
      if (f.y <= 0) { f.y = 0; f.vy = 0; f.vx = 0; f.state = 'idle'; f.sf = 0; f.landLag = 0; this.emit({ t: 'land', who: f.side, x: f.x }); }
      f.x = clamp(f.x, WALL_L, WALL_R);
      return;
    }

    // --- dash
    if (st === 'dashF' || st === 'dashB') {
      var dur = st === 'dashF' ? 22 : 24;
      var sp = (st === 'dashF' ? C.dashF : -C.dashB) * (1 - f.sf / (dur + 6));
      f.x += sp * f.face;
      if (st === 'dashB' && f.sf <= 6) f.inv = Math.max(f.inv, 1);
      var mvD = chooseMove(f, false);
      if (mvD && f.sf > 12 && st === 'dashF') { this.startMove(f, mvD); }
      if (f.sf >= dur) { f.state = 'idle'; f.sf = 0; }
      f.x = clamp(f.x, WALL_L, WALL_R);
      return;
    }

    // --- debout / accroupi / marche : on lit les commandes
    var mv = chooseMove(f, true);
    if (mv) {
      this.startMove(f, mv);
      this.stepAttack(f, o);
      return;
    }
    var d = f.curD, rel = d;
    if (d === 7 || d === 8 || d === 9) {
      f.state = 'air'; f.vy = C.jumpV; f.vx = (d === 9 ? C.jumpX : (d === 7 ? -C.jumpX : 0)) * f.face; f.airAtk = false; f.sf = 0; f.y = 0.01;
      this.emit({ t: 'jump', who: f.side, x: f.x });
      return;
    }
    if (d === 1 || d === 2 || d === 3) { f.state = 'crouch'; return; }
    // double-appui avant / arrière : →, retour au neutre, →  (jamais par le bas : 236 ne doit pas lancer une course)
    if (f.dashCool <= 0 && (d === 6 || d === 4)) {
      var h = f.hist, n = h.length, seenNeutral = false;
      for (var q = n - 2; q >= Math.max(0, n - 13); q--) {
        var hd = h[q].d;
        if (hd === 1 || hd === 2 || hd === 3 || hd === 7 || hd === 8 || hd === 9) break;
        if (hd === 5) { seenNeutral = true; continue; }
        if (hd === d && seenNeutral) { f.state = d === 6 ? 'dashF' : 'dashB'; f.sf = 0; f.dashCool = 14; this.emit({ t: 'dash', who: f.side, back: d === 4, x: f.x }); return; }
        if (hd !== d) break;
      }
    }
    if (d === 6) { f.state = 'walkF'; f.x += C.walkF * f.face; }
    else if (d === 4) { f.state = 'walkB'; f.x -= C.walkB * f.face; }
    else f.state = 'idle';
    f.x = clamp(f.x, WALL_L, WALL_R);
  };

  Match.prototype.stepAttack = function (f, o) {
    var mv = f.move, C = f.C;
    if (!mv) { f.state = 'idle'; return; }
    f.mf++;
    var mf = f.mf, su = mv.su, ac = mv.ac > 90 ? 9999 : mv.ac;
    // mouvement pendant le coup
    if (mv.mv) {
      for (var i = 0; i < mv.mv.length; i++) { var m = mv.mv[i]; if (mf >= m[0] && mf <= m[1]) { f.x += m[2] * f.face; if (m[3]) f.y += m[3]; } }
    }
    if (mv.hop || f.state === 'attack' && f.y > 0.001 && f.airHop) {
      f.y += f.vy; f.vy -= GRAV;
      if (f.y <= 0) { f.y = 0; f.vy = 0; f.airHop = false; }
    }
    if (mv.st === 'air') {
      f.x += f.vx; f.y += f.vy; f.vy -= GRAV;
      if (f.y <= 0) { f.y = 0; f.vy = 0; f.vx = 0; f.state = 'idle'; f.sf = 0; f.move = null; f.landLag = 0; this.emit({ t: 'land', who: f.side, x: f.x }); return; }
    }
    // invulnérabilité
    if (mv.inv && mf >= mv.inv[0] && mf <= mv.inv[1]) f.inv = Math.max(f.inv, 1);
    // projectile
    if (mv.proj && mf === mv.proj.at) this.spawnProj(f, mv.proj);
    // projection
    if (mv.type === 'throw' && mf === su) this.tryThrow(f, o, mv);
    // zone de coup
    var activeNow = mf > su && mf <= su + ac;
    if (activeNow && mv.box && mv.type !== 'throw') this.tryHit(f, o, mv, mf);
    // annulations (coup normal → spécial/super ; chaînage des coups légers)
    if (f.contact && mf > su && mf <= su + (mv.ac > 90 ? 12 : mv.ac) + 14 && mv.type !== 'super') {
      var cm = chooseMove(f, true);
      if (cm) {
        var okSpecial = (cm.type === 'special' || cm.type === 'super') && (mv.type === 'normal' || mv.type === undefined || mv.type === 'special' && cm.type === 'super');
        var okChain = cm.type !== 'special' && cm.type !== 'super' && cm.type !== 'throw' && mv.chain && cm.st !== 'air' && mv.st !== 'air' && f.chainLock < 3 && cm.id !== mv.id;
        if (okSpecial && mv.type !== 'special' || (cm.type === 'super' && mv.type === 'special')) { this.startMove(f, cm); return; }
        if (okChain) { var lk = f.chainLock + 1; this.startMove(f, cm); f.chainLock = lk; return; }
      }
    }
    var total = su + (mv.ac > 90 ? 0 : mv.ac) + mv.rc;
    if (mv.st !== 'air' && mf >= total && !(f.airHop && f.y > 0.001)) { f.state = (f.curD === 1 || f.curD === 2 || f.curD === 3) ? 'crouch' : 'idle'; f.move = null; f.sf = 0; f.airHop = false; if (f.y > 0) f.y = 0; }
    f.x = clamp(f.x, WALL_L, WALL_R);
  };

  Match.prototype.spawnProj = function (f, p) {
    this.proj.push({ id: this.nextId++, owner: f.side, kind: p.kind, x: f.x + f.face * p.ox, y: f.y + p.oy, vx: p.vx * f.face, vy: 0, r: p.r, dmg: p.dmg, hs: p.hs, bs: p.bs, life: p.life, hstop: p.hstop, rage: p.rage, pull: p.pull || 0, face: f.face, age: 0, cid: f.cid });
    this.emit({ t: 'proj', who: f.side, kind: p.kind, x: f.x + f.face * p.ox, y: f.y + p.oy, face: f.face });
  };

  Match.prototype.canBlock = function (d, lvl, fromX) {
    if (!(d.state === 'idle' || d.state === 'crouch' || d.state === 'walkB' || d.state === 'walkF' || d.state === 'block')) return false;
    if (d.y > 0.01) return false;
    var back = d.curD === 4 || d.curD === 1;
    if (this.mode === 'training' && d.cpuDummy && this.training.block === 'all') return true;
    if (!back) return false;
    if (lvl === 'low') return d.curD === 1;
    if (lvl === 'high') return d.curD === 4;
    return true;
  };

  // test d'un coup contre l'adversaire
  Match.prototype.tryHit = function (f, o, mv, mf) {
    if (o.inv > 0 || o.state === 'knockdown' || o.state === 'ko' || o.state === 'thrown' || o.state === 'win') return;
    var multi = mv.multi;
    if (!multi && f.hitDone) return;
    if (multi) {
      if (f.hits >= multi.max) return;
      if (mf < f.nextMulti) return;
    }
    var hb = boxWorld(f, mv.box), hu = hurtbox(o);
    if (!overlap(hb, hu)) return;
    this.applyHit(f, o, mv, mf, { x: clamp((hb.x1 + hb.x2) / 2, hu.x1, hu.x2), y: clamp((hb.y1 + hb.y2) / 2, hu.y1, hu.y2) });
  };

  Match.prototype.applyHit = function (f, o, mv, mf, pt) {
    var blocked = this.canBlock(o, mv.lvl);
    var multi = mv.multi, last = multi ? (f.hits + 1 >= multi.max) : true;
    f.hitDone = true; f.contact = true; f.hits++;
    if (multi) f.nextMulti = mf + multi.every;
    var stopN = mv.hstop || 6;
    if (blocked) {
      var chip = mv.type === 'special' || mv.type === 'super' ? Math.round(mv.dmg * 0.12) : 0;
      o.hp = Math.max(1, o.hp - chip);
      o.state = 'block'; o.sf = 0; o.stun = mv.bs; o.blockCrouch = (o.curD === 1);
      var pbk = (mv.pb || 3) + 2;
      this.pushback(f, o, pbk);
      this.hitstop = Math.max(this.hitstop, Math.max(3, Math.round(stopN * 0.7)));
      f.blockedThis = true; o.rage = Math.min(100, o.rage + 2);
      this.emit({ t: 'block', who: o.side, x: pt.x, y: pt.y, face: f.face, power: mv.dmg });
      return;
    }
    // coup au but
    var scale = f.cHits === 0 ? 1 : Math.max(0.4, 1 - 0.1 * f.cHits);
    if (mv.type === 'super') scale = Math.max(0.55, scale);
    var dmg = Math.max(1, Math.round(mv.dmg * scale));
    o.hp -= dmg; if (this.mode === 'training' && o.hp < 1) o.hp = 1; f.cHits++; f.cDmg += dmg; f.lastCombo = f.cHits; f.lastComboDmg = f.cDmg; f.lastHitFrame = this.frame;
    f.rage = Math.min(100, f.rage + (mv.rage || 4)); if (mv.type !== 'super') o.rage = Math.min(100, o.rage + dmg * 0.06);
    o.flash = 5; f.hitThis = true;
    var airborne = o.y > 1 || o.state === 'airhit' || o.state === 'air';
    var launch = mv.launch, kd = mv.kd;
    if (multi && last && mv.fin) { launch = mv.fin.launch; kd = mv.fin.kd; }
    if (mv.pullIn) { o.x = f.x + f.face * 70; o.px = 0; }
    if (airborne || launch || kd) {
      if (o.juggles >= 4 && !launch) { launch = [1.2, 3]; }
      var lv = launch || [2.4, 6.5];
      o.state = 'airhit'; o.sf = 0; o.juggles++;
      var jm = Math.max(0.55, 1 - 0.12 * (o.juggles - 1));
      o.vx = f.face * lv[0]; o.vy = lv[1] * jm; if (o.y <= 0) o.y = 0.01;
      o.stun = mv.hs;
    } else {
      o.state = 'hit'; o.sf = 0; o.stun = mv.hs; o.hitKind = (o.curD === 1 || o.state === 'crouch' || o.curD === 2 || o.curD === 3) ? 'crouch' : 'stand'; o.px = 0;
    }
    o.chainLock = 0;
    this.pushback(f, o, mv.pb || 3);
    this.hitstop = Math.max(this.hitstop, stopN);
    var big = mv.dmg >= 90 || mv.type === 'super' || (launch && launch[1] > 11) || (multi && last);
    this.emit({ t: 'hit', who: o.side, by: f.side, x: pt.x, y: pt.y, face: f.face, dmg: dmg, big: big, power: mv.dmg, type: mv.type || 'normal', vis: mv.vis || null, combo: f.cHits, cid: f.cid });
    if (o.hp <= 0) this.knockout(f, o, mv);
  };

  Match.prototype.pushback = function (f, o, amount) {
    var atWall = (o.x <= WALL_L + 8 && f.face < 0) || (o.x >= WALL_R - 8 && f.face > 0);
    if (atWall) { f.px = -f.face * amount * 0.85; o.px = 0; }
    else { o.px = f.face * amount * 0.7; f.px = -f.face * (f.state === 'attack' ? 0 : amount * 0.3); }
  };

  Match.prototype.tryThrow = function (f, o, mv) {
    var d = Math.abs(o.x - f.x);
    var okState = actionable(o) || o.state === 'dashF' || o.state === 'dashB' || (o.state === 'attack' && o.mf < 4);
    if (d > mv.range || !okState || o.y > 1 || o.inv > 0) { f.hitDone = true; return; }
    // brisure de projection : même commande dans les 9 images avant
    if (o.animT - o.throwPress <= 9) {
      f.state = 'tech'; f.stun = 22; f.px = -f.face * 5; f.move = null; o.state = 'tech'; o.stun = 22; o.px = -o.face * 5; o.move = null;
      this.emit({ t: 'tech', x: (f.x + o.x) / 2 }); return;
    }
    f.hitDone = true; f.contact = true;
    var dmg = Math.round(mv.dmg * (f.cHits === 0 ? 1 : 0.7));
    o.hp -= dmg; if (this.mode === 'training' && o.hp < 1) o.hp = 1; o.state = 'thrown'; o.thrownT = 22; o.sf = 0; o.move = null; o.x = f.x + f.face * 46; o.px = 0;
    f.rage = Math.min(100, f.rage + 8); o.rage = Math.min(100, o.rage + 5); f.cHits++; f.cDmg += dmg; f.lastCombo = f.cHits; f.lastComboDmg = f.cDmg; f.lastHitFrame = this.frame;
    this.hitstop = Math.max(this.hitstop, 6);
    this.emit({ t: 'hit', who: o.side, by: f.side, x: o.x, y: 90, face: f.face, dmg: dmg, big: true, power: 95, type: 'throw', combo: f.cHits, cid: f.cid });
    if (o.hp <= 0) this.knockout(f, o, mv);
  };

  Match.prototype.knockout = function (f, o, mv) {
    o.hp = 0; o.state = 'ko'; o.vx = f.face * 5.5; o.vy = 11; o.y = Math.max(o.y, 0.01); o.sf = 0; o.bounced = false; o.move = null;
    this.phase = 'ko'; this.pt = 0; this.slow = 0.25; this.lastKoBig = true;
    this.emit({ t: 'ko', who: o.side, by: f.side, x: o.x, y: o.y + 90, super: mv.type === 'super' });
  };

  // ----- projectiles -----
  Match.prototype.stepProjectiles = function () {
    var self = this;
    this.proj.forEach(function (p) {
      p.age++; p.x += p.vx; p.y += p.vy; p.life--;
      var o = self.f[1 - p.owner];
      if (o.inv > 0 || o.state === 'knockdown' || o.state === 'ko') return;
      var hu = hurtbox(o);
      var box = { x1: p.x - p.r, x2: p.x + p.r, y1: p.y - p.r, y2: p.y + p.r };
      if (overlap(box, hu)) {
        var owner = self.f[p.owner];
        var mv = { dmg: p.dmg, hs: p.hs, bs: p.bs, hstop: p.hstop, rage: p.rage, lvl: 'mid', pb: 5, type: 'special', vis: p.kind };
        self.pullTarget = p.pull ? p.pull : 0;
        self.applyHit(owner, o, mv, 0, { x: p.x, y: p.y });
        if (p.pull && o.state !== 'block') { o.x = owner.x + owner.face * p.pull; o.px = 0; }
        p.life = 0; p.hit = true;
        self.emit({ t: 'projhit', kind: p.kind, x: p.x, y: p.y });
      }
    });
    // deux projectiles qui se rencontrent s'annulent
    for (var i = 0; i < this.proj.length; i++) for (var j = i + 1; j < this.proj.length; j++) {
      var a = this.proj[i], b = this.proj[j];
      if (a.owner !== b.owner && a.life > 0 && b.life > 0 && Math.abs(a.x - b.x) < a.r + b.r && Math.abs(a.y - b.y) < a.r + b.r) { a.life = 0; b.life = 0; this.emit({ t: 'projhit', kind: 'clash', x: (a.x + b.x) / 2, y: a.y }); }
    }
    this.proj = this.proj.filter(function (p) { return p.life > 0 && p.x > -250 && p.x < STAGE_W + 250; });
  };

  // ----- séparation des corps -----
  Match.prototype.separate = function () {
    var a = this.f[0], b = this.f[1];
    if (a.y > 8 || b.y > 8) { // pas de collision quand l'un saute franchement
      if (!(a.y < 8 && b.y < 8)) return;
    }
    // les combattants ne peuvent pas s'éloigner plus que la largeur de l'écran
    var gap = Math.abs(b.x - a.x);
    if (gap > MAXD && a.state !== 'ko' && b.state !== 'ko') { var pull = (gap - MAXD) / 2, dr = b.x >= a.x ? 1 : -1; a.x += dr * pull; b.x -= dr * pull; }
    var dx = b.x - a.x, min = 54;
    if (Math.abs(dx) < min && a.state !== 'ko' && b.state !== 'ko' && a.state !== 'knockdown' && b.state !== 'knockdown') {
      var push = (min - Math.abs(dx)) / 2, dir = dx >= 0 ? 1 : -1;
      if (dx === 0) dir = a.face;
      var aw = a.x <= WALL_L + 1 || a.x >= WALL_R - 1, bw = b.x <= WALL_L + 1 || b.x >= WALL_R - 1;
      if (aw && !bw) { b.x += dir * push * 2; } else if (bw && !aw) { a.x -= dir * push * 2; } else { a.x -= dir * push; b.x += dir * push; }
      a.x = clamp(a.x, WALL_L, WALL_R); b.x = clamp(b.x, WALL_L, WALL_R);
    }
  };

  // ----- une image de jeu -----
  // inputs = [{x,y,btn}, {x,y,btn}] avec x ∈ {-1,0,1} (droite = 1), y ∈ {-1 bas, 0, 1 haut}
  Match.prototype.step = function (inputs) {
    this.events = [];
    this.frame++;
    var a = this.f[0], b = this.f[1];
    if (this.freeze > 0) { this.freeze--; return; }
    if (this.hitstop > 0) {
      this.hitstop--;
      // les commandes restent mémorisées pendant l'arrêt sur image
      pushInput(a, inputs[0]); pushInput(b, inputs[1]); a.animT--; b.animT--;
      return;
    }
    var self = this;
    this.pt++;

    if (this.phase === 'intro') {
      if (this.pt === 1) { a.state = 'intro'; b.state = 'intro'; }
      if (this.pt === 100) this.emit({ t: 'fight' });
      if (this.pt >= 130) { a.state = 'idle'; b.state = 'idle'; a.sf = b.sf = 0; this.phase = 'fight'; this.pt = 0; }
      return;
    }

    var tr = this.mode === 'training';
    if (this.phase === 'fight') {
      this.stepFighter(a, b, inputs[0], true);
      this.stepFighter(b, a, inputs[1], true);
      this.stepProjectiles();
      this.separate();
      // fin de combo
      if (actionable(b) || b.state === 'intro') { a.cHits = 0; a.cDmg = 0; }
      if (actionable(a) || a.state === 'intro') { b.cHits = 0; b.cDmg = 0; }
      if (!tr || !this.training.infinite) {
        this.tick++; if (this.tick >= 60) { this.tick = 0; this.timer--; if (this.timer <= 0) this.timeUp(); }
      } else {
        // entraînement : la vie se remet après un moment de calme
        if (actionable(a) && actionable(b) && this.frame - Math.max(a.lastHitFrame, b.lastHitFrame) > 120) { a.hp = a.maxHp; b.hp = b.maxHp; if (this.training.rage) { a.rage = 100; } }
      }
    } else if (this.phase === 'ko') {
      this.stepFighter(a, b, { x: 0, y: 0, btn: 0 }, false); this.stepFighter(b, a, { x: 0, y: 0, btn: 0 }, false);
      this.stepProjectiles();
      if (this.pt === 28) this.slow = 1;
      if (this.pt >= 110) this.endRound();
    } else if (this.phase === 'result') {
      var w = this.winnerIdx >= 0 ? this.f[this.winnerIdx] : null;
      if (this.pt === 1) { if (w && w.state !== 'ko') { w.state = 'win'; w.sf = 0; this.emit({ t: 'win', who: w.side }); } }
      if (this.pt >= 170) {
        if (this.matchOver) { this.phase = 'over'; this.pt = 0; this.emit({ t: 'over', winner: this.winner }); }
        else { this.round++; this.resetRound(); }
      }
    }
    // caméra
    var tx = (a.x + b.x) / 2;
    this.cam.x += (tx - this.cam.x) * 0.2;
  };

  Match.prototype.timeUp = function () {
    var a = this.f[0], b = this.f[1];
    this.emit({ t: 'timeup' });
    this.phase = 'ko'; this.pt = 70; this.slow = 1; this.timeOut = true;
    if (a.hp === b.hp) this.winnerIdx = -1; else this.winnerIdx = a.hp > b.hp ? 0 : 1;
    this.finishRound(this.winnerIdx, true);
  };

  Match.prototype.endRound = function () {
    if (!this.timeOut) {
      var a = this.f[0], b = this.f[1];
      this.winnerIdx = a.hp <= 0 && b.hp <= 0 ? -1 : (a.hp > 0 ? 0 : 1);
      this.finishRound(this.winnerIdx, false);
    }
    this.timeOut = false; this.phase = 'result'; this.pt = 0;
  };

  Match.prototype.finishRound = function (w, timeUp) {
    if (w >= 0) { this.wins[w]++; this.f[w].rounds++; }
    else { this.wins[0]++; this.wins[1]++; }
    var perfect = w >= 0 && this.f[w].hp >= this.f[w].maxHp;
    this.emit({ t: 'roundEnd', winner: w, perfect: perfect, timeUp: !!timeUp });
    if (this.wins[0] >= this.winsNeeded || this.wins[1] >= this.winsNeeded) {
      this.matchOver = true;
      this.winner = this.wins[0] === this.wins[1] ? -1 : (this.wins[0] > this.wins[1] ? 0 : 1);
    }
  };

  XS.Core = { Match: Match, BTN: BTN, ATTACKS: ATTACKS, STAGE_W: STAGE_W, WALL_L: WALL_L, WALL_R: WALL_R, dirNum: dirNum, rng: rng, matchMotion: matchMotion, MOTIONS: MOTIONS, actionable: actionable, hurtbox: hurtbox, boxWorld: boxWorld, clamp: clamp, moveTotal: moveTotal, GRAV: GRAV };
  if (typeof module !== 'undefined' && module.exports) module.exports = XS.Core;
})(typeof window !== 'undefined' ? window : globalThis);
