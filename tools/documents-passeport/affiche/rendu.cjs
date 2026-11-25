const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1620 }, deviceScaleFactor: 2 });
  await p.goto('file:///tmp/affiche/affiche-final.html'); await p.waitForTimeout(1500);
  await p.screenshot({ path: '/tmp/affiche/affiche-2x.png', clip: { x: 0, y: 0, width: 1080, height: 1620 } });
  await b.close(); })();
