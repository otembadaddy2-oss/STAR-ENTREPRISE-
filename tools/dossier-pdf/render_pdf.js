const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8098/dossier.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const footerTemplate = `
    <div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#8a8f9c;
                padding:0 16mm;display:flex;justify-content:space-between;align-items:center;">
      <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      <span style="color:#a3782e;font-weight:bold;letter-spacing:.04em;">★ Conçu par STAR ENTREPRISE</span>
    </div>`;

  await page.pdf({
    path: '/tmp/claude-0/-home-user-STAR-ENTREPRISE-/715425df-146b-5238-85e4-85639de53306/scratchpad/star_alerte/pdf_doc/STAR_ALERTE_dossier.pdf',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate,
    margin: { top: '0mm', bottom: '10mm', left: '0mm', right: '0mm' },
    preferCSSPageSize: true,
  });

  await browser.close();
  console.log('PDF DONE');
})();
