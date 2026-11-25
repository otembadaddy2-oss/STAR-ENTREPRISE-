const { chromium } = require('playwright'); const { spawn } = require('child_process');
const PORT = 8768, BASE = 'http://localhost:' + PORT + '/passeport-demo/'; let ko = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) ko++; }; const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('node', ['--experimental-strip-types', 'tools/serveur-local-passeport.mts', String(PORT)], { cwd: '/home/user/STAR-ENTREPRISE-', stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + 'index.html')).ok) break; } catch (e) { } await wait(250); }
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + 'index.html'); await p.waitForTimeout(900); await p.selectOption('#role', 'prefecture');
  await p.click('#chipEspace'); await p.waitForSelector('#bCreerEsp'); await Promise.all([p.waitForNavigation().catch(() => { }), p.click('#bCreerEsp')]); await p.waitForTimeout(2000);
  const code = await p.evaluate(() => JSON.parse(localStorage.sp_espace_v1).code);
  await p.evaluate(async c => { await fetch('/api/passeport-piece?espace=' + c + '&id=PJ-orphelin1', { method: 'PUT', headers: { 'content-type': 'image/png' }, body: new Uint8Array([137, 80, 78, 71, 1, 2]) }); }, code);
  await p.click('#chipEspace'); await p.waitForSelector('summary'); await p.click('summary'); await p.waitForSelector('#bEffacer'); await p.click('#bEffacer'); ok(/EFFACER/.test(await p.textContent('#espEffMsg')), 'sans confirmation : refusé');
  await p.fill('#espEff', 'effacer'); await Promise.all([p.waitForNavigation({ timeout: 8000 }).catch(() => { }), p.click('#bEffacer')]); await p.waitForTimeout(2500);
  ok((await p.textContent('#chipEspace')).includes('Mode local'), 'après effacement : retour en mode local');
  const st = await p.evaluate(async c => [(await fetch('/api/passeport?op=sync&espace=' + c + '&since=0')).status, (await fetch('/api/passeport-piece?espace=' + c + '&id=PJ-orphelin1')).status], code);
  ok(st[0] === 404 && st[1] === 404, 'le serveur ne connaît plus l’espace ni sa pièce ' + JSON.stringify(st));
  ok(errs.length === 0, 'aucune erreur JS'); console.log(ko ? ko + ' ECHEC(S)' : 'TOUS LES TESTS OK'); await b.close(); srv.kill('SIGKILL');
})().catch(e => { console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });
