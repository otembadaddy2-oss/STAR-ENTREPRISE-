const { chromium } = require('playwright');
const BASE = 'http://localhost:8766/passeport-demo/';
const SP = __dirname + '/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
const att = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fn(); if (r) return r; } catch (e) { } await new Promise(r => setTimeout(r, 250)); } return null; };
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const ctx = async (w = 1280, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FAILED|404/.test(m.text())) errs.push('CONSOLE ' + m.text()); }); return p; };

  // ---------- A : préfecture crée l'espace ----------
  const A = await ctx();
  await A.goto(BASE + 'index.html'); await A.waitForTimeout(1200);
  await A.selectOption('#role', 'prefecture');
  await A.click('#chipEspace'); await A.waitForSelector('#bCreerEsp');
  await Promise.all([A.waitForNavigation({ timeout: 20000 }).catch(() => { }), A.click('#bCreerEsp')]);
  await A.waitForTimeout(2000);
  const code = await A.evaluate(() => { try { return JSON.parse(localStorage.getItem('sp_espace_v1')).code; } catch (e) { return null; } });
  ok(/^[A-Z0-9]{8}$/.test(code || ''), 'espace créé : code ' + code);
  await A.selectOption('#role', 'prefecture');
  ok((await A.textContent('#chipEspace')).includes('🟢') || (await A.textContent('#chipEspace')).toLowerCase().includes('espace'), 'puce A : ' + (await A.textContent('#chipEspace')));
  const nA = await A.evaluate(() => window.__spApi.DB.length); console.log('dossiers côté A :', nA);

  // ---------- B : caisse rejoint ----------
  const B = await ctx();
  await B.goto(BASE + 'index.html?espace=' + code); await B.waitForTimeout(2500);
  await B.selectOption('#role', 'caisse');
  const nB = await att(async () => { const n = await B.evaluate(() => window.__spApi.DB.length); return n > 0 ? n : 0; });
  ok(nB === nA, 'B reçoit les ' + nA + ' dossiers de A : ' + nB);

  // ---------- Régler : date simulée = aujourd'hui, 3 portes ----------
  await A.evaluate(() => document.querySelector('nav button[data-v="reglages"]').click());
  await A.fill('#r_portes', '3'); await A.fill('#r_cap', '40'); await A.click('#bRegler'); await A.waitForTimeout(800);
  ok((await A.textContent('#r_msg')).includes('enregistrés'), 'réglages enregistrés (3 portes)');
  const nPortesB = await att(async () => (await B.evaluate(() => window.__spSync.cfg().portes)) === 3);
  ok(nPortesB, 'B voit les 3 portes (réglage partagé)');

  // ---------- Écrans C et D ----------
  const C = await ctx(1280, 720), D = await ctx(900, 600);
  for (const [p, nom] of [[C, 'Salle 1'], [D, 'Salle 2']]) {
    await p.goto(BASE + 'ecran.html?espace=' + code); await p.waitForTimeout(500);
    await p.fill('#nomEcran', nom); await p.click('#bDemarrer'); await p.waitForTimeout(1800);
  }
  ok(/Connecté/.test(await C.textContent('#etat')), 'écran C connecté : ' + (await C.textContent('#etat')));
  ok(/Connecté/.test(await D.textContent('#etat')), 'écran D connecté');
  // la préfecture voit 2 écrans
  await A.evaluate(() => document.querySelector('nav button[data-v="file"]').click());
  const voit = await att(async () => { const t = await A.textContent('#ecransCo'); return /Salle 1/.test(t) && /Salle 2/.test(t) ? t : null; }, 6000);
  ok(!!voit, 'A voit les 2 écrans connectés : ' + (voit || '').replace(/\s+/g, ' ').slice(0, 80));

  // ---------- Caisse B : encaisser un dossier d'exemple ----------
  await B.evaluate(() => document.querySelector('nav button[data-v="caisse"]').click());
  await B.click('#bScanEx'); await B.waitForSelector('#k_montant', { timeout: 6000 });
  const idPaye = (await B.inputValue('#k_id'));
  await B.fill('#k_montant', '75000'); await B.click('#bPayer');
  await B.waitForSelector('.recu', { timeout: 10000 });
  const recu = await B.textContent('.recu .num'), rdvTxt = await B.textContent('.recu .alert');
  ok(/RP-\d{4}-\d{6}/.test(recu), 'reçu émis : ' + recu);
  ok(/Rendez-vous/.test(rdvTxt), 'rendez-vous affiché sur le reçu : ' + rdvTxt.replace(/\s+/g, ' ').slice(0, 90));
  const wa = await B.getAttribute('.recu ~ .ligne a.btn.vert, .ligne a[href*="wa.me"]', 'href');
  ok(wa && /wa\.me/.test(wa) && decodeURIComponent(wa).includes('Rendez-vous'), 'lien WhatsApp contient le rendez-vous');
  const msgWa = decodeURIComponent(wa.split('text=')[1] || ''); console.log('--- message WhatsApp ---\n' + msgWa + '\n------');
  await B.screenshot({ path: SP + 's_recu.png' }); await B.click('#bFerme');

  // deux autres paiements (pour avoir 3 personnes le même jour)
  for (let i = 0; i < 2; i++) {
    await B.click('#bScanEx'); await B.waitForSelector('#k_montant', { timeout: 6000 });
    await B.fill('#k_montant', '75000'); await B.click('#bPayer'); await B.waitForSelector('.recu', { timeout: 10000 });
    console.log('paiement', i + 2, await B.textContent('.recu .num'), (await B.textContent('.recu .gros')));
    await B.click('#bFerme'); await B.waitForTimeout(300);
  }
  // ---------- A voit le paiement (sync) ----------
  const stA = await att(async () => { const s = await A.evaluate(id => { const d = window.__spApi.DB.find(x => x.id === id); return d ? [d.status, d.ticket, d.rdv && d.rdv.date] : null; }, idPaye); return s && s[0] === 'paye' ? s : null; });
  ok(!!stA, 'A voit le dossier ' + idPaye + ' payé : ' + JSON.stringify(stA));
  const dateRdv = stA && stA[2];

  // ---------- Avancer la date jusqu'au jour du RDV ----------
  const aujourdhui = await A.evaluate(() => window.__spApi.jourSite(0));
  const dec = Math.round((new Date(dateRdv) - new Date(aujourdhui)) / 86400000);
  console.log('rdv', dateRdv, 'aujourd’hui', aujourdhui, 'décalage', dec);
  await A.evaluate(() => document.querySelector('nav button[data-v="reglages"]').click());
  await A.fill('#r_dec', String(Math.max(0, dec))); await A.click('#bRegler'); await A.waitForTimeout(1200);
  // ---------- Porte : B (rôle porte) appelle ----------
  await B.selectOption('#role', 'porte');
  await B.evaluate(() => document.querySelector('nav button[data-v="file"]').click());
  const dansFile = await att(async () => (await B.$$eval('#tbFile tr.cl', r => r.length)) > 0, 8000);
  ok(!!dansFile, 'la file d’attente de B contient des gens (rdv du jour)');
  await B.click('[data-act="appeler"][data-p="1"]'); await B.waitForTimeout(1500);
  console.log('B porte1 :', (await B.textContent('#appelEtat')).replace(/\s+/g, ' '));
  const nomC = await att(async () => { const n = await C.textContent('#num'); return n && n !== '---' ? n : null; }, 8000);
  ok(!!nomC, 'écran C affiche le N° ' + nomC + ' → ' + (await C.textContent('#nom')) + ' / ' + (await C.textContent('#porte')));
  const nomD = await att(async () => { const n = await D.textContent('#num'); return n && n !== '---' ? n : null; }, 8000);
  ok(nomD === nomC, 'écran D affiche le même N° : ' + nomD);
  // deuxième appel porte 2 (depuis A) -> personne différente
  await A.evaluate(() => document.querySelector('nav button[data-v="file"]').click());
  await A.selectOption('#role', 'porte'); await A.evaluate(() => document.querySelector('nav button[data-v="file"]').click());
  await A.waitForTimeout(1500);
  await A.click('[data-act="appeler"][data-p="2"]'); await A.waitForTimeout(1500);
  const n2 = await att(async () => { const n = await C.textContent('#num'); return n && n !== nomC ? n : null; }, 8000);
  ok(!!n2, 'porte 2 appelle quelqu’un d’autre : ' + n2 + ' (avant ' + nomC + ')');
  const portes = await C.$$eval('#portes .p b', e => e.map(x => x.textContent));
  console.log('portes sur écran C :', portes.join(' | '));
  ok(portes[0] === nomC && portes[1] === n2 && portes.length === 3, 'écran C montre portes 1, 2, 3 correctement');
  await C.screenshot({ path: SP + 's_ecranC.png' });

  // ---------- Coupure serveur côté écran : l'affichage reste ----------
  // (simulé : route bloquée)
  await C.route('**/api/passeport*', r => r.abort());
  await C.waitForTimeout(4500);
  ok(/perdue/.test(await C.textContent('#etat')) && (await C.textContent('#num')) === n2, 'coupure réseau : bandeau + dernier affichage conservé');
  await C.unroute('**/api/passeport*'); await C.waitForTimeout(2500);
  ok(/Connecté/.test(await C.textContent('#etat')), 'reconnexion automatique de l’écran');

  // ---------- File vue par A (aperçu écran intégré) ----------
  await A.evaluate(() => document.querySelector('nav button[data-v="file"]').click()); await A.waitForTimeout(1500);
  await A.screenshot({ path: SP + 's_fileA.png', fullPage: false });
  console.log('ERREURS JS :', JSON.stringify(errs));
  ok(errs.length === 0, 'aucune erreur JavaScript');
  console.log(echecs ? echecs + ' ECHEC(S)' : 'TOUS LES TESTS OK');
  await b.close();
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
