/* CHECK-IN STAR — modèle de l'hôtel (170 chambres), tarifs, attribution automatique de chambre.
   TOUS LES NOMS DE CLIENTS ET TOUS LES SÉJOURS DÉJÀ PRÉSENTS sont FICTIFS (données de démonstration).
   Le plan de 170 chambres reprend la répartition publiée pour un grand hôtel de Brazzaville (178 chambres), réduite à 170.
   Les tarifs sont des repères relevés en ligne (en dollars, hors taxes, variables selon les dates) : la direction les remplace par ses vrais tarifs. */
(function () {
'use strict';
const DAY = 86400000;
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const addJ = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const nuits = (du, au) => Math.round((new Date(au + 'T12:00:00') - new Date(du + 'T12:00:00')) / DAY);
const auj = () => iso(new Date());
const TYPES = [
  { id: 'standard', nom: 'Chambre Supérieure', court: 'Supérieure', nb: 112, photo: 'img/chambre.jpg', cap: 2, rang: 1, usd: 184, src: 'repère en ligne : chambre supérieure, environ 184 à 247 $ la nuit', desc: 'Chambre confortable, literie haut de gamme, bureau, salle de bain.' },
  { id: 'business', nom: 'Business Class (accès salon)', court: 'Business', nb: 28, photo: 'img/chambre-business.jpg', cap: 2, rang: 2, usd: 269, src: 'repère en ligne : chambre exécutive, environ 269 $ la nuit', desc: 'Étage réservé, accès au salon exécutif, petit-déjeuner et services dédiés (à confirmer par l\'hôtel).' },
  { id: 'junior', nom: 'Junior Suite', court: 'Junior Suite', nb: 10, photo: 'img/suite.jpg', cap: 3, rang: 3, usd: 397, src: 'repère en ligne : suites « à partir de » environ 397 $ la nuit', desc: 'Chambre élargie avec coin salon.' },
  { id: 'executive', nom: 'Suite Exécutive', court: 'Suite Exécutive', nb: 10, photo: 'img/suite.jpg', cap: 3, rang: 4, usd: null, src: 'aucun tarif public trouvé : sur devis', desc: 'Suite avec salon séparé et accès au salon exécutif.' },
  { id: 'diplomatique', nom: 'Suite Diplomatique', court: 'Diplomatique', nb: 3, photo: 'img/suite-diplomatique.jpg', cap: 4, rang: 5, usd: null, src: 'aucun tarif public trouvé : sur devis', desc: 'Suite de prestige pour délégations et hôtes officiels.' },
  { id: 'royale', nom: 'Suite Royale', court: 'Suite Royale', nb: 3, photo: 'img/suite-diplomatique.jpg', cap: 4, rang: 6, usd: null, src: 'aucun tarif public trouvé : sur devis', desc: 'Grande suite avec salon, salle à manger et service personnalisé.' },
  { id: 'presidentielle', nom: 'Suite Présidentielle', court: 'Présidentielle', nb: 2, photo: 'img/suite-diplomatique.jpg', cap: 4, rang: 7, usd: null, src: 'aucun tarif public trouvé : sur devis', desc: 'La plus haute catégorie de suite.' },
  { id: 'penthouse', nom: 'Penthouse', court: 'Penthouse', nb: 2, photo: 'img/suite-diplomatique.jpg', cap: 4, rang: 8, usd: null, src: 'aucun tarif public trouvé : sur devis', desc: 'Dernier étage, terrasse et salon exécutif.' }
];
const T = {}; TYPES.forEach(t => T[t.id] = t);
const ETAGES = 12; // 12 niveaux : répartition ci-dessous
function construireChambres() {
  const liste = []; const ordre = [];
  ['standard', 'business'].forEach(id => { for (let i = 0; i < T[id].nb; i++) ordre.push(id); });
  const parEtage = [16, 16, 16, 16, 16, 16, 16, 16, 12]; let k = 0; // étages 1 à 9 : 140 chambres
  parEtage.forEach((n, e) => { for (let i = 1; i <= n; i++) liste.push({ n: String((e + 1) * 100 + i), etage: e + 1, type: ordre[k++] }); });
  const hauts = [[10, ['junior', 10, 'executive', 10]], [11, ['diplomatique', 3, 'royale', 3]], [12, ['presidentielle', 2, 'penthouse', 2]]];
  hauts.forEach(([e, def]) => { let i = 1; for (let j = 0; j < def.length; j += 2) for (let q = 0; q < def[j + 1]; q++) liste.push({ n: String(e * 100 + i++), etage: e, type: def[j] }); });
  liste.forEach(r => { r.statut = 'propre'; r.sejours = []; r.pmr = r.etage === 1 && /^10[1-6]$/.test(r.n); });
  return liste;
}
/* ---- clients fictifs pour la démonstration ---- */
const PRENOMS = ['Amina', 'Joël', 'Sofia', 'Marc', 'Nadia', 'Chen', 'Ibrahim', 'Clara', 'Paul', 'Fatou', 'Daniel', 'Léa', 'Samuel', 'Ines', 'Victor', 'Mariam', 'Hugo', 'Zoé', 'Omar', 'Elena'];
const NOMS = ['ABOUBAKAR', 'MARTIN', 'OKELLO', 'SILVA', 'NGUYEN', 'KONÉ', 'ROSSI', 'MULLER', 'DIALLO', 'PEREIRA', 'HANSEN', 'OKAFOR', 'LEFEBVRE', 'TANAKA', 'BENALI', 'CARTER', 'MBEKI', 'DUPONT', 'KOVAC', 'SANTOS'];
const NATS = ['FRA', 'CMR', 'COG', 'GAB', 'BEL', 'USA', 'CHN', 'SEN', 'COD', 'ITA', 'PRT', 'GBR', 'CIV', 'LBN', 'TUR'];
function graine(s) { let x = s; return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }; }
function etatInitial() {
  const ch = construireChambres(); const g = graine(20261128); const a = auj(); const clients = []; let nid = 1;
  const garde = ch.length; const maint = new Set(); while (maint.size < 3) maint.add(Math.floor(g() * garde));
  ch.forEach((r, i) => {
    if (maint.has(i)) { r.statut = 'maintenance'; return; }
    const p = g(); const rang = T[r.type].rang;
    const probaPresent = rang <= 2 ? 0.6 : 0.4;
    if (p < probaPresent) {
      const depuis = Math.floor(g() * 4), reste = g() < 0.16 ? 0 : 1 + Math.floor(g() * 4);
      const id = 'SJ-DEMO-' + String(nid++).padStart(3, '0'); const nom = NOMS[Math.floor(g() * NOMS.length)], pre = PRENOMS[Math.floor(g() * PRENOMS.length)];
      const c = { id, nom, prenoms: pre, nat: NATS[Math.floor(g() * NATS.length)], doc: 'PASSEPORT', num: 'X' + String(Math.floor(g() * 1e7)).padStart(7, '0') + String.fromCharCode(65 + Math.floor(g() * 26)), tel: '', du: addJ(a, -depuis), au: addJ(a, reste), chambre: r.n, etat: 'present', demo: true, usd: T[r.type].usd, adultes: 1 + (g() < 0.35 ? 1 : 0) };
      clients.push(c); r.sejours.push({ id, du: c.du, au: c.au, etat: 'present' });
    } else if (p < probaPresent + 0.07) {
      const dep = 1 + Math.floor(g() * 3), long = 1 + Math.floor(g() * 3); const id = 'SJ-DEMO-' + String(nid++).padStart(3, '0'); const nom = NOMS[Math.floor(g() * NOMS.length)], pre = PRENOMS[Math.floor(g() * PRENOMS.length)];
      const c = { id, nom, prenoms: pre, nat: NATS[Math.floor(g() * NATS.length)], doc: 'PASSEPORT', num: 'X' + String(Math.floor(g() * 1e7)).padStart(7, '0') + 'R', tel: '', du: addJ(a, dep), au: addJ(a, dep + long), chambre: r.n, etat: 'reserve', demo: true, usd: T[r.type].usd, adultes: 1 };
      clients.push(c); r.sejours.push({ id, du: c.du, au: c.au, etat: 'reserve' });
    } else if (p > 0.94) r.statut = 'sale';
  });
  return { version: 1, hotel: 'Grand Hôtel (démonstration)', taux: '', tarifs: Object.fromEntries(TYPES.map(t => [t.id, { usd: t.usd, fcfa: '' }])), chambres: ch, clients, evenements: [] };
}
/* ---- disponibilité et attribution ---- */
function chevauche(s, du, au) { return s.du < au && du < s.au; }
function libre(r, du, au, auj_) {
  if (r.statut === 'maintenance') return false;
  if (r.sejours.some(s => chevauche(s, du, au))) return false;
  if (du <= auj_) { if (r.statut !== 'propre') return false; if (r.sejours.some(s => s.etat === 'present')) return false; }
  return true;
}
function ecartApres(r, au) { const suiv = r.sejours.filter(s => s.du >= au).sort((a, b) => a.du < b.du ? -1 : 1)[0]; return suiv ? nuits(au, suiv.du) : 30; }
function ecartAvant(r, du) { const prec = r.sejours.filter(s => s.au <= du).sort((a, b) => a.au < b.au ? 1 : -1)[0]; return prec ? nuits(prec.au, du) : 30; }
function proposer(E, o) { // E : état, o : { du, au, pref, etageHaut, pmr, adultes }
  const a = auj(); const du = o.du, au = o.au; const voulu = (o.pref && o.pref !== 'auto') ? o.pref : 'standard'; const rangVoulu = T[voulu].rang;
  const types = TYPES.slice().sort((x, y) => Math.abs(x.rang - rangVoulu) - Math.abs(y.rang - rangVoulu) || x.rang - y.rang);
  // d'abord le type voulu, puis les catégories supérieures (surclassement), puis les inférieures
  const ordre = [T[voulu]].concat(TYPES.filter(t => t.rang > rangVoulu), TYPES.filter(t => t.rang < rangVoulu).reverse());
  const res = [];
  for (const t of ordre) {
    const cands = E.chambres.filter(r => r.type === t.id && libre(r, du, au, a) && (!o.adultes || T[r.type].cap >= o.adultes));
    cands.forEach(r => {
      let s = 100; const raisons = [];
      const ap = ecartApres(r, au), av = ecartAvant(r, du);
      s -= Math.min(ap, 30) * 0.8; s -= Math.min(av, 30) * 0.3;
      if (ap <= 1) raisons.push('Remplit au mieux le calendrier : la chambre est reprise dès la fin du séjour.'); else if (ap >= 30) raisons.push('Aucune autre arrivée prévue juste après : la chambre reste disponible.');
      if (o.etageHaut) { s += r.etage * 2.5; raisons.push('Étage élevé demandé : étage ' + r.etage + '.'); } else s -= r.etage * 0.2;
      if (o.pmr) { if (r.pmr) { s += 60; raisons.push('Chambre accessible aux personnes à mobilité réduite.'); } else s -= 40; }
      if (t.id !== voulu) { s -= 200 * Math.abs(t.rang - rangVoulu); raisons.unshift(t.rang > rangVoulu ? 'Surclassement : la catégorie demandée est complète pour ces dates (tarif à valider par la direction).' : 'Catégorie inférieure : la catégorie demandée est complète.'); }
      if (r.sejours.length === 0 && ap >= 30) s += 2;
      res.push({ chambre: r, type: t, score: Math.round(s * 10) / 10, raisons, surclasse: t.id !== voulu && t.rang > rangVoulu });
    });
    if (res.length >= 3 && t.id === voulu) break;
  }
  res.sort((x, y) => y.score - x.score);
  return res.slice(0, 6);
}
function prixSejour(E, typeId, n) { const t = E.tarifs[typeId] || {}; const usd = t.usd === '' || t.usd == null ? null : Number(t.usd); const fcfa = t.fcfa === '' || t.fcfa == null ? null : Number(t.fcfa); const taux = Number(E.taux) || 0;
  let uNuit = usd, fNuit = fcfa; if (fNuit == null && uNuit != null && taux) fNuit = Math.round(uNuit * taux); if (uNuit == null && fNuit != null && taux) uNuit = Math.round(fNuit / taux * 100) / 100;
  return { usdNuit: uNuit, fcfaNuit: fNuit, usd: uNuit != null ? Math.round(uNuit * n * 100) / 100 : null, fcfa: fNuit != null ? fNuit * n : null }; }
window.HChambres = { TYPES, T, iso, addJ, nuits, auj, etatInitial, proposer, libre, prixSejour, ETAGES };
})();
