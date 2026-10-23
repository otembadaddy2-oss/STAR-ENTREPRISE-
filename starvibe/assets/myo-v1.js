// MYO — le système d'invitation de KOMYO (suivre + devenir ami).
// Inclus sur les pages d'un compte connecté (pas dans PIOUPIOU). Il vérifie régulièrement s'il y a une invitation
// et, si oui, fait glisser un petit message en haut de l'écran : « Nom t'invite à te suivre et à devenir ami — Oui / Non ».
//  - Oui : vous êtes amis, un court « Vous êtes amis ✓ » s'affiche puis le message disparaît ;
//  - Non : l'invitation est refusée, le message disparaît après un instant ;
//  - sans réponse : le message se retire seul au bout de 20 secondes, l'invitation reste dans la page Myo.
// La personne reste là où elle est : rien ne l'oblige à changer de page.
(function () {
  var API = '/api/starvibe-myo', POLL_MS = 12000, VIE_MS = 20000, FIN_MS = 2600;
  var token = null; try { token = localStorage.getItem('starvibe_token'); } catch (e) {}
  if (!token || window.komyoMyo) return;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function initiales(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function api(opts) {
    opts = opts || {}; opts.headers = Object.assign({ 'Authorization': 'Bearer ' + token }, opts.headers || {});
    return fetch(API + (opts.q || ''), opts.body ? { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers), body: JSON.stringify(opts.body) } : { headers: opts.headers });
  }

  var css = document.createElement('style');
  css.textContent =
    '#myoZone{position:fixed;left:0;right:0;top:calc(10px + env(safe-area-inset-top));z-index:2147483000;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;padding:0 12px;}' +
    '.myoToast{pointer-events:auto;width:100%;max-width:420px;background:#fff;color:#241536;border-radius:20px;box-shadow:0 18px 40px -12px rgba(36,21,54,.55),0 0 0 1px rgba(36,21,54,.08);padding:14px;font-family:Inter,Arial,sans-serif;overflow:hidden;position:relative;animation:myoIn .35s cubic-bezier(.2,.9,.3,1.2) both;}' +
    '.myoToast.out{animation:myoOut .35s ease both;}' +
    '@keyframes myoIn{from{opacity:0;transform:translateY(-30px) scale(.96)}to{opacity:1;transform:none}}' +
    '@keyframes myoOut{to{opacity:0;transform:translateY(-24px) scale(.96)}}' +
    '.myoRow{display:flex;gap:12px;align-items:center;}' +
    '.myoAv{width:46px;height:46px;border-radius:50%;flex:none;background:linear-gradient(135deg,#FF6B4A,#E8A93D);color:#fff;display:flex;align-items:center;justify-content:center;font:800 15px Sora,Arial,sans-serif;position:relative;overflow:hidden;}' +
    '.myoAv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}' +
    '.myoTxt{font-size:13.5px;line-height:1.35;}.myoTxt b{font-family:Sora,Arial,sans-serif;}.myoTxt small{display:block;color:#7a6f86;font-size:11px;margin-top:2px;letter-spacing:.04em;font-weight:700;}' +
    '.myoBtns{display:flex;gap:10px;margin-top:12px;}' +
    '.myoBtns button{flex:1;border:none;border-radius:12px;padding:11px 8px;font:800 14px Sora,Arial,sans-serif;cursor:pointer;}' +
    '.myoYes{background:linear-gradient(135deg,#2fb35f,#1f8f4a);color:#fff;}.myoNo{background:#f1ecf7;color:#241536;}' +
    '.myoBtns button:disabled{opacity:.6;}' +
    '.myoBar{position:absolute;left:0;bottom:0;height:3px;background:linear-gradient(90deg,#FF6B4A,#E8A93D);width:100%;transform-origin:left;animation:myoBar linear forwards;}' +
    '@keyframes myoBar{from{transform:scaleX(1)}to{transform:scaleX(0)}}' +
    '.myoDone{font:700 14px Sora,Arial,sans-serif;text-align:center;padding:6px 4px;}' +
    '@media (prefers-reduced-motion:reduce){.myoToast,.myoToast.out,.myoBar{animation:none}}';
  document.head.appendChild(css);
  var zone = document.createElement('div'); zone.id = 'myoZone'; zone.setAttribute('role', 'status'); zone.setAttribute('aria-live', 'polite'); document.body.appendChild(zone);

  var vues = {}, file = [], enCours = false, nonRepondues = 0;
  function majCompteur(n) { nonRepondues = n; Array.prototype.forEach.call(document.querySelectorAll('[data-myo-count]'), function (e) { e.textContent = n > 0 ? String(n) : ''; e.hidden = n <= 0; }); }

  function retirer(t, delai) { setTimeout(function () { t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); enCours = false; suivant(); }, 380); }, delai || 0); }

  function montrer(inv) {
    enCours = true; vues[inv.id] = true;
    var t = document.createElement('div'); t.className = 'myoToast';
    t.innerHTML =
      '<div class="myoRow"><div class="myoAv">' + esc(initiales(inv.de.nom)) + (inv.de.photoUrl ? '<img src="' + esc(inv.de.photoUrl) + '" alt="" onerror="this.remove()">' : '') + '</div>' +
      '<div class="myoTxt"><b>' + esc(inv.de.nom) + '</b> t\'invite à te suivre et à devenir ami.<small>MYO · INVITATION</small></div></div>' +
      '<div class="myoBtns"><button type="button" class="myoYes">✓ Oui</button><button type="button" class="myoNo">✕ Non</button></div>' +
      '<i class="myoBar" style="animation-duration:' + VIE_MS + 'ms"></i>';
    zone.appendChild(t);
    var fini = false, minuteur = setTimeout(function () { if (!fini) { fini = true; retirer(t, 0); } }, VIE_MS);   // sans réponse : le message se retire seul, l'invitation reste en attente
    function repondre(oui) {
      if (fini) return; fini = true; clearTimeout(minuteur);
      var bs = t.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].disabled = true;
      api({ body: { action: 'repondre', id: inv.id, reponse: oui ? 'oui' : 'non' } }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }).then(function (res) {
        var msg = !res.ok ? (res.d.error || 'Réponse impossible pour le moment.') : (oui ? 'Vous êtes amis avec ' + inv.de.nom + ' ✓' : 'Invitation refusée.');
        t.innerHTML = '<div class="myoDone" style="color:' + (res.ok && oui ? '#1f8f4a' : '#241536') + '">' + esc(msg) + '</div>';
        if (res.ok) majCompteur(Math.max(0, nonRepondues - 1));
        retirer(t, FIN_MS);
      }).catch(function () { t.innerHTML = '<div class="myoDone">Connexion interrompue. Réessaie depuis la page Myo.</div>'; retirer(t, FIN_MS); });
    }
    t.querySelector('.myoYes').addEventListener('click', function () { repondre(true); });
    t.querySelector('.myoNo').addEventListener('click', function () { repondre(false); });
  }
  function suivant() { if (!enCours && file.length) montrer(file.shift()); }

  function verifier() {
    if (document.hidden) return;
    api({ q: '?recues=1' }).then(function (r) { if (!r.ok) return null; return r.json(); }).then(function (d) {
      if (!d) return; var inv = d.invitations || []; majCompteur(inv.length);
      inv.slice().reverse().forEach(function (i) { if (!vues[i.id]) { vues[i.id] = true; file.push(i); } });
      suivant();
    }).catch(function () { /* hors ligne : on réessaiera */ });
  }

  // Inviter quelqu'un (utilisé par le bouton « Inviter » du fil et par la page Myo)
  function inviter(profilId) {
    return api({ body: { action: 'inviter', profilId: Number(profilId) } }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
  }

  window.komyoMyo = { inviter: inviter, verifier: verifier, api: api };
  verifier(); setInterval(verifier, POLL_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) verifier(); });
})();
