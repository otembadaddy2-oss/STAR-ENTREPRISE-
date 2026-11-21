// Test navigateur de la page decouvrir/ : erreurs, intro, rideau, défilement, formulaire, captures téléphone.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dossier = process.argv[2] || (__dirname + '/../decouvrir'); const out = process.argv[3];
  const nav = await chromium.launch(); const ctx = await nav.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const err = []; const rate = [];
  p.on('pageerror', e => err.push('JS: ' + e.message)); p.on('console', m => { if (m.type() === 'error') err.push('console: ' + m.text()); });
  p.on('requestfailed', r => rate.push(r.url().slice(0, 90)));
  await p.goto('file://' + path.resolve(dossier) + '/index.html'); await p.waitForTimeout(900);
  const shot = async n => p.screenshot({ path: out + '/' + n + '.png' });
  await shot('01-intro');
  await p.click('#entrer'); await p.waitForTimeout(500); await shot('02-rideau'); await p.waitForTimeout(1800); await shot('03-hero');
  const intro = await p.evaluate(() => getComputedStyle(document.getElementById('intro')).display); console.log('intro masquée:', intro === 'none');
  // défilement section par section
  const ids = ['manifeste', 'fondateur', 'filiales', 'komyo', 'energie', 'tech', 'culture', 'creations', 'contact'];
  let k = 4;
  for (const id of ids) { await p.evaluate(i => document.getElementById(i).scrollIntoView({ behavior: 'instant' }), id); await p.waitForTimeout(1300); await p.evaluate(() => window.scrollBy(0, 80)); await p.waitForTimeout(500); await shot(String(k++).padStart(2, '0') + '-' + id); }
  // filiales : défile jusqu'à la fin
  await p.evaluate(() => document.getElementById('filiales').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(500);
  for (const i of [5, 16, 20]) { await p.evaluate(n => { const s = document.getElementById('fstrip'); const c = s.children[n]; s.scrollTo({ left: c.offsetLeft - (s.clientWidth - c.offsetWidth) / 2, behavior: 'instant' }) }, i); await p.waitForTimeout(900); await shot('f-' + String(i + 1).padStart(2, '0')); }
  const nb = await p.evaluate(() => document.querySelectorAll('.fcard').length); console.log('cartes filiales:', nb);
  // images cassées
  const casse = await p.evaluate(() => [...document.images].filter(i => i.complete === false || (i.complete && i.naturalWidth === 0 && i.loading !== 'lazy')).map(i => i.src.slice(-40)));
  await p.evaluate(() => [...document.images].forEach(i => i.loading = 'eager')); await p.waitForTimeout(2500);
  const casse2 = await p.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.slice(-40))); console.log('images cassées:', casse2.length, casse2.slice(0, 5));
  // débordement horizontal
  const deb = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); console.log('débordement horizontal (px):', deb);
  // formulaire : validation
  await p.evaluate(() => document.getElementById('cv').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(500);
  await p.click('#cvBtn'); console.log('msg vide:', await p.textContent('#cvMsg'));
  await p.fill('#cNom', 'Test'); await p.fill('#cTel', '060000000'); await p.click('#cvBtn'); console.log('msg sans CV:', await p.textContent('#cvMsg'));
  const fs = require('fs'); fs.writeFileSync('/tmp/cv-test.pdf', '%PDF-1.4 test'); await p.setInputFiles('#cCv', '/tmp/cv-test.pdf');
  const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 3000 }).catch(() => null), p.click('#cvBtn')]);
  console.log('repli WhatsApp ouvert:', !!popup && /wa\.me\/242066565050/.test(popup.url()), '|', (await p.textContent('#cvMsg')).slice(0, 60));
  await shot('99-formulaire');
  console.log('erreurs:', err.length ? err : 'aucune'); console.log('requêtes échouées:', rate.length ? rate.slice(0, 5) : 'aucune');
  await nav.close();
})();
