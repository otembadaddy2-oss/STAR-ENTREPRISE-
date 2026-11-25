const { chromium } = require('playwright');
const BASE = 'http://localhost:8766/passeport-demo/';
const SP = __dirname + '/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
const att = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fn(); if (r) return r; } catch (e) { } await new Promise(r => setTimeout(r, 250)); } return null; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = async (w = 1280, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FAILED|40[0-9]|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); }); return p; };
  const A = await ctx();
  await A.goto(BASE + 'index.html'); await A.waitForTimeout(1200);
  await A.selectOption('#role', 'prefecture');
  await A.click('#chipEspace'); await A.waitForSelector('#bCreerEsp');
  await Promise.all([A.waitForNavigation({ timeout: 20000 }).catch(() => { }), A.click('#bCreerEsp')]); await A.waitForTimeout(2000);
  const code = await A.evaluate(() => JSON.parse(localStorage.getItem('sp_espace_v1')).code);
  const pub = await att(async () => { const v = await A.evaluate(() => window.__spSync.publique()); return v || null; });
  ok(!!pub, 'espace ' + code + ' · code public ' + pub);
  // un dossier incomplet (exemple de la caisse), vu côté préfecture
  await A.selectOption('#role', 'caisse'); await A.evaluate(() => document.querySelector('nav button[data-v="caisse"]').click());
  await A.click('#bScanEx2'); await A.waitForSelector('#caisseRes .carte', { timeout: 6000 });
  const id = await A.inputValue('#k_id');
  const cc = await A.evaluate(i => { const X = window.__spApi, d = X.DB.find(x => x.id === i); return { code: X.code(d.id, d.person.nom), manq: X.manquantes(d).map(r => r[0]), nom: d.person.nom, naiss: d.person.naissance, piece: d.person.piece.numero }; }, id);
  console.log('dossier incomplet', id, JSON.stringify(cc));
  ok(cc.manq.length > 0, 'le dossier ' + id + ' est incomplet : manque ' + cc.manq.join(', '));
  const lien = BASE + 'index.html?suivi=' + id + '&code=' + cc.code + '&esp=' + pub;

  // ---------- le demandeur ouvre le lien reçu par WhatsApp ----------
  const E = await ctx(400, 800);
  await E.goto(lien); await E.waitForTimeout(2500);
  const txt = await E.textContent('#resSuivi');
  ok(/Il manque/.test(txt), 'le demandeur voit ce qu’il manque');
  ok((await E.$$('#onglets button')).length > 0 && (await E.$$eval('#onglets button', bs => bs.filter(x => x.offsetParent !== null).length)) === 1, 'le demandeur ne voit QUE l’onglet de suivi');
  const spy = await E.evaluate(() => { const d = window.__spApi.DB[0]; return { n: window.__spApi.DB.length, naiss: d.person.naissance, piece: d.person.piece.numero, hist: (d.history[0] || {}).by }; });
  ok(spy.n === 1 && !spy.naiss && !spy.piece, 'données minimales côté demandeur (1 dossier, pas de n° de pièce ni date de naissance) : ' + JSON.stringify(spy));
  await E.screenshot({ path: SP + 's_citoyen.png', fullPage: true });
  // envoi d'une pièce
  const k = cc.manq[0];
  await E.click('#resSuivi [data-pj="fichier"][data-k="' + k + '"]'); await E.setInputFiles('#pjFichier', SP + 'visage-test.png'); await E.waitForTimeout(1500);
  const restant = await E.evaluate(() => { const X = window.__spApi; return X.manquantes(X.DB[0]).length; });
  ok(restant === cc.manq.length - 1, 'pièce « ' + k + ' » envoyée par le demandeur (reste ' + restant + ')');
  // la préfecture voit la pièce arriver
  const vue = await att(async () => { const n = await A.evaluate(i => { const d = window.__spApi.DB.find(x => x.id === i); return (d.pieces || []).filter(p => p.type === 'identite' || p.type === 'photo' || p.type === 'naissance' || p.type === 'nationalite' || p.type === 'ancien' || p.type === 'domicile').length; }, id); return n; }, 9000);
  const mq = await att(async () => { const m = await A.evaluate(i => { const X = window.__spApi; return X.manquantes(X.DB.find(x => x.id === i)).length; }, id); return m === cc.manq.length - 1 ? true : null; }, 9000);
  ok(!!mq, 'la caisse/préfecture voit la pièce arriver (manquantes ' + (cc.manq.length - 1) + ')');
  // la pièce est téléchargeable côté personnel
  const idPj = await A.evaluate(i => { const d = window.__spApi.DB.find(x => x.id === i); const p = (d.pieces || []).filter(x => !x.demo).pop(); return p && p.id; }, id);
  const rep = await A.evaluate(async ([c, pid]) => { const r = await fetch('/api/passeport-piece?espace=' + c + '&id=' + pid); return [r.status, r.headers.get('content-type'), (await r.blob()).size]; }, [code, idPj]);
  ok(rep[0] === 200 && rep[2] > 100, 'la pièce est lisible par le personnel : ' + JSON.stringify(rep));

  // ---------- accès refusés ----------
  const F = await ctx(400, 800);
  await F.goto(BASE + 'index.html?suivi=' + id + '&code=ZZZZZZ&esp=' + pub); await F.waitForTimeout(2000);
  ok(/Aucun dossier|introuvable|incorrect/i.test(await F.textContent('#resSuivi')), 'mauvais code refusé : ' + (await F.textContent('#resSuivi')).replace(/\s+/g, ' ').slice(0, 80));
  const refus = await F.evaluate(async ([pb, i, pid]) => { const a = await fetch('/api/passeport-piece?public=' + pb + '&dossier=' + i + '&code=ZZZZZZ&id=' + pid); const c = await fetch('/api/passeport?op=sync&espace=' + pb + '&since=0'); return [a.status, c.status]; }, [pub, id, idPj]);
  ok(refus[0] === 403 && refus[1] === 404, 'pièce refusée (403) et code public inutilisable pour lire la liste complète (404) : ' + JSON.stringify(refus));

  // ---------- paiement du dossier complété puis suivi demandeur : rendez-vous ----------
  await A.evaluate(() => document.querySelector('nav button[data-v="caisse"]').click());
  // compléter les autres pièces côté caisse (au besoin)
  const manq2 = await A.evaluate(i => { const X = window.__spApi; return X.manquantes(X.DB.find(x => x.id === i)).map(r => r[0]); }, id);
  for (const kk of manq2) { await A.click('#k_id', { force: true }).catch(() => { }); await A.fill('#k_id', id); await A.fill('#k_code', cc.code); await A.click('#bCaisseOuvrir'); await A.waitForTimeout(400); await A.click('#caisseRes [data-pj="fichier"][data-k="' + kk + '"]'); await A.setInputFiles('#pjFichier', SP + 'visage-test.png'); await A.waitForTimeout(1200); }
  await A.fill('#k_id', id); await A.fill('#k_code', cc.code); await A.click('#bCaisseOuvrir'); await A.waitForSelector('#k_montant', { timeout: 6000 });
  await A.click('#bPayer'); await A.waitForSelector('.recu', { timeout: 10000 });
  await A.click('#bFerme');
  const rdv = await att(async () => { const t = await E.textContent('#resSuivi'); return /Rendez-vous d’enrôlement/.test(t) ? t : null; }, 12000);
  ok(!!rdv, 'le demandeur voit son rendez-vous sans recharger : ' + (rdv || '').replace(/\s+/g, ' ').slice(0, 140));
  await E.screenshot({ path: SP + 's_citoyen2.png', fullPage: true });
  console.log('ERREURS JS :', JSON.stringify(errs)); ok(errs.length === 0, 'aucune erreur JavaScript');
  console.log(echecs ? echecs + ' ECHEC(S)' : 'TOUS LES TESTS OK'); await b.close();
})().catch(e => { console.log('CRASH', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
