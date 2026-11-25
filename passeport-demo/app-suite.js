/* Passeport Sûr — suite : signature tactile, photo, accusé WhatsApp + QR, caisse, file d'attente et écran de salle. */
(function () {
'use strict';
const A = window.__spApi; if (!A) return;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const { esc, fmtD, fmtDH, pad, T, NOW, DAY, serviceDay, SN, TN, KN } = A;
let role = A.role;
const DB = () => A.DB;
const nomComplet = d => d.person.nom + ' ' + d.person.prenoms;

/* ---------- Images : réduction pour garder l'application légère ---------- */
function reduire(src, w, h, q, mode) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  if (mode === 'cover') { const k = Math.max(w / sw, h / sh), dw = sw * k, dh = sh * k; x.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh); }
  else { const k = Math.min(w / sw, h / sh); c.height = Math.round(sh * k); c.width = Math.round(sw * k); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); }
  return c.toDataURL('image/jpeg', q);
}
const svgUrl = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
const SIL = svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><rect width="120" height="150" fill="#dcd6c3"/><circle cx="60" cy="56" r="24" fill="#aaa38b"/><path d="M14 150c2-36 22-52 46-52s44 16 46 52z" fill="#aaa38b"/></svg>');
const PIECE_PH = svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150"><rect width="240" height="150" rx="10" fill="#efe9d4"/><rect x="14" y="16" width="50" height="62" rx="4" fill="#cfc8b0"/><g fill="#cfc8b0"><rect x="78" y="22" width="140" height="9"/><rect x="78" y="40" width="110" height="9"/><rect x="78" y="58" width="130" height="9"/></g><g fill="#b9b196"><rect x="14" y="106" width="212" height="8"/><rect x="14" y="122" width="212" height="8"/></g><text x="120" y="96" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#8b856f">pièce scannée (exemple)</text></svg>');
function signatureDemo(id) { let h = 11; for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0; const r = n => ((h = (h * 1103515245 + 12345) >>> 0) % n);
  let d = 'M12 ' + (60 + r(20)); for (let k = 0; k < 6; k++) d += ' C' + (30 + k * 28 + r(10)) + ' ' + (10 + r(80)) + ' ' + (40 + k * 28 + r(12)) + ' ' + (20 + r(80)) + ' ' + (50 + k * 28) + ' ' + (45 + r(40));
  return svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><path d="' + d + '" fill="none" stroke="#14327a" stroke-width="2.6" stroke-linecap="round"/><path d="M20 84 H180" stroke="#14327a" stroke-opacity=".35" stroke-width="1.5"/></svg>'); }

/* ---------- Signature tactile (doigt ou stylet) ---------- */
const cv = $('#sigPad'), cx = cv.getContext('2d'); cv.width = 800; cv.height = 300; cv.style.height = 'auto'; cv.style.aspectRatio = '8 / 3';
let dessin = false, encre = 0, last = null; const extra = { visage: null };
function raz() { cx.clearRect(0, 0, cv.width, cv.height); encre = 0; cv.classList.remove('ok'); $('#sigEtat').textContent = 'Faites signer dans le cadre ci-dessus.'; }
function pos(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); dessin = true; last = pos(e); cx.beginPath(); cx.fillStyle = '#14327a'; cx.arc(last[0], last[1], 2.4, 0, 7); cx.fill(); });
cv.addEventListener('pointermove', e => { if (!dessin) return; e.preventDefault(); const p = pos(e); const lw = e.pointerType === 'pen' ? 1.8 + (e.pressure || .5) * 4 : 4.2;
  cx.strokeStyle = '#14327a'; cx.lineWidth = lw * (cv.width / 800) * 1.2; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.beginPath(); cx.moveTo(last[0], last[1]); cx.lineTo(p[0], p[1]); cx.stroke();
  encre += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p; if (encre > 90) { cv.classList.add('ok'); $('#sigEtat').textContent = '✔ Signature enregistrée dans la fiche.'; } });
['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, () => { dessin = false; }));
$('#bSigEff').onclick = raz;
const aSignature = () => encre > 90;
function signaturePng() { const c = document.createElement('canvas'); c.width = 400; c.height = 150; c.getContext('2d').drawImage(cv, 0, 0, 400, 150); return c.toDataURL('image/png'); }

/* ---------- Photo du demandeur ---------- */
const fv = $('#fileVisage');
$('#bPhoto').onclick = () => { fv.setAttribute('capture', 'user'); fv.click(); };
$('#bPhotoFichier').onclick = () => { fv.removeAttribute('capture'); fv.click(); };
fv.onchange = e => { const f = e.target.files[0]; if (!f) return; const im = new Image(); im.onload = () => { extra.visage = reduire(im, 240, 300, .72, 'cover'); $('#prevVisage').style.backgroundImage = 'url(' + extra.visage + ')'; URL.revokeObjectURL(im.src); }; im.src = URL.createObjectURL(f); };
function pieceScannee() { const c = $('#snap'); if (!c || (c.width === 300 && c.height === 150)) return null; return reduire(c, 520, 330, .62, 'contain'); }
function extras() { return { photos: { visage: extra.visage, piece: pieceScannee(), signature: signaturePng() } }; }
function reset() { raz(); extra.visage = null; $('#prevVisage').style.backgroundImage = ''; fv.value = ''; }

/* ---------- Accusé WhatsApp avec code QR ---------- */
const chiffres = t => String(t || '').replace(/\D/g, '');
function qrGif(txt, cell) { try { const q = qrcode(0, 'M'); q.addData(txt); q.make(); return q.createDataURL(cell || 6, 2); } catch (e) { return ''; } }
function lienSuivi(d) { return location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html?suivi=' + encodeURIComponent(d.id) + '&code=' + A.code(d.id, d.person.nom); }
function texteWA(d) { return '*Passeport Sûr — Accusé d’enregistrement*\n\nBonjour ' + d.person.prenoms + ',\nvotre dossier est bien enregistré.\n\nN° de reçu : *' + d.id + '*\nCode de contrôle : *' + A.code(d.id, d.person.nom) + '*\n\nPrésentez ce reçu (et le code QR) à la caisse de la Préfecture de Brazzaville pour effectuer le paiement.\n\nSuivi de votre dossier : ' + lienSuivi(d); }
function accuse(d) {
  const h = NOW(), hh = pad(h.getHours()) + ':' + pad(h.getMinutes());
  return '<div class="wa noprint"><div class="tete"><i>✆</i> Accusé envoyé au ' + esc(d.person.tel || 'numéro du demandeur') + '</div>' +
    '<div class="bulle"><b>Passeport Sûr — Accusé d’enregistrement</b>\nBonjour ' + esc(d.person.prenoms) + ', votre dossier est bien enregistré.\nN° de reçu : <b>' + d.id + '</b>\nPrésentez ce code QR à la caisse de la Préfecture pour le paiement.' +
    '<img src="' + qrGif('PSR1|' + d.id + '|' + A.code(d.id, d.person.nom), 6) + '" alt="Code QR de l’accusé"><div class="heure">' + hh + ' ✓✓</div></div>' +
    '<div class="ligne" style="margin-top:10px"><a class="btn vert petit" id="bWA" href="https://wa.me/' + chiffres(d.person.tel) + '?text=' + encodeURIComponent(texteWA(d)) + '" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block">📲 Envoyer sur WhatsApp</a><button class="btn clair petit" id="bQRdl">⬇ Télécharger le QR</button></div>' +
    '<p class="sous" style="font-size:12px;margin:8px 0 0">Dans la démonstration, touchez « Envoyer » : WhatsApp s’ouvre avec le message prêt. En service réel, l’envoi est automatique à chaque enregistrement (API WhatsApp Business).</p></div>';
}
function telecharger(nom, url) { const a = document.createElement('a'); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); }
function qrPng(txt, nom) { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width * 2; c.height = im.height * 2; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); telecharger(nom, c.toDataURL('image/png')); }; im.src = qrGif(txt, 10); }
function lierAccuse(d) {
  const b = $('#bQRdl'); if (b) b.onclick = () => qrPng('PSR1|' + d.id + '|' + A.code(d.id, d.person.nom), 'Accuse-' + d.id + '.png');
  const w = $('#bWA'); if (w) w.addEventListener('click', () => { const dd = DB().find(x => x.id === d.id); if (!dd) return; dd.whatsapp = { at: NOW().toISOString() }; dd.history.push({ s: dd.status, at: NOW().toISOString(), by: 'Système', note: 'Accusé WhatsApp envoyé au ' + (dd.person.tel || '') }); A.sauver(); });
}

/* ---------- Pièces, signature, paiement dans la fiche dossier ---------- */
function piecesHtml(d) {
  const ph = d.photos || {};
  let h = '<h3 style="font-size:16px">Pièces et signature</h3><div class="pieces"><figure><img src="' + (ph.visage || SIL) + '" alt="Photo"><figcaption>Photo' + (ph.visage ? '' : ' (exemple)') + '</figcaption></figure>' +
    '<figure><img src="' + (ph.piece || PIECE_PH) + '" alt="Pièce"><figcaption>Pièce scannée' + (ph.piece ? '' : ' (exemple)') + '</figcaption></figure>' +
    '<figure><img src="' + (ph.signature || signatureDemo(d.id)) + '" alt="Signature" style="background:#fff"><figcaption>Signature' + (ph.signature ? '' : ' (exemple)') + '</figcaption></figure></div>';
  if (d.paiement) h += '<h3 style="font-size:16px">Paiement et appel</h3><dl class="dl"><dt>Reçu de paiement</dt><dd><b>' + esc(d.paiement.recu) + '</b> · ' + fmtDH(d.paiement.at) + '</dd><dt>Montant</dt><dd>' + Number(d.paiement.montant).toLocaleString('fr-FR') + ' FCFA · ' + esc(d.paiement.mode) + ' <small>(montant fictif de démonstration)</small></dd><dt>N° d’appel</dt><dd><b>' + pad(d.ticket || 0, 3) + '</b>' + (d.appel ? ' · appelé à la porte ' + d.appel.porte + ' à ' + fmtDH(d.appel.at) : ' · en attente d’appel') + '</dd></dl>';
  if (d.whatsapp) h += '<div class="alert vert">✔ Accusé WhatsApp envoyé le ' + fmtDH(d.whatsapp.at) + '.</div>';
  return h;
}

/* ---------- Caisse ---------- */
const jourCourant = () => serviceDay(NOW().getTime());
function paiementsDuJour() { return DB().filter(d => d.paiement && serviceDay(T(d.paiement.at)) === jourCourant()).sort((a, b) => b.paiement.at.localeCompare(a.paiement.at)); }
function caisse() {
  const pj = paiementsDuJour(), tot = pj.reduce((a, d) => a + Number(d.paiement.montant), 0), att = DB().filter(d => d.status === 'depose');
  const bloques = att.filter(d => A.flags(d).some(f => f.n === 'rouge') && !d.suite).length;
  $('#kpisCaisse').innerHTML = [[pj.length, 'Paiements du jour', 'v'], [tot.toLocaleString('fr-FR'), 'Total encaissé (FCFA, fictif)', 'j'], [att.length, 'Dossiers en attente de paiement', ''], [bloques, 'Encaissements bloqués (alerte)', 'r']].map(k => '<div class="kpi ' + k[2] + '"><b>' + k[0] + '</b><span>' + k[1] + '</span></div>').join('');
  $('#tbCaisse').innerHTML = pj.slice(0, 25).map(d => { const h = new Date(d.paiement.at); return '<tr class="cl" data-id="' + d.id + '"><td>' + pad(h.getHours()) + ':' + pad(h.getMinutes()) + '</td><td><b>' + pad(d.ticket, 3) + '</b></td><td>' + esc(d.paiement.recu) + '</td><td>' + esc(nomComplet(d)) + '</td><td>' + esc(d.paiement.mode) + '</td><td>' + Number(d.paiement.montant).toLocaleString('fr-FR') + '</td></tr>'; }).join('') || '<tr><td colspan="6" style="color:var(--gris)">Aucun paiement pour l’instant.</td></tr>';
}
let flux = null, boucle = null;
function arretScan() { if (flux) flux.getTracks().forEach(t => t.stop()); flux = null; cancelAnimationFrame(boucle); $('#scanBox').classList.remove('on'); $('#bScanStop').style.display = 'none'; }
async function lancerScan() {
  try { flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); const v = $('#scanVid'); v.srcObject = flux; await v.play(); $('#scanBox').classList.add('on'); $('#bScanStop').style.display = ''; $('#scanEtat').textContent = 'Placez le code QR de l’accusé devant la caméra…';
    const cvs = $('#scanCv'), x = cvs.getContext('2d', { willReadFrequently: true });
    const tick = () => { if (!flux) return; if (v.readyState >= 2) { cvs.width = 480; cvs.height = Math.round(480 * v.videoHeight / v.videoWidth) || 360; x.drawImage(v, 0, 0, cvs.width, cvs.height); const im = x.getImageData(0, 0, cvs.width, cvs.height); const r = window.jsQR && jsQR(im.data, im.width, im.height); if (r && r.data) { const ok = lireQR(r.data); if (ok) { arretScan(); return; } } } boucle = requestAnimationFrame(tick); };
    tick();
  } catch (e) { $('#scanEtat').textContent = 'Caméra indisponible ici : saisissez le N° de reçu et le code, ou utilisez l’exemple.'; }
}
function lireQR(txt) { const p = String(txt).split('|'); if (p[0] === 'PSR1' && p[1]) { $('#k_id').value = p[1]; $('#k_code').value = p[2] || ''; ouvrirCaisse(); return true; } if (p[0] === 'PSR2' && p[3]) { $('#k_id').value = p[3]; $('#k_code').value = ''; ouvrirCaisse(true); return true; } return false; }
function ouvrirCaisse(sansCode) {
  const id = $('#k_id').value.trim().toUpperCase(), cd = $('#k_code').value.trim().toUpperCase(), box = $('#caisseRes'), d = DB().find(x => x.id === id);
  if (!d || (!sansCode && A.code(d.id, d.person.nom) !== cd)) { box.innerHTML = '<div class="alert rouge">Reçu introuvable ou code incorrect. Vérifiez l’accusé du demandeur.</div>'; return; }
  $('#scanEtat').textContent = '';
  const ph = d.photos || {}, f = A.flags(d), bloque = f.some(x => x.n === 'rouge') && !d.suite, peut = role === 'caisse' || role === 'prefecture';
  let pay = '';
  if (d.paiement) pay = '<div class="alert vert"><b>Déjà payé</b> le ' + fmtDH(d.paiement.at) + ' · reçu ' + esc(d.paiement.recu) + ' · <b>N° d’appel ' + pad(d.ticket, 3) + '</b></div><div class="ligne"><button class="btn clair" id="bReimp">🖨 Réimprimer le reçu de paiement</button></div>';
  else if (bloque) pay = '<div class="alert rouge"><b>Encaissement bloqué.</b> Ce dossier a une alerte grave non examinée. La Préfecture doit l’examiner avant le paiement.</div>' + (role === 'prefecture' ? '<div class="ligne"><button class="btn clair" id="bDebloque">✔ Alerte examinée : autoriser l’encaissement</button></div>' : '');
  else if (peut) pay = '<h3 style="font-size:16px;margin-top:6px">Encaisser</h3><div class="grille"><div class="c6"><label for="k_montant">Montant encaissé (FCFA)</label><input id="k_montant" type="number" inputmode="numeric" min="1" placeholder="Saisir le montant"></div><div class="c6"><label for="k_mode">Mode de paiement</label><select id="k_mode"><option>Espèces</option><option>Mobile Money MTN</option><option>Mobile Money Airtel</option></select></div></div>' +
    '<p class="sous" style="margin:6px 0 0;font-size:12.5px">Le montant est celui fixé par l’administration. Dans la démonstration, saisissez un montant fictif.</p><div class="ligne" style="margin-top:10px"><button class="btn vert" id="bPayer">Encaisser et éditer le reçu de paiement</button></div><div id="payMsg"></div>';
  box.innerHTML = '<div class="carte"><div class="ligne" style="align-items:flex-start;gap:14px"><div class="visage" style="background-image:url(' + (ph.visage || SIL) + ')"></div><div style="flex:1 1 220px"><h3 style="margin-bottom:4px">' + esc(nomComplet(d)) + '</h3><div>' + A.bT(d.type) + ' ' + A.bS(d.status) + '</div>' +
    '<p style="margin:6px 0 0;color:var(--gris);font-size:14px">N° de reçu <b>' + d.id + '</b> · né(e) le ' + fmtD(d.person.naissance) + '<br>' + (d.person.piece.type === 'CNI' ? 'Carte d’identité' : 'Passeport') + ' n° ' + esc(d.person.piece.numero) + ' · tél. ' + esc(d.person.tel || '—') + '</p>' +
    (d.ancien ? '<p style="margin:4px 0 0;font-size:13.5px">Ancien passeport n° <b>' + esc(d.ancien.numero) + '</b> (expiré le ' + fmtD(d.ancien.expiration) + ')</p>' : '') + '</div></div>' +
    f.map(x => '<div class="alert ' + (x.n === 'rouge' ? 'rouge' : 'orange') + '"><b>' + KN[x.k] + '</b> — ' + esc(x.t) + '</div>').join('') + piecesHtml(d) + pay + '</div>';
  const bp = $('#bPayer'); if (bp) bp.onclick = () => payer(d);
  const bd = $('#bDebloque'); if (bd) bd.onclick = () => { d.suite = 'verifie'; d.suiteAt = NOW().toISOString(); d.history.push({ s: d.status, at: NOW().toISOString(), by: 'Préfecture', note: 'Alerte examinée avant encaissement' }); A.sauver(); ouvrirCaisse(sansCode); };
  const br = $('#bReimp'); if (br) br.onclick = () => recuPaiement(d);
}
function payer(d) {
  const m = Number($('#k_montant').value), mode = $('#k_mode').value;
  if (!(m > 0)) { $('#payMsg').innerHTML = '<div class="alert rouge">Saisissez le montant encaissé.</div>'; return; }
  const now = NOW(), jc = serviceDay(now.getTime()), pj = DB().filter(x => x.paiement && serviceDay(T(x.paiement.at)) === jc), ticket = pj.reduce((a, x) => Math.max(a, x.ticket || 0), 0) + 1;
  const rp = DB().reduce((a, x) => Math.max(a, x.paiement ? Number(String(x.paiement.recu).split('-').pop()) : 0), 0) + 1;
  d.status = 'paye'; d.ticket = ticket; d.paiement = { montant: m, mode, at: now.toISOString(), caissier: 'Caisse', recu: 'RP-' + now.getFullYear() + '-' + pad(rp, 6) };
  d.history.push({ s: 'paye', at: now.toISOString(), by: 'Caisse', note: 'Paiement ' + m.toLocaleString('fr-FR') + ' FCFA — ' + mode });
  A.sauver(); ouvrirCaisse(true); caisse(); majPastille(); recuPaiement(d);
}
function recuPaiement(d) {
  const p = d.paiement, msg = '*Passeport Sûr — Paiement enregistré*\n\nReçu de paiement : *' + p.recu + '*\nVotre N° d’appel : *' + pad(d.ticket, 3) + '*\n\nRestez dans la salle d’attente et surveillez les écrans : votre numéro, votre nom et la porte s’afficheront.';
  $('#feuille').innerHTML = '<div class="recu"><img class="lg" src="logo.svg" alt=""><div style="font-size:12px;letter-spacing:.14em;color:var(--gris)">REÇU DE PAIEMENT — DÉMONSTRATION</div><div class="num">' + esc(p.recu) + '</div>' +
    '<div style="margin:10px 0 2px;font-size:12px;letter-spacing:.12em;color:var(--gris)">VOTRE N° D’APPEL</div><div class="gros">' + pad(d.ticket, 3) + '</div>' + A.qr('PSR2|' + p.recu + '|' + d.ticket + '|' + d.id) +
    '<dl class="dl" style="text-align:left"><dt>Demandeur</dt><dd>' + esc(nomComplet(d)) + '</dd><dt>Dossier</dt><dd>' + d.id + ' · ' + TN[d.type] + '</dd><dt>Payé</dt><dd>' + Number(p.montant).toLocaleString('fr-FR') + ' FCFA · ' + esc(p.mode) + ' <small>(fictif)</small></dd><dt>Date</dt><dd>' + fmtDH(p.at) + '</dd></dl>' +
    '<div style="font-size:13.5px"><b>Asseyez-vous dans la salle d’attente.</b> Quand votre numéro s’affiche à l’écran avec votre nom, levez-vous et allez à la porte indiquée.</div></div>' +
    '<div class="ligne noprint" style="margin-top:12px"><button class="btn or" onclick="window.print()">🖨 Imprimer le reçu</button><a class="btn vert" style="text-decoration:none;display:inline-block" target="_blank" rel="noopener" href="https://wa.me/' + chiffres(d.person.tel) + '?text=' + encodeURIComponent(msg) + '">📲 Envoyer le N° d’appel par WhatsApp</a><button class="btn clair" id="bFerme">Fermer</button></div>';
  $('#tiroir').classList.add('on'); $('#bFerme').onclick = () => $('#tiroir').classList.remove('on');
}
function exempleCaisse() { const d = DB().filter(x => x.status === 'depose' && !A.flags(x).some(f => f.n === 'rouge')).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || DB().filter(x => x.status === 'depose')[0]; if (!d) { $('#scanEtat').textContent = 'Aucun dossier en attente de paiement.'; return; } $('#k_id').value = d.id; $('#k_code').value = A.code(d.id, d.person.nom); ouvrirCaisse(); }

/* ---------- File d'attente et appel ---------- */
const rang = d => d.rang != null ? d.rang : d.ticket;
function file() { return DB().filter(d => d.status === 'paye' && d.paiement && serviceDay(T(d.paiement.at)) === jourCourant()).sort((a, b) => rang(a) - rang(b)); }
function appelsDuJour() { return DB().filter(d => d.appel && serviceDay(T(d.appel.at)) === jourCourant()).sort((a, b) => b.appel.at.localeCompare(a.appel.at)); }
function vueFile() {
  const q = file(), ap = appelsDuJour(), now = NOW().getTime(), att = q.length ? Math.round(q.reduce((a, d) => a + (now - T(d.paiement.at)) / 60000, 0) / q.length) : 0;
  $('#kpisFile').innerHTML = [[q.length, 'En attente', 'j'], [q[0] ? pad(q[0].ticket, 3) : '—', 'Prochain numéro', 'v'], [ap.length, 'Appelés aujourd’hui', ''], [att + ' min', 'Attente moyenne', 'm']].map(k => '<div class="kpi ' + k[2] + '"><b>' + k[0] + '</b><span>' + k[1] + '</span></div>').join('');
  $('#tbFile').innerHTML = q.slice(0, 14).map((d, i) => '<tr class="cl" data-id="' + d.id + '"><td><b class="ticket" style="font-size:20px">' + pad(d.ticket, 3) + '</b></td><td>' + esc(nomComplet(d)) + '</td><td>' + A.bT(d.type) + '</td><td>' + Math.round((now - T(d.paiement.at)) / 60000) + ' min</td></tr>').join('') || '<tr><td colspan="4" style="color:var(--gris)">Personne n’attend pour l’instant.</td></tr>';
  const ro = role === 'ministere'; ['bAppeler', 'bRappeler', 'bAbsent'].forEach(i => { $('#' + i).disabled = ro; });
}
function msgAppel(h, cl) { const e = $('#appelEtat'); e.style.display = ''; e.className = 'alert ' + (cl || 'bleu'); e.innerHTML = h; }
function appeler() {
  const q = file(); if (!q.length) { msgAppel('Personne n’attend pour l’instant.', 'orange'); return; }
  const d = q[0], porte = +$('#selPorte').value, now = NOW().toISOString();
  d.status = 'recu'; d.appel = { porte, at: now }; d.history.push({ s: 'recu', at: now, by: 'Porte ' + porte, note: 'Appelé en salle' });
  A.sauver(); vueFile(); msgAppel('🔔 <b>N° ' + pad(d.ticket, 3) + '</b> · ' + esc(nomComplet(d)) + ' → <b>Porte ' + porte + '</b> (affiché sur les écrans de la salle)', 'vert'); majPastille();
}
function rappeler() { const l = appelsDuJour()[0]; if (!l) { msgAppel('Aucun appel à répéter.', 'orange'); return; } l.appel.at = NOW().toISOString(); l.history.push({ s: l.status, at: l.appel.at, by: 'Porte ' + l.appel.porte, note: 'Appel répété' }); A.sauver(); msgAppel('🔔 Appel répété : N° ' + pad(l.ticket, 3) + ' → Porte ' + l.appel.porte, 'vert'); }
function absent() {
  const porte = +$('#selPorte').value, l = appelsDuJour().find(x => x.appel.porte === porte && x.status === 'recu') || appelsDuJour().find(x => x.status === 'recu'); if (!l) { msgAppel('Aucune personne appelée à renvoyer.', 'orange'); return; }
  const max = DB().reduce((a, x) => Math.max(a, x.rang != null ? x.rang : (x.ticket || 0)), 0);
  l.status = 'paye'; l.rang = max + 1; delete l.appel; l.history.push({ s: 'paye', at: NOW().toISOString(), by: 'Porte ' + porte, note: 'Absent à l’appel — renvoyé en fin de file' }); A.sauver(); vueFile(); msgAppel('N° ' + pad(l.ticket, 3) + ' absent : renvoyé en fin de file.', 'orange');
}
function majPastille() { /* la pastille d'alertes est gérée par l'application principale */ }

/* ---------- Branchements ---------- */
function render(v) { if (v === 'caisse') caisse(); if (v === 'file') vueFile(); }
$('#bScanCaisse').onclick = lancerScan; $('#bScanStop').onclick = arretScan; $('#bScanEx').onclick = exempleCaisse; $('#bCaisseOuvrir').onclick = () => ouvrirCaisse();
$('#bAppeler').onclick = appeler; $('#bRappeler').onclick = rappeler; $('#bAbsent').onclick = absent;
document.addEventListener('click', e => { const tr = e.target.closest('#tbCaisse tr.cl, #tbFile tr.cl'); if (tr) A.detail(tr.dataset.id); });
window.__spSuite = { extras, reset, aSignature, accuse, lierAccuse, piecesHtml, render, role: r => { role = r; if ($('#v-file').classList.contains('on')) vueFile(); } };
// lien de suivi reçu par WhatsApp : ?suivi=N°&code=XXXXXX
try { const q = new URLSearchParams(location.search); if (q.get('suivi')) { A.aller('citoyen'); $('#c_id').value = q.get('suivi'); $('#c_code').value = q.get('code') || ''; $('#bSuivre').click(); } } catch (e) { }
})();
