/* Passeport Sûr — suite : pièces jointes, signature tactile, brouillon, accusé WhatsApp + QR, caisse, file d'attente. */
(function () {
'use strict';
const A = window.__spApi; if (!A) return;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const { esc, fmtD, fmtDH, pad, T, NOW, serviceDay, KN, REQUIS, manquantes } = A;
let role = A.role;
const DB = () => A.DB;
const SY = () => window.__spSync;
const nomComplet = d => d.person.nom + ' ' + d.person.prenoms;
const LIBP = { autre: 'Autre document' }; Object.values(REQUIS).forEach(l => l.forEach(r => LIBP[r[0]] = r[1]));
const svgUrl = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
const SIL = svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><rect width="120" height="150" fill="#dcd6c3"/><circle cx="60" cy="56" r="24" fill="#aaa38b"/><path d="M14 150c2-36 22-52 46-52s44 16 46 52z" fill="#aaa38b"/></svg>');
const PIECE_PH = svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 150"><rect width="240" height="150" rx="10" fill="#efe9d4"/><rect x="14" y="16" width="50" height="62" rx="4" fill="#cfc8b0"/><g fill="#cfc8b0"><rect x="78" y="22" width="140" height="9"/><rect x="78" y="40" width="110" height="9"/><rect x="78" y="58" width="130" height="9"/></g><g fill="#b9b196"><rect x="14" y="106" width="212" height="8"/><rect x="14" y="122" width="212" height="8"/></g><text x="120" y="96" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#8b856f">document (exemple)</text></svg>');
function signatureDemo(id) { let h = 11; for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0; const r = n => ((h = (h * 1103515245 + 12345) >>> 0) % n);
  let d = 'M12 ' + (60 + r(20)); for (let k = 0; k < 6; k++) d += ' C' + (30 + k * 28 + r(10)) + ' ' + (10 + r(80)) + ' ' + (40 + k * 28 + r(12)) + ' ' + (20 + r(80)) + ' ' + (50 + k * 28) + ' ' + (45 + r(40));
  return svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><path d="' + d + '" fill="none" stroke="#14327a" stroke-width="2.6" stroke-linecap="round"/><path d="M20 84 H180" stroke="#14327a" stroke-opacity=".35" stroke-width="1.5"/></svg>'); }

/* ---------- Stockage des pièces : IndexedDB (secours : mémoire) ---------- */
const mem = new Map();
const idb = (() => { let dbp = null;
  const open = () => dbp || (dbp = new Promise((ok, ko) => { try { const r = indexedDB.open('sp_pieces_v1', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' }); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); } catch (e) { ko(e); } }));
  const tx = (mode, fn) => open().then(db => new Promise((ok, ko) => { const t = db.transaction('p', mode), rq = fn(t.objectStore('p')); t.oncomplete = () => ok(rq && rq.result); t.onerror = () => ko(t.error); }));
  return { put: rec => tx('readwrite', s => s.put(rec)).catch(() => { mem.set(rec.id, rec); }), get: id => tx('readonly', s => s.get(id)).then(r => r || mem.get(id)).catch(() => mem.get(id)), del: id => { mem.delete(id); return tx('readwrite', s => s.delete(id)).catch(() => { }); }, tous: () => tx('readonly', s => s.getAll()).catch(() => [...mem.values()]) }; })();
async function traiter(file) {
  if (/^image\//.test(file.type)) {
    const url = URL.createObjectURL(file), im = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Image illisible : essayez en JPEG ou PNG.')); i.src = url; });
    const k = Math.min(1, 1400 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    return { blob: await new Promise(ok => c.toBlob(ok, 'image/jpeg', .72)), mime: 'image/jpeg' };
  }
  if (file.type === 'application/pdf') { if (file.size > 3 * 1024 * 1024) throw new Error('Fichier trop lourd (3 Mo maximum).'); return { blob: file, mime: 'application/pdf' }; }
  throw new Error('Format non accepté : photo ou PDF seulement.');
}
const urls = new Map();
async function urlDe(id) { if (urls.has(id)) return urls.get(id); let r = await idb.get(id); if ((!r || !r.blob) && SY()) { const b = await SY().lirePiece(id); if (b) { r = { id, dossier: '', blob: b, mime: b.type }; idb.put(r); } } if (!r || !r.blob) return null; const u = URL.createObjectURL(r.blob); urls.set(id, u); return u; }
async function hydrate() {
  for (const el of $$('[data-piece]:not([data-ok])')) { el.dataset.ok = 1; const u = await urlDe(el.dataset.piece); el.src = u || PIECE_PH; }
  for (const el of $$('[data-piece-bg]:not([data-ok])')) { el.dataset.ok = 1; const u = await urlDe(el.dataset.pieceBg); if (u) el.style.backgroundImage = 'url(' + u + ')'; }
  for (const el of $$('[data-piece-lien]:not([data-ok])')) { el.dataset.ok = 1; const u = await urlDe(el.dataset.pieceLien); if (u) { el.href = u; el.target = '_blank'; el.rel = 'noopener'; } }
}

/* ---------- Éditeur de pièces (guichet, fiche, caisse, demandeur) ---------- */
let bp = [];                       // pièces du brouillon en cours (guichet)
const guichetType = () => document.querySelector('input[name="type"]:checked').value;
let pending = null;
const inPhoto = document.createElement('input'); inPhoto.type = 'file'; inPhoto.accept = 'image/*'; inPhoto.setAttribute('capture', 'environment'); inPhoto.hidden = true; inPhoto.id = 'pjPhoto';
const inFichier = document.createElement('input'); inFichier.type = 'file'; inFichier.accept = 'image/*,application/pdf'; inFichier.multiple = true; inFichier.hidden = true; inFichier.id = 'pjFichier';
document.body.append(inPhoto, inFichier);
const vign = p => '<span class="vign">' + (/^image/.test(p.mime) ? '<img data-piece="' + p.id + '" alt="">' : '<a class="pdf" data-piece-lien="' + p.id + '">📄</a>') + '<span class="nm">' + esc(p.nom) + '</span><button type="button" data-rm="' + p.id + '" title="Retirer">✕</button></span>';
function htmlEditeur(list, type) {
  const req = REQUIS[type] || [], reel = list.filter(p => !p.demo || true);
  const ligne = (k, lib, oblig) => { const L = reel.filter(p => p.type === k), ok = L.length > 0;
    return '<div class="pj ' + (ok ? 'ok' : oblig ? 'manque' : '') + '"><div class="pj-t"><b>' + esc(lib) + '</b>' + (oblig ? '<i>obligatoire</i>' : '') + '<span class="badge ' + (ok ? 'ok' : oblig ? 'alerte' : 'orange') + '">' + (ok ? '✔ ' + L.length + ' fourni' + (L.length > 1 ? 's' : '') : oblig ? 'Manquant' : 'Facultatif') + '</span></div>' +
      '<div class="vignes">' + L.map(p => p.demo ? '<span class="vign"><img src="' + PIECE_PH + '" alt=""><span class="nm">exemple</span></span>' : vign(p)).join('') + '</div>' +
      '<div class="ligne"><button type="button" class="btn vert petit" data-pj="photo" data-k="' + k + '">📷 Photo</button><button type="button" class="btn clair petit" data-pj="fichier" data-k="' + k + '">📎 Joindre</button></div></div>'; };
  return req.map(r => ligne(r[0], r[1], r[2])).join('') + ligne('autre', 'Autre document (facultatif)', false) + '<div class="sous" id="pjMsg" style="font-size:13px;margin:4px 0 0"></div>';
}
function contexte(el) { const k = el.dataset.editeur; if (k === 'guichet') return { k, list: bp, type: guichetType(), d: null }; const d = DB().find(x => x.id === el.dataset.d); return d ? { k, list: d.pieces = d.pieces || [], type: d.type, d } : null; }
function monter() { $$('[data-editeur]').forEach(el => { if (el.dataset.monte === '1') return; const c = contexte(el); if (!c) return; el.dataset.monte = '1'; el.innerHTML = htmlEditeur(c.list, c.type); }); }
function remonter(el) { el.dataset.monte = '0'; monter(); hydrate(); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pj]'), rm = e.target.closest('[data-rm]'); const el = e.target.closest('[data-editeur]'); if (!el) return;
  if (b) { pending = { el, k: b.dataset.k }; (b.dataset.pj === 'photo' ? inPhoto : inFichier).value = ''; (b.dataset.pj === 'photo' ? inPhoto : inFichier).click(); }
  if (rm) retirer(el, rm.dataset.rm);
});
async function ajouter(files) {
  if (!pending) return; const { el, k } = pending, c = contexte(el), msg = el.querySelector('#pjMsg'); if (!c) return; let ajoutes = 0, erreur = '';
  for (const f of files) { try { if (msg) msg.textContent = 'Enregistrement de « ' + f.name + ' »…'; const r = await traiter(f), id = 'PJ-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await idb.put({ id, dossier: c.d ? c.d.id : 'brouillon', blob: r.blob, mime: r.mime });
      if (SY() && (SY().actif() || SY().citoyen())) await SY().envoyerPiece(id, r.blob, r.mime);
      c.list.push({ id, type: k, nom: f.name || (LIBP[k] + (r.mime === 'application/pdf' ? '.pdf' : '.jpg')), mime: r.mime, taille: r.blob.size, at: NOW().toISOString(), par: c.k === 'guichet' ? 'guichet' : c.k === 'citoyen' ? 'demandeur' : c.k === 'caisse' ? 'caisse' : 'agent' }); ajoutes++;
    } catch (x) { erreur = x.message; } }
  if (!ajoutes) { if (msg) msg.textContent = erreur ? '⚠ ' + erreur : ''; return; }
  if (c.d) { c.d.history.push({ s: c.d.status, at: NOW().toISOString(), by: c.k === 'citoyen' ? 'Demandeur' : A.ROLES[role], note: 'Pièce ajoutée : ' + LIBP[k] }); A.sauver(); contexteChange(c); } else { sauverBrouillon(); majEtapes(); remonter(el); const m2 = el.querySelector('#pjMsg'); if (m2 && erreur) m2.textContent = '⚠ ' + erreur; }
}
inPhoto.onchange = () => ajouter([...inPhoto.files]); inFichier.onchange = () => ajouter([...inFichier.files]);
async function retirer(el, id) {
  const c = contexte(el); if (!c) return; const i = c.list.findIndex(p => p.id === id); if (i < 0) return; const [p] = c.list.splice(i, 1); if (!p.demo) idb.del(id); urls.delete(id);
  if (c.d) { c.d.history.push({ s: c.d.status, at: NOW().toISOString(), by: c.k === 'citoyen' ? 'Demandeur' : A.ROLES[role], note: 'Pièce retirée : ' + LIBP[p.type] }); A.sauver(); contexteChange(c); } else { sauverBrouillon(); majEtapes(); remonter(el); }
}
function contexteChange(c) { if (c.k === 'detail') A.detail(c.d.id); else if (c.k === 'caisse') ouvrirCaisse(true); else if (c.k === 'citoyen') suivreRelance(); A.rafraichir(); }
let suivreId = null; function suivreRelance() { $('#bSuivre').click(); }
new MutationObserver(() => { requestAnimationFrame(() => { monter(); hydrate(); }); }).observe(document.body, { childList: true, subtree: true });

/* ---------- Signature tactile (doigt ou stylet) ---------- */
const cv = $('#sigPad'), cx = cv.getContext('2d'); cv.width = 800; cv.height = 300; cv.style.height = 'auto'; cv.style.aspectRatio = '8 / 3';
let dessin = false, encre = 0, last = null;
function raz() { cx.clearRect(0, 0, cv.width, cv.height); encre = 0; cv.classList.remove('ok'); $('#sigEtat').textContent = 'Faites signer dans le cadre ci-dessus.'; }
function pos(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); dessin = true; last = pos(e); cx.beginPath(); cx.fillStyle = '#14327a'; cx.arc(last[0], last[1], 2.4, 0, 7); cx.fill(); });
cv.addEventListener('pointermove', e => { if (!dessin) return; e.preventDefault(); const p = pos(e), lw = e.pointerType === 'pen' ? 1.8 + (e.pressure || .5) * 4 : 4.2;
  cx.strokeStyle = '#14327a'; cx.lineWidth = lw * 1.2; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.beginPath(); cx.moveTo(last[0], last[1]); cx.lineTo(p[0], p[1]); cx.stroke();
  encre += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p; if (encre > 90) { cv.classList.add('ok'); $('#sigEtat').textContent = '✔ Signature enregistrée dans la fiche.'; } });
['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, () => { if (dessin) { dessin = false; sauverBrouillon(); majEtapes(); } }));
$('#bSigEff').onclick = () => { raz(); sauverBrouillon(); majEtapes(); };
const aSignature = () => encre > 90;
function signaturePng() { const c = document.createElement('canvas'); c.width = 400; c.height = 150; c.getContext('2d').drawImage(cv, 0, 0, 400, 150); return c.toDataURL('image/png'); }
function pieceScannee() { const c = $('#snap'); if (!c || (c.width === 300 && c.height === 150)) return null; const o = document.createElement('canvas'), k = Math.min(1, 520 / c.width); o.width = Math.round(c.width * k); o.height = Math.round(c.height * k); o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/jpeg', .62); }

/* ---------- Brouillon : on peut s'arrêter et reprendre ---------- */
const BKEY = 'sp_brouillon_v1', CH = ['f_nom', 'f_prenoms', 'f_naiss', 'f_sexe', 'f_nat', 'f_ptype', 'f_pnum', 'f_pexp', 'f_tel', 'f_lieu', 'f_anum', 'f_aexp'];
let tmB = null, adoptes = new Set();
function formVide() { return !CH.some(i => i !== 'f_nat' && i !== 'f_ptype' && i !== 'f_lieu' && $('#' + i).value) && !bp.length && !aSignature(); }
function sauverBrouillon() { clearTimeout(tmB); tmB = setTimeout(() => { try { if (formVide()) { localStorage.removeItem(BKEY); return; } const f = {}; CH.forEach(i => f[i] = $('#' + i).value);
  localStorage.setItem(BKEY, JSON.stringify({ at: NOW().toISOString(), type: guichetType(), f, mrz: $('#mrz').value, pieces: bp, sig: aSignature() ? signaturePng() : null })); } catch (e) { } }, 350); }
function lireBrouillon() { try { return JSON.parse(localStorage.getItem(BKEY) || 'null'); } catch (e) { return null; } }
function bandeauBrouillon() {
  const b = lireBrouillon(), el = $('#brouillon'); if (!b || !formVide()) { el.innerHTML = ''; return; }
  const nm = ((b.f.f_nom || '') + ' ' + (b.f.f_prenoms || '')).trim() || 'sans nom', min = Math.round((Date.now() - T(b.at)) / 60000);
  el.innerHTML = '<div class="bandeau-brouillon"><span style="flex:1 1 220px">📝 <b>Demande commencée</b> : ' + esc(nm) + ' · ' + (min < 1 ? 'à l’instant' : min < 60 ? 'il y a ' + min + ' min' : 'il y a ' + Math.round(min / 60) + ' h') + ' · ' + b.pieces.length + ' pièce(s) jointe(s).</span><button class="btn vert petit" id="bReprendre">Reprendre</button><button class="btn clair petit" id="bAbandon">Recommencer à zéro</button></div>';
  $('#bReprendre').onclick = () => reprendre(b); $('#bAbandon').onclick = () => { b.pieces.forEach(p => idb.del(p.id)); try { localStorage.removeItem(BKEY); } catch (e) { } bandeauBrouillon(); };
}
function reprendre(b) {
  const r = document.querySelector('input[name="type"][value="' + b.type + '"]'); if (r) { r.checked = true; r.dispatchEvent(new Event('change')); }
  CH.forEach(i => { const e = $('#' + i); e.value = b.f[i] || ''; e.dispatchEvent(new Event('input')); }); $('#mrz').value = b.mrz || ''; bp = (b.pieces || []).slice();
  if (b.sig) { const im = new Image(); im.onload = () => { cx.clearRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height); encre = 200; cv.classList.add('ok'); $('#sigEtat').textContent = '✔ Signature reprise.'; majEtapes(); }; im.src = b.sig; }
  $('#brouillon').innerHTML = ''; const ed = $('#edGuichet'); ed.dataset.monte = '0'; monter(); hydrate(); majEtapes(); $('#gt3').scrollIntoView({ behavior: 'smooth' });
}

/* ---------- Étapes du guichet (aller et revenir librement) ---------- */
const ETAPES = [['gt1', '1 Type'], ['gt2', '2 Scan'], ['gt3', '3 Fiche'], ['gt4', '4 Pièces'], ['gt5', '5 Signature']];
function majEtapes() {
  const ok = { gt1: true, gt2: !!$('#mrz').value, gt3: !!($('#f_nom').value && $('#f_prenoms').value && $('#f_naiss').value && $('#f_pnum').value), gt4: manquantes({ type: guichetType(), pieces: bp }).length === 0, gt5: aSignature() };
  $('#etapesG').innerHTML = ETAPES.map(e => '<button type="button" data-g="' + e[0] + '" class="' + (ok[e[0]] ? 'fait' : '') + '">' + (ok[e[0]] ? '✔ ' : '') + e[1] + '</button>').join('');
}
$('#etapesG').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) { const c = $('#' + b.dataset.g); const h = $('#etapesG').offsetHeight + 6; window.scrollTo({ top: c.getBoundingClientRect().top + scrollY - h - 8, behavior: 'smooth' }); } });
['f_nom', 'f_prenoms', 'f_naiss', 'f_sexe', 'f_nat', 'f_ptype', 'f_pnum', 'f_pexp', 'f_tel', 'f_lieu', 'f_anum', 'f_aexp', 'mrz'].forEach(i => { const e = $('#' + i); e.addEventListener('input', () => { sauverBrouillon(); majEtapes(); }); e.addEventListener('change', () => { sauverBrouillon(); majEtapes(); }); });
$$('input[name="type"]').forEach(r => r.addEventListener('change', () => { const ed = $('#edGuichet'); ed.dataset.monte = '0'; monter(); hydrate(); sauverBrouillon(); majEtapes(); }));
$('#bLire').addEventListener('click', () => setTimeout(() => { sauverBrouillon(); majEtapes(); }, 50));

function extras() { return { photos: { piece: pieceScannee(), signature: signaturePng() }, pieces: bp.map(p => Object.assign({}, p)) }; }
function apres(d) { bp.forEach(p => { adoptes.add(p.id); idb.get(p.id).then(r => { if (r) { r.dossier = d.id; return idb.put(r); } }); }); try { localStorage.removeItem(BKEY); } catch (e) { } }
function reset() { raz(); bp.forEach(p => { if (!adoptes.has(p.id) && !p.demo) idb.del(p.id); }); bp = []; adoptes = new Set(); const ed = $('#edGuichet'); ed.dataset.monte = '0'; monter(); majEtapes(); try { localStorage.removeItem(BKEY); } catch (e) { } bandeauBrouillon(); }

/* ---------- Accusé WhatsApp avec code QR ---------- */
const chiffres = t => String(t || '').replace(/\D/g, '');
function qrGif(txt, cell) { try { const q = qrcode(0, 'M'); q.addData(txt); q.make(); return q.createDataURL(cell || 6, 2); } catch (e) { return ''; } }
function lienSuivi(d) { return location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html?suivi=' + encodeURIComponent(d.id) + '&code=' + A.code(d.id, d.person.nom) + (SY() && SY().publique() ? '&esp=' + SY().publique() : ''); }
const listeManque = d => manquantes(d).map(r => '• ' + r[1]).join('\n');
function texteWA(d) { const m = manquantes(d); return '*Passeport Sûr — Accusé d’enregistrement*\n\nBonjour ' + d.person.prenoms + ',\nvotre dossier est bien enregistré.\n\nN° de reçu : *' + d.id + '*\nCode de contrôle : *' + A.code(d.id, d.person.nom) + '*\n\n' +
  (m.length ? '⚠ *Dossier incomplet* — il manque :\n' + listeManque(d) + '\nVous pouvez les envoyer depuis votre téléphone : ' + lienSuivi(d) + '\n\n' : '') + 'Présentez ce reçu (et le code QR) à la caisse de la Préfecture de Brazzaville pour effectuer le paiement.\n\nSuivi de votre dossier : ' + lienSuivi(d); }
function accuse(d) {
  const h = NOW(), hh = pad(h.getHours()) + ':' + pad(h.getMinutes()), m = manquantes(d);
  return '<div class="wa noprint"><div class="tete"><i>✆</i> Accusé envoyé au ' + esc(d.person.tel || 'numéro du demandeur') + '</div>' +
    '<div class="bulle"><b>Passeport Sûr — Accusé d’enregistrement</b>\nBonjour ' + esc(d.person.prenoms) + ', votre dossier est bien enregistré.\nN° de reçu : <b>' + d.id + '</b>' + (m.length ? '\n⚠ <b>Dossier incomplet</b>, il manque : ' + esc(m.map(r => r[1]).join(', ')) + '. Envoyez-les depuis votre téléphone avec le lien de suivi.' : '') + '\nPrésentez ce code QR à la caisse de la Préfecture pour le paiement.' +
    '<img src="' + qrGif('PSR1|' + d.id + '|' + A.code(d.id, d.person.nom), 6) + '" alt="Code QR de l’accusé"><div class="heure">' + hh + ' ✓✓</div></div>' +
    '<div class="ligne" style="margin-top:10px"><a class="btn vert petit" id="bWA" href="https://wa.me/' + chiffres(d.person.tel) + '?text=' + encodeURIComponent(texteWA(d)) + '" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block">📲 Envoyer sur WhatsApp</a><button class="btn clair petit" id="bQRdl">⬇ Télécharger le QR</button></div>' +
    '<p class="sous" style="font-size:12px;margin:8px 0 0">Dans la démonstration, touchez « Envoyer » : WhatsApp s’ouvre avec le message prêt. En service réel, l’envoi est automatique à chaque enregistrement (API WhatsApp Business).</p></div>' +
    (m.length ? '<div class="alert orange noprint"><b>Dossier incomplet : ' + m.length + ' pièce(s) manquante(s).</b> Le demandeur peut revenir les ajouter plus tard (lien de suivi, ou au guichet). Le paiement à la caisse n’est possible qu’une fois le dossier complet.</div>' : '');
}
function telecharger(nom, url) { const a = document.createElement('a'); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); }
function qrPng(txt, nom) { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width * 2; c.height = im.height * 2; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); telecharger(nom, c.toDataURL('image/png')); }; im.src = qrGif(txt, 10); }
function lierAccuse(d) {
  const b = $('#bQRdl'); if (b) b.onclick = () => qrPng('PSR1|' + d.id + '|' + A.code(d.id, d.person.nom), 'Accuse-' + d.id + '.png');
  const w = $('#bWA'); if (w) w.addEventListener('click', () => { const dd = DB().find(x => x.id === d.id); if (!dd) return; dd.whatsapp = { at: NOW().toISOString() }; dd.history.push({ s: dd.status, at: NOW().toISOString(), by: 'Système', note: 'Accusé WhatsApp envoyé au ' + (dd.person.tel || '') }); A.sauver(); });
}

/* ---------- Pièces, signature, paiement dans les fiches ---------- */
function figure(p) { const lib = LIBP[p.type] || 'Document';
  if (p.demo) return '<figure><img src="' + (p.type === 'photo' ? SIL : PIECE_PH) + '" alt=""><figcaption>' + esc(lib) + ' (exemple)</figcaption></figure>';
  if (!/^image/.test(p.mime)) return '<figure class="pdfig"><a data-piece-lien="' + p.id + '">📄</a><figcaption>' + esc(lib) + ' · PDF</figcaption></figure>';
  return '<figure><img data-piece="' + p.id + '" alt=""><figcaption>' + esc(lib) + '</figcaption></figure>'; }
function piecesHtml(d, ctx) {
  const ph = d.photos || {}, list = d.pieces || [], m = manquantes(d);
  let h = '<h3 style="font-size:16px">Pièces et signature</h3><div class="pieces">' + list.map(figure).join('') +
    (ph.piece ? '<figure><img src="' + ph.piece + '" alt=""><figcaption>Pièce scannée</figcaption></figure>' : '') +
    '<figure><img src="' + (ph.signature || signatureDemo(d.id)) + '" alt="Signature" style="background:#fff"><figcaption>Signature' + (ph.signature ? '' : ' (exemple)') + '</figcaption></figure></div>';
  h += m.length ? '<div class="alert orange"><b>Dossier incomplet.</b> Pièces manquantes : ' + esc(m.map(r => r[1]).join(' · ')) + '.</div>' : '<div class="alert vert">✔ Toutes les pièces obligatoires sont fournies.</div>';
  if (ctx && !(ctx === 'detail' && role === 'ministere')) h += '<h3 style="font-size:16px;margin-top:12px">Joindre ou compléter des pièces</h3><div data-editeur="' + ctx + '" data-d="' + d.id + '"></div>';
  if (d.paiement) h += '<h3 style="font-size:16px">Paiement et appel</h3><dl class="dl"><dt>Reçu de paiement</dt><dd><b>' + esc(d.paiement.recu) + '</b> · ' + fmtDH(d.paiement.at) + '</dd><dt>Montant</dt><dd>' + Number(d.paiement.montant).toLocaleString('fr-FR') + ' FCFA · ' + esc(d.paiement.mode) + ' <small>(montant fictif de démonstration)</small></dd>' + (d.rdv ? '<dt>Rendez-vous</dt><dd>' + A.rdvLong(d.rdv.date) + ' · ' + d.rdv.heure + ' · ' + esc(d.rdv.lieu) + '</dd>' : '') + '<dt>N° d’appel</dt><dd><b>' + pad(d.ticket || 0, 3) + '</b>' + (d.appel ? ' · appelé à la porte ' + d.appel.porte + ' à ' + fmtDH(d.appel.at) : ' · en attente d’appel') + '</dd></dl>';
  if (d.whatsapp) h += '<div class="alert vert">✔ Accusé WhatsApp envoyé le ' + fmtDH(d.whatsapp.at) + '.</div>';
  return h;
}
const piecesHtmlDetail = d => piecesHtml(d, 'detail');

/* ---------- Caisse ---------- */
const jourCourant = () => SY().jourCourant();
function paiementsDuJour() { const aj = A.jourSite(0); return DB().filter(d => d.paiement && new Date(T(d.paiement.at) + 3600000).toISOString().slice(0, 10) === aj).sort((a, b) => b.paiement.at.localeCompare(a.paiement.at)); }
function caisse() {
  const pj = paiementsDuJour(), tot = pj.reduce((a, d) => a + Number(d.paiement.montant), 0), att = DB().filter(d => d.status === 'depose');
  const bloques = att.filter(d => (A.flags(d).some(f => f.n === 'rouge') && !d.suite) || manquantes(d).length).length;
  $('#kpisCaisse').innerHTML = [[pj.length, 'Paiements du jour', 'v'], [tot.toLocaleString('fr-FR'), 'Total encaissé (FCFA, fictif)', 'j'], [att.length, 'Dossiers en attente de paiement', ''], [bloques, 'Encaissements bloqués (alerte ou pièces)', 'r']].map(k => '<div class="kpi ' + k[2] + '"><b>' + k[0] + '</b><span>' + k[1] + '</span></div>').join('');
  $('#tbCaisse').innerHTML = pj.slice(0, 25).map(d => { const h = new Date(d.paiement.at); return '<tr class="cl" data-id="' + d.id + '"><td>' + pad(h.getHours()) + ':' + pad(h.getMinutes()) + '</td><td><b>' + pad(d.ticket, 3) + '</b></td><td>' + esc(d.paiement.recu) + '</td><td>' + esc(nomComplet(d)) + '</td><td>' + esc(d.paiement.mode) + '</td><td>' + Number(d.paiement.montant).toLocaleString('fr-FR') + '</td></tr>'; }).join('') || '<tr><td colspan="6" style="color:var(--gris)">Aucun paiement pour l’instant.</td></tr>';
}
let flux = null, boucle = null;
function arretScan() { if (flux) flux.getTracks().forEach(t => t.stop()); flux = null; cancelAnimationFrame(boucle); $('#scanBox').classList.remove('on'); $('#bScanStop').style.display = 'none'; }
async function lancerScan() {
  try { flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); const v = $('#scanVid'); v.srcObject = flux; await v.play(); $('#scanBox').classList.add('on'); $('#bScanStop').style.display = ''; $('#scanEtat').textContent = 'Placez le code QR de l’accusé devant la caméra…';
    const cvs = $('#scanCv'), x = cvs.getContext('2d', { willReadFrequently: true });
    const tick = () => { if (!flux) return; if (v.readyState >= 2) { cvs.width = 480; cvs.height = Math.round(480 * v.videoHeight / v.videoWidth) || 360; x.drawImage(v, 0, 0, cvs.width, cvs.height); const im = x.getImageData(0, 0, cvs.width, cvs.height); const r = window.jsQR && jsQR(im.data, im.width, im.height); if (r && r.data && lireQR(r.data)) { arretScan(); return; } } boucle = requestAnimationFrame(tick); };
    tick();
  } catch (e) { $('#scanEtat').textContent = 'Caméra indisponible ici : saisissez le N° de reçu et le code, ou utilisez l’exemple.'; }
}
function lireQR(txt) { const p = String(txt).split('|'); if (p[0] === 'PSR1' && p[1]) { $('#k_id').value = p[1]; $('#k_code').value = p[2] || ''; ouvrirCaisse(); return true; } if (p[0] === 'PSR2' && p[3]) { $('#k_id').value = p[3]; $('#k_code').value = ''; ouvrirCaisse(true); return true; } return false; }
function ouvrirCaisse(sansCode) {
  const id = $('#k_id').value.trim().toUpperCase(), cd = $('#k_code').value.trim().toUpperCase(), box = $('#caisseRes'), d = DB().find(x => x.id === id);
  if (!d || (!sansCode && A.code(d.id, d.person.nom) !== cd)) { box.innerHTML = '<div class="alert rouge">Reçu introuvable ou code incorrect. Vérifiez l’accusé du demandeur.</div>'; return; }
  $('#scanEtat').textContent = '';
  const f = A.flags(d), bloque = f.some(x => x.n === 'rouge') && !d.suite, inc = manquantes(d), peut = role === 'caisse' || role === 'prefecture', photo = (d.pieces || []).find(p => p.type === 'photo');
  let pay = '';
  if (d.paiement) pay = '<div class="alert vert"><b>Déjà payé</b> le ' + fmtDH(d.paiement.at) + ' · reçu ' + esc(d.paiement.recu) + ' · <b>N° d’appel ' + pad(d.ticket, 3) + '</b></div><div class="ligne"><button class="btn clair" id="bReimp">🖨 Réimprimer le reçu de paiement</button></div>';
  else if (bloque) pay = '<div class="alert rouge"><b>Encaissement bloqué.</b> Ce dossier a une alerte grave non examinée. La Préfecture doit l’examiner avant le paiement.</div>' + (role === 'prefecture' ? '<div class="ligne"><button class="btn clair" id="bDebloque">✔ Alerte examinée : autoriser l’encaissement</button></div>' : '');
  else if (inc.length) pay = '<div class="alert rouge"><b>Encaissement impossible : dossier incomplet.</b> Il manque : ' + esc(inc.map(r => r[1]).join(' · ')) + '. Ajoutez-les ci-dessous (photo ou fichier), ou le demandeur les envoie depuis son téléphone.</div>';
  else if (peut) pay = '<h3 style="font-size:16px;margin-top:6px">Encaisser</h3><div class="grille"><div class="c6"><label for="k_montant">Montant encaissé (FCFA)</label><input id="k_montant" type="number" inputmode="numeric" min="1" placeholder="Saisir le montant"></div><div class="c6"><label for="k_mode">Mode de paiement</label><select id="k_mode"><option>Espèces</option><option>Mobile Money MTN</option><option>Mobile Money Airtel</option></select></div></div>' +
    '<p class="sous" style="margin:6px 0 0;font-size:12.5px">Le montant est celui fixé par l’administration. Dans la démonstration, saisissez un montant fictif.</p><div class="ligne" style="margin-top:10px"><button class="btn vert" id="bPayer">Encaisser et éditer le reçu de paiement</button></div><div id="payMsg"></div>';
  box.innerHTML = '<div class="carte"><div class="ligne" style="align-items:flex-start;gap:14px"><div class="visage" ' + (photo && !photo.demo ? 'data-piece-bg="' + photo.id + '"' : '') + ' style="background-image:url(' + SIL + ')"></div><div style="flex:1 1 220px"><h3 style="margin-bottom:4px">' + esc(nomComplet(d)) + '</h3><div>' + A.bT(d.type) + ' ' + A.bS(d.status) + '</div>' +
    '<p style="margin:6px 0 0;color:var(--gris);font-size:14px">N° de reçu <b>' + d.id + '</b> · né(e) le ' + fmtD(d.person.naissance) + '<br>' + (d.person.piece.type === 'CNI' ? 'Carte d’identité' : 'Passeport') + ' n° ' + esc(d.person.piece.numero) + ' · tél. ' + esc(d.person.tel || '—') + '</p>' +
    (d.ancien ? '<p style="margin:4px 0 0;font-size:13.5px">Ancien passeport n° <b>' + esc(d.ancien.numero) + '</b> (expiré le ' + fmtD(d.ancien.expiration) + ')</p>' : '') + '</div></div>' +
    f.map(x => '<div class="alert ' + (x.n === 'rouge' ? 'rouge' : 'orange') + '"><b>' + KN[x.k] + '</b> — ' + esc(x.t) + '</div>').join('') + piecesHtml(d, peut ? 'caisse' : null) + pay + '</div>';
  const bp2 = $('#bPayer'); if (bp2) bp2.onclick = () => payer(d);
  const bd = $('#bDebloque'); if (bd) bd.onclick = () => { d.suite = 'verifie'; d.suiteAt = NOW().toISOString(); d.history.push({ s: d.status, at: NOW().toISOString(), by: 'Préfecture', note: 'Alerte examinée avant encaissement' }); A.sauver(); ouvrirCaisse(sansCode); };
  const br = $('#bReimp'); if (br) br.onclick = () => recuPaiement(d);
}
const texteRdv = d => '*Passeport Sûr — Paiement enregistré*\n\nBonjour ' + d.person.prenoms + ',\nvotre paiement est bien reçu.\n\n📅 *Rendez-vous d’enrôlement :*\n' + A.rdvLong(d.rdv.date) + ' à partir de ' + d.rdv.heure + '\n📍 ' + d.rdv.lieu + '\n\nReçu de paiement : *' + d.paiement.recu + '*\nVotre N° d’appel : *' + pad(d.ticket, 3) + '*\n\nPrésentez-vous ce jour-là avec ce message et votre reçu. Votre numéro, votre nom et la porte s’afficheront sur les écrans de la salle d’attente.\n\nSuivi de votre dossier : ' + lienSuivi(d);
async function payer(d) {
  const m = Number($('#k_montant').value), mode = $('#k_mode').value, msg = $('#payMsg');
  if (!(m > 0)) { msg.innerHTML = '<div class="alert rouge">Saisissez le montant encaissé.</div>'; return; }
  if (manquantes(d).length) { ouvrirCaisse(true); return; }
  $('#bPayer').disabled = true;
  try {
    if (SY().actif()) await SY().payer(d.id, m, mode);
    else {
      const r = SY().prochainRdvLocal(); if (!r) throw new Error('Aucun rendez-vous disponible dans les 90 prochains jours.');
      const now = NOW(), rp = DB().reduce((a, x) => Math.max(a, x.paiement ? Number(String(x.paiement.recu).split('-').pop()) : 0), 0) + 1;
      d.status = 'paye'; d.ticket = r.ticket; d.paiement = { montant: m, mode, at: now.toISOString(), caissier: 'Caisse', recu: 'RP-' + now.getFullYear() + '-' + pad(rp, 6) };
      d.rdv = { date: r.date, heure: r.heure, lieu: r.lieu, objet: 'Enrôlement (empreintes et photo)' };
      d.history.push({ s: 'paye', at: now.toISOString(), by: 'Caisse', note: 'Paiement ' + m.toLocaleString('fr-FR') + ' FCFA — ' + mode + ' · rendez-vous le ' + r.date });
      A.sauver();
    }
  } catch (e) { msg.innerHTML = '<div class="alert rouge">' + esc(e.message) + '</div>'; const b = $('#bPayer'); if (b) b.disabled = false; return; }
  const dd = DB().find(x => x.id === d.id); ouvrirCaisse(true); caisse(); recuPaiement(dd);
}
function recuPaiement(d) {
  const p = d.paiement, r = d.rdv;
  $('#feuille').innerHTML = '<div class="recu"><img class="lg" src="logo.svg" alt=""><div style="font-size:12px;letter-spacing:.14em;color:var(--gris)">REÇU DE PAIEMENT — DÉMONSTRATION</div><div class="num">' + esc(p.recu) + '</div>' +
    (r ? '<div class="alert vert" style="text-align:left;margin:10px 0"><b>📅 Rendez-vous d’enrôlement</b><br>' + esc(A.rdvLong(r.date)) + ' · à partir de <b>' + esc(r.heure) + '</b><br>' + esc(r.lieu) + '</div>' : '') +
    '<div style="margin:6px 0 2px;font-size:12px;letter-spacing:.12em;color:var(--gris)">VOTRE N° D’APPEL</div><div class="gros">' + pad(d.ticket, 3) + '</div>' + A.qr('PSR2|' + p.recu + '|' + d.ticket + '|' + d.id) +
    '<dl class="dl" style="text-align:left"><dt>Demandeur</dt><dd>' + esc(nomComplet(d)) + '</dd><dt>Dossier</dt><dd>' + d.id + ' · ' + A.TN[d.type] + '</dd><dt>Payé</dt><dd>' + Number(p.montant).toLocaleString('fr-FR') + ' FCFA · ' + esc(p.mode) + ' <small>(fictif)</small></dd><dt>Date</dt><dd>' + fmtDH(p.at) + '</dd></dl>' +
    '<div style="font-size:13.5px"><b>Le jour du rendez-vous</b>, asseyez-vous dans la salle d’attente. Quand votre numéro s’affiche à l’écran avec votre nom, levez-vous et allez à la porte indiquée.</div></div>' +
    '<div class="ligne noprint" style="margin-top:12px"><button class="btn or" onclick="window.print()">🖨 Imprimer le reçu</button>' + (r ? '<a class="btn vert" style="text-decoration:none;display:inline-block" target="_blank" rel="noopener" href="https://wa.me/' + chiffres(d.person.tel) + '?text=' + encodeURIComponent(texteRdv(d)) + '">📲 Envoyer la date du rendez-vous par WhatsApp</a>' : '') + '<button class="btn clair" id="bFerme">Fermer</button></div>' +
    (r ? '<div class="wa noprint"><div class="tete"><i>✆</i> Message envoyé au ' + esc(d.person.tel || 'demandeur') + '</div><div class="bulle">' + esc(texteRdv(d).replace(/\*/g, '').replace(/\n\nSuivi de votre dossier : .*/, '')) + '<div class="heure">' + pad(NOW().getHours()) + ':' + pad(NOW().getMinutes()) + ' ✓✓</div></div></div>' : '');
  $('#tiroir').classList.add('on'); $('#bFerme').onclick = () => $('#tiroir').classList.remove('on');
}
function exempleCaisse(incomplet) { const l = DB().filter(x => x.status === 'depose' && !A.flags(x).some(f => f.n === 'rouge') && (manquantes(x).length > 0) === !!incomplet).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); const d = l[0]; if (!d) { $('#scanEtat').textContent = incomplet ? 'Aucun dossier incomplet disponible.' : 'Aucun dossier complet en attente de paiement.'; return; } $('#k_id').value = d.id; $('#k_code').value = A.code(d.id, d.person.nom); ouvrirCaisse(); }

/* ---------- File d'attente et appel (plusieurs portes, jour du rendez-vous) ---------- */
const portesCfg = () => { const c = SY().cfg(); return { n: c.portes, noms: c.noms || {} }; };
const rang = d => d.rang != null ? d.rang : d.ticket;
const rdvAujourdhui = d => d.rdv && d.rdv.date === jourCourant();
function file() { return DB().filter(d => d.status === 'paye' && rdvAujourdhui(d)).sort((a, b) => rang(a) - rang(b)); }
function appelsDuJour() { return DB().filter(d => d.appel && rdvAujourdhui(d)).sort((a, b) => b.appel.at.localeCompare(a.appel.at)); }
function vueFile() {
  const q = file(), ap = appelsDuJour(), now = NOW().getTime(), att = q.length ? Math.round(q.reduce((a, d) => a + (now - T(d.paiement.at)) / 60000, 0) / q.length) : 0, cfg = portesCfg(), ro = role === 'ministere', sc = SY().cfg();
  $('#jourFile').innerHTML = '📅 <b>Rendez-vous du ' + esc(A.rdvLong(jourCourant())) + '</b>' + (sc.decalage ? ' <span class="badge orange">date simulée : +' + sc.decalage + ' j</span>' : ' (aujourd’hui)');
  const ec = SY().ecrans(); $('#ecransCo').innerHTML = SY().actif() ? (ec.length ? '🖥 <b>Écrans connectés :</b> ' + ec.map(e => '🟢 ' + esc(e.nom)).join(' · ') : '🖥 Aucun écran connecté. Ouvrez « 🟢 Espace » en haut pour afficher le code et le lien des écrans.') : '🖥 Mode local : l’écran de la salle ne reçoit les appels que sur cet appareil. Pour relier plusieurs postes et écrans, touchez « Mode local » en haut.';
  $('#kpisFile').innerHTML = [[q.length, 'En attente', 'j'], [q[0] ? pad(q[0].ticket, 3) : '—', 'Prochain numéro', 'v'], [ap.length, 'Appelés ce jour', ''], [att + ' min', 'Attente moyenne depuis le paiement', 'm']].map(k => '<div class="kpi ' + k[2] + '"><b>' + k[0] + '</b><span>' + k[1] + '</span></div>').join('');
  $('#tbFile').innerHTML = q.slice(0, 14).map(d => '<tr class="cl" data-id="' + d.id + '"><td><b class="ticket" style="font-size:20px">' + pad(d.ticket, 3) + '</b></td><td>' + esc(nomComplet(d)) + '</td><td>' + A.bT(d.type) + '</td><td>' + esc(d.rdv.heure) + '</td></tr>').join('') || '<tr><td colspan="4" style="color:var(--gris)">Personne n’attend pour l’instant.</td></tr>';
  $('#nbPortes').textContent = cfg.n;
  let h = ''; for (let k = 1; k <= cfg.n; k++) { const cur = ap.find(x => x.appel.porte === k && x.status === 'recu'), nom = cfg.noms[k] || '';
    h += '<div class="porteC' + (ap[0] && ap[0].appel.porte === k && ap[0].status === 'recu' ? ' on' : '') + '"><div class="ph">🚪 Porte ' + k + '<button type="button" data-ed="' + k + '" title="Nommer la porte">✎</button></div><div class="nm">' + (nom ? esc(nom) : '&nbsp;') + '</div>' +
      '<div class="nb">' + (cur ? pad(cur.ticket, 3) : '—') + '</div><div class="nm">' + (cur ? esc(nomComplet(cur)) : 'libre') + '</div>' +
      '<div class="bt"><button type="button" class="btn or petit" data-act="appeler" data-p="' + k + '"' + (ro ? ' disabled' : '') + '>🔔 Appeler le suivant</button><button type="button" class="btn clair petit" data-act="rappeler" data-p="' + k + '"' + (ro || !cur ? ' disabled' : '') + '>↻ Rappeler</button><button type="button" class="btn clair petit" data-act="absent" data-p="' + k + '"' + (ro || !cur ? ' disabled' : '') + '>Absent</button></div></div>'; }
  $('#portes').innerHTML = h;
  const fr = $('#apercuEcran'); const cible = SY().actif() ? 'ecran.html?apercu=1&espace=' + SY().code() : 'ecran.html?apercu=1'; if (fr && fr.getAttribute('src') !== cible) fr.setAttribute('src', cible);
}
function msgAppel(h, cl) { const e = $('#appelEtat'); e.style.display = ''; e.className = 'alert ' + (cl || 'bleu'); e.innerHTML = h; }
const fini = (r, d) => { vueFile(); msgAppel(r, d); };
async function appeler(porte) {
  if (SY().actif()) { try { const r = await SY().appeler(porte); if (r.vide) { msgAppel('Personne n’attend pour ce jour.', 'orange'); return; } const d = r.dossier; vueFile(); msgAppel('🔔 <b>N° ' + pad(d.ticket, 3) + '</b> · ' + esc(nomComplet(d)) + ' → <b>Porte ' + porte + '</b> (affiché sur les écrans de la salle)', 'vert'); } catch (e) { msgAppel('⚠ ' + esc(e.message), 'rouge'); } return; }
  const q = file(); if (!q.length) { msgAppel('Personne n’attend pour ce jour.', 'orange'); return; }
  const d = q[0], now = NOW().toISOString();
  d.status = 'recu'; d.appel = { porte, at: now }; d.history.push({ s: 'recu', at: now, by: 'Porte ' + porte, note: 'Appelé en salle' });
  A.sauver(); vueFile(); msgAppel('🔔 <b>N° ' + pad(d.ticket, 3) + '</b> · ' + esc(nomComplet(d)) + ' → <b>Porte ' + porte + '</b> (affiché sur les écrans de la salle)', 'vert');
}
async function rappeler(porte) {
  if (SY().actif()) { try { const r = await SY().rappeler(porte); if (r.vide) { msgAppel('Aucun appel à répéter à la porte ' + porte + '.', 'orange'); return; } vueFile(); msgAppel('🔔 Appel répété : N° ' + pad(r.dossier.ticket, 3) + ' → Porte ' + porte, 'vert'); } catch (e) { msgAppel('⚠ ' + esc(e.message), 'rouge'); } return; }
  const l = appelsDuJour().find(x => x.appel.porte === porte && x.status === 'recu'); if (!l) { msgAppel('Aucun appel à répéter à la porte ' + porte + '.', 'orange'); return; } l.appel.at = NOW().toISOString(); l.history.push({ s: l.status, at: l.appel.at, by: 'Porte ' + porte, note: 'Appel répété' }); A.sauver(); vueFile(); msgAppel('🔔 Appel répété : N° ' + pad(l.ticket, 3) + ' → Porte ' + porte, 'vert');
}
async function absent(porte) {
  if (SY().actif()) { try { const r = await SY().absent(porte); if (r.vide) { msgAppel('Aucune personne appelée à la porte ' + porte + '.', 'orange'); return; } vueFile(); msgAppel('N° ' + pad(r.dossier.ticket, 3) + ' absent : renvoyé en fin de file.', 'orange'); } catch (e) { msgAppel('⚠ ' + esc(e.message), 'rouge'); } return; }
  const l = appelsDuJour().find(x => x.appel.porte === porte && x.status === 'recu'); if (!l) { msgAppel('Aucune personne appelée à la porte ' + porte + '.', 'orange'); return; }
  const max = DB().reduce((a, x) => Math.max(a, x.rang != null ? x.rang : (x.ticket || 0)), 0);
  l.status = 'paye'; l.rang = max + 1; delete l.appel; l.history.push({ s: 'paye', at: NOW().toISOString(), by: 'Porte ' + porte, note: 'Absent à l’appel — renvoyé en fin de file' }); A.sauver(); vueFile(); msgAppel('N° ' + pad(l.ticket, 3) + ' absent : renvoyé en fin de file.', 'orange');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'), ed = e.target.closest('[data-ed]');
  if (b && b.closest('#portes')) { const k = +b.dataset.p; ({ appeler, rappeler, absent })[b.dataset.act](k); }
  if (ed) { const c = portesCfg(), k = ed.dataset.ed, v = prompt('Nom de la porte ' + k + ' (vide pour effacer) :', c.noms[k] || ''); if (v !== null) { const noms = Object.assign({}, c.noms); if (v.trim()) noms[k] = v.trim().slice(0, 40); else delete noms[k]; SY().regler({ noms }).then(vueFile); } }
});
$('#bPortesPlus').onclick = async () => { await SY().regler({ portes: Math.min(12, portesCfg().n + 1) }); vueFile(); };
$('#bPortesMoins').onclick = async () => { await SY().regler({ portes: Math.max(1, portesCfg().n - 1) }); vueFile(); };

/* ---------- Réglages (préfecture) ---------- */
function vueReglages() {
  const c = SY().cfg(); $('#r_portes').value = c.portes; $('#r_cap').value = c.capacite; $('#r_delai').value = c.delai; $('#r_debut').value = c.debut; $('#r_pas').value = c.pas; $('#r_par').value = c.parCreneau; $('#r_lieu').value = c.lieu; $('#r_dec').value = c.decalage;
  $$('#r_jours input').forEach(i => { i.checked = c.jours.includes(+i.value); });
  $('#r_info').innerHTML = SY().actif() ? '🟢 Ces réglages s’appliquent à <b>tous les postes et écrans</b> de l’espace.' : '⚪ Mode local : ces réglages restent sur cet appareil.';
}
$('#bRegler').onclick = async () => {
  const n = id => Number($('#' + id).value), jours = $$('#r_jours input').filter(i => i.checked).map(i => +i.value), m = $('#r_msg');
  try { await SY().regler({ portes: n('r_portes'), capacite: n('r_cap'), delai: n('r_delai'), debut: $('#r_debut').value || '08:00', pas: n('r_pas'), parCreneau: n('r_par'), lieu: $('#r_lieu').value, decalage: n('r_dec'), jours: jours.length ? jours : [1, 2, 3, 4, 5] }); m.innerHTML = '<div class="alert vert">✔ Réglages enregistrés.</div>'; vueReglages(); A.rafraichir(); } catch (e) { m.innerHTML = '<div class="alert rouge">' + esc(e.message) + '</div>'; }
};

/* ---------- Complément par le demandeur (suivi) ---------- */
function completerCitoyen() {
  const box = $('#resSuivi'); const id = $('#c_id').value.trim().toUpperCase(), d = DB().find(x => x.id === id); if (!d || !box.querySelector('.carte')) return;
  const m = manquantes(d); const c = document.createElement('div'); c.className = 'carte';
  c.innerHTML = '<h3 style="font-size:16px">' + (m.length ? '⚠ Il manque ' + m.length + ' pièce(s) à votre dossier' : 'Ajouter ou remplacer une pièce') + '</h3><p class="sous" style="margin-bottom:8px">' + (m.length ? 'Envoyez-les ici avec la caméra ou en joignant un fichier. Vous pouvez revenir quand vous voulez avec votre lien de suivi.' : 'Votre dossier est complet. Vous pouvez tout de même ajouter une pièce.') + '</p><div data-editeur="citoyen" data-d="' + d.id + '"></div>';
  box.appendChild(c);
}
new MutationObserver(() => { const box = $('#resSuivi'); if (box && box.querySelector('.carte') && !box.querySelector('[data-editeur="citoyen"]') && box.dataset.busy !== '1') { box.dataset.busy = '1'; completerCitoyen(); setTimeout(() => { box.dataset.busy = '0'; }, 50); } }).observe($('#resSuivi'), { childList: true });

/* ---------- Retour partout ---------- */
$$('.baniere').forEach(b => { const t = b.querySelector('.txt'); if (!t) return; const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'retour'; bt.textContent = '← Retour'; bt.onclick = () => { if (history.length > 1 && history.state && history.state.v !== 'accueil') history.back(); else A.aller('accueil'); }; t.prepend(bt); });

/* ---------- Branchements ---------- */
function render(v, o) { if (v === 'caisse') caisse(); if (v === 'file') vueFile(); if (v === 'reglages') vueReglages(); if (v === 'guichet' && o !== 'sync') { bandeauBrouillon(); majEtapes(); const ed = $('#edGuichet'); ed.dataset.monte = '0'; monter(); hydrate(); } }
$('#bScanCaisse').onclick = lancerScan; $('#bScanStop').onclick = arretScan; $('#bScanEx').onclick = () => exempleCaisse(false); $('#bScanEx2').onclick = () => exempleCaisse(true); $('#bCaisseOuvrir').onclick = () => ouvrirCaisse();
document.addEventListener('click', e => { const tr = e.target.closest('#tbCaisse tr.cl, #tbFile tr.cl'); if (tr) A.detail(tr.dataset.id); });
window.__spSuite = { extras, reset, aSignature, accuse, lierAccuse, piecesHtml: piecesHtmlDetail, render, apres, role: r => { role = r; if ($('#v-file').classList.contains('on')) vueFile(); } };
majEtapes(); monter(); hydrate(); bandeauBrouillon();
try { const q = new URLSearchParams(location.search); if (q.get('suivi') && !q.get('esp')) { A.aller('citoyen'); $('#c_id').value = q.get('suivi'); $('#c_code').value = q.get('code') || ''; $('#bSuivre').click(); } } catch (e) { }
})();
