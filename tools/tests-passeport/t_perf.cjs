// Mesure de fluidité : téléphone modeste simulé (processeur ralenti ×4, réseau 4G). Usage : NODE_PATH=$(npm root -g) node t_perf.cjs [ralentissement=4]
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8766/passeport-demo/index.html'; const RALENTI = Number(process.argv[2]) || 4;
(async () => {
  const b = await chromium.launch(); const res = {};
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 170, downloadThroughput: 9 * 1024 * 1024 / 8, uploadThroughput: 3 * 1024 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RALENTI });
  await p.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true }); } catch (e) { } });
  const t0 = Date.now(); await p.goto(BASE, { waitUntil: 'load' }); if (process.env.ROLE) { await p.waitForFunction(() => window.__spApi); await p.selectOption('#role', process.env.ROLE); await p.waitForTimeout(3500); }
  await p.waitForFunction(() => window.__spApi && document.querySelectorAll('#kpisAccueil .kpi').length > 0, null, { timeout: 60000 });
  const charge = Date.now() - t0;
  const nav = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0], fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime; const tr = performance.getEntriesByType('resource'); return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: Math.round(fcp || 0), octets: Math.round(tr.reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0) / 1024), requetes: tr.length, lt: window.__lt.reduce((a, x) => a + x[1], 0), nlt: window.__lt.length }; });
  res.chargement = Object.assign({ pret_ms: charge }, nav);
  const frames = async (action, ms = 1300) => p.evaluate(async ([a, ms]) => { const d = []; let last = performance.now(), fin = last + ms; const lt0 = window.__lt.length; await new Promise(ok => { function f(t) { d.push(t - last); last = t; t < fin ? requestAnimationFrame(f) : ok(); } requestAnimationFrame(f); eval(a); }); const sorted = d.slice(1).sort((x, y) => x - y); return { images: d.length - 1, fps: Math.round((d.length - 1) / (ms / 1000)), pire_ms: Math.round(sorted[sorted.length - 1]), p95_ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]), tachesLongues: window.__lt.slice(lt0).reduce((a, x) => a + x[1], 0) }; }, [action, ms]);
  res.pages = {};
  for (const v of ['guichet', 'file', 'dossiers', 'tableau', 'fraude', 'accueil']) res.pages[v] = await frames(`document.querySelector('nav button[data-v="${v}"]').click()`);
  res.defilement = await frames(`(function s(){ let y=0; const t=setInterval(()=>{ y+=40; window.scrollTo(0,y); if(y>2500){clearInterval(t);} },16); })()`, 1400);
  console.log(JSON.stringify({ ralentissement: RALENTI, ...res }, null, 1)); await b.close();
})().catch(e => { console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });
