// CHECK-IN STAR : test de bout en bout (tablette de réception puis téléphone). Serveur statique à la racine du dépôt, port 8768.
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs');
const B = process.env.BASE || 'http://127.0.0.1:8768/hotel-reception/'; const OUT = process.env.OUT || '/tmp/hotel-captures'; fs.mkdirSync(OUT, { recursive: true });
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, acceptDownloads: true });
  await ctx.route('**://wa.me/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa.me</p>' })); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto(B + 'index.html'); await p.waitForTimeout(1500);
  ok((await p.$$('#kpi div')).length === 6, 'tableau : 6 indicateurs'); await p.screenshot({ path: OUT + '/01-tableau.png' });
  const nb = await p.evaluate(() => window.HApp.E().chambres.length); ok(nb === 170, 'l\'hôtel compte 170 chambres');
  // passeport falsifié et expiré : bloqués
  await p.click('nav [data-go=arrivee]'); await p.click('[data-ex=faux]'); await p.waitForSelector('#a1-res .boite'); ok(await p.isDisabled('#a1-suite'), 'passeport falsifié : bloqué'); ok(/chiffres de contrôle/.test(await p.textContent('#a1-res')), 'passeport falsifié : message clair');
  await p.click('[data-ex=expire]'); await p.waitForTimeout(300); ok(await p.isDisabled('#a1-suite') && /expiré/.test(await p.textContent('#a1-res')), 'passeport expiré : bloqué');
  // passeport valide
  await p.click('[data-ex=ok]'); await p.waitForTimeout(300); ok(!(await p.isDisabled('#a1-suite')), 'passeport valide : accepté'); await p.screenshot({ path: OUT + '/02-passeport.png' });
  await p.click('#a1-suite'); await p.waitForSelector('#puces'); await p.click('#puces [data-n="3"]'); await p.fill('#tel', '+242 06 000 00 00'); await p.click('#types [data-ty="business"]'); await p.screenshot({ path: OUT + '/03-sejour.png' });
  await p.click('#a2-suite'); await p.waitForSelector('.chambre-carte'); await p.waitForTimeout(1200);
  const prop = await p.evaluate(() => { const s = window.__h.S(); return { n: s.props.length, ch: s.props[0] && s.props[0].chambre.n, type: s.props[0] && s.props[0].type.id, nuits: s.nuits }; }); console.log('   chambre proposée : ' + JSON.stringify(prop));
  ok(prop.n > 0 && prop.type === 'business' && prop.nuits === 3, 'attribution automatique : chambre Business proposée pour 3 nuits'); await p.screenshot({ path: OUT + '/04-chambre.png' });
  const avant = await p.evaluate(() => window.HApp.E().clients.length); await p.click('#a3-ok'); await p.waitForSelector('.carte-cle .qr svg'); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => window.HApp.E().clients.length) === avant + 1, 'client enregistré automatiquement');
  const rec = await p.evaluate(() => { const c = window.__h.S().client; const r = window.HApp.E().chambres.find(x => x.n === c.chambre); return { etat: c.etat, sej: r.sejours.some(s => s.id === c.id), qr: !!document.querySelector('.qr svg'), id: c.id, sceau: c.sceau }; });
  ok(rec.etat === 'present' && rec.sej, 'chambre marquée occupée dès l\'enregistrement'); await p.screenshot({ path: OUT + '/05-accuse.png', fullPage: true });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#a4-pdf')]); await dl.saveAs('/tmp/hotel-fiche.pdf'); ok(/Pages:\s+2/.test(execSync('pdfinfo /tmp/hotel-fiche.pdf').toString()), 'fiche PDF : 2 pages (' + dl.suggestedFilename() + ')');
  try { execSync('pdftoppm -r 50 -png /tmp/hotel-fiche.pdf ' + OUT + '/fiche'); } catch (e) { }
  const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('#a4-png')]); await dl2.saveAs('/tmp/hotel-accuse.png'); ok(fs.statSync('/tmp/hotel-accuse.png').size > 20000, 'accusé PNG généré (' + dl2.suggestedFilename() + ')');
  const w = await ctx.newPage(); const [pop] = await Promise.all([ctx.waitForEvent('page'), p.click('#a4-wa')]); ok(/wa\.me\/242060000000\?text=/.test(pop.url()) || /wa\.me|whatsapp/.test(pop.url()), 'WhatsApp : message prêt (' + pop.url().slice(0, 40) + '…)'); await pop.close().catch(() => { }); await w.close();
  // même passeport une 2e fois : doublon détecté
  await p.click('#a4-nouveau'); await p.click('[data-ex=ok]'); await p.waitForTimeout(300); ok(/déjà en séjour/.test(await p.textContent('#a1-res')), 'anti-fraude : même passeport déjà en séjour détecté');
  // vérification de l'accusé
  await p.click('nav [data-go=verif]'); await p.fill('#v-code', rec.id); await p.click('#b-v'); ok(/Séjour valide/.test(await p.textContent('#v-res')), 'vérification : accusé valide'); await p.fill('#v-code', 'HS1|' + rec.id + '|999|2026-01-01|2026-01-02|000000000000'); await p.click('#b-v'); ok(/altéré/.test(await p.textContent('#v-res')), 'vérification : QR falsifié détecté'); await p.fill('#v-code', 'SJ-INCONNU'); await p.click('#b-v'); ok(/inconnu/.test(await p.textContent('#v-res')), 'vérification : code inconnu refusé');
  // plan, départ, journal
  await p.click('nav [data-go=plan]'); await p.waitForTimeout(1200); ok((await p.$$('.rm')).length === 170, 'plan : 170 chambres affichées'); await p.click('[data-r="' + prop.ch + '"]'); await p.waitForSelector('#plan-det [data-act=depart]'); await p.screenshot({ path: OUT + '/06-plan.png' });
  await p.click('#plan-det [data-act=depart]'); await p.waitForTimeout(400); ok(await p.evaluate((n) => window.HApp.etatChambre(window.HApp.E().chambres.find(x => x.n === n)) === 'sale', prop.ch), 'départ : la chambre passe à nettoyer');
  await p.click('nav [data-go=tableau]'); await p.waitForTimeout(500); ok(/Chaîne intacte — 2/.test(await p.textContent('#chaine-etat')), 'journal : chaîne intacte, 2 évènements (arrivée + départ)');
  await p.click('nav [data-go=tarifs]'); await p.fill('#taux', '600'); await p.click('#b-sauve'); await p.click('nav [data-go=sejours]'); await p.waitForTimeout(300); ok((await p.$$('#liste .ligne')).length > 20, 'séjours : liste des clients');
  await p.screenshot({ path: OUT + '/07-sejours.png' }); await p.click('nav [data-go=tarifs]'); await p.screenshot({ path: OUT + '/08-tarifs.png' });
  // téléphone
  const m = await b.newContext({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const q = await m.newPage(); q.on('pageerror', e => errs.push('MOB ' + e.message)); await q.goto(B + 'index.html'); await q.waitForTimeout(1200);
  ok(await q.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, 'téléphone : pas de défilement horizontal'); await q.screenshot({ path: OUT + '/09-mobile-tableau.png' });
  await q.click('nav [data-go=arrivee]'); await q.click('[data-ex=ok]'); await q.waitForTimeout(300); await q.click('#a1-suite'); await q.click('#a2-suite'); await q.waitForSelector('#a3-ok'); await q.click('#a3-ok'); await q.waitForSelector('.carte-cle .qr svg'); await q.waitForTimeout(1200); await q.screenshot({ path: OUT + '/10-mobile-accuse.png' }); ok(await q.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, 'téléphone : accusé sans défilement horizontal');
  ok(errs.length === 0, 'aucune erreur de page' + (errs.length ? ' — ' + errs.join(' | ') : ''));
  await b.close(); console.log(echecs ? '\n' + echecs + ' ÉCHEC(S)' : '\nTous les contrôles passent'); process.exit(echecs ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(2); });
