/* X SAPHIR — ARENA : les données du jeu (combattants, coups, décors).
   Univers X SAPHIR © Carry OTEMBA / STAR ENTREPRISE. Les noms de techniques sont des désignations de travail.
   Durées en images (60 par seconde). Les boîtes de coup sont [avant, hauteur, largeur, hauteur] : « avant » = distance
   devant le combattant, « hauteur » = hauteur du bas de la boîte au-dessus du sol. */
(function (root) {
  'use strict';
  var XS = root.XS = root.XS || {};

  // ---------- coups communs ----------
  function N(o) { return o; }
  function normals(m) {
    m = m || {};
    var dm = m.dm || 1, rm = m.rm || 1, light = m.light || 0, heavy = m.heavy || 0;
    function b(ox, oy, w, h) { return [ox, oy, Math.round(w * rm), h]; }
    var n = {
      lp:  N({ id: 'lp',  name: 'Direct',        st: 'stand', su: 4 + light, ac: 2, rc: 8,  dmg: 30, hs: 12, bs: 8,  box: b(20, 95, 52, 26), lvl: 'mid', pb: 2, hstop: 5,  rage: 3, chain: true }),
      hp:  N({ id: 'hp',  name: 'Frappe forte',  st: 'stand', su: 8 + heavy, ac: 3, rc: 15, dmg: 68, hs: 17, bs: 12, box: b(20, 92, 66, 30), lvl: 'mid', pb: 5, hstop: 8,  rage: 6 }),
      lk:  N({ id: 'lk',  name: 'Coup de pied',  st: 'stand', su: 5 + light, ac: 3, rc: 10, dmg: 34, hs: 12, bs: 8,  box: b(20, 46, 64, 24), lvl: 'mid', pb: 2, hstop: 5,  rage: 3, chain: true }),
      hk:  N({ id: 'hk',  name: 'Revers',        st: 'stand', su: 10 + heavy, ac: 4, rc: 20, dmg: 82, hs: 19, bs: 13, box: b(18, 70, 82, 38), lvl: 'mid', pb: 8, hstop: 10, rage: 7 }),
      clp: N({ id: 'clp', name: 'Direct bas',    st: 'crouch', su: 4 + light, ac: 2, rc: 8, dmg: 24, hs: 11, bs: 8,  box: b(20, 58, 52, 22), lvl: 'mid', pb: 1, hstop: 4,  rage: 2, chain: true }),
      chp: N({ id: 'chp', name: 'Ascension',     st: 'crouch', su: 9 + heavy, ac: 3, rc: 18, dmg: 72, hs: 20, bs: 12, box: b(10, 60, 48, 105), lvl: 'mid', pb: 3, hstop: 9, rage: 6, launch: [1.5, 11], kd: true }),
      clk: N({ id: 'clk', name: 'Fauchage léger', st: 'crouch', su: 5 + light, ac: 2, rc: 9, dmg: 26, hs: 11, bs: 9,  box: b(20, 4, 60, 22), lvl: 'low', pb: 1, hstop: 4,  rage: 2, chain: true }),
      chk: N({ id: 'chk', name: 'Balayage',      st: 'crouch', su: 10 + heavy, ac: 3, rc: 25, dmg: 66, hs: 22, bs: 14, box: b(14, 2, 90, 24), lvl: 'low', pb: 5, hstop: 10, rage: 6, kd: true, sweep: true }),
      jlp: N({ id: 'jlp', name: 'Direct aérien', st: 'air', su: 5, ac: 99, rc: 4, dmg: 36, hs: 15, bs: 10, box: b(16, 60, 46, 40), lvl: 'mid', pb: 2, hstop: 5, rage: 3 }),
      jhp: N({ id: 'jhp', name: 'Frappe aérienne', st: 'air', su: 8, ac: 99, rc: 4, dmg: 72, hs: 19, bs: 13, box: b(14, 52, 56, 50), lvl: 'mid', pb: 5, hstop: 8, rage: 6 }),
      jlk: N({ id: 'jlk', name: 'Pied aérien',   st: 'air', su: 4, ac: 99, rc: 4, dmg: 40, hs: 15, bs: 10, box: b(10, 22, 58, 32), lvl: 'mid', pb: 2, hstop: 5, rage: 3 }),
      jhk: N({ id: 'jhk', name: 'Plongeon',      st: 'air', su: 9, ac: 99, rc: 4, dmg: 78, hs: 19, bs: 13, box: b(8, 8, 66, 44), lvl: 'mid', pb: 6, hstop: 9, rage: 6 }),
      thr: N({ id: 'thr', name: 'Projection',    st: 'stand', type: 'throw', su: 5, ac: 2, rc: 24, dmg: 95, range: 66, box: b(10, 20, 60, 120), hstop: 6, rage: 8 })
    };
    return n;
  }

  // ---------- combattants ----------
  var chars = {};

  chars.calpros = {
    id: 'calpros', nom: 'CALPROS', titre: 'Le porteur des Trois Forces', hp: 960, walkF: 2.9, walkB: 2.3, jumpV: 13.5, jumpX: 3.7, dashF: 7.4, dashB: 6.2, scale: 1.0,
    style: 'Équilibré · Saphir · Ascension',
    stats: { puissance: 3, vitesse: 3, portee: 3, controle: 3 },
    palette: { skin: '#6a4129', skinDark: '#4d2d1c', suit: '#14204a', suitLight: '#26398a', gold: '#e8b84a', glow: '#5fd0ff', glow2: '#ffffff', hair: '#14101c', ink: '#08070f', eye: '#9fe6ff' },
    cry: 'LES TROIS FORCES !', face: [10, 8, 215, 215],
    normals: normals({ dm: 1, rm: 1 }),
    specials: {
      '236': {
        L: { id: 'sap_l', name: 'Onde Saphir', st: 'stand', type: 'special', su: 14, ac: 2, rc: 26, dmg: 0, anim: 'fire', proj: { at: 14, kind: 'saphir', vx: 5.2, ox: 58, oy: 100, r: 22, dmg: 62, hs: 17, bs: 11, life: 140, hstop: 8, rage: 7 } },
        H: { id: 'sap_h', name: 'Onde Saphir', st: 'stand', type: 'special', su: 16, ac: 2, rc: 32, dmg: 0, anim: 'fire', proj: { at: 16, kind: 'saphir', vx: 8.6, ox: 58, oy: 100, r: 26, dmg: 82, hs: 19, bs: 12, life: 110, hstop: 9, rage: 8 } }
      },
      '623': {
        L: { id: 'asc_l', name: 'Ascension', st: 'stand', type: 'special', su: 5, ac: 6, rc: 28, dmg: 104, hs: 24, bs: 16, box: [10, 40, 60, 140], lvl: 'mid', pb: 2, hstop: 11, rage: 9, kd: true, launch: [2.2, 13.5], inv: [1, 9], mv: [[1, 8, 1.6, 0]], anim: 'dp', hop: 12.5 },
        H: { id: 'asc_h', name: 'Ascension', st: 'stand', type: 'special', su: 5, ac: 9, rc: 32, dmg: 138, hs: 24, bs: 16, box: [10, 40, 64, 150], lvl: 'mid', pb: 2, hstop: 12, rage: 10, kd: true, launch: [2.6, 15], inv: [1, 13], mv: [[1, 10, 2.6, 0]], anim: 'dp', hop: 14.5, multi: { every: 5, max: 2 } }
      },
      '214': {
        L: { id: 'pce_l', name: 'Charge de la Puce', st: 'stand', type: 'special', su: 10, ac: 12, rc: 18, dmg: 84, hs: 20, bs: 14, box: [14, 70, 70, 56], lvl: 'mid', pb: 7, hstop: 9, rage: 8, mv: [[6, 22, 9.4, 0]], anim: 'lunge', trail: true },
        H: { id: 'pce_h', name: 'Charge de la Puce', st: 'stand', type: 'special', su: 12, ac: 14, rc: 22, dmg: 112, hs: 22, bs: 15, box: [14, 70, 76, 58], lvl: 'mid', pb: 9, hstop: 10, rage: 9, mv: [[8, 26, 11.6, 0]], anim: 'lunge', trail: true, kd: true, launch: [2, 8] }
      }
    },
    sup: { id: 'sup', name: 'Force Divine', st: 'stand', type: 'super', su: 14, ac: 26, rc: 40, dmg: 40, hs: 22, bs: 15, box: [30, 55, 640, 110], lvl: 'mid', pb: 3, hstop: 3, rage: 0, multi: { every: 3, max: 8 }, anim: 'beam', vis: 'beam', fin: { kd: true, launch: [4, 12] }, cut: 'FORCE DIVINE' }
  };

  chars.nia = {
    id: 'nia', nom: 'NIA MENSAH', titre: "L'architecte magnétique", hp: 1020, walkF: 2.7, walkB: 2.2, jumpV: 13.2, jumpX: 3.5, dashF: 7, dashB: 6, scale: 0.98,
    style: 'Contrôle · Polarité · Rempart',
    stats: { puissance: 2, vitesse: 3, portee: 4, controle: 5 },
    palette: { skin: '#7a4a30', skinDark: '#563321', suit: '#3b3f4c', suitLight: '#5a6073', gold: '#e9b73c', glow: '#ffcf4a', glow2: '#fff2b8', hair: '#15110f', ink: '#08070f', eye: '#ffe08a' },
    cry: 'POLARITÉ !', face: [60, 0, 190, 190],
    normals: normals({ dm: 1.08, rm: 1.14 }),
    specials: {
      '236': {
        L: { id: 'dsq_l', name: 'Disque polaire', st: 'stand', type: 'special', su: 15, ac: 2, rc: 28, dmg: 0, anim: 'fire', proj: { at: 15, kind: 'disc', vx: 4.6, ox: 56, oy: 100, r: 20, dmg: 56, hs: 16, bs: 11, life: 160, hstop: 8, rage: 7 } },
        H: { id: 'dsq_h', name: 'Disque polaire', st: 'stand', type: 'special', su: 17, ac: 2, rc: 32, dmg: 0, anim: 'fire', proj: { at: 17, kind: 'disc', vx: 7.4, ox: 56, oy: 100, r: 24, dmg: 74, hs: 18, bs: 12, life: 120, hstop: 9, rage: 8 } }
      },
      '623': {
        L: { id: 'rmp_l', name: 'Rempart', st: 'stand', type: 'special', su: 6, ac: 6, rc: 28, dmg: 96, hs: 24, bs: 16, box: [18, 20, 54, 150], lvl: 'mid', pb: 1, hstop: 11, rage: 9, kd: true, launch: [1.6, 13], inv: [1, 8], anim: 'dp', hop: 8, vis: 'pillar' },
        H: { id: 'rmp_h', name: 'Rempart', st: 'stand', type: 'special', su: 6, ac: 8, rc: 34, dmg: 124, hs: 24, bs: 16, box: [20, 20, 60, 165], lvl: 'mid', pb: 1, hstop: 12, rage: 10, kd: true, launch: [2, 15], inv: [1, 11], anim: 'dp', hop: 10, vis: 'pillar' }
      },
      '214': {
        L: { id: 'pol_l', name: 'POLARITÉ !', st: 'stand', type: 'special', su: 14, ac: 2, rc: 30, dmg: 0, anim: 'fire', proj: { at: 14, kind: 'pull', vx: 15, ox: 40, oy: 100, r: 26, dmg: 38, hs: 26, bs: 12, life: 18, hstop: 7, rage: 7, pull: 86 } },
        H: { id: 'pol_h', name: 'POLARITÉ !', st: 'stand', type: 'special', su: 16, ac: 2, rc: 34, dmg: 0, anim: 'fire', proj: { at: 16, kind: 'pull', vx: 17, ox: 40, oy: 100, r: 30, dmg: 46, hs: 28, bs: 12, life: 28, hstop: 8, rage: 8, pull: 86 } }
      }
    },
    sup: { id: 'sup', name: 'Surcharge', st: 'stand', type: 'super', su: 12, ac: 24, rc: 44, dmg: 36, hs: 22, bs: 15, box: [-200, 10, 400, 180], lvl: 'mid', pb: 0, hstop: 3, rage: 0, multi: { every: 3, max: 8 }, anim: 'beam', vis: 'discharge', pullIn: true, fin: { kd: true, launch: [3.2, 13] }, cut: 'SURCHARGE' }
  };

  chars.ayanda = {
    id: 'ayanda', nom: 'AYANDA ZULU', titre: 'Le Phénix', hp: 920, walkF: 3.4, walkB: 2.7, jumpV: 14.3, jumpX: 4.2, dashF: 8.2, dashB: 6.8, scale: 1.0,
    style: 'Rapide · Feu · VUKA !',
    stats: { puissance: 3, vitesse: 5, portee: 3, controle: 2 },
    palette: { skin: '#5e3724', skinDark: '#432617', suit: '#241a14', suitLight: '#3d2d22', gold: '#f0bd3e', glow: '#ff8a2a', glow2: '#ffe27a', hair: '#1b130e', ink: '#08070f', eye: '#ffd38a' },
    cry: 'VUKA !', face: [150, 10, 195, 195],
    normals: normals({ dm: 0.95, rm: 0.98, light: -1 }),
    specials: {
      '236': {
        L: { id: 'pho_l', name: 'Souffle du Phénix', st: 'stand', type: 'special', su: 13, ac: 2, rc: 26, dmg: 0, anim: 'fire', proj: { at: 13, kind: 'fire', vx: 5.6, ox: 56, oy: 96, r: 22, dmg: 58, hs: 17, bs: 11, life: 140, hstop: 8, rage: 7 } },
        H: { id: 'pho_h', name: 'Souffle du Phénix', st: 'stand', type: 'special', su: 15, ac: 2, rc: 30, dmg: 0, anim: 'fire', proj: { at: 15, kind: 'fire', vx: 9, ox: 56, oy: 96, r: 25, dmg: 76, hs: 19, bs: 12, life: 110, hstop: 9, rage: 8 } }
      },
      '623': {
        L: { id: 'vuk_l', name: 'VUKA !', st: 'stand', type: 'special', su: 4, ac: 7, rc: 26, dmg: 54, hs: 22, bs: 15, box: [8, 36, 62, 150], lvl: 'mid', pb: 1, hstop: 7, rage: 6, kd: false, launch: [1.4, 10], inv: [1, 9], anim: 'dp', hop: 13, vis: 'flame', multi: { every: 4, max: 2 }, fin: { kd: true, launch: [2.4, 13] } },
        H: { id: 'vuk_h', name: 'VUKA !', st: 'stand', type: 'special', su: 4, ac: 10, rc: 30, dmg: 62, hs: 22, bs: 15, box: [8, 36, 66, 160], lvl: 'mid', pb: 1, hstop: 7, rage: 7, kd: false, launch: [1.8, 11], inv: [1, 12], anim: 'dp', hop: 15, vis: 'flame', multi: { every: 4, max: 3 }, fin: { kd: true, launch: [2.8, 14.5] }, mv: [[1, 10, 2.2, 0]] }
      },
      '214': {
        L: { id: 'vol_l', name: 'Vol de feu', st: 'stand', type: 'special', su: 9, ac: 14, rc: 20, dmg: 78, hs: 20, bs: 14, box: [12, 30, 78, 52], lvl: 'mid', pb: 7, hstop: 9, rage: 8, mv: [[6, 24, 10.6, 0]], anim: 'lunge', trail: true, vis: 'flame' },
        H: { id: 'vol_h', name: 'Vol de feu', st: 'stand', type: 'special', su: 11, ac: 16, rc: 24, dmg: 104, hs: 22, bs: 15, box: [12, 30, 84, 56], lvl: 'mid', pb: 9, hstop: 10, rage: 9, mv: [[8, 28, 12.8, 0]], anim: 'lunge', trail: true, vis: 'flame', kd: true, launch: [2.2, 8] }
      }
    },
    sup: { id: 'sup', name: 'Ailes du Phénix', st: 'stand', type: 'super', su: 12, ac: 32, rc: 42, dmg: 30, hs: 22, bs: 15, box: [10, 20, 120, 150], lvl: 'mid', pb: 0, hstop: 3, rage: 0, multi: { every: 3, max: 10 }, mv: [[12, 40, 7.5, 0]], anim: 'lunge', vis: 'wings', fin: { kd: true, launch: [4, 12] }, cut: 'AILES DU PHÉNIX' }
  };

  chars.kormal = {
    id: 'kormal', nom: 'KOR-MAL', titre: 'La menace rouge', hp: 1100, walkF: 2.3, walkB: 1.9, jumpV: 12.6, jumpX: 3.1, dashF: 6.4, dashB: 5.4, scale: 1.14,
    style: 'Brute · Énergie sombre · Pointes',
    stats: { puissance: 5, vitesse: 1, portee: 4, controle: 2 },
    palette: { skin: '#2a0e12', skinDark: '#1a070a', suit: '#5c0f16', suitLight: '#a3202b', gold: '#d96a3a', glow: '#ff2a3d', glow2: '#ffb0a0', hair: '#120406', ink: '#05030a', eye: '#ff3b3b' },
    cry: 'LA COLÈRE !', face: [150, 0, 200, 200],
    normals: normals({ dm: 1.12, rm: 1.08, heavy: 1 }),
    specials: {
      '236': {
        L: { id: 'rou_l', name: 'Onde Rouge', st: 'stand', type: 'special', su: 17, ac: 2, rc: 30, dmg: 0, anim: 'fire', proj: { at: 17, kind: 'dark', vx: 3.8, ox: 66, oy: 104, r: 30, dmg: 84, hs: 19, bs: 12, life: 190, hstop: 9, rage: 8 } },
        H: { id: 'rou_h', name: 'Onde Rouge', st: 'stand', type: 'special', su: 19, ac: 2, rc: 34, dmg: 0, anim: 'fire', proj: { at: 19, kind: 'dark', vx: 5.8, ox: 66, oy: 104, r: 34, dmg: 104, hs: 21, bs: 13, life: 150, hstop: 10, rage: 9 } }
      },
      '623': {
        L: { id: 'poi_l', name: 'Pointes', st: 'stand', type: 'special', su: 6, ac: 6, rc: 30, dmg: 122, hs: 24, bs: 16, box: [12, 30, 66, 150], lvl: 'mid', pb: 2, hstop: 12, rage: 10, kd: true, launch: [2, 13], inv: [1, 7], anim: 'dp', hop: 10.5, vis: 'spikes' },
        H: { id: 'poi_h', name: 'Pointes', st: 'stand', type: 'special', su: 7, ac: 8, rc: 36, dmg: 152, hs: 24, bs: 16, box: [12, 30, 72, 160], lvl: 'mid', pb: 2, hstop: 13, rage: 11, kd: true, launch: [2.4, 14.5], inv: [1, 10], anim: 'dp', hop: 12, vis: 'spikes' }
      },
      '214': {
        L: { id: 'chg_l', name: 'Charge Écarlate', st: 'stand', type: 'special', su: 12, ac: 14, rc: 24, dmg: 100, hs: 22, bs: 15, box: [16, 40, 86, 120], lvl: 'mid', pb: 9, hstop: 10, rage: 9, mv: [[8, 24, 8.6, 0]], anim: 'lunge', trail: true, kd: true, launch: [2.2, 8] },
        H: { id: 'chg_h', name: 'Charge Écarlate', st: 'stand', type: 'special', su: 14, ac: 18, rc: 28, dmg: 128, hs: 24, bs: 16, box: [16, 40, 92, 124], lvl: 'mid', pb: 10, hstop: 11, rage: 10, mv: [[10, 30, 10.6, 0]], anim: 'lunge', trail: true, kd: true, launch: [2.6, 9] }
      }
    },
    sup: { id: 'sup', name: 'Colère', st: 'stand', type: 'super', su: 14, ac: 28, rc: 46, dmg: 44, hs: 22, bs: 15, box: [40, 0, 600, 150], lvl: 'mid', pb: 3, hstop: 3, rage: 0, multi: { every: 4, max: 7 }, anim: 'beam', vis: 'eruption', fin: { kd: true, launch: [3.6, 14] }, cut: 'COLÈRE' }
  };

  var order = ['calpros', 'nia', 'ayanda', 'kormal'];

  // ---------- décors ----------
  var stages = [
    { id: 'pointe-noire', nom: 'POINTE-NOIRE', sous: 'Port au crépuscule', sky: ['#1b1140', '#7a2f6b', '#f2873a', '#ffd08a'], sun: { x: 0.68, y: 0.52, r: 90, c: '#ffe9b0' }, water: ['#2a3f6e', '#0f1f45'], accent: '#ffb347', mood: 'dusk' },
    { id: 'brazzaville',  nom: 'BRAZZAVILLE',  sous: 'Fleuve · nuit astrale', sky: ['#050a1f', '#10265a', '#2b4a96', '#7ea1ff'], sun: { x: 0.30, y: 0.30, r: 60, c: '#d9e8ff' }, water: ['#12306b', '#050f2b'], accent: '#6ad7ff', mood: 'night' }
  ];

  XS.Data = { chars: chars, order: order, stages: stages, normals: normals, FPS: 60 };
  if (typeof module !== 'undefined' && module.exports) module.exports = XS.Data;
})(typeof window !== 'undefined' ? window : globalThis);
