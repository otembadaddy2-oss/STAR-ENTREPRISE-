/* X SAPHIR — ARENA : les commandes. Clavier (2 joueurs), manette, et écran tactile (joystick + boutons).
   Chaque source donne à chaque image { x: -1|0|1, y: -1|0|1, btn } avec les boutons du moteur (BTN). */
(function (root) {
  'use strict';
  var XS = root.XS = root.XS || {};
  var BTN = XS.Core.BTN;

  var KEYS = {
    p1: { left: ['KeyA', 'KeyQ'], right: ['KeyD'], up: ['KeyW', 'KeyZ'], down: ['KeyS'], LP: ['KeyU'], HP: ['KeyI'], LK: ['KeyJ'], HK: ['KeyK'], THR: ['KeyL'], SUP: ['KeyO'], SP: ['Space', 'ShiftLeft'] },
    p2: { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], LP: ['Comma', 'Numpad4'], HP: ['Period', 'Numpad5'], LK: ['Semicolon', 'Numpad1'], HK: ['Slash', 'Numpad2'], THR: ['ShiftRight', 'Numpad6'], SUP: ['Quote', 'Numpad8'], SP: ['Enter', 'NumpadEnter', 'Numpad0'] }
  };
  // en solo, les flèches contrôlent aussi le joueur 1
  var SOLO_EXTRA = { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], LP: ['KeyZ'], HP: ['KeyX'], LK: ['KeyC'], HK: ['KeyV'], THR: ['KeyB'], SUP: ['KeyN'], SP: ['KeyM'] };

  function Input() {
    this.down = {}; this.solo = true; this.touch = null; this.pad = [null, null]; this.padAxis = [0, 0];
    var self = this;
    this.onKey = function (e, v) {
      if (e.repeat && v) { if (self.captured(e.code)) e.preventDefault(); return; }
      self.down[e.code] = v;
      if (self.captured(e.code)) e.preventDefault();
    };
    root.addEventListener('keydown', function (e) { self.onKey(e, true); });
    root.addEventListener('keyup', function (e) { self.onKey(e, false); });
    root.addEventListener('blur', function () { self.down = {}; });
  }
  Input.prototype.captured = function (code) { return /^(Arrow|Space|Numpad|Key[A-Z]|Comma|Period|Slash|Semicolon|Quote|Enter|Shift)/.test(code) && this.active; };
  function anyDown(d, list) { for (var i = 0; i < list.length; i++) if (d[list[i]]) return true; return false; }
  Input.prototype.fromKeys = function (map, extra) {
    var d = this.down, x = 0, y = 0, b = 0;
    function g(k) { return anyDown(d, map[k]) || (extra && anyDown(d, extra[k])); }
    if (g('left')) x -= 1; if (g('right')) x += 1; if (g('up')) y += 1; if (g('down')) y -= 1;
    if (g('LP')) b |= BTN.LP; if (g('HP')) b |= BTN.HP; if (g('LK')) b |= BTN.LK; if (g('HK')) b |= BTN.HK; if (g('THR')) b |= BTN.THR; if (g('SUP')) b |= BTN.SUP; if (g('SP')) b |= BTN.SP;
    return { x: x, y: y, btn: b };
  };

  // manettes : disposition « standard » (A,B,X,Y)
  Input.prototype.readPads = function () {
    var pads = (root.navigator && navigator.getGamepads) ? navigator.getGamepads() : [], out = [], i;
    for (i = 0; i < pads.length; i++) { var p = pads[i]; if (!p || !p.connected) continue; var x = 0, y = 0, b = 0, ax = p.axes[0] || 0, ay = p.axes[1] || 0, bt = p.buttons;
      function pr(k) { return bt[k] && (bt[k].pressed || bt[k].value > 0.5); }
      if (ax < -0.5 || pr(14)) x = -1; if (ax > 0.5 || pr(15)) x = 1; if (ay < -0.55 || pr(12)) y = 1; if (ay > 0.55 || pr(13)) y = -1;
      if (pr(2)) b |= BTN.LP; if (pr(3)) b |= BTN.HP; if (pr(0)) b |= BTN.LK; if (pr(1)) b |= BTN.HK; if (pr(4)) b |= BTN.THR; if (pr(5)) b |= BTN.SP; if (pr(6) || pr(7)) b |= BTN.SUP;
      out.push({ x: x, y: y, btn: b, any: b !== 0 || x !== 0 || y !== 0 }); }
    return out;
  };

  // joueur 0 / 1 → commandes de cet instant
  Input.prototype.read = function (side, mode) {
    var k = side === 0 ? this.fromKeys(KEYS.p1, this.solo ? SOLO_EXTRA : null) : this.fromKeys(KEYS.p2, null);
    var pads = this.readPads(), pad = pads[this.solo ? 0 : side];
    var r = { x: k.x, y: k.y, btn: k.btn };
    if (pad) { if (pad.x) r.x = pad.x; if (pad.y) r.y = pad.y; r.btn |= pad.btn; }
    if (side === 0 && this.touch) { var t = this.touch.state(); if (t.x) r.x = t.x; if (t.y) r.y = t.y; r.btn |= t.btn; }
    return r;
  };
  Input.prototype.anyPad = function () { var p = this.readPads(); for (var i = 0; i < p.length; i++) if (p[i].any) return true; return false; };

  // ---------- écran tactile ----------
  function Touch(root_el, opts) {
    opts = opts || {}; this.el = root_el; this.btn = 0; this.jx = 0; this.jy = 0; this.joyId = null; this.held = {}; this.opts = opts; this.build();
  }
  var BUTTONS = [
    { id: 'LP', label: 'P', sub: 'Poing léger', bit: BTN.LP, cls: 'b-lp' },
    { id: 'HP', label: 'PP', sub: 'Poing fort', bit: BTN.HP, cls: 'b-hp' },
    { id: 'LK', label: 'K', sub: 'Pied léger', bit: BTN.LK, cls: 'b-lk' },
    { id: 'HK', label: 'KK', sub: 'Pied fort', bit: BTN.HK, cls: 'b-hk' },
    { id: 'SP', label: 'SPÉCIAL', sub: 'Maintenir + coup', bit: BTN.SP, cls: 'b-sp' },
    { id: 'SUP', label: 'SUPER', sub: '', bit: BTN.SUP, cls: 'b-sup' },
    { id: 'THR', label: 'PROJ.', sub: '', bit: BTN.THR, cls: 'b-thr' }
  ];
  Touch.prototype.build = function () {
    var self = this, el = this.el; el.innerHTML = '';
    var zone = document.createElement('div'); zone.className = 'tc-zone'; el.appendChild(zone);
    var base = document.createElement('div'); base.className = 'tc-joy'; base.innerHTML = '<i class="tc-nub"></i><b class="u">↑</b><b class="d">↓</b><b class="l">←</b><b class="r">→</b>'; el.appendChild(base);
    this.zone = zone; this.base = base; this.nub = base.querySelector('.tc-nub');
    this.rest = true;
    function pos(e) { var r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    zone.addEventListener('pointerdown', function (e) { if (self.joyId !== null) return; e.preventDefault(); zone.setPointerCapture(e.pointerId); self.joyId = e.pointerId; var p = pos(e); self.ox = p.x; self.oy = p.y; self.placeBase(p.x, p.y); self.rest = false; base.classList.add('on'); self.moveJoy(e); });
    zone.addEventListener('pointermove', function (e) { if (e.pointerId === self.joyId) { e.preventDefault(); self.moveJoy(e); } });
    function end(e) { if (e.pointerId === self.joyId) { self.joyId = null; self.jx = 0; self.jy = 0; base.classList.remove('on'); self.nub.style.transform = 'translate(-50%,-50%)'; self.placeDefault(); } }
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
    var pad = document.createElement('div'); pad.className = 'tc-btns'; el.appendChild(pad);
    BUTTONS.forEach(function (b) {
      var d = document.createElement('button'); d.type = 'button'; d.className = 'tc-b ' + b.cls; d.setAttribute('data-id', b.id); d.innerHTML = '<span>' + b.label + '</span>'; d.setAttribute('aria-label', b.sub || b.label); pad.appendChild(d);
      d.addEventListener('pointerdown', function (e) { e.preventDefault(); d.setPointerCapture(e.pointerId); self.held[e.pointerId] = b.bit; d.classList.add('on'); self.recompute(); if (navigator.vibrate && b.id !== 'SP') { try { navigator.vibrate(8); } catch (x) { /* rien */ } } });
      function up(e) { if (self.held[e.pointerId]) { delete self.held[e.pointerId]; d.classList.remove('on'); self.recompute(); } }
      d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up); d.addEventListener('lostpointercapture', up);
      d.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    this.placeDefault();
  };
  Touch.prototype.placeBase = function (x, y) { this.base.style.left = x + 'px'; this.base.style.top = y + 'px'; };
  Touch.prototype.placeDefault = function () { var r = this.el.getBoundingClientRect(); this.placeBase(Math.max(80, r.width * 0.13), r.height - Math.max(86, r.height * 0.3)); };
  Touch.prototype.recompute = function () { var b = 0; for (var k in this.held) b |= this.held[k]; this.btn = b; };
  Touch.prototype.moveJoy = function (e) {
    var r = this.el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, dx = x - this.ox, dy = y - this.oy, R = 56, len = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, len / R);
    var nx = dx / len * k * R, ny = dy / len * k * R; this.nub.style.transform = 'translate(calc(-50% + ' + nx + 'px), calc(-50% + ' + ny + 'px))';
    var th = 0.34; this.jx = dx / R > th ? 1 : (dx / R < -th ? -1 : 0); this.jy = dy / R < -0.5 ? 1 : (dy / R > 0.4 ? -1 : 0);
    if (len > R * 1.6) { this.ox += (dx - dx / len * R * 1.6) * 0.5; this.oy += (dy - dy / len * R * 1.6) * 0.5; this.placeBase(this.ox, this.oy); }
  };
  Touch.prototype.state = function () { return { x: this.jx, y: this.jy, btn: this.btn }; };
  Touch.prototype.superReady = function (on) { var s = this.el.querySelector('.b-sup'); if (s) s.classList.toggle('ready', !!on); };
  Touch.prototype.reset = function () { this.held = {}; this.btn = 0; this.jx = this.jy = 0; this.joyId = null; var bs = this.el.querySelectorAll('.tc-b'); for (var i = 0; i < bs.length; i++) bs[i].classList.remove('on'); };

  XS.Input = Input; XS.Touch = Touch; XS.KEYMAP = KEYS; XS.SOLO_EXTRA = SOLO_EXTRA;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Input: Input, Touch: Touch };
})(typeof window !== 'undefined' ? window : globalThis);
