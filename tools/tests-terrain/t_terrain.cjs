// TERRAIN SÛR : test de bout en bout dans un navigateur de téléphone simulé.
// Lancer : serveur statique à la racine du dépôt (port 8768) puis  node tools/tests-terrain/t_terrain.cjs
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const path = require('path'); const fs = require('fs');
const B = process.env.BASE || 'http://127.0.0.1:8768/terrain-sur/'; const OUT = process.env.OUT || '/tmp/terrain-captures'; fs.mkdirSync(OUT, { recursive: true });
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2, acceptDownloads: true, hasTouch: true, isMobile: true, geolocation: { latitude: -4.2634, longitude: 15.2429, accuracy: 12 }, permissions: ['geolocation'] });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto(B + 'index.html'); await p.waitForTimeout(700);
  ok(await p.isVisible('#e-accueil') && (await p.$$('.carte')).length === 4, 'accueil : 4 outils');
  ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, 'accueil : pas de défilement horizontal');
  await p.screenshot({ path: OUT + '/01-accueil.png' });
  // lecture visuelle des 6 photos d'exemple
  await p.click('nav [data-go=scan]'); await p.waitForTimeout(500);
  for (const ex of ['eau', 'piste', 'boue', 'sable', 'chantier', 'sol-brun']) {
    await p.evaluate(() => { document.getElementById('exemples').style.display = 'flex'; }); await p.click('[data-ex=' + ex + ']'); await p.waitForSelector('#s1b:not([hidden])', { timeout: 8000 });
    const r = await p.evaluate(() => { const a = window.__ts.S().analyse; return { pct: a.pct, obs: a.obs.map(o => o.m.slice(0, 60)), sol: a.solVisible, eau: a.eauBas, rug: a.rugosite, q: a.qualite }; });
    console.log('   ' + ex + ' → ' + JSON.stringify({ veg: r.pct.veg, rouge: r.pct.rouge, brun: r.pct.brun, sable: r.pct.sable, gris: r.pct.gris, eau: r.pct.eau, ciel: r.pct.ciel, sol: r.sol, eauBas: r.eau, rug: r.rug, nett: Math.round(r.q.nettete), lum: r.q.luminosite }) + ' | ' + r.obs.join(' / '));
    if (ex === 'eau') await p.screenshot({ path: OUT + '/02-lecture-photo.png', fullPage: false });
    await p.click('#b-refaire');
  }
  ok(true, 'lecture visuelle exécutée sur les 6 photos');
  // parcours complet : démonstration guidée
  await p.evaluate(() => window.__ts.go('accueil')); await p.click('.hero [data-go=demo]'); await p.waitForSelector('#s1b:not([hidden])', { timeout: 10000 });
  await p.click('#b-suite'); await p.waitForSelector('#questions .q'); ok((await p.$$('#questions .q')).length === 10, 'questionnaire : 10 questions');
  await p.screenshot({ path: OUT + '/03-questions.png' });
  await p.click('#b-calcul'); await p.waitForSelector('#resultat .verdict'); const res = await p.evaluate(() => window.__ts.S().res);
  console.log('   résultat démo : ' + res.niveau.nom + ' ' + res.global + ' ' + JSON.stringify(res.cats));
  ok(res.global >= 55, 'démonstration : terrain détrempé, pente, ravine, sable → risque élevé ou critique (' + res.niveau.nom + ' ' + res.global + ')');
  await p.screenshot({ path: OUT + '/04-resultat.png', fullPage: true });
  ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, 'résultat : pas de défilement horizontal');
  await p.click('#b-sceller'); await p.waitForSelector('#b-pdf'); ok(await p.isVisible('#qr svg'), 'relevé scellé : QR affiché');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#b-pdf')]); const f = '/tmp/terrain-test.pdf'; await dl.saveAs(f); const info = execSync('pdfinfo ' + f).toString();
  ok(/Pages:\s+2/.test(info), 'rapport PDF : 2 pages (' + dl.suggestedFilename() + ')');
  try { execSync('pdftoppm -r 45 -png ' + f + ' ' + OUT + '/rapport'); } catch (e) {}
  // même photo une seconde fois : doit être signalée comme doublon
  await p.click('#b-nouveau'); await p.evaluate(() => { document.getElementById('exemples').style.display = 'flex'; }); await p.click('[data-ex=eau]'); await p.waitForSelector('#s1b:not([hidden])'); await p.click('#b-suite'); await p.click('#b-calcul'); await p.waitForSelector('#resultat .verdict');
  const flags = await p.evaluate(() => window.__ts.S().flags.map(x => x.sev + ':' + x.t)); console.log('   alertes 2e relevé : ' + flags.join(' | '));
  ok(flags.some(x => /déjà été utilisée/.test(x)), 'anti-fraude : la même photo réutilisée est détectée');
  await p.click('#b-sceller');
  // journal, chaîne, falsification
  await p.click('nav [data-go=chantiers]'); await p.waitForTimeout(300); ok(/intacte — 2/.test(await p.textContent('#chaine-etat')), 'journal : chaîne intacte, 2 relevés');
  await p.click('#b-faux'); await p.waitForTimeout(200); ok(/Falsification détectée/.test(await p.textContent('#chaine-etat')), 'journal : falsification détectée après modification cachée');
  await p.screenshot({ path: OUT + '/05-journal.png', fullPage: true });
  // création de chantier (GPS simulé)
  await p.fill('#ch-nom', 'Chantier de test'); await p.fill('#ch-os', '2026-11-01'); await p.click('#b-ch'); await p.waitForTimeout(300); ok(/Chantier de test/.test(await p.textContent('#liste-ch')), 'chantier créé à la position GPS');
  // tableau de bord
  await p.click('nav [data-go=etat]'); await p.waitForTimeout(500); ok((await p.$$('#kpi div')).length === 4, 'État : 4 indicateurs');
  await p.click('#ong-ville button:nth-child(2)'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/06-etat.png', fullPage: true });
  // vérification (ré-initialise le journal sain)
  await p.evaluate(() => { localStorage.removeItem('terrain-sur-journal-v1'); }); await p.click('nav [data-go=accueil]'); await p.click('nav [data-go=scan]'); await p.evaluate(() => { document.getElementById('b-nouveau') && document.getElementById('b-nouveau').click(); }); await p.evaluate(() => { document.getElementById('exemples').style.display = 'flex'; }); await p.click('[data-ex=sable]'); await p.waitForSelector('#s1b:not([hidden])'); await p.click('#b-suite'); await p.click('#b-calcul'); await p.waitForSelector('#b-sceller'); await p.click('#b-sceller');
  const hash = await p.evaluate(() => window.__ts.S().entree.hash); await p.click('nav [data-go=verif]'); await p.fill('#v-code', hash.slice(0, 12)); await p.click('#b-v'); ok(/authentique et intact/.test(await p.textContent('#v-res')), 'vérification : code valide → authentique');
  await p.fill('#v-code', 'deadbeef0000'); await p.click('#b-v'); ok(/introuvable/.test(await p.textContent('#v-res')), 'vérification : code inconnu → introuvable');
  await p.screenshot({ path: OUT + '/07-verif.png' });
  ok(errs.length === 0, 'aucune erreur de page' + (errs.length ? ' — ' + errs.join(' | ') : ''));
  await b.close(); console.log(echecs ? '\n' + echecs + ' ÉCHEC(S)' : '\nTous les contrôles passent'); process.exit(echecs ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(2); });
