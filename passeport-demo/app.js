/* Passeport Sûr — suivi et contrôle des demandes de passeport (démonstration : données fictives, stockées sur l'appareil) */
(function () {
'use strict';
const STATUTS = [['depose', 'Demande déposée'], ['paye', 'Paiement effectué'], ['recu', 'Dossier reçu'], ['traitement', 'En traitement'], ['pret', 'Passeport prêt'], ['remis', 'Remis au demandeur']];
const SN = Object.fromEntries(STATUTS);
const TN = { premiere: 'Première demande', renouvellement: 'Renouvellement' };
const KN = { piece: 'Pièce modifiée', doublon: 'Doublon de pièce', identite: 'Double identité', reseau: 'Réseau d’intermédiaires', expiree: 'Pièce expirée', renouvellement: 'Renouvellement irrégulier', etape: 'Étape sautée', delai: 'Remise éclair', nuit: 'Action de nuit', bloque: 'Dossier bloqué', agent: 'Agent à surveiller' };
const LIEUX = ['Makélékélé', 'Bacongo', 'Poto-Poto', 'Moungali', 'Ouenzé', 'Talangaï', 'Mfilou', 'Madibou', 'Djiri'];
const AGENTS = ['Agent 01', 'Agent 02', 'Agent 03', 'Agent 04', 'Agent 05', 'Agent 06'];
const REQUIS = {   // liste indicative des pièces à fournir (à confirmer avec la Préfecture)
  premiere: [['photo', 'Photo d’identité', true], ['identite', 'Pièce d’identité (carte nationale)', true], ['naissance', 'Acte de naissance', true], ['nationalite', 'Certificat de nationalité', true], ['domicile', 'Justificatif de domicile', false]],
  renouvellement: [['photo', 'Photo d’identité', true], ['identite', 'Pièce d’identité', true], ['ancien', 'Ancien passeport (page d’identité)', true], ['domicile', 'Justificatif de domicile', false]] };
const manquantes = d => (REQUIS[d.type] || []).filter(r => r[2] && !(d.pieces || []).some(p => p.type === r[0]));
const KEY = 'sp_demo_v4';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 86400000, HOUR = 3600000;
const pad = (n, l = 2) => String(n).padStart(l, '0');
const isoDate = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fmtD = s => { if (!s) return '—'; const d = new Date(s); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
const fmtDH = s => { const d = new Date(s); return fmtD(s) + ' à ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const jours = (a, b) => Math.floor((b - a) / DAY);
const NOW = () => new Date();
const T = s => new Date(s).getTime();

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
function dateMRZ(s, futur) { const yy = +s.slice(0, 2), cur = NOW().getFullYear() % 100; const y = futur ? 2000 + yy : (yy > cur ? 1900 + yy : 2000 + yy); return y + '-' + s.slice(2, 4) + '-' + s.slice(4, 6); }
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

/* ---------- Moteur anti-fraude ---------- */
const stIdx = s => STATUTS.findIndex(x => x[0] === s);
const last = d => d.history[d.history.length - 1];
const telCle = t => String(t || '').replace(/\D/g, '').slice(-8);
const identCle = d => d.person.nom + '|' + d.person.prenoms + '|' + d.person.naissance;
const hNuit = iso => { const h = new Date(iso).getHours(); return h < 7 || h >= 19; };
function computeFlags(all) {
  const FL = {}, auj = isoDate(NOW()), now = NOW().getTime();
  const sorted = all.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  sorted.forEach(d => FL[d.id] = []);
  const add = (d, k, n, p, t) => FL[d.id].push({ k, n, p, t });
  const parPiece = {}, parIdent = {}, parTel = {}, parAncien = {};
  sorted.forEach(d => {
    (parPiece[d.person.piece.numero] = parPiece[d.person.piece.numero] || []).push(d);
    (parIdent[identCle(d)] = parIdent[identCle(d)] || []).push(d);
    const t = telCle(d.person.tel); if (t) (parTel[t] = parTel[t] || []).push(d);
    if (d.ancien && d.ancien.numero) (parAncien[d.ancien.numero] = parAncien[d.ancien.numero] || []).push(d);
  });
  const eclairParAgent = {}, nuitParAgent = {};
  sorted.forEach(d => {
    const p = d.person;
    if (!d.mrzOk) add(d, 'piece', 'rouge', 40, 'Les chiffres de contrôle de la pièce sont faux : la pièce a peut-être été modifiée.');
    const g = parPiece[p.piece.numero]; if (g.length > 1 && g[0].id !== d.id) add(d, 'doublon', 'rouge', 40, 'Ce numéro de pièce est déjà dans le dossier ' + g[0].id + '.');
    const gi = parIdent[identCle(d)]; if (gi.length > 1 && gi[0].id !== d.id && gi.some(x => x.person.piece.numero !== p.piece.numero)) add(d, 'identite', 'rouge', 40, 'Mêmes nom, prénoms et naissance que le dossier ' + gi[0].id + ', avec une autre pièce.');
    const gt = telCle(p.tel) ? parTel[telCle(p.tel)] : null;
    if (gt) { const ids = new Set(gt.map(identCle)); if (ids.size >= 3) add(d, 'reseau', 'rouge', 35, 'Le même téléphone (' + p.tel + ') sert à ' + ids.size + ' personnes différentes : intermédiaire possible.'); }
    if (p.piece.expiration && p.piece.expiration < auj && !(d.type === 'renouvellement' && d.ancien && d.ancien.numero === p.piece.numero)) add(d, 'expiree', 'orange', 12, 'La pièce présentée est expirée depuis le ' + fmtD(p.piece.expiration) + '.');
    if (d.type === 'renouvellement') {
      if (!d.ancien || !d.ancien.numero) add(d, 'renouvellement', 'orange', 12, 'Renouvellement : le numéro de l’ancien passeport manque.');
      else {
        if (d.ancien.expiration && d.ancien.expiration > auj) add(d, 'renouvellement', 'orange', 15, 'L’ancien passeport n’est pas encore expiré (il expire le ' + fmtD(d.ancien.expiration) + ').');
        const ga = (parAncien[d.ancien.numero] || []).filter(x => x.id !== d.id), gp = (parPiece[d.ancien.numero] || []).filter(x => x.id !== d.id && x.person.piece.type === 'PASSEPORT');
        const autre = ga.concat(gp)[0]; if (autre && autre.createdAt < d.createdAt) add(d, 'renouvellement', 'rouge', 35, 'L’ancien passeport n° ' + d.ancien.numero + ' est déjà utilisé dans le dossier ' + autre.id + '.');
      }
      if (d.status === 'remis' && !d.ancienRestitue) add(d, 'renouvellement', 'rouge', 40, 'Nouveau passeport remis sans restitution ni annulation de l’ancien.');
    }
    const h = d.history;
    for (let i = 1; i < h.length; i++) if (stIdx(h[i].s) - stIdx(h[i - 1].s) > 1) { add(d, 'etape', 'rouge', 35, 'Étape sautée : de « ' + SN[h[i - 1].s] + ' » directement à « ' + SN[h[i].s] + ' » (' + h[i].by + ').'); break; }
    if (d.status === 'remis' && T(last(d).at) - T(d.createdAt) < 48 * HOUR) { add(d, 'delai', 'rouge', 30, 'Passeport remis ' + Math.max(1, Math.round((T(last(d).at) - T(d.createdAt)) / HOUR)) + ' h après le dépôt (' + last(d).by + ').'); (eclairParAgent[d.agent] = eclairParAgent[d.agent] || []).push(d); }
    if (d.status !== 'remis' && now - T(last(d).at) > 25 * DAY) add(d, 'bloque', 'orange', 12, 'Aucun changement depuis ' + jours(T(last(d).at), now) + ' jours.');
    const nuits = h.filter(x => hNuit(x.at) && /^Agent/.test(x.by));
    if (nuits.length) { add(d, 'nuit', 'orange', 12, 'Action en dehors des heures de service : ' + fmtDH(nuits[0].at) + ' (' + nuits[0].by + ').'); nuits.forEach(x => (nuitParAgent[x.by] = nuitParAgent[x.by] || new Set()).add(d.id)); }
  });
  Object.entries(eclairParAgent).forEach(([ag, ds]) => { if (ds.length >= 3) ds.forEach(d => add(d, 'agent', 'rouge', 20, ag + ' : ' + ds.length + ' remises éclair (moins de 48 h) — profil à surveiller.')); });
  Object.entries(nuitParAgent).forEach(([ag, s]) => { if (s.size >= 3) all.filter(d => s.has(d.id)).forEach(d => add(d, 'agent', 'orange', 10, ag + ' : ' + s.size + ' dossiers traités la nuit.')); });
  Object.keys(FL).forEach(id => { FL[id].score = Math.min(100, FL[id].reduce((a, f) => a + f.p, 0)); });
  return FL;
}
let FL = {};
const flags = d => FL[d.id] || [];
const score = d => (FL[d.id] && FL[d.id].score) || 0;
const ouvert = d => flags(d).length && !d.suite;
const couleurScore = s => s >= 60 ? '#d62f26' : s >= 30 ? '#e08a00' : '#c9a20c';

/* ---------- Données fictives ---------- */
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const NOMS = ['Mabiala', 'Nkounkou', 'Moukoko', 'Itoua', 'Okemba', 'Mouanda', 'Ngoma', 'Bakala', 'Massamba', 'Loubaki', 'Mpassi', 'Kimbembe', 'Boukaka', 'Ondongo', 'Tsiba', 'Makosso', 'Nzaba', 'Samba', 'Mavoungou', 'Ibara', 'Dzon', 'Elenga', 'Gampio', 'Lekaka'];
const PF = ['Grâce', 'Prisca', 'Merveille', 'Esther', 'Sandrine', 'Chancelle', 'Divine', 'Laure', 'Ornella', 'Nadège', 'Josiane', 'Clarisse'];
const PM = ['Jean-Claude', 'Rodrigue', 'Christ', 'Parfait', 'Brice', 'Fabrice', 'Giscard', 'Hervé', 'Dieudonné', 'Aimé', 'Steve', 'Gildas'];
const serviceDay = ms => isoDate(new Date(ms - 4 * HOUR));
const jourSite = dec => new Date(Date.now() + 3600000 + (dec || 0) * DAY).toISOString().slice(0, 10);
const creneau = n => { const m = 8 * 60 + Math.floor((n - 1) / 10) * 30; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
const rdvLong = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const rdvHtml = d => d.ticket ? '<div class="alert vert">' + (d.rdv ? '📅 <b>Rendez-vous d’enrôlement : ' + rdvLong(d.rdv.date) + ' à partir de ' + d.rdv.heure + '</b><br>' + esc(d.rdv.lieu) + '<br>' : '') + 'Votre N° d’appel : <b style="font-size:20px">' + pad(d.ticket, 3) + '</b></div>' : '';
function deriver(all) {
  const today = jourSite(0), nowMs = Date.now();
  all.forEach(d => { delete d.paiement; delete d.appel; delete d.ticket; delete d.rdv;
    const h = d.history.find(x => x.s === 'paye');
    if (h) { d.paiement = { montant: d.montant || 75000, mode: d.mode || 'Espèces', at: h.at, caissier: 'Caisse' };
      d.rdv = { date: nowMs - T(h.at) < 14 * HOUR ? today : new Date(T(h.at) + 3600000).toISOString().slice(0, 10), heure: '08:00', lieu: 'Préfecture de Brazzaville', objet: 'Enrôlement (empreintes et photo)' }; }
    const r = d.history.find(x => x.s === 'recu'); if (r) { const m = /(\d)/.exec(r.by); d.appel = { porte: m ? +m[1] : 1, at: r.at }; } });
  const pays = all.filter(d => d.paiement).sort((x, y) => x.paiement.at.localeCompare(y.paiement.at)), cnt = {}; let rp = 0;
  pays.forEach(d => { const k = d.rdv.date; cnt[k] = (cnt[k] || 0) + 1; d.ticket = cnt[k]; d.rdv.heure = creneau(d.ticket); d.paiement.recu = 'RP-' + new Date(d.paiement.at).getFullYear() + '-' + pad(++rp, 6); });
}
function seed() {
  const R = rng(20261125), pick = a => a[Math.floor(R() * a.length)], ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const all = [], now = NOW(), nowMs = now.getTime();
  const fab = (i, ts, force) => {
    const t = new Date(ts), ren = R() < 0.32, f = R() < 0.5, nom = pick(NOMS), prenoms = f ? pick(PF) : pick(PM), age = jours(t.getTime(), nowMs), agent = pick(AGENTS);
    const naiss = ri(1958, 2007) + '-' + pad(ri(1, 12)) + '-' + pad(ri(1, 28));
    const ptype = ren ? (R() < 0.6 ? 'PASSEPORT' : 'CNI') : (R() < 0.85 ? 'CNI' : 'PASSEPORT');
    const num = (ptype === 'CNI' ? 'CG' : 'OA') + pad(ri(1000000, 9999999), 7);
    const exp = isoDate(new Date(nowMs + (ren && ptype === 'PASSEPORT' ? -ri(15, 900) : ri(200, 2800)) * DAY));
    const d = { id: 'BZV-' + t.getFullYear() + '-' + pad(i + 1, 6), type: ren ? 'renouvellement' : 'premiere', createdAt: t.toISOString(), lieu: pick(LIEUX), agent, mrzOk: true,
      montant: pick([50000, 75000, 100000]), mode: pick(['Espèces', 'Mobile Money MTN', 'Mobile Money Airtel']),
      person: { nom: nom.toUpperCase(), prenoms, naissance: naiss, sexe: f ? 'F' : 'M', nationalite: 'COG', tel: '+242 06 ' + pad(ri(100, 999), 3) + ' ' + pad(ri(10, 99)) + ' ' + pad(ri(10, 99)), piece: { type: ptype, numero: num, expiration: exp } },
      ancien: null, ancienRestitue: false, history: [] };
    if (ren) { const ae = isoDate(new Date(nowMs - ri(15, 900) * DAY)); d.ancien = { numero: 'OA' + pad(ri(1000000, 9999999), 7), expiration: ae }; if (ptype === 'PASSEPORT') { d.person.piece.numero = d.ancien.numero; d.person.piece.expiration = ae; } }
    let steps = 0, tt = t.getTime(); const pas = [[0, 1], [1, 3], [2, 6], [3, 8], [2, 5]];
    d.history.push({ s: 'depose', at: new Date(tt).toISOString(), by: agent, note: 'Dossier enregistré' });
    for (let k = 0; k < 5; k++) {
      if (force != null && steps >= force) break;
      let at;
      if (k === 0) at = new Date(tt + ri(8, 90) * 60000);
      else if (k === 1 && force != null) at = new Date(tt + ri(5, 20) * 60000);
      else { at = new Date(tt + ri(pas[k][0], pas[k][1]) * DAY + ri(0, 5) * HOUR); at.setHours(ri(8, 16), ri(0, 59), 0, 0); if (at.getTime() <= tt) at = new Date(tt + DAY); }
      if (force == null && !(at.getTime() < nowMs - 3 * HOUR && (k === 1 && age > 1 ? true : R() < (age > 20 ? 0.93 : 0.72)))) break;
      tt = at.getTime(); steps++;
      d.history.push({ s: STATUTS[k + 1][0], at: at.toISOString(), by: k === 0 ? 'Caisse' : k === 1 ? 'Porte ' + ri(1, 4) : (k === 2 || k === 3) ? 'Préfecture' : agent, note: '' });
    }
    d.status = STATUTS[steps][0]; if (d.status === 'remis' && ren) d.ancienRestitue = true;
    return d;
  };
  const dates = []; for (let i = 0; i < 86; i++) dates.push(nowMs - (R() * R() * 64 + 0.3) * DAY); dates.sort((a, b) => a - b);
  dates.forEach((ts, i) => { const t = new Date(ts); t.setHours(ri(8, 16), ri(0, 59), 0, 0); all.push(fab(i, t.getTime(), null)); });
  // cas réalistes d'irrégularités (pour montrer ce que le système détecte)
  const A = all.length, rem = all.filter(x => x.status === 'remis' && jours(T(x.createdAt), nowMs) > 20);
  all[A - 7].person.piece = Object.assign({}, all[9].person.piece);
  all[A - 15].person.piece = Object.assign({}, all[24].person.piece);
  Object.assign(all[A - 4].person, { nom: all[16].person.nom, prenoms: all[16].person.prenoms, naissance: all[16].person.naissance });
  all[A - 10].mrzOk = false; all[A - 24].mrzOk = false;
  ['A', 'B', 'C', 'D'].forEach((_, j) => { all[10 + j * 9].person.tel = '+242 06 612 34 78'; });
  rem.slice(0, 4).forEach(d => {
    d.agent = 'Agent 04'; const b = T(d.createdAt), hrs = [1, 2, 3, 4, 6];
    d.history = [{ s: 'depose', at: d.createdAt, by: 'Agent 04', note: 'Dossier enregistré' }].concat(['paye', 'recu', 'traitement', 'pret', 'remis'].map((s, k) => ({ s, at: new Date(b + hrs[k] * HOUR).toISOString(), by: k === 0 ? 'Caisse' : k === 1 ? 'Porte 2' : 'Agent 04', note: '' })));
    if (d.type === 'renouvellement') d.ancienRestitue = true;
  });
  const sk = all.filter(x => x.status === 'pret' && x.history.length === 5)[0] || all.filter(x => x.status === 'traitement')[0];
  if (sk) { sk.history = [sk.history[0], { s: 'recu', at: new Date(T(sk.history[0].at) + 2 * HOUR).toISOString(), by: 'Porte 1', note: '' }, { s: 'pret', at: new Date(T(sk.history[0].at) + 2 * DAY).toISOString(), by: sk.agent, note: '' }]; sk.status = 'pret'; }
  all.filter(x => x.history.length >= 4 && !x.history.some(h => h.by === 'Agent 04')).slice(0, 4).forEach(d => { const h = d.history[3]; const dd = new Date(h.at); dd.setHours(22, 40); h.at = dd.toISOString(); h.by = 'Agent 02'; });
  const r2 = all.filter(x => x.type === 'renouvellement' && x.status !== 'remis'); if (r2.length) r2[r2.length - 1].ancien.expiration = isoDate(new Date(nowMs + 260 * DAY));
  const sr = all.filter(x => x.type === 'renouvellement' && x.status === 'remis' && !x.history.some(h => h.by === 'Agent 04'))[0]; if (sr) sr.ancienRestitue = false;
  // la file d'attente du jour : 2 personnes déjà appelées, 9 en attente, 3 qui viennent de déposer
  for (let j = 0; j < 14; j++) { const force = j < 2 ? 2 : j < 11 ? 1 : 0; all.push(fab(86 + j, nowMs - (330 - j * 20) * 60000, force)); }
  all.forEach(d => d.history.sort((x, y) => x.at.localeCompare(y.at)));
  deriver(all);
  const R2 = rng(777);
  all.forEach(d => { const req = REQUIS[d.type] || []; d.pieces = req.filter(r => r[2] || R2() < .4).map(r => ({ id: 'demo-' + d.id + '-' + r[0], type: r[0], nom: r[1] + '.jpg', mime: 'image/jpeg', demo: true, par: 'guichet' }));
    if (stIdx(d.status) <= 1 && R2() < .45) { const n = 1 + Math.floor(R2() * 2); for (let k = 0; k < n; k++) { const ob = d.pieces.filter(p => req.some(r => r[0] === p.type && r[2])); if (ob.length > 1) d.pieces.splice(d.pieces.indexOf(ob[Math.floor(R2() * ob.length)]), 1); } } });
  FL = computeFlags(all);
  all.filter(d => flags(d).length).slice(0, 3).forEach((d, i) => { d.suite = i === 2 ? 'enquete' : 'verifie'; d.suiteAt = now.toISOString(); });
  return all;
}
let DB = [];
function charger() { try { DB = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { DB = null; } if (!Array.isArray(DB) || !DB.length) { DB = seed(); sauver(); } FL = computeFlags(DB); }
function recalculer() { FL = computeFlags(DB); majPastille(); }
function sauver() { if (!(window.__spSync && (window.__spSync.actif() || window.__spSync.citoyen()))) { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { } } FL = computeFlags(DB); majPastille(); if (window.__spSync) window.__spSync.apresSauver(); }

/* ---------- Profil et navigation ---------- */
let role = 'agent';
const ROLES = { agent: 'Agent 03', caisse: 'Caisse', porte: 'Porte 1', prefecture: 'Préfecture', ministere: 'Ministère' };
function appliquerRole() {
  role = $('#role').value;
  $$('#onglets button[data-roles]').forEach(b => { b.style.display = b.dataset.roles.split(',').includes(role) ? '' : 'none'; });
  const cur = $('#onglets .on'); if (cur && cur.style.display === 'none') aller('accueil');
  if (window.__spSuite) window.__spSuite.role(role);
}
let tSortie = 0, tStagger = 0;
/* Transition de page « verre » : l'ancienne page glisse et se floute, la nouvelle arrive en zoom, un voile de verre passe. */
function transitionPages(ancien, nouveau) {
  try {
    if (!ancien || !nouveau || ancien === nouveau || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const ids = $$('#onglets button').map(b => b.dataset.v), i0 = ids.indexOf(ancien.id.slice(2)), i1 = ids.indexOf(nouveau.id.slice(2));
    document.querySelector('main').style.setProperty('--dx', i0 >= 0 && i1 >= 0 && i1 < i0 ? -1 : 1);
    $$('.vue.sortie').forEach(s => s.classList.remove('sortie')); clearTimeout(tSortie);
    ancien.classList.add('sortie'); tSortie = setTimeout(() => ancien.classList.remove('sortie'), 240);
    $$('.vue.stagger').forEach(s => s.classList.remove('stagger')); clearTimeout(tStagger);
    [...nouveau.querySelectorAll('.baniere,.carte,.kpi,.porteC')].slice(0, 14).forEach((e, i) => e.style.setProperty('--i', i));
    nouveau.classList.add('stagger'); tStagger = setTimeout(() => nouveau.classList.remove('stagger'), 900);
    let g = document.getElementById('verre'); if (!g) { g = document.createElement('div'); g.id = 'verre'; g.setAttribute('aria-hidden', 'true'); document.body.appendChild(g); }
    g.classList.remove('go'); void g.offsetWidth; g.classList.add('go');
  } catch (e) { }
}
function aller(v, sansHisto) {
  const ancien = document.querySelector('.vue.on');
  $$('#onglets button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $$('.vue').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
  transitionPages(ancien, document.getElementById('v-' + v));
  rafraichir(); window.scrollTo({ top: 0 });
  if (!sansHisto) { try { if (location.hash !== '#' + v) history.pushState({ v }, '', '#' + v); } catch (e) { } }
}
function majPastille() { const n = DB.filter(ouvert).length; const e = $('#ptFraude'); if (e) { e.textContent = n; e.style.display = n ? '' : 'none'; } }

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
  const c = r.checks, lg = (l, ok) => '<span class="badge ' + (ok ? 'ok' : 'alerte') + '">' + (ok ? '✔ ' : '✖ ') + l + '</span> ';
  box.innerHTML = '<div class="alert ' + (r.valide ? 'vert' : 'rouge') + '"><b>' + (r.valide ? 'Pièce lisible et cohérente.' : 'Attention : les chiffres de contrôle ne correspondent pas.') + '</b> ' + esc(r.format) + '<div style="margin-top:6px">' + lg('Numéro', c.num) + lg('Naissance', c.naiss) + lg('Expiration', c.exp) + lg('Contrôle global', c.global) + '</div></div>';
  alertesForm();
}
function lireFiche() {
  const piece = { type: $('#f_ptype').value, numero: $('#f_pnum').value.trim().toUpperCase(), expiration: $('#f_pexp').value };
  const d = { id: '(nouveau)', type: typeCourant(), mrzOk: flux ? flux.valide : true, createdAt: NOW().toISOString(), status: 'depose', agent: ROLES[role], person: { nom: $('#f_nom').value.trim().toUpperCase(), prenoms: $('#f_prenoms').value.trim(), naissance: $('#f_naiss').value, sexe: $('#f_sexe').value, nationalite: $('#f_nat').value.trim().toUpperCase(), tel: $('#f_tel').value.trim(), piece }, ancien: null, ancienRestitue: false, history: [{ s: 'depose', at: NOW().toISOString(), by: ROLES[role], note: '' }] };
  if (d.type === 'renouvellement') d.ancien = { numero: $('#f_anum').value.trim().toUpperCase(), expiration: $('#f_aexp').value };
  return d;
}
function alertesForm() {
  const d = lireFiche(), box = $('#alertesForm');
  if (!d.person.nom && !d.person.piece.numero) { box.innerHTML = ''; return; }
  const f = computeFlags(DB.concat([d]))[d.id] || [];
  box.innerHTML = f.length ? f.map(x => '<div class="alert ' + (x.n === 'rouge' ? 'rouge' : 'orange') + '">⚠ ' + esc(x.t) + '</div>').join('') + '<div class="alert bleu">Le dossier peut être enregistré : il sera signalé « À vérifier » à la Préfecture.</div>' : '<div class="alert vert">Aucune anomalie détectée.</div>';
}
function effacer() { ['f_nom', 'f_prenoms', 'f_naiss', 'f_pnum', 'f_pexp', 'f_tel', 'f_anum', 'f_aexp', 'f_adepuis', 'mrz'].forEach(i => $('#' + i).value = ''); $('#f_sexe').value = ''; $('#resLecture').innerHTML = ''; $('#alertesForm').innerHTML = ''; flux = null; if (window.__spSuite) window.__spSuite.reset(); }
function valider() {
  const d = lireFiche(), p = d.person, manque = [];
  if (!p.nom) manque.push('nom'); if (!p.prenoms) manque.push('prénoms'); if (!p.naissance) manque.push('date de naissance'); if (!p.piece.numero) manque.push('numéro de la pièce'); if (d.type === 'renouvellement' && !d.ancien.numero) manque.push('numéro de l’ancien passeport');
  if (manque.length) { $('#alertesForm').innerHTML = '<div class="alert rouge">Il manque : ' + manque.join(', ') + '.</div>'; return; }
  if (window.__spSuite && !window.__spSuite.aSignature()) { $('#alertesForm').innerHTML = '<div class="alert rouge">La signature du demandeur est obligatoire : faites-le signer dans le cadre.</div>'; document.getElementById('sigPad').scrollIntoView({ block: 'center' }); return; }
  const t = NOW(); d.id = 'BZV-' + t.getFullYear() + '-' + pad(DB.length + 1, 6); d.createdAt = t.toISOString(); d.lieu = $('#f_lieu').value; d.history[0] = { s: 'depose', at: t.toISOString(), by: ROLES[role], note: 'Dossier enregistré' };
  if (window.__spSuite) Object.assign(d, window.__spSuite.extras());
  DB.push(d); if (window.__spSuite) window.__spSuite.apres(d); sauver(); effacer(); montrerRecu(d);
}
function code(id, nom) { let h = 7; const s = id + nom; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36).toUpperCase().padStart(6, '7').slice(-6).replace(/0/g, '7').replace(/O/g, '8').replace(/1/g, '4').replace(/I/g, '9').replace(/L/g, '5'); }
function qr(txt) { try { const q = qrcode(0, 'M'); q.addData(txt); q.make(); return q.createSvgTag(4, 0); } catch (e) { return ''; } }
function montrerRecu(d) {
  const p = d.person, f = flags(d);
  $('#feuille').innerHTML = '<div class="recu"><img class="lg" src="logo.svg" alt=""><div style="font-size:12px;letter-spacing:.14em;color:var(--gris)">ACCUSÉ D’ENREGISTREMENT — DÉMONSTRATION</div><div class="num">' + d.id + '</div>' + qr('PSR1|' + d.id + '|' + code(d.id, p.nom)) +
    '<div style="font-size:12.5px;color:var(--gris)">N° de reçu à présenter à la caisse de la Préfecture · code de contrôle <b style="color:var(--foret);font-size:15px;letter-spacing:.1em">' + code(d.id, p.nom) + '</b></div>' +
    '<dl class="dl" style="text-align:left"><dt>Demandeur</dt><dd>' + esc(p.nom + ' ' + p.prenoms) + '</dd><dt>Type</dt><dd>' + TN[d.type] + '</dd><dt>Déposé le</dt><dd>' + fmtDH(d.createdAt) + '</dd><dt>Secteur</dt><dd>' + esc(d.lieu) + '</dd></dl>' +
    '<div style="font-size:13.5px">Étape suivante : <b>paiement à la caisse de la Préfecture</b>. La caisse scanne ce code QR.</div></div>' +
    (window.__spSuite ? window.__spSuite.accuse(d) : '') +
    (f.length ? '<div class="alert orange noprint">Dossier signalé « À vérifier » : ' + f.length + ' alerte(s) transmise(s) à la Préfecture.</div>' : '') +
    '<div class="ligne noprint" style="margin-top:12px"><button class="btn or" onclick="window.print()">🖨 Imprimer l’accusé</button><button class="btn clair" id="bFerme">Fermer</button><button class="btn clair" id="bVoir">Voir le dossier</button></div>';
  $('#tiroir').classList.add('on'); $('#bFerme').onclick = fermer; $('#bVoir').onclick = () => detail(d.id);
  if (window.__spSuite) window.__spSuite.lierAccuse(d);
}
function fermer() { $('#tiroir').classList.remove('on'); }

/* ---------- Scan : caméra et lecture ---------- */
let stream = null;
async function ouvrirCam() { try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); const v = $('#vid'); v.srcObject = stream; await v.play(); $('#cam').classList.add('on'); } catch (e) { $('#ocrEtat').textContent = 'Caméra indisponible ici : utilisez « Choisir une photo » ou un exemple.'; } }
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
    $('#mrz').value = lignes.slice(-3).join('\n'); etat.textContent = 'Lecture terminée. Vérifiez les lignes.'; lire();
  } catch (e) { etat.textContent = 'Lecture automatique impossible pour cette photo (connexion ou image floue). Reprenez la photo ou saisissez les lignes.'; }
}
function exemple(k) {
  const auj = NOW().getTime(), dt = n => isoDate(new Date(auj + n * DAY)); let txt;
  if (k === 'pass') txt = buildTD3({ nom: 'Moukala', prenoms: 'Grace Chancelle', num: 'OA4821937', naiss: '1991-04-17', sexe: 'F', exp: dt(-250) });
  else if (k === 'cni') txt = buildTD1({ nom: 'Batchi', prenoms: 'Rodrigue', num: 'CG6103348', naiss: '1987-09-03', sexe: 'M', exp: dt(1200) });
  else { const l = buildTD3({ nom: 'Ngouabi', prenoms: 'Prisca', num: 'OA7745120', naiss: '1994-02-11', sexe: 'F', exp: dt(900) }).split('\n'); l[1] = l[1].slice(0, 5) + '9' + l[1].slice(6); txt = l.join('\n'); }
  $('#mrz').value = txt; if (k === 'pass') { document.querySelector('input[name=type][value=renouvellement]').checked = true; majType(); } lire();
}

/* ---------- Liste ---------- */
const bS = s => '<span class="badge s-' + s + '">' + SN[s] + '</span>', bT = t => '<span class="badge t-' + t + '">' + TN[t] + '</span>';
const bR = d => { const s = score(d); return s ? '<span class="risque" style="background:' + couleurScore(s) + '">' + s + '</span>' + (d.suite ? ' <span class="badge ok">' + (d.suite === 'enquete' ? 'Enquête' : 'Vérifié') + '</span>' : '') : ''; };
function filtrer() {
  const q = $('#q').value.trim().toLowerCase(), s = $('#fs').value, t = $('#ft').value, l = $('#fl').value, a = $('#fa').value;
  return DB.filter(d => (!s || d.status === s) && (!t || d.type === t) && (!l || d.lieu === l) && (!a || (a === '2' ? manquantes(d).length > 0 : ouvert(d))) && (!q || (d.id + ' ' + d.person.nom + ' ' + d.person.prenoms + ' ' + d.person.piece.numero).toLowerCase().includes(q))).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}
function liste() { const r = filtrer(); $('#cpt').textContent = r.length + ' dossier(s) sur ' + DB.length; $('#tb').innerHTML = r.slice(0, 150).map(d => '<tr class="cl" data-id="' + d.id + '"><td><b>' + d.id + '</b></td><td>' + fmtD(d.createdAt) + '</td><td>' + esc(d.person.nom + ' ' + d.person.prenoms) + '</td><td>' + bT(d.type) + '</td><td>' + bS(d.status) + '</td><td>' + esc(d.lieu) + '</td><td>' + bR(d) + (manquantes(d).length ? ' <span class="badge orange">Incomplet</span>' : '') + '</td></tr>').join(''); }

/* ---------- Fiche dossier ---------- */
function detail(id) {
  const d = DB.find(x => x.id === id); if (!d) return; const p = d.person, i = stIdx(d.status), peut = role !== 'ministere', f = flags(d);
  const etapes = '<div class="etapes">' + STATUTS.map((s, k) => '<div class="etape ' + (k < i ? 'fait' : k === i ? 'now' : '') + '">' + (k < i ? '✔ ' : '') + s[1] + '</div>').join('') + '</div>';
  let act = (i < 2 ? '<div class="alert bleu" style="flex:1 1 100%">' + (i === 0 ? 'En attente de paiement à la caisse (scan du code QR de l’accusé).' : 'Payé · N° d’appel ' + pad(d.ticket || 0, 3) + ' : en attente d’appel en salle.') + '</div>' : '');
  if (peut && i >= 2 && i < 5) { const bl = d.type === 'renouvellement' && d.status === 'pret' && !d.ancienRestitue; act += '<button class="btn vert" id="bNext"' + (bl ? ' disabled' : '') + '>Passer à : ' + STATUTS[i + 1][1] + '</button>'; if (bl) act += '<div class="alert orange" style="flex:1 1 100%">Renouvellement : le nouveau passeport ne peut être remis qu’après restitution ou annulation de l’ancien.</div>'; }
  if (peut && d.type === 'renouvellement' && !d.ancienRestitue) act += '<button class="btn clair" id="bAnc">Ancien passeport restitué / annulé</button>';
  if (role === 'prefecture' && ouvert(d)) act += '<button class="btn clair" id="bVer">✔ Vérifié : rien d’anormal</button><button class="btn rouge" id="bEnq">🚨 Transmettre pour enquête</button>';
  const fl = f.map(x => '<div class="alert ' + (x.n === 'rouge' ? 'rouge' : 'orange') + '"><b>' + KN[x.k] + '</b> — ' + esc(x.t) + '</div>').join('') + (d.suite ? '<div class="alert vert">✔ ' + (d.suite === 'enquete' ? 'Transmis pour enquête' : 'Examiné par la Préfecture : rien d’anormal') + ' le ' + fmtDH(d.suiteAt) + '.</div>' : '');
  $('#feuille').innerHTML = '<div class="ligne"><h3>' + d.id + '</h3><span style="margin-left:auto">' + bT(d.type) + ' ' + bS(d.status) + '</span></div>' + (f.length ? '<div class="ligne" style="margin:6px 0">Niveau de risque : ' + bR(d) + '</div>' : '') + etapes + fl +
    '<dl class="dl"><dt>Demandeur</dt><dd><b>' + esc(p.nom + ' ' + p.prenoms) + '</b></dd><dt>Né(e) le</dt><dd>' + fmtD(p.naissance) + ' · ' + (p.sexe === 'F' ? 'Féminin' : p.sexe === 'M' ? 'Masculin' : '—') + '</dd><dt>Téléphone</dt><dd>' + esc(p.tel || '—') + '</dd>' +
    '<dt>Pièce présentée</dt><dd>' + (p.piece.type === 'CNI' ? 'Carte d’identité' : 'Passeport') + ' n° ' + esc(p.piece.numero) + ' (expire le ' + fmtD(p.piece.expiration) + ')</dd>' +
    (d.ancien ? '<dt>Ancien passeport</dt><dd>n° ' + esc(d.ancien.numero) + ' · expiré le ' + fmtD(d.ancien.expiration) + ' · ' + (d.ancienRestitue ? '<b style="color:var(--vert)">restitué / annulé</b>' : '<b style="color:var(--rouge)">pas encore restitué</b>') + '</dd>' : '') +
    '<dt>Secteur · agent</dt><dd>' + esc(d.lieu) + ' · ' + esc(d.agent || '—') + '</dd><dt>Déposé le</dt><dd>' + fmtDH(d.createdAt) + '</dd></dl>' +
    (window.__spSuite ? window.__spSuite.piecesHtml(d) : '') + '<h3 style="font-size:16px">Historique</h3><div class="histo">' + d.history.map(h => '<div><b>' + SN[h.s] + '</b> — ' + fmtDH(h.at) + '<br><small>' + esc(h.by) + (h.note ? ' · ' + esc(h.note) : '') + '</small></div>').join('') + '</div>' +
    '<div class="ligne noprint" style="margin-top:14px">' + act + '<button class="btn clair" onclick="window.print()">🖨 Imprimer</button><button class="btn clair" id="bFerme">Fermer</button></div>';
  $('#tiroir').classList.add('on'); $('#bFerme').onclick = fermer;
  const maj = (fn) => { fn(); sauver(); detail(id); rafraichir(); };
  const n = $('#bNext'); if (n) n.onclick = () => maj(() => { const s = STATUTS[i + 1][0]; d.status = s; d.history.push({ s, at: NOW().toISOString(), by: ROLES[role], note: '' }); });
  const a = $('#bAnc'); if (a) a.onclick = () => maj(() => { d.ancienRestitue = true; d.history.push({ s: d.status, at: NOW().toISOString(), by: ROLES[role], note: 'Ancien passeport restitué / annulé' }); });
  const v = $('#bVer'); if (v) v.onclick = () => maj(() => { d.suite = 'verifie'; d.suiteAt = NOW().toISOString(); d.history.push({ s: d.status, at: NOW().toISOString(), by: ROLES[role], note: 'Alerte examinée : rien d’anormal' }); });
  const e = $('#bEnq'); if (e) e.onclick = () => maj(() => { d.suite = 'enquete'; d.suiteAt = NOW().toISOString(); d.history.push({ s: d.status, at: NOW().toISOString(), by: ROLES[role], note: 'Transmis pour enquête' }); });
}

/* ---------- Statistiques ---------- */
const COL = { depose: '#6b8aa3', paye: '#8b4bc0', recu: '#2a9d8f', traitement: '#f6c928', pret: '#009543', remis: '#0a4430' };
function stats() {
  const c = Object.fromEntries(STATUTS.map(s => [s[0], DB.filter(d => d.status === s[0]).length])), remis = DB.filter(d => d.status === 'remis');
  const delais = remis.map(d => jours(T(d.createdAt), T(last(d).at)));
  return { T: DB.length, c, recus: DB.filter(d => stIdx(d.status) >= 2).length, nonRemis: DB.length - c.remis, ren: DB.filter(d => d.type === 'renouvellement').length, av: DB.filter(ouvert).length, inc: DB.filter(d => manquantes(d).length).length, delai: delais.length ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length) : 0 };
}
const kp = (v, l, c) => '<div class="kpi ' + (c || '') + '"><b>' + v + '</b><span>' + l + '</span></div>';
let charts = [];
function graphes(list) { charts.forEach(c => c.destroy()); charts = []; if (window.Chart) { Chart.defaults.font.family = 'ID,system-ui,sans-serif'; Chart.defaults.font.size = 12; Chart.defaults.color = '#3c4a43'; list.forEach(f => { const c = f(); if (c) charts.push(c); }); } }
function accueil() { const s = stats(); $('#kpisAccueil').innerHTML = kp(s.T, 'Demandes enregistrées') + kp(s.c.remis, 'Passeports remis', 'v') + kp(s.nonRemis, 'En attente', 'j') + kp(s.av, 'Alertes à examiner', 'r'); }
function tableau() {
  const s = stats();
  $('#kpis').innerHTML = kp(s.T, 'Demandes enregistrées') + kp(s.recus, 'Dossiers reçus') + kp(s.c.traitement, 'En traitement', 'j') + kp(s.c.pret, 'Passeports prêts à retirer', 'v') + kp(s.c.remis, 'Passeports remis', 'v') + kp(s.nonRemis, 'Pas encore remis', 'j') + kp(s.ren, 'Renouvellements', 'm') + kp(s.av, 'Alertes à examiner', 'r') + kp(s.inc, 'Dossiers incomplets', 'j') + kp(s.delai + ' j', 'Délai moyen de remise');
  const jr = [], base = NOW(); for (let k = 29; k >= 0; k--) jr.push(isoDate(new Date(base.getTime() - k * DAY)));
  const lx = LIEUX.map(l => [l, DB.filter(d => d.lieu === l).length]).sort((a, b) => b[1] - a[1]);
  graphes([
    () => new Chart($('#g1'), { type: 'doughnut', data: { labels: STATUTS.map(x => x[1]), datasets: [{ data: STATUTS.map(x => s.c[x[0]]), backgroundColor: STATUTS.map(x => COL[x[0]]), borderWidth: 2, borderColor: '#fff' }] }, options: { cutout: '58%', plugins: { legend: { position: 'bottom' } } } }),
    () => new Chart($('#g2'), { type: 'bar', data: { labels: STATUTS.map(x => x[1]), datasets: [{ label: 'Première demande', data: STATUTS.map(x => DB.filter(d => d.type === 'premiere' && d.status === x[0]).length), backgroundColor: '#009543' }, { label: 'Renouvellement', data: STATUTS.map(x => DB.filter(d => d.type === 'renouvellement' && d.status === x[0]).length), backgroundColor: '#f6c928' }] }, options: { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { position: 'bottom' } } } }),
    () => new Chart($('#g3'), { type: 'line', data: { labels: jr.map(x => x.slice(8) + '/' + x.slice(5, 7)), datasets: [{ label: 'Demandes', data: jr.map(j => DB.filter(d => isoDate(new Date(d.createdAt)) === j).length), borderColor: '#009543', backgroundColor: '#00954326', fill: true, tension: .3, pointRadius: 2 }] }, options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } } }),
    () => new Chart($('#g4'), { type: 'bar', data: { labels: lx.map(x => x[0]), datasets: [{ data: lx.map(x => x[1]), backgroundColor: '#0a4430' }] }, options: { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } } })]);
  const att = DB.filter(d => d.status !== 'remis').map(d => [d, jours(T(last(d).at), NOW().getTime())]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  $('#tbAttente').innerHTML = att.map(([d, j]) => '<tr class="cl" data-id="' + d.id + '"><td><b>' + d.id + '</b></td><td>' + esc(d.person.nom + ' ' + d.person.prenoms) + '</td><td>' + bS(d.status) + '</td><td>' + j + ' jour(s)</td></tr>').join('');
  $('#croise').innerHTML = '<thead><tr><th>Type</th>' + STATUTS.map(x => '<th>' + x[1] + '</th>').join('') + '<th>Total</th></tr></thead><tbody>' + Object.keys(TN).map(t => '<tr><td><b>' + TN[t] + '</b></td>' + STATUTS.map(x => '<td>' + DB.filter(d => d.type === t && d.status === x[0]).length + '</td>').join('') + '<td><b>' + DB.filter(d => d.type === t).length + '</b></td></tr>').join('') + '<tr><td><b>Total</b></td>' + STATUTS.map(x => '<td><b>' + s.c[x[0]] + '</b></td>').join('') + '<td><b>' + s.T + '</b></td></tr></tbody>';
}
function statsAgents() {
  return AGENTS.map(a => { const ds = DB.filter(d => d.agent === a), rem = ds.filter(d => d.status === 'remis'), dl = rem.map(d => jours(T(d.createdAt), T(last(d).at))); const fa = ds.filter(d => flags(d).length);
    return { a, n: ds.length, rem: rem.length, delai: dl.length ? (dl.reduce((x, y) => x + y, 0) / dl.length).toFixed(1) : '—', al: fa.length, eclair: ds.filter(d => flags(d).some(f => f.k === 'delai')).length, nuit: DB.filter(d => d.history.some(h => h.by === a && hNuit(h.at))).length }; });
}
function fraude() {
  const cas = DB.filter(d => flags(d).length).sort((a, b) => score(b) - score(a) || b.createdAt.localeCompare(a.createdAt)), ou = cas.filter(ouvert);
  const kinds = {}; cas.forEach(d => flags(d).forEach(f => kinds[f.k] = (kinds[f.k] || 0) + 1));
  const tels = new Set(); cas.forEach(d => flags(d).filter(f => f.k === 'reseau').forEach(() => tels.add(telCle(d.person.tel))));
  const ag = statsAgents(), surv = ag.filter(x => x.eclair >= 3 || x.nuit >= 3).length;
  $('#kpisF').innerHTML = kp(ou.length, 'Cas à examiner', 'r') + kp(ou.filter(d => score(d) >= 60).length, 'Cas graves (risque ≥ 60)', 'r') + kp(tels.size, 'Réseaux d’intermédiaires', 'm') + kp(surv, 'Agents à surveiller', 'j') + kp(cas.filter(d => d.suite === 'enquete').length, 'Transmis pour enquête') + kp(cas.filter(d => d.suite === 'verifie').length, 'Examinés, rien d’anormal', 'v');
  const ks = Object.entries(kinds).sort((a, b) => b[1] - a[1]);
  graphes([
    () => new Chart($('#gf1'), { type: 'bar', data: { labels: ks.map(k => KN[k[0]]), datasets: [{ data: ks.map(k => k[1]), backgroundColor: ks.map((k, i) => ['#d62f26', '#e08a00', '#f6c928', '#009543', '#0a4430'][i % 5]) }] }, options: { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } } }),
    () => new Chart($('#gf2'), { type: 'bar', data: { labels: ag.map(x => x.a), datasets: [{ label: 'Dossiers saisis', data: ag.map(x => x.n), backgroundColor: '#9cc7ae' }, { label: 'Avec alerte', data: ag.map(x => x.al), backgroundColor: '#d62f26' }] }, options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { position: 'bottom' } } } })]);
  $('#tbFraude').innerHTML = cas.slice(0, 40).map(d => '<tr class="cl" data-id="' + d.id + '"><td>' + '<span class="risque" style="background:' + couleurScore(score(d)) + '">' + score(d) + '</span></td><td><b>' + d.id + '</b></td><td>' + esc(d.person.nom + ' ' + d.person.prenoms) + '</td><td><div class="mini">' + flags(d).map(f => '<span class="chip ' + (f.n === 'rouge' ? '' : 'o') + '" title="' + esc(f.t) + '">' + KN[f.k] + '</span>').join('') + '</div></td><td>' + (d.suite ? '<span class="badge ok">' + (d.suite === 'enquete' ? 'Enquête' : 'Vérifié') + '</span>' : '<span class="badge alerte">À examiner</span>') + '</td></tr>').join('');
  $('#tbAgents').innerHTML = ag.map(x => '<tr><td><b>' + x.a + '</b></td><td>' + x.n + '</td><td>' + x.rem + '</td><td>' + x.delai + (x.delai === '—' ? '' : ' j') + '</td><td>' + (x.al ? '<span class="chip">' + x.al + '</span>' : '0') + '</td><td>' + (x.eclair >= 3 ? '<span class="chip">' + x.eclair + ' ⚠</span>' : x.eclair) + '</td><td>' + (x.nuit >= 3 ? '<span class="chip o">' + x.nuit + ' ⚠</span>' : x.nuit) + '</td></tr>').join('');
}

/* ---------- Suivi par le demandeur ---------- */
const MSG = { paye: 'Votre paiement est enregistré. Présentez-vous le jour de votre rendez-vous : votre numéro, votre nom et la porte s’afficheront sur les écrans de la salle.', depose: 'Votre demande a bien été enregistrée. Elle va être transmise pour réception.', recu: 'Votre dossier a été reçu. Il est en attente de traitement.', traitement: 'Votre dossier est en cours de traitement.', pret: 'Votre passeport est prêt. Présentez-vous au guichet avec votre reçu et une pièce d’identité.', remis: 'Votre passeport vous a été remis.' };
function suivre() {
  const id = $('#c_id').value.trim().toUpperCase(), cd = $('#c_code').value.trim().toUpperCase(), box = $('#resSuivi'), d = DB.find(x => x.id === id);
  if (!d || code(d.id, d.person.nom) !== cd) { box.innerHTML = '<div class="alert rouge">Aucun dossier ne correspond à ce numéro et à ce code. Vérifiez votre reçu.</div>'; return; }
  const i = stIdx(d.status), p = d.person;
  box.innerHTML = '<div class="carte"><div class="ligne"><h3 style="margin:0">' + d.id + '</h3><span style="margin-left:auto">' + bT(d.type) + '</span></div><p style="margin:6px 0 0;color:var(--gris)">Demandeur : ' + esc(p.prenoms.charAt(0) + '. ' + p.nom.charAt(0) + '•••••') + ' · déposé le ' + fmtD(d.createdAt) + '</p>' +
    '<div class="etapes">' + STATUTS.map((s, k) => '<div class="etape ' + (k < i ? 'fait' : k === i ? 'now' : '') + '">' + (k < i ? '✔ ' : '') + s[1] + '</div>').join('') + '</div>' +
    '<div class="alert ' + (d.status === 'pret' || d.status === 'remis' ? 'vert' : 'bleu') + '"><b>' + SN[d.status] + '</b> — ' + MSG[d.status] + '</div>' +
    (d.type === 'renouvellement' && !d.ancienRestitue && d.status === 'pret' ? '<div class="alert orange">Renouvellement : apportez votre ancien passeport, il doit être restitué ou annulé avant la remise du nouveau.</div>' : '') +
    rdvHtml(d) + '<p style="margin-top:10px;font-size:13px;color:var(--gris)">Dernière mise à jour : ' + fmtDH(last(d).at) + '</p></div>';
}
function exSuivi() { const d = DB.filter(x => !flags(x).length)[Math.floor(Math.random() * 10)] || DB[0]; $('#c_id').value = d.id; $('#c_code').value = code(d.id, d.person.nom); suivre(); }

/* ---------- Export Excel ---------- */
function excel() {
  if (!window.XLSX) { alert('Export indisponible.'); return; }
  const wb = XLSX.utils.book_new(), s = stats();
  const dos = DB.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(d => { const p = d.person, t = new Date(d.createdAt); return { 'N° dossier': d.id, 'Date de dépôt': fmtD(d.createdAt), 'Heure': pad(t.getHours()) + ':' + pad(t.getMinutes()), 'Nom': p.nom, 'Prénoms': p.prenoms, 'Date de naissance': fmtD(p.naissance), 'Sexe': p.sexe, 'Type de demande': TN[d.type], 'Pièce': p.piece.type, 'N° de pièce': p.piece.numero, 'Expiration pièce': fmtD(p.piece.expiration), 'Ancien passeport n°': d.ancien ? d.ancien.numero : '', 'Ancien expiré le': d.ancien ? fmtD(d.ancien.expiration) : '', 'Ancien restitué': d.ancien ? (d.ancienRestitue ? 'Oui' : 'Non') : '', 'Téléphone': p.tel, 'Secteur': d.lieu, 'Agent': d.agent, 'N° d’appel': d.ticket || '', 'Montant payé (FCFA)': d.paiement ? d.paiement.montant : '', 'Porte': d.appel ? d.appel.porte : '', 'Pièces manquantes': manquantes(d).map(r => r[1]).join(' | '), 'État': SN[d.status], 'Dernière mise à jour': fmtDH(last(d).at), 'Délai (jours)': jours(T(d.createdAt), (d.status === 'remis' ? T(last(d).at) : NOW().getTime())), 'Risque (0-100)': score(d), 'Alertes': flags(d).map(f => KN[f.k]).join(' | '), 'Suite donnée': d.suite === 'enquete' ? 'Enquête' : d.suite === 'verifie' ? 'Vérifié' : '' }; });
  const sh = (name, rows, w) => { const x = XLSX.utils.json_to_sheet(rows); if (w) x['!cols'] = w.map(n => ({ wch: n })); XLSX.utils.book_append_sheet(wb, x, name); };
  sh('Dossiers', dos, [18, 12, 8, 18, 20, 14, 6, 17, 11, 13, 14, 16, 14, 12, 16, 13, 10, 20, 18, 12, 12, 60, 12]);
  sh('Synthèse états', STATUTS.map(x => ({ 'État': x[1], 'Nombre': s.c[x[0]], 'Part (%)': s.T ? Math.round(s.c[x[0]] * 1000 / s.T) / 10 : 0 })).concat([{ 'État': 'TOTAL', 'Nombre': s.T, 'Part (%)': 100 }]), [24, 10, 10]);
  sh('Croisé type x état', Object.keys(TN).map(t => Object.assign({ 'Type': TN[t] }, ...STATUTS.map(x => ({ [x[1]]: DB.filter(d => d.type === t && d.status === x[0]).length })), { 'Total': DB.filter(d => d.type === t).length })), [18, 18, 16, 14, 16, 18, 8]);
  const jr = {}; DB.forEach(d => { const k = isoDate(new Date(d.createdAt)); jr[k] = (jr[k] || 0) + 1; });
  sh('Par jour', Object.keys(jr).sort().map(k => ({ 'Date': fmtD(k), 'Demandes': jr[k] })), [14, 10]);
  sh('Par secteur', LIEUX.map(l => ({ 'Secteur': l, 'Demandes': DB.filter(d => d.lieu === l).length, 'Remis': DB.filter(d => d.lieu === l && d.status === 'remis').length })), [18, 10, 10]);
  sh('Agents', statsAgents().map(x => ({ 'Agent': x.a, 'Dossiers saisis': x.n, 'Remis': x.rem, 'Délai moyen (j)': x.delai, 'Dossiers avec alerte': x.al, 'Remises éclair': x.eclair, 'Actions de nuit': x.nuit })), [12, 16, 8, 16, 20, 16, 16]);
  sh('Alertes', DB.filter(d => flags(d).length).sort((a, b) => score(b) - score(a)).map(d => ({ 'N° dossier': d.id, 'Nom': d.person.nom + ' ' + d.person.prenoms, 'Risque': score(d), 'Nature': flags(d).map(f => KN[f.k]).join(' | '), 'Détail': flags(d).map(f => f.t).join(' | '), 'Suite donnée': d.suite === 'enquete' ? 'Enquête' : d.suite === 'verifie' ? 'Vérifié' : 'À examiner' })), [18, 28, 8, 40, 100, 14]);
  XLSX.writeFile(wb, 'Passeport-Sur-DEMO-' + isoDate(NOW()) + '.xlsx');
}

/* ---------- Démarrage ---------- */
function rafraichir(origine) {
  majPastille(); const v = ($('#onglets .on') || {}).dataset; if (!v) return;
  if (v.v === 'accueil') accueil(); if (v.v === 'dossiers') liste(); if (v.v === 'tableau') tableau(); if (v.v === 'fraude') fraude(); if (window.__spSuite) window.__spSuite.render(v.v, origine);
}
function init() {
  charger(); remplirLieux(); majType(); majPastille(); accueil();
  $('#onglets').addEventListener('click', e => { const b = e.target.closest('button'); if (b) aller(b.dataset.v); });
  $('#role').addEventListener('change', () => { appliquerRole(); rafraichir(); });
  $$('input[name=type]').forEach(r => r.addEventListener('change', majType));
  ['f_nom', 'f_prenoms', 'f_naiss', 'f_pnum', 'f_pexp', 'f_anum', 'f_aexp', 'f_tel'].forEach(i => $('#' + i).addEventListener('input', () => { if (i === 'f_aexp') majAdepuis(); alertesForm(); }));
  $('#bLire').onclick = lire; $('#bValider').onclick = valider; $('#bVider').onclick = effacer;
  $('#bCam').onclick = ouvrirCam; $('#bStop').onclick = fermerCam; $('#bSnap').onclick = capturer;
  $('#bFile').onclick = () => $('#fileIn').click(); $('#fileIn').onchange = e => depuisFichier(e.target.files[0]);
  $$('[data-ex]').forEach(b => b.onclick = () => exemple(b.dataset.ex));
  $$('[data-go]').forEach(b => b.onclick = () => aller(b.dataset.go));
  ['q', 'fs', 'ft', 'fl', 'fa'].forEach(i => $('#' + i).addEventListener('input', liste));
  $('#bXlsx').onclick = excel; $('#bXlsx2').onclick = excel; $('#bSuivre').onclick = suivre; $('#bExSuivi').onclick = exSuivi;
  document.addEventListener('click', e => { const tr = e.target.closest('tr.cl'); if (tr) detail(tr.dataset.id); if (e.target === $('#tiroir')) fermer(); });
  $('#reinit').onclick = () => { if (confirm('Remettre les données fictives de départ ?')) { try { localStorage.removeItem(KEY); } catch (e) { } charger(); rafraichir(); alert('Démonstration remise à zéro.'); } };
  (function () { const c = $('#creditStar'), pn = $('#infos'); let n = 0, tm = null, lp = null;
    const bascule = () => { pn.hidden = !pn.hidden; if (!pn.hidden) pn.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    c.addEventListener('click', () => { n++; clearTimeout(tm); tm = setTimeout(() => n = 0, 900); if (n >= 3) { n = 0; bascule(); } });
    c.addEventListener('touchstart', () => { lp = setTimeout(bascule, 800); }, { passive: true }); ['touchend', 'touchmove', 'touchcancel'].forEach(e => c.addEventListener(e, () => clearTimeout(lp), { passive: true })); })();
  appliquerRole();
  window.addEventListener('popstate', e => { const v = (e.state && e.state.v) || (location.hash || '#accueil').slice(1); const b = $('#onglets button[data-v="' + v + '"]'); if ($('#v-' + v) && b && b.style.display !== 'none') aller(v, true); });
  try { const h = (location.hash || '').slice(1); history.replaceState({ v: 'accueil' }, '', '#accueil'); if (h && h !== 'accueil' && $('#v-' + h)) { aller(h, true); history.pushState({ v: h }, '', '#' + h); } } catch (e) { }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  window.__spApi = { get DB() { return DB; }, sauver, detail, STATUTS, SN, TN, KN, esc, fmtD, fmtDH, jours, T, NOW, pad, isoDate, flags, score, ouvert, bS, bT, bR, code, qr, aller, rafraichir, get role() { return role; }, ROLES, DAY, HOUR, serviceDay, KEY, computeFlags, REQUIS, manquantes, jourSite, rdvLong, rdvHtml, recalculer, creneau };
  window.__sp = { parseMRZ, buildTD3, buildTD1, computeFlags, get DB() { return DB; }, get FL() { return FL; }, code, KN, SN, TN };
}
init();
})();
