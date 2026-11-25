const { chromium } = require('playwright');
const BASE = 'http://localhost:8766/passeport-demo/index.html';
const SP = __dirname + '/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (w, h, extra = {}) => { const c = await b.newContext(Object.assign({ viewport: { width: w, height: h } }, extra)); const p = await c.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); }); return p; };
  const geo = p => p.evaluate(() => { const c = document.getElementById('guideCarte'), s = document.getElementById('guideSpot'); if (!c) return null; const r = c.getBoundingClientRect(), sr = s.getBoundingClientRect(), plein = s.classList.contains('plein'); const st = window.__spGuide.etat(); return { st, plein, card: [r.left, r.top, r.right, r.bottom].map(Math.round), spot: [sr.left, sr.top, sr.right, sr.bottom].map(Math.round), vw: innerWidth, vh: innerHeight, titre: document.getElementById('guideTitre').textContent, hscroll: document.documentElement.scrollWidth - innerWidth }; });
  const parcours = async (p, nom, desktop) => {
    let n = 0, pb = 0; const vus = [];
    for (let i = 0; i < 12; i++) {
      await wait(800); const g = await geo(p); if (!g) break; vus.push(g.titre);
      const dansEcran = g.card[0] >= -1 && g.card[2] <= g.vw + 1 && g.card[1] >= -1 && g.card[3] <= g.vh + 1;
      if (!dansEcran) { pb++; console.log('  carte hors écran', nom, JSON.stringify(g)); }
      if (desktop && !g.plein) { const [cl, ct, cr, cb] = g.card, [sl, st, sr, sb] = g.spot; const chevauche = cl < sr - 2 && cr > sl + 2 && ct < sb - 2 && cb > st + 2; if (chevauche && (sb - st) < g.vh * 0.5) { pb++; console.log('  la carte cache la cible', nom, g.titre, JSON.stringify(g)); } }
      if (g.hscroll > 1) { pb++; console.log('  défilement horizontal', g.hscroll); }
      n++; if (g.st.i === g.st.n - 1) { await p.click('#gSuiv'); break; } await p.click('#gSuiv');
    }
    ok(pb === 0 && n >= 4, nom + ' : ' + n + ' étapes, toutes dans l’écran sans cacher la cible [' + vus.join(' › ') + ']');
    ok(await p.evaluate(() => !document.getElementById('guideCarte') && !document.getElementById('guideSpot') && !document.getElementById('guideVoile')), nom + ' : tout est nettoyé à la fin');
  };

  // ============ 1) premier lancement (ordinateur) ============
  const D = await mk(1280, 860);
  await D.goto(BASE + '?guide=1'); await D.waitForSelector('#guideProfil', { timeout: 8000 });
  ok(true, 'premier lancement : le choix du profil s’affiche tout seul');
  ok((await D.$$('#guideProfil [data-p]')).length === 5, '5 profils proposés');
  await D.screenshot({ path: SP + 'g_bienvenue.png' });
  await D.click('#guideProfil [data-p="caisse"]'); await wait(900);
  ok((await D.inputValue('#role')) === 'caisse', 'le choix « Caisse » règle le profil');
  ok(await D.evaluate(() => document.querySelector('.vue.on').id) === 'v-caisse', 'et ouvre la page Caisse');
  ok(!!(await geo(D)), 'la visite guidée de la caisse démarre');
  await D.screenshot({ path: SP + 'g_caisse1.png' });
  await parcours(D, 'Caisse (ordinateur)', true);
  ok((await D.evaluate(() => JSON.parse(localStorage.sp_guide_v1).faits.caisse)) === 'fait', 'visite « caisse » mémorisée comme faite');
  // clic possible après la visite
  await D.click('#bScanEx'); await D.waitForSelector('#caisseRes .carte'); ok(true, 'après la visite, l’application reste utilisable');
  // recharge : pas de nouvelle invitation pour ce profil
  await D.reload(); await wait(2200); ok(!(await D.$('#guideProfil')) && !(await D.$('#guideInvit')) && (await D.inputValue('#role')) === 'caisse', 'au rechargement : profil Caisse retrouvé, aucune invitation répétée');

  // ============ 2) changement de profil → invitation ============
  await D.selectOption('#role', 'porte'); await D.waitForSelector('#guideInvit', { timeout: 4000 }); ok(true, 'changer de profil propose la visite de ce profil');
  await D.screenshot({ path: SP + 'g_invit.png' });
  await D.click('#iOui'); await wait(900);
  await parcours(D, 'Porte (ordinateur)', true);
  await D.selectOption('#role', 'prefecture'); await D.waitForSelector('#guideInvit'); await D.click('#iNon'); await wait(300);
  ok(!(await D.$('#guideInvit')) && (await D.evaluate(() => JSON.parse(localStorage.sp_guide_v1).faits.prefecture)) === 'passe', '« Non merci » ferme et mémorise');
  // visite préfecture depuis « Commencez ici »
  await D.evaluate(() => window.__spApi.aller('accueil')); await wait(700);
  ok(/Préfecture/.test(await D.textContent('#commence')), 'carte « Commencez ici » adaptée au profil Préfecture');
  await D.click('#cVis'); await wait(500); await parcours(D, 'Préfecture (ordinateur)', true);
  await D.selectOption('#role', 'ministere'); await D.waitForSelector('#guideInvit'); await D.click('#iOui'); await wait(900); await parcours(D, 'Ministère (ordinateur)', true);
  await D.selectOption('#role', 'agent'); await D.waitForSelector('#guideInvit'); await D.click('#iOui'); await wait(900); await parcours(D, 'Agent (ordinateur)', true);
  await D.screenshot({ path: SP + 'g_fin.png' });

  // ============ 3) clavier, Échap, aide, FAQ ============
  await D.evaluate(() => window.__spGuide.visite('agent')); await wait(700);
  await D.keyboard.press('ArrowRight'); await wait(300); ok((await geo(D)).st.i === 1, 'flèche droite : étape suivante');
  await D.keyboard.press('ArrowLeft'); await wait(300); ok((await geo(D)).st.i === 0, 'flèche gauche : étape précédente');
  await D.keyboard.press('Tab'); await D.keyboard.press('Tab'); await D.keyboard.press('Tab');
  ok(await D.evaluate(() => document.getElementById('guideCarte').contains(document.activeElement)), 'le clavier reste dans la bulle (Tab)');
  await D.keyboard.press('Escape'); await wait(300); ok(!(await geo(D)), 'Échap quitte la visite');
  await D.click('#bAide'); await D.waitForSelector('#guideAide'); ok(true, 'bouton ❓ Aide : menu');
  await D.click('#aFaq'); await D.waitForSelector('#guideFaqBox'); ok((await D.$$('#guideFaqBox details')).length === 9, 'FAQ : 9 questions');
  await D.click('#guideFaqBox summary >> nth=0'); await D.screenshot({ path: SP + 'g_faq.png' }); await D.click('#fFerme');
  await D.click('#bAide'); await D.click('#aProf'); await D.waitForSelector('#guideProfil'); ok(true, 'Aide › changer de profil rouvre le choix'); await D.keyboard.press('Escape'); await wait(300);
  ok(!(await D.$('#guideProfil')), 'Échap ferme le choix du profil');

  // ============ 4) téléphone ============
  const M = await mk(390, 800, { deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await M.goto(BASE + '?guide=1'); await M.waitForSelector('#guideProfil', { timeout: 8000 });
  const bw = await M.evaluate(() => { const r = document.getElementById('guideProfil').getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom, innerWidth, innerHeight, document.documentElement.scrollWidth]; });
  ok(bw[0] >= 0 && bw[1] <= bw[4] + 1 && bw[6] <= bw[4] + 1, 'téléphone : le choix du profil tient dans l’écran ' + JSON.stringify(bw));
  await M.screenshot({ path: SP + 'g_tel_bienvenue.png' });
  await M.tap('#guideProfil [data-p="agent"]'); await wait(1200); await M.screenshot({ path: SP + 'g_tel_agent1.png' });
  await parcours(M, 'Agent (téléphone)', false);
  for (const r of ['caisse', 'porte', 'prefecture', 'ministere']) { await M.selectOption('#role', r); await M.waitForSelector('#guideInvit', { timeout: 4000 }); await M.tap('#iOui'); await wait(900); if (r === 'caisse') await M.screenshot({ path: SP + 'g_tel_caisse2.png' }); await parcours(M, r + ' (téléphone)', false); }
  console.log('ERREURS JS :', JSON.stringify(errs)); ok(errs.length === 0, 'aucune erreur JavaScript');
  console.log(echecs ? echecs + ' ECHEC(S)' : 'TOUS LES TESTS OK'); await b.close();
})().catch(e => { console.log('CRASH', e.message.split('\n').slice(0, 5).join(' | ')); process.exit(1); });
