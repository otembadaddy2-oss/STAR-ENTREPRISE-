// Enregistre une vidéo de démonstration de TERRAIN SÛR (téléphone simulé). Serveur statique port 8768.
const { chromium } = require('playwright'); const fs = require('fs');
const B = 'http://127.0.0.1:8768/terrain-sur/'; const DIR = '/tmp/terrain-video'; fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, recordVideo: { dir: DIR, size: { width: 390, height: 780 } }, hasTouch: true, isMobile: true, geolocation: { latitude: -4.2634, longitude: 15.2429, accuracy: 10 }, permissions: ['geolocation'] });
  const p = await ctx.newPage(); const W = ms => p.waitForTimeout(ms);
  const defiler = async (y, ms) => { await p.evaluate(([yy]) => window.scrollTo({ top: yy, behavior: 'smooth' }), [y]); await W(ms); };
  await p.goto(B + 'index.html'); await W(2500);
  await p.click('.hero [data-go=demo]'); await p.waitForSelector('#s1b:not([hidden])'); await W(2800); await defiler(300, 1800);
  await p.click('#b-suite'); await W(1200); await defiler(500, 1500); await defiler(1100, 1500); await defiler(1800, 1500);
  await p.click('#b-calcul'); await p.waitForSelector('#resultat .verdict'); await W(2800); await defiler(500, 1800); await defiler(1100, 1800); await defiler(2000, 1800); await defiler(3400, 1500);
  await p.click('#b-sceller'); await W(2200); await defiler(0, 1200);
  await p.click('nav [data-go=chantiers]'); await W(1800); await p.click('#b-faux'); await W(2600);
  await p.click('nav [data-go=etat]'); await W(1500); await p.click('#ong-ville button:nth-child(2)'); await W(2000); await defiler(500, 2200); await defiler(900, 2200);
  await p.click('nav [data-go=verif]'); await W(1800);
  await ctx.close(); await b.close();
})().catch(e => { console.log('CRASH', e); process.exit(2); });
