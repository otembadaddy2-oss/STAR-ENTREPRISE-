/* CHECK-IN STAR — cœur de l'application : état de l'hôtel, tableau de bord, plan, séjours, tarifs, vérification. Prototype de démonstration. */
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const C = window.HChambres, J = window.HJournal; const CLE = 'check-in-star-etat-v1';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let E = null;
function charger() { try { const s = JSON.parse(localStorage.getItem(CLE) || 'null'); if (s && s.version === 1 && s.chambres && s.chambres.length === 170) return s; } catch (e) {} return C.etatInitial(); }
function sauver() { try { localStorage.setItem(CLE, JSON.stringify(E)); } catch (e) {} }
E = charger(); sauver();
let mt; function toast(t, ms) { const m = $('#msg'); m.textContent = t; m.style.display = 'block'; clearTimeout(mt); mt = setTimeout(() => m.style.display = 'none', ms || 3400); }
/* ---------- voix ---------- */
let voixOn = false; try { voixOn = localStorage.getItem('chk-voix') === '1'; } catch (e) {}
function majVoix() { $('#b-voix').textContent = voixOn ? '🔊 voix' : '🔇 voix'; }
function parler(t, force) { if (!(voixOn || force) || !('speechSynthesis' in window)) return false; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = 0.95; const v = speechSynthesis.getVoices().find(x => /^fr/i.test(x.lang)); if (v) u.voice = v; speechSynthesis.speak(u); return true; } catch (e) { return false; } }
$('#b-voix').onclick = () => { voixOn = !voixOn; try { localStorage.setItem('chk-voix', voixOn ? '1' : '0'); } catch (e) {} majVoix(); if (voixOn) parler('Voix activée. Je vous accompagne à chaque étape.'); else if ('speechSynthesis' in window) speechSynthesis.cancel(); }; majVoix();
/* ---------- horloge ---------- */
function horloge() { const d = new Date(); $('#horloge').textContent = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); $('#datejour').textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); } horloge(); setInterval(horloge, 20000);
/* ---------- utilitaires ---------- */
const masque = n => { n = String(n || ''); return n.length <= 4 ? n : n.slice(0, 2) + '•'.repeat(Math.max(2, n.length - 5)) + n.slice(-3); };
const fmtD = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const usd = n => n == null ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' $';
const fcfa = n => n == null ? '' : Math.round(n).toLocaleString('fr-FR') + ' FCFA';
function etatChambre(r) {
  const a = C.auj(); if (r.statut === 'maintenance') return 'maint'; const pres = r.sejours.find(s => s.etat === 'present');
  if (pres) return pres.au <= a ? 'depart' : 'occupee'; if (r.statut === 'sale') return 'sale'; if (r.sejours.some(s => s.etat === 'reserve' && s.du === a)) return 'reservee'; return 'libre';
}
const clientDe = id => E.clients.find(c => c.id === id);
function compter(id, a, b) { const el = document.getElementById(id); if (!el) return; const t0 = performance.now(), d = 700; const f = t => { const k = Math.min(1, (t - t0) / d), v = Math.round(a + (b - a) * (1 - Math.pow(1 - k, 3))); el.textContent = v; if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
/* ---------- navigation ---------- */
const ECR = ['tableau', 'arrivee', 'plan', 'sejours', 'tarifs', 'verif'];
const PAR = { tableau: 'Voici l\'état de l\'hôtel en ce moment.', arrivee: 'Présentez le passeport du client.', plan: 'Le plan des cent soixante-dix chambres.', sejours: 'Les clients présents.', tarifs: 'Les catégories et les tarifs.', verif: 'Vérifiez l\'accusé d\'un client.' };
function go(n) { if (!ECR.includes(n)) return; ECR.forEach(k => $('#e-' + k).classList.toggle('on', k === n)); $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.go === n)); window.scrollTo(0, 0); rafraichir(n); if (PAR[n]) parler(PAR[n]); }
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
function rafraichir(n) { n = n || ECR.find(k => $('#e-' + k).classList.contains('on')); ({ tableau: rTableau, plan: rPlan, sejours: rSejours, tarifs: rTarifs, verif: () => { } }[n] || (() => { }))(); $('#hotelnom').textContent = E.hotel; }
/* ---------- tableau de bord ---------- */
function stats() {
  const a = C.auj(); const s = { occ: 0, dep: 0, arr: 0, sale: 0, maint: 0, libre: 0, parType: {} };
  C.TYPES.forEach(t => s.parType[t.id] = { occ: 0, tot: 0 });
  E.chambres.forEach(r => { const et = etatChambre(r); s.parType[r.type].tot++; if (et === 'occupee' || et === 'depart') { s.occ++; s.parType[r.type].occ++; } if (et === 'depart') s.dep++; if (et === 'sale') s.sale++; if (et === 'maint') s.maint++; if (et === 'libre' || et === 'reservee') s.libre++; });
  s.arr = E.clients.filter(c => c.du === a && (c.etat === 'reserve' || c.etat === 'present')).length; return s;
}
function rTableau() {
  const s = stats(); const tot = E.chambres.length; const taux = Math.round(s.occ / tot * 100);
  const k = [[taux, '% d\'occupation', 'var(--bleu)', 'k-taux'], [s.occ, 'chambres occupées sur ' + tot, 'var(--nuit2)', 'k-occ'], [s.arr, 'arrivées aujourd\'hui', 'var(--ok)', 'k-arr'], [s.dep, 'départs aujourd\'hui', 'var(--ora)', 'k-dep'], [s.sale, 'à nettoyer', '#d9a100', 'k-sale'], [s.libre, 'prêtes à vendre', 'var(--vio)', 'k-libre']];
  $('#kpi').innerHTML = k.map(x => '<div style="--c:' + x[2] + '"><b id="' + x[3] + '">0</b><span>' + x[1] + '</span></div>').join(''); k.forEach(x => compter(x[3], 0, x[0]));
  $('#barres').innerHTML = C.TYPES.map(t => { const p = s.parType[t.id]; return '<div class="barre"><span>' + esc(t.court) + '</span><div class="p"><i style="width:' + Math.round(p.occ / p.tot * 100) + '%"></i></div><em>' + p.occ + ' / ' + p.tot + '</em></div>'; }).join('');
  let rev = 0, inconnus = 0; E.clients.filter(c => c.etat === 'present').forEach(c => { const n = C.nuits(c.du, c.au); const t = E.tarifs[E.chambres.find(r => r.n === c.chambre).type]; const u = t && t.usd !== '' && t.usd != null ? Number(t.usd) : null; if (u == null) inconnus++; else rev += u * n; });
  $('#aujourdhui').innerHTML = '<p style="margin:4px 0">🛬 <b>' + s.arr + '</b> arrivée(s) attendue(s) · 🛫 <b>' + s.dep + '</b> départ(s)</p><p style="margin:4px 0">🧹 <b>' + s.sale + '</b> chambre(s) à nettoyer · 🔧 <b>' + s.maint + '</b> en maintenance</p><p style="margin:4px 0">💵 Valeur des séjours en cours (tarifs connus) : <b>' + usd(Math.round(rev)) + '</b>' + (E.taux ? ' ≈ ' + fcfa(rev * Number(E.taux)) : '') + '</p><small style="color:var(--gris)">' + inconnus + ' séjour(s) en suite sur devis non chiffrés. Taxes non incluses.</small>';
  const al = []; const a = C.auj();
  if (s.dep) al.push(['ora', s.dep + ' départ(s) à traiter aujourd\'hui : pensez à libérer et nettoyer les chambres.']);
  if (s.sale) al.push(['mid', s.sale + ' chambre(s) en attente de nettoyage : elles ne peuvent pas être attribuées avant d\'être propres.']);
  E.clients.filter(c => c.alertes && c.alertes.length && c.etat === 'present').forEach(c => al.push(['ko', 'Chambre ' + c.chambre + ' : ' + c.alertes.join(' · ')]));
  const doublons = {}; E.clients.filter(c => c.etat === 'present').forEach(c => { doublons[c.num] = (doublons[c.num] || 0) + 1; }); Object.keys(doublons).filter(k => doublons[k] > 1).forEach(k => al.push(['ko', 'Le même passeport (' + masque(k) + ') apparaît dans plusieurs chambres.']));
  $('#alertes').innerHTML = al.length ? al.map(x => '<div class="alerte' + (x[0] === 'ko' ? ' ko' : '') + '" style="margin:6px 0">' + esc(x[1]) + '</div>').join('') : '<div class="alerte ok">Aucune alerte.</div>';
  chaineEtat();
}
function chaineEtat() { const v = J.verifier(); $('#chaine-etat').innerHTML = v.n ? (v.ok ? '<span style="color:var(--ok)">✔ Chaîne intacte — ' + v.n + ' évènement(s) enregistré(s)</span>' : '<span style="color:var(--ko)">✘ Falsification détectée à l\'évènement n° ' + v.cassure + ' : ' + esc(v.raison) + '</span>') : 'Aucun évènement enregistré pour l\'instant : la première arrivée ouvrira le journal.'; }
$('#b-vchaine').onclick = () => { chaineEtat(); const v = J.verifier(); toast(v.n ? (v.ok ? 'Chaîne intacte.' : 'Falsification détectée !') : 'Journal vide.'); parler(v.n ? (v.ok ? 'La chaîne est intacte.' : 'Attention, une falsification a été détectée.') : 'Le journal est vide.'); };
$('#b-reset').onclick = () => { if (!confirm('Remettre la démonstration à zéro ? Les arrivées saisies seront effacées de cet appareil.')) return; J.vider(); E = C.etatInitial(); sauver(); rafraichir(); toast('Démonstration réinitialisée.'); };
/* ---------- plan ---------- */
let selChambre = null;
const LEG = [['libre', '#1f8a4c', 'Libre et propre'], ['occupee', '#2b6fd6', 'Occupée'], ['depart', '#e07a1a', 'Départ aujourd\'hui'], ['sale', '#d9a100', 'À nettoyer'], ['reservee', '#7a4fc2', 'Arrivée prévue'], ['maint', '#7b8190', 'Maintenance']];
function rPlan() {
  $('#leg').innerHTML = LEG.map(l => '<span><i style="background:' + l[1] + '"></i>' + l[2] + '</span>').join('');
  let h = ''; for (let e = 12; e >= 1; e--) { const rs = E.chambres.filter(r => r.etage === e); h += '<div class="etage"><span class="n">Étage ' + e + '</span>' + rs.map((r, i) => '<button type="button" class="rm ' + etatChambre(r) + (selChambre === r.n ? ' sel' : '') + '" style="animation-delay:' + (i * 12 + (12 - e) * 30) + 'ms" data-r="' + r.n + '" title="Chambre ' + r.n + ' — ' + esc(C.T[r.type].court) + '">' + r.n + '</button>').join('') + '</div>'; }
  $('#plan').innerHTML = h; if (selChambre) detailChambre(selChambre);
}
$('#plan').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { selChambre = b.dataset.r; $$('.rm').forEach(x => x.classList.toggle('sel', x === b)); detailChambre(selChambre); } });
function detailChambre(n) {
  const r = E.chambres.find(x => x.n === n); if (!r) return; const t = C.T[r.type]; const et = etatChambre(r); const pres = r.sejours.find(s => s.etat === 'present'); const c = pres ? clientDe(pres.id) : null; const box = $('#plan-det'); box.style.display = 'block';
  const NOM = { libre: 'Libre et propre', occupee: 'Occupée', depart: 'Départ aujourd\'hui', sale: 'À nettoyer', reservee: 'Arrivée prévue aujourd\'hui', maint: 'En maintenance' };
  let h = '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><img src="' + t.photo + '" alt="" style="width:120px;height:80px;object-fit:cover;border-radius:12px"><div style="flex:1;min-width:180px"><b style="font:700 1.6rem var(--serif)">Chambre ' + r.n + '</b> <span class="pill">' + esc(t.nom) + '</span><br><small>Étage ' + r.etage + ' · ' + NOM[et] + (r.pmr ? ' · accessible PMR' : '') + '</small></div></div>';
  if (c) h += '<p style="margin:8px 0 0"><b>' + esc(c.prenoms) + ' ' + esc(c.nom) + '</b> (' + esc(c.nat) + ') · du ' + fmtD(c.du) + ' au ' + fmtD(c.au) + ' · pièce ' + masque(c.num) + (c.demo ? ' <span class="demo">fictif</span>' : '') + '</p>';
  h += '<div class="rang">'; if (c) h += '<button class="btn ko pt" data-act="depart" data-id="' + c.id + '" type="button">🛫 Départ du client</button>'; if (et === 'sale') h += '<button class="btn or pt" data-act="propre" data-r="' + r.n + '" type="button">🧹 Marquer propre</button>'; if (et === 'libre') h += '<button class="btn cl pt" data-act="sale" data-r="' + r.n + '" type="button">Marquer à nettoyer</button>'; if (et === 'libre' || et === 'sale') h += '<button class="btn cl pt" data-act="maint" data-r="' + r.n + '" type="button">🔧 Maintenance</button>'; if (et === 'maint') h += '<button class="btn or pt" data-act="finmaint" data-r="' + r.n + '" type="button">Fin de maintenance</button>'; h += '</div>';
  box.innerHTML = h;
}
function depart(id) {
  const c = clientDe(id); if (!c) return; const r = E.chambres.find(x => x.n === c.chambre); c.etat = 'parti'; c.parti = new Date().toISOString(); if (r) { r.sejours = r.sejours.filter(s => s.id !== id); r.statut = 'sale'; }
  if (!c.demo) J.ajouter({ id: 'EV-' + Date.now().toString(36).toUpperCase(), t: new Date().toISOString(), type: 'depart', sejour: c.id, chambre: c.chambre }); sauver(); toast('Départ enregistré : la chambre ' + c.chambre + ' passe à nettoyer.'); parler('Départ enregistré. Chambre ' + c.chambre + ' à nettoyer.'); rafraichir();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act; if (a === 'depart') return depart(b.dataset.id); const r = E.chambres.find(x => x.n === b.dataset.r); if (!r) return;
  if (a === 'propre') r.statut = 'propre'; if (a === 'sale') r.statut = 'sale'; if (a === 'maint') r.statut = 'maintenance'; if (a === 'finmaint') r.statut = 'propre'; sauver(); rafraichir(); });
/* ---------- séjours ---------- */
function rSejours() {
  const q = $('#rech').value.trim().toUpperCase(); const L = E.clients.filter(c => c.etat === 'present' || c.etat === 'reserve').filter(c => !q || (c.nom + ' ' + c.prenoms + ' ' + c.chambre + ' ' + c.id).toUpperCase().includes(q)).sort((x, y) => x.chambre.localeCompare(y.chambre, 'fr', { numeric: true }));
  $('#liste').innerHTML = L.slice(0, 80).map(c => '<div class="ligne"><div class="ch">' + c.chambre + '</div><div class="nm"><b>' + esc(c.prenoms) + ' ' + esc(c.nom) + (c.demo ? ' <span class="demo">fictif</span>' : '') + '</b>' + esc(c.nat) + ' · pièce ' + masque(c.num) + ' · ' + fmtD(c.du) + ' → ' + fmtD(c.au) + ' · ' + (c.etat === 'reserve' ? '<span class="pill" style="background:#efe7fb">réservé</span>' : '<span class="pill" style="background:#e1ecfb">présent</span>') + '</div>' + (c.etat === 'present' ? '<button class="btn ko pt" data-act="depart" data-id="' + c.id + '" type="button">Départ</button>' : '') + '</div>').join('') + (L.length > 80 ? '<p style="color:var(--gris);font-size:.85rem">… ' + (L.length - 80) + ' autres : affinez la recherche.</p>' : '') || '<div class="boite">Aucun résultat.</div>';
}
$('#rech').oninput = rSejours;
/* ---------- tarifs ---------- */
function rTarifs() {
  $('#taux').value = E.taux || ''; $('#nomh').value = E.hotel;
  $('#tab-tarifs').innerHTML = '<tr><th>Catégorie</th><th>Chambres</th><th>Tarif / nuit ($)</th><th>Tarif / nuit (FCFA)</th><th>Origine du repère</th></tr>' + C.TYPES.map(t => { const x = E.tarifs[t.id] || {}; return '<tr><td><b>' + esc(t.nom) + '</b></td><td>' + t.nb + '</td><td><input type="number" min="0" step="1" data-t="' + t.id + '" data-m="usd" value="' + (x.usd == null ? '' : x.usd) + '" placeholder="sur devis"></td><td><input type="number" min="0" step="500" data-t="' + t.id + '" data-m="fcfa" value="' + (x.fcfa === '' || x.fcfa == null ? '' : x.fcfa) + '" placeholder="à saisir"></td><td style="font-size:.76rem;color:var(--gris)">' + esc(t.src) + '</td></tr>'; }).join('');
}
$('#b-sauve').onclick = () => { E.taux = $('#taux').value; E.hotel = $('#nomh').value.trim() || E.hotel; $$('#tab-tarifs input').forEach(i => { const t = i.dataset.t, m = i.dataset.m; E.tarifs[t] = E.tarifs[t] || {}; E.tarifs[t][m] = i.value === '' ? (m === 'usd' ? null : '') : Number(i.value); }); sauver(); rafraichir(); toast('Tarifs enregistrés.'); };
/* ---------- vérification d'un accusé ---------- */
function verifier(txt) {
  let code = String(txt || '').trim(); const o = $('#v-res'); if (!code) { o.innerHTML = ''; return; } let h12 = ''; if (code.startsWith('HS1|')) { const p = code.split('|'); code = p[1]; h12 = p[5] || ''; }
  const c = E.clients.find(x => x.id.toUpperCase() === code.toUpperCase()); const a = C.auj();
  if (!c) { o.innerHTML = '<div class="alerte ko"><b>Accusé inconnu.</b> Aucun séjour ne porte ce code. Ne l\'acceptez pas.</div>'; parler('Accusé inconnu.'); return; }
  if (h12 && c.sceau && c.sceau.slice(0, 12) !== h12) { o.innerHTML = '<div class="alerte ko"><b>Accusé altéré.</b> Le sceau ne correspond pas : ce QR a été modifié ou falsifié.</div>'; parler('Accusé altéré.'); return; }
  let st, cl; if (c.etat === 'parti') { st = 'Séjour terminé (client déjà parti).'; cl = 'ko'; } else if (c.etat === 'reserve' && c.du > a) { st = 'Séjour pas encore commencé (arrivée le ' + fmtD(c.du) + ').'; cl = ''; } else if (c.au < a) { st = 'Séjour expiré depuis le ' + fmtD(c.au) + '.'; cl = 'ko'; } else { st = 'Séjour valide : client logé dans l\'hôtel.'; cl = 'ok'; }
  o.innerHTML = '<div class="alerte ' + cl + '"><b>' + st + '</b></div><div class="boite"><b>' + esc(c.prenoms) + ' ' + esc(c.nom.slice(0, 1)) + '.</b> · chambre <b>' + c.chambre + '</b><br>Du ' + fmtD(c.du) + ' au ' + fmtD(c.au) + ' (' + C.nuits(c.du, c.au) + ' nuit(s)) · pièce ' + masque(c.num) + (c.demo ? ' <span class="demo">fictif</span>' : '') + '</div>'; parler(st);
}
$('#b-v').onclick = () => verifier($('#v-code').value);
$('#f-qr').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); const k = Math.min(1, 900 / im.naturalWidth); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height); const q = window.jsQR && jsQR(d.data, c.width, c.height); if (q && q.data) { $('#v-code').value = q.data; verifier(q.data); } else toast('QR non lu : rapprochez-vous et refaites la photo.'); }; im.src = URL.createObjectURL(f); };
window.HApp = { E: () => E, sauver, toast, parler, go, esc, masque, fmtD, usd, fcfa, etatChambre, rafraichir, clientDe };
rafraichir('tableau');
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
})();
