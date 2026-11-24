/* Suivi des demandes de passeport — démonstration (données fictives, stockées sur l'appareil) */
(function () {
'use strict';
const STATUTS = [['depose', 'Demande déposée'], ['recu', 'Dossier reçu'], ['traitement', 'En traitement'], ['pret', 'Passeport prêt'], ['remis', 'Remis au demandeur']];
const SN = Object.fromEntries(STATUTS);
const TN = { premiere: 'Première demande', renouvellement: 'Renouvellement' };
const LIEUX = ['Makélékélé', 'Bacongo', 'Poto-Poto', 'Moungali', 'Ouenzé', 'Talangaï', 'Mfilou', 'Madibou', 'Djiri'];
const KEY = 'sp_demo_v1';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 86400000;
const pad = (n, l = 2) => String(n).padStart(l, '0');
const isoDate = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fmtD = s => { if (!s) return '—'; const d = new Date(s); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
const fmtDH = s => { const d = new Date(s); return fmtD(s) + ' à ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const jours = (a, b) => Math.floor((b - a) / DAY);
const NOW = () => new Date();

/* ---------- Zone de lecture automatique (MRZ) ---------- */
const W = [7, 3, 1];
const val = c => c === '<' ? 0 : (c >= '0' && c <= '9') ? +c : c.charCodeAt(0) - 55;
const chk = s => { let t = 0; for (let i = 0; i < s.length; i++) t += val(s[i]) * W[i % 3]; return t % 10; };
const noAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
const yymmdd = iso => iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);
function buildTD3(p) {
  const l1 = ('P<' + (p.pays || 'COG') + noAccent(p.nom).replace(/ /g, '<') + '<<' + noAccent(p.prenoms).replace(/ /g, '<')).padEnd(44, '<').slice(0, 44);
  const num = p.num.padEnd(9, '<');
  let l2 = num + chk(num) + (p.nat || 'COG') + yymmdd(p.naiss) + chk(yymmdd(p.naiss)) + p.sexe + yymmdd(p.exp) + chk(yymmdd(p.exp)) + '<<<<<<<<<<<<<<' + '0';
  l2 += chk(l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43));
  return l1 + '\n' + l2;
}
function buildTD1(p) {
  const num = p.num.padEnd(9, '<');
  const l1 = ('I<' + (p.pays || 'COG') + num + chk(num)).padEnd(30, '<');
  let l2 = yymmdd(p.naiss) + chk(yymmdd(p.naiss)) + p.sexe + yymmdd(p.exp) + chk(yymmdd(p.exp)) + (p.nat || 'COG') + '<<<<<<<<<<<';
  l2 += chk(l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29));
  const l3 = (noAccent(p.nom).replace(/ /g, '<') + '<<' + noAccent(p.prenoms).replace(/ /g, '<')).padEnd(30, '<').slice(0, 30);
  return l1 + '\n' + l2 + '\n' + l3;
}
function dateMRZ(yymmdd_, futur) {
  const yy = +yymmdd_.slice(0, 2), cur = NOW().getFullYear() % 100;
  const y = futur ? 2000 + yy : (yy > cur ? 1900 + yy : 2000 + yy);
  return y + '-' + yymmdd_.slice(2, 4) + '-' + yymmdd_.slice(4, 6);
}
const noms = s => { const p = s.split('<<'); return [p[0].replace(/</g, ' ').trim(), (p[1] || '').replace(/</g, ' ').trim()]; };
function parseMRZ(txt) {
  const L = String(txt || '').toUpperCase().replace(/[ \t]/g, '').split(/\n+/).filter(Boolean);
  if (L.length === 2 && L[0].length === 44 && L[1].length === 44) {
    const a = L[0], b = L[1], [nom, prenoms] = noms(a.slice(5));
    const c = { num: chk(b.slice(0, 9)) == b[9], naiss: chk(b.slice(13, 19)) == b[19], exp: chk(b.slice(21, 27)) == b[27], global: chk(b.slice(0, 10) + b.slice(13, 20) + b.slice(21, 43)) == b[43] };
    return { ok: true, format: 'Passeport (2 lignes de 44)', ptype: 'PASSEPORT', pays: a.slice(2, 5), nom, prenoms, num: b.slice(0, 9).replace(/</g, ''), nat: b.slice(10, 13), naiss: dateMRZ(b.slice(13, 19), false), sexe: b[20] === 'F' || b[20] === 'M' ? b[20] : '', exp: dateMRZ(b.slice(21, 27), true), checks: c, valide: c.num && c.naiss && c.exp && c.global };
  }
  if (L.length === 3 && L.every(x => x.length === 30)) {
    const [a, b, n] = L, [nom, prenoms] = noms(n);
    const c = { num: chk(a.slice(5, 14)) == a[14], naiss: chk(b.slice(0, 6)) == b[6], exp: chk(b.slice(8, 14)) == b[14], global: chk(a.slice(5, 30) + b.slice(0, 7) + b.slice(8, 15) + b.slice(18, 29)) == b[29] };
    return { ok: true, format: 'Carte d’identité (3 lignes de 30)', ptype: 'CNI', pays: a.slice(2, 5), nom, prenoms, num: a.slice(5, 14).replace(/</g, ''), nat: b.slice(15, 18), naiss: dateMRZ(b.slice(0, 6), false), sexe: b[7] === 'F' || b[7] === 'M' ? b[7] : '', exp: dateMRZ(b.slice(8, 14), true), checks: c, valide: c.num && c.naiss && c.exp && c.global };
  }
  return { ok: false, err: 'Lecture impossible : il faut 2 lignes de 44 caractères (passeport) ou 3 lignes de 30 (carte). Reprenez la photo ou corrigez les lignes.' };
}

/* ---------- Données ---------- */
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const NOMS = ['Mabiala', 'Nkounkou', 'Moukoko', 'Itoua', 'Okemba', 'Mouanda', 'Ngoma', 'Bakala', 'Massamba', 'Loubaki', 'Mpassi', 'Kimbembe', 'Boukaka', 'Ondongo', 'Tsiba', 'Makosso', 'Nzaba', 'Samba', 'Mavoungou', 'Ibara', 'Dzon', 'Elenga', 'Gampio', 'Lekaka'];
const PF = ['Grâce', 'Prisca', 'Merveille', 'Esther', 'Sandrine', 'Chancelle', 'Divine', 'Laure', 'Ornella', 'Nadège', 'Josiane', 'Clarisse'];
const PM = ['Jean-Claude', 'Rodrigue', 'Christ', 'Parfait', 'Brice', 'Fabrice', 'Giscard', 'Hervé', 'Dieudonné', 'Aimé', 'Steve', 'Gildas'];

function evalFlags(d, all) {
  const f = [], p = d.person;
  if (!d.mrzOk) f.push({ n: 'rouge', t: 'Les clés de contrôle de la pièce sont fausses : la pièce a peut-être été modifiée.' });
  const dup = all.find(e => e.id !== d.id && e.person.piece.numero && e.person.piece.numero === p.piece.numero);
  if (dup) f.push({ n: 'rouge', t: 'Doublon : ce numéro de pièce est déjà dans le dossier ' + dup.id + '.' });
  const dbl = all.find(e => e.id !== d.id && e.person.nom === p.nom && e.person.prenoms === p.prenoms && e.person.naissance === p.naissance && e.person.piece.numero !== p.piece.numero);
  if (dbl) f.push({ n: 'rouge', t: 'Double identité possible : même nom, mêmes prénoms et même naissance que le dossier ' + dbl.id + ', avec une autre pièce.' });
  const auj = isoDate(NOW());
  const ancienMemePiece = d.type === 'renouvellement' && d.ancien && d.ancien.numero === p.piece.numero;
  if (p.piece.expiration && p.piece.expiration < auj && !ancienMemePiece) f.push({ n: 'orange', t: 'La pièce présentée est expirée depuis le ' + fmtD(p.piece.expiration) + '.' });
  if (d.type === 'renouvellement') {
    if (!d.ancien || !d.ancien.numero) f.push({ n: 'orange', t: 'Renouvellement : le numéro de l’ancien passeport manque.' });
    else {
      if (d.ancien.expiration && d.ancien.expiration > auj) f.push({ n: 'orange', t: 'L’ancien passeport n’est pas encore expiré (il expire le ' + fmtD(d.ancien.expiration) + ').' });
      const r = all.find(e => e.id !== d.id && ((e.ancien && e.ancien.numero === d.ancien.numero) || (e.person.piece.type === 'PASSEPORT' && e.person.piece.numero === d.ancien.numero)));
      if (r) f.push({ n: 'rouge', t: 'L’ancien passeport n° ' + d.ancien.numero + ' est déjà utilisé dans le dossier ' + r.id + '.' });
    }
  }
  return f;
}
const stIdx = s => STATUTS.findIndex(x => x[0] === s);
const last = d => d.history[d.history.length - 1];

function seed() {
  const R = rng(20261124), pick = a => a[Math.floor(R() * a.length)], ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const all = [], N = 74, now = NOW();
  const dossiersTries = [];
  for (let i = 0; i < N; i++) dossiersTries.push(now.getTime() - (R() * R() * 62 + 0.2) * DAY);
  dossiersTries.sort((a, b) => a - b);
  dossiersTries.forEach((ts, i) => {
    const t = new Date(ts); t.setHours(ri(8, 15), ri(0, 59), 0, 0);
    const ren = R() < 0.32, f = R() < 0.5, nom = pick(NOMS), prenoms = f ? pick(PF) : pick(PM);
    const age = jours(t.getTime(), now.getTime());
    const naiss = ri(1958, 2007) + '-' + pad(ri(1, 12)) + '-' + pad(ri(1, 28));
    const ptype = ren ? (R() < 0.6 ? 'PASSEPORT' : 'CNI') : (R() < 0.85 ? 'CNI' : 'PASSEPORT');
    const num = (ptype === 'CNI' ? 'CG' : 'OA') + pad(ri(1000000, 9999999), 7);
    const exp = isoDate(new Date(now.getTime() + (ren && ptype === 'PASSEPORT' ? -ri(15, 900) : ri(200, 2800)) * DAY));
    const d = {
      id: 'BZV-' + t.getFullYear() + '-' + pad(i + 1, 6), type: ren ? 'renouvellement' : 'premiere', createdAt: t.toISOString(), lieu: pick(LIEUX), mrzOk: true,
      person: { nom: nom.toUpperCase(), prenoms, naissance: naiss, sexe: f ? 'F' : 'M', nationalite: 'COG', tel: '+242 06 ' + pad(ri(100, 999), 3) + ' ' + pad(ri(10, 99)) + ' ' + pad(ri(10, 99)), piece: { type: ptype, numero: num, expiration: exp } },
      ancien: null, ancienRestitue: false, history: []
    };
    if (ren) { const ae = isoDate(new Date(now.getTime() - ri(15, 900) * DAY)); d.ancien = { numero: 'OA' + pad(ri(1000000, 9999999), 7), expiration: ae }; if (ptype === 'PASSEPORT') { d.person.piece.numero = d.ancien.numero; d.person.piece.expiration = ae; } }
    // avancement : plus le dossier est ancien, plus il est avancé
    let steps = 0, tt = t.getTime();
    const pas = [[1, 3], [2, 6], [3, 8], [2, 5]];
    d.history.push({ s: 'depose', at: new Date(tt).toISOString(), by: 'Agent de guichet', note: 'Dossier enregistré' });
    for (let k = 0; k < 4; k++) {
      const dl = ri(pas[k][0], pas[k][1]) * DAY + ri(0, 6) * 3600000;
      if (tt + dl < now.getTime() - 3600000 && R() < (age > 20 ? 0.93 : 0.72)) { tt += dl; steps++; d.history.push({ s: STATUTS[k + 1][0], at: new Date(tt).toISOString(), by: k === 0 ? 'Agent de guichet' : k === 3 ? 'Agent de guichet' : 'Préfecture', note: '' }); } else break;
    }
    d.status = STATUTS[steps][0];
    if (d.status === 'remis' && ren) d.ancienRestitue = true;
    all.push(d);
  });
  // cas d'alertes réalistes
  const A = all.length;
  all[A - 6].person.piece.numero = all[8].person.piece.numero; all[A - 6].person.piece.type = all[8].person.piece.type;                  // doublon de pièce
  all[A - 13].person.piece.numero = all[20].person.piece.numero; all[A - 13].person.piece.type = all[20].person.piece.type;
  Object.assign(all[A - 3].person, { nom: all[15].person.nom, prenoms: all[15].person.prenoms, naissance: all[15].person.naissance });          // double identité
  all[A - 9].mrzOk = false; all[A - 20].mrzOk = false;                                                                                        // clés de contrôle fausses
  const ren2 = all.filter(x => x.type === 'renouvellement' && x.id !== all[A - 1].id);
  if (ren2.length) ren2[ren2.length - 1].ancien.expiration = isoDate(new Date(now.getTime() + 260 * DAY));                                      // ancien non expiré
  all.forEach((d, i) => { d.flags = evalFlags(d, all.slice(0, i + 1)); });
  // un contrôle de la Préfecture déjà effectué pour deux dossiers
  all.filter(d => d.flags.length).slice(0, 2).forEach(d => { d.verifie = { at: now.toISOString(), note: 'Vérifié par la Préfecture' }; });
  return all;
}
let DB = [];
function charger() { try { DB = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { DB = null; } if (!Array.isArray(DB) || !DB.length) { DB = seed(); sauver(); } }
function sauver() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { } }

/* ---------- Profil ---------- */
let role = 'agent';
const ROLES = { agent: 'Agent de guichet', prefecture: 'Préfecture', ministere: 'Ministère' };
function appliquerRole() {
  role = $('#role').value;
  $('[data-v="guichet"]').style.display = role === 'ministere' ? 'none' : '';
  const actif = $('#onglets .on').dataset.v;
  if (role === 'ministere' && actif === 'guichet') aller('tableau');
}

/* ---------- Navigation ---------- */
function aller(v) {
  $$('#onglets button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $$('.vue').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
  if (v === 'tableau') tableau(); if (v === 'dossiers') liste();
  window.scrollTo({ top: 0 });
}

/* ---------- Guichet ---------- */
let flux = null;
function remplirLieux() { const o = LIEUX.map(l => '<option>' + l + '</option>').join(''); $('#f_lieu').innerHTML = o; $('#fl').innerHTML = '<option value="">Tous les secteurs</option>' + o; $('#fs').innerHTML = '<option value="">Tous les états</option>' + STATUTS.map(s => '<option value="' + s[0] + '">' + s[1] + '</option>').join(''); }
const typeCourant = () => document.querySelector('input[name="type"]:checked').value;
function majType() { $('#blocRenou').style.display = typeCourant() === 'renouvellement' ? '' : 'none'; majAdepuis(); alertesForm(); }
function majAdepuis() { const v = $('#f_aexp').value; if (!v) { $('#f_adepuis').value = ''; return; } const j = jours(new Date(v).getTime(), NOW().getTime()); $('#f_adepuis').value = j >= 0 ? (j < 60 ? j + ' jours' : Math.floor(j / 30.4) + ' mois') : 'pas encore expiré'; }
function lire() {
  const r = parseMRZ($('#mrz').value), box = $('#resLecture');
  if (!r.ok) { box.innerHTML = '<div class="alert rouge">' + esc(r.err) + '</div>'; flux = null; return; }
  flux = r;
  $('#f_nom').value = r.nom; $('#f_prenoms').value = r.prenoms; $('#f_naiss').value = r.naiss; $('#f_sexe').value = r.sexe; $('#f_nat').value = r.nat;
  $('#f_ptype').value = r.ptype; $('#f_pnum').value = r.num; $('#f_pexp').value = r.exp;
  if (typeCourant() === 'renouvellement' && r.ptype === 'PASSEPORT') { $('#f_anum').value = r.num; $('#f_aexp').value = r.exp; majAdepuis(); }
  const c = r.checks, ligne = (l, ok) => '<span class="badge ' + (ok ? 'ok' : 'alerte') + '">' + (ok ? '✔ ' : '✖ ') + l + '</span> ';
  box.innerHTML = '<div class="alert ' + (r.valide ? 'vert' : 'rouge') + '"><b>' + (r.valide ? 'Pièce lisible et cohérente.' : 'Attention : les clés de contrôle ne correspondent pas.') + '</b> ' + esc(r.format) + '<div style="margin-top:6px">' + ligne('Numéro', c.num) + ligne('Naissance', c.naiss) + ligne('Expiration', c.exp) + ligne('Contrôle global', c.global) + '</div></div>';
  alertesForm();
}
function lireFiche() {
  const piece = { type: $('#f_ptype').value, numero: $('#f_pnum').value.trim().toUpperCase(), expiration: $('#f_pexp').value };
  const d = { id: '(nouveau)', type: typeCourant(), mrzOk: flux ? flux.valide : true, person: { nom: $('#f_nom').value.trim().toUpperCase(), prenoms: $('#f_prenoms').value.trim(), naissance: $('#f_naiss').value, sexe: $('#f_sexe').value, nationalite: $('#f_nat').value.trim().toUpperCase(), tel: $('#f_tel').value.trim(), piece }, ancien: null, ancienRestitue: false };
  if (d.type === 'renouvellement') d.ancien = { numero: $('#f_anum').value.trim().toUpperCase(), expiration: $('#f_aexp').value };
  return d;
}
function alertesForm() {
  const d = lireFiche(), box = $('#alertesForm');
  if (!d.person.nom && !d.person.piece.numero) { box.innerHTML = ''; return; }
  const f = evalFlags(d, DB);
  box.innerHTML = f.length ? f.map(x => '<div class="alert ' + (x.n === 'rouge' ? 'rouge' : 'orange') + '">⚠ ' + esc(x.t) + '</div>').join('') + '<div class="alert bleu">Le dossier pourra être enregistré : il sera marqué « À vérifier » pour la Préfecture.</div>' : '<div class="alert vert">Aucune anomalie détectée.</div>';
}
function effacer() { ['f_nom', 'f_prenoms', 'f_naiss', 'f_pnum', 'f_pexp', 'f_tel', 'f_anum', 'f_aexp', 'f_adepuis', 'mrz'].forEach(i => $('#' + i).value = ''); $('#f_sexe').value = ''; $('#resLecture').innerHTML = ''; $('#alertesForm').innerHTML = ''; flux = null; }
function valider() {
  const d = lireFiche(), p = d.person;
  const manque = []; if (!p.nom) manque.push('nom'); if (!p.prenoms) manque.push('prénoms'); if (!p.naissance) manque.push('date de naissance'); if (!p.piece.numero) manque.push('numéro de la pièce'); if (d.type === 'renouvellement' && !d.ancien.numero) manque.push('numéro de l’ancien passeport');
  if (manque.length) { $('#alertesForm').innerHTML = '<div class="alert rouge">Il manque : ' + manque.join(', ') + '.</div>'; return; }
  const t = NOW(); d.id = 'BZV-' + t.getFullYear() + '-' + pad(DB.length + 1, 6); d.createdAt = t.toISOString(); d.lieu = $('#f_lieu').value; d.status = 'depose';
  d.history = [{ s: 'depose', at: t.toISOString(), by: ROLES[role], note: 'Dossier enregistré' }];
  d.flags = evalFlags(d, DB); DB.push(d); sauver();
  effacer(); montrerRecu(d);
}
function code(id, nom) { let h = 7; const s = id + nom; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36).toUpperCase().padStart(6, '0').slice(-6); }
function qr(txt) { try { const q = qrcode(0, 'M'); q.addData(txt); q.make(); return q.createSvgTag(4, 0); } catch (e) { return ''; } }
function montrerRecu(d) {
  const p = d.person;
  $('#feuille').innerHTML = '<div class="recu"><div style="font-size:12px;letter-spacing:.12em;color:var(--gris)">REÇU DE DÉPÔT — DÉMONSTRATION</div><div class="num">' + d.id + '</div>' + qr('SUIVI-PASSEPORT-DEMO|' + d.id + '|' + code(d.id, p.nom)) +
    '<div style="font-size:12px;color:var(--gris)">Code de contrôle : <b>' + code(d.id, p.nom) + '</b></div>' +
    '<dl class="dl" style="text-align:left"><dt>Demandeur</dt><dd>' + esc(p.nom + ' ' + p.prenoms) + '</dd><dt>Type</dt><dd>' + TN[d.type] + '</dd><dt>Déposé le</dt><dd>' + fmtDH(d.createdAt) + '</dd><dt>Secteur</dt><dd>' + esc(d.lieu) + '</dd></dl>' +
    '<div style="font-size:13px">Conservez ce reçu. Il permet de suivre l’avancement de votre dossier.</div></div>' +
    (d.flags.length ? '<div class="alert orange noprint">Ce dossier est marqué « À vérifier » : ' + d.flags.length + ' alerte(s).</div>' : '') +
    '<div class="ligne noprint" style="margin-top:12px"><button class="btn or" onclick="window.print()">🖨 Imprimer le reçu</button><button class="btn clair" id="bFerme">Fermer</button><button class="btn clair" id="bVoir">Voir le dossier</button></div>';
  $('#tiroir').classList.add('on');
  $('#bFerme').onclick = fermer; $('#bVoir').onclick = () => detail(d.id);
}
function fermer() { $('#tiroir').classList.remove('on'); }

/* ---------- Scan : caméra + lecture ---------- */
let stream = null;
async function ouvrirCam() {
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); const v = $('#vid'); v.srcObject = stream; await v.play(); $('#cam').classList.add('on'); }
  catch (e) { $('#ocrEtat').textContent = 'Caméra indisponible ici : utilisez « Choisir une photo » ou un exemple.'; }
}
function fermerCam() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; $('#cam').classList.remove('on'); }
function capturer() { const v = $('#vid'), c = $('#snap'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); fermerCam(); ocr(c); }
function depuisFichier(file) { if (!file) return; const img = new Image(); img.onload = () => { const c = $('#snap'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(img.src); ocr(c); }; img.src = URL.createObjectURL(file); }
function chargerScript(src) { return new Promise((ok, ko) => { if (window.Tesseract) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }); }
async function ocr(canvas) {
  const etat = $('#ocrEtat'); etat.textContent = 'Lecture de la pièce en cours…';
  try {
    await chargerScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js');
    const h = Math.round(canvas.height * 0.42), c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = h; c2.getContext('2d').drawImage(canvas, 0, canvas.height - h, canvas.width, h, 0, 0, canvas.width, h);
    const r = await Tesseract.recognize(c2, 'eng', { tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<' });
    const lignes = r.data.text.toUpperCase().split(/\n/).map(x => x.replace(/[^A-Z0-9<]/g, '')).filter(x => x.length >= 28 && x.includes('<'));
    if (!lignes.length) throw new Error('aucune ligne');
    $('#mrz').value = lignes.slice(-3).join('\n'); etat.textContent = 'Lecture terminée. Vérifiez les lignes puis appuyez sur « Lire et remplir la fiche ».'; lire();
  } catch (e) { etat.textContent = 'Lecture automatique impossible pour cette photo (connexion ou image floue). Reprenez la photo ou saisissez les lignes.'; }
}
function exemple(k) {
  const auj = NOW().getTime(), dt = n => isoDate(new Date(auj + n * DAY));
  let txt;
  if (k === 'pass') txt = buildTD3({ nom: 'Moukala', prenoms: 'Grace Chancelle', num: 'OA4821937', naiss: '1991-04-17', sexe: 'F', exp: dt(-250) });
  else if (k === 'cni') txt = buildTD1({ nom: 'Batchi', prenoms: 'Rodrigue', num: 'CG6103348', naiss: '1987-09-03', sexe: 'M', exp: dt(1200) });
  else { const l = buildTD3({ nom: 'Ngouabi', prenoms: 'Prisca', num: 'OA7745120', naiss: '1994-02-11', sexe: 'F', exp: dt(900) }).split('\n'); l[1] = l[1].slice(0, 5) + '9' + l[1].slice(6); txt = l.join('\n'); }
  $('#mrz').value = txt; if (k === 'pass') document.querySelector('input[name=type][value=renouvellement]').checked = true, majType(); lire();
}

/* ---------- Liste ---------- */
const bS = s => '<span class="badge s-' + s + '">' + SN[s] + '</span>', bT = t => '<span class="badge t-' + t + '">' + TN[t] + '</span>';
const aVerifier = d => d.flags && d.flags.length && !d.verifie;
function filtrer() {
  const q = $('#q').value.trim().toLowerCase(), s = $('#fs').value, t = $('#ft').value, l = $('#fl').value, a = $('#fa').value;
  return DB.filter(d => (!s || d.status === s) && (!t || d.type === t) && (!l || d.lieu === l) && (!a || aVerifier(d)) &&
    (!q || (d.id + ' ' + d.person.nom + ' ' + d.person.prenoms + ' ' + d.person.piece.numero).toLowerCase().includes(q))).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}
function liste() {
  const r = filtrer(); $('#cpt').textContent = r.length + ' dossier(s) sur ' + DB.length;
  $('#tb').innerHTML = r.slice(0, 150).map(d => '<tr class="cl" data-id="' + d.id + '"><td><b>' + d.id + '</b></td><td>' + fmtD(d.createdAt) + '</td><td>' + esc(d.person.nom + ' ' + d.person.prenoms) + '</td><td>' + bT(d.type) + '</td><td>' + bS(d.status) + '</td><td>' + esc(d.lieu) + '</td><td>' + (aVerifier(d) ? '<span class="badge alerte">À vérifier</span>' : d.flags && d.flags.length ? '<span class="badge ok">Contrôlé</span>' : '') + '</td></tr>').join('');
}

/* ---------- Fiche dossier ---------- */
function detail(id) {
  const d = DB.find(x => x.id === id); if (!d) return; const p = d.person, i = stIdx(d.status), peut = role !== 'ministere';
  const etapes = '<div class="etapes">' + STATUTS.map((s, k) => '<div class="etape ' + (k < i ? 'fait' : k === i ? 'now' : '') + '">' + (k < i ? '✔ ' : '') + s[1] + '</div>').join('') + '</div>';
  let act = '';
  if (peut && i < 4) {
    const bloque = d.type === 'renouvellement' && d.status === 'pret' && !d.ancienRestitue;
    act += '<button class="btn or" id="bNext"' + (bloque ? ' disabled' : '') + '>Passer à : ' + STATUTS[i + 1][1] + '</button>';
    if (bloque) act += '<div class="alert orange" style="flex:1 1 100%">Renouvellement : le nouveau passeport ne peut être remis qu’après restitution ou annulation de l’ancien.</div>';
  }
  if (peut && d.type === 'renouvellement' && !d.ancienRestitue) act += '<button class="btn clair" id="bAnc">Ancien passeport restitué / annulé</button>';
  if (role === 'prefecture' && aVerifier(d)) act += '<button class="btn clair" id="bVer">✔ Alerte vérifiée par la Préfecture</button>';
  const fl = (d.flags || []).map(x => '<div class="alert ' + (x.n === 'rouge' ? 'rouge' : 'orange') + '">⚠ ' + esc(x.t) + '</div>').join('') + (d.verifie ? '<div class="alert vert">✔ Alerte examinée par la Préfecture le ' + fmtDH(d.verifie.at) + '.</div>' : '');
  $('#feuille').innerHTML = '<div class="ligne"><h3>' + d.id + '</h3><span style="margin-left:auto">' + bT(d.type) + ' ' + bS(d.status) + '</span></div>' + etapes + fl +
    '<dl class="dl"><dt>Demandeur</dt><dd><b>' + esc(p.nom + ' ' + p.prenoms) + '</b></dd><dt>Né(e) le</dt><dd>' + fmtD(p.naissance) + ' · ' + (p.sexe === 'F' ? 'Féminin' : p.sexe === 'M' ? 'Masculin' : '—') + '</dd><dt>Téléphone</dt><dd>' + esc(p.tel || '—') + '</dd>' +
    '<dt>Pièce présentée</dt><dd>' + (p.piece.type === 'CNI' ? 'Carte d’identité' : 'Passeport') + ' n° ' + esc(p.piece.numero) + ' (expire le ' + fmtD(p.piece.expiration) + ')</dd>' +
    (d.ancien ? '<dt>Ancien passeport</dt><dd>n° ' + esc(d.ancien.numero) + ' · expiré le ' + fmtD(d.ancien.expiration) + ' · ' + (d.ancienRestitue ? '<b style="color:var(--ok)">restitué / annulé</b>' : '<b style="color:var(--alerte)">pas encore restitué</b>') + '</dd>' : '') +
    '<dt>Secteur</dt><dd>' + esc(d.lieu) + '</dd><dt>Déposé le</dt><dd>' + fmtDH(d.createdAt) + '</dd></dl>' +
    '<h3 style="font-size:15px">Historique</h3><div class="histo">' + d.history.map(h => '<div><b>' + SN[h.s] + '</b> — ' + fmtDH(h.at) + '<br><small>' + esc(h.by) + (h.note ? ' · ' + esc(h.note) : '') + '</small></div>').join('') + '</div>' +
    '<div class="ligne noprint" style="margin-top:14px">' + act + '<button class="btn clair" onclick="window.print()">🖨 Imprimer</button><button class="btn clair" id="bFerme">Fermer</button></div>';
  $('#tiroir').classList.add('on'); $('#bFerme').onclick = fermer;
  const n = $('#bNext'); if (n) n.onclick = () => { const s = STATUTS[i + 1][0]; d.status = s; d.history.push({ s, at: NOW().toISOString(), by: ROLES[role], note: '' }); sauver(); detail(id); rafraichir(); };
  const a = $('#bAnc'); if (a) a.onclick = () => { d.ancienRestitue = true; d.history.push({ s: d.status, at: NOW().toISOString(), by: ROLES[role], note: 'Ancien passeport restitué / annulé' }); sauver(); detail(id); rafraichir(); };
  const v = $('#bVer'); if (v) v.onclick = () => { d.verifie = { at: NOW().toISOString(), note: 'Vérifié par la Préfecture' }; d.history.push({ s: d.status, at: NOW().toISOString(), by: ROLES[role], note: 'Alerte examinée' }); sauver(); detail(id); rafraichir(); };
}

/* ---------- Tableau de bord ---------- */
let charts = [];
const COL = { depose: '#2f5bd8', recu: '#18a0c8', traitement: '#e4a21b', pret: '#1f9d63', remis: '#7b869c' };
function stats() {
  const T = DB.length, c = Object.fromEntries(STATUTS.map(s => [s[0], DB.filter(d => d.status === s[0]).length]));
  const remis = DB.filter(d => d.status === 'remis'), delais = remis.map(d => jours(new Date(d.createdAt).getTime(), new Date(last(d).at).getTime()));
  return { T, c, recus: DB.filter(d => stIdx(d.status) >= 1).length, nonRemis: T - c.remis, ren: DB.filter(d => d.type === 'renouvellement').length, av: DB.filter(aVerifier).length, delai: delais.length ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length) : 0 };
}
function tableau() {
  const s = stats();
  $('#kpis').innerHTML = [['Demandes enregistrées', s.T, ''], ['Dossiers reçus', s.recus, ''], ['En traitement', s.c.traitement, ''], ['Passeports prêts à retirer', s.c.pret, ''], ['Passeports remis', s.c.remis, 'v'], ['Pas encore remis', s.nonRemis, ''], ['Renouvellements', s.ren, 'm'], ['Dossiers à vérifier', s.av, 'r'], ['Délai moyen de remise', s.delai + ' j', '']].map(k => '<div class="kpi ' + k[2] + '"><b>' + k[1] + '</b><span>' + k[0] + '</span></div>').join('');
  charts.forEach(c => c.destroy()); charts = [];
  if (window.Chart) {
    Chart.defaults.font.family = 'system-ui,sans-serif'; Chart.defaults.font.size = 12;
    charts.push(new Chart($('#g1'), { type: 'doughnut', data: { labels: STATUTS.map(x => x[1]), datasets: [{ data: STATUTS.map(x => s.c[x[0]]), backgroundColor: STATUTS.map(x => COL[x[0]]) }] }, options: { plugins: { legend: { position: 'bottom' } } } }));
    charts.push(new Chart($('#g2'), { type: 'bar', data: { labels: STATUTS.map(x => x[1]), datasets: [{ label: 'Première demande', data: STATUTS.map(x => DB.filter(d => d.type === 'premiere' && d.status === x[0]).length), backgroundColor: '#8aa84a' }, { label: 'Renouvellement', data: STATUTS.map(x => DB.filter(d => d.type === 'renouvellement' && d.status === x[0]).length), backgroundColor: '#8b4bc0' }] }, options: { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { position: 'bottom' } } } }));
    const jr = [], base = NOW(); for (let k = 29; k >= 0; k--) jr.push(isoDate(new Date(base.getTime() - k * DAY)));
    charts.push(new Chart($('#g3'), { type: 'line', data: { labels: jr.map(x => x.slice(8) + '/' + x.slice(5, 7)), datasets: [{ label: 'Demandes', data: jr.map(j => DB.filter(d => isoDate(new Date(d.createdAt)) === j).length), borderColor: '#c89b3c', backgroundColor: '#c89b3c33', fill: true, tension: .3 }] }, options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } } }));
    const lx = LIEUX.map(l => [l, DB.filter(d => d.lieu === l).length]).sort((a, b) => b[1] - a[1]);
    charts.push(new Chart($('#g4'), { type: 'bar', data: { labels: lx.map(x => x[0]), datasets: [{ data: lx.map(x => x[1]), backgroundColor: '#0c2260' }] }, options: { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } } }));
  }
  const att = DB.filter(d => d.status !== 'remis').map(d => [d, jours(new Date(last(d).at).getTime(), NOW().getTime())]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  $('#tbAttente').innerHTML = att.map(([d, j]) => '<tr class="cl" data-id="' + d.id + '"><td><b>' + d.id + '</b></td><td>' + esc(d.person.nom + ' ' + d.person.prenoms) + '</td><td>' + bS(d.status) + '</td><td>' + j + ' jour(s)</td></tr>').join('');
  $('#croise').innerHTML = '<thead><tr><th>Type</th>' + STATUTS.map(x => '<th>' + x[1] + '</th>').join('') + '<th>Total</th></tr></thead><tbody>' + Object.keys(TN).map(t => '<tr><td><b>' + TN[t] + '</b></td>' + STATUTS.map(x => '<td>' + DB.filter(d => d.type === t && d.status === x[0]).length + '</td>').join('') + '<td><b>' + DB.filter(d => d.type === t).length + '</b></td></tr>').join('') + '<tr><td><b>Total</b></td>' + STATUTS.map(x => '<td><b>' + s.c[x[0]] + '</b></td>').join('') + '<td><b>' + s.T + '</b></td></tr></tbody>';
}

/* ---------- Export Excel ---------- */
function excel() {
  if (!window.XLSX) { alert('Export indisponible.'); return; }
  const wb = XLSX.utils.book_new(), s = stats();
  const dos = DB.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(d => { const p = d.person, t = new Date(d.createdAt); return { 'N° dossier': d.id, 'Date de dépôt': fmtD(d.createdAt), 'Heure': pad(t.getHours()) + ':' + pad(t.getMinutes()), 'Nom': p.nom, 'Prénoms': p.prenoms, 'Date de naissance': fmtD(p.naissance), 'Sexe': p.sexe, 'Type de demande': TN[d.type], 'Pièce': p.piece.type, 'N° de pièce': p.piece.numero, 'Expiration pièce': fmtD(p.piece.expiration), 'Ancien passeport n°': d.ancien ? d.ancien.numero : '', 'Ancien expiré le': d.ancien ? fmtD(d.ancien.expiration) : '', 'Ancien restitué': d.ancien ? (d.ancienRestitue ? 'Oui' : 'Non') : '', 'Téléphone': p.tel, 'Secteur': d.lieu, 'État': SN[d.status], 'Dernière mise à jour': fmtDH(last(d).at), 'Délai (jours)': jours(new Date(d.createdAt).getTime(), (d.status === 'remis' ? new Date(last(d).at) : NOW()).getTime()), 'Alerte': (d.flags || []).map(f => f.t).join(' | '), 'Alerte examinée': d.verifie ? 'Oui' : '' }; });
  const sh = (name, rows, w) => { const x = XLSX.utils.json_to_sheet(rows); if (w) x['!cols'] = w.map(n => ({ wch: n })); XLSX.utils.book_append_sheet(wb, x, name); };
  sh('Dossiers', dos, [18, 12, 8, 18, 20, 14, 6, 16, 11, 13, 14, 16, 14, 12, 16, 13, 18, 20, 12, 60, 10]);
  sh('Synthèse états', STATUTS.map(x => ({ 'État': x[1], 'Nombre': s.c[x[0]], 'Part (%)': s.T ? Math.round(s.c[x[0]] * 1000 / s.T) / 10 : 0 })).concat([{ 'État': 'TOTAL', 'Nombre': s.T, 'Part (%)': 100 }]), [24, 10, 10]);
  sh('Croisé type x état', Object.keys(TN).map(t => Object.assign({ 'Type': TN[t] }, ...STATUTS.map(x => ({ [x[1]]: DB.filter(d => d.type === t && d.status === x[0]).length })), { 'Total': DB.filter(d => d.type === t).length })), [18, 18, 16, 14, 16, 18, 8]);
  const jr = {}; DB.forEach(d => { const k = isoDate(new Date(d.createdAt)); jr[k] = (jr[k] || 0) + 1; });
  sh('Par jour', Object.keys(jr).sort().map(k => ({ 'Date': fmtD(k), 'Demandes': jr[k] })), [14, 10]);
  sh('Par secteur', LIEUX.map(l => ({ 'Secteur': l, 'Demandes': DB.filter(d => d.lieu === l).length, 'Remis': DB.filter(d => d.lieu === l && d.status === 'remis').length })), [18, 10, 10]);
  sh('Alertes', DB.filter(d => d.flags && d.flags.length).map(d => ({ 'N° dossier': d.id, 'Nom': d.person.nom + ' ' + d.person.prenoms, 'Alerte': d.flags.map(f => f.t).join(' | '), 'Examinée': d.verifie ? 'Oui' : 'Non' })), [18, 28, 90, 10]);
  XLSX.writeFile(wb, 'Suivi-passeports-DEMO-' + isoDate(NOW()) + '.xlsx');
}

/* ---------- Démarrage ---------- */
function rafraichir() { if ($('#v-dossiers').classList.contains('on')) liste(); if ($('#v-tableau').classList.contains('on')) tableau(); }
function init() {
  charger(); remplirLieux(); majType();
  $('#onglets').addEventListener('click', e => { const b = e.target.closest('button'); if (b) aller(b.dataset.v); });
  $('#role').addEventListener('change', () => { appliquerRole(); rafraichir(); });
  $$('input[name=type]').forEach(r => r.addEventListener('change', majType));
  ['f_nom', 'f_prenoms', 'f_naiss', 'f_pnum', 'f_pexp', 'f_anum', 'f_aexp'].forEach(i => $('#' + i).addEventListener('input', () => { if (i === 'f_aexp') majAdepuis(); alertesForm(); }));
  $('#bLire').onclick = lire; $('#bValider').onclick = valider; $('#bVider').onclick = effacer;
  $('#bCam').onclick = ouvrirCam; $('#bStop').onclick = fermerCam; $('#bSnap').onclick = capturer;
  $('#bFile').onclick = () => $('#fileIn').click(); $('#fileIn').onchange = e => depuisFichier(e.target.files[0]);
  $$('[data-ex]').forEach(b => b.onclick = () => exemple(b.dataset.ex));
  ['q', 'fs', 'ft', 'fl', 'fa'].forEach(i => $('#' + i).addEventListener('input', liste));
  $('#bXlsx').onclick = excel; $('#bXlsx2').onclick = excel;
  document.addEventListener('click', e => { const tr = e.target.closest('tr.cl'); if (tr) detail(tr.dataset.id); if (e.target === $('#tiroir')) fermer(); });
  const reset = document.createElement('button'); reset.className = 'btn clair'; reset.style.marginTop = '12px'; reset.textContent = '↺ Remettre la démonstration à zéro (données fictives)';
  reset.onclick = () => { if (confirm('Remettre les données fictives de départ ?')) { try { localStorage.removeItem(KEY); } catch (e) { } charger(); rafraichir(); alert('Démonstration remise à zéro.'); } };
  $('#v-regles').appendChild(reset);
  appliquerRole(); window.__sp = { parseMRZ, buildTD3, buildTD1, evalFlags, get DB() { return DB; } };
}
init();
})();
