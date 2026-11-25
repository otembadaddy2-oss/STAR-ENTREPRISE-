const { chromium } = require('playwright');
const SP = __dirname + '/';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8766/passeport-demo/index.html'); await p.waitForTimeout(1500);
  await p.click('nav button[data-v="tableau"]'); await p.waitForTimeout(1200);
  await p.screenshot({ path: SP + 'v_repos.png' });
  await p.click('nav button[data-v="dossiers"]'); await p.waitForTimeout(130);
  await p.screenshot({ path: SP + 'v_milieu1.png' });
  await p.waitForTimeout(160); await p.screenshot({ path: SP + 'v_milieu2.png' });
  await p.waitForTimeout(900);
  const etat = await p.evaluate(() => ({ on: document.querySelectorAll('.vue.on').length, sortie: document.querySelectorAll('.vue.sortie').length, stagger: document.querySelectorAll('.vue.stagger').length, verre: document.getElementById('verre') && getComputedStyle(document.getElementById('verre')).opacity }));
  console.log('après transition :', JSON.stringify(etat));
  // navigation rapide : plusieurs clics enchaînés
  for (const v of ['guichet', 'file', 'dossiers', 'accueil', 'tableau']) { await p.click('nav button[data-v="' + v + '"]'); await p.waitForTimeout(60); }
  await p.waitForTimeout(1200);
  console.log('après navigation rapide :', JSON.stringify(await p.evaluate(() => ({ on: [...document.querySelectorAll('.vue.on')].map(x => x.id), sortie: document.querySelectorAll('.vue.sortie').length, stagger: document.querySelectorAll('.vue.stagger').length }))));
  // bouton retour du navigateur
  await p.goBack(); await p.waitForTimeout(700); console.log('retour navigateur →', await p.evaluate(() => document.querySelector('.vue.on').id));
  // mouvement réduit
  const c2 = await b.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' }); const q = await c2.newPage(); await q.goto('http://localhost:8766/passeport-demo/index.html'); await q.waitForTimeout(800);
  await q.click('nav button[data-v="dossiers"]'); await q.waitForTimeout(100);
  console.log('mouvement réduit :', JSON.stringify(await q.evaluate(() => ({ sortie: document.querySelectorAll('.vue.sortie').length, verre: !!document.getElementById('verre') && getComputedStyle(document.getElementById('verre')).display }))));
  // téléphone
  const m = await (await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 })).newPage(); await m.goto('http://localhost:8766/passeport-demo/index.html'); await m.waitForTimeout(1200);
  await m.click('nav button[data-v="tableau"]'); await m.waitForTimeout(1300); await m.screenshot({ path: SP + 'v_tel.png' });
  console.log('scrollW tel', await m.evaluate(() => document.documentElement.scrollWidth), 'ERREURS', JSON.stringify(errs)); await b.close();
})();
