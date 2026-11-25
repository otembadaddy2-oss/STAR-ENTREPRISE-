const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8766/passeport-demo/index.html'); await p.waitForTimeout(1500);
  console.log('chip:', await p.textContent('#chipEspace'));
  const vues = await p.$$eval('nav button[data-v]', bs => bs.map(x => x.dataset.v));
  console.log('vues:', vues.join(','));
  for (const v of ['caisse', 'file', 'reglages', 'suivi', 'guichet']) {
    const ok = await p.evaluate(v => { const b = document.querySelector('nav button[data-v="' + v + '"]'); if (!b) return 'no-btn'; b.click(); return 'click'; }, v);
    await p.waitForTimeout(400);
    console.log(v, ok);
  }
  // Mode préfecture pour réglages
  await p.screenshot({ path: __dirname + '/s_smoke.png' });
  const e = await c.newPage(); const errs2 = []; e.on('pageerror', x => errs2.push(x.message));
  await e.goto('http://localhost:8766/passeport-demo/ecran.html'); await e.waitForTimeout(600);
  console.log('ecran demarrage visible:', await e.isVisible('#demarrage'));
  await e.click('#bLocal'); await e.waitForTimeout(800);
  console.log('ecran local num:', await e.textContent('#num'), '| etat:', await e.textContent('#etat'));
  console.log('ERRS:', JSON.stringify(errs), JSON.stringify(errs2));
  await b.close();
})();
