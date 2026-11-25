// Espace sécurisé : connexion (identifiant + mot de passe), rôles imposés, comptes, mot de passe oublié, montant officiel, alerte du Ministre en temps réel.
const { chromium } = require('playwright');
const BASE = 'http://localhost:8766/passeport-demo/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
const att = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fn(); if (r) return r; } catch (e) { } await new Promise(r => setTimeout(r, 250)); } return null; };
const nav = (p, v) => p.evaluate(x => document.querySelector('nav button[data-v="' + x + '"]').click(), v);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = async (w = 1280, h = 900) => { const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|401|403/.test(m.text())) errs.push('CONSOLE ' + m.text()); }); return p; };
  const connexion = async (p, login, mdp) => { await p.fill('#cpt_login', login); await p.fill('#cpt_mdp', mdp); await p.click('#cpt_ok'); };

  // ---------- la Préfecture crée un espace sécurisé ----------
  const P = await ctx(); await P.goto(BASE + 'index.html'); await P.waitForTimeout(1000);
  await P.selectOption('#role', 'prefecture'); await P.click('#chipEspace'); await P.waitForSelector('#espSec');
  await P.check('#espSec'); ok(await P.isVisible('#sec_login'), 'option « Espace sécurisé » : les champs de l’administrateur apparaissent');
  await P.uncheck('#espDemo');
  await P.fill('#sec_login', 'Préfet.Test'); await P.fill('#sec_nom', 'Le Préfet'); await P.fill('#sec_mdp', 'faible'); await P.click('#bCreerEsp');
  ok(/au moins 8|lettre et un chiffre/.test(await att(async () => { const t = await P.textContent('#espMsg'); return /alert/.test(await P.innerHTML('#espMsg')) && t.length > 20 ? t : null; })), 'mot de passe faible refusé dès la création');
  await P.fill('#sec_mdp', 'Brazza2026ok'); await P.click('#bCreerEsp');
  await P.waitForSelector('#bSecNote', { timeout: 15000 });
  const secours = (await P.textContent('.gros')).trim(); ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(secours), 'code de secours affiché une fois : ' + secours);
  await Promise.all([P.waitForNavigation({ timeout: 20000 }).catch(() => { }), P.click('#bSecNote')]); await P.waitForTimeout(2500);
  const code = await P.evaluate(() => JSON.parse(localStorage.getItem('sp_espace_v1')).code);
  ok(await att(async () => (await P.textContent('#cptChip')).includes('Le Préfet')), 'connecté automatiquement : le nom et le rôle s’affichent');
  ok(await P.isDisabled('#role') && !(await P.isVisible('#role')) && await P.isVisible('#bAide'), 'le choix du profil est verrouillé et invisible (le rôle vient du compte), le bouton Aide reste là');
  await nav(P, 'comptes'); await P.waitForSelector('#v-comptes.on'); ok(true, 'onglet « Comptes » disponible pour la Préfecture');

  // ---------- création des comptes ----------
  const creer = async (login, nom, role) => { await P.fill('#cp_login', login); await P.fill('#cp_nom', nom); await P.selectOption('#cp_role', role); await P.click('#cp_ok'); await P.waitForSelector('#tdmp'); const mdp = (await P.textContent('#tdmp')).trim(); await P.click('#tdFerme'); return mdp; };
  const tA = await creer('accueil.marie', 'Marie Nzila', 'accueil'), tM = await creer('cabinet.ministre', 'Cabinet du Ministre', 'ministere'), tC = await creer('caisse.jean', 'Jean Moukala', 'caisse');
  ok([tA, tM, tC].every(x => /^[A-Z2-9]{10}$/.test(x)), 'trois comptes créés ; le mot de passe temporaire est montré une seule fois');
  await P.fill('#cp_login', 'accueil.marie'); await P.fill('#cp_nom', 'Doublon'); await P.click('#cp_ok'); ok(/existe déjà/.test(await att(async () => (await P.textContent('#cp_msg')) || null)), 'identifiant déjà pris : refusé avec un message clair');
  ok((await P.locator('#cp_tb tr').count()) === 4, 'la liste montre les 4 comptes (Préfecture + 3)');

  // ---------- l'accueil : connexion obligatoire ----------
  const A = await ctx(); await A.goto(BASE + 'index.html?espace=' + code); await A.waitForSelector('#cpt_f', { timeout: 10000 });
  ok(await A.isVisible('#cpt_login') && /Connexion/.test(await A.textContent('#cptOverlay h1')), 'ouvrir le lien de l’espace : l’écran de connexion s’affiche avant tout');
  ok((await A.locator('#cptOverlay .but').textContent()).includes('suivre chaque demande de passeport'), 'l’écran de connexion rappelle le but de l’application');
  ok(await A.evaluate(async () => (await fetch('/api/passeport?op=sync&espace=' + window.__spSync.esp() + '&since=0')).status) === 401, 'avant la connexion, le serveur ne donne aucun dossier (401)');
  await connexion(A, 'accueil.marie', 'mauvaismdp1'); ok(/incorrect/.test(await att(async () => (await A.textContent('#cpt_msg')) || null)), 'mauvais mot de passe : « Identifiant ou mot de passe incorrect. »');
  await connexion(A, 'accueil.marie', tA); await A.waitForSelector('#ch_f');
  ok(/Choisissez votre mot de passe/.test(await A.textContent('#cptOverlay h1')), 'mot de passe temporaire : le changement est obligatoire');
  await A.fill('#ch_new', 'court1'); await A.fill('#ch_new2', 'court1'); await A.click('#ch_ok'); ok(/au moins 8/.test(await att(async () => (await A.textContent('#cpt_msg')) || null)), 'nouveau mot de passe trop faible refusé');
  await A.fill('#ch_new', 'Accueil2026ok'); await A.fill('#ch_new2', 'Autre2026okk'); await A.click('#ch_ok'); ok(/pas identiques/.test(await A.textContent('#cpt_msg')), 'deux saisies différentes refusées');
  await A.fill('#ch_new2', 'Accueil2026ok'); await A.click('#ch_ok'); await A.waitForSelector('#cptOverlay', { state: 'detached', timeout: 10000 });
  ok(await att(async () => (await A.textContent('#cptChip')).includes('Marie Nzila') && (await A.textContent('#cptChip')).includes('Accueil')), 'accueil connecté : « Marie Nzila · Accueil »');
  ok((await A.inputValue('#role')) === 'accueil' && await A.isDisabled('#role'), 'rôle Accueil imposé et non modifiable');
  const onglets = await A.evaluate(() => [...document.querySelectorAll('nav button')].filter(b => b.style.display !== 'none').map(b => b.dataset.v));
  ok(onglets.includes('reception') && onglets.includes('caisse') && !onglets.includes('reglages') && !onglets.includes('comptes') && !onglets.includes('guichet') && !onglets.includes('tableau') && !onglets.includes('fraude'), 'l’accueil voit Réception, Caisse et Dossiers, mais ni Réglages, ni Comptes, ni tableau de bord, ni anti-fraude : [' + onglets + ']');
  const aref = await A.evaluate(async () => { try { await window.__spSync.api.post({ op: 'reglages', espace: window.__spSync.esp(), config: { portes: 1 } }); return 'permis'; } catch (e) { return e.statut + ' ' + e.message; } });
  ok(/^403 /.test(aref), 'même en forçant l’appel, le serveur refuse à l’accueil de régler le site : ' + aref);
  const rep = await A.evaluate(async () => { const s = document.getElementById('role'); s.disabled = false; s.value = 'prefecture'; s.dispatchEvent(new Event('change')); try { await window.__spSync.api.post({ op: 'reglages', espace: window.__spSync.esp(), config: { portes: 1 } }); return 'permis'; } catch (e) { return e.statut; } });
  ok(rep === 403, 'même en changeant le profil à la main dans le navigateur, le serveur refuse (403) : les droits ne dépendent pas de l’écran');
  await A.evaluate(() => { const s = document.getElementById('role'); s.value = 'accueil'; s.dispatchEvent(new Event('change')); s.disabled = true; });

  // ---------- le montant officiel est saisi par la Préfecture ----------
  await nav(P, 'reglages'); await P.waitForSelector('#r_tarif1'); ok(/50[\s\u202f\u00a0]?000/.test(await P.textContent('#r_tarif_etat')) && (await P.inputValue('#r_tarif1')) === '50000', 'réglages : le montant officiel de 50 000 FCFA est déjà préenregistré');
  await P.fill('#r_tarif1', '50000'); await P.fill('#r_tarif2', '65000'); await P.click('#bRegler'); await P.waitForSelector('#r_msg .alert.vert');
  ok(/montant officiel est actif/.test(await P.textContent('#r_msg')) && /Montant officiel enregistré/.test(await P.textContent('#r_tarif_etat')), 'montant officiel saisi une fois : confirmation « actif sur tous les postes »');

  // ---------- parcours : pré-enregistrement → accueil → caisse (au montant officiel) ----------
  const pub = await att(async () => (await A.evaluate(() => window.__spSync.publique())) || null);
  const pre = await (await fetch('http://localhost:8766/api/passeport', { method: 'POST', body: JSON.stringify({ op: 'preinscrire', public: pub, dossier: { nom: 'Nzoussi', prenoms: 'Carine', naissance: '1990-02-02', sexe: 'F', type: 'premiere', tel: '+242 06 100 20 30', piece: { type: 'CNI', numero: 'CNI909090', expiration: '2031-01-01' } } }) })).json();
  ok(!!pre.id, 'pré-enregistrement du demandeur sur l’espace sécurisé (sans compte) : ' + pre.id);
  await att(async () => A.evaluate(i => !!window.__spApi.DB.find(x => x.id === i), pre.id)); await nav(A, 'reception'); await A.waitForSelector('#v-reception.on');
  await A.fill('#r_id', pre.id); await A.fill('#r_code', pre.code); await A.click('#bRecepOuvrir'); await A.waitForSelector('#bRecepOk');
  await A.evaluate(i => { const X = window.__spApi, d = X.DB.find(x => x.id === i); d.pieces = ['photo', 'identite', 'naissance', 'nationalite'].map((k, n) => ({ id: 'PJ-c' + n, type: k, nom: k, mime: 'image/jpeg', taille: 1, at: new Date().toISOString(), par: 'demandeur', demo: true })); X.sauver(); }, pre.id);
  await A.click('#bRecepOuvrir'); await A.waitForSelector('#bRecepOk'); const ck = A.locator('.rv'); for (let i = 0; i < await ck.count(); i++) await ck.nth(i).check(); await A.click('#bRecepOk'); await A.waitForSelector('#recepRes .alert.vert');
  await nav(A, 'caisse'); await A.fill('#k_id', pre.id); await A.fill('#k_code', pre.code); await A.click('#bCaisseOuvrir'); await A.waitForSelector('#k_montant', { timeout: 8000 });
  ok((await A.inputValue('#k_montant')) === '50000' && (await A.getAttribute('#k_montant', 'readonly')) !== null && /Montant officiel/.test(await A.textContent('#caisseRes')), 'caisse : le montant officiel 50 000 est pré-rempli et non modifiable');
  await A.click('#bPayer'); await A.waitForSelector('#tiroir.on', { timeout: 10000 });
  const pay = await A.evaluate(i => { const d = window.__spApi.DB.find(x => x.id === i); return { s: d.status, t: d.ticket, m: d.paiement && d.paiement.montant, par: d.paiement && d.paiement.caissier, rdv: d.rdv && d.rdv.date }; }, pre.id);
  ok(pay.s === 'paye' && pay.m === 50000 && pay.par === 'Marie Nzila' && pay.t >= 1 && pay.rdv, 'l’accueil valide le paiement : numéro d’appel ' + pay.t + ', rendez-vous ' + pay.rdv + ', enregistré au nom de « ' + pay.par + ' »');
  await A.click('#bFerme');
  const tentative = await A.evaluate(async () => { const X = window.__spApi, S = window.__spSync; const d = { id: 'BZV-2026-ZZ0001', type: 'premiere', status: 'depose', createdAt: new Date().toISOString(), mrzOk: true, person: { nom: 'TEST', prenoms: 'X', naissance: '1990-01-01', piece: { type: 'CNI', numero: 'CNI1' } }, history: [{ s: 'depose', at: new Date().toISOString(), by: 'x', note: '' }] }; X.DB.push(d); X.sauver(); await new Promise(r => setTimeout(r, 1500)); try { return (await S.api.post({ op: 'payer', espace: S.esp(), id: d.id, montant: 100, mode: 'Espèces' })).dossier ? 'accepté' : '?'; } catch (e) { return e.statut + ' ' + e.message; } });
  ok(/^400 .*officiel/.test(tentative), 'le serveur refuse un montant différent du montant officiel : ' + tentative);

  // ---------- le Ministre : vue réelle + alerte de fraude en temps réel ----------
  const M = await ctx(); await M.goto(BASE + 'index.html?espace=' + code); await M.waitForSelector('#cpt_f'); await connexion(M, 'cabinet.ministre', tM); await M.waitForSelector('#ch_f');
  await M.fill('#ch_new', 'Ministre2026ok'); await M.fill('#ch_new2', 'Ministre2026ok'); await M.click('#ch_ok'); await M.waitForSelector('#cptOverlay', { state: 'detached', timeout: 10000 });
  ok((await M.inputValue('#role')) === 'ministere', 'le Ministre arrive sur son interface (rôle Ministère)');
  ok(await att(async () => (await M.evaluate(() => window.__spApi.DB.length)) >= 1), 'le Ministre voit en temps réel les dossiers de l’espace');
  const refus = await M.evaluate(async () => { try { await window.__spSync.api.post({ op: 'ecrire', espace: window.__spSync.esp(), dossiers: [] }); return 'permis'; } catch (e) { return e.statut; } }); ok(refus === 403, 'le Ministre consulte seulement : toute écriture est refusée (403)');
  ok((await M.locator('#alerteFraude').count()) === 0, 'aucune alerte de fraude pour l’instant : pas de bandeau');
  // un doublon de pièce est enregistré au guichet → alerte grave
  const dup = n => ({ id: 'BZV-2026-D0' + n, type: 'premiere', status: 'depose', createdAt: new Date().toISOString(), mrzOk: true, agent: 'Agent', lieu: 'X', person: { nom: 'FRAUDE' + n, prenoms: 'Test', naissance: '1985-05-0' + n, sexe: 'M', tel: '+242 06 9' + n + '0 00 00', piece: { type: 'CNI', numero: 'CNIDOUBLON77', expiration: '2031-01-01' } }, ancien: null, pieces: [], history: [{ s: 'depose', at: new Date().toISOString(), by: 'Agent 03', note: 'Dossier enregistré' }] });
  const t0 = Date.now(); const r = await P.evaluate(async d => { const S = window.__spSync; return S.api.post({ op: 'ecrire', espace: S.esp(), dossiers: d.map(x => ({ id: x.id, baseRev: 0, data: x })) }); }, [dup(1), dup(2)]);
  ok(r.acceptes.length === 2, 'la Préfecture enregistre deux dossiers avec le même numéro de pièce');
  const bandeau = await att(async () => (await M.locator('#alerteFraude').count()) ? await M.textContent('#alerteFraude') : null, 20000);
  ok(!!bandeau && /alerte/.test(bandeau) && /BZV-2026-D0/.test(bandeau), 'le message d’alerte s’affiche sur l’interface du Ministre en ' + Math.round((Date.now() - t0) / 100) / 10 + ' s : « ' + (bandeau || '').replace(/\s+/g, ' ').trim().slice(0, 110) + '… »');
  ok(await att(async () => (await M.locator('#alerteToast').count()) === 1, 4000), 'un message volant « Nouvelle alerte de fraude » apparaît aussi');
  await M.screenshot({ path: '/tmp/t_comptes_ministre.png' });
  await M.click('#alVoir'); await M.waitForSelector('#v-fraude.on'); ok(true, '« Voir les alertes » ouvre le contrôle anti-fraude');
  await M.click('#alLu'); ok((await M.locator('#alerteFraude').count()) === 0, '« Marquer comme lues » retire le bandeau');
  await M.reload(); await M.waitForTimeout(3000); const apres = { b: await M.locator('#alerteFraude').count() ? (await M.textContent('#alerteFraude')).slice(0, 120) : '', o: await M.locator('#cptOverlay').count() }; ok(apres.o === 0 && apres.b === '', 'après rechargement : toujours connecté (session) et les alertes lues restent lues ' + JSON.stringify(apres));

  // ---------- mot de passe oublié ----------
  const O = await ctx(); await O.goto(BASE + 'index.html?espace=' + code); await O.waitForSelector('#cpt_f'); await O.click('#cpt_oubli'); await O.waitForSelector('#ou_login');
  await O.fill('#ou_login', 'accueil.marie'); await O.click('#ou_ok'); ok(/transmise à la Préfecture/.test(await att(async () => (await O.textContent('#cpt_msg')) || null)), 'mot de passe oublié : la demande est transmise à la Préfecture');
  await nav(P, 'comptes'); ok(await att(async () => { await P.click('#v-comptes', { position: { x: 5, y: 5 } }).catch(() => { }); await nav(P, 'comptes'); return /accueil\.marie.*a oublié/s.test((await P.textContent('#cp_oublis_l')) || ''); }), 'la Préfecture voit « accueil.marie a oublié son mot de passe »');
  P.once('dialog', d => d.accept()); await P.click('#cp_oublis [data-rz="accueil.marie"]'); await P.waitForSelector('#tdmp'); const tA2 = (await P.textContent('#tdmp')).trim(); await P.click('#tdFerme');
  ok(/^[A-Z2-9]{10}$/.test(tA2), 'la Préfecture réinitialise : nouveau mot de passe temporaire remis');
  // la session en cours de l'accueil est fermée → l'écran de connexion revient tout seul
  ok(!!(await att(async () => (await A.locator('#cpt_f').count()) ? 1 : 0, 20000)), 'la session de l’accueil est fermée à la réinitialisation : l’écran de connexion réapparaît seul');
  await connexion(A, 'accueil.marie', 'Accueil2026ok'); ok(/incorrect/.test(await att(async () => (await A.textContent('#cpt_msg')) || null)), 'l’ancien mot de passe ne marche plus');
  await connexion(A, 'accueil.marie', tA2); await A.waitForSelector('#ch_f'); await A.fill('#ch_new', 'Accueil2027ok'); await A.fill('#ch_new2', 'Accueil2027ok'); await A.click('#ch_ok'); await A.waitForSelector('#cptOverlay', { state: 'detached', timeout: 10000 });
  ok(true, 'reconnexion avec le mot de passe temporaire puis nouveau mot de passe');
  // code de secours
  const S2 = await ctx(); await S2.goto(BASE + 'index.html?espace=' + code); await S2.waitForSelector('#cpt_f'); await S2.click('#cpt_oubli'); await S2.waitForSelector('#ou_login'); await S2.evaluate(() => document.querySelector('#cptOverlay details').open = true); await S2.waitForSelector('#se_ok');
  await S2.fill('#se_login', 'prefet.test'); await S2.fill('#se_code', 'AAAA-BBBB-CCCC'); await S2.fill('#se_mdp', 'NouveauPf2026'); await S2.click('#se_ok'); ok(/incorrect/.test(await att(async () => (await S2.textContent('#se_msg')) || null)), 'mauvais code de secours refusé');
  await S2.fill('#se_code', secours); await S2.click('#se_ok'); await S2.waitForSelector('#se_fin'); const nouveau = (await S2.textContent('.gros2')).trim(); ok(/^[A-Z2-9]{4}-/.test(nouveau) && nouveau !== secours, 'la Préfecture retrouve l’accès avec son code de secours ; un nouveau code est remis : ' + nouveau);
  await S2.click('#se_fin'); await S2.waitForSelector('#cpt_f'); await connexion(S2, 'prefet.test', 'NouveauPf2026'); await S2.waitForSelector('#cptOverlay', { state: 'detached', timeout: 10000 }); ok((await S2.textContent('#cptChip')).includes('Le Préfet'), 'connexion de la Préfecture avec le nouveau mot de passe');

  // ---------- déconnexion ----------
  try { await A.click('#cptChip button', { timeout: 4000 }); } catch (e) { const bb = await A.locator('#cptChip button').boundingBox(); const top = await A.evaluate(() => { const b = document.querySelector('#cptChip button').getBoundingClientRect(); const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return el ? el.tagName + '#' + el.id + '.' + el.className : 'rien'; }); console.log('BLOQUE', JSON.stringify(bb), top); await A.screenshot({ path: '/tmp/t_comptes_bloque.png' }); await A.evaluate(() => document.querySelector('#cptChip button').click()); }
  await A.click('#cm_out'); await A.waitForSelector('#cpt_f', { timeout: 10000 }); ok(await A.evaluate(i => !window.__spApi.DB.some(d => d.id === i || /FRAUDE/.test(d.person.nom)), pre.id) && (await A.evaluate(() => sessionStorage.getItem('sp_jeton_v1'))) === null, 'déconnexion : retour à l’écran de connexion, jeton effacé, aucun dossier de l’espace en mémoire');

  // ---------- les écrans de salle et les demandeurs restent ouverts ----------
  const TV = await ctx(1280, 720); await TV.goto(BASE + 'ecran.html?espace=' + code); await TV.waitForTimeout(1500); ok((await TV.locator('#cpt_f').count()) === 0 && (await TV.textContent('body')).length > 20, 'l’écran de la salle d’attente fonctionne sans connexion');
  const Q = await ctx(390, 800); await Q.goto(BASE + 'index.html?suivi=' + pre.id + '&code=' + pre.code + '&esp=' + pub); await Q.waitForSelector('#resSuivi .carte', { timeout: 15000 }); ok((await Q.locator('#cpt_f').count()) === 0, 'le demandeur suit son dossier sans compte, même sur un espace sécurisé');

  ok(errs.length === 0, 'aucune erreur de page ni de console' + (errs.length ? ' : ' + errs.slice(0, 5).join(' | ') : ''));
  await b.close(); console.log(echecs ? '\n' + echecs + ' échec(s)' : '\nTous les contrôles passent'); process.exit(echecs ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(1); });
