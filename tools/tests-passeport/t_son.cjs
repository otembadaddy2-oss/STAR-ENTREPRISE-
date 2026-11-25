// Son des alertes du Ministre : un faux « haut-parleur » compte les sons demandés au navigateur.
// - avant le premier toucher de l'écran : aucun son possible (règle du navigateur) → rappel « touchez l'écran », puis l'alerte en attente sonne au premier toucher ;
// - ensuite : chaque nouvelle alerte de fraude ET chaque alerte de sécurité font sonner (et vibrer) l'appareil ;
// - son coupé dans le menu Aide : plus aucun son, le message rouge s'affiche quand même ; réactivé : ça sonne de nouveau.
const { chromium } = require('playwright');
const ORIGINE = process.env.ORIGINE || 'http://localhost:8766/', BASE = ORIGINE + 'passeport-demo/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
const att = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fn(); if (r) return r; } catch (e) { } await new Promise(r => setTimeout(r, 250)); } return null; };
const api = async (corps, jeton) => { const r = await fetch(ORIGINE + 'api/passeport', { method: 'POST', headers: jeton ? { authorization: 'Bearer ' + jeton } : {}, body: JSON.stringify(corps) }); return { statut: r.status, ...(await r.json()) }; };
(async () => {
  const sc = await api({ op: 'creer', nom: 'Son', admin: { login: 'pf.son', nom: 'Préfet Son', mdp: 'Prefet2026ok1' } }); const code = sc.code;
  const T0 = (await api({ op: 'connexion', espace: code, login: 'pf.son', mdp: 'Prefet2026ok1' })).jeton;
  const mk = async (login, nom, role) => { const c = await api({ op: 'comptes-creer', espace: code, login, nom, role }, T0); const l = await api({ op: 'connexion', espace: code, login, mdp: c.motDePasseTemporaire }); const n = await api({ op: 'changer-mdp', espace: code, ancien: c.motDePasseTemporaire, nouveau: login + 'Mdp2026' }, l.jeton); return { jeton: n.jeton || l.jeton, login, nom, role }; };
  const cG = await mk('guichet.son', 'Agent Guichet', 'agent'), cM = await mk('cabinet.son', 'Cabinet Ministre', 'ministere');
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(({ code, c }) => {
    try { localStorage.setItem('sp_espace_v1', JSON.stringify({ code })); sessionStorage.setItem('sp_jeton_v1', JSON.stringify({ code, jeton: c.jeton, compte: { login: c.login, nom: c.nom, role: c.role, doitChanger: false, actif: true } })); localStorage.setItem('sp_guide_v1', JSON.stringify({ vu: true, faits: { agent: 'passe', ministere: 'passe', prefecture: 'passe', caisse: 'passe', porte: 'passe', accueil: 'passe' } })); } catch (e) { }
    window.__osc = 0; window.__vib = 0;
    class FauxContexte { constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; } resume() { this.state = 'running'; return Promise.resolve(); }
      createOscillator() { window.__osc++; return { type: '', frequency: { value: 0 }, connect() { }, start() { }, stop() { } }; } createGain() { return { gain: { setValueAtTime() { }, exponentialRampToValueAtTime() { }, value: 0 }, connect() { } }; } }
    window.AudioContext = FauxContexte; window.webkitAudioContext = FauxContexte; navigator.vibrate = () => { window.__vib++; return true; };
  }, { code, c: cM });
  const M = await ctx.newPage(); M.on('pageerror', e => errs.push('PAGE ' + e.message));
  await M.goto(BASE + 'index.html'); await M.waitForSelector('#cptChip', { timeout: 15000 }); await M.waitForTimeout(2500);
  const compte = () => M.evaluate(() => window.__spSonCompte || 0), osc = () => M.evaluate(() => window.__osc);
  const dos = (n, nom, pn) => ({ id: 'BZV-2026-S' + String(n).padStart(4, '0'), type: 'premiere', status: 'depose', createdAt: new Date().toISOString(), mrzOk: true, agent: 'Agent 03', lieu: 'Makélékélé', person: { nom, prenoms: n % 2 ? 'Rodrigue' : 'Rodrigue Aimé', naissance: '1985-05-0' + (n % 2 ? 1 : 2), sexe: 'M', tel: '+242 06 900 00 00', piece: { type: 'CNI', numero: pn, expiration: '2031-01-01' } }, pieces: [], history: [{ s: 'depose', at: new Date().toISOString(), by: 'x', note: 'Dossier enregistré' }] });
  const fraude = async (a, nom) => api({ op: 'ecrire', espace: code, dossiers: [dos(a, nom, 'CNI88' + a + '1122'), dos(a + 1, nom, 'CNI88' + a + '1122')].map(d => ({ id: d.id, baseRev: 0, data: d })) }, cG.jeton);

  // 1) avant tout toucher : rien ne sonne, mais l'alerte est affichée et un rappel est montré
  await fraude(1, 'BOUKA');
  ok(await att(async () => M.locator('#alerteFraude').count(), 20000), 'alerte de fraude affichée sur l’écran du Ministre');
  ok(await osc() === 0 && await compte() === 0, 'avant le premier toucher : aucun son n’est joué (le navigateur l’interdit)');
  ok(await att(async () => M.locator('#sonIndice').count(), 4000), 'rappel visible : « Touchez l’écran une fois pour activer le son »');
  // 2) premier toucher : l'alerte en attente sonne
  await M.mouse.click(300, 400); await M.waitForTimeout(600);
  ok(await compte() >= 1 && await osc() >= 6, 'premier toucher : l’alerte arrivée entre-temps sonne tout de suite (' + await osc() + ' notes)');
  ok(!(await M.locator('#sonIndice').count()), 'le rappel disparaît une fois le son débloqué');
  ok(await M.evaluate(() => window.__vib) >= 1, 'le téléphone vibre aussi (quand il le permet)');
  // arrêt immédiat de la sirène pendant qu'elle sonne
  ok(await M.locator('#sonStop').isVisible() && (await M.evaluate(() => window.__spSon.etat().sonne)), 'pendant la sirène : le bouton « 🔇 Arrêter le son » est visible');
  await M.click('#sonStop'); await M.waitForTimeout(300);
  ok(!(await M.locator('#sonStop').count()) && !(await M.evaluate(() => window.__spSon.etat().sonne)), 'on touche « Arrêter le son » : la sirène est coupée tout de suite et le bouton disparaît');
  ok(await M.locator('#alerteFraude').count() === 1, 'le message rouge reste affiché après l’arrêt du son (l’alerte n’est pas effacée)');
  // 3) nouvelle alerte de fraude : sonne
  const c1 = await compte(); await M.waitForTimeout(1700); await fraude(3, 'MOUKALA');
  ok(await att(async () => (await compte()) > c1, 25000), 'nouvelle alerte de fraude : le son retentit');
  // 4) alerte de sécurité : sonne
  const c2 = await compte(); await M.waitForTimeout(1700);
  await api({ op: 'comptes-creer', espace: code, login: 'intrus.son1', nom: 'Intrus', role: 'prefecture' }, cG.jeton);
  ok(await att(async () => (await compte()) > c2, 45000), 'alerte de sécurité (tentative de contournement) : le son retentit');
  // 5) son coupé depuis le menu Aide
  await M.click('#bAide'); await M.waitForSelector('#aSon'); ok(/activé/.test(await M.textContent('#aSon')), 'menu Aide : « Son des alertes : activé »');
  await M.click('#aSon'); ok(/coupé/.test(await M.textContent('#aSon')), 'on coupe le son : « Son des alertes : coupé »'); await M.keyboard.press('Escape');
  const c3 = await compte(); await M.waitForTimeout(1700); await fraude(5, 'NGOMA');
  await att(async () => M.evaluate(() => /2 alertes|3 alertes|alertes de fraude grave/.test(document.getElementById('alerteFraude')?.innerText || '')), 20000); await M.waitForTimeout(3500);
  ok(await compte() === c3, 'son coupé : aucun son, mais le message rouge s’affiche quand même');
  ok(await M.locator('#alerteFraude').count() === 1 && /alerte/.test(await M.textContent('#alerteFraude')), 'le message rouge reste visible, son coupé');
  // 6) réactivé : sonne de nouveau
  await M.click('#bAide'); await M.waitForSelector('#aSon'); await M.click('#aSon'); await M.keyboard.press('Escape'); await M.waitForTimeout(600);
  const c4 = await compte(); await M.waitForTimeout(1700); await fraude(7, 'ITOUA');
  ok(await att(async () => (await compte()) > c4, 25000), 'son réactivé : l’alerte sonne de nouveau');
  ok(errs.length === 0, 'aucune erreur de page' + (errs.length ? ' — ' + errs.join(' | ') : ''));
  await b.close();
  console.log(echecs ? '\n' + echecs + ' ÉCHEC(S)' : '\nTous les contrôles passent');
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(2); });
