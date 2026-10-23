/* X SAPHIR — ARENA : l'adversaire contrôlé par l'ordinateur.
   Il joue avec les mêmes commandes qu'un joueur (mêmes directions, mêmes boutons) : il ne triche pas sur les coups.
   Niveau 1 (débutant) à 5 (féroce) : plus le niveau monte, plus il réagit vite, bloque, enchaîne et punit. */
(function (root) {
  'use strict';
  var XS = root.XS = root.XS || {};
  var Core = XS.Core || (typeof require !== 'undefined' ? require('./core.js') : null);
  var BTN = Core.BTN;

  // une commande = [directionPavéNumérique, boutons], jouée une image après l'autre (direction relative à la face)
  function motion(dirs, btn) { var q = dirs.map(function (d) { return [d, 0]; }); q.push([dirs[dirs.length - 1], btn]); q.push([5, 0]); return q; }
  var M = {
    fire: function (b) { return motion([2, 3, 6], b); },
    dp: function (b) { return motion([6, 2, 3], b); },
    qcb: function (b) { return motion([2, 1, 4], b); },
    sup: function () { return [[5, BTN.SUP], [5, 0]]; },
    thr: function () { return [[5, BTN.THR], [5, 0]]; },
    tap: function (b) { return [[5, b], [5, 0]]; },
    ctap: function (b) { return [[2, b], [2, 0]]; },
    jump: function (dir, b) { var q = [[dir, 0]]; for (var i = 0; i < 12; i++) q.push([dir === 9 ? 6 : (dir === 7 ? 4 : 5), 0]); q.push([5, b || 0]); return q; },
    dashF: function () { return [[6, 0], [5, 0], [5, 0], [6, 0], [6, 0], [6, 0], [6, 0], [6, 0], [6, 0]]; },
    walk: function (d, n) { var q = []; for (var i = 0; i < n; i++) q.push([d, 0]); return q; },
    block: function (low, n) { var q = []; for (var i = 0; i < n; i++) q.push([low ? 1 : 4, 0]); return q; }
  };
  function toInput(c, face) {
    var d = c[0], x = (d === 4 || d === 1 || d === 7) ? -1 : ((d === 6 || d === 3 || d === 9) ? 1 : 0), y = (d === 1 || d === 2 || d === 3) ? -1 : ((d === 7 || d === 8 || d === 9) ? 1 : 0);
    return { x: x * face, y: y, btn: c[1] };
  }

  function create(level, seed) {
    var rand = Core.rng((seed || 1) * 7919 + level), q = [], cool = 0, wait = 0, lastAtk = -99;
    var L = Math.max(1, Math.min(5, level || 3));
    var react = 0.25 + L * 0.13;        // chance de réagir à un coup adverse
    var aggr = 0.35 + L * 0.1;
    function choose(a, b, w) { var t = rand() * w.reduce(function (s, v) { return s + v; }, 0); for (var i = 0; i < w.length; i++) { t -= w[i]; if (t <= 0) return a[i]; } return a[a.length - 1]; }
    function queue(seq) { q = seq.slice(); }

    function think(match, side) {
      var me = match.f[side], op = match.f[1 - side];
      var inp = null;
      if (q.length) { inp = toInput(q.shift(), me.face); return inp; }
      if (wait > 0) { wait--; return { x: 0, y: 0, btn: 0 }; }
      if (match.phase !== 'fight') return { x: 0, y: 0, btn: 0 };
      var dist = Math.abs(op.x - me.x), opAir = op.y > 12, opAtk = op.state === 'attack', free = Core.actionable(me);
      if (cool > 0) cool--;

      // en l'air : on frappe quand on est assez haut
      if (me.state === 'air') {
        if (me.y > 30 && !me.airAtk && dist < 130 && rand() < 0.5) return { x: 0, y: 0, btn: choose([BTN.HP, BTN.HK, BTN.LK], null, [1, 2, 1]) };
        return { x: me.face * (rand() < 0.5 ? 1 : 0), y: 0, btn: 0 };
      }
      if (!free) {
        // après un coup qui touche : on enchaîne (annulation en spécial)
        if (me.state === 'attack' && me.contact && me.move && me.move.type !== 'super' && L >= 3 && rand() < 0.12 + L * 0.03) {
          if (me.rage >= 100 && rand() < 0.5) queue(M.sup()); else queue(choose([M.dp(BTN.HP), M.fire(BTN.HP), M.qcb(BTN.HP)], null, [3, dist > 150 ? 3 : 1, 2]));
          return toInput(q.shift(), me.face);
        }
        if (me.state === 'attack' && me.contact && me.move && me.move.chain && L >= 2 && rand() < 0.2) return { x: 0, y: 0, btn: choose([BTN.LP, BTN.LK], null, [1, 1]) };
        return { x: 0, y: 0, btn: 0 };
      }

      // défense : un coup arrive ?
      if (opAtk && op.move && dist < 200 && (op.move.type !== 'throw') && rand() < react * 0.5) {
        var lowAtk = op.move.lvl === 'low';
        queue(M.block(lowAtk, 10 + Math.floor(rand() * 8))); return toInput(q.shift(), me.face);
      }
      for (var i = 0; i < match.proj.length; i++) {
        var p = match.proj[i];
        if (p.owner !== side && Math.abs(p.x - me.x) < 170 && rand() < react * 0.35) { if (L >= 3 && rand() < 0.35) { queue(M.block(false, 14)); } else { queue(M.jump(8)); } return toInput(q.shift(), me.face); }
      }
      // le joueur saute près de moi : anti-aérien
      if (opAir && dist < 170 && L >= 2 && rand() < react * 0.8 && cool <= 0) { cool = 20; queue(M.dp(rand() < 0.5 ? BTN.LP : BTN.HP)); return toInput(q.shift(), me.face); }
      // adversaire à terre/en train de se relever : on se place
      if (op.state === 'hit' || op.state === 'block') { if (dist > 100) return { x: me.face, y: 0, btn: 0 }; }
      // super
      if (me.rage >= 100 && dist < 330 && rand() < 0.2) { queue(M.sup()); return toInput(q.shift(), me.face); }

      if (cool > 0) return { x: dist > 140 ? me.face * (rand() < 0.7 ? 1 : 0) : 0, y: 0, btn: 0 };

      if (dist > 460) {
        var a = choose(['fire', 'walk', 'dash', 'jump', 'wait'], null, [2 + aggr, 3, 2, 1, 1]);
        cool = 8 + Math.floor(rand() * 10);
        if (a === 'fire') queue(M.fire(rand() < 0.5 ? BTN.LP : BTN.HP));
        else if (a === 'walk') queue(M.walk(6, 14 + Math.floor(rand() * 20)));
        else if (a === 'dash') queue(M.dashF());
        else if (a === 'jump') queue(M.jump(9, rand() < 0.5 ? BTN.HK : BTN.HP));
        else wait = 8;
        if (q.length) return toInput(q.shift(), me.face);
        return { x: 0, y: 0, btn: 0 };
      }
      if (dist > 190) {
        var b = choose(['walk', 'hk', 'lunge', 'fire', 'jump', 'dash', 'back'], null, [4, 1.2 * aggr * 2, L >= 2 ? 1.4 : 0.2, 1.1, 0.8, 1.3, 0.7]);
        cool = 10 + Math.floor(rand() * 14);
        if (b === 'walk') queue(M.walk(6, 10 + Math.floor(rand() * 14)));
        else if (b === 'hk') queue(M.tap(BTN.HK));
        else if (b === 'lunge') queue(M.qcb(rand() < 0.5 ? BTN.LK : BTN.HK));
        else if (b === 'fire') queue(M.fire(BTN.LP));
        else if (b === 'jump') queue(M.jump(9, BTN.HK));
        else if (b === 'dash') queue(M.dashF());
        else queue(M.walk(4, 10));
        return toInput(q.shift(), me.face);
      }
      // corps à corps
      var c = choose(['lp', 'lk', 'clk', 'hp', 'hk', 'throw', 'dp', 'back', 'chp', 'lunge'], null,
        [2.4 * aggr, 2 * aggr, 1.6, 1.2 * aggr, 1 * aggr, 1.1 * aggr, 0.5, 1.2, 0.9, 0.4]);
      cool = 6 + Math.floor(rand() * 18) - L;
      if (c === 'lp') queue(M.tap(BTN.LP)); else if (c === 'lk') queue(M.tap(BTN.LK));
      else if (c === 'clk') queue(M.ctap(BTN.LK)); else if (c === 'hp') queue(M.tap(BTN.HP)); else if (c === 'hk') queue(M.tap(BTN.HK));
      else if (c === 'throw') queue(M.thr());
      else if (c === 'dp') queue(M.dp(BTN.LP));
      else if (c === 'chp') queue(M.ctap(BTN.HP));
      else if (c === 'lunge') queue(M.qcb(BTN.LK));
      else queue(M.block(false, 8 + Math.floor(rand() * 10)));
      return toInput(q.shift(), me.face);
    }
    return { think: think, level: L };
  }

  XS.AI = { create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = XS.AI;
})(typeof window !== 'undefined' ? window : globalThis);
