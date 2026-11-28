/* TERRAIN SÛR — application (prototype de démonstration). Tout se passe sur l'appareil ; aucun serveur n'est relié. */
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const R = window.TSRegles, A = window.TSAnalyse, J = window.TSJournal, D = window.TSDemo;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let mt; function msg(t, ms) { const m = $('#msg'); m.textContent = t; m.style.display = 'block'; clearTimeout(mt); mt = setTimeout(() => m.style.display = 'none', ms || 3200); }
/* ---------- voix ---------- */
let voixOn = false; try { voixOn = localStorage.getItem('ts-voix') === '1'; } catch (e) {}
const bVoix = document.createElement('button'); bVoix.type = 'button'; bVoix.style.cssText = 'margin-left:8px;background:#ffffff1f;border:1px solid #ffffff40;color:#fff;border-radius:99px;min-height:34px;padding:0 10px;font-size:.78rem;cursor:pointer';
function majVoix() { bVoix.textContent = voixOn ? '🔊 voix' : '🔇 voix'; bVoix.setAttribute('aria-pressed', voixOn); } majVoix(); $('header').appendChild(bVoix);
function parler(t, force) { if (!(voixOn || force) || !('speechSynthesis' in window)) return false; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = 0.96; const v = speechSynthesis.getVoices().find(x => /^fr/i.test(x.lang)); if (v) u.voice = v; speechSynthesis.speak(u); return true; } catch (e) { return false; } }
bVoix.onclick = () => { voixOn = !voixOn; try { localStorage.setItem('ts-voix', voixOn ? '1' : '0'); } catch (e) {} majVoix(); if (voixOn) parler('Voix activée. Je vous guide pas à pas.'); else if ('speechSynthesis' in window) speechSynthesis.cancel(); };
/* ---------- navigation ---------- */
const ECRANS = { accueil: 'e-accueil', scan: 'e-scan', chantiers: 'e-chantiers', etat: 'e-etat', verif: 'e-verif' };
const PAROLES = { accueil: 'Bienvenue dans Terrain Sûr. Je vous aide à lire un terrain avant de construire.', scan: 'Choisissez la ville et l\'usage, puis prenez une photo du sol.', chantiers: 'Voici le suivi des chantiers et le journal verrouillé.', etat: 'Tableau de bord de l\'État. Ces données sont fictives, pour la démonstration.', verif: 'Saisissez le code du rapport pour vérifier qu\'il est authentique.' };
function go(n) {
  if (n === 'demo') { go('scan'); setTimeout(demoGuidee, 150); return; }
  Object.keys(ECRANS).forEach(k => $('#' + ECRANS[k]).classList.toggle('on', k === n)); $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.go === n)); window.scrollTo(0, 0);
  if (n === 'chantiers') rendreChantiers(); if (n === 'etat') rendreEtat(); if (PAROLES[n]) parler(PAROLES[n]);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
function majEtat() { $('#etat').textContent = navigator.onLine ? 'en ligne' : 'hors ligne OK'; } addEventListener('online', majEtat); addEventListener('offline', majEtat); majEtat();
/* ---------- état du relevé en cours ---------- */
let S = null; function nouveau() { S = { img: null, fichier: null, source: '', photoHash: '', aHash: '', analyse: null, gps: null, rep: {}, res: null, entree: null, flags: [] }; }
nouveau();
/* ---------- champs lieu / usage / chantier ---------- */
function remplirLieu() {
  const v = $('#ville').value; const q = $('#quartier'); q.innerHTML = '<option value="">— non précisé —</option>' + Object.keys(R.VILLES[v].quartiers).map(n => '<option>' + esc(n) + '</option>').join('');
  q.parentElement && (q.style.display = Object.keys(R.VILLES[v].quartiers).length ? '' : 'none'); $('label[for=quartier]').style.display = q.style.display;
  $('#note-ville').innerHTML = '<b>Contexte local.</b> ' + esc(R.VILLES[v].note) + ' <i>(rappel indicatif tiré de la presse et de documents publics, pas une carte officielle.)</i>';
}
$('#usage').innerHTML = Object.keys(R.USAGES).map(k => '<option value="' + k + '">' + esc(R.USAGES[k].nom) + '</option>').join(''); $('#ville').onchange = remplirLieu; remplirLieu();
function remplirChantiers() { $('#chsel').innerHTML = '<option value="">— aucun —</option>' + J.chantiers().map(c => '<option value="' + esc(c.id) + '">' + esc(c.nom) + '</option>').join(''); } remplirChantiers();
/* ---------- GPS ---------- */
function gps() { $('#gps-txt').textContent = 'recherche…'; if (!navigator.geolocation) { $('#gps-txt').textContent = 'non disponible sur cet appareil'; return; }
  navigator.geolocation.getCurrentPosition(p => { S.gps = { lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6), prec: Math.round(p.coords.accuracy) }; $('#gps-txt').textContent = S.gps.lat + ', ' + S.gps.lon + ' (±' + S.gps.prec + ' m)'; },
    () => { S.gps = null; $('#gps-txt').textContent = 'indisponible (autorisez la localisation)'; }, { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }); }
$('#b-gps').onclick = gps; gps();
/* ---------- photo ---------- */
function setEtape(n) { ['s1', 's1b', 's2', 's3'].forEach(id => $('#' + id).hidden = id !== n); const p = { s1: 8, s1b: 35, s2: 62, s3: 100 }[n]; $('#prog').style.width = p + '%'; window.scrollTo(0, 0); }
async function chargerFichier(f, source) {
  try {
    const buf = await f.arrayBuffer(); S.photoHash = J.sha256Octets(buf); S.fichier = { nom: f.name, taille: f.size, modif: f.lastModified || 0 }; S.source = source;
    const url = URL.createObjectURL(new Blob([buf], { type: f.type || 'image/jpeg' })); const img = new Image(); img.onload = () => { traiterImage(img); URL.revokeObjectURL(url); }; img.onerror = () => msg('Image illisible. Essayez une autre photo.'); img.src = url;
  } catch (e) { msg('Impossible de lire ce fichier.'); }
}
function traiterImage(img) {
  S.img = img; S.aHash = A.empreinteVisuelle(img); S.analyse = A.analyser(img);
  const cv = $('#cv-photo'); const W = Math.min(900, img.naturalWidth); cv.width = W; cv.height = Math.round(img.naturalHeight * W / img.naturalWidth); A.dessinerMasque(S.analyse, cv, img);
  const leg = A.CLASSES.filter(k => S.analyse.pct[k.id] >= 3).map(k => '<span><i style="background:rgb(' + k.couleur.join(',') + ')"></i>' + esc(k.nom) + ' ' + S.analyse.pct[k.id] + ' %</span>').join('');
  $('#legende').innerHTML = leg; $('#obs-photo').innerHTML = '<h3 style="margin-top:4px">Ce que l\'application voit</h3>' + S.analyse.obs.map(o => '<div class="obs ' + o.t + '">' + esc(o.m) + '</div>').join('') + '<p style="font-size:.78rem;color:var(--gris);margin:4px 0">Lecture visuelle seulement : couleurs, texture, netteté. Elle ne mesure pas la solidité du sol.</p>';
  setEtape('s1b'); parler(S.analyse.obs[0].m);
}
$('#f-cam').onchange = e => { const f = e.target.files[0]; if (f) chargerFichier(f, 'camera'); e.target.value = ''; };
$('#f-img').onchange = e => { const f = e.target.files[0]; if (f) chargerFichier(f, 'galerie'); e.target.value = ''; };
const EXEMPLES = [['eau', 'Terrain détrempé', 'Eau de surface'], ['piste', 'Piste en terre', 'Piste'], ['boue', 'Champ boueux', 'Boue'], ['sable', 'Sol sableux', 'Sable'], ['chantier', 'Chantier de terrassement', 'Chantier'], ['sol-brun', 'Sol brun couvert de feuilles', 'Sol brun']];
$('#b-exemples').onclick = () => { const d = $('#exemples'); d.style.display = d.style.display === 'none' ? 'flex' : 'none'; };
$('#exemples').innerHTML = EXEMPLES.map(x => '<button type="button" class="btn cl" data-ex="' + x[0] + '" style="flex:1 1 140px;min-height:42px;font-size:.84rem">' + esc(x[1]) + '</button>').join('');
$('#exemples').onclick = async e => { const b = e.target.closest('[data-ex]'); if (!b) return; try { const r = await fetch('img/' + b.dataset.ex + '.jpg'); const bl = await r.blob(); await chargerFichier(new File([bl], b.dataset.ex + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }), 'exemple'); } catch (er) { msg('Photo d\'exemple indisponible hors connexion si l\'application n\'a pas encore été ouverte une fois en ligne.'); } };
$('#b-refaire').onclick = () => { setEtape('s1'); };
$('#b-suite').onclick = () => { rendreQuestions(); setEtape('s2'); parler('Répondez aux questions avec ce que vous voyez sur place.'); };
$('#b-retour1').onclick = () => setEtape('s1b');
/* ---------- questions ---------- */
function rendreQuestions() {
  $('#questions').innerHTML = R.QUESTIONS.map((q, i) => '<div class="q"><b>' + (i + 1) + '. ' + esc(q.q) + '</b><small>' + esc(q.aide) + '</small><div class="ops">' + q.o.map(o => '<label><input type="radio" name="q-' + q.id + '" value="' + o[0] + '"' + (S.rep[q.id] === o[0] ? ' checked' : '') + '>' + esc(o[1]) + '</label>').join('') + '</div></div>').join('');
  $$('#questions input').forEach(inp => inp.onchange = () => { S.rep[inp.name.slice(2)] = inp.value; });
}
$('#b-calcul').onclick = async () => {
  S.res = R.evaluer({ usage: $('#usage').value, ville: $('#ville').value, quartier: $('#quartier').value, reponses: S.rep, analyse: S.analyse }); S.flags = calculerFlags(); S.entree = null; rendreResultat(); setEtape('s3'); parler(R.texteParle(S.res));
};
/* ---------- anti-fraude ---------- */
function calculerFlags() {
  const f = []; const a = S.analyse; const j = J.tout();
  if (a.qualite.floue || a.qualite.sombre || a.qualite.surexposee) f.push({ sev: 'moyenne', t: 'Photo de mauvaise qualité (floue, sombre ou éblouie)' });
  const dbl = j.find(e => e.photoHash === S.photoHash); const quasi = j.find(e => e.aHash && A.distanceEmpreintes(e.aHash, S.aHash) <= 4);
  if (dbl) f.push({ sev: 'haute', t: 'Cette photo exacte a déjà été utilisée dans le relevé ' + dbl.id });
  else if (quasi) f.push({ sev: 'haute', t: 'Une photo quasi identique existe déjà (relevé ' + quasi.id + ') : même scène réutilisée ou recadrée ?' });
  if (S.source === 'galerie') f.push({ sev: 'moyenne', t: 'Image choisie dans la galerie : la date de prise de vue n\'est pas garantie' });
  if (S.source === 'camera' && S.fichier.modif && Date.now() - S.fichier.modif > 15 * 60 * 1000) f.push({ sev: 'haute', t: 'Le fichier date de plus de 15 minutes : ce n\'est pas une photo prise maintenant' });
  if (!S.gps) f.push({ sev: 'basse', t: 'Position GPS absente : le lieu ne peut pas être prouvé' });
  const ch = J.chantiers().find(c => c.id === $('#chsel').value);
  if (ch && S.gps) { const d = J.distanceM(S.gps, { lat: ch.lat, lon: ch.lon }); if (d > 300) f.push({ sev: 'haute', t: 'Position à ' + Math.round(d) + ' m du chantier déclaré (limite : 300 m)' }); }
  if (ch && S.fichier.modif && ch.os && new Date(S.fichier.modif) < new Date(ch.os)) f.push({ sev: 'haute', t: 'Photo antérieure à l\'ordre de service du chantier' });
  if (S.source === 'exemple') f.push({ sev: 'basse', t: 'Photo d\'exemple de démonstration (pas un vrai terrain)' });
  return f;
}
/* ---------- résultat ---------- */
function jaugeSVG(score, coul) { const r = 62, cx = 75, cy = 78, L = Math.PI * r, p = Math.max(0, Math.min(100, score)) / 100 * L;
  return '<svg viewBox="0 0 150 92" aria-label="Score ' + score + ' sur 100"><path d="M' + (cx - r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy + '" fill="none" stroke="#e7e3d3" stroke-width="14" stroke-linecap="round"/><path d="M' + (cx - r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy + '" fill="none" stroke="' + coul + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + p.toFixed(1) + ' ' + L.toFixed(1) + '"><animate attributeName="stroke-dasharray" from="0 ' + L.toFixed(1) + '" to="' + p.toFixed(1) + ' ' + L.toFixed(1) + '" dur="1s" fill="freeze"/></path><text x="75" y="70" text-anchor="middle" font-size="30" font-weight="800" fill="#06142e">' + score + '</text><text x="75" y="86" text-anchor="middle" font-size="9" fill="#5a6275">sur 100</text></svg>'; }
const COUL_CAT = v => v >= 65 ? '#c0392b' : v >= 45 ? '#e07a1a' : v >= 25 ? '#d9a100' : '#1f8a4c';
function rendreResultat() {
  const r = S.res; const seal = S.entree;
  let h = '<h2>Diagnostic du terrain</h2>';
  h += '<div class="verdict" style="background:' + r.niveau.coul + '"><div style="font-size:1.15rem">' + esc(r.niveau.nom) + '</div><div style="font-weight:500;margin-top:4px">' + esc(r.niveau.msg) + '</div></div>';
  h += '<div class="jauge">' + jaugeSVG(r.global, r.niveau.coul) + '<div><div class="v" style="color:' + r.niveau.coul + '">' + esc(r.niveau.nom) + '</div><div style="font-size:.84rem;color:var(--gris)">' + esc(r.usage) + '<br>' + esc(r.ville) + '</div><div style="margin-top:6px"><span class="pill">Confiance : ' + r.confiance + '</span></div></div></div>';
  if (r.confTxt.length) h += '<p style="font-size:.8rem;color:var(--gris);margin:0 0 6px">Confiance limitée : ' + esc(r.confTxt.join(', ')) + '.</p>';
  h += '<div class="boite"><b>Risques par nature</b>' + Object.keys(r.cats).sort((a, b) => r.cats[b] - r.cats[a]).map(c => '<div class="barre"><span>' + R.CATS[c].ic + ' ' + esc(R.CATS[c].nom) + '</span><div class="p"><i style="width:' + r.cats[c] + '%;background:' + COUL_CAT(r.cats[c]) + '"></i></div><em>' + r.cats[c] + '</em></div>').join('') + '</div>';
  if (r.regles.length) h += '<div class="alerte"><b>Règles de sécurité appliquées</b><br>' + r.regles.map(esc).join('<br>') + '</div>';
  h += '<h3>Pourquoi ce résultat ? <small style="font-weight:400;color:var(--gris)">(chaque point est expliqué)</small></h3><div class="boite">' + r.constats.slice(0, 12).map(c => '<div style="font-size:.84rem;line-height:1.4;margin:5px 0"><span class="pill" style="background:' + (c.pts > 0 ? '#fdecea' : '#e9f7ef') + '">' + (c.pts > 0 ? '+' : '') + c.pts + '</span> ' + esc(c.texte) + ' <i style="color:var(--gris)">[' + c.source + ']</i></div>').join('') + (r.constats.length ? '' : 'Aucun élément de risque relevé.') + '</div>';
  if (r.actions.length) h += '<h3>Que faire ?</h3><div class="boite">' + r.actions.map(a => '<p style="margin:6px 0;font-size:.88rem;line-height:1.45">• ' + esc(a) + '</p>').join('') + '</div>';
  h += '<h3>Étapes obligatoires</h3><div class="boite">' + r.etapes.map((e, i) => '<p style="margin:6px 0;font-size:.88rem;line-height:1.45"><b>' + (i + 1) + '.</b> ' + esc(e) + '</p>').join('') + '</div>';
  if (S.flags.length) h += '<h3>Contrôles anti-fraude</h3>' + S.flags.map(f => '<div class="obs ' + (f.sev === 'haute' ? 'ko' : f.sev === 'moyenne' ? 'mid' : 'ok') + '"><b>' + f.sev.toUpperCase() + '</b> — ' + esc(f.t) + '</div>').join('');
  h += '<div class="alerte"><b>Ce pré-diagnostic ne remplace pas une étude géotechnique.</b> Il repose sur une photo et des réponses données sur place. Seuls des sondages et des essais en laboratoire mesurent réellement la portance d\'un sol. Ne démarrez aucun travaux sur ce seul résultat.</div>';
  if (seal) h += '<div class="boite"><b>🔒 Relevé scellé</b><div style="margin:6px 0;font-size:.84rem">N° <b>' + esc(seal.id) + '</b> · ' + new Date(seal.t).toLocaleString('fr-FR') + '</div><div id="qr" style="width:128px;height:128px"></div><div class="sceau" style="margin-top:6px">' + seal.hash + '</div><div style="font-size:.78rem;color:var(--gris);margin-top:4px">Code de vérification : <b>' + seal.hash.slice(0, 12) + '</b></div></div>';
  h += '<div class="rang"><button class="btn cl" id="b-ecouter" type="button">🔊 Écouter</button>' + (seal ? '<button class="btn or" id="b-pdf" type="button">📄 Rapport PDF</button>' : '<button class="btn or" id="b-sceller" type="button">🔒 Sceller dans le journal</button>') + '<button class="btn cl" id="b-nouveau" type="button">＋ Nouveau terrain</button></div>';
  $('#resultat').innerHTML = h;
  if (seal) { try { const q = qrcode(0, 'M'); q.addData(qrTexte(seal)); q.make(); $('#qr').innerHTML = q.createSvgTag(4, 0); $('#qr svg').style.cssText = 'width:128px;height:128px'; } catch (e) {} }
  $('#b-ecouter').onclick = () => { if (!parler(R.texteParle(S.res), true)) msg('La lecture vocale n\'est pas disponible sur ce navigateur.'); };
  $('#b-nouveau').onclick = () => { nouveau(); gps(); setEtape('s1'); };
  if ($('#b-sceller')) $('#b-sceller').onclick = sceller; if ($('#b-pdf')) $('#b-pdf').onclick = rapportPdf;
}
const qrTexte = e => 'TS1|' + e.id + '|' + e.hash.slice(0, 12) + '|' + e.niveau + '|' + e.score;
function miniature() { const c = document.createElement('canvas'); const k = 160 / S.img.naturalWidth; c.width = 160; c.height = Math.round(S.img.naturalHeight * k); c.getContext('2d').drawImage(S.img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.6); }
function sceller() {
  const id = 'TS-' + Date.now().toString(36).toUpperCase(); const rel = { id, t: new Date().toISOString(), type: 'releve', ville: S.res.ville, quartier: $('#quartier').value || '', usage: S.res.usage, usageId: $('#usage').value, gps: S.gps, niveau: S.res.niveau.id, score: S.res.global, cats: S.res.cats, photoHash: S.photoHash, aHash: S.aHash, source: S.source, chantier: $('#chsel').value || '', flags: S.flags.map(f => f.sev + ': ' + f.t), thumb: miniature(), rep: S.rep };
  S.entree = J.ajouter(rel); rendreResultat(); msg('Relevé scellé dans le journal. Il ne pourra plus être modifié sans que ça se voie.'); parler('Relevé scellé. Il est maintenant protégé contre toute modification.');
}
/* ---------- rapport PDF ---------- */
function cadreTexte(x, texte, px, py, largeur, interligne, police) { x.font = police; const mots = String(texte).split(' '); let ligne = '', y = py; mots.forEach(m => { const t = ligne ? ligne + ' ' + m : m; if (x.measureText(t).width > largeur && ligne) { x.fillText(ligne, px, y); y += interligne; ligne = m; } else ligne = t; }); if (ligne) { x.fillText(ligne, px, y); y += interligne; } return y; }
async function rapportPdf() {
  const seal = S.entree, r = S.res; const logo = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = 'icon-192.png'; });
  const pages = []; const W = 1240, H = 1754, M = 70;
  const nouvellePage = (titre) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = '#06142e'; x.fillRect(0, 0, W, 130); x.fillStyle = '#e3b653'; x.fillRect(0, 130, W, 6);
    if (logo) x.drawImage(logo, M, 20, 90, 90); x.fillStyle = '#fff'; x.font = '700 42px system-ui,sans-serif'; x.fillText('TERRAIN SÛR', M + 110, 66); x.fillStyle = '#ffd466'; x.font = '24px system-ui,sans-serif'; x.fillText('STAR ENTREPRISE · Brazzaville, République du Congo', M + 110, 100);
    x.fillStyle = '#5a6275'; x.font = '20px system-ui,sans-serif'; x.fillText(titre + ' · relevé ' + seal.id, M, H - 40); x.textAlign = 'right'; x.fillText('Page ' + (pages.length + 1) + ' / 2', W - M, H - 40); x.textAlign = 'left'; pages.push({ canvas: c }); return x; };
  let x = nouvellePage('Rapport de pré-diagnostic de terrain'); let y = 200;
  x.fillStyle = '#06142e'; x.font = '700 46px system-ui,sans-serif'; x.fillText('Rapport de pré-diagnostic de terrain', M, y); y += 46;
  x.fillStyle = '#1a2030'; x.font = '26px system-ui,sans-serif';
  [['Date', new Date(seal.t).toLocaleString('fr-FR')], ['Ville', r.ville + (seal.quartier ? ' — ' + seal.quartier : '')], ['Usage prévu', r.usage], ['Position GPS', S.gps ? S.gps.lat + ', ' + S.gps.lon + ' (±' + S.gps.prec + ' m)' : 'non disponible'], ['Source de la photo', { camera: 'appareil photo', galerie: 'galerie', exemple: 'photo d\'exemple (démonstration)' }[S.source]]].forEach(l => { x.fillStyle = '#5a6275'; x.fillText(l[0], M, y); x.fillStyle = '#1a2030'; x.fillText(l[1], M + 260, y); y += 40; });
  y += 10; const pw = (W - 2 * M - 30) / 2, ph = pw * 0.68; x.drawImage(S.img, M, y, pw, ph); const tmp = document.createElement('canvas'); tmp.width = 640; tmp.height = Math.round(640 * S.img.naturalHeight / S.img.naturalWidth); A.dessinerMasque(S.analyse, tmp, S.img); x.drawImage(tmp, M + pw + 30, y, pw, ph);
  x.fillStyle = '#5a6275'; x.font = '20px system-ui,sans-serif'; x.fillText('Photo prise', M, y + ph + 28); x.fillText('Lecture visuelle (couleurs par type de surface)', M + pw + 30, y + ph + 28); y += ph + 70;
  x.fillStyle = r.niveau.coul; x.fillRect(M, y, W - 2 * M, 150); x.fillStyle = '#fff'; x.font = '700 44px system-ui,sans-serif'; x.fillText(r.niveau.nom + ' — score ' + r.global + '/100', M + 24, y + 54); x.font = '24px system-ui,sans-serif'; cadreTexte(x, r.niveau.msg, M + 24, y + 92, W - 2 * M - 48, 30, '24px system-ui,sans-serif'); y += 190;
  x.fillStyle = '#06142e'; x.font = '700 30px system-ui,sans-serif'; x.fillText('Risques par nature', M, y); y += 20;
  Object.keys(r.cats).sort((a, b) => r.cats[b] - r.cats[a]).forEach(c => { y += 44; x.fillStyle = '#1a2030'; x.font = '24px system-ui,sans-serif'; x.fillText(R.CATS[c].nom, M, y); x.fillStyle = '#e7e3d3'; x.fillRect(M + 460, y - 22, 560, 24); x.fillStyle = COUL_CAT(r.cats[c]); x.fillRect(M + 460, y - 22, 560 * r.cats[c] / 100, 24); x.fillStyle = '#1a2030'; x.fillText(String(r.cats[c]), M + 1040, y); });
  y += 50; x.fillStyle = '#5a6275'; x.font = '22px system-ui,sans-serif'; cadreTexte(x, 'Confiance du pré-diagnostic : ' + r.confiance + '. Une photo ne suffit jamais à établir la portance d\'un sol.', M, y, W - 2 * M, 28, '22px system-ui,sans-serif');
  x = nouvellePage('Rapport de pré-diagnostic de terrain'); y = 200;
  x.fillStyle = '#06142e'; x.font = '700 34px system-ui,sans-serif'; x.fillText('Pourquoi ce résultat', M, y); y += 14;
  x.fillStyle = '#1a2030'; r.constats.slice(0, 7).forEach(c => { y += 36; x.fillStyle = c.pts > 0 ? '#c0392b' : '#1f8a4c'; x.font = '700 22px system-ui,sans-serif'; x.fillText((c.pts > 0 ? '+' : '') + c.pts, M, y); x.fillStyle = '#1a2030'; y = cadreTexte(x, c.texte, M + 70, y, W - 2 * M - 70, 28, '22px system-ui,sans-serif') - 8; });
  y += 40; x.fillStyle = '#06142e'; x.font = '700 34px system-ui,sans-serif'; x.fillText('Que faire', M, y); y += 14; x.fillStyle = '#1a2030';
  (r.actions.length ? r.actions : ['Aucune mesure particulière relevée par ce pré-diagnostic.']).slice(0, 3).forEach(a => { y += 34; y = cadreTexte(x, '• ' + a, M, y, W - 2 * M, 28, '22px system-ui,sans-serif') - 6; });
  y += 40; x.fillStyle = '#06142e'; x.font = '700 34px system-ui,sans-serif'; x.fillText('Étapes obligatoires', M, y); y += 14; x.fillStyle = '#1a2030';
  r.etapes.forEach((e, i) => { y += 34; y = cadreTexte(x, (i + 1) + '. ' + e, M, y, W - 2 * M, 28, '22px system-ui,sans-serif') - 6; });
  y += 30; x.fillStyle = '#fff6d8'; x.fillRect(M, y, W - 2 * M, 130); x.fillStyle = '#5a4300'; cadreTexte(x, 'AVERTISSEMENT — Ce rapport est un pré-diagnostic fondé sur une photo et des réponses données sur place. Il ne remplace pas une étude géotechnique réalisée par un bureau d\'études ou un laboratoire agréé et ne vaut pas autorisation de construire.', M + 20, y + 38, W - 2 * M - 40, 30, '22px system-ui,sans-serif'); y += 150;
  const qc = document.createElement('canvas'); try { const q = qrcode(0, 'M'); q.addData(qrTexte(seal)); q.make(); const n = q.getModuleCount(), s = 6; qc.width = qc.height = (n + 2) * s; const qx = qc.getContext('2d'); qx.fillStyle = '#fff'; qx.fillRect(0, 0, qc.width, qc.height); qx.fillStyle = '#000'; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (q.isDark(a, b)) qx.fillRect((b + 1) * s, (a + 1) * s, s, s); x.drawImage(qc, M, y, 170, 170); } catch (e) {}
  x.fillStyle = '#06142e'; x.font = '700 26px system-ui,sans-serif'; x.fillText('Sceau d\'intégrité', M + 230, y + 34); x.fillStyle = '#1a2030'; x.font = '20px ui-monospace,Menlo,monospace'; cadreTexte(x, seal.hash, M + 230, y + 70, W - 2 * M - 230, 26, '20px ui-monospace,Menlo,monospace'); x.font = '22px system-ui,sans-serif'; x.fillText('Code de vérification : ' + seal.hash.slice(0, 12), M + 230, y + 140);
  const blob = StarPdf.construirePdf(pages, { format: 'a4', qualite: 0.85 }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Rapport-Terrain-Sur-' + seal.id + '.pdf'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); msg('Rapport PDF prêt.');
}
/* ---------- chantiers & journal ---------- */
function rendreChantiers() {
  const chs = J.chantiers(), j = J.tout();
  $('#liste-ch').innerHTML = chs.length ? chs.map(c => { const n = j.filter(e => e.chantier === c.id).length; return '<div class="ligne"><div class="pt" style="background:#0d2a5c"></div><div class="t"><b>' + esc(c.nom) + '</b>Ordre de service : ' + esc(c.os || '—') + ' · ' + n + ' relevé(s)<br>Point GPS : ' + c.lat + ', ' + c.lon + '</div></div>'; }).join('') : '<div class="boite" style="font-size:.88rem">Aucun chantier pour l\'instant. Créez-en un ci-dessus.</div>';
  const v = J.verifier(); $('#chaine-etat').innerHTML = v.n ? (v.ok ? '<span style="color:var(--ok)">✔ Chaîne intacte — ' + v.n + ' relevé(s)</span>' : '<span style="color:var(--ko)">✘ Falsification détectée au relevé n° ' + v.cassure + ' : ' + esc(v.raison) + '</span>') : 'Journal vide : scellez un premier relevé.';
  $('#chaine').innerHTML = j.map((e, i) => '<div class="mail' + (!v.ok && e.n >= v.cassure ? ' ko' : '') + '">#' + e.n + '<br>' + e.hash.slice(0, 6) + '</div>' + (i < j.length - 1 ? '<div class="lien"></div>' : '')).join('');
  const col = { favorable: '#1f8a4c', vigilance: '#d9a100', eleve: '#e07a1a', critique: '#c0392b' };
  $('#liste-rel').innerHTML = j.slice().reverse().map(e => '<div class="ligne">' + (e.thumb ? '<img src="' + e.thumb + '" alt="">' : '<div class="pt" style="background:' + col[e.niveau] + '"></div>') + '<div class="t"><b>' + esc(e.id) + ' — ' + esc(e.niveau) + ' (' + e.score + ')</b>' + esc(e.ville) + ' · ' + new Date(e.t).toLocaleDateString('fr-FR') + (e.flags && e.flags.length ? '<br><span style="color:var(--ko)">⚠ ' + e.flags.length + ' alerte(s)</span>' : '') + '</div></div>').join('');
}
$('#b-ch').onclick = () => { const nom = $('#ch-nom').value.trim(); if (!nom) { msg('Donnez un nom au chantier.'); return; } if (!S.gps) { msg('Position introuvable : autorisez la localisation puis réessayez.'); gps(); return; }
  const c = J.chantiers(); c.push({ id: 'CH-' + Date.now().toString(36).toUpperCase(), nom, os: $('#ch-os').value, lat: S.gps.lat, lon: S.gps.lon }); J.sauverChantiers(c); $('#ch-nom').value = ''; remplirChantiers(); rendreChantiers(); msg('Chantier créé à votre position.'); };
$('#b-verif-chaine').onclick = () => { rendreChantiers(); const v = J.verifier(); msg(v.n ? (v.ok ? 'Chaîne intacte.' : 'Falsification détectée.') : 'Journal vide.'); parler(v.n ? (v.ok ? 'La chaîne est intacte.' : 'Attention. Une falsification a été détectée.') : 'Le journal est vide.'); };
$('#b-faux').onclick = () => { if (J.simulerFalsification()) { rendreChantiers(); msg('Un relevé a été modifié en cachette : voyez la chaîne rougir.'); } else msg('Scellez d\'abord au moins un relevé.'); };
/* ---------- tableau de bord de l'État (fictif) ---------- */
let villeEtat = 'brazzaville'; let pts = [];
const COL = { favorable: '#1f8a4c', vigilance: '#d9a100', eleve: '#e07a1a', critique: '#c0392b' };
function rendreEtat() {
  const S2 = D.sites; const crit = S2.filter(s => s.niveau === 'critique').length, an = S2.filter(s => s.anomalies.length).length, susp = S2.filter(s => s.statut === 'Suspendu').length; const moy = Math.round(S2.reduce((a, s) => a + s.jours, 0) / S2.length);
  $('#kpi').innerHTML = [[S2.length, 'sites évalués'], [crit, 'terrains critiques'], [an, 'anomalies de fraude'], [moy + ' j', 'délai moyen d\'instruction']].map(k => '<div><b>' + k[0] + '</b><span>' + k[1] + '</span></div>').join('');
  $('#ong-ville').innerHTML = Object.keys(D.VILLES).map(k => '<button type="button" data-v="' + k + '" class="' + (k === villeEtat ? 'on' : '') + '">' + D.VILLES[k].nom + '</button>').join(''); $$('#ong-ville button').forEach(b => b.onclick = () => { villeEtat = b.dataset.v; rendreEtat(); });
  const cv = $('#plan'), x = cv.getContext('2d'), W = cv.width, H = cv.height; x.fillStyle = '#0b1a38'; x.fillRect(0, 0, W, H); x.strokeStyle = '#ffffff12'; x.lineWidth = 1; for (let i = 0; i <= W; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let i = 0; i <= H; i += 40) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
  const V = D.VILLES[villeEtat]; const ss = S2.filter(s => s.ville === villeEtat); pts = [];
  ss.forEach(s => { const px = 40 + (s.lon - (V.lon - V.ecart)) / (2 * V.ecart) * (W - 80), py = 40 + (1 - (s.lat - (V.lat - V.ecart)) / (2 * V.ecart)) * (H - 80); pts.push({ s, px, py }); x.beginPath(); x.arc(px, py, 11, 0, 7); x.fillStyle = COL[s.niveau] + 'cc'; x.fill(); x.lineWidth = 2; x.strokeStyle = '#fff'; x.stroke(); if (s.anomalies.length) { x.fillStyle = '#ffd466'; x.font = '16px system-ui'; x.fillText('◆', px + 10, py - 8); } });
  x.fillStyle = '#ffffffaa'; x.font = '600 15px system-ui'; x.fillText(V.nom + ' — plan schématique (positions fictives)', 14, 24);
  cv.onclick = e => { const r = cv.getBoundingClientRect(); const mx = (e.clientX - r.left) * W / r.width, my = (e.clientY - r.top) * H / r.height; let best = null, bd = 28; pts.forEach(p => { const d = Math.hypot(p.px - mx, p.py - my); if (d < bd) { bd = d; best = p; } }); const dd = $('#detail-site'); if (!best) { dd.style.display = 'none'; return; } const s = best.s;
    dd.style.display = 'block'; dd.innerHTML = '<b>' + s.id + '</b> <span class="demo">fictif</span><br>' + esc(D.VILLES[s.ville].nom) + ' · ' + s.zone + ' · ' + esc(s.type) + '<br>Niveau : <b style="color:' + COL[s.niveau] + '">' + s.niveau + '</b> (' + s.score + '/100) · Statut : ' + esc(s.statut) + ' · ' + s.jours + ' jours' + (s.anomalies.length ? '<br><span style="color:var(--ko)">⚠ ' + esc(s.anomalies[0].t) + '</span>' : ''); };
  const al = S2.filter(s => s.anomalies.length); $('#alertes').innerHTML = al.map(s => '<div class="ligne"><div class="pt" style="background:' + (s.anomalies[0].sev === 'haute' ? '#c0392b' : '#e07a1a') + '"></div><div class="t"><b>' + s.id + ' — ' + esc(s.anomalies[0].t) + '</b>' + esc(D.VILLES[s.ville].nom) + ' · ' + s.zone + ' · gravité ' + s.anomalies[0].sev + '</div></div>').join('') || '<div class="boite">Aucune alerte.</div>';
  $('#ch-demo').innerHTML = D.chantiers.map(c => '<div class="boite"><b>' + esc(c.nom) + '</b> <span class="demo">fictif</span><div class="barre"><span>Déclaré</span><div class="p"><i style="width:' + c.declare + '%;background:#0d2a5c"></i></div><em>' + c.declare + '%</em></div><div class="barre"><span>Constaté (photos)</span><div class="p"><i style="width:' + c.photos + '%;background:' + (c.declare - c.photos > 15 ? '#c0392b' : '#1f8a4c') + '"></i></div><em>' + c.photos + '%</em></div>' + (c.alerte ? '<div class="obs ko">⚠ ' + esc(c.alerte) + '</div>' : '<div class="obs ok">Cohérent.</div>') + '</div>').join('');
}
/* ---------- vérification ---------- */
function verifierCode(code) {
  let c = String(code || '').trim(); if (c.startsWith('TS1|')) c = c.split('|')[2] || ''; const e = J.trouver(c); const ch = J.verifier(); const o = $('#v-res');
  if (!c) { o.innerHTML = ''; return; }
  if (!e) { o.innerHTML = '<div class="verdict" style="background:#c0392b">Rapport introuvable sur cet appareil. Il est peut-être faux, ou fait sur un autre appareil.</div>'; parler('Rapport introuvable.'); return; }
  if (!ch.ok) { o.innerHTML = '<div class="verdict" style="background:#c0392b">⚠ ATTENTION — le journal de cet appareil a été falsifié (relevé n° ' + ch.cassure + '). Ne faites pas confiance à ce rapport.</div>'; parler('Attention. Falsification détectée.'); return; }
  o.innerHTML = '<div class="verdict" style="background:#1f8a4c">✔ Rapport authentique et intact</div><div class="boite"><b>' + esc(e.id) + '</b><br>' + esc(e.ville) + (e.quartier ? ' — ' + esc(e.quartier) : '') + ' · ' + esc(e.usage) + '<br>Niveau : <b style="color:' + COL[e.niveau] + '">' + esc(e.niveau) + '</b> (' + e.score + '/100)<br>' + new Date(e.t).toLocaleString('fr-FR') + '<br>' + (e.flags && e.flags.length ? '<span style="color:var(--ko)">⚠ ' + e.flags.length + ' alerte(s) de fraude enregistrée(s)</span>' : 'Aucune alerte de fraude.') + '</div>'; parler('Rapport authentique et intact.');
}
$('#b-v').onclick = () => verifierCode($('#v-code').value);
$('#f-qr').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); const k = Math.min(1, 900 / im.naturalWidth); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height); const q = window.jsQR && jsQR(d.data, c.width, c.height); if (q && q.data) { $('#v-code').value = q.data; verifierCode(q.data); } else msg('QR non lu : rapprochez-vous et refaites la photo.'); }; im.src = URL.createObjectURL(f); };
/* ---------- démonstration guidée ---------- */
async function demoGuidee() {
  try { $('#ville').value = 'brazzaville'; remplirLieu(); $('#quartier').value = 'Ngamakosso'; $('#usage').value = 'habitation'; parler('Démonstration. Je charge une photo d\'exemple : un terrain détrempé.');
    const r = await fetch('img/eau.jpg'); const bl = await r.blob(); await chargerFichier(new File([bl], 'eau.jpg', { type: 'image/jpeg', lastModified: Date.now() }), 'exemple');
    S.rep = { pente: 'marquee', eau: 'stagnante', ravine: 'proche', sol: 'sable', fissures: 'murs', voisins: 'abimees', eaucourante: 'moyen', remblai: 'naturel', drainage: 'vers', couvert: 'nu' }; }
  catch (e) { msg('Démonstration indisponible : ouvrez d\'abord l\'application une fois avec connexion.'); }
}
window.__ts = { demoGuidee, S: () => S, go };
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
