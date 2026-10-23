// RAPPEL D'ÉCHÉANCE — message automatique signé Keydou.
// 3 jours avant la fin d'un abonnement payant (Famille / Business), une bulle apparaît à l'ouverture de KOMYO :
// « Ton abonnement arrive à échéance le … Merci d'utiliser KOMYO. » avec un bouton Renouveler.
// Un second message s'affiche quand l'abonnement est terminé. Chaque message n'est montré qu'une fois (après un toucher).
(function () {
  var API = '/api/starvibe-subscription';
  var token = null; try { token = localStorage.getItem('starvibe_token'); } catch (e) {}
  if (!token || window.komyoRappel) return;
  window.komyoRappel = true;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function headers(json) { var h = { 'Authorization': 'Bearer ' + token }; if (json) h['Content-Type'] = 'application/json'; return h; }
  function dateLongue(d) { try { return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }

  var css = document.createElement('style');
  css.textContent =
    '#raplZone{position:fixed;left:0;right:0;top:calc(10px + env(safe-area-inset-top));z-index:2147482900;display:flex;justify-content:center;pointer-events:none;padding:0 12px;}' +
    '.rapl{pointer-events:auto;width:100%;max-width:420px;background:#fff;color:#241536;border-radius:22px;padding:16px;font-family:Inter,Arial,sans-serif;box-shadow:0 18px 40px -12px rgba(36,21,54,.55),0 0 0 1px rgba(36,21,54,.08);animation:raplIn .4s cubic-bezier(.2,.9,.3,1.2) both;}' +
    '.rapl.out{animation:raplOut .35s ease both;}' +
    '@keyframes raplIn{from{opacity:0;transform:translateY(-30px) scale(.96)}to{opacity:1;transform:none}}@keyframes raplOut{to{opacity:0;transform:translateY(-24px) scale(.96)}}' +
    '.rapl small{display:block;color:#7a6f86;font-size:11px;font-weight:700;letter-spacing:.05em;margin-bottom:6px;}' +
    '.rapl p{margin:0 0 8px;font-size:14px;line-height:1.45;}.rapl .dt{display:block;font:800 15px Sora,Arial,sans-serif;color:#B5421F;margin:2px 0;}' +
    '.raplSig{display:flex;align-items:center;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid #efe7dc;}' +
    '.raplSig img{width:54px;height:54px;border-radius:50%;object-fit:cover;flex:none;box-shadow:0 0 0 2px #E8A93D;}' +
    '.raplSig b{display:block;font:800 13px Sora,Arial,sans-serif;}.raplSig span{font-size:11.5px;color:#7a6f86;}' +
    '.raplBtns{display:flex;gap:10px;margin-top:12px;}.raplBtns button{flex:1;border:none;border-radius:12px;padding:11px 8px;font:800 14px Sora,Arial,sans-serif;cursor:pointer;}' +
    '.raplYes{background:linear-gradient(135deg,#FF6B4A,#E8A93D);color:#fff;}.raplNo{background:#f1ecf7;color:#241536;}' +
    '@media (prefers-reduced-motion:reduce){.rapl,.rapl.out{animation:none}}';
  document.head.appendChild(css);
  var zone = document.createElement('div'); zone.id = 'raplZone'; zone.setAttribute('role', 'status'); document.body.appendChild(zone);

  function fermer(t, type) {
    try { fetch(API, { method: 'POST', headers: headers(true), body: JSON.stringify({ action: 'rappel_vu', type: type }) }); } catch (e) {}
    t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 380);
  }

  function montrer(r) {
    var prenom = esc(String(r.nom || '').split(/\s+/)[0]), plan = esc(r.planLabel), date = esc(dateLongue(r.expiresAt));
    var bientot = r.type === 'bientot';
    var corps = bientot
      ? '<p>Bonjour' + (prenom ? ' <b>' + prenom + '</b>' : '') + ', ton abonnement <b>' + plan + '</b> arrive à échéance le <span class="dt">' + date + '</span>(dans ' + r.jours + ' jour' + (r.jours > 1 ? 's' : '') + ').</p><p>Pour continuer sans interruption, renouvelle-le dès maintenant.</p><p>Merci d\'utiliser KOMYO.</p>'
      : '<p>Bonjour' + (prenom ? ' <b>' + prenom + '</b>' : '') + ', ton abonnement <b>' + plan + '</b> est arrivé à échéance le <span class="dt">' + date + '</span></p><p>Renouvelle-le pour retrouver tous tes avantages.</p><p>Merci d\'utiliser KOMYO.</p>';
    var t = document.createElement('div'); t.className = 'rapl';
    t.innerHTML = '<small>KOMYO · ' + (bientot ? 'RAPPEL D\'ÉCHÉANCE' : 'ABONNEMENT TERMINÉ') + '</small>' + corps +
      '<div class="raplSig"><img src="assets/img/keydou-badge.webp" alt="Keydou"><div><b>Keydou</b><span>Ta mascotte KOMYO</span></div></div>' +
      '<div class="raplBtns"><button type="button" class="raplYes">Renouveler</button><button type="button" class="raplNo">OK</button></div>';
    zone.appendChild(t);
    t.querySelector('.raplYes').addEventListener('click', function () { fermer(t, r.type); setTimeout(function () { location.href = 'abonnement.html'; }, 250); });
    t.querySelector('.raplNo').addEventListener('click', function () { fermer(t, r.type); });
  }

  setTimeout(function () {
    fetch(API + '?rappel=1', { headers: headers(false) }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d && d.rappel) montrer(d.rappel); }).catch(function () {});
  }, 2500);
})();
