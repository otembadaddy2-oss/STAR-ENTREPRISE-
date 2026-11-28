// Enregistre la vidéo de démonstration de CHECK-IN STAR (tablette de réception). Serveur statique port 8768.
const { chromium } = require('playwright'); const fs = require('fs');
const B = 'http://127.0.0.1:8768/hotel-reception/'; const DIR = '/tmp/hotel-video'; fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: DIR, size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage(); const W = ms => p.waitForTimeout(ms);
  await p.goto(B + 'index.html'); await W(3500); await p.click('#b-demo'); await W(21000);
  await p.click('nav [data-go=plan]'); await W(3500); await p.click('.rm.libre'); await W(2500);
  await p.click('nav [data-go=tableau]'); await W(3500); await p.click('nav [data-go=tarifs]'); await W(3500); await p.click('nav [data-go=verif]'); await W(2000);
  await ctx.close(); await b.close();
})().catch(e => { console.log('CRASH', e); process.exit(2); });
