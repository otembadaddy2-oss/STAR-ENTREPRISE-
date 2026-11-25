// Service worker : installation, usage hors connexion, script manquant non remplacé par la page d'accueil.
const { chromium } = require('playwright'); const BASE = 'http://localhost:8766/passeport-demo/'; let ko = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) ko++; };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1000, height: 800 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + 'index.html'); await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.ready.then(() => true), null, { timeout: 15000 }); await p.waitForTimeout(2500);
  ok(await p.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), 'service worker installé');
  const n = await p.evaluate(async () => (await (await caches.open((await caches.keys())[0])).keys()).length); ok(n > 8 && n < 40, 'installation légère : ' + n + ' fichiers gardés au départ');
  await p.evaluate(() => document.querySelector('nav button[data-v="tableau"]').click()); await p.waitForTimeout(2500);   // graphiques : chargés puis gardés
  await c.setOffline(true); await p.reload(); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !!window.__spApi && document.querySelectorAll('#kpisAccueil .kpi').length > 0), 'hors connexion : l’application s’ouvre');
  await p.evaluate(() => document.querySelector('nav button[data-v="tableau"]').click()); await p.waitForTimeout(1800);
  ok(await p.evaluate(() => document.querySelectorAll('#v-tableau canvas').length >= 4 && !!window.Chart), 'hors connexion : le tableau de bord (déjà ouvert une fois) fonctionne');
  const r = await p.evaluate(async () => { try { await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'lib/xlsx.full.min.js?nouveau=' + Date.now(); s.onload = ok; s.onerror = () => ko(new Error('erreur')); document.head.appendChild(s); }); return 'chargé'; } catch (e) { return 'refusé'; } });
  ok(r === 'refusé', 'hors connexion : un fichier jamais ouvert est refusé proprement (pas remplacé par une page HTML)');
  ok(errs.filter(e => /Unexpected token/.test(e)).length === 0, 'aucune erreur « Unexpected token » ' + JSON.stringify(errs));
  console.log(ko ? ko + ' ECHEC(S)' : 'TOUS LES TESTS OK'); await b.close();
})().catch(e => { console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });
