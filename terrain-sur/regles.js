/* TERRAIN SÛR — moteur de pré-diagnostic. Chaque point du score est expliqué à l'utilisateur.
   Les seuils sont des repères de bon sens d'ingénierie, PAS une norme congolaise : ils servent à orienter, jamais à autoriser une construction.
   Rien ici ne remplace une étude géotechnique (sondages, essais) réalisée par un bureau d'études ou un laboratoire agréé. */
(function () {
'use strict';
const CATS = {
  erosion: { nom: 'Érosion et ravinement', ic: '🌊' },
  eau: { nom: 'Eau et inondation', ic: '💧' },
  portance: { nom: 'Portance du sol (tassement)', ic: '🏗️' },
  pente: { nom: 'Stabilité de pente', ic: '⛰️' },
  remblai: { nom: 'Remblai et sol remanié', ic: '🚧' }
};
const USAGES = {
  habitation: { nom: 'Maison (rez-de-chaussée ou R+1)', mult: { portance: 1, eau: 1, erosion: 1, pente: 1, remblai: 1 } },
  immeuble: { nom: 'Immeuble (R+2 et plus) / bâtiment public', mult: { portance: 1.3, eau: 1, erosion: 1.05, pente: 1.15, remblai: 1.2 } },
  route: { nom: 'Route, piste ou voirie', mult: { portance: 1.1, eau: 1.25, erosion: 1.2, pente: 1, remblai: 1.1 } },
  drainage: { nom: 'Caniveau, drain, petit ouvrage d\'eau', mult: { portance: 0.9, eau: 1.2, erosion: 1.25, pente: 1, remblai: 1 } },
  inconnu: { nom: 'Usage non précisé (évaluation générale)', mult: { portance: 1, eau: 1, erosion: 1, pente: 1, remblai: 1 } }
};
const QUESTIONS = [
  { id: 'pente', q: 'Quelle est la pente du terrain ?', aide: 'Placez-vous en haut et regardez vers le bas. Un ballon posé au sol roule-t-il ?',
    o: [['plat', 'Plat ou presque', {}], ['legere', 'Légère pente', { pente: 8, erosion: 6 }], ['marquee', 'Pente marquée', { pente: 25, erosion: 16 }], ['forte', 'Très forte pente ou bord de ravin', { pente: 48, erosion: 30 }]] },
  { id: 'eau', q: 'Que voyez-vous comme eau ?', aide: 'Traces de boue séchée, laisses d\'eau sur les murs, flaques durables.',
    o: [['aucune', 'Aucune trace d\'eau', {}], ['humide', 'Sol humide ou boueux', { eau: 14, portance: 8 }], ['stagnante', 'Eau qui stagne après la pluie', { eau: 32, portance: 16 }], ['inonde', 'Traces de crue ou terrain déjà inondé', { eau: 55, portance: 20 }]] },
  { id: 'ravine', q: 'Y a-t-il des ravines ou des rigoles creusées ?', aide: 'Entailles dans le sol, racines à nu, murs ou routes qui s\'effondrent au bord.',
    o: [['non', 'Aucune', {}], ['rigoles', 'Petites rigoles', { erosion: 18 }], ['proche', 'Une ravine à moins de 50 m', { erosion: 42, pente: 12 }], ['grande', 'Grande ravine ou effondrement à moins de 20 m', { erosion: 70, pente: 28 }]] },
  { id: 'sol', q: 'Comment est le sol dans la main ? (test du boudin)', aide: 'Prenez une poignée, humidifiez-la et roulez-la en boudin de la taille d\'un crayon.',
    o: [['sable', 'Ne tient pas du tout (sable)', { erosion: 14, portance: 12 }], ['limon', 'Tient mal, s\'effrite (limon sableux)', { erosion: 8, portance: 8 }], ['argile', 'Se modèle bien, colle aux doigts (argile)', { portance: 14, eau: 6 }], ['roche', 'Graviers, cailloux ou roche', { portance: -10 }], ['remblai', 'Mélange, débris ou déchets', { remblai: 40, portance: 22 }]] },
  { id: 'fissures', q: 'Voyez-vous des fissures ou des affaissements ?', aide: 'Sur le sol, sur les murs voisins, sur la route proche.',
    o: [['non', 'Non', {}], ['murs', 'Fissures sur les murs voisins', { portance: 24, pente: 8 }], ['sol', 'Fissures ou crevasses dans le sol', { portance: 24, pente: 26 }], ['affaissement', 'Affaissement ou marche dans le sol', { portance: 46, pente: 30 }]] },
  { id: 'voisins', q: 'Comment sont les constructions voisines ?', aide: 'Elles racontent l\'histoire du terrain.',
    o: [['saines', 'Saines, en bon état', {}], ['vieilles', 'Anciennes mais stables', { portance: 4 }], ['abimees', 'Abîmées (fissures, inclinées)', { portance: 20, erosion: 14 }], ['abandonnees', 'Abandonnées à cause de l\'eau ou de l\'érosion', { erosion: 38, eau: 20, pente: 14 }]] },
  { id: 'eaucourante', q: 'À quelle distance est le fleuve, la rivière ou la mer ?', aide: 'Cours d\'eau permanent ou temporaire, lagune, bord de mer.',
    o: [['loin', 'Plus de 200 m', {}], ['moyen', 'Entre 50 et 200 m', { eau: 12, erosion: 8 }], ['proche', 'Moins de 50 m', { eau: 30, erosion: 22 }]] },
  { id: 'remblai', q: 'Le sol a-t-il été déplacé ou remblayé ?', aide: 'Terre rapportée, dépôt d\'ordures, ancien trou comblé.',
    o: [['naturel', 'Sol naturel', {}], ['ancien', 'Remblai ancien et stable', { remblai: 10 }], ['recent', 'Remblai récent, non compacté', { remblai: 40, portance: 22 }], ['decharge', 'Ancienne décharge ou dépôt d\'ordures', { remblai: 62, portance: 32 }]] },
  { id: 'drainage', q: 'Comment l\'eau de pluie s\'évacue-t-elle ?', aide: 'Caniveaux, fossés, pente naturelle, eaux venant des rues voisines.',
    o: [['bon', 'Caniveau en bon état', {}], ['bouche', 'Caniveau bouché ou cassé', { eau: 16, erosion: 14 }], ['aucun', 'Aucun drainage', { eau: 22, erosion: 18 }], ['vers', 'Les eaux de la rue se déversent vers le terrain', { eau: 30, erosion: 34 }]] },
  { id: 'couvert', q: 'Le sol est-il couvert de plantes ?', aide: 'L\'herbe et les arbres retiennent la terre.',
    o: [['dense', 'Bien couvert (herbe, arbres)', { erosion: -6 }], ['partiel', 'Partiellement couvert', {}], ['nu', 'Sol nu', { erosion: 14 }]] }
];
// Contexte local, tiré de la presse et de documents publics (voir l'étude) : c'est un RAPPEL, pas une carte officielle.
const VILLES = {
  brazzaville: { nom: 'Brazzaville', note: 'Plateaux de sols sablo-argileux (type Batéké) : sensibles au ravinement.', base: { erosion: 6 },
    quartiers: { 'Don-Bosco': 'erosion', 'Ngamakosso': 'erosion', 'Massengo': 'erosion', 'Mayanga': 'erosion', 'Ibalico': 'erosion', 'Mfilou': 'eau', 'Makélékélé': 'eau', 'Talangaï': 'eau', 'Mpila': 'eau', 'Intendance': 'eau' } },
  pointenoire: { nom: 'Pointe-Noire', note: 'Sols sableux côtiers, ravines en extension, réseau d\'assainissement sous-dimensionné, inondations en saison des pluies.', base: { erosion: 6, eau: 6 }, quartiers: {} },
  autre: { nom: 'Autre localité', note: 'Aucun contexte local intégré : le diagnostic repose seulement sur la photo et les réponses.', base: {}, quartiers: {} }
};
const ETAPES = [
  'Faire réaliser une étude géotechnique (sondages et essais) par un bureau d\'études ou un laboratoire agréé. Le BCBTP indique proposer ce type d\'étude.',
  'Déposer la demande de permis de construire auprès de l\'administration compétente.',
  'Faire contrôler le chantier tout au long des travaux (contrôle technique), pas seulement à la fin.'
];
const ACTIONS = {
  erosion: 'Maîtriser les eaux de ruissellement avant toute construction : fossés de garde, caniveaux, évacuation vers un exutoire sûr, végétalisation. Garder une distance de sécurité avec la ravine, à fixer par l\'étude et le service d\'urbanisme.',
  eau: 'Prévoir le drainage du terrain et relever la cote du plancher au-dessus du niveau d\'eau connu. Éviter un sous-sol. Vérifier la cote de crue locale.',
  portance: 'Faire mesurer la portance (sondages, essais). Prévoir des fondations adaptées au résultat (par exemple semelles élargies, radier ou pieux selon l\'étude).',
  pente: 'Faire dimensionner les terrassements par paliers et les murs de soutènement par un ingénieur. Ne pas charger le haut de la pente.',
  remblai: 'Retirer ou purger les matériaux douteux, ou reprendre le remblai par couches compactées, selon l\'étude. Ne jamais fonder sur des déchets.'
};
const ACTIONS_ROUTE = 'Pour une route : assise et couche de forme adaptées aux essais de portance, compactage contrôlé, drainage latéral et ouvrages de traversée dimensionnés. Les essais habituels (granulométrie, limites d\'Atterberg, portance CBR) sont à demander au laboratoire.';
function nivDepuis(score) {
  if (score < 25) return { id: 'favorable', nom: 'Favorable', coul: '#1f8a4c', msg: 'Aucun signal bloquant détecté. L\'étude géotechnique reste obligatoire.' };
  if (score < 45) return { id: 'vigilance', nom: 'Vigilance', coul: '#d9a100', msg: 'Des points demandent une attention particulière. Étude géotechnique indispensable avant de décider.' };
  if (score < 65) return { id: 'eleve', nom: 'Risque élevé', coul: '#e07a1a', msg: 'Plusieurs signaux inquiétants. Ne pas engager de travaux sans étude complète et mesures de protection.' };
  return { id: 'critique', nom: 'Critique', coul: '#c0392b', msg: 'Ne pas construire en l\'état. Traiter d\'abord le problème (eau, ravine, pente) sous la conduite d\'un ingénieur.' };
}
function evaluer(entree) {
  const { usage, ville, quartier, reponses, analyse } = entree; const sc = { erosion: 0, eau: 0, portance: 0, pente: 0, remblai: 0 }; const constats = [];
  const ajoute = (cat, pts, texte, source) => { if (!pts) return; sc[cat] += pts; constats.push({ cat, pts, texte, source }); };
  const v = VILLES[ville] || VILLES.autre; Object.keys(v.base).forEach(c => ajoute(c, v.base[c], 'Contexte local : ' + v.note, 'lieu'));
  if (quartier && v.quartiers[quartier]) ajoute(v.quartiers[quartier], 8, 'Le quartier « ' + quartier + ' » est cité dans la presse pour des problèmes d\'' + (v.quartiers[quartier] === 'erosion' ? 'érosion' : 'eau / inondation') + ' (rappel indicatif, pas une carte officielle).', 'lieu');
  QUESTIONS.forEach(q => { const r = reponses && reponses[q.id]; if (!r) return; const o = q.o.find(x => x[0] === r); if (!o) return;
    Object.keys(o[2]).forEach(c => ajoute(c, o[2][c], q.q.replace(/ \?$/, '') + ' → ' + o[1], 'réponse')); });
  if (analyse) {
    const p = analyse.pct;
    if (analyse.eauBas >= 8) ajoute('eau', 14, 'Sur la photo : surface d\'eau ou reflet dans le bas de l\'image (' + analyse.eauBas + ' %).', 'photo');
    if (p.sable >= 30) { ajoute('erosion', 7, 'Sur la photo : sol d\'apparence sableuse (' + p.sable + ' %).', 'photo'); ajoute('portance', 5, 'Sur la photo : sol clair sableux, matériau souvent peu cohésif.', 'photo'); }
    if (analyse.solVisible >= 50 && p.veg < 10) ajoute('erosion', 6, 'Sur la photo : sol nu et exposé (' + analyse.solVisible + ' % de sol visible, peu de végétation).', 'photo');
    if (p.veg >= 40) { sc.erosion -= 4; constats.push({ cat: 'erosion', pts: -4, texte: 'Sur la photo : bonne couverture végétale (' + p.veg + ' %), elle retient le sol.', source: 'photo' }); }
    if (analyse.solVisible >= 25 && analyse.rugosite > 22) ajoute('erosion', 8, 'Sur la photo : surface très accidentée, compatible avec un ravinement ou un sol remanié.', 'photo');
    if (p.brun >= 35 && analyse.qualite.luminosite < 110) ajoute('portance', 6, 'Sur la photo : terre brune sombre, peut être humide ou organique.', 'photo');
  }
  const um = (USAGES[usage] || USAGES.inconnu).mult; const cats = {};
  Object.keys(sc).forEach(c => cats[c] = Math.max(0, Math.min(100, Math.round(sc[c] * um[c]))));
  const vals = Object.values(cats).sort((a, b) => b - a); const maxi = vals[0], moy3 = (vals[0] + vals[1] + vals[2]) / 3;
  let global = Math.round(0.6 * maxi + 0.4 * moy3); const regles = [];
  const R = reponses || {};
  if (R.ravine === 'grande' && (R.pente === 'marquee' || R.pente === 'forte')) { global = Math.max(global, 70); regles.push('Grande ravine proche combinée à une pente marquée : niveau critique imposé.'); }
  if (R.ravine === 'grande') { global = Math.max(global, 62); regles.push('Grande ravine à moins de 20 m : niveau au moins « risque élevé ».'); }
  if (R.remblai === 'decharge') { global = Math.max(global, 55); regles.push('Ancienne décharge : niveau au moins « risque élevé » (on ne fonde pas sur des déchets).'); }
  if (R.eau === 'inonde' && (usage === 'habitation' || usage === 'immeuble' || usage === 'route')) { global = Math.max(global, 55); regles.push('Terrain déjà inondé : niveau au moins « risque élevé » pour cet usage.'); }
  if (R.fissures === 'affaissement') { global = Math.max(global, 55); regles.push('Affaissement visible : niveau au moins « risque élevé ».'); }
  global = Math.min(100, global); const niveau = nivDepuis(global);
  // confiance : dépend du nombre de réponses et de la qualité de la photo
  const nRep = Object.keys(R).length; let conf = 0.2 + 0.5 * (nRep / QUESTIONS.length); let confTxt = [];
  if (analyse && !analyse.qualite.floue && !analyse.qualite.sombre && analyse.solVisible >= 25) { conf += 0.2; } else if (analyse) { confTxt.push('photo peu exploitable'); } else { confTxt.push('pas de photo'); }
  if (nRep < QUESTIONS.length) confTxt.push((QUESTIONS.length - nRep) + ' question(s) sans réponse');
  conf = Math.min(0.9, conf); const confiance = conf >= 0.7 ? 'Moyenne' : 'Faible'; // jamais « élevée » : une photo ne suffit pas
  const dominantes = Object.keys(cats).filter(c => cats[c] >= 30).sort((a, b) => cats[b] - cats[a]);
  const actions = dominantes.map(c => ACTIONS[c]); if (usage === 'route') actions.push(ACTIONS_ROUTE);
  constats.sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts));
  return { global, niveau, cats, constats, regles, confiance, confTxt, actions, etapes: ETAPES, usage: (USAGES[usage] || USAGES.inconnu).nom, ville: v.nom };
}
function texteParle(res) { // phrase lue à voix haute
  const dom = Object.keys(res.cats).sort((a, b) => res.cats[b] - res.cats[a]).filter(c => res.cats[c] >= 30).map(c => CATS[c].nom.toLowerCase());
  let t = 'Résultat : niveau ' + res.niveau.nom + ', score ' + res.global + ' sur 100. ';
  t += dom.length ? 'Les principaux points sont : ' + dom.join(', ') + '. ' : 'Aucun point majeur n\'apparaît. ';
  t += res.niveau.msg + ' Attention : ce pré-diagnostic ne remplace pas une étude géotechnique.'; return t;
}
window.TSRegles = { CATS, USAGES, QUESTIONS, VILLES, evaluer, texteParle, nivDepuis, ETAPES };
})();
