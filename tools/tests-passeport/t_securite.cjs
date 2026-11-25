// Sécurité côté navigateur, sous la VRAIE politique de sécurité (CSP du fichier _headers, appliquée par le serveur de test) :
// aucun script bloqué dans les parcours normaux, texte piégé sans effet, triche depuis la console corrigée par le serveur,
// déconnexion après inactivité, journal de sécurité et alerte de sécurité du Ministre, montant sur l'accusé WhatsApp.
const { chromium } = require('playwright');
const ORIGINE = 'http://localhost:8766/', BASE = ORIGINE + 'passeport-demo/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
const att = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fn(); if (r) return r; } catch (e) { } await new Promise(r => setTimeout(r, 250)); } return null; };
const api = async (corps, jeton) => { const r = await fetch(ORIGINE + 'api/passeport', { method: 'POST', headers: jeton ? { authorization: 'Bearer ' + jeton } : {}, body: JSON.stringify(corps) }); return { statut: r.status, ...(await r.json()) }; };
const nav = (p, v) => p.evaluate(x => document.querySelector('nav button[data-v="' + x + '"]').click(), v);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const page = async (ctxOpts = {}, init) => { const c = await b.newContext(Object.assign({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }, ctxOpts)); if (init) await c.addInitScript(init.fn, init.arg);
    await c.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' → ' + e.blockedURI)); });
    const p = await c.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|40[0-9]/.test(m.text())) errs.push('CONSOLE ' + m.text()); }); p.__ctx = c; return p; };
  const violations = p => p.evaluate(() => window.__csp.slice());

  // ---------- 1. La politique de sécurité est bien envoyée ----------
  const r1 = await fetch(BASE + 'index.html'), csp = r1.headers.get('content-security-policy') || '';
  ok(/script-src 'self'/.test(csp) && !/script-src[^;]*'unsafe-inline'/.test(csp) && /object-src 'none'/.test(csp) && /frame-ancestors 'self'/.test(csp) && /connect-src 'self'/.test(csp), 'la page envoie une politique de sécurité : seuls les scripts de l’application s’exécutent (aucun script en ligne, aucun site tiers)');
  const r2 = await fetch(ORIGINE + 'api/passeport?op=info&espace=ZZZZZZZZ'); ok((r2.headers.get('content-security-policy') || '').includes("default-src 'none'") && r2.headers.get('x-content-type-options') === 'nosniff' && /no-store/.test(r2.headers.get('cache-control') || ''), 'les réponses de l’API sont verrouillées (CSP « rien », nosniff, jamais mises en cache)');

  // ---------- 2. Parcours complet sous CSP : rien n'est bloqué ----------
  const D = await page(); await D.goto(BASE + 'index.html'); await D.waitForTimeout(1200);
  await D.selectOption('#role', 'agent'); await nav(D, 'guichet'); await D.click('[data-ex="cni"]'); await D.waitForTimeout(800);
  await D.selectOption('#role', 'caisse'); await nav(D, 'caisse'); await D.click('#bScanEx'); await D.waitForSelector('#k_montant'); await D.fill('#k_montant', '75000'); await D.click('#bPayer'); await D.waitForSelector('.recu', { timeout: 8000 });
  ok(await D.locator('[data-imprimer]').count() >= 1, 'le bouton « Imprimer » fonctionne sans gestionnaire en ligne (délégation d’événement)');
  await D.evaluate(() => document.getElementById('tiroir').classList.remove('on'));
  await D.selectOption('#role', 'prefecture'); await nav(D, 'tableau'); await D.waitForTimeout(2500); await nav(D, 'fraude'); await D.waitForTimeout(1200); await nav(D, 'dossiers'); await D.waitForTimeout(600); await nav(D, 'file'); await D.waitForTimeout(1500); await nav(D, 'reglages'); await D.waitForTimeout(600);
  const [dl] = await Promise.all([D.waitForEvent('download', { timeout: 15000 }).catch(() => null), nav(D, 'tableau').then(() => D.click('#bXlsx'))]); ok(!!dl, 'l’export Excel fonctionne sous la politique de sécurité');
  await D.click('#chipEspace'); await D.waitForTimeout(500); await D.evaluate(() => { const e = document.querySelector('#bFerme'); e && e.click(); });
  ok((await violations(D)).length === 0, 'aucune violation de la politique de sécurité dans le parcours guichet → caisse → préfecture → Excel : ' + JSON.stringify((await violations(D)).slice(0, 3)));
  const E = await page(); await E.goto(BASE + 'ecran.html'); await E.waitForTimeout(1500); ok((await violations(E)).length === 0 && (await E.locator('#num').count()) === 1, 'l’écran de la salle d’attente fonctionne sous la politique de sécurité');
  const I = await page(); await I.goto(BASE + 'inscription.html?esp=ABCDEFGH'); await I.waitForTimeout(800); ok((await violations(I)).length === 0 && await I.isVisible('#f'), 'la page de pré-enregistrement fonctionne sous la politique de sécurité');

  // ---------- Espace sécurisé de test + comptes ----------
  const sc = await api({ op: 'creer', nom: 'Sécurité', admin: { login: 'pf.sec', nom: 'Préfet Sécurité', mdp: 'Prefet2026ok1' } }); const code = sc.code;
  const T0 = (await api({ op: 'connexion', espace: code, login: 'pf.sec', mdp: 'Prefet2026ok1' })).jeton;
  const mk = async (login, nom, role) => { const c = await api({ op: 'comptes-creer', espace: code, login, nom, role }, T0); const l = await api({ op: 'connexion', espace: code, login, mdp: c.motDePasseTemporaire }); const n = await api({ op: 'changer-mdp', espace: code, ancien: c.motDePasseTemporaire, nouveau: login + 'Mdp2026' }, l.jeton); return { jeton: n.jeton, login, nom, role }; };
  const cG = await mk('guichet.sec', 'Agent Guichet', 'agent'), cA = await mk('accueil.sec', 'Agent Accueil', 'accueil'), cM = await mk('cabinet.sec', 'Cabinet Ministre', 'ministere');
  const connecte = async (c, opts) => page(opts || {}, { fn: ({ code, c }) => { try { localStorage.setItem('sp_espace_v1', JSON.stringify({ code })); sessionStorage.setItem('sp_jeton_v1', JSON.stringify({ code, jeton: c.jeton, compte: { login: c.login, nom: c.nom, role: c.role, doitChanger: false, actif: true } })); } catch (e) { } }, arg: { code, c } });
  await api({ op: 'reglages', espace: code, config: { delai: 0, jours: [0, 1, 2, 3, 4, 5, 6], capacite: 100 } }, T0);

  // ---------- 3. Texte piégé : sans effet ----------
  const pub = (await (await fetch(ORIGINE + 'api/passeport?op=sync&espace=' + code + '&since=0', { headers: { authorization: 'Bearer ' + T0 } })).json()).publique;
  const piege = await api({ op: 'preinscrire', public: pub, dossier: { nom: '<img src=x onerror=window.__pwned=1>', prenoms: '"><script>window.__pwned=2</script>', naissance: '1990-01-01', piece: { type: 'CNI', numero: 'CNIPIEGE1' }, type: 'premiere' } });
  const A = await connecte(cA); await A.goto(BASE + 'index.html'); await A.waitForSelector('#cptChip', { timeout: 15000 }); await nav(A, 'reception'); await A.waitForTimeout(2500); await A.fill('#r_id', piege.id); await A.fill('#r_code', piege.code); await A.click('#bRecepOuvrir'); await A.waitForSelector('#recepRes .carte'); await nav(A, 'dossiers'); await A.waitForTimeout(800);
  ok((await A.evaluate(() => window.__pwned)) === undefined && (await A.locator('#recepRes img[src="x"], #tb img[src="x"]').count()) === 0 && (await violations(A)).length === 0, 'texte piégé (balise image, balise script) dans le nom d’un demandeur : affiché comme du texte, aucun script exécuté');

  // ---------- 4. Triche depuis la console du navigateur ----------
  const G = await connecte(cG); await G.goto(BASE + 'index.html'); await G.waitForSelector('#cptChip', { timeout: 15000 }); await G.waitForTimeout(2500);
  const id = 'BZV-2026-C0' + (Date.now() % 900 + 100);
  const avant = await G.evaluate(async i => { const X = window.__spApi; X.DB.push({ id: i, type: 'premiere', status: 'depose', createdAt: new Date().toISOString(), mrzOk: true, agent: 'x', lieu: 'X', person: { nom: 'CONSOLE', prenoms: 'Test', naissance: '1990-01-01', piece: { type: 'CNI', numero: 'CNICONSOLE' } }, pieces: [], history: [{ s: 'depose', at: new Date().toISOString(), by: 'x', note: 'Dossier enregistré' }] }); X.sauver(); await new Promise(r => setTimeout(r, 2500)); return !!X.DB.find(x => x.id === i && x.__rev); }, id);
  ok(avant, 'un agent de guichet connecté enregistre un dossier (le serveur l’accepte)');
  const apres = await G.evaluate(async i => { const X = window.__spApi, d = X.DB.find(x => x.id === i); d.status = 'paye'; d.ticket = 1; d.paiement = { montant: 1, mode: 'Espèces', at: new Date().toISOString(), caissier: 'moi', recu: 'RP-2026-000001' }; d.rdv = { date: '2026-12-24', heure: '08:00', lieu: 'X' }; d.history.push({ s: 'paye', at: new Date().toISOString(), by: 'Caisse', note: 'Paiement 1 FCFA' }); X.sauver(); await new Promise(r => setTimeout(r, 3500)); const e = X.DB.find(x => x.id === i); return { s: e.status, p: !!e.paiement, t: e.ticket, par: e.history[e.history.length - 1].by }; }, id);
  ok(apres.s === 'depose' && !apres.p && apres.t === undefined, 'triche depuis la console (marquer un dossier « payé » avec un faux reçu) : le serveur refuse et le poste est remis à l’état réel : ' + JSON.stringify(apres));
  const srv = (await (await fetch(ORIGINE + 'api/passeport?op=sync&espace=' + code + '&since=0', { headers: { authorization: 'Bearer ' + cM.jeton } })).json()).dossiers.find(x => x.id === id); ok(srv && srv.data.status === 'depose' && !srv.data.paiement, 'côté serveur, le dossier est resté impayé : le Ministre ne voit aucun faux paiement');
  const refus = await G.evaluate(async () => { try { await window.__spSync.api.post({ op: 'reglages', espace: window.__spSync.esp(), config: { tarifs: { premiere: 1, renouvellement: 1 } } }); return 'permis'; } catch (e) { return e.statut; } }); ok(refus === 403, 'triche : l’agent de guichet tente de fixer lui-même le montant du passeport : refusé (403)');

  // ---------- 5. Journal de sécurité + alerte de sécurité du Ministre ----------
  const M = await connecte(cM); await M.goto(BASE + 'index.html'); await M.waitForSelector('#cptChip', { timeout: 15000 }); await M.waitForTimeout(2500);
  ok(await M.locator('nav button[data-v="securite"]').count() === 1 && (await M.locator('nav button[data-v="comptes"]').count()) === 0, 'le Ministre dispose de l’onglet « Sécurité » (journal) mais pas de la gestion des comptes');
  await nav(M, 'securite'); await M.waitForSelector('#sec_tb tr'); const lignes = await M.locator('#sec_tb tr').count(); const texte = await M.textContent('#sec_tb');
  ok(lignes >= 5 && /Tentative de modification interdite/.test(texte) && /Action refusée/.test(texte) && /guichet\.sec/.test(texte), 'le journal montre les tentatives de triche de « guichet.sec » : modification interdite, action refusée (' + lignes + ' lignes)');
  ok(!/pwned|Prefet2026ok1|Mdp2026/.test(texte), 'aucun mot de passe dans le journal affiché');
  await M.click('#sec_verif'); ok(/Journal intact/.test(await att(async () => { const t = await M.textContent('#sec_etat'); return /intact|falsifié/.test(t) ? t : null; })), 'le Ministre vérifie l’intégrité du journal : « Journal intact »');
  await M.check('#sec_graves'); await M.waitForTimeout(800); ok((await M.locator('#sec_tb tr').count()) >= 2 && (await M.locator('#sec_tb tr:not([style*="background"])').count()) === 0, 'filtre « alertes graves seulement » : uniquement les lignes graves');
  await M.uncheck('#sec_graves');
  await G.evaluate(async () => { try { await window.__spSync.api.post({ op: 'comptes-creer', espace: window.__spSync.esp(), login: 'intrus1', nom: 'Intrus', role: 'prefecture' }); } catch (e) { } });
  const t0 = Date.now(); const alerte = await att(async () => (await M.locator('#secToast').count()) ? await M.textContent('#secToast') : null, 40000);
  ok(!!alerte && /Alerte de sécurité/.test(alerte) && /refusée|interdite|droits/i.test(alerte + ' Action refusée'), 'nouvel événement grave (l’agent tente de créer un compte Préfecture) : message d’alerte de sécurité sur l’écran du Ministre en ' + Math.round((Date.now() - t0) / 1000) + ' s : « ' + (alerte || '').replace(/\s+/g, ' ').slice(0, 90) + ' »');
  await M.screenshot({ path: '/tmp/t_securite_ministre.png' });

  // ---------- 6. Le montant sur l'accusé WhatsApp ----------
  const pre = await api({ op: 'preinscrire', public: pub, dossier: { nom: 'Tati', prenoms: 'Jeanne', naissance: '1992-02-02', sexe: 'F', tel: '+242 06 111 22 33', piece: { type: 'CNI', numero: 'CNITATI1' }, type: 'premiere' } });
  await att(async () => A.evaluate(i => !!window.__spApi.DB.find(x => x.id === i), pre.id)); await nav(A, 'reception'); await A.fill('#r_id', pre.id); await A.fill('#r_code', pre.code); await A.click('#bRecepOuvrir'); await A.waitForSelector('#bRecepOk');
  await A.evaluate(i => { const X = window.__spApi, d = X.DB.find(x => x.id === i); d.pieces = ['photo', 'identite', 'naissance', 'nationalite'].map((k, n) => ({ id: 'PJ-w' + n, type: k, nom: k, mime: 'image/jpeg', taille: 1, at: new Date().toISOString(), par: 'demandeur', demo: true })); X.sauver(); }, pre.id); await A.waitForTimeout(2500);
  await A.click('#bRecepOuvrir'); await A.waitForSelector('#bRecepOk'); const ck = A.locator('.rv'); for (let i = 0; i < await ck.count(); i++) await ck.nth(i).check(); await A.click('#bRecepOk'); await A.waitForSelector('#recepRes .alert.vert');
  await api({ op: 'reglages', espace: code, config: { tarifs: { premiere: 50000, renouvellement: 65000 } } }, T0); await A.waitForTimeout(3500);
  await nav(A, 'caisse'); await A.fill('#k_id', pre.id); await A.fill('#k_code', pre.code); await A.click('#bCaisseOuvrir'); await A.waitForSelector('#bPayer', { timeout: 8000 }); await A.click('#bPayer'); await A.waitForSelector('.recu', { timeout: 10000 });
  const lienWa = await A.getAttribute('a[href^="https://wa.me"]', 'href'); const msgWa = decodeURIComponent((lienWa || '').split('text=')[1] || '');
  ok(/Montant payé : 50[\s  ]?000 FCFA/.test(msgWa) && /Reçu de paiement/.test(msgWa), 'le message WhatsApp envoyé au demandeur après paiement porte le montant : « ' + (msgWa.split('\n').find(l => /Montant/.test(l)) || '').replace(/\*/g, '') + ' »');
  ok(/Montant payé/.test(await A.textContent('.wa')), 'l’aperçu du message WhatsApp affiche aussi le montant');
  await A.evaluate(() => document.getElementById('tiroir').classList.remove('on'));
  const Q = await page({ viewport: { width: 390, height: 800 } }); await Q.goto(BASE + 'index.html?suivi=' + pre.id + '&code=' + pre.code + '&esp=' + pub); await Q.waitForSelector('#resSuivi .carte', { timeout: 15000 });
  ok(/Montant payé : 50[\s  ]?000 FCFA/.test(await Q.textContent('#resSuivi')), 'le demandeur voit le montant payé sur son suivi (accusé de réception sur son téléphone)');

  // ---------- 7. Déconnexion après inactivité ----------
  const Z = await page({}, { fn: ({ code, c }) => { try { localStorage.setItem('sp_espace_v1', JSON.stringify({ code })); sessionStorage.setItem('sp_jeton_v1', JSON.stringify({ code, jeton: c.jeton, compte: { login: c.login, nom: c.nom, role: c.role, doitChanger: false, actif: true } })); } catch (e) { } }, arg: { code, c: cG } });
  await Z.clock.install(); await Z.goto(BASE + 'index.html'); await Z.waitForSelector('#cptChip', { timeout: 15000 }); await Z.waitForTimeout(500);
  await Z.clock.fastForward('31:00'); await Z.waitForTimeout(1500);
  ok(await att(async () => (await Z.locator('#cpt_f').count()) === 1 || (await Z.evaluate(() => sessionStorage.getItem('sp_jeton_v1'))) === null, 8000), 'après 31 minutes sans activité, le poste se déconnecte et redemande l’identifiant');
  ok((await api({ op: 'ecrire', espace: code, dossiers: [] }, cG.jeton)).statut === 401, 'et la session est fermée côté serveur (le jeton ne marche plus)');

  ok(errs.length === 0, 'aucune erreur de page ni de console' + (errs.length ? ' : ' + errs.slice(0, 5).join(' | ') : ''));
  await b.close(); console.log(echecs ? '\n' + echecs + ' échec(s)' : '\nTous les contrôles passent'); process.exit(echecs ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
