/* TERRAIN SÛR — lecture visuelle d'une photo de sol, entièrement sur l'appareil (aucune image n'est envoyée).
   Ce module décrit ce qu'on VOIT (couleurs, texture, netteté). Il ne mesure PAS la portance ni la nature réelle du sol :
   seul un sondage avec essais en laboratoire le fait. Le résultat sert d'indice, jamais de preuve. */
(function () {
'use strict';
const CLASSES = [
  { id: 'veg', nom: 'Végétation', couleur: [46, 160, 80] },
  { id: 'rouge', nom: 'Terre rouge / orangée (latérite ?)', couleur: [214, 84, 40] },
  { id: 'brun', nom: 'Terre brune / sombre', couleur: [120, 78, 44] },
  { id: 'sable', nom: 'Sol clair, sableux (apparence)', couleur: [236, 200, 110] },
  { id: 'gris', nom: 'Gris minéral (béton, bitume, roche)', couleur: [130, 138, 150] },
  { id: 'eau', nom: 'Eau, reflet ou ciel bleu', couleur: [50, 130, 230] },
  { id: 'ciel', nom: 'Ciel ou zone blanche', couleur: [235, 240, 250] },
  { id: 'noir', nom: 'Zone très sombre', couleur: [20, 20, 28] }
];
function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, mx ? d / mx : 0, mx];
}
function classer(h, s, v, y) { // y : position verticale 0 (haut) à 1 (bas)
  if (v < 0.13) return 'noir';
  if (s < 0.14) { if (v >= 0.86 || (y < 0.3 && v > 0.7)) return 'ciel'; return 'gris'; }
  if (h >= 175 && h <= 265 && s > 0.16) return 'eau';
  if (h >= 62 && h < 175 && s > 0.17) return 'veg';
  if ((h >= 345 || h < 34) && s >= 0.40 && v >= 0.30) return 'rouge';
  if (h >= 14 && h < 58 && s < 0.40 && v >= 0.62) return 'sable';
  if (h >= 8 && h < 62) return 'brun';
  return 'gris';
}
function versPetit(source, larg) {
  const sw = source.naturalWidth || source.videoWidth || source.width, sh = source.naturalHeight || source.videoHeight || source.height;
  const c = document.createElement('canvas'); const k = Math.min(1, larg / sw); c.width = Math.max(8, Math.round(sw * k)); c.height = Math.max(8, Math.round(sh * k));
  c.getContext('2d', { willReadFrequently: true }).drawImage(source, 0, 0, c.width, c.height); return c;
}
function empreinteVisuelle(source) { // 64 bits : détecte une même photo réutilisée, même recadrée ou recompressée
  const c = document.createElement('canvas'); c.width = 8; c.height = 8; const x = c.getContext('2d', { willReadFrequently: true });
  const sw = source.naturalWidth || source.width, sh = source.naturalHeight || source.height; x.drawImage(source, 0, 0, sw, sh, 0, 0, 8, 8);
  const d = x.getImageData(0, 0, 8, 8).data; const g = []; let m = 0;
  for (let i = 0; i < 64; i++) { const v = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11); g.push(v); m += v; } m /= 64;
  let hex = ''; for (let i = 0; i < 64; i += 4) { let n = 0; for (let j = 0; j < 4; j++) n = (n << 1) | (g[i + j] > m ? 1 : 0); hex += n.toString(16); }
  return hex;
}
function distanceEmpreintes(a, b) {
  let n = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { n += x & 1; x >>= 1; } } return n;
}
function analyser(source) {
  const c = versPetit(source, 192); const w = c.width, h = c.height; const px = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const compte = {}; CLASSES.forEach(k => compte[k.id] = 0); const cl = new Uint8Array(w * h); const idx = {}; CLASSES.forEach((k, i) => idx[k.id] = i);
  const gris = new Float32Array(w * h); let somLum = 0; let eauBas = 0, pxBas = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; const r = px[i], g = px[i + 1], b = px[i + 2]; const hsv = rgb2hsv(r, g, b);
    const k = classer(hsv[0], hsv[1], hsv[2], y / h); compte[k]++; cl[y * w + x] = idx[k]; const L = r * 0.3 + g * 0.59 + b * 0.11; gris[y * w + x] = L; somLum += L;
    if (y / h > 0.4) { pxBas++; if (k === 'eau') eauBas++; }
  }
  const N = w * h; const pct = {}; CLASSES.forEach(k => pct[k.id] = Math.round(compte[k.id] / N * 1000) / 10);
  // netteté : variance du laplacien ; rugosité : gradient moyen (Sobel) sur les pixels de sol
  let sl = 0, sl2 = 0, nl = 0, sg = 0, ng = 0;
  const solIds = { rouge: 1, brun: 1, sable: 1 };
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x; const lap = 4 * gris[p] - gris[p - 1] - gris[p + 1] - gris[p - w] - gris[p + w]; sl += lap; sl2 += lap * lap; nl++;
    if (solIds[CLASSES[cl[p]].id]) { const gx = gris[p + 1] - gris[p - 1], gy = gris[p + w] - gris[p - w]; sg += Math.sqrt(gx * gx + gy * gy); ng++; }
  }
  const varLap = nl ? sl2 / nl - (sl / nl) * (sl / nl) : 0; const lum = somLum / N;
  const rugosite = ng ? sg / ng : 0; const solVisible = pct.rouge + pct.brun + pct.sable;
  const q = { nettete: varLap, luminosite: Math.round(lum), floue: varLap < 14, sombre: lum < 45, surexposee: lum > 215 };
  const obs = [];
  if (q.sombre) obs.push({ t: 'ko', m: 'Photo trop sombre : refaites-la en pleine lumière du jour.' });
  if (q.surexposee) obs.push({ t: 'ko', m: 'Photo trop claire (éblouie) : mettez-vous à l\'ombre ou de dos au soleil.' });
  if (q.floue) obs.push({ t: 'ko', m: 'Photo floue : le diagnostic visuel est peu fiable. Tenez le téléphone stable et refaites-la.' });
  if (pct.ciel + (pct.eau > 20 && eauBas / Math.max(1, pxBas) < 0.1 ? pct.eau : 0) > 40) obs.push({ t: 'mid', m: 'Beaucoup de ciel sur la photo : cadrez davantage le sol (à 1,5–2 m de hauteur, vers le bas).' });
  if (solVisible < 25) obs.push({ t: 'mid', m: 'Le sol est peu visible (' + solVisible.toFixed(0) + ' %) : confiance faible pour la lecture visuelle.' });
  if (pct.veg > 55) obs.push({ t: 'mid', m: 'Végétation dense (' + pct.veg + ' %) : elle cache le sol. Dégagez une zone ou prenez une photo plus proche.' });
  if (eauBas / Math.max(1, pxBas) > 0.08) obs.push({ t: 'ko', m: 'Eau ou surface réfléchissante au sol (' + Math.round(eauBas / pxBas * 100) + ' % du bas de l\'image) : sol possiblement saturé ou inondable.' });
  if (pct.sable >= 30) obs.push({ t: 'mid', m: 'Sol d\'apparence claire et sableuse (' + pct.sable + ' %) : matériau souvent peu cohésif, sensible au ravinement. À confirmer par sondage.' });
  if (pct.rouge >= 30) obs.push({ t: 'ok', m: 'Terre rouge / orangée dominante (' + pct.rouge + ' %) : aspect de sol latéritique, souvent plus cohérent, mais très variable. À confirmer par essais.' });
  if (pct.brun >= 35 && lum < 110) obs.push({ t: 'mid', m: 'Terre brune sombre (' + pct.brun + ' %) : peut indiquer un sol humide ou riche en matière organique, peu portant. À vérifier.' });
  if (pct.gris >= 35) obs.push({ t: 'mid', m: 'Surface grise (' + pct.gris + ' %) : béton, bitume, roche ou remblai. La nature exacte ne se lit pas sur une photo.' });
  if (solVisible >= 25 && rugosite > 22) obs.push({ t: 'mid', m: 'Surface très accidentée (rigoles, creux ou cailloux) : à rapprocher d\'un ravinement ou d\'un sol remanié.' });
  if (!obs.length) obs.push({ t: 'ok', m: 'Aucun signe visuel marquant sur cette photo. Cela ne prouve rien sur le sous-sol.' });
  return { pct, qualite: q, rugosite: Math.round(rugosite * 10) / 10, solVisible: Math.round(solVisible * 10) / 10, eauBas: Math.round(eauBas / Math.max(1, pxBas) * 1000) / 10, obs, w, h, classes: cl };
}
function dessinerMasque(res, canvasSortie, source) { // photo + couleurs par type de surface (lecture visuelle)
  const W = canvasSortie.width, H = canvasSortie.height; const x = canvasSortie.getContext('2d');
  x.drawImage(source, 0, 0, W, H);
  const m = document.createElement('canvas'); m.width = res.w; m.height = res.h; const mx = m.getContext('2d'); const im = mx.createImageData(res.w, res.h);
  for (let i = 0; i < res.w * res.h; i++) { const col = CLASSES[res.classes[i]].couleur; im.data[i * 4] = col[0]; im.data[i * 4 + 1] = col[1]; im.data[i * 4 + 2] = col[2]; im.data[i * 4 + 3] = 255; }
  mx.putImageData(im, 0, 0); x.globalAlpha = 0.45; x.imageSmoothingEnabled = false; x.drawImage(m, 0, 0, W, H); x.globalAlpha = 1;
}
window.TSAnalyse = { analyser, dessinerMasque, empreinteVisuelle, distanceEmpreintes, CLASSES };
})();
