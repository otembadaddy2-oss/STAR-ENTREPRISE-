// Fabrique les captures d'écran RÉELLES de « Passeport Sûr » (données fictives) pour les PDF et la vidéo.
// Pré-requis : service postgresql start ; node --experimental-strip-types tools/serveur-local-passeport.mts 8766 (en arrière-plan)
// Lancer : NODE_PATH=$(npm root -g) node tools/documents-passeport/capturer.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8766/passeport-demo/'; const OUT = path.join(__dirname, 'captures') + '/'; const FIX = path.join(__dirname, '..', 'tests-passeport') + '/';
fs.mkdirSync(OUT, { recursive: true }); const wait = ms => new Promise(r => setTimeout(r, ms)); const echecs = [];
const essai = async (nom, fn) => { try { await fn(); console.log('OK   ' + nom); } catch (e) { echecs.push(nom); console.log('ECHEC ' + nom + ' : ' + e.message.split('\n').slice(0, 7).join(' | ').slice(0, 500)); } };
const aller = (p, v) => p.evaluate(v => document.querySelector('nav button[data-v="' + v + '"]').click(), v);
const role = async (p, r) => { await p.selectOption('#role', r); await wait(500); };
const fermerTout = p => p.evaluate(() => { ['guideInvit', 'guideProfil', 'guideAide', 'guideFaqBox', 'guideCarte', 'guideSpot', 'guideVoile'].forEach(i => { const e = document.getElementById(i); if (e) e.remove(); }); document.getElementById('tiroir') && document.getElementById('tiroir').classList.remove('on'); });
(async () => {
  const b = await chromium.launch();
  const ctxD = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, timezoneId: 'Africa/Brazzaville', locale: 'fr-FR' });
  const ctxT = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Africa/Brazzaville', locale: 'fr-FR' });
  const D = await ctxD.newPage(), T = await ctxT.newPage();

  // ---------------- Bienvenue + visite guidée (avec ?guide=1) ----------------
  await essai('bienvenue (ordinateur + téléphone)', async () => {
    for (const [p, pre] of [[D, 'd'], [T, 't']]) { await p.goto(BASE + 'index.html?guide=1'); await p.waitForSelector('#guideProfil', { timeout: 8000 }); await wait(500); await p.screenshot({ path: OUT + pre + '_bienvenue.png' }); }
    await D.click('#guideProfil [data-p="caisse"]'); await wait(1400); await D.screenshot({ path: OUT + 'd_visite.png' });
    await T.click('#guideProfil [data-p="agent"]'); await wait(1400); await T.screenshot({ path: OUT + 't_visite.png' });
  });
  // pages suivantes : sans le guide
  await D.goto(BASE + 'index.html'); await T.goto(BASE + 'index.html'); await wait(1200);
  for (const p of [D, T]) await p.evaluate(() => { localStorage.setItem('sp_guide_v1', JSON.stringify({ vu: true, faits: { agent: 'passe', caisse: 'passe', porte: 'passe', prefecture: 'passe', ministere: 'passe' } })); });
  await D.goto(BASE + 'index.html'); await T.goto(BASE + 'index.html'); await wait(1200);

  await essai('accueil', async () => { await role(D, 'prefecture'); await aller(D, 'accueil'); await wait(700); await D.screenshot({ path: OUT + 'd_accueil.png' }); await role(T, 'agent'); await aller(T, 'accueil'); await wait(800); await T.screenshot({ path: OUT + 't_accueil.png' }); });
  await essai('aide + questions', async () => { await D.click('#bAide'); await wait(400); await D.screenshot({ path: OUT + 'd_aide.png' }); await D.click('#aFaq'); await wait(300); await D.click('#guideFaqBox summary >> nth=1'); await wait(300); await D.screenshot({ path: OUT + 'd_faq.png' }); await fermerTout(D); });

  // ---------------- Guichet : une demande complète ----------------
  await essai('guichet', async () => {
    await role(D, 'agent'); await aller(D, 'guichet'); await wait(600); await D.screenshot({ path: OUT + 'd_guichet_debut.png' });
    await D.click('[data-ex="cni"]'); await wait(500); await D.fill('#f_tel', '+242 06 123 45 67'); await wait(400);
    await D.locator('#gt3').scrollIntoViewIfNeeded(); await wait(300); await D.locator('#gt3').screenshot({ path: OUT + 'd_guichet_fiche.png' });
    await D.locator('#gt2').scrollIntoViewIfNeeded(); await D.locator('#gt2').screenshot({ path: OUT + 'd_guichet_scan.png' });
    await D.click('#edGuichet [data-pj="photo"][data-k="photo"]'); await D.setInputFiles('#pjPhoto', FIX + 'visage-test.png'); await wait(600);
    for (const k of ['identite', 'naissance', 'nationalite']) { await D.click('#edGuichet [data-pj="fichier"][data-k="' + k + '"]'); await D.setInputFiles('#pjFichier', FIX + 'visage-test.png'); await wait(500); }
    await D.locator('#gt4').scrollIntoViewIfNeeded(); await D.locator('#gt4').screenshot({ path: OUT + 'd_guichet_pieces.png' });
    await D.locator('#sigPad').scrollIntoViewIfNeeded(); const bx = await D.locator('#sigPad').boundingBox(); await D.mouse.move(bx.x + 50, bx.y + 90); await D.mouse.down(); for (let i = 0; i < 40; i++) await D.mouse.move(bx.x + 50 + i * 9, bx.y + 90 + Math.sin(i / 3) * 45); await D.mouse.up(); await wait(300);
    await D.locator('#gt5').scrollIntoViewIfNeeded(); await D.locator('#gt5').screenshot({ path: OUT + 'd_guichet_signature.png' });
    await D.click('#bValider'); await wait(1400); await D.screenshot({ path: OUT + 'd_accuse.png' });
    const dos = await D.evaluate(() => { const X = window.__spApi, d = X.DB.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; return { id: d.id, code: X.code(d.id, d.person.nom) }; }); fs.writeFileSync(OUT + 'dossier.json', JSON.stringify(dos));
    await fermerTout(D);
  });
  await essai('guichet téléphone', async () => {
    await aller(T, 'guichet'); await wait(700); await T.screenshot({ path: OUT + 't_guichet.png' });
    await T.click('[data-ex="pass"]'); await wait(500); await T.locator('#gt3').scrollIntoViewIfNeeded(); await wait(300); await T.screenshot({ path: OUT + 't_guichet_fiche.png' });
    for (const [k, mode] of [['photo', 'photo'], ['identite', 'fichier'], ['ancien', 'fichier']]) { await T.tap('#edGuichet [data-pj="' + mode + '"][data-k="' + k + '"]'); await T.setInputFiles(mode === 'photo' ? '#pjPhoto' : '#pjFichier', FIX + 'visage-test.png'); await wait(450); }
    await T.locator('#sigPad').scrollIntoViewIfNeeded(); const cdp = await ctxT.newCDPSession(T); const bx = await T.locator('#sigPad').boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bx.x + 40, y: bx.y + 80, id: 1 }] }); for (let i = 1; i <= 30; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bx.x + 40 + i * 9, y: bx.y + 80 + Math.sin(i / 3) * 40, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(300);
    await T.screenshot({ path: OUT + 't_signature.png' }); await T.tap('#bValider'); await wait(1400); await T.screenshot({ path: OUT + 't_accuse.png' }); await fermerTout(T);
  });

  // ---------------- Caisse (le dossier du guichet) ----------------
  await essai('caisse', async () => {
    const dos = JSON.parse(fs.readFileSync(OUT + 'dossier.json', 'utf8')); await role(D, 'caisse'); await aller(D, 'caisse'); await wait(600); await D.screenshot({ path: OUT + 'd_caisse.png' });
    await D.fill('#k_id', dos.id); await D.fill('#k_code', dos.code); await D.click('#bCaisseOuvrir'); await D.waitForSelector('#k_montant'); await wait(500); await D.locator('#caisseRes').screenshot({ path: OUT + 'd_caisse_dossier.png' });
    await D.fill('#k_montant', '75000'); await D.click('#bPayer'); await D.waitForSelector('.recu'); await wait(500); await D.screenshot({ path: OUT + 'd_recu.png' }); await fermerTout(D);
    await role(T, 'caisse'); await aller(T, 'caisse'); await wait(600); await T.click('#bScanEx'); await T.waitForSelector('#k_montant'); await wait(400); await T.screenshot({ path: OUT + 't_caisse.png' });
    await T.fill('#k_montant', '75000'); await T.tap('#bPayer'); await T.waitForSelector('.recu'); await wait(500); await T.screenshot({ path: OUT + 't_recu.png' }); await T.evaluate(() => document.querySelector('.recu').scrollIntoView()); await fermerTout(T);
  });

  // ---------------- Salle d'attente, portes (scène partagée) ----------------
  await essai('espace partagé, portes, écran de salle', async () => {
    const P = await ctxD.newPage(); await P.goto(BASE + 'index.html'); await wait(600);
    const cr = await P.evaluate(async () => (await (await fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'creer', nom: 'Doc', dossiers: [] }) })).json()));
    const code = cr.code, pub = cr.publique; await P.close();
    const A = await ctxD.newPage(); await A.goto(BASE + 'index.html?espace=' + code); await wait(2200); await role(A, 'prefecture');
    await A.click('#chipEspace'); await wait(500); await A.screenshot({ path: OUT + 'd_espace.png' }); await fermerTout(A); await A.evaluate(() => { const e = document.querySelector('#bFerme'); e && e.click(); });
    await aller(A, 'reglages'); await wait(700); await A.screenshot({ path: OUT + 'd_reglages.png' });
    // 6 dossiers créés puis encaissés (API)
    const sc = await A.evaluate(async c => { const pr = ['Moukala', 'Batchi', 'Ngouabi', 'Okemba', 'Itoua', 'Mpassi'], pn = ['Grâce', 'Rodrigue', 'Prisca', 'Aimé', 'Merveille', 'Jean-Claude'], r = [];
      for (let i = 0; i < 6; i++) { const id = 'BZV-2026-' + String(500 + i).padStart(6, '0'); const d = { id, status: 'depose', type: i % 3 === 2 ? 'renouvellement' : 'premiere', createdAt: new Date().toISOString(), lieu: 'Makélékélé', person: { nom: pr[i].toUpperCase(), prenoms: pn[i], naissance: '199' + i + '-05-1' + i, sexe: i % 2 ? 'M' : 'F', tel: '+242 06 55' + i + ' 00 1' + i, piece: { type: 'CNI', numero: 'CG50' + i + '1234', expiration: '2031-01-01' } }, history: [{ s: 'depose', at: new Date().toISOString(), by: 'Agent 03', note: '' }], pieces: [] };
        await fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'ecrire', espace: c, dossiers: [{ id, baseRev: 0, data: d }] }) });
        const q = await (await fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'payer', espace: c, id, montant: 75000, mode: i % 2 ? 'Mobile Money MTN' : 'Espèces' }) })).json(); r.push(q.dossier && q.dossier.ticket); }
      const g = await (await fetch('/api/passeport?op=sync&espace=' + c + '&since=0')).json(); await fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'reglages', espace: c, config: Object.assign({}, g.config, { decalage: 1, portes: 4, noms: { 1: 'Vérification des pièces', 2: 'Empreintes et photo' } }) }) }); return r; }, code);
    console.log('  dossiers encaissés, numéros :', JSON.stringify(sc));
    const TV = await ctxD.newPage(); await TV.setViewportSize({ width: 1920, height: 1080 }); await TV.goto(BASE + 'ecran.html?espace=' + code); await wait(500); await TV.screenshot({ path: OUT + 'd_ecran_demarrage.png' }); await TV.fill('#nomEcran', 'Salle d’attente 1'); await TV.click('#bDemarrer'); await wait(1800);
    await role(A, 'porte'); await aller(A, 'file'); await wait(1500); await A.screenshot({ path: OUT + 'd_file_avant.png', fullPage: true });
    await A.click('[data-act="appeler"][data-p="1"]'); await wait(900); await A.click('[data-act="appeler"][data-p="2"]'); await wait(1500);
    await TV.waitForFunction(() => document.getElementById('num').textContent !== '---', null, { timeout: 8000 }); await wait(600); await TV.screenshot({ path: OUT + 'd_ecran_appel1.png' });
    await wait(11000); await TV.screenshot({ path: OUT + 'd_ecran_appel2.png' });
    await A.screenshot({ path: OUT + 'd_file_apres.png', fullPage: true }); await A.screenshot({ path: OUT + 'd_portes.png' });
    // demandeur sur téléphone
    const lien = BASE + 'index.html?suivi=BZV-2026-000500&code=' + (await A.evaluate(() => window.__spApi.code('BZV-2026-000500', 'MOUKALA'))) + '&esp=' + pub; await T.goto(lien); await wait(2600); await T.screenshot({ path: OUT + 't_demandeur.png' });
    await T.evaluate(() => window.scrollTo(0, 420)); await wait(300); await T.screenshot({ path: OUT + 't_demandeur_rdv.png' });
    await T.goto(BASE + 'index.html'); await wait(800);
    await aller(A, 'tableau'); await wait(2500); await A.screenshot({ path: OUT + 'd_tableau.png', fullPage: true });
    await TV.close(); await A.close();
  });

  // ---------------- Préfecture / Ministère : données de démonstration ----------------
  await essai('tableau de bord, anti-fraude, dossiers', async () => {
    await D.goto(BASE + 'index.html'); await wait(1000); await role(D, 'ministere'); await aller(D, 'tableau'); await wait(2800); await D.screenshot({ path: OUT + 'd_tableau_demo.png', fullPage: true });
    await aller(D, 'fraude'); await wait(2500); await D.screenshot({ path: OUT + 'd_fraude.png', fullPage: true });
    await aller(D, 'dossiers'); await wait(800); await D.screenshot({ path: OUT + 'd_dossiers.png' });
    await D.click('#tb tr.cl >> nth=2'); await wait(900); await D.screenshot({ path: OUT + 'd_fiche.png' }); await fermerTout(D);
    await role(T, 'ministere'); await aller(T, 'tableau'); await wait(2500); await T.screenshot({ path: OUT + 't_tableau.png' }); await aller(T, 'fraude'); await wait(2200); await T.screenshot({ path: OUT + 't_fraude.png' });
  });
  // ---------------- Pré-enregistrement du demandeur + Accueil (front office) ----------------
  await essai('pré-enregistrement et accueil', async () => {
    const P = await ctxD.newPage(); await P.goto(BASE + 'index.html'); await wait(600);
    const cr = await P.evaluate(async () => (await (await fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'creer', nom: 'Doc accueil', dossiers: [] }) })).json()));
    const code = cr.code, pub = cr.publique; await P.close();
    const pre = d => fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'preinscrire', public: pub, dossier: d }) }).then(r => r.json());
    // le demandeur, sur son téléphone
    const M = await ctxT.newPage(); await M.goto(BASE + 'inscription.html?esp=' + pub); await wait(900); await M.screenshot({ path: OUT + 't_inscription.png' });
    await M.fill('#nom', 'Mpassi'); await M.fill('#prenoms', 'Grâce'); await M.fill('#naiss', '1991-07-21'); await M.selectOption('#sexe', 'F'); await M.fill('#tel', '+242 06 123 45 67'); await M.fill('#pnum', 'CNI123456'); await M.fill('#pexp', '2031-09-30');
    await M.locator('#pnum').scrollIntoViewIfNeeded(); await wait(300); await M.screenshot({ path: OUT + 't_inscription_champs.png' });
    await M.click('#bEnvoyer'); await M.waitForSelector('#vRecu:not([hidden])'); await wait(600); await M.screenshot({ path: OUT + 't_inscription_recu.png' });
    const id1 = (await M.textContent('#rNum')).trim(), code1 = (await M.textContent('#rCode')).trim(); await M.close();
    const r2 = await pre({ nom: 'Mavoungou', prenoms: 'Désiré', naissance: '1988-11-02', sexe: 'M', type: 'premiere', tel: '+242 06 777 88 99', piece: { type: 'CNI', numero: 'CNI445566', expiration: '2030-01-01' } });
    // l'accueil
    const A = await ctxD.newPage(); await A.goto(BASE + 'index.html?espace=' + code); await wait(2300); await role(A, 'caisse'); await aller(A, 'caisse'); await A.fill('#k_id', r2.id); await A.fill('#k_code', r2.code); await A.click('#bCaisseOuvrir'); await A.waitForSelector('#caisseRes .carte'); await wait(500); await A.locator('#caisseRes').screenshot({ path: OUT + 'd_caisse_bloquee.png' });
    await role(A, 'accueil'); await aller(A, 'reception'); await wait(900); await A.screenshot({ path: OUT + 'd_accueil_liste.png' });
    await A.fill('#r_id', id1); await A.fill('#r_code', code1); await A.click('#bRecepOuvrir'); await A.waitForSelector('#bRecepOk'); await wait(500);
    await A.evaluate(i => { const X = window.__spApi, d = X.DB.find(x => x.id === i); d.pieces = ['photo', 'identite', 'naissance', 'nationalite'].map((k, n) => ({ id: 'PJ-demo' + n, type: k, nom: k, mime: 'image/jpeg', taille: 1, at: new Date().toISOString(), par: 'demandeur', demo: true })); X.sauver(); }, id1);
    await A.click('#bRecepOuvrir'); await A.waitForSelector('#bRecepOk'); await wait(500);
    const ck = A.locator('.rv'); for (let i = 0; i < await ck.count(); i++) await ck.nth(i).check(); await wait(300);
    await A.locator('#recepRes').screenshot({ path: OUT + 'd_accueil_fiche.png' });
    await A.click('#bRecepOk'); await A.waitForSelector('#recepRes .alert.vert'); await wait(500); await A.locator('#recepRes .alert.vert').first().screenshot({ path: OUT + 'd_accueil_ok.png' });
    await A.close();
  });

  await essai('à propos', async () => { await aller(D, 'regles'); await wait(700); await D.screenshot({ path: OUT + 'd_apropos.png', fullPage: true }); });
  console.log(echecs.length ? 'ÉCHECS : ' + echecs.join(', ') : 'TOUTES LES CAPTURES FAITES'); console.log(fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length + ' images'); await b.close();
})().catch(e => { console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });
