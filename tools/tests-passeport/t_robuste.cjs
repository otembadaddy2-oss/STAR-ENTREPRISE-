const { chromium } = require('playwright');
const { spawn } = require('child_process');
const PORT = 8767, BASE = 'http://localhost:' + PORT + '/passeport-demo/';
const SP = __dirname + '/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const att = async (fn, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fn(); if (r) return r; } catch (e) { } await wait(250); } return null; };
let srv = null;
async function lancer() { srv = spawn('node', ['--experimental-strip-types', 'tools/serveur-local-passeport.mts', String(PORT)], { cwd: '/home/user/STAR-ENTREPRISE-', stdio: 'ignore' }); await att(async () => (await fetch(BASE + 'index.html').catch(() => null))?.ok, 15000); }
function couper() { try { srv.kill('SIGKILL'); } catch (e) { } srv = null; }
(async () => {
  await lancer(); const b = await chromium.launch(); const errs = [];
  const mk = async (w = 1280, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('dialog', d => d.accept()); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource|ERR_|net::/.test(m.text())) errs.push('CONSOLE ' + m.text()); }); return p; };
  const api = (p, body) => p.evaluate(async b => { const r = await fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return [r.status, await r.json().catch(() => ({}))]; }, body);
  const A = await mk(); await A.goto(BASE + 'index.html'); await A.waitForTimeout(1000); await A.selectOption('#role', 'prefecture');
  await A.click('#chipEspace'); await A.waitForSelector('#bCreerEsp'); await Promise.all([A.waitForNavigation({ timeout: 20000 }).catch(() => { }), A.click('#bCreerEsp')]); await A.waitForTimeout(2000);
  const code = await A.evaluate(() => JSON.parse(localStorage.getItem('sp_espace_v1')).code); console.log('espace', code);
  await A.selectOption('#role', 'prefecture');

  // ============ R1 : coupure du serveur ============
  const B = await mk(); await B.goto(BASE + 'index.html?espace=' + code); await B.waitForTimeout(2500); await B.selectOption('#role', 'caisse');
  ok(/🟢/.test(await B.textContent('#chipEspace')), 'B connecté avant la panne');
  await B.evaluate(() => document.querySelector('nav button[data-v="caisse"]').click());
  couper(); console.log('… serveur coupé');
  ok(!!(await att(async () => /🟠/.test(await B.textContent('#chipEspace')), 12000)), 'panne : la puce passe à « Reconnexion… » : ' + (await B.textContent('#chipEspace')));
  await B.click('#bScanEx'); await B.waitForSelector('#k_montant', { timeout: 5000 }); ok(true, 'panne : la caisse reste utilisable (fiche ouverte)');
  await B.click('#bPayer'); await B.waitForTimeout(1500);
  const msgPanne = await B.textContent('#payMsg'); ok(/Connexion perdue/.test(msgPanne), 'panne : encaisser affiche un message clair : « ' + msgPanne.trim().slice(0, 60) + '… »');
  ok((await B.$$('.recu')).length === 0, 'panne : aucun faux reçu n’est affiché');
  // changement local pendant la panne (Préfecture B fait avancer un dossier)
  await B.selectOption('#role', 'prefecture');
  const idMod = await B.evaluate(() => { const X = window.__spApi, d = X.DB.find(x => x.status === 'traitement'); if (!d) return null; d.history.push({ s: d.status, at: X.NOW().toISOString(), by: 'Préfecture', note: 'Note hors-ligne TEST' }); X.sauver(); return d.id; });
  await wait(1500);
  await lancer(); console.log('… serveur relancé');
  ok(!!(await att(async () => /🟢/.test(await B.textContent('#chipEspace')), 15000)), 'reprise automatique : la puce redevient verte');
  const vuA = await att(async () => { const n = await A.evaluate(i => { const d = window.__spApi.DB.find(x => x.id === i); return d && d.history.some(h => /hors-ligne TEST/.test(h.note || '')); }, idMod); return n; }, 15000);
  ok(!!vuA, 'le changement fait pendant la panne est arrivé chez A après la reprise (rien perdu)');

  // ============ R2 : double encaissement simultané ============
  const B1 = await mk(), B2 = await mk();
  for (const p of [B1, B2]) { await p.goto(BASE + 'index.html?espace=' + code); await p.waitForTimeout(2200); await p.selectOption('#role', 'caisse'); await p.evaluate(() => document.querySelector('nav button[data-v="caisse"]').click()); }
  const cible = await B1.evaluate(() => { const X = window.__spApi, d = X.DB.filter(x => x.status === 'depose' && !X.flags(x).some(f => f.n === 'rouge') && X.manquantes(x).length === 0).pop(); return d && { id: d.id, code: X.code(d.id, d.person.nom) }; });
  for (const p of [B1, B2]) { await p.fill('#k_id', cible.id); await p.fill('#k_code', cible.code); await p.click('#bCaisseOuvrir'); await p.waitForSelector('#k_montant'); }
  await Promise.all([B1.click('#bPayer'), B2.click('#bPayer')]); await wait(2500);
  const r1 = await B1.$$('.recu').then(a => a.length), r2 = await B2.$$('.recu').then(a => a.length);
  const m1 = await B1.textContent('#payMsg').catch(() => ''), m2 = await B2.textContent('#payMsg').catch(() => '');
  ok(r1 + r2 === 1, 'deux caisses paient le même dossier en même temps : un seul reçu (' + r1 + '+' + r2 + ')');
  ok(/déjà payé/i.test(m1 + m2), 'l’autre caisse reçoit « déjà payé » : ' + (m1 + m2).trim().slice(0, 50));
  const payes = await A.evaluate(i => window.__spApi.DB.filter(d => d.paiement && d.id === i).length, cible.id); ok(payes === 1, 'un seul paiement enregistré');
  const tick = await api(A, { op: 'sync', espace: code, since: 0 }).catch(() => null);

  // ============ R3 : texte piégé (XSS) ============
  const mal = { id: 'BZV-2026-009999', rev: 0, status: 'depose', type: 'premiere', createdAt: new Date().toISOString(), person: { nom: '<img src=x onerror=window.__xss=1>', prenoms: '"><script>window.__xss=2<\/script>', naissance: '1990-01-01', sexe: 'M', tel: '+242060000000', piece: { type: 'CNI', numero: 'X1', expiration: '2030-01-01' } }, history: [{ s: 'depose', at: new Date().toISOString(), by: '<b onmouseover=window.__xss=3>x</b>', note: '<svg onload=window.__xss=4>' }], pieces: [], lieu: '<i>Djiri</i>' };
  const dec = await A.evaluate(() => window.__spSync.jourCourant());
  const rep = await A.evaluate(async ([c, m]) => { const r = await fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'ecrire', espace: c, dossiers: [{ id: m.id, baseRev: 0, data: m }] }) }); return [r.status, await r.json()]; }, [code, mal]);
  console.log('écriture piégée →', rep[0]);
  // le pay passe par la caisse du serveur : on paie ce dossier puis on l'appelle
  const pay = await api(A, { op: 'payer', espace: code, id: mal.id, montant: 50000, mode: 'Espèces' }); ok(pay[0] === 200, 'dossier piégé encaissé');
  await api(A, { op: 'reglages', espace: code, config: { decalage: 1 } }).catch(() => { });
  await A.evaluate(async c => { const g = await (await fetch('/api/passeport?op=sync&espace=' + c + '&since=0')).json(); await fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'reglages', espace: c, config: Object.assign({}, g.config, { decalage: 1 }) }) }); }, code);
  const E = await mk(1280, 720); await E.goto(BASE + 'ecran.html?espace=' + code); await E.waitForTimeout(500); await E.click('#bDemarrer'); await E.waitForTimeout(1500);
  // appeler jusqu'à tomber sur le dossier piégé (les autres passent d'abord)
  await A.selectOption('#role', 'porte'); await A.evaluate(() => document.querySelector('nav button[data-v="file"]').click()); await A.waitForTimeout(1200);
  let trouve = false; for (let i = 0; i < 80 && !trouve; i++) { const x = await api(A, { op: 'appeler', espace: code, porte: 1 + (i % 6) }); if (x[1].vide) break; trouve = !!(x[1].dossier && x[1].dossier.id === mal.id); }
  ok(trouve, 'le dossier piégé a été appelé à une porte');
  await wait(1500);
  for (const v of ['file', 'dossiers', 'fraude', 'tableau']) { await A.evaluate(v => document.querySelector('nav button[data-v="' + v + '"]').click(), v); await A.waitForTimeout(900); }
  await A.evaluate(id => { const f = document.querySelector('#tbDossiers tr[data-id="' + id + '"], tr.cl[data-id="' + id + '"]'); if (f) f.click(); else window.__spApi.detail && window.__spApi.detail(id); }, mal.id); await A.waitForTimeout(900);
  if (await B1.$('#bFerme')) await B1.click('#bFerme').catch(() => { }); await B1.evaluate(() => document.querySelector('nav button[data-v="caisse"]').click()); await B1.fill('#k_id', mal.id); await B1.fill('#k_code', await A.evaluate(() => window.__spApi.code('BZV-2026-009999', '<img src=x onerror=window.__xss=1>'))); await B1.click('#bCaisseOuvrir'); await B1.waitForTimeout(900);
  console.log('fiche piégée visible côté caisse :', await B1.evaluate(() => /img src=x/.test(document.getElementById('caisseRes').innerText)));
  await E.waitForTimeout(12000);
  const txtE = await E.evaluate(() => document.body.innerText); console.log('écran : nom affiché =', (txtE.match(/img src[^\n]*/) || ['(nettoyé)'])[0].slice(0, 60));
  await E.screenshot({ path: SP + 'r_ecran_piege.png' });
  const x1 = await Promise.all([A, B1, E].map(p => p.evaluate(() => window.__xss || 0)));
  ok(x1.every(v => v === 0), 'texte piégé : aucun script exécuté (écran, poste A, poste B) ' + JSON.stringify(x1));
  const cit = await mk(400, 800); const pubKey = await A.evaluate(() => window.__spSync.publique()); const ctrl = await A.evaluate(() => window.__spApi.code('BZV-2026-009999', '<img src=x onerror=window.__xss=1>'));
  await cit.goto(BASE + 'index.html?suivi=BZV-2026-009999&code=' + ctrl + '&esp=' + pubKey); await cit.waitForTimeout(2500);
  ok((await cit.evaluate(() => window.__xss || 0)) === 0, 'texte piégé : aucun script chez le demandeur');

  // ============ R4 : gros volume ============
  const gros = []; for (let i = 0; i < 700; i++) { const d = JSON.parse(JSON.stringify(mal)); d.id = 'BZV-2026-' + String(20000 + i); d.status = 'depose'; d.person = { nom: 'TEST' + i, prenoms: 'Volume', naissance: '1990-01-01', sexe: i % 2 ? 'F' : 'M', tel: '+24206' + String(1000000 + i), piece: { type: 'CNI', numero: 'V' + i, expiration: '2030-01-01' } }; d.history = [{ s: 'depose', at: new Date().toISOString(), by: 'Agent', note: '' }]; d.lieu = 'Djiri'; gros.push({ id: d.id, baseRev: 0, data: d }); }
  for (let i = 0; i < gros.length; i += 50) { const r = await api(A, { op: 'ecrire', espace: code, dossiers: gros.slice(i, i + 50) }); if (r[0] !== 200) { console.log('lot refusé', r[0], JSON.stringify(r[1]).slice(0, 100)); break; } }
  const V = await mk(); const t0 = Date.now(); await V.goto(BASE + 'index.html?espace=' + code); await V.waitForTimeout(500);
  const n = await att(async () => { const k = await V.evaluate(() => window.__spApi.DB.length); return k > 700 ? k : 0; }, 30000); const dt = Date.now() - t0;
  ok(!!n && dt < 12000, 'gros volume : ' + n + ' dossiers chargés en ' + (dt / 1000).toFixed(1) + ' s');
  const t1 = Date.now(); await V.evaluate(() => document.querySelector('nav button[data-v="dossiers"]').click()); await V.waitForTimeout(300);
  await V.evaluate(() => document.querySelector('nav button[data-v="tableau"]').click()); await V.waitForTimeout(300);
  await V.evaluate(() => document.querySelector('nav button[data-v="fraude"]').click()); await V.waitForTimeout(300);
  console.log('navigation 3 pages avec', n, 'dossiers :', Date.now() - t1, 'ms'); ok(Date.now() - t1 < 6000, 'gros volume : navigation fluide');
  const sy = await V.evaluate(async c => { const t = performance.now(); const r = await fetch('/api/passeport?op=sync&espace=' + c + '&since=999999999'); await r.json(); return Math.round(performance.now() - t); }, code);
  console.log('une synchro incrémentale vide :', sy, 'ms'); ok(sy < 800, 'synchro incrémentale rapide malgré le volume');

  // ============ R5 : code faux sur l'écran ============
  const E2 = await mk(1000, 700); await E2.goto(BASE + 'ecran.html'); await E2.fill('#codeEsp', 'AAAAAAAA'); await E2.click('#bDemarrer'); await E2.waitForTimeout(1200);
  ok(/inconnu|Code/.test(await E2.textContent('#err')) && await E2.isVisible('#demarrage'), 'écran : un faux code est refusé avec un message clair');
  await E2.fill('#codeEsp', 'ABC'); await E2.click('#bDemarrer'); ok(/8 caractères/.test(await E2.textContent('#err')), 'écran : code trop court refusé');

  console.log('ERREURS JS :', JSON.stringify(errs)); ok(errs.length === 0, 'aucune erreur JavaScript');
  console.log(echecs ? echecs + ' ECHEC(S)' : 'TOUS LES TESTS OK'); await b.close(); couper();
})().catch(e => { console.log('CRASH', e.message.split('\n').slice(0, 5).join(' | ')); couper(); process.exit(1); });
