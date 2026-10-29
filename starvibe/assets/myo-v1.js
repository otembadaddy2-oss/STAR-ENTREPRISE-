// MYO — le système d'invitation de KOMYO (suivre + devenir ami).
// Inclus sur les pages d'un compte connecté (pas dans PIOUPIOU). Il vérifie régulièrement s'il y a une invitation
// et, si oui, fait glisser un petit message en haut de l'écran : « Nom t'invite à te suivre et à devenir ami — Oui / Non ».
//  - Oui : vous êtes amis, un court « Vous êtes amis ✓ » s'affiche puis le message disparaît ;
//  - Non : l'invitation est refusée, le message disparaît après un instant ;
//  - sans réponse : le message se retire seul au bout de 20 secondes, l'invitation reste dans la page Myo.
// La personne reste là où elle est : rien ne l'oblige à changer de page.
// REGARDER ENSEMBLE : « Nom t'invite à regarder une vidéo ensemble — ▶ Regarder / ✕ Non ». Regarder : la même vidéo s'ouvre dans son propre fil ;
// Non : le message disparaît sans rien dire à l'ami.
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
    '.myoIn{width:100%;margin-top:10px;border:1.5px solid #eee2cc;border-radius:12px;padding:11px 12px;font:500 15px Inter,Arial,sans-serif;color:#241536;background:#fffaf0;}' +
    '.myoIn:focus{outline:none;border-color:#E8A93D;}.myoVal{margin-top:8px;font:700 14px Sora,Arial,sans-serif;word-break:break-all;background:#f6f1ff;border-radius:10px;padding:9px 11px;}' +
    '.myoErr{color:#b3261e;font-size:12px;margin-top:6px;}.myoChk{display:flex;gap:8px;align-items:center;margin-top:8px;font-size:12px;color:#6b5f80;}' +
    '.myoBtns.tri button{font-size:13px;}.myoOk{background:#241536;color:#fff;}' +
    '.myoCap{margin-top:8px;font-size:12px;color:#6b5f80;font-style:italic;line-height:1.3;border-left:3px solid #E8A93D;padding-left:8px;}' +
    '@media (prefers-reduced-motion:reduce){.myoToast,.myoToast.out,.myoBar{animation:none}}';
  document.head.appendChild(css);
  var zone = document.createElement('div'); zone.id = 'myoZone'; zone.setAttribute('role', 'status'); zone.setAttribute('aria-live', 'polite'); document.body.appendChild(zone);

  var vues = {}, file = [], enCours = false, nonRepondues = 0;
  function majCompteur(n) { nonRepondues = n; Array.prototype.forEach.call(document.querySelectorAll('[data-myo-count]'), function (e) { e.textContent = n > 0 ? String(n) : ''; e.hidden = n <= 0; }); }

  function retirer(t, delai) { setTimeout(function () { t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); enCours = false; suivant(); }, 380); }, delai || 0); }

  var TYPES = { gmail: 'Gmail', whatsapp: 'WhatsApp' };
  function carte(de, html, btns) {
    var t = document.createElement('div'); t.className = 'myoToast';
    t.innerHTML = '<div class="myoRow"><div class="myoAv">' + esc(initiales(de.nom)) + (de.photoUrl ? '<img src="' + esc(de.photoUrl) + '" alt="" onerror="this.remove()">' : '') + '</div><div class="myoTxt">' + html + '</div></div>' + btns + '<i class="myoBar" style="animation-duration:' + (VIE_MS) + 'ms"></i>';
    zone.appendChild(t); return t;
  }
  function vie(t, avantFin) { var fini = false, m = setTimeout(function () { if (!fini) { fini = true; retirer(t, 0); } }, VIE_MS); return { stop: function () { fini = true; clearTimeout(m); }, fini: function () { return fini; } }; }

  function montrerInvitation(inv) {
    var t = carte(inv.de, '<b>' + esc(inv.de.nom) + '</b> t\'invite à te suivre et à devenir ami.<small>MYO · INVITATION</small>',
      '<div class="myoBtns"><button type="button" class="myoYes">✓ Oui</button><button type="button" class="myoNo">✕ Non</button></div>');
    var v = vie(t);   // sans réponse : le message se retire seul, l'invitation reste en attente
    function repondre(oui) {
      if (v.fini()) return; v.stop();
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

  // Regarder ensemble : un ami t'invite à regarder une vidéo
  function montrerRegarder(g) {
    var t = carte(g.de, '<b>' + esc(g.de.nom) + '</b> t\'invite à regarder une vidéo ensemble.<small>MYO · REGARDER ENSEMBLE</small>' + (g.legende ? '<div class="myoCap">« ' + esc(g.legende) + ' »</div>' : ''),
      '<div class="myoBtns"><button type="button" class="myoYes">▶ Regarder</button><button type="button" class="myoNo">✕ Non</button></div>');
    var v = vie(t);   // sans réponse : le message se retire seul (l'invitation reste valable 24 h)
    function repondre(oui) {
      if (v.fini()) return; v.stop();
      var bs = t.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].disabled = true;
      api({ body: { action: 'regarder_repondre', id: g.id, reponse: oui ? 'oui' : 'non' } }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }).then(function (res) {
        if (!oui) { retirer(t, 0); return; }                                   // Non : rien ne se passe, le message disparaît
        if (!res.ok || !res.d.videoId) { t.innerHTML = '<div class="myoDone">' + esc(res.d.error || 'Cette invitation n\'existe plus.') + '</div>'; retirer(t, FIN_MS); return; }
        t.innerHTML = '<div class="myoDone" style="color:#1f8f4a">Ouverture de la vidéo…</div>';
        if (typeof window.komyoOuvrirVideo === 'function') { window.komyoOuvrirVideo(String(res.d.videoId)); retirer(t, 900); }
        else { setTimeout(function () { location.href = 'fil.html?video=' + encodeURIComponent(res.d.videoId); }, 500); }
      }).catch(function () { t.innerHTML = '<div class="myoDone">Connexion interrompue. Réessaie.</div>'; retirer(t, FIN_MS); });
    }
    t.querySelector('.myoYes').addEventListener('click', function () { repondre(true); });
    t.querySelector('.myoNo').addEventListener('click', function () { repondre(false); });
  }

  // Kaba+ : un ami demande ton Gmail ou ton WhatsApp. Tu choisis ce que tu partages, ou tu refuses.
  function montrerKaba(k, defauts) {
    var nom = TYPES[k.type] || k.type, defaut = k.type === 'gmail' ? (defauts.gmail || '') : (defauts.whatsapp || '');
    var t = carte(k.de, '<b>' + esc(k.de.nom) + '</b> te demande ton <b>' + esc(nom) + '</b>.<small>KABA+ · PARTAGE DE CONTACT</small>',
      '<input class="myoIn" type="' + (k.type === 'gmail' ? 'email' : 'tel') + '" inputmode="' + (k.type === 'gmail' ? 'email' : 'tel') + '" autocomplete="off" placeholder="' + (k.type === 'gmail' ? 'ton adresse Gmail' : 'ton numéro WhatsApp avec l\'indicatif') + '" value="' + esc(defaut) + '">' +
      (k.type === 'gmail' ? '<label class="myoChk"><input type="checkbox" class="myoMem" checked> Garder cette adresse pour la prochaine fois</label>' : '') +
      '<div class="myoErr" hidden></div><div class="myoBtns"><button type="button" class="myoYes">✓ Partager</button><button type="button" class="myoNo">✕ Non</button></div>');
    var v = vie(t), champ = t.querySelector('.myoIn'), err = t.querySelector('.myoErr');
    champ.addEventListener('focus', function () { v.stop(); t.querySelector('.myoBar').style.display = 'none'; });   // il est en train d'écrire : on ne retire pas le message
    function envoyer(oui) {
      if (oui && !champ.value.trim()) { err.textContent = 'Écris ' + (k.type === 'gmail' ? 'ton adresse e-mail.' : 'ton numéro.'); err.hidden = false; return; }
      if (oui) {
        var val = champ.value.trim();
        if (k.type === 'gmail' ? !/^[^\s@]{1,64}@[^\s@]{1,63}\.[^\s@]{2,}$/.test(val) : (val.replace(/\D/g, '').length < 8 || val.replace(/\D/g, '').length > 15)) {
          err.textContent = k.type === 'gmail' ? 'Écris une adresse e-mail valide.' : 'Écris un numéro valide, avec l\'indicatif du pays.'; err.hidden = false; return;
        }
      }
      v.stop(); var bs = t.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].disabled = true;
      var mem = t.querySelector('.myoMem');
      api({ body: { action: 'kaba_repondre', id: k.id, reponse: oui ? 'oui' : 'non', valeur: champ.value.trim(), memoriser: !!(mem && mem.checked) } }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }).then(function (res) {
        if (!res.ok && oui) { err.textContent = res.d.error || 'Partage impossible.'; err.hidden = false; for (var j = 0; j < bs.length; j++) bs[j].disabled = false; return; }
        t.innerHTML = '<div class="myoDone" style="color:' + (oui ? '#1f8f4a' : '#241536') + '">' + esc(oui ? nom + ' partagé avec ' + k.de.nom + ' ✓' : 'Demande refusée.') + '</div>';
        retirer(t, FIN_MS);
      }).catch(function () { err.textContent = 'Connexion interrompue.'; err.hidden = false; for (var j = 0; j < bs.length; j++) bs[j].disabled = false; });
    }
    t.querySelector('.myoYes').addEventListener('click', function () { envoyer(true); });
    t.querySelector('.myoNo').addEventListener('click', function () { envoyer(false); });
  }

  // Quelqu'un a dit Oui : voici son contact
  function lienContact(type, valeur) { return type === 'gmail' ? 'mailto:' + valeur : 'https://wa.me/' + String(valeur).replace(/[^0-9]/g, ''); }
  function montrerPartage(p) {
    var nom = TYPES[p.type] || p.type;
    var t = carte(p.de, '<b>' + esc(p.de.nom) + '</b> t\'a partagé son <b>' + esc(nom) + '</b>.<small>KABA+ · CONTACT REÇU</small><div class="myoVal">' + esc(p.valeur) + '</div>',
      '<div class="myoBtns tri"><button type="button" class="myoYes">Ouvrir</button><button type="button" class="myoNo myoCopy">Copier</button><button type="button" class="myoNo myoOk">OK</button></div>');
    var v = vie(t);
    t.querySelector('.myoYes').addEventListener('click', function () { v.stop(); window.open(lienContact(p.type, p.valeur), '_blank', 'noopener'); retirer(t, 600); });
    t.querySelector('.myoCopy').addEventListener('click', function () { try { navigator.clipboard.writeText(p.valeur); this.textContent = 'Copié ✓'; } catch (e) { this.textContent = 'Sélectionne le texte'; } });
    t.querySelector('.myoOk').addEventListener('click', function () { v.stop(); retirer(t, 0); });
  }

  function montrer(e) { enCours = true; if (e.kind === 'reg') montrerRegarder(e.g); else if (e.kind === 'kaba') montrerKaba(e.k, e.defauts); else if (e.kind === 'part') montrerPartage(e.p); else montrerInvitation(e.inv); }
  function suivant() { if (!enCours && file.length) montrer(file.shift()); }

  function verifier() {
    if (document.hidden) return;
    api({ q: '?recues=1' }).then(function (r) { if (!r.ok) return null; return r.json(); }).then(function (d) {
      if (!d) return; var inv = d.invitations || []; majCompteur(inv.length);
      inv.slice().reverse().forEach(function (i) { if (!vues['i' + i.id]) { vues['i' + i.id] = true; file.push({ kind: 'inv', inv: i }); } });
      (d.regarder || []).slice().reverse().forEach(function (g) { if (!vues['g' + g.id]) { vues['g' + g.id] = true; file.push({ kind: 'reg', g: g }); } });
      (d.kaba || []).slice().reverse().forEach(function (k) { if (!vues['k' + k.id]) { vues['k' + k.id] = true; file.push({ kind: 'kaba', k: k, defauts: d.defauts || {} }); } });
      var nouveaux = (d.partages || []).filter(function (p) { return !vues['p' + p.id]; });
      nouveaux.forEach(function (p) { vues['p' + p.id] = true; file.push({ kind: 'part', p: p }); });
      if (nouveaux.length) api({ body: { action: 'kaba_vu' } });   // le contact reste consultable dans la page Myo, onglet Contacts
      suivant();
    }).catch(function () { /* hors ligne : on réessaiera */ });
  }

  // Inviter quelqu'un (utilisé par le bouton « Inviter » du fil et par la page Myo)
  function inviter(profilId) {
    return api({ body: { action: 'inviter', profilId: Number(profilId) } }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
  }

  // Inviter un ami à regarder une vidéo (utilisé par le bouton « Regarder avec un ami » du fil)
  function regarder(profilId, videoId) {
    return api({ body: { action: 'regarder_inviter', profilId: Number(profilId), videoId: Number(videoId) } }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
  }

  window.komyoMyo = { inviter: inviter, regarder: regarder, verifier: verifier, api: api };
  verifier(); setInterval(verifier, POLL_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) verifier(); });
})();
