/* DONNÉES FICTIVES de démonstration pour le tableau de bord de l'État. Aucune ne représente un vrai terrain, un vrai chantier ou une vraie personne.
   Les « zones » A à F sont génériques : elles ne désignent aucun quartier réel. */
(function () {
'use strict';
let s = 20261128; const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const VILLES = { brazzaville: { nom: 'Brazzaville', lat: -4.2634, lon: 15.2429, ecart: 0.07 }, pointenoire: { nom: 'Pointe-Noire', lat: -4.7692, lon: 11.8664, ecart: 0.06 } };
const TYPES = ['Maison', 'Immeuble', 'Route / voirie', 'Drainage', 'Bâtiment public'];
const NIV = ['favorable', 'vigilance', 'eleve', 'critique']; const STATUTS = ['À instruire', 'Étude demandée', 'Étude reçue', 'Autorisé', 'Suspendu'];
const ANOMALIES = [
  { id: 'doublon', t: 'Même photo utilisée pour deux sites', sev: 'haute' },
  { id: 'loin', t: 'Photo prise à plus de 300 m du chantier déclaré', sev: 'haute' },
  { id: 'avant', t: 'Photo datée d\'avant l\'ordre de service', sev: 'haute' },
  { id: 'avancement', t: 'Avancement déclaré très supérieur à celui des photos', sev: 'moyenne' },
  { id: 'ancienne', t: 'Photo ancienne (fichier de la galerie)', sev: 'moyenne' },
  { id: 'gps', t: 'Position GPS absente', sev: 'basse' }
];
const sites = [];
for (let i = 1; i <= 36; i++) {
  const ville = i % 3 === 0 ? 'pointenoire' : 'brazzaville'; const V = VILLES[ville];
  const r = rnd(); const niveau = r < 0.3 ? 'favorable' : r < 0.6 ? 'vigilance' : r < 0.85 ? 'eleve' : 'critique';
  const score = { favorable: 8 + Math.round(rnd() * 14), vigilance: 26 + Math.round(rnd() * 17), eleve: 46 + Math.round(rnd() * 17), critique: 66 + Math.round(rnd() * 28) }[niveau];
  const anom = rnd() < 0.28 ? [ANOMALIES[Math.floor(rnd() * ANOMALIES.length)]] : [];
  sites.push({ id: 'DEMO-' + String(i).padStart(3, '0'), ville, zone: 'Zone ' + 'ABCDEF'[Math.floor(rnd() * 6)], type: TYPES[Math.floor(rnd() * TYPES.length)], niveau, score,
    lat: V.lat + (rnd() - 0.5) * 2 * V.ecart, lon: V.lon + (rnd() - 0.5) * 2 * V.ecart, jours: 2 + Math.floor(rnd() * 40),
    statut: niveau === 'critique' ? (rnd() < 0.6 ? 'Suspendu' : 'Étude demandée') : STATUTS[Math.floor(rnd() * 4)], anomalies: anom });
}
const chantiers = [
  { id: 'CH-DEMO-A', nom: 'Voirie de quartier (exemple)', ville: 'Brazzaville', declare: 80, photos: 35, alerte: 'Avancement déclaré 80 % ; les photos montrent environ 35 %.' },
  { id: 'CH-DEMO-B', nom: 'Marché couvert (exemple)', ville: 'Pointe-Noire', declare: 55, photos: 52, alerte: null },
  { id: 'CH-DEMO-C', nom: 'Ouvrage de drainage (exemple)', ville: 'Brazzaville', declare: 100, photos: 100, alerte: 'Une photo de réception a été réutilisée sur un autre site (même empreinte).' },
  { id: 'CH-DEMO-D', nom: 'École primaire (exemple)', ville: 'Pointe-Noire', declare: 30, photos: 30, alerte: null }
];
window.TSDemo = { VILLES, sites, chantiers, ANOMALIES };
})();
