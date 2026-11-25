/* Passeport Sûr — guide d'utilisation automatique : orientation au premier lancement, visite guidée par profil,
   carte « Commencez ici », aide et questions fréquentes. Rien n'est envoyé nulle part : seul un petit mémo local (« visite déjà faite »). */
(function () {
'use strict';
const A = window.__spApi; if (!A) return;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], esc = A.esc;
const K = 'sp_guide_v1';
const lire = () => { try { return JSON.parse(localStorage.getItem(K) || '{}') || {}; } catch (e) { return {}; } };
const ecrire = o => { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) { } };
const q = new URLSearchParams(location.search);
const apercu = q.get('apercu') === '1' || (window.self !== window.top && q.get('guide') !== '1');   // dans un cadre (aperçu, vidéo) : pas de guide, sauf ?guide=1
const SY = () => window.__spSync;
const sec = () => !!(SY() && SY().securise && SY().securise());   // espace sécurisé : le rôle vient du compte, on ne le choisit plus

/* ---------- Contenu ---------- */
const PROFILS = {
  agent: { nom: 'Agent de guichet', icone: '🧾', vue: 'guichet', bouton: 'Enregistrer une demande', resume: 'Vous enregistrez les demandes : scan de la pièce, pièces jointes, signature, accusé WhatsApp.' },
  accueil: { nom: 'Accueil (réception)', icone: '🛎', vue: 'reception', bouton: 'Ouvrir l’accueil', resume: 'Vous recevez les demandeurs pré-enregistrés : scan de l’accusé, comparaison avec les pièces originales, envoi à la caisse.' },
  caisse: { nom: 'Caisse', icone: '💳', vue: 'caisse', bouton: 'Ouvrir la caisse', resume: 'Vous encaissez : scan du QR de l’accusé, vérification du dossier, paiement, reçu avec rendez-vous.' },
  porte: { nom: 'Agent de porte', icone: '🚪', vue: 'file', bouton: 'Ouvrir la file d’attente', resume: 'Vous appelez les personnes à votre porte : le numéro, le nom et la porte s’affichent en salle.' },
  prefecture: { nom: 'Préfecture', icone: '🏛', vue: 'tableau', bouton: 'Ouvrir le tableau de bord', resume: 'Vous pilotez : espace partagé, réglages, tableau de bord, alertes anti-fraude, tous les postes.' },
  ministere: { nom: 'Ministère', icone: '🇨🇬', vue: 'tableau', bouton: 'Ouvrir le tableau de bord', resume: 'Vous consultez : situation réelle, alertes, export Excel. Lecture seule.' }
};
const T = {
  agent: [
    { titre: 'Bienvenue, agent de guichet', texte: 'Votre rôle : enregistrer les demandes de passeport. Cette visite dure une minute. Vous pouvez la quitter à tout moment avec « Passer ».' },
    { vue: 'guichet', cible: '#gt1', titre: '1. Type de demande', texte: 'Choisissez « Première demande » ou « Renouvellement » (passeport expiré). Pour un renouvellement, on demande aussi l’ancien passeport.' },
    { cible: '#gt2', titre: '2. Scanner la pièce', texte: 'Photographiez la pièce d’identité : la fiche se remplit toute seule. Si la lecture échoue, remplissez à la main.' },
    { cible: '#gt4', titre: '4. Joindre les pièces', texte: 'Photo ou fichier, pièce par pièce. Si une pièce manque, le dossier reste « incomplet » : on peut le terminer plus tard, ou le demandeur l’envoie depuis son téléphone.' },
    { cible: '#gt5', titre: '5. Signature', texte: 'Le demandeur signe avec le doigt ou un stylet, directement sur l’écran.' },
    { cible: '#bValider', titre: 'Valider et donner l’accusé', texte: 'Un accusé est créé avec le numéro de reçu et un code QR. Envoyez-le au demandeur par WhatsApp : il le présentera à la caisse.' },
    { cible: '#chipEspace', titre: 'Travailler avec les autres postes', texte: 'Si la Préfecture a créé un espace, touchez ici et entrez son code : votre poste travaille alors en direct avec la caisse, les portes et les écrans.' }
  ],
  accueil: [
    { titre: 'Bienvenue à l’accueil', texte: 'Votre rôle : recevoir les demandeurs qui se sont pré-enregistrés sur leur téléphone, vérifier leurs pièces originales, puis les envoyer à la caisse. Cette visite dure une minute.' },
    { vue: 'reception', cible: '#bScanRecep', titre: 'Scanner l’accusé', texte: 'Le demandeur présente son accusé : touchez ici et placez le code QR devant la caméra. Son dossier s’ouvre tout seul.' },
    { cible: '#r_id', titre: 'Ou saisir le numéro', texte: 'Sans caméra : tapez le N° de dossier et le code de contrôle à 6 caractères, puis « Ouvrir le dossier ».' },
    { cible: '#bRecepEx', titre: 'S’entraîner', texte: '« Exemple » ouvre un pré-enregistrement fictif pour essayer sans risque.' },
    { cible: '#recepRes', titre: 'Comparer avec les originaux', texte: 'Vous voyez la fiche et les pièces. Corrigez les petites erreurs de saisie, cochez les trois vérifications, puis « Vérifié : envoyer à la caisse ». En cas d’écart, choisissez le motif et signalez-le : la Préfecture est alertée et la caisse reste bloquée.', centre: true },
    { cible: '#tbRecep', titre: 'Les personnes attendues', texte: 'Ici, les pré-enregistrés qui ne sont pas encore passés à l’accueil. Le bouton « Copier le lien » donne le lien à communiquer aux demandeurs.' }
  ],
  caisse: [
    { titre: 'Bienvenue à la caisse', texte: 'Votre rôle : encaisser le paiement. Le demandeur arrive avec son accusé WhatsApp. Cette visite dure une minute.' },
    { vue: 'caisse', cible: '#bScanCaisse', titre: 'Scanner le QR', texte: 'Touchez ici et présentez le code QR de l’accusé devant la caméra : le dossier s’ouvre tout seul.' },
    { cible: '#k_id', titre: 'Ou saisir le numéro', texte: 'Sans caméra : tapez le N° de reçu et le code de contrôle à 6 caractères, puis « Ouvrir le dossier ».' },
    { cible: '#bScanEx', titre: 'S’entraîner', texte: '« Exemple » ouvre un dossier fictif pour essayer sans risque.' },
    { cible: '#caisseRes', titre: 'Vérifier avant d’encaisser', texte: 'Ici s’affichent la fiche, les pièces, la signature et les alertes. Si une pièce manque ou si une alerte grave n’est pas examinée, l’encaissement est bloqué.', centre: true },
    { cible: '#kpisCaisse', titre: 'Après le paiement', texte: 'Un reçu s’imprime avec le rendez-vous d’enrôlement et le N° d’appel. Le bouton WhatsApp envoie la date de rendez-vous au demandeur. Vos encaissements du jour s’affichent ici.' }
  ],
  porte: [
    { titre: 'Bienvenue, agent de porte', texte: 'Votre rôle : appeler les personnes une par une à votre porte. Cette visite dure une minute.' },
    { vue: 'file', cible: '#jourFile', titre: 'Les rendez-vous du jour', texte: 'La file ne contient que les personnes qui ont rendez-vous aujourd’hui, dans l’ordre de leur paiement.' },
    { cible: '#portes', titre: 'Votre porte', texte: '« Appeler le suivant » : le numéro, le nom et la porte s’affichent sur les écrans, avec la voix. « Rappeler » répète l’appel. « Absent » renvoie la personne en fin de file.', centre: true },
    { cible: '#bPortesPlus', titre: 'Nombre de portes', texte: 'Ouvrez ou fermez des portes avec + et − (de 1 à 12). Le petit crayon ✎ donne un nom à une porte, par exemple « Vérification des pièces ».' },
    { cible: '#ecransCo', titre: 'Écrans de la salle', texte: 'Chaque numéro reste au moins 10 secondes à l’écran avant le suivant. Ici, vous voyez les écrans connectés.' }
  ],
  prefecture: [
    { titre: 'Bienvenue à la Préfecture', texte: 'Vous pilotez tout le dispositif. Cette visite dure une minute.' },
    { cible: '#chipEspace', titre: '1. Créer l’espace partagé', texte: 'Touchez ici : « Créer l’espace » donne un code. Les postes (guichet, caisse, portes) le rejoignent avec ce code, les écrans de salle aussi. Le panneau donne les liens et les QR à partager.' },
    { vue: 'reglages', cible: '#v-reglages .carte', titre: '2. Régler le site', texte: 'Nombre de portes, nombre de personnes par jour, jours ouverts, heure de début, lieu. Ces valeurs sont des exemples à confirmer avec la Préfecture.' },
    { vue: 'file', cible: '#portes', titre: '3. Salle d’attente', texte: 'Les écrans affichent les appels en direct. Sur chaque écran : entrer le code, un nom d’écran, puis « Démarrer ».', centre: true },
    { vue: 'tableau', cible: '#v-tableau .kpis', titre: '4. Tableau de bord', texte: 'Qui a demandé, qui a payé, qui est reçu, qui a son passeport, et l’export Excel.' },
    { cible: 'nav [data-v="fraude"]', titre: '5. Contrôle anti-fraude', texte: 'Doublons, faux, réseaux, agents et délais suspects sont signalés automatiquement. Un cas grave bloque l’encaissement tant qu’il n’est pas examiné.' }
  ],
  ministere: [
    { titre: 'Bienvenue au Ministère', texte: 'Vous consultez la situation réelle, sans pouvoir modifier les dossiers. Cette visite dure une minute.' },
    { vue: 'tableau', cible: 'nav [data-v="tableau"]', titre: 'Tableau de bord', texte: 'Qui a demandé, qui a payé, qui est reçu, qui a reçu son passeport, délais moyens, renouvellements.' },
    { cible: 'nav [data-v="fraude"]', titre: 'Alertes anti-fraude', texte: 'Les cas suspects sont classés par gravité : doublons, fausses identités, réseaux, agents à surveiller.' },
    { cible: 'nav [data-v="dossiers"]', titre: 'Tous les dossiers', texte: 'Recherche, filtres, fiche complète et historique. Le bouton Excel exporte la liste.' }
  ],
  demandeur: [
    { titre: 'Suivre votre passeport', texte: 'Cette page vous montre où en est votre dossier, sans connexion ni mot de passe.' },
    { cible: '#resSuivi', titre: 'Votre dossier', texte: 'Les étapes sont cochées au fur et à mesure. Après le paiement, vous voyez la date de votre rendez-vous et votre numéro d’appel.', centre: true },
    { cible: '#resSuivi', titre: 'Pièces manquantes', texte: 'S’il manque un document, vous pouvez le prendre en photo ou le joindre ici : inutile de revenir au guichet.', centre: true }
  ]
};
const FAQ = [
  ['Le demandeur peut-il s’enregistrer lui-même ?', 'Oui. Avec le lien de pré-enregistrement donné par la Préfecture, il remplit sa fiche sur son téléphone et reçoit un accusé avec un code QR. Il se présente ensuite à l’accueil avec ses pièces originales ; après vérification, il passe à la caisse. Sans cette vérification, le paiement est impossible.'],
  ['Comment le demandeur reçoit-il son accusé ?', 'À la fin de l’enregistrement, un bouton prépare le message WhatsApp avec le numéro de reçu et le code QR. Dans cette démonstration, c’est l’agent qui touche le bouton ; l’envoi automatique demande un compte WhatsApp Business de la Préfecture.'],
  ['Une pièce manque : que faire ?', 'Le dossier est enregistré « incomplet ». Le demandeur peut envoyer la pièce depuis son téléphone avec son lien de suivi, ou l’agent la joint plus tard. La caisse ne peut pas encaisser tant qu’une pièce obligatoire manque.'],
  ['Pourquoi l’encaissement est-il bloqué ?', 'Soit une pièce obligatoire manque, soit une alerte grave (doublon, pièce modifiée…) n’a pas encore été examinée par la Préfecture.'],
  ['Comment travailler à plusieurs postes ?', 'La Préfecture touche la puce « Mode local » en haut et crée un espace : un code de 8 caractères. Chaque poste le saisit (ou ouvre le lien partagé) et tout se synchronise en direct.'],
  ['Comment afficher la salle d’attente sur un écran ?', 'Ouvrez le lien « écran » sur la télévision ou la tablette, entrez le code de l’espace, donnez un nom à l’écran, touchez « Démarrer » puis « Activer le son et la voix ».'],
  ['Que veut dire « Absent » ?', 'La personne appelée ne s’est pas présentée : elle repart en fin de file et ne sera rappelée qu’après les autres.'],
  ['Combien de temps un numéro reste-t-il à l’écran ?', 'Au moins 10 secondes. Si plusieurs portes appellent en même temps, les appels passent l’un après l’autre, chacun annoncé à voix haute avec la porte.'],
  ['Les données sont-elles réelles ?', 'Non. Toutes les personnes, pièces, numéros et montants sont fictifs. La liste des pièces et le tarif sont des exemples à confirmer avec la Préfecture. Aucune vérification d’authenticité des documents n’est prétendue.'],
  ['Et sans connexion Internet ?', 'En mode local, l’application garde tout sur l’appareil. En espace partagé, une coupure est signalée (« Reconnexion… ») et la reprise est automatique.']
];

/* ---------- Style ---------- */
const css = document.createElement('style');
css.textContent = `
#guideVoile{position:fixed;inset:0;z-index:90;background:transparent}
#guideSpot{position:fixed;z-index:91;border-radius:16px;pointer-events:none;box-shadow:0 0 0 100vmax rgba(3,26,17,.62),0 0 0 3px #f6c928;transition:left .35s cubic-bezier(.16,1,.3,1),top .35s cubic-bezier(.16,1,.3,1),width .35s cubic-bezier(.16,1,.3,1),height .35s cubic-bezier(.16,1,.3,1)}
#guideSpot.plein{box-shadow:0 0 0 100vmax rgba(3,26,17,.62);width:0!important;height:0!important}
.guideCarte{position:fixed;z-index:92;width:min(400px,calc(100vw - 24px));background:rgba(255,255,255,.9);-webkit-backdrop-filter:blur(22px) saturate(1.6);backdrop-filter:blur(22px) saturate(1.6);border:1px solid #ffffffcc;border-radius:20px;box-shadow:0 18px 50px #031a1155,inset 0 1px 0 #fff;padding:18px 18px 14px;color:#12201a;animation:gc .35s cubic-bezier(.16,1,.3,1)}
@keyframes gc{from{opacity:0;transform:translateY(10px) scale(.97)}}
.guideCarte h3{font-family:PF,serif;font-weight:800;font-size:21px;line-height:1.2;margin:0 0 6px;color:#062b1e}
.guideCarte p{font-size:15px;line-height:1.5;margin:0 0 12px;color:#26342d}
.guideCarte .bas{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.guideCarte .pts{display:flex;gap:5px;margin-right:auto}.guideCarte .pts i{width:8px;height:8px;border-radius:50%;background:#d6d0b9}.guideCarte .pts i.on{background:#009543;width:20px;border-radius:5px}
.guideCarte button,.guideBtn{border:0;border-radius:12px;padding:10px 15px;font:600 14px ID,system-ui,sans-serif;cursor:pointer;background:#062b1e;color:#fff;min-height:42px}
.guideCarte button.sec,.guideBtn.sec{background:#fff;color:#062b1e;border:1.5px solid #cfc8b2}
.guideCarte button.lien{background:none;color:#5d6b64;padding:10px 6px;text-decoration:underline}
.guideCarte button:focus-visible,.guideBtn:focus-visible{outline:3px solid #f6c928;outline-offset:2px}
.guideCarte.mobile{left:12px!important;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));top:auto!important;width:auto}
.guideCentre{left:50%;top:50%;transform:translate(-50%,-50%)}
@media(max-height:560px){.guideCarte p{font-size:14px}}
.guideProfils{display:grid;gap:8px;margin:4px 0 12px}
.guideProfils button{display:flex;align-items:center;gap:12px;text-align:left;background:#fff;color:#062b1e;border:1.5px solid #e0dac6;border-radius:14px;padding:10px 12px;min-height:52px}
.guideProfils button b{display:block;font-size:15px}.guideProfils button span{font-size:12.5px;color:#5d6b64;font-weight:300}
.guideProfils button i{font-style:normal;font-size:24px}
.guideProfils button:hover{border-color:#009543;background:#f3faf5}
#guideInvit{position:fixed;z-index:70;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));width:min(340px,calc(100vw - 28px));animation:gc .4s cubic-bezier(.16,1,.3,1)}
#guideInvit.guideCarte{position:fixed;z-index:70}
#guideAide{position:fixed;z-index:70;right:14px;top:84px;width:min(340px,calc(100vw - 28px))}
.guideFaq{max-height:min(70vh,560px);overflow:auto;margin:0 -6px 10px;padding:0 6px}
.guideFaq details{border-top:1px solid #e0dac6;padding:9px 0}.guideFaq summary{font-weight:600;font-size:14.5px;cursor:pointer;color:#062b1e}.guideFaq details p{margin:6px 0 0;font-size:14px}
.commence{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.commence .ic{font-size:34px;line-height:1}.commence .tx{flex:1 1 260px}.commence b.t{font-family:PF,serif;font-size:19px;color:#062b1e}.commence p{color:#5d6b64;font-size:14px;margin:2px 0 0}
.commence .ligne{display:flex;gap:8px;flex-wrap:wrap}
#bAide{border:1px solid #ffffff55;background:#ffffff1c;color:#fff;border-radius:999px;padding:6px 12px;font:600 12.5px ID,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
@media(prefers-reduced-motion:reduce){.guideCarte,#guideInvit{animation:none}#guideSpot{transition:none}}
@media print{#guideVoile,#guideSpot,.guideCarte,#guideInvit,#bAide{display:none!important}}
`;
document.head.appendChild(css);

/* ---------- Visite guidée ---------- */
let etat = null;   // { cle, etapes, i, retour }
const mobile = () => window.innerWidth < 700;
const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
function nettoyer() {
  ['guideVoile', 'guideSpot', 'guideCarte'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
  window.removeEventListener('resize', repositionner); window.removeEventListener('scroll', repositionner, true); document.removeEventListener('keydown', touches, true);
  const f = etat && etat.retourFocus; etat = null; if (f && f.focus) { try { f.focus(); } catch (e) { } }
}
function marquer(cle, v) { const m = lire(); m.faits = m.faits || {}; m.faits[cle] = v; m.vu = true; ecrire(m); }
function fermer(termine) { if (!etat) return; const cle = etat.cle; nettoyer(); marquer(cle, termine ? 'fait' : 'passe'); majCommence(); }
function touches(e) {
  if (!etat) return;
  if (e.key === 'Escape') { e.preventDefault(); fermer(false); }
  else if (e.key === 'ArrowRight' || e.key === 'Enter') { if (e.target && e.target.tagName === 'BUTTON' && e.key === 'Enter') return; e.preventDefault(); suivant(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); precedent(); }
  else if (e.key === 'Tab') { const c = document.getElementById('guideCarte'); if (!c) return; const bs = [...c.querySelectorAll('button')]; if (!bs.length) return; const premier = bs[0], dernier = bs[bs.length - 1]; if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); } else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); } else if (!c.contains(document.activeElement)) { e.preventDefault(); premier.focus(); } }
}
function cibleDe(st) { if (!st.cible) return null; const el = document.querySelector(st.cible); return visible(el) ? el : null; }
function afficherEtape() {
  if (!etat) return; const st = etat.etapes[etat.i];
  if (st.vue) { try { A.aller(st.vue, true); } catch (e) { } window.setTimeout(placer, 90); window.setTimeout(placer, 650); }   // la page arrive avec une animation : on recale ensuite
  let carte = document.getElementById('guideCarte');
  if (!carte) { carte = document.createElement('div'); carte.id = 'guideCarte'; carte.className = 'guideCarte'; carte.setAttribute('role', 'dialog'); carte.setAttribute('aria-modal', 'true'); carte.setAttribute('aria-labelledby', 'guideTitre'); document.body.appendChild(carte); }
  const n = etat.etapes.length, dernier = etat.i === n - 1;
  carte.innerHTML = '<h3 id="guideTitre">' + esc(st.titre) + '</h3><p>' + esc(st.texte) + '</p><div class="bas"><div class="pts" aria-hidden="true">' + etat.etapes.map((_, k) => '<i class="' + (k === etat.i ? 'on' : '') + '"></i>').join('') + '</div>' +
    (etat.i > 0 ? '<button type="button" class="sec" id="gPrec">Précédent</button>' : '<button type="button" class="lien" id="gPasser">Passer</button>') +
    '<button type="button" id="gSuiv">' + (dernier ? 'Terminer' : 'Suivant') + '</button></div>' + (etat.i > 0 && !dernier ? '<div style="text-align:right;margin-top:4px"><button type="button" class="lien" id="gPasser" style="font-size:12.5px;min-height:30px">Passer la visite</button></div>' : '');
  const sp = $('#gSuiv'); sp.onclick = suivant; const pr = $('#gPrec'); if (pr) pr.onclick = precedent; const pa = $('#gPasser'); if (pa) pa.onclick = () => fermer(false);
  window.setTimeout(() => { if (etat) { const b = $('#gSuiv'); if (b) b.focus({ preventScroll: true }); } }, 30);
  placer();
}
function placer() {
  if (!etat) return; const st = etat.etapes[etat.i], carte = document.getElementById('guideCarte'), sp = document.getElementById('guideSpot'); if (!carte || !sp) return;
  const el = cibleDe(st);
  carte.classList.toggle('mobile', mobile()); carte.classList.remove('guideCentre');
  if (!el) { sp.className = 'plein'; carte.style.left = carte.style.top = ''; carte.classList.add('guideCentre'); if (mobile()) carte.classList.remove('guideCentre'); return; }
  sp.className = '';
  const r0 = el.getBoundingClientRect(), grand = r0.height > window.innerHeight * 0.55;
  if (!etat.defile || etat.defile !== el) { try { el.scrollIntoView({ block: mobile() ? 'start' : (grand ? 'start' : 'center'), behavior: 'instant' }); if (mobile()) window.scrollBy(0, -90); } catch (e) { } etat.defile = el; }
  const r = el.getBoundingClientRect(), pad = 6, vh = window.innerHeight, vw = window.innerWidth;
  const top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad), h = Math.min(r.height + pad * 2, vh - top - 4), w = Math.min(r.width + pad * 2, vw - left - 4);
  sp.style.left = left + 'px'; sp.style.top = top + 'px'; sp.style.width = w + 'px'; sp.style.height = h + 'px';
  if (mobile()) { carte.style.left = ''; carte.style.top = ''; return; }
  const cw = Math.min(400, vw - 24), ch = carte.offsetHeight || 190; let cx = Math.min(Math.max(12, r.left), vw - cw - 12), cy;
  if (st.centre || h > vh * 0.5) { cy = Math.min(vh - ch - 14, Math.max(14, vh - ch - 18)); cx = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), vw - cw - 12); }
  else if (r.bottom + pad + 14 + ch < vh) cy = r.bottom + pad + 14;
  else if (r.top - pad - 14 - ch > 0) cy = r.top - pad - 14 - ch;
  else cy = Math.max(12, vh - ch - 14);
  carte.style.left = cx + 'px'; carte.style.top = cy + 'px';
}
let rp = 0; function repositionner() { cancelAnimationFrame(rp); rp = requestAnimationFrame(placer); }
function suivant() { if (!etat) return; if (etat.i >= etat.etapes.length - 1) { fermer(true); return; } etat.i++; etat.defile = null; afficherEtape(); }
function precedent() { if (!etat || etat.i === 0) return; etat.i--; etat.defile = null; afficherEtape(); }
function visite(cle) {
  fermerPanneaux(); if (etat) nettoyer();
  const etapes = T[cle]; if (!etapes) return;
  etat = { cle, etapes, i: 0, retourFocus: document.activeElement };
  const v = document.createElement('div'); v.id = 'guideVoile'; document.body.appendChild(v);
  const sp = document.createElement('div'); sp.id = 'guideSpot'; sp.className = 'plein'; document.body.appendChild(sp);
  window.addEventListener('resize', repositionner); window.addEventListener('scroll', repositionner, true); document.addEventListener('keydown', touches, true);
  afficherEtape();
}

/* ---------- Invitation, choix du profil, aide ---------- */
function fermerPanneaux() { ['guideInvit', 'guideAide', 'guideProfil', 'guideFaqBox'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); }); }
function profilCourant() { return (A.role && T[A.role]) ? A.role : 'agent'; }
function invitation(role) {
  if (apercu || etat) return; fermerPanneaux();
  const p = PROFILS[role] || null; if (!p) return;
  const d = document.createElement('div'); d.id = 'guideInvit'; d.className = 'guideCarte'; d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'Visite guidée');
  d.innerHTML = '<h3>' + p.icone + ' Profil : ' + esc(p.nom) + '</h3><p>Voulez-vous une visite guidée de ce profil ? Elle dure environ une minute.</p><div class="bas"><button type="button" class="lien" id="iNon">Non merci</button><button type="button" id="iOui" style="margin-left:auto">▶ Commencer</button></div>';
  document.body.appendChild(d);
  $('#iNon').onclick = () => { marquer(role, 'passe'); d.remove(); majCommence(); };
  $('#iOui').onclick = () => { d.remove(); visite(role); };
}
function choixProfil(premiere) {
  if (sec()) return;
  if (apercu) return; fermerPanneaux(); if (etat) nettoyer();
  const v = document.createElement('div'); v.id = 'guideVoile'; v.style.background = 'rgba(3,26,17,.55)'; document.body.appendChild(v);
  const c = document.createElement('div'); c.id = 'guideProfil'; c.className = 'guideCarte guideCentre'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-labelledby', 'gpT'); c.style.zIndex = 92; c.style.width = 'min(460px,calc(100vw - 24px))'; c.style.maxHeight = 'calc(100vh - 24px)'; c.style.overflow = 'auto';
  if (mobile()) { c.classList.remove('guideCentre'); c.style.left = '12px'; c.style.right = '12px'; c.style.top = '12px'; c.style.width = 'auto'; }
  c.innerHTML = '<h3 id="gpT">' + (premiere ? 'Bienvenue sur Passeport Sûr' : 'Choisissez votre profil') + '</h3><p>' + (premiere ? 'Proposition de projet pour le suivi des demandes de passeport, avec des données fictives. ' : '') + 'Quel est votre rôle ? L’application s’adapte et vous guide pas à pas.</p><div class="guideProfils">' +
    Object.keys(PROFILS).map(k => '<button type="button" data-p="' + k + '"><i>' + PROFILS[k].icone + '</i><div><b>' + esc(PROFILS[k].nom) + '</b><span>' + esc(PROFILS[k].resume) + '</span></div></button>').join('') + '</div><div class="bas"><button type="button" class="lien" id="gpPlus">Je regarde seulement</button></div>';
  document.body.appendChild(c);
  const sortir = () => { c.remove(); v.remove(); };
  c.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const k = b.dataset.p; sortir(); const s = $('#role'); if (s.value !== k) { s.value = k; s.dispatchEvent(new Event('change')); } else majCommence(); try { A.aller(PROFILS[k].vue); } catch (e) { } window.setTimeout(() => visite(k), 450); });
  $('#gpPlus').onclick = () => { sortir(); const m = lire(); m.vu = true; ecrire(m); };
  const premierBtn = c.querySelector('[data-p]'); if (premierBtn) premierBtn.focus({ preventScroll: true });
  const esc2 = e => { if (e.key === 'Escape') { document.removeEventListener('keydown', esc2, true); if (document.getElementById('guideProfil')) { sortir(); const m = lire(); m.vu = true; ecrire(m); } } }; document.addEventListener('keydown', esc2, true);
}
function faq() {
  fermerPanneaux(); const v = document.createElement('div'); v.id = 'guideFaqBox'; v.className = 'guideCarte guideCentre'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Questions fréquentes'); v.style.width = 'min(520px,calc(100vw - 24px))'; v.style.zIndex = 93;
  if (mobile()) { v.classList.remove('guideCentre'); v.style.left = '12px'; v.style.right = '12px'; v.style.top = '12px'; v.style.width = 'auto'; }
  v.innerHTML = '<h3>Questions fréquentes</h3><div class="guideFaq">' + FAQ.map(f => '<details><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>').join('') + '</div><div class="bas"><button type="button" id="fFerme" style="margin-left:auto">Fermer</button></div>';
  document.body.appendChild(v); $('#fFerme').onclick = () => v.remove(); $('#fFerme').focus({ preventScroll: true });
  const k = e => { if (e.key === 'Escape') { v.remove(); document.removeEventListener('keydown', k, true); } }; document.addEventListener('keydown', k, true);
}
let diffInst = null; window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); diffInst = e; }); window.addEventListener('appinstalled', () => { diffInst = null; });
const dejaInstalle = () => { try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
function panneauInstall() {
  fermerPanneaux(); const ua = navigator.userAgent || '', ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), android = /Android/.test(ua);
  const m = document.createElement('div'); m.id = 'guideAide'; m.className = 'guideCarte'; m.setAttribute('role', 'dialog');
  let h = '<h3>Installer l’application</h3>';
  if (dejaInstalle()) h += '<p>✔ L’application est <b>déjà installée</b> sur cet appareil : vous l’utilisez depuis son icône.</p>';
  else if (diffInst) h += '<p>Touchez le bouton : l’icône « Passeport Sûr » s’ajoute à votre écran.</p><div style="display:grid;gap:8px"><button type="button" id="aInstOk">📲 Installer maintenant</button></div>';
  else if (ios) h += '<ol style="margin:0 0 6px 18px"><li>Ouvrez ce lien dans <b>Safari</b>.</li><li>Touchez <b>Partager</b> (le carré avec une flèche vers le haut).</li><li>Choisissez <b>« Sur l’écran d’accueil »</b>, puis <b>Ajouter</b>.</li></ol>';
  else if (android) h += '<ol style="margin:0 0 6px 18px"><li>Ouvrez ce lien dans <b>Chrome</b>.</li><li>Touchez le menu <b>⋮</b> en haut à droite.</li><li>Choisissez <b>« Installer l’application »</b> (ou « Ajouter à l’écran d’accueil »).</li></ol>';
  else h += '<ol style="margin:0 0 6px 18px"><li>Avec <b>Chrome</b> ou <b>Edge</b> : touchez l’icône d’installation à droite de la barre d’adresse (un écran avec une flèche), ou le menu <b>⋮</b> puis <b>« Installer Passeport Sûr »</b>.</li><li>Avec Firefox ou Safari sur ordinateur : l’application fonctionne dans le navigateur ; ajoutez la page à vos favoris.</li></ol>';
  h += '<p style="font-size:13px;color:#5d6b64;margin-top:8px">L’installation est <b>facultative</b> : l’application fonctionne aussi directement dans le navigateur, sans compte ni téléchargement lourd.</p><div style="display:grid;gap:8px;margin-top:8px"><button type="button" class="sec" id="aInstFerme">Fermer</button></div>';
  m.innerHTML = h; document.body.appendChild(m);
  const ok = $('#aInstOk'); if (ok) ok.onclick = () => { try { diffInst.prompt(); diffInst.userChoice.finally(() => { diffInst = null; m.remove(); }); } catch (e) { m.remove(); } };
  $('#aInstFerme').onclick = () => m.remove(); $('#aInstFerme').focus({ preventScroll: true });
  const k = e => { if (e.key === 'Escape') { m.remove(); document.removeEventListener('keydown', k, true); } }; document.addEventListener('keydown', k, true);
}
function menuAide(btn) {
  if (document.getElementById('guideAide')) { fermerPanneaux(); return; } fermerPanneaux();
  const citoyen = SY() && SY().citoyen && SY().citoyen(); const role = citoyen ? 'demandeur' : profilCourant();
  const m = document.createElement('div'); m.id = 'guideAide'; m.className = 'guideCarte'; m.setAttribute('role', 'menu');
  m.innerHTML = '<h3>Aide</h3><div style="display:grid;gap:8px"><button type="button" id="aVis" role="menuitem">▶ Visite guidée de mon profil</button>' + (citoyen || sec() ? '' : '<button type="button" class="sec" id="aProf" role="menuitem">👥 Changer de profil / je ne sais pas lequel choisir</button>') + '<button type="button" class="sec" id="aFaq" role="menuitem">❓ Questions fréquentes</button><button type="button" class="sec" id="aInst" role="menuitem">📲 Installer l’application</button>' + (citoyen ? '' : '<button type="button" class="lien" id="aRaz" role="menuitem">↺ Revoir toutes les visites au prochain lancement</button>') + '</div>';
  document.body.appendChild(m);
  $('#aVis').onclick = () => { m.remove(); visite(role); }; const p = $('#aProf'); if (p) p.onclick = () => { m.remove(); choixProfil(false); }; $('#aFaq').onclick = () => { m.remove(); faq(); }; $('#aInst').onclick = () => { m.remove(); panneauInstall(); }; const z = $('#aRaz'); if (z) z.onclick = () => { ecrire({}); m.remove(); majCommence(); };
  $('#aVis').focus({ preventScroll: true });
  const k = e => { if (e.key === 'Escape') { m.remove(); document.removeEventListener('keydown', k, true); } }; document.addEventListener('keydown', k, true);
  setTimeout(() => { const f = e => { if (!m.contains(e.target) && e.target !== btn) { m.remove(); document.removeEventListener('pointerdown', f, true); } }; document.addEventListener('pointerdown', f, true); }, 0);
}

/* ---------- « Commencez ici » (accueil) ---------- */
function majCommence() {
  const acc = $('#v-accueil'); if (!acc) return; let c = $('#commence'); const role = profilCourant(), p = PROFILS[role];
  if (SY() && SY().citoyen && SY().citoyen()) { if (c) c.remove(); return; }
  if (!c) { c = document.createElement('div'); c.id = 'commence'; c.className = 'carte commence'; const hero = acc.querySelector('.hero'); if (hero) hero.after(c); else acc.prepend(c); }
  const fait = (lire().faits || {})[role];
  c.innerHTML = '<div class="ic" aria-hidden="true">' + p.icone + '</div><div class="tx"><b class="t">Commencez ici — profil : ' + esc(p.nom) + '</b><p>' + esc(p.resume) + '</p></div><div class="ligne"><button type="button" class="guideBtn" id="cGo">' + esc(p.bouton) + '</button><button type="button" class="guideBtn sec" id="cVis">' + (fait === 'fait' ? '↺ Revoir la visite' : '▶ Visite guidée') + '</button></div>';
  $('#cGo').onclick = () => A.aller(p.vue); $('#cVis').onclick = () => visite(role);
}

/* ---------- Mise en route ---------- */
function brancher() {
  const hd = document.querySelector('.role');
  if (hd && !$('#bAide')) { const b = document.createElement('button'); b.type = 'button'; b.id = 'bAide'; b.textContent = '❓ Aide'; b.setAttribute('aria-haspopup', 'menu'); hd.prepend(b); b.onclick = () => menuAide(b); }
  /* Le dernier profil choisi est retrouvé au rechargement (un caissier qui recharge reste à la caisse). */
  const s = $('#role'); const demandeur = SY() && SY().citoyen && SY().citoyen();
  try { const r = localStorage.getItem('sp_role_v1'); if (s && !demandeur && r && PROFILS[r] && s.value !== r) { s.value = r; s.dispatchEvent(new Event('change')); } } catch (e) { }
  if (s) s.addEventListener('change', () => { try { localStorage.setItem('sp_role_v1', s.value); } catch (e) { } majCommence(); const r = profilCourant(); if (!((lire().faits || {})[r]) && !etat) window.setTimeout(() => { if (!etat && !document.getElementById('guideProfil')) invitation(r); }, 700); });
  const vc = $('#v-citoyen'); if (vc && SY() && SY().citoyen && SY().citoyen() && !$('#aideCitoyen')) { const b = document.createElement('button'); b.type = 'button'; b.id = 'aideCitoyen'; b.className = 'guideBtn sec'; b.style.marginBottom = '10px'; b.textContent = '❓ Aide'; vc.prepend(b); b.onclick = () => menuAide(b); }
  majCommence();
  window.__spGuide = { visite, choixProfil, faq, invitation, reinit: () => ecrire({}), etat: () => etat && { cle: etat.cle, i: etat.i, n: etat.etapes.length } };
  if (apercu || (navigator.webdriver && q.get('guide') !== '1')) return;   // pas de lancement automatique sous test automatisé (sauf ?guide=1)
  const citoyen = SY() && SY().citoyen && SY().citoyen();
  const demarrer = () => {
    const m = lire();
    if (citoyen) { if (!(m.faits || {}).demandeur) { const d = document.createElement('div'); d.id = 'guideInvit'; d.className = 'guideCarte'; d.innerHTML = '<h3>👋 Bienvenue</h3><p>Voulez-vous voir comment suivre votre dossier ? Cela prend 20 secondes.</p><div class="bas"><button type="button" class="lien" id="iNon">Non merci</button><button type="button" id="iOui" style="margin-left:auto">▶ Voir</button></div>'; document.body.appendChild(d); $('#iNon').onclick = () => { marquer('demandeur', 'passe'); d.remove(); }; $('#iOui').onclick = () => { d.remove(); visite('demandeur'); }; } return; }
    if (sec()) { const aller = () => { if (!(lire().faits || {})[profilCourant()]) invitation(profilCourant()); }; if (SY().attenteConnexion()) window.addEventListener('sp-session', () => window.setTimeout(aller, 900), { once: true }); else aller(); return; }
    if (!m.vu) choixProfil(true);
    else if (!(m.faits || {})[profilCourant()]) invitation(profilCourant());
  };
  const attendre = SY() && SY().pret ? SY().pret : Promise.resolve();
  Promise.resolve(attendre).catch(() => { }).then(() => window.setTimeout(demarrer, 900));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', brancher); else brancher();
})();
