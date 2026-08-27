const { chromium, devices } = require('playwright');
const fs = require('fs');

const OUT = '/tmp/claude-0/-home-user-STAR-ENTREPRISE-/715425df-146b-5238-85e4-85639de53306/scratchpad/star_alerte/pdf_shots';
fs.mkdirSync(OUT, { recursive: true });

async function clean(page) {
  await page.evaluate(() => {
    const t = document.getElementById('toastWrap');
    if (t) t.innerHTML = '';
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(150);
}

(async () => {
  const browser = await chromium.launch({
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    deviceScaleFactor: 3,
    permissions: ['camera', 'microphone', 'geolocation'],
    geolocation: { latitude: -4.2634, longitude: 15.2429 }, // Brazzaville
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

  await page.goto('http://localhost:8099/star-alerte/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2300);
  await page.screenshot({ path: `${OUT}/accueil_top.png` });

  await page.evaluate(() => window.scrollTo(0, 950));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/accueil_incidents.png` });

  await page.evaluate(() => window.scrollTo(0, 2050));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/accueil_services.png` });

  // ---- Signaler flow, filled realistically ----
  await page.click('.nav-fab');
  await page.waitForTimeout(300);
  await clean(page);
  await page.screenshot({ path: `${OUT}/signaler_step1.png` });

  await page.click('.type-chip[data-type="accident"]');
  await page.waitForTimeout(200);
  await page.click('#wizNext');
  await page.waitForTimeout(300);

  // real voice recording via fake device
  await page.click('#micBtn');
  await page.waitForTimeout(1800);
  await page.click('#micBtn');
  await page.waitForTimeout(400);

  await page.fill('#descInput', "Accident entre deux véhicules au PK 45 de la RN1, un véhicule immobilisé sur la voie, une personne légèrement blessée. Circulation ralentie.");
  await clean(page);
  await page.screenshot({ path: `${OUT}/signaler_step2.png` });

  await page.click('#wizNext');
  await page.waitForTimeout(300);

  // real geolocation
  await page.click('#btnGeoloc');
  await page.waitForTimeout(600);
  await clean(page);
  await page.screenshot({ path: `${OUT}/signaler_step3.png` });

  await page.click('#wizNext');
  await page.waitForTimeout(400);
  await clean(page);
  await page.screenshot({ path: `${OUT}/signaler_step4.png` });

  // ---- Urgences ----
  await page.click('.nav-btn[data-screen="urgences"]');
  await page.waitForTimeout(300);
  await clean(page);
  await page.screenshot({ path: `${OUT}/urgences.png` });

  // ---- Historique (after saving the draft above) ----
  await page.click('.nav-btn[data-screen="signaler"]');
  await page.waitForTimeout(200);
  await page.click('.type-chip[data-type="incendie"]');
  await page.click('#wizNext'); // step2
  await page.waitForTimeout(200);
  await page.click('#wizNext'); // step3
  await page.waitForTimeout(200);
  await page.click('#wizNext'); // step4
  await page.waitForTimeout(300);
  await page.click('#btnSaveDraft');
  await page.waitForTimeout(500);
  await clean(page);
  await page.screenshot({ path: `${OUT}/historique.png` });

  await browser.close();
  console.log('DONE');
})();
