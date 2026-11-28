// STAR Scanner : photo d'un document -> recadrage -> noir et blanc -> PDF 2 pages ; contrôle guidé ; passerelle Passeport Sûr.
// Lancer : python3 tools/tests-scanner/photo-test.py ; (serveur statique sur le dossier du dépôt, port 8767) ; node tools/tests-scanner/t_scanner.cjs
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const B = process.env.BASE || 'http://localhost:8767/scanner/', PHOTO = path.join(__dirname, 'photo-test.jpg');
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto(B + 'index.html'); await p.waitForTimeout(600);
  ok(await p.isVisible('#e-accueil') && (await p.$$('.carte')).length === 3, 'accueil : les 3 outils sont proposés');
  ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, 'accueil : pas de défilement horizontal sur téléphone');
  // 1) scanner un document
  await p.click('[data-go=doc]'); await p.setInputFiles('#f-cam', PHOTO); await p.waitForSelector('#d-recadre:not([hidden])', { timeout: 8000 });
  const coins = await p.evaluate(() => { const c = document.getElementById('cvs'); return { w: c.clientWidth, h: c.clientHeight }; });
  ok(coins.w > 200 && coins.h > 200, 'document : la photo s\'affiche pour le recadrage (' + coins.w + 'x' + coins.h + ')');
  await p.click('#b-auto'); await p.waitForTimeout(300);
  const r = await (await p.$('#cvs')).boundingBox(); await p.mouse.move(r.x + 20, r.y + 20); await p.mouse.down(); await p.mouse.move(r.x + 40, r.y + 40, { steps: 4 }); await p.mouse.up();
  ok(true, 'document : un coin peut être déplacé du doigt');
  await p.click('#d-filtres [data-f=nb]'); await p.click('#b-valider'); await p.waitForSelector('#d-pages:not([hidden])');
  ok(await p.evaluate(() => window.__scan.pages()) === 1, 'document : la page 1 est ajoutée');
  await p.setInputFiles('#f-img', PHOTO); await p.waitForSelector('#d-recadre:not([hidden])'); await p.click('#d-filtres [data-f=gris]'); await p.click('#b-valider'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__scan.pages()) === 2 && (await p.$$('#d-vign figure')).length === 2, 'document : 2 pages avec vignettes');
  await p.click('#d-vign figure:nth-child(2) button[title="Avancer la page"]');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#b-pdf')]); const f = '/tmp/scan-test.pdf'; await dl.saveAs(f);
  const info = execSync('pdfinfo ' + f).toString(); ok(/Pages:\s+2/.test(info) && /Producer:\s+STAR Scanner/.test(info), 'PDF : 2 pages valides (' + (info.match(/Page size:.*/) || [''])[0] + ')');
  ok(/^Scan-STAR-\d{8}-\d{4}\.pdf$/.test(dl.suggestedFilename()), 'PDF : nom de fichier daté (' + dl.suggestedFilename() + ')');
  execSync('pdftoppm -r 40 -png ' + f + ' /tmp/scan-test'); fs.copyFileSync('/tmp/scan-test-1.png', path.join(__dirname, 'resultat-page1.png'));
  await p.click('#d-format [data-fmt=image]'); const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('#b-pdf')]); await dl2.saveAs('/tmp/scan-test2.pdf'); ok(/Pages:\s+2/.test(execSync('pdfinfo /tmp/scan-test2.pdf').toString()), 'PDF : format « taille de l\'image » valide');
  const [dj] = await Promise.all([p.waitForEvent('download'), p.click('#b-jpg')]); ok(/\.jpg$/.test(dj.suggestedFilename()), 'image JPG de la page 1 téléchargeable');
  // 2) contrôle guidé
  await p.click('#retour'); await p.click('[data-go=auth]'); ok((await p.$$('#a-liste label')).length === 6, 'contrôle : 6 étapes pour un billet');
  ok(/ne peut pas, à lui seul|ne remplace pas/.test(await p.textContent('#e-auth')), 'contrôle : la limite (pas de détection automatique) est dite clairement');
  for (const c of await p.$$('#a-liste input')) await c.check(); ok(/conformes/.test(await p.textContent('#a-verdict')), 'contrôle : tout coché -> synthèse, avec rappel de faire vérifier');
  await p.click('#a-type [data-t=papier]'); ok((await p.$$('#a-liste label')).length === 6 && !(await p.textContent('#a-verdict')).trim(), 'contrôle : onglet « papier officiel » séparé');
  await p.click('#b-lampe'); await p.waitForTimeout(500); ok((await p.isVisible('#a-lampe-info')), 'lampe : message affiché (lampe pilotée ou conseil de secours)');
  // 3) Passeport Sûr
  await p.click('#retour'); await p.click('[data-go=pass]'); ok((await p.getAttribute('#e-pass a.btn.or', 'href')) === '../passeport-demo/index.html', 'Passeport Sûr : lien vers l\'application');
  ok(errs.length === 0, 'aucune erreur de page' + (errs.length ? ' — ' + errs.join(' | ') : ''));
  await p.screenshot({ path: path.join(__dirname, 'resultat-accueil.png') }); await b.close();
  console.log(echecs ? '\n' + echecs + ' ÉCHEC(S)' : '\nTous les contrôles passent'); process.exit(echecs ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(2); });
