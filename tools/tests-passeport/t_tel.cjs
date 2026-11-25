const { chromium, devices } = require('playwright');
const BASE = 'http://localhost:8766/passeport-demo/';
const SP = __dirname + '/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const att = async (fn, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fn(); if (r) return r; } catch (e) { } await wait(250); } return null; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const iphone = Object.assign({}, devices['iPhone 13'], { defaultBrowserType: undefined });
  const tel = async (extra) => { const c = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: iphone.userAgent }, extra || {})); const p = await c.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); }); p.__ctx = c; return p; };
  const api = (p, body) => p.evaluate(async b => { const r = await fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return [r.status, await r.json()]; }, body);
  const petit = async (p, nom) => { const l = await p.evaluate(() => [...document.querySelectorAll('button,a.btn,select,input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio])')].filter(e => e.offsetParent !== null && !e.closest('#guideCarte,.tiroir:not(.on)')).map(e => { const r = e.getBoundingClientRect(); return { t: (e.innerText || e.id || e.name || e.placeholder || '').trim().slice(0, 24), h: Math.round(r.height), w: Math.round(r.width) }; }).filter(x => x.h < 36 && x.h > 0 && x.w > 0)); if (l.length) console.log('  cibles tactiles < 36 px sur ' + nom + ' :', JSON.stringify(l.slice(0, 8))); return l.length; };
  const trop = async (p, nom) => { const w = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(w <= 1, nom + ' : pas de défilement horizontal (' + w + ')'); };

  // espace créé par la Préfecture (ordinateur)
  const P = await b.newPage({ viewport: { width: 1280, height: 800 } }); await P.goto(BASE + 'index.html'); await P.waitForTimeout(800);
  const cr = await api(P, { op: 'creer', nom: 'Tel', dossiers: [] }); const code = cr[1].code, pub = cr[1].publique; ok(cr[0] === 201, 'espace créé : ' + code);
  await api(P, { op: 'reglages', espace: code, config: { portes: 2, capacite: 30, delai: 0, jours: [0, 1, 2, 3, 4, 5, 6], decalage: 0, debut: '08:00', pas: 30, parCreneau: 10, lieu: 'Préfecture de Brazzaville', noms: {} } });

  // ============ Téléphone 1 : agent de guichet ============
  const A = await tel(); await A.goto(BASE + 'index.html?espace=' + code); await A.waitForTimeout(2500);
  ok(/🟢/.test(await A.textContent('#chipEspace')), 'téléphone agent : connecté à l’espace');
  await A.tap('nav button[data-v="guichet"]'); await A.waitForTimeout(600);
  await trop(A, 'guichet'); await petit(A, 'guichet');
  await A.fill('#f_nom', 'Tsiba'); await A.fill('#f_prenoms', 'Merveille'); await A.fill('#f_naiss', '1995-06-02'); await A.fill('#f_pnum', 'CG1234567'); await A.fill('#f_tel', '+242 06 444 55 66'); await A.waitForTimeout(500);
  await A.tap('#edGuichet [data-pj="photo"][data-k="photo"]'); await A.setInputFiles('#pjPhoto', SP + 'visage-test.png'); await A.waitForTimeout(800);
  for (const k of ['identite', 'naissance', 'nationalite']) { await A.tap('#edGuichet [data-pj="fichier"][data-k="' + k + '"]'); await A.setInputFiles('#pjFichier', SP + 'visage-test.png'); await A.waitForTimeout(700); }
  // signature au doigt (vrais événements tactiles)
  await A.locator('#sigPad').scrollIntoViewIfNeeded(); const bx = await A.locator('#sigPad').boundingBox(); const cdp = await A.__ctx.newCDPSession(A);
  const pt = (x, y) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(bx.x + 40, bx.y + 80) });
  for (let i = 1; i <= 30; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(bx.x + 40 + i * 9, bx.y + 80 + Math.sin(i / 3) * 40) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await A.waitForTimeout(300);
  ok(/sign/i.test(await A.textContent('#sigEtat')), 'signature au doigt reconnue : « ' + (await A.textContent('#sigEtat')).trim().slice(0, 50) + ' »');
  await A.screenshot({ path: SP + 'tel_guichet.png' });
  await A.tap('#bValider'); await A.waitForTimeout(1500);
  const dos = await A.evaluate(() => { const X = window.__spApi, d = X.DB.find(x => x.person.nom.toUpperCase() === 'TSIBA'); return d && { id: d.id, code: X.code(d.id, d.person.nom), manq: X.manquantes(d).length, sig: !!d.signature || !!d.sign }; });
  ok(dos && dos.manq === 0, 'dossier enregistré, complet : ' + JSON.stringify(dos));
  await A.screenshot({ path: SP + 'tel_accuse.png', fullPage: false });
  await trop(A, 'accusé');
  const vu = await att(async () => (await (await fetch(BASE.replace('/passeport-demo/', '') + '/api/passeport?op=sync&espace=' + code + '&since=0')).json()).dossiers.some(d => d.id === dos.id)); ok(!!vu, 'le dossier est arrivé sur le serveur');

  // ============ Téléphone 2 : caisse ============
  const C = await tel(); await C.goto(BASE + 'index.html?espace=' + code); await C.waitForTimeout(2500); await C.selectOption('#role', 'caisse');
  await C.tap('nav button[data-v="caisse"]'); await C.waitForTimeout(500); await trop(C, 'caisse'); await petit(C, 'caisse');
  await C.fill('#k_id', dos.id); await C.fill('#k_code', dos.code); await C.tap('#bCaisseOuvrir'); await C.waitForSelector('#k_montant', { timeout: 8000 });
  await C.screenshot({ path: SP + 'tel_caisse.png' });
  await C.tap('#bPayer'); await C.waitForSelector('.recu', { timeout: 10000 });
  ok(/Rendez-vous/.test(await C.textContent('.recu .alert')), 'caisse : reçu avec rendez-vous');
  await trop(C, 'reçu'); await C.screenshot({ path: SP + 'tel_recu.png' });
  const wa = await C.getAttribute('.recu ~ .ligne a[href*="wa.me"]', 'href'); ok(!!wa && /Rendez-vous/.test(decodeURIComponent(wa)), 'lien WhatsApp avec le rendez-vous');
  await C.tap('#bFerme');

  // ============ Téléphone 3 : le demandeur ============
  const lien = BASE + 'index.html?suivi=' + dos.id + '&code=' + dos.code + '&esp=' + pub;
  const D = await tel(); await D.goto(lien); await D.waitForTimeout(2500);
  ok(/Rendez-vous d’enrôlement/.test(await D.textContent('#resSuivi')), 'demandeur : voit son rendez-vous');
  await trop(D, 'demandeur'); await petit(D, 'demandeur'); await D.screenshot({ path: SP + 'tel_demandeur.png', fullPage: false });

  // ============ Écran de télévision (Full HD) + porte (téléphone 4) ============
  const TV = await b.newPage({ viewport: { width: 1920, height: 1080 } }); TV.on('pageerror', e => errs.push('TV ' + e.message)); await TV.goto(BASE + 'ecran.html?espace=' + code); await TV.waitForTimeout(500); await TV.fill('#nomEcran', 'Télévision'); await TV.click('#bDemarrer'); await TV.waitForTimeout(1800);
  const G = await tel(); await G.goto(BASE + 'index.html?espace=' + code); await G.waitForTimeout(2500); await G.selectOption('#role', 'porte');
  await G.tap('nav button[data-v="file"]'); await G.waitForTimeout(800); await trop(G, 'file d’attente'); await petit(G, 'file');
  ok(/aujourd’hui|Rendez-vous du/.test(await G.textContent('#jourFile')), 'porte : rendez-vous du jour affiché');
  await G.tap('[data-act="appeler"][data-p="1"]'); await G.waitForTimeout(1200);
  await G.screenshot({ path: SP + 'tel_porte.png' });
  const num = await att(async () => { const n = await TV.textContent('#num'); return n !== '---' ? n : null; }, 8000);
  ok(num === '001' && /TSIBA/.test(await TV.textContent('#nom')) && /PORTE 1/.test(await TV.textContent('#porte')), 'télévision : ' + num + ' ' + (await TV.textContent('#nom')) + ' ' + (await TV.textContent('#porte')));
  await TV.screenshot({ path: SP + 'tel_tv.png' });
  // le demandeur voit sa convocation évoluer (appelé)
  const st = await att(async () => /Dossier reçu/.test(await D.textContent('#resSuivi')) ? 1 : 0, 9000); console.log('demandeur voit l’état « reçu » après l’appel :', !!st);
  console.log('ERREURS JS :', JSON.stringify(errs)); ok(errs.length === 0, 'aucune erreur JavaScript');
  await api(P, { op: 'supprimer', espace: code, confirmation: 'EFFACER' });
  console.log(echecs ? echecs + ' ECHEC(S)' : 'TOUS LES TESTS OK'); await b.close();
})().catch(e => { console.log('CRASH', e.message.split('\n').slice(0, 5).join(' | ')); process.exit(1); });
