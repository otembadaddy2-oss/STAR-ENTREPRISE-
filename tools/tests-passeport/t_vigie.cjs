// Alerte de sécurité du Ministre sur un espace VIERGE : la toute première tentative de contournement doit afficher le message
// (et pas seulement les suivantes). Le Ministre est déjà connecté quand la tentative a lieu.
const { chromium } = require('playwright');
const ORIGINE = 'http://localhost:8766/', BASE = ORIGINE + 'passeport-demo/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
const att = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fn(); if (r) return r; } catch (e) { } await new Promise(r => setTimeout(r, 250)); } return null; };
const api = async (corps, jeton) => { const r = await fetch(ORIGINE + 'api/passeport', { method: 'POST', headers: jeton ? { authorization: 'Bearer ' + jeton } : {}, body: JSON.stringify(corps) }); return { statut: r.status, ...(await r.json()) }; };
(async () => {
  const sc = await api({ op: 'creer', nom: 'Vigie', admin: { login: 'pf.vigie', nom: 'Préfet Vigie', mdp: 'Prefet2026ok1' } }); const code = sc.code;
  const T0 = (await api({ op: 'connexion', espace: code, login: 'pf.vigie', mdp: 'Prefet2026ok1' })).jeton;
  const mk = async (login, nom, role) => { const c = await api({ op: 'comptes-creer', espace: code, login, nom, role }, T0); const l = await api({ op: 'connexion', espace: code, login, mdp: c.motDePasseTemporaire }); const n = await api({ op: 'changer-mdp', espace: code, ancien: c.motDePasseTemporaire, nouveau: login + 'Mdp2026' }, l.jeton); return { jeton: n.jeton || l.jeton, login, nom, role }; };
  const cG = await mk('guichet.vig', 'Agent Guichet', 'agent'), cM = await mk('cabinet.vig', 'Cabinet Ministre', 'ministere');
  const b = await chromium.launch();
  const ouvre = async c => { const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(({ code, c }) => { try { localStorage.setItem('sp_espace_v1', JSON.stringify({ code })); sessionStorage.setItem('sp_jeton_v1', JSON.stringify({ code, jeton: c.jeton, compte: { login: c.login, nom: c.nom, role: c.role, doitChanger: false, actif: true } })); localStorage.setItem('sp_guide_v1', JSON.stringify({ vu: true, faits: { agent: 'passe', ministere: 'passe', prefecture: 'passe', caisse: 'passe', porte: 'passe', accueil: 'passe' } })); } catch (e) { } }, { code, c }); const p = await ctx.newPage(); await p.goto(BASE + 'index.html'); await p.waitForSelector('#cptChip', { timeout: 15000 }); return p; };
  const M = await ouvre(cM), G = await ouvre(cG);
  await M.bringToFront(); await M.waitForTimeout(2500);   // le Ministre a fait sa première lecture : aucun événement grave pour l'instant
  ok(!(await M.locator('#secToast').count()), 'espace vierge : aucune alerte affichée au départ');
  ok(await M.locator('#bAide').isVisible() && await M.locator('#bInstall').isVisible(), 'espace sécurisé : les boutons « ❓ Aide » et « 📲 Installer » restent visibles');
  await G.evaluate(async () => { try { await window.__spSync.api.post({ op: 'comptes-creer', espace: window.__spSync.esp(), login: 'intrus1', nom: 'Intrus', role: 'prefecture' }); } catch (e) { } });
  await M.bringToFront();
  const t0 = Date.now(); const alerte = await att(async () => (await M.locator('#secToast').count()) ? await M.textContent('#secToast') : null, 45000);
  ok(!!alerte && /Alerte de sécurité/.test(alerte), 'première tentative de contournement sur un espace vierge : message d’alerte affiché au Ministre en ' + Math.round((Date.now() - t0) / 1000) + ' s');
  await b.close();
  console.log(echecs ? '\n' + echecs + ' ÉCHEC(S)' : '\nTous les contrôles passent');
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(2); });
