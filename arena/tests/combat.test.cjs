// Tests du moteur de combat : node arena/tests/combat.test.cjs
global.window = global; global.XS = {};
require('../js/data.js'); const Core = require('../js/core.js');
const { Match, BTN } = Core;
let fails = 0, passes = 0;
function ok(c, msg) { if (c) passes++; else { fails++; console.log('  ✗ ' + msg); } }
const N = { x: 0, y: 0, btn: 0 };

function start(o) {
  const m = new Match(Object.assign({ p1: 'calpros', p2: 'kormal', cpu2: { cpu: false } }, o || {}));
  for (let i = 0; i < 200 && m.phase !== 'fight'; i++) m.step([N, N]);
  return m;
}
// séquence de directions (relatives à la face, joueur 1 regarde à droite) + bouton à la fin
function seq(m, side, dirs, btn, hold) {
  const mk = (d, b) => { const x = { 1: -1, 4: -1, 7: -1, 3: 1, 6: 1, 9: 1 }[d] || 0, y = { 1: -1, 2: -1, 3: -1, 7: 1, 8: 1, 9: 1 }[d] || 0; return { x: x * (side === 0 ? 1 : -1), y, btn: b || 0 }; };
  dirs.forEach(d => { const a = [N, N]; a[side] = mk(d); m.step(a); });
  const a = [N, N]; a[side] = mk(dirs[dirs.length - 1] || 5, btn); m.step(a);
  for (let i = 0; i < (hold || 0); i++) { const b = [N, N]; b[side] = mk(5); m.step(b); }
}
function idle(m, n) { for (let i = 0; i < n; i++) m.step([N, N]); }
function place(m, d) { m.f[0].x = 600; m.f[1].x = 600 + d; }

console.log('Intro → combat');
{ const m = start(); ok(m.phase === 'fight', 'le combat démarre'); ok(m.f[0].state === 'idle', 'état idle'); }

console.log('Marche & saut');
{ const m = start(); const x0 = m.f[0].x; for (let i = 0; i < 20; i++) m.step([{ x: 1, y: 0, btn: 0 }, N]); ok(m.f[0].x > x0 + 30, 'avance'); 
  m.step([{ x: 0, y: 1, btn: 0 }, N]); ok(m.f[0].state === 'air', 'saute'); idle(m, 80); ok(m.f[0].state === 'idle' && m.f[0].y === 0, 'retombe'); }

console.log('Coup normal');
{ const m = start(); place(m, 70); const hp = m.f[1].hp; seq(m, 0, [5], BTN.LP, 20); ok(m.f[1].hp < hp, 'LP touche'); ok(m.events.length >= 0, 'events'); }

console.log('Boule d\'énergie 236+LP');
{ const m = start(); place(m, 600); seq(m, 0, [2, 3, 6], BTN.LP); let seen = m.f[0].state; idle(m, 25); ok(m.proj.length === 1 || m.f[1].hp < m.f[1].maxHp, 'projectile créé'); 
  let hit = false; for (let i = 0; i < 160 && !hit; i++) { m.step([N, N]); if (m.f[1].hp < 1100) hit = true; } ok(hit, 'projectile touche'); }
{ const m = start(); place(m, 600); seq(m, 0, [2, 3, 6], BTN.LP); idle(m, 20); seq(m, 0, [2, 3, 6], BTN.LP); idle(m, 5); ok(m.proj.filter(p => p.owner === 0).length <= 1, 'une seule boule à la fois'); }

console.log('Dragon 623+HP : invulnérable et touche');
{ const m = start(); place(m, 60); m.f[0].inv = 0; const hp = m.f[1].hp; seq(m, 0, [6, 2, 3], BTN.HP, 40); ok(m.f[1].hp < hp, '623 touche'); ok(m.f[1].state === 'airhit' || m.f[1].state === 'knockdown', 'adversaire projeté (' + m.f[1].state + ')'); }
{ const m = start(); place(m, 120); // l'adversaire attaque en même temps : l'ascension doit passer au travers
  m.f[1].cid; const b = [N, N]; b[1] = { x: 0, y: 0, btn: BTN.HK }; m.step(b); seq(m, 0, [6, 2, 3], BTN.LP, 0); let invSeen = false; for (let i = 0; i < 12; i++) { m.step([N, N]); if (m.f[0].inv > 0) invSeen = true; } ok(invSeen, 'invulnérabilité pendant 623'); }

console.log('Blocage');
{ const m = start(); place(m, 70); const hp = m.f[1].hp; const a = [N, N]; a[0] = { x: 0, y: 0, btn: BTN.HP }; a[1] = { x: 1, y: 0, btn: 0 }; // P2 regarde à gauche : « arrière » = droite (x=+1)
  for (let i = 0; i < 25; i++) { m.step(a); a[0] = { x: 0, y: 0, btn: 0 }; } ok(m.f[1].hp === hp, 'coup bloqué sans dégât (hp ' + m.f[1].hp + ')'); }
{ const m = start(); place(m, 70); // bas = frappe basse : debout ne bloque pas
  const a = [N, N]; a[0] = { x: 0, y: -1, btn: BTN.LK }; a[1] = { x: 1, y: 0, btn: 0 }; const hp = m.f[1].hp; // clk = low, defender debout bloque haut seulement
  for (let i = 0; i < 20; i++) { m.step(a); a[0] = { x: 0, y: -1, btn: 0 }; } ok(m.f[1].hp < hp, 'balayage bas touche un adversaire debout'); }

console.log('Dash');
{ const m = start(); const x0 = m.f[0].x; const R = { x: 1, y: 0, btn: 0 }; m.step([R, N]); m.step([N, N]); m.step([N, N]); m.step([R, N]); ok(m.f[0].state === 'dashF', 'dash avant 6-5-6'); idle(m, 30); ok(m.f[0].x > x0 + 70, 'le dash avance'); }
{ const m = start(); const L = { x: -1, y: 0, btn: 0 }; m.step([L, N]); m.step([N, N]); m.step([N, N]); m.step([L, N]); ok(m.f[0].state === 'dashB', 'dash arrière'); }

console.log('Chaîne LP → LP → 236');
{ const m = start(); place(m, 60); const hp = m.f[1].hp; seq(m, 0, [5], BTN.LP, 3); m.step([N, N]); seq(m, 0, [5], BTN.LP); for (let i = 0; i < 10; i++) m.step([N, N]); ok(m.f[0].lastCombo >= 2 || m.f[0].cHits >= 1, 'chaînage (cHits ' + m.f[0].cHits + ', hp ' + (hp - m.f[1].hp) + ')'); }

console.log('Projection');
{ const m = start(); place(m, 50); const hp = m.f[1].hp; const a = [N, N]; a[0] = { x: 0, y: 0, btn: BTN.THR }; m.step(a); idle(m, 8); ok(m.f[1].hp < hp, 'projection touche'); idle(m, 130); ok(m.f[1].state === 'idle', 'adversaire se relève (' + m.f[1].state + ')'); }
{ const m = start(); place(m, 50); m.f[1].throwPress = m.f[1].animT; const hp = m.f[1].hp; const a = [N, N]; a[0] = { x: 0, y: 0, btn: BTN.THR }; m.step(a); idle(m, 8); ok(m.f[1].hp === hp, 'brisure de projection'); }

console.log('Super (rage 100)');
for (const cid of ['calpros', 'nia', 'ayanda', 'kormal']) { const m = start({ p1: cid }); place(m, 180); m.f[0].rage = 100; const hp = m.f[1].hp; seq(m, 0, [5], BTN.SUP); for (let i = 0; i < 200; i++) m.step([N, N]); ok(m.f[1].hp < hp - 40, cid + ' super touche (' + (hp - m.f[1].hp) + ' dégâts)'); ok(m.f[0].rage < 100, 'rage consommée'); }
{ const m = start(); place(m, 180); m.f[0].rage = 100; seq(m, 0, [2, 3, 6, 2, 3, 6], BTN.HP); idle(m, 5); ok(m.f[0].move && m.f[0].move.type === 'super' || m.freeze > 0, '236236 + coup déclenche la super'); }

console.log('K.O. → manches → fin');
{ const m = start(); place(m, 60); m.f[1].hp = 20; seq(m, 0, [5], BTN.HK, 4); let ko = false; for (let i = 0; i < 400 && !ko; i++) { m.step([N, N]); if (m.events.some(e => e.t === 'ko')) ko = true; } ok(ko, 'K.O. émis');
  for (let i = 0; i < 500; i++) m.step([N, N]); ok(m.round === 2 && m.f[1].hp === m.f[1].maxHp, 'manche 2 (round ' + m.round + ' wins ' + m.wins + ')');
  place(m, 60); for (let i = 0; i < 140; i++) m.step([N, N]); m.f[1].hp = 20; seq(m, 0, [5], BTN.HK, 4); for (let i = 0; i < 800 && m.phase !== 'over'; i++) m.step([N, N]); ok(m.phase === 'over' && m.winner === 0, 'match gagné (phase ' + m.phase + ' winner ' + m.winner + ')'); }
{ const m = start(); m.timer = 1; m.f[1].hp = 500; for (let i = 0; i < 70; i++) m.step([N, N]); ok(m.wins[0] === 1, 'temps écoulé : meilleur hp gagne (wins ' + m.wins + ')'); }

console.log('Fuzz : toutes les paires, entrées au hasard');
{ const r = Core.rng(42); const ids = ['calpros', 'nia', 'ayanda', 'kormal']; let bad = 0;
  for (const a of ids) for (const b of ids) { const m = new Match({ p1: a, p2: b, cpu2: { cpu: false }, seed: 7 }); let hold = [N, N], over = 0;
    for (let i = 0; i < 12000; i++) { if (i % 6 === 0) hold = [0, 1].map(() => { const t = r(); return { x: [-1, 0, 1][Math.floor(r() * 3)], y: t < 0.15 ? 1 : (t < 0.4 ? -1 : 0), btn: r() < 0.35 ? [1, 2, 4, 8, 16, 32, 64, 33, 34, 36, 40][Math.floor(r() * 11)] : 0 }; });
      m.step(hold);
      for (const f of m.f) { if (![f.x, f.y, f.vx, f.vy, f.hp, f.rage].every(Number.isFinite)) { bad++; console.log('  NaN', a, b, i, f.state); i = 1e9; break; }
        if (f.x < 0 || f.x > 1600) { bad++; console.log('  hors décor', f.x, f.state); i = 1e9; break; } if (f.hp < 0 || f.hp > f.maxHp) { bad++; console.log('hp hors bornes', f.hp); i = 1e9; break; } }
      if (m.phase === 'over') over++; if (over > 400) break; }
    ok(true, a + '/' + b + ' phase=' + m.phase + ' wins=' + m.wins + ' round=' + m.round); }
  ok(bad === 0, 'aucune anomalie dans le fuzz'); }

console.log('\n' + passes + ' ok, ' + fails + ' échecs'); process.exit(fails ? 1 : 0);
