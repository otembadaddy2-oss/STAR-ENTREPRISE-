/* Passeport Sûr — connexion du personnel (identifiant + mot de passe), mot de passe oublié, changement de mot de passe, gestion des comptes par la Préfecture.
   N'agit que sur un espace « sécurisé » : un espace de démonstration reste libre d'accès par son code. */
(function () {
'use strict';
const A = window.__spApi, SY = () => window.__spSync; if (!A || !SY()) return;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], esc = A.esc;
const NOM_ROLE = { prefecture: 'Préfecture', ministere: 'Ministère', accueil: 'Accueil', agent: 'Agent de guichet', caisse: 'Caisse', porte: 'Agent de porte' };
const ROLES_CREABLES = ['accueil', 'caisse', 'agent', 'porte', 'ministere', 'prefecture'];
let compte = null;

/* ---------- Style ---------- */
const st = document.createElement('style'); st.textContent = `
#cptOverlay{position:fixed;inset:0;z-index:10000;background:radial-gradient(900px 420px at 80% -10%,#0f6a45 0,transparent 70%),linear-gradient(150deg,#041f15,#0a4430);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:max(16px,env(safe-area-inset-top)) 16px 24px}
#cptOverlay .cpt{background:#fff;color:var(--encre);width:100%;max-width:440px;margin:auto;border-radius:22px;padding:22px 20px;box-shadow:0 18px 60px #0007}
#cptOverlay .cpt img.lg{height:62px;margin:0 auto 6px;display:block}
#cptOverlay h1{font-family:PF,Georgia,serif;font-weight:800;font-size:26px;text-align:center;color:var(--foret);line-height:1.15}
#cptOverlay .sous{text-align:center;margin:6px 0 10px;font-size:14px;color:var(--gris)}
#cptOverlay label{display:block;font-size:13.5px;margin:12px 0 4px;color:var(--foret);font-weight:600}
#cptOverlay input,#cptOverlay select{width:100%;min-height:48px;padding:10px 12px;border:1.5px solid var(--trait);border-radius:12px;background:#fff;font-weight:400;font-size:16px}
#cptOverlay .mdp{display:flex;gap:8px}#cptOverlay .mdp button{flex:0 0 auto;min-height:48px;border:1.5px solid var(--trait);background:#fff;border-radius:12px;padding:0 12px;cursor:pointer}
#cptOverlay .btn{display:block;width:100%;margin-top:16px;min-height:50px;font-size:17px}
#cptOverlay .lien{display:block;margin:12px auto 0;background:none;border:0;color:var(--foret);text-decoration:underline;cursor:pointer;font-size:14.5px;min-height:40px}
#cptOverlay .alert{margin-top:12px}
#cptOverlay .but{margin-top:14px;font-size:12.5px;color:var(--gris);text-align:center;border-top:1px solid var(--trait);padding-top:10px}
#cptOverlay .gros2{font-size:30px;letter-spacing:.08em;text-align:center;font-weight:800;color:var(--foret);margin:8px 0;word-break:break-all}
#cptChip{display:none;position:relative}
#cptChip>button{background:#ffffff1c;border:1px solid #ffffff50;border-radius:10px;padding:7px 10px;color:#fff;font-weight:600;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
#cptMenu{position:absolute;right:0;top:calc(100% + 6px);background:#fff;color:var(--encre);border:1px solid var(--trait);border-radius:14px;box-shadow:0 10px 30px #0004;padding:8px;min-width:230px;z-index:60}
#cptMenu button{display:block;width:100%;text-align:left;background:none;border:0;padding:11px 12px;border-radius:10px;cursor:pointer;min-height:44px}#cptMenu button:hover,#cptMenu button:focus-visible{background:var(--vert2)}
#cptMenu .nm{padding:6px 12px 8px;font-size:13px;color:var(--gris);border-bottom:1px solid var(--trait);margin-bottom:4px}
.tdmp{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:26px;letter-spacing:.12em;font-weight:700;text-align:center;background:var(--jaune2);border:2px dashed #d6b84a;border-radius:14px;padding:14px 8px;margin:10px 0;user-select:all;word-break:break-all}
`; document.head.appendChild(st);

/* ---------- Écrans plein cadre ---------- */
function ouvrir(html) {
  let o = $('#cptOverlay'); if (!o) { o = document.createElement('div'); o.id = 'cptOverlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); document.body.appendChild(o);
    [...document.body.children].forEach(e => { if (e !== o && e.tagName !== 'SCRIPT' && e.tagName !== 'STYLE') e.setAttribute('inert', ''); }); document.body.style.overflow = 'hidden'; }
  o.innerHTML = '<div class="cpt"><img class="lg" src="logo.svg" alt="">' + html + '<div class="but"><b>Passeport Sûr</b> — suivre chaque demande de passeport de A à Z, ordonner la file d’attente, détecter les fraudes.<br>Accès réservé au personnel autorisé. Conçu par STAR ENTREPRISE.</div></div>'; return o;
}
function fermer() { const o = $('#cptOverlay'); if (o) o.remove(); [...document.body.children].forEach(e => e.removeAttribute('inert')); document.body.style.overflow = ''; }
const msg = (h, cl) => { const m = $('#cpt_msg'); if (m) m.innerHTML = h ? '<div class="alert ' + (cl || 'rouge') + '">' + h + '</div>' : ''; };
const espaceTxt = () => { const c = SY().esp() || ''; return c.slice(0, 4) + '-' + c.slice(4); };
const api = () => SY().api;
function bascule(id, btn) { const i = $(id); btn.onclick = () => { const v = i.type === 'password'; i.type = v ? 'text' : 'password'; btn.textContent = v ? 'Masquer' : 'Afficher'; }; }

/* ---------- Connexion ---------- */
function ecranConnexion(pre) {
  ouvrir('<h1>Connexion</h1><p class="sous">Espace ' + espaceTxt() + '</p>' +
    '<form id="cpt_f" novalidate><label for="cpt_login">Identifiant</label><input id="cpt_login" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="30" value="' + esc(pre || '') + '">' +
    '<label for="cpt_mdp">Mot de passe</label><div class="mdp"><input id="cpt_mdp" type="password" autocomplete="current-password" maxlength="100"><button type="button" id="cpt_voir" aria-label="Afficher le mot de passe">Afficher</button></div>' +
    '<div id="cpt_msg" role="alert"></div><button class="btn vert" id="cpt_ok" type="submit">Se connecter</button></form><button class="lien" id="cpt_oubli" type="button">Mot de passe oublié ?</button>');
  bascule('#cpt_mdp', $('#cpt_voir')); (pre ? $('#cpt_mdp') : $('#cpt_login')).focus();
  $('#cpt_f').onsubmit = async e => {
    e.preventDefault(); const l = $('#cpt_login').value.trim(), m = $('#cpt_mdp').value; if (!l || !m) return msg('Saisissez votre identifiant et votre mot de passe.');
    const b = $('#cpt_ok'); b.disabled = true; b.textContent = 'Connexion…'; msg('');
    try { const r = await api().post({ op: 'connexion', espace: SY().esp(), login: l, mdp: m }); compte = r.compte; SY().ouvrirSession(r); if (r.compte.doitChanger) ecranChangement(true, m); else fermer(); }
    catch (er) { b.disabled = false; b.textContent = 'Se connecter'; msg(esc(er.reseau ? 'Pas de connexion : vérifiez votre réseau puis réessayez.' : er.message)); $('#cpt_mdp').value = ''; $('#cpt_mdp').focus(); }
  };
  $('#cpt_oubli').onclick = ecranOubli;
}

/* ---------- Mot de passe oublié ---------- */
function ecranOubli() {
  ouvrir('<h1>Mot de passe oublié</h1><p class="sous">Choisissez votre situation.</p>' +
    '<div class="carte" style="border:1px solid var(--trait);border-radius:14px;padding:12px;margin-top:8px"><b>Je suis agent (accueil, caisse, guichet, porte, Ministère)</b><p class="sous" style="text-align:left;margin:4px 0 0">Prévenez la Préfecture : elle vous remettra un <b>mot de passe temporaire</b>, que vous changerez à la première connexion.</p>' +
    '<label for="ou_login">Votre identifiant</label><input id="ou_login" autocapitalize="none" maxlength="30"><button class="btn" id="ou_ok" type="button" style="background:var(--foret)">Prévenir la Préfecture</button><div id="cpt_msg"></div></div>' +
    '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600">Je suis la Préfecture et j’ai mon code de secours</summary><label for="se_login">Identifiant de la Préfecture</label><input id="se_login" autocapitalize="none" maxlength="30"><label for="se_code">Code de secours</label><input id="se_code" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" maxlength="20"><label for="se_mdp">Nouveau mot de passe</label><input id="se_mdp" type="password" autocomplete="new-password" maxlength="100"><div id="se_msg"></div><button class="btn" id="se_ok" type="button" style="background:var(--foret)">Choisir un nouveau mot de passe</button></details>' +
    '<button class="lien" id="ou_retour" type="button">← Retour à la connexion</button>');
  $('#ou_retour').onclick = () => ecranConnexion(); $('#ou_login').focus();
  $('#ou_ok').onclick = async () => { const l = $('#ou_login').value.trim(); if (!l) return msg('Saisissez votre identifiant.'); $('#ou_ok').disabled = true;
    try { const r = await api().post({ op: 'oubli', espace: SY().esp(), login: l }); msg(esc(r.message), 'vert'); } catch (e) { msg(esc(e.message)); } $('#ou_ok').disabled = false; };
  $('#se_ok').onclick = async () => { const m = $('#se_msg'); m.innerHTML = ''; $('#se_ok').disabled = true;
    try { const r = await api().post({ op: 'secours', espace: SY().esp(), login: $('#se_login').value.trim(), codeSecours: $('#se_code').value, mdp: $('#se_mdp').value });
      ouvrir('<h1>Mot de passe changé</h1><p class="sous">Votre nouveau mot de passe est actif.</p><div class="alert vert">Voici votre <b>nouveau code de secours</b>. Le précédent ne fonctionne plus.</div><div class="gros2">' + esc(r.secours) + '</div><p class="sous">À <b>noter maintenant</b> et ranger en lieu sûr : il ne sera <b>plus jamais affiché</b>.</p><button class="btn vert" id="se_fin" type="button">J’ai noté le code, me connecter</button>'); $('#se_fin').onclick = () => ecranConnexion($('#se_login') ? '' : '');
    } catch (e) { m.innerHTML = '<div class="alert rouge">' + esc(e.message) + '</div>'; $('#se_ok').disabled = false; } };
}

/* ---------- Changement de mot de passe (obligatoire avec un mot de passe temporaire, ou volontaire) ---------- */
function ecranChangement(force, ancien) {
  ouvrir('<h1>' + (force ? 'Choisissez votre mot de passe' : 'Changer mon mot de passe') + '</h1><p class="sous">' + (force ? 'Vous vous êtes connecté avec un mot de passe temporaire : choisissez le vôtre pour continuer.' : 'Saisissez l’ancien mot de passe, puis le nouveau.') + '</p>' +
    '<form id="ch_f" novalidate><label for="ch_old">' + (force ? 'Mot de passe temporaire' : 'Ancien mot de passe') + '</label><input id="ch_old" type="password" autocomplete="current-password" maxlength="100" value="' + esc(ancien || '') + '">' +
    '<label for="ch_new">Nouveau mot de passe</label><input id="ch_new" type="password" autocomplete="new-password" maxlength="100"><p class="sous" style="text-align:left;margin:4px 0 0;font-size:12.5px">8 caractères minimum, avec au moins une lettre et un chiffre.</p>' +
    '<label for="ch_new2">Répétez le nouveau mot de passe</label><input id="ch_new2" type="password" autocomplete="new-password" maxlength="100"><div id="cpt_msg" role="alert"></div><button class="btn vert" id="ch_ok" type="submit">Enregistrer</button></form>' + (force ? '' : '<button class="lien" id="ch_ann" type="button">Annuler</button>'));
  (force ? $('#ch_new') : $('#ch_old')).focus(); const a = $('#ch_ann'); if (a) a.onclick = fermer;
  $('#ch_f').onsubmit = async e => { e.preventDefault(); const n = $('#ch_new').value; if (n !== $('#ch_new2').value) return msg('Les deux nouveaux mots de passe ne sont pas identiques.');
    const b = $('#ch_ok'); b.disabled = true;
    try { const r = await api().post({ op: 'changer-mdp', espace: SY().esp(), ancien: $('#ch_old').value, nouveau: n }); compte = Object.assign({}, compte, { doitChanger: false }); SY().ouvrirSession({ jeton: r.jeton, compte }); fermer(); }
    catch (er) { b.disabled = false; msg(esc(er.message)); } };
}

/* ---------- Pastille du compte connecté + rôle imposé ---------- */
function appliquerCompte(c) {
  compte = c; document.body.classList.add('securise');
  const s = $('#role'); if (s) { if (s.value !== c.role) { s.value = c.role; s.dispatchEvent(new Event('change')); } s.disabled = true; const r = document.querySelector('.role'); if (r) r.style.display = 'none'; }
  let chip = $('#cptChip'); if (!chip) { chip = document.createElement('div'); chip.id = 'cptChip'; const hd = document.querySelector('.hd'); if (hd) hd.appendChild(chip); chip.style.marginLeft = 'auto'; }
  chip.style.display = 'block'; chip.innerHTML = '<button type="button" aria-haspopup="menu" aria-expanded="false">👤 ' + esc(c.nom) + ' · ' + esc(NOM_ROLE[c.role] || c.role) + ' ▾</button>';
  const b = chip.querySelector('button'); b.onclick = e => { e.stopPropagation(); const m = $('#cptMenu'); if (m) { m.remove(); b.setAttribute('aria-expanded', 'false'); return; }
    const d = document.createElement('div'); d.id = 'cptMenu'; d.setAttribute('role', 'menu'); d.innerHTML = '<div class="nm">Connecté : <b>' + esc(c.login) + '</b></div><button type="button" role="menuitem" id="cm_mdp">🔑 Changer mon mot de passe</button><button type="button" role="menuitem" id="cm_out">⎋ Se déconnecter</button>'; chip.appendChild(d); b.setAttribute('aria-expanded', 'true');
    $('#cm_mdp').onclick = () => { d.remove(); ecranChangement(false); }; $('#cm_out').onclick = () => SY().deconnexionCompte(); };
  document.addEventListener('click', () => { const m = $('#cptMenu'); if (m) m.remove(); });
  if (c.role === 'prefecture') installerVueComptes();
  if (c.role === 'prefecture' || c.role === 'ministere') { installerVueSecurite(); demarrerVigie(); }
}

/* ---------- Gestion des comptes (Préfecture) ---------- */
function installerVueComptes() {
  if ($('#v-comptes')) return;
  const nav = $('#onglets') || document.querySelector('nav .in'); if (nav) { const b = document.createElement('button'); b.dataset.v = 'comptes'; b.dataset.roles = 'prefecture'; b.textContent = 'Comptes'; const ref = nav.querySelector('[data-v="reglages"]'); if (ref) ref.after(b); else nav.appendChild(b); }
  const sec = document.createElement('section'); sec.id = 'v-comptes'; sec.className = 'vue';
  sec.innerHTML = '<div class="baniere b-reglages"><div class="txt"><h2>Comptes du personnel</h2><p class="sous">Chaque agent a son identifiant et son mot de passe. Vous créez les comptes, remettez les mots de passe temporaires et réinitialisez en cas d’oubli.</p></div></div>' +
    '<div class="carte"><h3>Créer un compte</h3><div class="grille"><div class="c4"><label for="cp_login">Identifiant</label><input id="cp_login" autocapitalize="none" maxlength="30" placeholder="accueil.marie"></div><div class="c4"><label for="cp_nom">Nom de la personne</label><input id="cp_nom" maxlength="60" placeholder="Marie Nzila"></div><div class="c4"><label for="cp_role">Rôle</label><select id="cp_role">' + ROLES_CREABLES.map(r => '<option value="' + r + '">' + NOM_ROLE[r] + '</option>').join('') + '</select></div></div><div class="ligne" style="margin-top:10px"><button class="btn vert" id="cp_ok">Créer le compte</button></div><div id="cp_msg"></div></div>' +
    '<div class="carte" id="cp_oublis" style="display:none"><h3>Demandes « mot de passe oublié »</h3><div id="cp_oublis_l"></div></div>' +
    '<div class="carte"><h3>Comptes de l’espace</h3><div class="tablewrap"><table><thead><tr><th>Identifiant</th><th>Nom</th><th>Rôle</th><th>État</th><th>Dernière connexion</th><th></th></tr></thead><tbody id="cp_tb"></tbody></table></div><p class="sous" style="margin-top:8px;font-size:13px">Un mot de passe n’est jamais affiché ni enregistré en clair : seul un mot de passe <b>temporaire</b> est montré, une seule fois, au moment de la création ou de la réinitialisation.</p></div>';
  const ref = $('#v-reglages'); (ref ? ref.parentNode : document.body).appendChild(sec);
  $('#cp_ok').onclick = async () => { const m = $('#cp_msg'); m.innerHTML = ''; try { const r = await api().post({ op: 'comptes-creer', espace: SY().esp(), login: $('#cp_login').value, nom: $('#cp_nom').value, role: $('#cp_role').value }); $('#cp_login').value = ''; $('#cp_nom').value = ''; montrerTemp(r.login, r.motDePasseTemporaire, 'Compte créé'); chargerComptes(); } catch (e) { m.innerHTML = '<div class="alert rouge">' + esc(e.message) + '</div>'; } };
}
function montrerTemp(login, mdp, titre) {
  const f = $('#feuille'), t = $('#tiroir'); if (!f || !t) return alert(titre + ' : ' + login + ' — mot de passe temporaire : ' + mdp);
  f.innerHTML = '<h3>' + esc(titre) + '</h3><p>Identifiant : <b>' + esc(login) + '</b></p><div class="tdmp" id="tdmp">' + esc(mdp) + '</div><div class="alert orange"><b>À remettre en main propre ou par un canal sûr.</b> Ce mot de passe temporaire <b>ne sera plus affiché</b>. La personne devra en choisir un nouveau dès sa première connexion.</div><div class="ligne" style="margin-top:10px"><button class="btn clair" id="tdCop">📋 Copier</button><button class="btn vert" id="tdFerme" style="margin-left:auto">J’ai noté, fermer</button></div>';
  t.classList.add('on'); $('#tdFerme').onclick = () => { f.innerHTML = ''; t.classList.remove('on'); }; $('#tdCop').onclick = () => { try { navigator.clipboard.writeText(mdp); $('#tdCop').textContent = '✔ Copié'; } catch (e) { } };
}
async function chargerComptes() {
  if (!$('#cp_tb')) return;
  try {
    const r = await api().get('op=comptes&espace=' + SY().esp());
    $('#cp_tb').innerHTML = r.comptes.map(c => '<tr><td><b>' + esc(c.login) + '</b></td><td>' + esc(c.nom) + '</td><td>' + esc(NOM_ROLE[c.role] || c.role) + '</td><td>' + (c.actif ? (c.doitChanger ? '<span class="badge" style="background:var(--jaune2);color:#6a5300">Mot de passe temporaire</span>' : '<span class="badge" style="background:var(--vert2);color:#0a4430">Actif</span>') : '<span class="badge" style="background:var(--rouge2);color:#8f1d17">Désactivé</span>') + '</td><td>' + (c.dernierLogin ? A.fmtDH(c.dernierLogin) : '—') + '</td><td style="white-space:nowrap"><button class="btn clair petit" data-rz="' + esc(c.login) + '">Réinitialiser le mot de passe</button> ' + (c.login === (compte && compte.login) ? '' : '<button class="btn clair petit" data-bas="' + esc(c.login) + '" data-actif="' + (c.actif ? 0 : 1) + '">' + (c.actif ? 'Désactiver' : 'Réactiver') + '</button>') + '</td></tr>').join('');
    const bo = $('#cp_oublis'); bo.style.display = r.oublis.length ? '' : 'none';
    $('#cp_oublis_l').innerHTML = r.oublis.map(o => '<div class="ligne" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--trait)"><span>🔔 <b>' + esc(o.login) + '</b> a oublié son mot de passe <small style="color:var(--gris)">(' + A.fmtDH(o.demandeLe) + ')</small></span><button class="btn petit" data-rz="' + esc(o.login) + '">Réinitialiser</button></div>').join('');
  } catch (e) { $('#cp_tb').innerHTML = '<tr><td colspan="6">' + esc(e.message) + '</td></tr>'; }
}
document.addEventListener('click', async e => {
  const rz = e.target.closest('[data-rz]'), bas = e.target.closest('[data-bas]');
  if (rz) { if (!confirm('Réinitialiser le mot de passe de « ' + rz.dataset.rz + ' » ? Sa session sera fermée.')) return; try { const r = await api().post({ op: 'comptes-reinitialiser', espace: SY().esp(), login: rz.dataset.rz }); montrerTemp(r.login, r.motDePasseTemporaire, 'Mot de passe réinitialisé'); chargerComptes(); } catch (er) { alert(er.message); } }
  if (bas) { try { await api().post({ op: 'comptes-basculer', espace: SY().esp(), login: bas.dataset.bas, actif: bas.dataset.actif === '1' }); chargerComptes(); } catch (er) { alert(er.message); } }
});

/* ---------- Message volant (refus du serveur, alerte de sécurité) ---------- */
function toastSec(html, grave) {
  let d = $('#secToast'); if (!d) { d = document.createElement('div'); d.id = 'secToast'; d.setAttribute('role', 'status'); d.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:9001;max-width:min(400px,calc(100vw - 28px));color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 10px 30px #0006;font-size:14.5px;border-left:6px solid #f6c928'; document.body.appendChild(d); }
  d.style.background = grave ? '#8f1d17' : '#0a4430'; d.innerHTML = html; clearTimeout(toastSec.t); toastSec.t = setTimeout(() => { const x = $('#secToast'); if (x) x.remove(); }, 10000);
}
window.addEventListener('sp-refus', e => toastSec('<b>Le serveur a refusé une modification</b><br>' + esc(String(e.detail || '')), true));

/* ---------- Déconnexion automatique après 30 minutes sans activité (poste partagé laissé ouvert) ---------- */
let derniereAction = Date.now(); ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(ev => window.addEventListener(ev, () => { derniereAction = Date.now(); }, { passive: true }));
setInterval(() => { if (compte && Date.now() - derniereAction > 30 * 60000) SY().deconnexionCompte(); }, 30000);

/* ---------- Journal de sécurité (Préfecture et Ministère) : qui a fait quoi, tentatives de contournement ---------- */
const LIBELLES = { 'connexion-ok': 'Connexion', 'connexion-echec': 'Connexion refusée', 'connexion-bloquee': 'Compte bloqué (trop d’essais)', 'connexion-bloquee-ip': 'Appareil bloqué (trop d’essais)', 'deconnexion': 'Déconnexion', 'mot-de-passe-change': 'Mot de passe changé', 'mot-de-passe-oublie': 'Mot de passe oublié (demande)', 'mot-de-passe-reinitialise': 'Mot de passe réinitialisé', 'secours-ok': 'Accès retrouvé par code de secours', 'secours-echec': 'Code de secours refusé', 'compte-cree': 'Compte créé', 'compte-reactive': 'Compte réactivé', 'compte-desactive': 'Compte désactivé', 'espace-securise': 'Espace sécurisé', 'espace-efface': 'Espace effacé', 'reglages': 'Réglages modifiés', 'paiement': 'Paiement enregistré', 'refus-droit': 'Action refusée (droits insuffisants)', 'tentative-integrite': 'Tentative de modification interdite', 'tentative-montant': 'Montant non officiel refusé' };
const lib = a => LIBELLES[a] || a;
let dernierGrave = 0, vigie = null;
function installerVueSecurite() {
  if ($('#v-securite')) return;
  const nav = $('#onglets') || document.querySelector('nav .in'); if (nav) { const b = document.createElement('button'); b.dataset.v = 'securite'; b.dataset.roles = 'prefecture,ministere'; b.innerHTML = 'Sécurité<span class="pt" id="ptSec" style="display:none"></span>'; const ref = nav.querySelector('[data-v="fraude"]'); if (ref) ref.after(b); else nav.appendChild(b); }
  const sec = document.createElement('section'); sec.id = 'v-securite'; sec.className = 'vue';
  sec.innerHTML = '<div class="baniere b-reglages"><div class="txt"><h2>Journal de sécurité</h2><p class="sous">Qui s’est connecté, qui a payé, qui a modifié les réglages — et toute tentative de contournement du système. Le journal ne peut qu’être complété : personne ne peut le modifier ni l’effacer sans que cela se voie.</p></div></div>' +
    '<div class="carte"><div class="kpis" id="sec_kpis"></div><div class="ligne" style="margin-top:10px"><button class="btn vert" id="sec_verif">🔒 Vérifier l’intégrité du journal</button><label style="text-transform:none;letter-spacing:0;font-size:14px;display:flex;gap:6px;align-items:center;margin:0 0 0 auto"><input type="checkbox" id="sec_graves" style="width:auto;min-height:0"> Alertes graves seulement</label></div><div id="sec_etat"></div></div>' +
    '<div class="carte"><div class="tablewrap"><table><thead><tr><th>Date et heure</th><th>Qui</th><th>Événement</th><th>Cible</th><th>Détail</th></tr></thead><tbody id="sec_tb"></tbody></table></div><p class="sous" style="margin-top:8px;font-size:13px">Les 200 derniers événements. Les adresses réseau ne sont pas affichées ici.</p></div>';
  const ref = $('#v-reglages') || $('#v-fraude'); (ref ? ref.parentNode : document.body).appendChild(sec);
  $('#sec_graves').onchange = chargerJournal;
  $('#sec_verif').onclick = async () => { const e = $('#sec_etat'); e.innerHTML = '<div class="alert bleu">Vérification en cours…</div>'; try { const r = await api().get('op=journal-verifier&espace=' + SY().esp()); e.innerHTML = r.ok ? '<div class="alert vert">✔ <b>Journal intact</b> : ' + r.lignes + ' lignes, chaînées les unes aux autres. Aucune ligne n’a été modifiée, supprimée ou ajoutée après coup.</div>' : '<div class="alert rouge">✖ <b>Le journal a été falsifié</b> : la chaîne est rompue à la ligne ' + r.rompuA + ' (' + esc(r.raison) + '). Prévenez immédiatement le responsable de la sécurité.</div>'; } catch (er) { e.innerHTML = '<div class="alert rouge">' + esc(er.message) + '</div>'; } };
}
async function chargerJournal() {
  if (!$('#sec_tb')) return;
  try {
    const g = $('#sec_graves') && $('#sec_graves').checked, r = await api().get('op=journal&espace=' + SY().esp() + '&limite=200' + (g ? '&graves=1' : ''));
    $('#sec_kpis').innerHTML = '<div class="kpi"><b>' + r.total + '</b><span>Événements notés</span></div><div class="kpi r"><b>' + r.graves + '</b><span>Événements graves</span></div>';
    $('#sec_tb').innerHTML = r.evenements.map(x => '<tr' + (x.grave ? ' style="background:var(--rouge2)"' : '') + '><td>' + A.fmtDH(x.at) + '</td><td>' + esc(x.login || '—') + (x.role ? ' <small style="color:var(--gris)">(' + esc(NOM_ROLE[x.role] || x.role) + ')</small>' : '') + '</td><td>' + (x.grave ? '🚨 ' : '') + '<b>' + esc(lib(x.action)) + '</b></td><td>' + esc(x.cible) + '</td><td>' + esc(x.detail) + '</td></tr>').join('') || '<tr><td colspan="5" style="color:var(--gris)">Aucun événement.</td></tr>';
  } catch (e) { $('#sec_tb').innerHTML = '<tr><td colspan="5">' + esc(e.message) + '</td></tr>'; }
}
// Veille : toutes les 20 s, un message s'affiche dès qu'un nouvel événement grave est noté (tentative de contournement, montant non officiel, compte bloqué…).
async function veiller() {
  try {
    const r = await api().get('op=journal&espace=' + SY().esp() + '&limite=20&graves=1'); const max = r.evenements.reduce((m, x) => Math.max(m, x.n), 0);
    const pt = $('#ptSec'); if (pt) { pt.textContent = r.graves; pt.style.display = r.graves ? '' : 'none'; }
    if (dernierGrave && max > dernierGrave) { const nouveaux = r.evenements.filter(x => x.n > dernierGrave); const x = nouveaux[0]; toastSec('<b>🛡 Alerte de sécurité</b><br>' + esc(lib(x.action)) + (x.login ? ' — ' + esc(x.login) : '') + (x.cible ? ' · ' + esc(x.cible) : '') + (nouveaux.length > 1 ? '<br><small>+ ' + (nouveaux.length - 1) + ' autre(s)</small>' : ''), true); if ($('#v-securite') && $('#v-securite').classList.contains('on')) chargerJournal(); }
    dernierGrave = Math.max(dernierGrave, max);
  } catch (e) { }
}
function demarrerVigie() { if (vigie) return; veiller(); vigie = setInterval(() => { if (!document.hidden) veiller(); }, 20000); }

window.addEventListener('sp-connexion-requise', () => { compte = null; ecranConnexion(); });
window.addEventListener('sp-changer-mdp', () => { if (!$('#ch_f')) ecranChangement(true); });
window.addEventListener('sp-session', e => { appliquerCompte(e.detail); });
if (SY().attenteConnexion()) ecranConnexion();
if (SY().compte()) appliquerCompte(SY().compte());
window.__spComptes = { render: v => { if (v === 'comptes') chargerComptes(); if (v === 'securite') chargerJournal(); }, compte: () => compte };
})();
