/* Passeport Sûr — alerte de fraude en temps réel pour le Ministère (et la Préfecture) : un message s'affiche dès qu'une alerte grave apparaît. */
(function () {
'use strict';
const A = window.__spApi; if (!A) return;
const $ = s => document.querySelector(s), esc = A.esc, KEY = 'sp_alertes_vues_v1';
const cle = () => { const S = window.__spSync; return KEY + ':' + ((S && S.esp && S.esp()) || 'local'); };
const lues = () => { try { return new Set(JSON.parse(localStorage.getItem(cle()) || '[]')); } catch (e) { return new Set(); } };
const garder = s => { try { localStorage.setItem(cle(), JSON.stringify([...s])); } catch (e) { } };
const st = document.createElement('style'); st.textContent = `
#alerteFraude{position:sticky;top:0;z-index:40;background:linear-gradient(90deg,#8f1d17,#d62f26);color:#fff;padding:10px 16px;display:flex;gap:10px 14px;align-items:center;flex-wrap:wrap;box-shadow:0 4px 18px #0005;border-bottom:3px solid #f6c928}
#alerteFraude .tx{flex:1 1 280px;font-size:14.5px;line-height:1.35}#alerteFraude .tx b{font-weight:800}
#alerteFraude button{min-height:40px;border:0;border-radius:10px;padding:0 14px;cursor:pointer;font-weight:600;background:#fff;color:#8f1d17}#alerteFraude button.sec{background:#ffffff26;color:#fff;border:1px solid #ffffff80}
#alerteToast{position:fixed;right:14px;bottom:14px;z-index:9000;max-width:min(380px,calc(100vw - 28px));background:#8f1d17;color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 10px 30px #0006;border-left:6px solid #f6c928;font-size:14.5px;animation:alIn .35s ease-out}
@keyframes alIn{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}@media (prefers-reduced-motion:reduce){#alerteToast{animation:none}}`;
document.head.appendChild(st);
let vu = null, dernier = '', toastT = null;
const graves = () => A.DB.map(d => ({ d, f: A.flags(d).filter(x => x.n === 'rouge') })).filter(x => x.f.length && !x.d.suite).sort((a, b) => b.d.createdAt.localeCompare(a.d.createdAt));
function toast(h) { let t = $('#alerteToast'); if (!t) { t = document.createElement('div'); t.id = 'alerteToast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.innerHTML = h; clearTimeout(toastT); toastT = setTimeout(() => { const x = $('#alerteToast'); if (x) x.remove(); }, 9000); }
function verifier() {
  const ok = A.role === 'ministere' || A.role === 'prefecture'; let b = $('#alerteFraude');
  if (!ok) { if (b) b.remove(); dernier = ''; vu = null; return; }
  const L = lues(), g = graves(), non = g.filter(x => !L.has(x.d.id)), sig = non.map(x => x.d.id).join(',');
  if (!non.length) { if (b) b.remove(); dernier = sig; vu = new Set(g.map(x => x.d.id)); return; }
  if (sig === dernier && b) return;
  const nouvelles = vu ? non.filter(x => !vu.has(x.d.id)) : [];
  if (nouvelles.length) { const n = nouvelles[0]; if (window.__spSon) window.__spSon.jouer('fraude'); toast('<b>🚨 Nouvelle alerte de fraude</b><br>Dossier <b>' + esc(n.d.id) + '</b> — ' + esc(n.f[0].t)); }
  vu = new Set(g.map(x => x.d.id)); dernier = sig;
  const p = non[0];
  if (!b) { b = document.createElement('div'); b.id = 'alerteFraude'; b.setAttribute('role', 'alert'); b.setAttribute('aria-live', 'assertive'); const ref = $('#bandeau') || document.querySelector('header'); ref.after(b); }
  b.innerHTML = '<div class="tx">🚨 <b>' + non.length + ' alerte' + (non.length > 1 ? 's' : '') + ' de fraude grave non lue' + (non.length > 1 ? 's' : '') + '</b> — la plus récente : dossier <b>' + esc(p.d.id) + '</b> · ' + esc(p.f[0].t) + '</div><button type="button" id="alVoir">Voir les alertes</button><button type="button" class="sec" id="alLu">Marquer comme lues</button>' + (window.__spSon ? '<button type="button" class="sec" id="alSon" aria-label="Son des alertes"></button>' : '');
  const sn = $('#alSon'); if (sn) { const lib = () => { sn.textContent = window.__spSon.actif() ? '🔔 Son' : '🔕 Son coupé'; sn.setAttribute('aria-pressed', window.__spSon.actif() ? 'true' : 'false'); }; lib(); sn.onclick = () => { const v = !window.__spSon.actif(); window.__spSon.regler(v); lib(); if (v) { window.__spSon.debloquer(); setTimeout(() => window.__spSon.jouer('fraude', true), 150); } }; }
  $('#alVoir').onclick = () => A.aller('fraude'); $('#alLu').onclick = () => { const s = lues(); non.forEach(x => s.add(x.d.id)); garder(s); dernier = ''; verifier(); };
}
window.__spAlertes = { verifier };
verifier();
})();
