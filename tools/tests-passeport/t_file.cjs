const { chromium } = require('playwright');
const BASE = 'http://localhost:8766/passeport-demo/';
const SP = __dirname + '/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
const att = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fn(); if (r) return r; } catch (e) { } await new Promise(r => setTimeout(r, 200)); } return null; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (w = 1280, h = 900, voix = false) => { const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage();
    if (voix) await p.addInitScript(() => { window.__dits = []; window.SpeechSynthesisUtterance = function (t) { this.text = t; }; Object.defineProperty(window, 'speechSynthesis', { value: { speak: u => window.__dits.push([Date.now(), u.text]), cancel() { } } }); });
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); }); return p; };
  const A = await mk(); await A.goto(BASE + 'index.html'); await A.waitForTimeout(1200); await A.selectOption('#role', 'prefecture');
  await A.click('#chipEspace'); await A.waitForSelector('#bCreerEsp'); await Promise.all([A.waitForNavigation({ timeout: 20000 }).catch(() => { }), A.click('#bCreerEsp')]); await A.waitForTimeout(2000);
  const code = await A.evaluate(() => JSON.parse(localStorage.getItem('sp_espace_v1')).code);
  await A.selectOption('#role', 'caisse'); await A.evaluate(() => document.querySelector('nav button[data-v="caisse"]').click());
  for (let i = 0; i < 4; i++) { await A.click('#bScanEx'); await A.waitForSelector('#k_montant'); await A.click('#bPayer'); await A.waitForSelector('.recu'); await A.click('#bFerme'); await A.waitForTimeout(300); }
  await A.evaluate(() => document.querySelector('nav button[data-v="reglages"]').click()); await A.selectOption('#role', 'prefecture');
  await A.evaluate(() => document.querySelector('nav button[data-v="reglages"]').click()); await A.fill('#r_dec', '1'); await A.fill('#r_portes', '3'); await A.click('#bRegler'); await A.waitForTimeout(800);
  const E = await mk(1280, 720, true); await E.goto(BASE + 'ecran.html?espace=' + code); await E.waitForTimeout(400); await E.fill('#nomEcran', 'Salle'); await E.click('#bDemarrer'); await E.waitForTimeout(1800);
  await E.click('#son'); // active la voix
  ok((await E.textContent('#num')) === '---', 'écran au repos au départ');
  // trois portes appellent presque en même temps
  await A.selectOption('#role', 'porte'); await A.evaluate(() => document.querySelector('nav button[data-v="file"]').click()); await A.waitForTimeout(1500);
  const t0 = Date.now();
  for (const k of [1, 2, 3]) { await A.click('[data-act="appeler"][data-p="' + k + '"]'); }
  const suivi = []; let dernier = '';
  while (Date.now() - t0 < 36000) { const n = await E.textContent('#num'); if (n !== dernier) { suivi.push([Math.round((Date.now() - t0) / 100) / 10, n, (await E.textContent('#suite')).trim()]); dernier = n; } await E.waitForTimeout(150); }
  console.log('chronologie écran (s, numéro, file) :', JSON.stringify(suivi));
  const nums = suivi.map(s => s[1]).filter(n => n !== '---');
  ok(nums.join(',') === '001,002,003', 'les 3 numéros passent un par un, dans l’ordre : ' + nums.join(','));
  const ecarts = []; for (let i = 2; i < suivi.length; i++) ecarts.push(suivi[i][0] - suivi[i - 1][0]);
  ok(ecarts.length >= 2 && ecarts.every(e => e >= 9.8 && e <= 12.5), 'chaque numéro reste ≈10 s : écarts ' + ecarts.map(e => e.toFixed(1)).join(' / '));
  ok(suivi.some(s => /à annoncer/.test(s[2])), 'l’écran indique « + N appels à annoncer » pendant l’attente');
  const dits = (await E.evaluate(() => window.__dits.map(d => d[1]))).filter(Boolean);
  console.log('voix :', JSON.stringify(dits));
  ok(dits.length >= 3 && /Numéro 1\..*porte 1/.test(dits[0]), 'la voix annonce numéro, nom et la porte : ' + dits[0]);
  ok(dits.some(d => /Numéro 2\./.test(d) && /porte 2/.test(d)) && dits.some(d => /Numéro 3\./.test(d) && /porte 3/.test(d)), 'les numéros 2 et 3 sont annoncés avec leur porte');
  ok(dits.filter(d => /Numéro 1\./.test(d)).length === 2, 'l’annonce est répétée une fois (2 fois au total pour un numéro resté ≥ 6 s)');
  const portes = await E.$$eval('#portes .p b', e => e.map(x => x.textContent)); ok(portes.join('|') === '001|002|003', 'grille finale : ' + portes.join('|'));
  // Absent : revient en fin de file
  await A.click('[data-act="absent"][data-p="1"]'); await A.waitForTimeout(800);
  const suiv = await E.textContent('#prochains'); console.log('prochains après absence du 001 :', suiv.replace(/\s+/g, ' '));
  const ordre = await A.evaluate(() => window.__spApi.DB.filter(d => d.status === 'paye' && d.rdv && d.rdv.date === window.__spSync.jourCourant()).sort((a, b) => (a.rang != null ? a.rang : a.ticket) - (b.rang != null ? b.rang : b.ticket)).map(d => d.ticket));
  ok(ordre.join(',') === '4,1', 'le 001 absent repasse APRÈS le 004 : ordre ' + ordre.join(','));
  ok(errs.length === 0, 'aucune erreur JS ' + JSON.stringify(errs));
  console.log(echecs ? echecs + ' ECHEC(S)' : 'TOUS LES TESTS OK'); await b.close();
})().catch(e => { console.log('CRASH', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
