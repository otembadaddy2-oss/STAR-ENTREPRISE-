const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = '/home/user/STAR-ENTREPRISE-';
const srv = http.createServer((q, r) => { const p = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, p); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.webp') ? 'image/webp' : f.endsWith('.png') ? 'image/png' : f.endsWith('.mp3') ? 'audio/mpeg' : f.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream' }); r.end(d); }); }).listen(8097);
const caps = JSON.parse(fs.readFileSync('/tmp/video/caps.json', 'utf8'));
caps.connecteurs.forEach(c => { if (c.id === 'images') { c.statut = 'actif'; c.detail = 'Keydou crée des images à ta demande'; } if (c.id === 'voix') { c.statut = 'actif'; c.detail = 'Keydou lit ses réponses avec sa vraie voix'; } });
caps.liste.forEach(c => { if (c.id === 'images') { c.actif = true; c.detail = '120 images par mois'; } if (c.id === 'voix') { c.actif = true; c.detail = '30 lectures par jour'; } });
const modes = ['sante', 'droit', 'cuisine', 'mecanique', 'business', 'education', 'examens'].map((id, i) => ({ id, label: ['Santé', 'Droit', 'Cuisine', 'Mécanique', 'Business', 'Études', 'Tests'][i], emoji: ['🩺', '⚖️', '🍳', '🔧', '💼', '📚', '📝'][i] })); modes.unshift({ id: 'general', label: 'Général', emoji: '🐻' });
const REPONSES = [
  "Un panneau solaire transforme la lumière du soleil en électricité. Ses cellules captent la lumière et produisent un courant ; la batterie garde l'énergie pour la nuit.",
  "C'est noté. Je te rappellerai demain à neuf heures : la réunion avec la direction.",
  "Je ne peux pas retenir d'horaires de médicaments : c'est une règle de sécurité. Parle à un médecin ou à un pharmacien."];
const Q = ["Explique-moi simplement comment fonctionne un panneau solaire.", "Rappelle-moi demain à 9 heures la réunion avec la direction.", "Rappelle-moi de prendre mon médicament à 8 heures."];
let niv = 'essai', nRep = 0, rappelFait = false;
const demain = new Date(Date.now() + 864e5); demain.setHours(9, 0, 0, 0);
const capPresti = () => ({ voix: { actif: true, max: 30, restantes: 30 }, images: true, imagesMax: 120, imagesRestantes: 118, credits: 0, achatImages: true, packs: [{ id: 'credit_images_10', images: 10, montant: 960 }, { id: 'credit_images_30', images: 30, montant: 2400 }], piecesMax: 80, modes, liste: caps.liste, connecteurs: caps.connecteurs });
const capEssai = () => ({ voix: { actif: false, max: 0, restantes: 0 }, images: true, imagesMax: 2, imagesRestantes: 2, credits: 0, achatImages: false, packs: [], piecesMax: 0, modes, liste: [], connecteurs: caps.connecteurs });
const GREET = 'Bonjour ! Je suis Keydou, ton compagnon. Je retiens tes rendez-vous, je te rappelle au bon moment, et je réponds à tes questions. Que veux-tu savoir ?';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 562 }, deviceScaleFactor: 2.1026 });
  const pg = await ctx.newPage(); const T0 = Date.now();
  const cdp = await ctx.newCDPSession(pg); const FR = []; let n = 0; fs.rmSync('/tmp/video/hf', { recursive: true, force: true }); fs.mkdirSync('/tmp/video/hf', { recursive: true });
  cdp.on('Page.screencastFrame', async (f) => { const t = f.metadata.timestamp - T0 / 1000; const name = 'f' + String(n++).padStart(5, '0') + '.jpg'; fs.writeFileSync('/tmp/video/hf/' + name, Buffer.from(f.data, 'base64')); FR.push([t, name]); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: 820, maxHeight: 1182, everyNthFrame: 1 }); const R = () => (Date.now() - T0) / 1000;
  const until = async (r) => { const w = (r - R()) * 1000; if (w > 0) await pg.waitForTimeout(w); else if (w < -400) console.log('RETARD', r, 'à', R().toFixed(2)); };
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.route('**/api/starvibe-subscription**', async (route) => { const m = route.request().method(); if (m === 'POST') { const c = JSON.parse(route.request().postData() || '{}'); return route.fulfill({ status: 201, json: { abonnement: { id: '77', plan: c.plan, montantAttendu: { compagnon_premium: 20400, compagnon_prestige: 28600, compagnon_complet: 11100 }[c.plan] || 5000, statut: 'en_attente_paiement', referencePaiement: 'KOMYO-77', numeroReception: '+242 06 656 50 50', numeroAirtel: '' } } }); } return route.fulfill({ json: {} }); });
  await pg.route('**/api/starvibe-compagnon**', async (route) => {
    const u = new URL(route.request().url()), m = route.request().method();
    if (m === 'GET' && u.searchParams.get('historique')) return route.fulfill({ json: { messages: niv === 'essai' ? [] : [{ id: 1, role: 'assistant', texte: GREET, at: new Date().toISOString() }] } });
    if (m === 'GET' && u.searchParams.get('rappels')) return route.fulfill({ json: { rappels: rappelFait ? [{ id: 1, titre: 'Réunion avec la direction', quand: demain.toISOString(), repetition: '', actif: true }] : [] } });
    if (m === 'GET' && u.searchParams.get('sante')) return route.fulfill({ json: { connecteurs: caps.connecteurs, verifieA: new Date().toISOString() } });
    if (m === 'GET') return route.fulfill({ json: niv === 'essai'
      ? { compte: { nom: 'Carry Otemba', initiales: 'CO', telephone: '+242 06•• ••50' }, consentement: true, acces: { niveau: 'essai', label: 'Essai gratuit', source: 'essai', fin: null }, quota: { messagesUtilises: 0, messagesMax: 5, revenirDansMs: 0 }, capacites: capEssai(), notifications: 0 }
      : { compte: { nom: 'Compte de démonstration', initiales: 'DE', telephone: '+242 06•• ••50' }, consentement: true, acces: { niveau: 'prestige', label: 'Prestige', source: 'abonnement', fin: new Date(Date.now() + 25 * 864e5).toISOString() }, quota: { messagesUtilises: nRep, messagesMax: 500, revenirDansMs: 0 }, capacites: capPresti(), notifications: 0 } });
    const c = JSON.parse(route.request().postData() || '{}');
    if (c.action === 'chat') { await new Promise(r => setTimeout(r, 700)); const rep = REPONSES[nRep] || 'Voici ma réponse.'; if (nRep === 1) rappelFait = true; nRep++; return route.fulfill({ json: { reponse: rep, messageId: 40 + nRep, sources: [], rappelsAjoutes: [], quota: { messagesUtilises: nRep, messagesMax: 500, revenirDansMs: 0 }, capacites: capPresti() } }); }
    return route.fulfill({ json: {} });
  });
  await pg.addInitScript(() => { localStorage.setItem('starvibe_token', 'x'); });
  let boucle = true; const SH = []; let ns = 0; fs.rmSync('/tmp/video/hs', { recursive: true, force: true }); fs.mkdirSync('/tmp/video/hs', { recursive: true });
  const shots = (async () => { while (boucle) { const t = R(); if (t < 5.8) { await new Promise(r => setTimeout(r, 40)); continue; } try { const buf = await pg.screenshot({ type: 'jpeg', quality: 82 }); const name = 's' + String(ns++).padStart(5, '0') + '.jpg'; fs.writeFileSync('/tmp/video/hs/' + name, buf); SH.push([t + 0.04, name]); } catch (e) { await new Promise(r => setTimeout(r, 30)); } } })();
  
  await pg.goto('http://localhost:8097/starvibe/compagnon.html');
  // Scène B : animation d'ouverture réelle puis écran d'essai gratuit
  await pg.waitForSelector('#app', { state: 'visible', timeout: 30000 }); console.log('app visible à', R().toFixed(2));
  await until(15.0); await pg.click('#pill').catch(() => {}); await until(16.5); await pg.keyboard.press('Escape');
  // Scène C : compte de démonstration Prestige, la discussion avec le message de bienvenue
  await until(21.9); niv = 'prestige'; await pg.evaluate(() => { sessionStorage.setItem('komyo_intro_vu', '1'); sessionStorage.setItem('komyo_intro_played', '1'); });
  await pg.reload(); await pg.waitForSelector('#app', { state: 'visible', timeout: 30000 }); await pg.waitForTimeout(800);
  const taper = async (txt) => { await pg.click('#msg'); await pg.type('#msg', txt, { delay: 52 }); await pg.waitForTimeout(350); await pg.click('#envoi'); };
  // Scène D
  await until(39.3); await taper(Q[0]); await until(44.5); await pg.waitForTimeout(100);
  // Scène E
  await until(55.0); await taper(Q[1]); await until(64.0);
  await pg.click('#btnMenu'); await pg.waitForTimeout(500); await pg.click('[data-t=rappels]'); await until(66.8);
  // Scène F
  await pg.click('#btnMenu'); await pg.waitForTimeout(400); await pg.click('[data-t=chat]'); await until(67.8); await taper(Q[2]); await until(75.0);
  // Scène G : offres, paiement
  await until(82.0); await pg.click('#btnMenu'); await pg.waitForTimeout(500); await pg.click('#btnPlus'); await until(86.0);
  await pg.evaluate(() => { const el = document.querySelector('[data-plan=compagnon_premium]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); await until(92.0);
  await pg.evaluate(() => { const el = document.querySelector('[data-plan=compagnon_prestige]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); await until(96.0);
  await pg.click('[data-plan=compagnon_premium]').catch(e => console.log('premium', e.message)); await until(100.6);
  // Scène H : paramètres et connecteurs
  await pg.click('#payAnnule').catch(() => {}); await pg.waitForTimeout(600);
  await pg.click('#btnMenu').catch(() => {}); await pg.waitForTimeout(500); await pg.click('#btnParam').catch(e => console.log('param', e.message)); await until(105.0);
  await pg.click('[data-d=connecteurs]').catch(e => console.log('conn', e.message)); await until(110.0);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(500); await pg.click('[data-d=donnees]').catch(e => console.log('donn', e.message)); await until(113.5);
  console.log('fin à', R().toFixed(2), 'erreurs', JSON.stringify(errs));
  boucle = false; await shots; fs.writeFileSync('/tmp/video/hs.json', JSON.stringify(SH)); await cdp.send('Page.stopScreencast'); fs.writeFileSync('/tmp/video/hf.json', JSON.stringify(FR)); console.log('shots', SH.length); console.log('frames', FR.length); await ctx.close(); await b.close(); srv.close();
})().catch(e => { console.error('ERR', e); srv.close(); process.exit(1); });
