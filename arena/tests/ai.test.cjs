global.window = global; global.XS = {};
require('../js/data.js'); const Core = require('../js/core.js'); const AI = require('../js/ai.js');
const ids = ['calpros', 'nia', 'ayanda', 'kormal']; let stuck = 0;
const tot = {}; ids.forEach(i => tot[i] = { w: 0, g: 0 });
let wins = [0, 0], frames = 0, nm = 0, comboMax = 0, dmgDone = 0, projs = 0, throws = 0, supers = 0, blocks = 0, hits = 0, kos = 0, nan = 0;
for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let k = 0; k < 3; k++) {
  const m = new Core.Match({ p1: ids[a], p2: ids[b], seed: k + 1, cpu1: { cpu: true, level: 3 }, cpu2: { cpu: true, level: 3 } });
  const A = AI.create(3, k + 1 + a * 9), B = AI.create(3, k + 50 + b * 13);
  let f = 0, lastHp = m.f[0].hp + m.f[1].hp, still = 0;
  while (m.phase !== 'over' && f < 60 * 60 * 6) { m.step([A.think(m, 0), B.think(m, 1)]); f++;
    for (const e of m.events) { if (e.t === 'hit') { hits++; dmgDone += e.dmg; if (e.type === 'throw') throws++; if (e.combo > comboMax) comboMax = e.combo; } if (e.t === 'block') blocks++; if (e.t === 'proj') projs++; if (e.t === 'super') supers++; if (e.t === 'ko') kos++; }
    for (const p of m.f) if (!Number.isFinite(p.x + p.y + p.hp)) nan++; }
  frames += f; nm++; if (m.phase !== 'over') stuck++; else { wins[m.winner >= 0 ? m.winner : 0]++; tot[ids[a]].g++; tot[ids[b]].g++; if (m.winner === 0) tot[ids[a]].w++; else if (m.winner === 1) tot[ids[b]].w++; }
}
console.log('matchs', nm, 'bloqués', stuck, 'durée moyenne', (frames / nm / 60).toFixed(0) + ' s', 'NaN', nan);
console.log('coups', hits, 'blocages', blocks, 'projectiles', projs, 'projections', throws, 'supers', supers, 'K.O.', kos, 'combo max', comboMax);
ids.forEach(i => console.log(i, tot[i].w + '/' + tot[i].g, ((tot[i].w / Math.max(1, tot[i].g)) * 100).toFixed(0) + '%'));
process.exit(stuck || nan ? 1 : 0);
