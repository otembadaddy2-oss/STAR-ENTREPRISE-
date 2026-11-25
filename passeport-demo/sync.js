/* Passeport Sûr — synchronisation : espace partagé entre les postes (guichet, caisse, portes, préfecture) et les écrans de la salle,
   pièces jointes sur le serveur, et mode « demandeur » (lien reçu par WhatsApp). Sans espace : l'application reste en mode local. */
(function () {
'use strict';
const A = window.__spApi; if (!A) return;
const $ = s => document.querySelector(s), esc = A.esc, DAY = 86400000;
const CK = 'sp_espace_v1', RK = 'sp_reglages_v1';
const q = new URLSearchParams(location.search);
let cx = null; try { cx = JSON.parse(localStorage.getItem(CK) || 'null'); } catch (e) { }
if (q.get('espace')) { const c = String(q.get('espace')).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); if (c.length === 8) { cx = { code: c }; try { localStorage.setItem(CK, JSON.stringify(cx)); } catch (e) { } } try { history.replaceState(history.state, '', location.pathname + location.hash); } catch (e) { } }
const SK = 'sp_jeton_v1';
let session = null, securise = false; try { const s = JSON.parse(sessionStorage.getItem(SK) || 'null'); if (s && cx && s.code === cx.code && s.jeton) session = s; } catch (e) { }
const entetes = h => session ? Object.assign({}, h, { authorization: 'Bearer ' + session.jeton }) : (h || {});
let version = 0, premier = true, config = null, decal = 0, ecrans = [], publique = '', enligne = null, snap = new Map(), tp = null, tt = null, citoyen = null, dernierEcrans = '';
const strip = d => JSON.stringify(d, (k, v) => k === '__rev' ? undefined : v);
const actif = () => !!cx && !citoyen;
async function http(url, opt) { let r; if (session && /^\/api\/passeport/.test(url)) opt = Object.assign({}, opt, { headers: entetes(opt && opt.headers) }); try { r = await fetch(url, opt); } catch (e) { const x = new Error('Connexion perdue. Vérifiez le réseau puis réessayez. Si vous veniez d’encaisser, rouvrez le dossier : il affichera le reçu s’il a été enregistré.'); x.reseau = true; throw x; } const j = await r.json().catch(() => ({})); if (!r.ok) { if (r.status === 401 && j.connexion && !citoyen) perdreSession(); if (r.status === 403 && j.changer) window.dispatchEvent(new CustomEvent('sp-changer-mdp')); const e = new Error(j.error || ('Erreur ' + r.status)); e.statut = r.status; e.corps = j; throw e; } return j; }
const post = corps => http('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) });
const get = qs => http('/api/passeport?' + qs);

/* ---------- Réglages (serveur si connecté, sinon sur cet appareil) ---------- */
const DEFAUT = { portes: 6, noms: {}, capacite: 60, delai: 1, jours: [1, 2, 3, 4, 5], debut: '08:00', pas: 30, parCreneau: 10, lieu: 'Préfecture de Brazzaville', decalage: 0, tarifs: { premiere: 0, renouvellement: 0 } };
function cfgLocale() { try { return Object.assign({}, DEFAUT, JSON.parse(localStorage.getItem(RK) || '{}')); } catch (e) { return Object.assign({}, DEFAUT); } }
const cfg = () => (actif() && config) ? config : cfgLocale();
async function regler(p) {
  if (actif()) { const r = await post({ op: 'reglages', espace: cx.code, config: Object.assign({}, config || DEFAUT, p) }); config = r.config; return config; }
  const c = Object.assign(cfgLocale(), p); try { localStorage.setItem(RK, JSON.stringify(c)); } catch (e) { } return c;
}
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const ajouterJours = (j, n) => iso(Date.parse(j + 'T00:00:00Z') + n * DAY);
function jourCourant() { const c = cfg(); return iso(Date.now() + (actif() ? decal : 0) + 3600000 + c.decalage * DAY); }
function heureCreneau(c, i) { const [h, m] = c.debut.split(':').map(Number), t = h * 60 + m + Math.floor(i / c.parCreneau) * c.pas; return String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
function prochainRdvLocal() {
  const c = cfg(); let j = ajouterJours(jourCourant(), c.delai);
  for (let i = 0; i < 90; i++, j = ajouterJours(j, 1)) { if (!c.jours.includes(new Date(j + 'T00:00:00Z').getUTCDay())) continue; const n = A.DB.filter(x => x.rdv && x.rdv.date === j).length; if (n < c.capacite) { const max = A.DB.filter(x => x.rdv && x.rdv.date === j).reduce((a, x) => Math.max(a, x.ticket || 0), 0); return { date: j, ticket: max + 1, heure: heureCreneau(c, Math.max(n, max)), lieu: c.lieu }; } }
  return null;
}

/* ---------- Fusion et intégration des dossiers reçus du serveur ---------- */
function fusionner(loc, srv) {
  const m = JSON.parse(JSON.stringify(srv));
  (loc.pieces || []).forEach(p => { if (!(m.pieces || []).some(x => x.id === p.id)) (m.pieces = m.pieces || []).push(p); });
  (loc.history || []).forEach(h => { if (!(m.history || []).some(x => x.at === h.at && x.by === h.by && x.note === h.note && x.s === h.s)) (m.history = m.history || []).push(h); });
  m.history.sort((a, b) => a.at.localeCompare(b.at));
  ['suite', 'suiteAt', 'whatsapp', 'ancienRestitue', 'verifie', 'photos'].forEach(k => { if (loc[k] !== undefined && m[k] === undefined) m[k] = loc[k]; });
  return m;
}
function integrer(lignes) {
  let change = false;
  lignes.forEach(l => { const d = l.data, i = A.DB.findIndex(x => x.id === l.id); d.__rev = l.rev;
    if (i < 0) { A.DB.push(d); snap.set(l.id, strip(d)); change = true; return; }
    if ((A.DB[i].__rev || 0) >= l.rev) return;
    const sale = strip(A.DB[i]) !== snap.get(l.id);          // modifié ici et pas encore envoyé : on fusionne
    A.DB[i] = sale ? Object.assign(fusionner(A.DB[i], d), { __rev: l.rev }) : d; if (!sale) snap.set(l.id, strip(d)); change = true; });
  return change;
}
function majUn(d, rev) { d.__rev = rev; const i = A.DB.findIndex(x => x.id === d.id); if (i < 0) A.DB.push(d); else A.DB[i] = d; snap.set(d.id, strip(d)); A.recalculer(); }

/* ---------- Boucle de synchronisation des postes ---------- */
/* Rythme économe : 1,5 s tant que ça bouge ; 3 s après 1 minute calme ; 5 s après 5 minutes calmes ; onglet caché : 8 s, puis veille après 10 minutes. */
function perdreSession() { session = null; securise = true; try { sessionStorage.removeItem(SK); } catch (e) { } window.dispatchEvent(new CustomEvent('sp-connexion-requise')); }
function ouvrirSession(r) { session = { code: cx.code, jeton: r.jeton, compte: r.compte }; securise = true; try { sessionStorage.setItem(SK, JSON.stringify(session)); } catch (e) { } window.dispatchEvent(new CustomEvent('sp-session', { detail: r.compte })); clearTimeout(tt); enCours = false; tour(); if (!premier) pousser(); }
async function deconnexionCompte() { try { await post({ op: 'deconnexion', espace: cx.code }); } catch (e) { } session = null; try { sessionStorage.removeItem(SK); } catch (e) { } try { indexedDB.deleteDatabase('sp_pieces_v1'); } catch (e) { } location.reload(); }
let dernierChg = Date.now(), dernierGeste = Date.now(), masqueDepuis = 0, veille = false, enCours = false;
const delaiPour = (calme, cache) => cache ? 8000 : calme < 60000 ? 1500 : calme < 300000 ? 3000 : 5000;
const delaiTour = () => delaiPour(Date.now() - Math.max(dernierChg, dernierGeste), document.hidden);
function planifier() { clearTimeout(tt); if (!actif()) return; if (document.hidden && masqueDepuis && Date.now() - masqueDepuis > 600000) { veille = true; return; } tt = setTimeout(tour, delaiTour()); }
function reveiller() { const calme = Date.now() - Math.max(dernierChg, dernierGeste); dernierGeste = Date.now(); if (!actif()) return; if (veille) { veille = false; tour(); } else if (calme > 60000 && !enCours) { clearTimeout(tt); tour(); } }
['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, reveiller, { passive: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden) masqueDepuis = Date.now(); else { masqueDepuis = 0; reveiller(); } });
async function tour() {
  if (!actif() || enCours) return; enCours = true; let change = false;
  try {
    const r = await get('op=sync&espace=' + cx.code + '&since=' + (premier ? 0 : Math.max(0, version - 3)));
    if (premier) { A.DB.length = 0; snap.clear(); }
    if (r.version !== version) dernierChg = Date.now();
    version = r.version; config = r.config; publique = r.publique; decal = Date.parse(r.serveur) - Date.now(); ecrans = r.ecrans;
    change = integrer(r.dossiers) || premier; premier = false; A.recalculer(); majChip(true);
    const e = JSON.stringify(ecrans); if (e !== dernierEcrans) { dernierEcrans = e; change = true; }
    if (change) A.rafraichir('sync');
  } catch (e) { if (e.statut === 404) { enCours = false; deconnecter(); return; } if (e.statut === 401 && e.corps && e.corps.connexion) { enCours = false; return; } if (e.statut === 403 && e.corps && e.corps.changer) { enCours = false; return; } majChip(false); }
  enCours = false; planifier();
}
function apresSauver() { dernierChg = Date.now(); clearTimeout(tp); tp = setTimeout(citoyen ? pousserCitoyen : pousser, 250); }
async function pousser() {
  if (!actif() || premier) return;
  const sales = A.DB.filter(d => strip(d) !== snap.get(d.id)); if (!sales.length) return;
  for (let i = 0; i < sales.length; i += 20) {
    const lot = sales.slice(i, i + 20);
    try {
      const r = await post({ op: 'ecrire', espace: cx.code, dossiers: lot.map(d => ({ id: d.id, baseRev: d.__rev || 0, data: JSON.parse(strip(d)) })) });
      r.acceptes.forEach(a => { const i3 = A.DB.findIndex(x => x.id === a.id); if (i3 < 0) return; if (a.data) { const f = JSON.parse(JSON.stringify(a.data)); f.__rev = a.rev; A.DB[i3] = f; snap.set(a.id, strip(f)); } else { const d = A.DB[i3]; d.__rev = a.rev; snap.set(a.id, strip(d)); } });
      if (r.rejets && r.rejets.length) { r.rejets.forEach(x => { const k = A.DB.findIndex(d => d.id === x.id && !d.__rev); if (k >= 0) A.DB.splice(k, 1); snap.delete(x.id); }); A.recalculer(); window.dispatchEvent(new CustomEvent('sp-refus', { detail: r.rejets.map(x => x.raison).join(' · ') })); }
      if (r.conflits.length) { r.conflits.forEach(c => { const i2 = A.DB.findIndex(x => x.id === c.id); const f = i2 < 0 ? c.data : fusionner(A.DB[i2], c.data); f.__rev = c.rev; if (i2 < 0) A.DB.push(f); else A.DB[i2] = f; snap.set(c.id, strip(c.data) === strip(f) ? strip(f) : snap.get(c.id) || ''); });
        A.recalculer(); apresSauver(); }
      majChip(true);
    } catch (e) { majChip(false); setTimeout(apresSauver, 3000); return; }
  }
  A.rafraichir('sync');
}

/* ---------- Opérations critiques : faites par le serveur (jamais deux fois le même numéro) ---------- */
async function payer(id, montant, mode) {
  try { const r = await post({ op: 'payer', espace: cx.code, id, montant, mode, caissier: 'Caisse' }); majUn(r.dossier, r.rev); return r; }
  catch (e) { if (e.corps && e.corps.dossier) majUn(e.corps.dossier, (A.DB.find(x => x.id === id) || {}).__rev || 0); throw e; }
}
async function porte(op, p) { const r = await post({ op, espace: cx.code, porte: p }); if (r.dossier) majUn(r.dossier, r.rev); return r; }

/* ---------- Pièces sur le serveur ---------- */
const urlPiece = id => citoyen ? '/api/passeport-piece?public=' + citoyen.pub + '&dossier=' + encodeURIComponent(citoyen.id) + '&code=' + citoyen.code + '&id=' + id : '/api/passeport-piece?espace=' + cx.code + '&id=' + id;
async function envoyerPiece(id, blob, mime) {
  for (let t = 0; t < 3; t++) { try { const r = await fetch(urlPiece(id), { method: 'PUT', headers: entetes({ 'content-type': mime }), body: blob }); if (r.ok) return true; if (r.status >= 400 && r.status < 500) break; } catch (e) { } await new Promise(ok => setTimeout(ok, 700 * (t + 1))); }
  throw new Error('Envoi impossible : vérifiez la connexion et réessayez.');
}
async function lirePiece(id) { if (!actif() && !citoyen) return null; try { const r = await fetch(urlPiece(id), { headers: entetes() }); return r.ok ? await r.blob() : null; } catch (e) { return null; } }

/* ---------- Mode demandeur (lien reçu par WhatsApp) ---------- */
let snapPieces = new Set();
function restreindre() {
  $$('#onglets button').forEach(b => { b.style.display = b.dataset.v === 'citoyen' ? '' : 'none'; });
  const r = document.querySelector('.role'); if (r) r.style.display = 'none'; const chip = $('#chipEspace'); if (chip) chip.style.display = 'none';
  document.body.classList.add('citoyen'); const bd = $('#bandeau'); if (bd) bd.innerHTML = 'Démonstration — le dossier affiché est <b>fictif</b>. Seules les informations qui vous concernent sont visibles.'; A.aller('citoyen', true);
}
function $$(s) { return [...document.querySelectorAll(s)]; }
async function pousserCitoyen() {
  const d = A.DB[0]; if (!d || !citoyen) return;
  for (const p of (d.pieces || [])) { if (p.demo || snapPieces.has(p.id)) continue;
    try { const r = await post({ op: 'suivi-piece', public: citoyen.pub, id: citoyen.id, code: citoyen.code, piece: { id: p.id, type: p.type, nom: p.nom, mime: p.mime, taille: p.taille } }); snapPieces.add(p.id); r.dossier.__rev = r.rev; } catch (e) { } }
}
async function suivreCitoyen(premierCoup) {
  try { const r = await get('op=suivi&public=' + citoyen.pub + '&id=' + encodeURIComponent(citoyen.id) + '&code=' + encodeURIComponent(citoyen.code)); const d = r.dossier; d.__rev = r.rev;
    const avant = A.DB[0] ? JSON.stringify(A.DB[0], (k, v) => k === '__rev' ? undefined : v) : ''; const nouveau = JSON.stringify(d, (k, v) => k === '__rev' ? undefined : v);
    const locales = (A.DB[0] && A.DB[0].pieces || []).filter(p => !p.demo && !(d.pieces || []).some(x => x.id === p.id)); locales.forEach(p => d.pieces.push(p));
    (d.pieces || []).forEach(p => snapPieces.add(p.id)); A.DB.length = 0; A.DB.push(d); A.recalculer();
    if (premierCoup || avant !== nouveau) { const b = $('#bSuivre'); if (b && $('#v-citoyen').classList.contains('on')) b.click(); }
  } catch (e) { if (premierCoup) { $('#resSuivi').innerHTML = '<div class="alert rouge">' + esc(e.message) + '</div>'; } }
  if (citoyen) setTimeout(() => suivreCitoyen(false), 6000);
}
let pret = Promise.resolve();
if (q.get('esp') && q.get('suivi')) {
  citoyen = { pub: String(q.get('esp')).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8), id: String(q.get('suivi')).toUpperCase(), code: String(q.get('code') || '').toUpperCase() };
  pret = (async () => { restreindre(); $('#c_id').value = citoyen.id; $('#c_code').value = citoyen.code; await suivreCitoyen(true); })();
}

/* ---------- Pastille de connexion + panneau « Espace partagé » ---------- */
function majChip(en) { enligne = en; const c = $('#chipEspace'); if (!c || citoyen) return; c.className = 'chip-esp ' + (cx ? (en ? 'on' : 'att') : ''); c.textContent = cx ? (en ? '🟢 Espace ' + cx.code.slice(0, 4) + '-' + cx.code.slice(4) : '🟠 Reconnexion…') : '⚪ Mode local';  const bd = $('#bandeau'); if (bd) bd.innerHTML = cx ? 'Proposition de projet · démonstration — toutes les personnes, pièces et numéros affichés sont <b>fictifs</b> et partagés entre les postes de l’espace ' + cx.code.slice(0, 4) + '-' + cx.code.slice(4) + '.' : 'Proposition de projet · démonstration — toutes les personnes, pièces et numéros affichés sont <b>fictifs</b> et restent sur cet appareil.'; }
function lienPoste() { return location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html?espace=' + cx.code; }
function lienEcran() { return location.origin + location.pathname.replace(/[^/]*$/, '') + 'ecran.html?espace=' + cx.code; }
function panneau() {
  const f = $('#feuille'); let h;
  if (!cx) h = '<h3>Espace partagé</h3><p class="sous" style="margin-top:6px">Pour que le guichet, la caisse, les portes, la préfecture et les <b>écrans de la salle</b> travaillent ensemble en temps réel, créez un espace puis donnez son code aux autres postes.</p>' +
    '<div class="carte" style="margin-top:12px"><b>Créer un espace</b><label style="margin-top:8px"><input type="checkbox" id="espDemo" checked style="width:auto;min-height:0"> avec les dossiers de démonstration (' + A.DB.length + ')</label>' +
      '<label style="margin-top:8px"><input type="checkbox" id="espSec" style="width:auto;min-height:0"> <b>Espace sécurisé</b> : chaque agent se connecte avec son identifiant et son mot de passe (recommandé pour un vrai usage)</label>' +
      '<div id="espSecChamps" style="display:none;margin-top:8px"><p class="sous" style="font-size:13px">Compte de l’administrateur (Préfecture). Mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre.</p><div class="grille"><div class="c6"><label for="sec_login">Identifiant</label><input id="sec_login" autocapitalize="none" autocomplete="username" maxlength="30" placeholder="prefecture.brazzaville"></div><div class="c6"><label for="sec_nom">Nom et fonction</label><input id="sec_nom" maxlength="60" placeholder="Le Préfet"></div><div class="c12"><label for="sec_mdp">Mot de passe</label><input id="sec_mdp" type="password" autocomplete="new-password" maxlength="100"></div></div></div>' +
      '<div class="ligne" style="margin-top:10px"><button class="btn vert" id="bCreerEsp">Créer l’espace</button></div></div>' +
    '<div class="carte"><b>Rejoindre un espace</b><div class="ligne" style="margin-top:8px"><input id="espCode" placeholder="CODE À 8 CARACTÈRES" maxlength="9" style="max-width:240px;text-transform:uppercase"><button class="btn" id="bRejoindre">Rejoindre</button></div></div><div id="espMsg"></div><div class="ligne" style="margin-top:8px"><button class="btn clair" id="bFerme">Fermer</button></div>';
  else h = '<h3>Espace partagé</h3><div class="carte" style="text-align:center;margin-top:10px"><div style="font-size:12px;letter-spacing:.14em;color:var(--gris)">CODE DE L’ESPACE (POUR LES POSTES ET LES ÉCRANS)</div><div class="gros" style="font-size:40px;letter-spacing:.08em;margin:6px 0">' + cx.code.slice(0, 4) + '-' + cx.code.slice(4) + '</div>' + A.qr(lienPoste()) + '<div style="font-size:12.5px;color:var(--gris)">Scannez pour relier un autre poste (guichet, caisse, porte, préfecture).</div></div>' +
    '<div class="carte"><b>🖥 Écrans de la salle</b><p class="sous" style="margin:4px 0 8px;font-size:13px">Sur chaque téléviseur, ouvrez ce lien puis touchez « Démarrer » : l’écran affiche les numéros, les noms et les portes en temps réel.</p>' + A.qr(lienEcran()) + '<div class="ligne"><a class="btn clair petit" href="' + lienEcran() + '" target="_blank" rel="noopener" style="text-decoration:none">Ouvrir un écran ici</a><button class="btn clair petit" id="bCopierEcran">Copier le lien de l’écran</button></div>' +
    '<div style="margin-top:8px;font-size:13.5px">' + (ecrans.length ? ecrans.map(e => '🟢 ' + esc(e.nom) + ' <small style="color:var(--gris)">(vu il y a ' + e.ilYa + ' s)</small>').join('<br>') : '<span style="color:var(--gris)">Aucun écran connecté pour l’instant.</span>') + '</div></div>' +
    '<div class="ligne"><button class="btn clair" id="bFerme">Fermer</button><button class="btn rouge" id="bQuitter" style="margin-left:auto">Quitter l’espace</button></div><details style="margin-top:14px"><summary style="cursor:pointer;color:var(--gris);font-size:13.5px">Effacer définitivement cet espace (fin de la démonstration)</summary><p class="sous" style="margin:8px 0">Efface <b>tous les dossiers, pièces jointes et écrans</b> de l’espace sur le serveur, pour tous les postes. Impossible à annuler. Tapez EFFACER pour confirmer.</p><div class="ligne"><input id="espEff" placeholder="EFFACER" style="max-width:180px;text-transform:uppercase"><button class="btn rouge" id="bEffacer">Effacer l’espace</button></div><div id="espEffMsg"></div></details>';
  f.innerHTML = h; $('#tiroir').classList.add('on'); $('#bFerme').onclick = () => $('#tiroir').classList.remove('on');
  const es = $('#espSec'); if (es) es.onchange = () => { $('#espSecChamps').style.display = es.checked ? '' : 'none'; };
  const c = $('#bCreerEsp'); if (c) c.onclick = async () => { c.disabled = true; $('#espMsg').innerHTML = '<div class="alert bleu">Création…</div>'; try { const dossiers = $('#espDemo').checked ? A.DB.map(d => JSON.parse(strip(d))) : []; const corps = { op: 'creer', nom: 'Espace', dossiers }; if (es && es.checked) corps.admin = { login: $('#sec_login').value, nom: $('#sec_nom').value, mdp: $('#sec_mdp').value }; const r = await post(corps); cx = { code: r.code }; localStorage.setItem(CK, JSON.stringify(cx));
    if (r.secours) { const l = await post({ op: 'connexion', espace: r.code, login: corps.admin.login, mdp: corps.admin.mdp }); try { sessionStorage.setItem(SK, JSON.stringify({ code: r.code, jeton: l.jeton, compte: l.compte })); } catch (e2) { } f.innerHTML = '<h3>Espace sécurisé créé</h3><div class="alert vert" style="margin-top:8px">Votre espace est prêt. Vous êtes connecté en tant que <b>' + esc(l.compte.nom) + '</b>.</div><div class="carte" style="text-align:center;margin-top:10px"><div style="font-size:12px;letter-spacing:.14em;color:var(--gris)">CODE DE SECOURS DE LA PRÉFECTURE</div><div class="gros" style="font-size:34px;letter-spacing:.08em;margin:8px 0">' + esc(r.secours) + '</div><p class="sous" style="font-size:13.5px">À <b>noter maintenant et à ranger en lieu sûr</b> : il ne sera <b>plus jamais affiché</b>. Il permet à la Préfecture de retrouver l’accès si elle oublie son mot de passe.</p></div><div class="ligne" style="margin-top:12px"><button class="btn vert" id="bSecNote">J’ai noté le code, continuer</button></div>'; $('#bSecNote').onclick = () => location.reload(); return; }
    location.reload(); } catch (e) { c.disabled = false; $('#espMsg').innerHTML = '<div class="alert rouge">' + esc(e.message) + '</div>'; } };
  const j = $('#bRejoindre'); if (j) j.onclick = async () => { const code = $('#espCode').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); try { await get('op=sync&espace=' + code + '&since=999999999999'); cx = { code }; localStorage.setItem(CK, JSON.stringify(cx)); location.reload(); } catch (e) { $('#espMsg').innerHTML = '<div class="alert rouge">' + esc(e.message) + '</div>'; } };
  const eb = $('#bEffacer'); if (eb) eb.onclick = async () => { if ($('#espEff').value.trim().toUpperCase() !== 'EFFACER') { $('#espEffMsg').innerHTML = '<div class="alert orange">Tapez EFFACER pour confirmer.</div>'; return; } eb.disabled = true;
    try { await fetch('/api/passeport-piece?espace=' + cx.code, { method: 'DELETE', headers: entetes() }); await post({ op: 'supprimer', espace: cx.code, confirmation: 'EFFACER' }); try { localStorage.removeItem(CK); } catch (e) { } $('#espEffMsg').innerHTML = '<div class="alert vert">✔ Espace effacé du serveur. Rechargement…</div>'; setTimeout(() => location.reload(), 1200); }
    catch (e) { eb.disabled = false; $('#espEffMsg').innerHTML = '<div class="alert rouge">' + esc(e.message) + '</div>'; } };
  const qb = $('#bQuitter'); if (qb) qb.onclick = () => { if (confirm('Quitter l’espace partagé ? Cet appareil reprendra ses propres données de démonstration.')) deconnecter(); };
  const cp = $('#bCopierEcran'); if (cp) cp.onclick = () => { try { navigator.clipboard.writeText(lienEcran()); cp.textContent = '✔ Lien copié'; } catch (e) { } };
}
function deconnecter() { clearTimeout(tt); cx = null; try { localStorage.removeItem(CK); } catch (e) { } location.reload(); }
const chip = $('#chipEspace'); if (chip) chip.onclick = panneau; majChip(null);
async function demarrer() {
  try { const i = await get('op=info&espace=' + cx.code); securise = !!i.securise; } catch (e) { if (e.statut === 404) { deconnecter(); return; } }
  if (securise && !session) { window.dispatchEvent(new CustomEvent('sp-connexion-requise')); return; }
  if (session) window.dispatchEvent(new CustomEvent('sp-session', { detail: session.compte }));
  tour();
}
if (actif()) demarrer();

window.__spSync = { securise: () => securise, compte: () => session && session.compte, ouvrirSession, deconnexionCompte, api: { post, get }, attenteConnexion: () => securise && !session, esp: () => cx && cx.code, delaiPour, actif, citoyen: () => !!citoyen, code: () => cx && cx.code, publique: () => publique || (citoyen && citoyen.pub) || '', cfg, regler, jourCourant, prochainRdvLocal, heureCreneau, apresSauver, payer, appeler: p => porte('appeler', p), rappeler: p => porte('rappeler', p), absent: p => porte('absent', p),
  envoyerPiece, lirePiece, ecrans: () => ecrans, pret, panneau, enligne: () => enligne };
})();
