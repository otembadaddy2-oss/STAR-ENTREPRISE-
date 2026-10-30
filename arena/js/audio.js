/* X SAPHIR — ARENA : le son. Aucun fichier audio : tous les bruitages et la musique sont fabriqués en direct avec WebAudio
   (impacts, souffles, grosses basses, cloches, rythmique afro-électro). La voix de l'annonceur utilise la voix du téléphone. */
(function (root) {
  'use strict';
  var XS = root.XS = root.XS || {};

  function Audio() { this.ctx = null; this.sfxOn = true; this.musicOn = true; this.voiceOn = true; this.lang = 'fr'; this.vol = 0.9; this.music = null; this.noiseBuf = null; this.muted = false; }

  Audio.prototype.unlock = function () {
    if (!this.ctx) {
      var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return false;
      try { this.ctx = new AC(); } catch (e) { return false; }
      var c = this.ctx; this.master = c.createGain(); this.master.gain.value = this.vol; this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 6;
      this.sfxBus = c.createGain(); this.musBus = c.createGain(); this.musBus.gain.value = 0.38;
      this.sfxBus.connect(this.comp); this.musBus.connect(this.comp); this.comp.connect(this.master); this.master.connect(c.destination);
      var n = c.sampleRate * 1.2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = b;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  };
  Audio.prototype.setVolume = function (v) { this.vol = v; if (this.master) this.master.gain.value = v; };

  // briques
  Audio.prototype.tone = function (o) { // {f, f2, d, type, g, at, bus, det}
    if (!this.ctx || !this.sfxOn && !o.music) return; var c = this.ctx, t = c.currentTime + (o.at || 0), osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t); if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.d); if (o.det) osc.detune.value = o.det;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.g || 0.3, t + (o.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    osc.connect(g); g.connect(o.bus || this.sfxBus); osc.start(t); osc.stop(t + o.d + 0.05);
  };
  Audio.prototype.noise = function (o) { // {d, hp, lp, g, at, sweep}
    if (!this.ctx || !this.sfxOn && !o.music) return; var c = this.ctx, t = c.currentTime + (o.at || 0), s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = this.noiseBuf; f.type = o.hp ? 'highpass' : 'lowpass'; f.frequency.setValueAtTime(o.hp || o.lp || 2000, t); if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + o.d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.g || 0.3, t + (o.a || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    s.connect(f); f.connect(g); g.connect(o.bus || this.sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + o.d + 0.05);
  };

  // bruitages
  Audio.prototype.play = function (name, p) {
    if (!this.ctx || this.muted) return; p = p || {};
    switch (name) {
      case 'swing': this.noise({ d: 0.12, hp: 900, sweep: 3200, g: 0.1 + (p.heavy ? 0.08 : 0) }); break;
      case 'hitL': this.noise({ d: 0.07, hp: 1400, g: 0.35 }); this.tone({ f: 190, f2: 70, d: 0.1, type: 'triangle', g: 0.5 }); break;
      case 'hitM': this.noise({ d: 0.1, hp: 800, g: 0.45 }); this.tone({ f: 150, f2: 50, d: 0.16, type: 'triangle', g: 0.7 }); this.tone({ f: 900, f2: 300, d: 0.05, type: 'square', g: 0.12 }); break;
      case 'hitH': this.noise({ d: 0.22, lp: 5000, sweep: 300, g: 0.6 }); this.tone({ f: 110, f2: 32, d: 0.32, type: 'sine', g: 0.95 }); this.tone({ f: 260, f2: 60, d: 0.14, type: 'sawtooth', g: 0.3 }); break;
      case 'block': this.tone({ f: 1400, f2: 900, d: 0.08, type: 'square', g: 0.16 }); this.tone({ f: 2300, d: 0.05, type: 'triangle', g: 0.14 }); this.noise({ d: 0.05, hp: 3000, g: 0.2 }); break;
      case 'jump': this.noise({ d: 0.1, hp: 600, sweep: 1600, g: 0.07 }); break;
      case 'land': this.noise({ d: 0.1, lp: 700, g: 0.28 }); this.tone({ f: 90, f2: 50, d: 0.1, g: 0.3 }); break;
      case 'dash': this.noise({ d: 0.2, hp: 500, sweep: 2600, g: 0.12 }); break;
      case 'proj': this.tone({ f: 260, f2: 900, d: 0.25, type: 'sawtooth', g: 0.22 }); this.noise({ d: 0.22, hp: 1000, sweep: 4000, g: 0.14 }); break;
      case 'projhit': this.noise({ d: 0.25, lp: 4000, sweep: 300, g: 0.5 }); this.tone({ f: 200, f2: 50, d: 0.25, g: 0.6 }); break;
      case 'special': this.tone({ f: 200, f2: 700, d: 0.18, type: 'sawtooth', g: 0.2 }); this.noise({ d: 0.2, hp: 800, sweep: 3000, g: 0.12 }); break;
      case 'super': this.tone({ f: 80, f2: 400, d: 0.9, type: 'sawtooth', g: 0.35 }); this.tone({ f: 160, f2: 1200, d: 0.9, type: 'square', g: 0.12 }); this.noise({ d: 0.9, hp: 300, sweep: 6000, g: 0.28 }); this.tone({ f: 55, d: 0.8, g: 0.8, at: 0.5 }); break;
      case 'ko': this.noise({ d: 0.8, lp: 7000, sweep: 120, g: 0.8 }); this.tone({ f: 90, f2: 24, d: 1.1, g: 1.0 }); this.tone({ f: 600, f2: 90, d: 0.7, type: 'sawtooth', g: 0.3 }); break;
      case 'tech': this.tone({ f: 1100, d: 0.1, type: 'triangle', g: 0.25 }); this.tone({ f: 1650, d: 0.14, type: 'triangle', g: 0.2, at: 0.06 }); break;
      case 'round': this.tone({ f: 523, d: 0.5, type: 'triangle', g: 0.25 }); this.tone({ f: 784, d: 0.6, type: 'triangle', g: 0.2, at: 0.12 }); break;
      case 'fight': this.tone({ f: 392, f2: 784, d: 0.3, type: 'sawtooth', g: 0.3 }); this.noise({ d: 0.35, hp: 400, sweep: 5000, g: 0.25 }); this.tone({ f: 70, d: 0.4, g: 0.8 }); break;
      case 'ui': this.tone({ f: 880, d: 0.05, type: 'triangle', g: 0.18 }); break;
      case 'ok': this.tone({ f: 660, d: 0.08, type: 'triangle', g: 0.2 }); this.tone({ f: 990, d: 0.12, type: 'triangle', g: 0.2, at: 0.06 }); break;
      case 'back': this.tone({ f: 440, f2: 330, d: 0.1, type: 'triangle', g: 0.18 }); break;
      case 'win': this.tone({ f: 523, d: 0.3, type: 'triangle', g: 0.25 }); this.tone({ f: 659, d: 0.3, type: 'triangle', g: 0.25, at: 0.14 }); this.tone({ f: 784, d: 0.3, type: 'triangle', g: 0.25, at: 0.28 }); this.tone({ f: 1046, d: 0.8, type: 'triangle', g: 0.28, at: 0.42 }); break;
    }
  };

  var CRY = { calpros: { fr: 'Les trois forces !', en: 'The three forces!' }, nia: { fr: 'Polarité !', en: 'Polarity!' }, ayanda: { fr: 'Vouka !', en: 'Vuka!' }, kormal: { fr: 'La colère !', en: 'The wrath!' } };
  var ANN = { fr: { fight: 'Combat !', ko: 'K O !', perfect: 'Parfait !', round1: 'Manche un', round2: 'Manche deux', round3: 'Manche finale', win: 'gagne' }, en: { fight: 'Fight!', ko: 'K O!', perfect: 'Perfect!', round1: 'Round one', round2: 'Round two', round3: 'Final round', win: 'wins' } };
  Audio.prototype.say = function (txt, pitch, rate) {
    if (!this.voiceOn || this.muted || !root.speechSynthesis) return;
    try { var u = new root.SpeechSynthesisUtterance(txt); u.lang = this.lang === 'en' ? 'en-GB' : 'fr-FR'; u.pitch = pitch || 0.8; u.rate = rate || 1.0; u.volume = 0.9; root.speechSynthesis.cancel(); root.speechSynthesis.speak(u); } catch (e) { /* voix indisponible */ }
  };

  // événements du moteur → sons
  Audio.prototype.onEvents = function (m) {
    if (!this.ctx) return; var ev = m.events, self = this;
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.t === 'hit') { var p = e.power || 40; self.play(e.big || p >= 90 ? 'hitH' : (p >= 55 ? 'hitM' : 'hitL')); }
      else if (e.t === 'block') self.play('block');
      else if (e.t === 'swing') self.play('swing', { heavy: e.heavy });
      else if (e.t === 'special') self.play('special');
      else if (e.t === 'super') { self.play('super'); var cr = CRY[e.cid]; if (cr) self.say(cr[self.lang] || cr.fr, 0.6, 0.95); }
      else if (e.t === 'proj') self.play('proj');
      else if (e.t === 'projhit') self.play('projhit');
      else if (e.t === 'jump') self.play('jump');
      else if (e.t === 'land') self.play('land');
      else if (e.t === 'dash') self.play('dash');
      else if (e.t === 'ko') { self.play('ko'); self.say((ANN[self.lang] || ANN.fr).ko, 0.5, 0.8); }
      else if (e.t === 'tech') self.play('tech');
      else if (e.t === 'round') { self.play('round'); var A = ANN[self.lang] || ANN.fr; self.say(e.n >= 3 ? A.round3 : (e.n === 2 ? A.round2 : A.round1), 0.7, 0.95); }
      else if (e.t === 'fight') { self.play('fight'); self.say((ANN[self.lang] || ANN.fr).fight, 0.6, 1.05); }
      else if (e.t === 'roundEnd' && e.perfect) self.say((ANN[self.lang] || ANN.fr).perfect, 0.7, 1);
      else if (e.t === 'win') { self.play('win'); }
    }
  };

  // ---------- musique : un petit séquenceur (kick, claps, hats, basse, accords, arpège) ----------
  var SONGS = {
    menu: { bpm: 92, root: 45, prog: [[0, 7, 12, 15], [-2, 5, 10, 14], [-4, 3, 8, 12], [-5, 2, 7, 10]], drums: 0, lead: 1 },
    'pointe-noire': { bpm: 126, root: 43, prog: [[0, 7, 12, 15], [-4, 3, 8, 12], [-2, 5, 10, 14], [-5, 2, 7, 10]], drums: 2, lead: 1 },
    brazzaville: { bpm: 118, root: 41, prog: [[0, 7, 10, 15], [-2, 5, 10, 12], [-5, 2, 7, 10], [-7, 0, 5, 8]], drums: 2, lead: 1 },
    result: { bpm: 80, root: 48, prog: [[0, 7, 12, 16], [5, 12, 17, 21]], drums: 0, lead: 0 }
  };
  function mtof(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  Audio.prototype.playMusic = function (name) {
    if (this.musicName === name && this.music) return; this.stopMusic(); this.musicName = name; if (!this.ctx || !this.musicOn) return;
    var S = SONGS[name]; if (!S) return; var self = this, c = this.ctx, step = 0, t0 = c.currentTime + 0.1, spb = 60 / S.bpm / 4, bar = 0;
    function sched() {
      var now = c.currentTime;
      while (t0 < now + 0.6) {
        var s = step % 16, ch = S.prog[Math.floor(step / 16) % S.prog.length], rootN = S.root + ch[0], at = t0 - now;
        if (S.drums) { if (s % 4 === 0) self.tone({ f: 150, f2: 45, d: 0.2, type: 'sine', g: 0.8, at: at, bus: self.musBus, music: true }); if (s === 4 || s === 12) { self.noise({ d: 0.14, hp: 1600, g: 0.35, at: at, bus: self.musBus, music: true }); self.tone({ f: 220, f2: 140, d: 0.1, type: 'triangle', g: 0.25, at: at, bus: self.musBus, music: true }); } if (s % 2 === 0) self.noise({ d: 0.04, hp: 7000, g: s % 4 === 2 ? 0.18 : 0.08, at: at, bus: self.musBus, music: true }); if ([3, 6, 10, 14].indexOf(s) >= 0) self.tone({ f: 320 + (s % 3) * 60, f2: 250, d: 0.07, type: 'triangle', g: 0.12, at: at, bus: self.musBus, music: true }); }
        else if (s % 8 === 0) self.tone({ f: 120, f2: 50, d: 0.3, g: 0.4, at: at, bus: self.musBus, music: true });
        // basse
        if (S.drums ? [0, 3, 6, 8, 11, 14].indexOf(s) >= 0 : s % 8 === 0) self.tone({ f: mtof(rootN - 12 + (s === 6 || s === 14 ? 7 : 0)), d: spb * (S.drums ? 2.2 : 7), type: 'sawtooth', g: 0.2, at: at, bus: self.musBus, music: true });
        // accord / pad
        if (s === 0) ch.slice(1).forEach(function (n, i) { self.tone({ f: mtof(rootN + n), d: spb * 15, type: 'triangle', g: 0.07, a: 0.05, at: at, bus: self.musBus, music: true, det: i * 4 }); });
        // arpège
        if (S.lead && s % 2 === (S.drums ? 0 : 1) && (S.drums || s % 4 === 1)) { var an = ch[1 + ((step >> 1) % 3)]; self.tone({ f: mtof(rootN + an + 12 + (((step >> 3) % 2) ? 12 : 0)), d: spb * 1.6, type: 'square', g: 0.05, at: at, bus: self.musBus, music: true }); }
        t0 += spb; step++;
      }
    }
    this.music = setInterval(sched, 150); sched();
  };
  Audio.prototype.stopMusic = function () { if (this.music) { clearInterval(this.music); this.music = null; } this.musicName = null; };
  Audio.prototype.setMusic = function (on) { this.musicOn = on; if (!on) { var n = this.musicName; this.stopMusic(); this.musicName = n; } else if (this.musicName) { var n2 = this.musicName; this.musicName = null; this.playMusic(n2); } };

  XS.Audio = Audio;
  if (typeof module !== 'undefined' && module.exports) module.exports = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
