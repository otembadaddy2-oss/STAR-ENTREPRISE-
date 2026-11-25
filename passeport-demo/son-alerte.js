/* Passeport Sûr — son des alertes. Une alerte de fraude ou de sécurité fait sonner l'appareil du Ministre (et de la Préfecture) en plus du message rouge.
   Le son est fabriqué par l'appareil lui-même (aucun fichier à télécharger). Limites honnêtes : le navigateur n'autorise un son qu'après un premier toucher de l'écran,
   le son ne retentit que pendant que l'application est ouverte, et un téléphone en mode silencieux peut le couper. */
(function () {
'use strict';
const KEY = 'sp_son_v1';
let ctx = null, debloque = false, enAttente = null, dernierSon = 0, finSon = 0, actifs = [], minuteur = null;
const actif = () => { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } };
const regler = v => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { } majIndice(); return v; };
function contexte() { if (ctx) return ctx; const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { ctx = new C(); } catch (e) { ctx = null; } return ctx; }
// Un son n'est permis par le navigateur qu'après un geste de la personne : au premier toucher, on « débloque » le son (et on rejoue une alerte arrivée entre-temps).
function debloquer() {
  const c = contexte(); if (!c) return;
  const fin = () => { debloque = true; majIndice(); if (enAttente) { const n = enAttente; enAttente = null; if (Date.now() - n.at < 120000) jouer(n.niveau, true); } };
  try { const r = c.resume && c.resume(); if (r && r.then) r.then(fin, () => { }); else fin(); } catch (e) { }
}
['pointerdown', 'touchstart', 'keydown', 'click'].forEach(e => window.addEventListener(e, debloquer, { passive: true, capture: true }));
function note(c, t, freq, dur, vol) { const o = c.createOscillator(), g = c.createGain(); actifs.push({ o, g }); o.type = 'square'; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.setValueAtTime(vol, t + dur - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02); }
// Deux tons alternés façon sirène. « fraude » : 4 cycles, plus aigu. « securite » : 3 cycles, plus grave.
function jouer(niveau, rejoue) {
  if (!actif()) return false;
  const maintenant = Date.now(); if (!rejoue && maintenant - dernierSon < 1500) return false;   // pas deux sirènes superposées
  const c = contexte(); let sonne = false;
  if (c && (c.state === 'running' || debloque)) {
    try {
      const t0 = (c.currentTime || 0) + 0.05, f = niveau === 'fraude' ? [988, 740] : [740, 554], n = niveau === 'fraude' ? 4 : 3;
      for (let i = 0; i < n; i++) { note(c, t0 + i * 0.5, f[0], 0.24, 0.22); note(c, t0 + i * 0.5 + 0.25, f[1], 0.24, 0.22); }
      sonne = true; dernierSon = maintenant; window.__spSonCompte = (window.__spSonCompte || 0) + 1; finSon = maintenant + (n * 500 + 300); boutonStop(n * 500 + 300);
    } catch (e) { }
  }
  try { if (navigator.vibrate) navigator.vibrate(niveau === 'fraude' ? [300, 120, 300, 120, 600] : [250, 120, 250]); } catch (e) { }
  if (!sonne) { enAttente = { niveau, at: maintenant }; majIndice(); }
  return sonne;
}
// Petit rappel visible quand le son est coupé, ou quand l'appareil attend un premier toucher.
function majIndice() {
  let i = document.getElementById('sonIndice');
  const besoin = actif() && enAttente && !debloque;
  if (!besoin) { if (i) i.remove(); return; }
  if (!i) { i = document.createElement('div'); i.id = 'sonIndice'; i.setAttribute('role', 'status'); i.style.cssText = 'position:fixed;left:14px;bottom:170px;z-index:9002;background:#f6c928;color:#3a2c00;border-radius:12px;padding:10px 14px;font:600 14px system-ui,sans-serif;box-shadow:0 8px 24px #0005;max-width:min(360px,calc(100vw - 28px))'; document.body.appendChild(i); }
  i.textContent = '🔔 Touchez l’écran une fois pour activer le son des alertes.';
}
// Arrêt immédiat : coupe la sirène en cours, oublie l'alerte en attente et fait taire la vibration. Bouton « Arrêter le son » visible pendant que ça sonne.
function arreter() {
  actifs.forEach(x => { try { x.o.stop(0); } catch (e) { } try { x.o.disconnect(); x.g.disconnect(); } catch (e) { } }); actifs = []; enAttente = null; finSon = 0;
  try { if (navigator.vibrate) navigator.vibrate(0); } catch (e) { }
  clearTimeout(minuteur); const b = document.getElementById('sonStop'); if (b) b.remove(); majIndice();
}
function boutonStop(ms) {
  let b = document.getElementById('sonStop');
  if (!b) { b = document.createElement('button'); b.id = 'sonStop'; b.type = 'button'; b.setAttribute('aria-label', 'Arrêter le son de l’alerte'); b.style.cssText = 'position:fixed;left:14px;bottom:104px;z-index:9003;min-height:48px;padding:0 18px;border:0;border-radius:14px;background:#fff;color:#8f1d17;font:700 15px system-ui,sans-serif;box-shadow:0 8px 24px #0006;border-left:6px solid #d62f26;cursor:pointer'; b.textContent = '🔇 Arrêter le son'; b.onclick = arreter; document.body.appendChild(b); }
  clearTimeout(minuteur); minuteur = setTimeout(() => { actifs = []; const x = document.getElementById('sonStop'); if (x) x.remove(); }, ms + 400);
}
window.__spSon = { jouer, actif, regler, debloquer, arreter, etat: () => ({ actif: actif(), debloque, attente: !!enAttente, sonne: Date.now() < finSon }) };
})();
