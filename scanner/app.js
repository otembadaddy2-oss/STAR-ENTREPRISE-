/* STAR Scanner — scanner de documents (photo → PDF), contrôle guidé des billets et papiers, passerelle Passeport Sûr.
   Tout se fait dans le navigateur de l'appareil : aucune photo, aucun PDF n'est envoyé en ligne. */
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const msg = (t, ms) => { const m = $('#msg'); m.textContent = t; m.style.display = 'block'; clearTimeout(msg.t); msg.t = setTimeout(() => m.style.display = 'none', ms || 3200); };
// ---------- navigation ----------
function aller(nom) {
  $$('.ecran').forEach(e => e.classList.toggle('on', e.id === 'e-' + nom)); $('#retour').style.display = nom === 'accueil' ? 'none' : 'inline-block';
  if (nom !== 'auth') lampe(false); window.scrollTo(0, 0);
}
$$('[data-go]').forEach(b => b.addEventListener('click', () => aller(b.dataset.go))); $('#retour').addEventListener('click', () => aller('accueil'));
// ---------- scanner de document ----------
const PAGES = []; let src = null, coins = [], filtre = 'nb', format = 'a4', glisse = -1;
const cvs = $('#cvs'), ctx = cvs.getContext('2d');
async function lireImage(fichier) {
  let bmp; try { bmp = await createImageBitmap(fichier, { imageOrientation: 'from-image' }); } catch (e) { bmp = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(fichier); }); }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight, k = Math.min(1, 2200 / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return c;
}
const coinsParDefaut = () => { const m = 0.05; return [[src.width * m, src.height * m], [src.width * (1 - m), src.height * m], [src.width * (1 - m), src.height * (1 - m)], [src.width * m, src.height * (1 - m)]]; };
function ouvrirRecadrage(c) { src = c; coins = detecter() || coinsParDefaut(); $('#d-choix').hidden = false; $('#d-recadre').hidden = false; dessiner(); $('#d-recadre').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
let enfile = Promise.resolve();
async function recevoir(fichiers) { for (const f of fichiers) { if (!f || !/^image\//.test(f.type || 'image/')) continue; const c = await lireImage(f); if (!src || $('#d-recadre').hidden) ouvrirRecadrage(c); else { enfile = enfile.then(() => ajouterDirect(c)); } } }
async function ajouterDirect(c) { const s0 = src, c0 = coins; src = c; coins = detecter() || coinsParDefaut(); PAGES.push({ canvas: transformer() }); src = s0; coins = c0; rendrePages(); }
$('#f-cam').addEventListener('change', e => { recevoir([...e.target.files]); e.target.value = ''; });
$('#f-img').addEventListener('change', e => { recevoir([...e.target.files]); e.target.value = ''; });
function dessiner() {
  if (!src) return; const W = cvs.clientWidth || 340, k = W / src.width, H = Math.round(src.height * k), dpr = Math.min(2, window.devicePixelRatio || 1);
  cvs.style.height = H + 'px'; cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.drawImage(src, 0, 0, W, H);
  const p = coins.map(([x, y]) => [x * k, y * k]);
  ctx.save(); ctx.fillStyle = 'rgba(4,16,48,.45)'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(p[0][0], p[0][1]); p.slice(1).forEach(q => ctx.lineTo(q[0], q[1])); ctx.closePath(); ctx.fill('evenodd'); ctx.restore();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffd466'; ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.stroke();
  p.forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], 14, 0, 7); ctx.fillStyle = '#ffd466'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#041030'; ctx.stroke(); });
}
function pos(e) { const r = cvs.getBoundingClientRect(), k = src.width / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; }
cvs.addEventListener('pointerdown', e => { if (!src) return; const [x, y] = pos(e), k = src.width / cvs.getBoundingClientRect().width; let b = -1, d = 48 * k; coins.forEach((c, i) => { const dd = Math.hypot(c[0] - x, c[1] - y); if (dd < d) { d = dd; b = i; } }); glisse = b; if (b >= 0) { cvs.setPointerCapture(e.pointerId); coins[b] = [Math.max(0, Math.min(src.width, x)), Math.max(0, Math.min(src.height, y))]; dessiner(); } });
cvs.addEventListener('pointermove', e => { if (glisse < 0) return; const [x, y] = pos(e); coins[glisse] = [Math.max(0, Math.min(src.width, x)), Math.max(0, Math.min(src.height, y))]; dessiner(); });
['pointerup', 'pointercancel'].forEach(t => cvs.addEventListener(t, () => { glisse = -1; }));
window.addEventListener('resize', () => { if (src && !$('#d-recadre').hidden) dessiner(); });
// détection simple des bords : le document est plus clair ou plus foncé que le fond
function detecter() {
  const k = Math.min(1, 220 / Math.max(src.width, src.height)), w = Math.max(8, Math.round(src.width * k)), h = Math.max(8, Math.round(src.height * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(src, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
  const bord = []; for (let i = 0; i < w; i++) { bord.push(g[i], g[(h - 1) * w + i]); } for (let j = 0; j < h; j++) { bord.push(g[j * w], g[j * w + w - 1]); } bord.sort((a, b) => a - b); const fond = bord[bord.length >> 1];
  const lig = new Uint16Array(h), col = new Uint16Array(w); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (Math.abs(g[j * w + i] - fond) > 28) { lig[j]++; col[i]++; }
  const tl = Math.max(3, w * 0.12), tc = Math.max(3, h * 0.12); let y0 = lig.findIndex(v => v > tl), x0 = col.findIndex(v => v > tc), y1 = h - 1 - [...lig].reverse().findIndex(v => v > tl), x1 = w - 1 - [...col].reverse().findIndex(v => v > tc);
  if (y0 < 0 || x0 < 0 || y1 <= y0 || x1 <= x0 || (x1 - x0) * (y1 - y0) < 0.18 * w * h) return null;
  // 4 coins du document : points extrêmes selon les deux diagonales (suit la perspective de la photo)
  let a = [1e9, 0, 0], bb = [-1e9, 0, 0], cc = [-1e9, 0, 0], dd = [1e9, 0, 0];
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) { if (Math.abs(g[j * w + i] - fond) <= 28 || lig[j] <= tl || col[i] <= tc) continue; const s = i + j, t = i - j;
    if (s < a[0]) a = [s, i, j]; if (s > bb[0]) bb = [s, i, j]; if (t > cc[0]) cc = [t, i, j]; if (t < dd[0]) dd = [t, i, j]; }
  const pt = p => [Math.max(0, Math.min(src.width, (p[1] + 0.5) / k)), Math.max(0, Math.min(src.height, (p[2] + 0.5) / k))], q = [pt(a), pt(cc), pt(bb), pt(dd)];
  const aire = Math.abs((q[0][0] * q[1][1] - q[1][0] * q[0][1]) + (q[1][0] * q[2][1] - q[2][0] * q[1][1]) + (q[2][0] * q[3][1] - q[3][0] * q[2][1]) + (q[3][0] * q[0][1] - q[0][0] * q[3][1])) / 2;
  return aire < 0.12 * src.width * src.height ? null : q;
}
// correction de perspective : on cherche l'homographie qui relie le rectangle final aux 4 coins choisis
function homographie(dst, s) {
  const A = [], b = []; for (let i = 0; i < 4; i++) { const [x, y] = dst[i], [u, v] = s[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  const n = 8; for (let i = 0; i < n; i++) { let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
    for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
  const hh = new Array(n); for (let i = n - 1; i >= 0; i--) { let s2 = b[i]; for (let c = i + 1; c < n; c++) s2 -= A[i][c] * hh[c]; hh[i] = s2 / A[i][i]; } return hh;
}
function transformer() {
  const [tl, tr, br, bl] = coins, dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let W = Math.round((dist(tl, tr) + dist(bl, br)) / 2), H = Math.round((dist(tl, bl) + dist(tr, br)) / 2); const k = Math.min(1, 1800 / Math.max(W, H, 1)); W = Math.max(40, Math.round(W * k)); H = Math.max(40, Math.round(H * k));
  const hh = homographie([[0, 0], [W, 0], [W, H], [0, H]], coins), sc = document.createElement('canvas'); sc.width = src.width; sc.height = src.height; const sx = sc.getContext('2d'); sx.drawImage(src, 0, 0);
  const S = sx.getImageData(0, 0, src.width, src.height).data, sw = src.width, sh = src.height, out = document.createElement('canvas'); out.width = W; out.height = H; const ox = out.getContext('2d'), O = ox.createImageData(W, H), od = O.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const den = hh[6] * x + hh[7] * y + 1, u = (hh[0] * x + hh[1] * y + hh[2]) / den, v = (hh[3] * x + hh[4] * y + hh[5]) / den, i0 = Math.floor(u), j0 = Math.floor(v), fu = u - i0, fv = v - j0, o = (y * W + x) * 4;
    if (i0 < 0 || j0 < 0 || i0 >= sw - 1 || j0 >= sh - 1) { od[o] = od[o + 1] = od[o + 2] = 255; od[o + 3] = 255; continue; }
    const a = (j0 * sw + i0) * 4, b = a + 4, c = a + sw * 4, d = c + 4;
    for (let ch = 0; ch < 3; ch++) od[o + ch] = S[a + ch] * (1 - fu) * (1 - fv) + S[b + ch] * fu * (1 - fv) + S[c + ch] * (1 - fu) * fv + S[d + ch] * fu * fv; od[o + 3] = 255;
  }
  appliquerFiltre(O, filtre); ox.putImageData(O, 0, 0); return out;
}
function appliquerFiltre(I, f) {
  const d = I.data, W = I.width, H = I.height, n = W * H; if (f === 'couleur') return;
  const g = new Float32Array(n); for (let i = 0; i < n; i++) g[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
  if (f === 'gris') { const h = new Uint32Array(256); for (let i = 0; i < n; i++) h[g[i] | 0]++; let lo = 0, hi = 255, s = 0; while (lo < 254 && (s += h[lo]) < n * 0.01) lo++; s = 0; while (hi > 1 && (s += h[hi]) < n * 0.01) hi--; const k = 255 / Math.max(1, hi - lo);
    for (let i = 0; i < n; i++) { const v = Math.max(0, Math.min(255, (g[i] - lo) * k)); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; } return; }
  // noir et blanc « document » : seuil local (corrige l'ombre et l'éclairage inégal)
  const ii = new Float64Array((W + 1) * (H + 1)); for (let y = 0; y < H; y++) { let r = 0; for (let x = 0; x < W; x++) { r += g[y * W + x]; ii[(y + 1) * (W + 1) + x + 1] = ii[y * (W + 1) + x + 1] + r; } }
  const R = Math.max(8, Math.round(Math.min(W, H) / 14));
  for (let y = 0; y < H; y++) { const y0 = Math.max(0, y - R), y1 = Math.min(H, y + R + 1); for (let x = 0; x < W; x++) { const x0 = Math.max(0, x - R), x1 = Math.min(W, x + R + 1), m = (ii[y1 * (W + 1) + x1] - ii[y0 * (W + 1) + x1] - ii[y1 * (W + 1) + x0] + ii[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0)); const v = g[y * W + x] < m * 0.88 ? 0 : 255, o = (y * W + x) * 4; d[o] = d[o + 1] = d[o + 2] = v; } }
}
$$('#d-filtres button').forEach(b => b.addEventListener('click', () => { filtre = b.dataset.f; $$('#d-filtres button').forEach(x => x.classList.toggle('on', x === b)); }));
$$('#d-format button').forEach(b => b.addEventListener('click', () => { format = b.dataset.fmt; $$('#d-format button').forEach(x => x.classList.toggle('on', x === b)); }));
$('#b-auto').addEventListener('click', () => { const c = detecter(); if (c) { coins = c; msg('Bords détectés. Ajustez si besoin.'); } else { coins = coinsParDefaut(); msg('Bords non détectés : placez les 4 points à la main.'); } dessiner(); });
$('#b-rot').addEventListener('click', () => { const c = document.createElement('canvas'); c.width = src.height; c.height = src.width; const x = c.getContext('2d'); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(src, 0, 0); src = c; coins = detecter() || coinsParDefaut(); dessiner(); });
$('#b-annuler').addEventListener('click', () => { src = null; $('#d-recadre').hidden = true; });
$('#b-valider').addEventListener('click', () => { if (!src) return; const c = transformer(); PAGES.push({ canvas: c }); src = null; $('#d-recadre').hidden = true; rendrePages(); msg('Page ' + PAGES.length + ' ajoutée.'); });
function rendrePages() {
  $('#d-pages').hidden = PAGES.length === 0; $('#d-nb').textContent = PAGES.length; const v = $('#d-vign'); v.innerHTML = '';
  PAGES.forEach((p, i) => { const f = document.createElement('figure'), t = document.createElement('canvas'); t.width = 96; t.height = 128; const k = Math.min(96 / p.canvas.width, 128 / p.canvas.height), w = p.canvas.width * k, h = p.canvas.height * k, x = t.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 96, 128); x.drawImage(p.canvas, (96 - w) / 2, (128 - h) / 2, w, h);
    f.appendChild(t); const a = document.createElement('div'); a.className = 'act'; [['←', () => deplacer(i, -1), 'Avancer la page'], ['✕', () => { PAGES.splice(i, 1); rendrePages(); }, 'Supprimer la page'], ['→', () => deplacer(i, 1), 'Reculer la page']].forEach(([l, fn, ti]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.title = ti; b.setAttribute('aria-label', ti + ' ' + (i + 1)); b.onclick = fn; a.appendChild(b); }); f.appendChild(a); f.appendChild(document.createTextNode('Page ' + (i + 1))); v.appendChild(f); });
}
function deplacer(i, d) { const j = i + d; if (j < 0 || j >= PAGES.length) return; [PAGES[i], PAGES[j]] = [PAGES[j], PAGES[i]]; rendrePages(); }
const nomFichier = ext => { const n = new Date(), p = x => String(x).padStart(2, '0'); return 'Scan-STAR-' + n.getFullYear() + p(n.getMonth() + 1) + p(n.getDate()) + '-' + p(n.getHours()) + p(n.getMinutes()) + '.' + ext; };
const telecharger = (blob, nom) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); };
const faire = () => window.StarPdf.construirePdf(PAGES, { format: format, qualite: 0.86 });
$('#b-pdf').addEventListener('click', () => { if (!PAGES.length) return; telecharger(faire(), nomFichier('pdf')); msg('PDF prêt (' + PAGES.length + ' page' + (PAGES.length > 1 ? 's' : '') + ').'); });
$('#b-part').addEventListener('click', async () => { if (!PAGES.length) return; const f = new File([faire()], nomFichier('pdf'), { type: 'application/pdf' }); try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Scan STAR' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; } telecharger(f, f.name); msg('Partage indisponible ici : le PDF est téléchargé.'); });
$('#b-jpg').addEventListener('click', () => { if (!PAGES.length) return; PAGES[0].canvas.toBlob(b => telecharger(b, nomFichier('jpg')), 'image/jpeg', 0.9); });
$('#b-vider').addEventListener('click', () => { if (confirm('Effacer toutes les pages scannées ?')) { PAGES.length = 0; rendrePages(); } });
// ---------- contrôle guidé billets et papiers ----------
const CTRL = {
  billet: [
    ['Toucher', 'Le papier est ferme et un peu rugueux ; l\'impression des chiffres et des portraits est en léger relief sous le doigt. Un faux billet est souvent lisse ou cireux.'],
    ['Contre la lumière', 'Un filigrane (portrait ou motif clair) et un fil de sécurité apparaissent quand on regarde le billet à contre-jour ; les deux faces s\'alignent (repérage recto-verso).'],
    ['Inclinez le billet', 'Certains éléments brillent ou changent de couleur selon l\'angle (encre à changement de couleur, bande brillante). Selon la coupure, tout n\'est pas présent sur toutes les valeurs.'],
    ['Regardez de près', 'Les petits textes sont nets et lisibles, sans bavure ; les traits fins sont réguliers. Une impression floue ou pixelisée est suspecte.'],
    ['Comparez', 'Mettez-le à côté d\'un billet de la même valeur dont vous êtes sûr : taille, couleurs, numéro de série, motifs doivent être identiques.'],
    ['Lampe UV (si vous en avez une)', 'Sous une vraie lampe UV, les billets authentiques montrent des zones qui brillent (fluorescence) à des endroits précis. La lampe du téléphone n\'émet pas d\'UV : ce contrôle n\'est valable qu\'avec une lampe UV.']
  ],
  papier: [
    ['Papier et toucher', 'Le papier officiel est de qualité ; les zones imprimées peuvent être en relief. Une photocopie ou une impression simple est lisse et uniforme.'],
    ['Contre la lumière', 'Cherchez un filigrane, des fibres ou un fil de sécurité dans le papier.'],
    ['Cachets et signatures', 'Le cachet est net, encré, avec le bon nom et la bonne date ; la signature n\'est pas imprimée (passez le doigt : une signature à l\'encre est inégale).'],
    ['Cohérence des informations', 'Nom, date de naissance, numéros et orthographe sont identiques sur toutes les pages ; pas de rature, de découpe ou de photo recollée.'],
    ['Photo et plastification', 'La photo est intégrée, sans bords relevés ni bulles ; les coins et la plastification ne se décollent pas.'],
    ['Vérification officielle', 'En cas de doute : faites vérifier auprès de l\'administration ou de l\'organisme qui a délivré le document, ou d\'une banque pour un billet. Ne vous fiez pas à ce seul guide.']
  ]
};
let type = 'billet'; const cochees = { billet: new Set(), papier: new Set() };
function rendreAuth() {
  const L = $('#a-liste'); L.innerHTML = ''; CTRL[type].forEach(([t, d], i) => { const l = document.createElement('label'); l.innerHTML = '<input type="checkbox" data-i="' + i + '"><div><b>' + (i + 1) + '. ' + t + '</b><span>' + d + '</span></div>'; const c = l.querySelector('input'); c.checked = cochees[type].has(i); c.addEventListener('change', () => { c.checked ? cochees[type].add(i) : cochees[type].delete(i); verdict(); }); L.appendChild(l); }); verdict();
}
function verdict() {
  const n = CTRL[type].length, k = cochees[type].size, v = $('#a-verdict'); if (!k) { v.innerHTML = ''; return; }
  if (k === n) v.innerHTML = '<div class="verdict ok">✔ Tous les contrôles sont conformes. Aucun signe de faux à l\'œil nu — pour un doute réel ou une grosse somme, faites vérifier en banque ou auprès de l\'administration.</div>';
  else if (k >= n - 2) v.innerHTML = '<div class="verdict mid">Presque tout est conforme (' + k + '/' + n + '). Terminez les derniers contrôles avant de décider.</div>';
  else v.innerHTML = '<div class="verdict mid">' + k + ' contrôle(s) fait(s) sur ' + n + '. Continuez le guide pas à pas.</div>';
}
$$('#a-type button').forEach(b => b.addEventListener('click', () => { type = b.dataset.t; $$('#a-type button').forEach(x => x.classList.toggle('on', x === b)); rendreAuth(); }));
$('#a-raz').addEventListener('click', () => { cochees[type].clear(); rendreAuth(); });
let flux = null;
async function lampe(on) {
  const b = $('#b-lampe'), info = $('#a-lampe-info');
  if (!on) { if (flux) { flux.getTracks().forEach(t => t.stop()); flux = null; } b.textContent = '🔦 Allumer la lampe'; b.dataset.on = ''; return; }
  try { flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } }); const tr = flux.getVideoTracks()[0], cap = tr.getCapabilities ? tr.getCapabilities() : {};
    if (!cap.torch) throw new Error('pas de lampe'); await tr.applyConstraints({ advanced: [{ torch: true }] }); b.textContent = '🔦 Éteindre la lampe'; b.dataset.on = '1'; info.hidden = false; info.textContent = 'Lampe allumée : placez le billet entre la lampe et vos yeux pour voir le filigrane.';
  } catch (e) { if (flux) { flux.getTracks().forEach(t => t.stop()); flux = null; } info.hidden = false; info.textContent = 'La lampe ne peut pas être pilotée depuis ce navigateur : utilisez la lampe de votre téléphone (centre de contrôle) ou une fenêtre bien éclairée.'; }
}
$('#b-lampe').addEventListener('click', () => lampe($('#b-lampe').dataset.on !== '1'));
rendreAuth();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
window.__scan = { pages: () => PAGES.length };
})();
