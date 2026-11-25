// Pré-enregistrement par le demandeur + espace Accueil (front office) + blocage de la caisse. Serveur de test sur 8766.
const { chromium } = require('playwright');
const ORIGINE = 'http://localhost:8766/', BASE = ORIGINE + 'passeport-demo/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
const att = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fn(); if (r) return r; } catch (e) { } await new Promise(r => setTimeout(r, 250)); } return null; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = async (w = 1280, h = 900, mobile = false) => { const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile }); const p = await c.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errs.push('CONSOLE ' + m.text()); }); return p; };
  const nav = (p, v) => p.evaluate(x => document.querySelector('nav button[data-v="' + x + '"]').click(), v);

  // ---------- espace de travail (Préfecture) ----------
  const A = await ctx();
  await A.goto(BASE + 'index.html'); await A.waitForTimeout(1200);
  await A.selectOption('#role', 'prefecture'); await A.click('#chipEspace'); await A.waitForSelector('#bCreerEsp');
  await Promise.all([A.waitForNavigation({ timeout: 20000 }).catch(() => { }), A.click('#bCreerEsp')]); await A.waitForTimeout(2000);
  const pub = await att(async () => (await A.evaluate(() => window.__spSync.publique())) || null);
  ok(!!pub, 'espace créé, code public ' + pub);
  // la Préfecture voit le lien de pré-enregistrement dans l'espace Accueil
  await nav(A, 'reception'); await A.waitForSelector('#v-reception.on');
  const lien = await att(async () => { const t = await A.evaluate(() => document.getElementById('lienPre').textContent); return /Copier le lien/.test(t) ? t : null; });
  ok(!!lien, 'l’espace Accueil propose « Copier le lien » du pré-enregistrement');

  // ---------- le demandeur se pré-enregistre sur son téléphone ----------
  const P = await ctx(390, 844, true);
  await P.goto(BASE + 'inscription.html'); await P.waitForTimeout(500);
  ok(await P.isVisible('#erreurLien') && await P.isDisabled('#bEnvoyer'), 'lien sans code d’espace : message clair, envoi impossible');
  await P.goto(BASE + 'inscription.html?esp=' + pub); await P.waitForSelector('#f');
  ok(!(await P.isVisible('#blocAncien')), 'première demande : pas de champ « ancien passeport »');
  await P.check('input[name="type"][value="renouvellement"]'); ok(await P.isVisible('#blocAncien'), 'renouvellement : le champ « ancien passeport » apparaît');
  await P.check('input[name="type"][value="premiere"]');
  await P.click('#bEnvoyer'); ok(await P.isVisible('#msg') && /nom/.test(await P.textContent('#msg')), 'fiche vide : « Il manque… » affiché');
  const larg = await P.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1); ok(larg, 'téléphone : aucun défilement horizontal');
  const NOM = 'KIMBEMBE', PRE = 'Joëlle';
  await P.fill('#nom', NOM.toLowerCase()); await P.fill('#prenoms', PRE); await P.fill('#naiss', '1992-03-14'); await P.selectOption('#sexe', 'F'); await P.fill('#tel', '+242 06 555 12 34'); await P.fill('#pnum', 'cni 889900'); await P.fill('#pexp', '2031-05-01');
  await P.click('#bEnvoyer'); await P.waitForSelector('#vRecu:not([hidden])', { timeout: 10000 });
  const id1 = (await P.textContent('#rNum')).trim(), code1 = (await P.textContent('#rCode')).trim();
  ok(/^BZV-\d{4}-P\d{5}$/.test(id1) && /^[A-Z0-9]{6}$/.test(code1), 'accusé de pré-enregistrement : ' + id1 + ' · code ' + code1);
  ok(await P.locator('#rQr svg').count() === 1, 'le code QR de l’accusé est affiché');
  ok((await P.locator('#rPieces li').count()) === 5, 'liste indicative des pièces à apporter (première demande : 5)');
  ok(/suivi=/.test(await P.getAttribute('#aSuivi', 'href')) && /esp=/.test(await P.getAttribute('#aSuivi', 'href')), 'bouton « Suivre mon dossier » avec le lien du demandeur');
  const [tel] = await Promise.all([P.waitForEvent('download', { timeout: 8000 }).catch(() => null), P.click('#bPng')]); ok(!!tel, 'l’accusé peut être enregistré en image');
  await P.screenshot({ path: '/tmp/t_accueil_recu.png' });

  // ---------- il arrive à l'accueil : le dossier est là, la caisse est bloquée ----------
  const vu = await att(async () => A.evaluate(i => { const d = window.__spApi.DB.find(x => x.id === i); return d ? { n: d.person.nom, pre: !!d.preinscrit, mrz: d.mrzOk } : null; }, id1));
  ok(vu && vu.n === NOM && vu.pre && vu.mrz === true, 'le dossier pré-enregistré arrive chez les postes (nom en majuscules, pièce non marquée « modifiée »)');
  const flags1 = await A.evaluate(i => window.__spApi.flags(window.__spApi.DB.find(x => x.id === i)).map(f => f.k), id1); ok(flags1.length === 0, 'aucune fausse alerte anti-fraude sur un pré-enregistrement normal : [' + flags1 + ']');
  await A.selectOption('#role', 'caisse'); await nav(A, 'caisse'); await A.fill('#k_id', id1); await A.fill('#k_code', code1); await A.click('#bCaisseOuvrir');
  await A.waitForSelector('#caisseRes .carte'); ok(/À vérifier à l’accueil d’abord/.test(await A.textContent('#caisseRes')) && (await A.locator('#bPayer').count()) === 0, 'caisse : « À vérifier à l’accueil d’abord », pas de bouton Encaisser');
  // à l'accueil
  await A.selectOption('#role', 'accueil'); await nav(A, 'reception'); await A.waitForSelector('#v-reception.on');
  ok((await att(async () => (await A.locator('#tbRecep tr[data-rid="' + id1 + '"]').count()) === 1)), 'le pré-enregistré figure dans la liste des personnes attendues');
  await A.fill('#r_id', id1); await A.fill('#r_code', 'ZZZZZZ'); await A.click('#bRecepOuvrir'); ok(/code incorrect/.test(await A.textContent('#recepRes')), 'mauvais code de contrôle refusé');
  await A.fill('#r_code', code1); await A.click('#bRecepOuvrir'); await A.waitForSelector('#bRecepOk');
  ok(await A.isDisabled('#bRecepOk'), 'le bouton « Vérifié » reste grisé tant que les 3 contrôles ne sont pas cochés');
  ok(await A.isDisabled('#rv_nom') || (await A.getAttribute('#rv_nom', 'readonly')) !== null, 'le nom n’est pas modifiable à l’accueil (le code du demandeur en dépend)');
  await A.fill('#rv_prenoms', 'Joëlle Marie'); await A.fill('#rv_pnum', 'CNI889901');
  const ck = A.locator('.rv'); for (let i = 0; i < await ck.count(); i++) await ck.nth(i).check();
  ok(await A.isEnabled('#bRecepOk'), 'les 3 contrôles cochés : « Vérifié » disponible');
  await A.screenshot({ path: '/tmp/t_accueil_poste.png' });
  await A.click('#bRecepOk'); await A.waitForSelector('#recepRes .alert.vert');
  const apres = await A.evaluate(i => { const d = window.__spApi.DB.find(x => x.id === i); return { ok: d.accueil && d.accueil.ok, par: d.accueil && d.accueil.by, pr: d.person.prenoms, pn: d.person.piece.numero, note: d.history[d.history.length - 1].note }; }, id1);
  ok(apres.ok && apres.par === 'Accueil' && apres.pr === 'Joëlle Marie' && apres.pn === 'CNI889901' && /corrigée/.test(apres.note), 'vérification enregistrée avec les corrections : ' + apres.note);
  ok(/Vérifié à l’accueil/.test(await A.textContent('#recepRes')), 'l’accueil voit « Vérifié à l’accueil »');
  ok(/Pièces manquantes/.test(await A.textContent('#recepRes')), 'l’accueil voit les pièces manquantes (le dossier pré-enregistré n’a pas encore de pièces jointes)');
  // l'agent joint les pièces originales (ici : pièces d'essai), puis la caisse peut encaisser
  await A.evaluate(i => { const X = window.__spApi, d = X.DB.find(x => x.id === i); d.pieces = ['photo', 'identite', 'naissance', 'nationalite'].map((k, n) => ({ id: 'PJ-demo' + n, type: k, nom: k, mime: 'image/jpeg', taille: 1, at: new Date().toISOString(), par: 'accueil', demo: true })); X.sauver(); }, id1);
  await A.selectOption('#role', 'caisse'); await nav(A, 'caisse'); await A.fill('#k_id', id1); await A.fill('#k_code', code1); await A.click('#bCaisseOuvrir'); await A.waitForSelector('#bPayer', { timeout: 8000 });
  await A.fill('#k_montant', '50000'); await A.click('#bPayer'); await A.waitForSelector('#tiroir.on', { timeout: 10000 });
  const paye = await A.evaluate(i => { const d = window.__spApi.DB.find(x => x.id === i); return { s: d.status, t: d.ticket, r: d.paiement && d.paiement.recu, rdv: d.rdv && d.rdv.date }; }, id1);
  ok(paye.s === 'paye' && paye.t >= 1 && /^RP-/.test(paye.r) && paye.rdv, 'après vérification : paiement, reçu ' + paye.r + ', numéro d’appel ' + paye.t + ', rendez-vous ' + paye.rdv);
  await A.click('#bFerme');
  // le demandeur voit « vérifié » et son rendez-vous
  const S = await ctx(390, 844, true); await S.goto(BASE + 'index.html?suivi=' + id1 + '&code=' + code1 + '&esp=' + pub); await S.waitForSelector('#resSuivi .carte', { timeout: 15000 });
  ok(/Rendez-vous|rendez-vous/.test(await S.textContent('#resSuivi')), 'le demandeur voit son rendez-vous sur son téléphone');

  // ---------- un écart à l'accueil : la Préfecture est alertée, la caisse reste bloquée ----------
  const r2 = await (await fetch(ORIGINE + 'api/passeport', { method: 'POST', body: JSON.stringify({ op: 'preinscrire', public: pub, dossier: { nom: 'Mavoungou', prenoms: 'Désiré', naissance: '1988-11-02', sexe: 'M', piece: { type: 'CNI', numero: 'CNI445566', expiration: '2030-01-01' }, type: 'premiere', tel: '+242 06 777 88 99' } }) })).json();
  ok(!!r2.id, 'deuxième pré-enregistrement : ' + r2.id);
  await att(async () => A.evaluate(i => !!window.__spApi.DB.find(x => x.id === i), r2.id));
  await A.selectOption('#role', 'accueil'); await nav(A, 'reception'); await A.fill('#r_id', r2.id); await A.fill('#r_code', r2.code); await A.click('#bRecepOuvrir'); await A.waitForSelector('#bRecepEcart');
  await A.selectOption('#rv_motif', 'Pièce suspecte ou falsifiée'); await A.click('#bRecepEcart'); await A.waitForSelector('#recepRes .alert.rouge');
  const fl2 = await A.evaluate(i => window.__spApi.flags(window.__spApi.DB.find(x => x.id === i)).map(f => f.k + ':' + f.n), r2.id); ok(fl2.includes('accueil:rouge'), 'l’écart devient une alerte anti-fraude grave : [' + fl2 + ']');
  await A.selectOption('#role', 'caisse'); await nav(A, 'caisse'); await A.fill('#k_id', r2.id); await A.fill('#k_code', r2.code); await A.click('#bCaisseOuvrir'); await A.waitForSelector('#caisseRes .carte');
  ok((await A.locator('#bPayer').count()) === 0 && /écart/i.test(await A.textContent('#caisseRes')), 'caisse : encaissement bloqué après un écart');
  await A.selectOption('#role', 'prefecture'); await nav(A, 'fraude'); await A.waitForTimeout(500);
  ok(/Écart constaté à l’accueil|Écart à l’accueil|accueil/i.test(await A.textContent('#v-fraude')), 'la Préfecture voit l’écart dans le contrôle anti-fraude');

  // ---------- mode local (sans espace) : l'exemple permet de s'entraîner ----------
  const L = await ctx(); await L.goto(BASE + 'index.html'); await L.waitForTimeout(1000); await L.selectOption('#role', 'accueil'); await nav(L, 'reception');
  ok(/espace partagé/.test(await L.textContent('#lienPre')), 'mode local : le lien explique qu’il faut d’abord créer l’espace');
  await L.click('#bRecepEx'); await L.waitForSelector('#bRecepOk'); const ckl = L.locator('.rv'); for (let i = 0; i < await ckl.count(); i++) await ckl.nth(i).check(); await L.click('#bRecepOk'); await L.waitForSelector('#recepRes .alert.vert');
  await L.selectOption('#role', 'caisse'); await nav(L, 'caisse'); await L.evaluate(() => { const d = window.__spApi.DB.find(x => x.preinscrit); document.getElementById('k_id').value = d.id; document.getElementById('k_code').value = window.__spApi.code(d.id, d.person.nom); }); await L.click('#bCaisseOuvrir'); await L.waitForSelector('#bPayer');
  await L.fill('#k_montant', '25000'); await L.click('#bPayer'); await L.waitForSelector('#tiroir.on'); ok(true, 'mode local : exemple → accueil → caisse → reçu');

  // ---------- visite guidée de l'accueil + installation ----------
  const G = await ctx(); await G.goto(BASE + 'index.html?guide=1'); await G.waitForTimeout(800);
  await G.evaluate(() => localStorage.removeItem('sp_guide_v1')); await G.goto(BASE + 'index.html?guide=1'); await G.waitForTimeout(800);
  await G.selectOption('#role', 'accueil'); await G.waitForTimeout(900);
  // la visite guidée du profil Accueil : au moins 5 étapes, on les parcourt puis on la quitte
  await G.evaluate(() => document.querySelector('#guideInvit [data-p], #guideProfil [data-p="accueil"]') && document.querySelector('#guideProfil [data-p="accueil"]').click()); await G.waitForTimeout(900);
  const etapes = []; for (let i = 0; i < 8 && await G.isVisible('#gSuiv').catch(() => false); i++) { etapes.push((await G.textContent('#guideCarte h3, .guideCarte h3').catch(() => '')) || ''); await G.click('#gSuiv'); await G.waitForTimeout(350); }
  if (await G.isVisible('#gPasser').catch(() => false)) await G.click('#gPasser'); await G.waitForTimeout(300);
  ok(etapes.length >= 4, 'visite guidée de l’Accueil : ' + etapes.length + ' étapes parcourues');
  ok(await G.locator('#onglets button[data-v="reception"]:visible, nav button[data-v="reception"]:visible').count() >= 1 && (await G.locator('nav button[data-v="caisse"]:visible').count()) === 1 && (await G.locator('nav button[data-v="reglages"]:visible').count()) === 0, 'profil Accueil : onglets Réception et Caisse visibles (l’accueil valide le paiement), pas de Réglages');
  const aide = G.locator('#bAide').first(); if (await aide.count()) { await aide.click(); await G.waitForSelector('#aInst', { timeout: 4000 }); await G.click('#aInst'); await G.waitForSelector('#aInstFerme'); const tx = await G.textContent('#guideAide'); ok(/Installer l’application/.test(tx) && /facultative/.test(tx), 'panneau « Installer l’application » avec consignes et mention « facultative »'); } else ok(false, 'bouton Aide introuvable');
  const reg = await G.evaluate(async () => { const r = await fetch('manifest.webmanifest'); const j = await r.json(); return { n: j.icons.length, apple: !!document.querySelector('link[rel="apple-touch-icon"]') }; }); ok(reg.n >= 3 && reg.apple, 'manifeste avec icônes + icône iPhone (apple-touch-icon)');

  ok(errs.length === 0, 'aucune erreur de page ni de console' + (errs.length ? ' : ' + errs.slice(0, 4).join(' | ') : ''));
  await b.close(); console.log(echecs ? '\n' + echecs + ' échec(s)' : '\nTous les contrôles passent'); process.exit(echecs ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
