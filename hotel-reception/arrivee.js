/* CHECK-IN STAR — assistant d'arrivée : passeport → séjour → chambre → accusé QR. Prototype de démonstration. */
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const A = window.HApp, C = window.HChambres, J = window.HJournal, M = window.HMRZ; const esc = A.esc;
let S = null; function nouveau() { S = { p: null, flags: [], force: false, nuits: 3, du: C.auj(), au: C.addJ(C.auj(), 3), pref: 'auto', props: [], choix: 0, client: null, tarifNego: '' }; } nouveau();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const civ = p => p.sexe === 'F' ? 'Madame' : p.sexe === 'M' ? 'Monsieur' : '';
/* ---------- étapes ---------- */
function etape(n) { ['a1', 'a2', 'a3', 'a4'].forEach((id, i) => $('#' + id).hidden = i + 1 !== n); $$('#etapes div').forEach((d, i) => { d.className = i + 1 === n ? 'on' : i + 1 < n ? 'fait' : ''; }); window.scrollTo(0, 0); }
function nouvelleArrivee() { nouveau(); $('#mrz').value = ''; $('#a1-res').innerHTML = ''; $('#ocr-etat').textContent = ''; etape(1); }
/* ---------- 1 : pièce d'identité ---------- */
function exemple(k) {
  const a = new Date(); const dt = n => C.iso(new Date(a.getTime() + n * 86400000)); let txt;
  const base = { nom: 'Dupont', prenoms: 'Camille Marie', num: '19AB57284', naiss: '1988-06-23', sexe: 'F', pays: 'FRA', nat: 'FRA', exp: dt(1500) };
  if (k === 'ok') txt = M.buildTD3(base); else if (k === 'expire') txt = M.buildTD3(Object.assign({}, base, { nom: 'Okello', prenoms: 'Daniel', num: 'B4471920', sexe: 'M', pays: 'UGA', nat: 'UGA', exp: dt(-120) }));
  else { const l = M.buildTD3(Object.assign({}, base, { nom: 'Martins', prenoms: 'Paulo', num: 'CD2231908', sexe: 'M', pays: 'PRT', nat: 'PRT' })).split('\n'); l[1] = l[1].slice(0, 6) + String((+l[1][6] + 1) % 10) + l[1].slice(7); txt = l.join('\n'); }
  $('#mrz').value = txt; analyser();
}
function analyser() {
  const txt = $('#mrz').value.trim(); const box = $('#a1-res'); S.flags = []; S.p = null; if (!txt) { box.innerHTML = ''; return; }
  const p = M.parseMRZ(txt); if (!p.ok) { box.innerHTML = '<div class="alerte ko">' + esc(p.err) + '</div>'; return; }
  const a = C.auj(); const E = A.E(); S.p = p;
  if (!p.valide) S.flags.push({ sev: 'ko', t: 'Les chiffres de contrôle de la pièce sont faux : la pièce a peut-être été modifiée ou mal lue.', bloque: true });
  if (p.exp < a) S.flags.push({ sev: 'ko', t: 'Passeport expiré depuis le ' + A.fmtD(p.exp) + '.', bloque: true });
  if (E.clients.some(c => c.etat === 'present' && c.num === p.num)) S.flags.push({ sev: 'ko', t: 'Ce numéro de pièce est déjà en séjour dans l\'hôtel (chambre ' + E.clients.find(c => c.etat === 'present' && c.num === p.num).chambre + ').', bloque: true });
  const ok = S.flags.length === 0; const bloque = S.flags.some(f => f.bloque) && !S.force;
  box.innerHTML = '<div class="boite" style="margin-top:12px"><div style="display:flex;align-items:center;gap:8px"><b style="font:700 1.2rem var(--serif)">' + (ok ? '✔ Pièce lue et vérifiée' : '⚠ Pièce à contrôler') + '</b><span class="pill">' + esc(p.format) + '</span></div><div class="ident">' +
    [['Nom', p.nom], ['Prénoms', p.prenoms], ['Nationalité', p.nat], ['Naissance', A.fmtD(p.naiss) + ' ' + p.naiss.slice(0, 4)], ['Sexe', p.sexe || '—'], ['N° de pièce', A.masque(p.num)], ['Expire le', A.fmtD(p.exp) + ' ' + p.exp.slice(0, 4)], ['Délivré par', p.pays]].map(x => '<div><small>' + x[0] + '</small><b>' + esc(x[1]) + '</b></div>').join('') + '</div>' +
    '<div style="font-size:.8rem;color:var(--gris)">Contrôles : numéro ' + (p.checks.num ? '✔' : '✘') + ' · naissance ' + (p.checks.naiss ? '✔' : '✘') + ' · expiration ' + (p.checks.exp ? '✔' : '✘') + ' · total ' + (p.checks.global ? '✔' : '✘') + '</div></div>' +
    S.flags.map(f => '<div class="alerte ko">' + esc(f.t) + '</div>').join('') +
    '<div class="rang">' + (bloque ? '<button class="btn ko" id="a1-force" type="button">Contrôle manuel par un responsable</button>' : '') + '<button class="btn or" id="a1-suite" type="button"' + (bloque ? ' disabled' : '') + '>Continuer : le séjour →</button></div>';
  if (ok) A.parler('Passeport lu. Bienvenue ' + civ(p) + ' ' + p.nom.toLowerCase() + '.');
  const f = $('#a1-force'); if (f) f.onclick = () => { if (confirm('Un responsable confirme avoir contrôlé la pièce à la main. Cette décision sera inscrite dans le journal. Continuer ?')) { S.force = true; analyser(); } };
  const s = $('#a1-suite'); if (s) s.onclick = () => { etape(2); majSejour(); A.parler('Combien de nuits le client reste-t-il ?'); };
}
$('#mrz').addEventListener('input', () => { S.force = false; analyser(); });
$$('[data-ex]').forEach(b => b.onclick = () => { S.force = false; exemple(b.dataset.ex); });
async function depuisImage(f) {
  if (!f) return; const etat = $('#ocr-etat'); etat.textContent = 'Préparation de la lecture… (la première fois, quelques secondes)';
  const img = new Image(); img.onload = async () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(img.src);
    try { const t = await M.lireImage(c, etat); $('#mrz').value = t; S.force = false; etat.textContent = 'Lecture terminée. Vérifiez les lignes ci-dessous.'; analyser(); } catch (e) { etat.textContent = 'Lecture automatique impossible pour cette photo (floue, sombre ou reflets). Reprenez-la, ou saisissez les lignes à la main.'; } };
  img.src = URL.createObjectURL(f);
}
$('#f-cam').onchange = e => { depuisImage(e.target.files[0]); e.target.value = ''; }; $('#f-img').onchange = e => { depuisImage(e.target.files[0]); e.target.value = ''; };
/* ---------- 2 : séjour ---------- */
const NUITS = [1, 2, 3, 4, 5, 6, 7, 10, 14, 30];
$('#puces').innerHTML = NUITS.map(n => '<button type="button" data-n="' + n + '">' + n + '</button>').join('');
$('#types').innerHTML = '<button type="button" data-ty="auto" class="on"><b>Automatique</b><small>la meilleure chambre disponible</small></button>' + C.TYPES.map(t => '<button type="button" data-ty="' + t.id + '"><b>' + esc(t.court) + '</b><small>' + (t.usd ? 'dès ' + t.usd + ' $ / nuit' : 'sur devis') + '</small></button>').join('');
function majSejour() {
  const p = S.p; $('#a2-id').innerHTML = p ? '<b style="font:700 1.15rem var(--serif)">' + esc(civ(p)) + ' ' + esc(p.prenoms) + ' ' + esc(p.nom) + '</b> · ' + esc(p.nat) + ' · pièce ' + A.masque(p.num) : '';
  $('#du').value = S.du; $('#au').value = S.au; S.nuits = C.nuits(S.du, S.au); $$('#puces button').forEach(b => b.classList.toggle('on', +b.dataset.n === S.nuits));
  $$('#types button').forEach(b => b.classList.toggle('on', b.dataset.ty === S.pref));
}
$('#puces').onclick = e => { const b = e.target.closest('[data-n]'); if (!b) return; S.nuits = +b.dataset.n; S.au = C.addJ(S.du, S.nuits); majSejour(); };
$('#types').onclick = e => { const b = e.target.closest('[data-ty]'); if (!b) return; S.pref = b.dataset.ty; majSejour(); };
$('#du').onchange = () => { if ($('#du').value) { S.du = $('#du').value; if (S.au <= S.du) S.au = C.addJ(S.du, S.nuits || 1); majSejour(); } };
$('#au').onchange = () => { if ($('#au').value) { S.au = $('#au').value; majSejour(); } };
$('#a2-retour').onclick = () => etape(1);
$('#a2-suite').onclick = () => {
  const a = C.auj(); if (S.du < a) return A.toast('La date d\'arrivée ne peut pas être dans le passé.'); if (S.au <= S.du) return A.toast('La date de départ doit être après l\'arrivée.');
  S.nuits = C.nuits(S.du, S.au); S.adultes = +$('#adultes').value; S.tel = $('#tel').value.trim(); const E = A.E();
  S.props = C.proposer(E, { du: S.du, au: S.au, pref: S.pref, etageHaut: $('#haut').checked, pmr: $('#pmr').checked, adultes: S.adultes }); S.choix = 0; S.flagsSejour = [];
  if (S.p.exp < S.au) S.flagsSejour.push('La pièce expire pendant le séjour (le ' + A.fmtD(S.p.exp) + ').');
  etape(3); rChambre(true);
};
/* ---------- 3 : chambre ---------- */
function prix(prop) { const E = A.E(); const x = C.prixSejour(E, prop.type.id, S.nuits); return x; }
function rChambre(anim) {
  const box = $('#a3'); const pr = S.props[S.choix];
  if (!pr) { box.innerHTML = '<h2>Aucune chambre disponible</h2><div class="alerte ko">Aucune chambre ne correspond à ces dates et à ce type. Essayez d\'autres dates, une autre catégorie ou retirez une préférence.</div><div class="rang"><button class="btn cl" id="a3-retour" type="button">← Modifier le séjour</button></div>'; $('#a3-retour').onclick = () => etape(2); A.parler('Aucune chambre disponible pour ces dates.'); return; }
  const r = pr.chambre, t = pr.type, x = prix(pr);
  let h = '<h2>Chambre attribuée</h2><div class="chambre-carte"><img src="' + t.photo + '" alt=""><div class="in"><div class="num" id="num-roll">' + r.n + '</div><div style="flex:1;min-width:200px"><b style="font:700 1.35rem var(--serif)">' + esc(t.nom) + '</b>' + (pr.surclasse ? ' <span class="pill" style="background:#ffe9b3">Surclassement</span>' : '') + '<br><span style="color:#d5def7">Étage ' + r.etage + ' · ' + S.nuits + ' nuit(s) · du ' + A.fmtD(S.du) + ' au ' + A.fmtD(S.au) + '</span><br><span style="color:#d5def7;font-size:.85rem">' + esc(t.desc) + '</span></div></div></div>';
  h += '<div class="grid2" style="margin-top:12px"><div class="boite"><b>Pourquoi cette chambre ?</b>' + pr.raisons.map(z => '<p style="margin:6px 0;font-size:.86rem">• ' + esc(z) + '</p>').join('') + (S.flagsSejour.length ? S.flagsSejour.map(z => '<div class="alerte">' + esc(z) + '</div>').join('') : '') + '</div>';
  h += '<div class="boite"><b>Prix du séjour</b>';
  if (x.usdNuit != null) { h += '<p style="margin:6px 0">' + A.usd(x.usdNuit) + ' / nuit × ' + S.nuits + ' = <b style="font:700 1.4rem var(--serif)">' + A.usd(x.usd) + '</b></p>' + (x.fcfa != null ? '<p style="margin:2px 0">≈ <b>' + A.fcfa(x.fcfa) + '</b></p>' : '<p style="margin:2px 0;font-size:.8rem;color:var(--gris)">Total en FCFA : saisissez le taux du jour dans Tarifs.</p>'); }
  else h += '<p style="margin:6px 0">Tarif <b>sur devis</b> pour cette catégorie.</p><label class="ch" for="nego">Tarif convenu par nuit ($)</label><input id="nego" type="number" min="0" step="1" value="' + esc(S.tarifNego) + '">';
  h += '<small style="color:var(--gris)">Repère indicatif, taxes et frais non inclus : à confirmer par la direction.</small></div></div>';
  if (S.props.length > 1) h += '<h3>Autres chambres possibles</h3><div class="alt">' + S.props.map((p2, i) => '<button type="button" data-i="' + i + '" class="' + (i === S.choix ? 'on' : '') + '"><b>Chambre ' + p2.chambre.n + '</b><br><small>' + esc(p2.type.court) + ' · étage ' + p2.chambre.etage + '</small></button>').join('') + '</div>';
  h += '<div class="rang"><button class="btn cl" id="a3-retour" type="button">← Modifier le séjour</button><button class="btn or" id="a3-ok" type="button">✔ Confirmer et enregistrer</button></div>';
  box.innerHTML = h;
  if (anim) { const el = $('#num-roll'); let n = 0; const fin = r.n; const iv = setInterval(() => { n++; el.textContent = n < 12 ? String(100 * (1 + Math.floor(Math.random() * 12)) + Math.floor(Math.random() * 16)) : fin; if (n >= 12) clearInterval(iv); }, 70); A.parler('Je vous propose la chambre ' + fin.split('').join(' ') + ', ' + t.court + ', étage ' + r.etage + '.'); }
  $$('.alt [data-i]').forEach(b => b.onclick = () => { S.choix = +b.dataset.i; rChambre(false); });
  $('#a3-retour').onclick = () => etape(2); $('#a3-ok').onclick = confirmer; const ng = $('#nego'); if (ng) ng.oninput = () => { S.tarifNego = ng.value; };
}
/* ---------- confirmation : enregistrement automatique ---------- */
function confirmer() {
  const E = A.E(); const pr = S.props[S.choix]; const r = E.chambres.find(x => x.n === pr.chambre.n); const p = S.p; const a = C.auj();
  if (!C.libre(r, S.du, S.au, a)) { A.toast('Cette chambre vient d\'être prise : choisissez-en une autre.'); S.props = C.proposer(E, { du: S.du, au: S.au, pref: S.pref, adultes: S.adultes }); S.choix = 0; rChambre(false); return; }
  const x = C.prixSejour(E, pr.type.id, S.nuits); const id = 'SJ-' + Date.now().toString(36).toUpperCase(); const etat = S.du <= a ? 'present' : 'reserve';
  const alertes = S.flags.filter(f => f.bloque).map(f => f.t).concat(S.flagsSejour || []); if (S.force) alertes.push('Contrôle manuel d\'un responsable sur la pièce.'); if (pr.surclasse) alertes.push('Surclassement à valider par la direction.');
  const usdN = x.usdNuit != null ? x.usdNuit : (S.tarifNego ? Number(S.tarifNego) : null);
  const c = { id, nom: p.nom, prenoms: p.prenoms, nat: p.nat, doc: p.ptype, num: p.num, naiss: p.naiss, sexe: p.sexe, exp: p.exp, tel: S.tel || '', du: S.du, au: S.au, chambre: r.n, type: pr.type.id, etat, adultes: S.adultes, usd: usdN, fcfa: x.fcfaNuit, alertes, controle: p.valide, cree: new Date().toISOString(), demo: false };
  c.sceau = J.sha256(JSON.stringify([c.id, c.nom, c.prenoms, c.num, c.du, c.au, c.chambre, c.cree]));
  r.sejours.push({ id, du: S.du, au: S.au, etat }); E.clients.push(c);
  J.ajouter({ id: 'EV-' + id, t: c.cree, type: 'arrivee', sejour: id, chambre: r.n, du: S.du, au: S.au, pieceEmpreinte: J.sha256(p.num + '|' + p.naiss).slice(0, 16), initiales: (p.prenoms[0] || '') + (p.nom[0] || ''), forceResponsable: !!S.force });
  A.sauver(); S.client = c; etape(4); rAccuse(true); A.rafraichir();
}
/* ---------- 4 : accusé ---------- */
const qrTexte = c => 'HS1|' + c.id + '|' + c.chambre + '|' + c.du + '|' + c.au + '|' + c.sceau.slice(0, 12);
function qrSvg(txt, taille) { try { const q = qrcode(0, 'M'); q.addData(txt); q.make(); return q.createSvgTag(4, 0); } catch (e) { return ''; } }
function rAccuse(anim) {
  const c = S.client, E = A.E(), t = C.T[c.type]; const box = $('#a4'); const n = C.nuits(c.du, c.au);
  box.innerHTML = '<h2>Accusé de réception</h2><p style="color:var(--gris);margin:0 0 6px">Enregistrement terminé. Le client reçoit ce code QR sur son téléphone.</p>' +
    '<div class="carte-cle"><div class="bandeau" style="background-image:url(img/lustre.jpg)"></div><div class="c"><small style="color:#c3cdea;letter-spacing:.1em">' + esc(E.hotel.toUpperCase()) + '</small><h3>Bienvenue, ' + esc(c.prenoms.split(' ')[0]) + '</h3><div style="font:700 2.6rem var(--serif);color:#fff;line-height:1">Chambre ' + c.chambre + '</div><div style="color:#d5def7;font-size:.86rem">' + esc(t.court) + ' · ' + n + ' nuit(s)<br>du ' + A.fmtD(c.du) + ' au ' + A.fmtD(c.au) + '</div><div class="qr">' + qrSvg(qrTexte(c)) + '</div><small style="color:#c3cdea">Code ' + esc(c.id) + '</small></div></div>' +
    '<div class="rang" style="justify-content:center"><button class="btn or" id="a4-wa" type="button">💬 Envoyer sur WhatsApp</button><button class="btn" id="a4-partage" type="button">📤 Partager l\'image du QR</button></div>' +
    '<div class="rang" style="justify-content:center"><button class="btn cl pt" id="a4-png" type="button">⬇ Image (PNG)</button><button class="btn cl pt" id="a4-pdf" type="button">📄 Fiche d\'enregistrement + accusé (PDF)</button><button class="btn cl pt" id="a4-nouveau" type="button">＋ Nouvelle arrivée</button></div>' +
    '<div class="alerte">Ce prototype <b>ne contient pas encore de serrures connectées</b> : le QR est un accusé et une preuve de séjour (restaurant, spa, contrôle). L\'envoi sur WhatsApp ouvre la conversation avec le message prêt ; l\'envoi 100 % automatique demande un service officiel (WhatsApp Business ou SMS), à brancher ensuite.</div>';
  $('#a4-wa').onclick = () => { const tel = String(c.tel || '').replace(/\D/g, ''); const msg = 'Bonjour ' + c.prenoms.split(' ')[0] + ', bienvenue au ' + E.hotel + '. Votre chambre : ' + c.chambre + ' (' + t.court + '), du ' + A.fmtD(c.du) + ' au ' + A.fmtD(c.au) + '. Code de séjour : ' + c.id + '. Gardez le QR joint : il prouve votre séjour.'; if (!tel) A.toast('Aucun numéro WhatsApp saisi : le message s\'ouvre sans destinataire.'); window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(msg), '_blank'); };
  $('#a4-partage').onclick = async () => { const bl = await accusePNG(); const f = new File([bl], 'Accuse-' + c.id + '.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: 'Accusé de séjour', text: 'Chambre ' + c.chambre + ' — code ' + c.id }); } catch (e) { } } else A.toast('Le partage direct n\'est pas disponible ici : utilisez « Image (PNG) » puis envoyez-la.'); };
  $('#a4-png').onclick = async () => { const bl = await accusePNG(); telecharger(bl, 'Accuse-' + c.id + '.png'); }; $('#a4-pdf').onclick = pdfFiche; $('#a4-nouveau').onclick = nouvelleArrivee;
  if (anim) A.parler('Enregistrement terminé. ' + civ({ sexe: c.sexe }) + ' ' + c.nom.toLowerCase() + ', votre chambre est la ' + c.chambre.split('').join(' ') + ', pour ' + n + ' nuits. Le code QR est prêt.');
}
function telecharger(blob, nom) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
function chargerImg(src) { return new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }); }
function qrCanvas(txt, px) { const q = qrcode(0, 'M'); q.addData(txt); q.make(); const n = q.getModuleCount(), s = Math.floor(px / (n + 2)); const c = document.createElement('canvas'); c.width = c.height = (n + 2) * s; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#000'; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (q.isDark(a, b)) x.fillRect((b + 1) * s, (a + 1) * s, s, s); return c; }
function texte(x, t, px, py, larg, ih, police) { x.font = police; let l = '', y = py; String(t).split(' ').forEach(m => { const v = l ? l + ' ' + m : m; if (x.measureText(v).width > larg && l) { x.fillText(l, px, y); y += ih; l = m; } else l = v; }); if (l) { x.fillText(l, px, y); y += ih; } return y; }
async function dessinerAccuse(W, H) {
  const c = S.client, E = A.E(), t = C.T[c.type]; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'); const k = W / 1080; const sc = v => v * k;
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0a1730'); g.addColorStop(1, '#13285a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const im = await chargerImg('img/lustre.jpg'); if (im) { const h = sc(380); const r = Math.max(W / im.naturalWidth, h / im.naturalHeight); x.save(); x.beginPath(); x.rect(0, 0, W, h); x.clip(); x.drawImage(im, (W - im.naturalWidth * r) / 2, (h - im.naturalHeight * r) / 2, im.naturalWidth * r, im.naturalHeight * r); const gg = x.createLinearGradient(0, h * 0.4, 0, h); gg.addColorStop(0, 'rgba(10,23,48,0)'); gg.addColorStop(1, 'rgba(10,23,48,1)'); x.fillStyle = gg; x.fillRect(0, 0, W, h); x.restore(); }
  x.textAlign = 'center'; x.fillStyle = '#f2d27a'; x.font = '600 ' + sc(30) + 'px Georgia,serif'; x.fillText(E.hotel.toUpperCase(), W / 2, sc(300)); x.fillStyle = '#fff'; x.font = '700 ' + sc(64) + 'px Georgia,serif'; x.fillText('Bienvenue, ' + c.prenoms.split(' ')[0], W / 2, sc(400));
  x.fillStyle = '#f2d27a'; x.font = '700 ' + sc(150) + 'px Georgia,serif'; x.fillText('Chambre ' + c.chambre, W / 2, sc(560)); x.fillStyle = '#d5def7'; x.font = sc(36) + 'px system-ui,sans-serif'; x.fillText(t.nom + ' · étage ' + Math.floor(+c.chambre / 100), W / 2, sc(620)); x.fillText(C.nuits(c.du, c.au) + ' nuit(s) · du ' + A.fmtD(c.du) + ' au ' + A.fmtD(c.au) + ' ' + c.au.slice(0, 4), W / 2, sc(672));
  const q = qrCanvas(qrTexte(c), 640); x.fillStyle = '#fff'; const qs = sc(520); const qx = (W - qs) / 2; x.beginPath(); x.roundRect ? x.roundRect(qx - sc(20), sc(710), qs + sc(40), qs + sc(40), sc(28)) : x.rect(qx - sc(20), sc(710), qs + sc(40), qs + sc(40)); x.fill(); x.drawImage(q, qx, sc(730), qs, qs);
  x.fillStyle = '#c3cdea'; x.font = sc(30) + 'px ui-monospace,Menlo,monospace'; x.fillText('Code de séjour ' + c.id, W / 2, sc(1325)); x.font = sc(26) + 'px system-ui,sans-serif'; x.fillText('Présentez ce QR au restaurant, au spa ou à la réception.', W / 2, sc(1375)); x.fillText('Accusé généré par CHECK-IN STAR · STAR ENTREPRISE', W / 2, sc(1425));
  return cv;
}
async function accusePNG() { const cv = await dessinerAccuse(1080, 1500); return new Promise(ok => cv.toBlob(ok, 'image/png')); }
async function pdfFiche() {
  const c = S.client, E = A.E(), t = C.T[c.type]; const W = 1240, H = 1754, M2 = 80; const pages = [];
  const p1 = document.createElement('canvas'); p1.width = W; p1.height = H; const x = p1.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = '#0a1730'; x.fillRect(0, 0, W, 150); x.fillStyle = '#d9b25a'; x.fillRect(0, 150, W, 6);
  const lg = await chargerImg('icon-192.png'); if (lg) x.drawImage(lg, M2, 28, 94, 94); x.fillStyle = '#fff'; x.font = '700 44px Georgia,serif'; x.fillText('CHECK-IN STAR', M2 + 114, 78); x.fillStyle = '#f2d27a'; x.font = '24px system-ui'; x.fillText(E.hotel, M2 + 114, 112);
  let y = 230; x.fillStyle = '#0a1730'; x.font = '700 50px Georgia,serif'; x.fillText('Fiche d\'enregistrement du séjour', M2, y); y += 40; x.fillStyle = '#646b80'; x.font = '24px system-ui'; x.fillText('N° ' + c.id + ' · établie le ' + new Date(c.cree).toLocaleString('fr-FR'), M2, y); y += 50;
  const bloc = (titre, lignes) => { x.fillStyle = '#0a1730'; x.font = '700 32px Georgia,serif'; x.fillText(titre, M2, y); y += 12; x.fillStyle = '#d9b25a'; x.fillRect(M2, y, W - 2 * M2, 3); y += 14; lignes.forEach(l => { y += 38; x.fillStyle = '#646b80'; x.font = '24px system-ui'; x.fillText(l[0], M2, y); x.fillStyle = '#1b2030'; x.font = '600 26px system-ui'; x.fillText(l[1], M2 + 330, y); }); y += 60; };
  bloc('Identité du client', [['Nom', c.nom], ['Prénoms', c.prenoms], ['Date de naissance', c.naiss], ['Sexe', c.sexe || '—'], ['Nationalité', c.nat], ['Pièce', c.doc + ' n° ' + c.num], ['Expiration de la pièce', c.exp], ['Contrôle de la pièce', c.controle ? 'Réussi (chiffres de contrôle conformes)' : 'À contrôler à la main']]);
  bloc('Séjour', [['Arrivée', c.du], ['Départ', c.au], ['Durée', C.nuits(c.du, c.au) + ' nuit(s)'], ['Personnes', String(c.adultes)], ['Chambre', c.chambre + ' — ' + t.nom], ['WhatsApp', c.tel || 'non communiqué'], ['Tarif / nuit', c.usd != null ? c.usd + ' $ (hors taxes)' : 'à convenir']]);
  if (c.alertes.length) { x.fillStyle = '#fdecea'; x.fillRect(M2, y - 10, W - 2 * M2, 40 + c.alertes.length * 34); x.fillStyle = '#7d2218'; x.font = '700 24px system-ui'; x.fillText('Points d\'attention', M2 + 16, y + 20); c.alertes.forEach((a, i) => { x.font = '22px system-ui'; x.fillText('• ' + a, M2 + 16, y + 52 + i * 32); }); y += 70 + c.alertes.length * 34; }
  y = Math.max(y + 20, 1330); x.fillStyle = '#1b2030'; x.font = '24px system-ui'; x.fillText('Signature du client :', M2, y); x.fillText('Signature de la réception :', W / 2 + 20, y); x.strokeStyle = '#888'; x.lineWidth = 2; x.strokeRect(M2, y + 20, W / 2 - 120, 130); x.strokeRect(W / 2 + 20, y + 20, W / 2 - 100, 130);
  x.fillStyle = '#646b80'; x.font = '20px system-ui'; texte(x, 'Modèle de fiche à faire valider avec les autorités compétentes et un conseil juridique avant tout usage officiel. Les données de la pièce ne sont conservées que sur cet appareil dans ce prototype.', M2, H - 80, W - 2 * M2, 26, '20px system-ui'); pages.push({ canvas: p1 });
  const p2 = await dessinerAccuse(W, H); pages.push({ canvas: p2 });
  const blob = StarPdf.construirePdf(pages, { format: 'a4', qualite: 0.85 }); telecharger(blob, 'Fiche-sejour-' + c.id + '.pdf'); A.toast('Fiche PDF prête (page 1 : archive de l\'hôtel · page 2 : accusé du client).');
}
/* ---------- démonstration automatique ---------- */
async function demoAuto() {
  A.go('arrivee'); nouvelleArrivee(); await sleep(900); exemple('ok'); await sleep(2600); const s = $('#a1-suite'); if (!s) return; s.click(); await sleep(1400);
  $('#tel').value = '+242 06 000 00 00'; $('#puces [data-n="3"]').click(); await sleep(1200); $('#types [data-ty="business"]').click(); await sleep(1400); $('#a2-suite').click(); await sleep(3600); const ok = $('#a3-ok'); if (ok) ok.click();
}
$('#b-demo').onclick = demoAuto;
window.__h = { S: () => S, exemple, demoAuto, nouvelleArrivee };
})();
