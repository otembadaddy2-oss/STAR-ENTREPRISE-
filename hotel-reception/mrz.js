/* CHECK-IN STAR — lecture de la zone MRZ d'un passeport ou d'une carte (norme OACI), sur l'appareil. Reprend le moteur validé de Passeport Sûr.
   Le moteur de lecture optique (Tesseract) est celui de ../passeport-demo/lib/ocr-5.1.0/ : aucune image n'est envoyée en ligne.
   Les chiffres de contrôle ne sont JAMAIS « réparés » : s'ils ne correspondent pas, l'application le signale. */
(function () {
'use strict';
const OCR_BASE = '../passeport-demo/lib/ocr-5.1.0/';
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
function dateMRZ(s, futur) { const yy = +s.slice(0, 2), cur = new Date().getFullYear() % 100; const y = futur ? 2000 + yy : (yy > cur ? 1900 + yy : 2000 + yy); return y + '-' + s.slice(2, 4) + '-' + s.slice(4, 6); }
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
  const FL = {}, auj = isoDate(new Date()), now = new Date().getTime();
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
    if (d.accueil && d.accueil.ok === false) add(d, 'accueil', 'rouge', 30, 'Écart constaté à l’accueil : ' + (d.accueil.motif || 'à examiner') + '.');
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
const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }), cacheLong = {};
const rdvLong = iso => cacheLong[iso] || (cacheLong[iso] = fmtLong.format(new Date(iso + 'T12:00:00Z')));
const rdvHtml = d => d.ticket ? '<div class="alert vert">' + (d.rdv ? '📅 <b>Rendez-vous d’enrôlement : ' + rdvLong(d.rdv.date) + ' à partir de ' + d.rdv.heure + '</b><br>' + esc(d.rdv.lieu) + '<br>' : '') + (d.paiement && d.paiement.montant ? '💰 <b>Montant payé : ' + Number(d.paiement.montant).toLocaleString('fr-FR') + ' FCFA</b>' + (d.paiement.mode ? ' (' + esc(d.paiement.mode) + ')' : '') + (d.paiement.recu ? ' · reçu ' + esc(d.paiement.recu) : '') + '<br>' : '') + 'Votre N° d’appel : <b style="font-size:20px">' + pad(d.ticket, 3) + '</b></div>' : '';
function deriver(all) {
  const today = jourSite(0), nowMs = Date.now();
  all.forEach(d => { delete d.paiement; delete d.appel; delete d.ticket; delete d.rdv;
    const h = d.history.find(x => x.s === 'paye');
    if (h) { d.paiement = { montant: d.montant || 50000, mode: d.mode || 'Espèces', at: h.at, caissier: 'Caisse' };
      d.rdv = { date: nowMs - T(h.at) < 14 * HOUR ? today : new Date(T(h.at) + 3600000).toISOString().slice(0, 10), heure: '08:00', lieu: 'Préfecture de Brazzaville', objet: 'Enrôlement (empreintes et photo)' }; }
    const r = d.history.find(x => x.s === 'recu'); if (r) { const m = /(\d)/.exec(r.by); d.appel = { porte: m ? +m[1] : 1, at: r.at }; } });
  const pays = all.filter(d => d.paiement).sort((x, y) => x.paiement.at.localeCompare(y.paiement.at)), cnt = {}; let rp = 0;
  pays.forEach(d => { const k = d.rdv.date; cnt[k] = (cnt[k] || 0) + 1; d.ticket = cnt[k]; d.rdv.heure = creneau(d.ticket); d.paiement.recu = 'RP-' + new Date(d.paiement.at).getFullYear() + '-' + pad(++rp, 6); });
}
function seed() {
  const R = rng(20261125), pick = a => a[Math.floor(R() * a.length)], ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const all = [], now = new Date(), nowMs = now.getTime();
  const fab = (i, ts, force) => {
    const t = new Date(ts), ren = R() < 0.32, f = R() < 0.5, nom = pick(NOMS), prenoms = f ? pick(PF) : pick(PM), age = jours(t.getTime(), nowMs), agent = pick(AGENTS);
    const naiss = ri(1958, 2007) + '-' + pad(ri(1, 12)) + '-' + pad(ri(1, 28));
    const ptype = ren ? (R() < 0.6 ? 'PASSEPORT' : 'CNI') : (R() < 0.85 ? 'CNI' : 'PASSEPORT');
    const num = (ptype === 'CNI' ? 'CG' : 'OA') + pad(ri(1000000, 9999999), 7);
    const exp = isoDate(new Date(nowMs + (ren && ptype === 'PASSEPORT' ? -ri(15, 900) : ri(200, 2800)) * DAY));
    const d = { id: 'BZV-' + t.getFullYear() + '-' + pad(i + 1, 6), type: ren ? 'renouvellement' : 'premiere', createdAt: t.toISOString(), lieu: pick(LIEUX), agent, mrzOk: true,
      montant: 50000, mode: pick(['Espèces', 'Mobile Money MTN', 'Mobile Money Airtel']),
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
function recalculer() { FL = computeFlags(DB); majPastille(); if (window.__spAlertes) window.__spAlertes.verifier(); }
function sauver() { if (!(window.__spSync && (window.__spSync.actif() || window.__spSync.citoyen()))) { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { } } FL = computeFlags(DB); majPastille(); if (window.__spSync) window.__spSync.apresSauver(); }

/* ---------- Profil et navigation ---------- */
let role = 'agent';
const ROLES = { agent: 'Agent 03', accueil: 'Accueil', caisse: 'Caisse', porte: 'Porte 1', prefecture: 'Préfecture', ministere: 'Ministère' };
function appliquerRole() {
  role = $('#role').value;
  $$('#onglets button[data-roles]').forEach(b => { b.style.display = b.dataset.roles.split(',').includes(role) ? '' : 'none'; });
  const cur = $('#onglets .on'); if (cur && cur.style.display === 'none') aller('accueil');
  if (window.__spSuite) window.__spSuite.role(role);
  if ((role === 'prefecture' || role === 'ministere') && !window.Chart) { const sd = navigator.connection && navigator.connection.saveData; if (!sd) (window.requestIdleCallback || (f => setTimeout(f, 2500)))(() => chargerScript('lib/chart.umd.js').catch(() => { }), { timeout: 4000 }); }   // les tableaux de bord s'ouvrent alors sans attente
}
let tSortie = 0, tStagger = 0;
/* Transition de page « verre » : l'ancienne page glisse, la nouvelle arrive en zoom, un reflet de verre passe. Uniquement transformations et opacité (fluide sur téléphone). */
function transitionPages(ancien, nouveau) {
  try {
    if (!ancien || !nouveau || ancien === nouveau || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const ids = $$('#onglets button').map(b => b.dataset.v), i0 = ids.indexOf(ancien.id.slice(2)), i1 = ids.indexOf(nouveau.id.slice(2)), dx = i0 >= 0 && i1 >= 0 && i1 < i0 ? -1 : 1;
    ancien.style.setProperty('--dx', dx); nouveau.style.setProperty('--dx', dx);
    $$('.vue.sortie').forEach(s => s.classList.remove('sortie')); clearTimeout(tSortie);
    ancien.classList.add('sortie'); tSortie = setTimeout(() => ancien.classList.remove('sortie'), 240);
    $$('.vue.stagger').forEach(s => s.classList.remove('stagger')); clearTimeout(tStagger);
    const items = nouveau.querySelectorAll('.baniere,.carte,.kpi,.porteC'); for (let i = 0; i < items.length && i < 12; i++) items[i].style.setProperty('--i', i);
    nouveau.classList.add('stagger'); tStagger = setTimeout(() => nouveau.classList.remove('stagger'), 800);
    let g = document.getElementById('verre'); if (!g) { g = document.createElement('div'); g.id = 'verre'; g.setAttribute('aria-hidden', 'true'); g.innerHTML = '<i></i>'; document.body.appendChild(g); }
    const reflet = g.firstChild; if (reflet && reflet.animate) { if (reflet.__anim) reflet.__anim.cancel(); reflet.__anim = reflet.animate([{ transform: 'translateX(-120%) skewX(-14deg)', opacity: 0 }, { opacity: 1, offset: .25 }, { transform: 'translateX(330%) skewX(-14deg)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.3,.6,.2,1)' }); }
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
function majAdepuis() { const v = $('#f_aexp').value; if (!v) { $('#f_adepuis').value = ''; return; } const j = jours(new Date(v).getTime(), new Date().getTime()); $('#f_adepuis').value = j >= 0 ? (j < 60 ? j + ' jours' : Math.floor(j / 30.4) + ' mois') : 'pas encore expiré'; }
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
  const d = { id: '(nouveau)', type: typeCourant(), mrzOk: flux ? flux.valide : true, createdAt: new Date().toISOString(), status: 'depose', agent: ROLES[role], person: { nom: $('#f_nom').value.trim().toUpperCase(), prenoms: $('#f_prenoms').value.trim(), naissance: $('#f_naiss').value, sexe: $('#f_sexe').value, nationalite: $('#f_nat').value.trim().toUpperCase(), tel: $('#f_tel').value.trim(), piece }, ancien: null, ancienRestitue: false, history: [{ s: 'depose', at: new Date().toISOString(), by: ROLES[role], note: '' }] };
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
  const t = new Date(); d.id = 'BZV-' + t.getFullYear() + '-' + pad(DB.length + 1, 6); d.createdAt = t.toISOString(); d.lieu = $('#f_lieu').value; d.history[0] = { s: 'depose', at: t.toISOString(), by: ROLES[role], note: 'Dossier enregistré' };
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
    '<div class="ligne noprint" style="margin-top:12px"><button class="btn or" data-imprimer="1">🖨 Imprimer l’accusé</button><button class="btn clair" id="bFerme">Fermer</button><button class="btn clair" id="bVoir">Voir le dossier</button></div>';
  $('#tiroir').classList.add('on'); $('#bFerme').onclick = fermer; $('#bVoir').onclick = () => detail(d.id);
  if (window.__spSuite) window.__spSuite.lierAccuse(d);
}
function fermer() { $('#tiroir').classList.remove('on'); }

/* ---------- Scan : caméra et lecture ---------- */
let stream = null;
async function ouvrirCam() { try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); const v = $('#vid'); v.srcObject = stream; await v.play(); $('#cam').classList.add('on'); } catch (e) { $('#ocrEtat').textContent = 'Caméra indisponible ici : utilisez « Choisir une photo » ou un exemple.'; } }
function fermerCam() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; $('#cam').classList.remove('on'); }
function capturer() { const v = $('#vid'), c = $('#snap'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); fermerCam(); ocr(c); }

const libsChargees = {};
function chargerScript(src) { return libsChargees[src] || (libsChargees[src] = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { delete libsChargees[src]; s.remove(); ko(new Error('Chargement impossible : ' + src)); }; document.head.appendChild(s); })); }

/* Corrections standard d'une lecture optique de MRZ : chiffres/lettres selon la position (0↔O, 1↔I, 5↔S, 8↔B…), et une lettre en trop ou en moins
   (choisie grâce aux chiffres de contrôle). Les chiffres de contrôle eux-mêmes ne sont JAMAIS « réparés » : s'ils ne correspondent pas, l'application le signale. */
const MRZ_L2D = { O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', B: '8', G: '6' }, MRZ_D2L = { 0: 'O', 1: 'I', 2: 'Z', 5: 'S', 8: 'B', 6: 'G' };
const MRZ_TYPES = {
  td3a: 'LLLLL' + 'L'.repeat(39),
  td3b: 'A'.repeat(9) + 'N' + 'LLL' + 'N'.repeat(6) + 'N' + 'L' + 'N'.repeat(6) + 'N' + 'A'.repeat(14) + 'A' + 'N',
  td1a: 'LLLLL' + 'A'.repeat(9) + 'N' + 'A'.repeat(15),
  td1b: 'N'.repeat(6) + 'N' + 'L' + 'N'.repeat(6) + 'N' + 'LLL' + 'A'.repeat(11) + 'N',
  td1c: 'L'.repeat(30)
};
const mrzTypes = (l, ty) => [...l].map((c, i) => ty[i] === 'N' ? (MRZ_L2D[c] || c) : ty[i] === 'L' && c !== '<' ? (MRZ_D2L[c] || c) : c).join('');
function mrzScore(l, nom) {
  const v = (s, c) => /\d/.test(c) && String(chk(s)) === c;
  if (nom === 'td3b') return [v(l.slice(0, 9), l[9]), v(l.slice(13, 19), l[19]), v(l.slice(21, 27), l[27]), v(l.slice(0, 10) + l.slice(13, 20) + l.slice(21, 43), l[43])].filter(Boolean).length;
  if (nom === 'td1a') return v(l.slice(5, 14), l[14]) ? 1 : 0;
  if (nom === 'td1b') return [v(l.slice(0, 6), l[6]), v(l.slice(8, 14), l[14])].filter(Boolean).length;
  return 0;
}
function mrzPenalite(l, nom) {   // à égalité de chiffres de contrôle : on préfère la ligne qui « ressemble » à une vraie ligne MRZ
  let p = 0; const ty = MRZ_TYPES[nom];
  if (nom === 'td3a' && l[0] !== 'P') p += 5; if (nom === 'td1a' && !/[IAC]/.test(l[0])) p += 5;
  if ((nom === 'td3a' || nom === 'td1a') && /[^A-Z<]/.test(l.slice(1, 5))) p += 3;
  for (let i = 0; i < l.length; i++) { if (ty[i] === 'N' && !/\d/.test(l[i])) p += 2; else if (ty[i] === 'L' && /\d/.test(l[i])) p += 1; }
  if (nom === 'td1b' && /</.test(l.slice(15, 18)) && l.slice(15, 18) !== '<<<') p += 2; if (nom === 'td3b' && /</.test(l.slice(10, 13)) && l.slice(10, 13) !== '<<<') p += 2;
  return p;
}
function mrzLigne(l, n, nom) {   // ramène la ligne à la bonne longueur, puis corrige lettres/chiffres
  const cands = [];
  if (l.length === n) cands.push(l);
  else if (l.length === n + 1) { for (let i = 0; i < l.length; i++) cands.push(l.slice(0, i) + l.slice(i + 1)); }
  else if (l.length === n - 1) { for (let i = 0; i <= l.length; i++) cands.push(l.slice(0, i) + '<' + l.slice(i)); }
  else return l;
  let meilleur = null, sm = -1e9;
  const nz = x => x === '0' ? 'O' : x;   // un caractère en trop est le plus souvent un doublon (« O » lu « O0 »)
  cands.forEach((c, k) => { const m = mrzTypes(c, MRZ_TYPES[nom]); let s = mrzScore(m, nom) * 10 - mrzPenalite(m, nom);
    if (l.length === n + 1 && k > 0 && k < l.length - 1 && (nz(l[k]) === nz(l[k - 1]) || nz(l[k]) === nz(l[k + 1])) && l[k] !== '<') s += 3;
    if (s > sm) { sm = s; meilleur = m; } });
  return meilleur;
}
function corrigerMRZ(lignes) {
  const proche = (l, n) => Math.abs(l.length - n) <= 1;
  const td3 = lignes.filter(l => proche(l, 44)), td1 = lignes.filter(l => proche(l, 30));
  if (td3.length >= 2 && td3.length >= td1.length) { const [a, b] = td3.slice(-2); return [mrzLigne(a, 44, 'td3a'), mrzLigne(b, 44, 'td3b')]; }
  if (td1.length >= 3) { const [a, b, c] = td1.slice(-3); return [mrzLigne(a, 30, 'td1a'), mrzLigne(b, 30, 'td1b'), mrzLigne(c, 30, 'td1c')]; }
  return lignes.slice(-3);
}

let ocrWorker = null, ocrMinuteur = 0;
function preparerMRZ(canvas) {   // zone basse de la pièce, agrandie, en niveaux de gris contrastés
  const h = Math.round(canvas.height * 0.42), L = Math.min(2000, Math.max(1400, canvas.width)), k = L / canvas.width, c2 = document.createElement('canvas'); c2.width = L; c2.height = Math.round(h * k);
  const x = c2.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, c2.width, c2.height); x.drawImage(canvas, 0, canvas.height - h, canvas.width, h, 0, 0, c2.width, c2.height);
  const im = x.getImageData(0, 0, c2.width, c2.height), d = im.data; let mn = 255, mx = 0;
  for (let i = 0; i < d.length; i += 4) { const g = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0; d[i] = g; if (g < mn) mn = g; if (g > mx) mx = g; }
  const sp = Math.max(1, mx - mn); for (let i = 0; i < d.length; i += 4) { const v = Math.max(0, Math.min(255, ((d[i] - mn) * 255 / sp - 128) * 1.35 + 128)); d[i] = d[i + 1] = d[i + 2] = v; }
  x.putImageData(im, 0, 0); return c2;
}
async function moteurOcr(etat) {
  if (ocrWorker) return ocrWorker;
  await chargerScript(OCR_BASE + 'tesseract.min.js');
  const base = new URL(OCR_BASE, location.href).href;
  const w = await Tesseract.createWorker('eng', 1, { workerPath: base + 'worker.min.js', corePath: base, langPath: base + 'lang', gzip: true, workerBlobURL: false, cacheMethod: 'none', logger: m => { if (etat && m && m.status === 'recognizing text') etat.textContent = 'Lecture de la pièce… ' + Math.round((m.progress || 0) * 100) + ' %'; } });
  await w.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<', tessedit_pageseg_mode: '6' });
  ocrWorker = w; return w;
}

async function lireImage(canvas, etat) {
  const w = await moteurOcr(etat); const r = await w.recognize(preparerMRZ(canvas));
  clearTimeout(ocrMinuteur); ocrMinuteur = setTimeout(() => { if (ocrWorker) { ocrWorker.terminate().catch(() => { }); ocrWorker = null; } }, 120000);
  const lignes = r.data.text.toUpperCase().split(/\n/).map(x => x.replace(/[^A-Z0-9<]/g, '')).filter(x => x.length >= 28 && x.includes('<'));
  if (!lignes.length) throw new Error('aucune ligne');
  return corrigerMRZ(lignes).join('\n');
}
window.HMRZ = { parseMRZ, buildTD3, buildTD1, corrigerMRZ, lireImage, chk };
})();
