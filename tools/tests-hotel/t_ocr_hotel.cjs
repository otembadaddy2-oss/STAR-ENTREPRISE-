// CHECK-IN STAR : la lecture optique d'une photo de passeport fonctionne dans l'application (moteur de Passeport Sûr). Serveur avec en-têtes : port 8769.
const { chromium } = require('playwright'); const fs = require('fs');
const B = process.env.BASE || 'http://127.0.0.1:8769/hotel-reception/'; let ko = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) ko++; };
const TD3 = ['P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', 'L898902C36UTO7408122F1204159ZE184226B<<<<<10']; const norm = s => s.replace(/\s+/g, '').toUpperCase();
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); const errs = []; const ext = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); }); p.on('request', r => { const u = r.url(); if (!/^(http:\/\/127\.0\.0\.1|blob:|data:)/.test(u)) ext.push(u); });
  await p.goto(B + 'index.html'); await p.click('nav [data-go=arrivee]');
  const png = await p.evaluate(async (lignes) => { const W = 1500, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#e9e4d2'; x.fillRect(0, 0, W, H); x.fillStyle = '#7a6f4f'; x.font = '28px sans-serif'; for (let i = 0; i < 8; i++) x.fillText('PASSPORT ' + 'UTOPIA '.repeat(4) + i, 60, 90 + i * 70); x.fillStyle = '#c9c2a8'; x.fillRect(60, 200, 300, 380);
    const n = lignes[0].length, t = Math.floor((W - 120) / (n * 0.602)); x.font = 'bold ' + t + 'px "DejaVu Sans Mono", monospace'; x.fillStyle = '#111'; const y0 = H - 40 - t * 1.25; lignes.forEach((l, i) => x.fillText(l, 60, y0 + i * t * 1.25)); return c.toDataURL('image/png'); }, TD3);
  fs.writeFileSync('/tmp/hotel-ocr.png', Buffer.from(png.split(',')[1], 'base64'));
  const t0 = Date.now(); await p.setInputFiles('#f-img', '/tmp/hotel-ocr.png'); await p.waitForFunction(() => /terminée|impossible/.test(document.getElementById('ocr-etat').textContent), null, { timeout: 150000 });
  const lu = await p.inputValue('#mrz'); const etat = await p.textContent('#ocr-etat'); console.log('   durée ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s · état : ' + etat.trim().slice(0, 70) + '\n   lu : ' + JSON.stringify(lu));
  ok(norm(lu) === norm(TD3.join('')), 'lecture optique : les deux lignes du passeport sont lues à l\'identique');
  await p.waitForSelector('#a1-res .boite', { timeout: 5000 }); ok(/ERIKSSON/.test(await p.textContent('#a1-res')) && /ANNA MARIA/.test(await p.textContent('#a1-res')) && /expiré/.test(await p.textContent('#a1-res')), 'la fiche est remplie automatiquement et le passeport de spécimen, expiré, est refusé');
  ok(ext.length === 0, 'aucune requête vers un site extérieur (la photo ne quitte pas l\'appareil)' + (ext.length ? ' — ' + ext.join(', ') : ''));
  ok(errs.length === 0, 'aucune erreur (CSP comprise)' + (errs.length ? ' — ' + errs.join(' | ') : ''));
  await b.close(); console.log(ko ? '\n' + ko + ' ÉCHEC(S)' : '\nTous les contrôles passent'); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(2); });
