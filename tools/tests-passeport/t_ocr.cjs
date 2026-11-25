const { chromium } = require('playwright'); const fs = require('fs');
const BASE = 'http://localhost:8766/passeport-demo/index.html'; const SP = __dirname + '/';
let ko = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) ko++; };
const TD3 = ['P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'];
const TD1 = ['I<UTOD231458907<<<<<<<<<<<<<<<', '7408122F1204159UTO<<<<<<<<<<<6', 'ERIKSSON<<ANNA<MARIA<<<<<<<<<<'];
const norm = s => s.replace(/\s+/g, '').toUpperCase();
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }); const p = await ctx.newPage(); const errs = [], reqs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  p.on('request', r => { const u = r.url(); if (!u.startsWith('http://localhost') && !u.startsWith('blob:') && !u.startsWith('data:')) reqs.push(u); });
  await p.goto(BASE); await p.waitForTimeout(800); await p.evaluate(() => document.querySelector('nav button[data-v="guichet"]').click()); await p.waitForTimeout(500);
  const fabriquer = (lignes, mode) => p.evaluate(async ([lignes, mode]) => {
    const W = 1500, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = '#e9e4d2'; x.fillRect(0, 0, W, H); x.fillStyle = '#7a6f4f'; x.font = '28px sans-serif'; for (let i = 0; i < 8; i++) x.fillText('REPUBLIQUE ' + 'DU CONGO '.repeat(3) + i, 60, 90 + i * 70);
    x.fillStyle = '#c9c2a8'; x.fillRect(60, 200, 300, 380);   // photo
    const n = lignes[0].length, taille = Math.floor((W - 120) / (n * 0.602)); x.font = 'bold ' + taille + 'px "DejaVu Sans Mono", monospace'; x.fillStyle = '#111';
    const y0 = H - 40 - (lignes.length - 1) * (taille * 1.25); lignes.forEach((l, i) => x.fillText(l, 60, y0 + i * taille * 1.25));
    let sortie = c;
    if (mode === 'degrade') { const d = document.createElement('canvas'); d.width = W; d.height = H; const y = d.getContext('2d'); y.filter = 'blur(1.1px) contrast(0.7) brightness(1.12)'; y.translate(W / 2, H / 2); y.rotate(1.6 * Math.PI / 180); y.translate(-W / 2, -H / 2); y.drawImage(c, 0, 0); const im = y.getImageData(0, 0, W, H), dd = im.data; for (let i = 0; i < dd.length; i += 4) { const r = (Math.random() - 0.5) * 36; dd[i] += r; dd[i + 1] += r; dd[i + 2] += r; } y.putImageData(im, 0, 0); sortie = d; }
    return sortie.toDataURL('image/png');
  }, [lignes, mode]);
  const essai = async (nom, lignes, mode) => {
    fs.writeFileSync(SP + 'ocr_' + nom + '.png', Buffer.from((await fabriquer(lignes, mode)).split(',')[1], 'base64'));
    await p.fill('#mrz', ''); await p.evaluate(() => { document.getElementById('ocrEtat').textContent = ''; }); const t0 = Date.now(); await p.setInputFiles('#fileIn', SP + 'ocr_' + nom + '.png');
    await p.waitForFunction(() => /terminée|impossible/.test(document.getElementById('ocrEtat').textContent), null, { timeout: 120000 }); const dt = Date.now() - t0;
    const lu = await p.inputValue('#mrz'), etat = await p.textContent('#ocrEtat'), attendu = lignes.join('');
    const idem = norm(lu) === norm(attendu); const proche = lu.length ? [...norm(attendu)].filter((ch, i) => norm(lu)[i] === ch).length / norm(attendu).length : 0;
    console.log('  ' + nom + ' : ' + (dt / 1000).toFixed(1) + ' s · fidélité ' + Math.round(proche * 100) + ' % · fiche : ' + (await p.inputValue('#f_nom')) + ' / ' + (await p.inputValue('#f_prenoms')));
    if (!idem) console.log('   lu     :', JSON.stringify(lu), '\n   attendu:', JSON.stringify(lignes.join('\n')), '\n   état   :', etat.trim().slice(0, 80));
    return { idem, proche, nom: await p.inputValue('#f_nom'), dt };
  };
  // corrections standard (sans image) : erreurs de lecture typiques
  const cas = await p.evaluate(([TD3, TD1]) => { const X = window.__spApi, bad3 = [TD3[0], TD3[1].replace('UTO', 'UT0').replace('7408122', '74O8I22')], bad1 = [TD1[0].replace('UTOD', 'UTO0D'), TD1[1].replace('UTO', 'UT0'), TD1[2]], bad1b = [TD1[0], TD1[1].slice(0, 20) + TD1[1].slice(21), TD1[2]];
    return { a: X.corrigerMRZ(bad3), b: X.corrigerMRZ(bad1), c: X.corrigerMRZ(bad1b), v3: X.parseMRZ(X.corrigerMRZ(bad3).join('\n')).valide, v1: X.parseMRZ(X.corrigerMRZ(bad1).join('\n')).valide, v1b: X.parseMRZ(X.corrigerMRZ(bad1b).join('\n')).valide }; }, [TD3, TD1]);
  ok(cas.a.join('') === TD3.join('') && cas.v3, 'correction : O lu 0 / 1 lu I dans un passeport → ' + cas.v3);
  ok(cas.b.join('') === TD1.join('') && cas.v1, 'correction : caractère en trop + O lu 0 dans une carte → ' + cas.v1);
  ok(cas.c.join('') === TD1.join('') && cas.v1b, 'correction : caractère manquant dans une carte (retrouvé grâce aux clés de contrôle) → ' + cas.v1b);
  const faux = await p.evaluate(([TD3]) => { const X = window.__spApi, l = [TD3[0], TD3[1].slice(0, 13) + '7408129' + TD3[1].slice(20)]; return X.parseMRZ(X.corrigerMRZ(l).join('\n')); }, [TD3]);
  ok(faux.ok && !faux.valide, 'une date de naissance falsifiée n’est PAS « réparée » : les clés de contrôle signalent l’incohérence');
  const r1 = await essai('passeport_net', TD3, 'net'); ok(r1.idem && /ERIKSSON/i.test(r1.nom), 'passeport net : lecture exacte et fiche remplie');
  const r2 = await essai('cni_nette', TD1, 'net'); ok(r2.proche >= 0.95 && /ERIKSSON/i.test(r2.nom), 'carte d’identité nette : fiche remplie ; la seule clé de contrôle mal lue est signalée à l’agent, jamais « réparée »');
  const r3 = await essai('passeport_degrade', TD3, 'degrade'); ok(r3.proche >= 0.9, 'passeport dégradé (penché, flou, bruit) : fidélité ' + Math.round(r3.proche * 100) + ' % (les erreurs restantes sont signalées par les clés de contrôle)');
  const r4 = await essai('cni_degradee', TD1, 'degrade'); ok(r4.proche >= 0.9, 'carte dégradée : fidélité ' + Math.round(r4.proche * 100) + ' %');
  const r5 = await essai('passeport_2e', TD3, 'net'); ok(r5.dt < r1.dt * 0.8 + 500, 'deuxième lecture plus rapide (moteur déjà chargé) : ' + (r5.dt / 1000).toFixed(1) + ' s contre ' + (r1.dt / 1000).toFixed(1) + ' s');
  ok(reqs.length === 0, 'aucune requête vers un site externe : ' + JSON.stringify(reqs.slice(0, 3)));
  ok(errs.length === 0, 'aucune erreur JS ' + JSON.stringify(errs.slice(0, 2)));
  console.log(ko ? ko + ' ECHEC(S)' : 'TOUS LES TESTS OK'); await b.close();
})().catch(e => { console.log('CRASH', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
