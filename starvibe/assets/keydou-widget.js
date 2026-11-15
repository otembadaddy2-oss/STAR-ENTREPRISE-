/* Keydou - assistant d'entreprise pour votre site (STAR ENTREPRISE / KOMYO).
   Installation : collez UNE ligne avant </body> sur votre site (la cle vous est donnee dans votre espace entreprise) :
   <script src="https://VOTRE-ADRESSE-KOMYO/starvibe/assets/keydou-widget.js" data-cle="kdpub_..." defer></script>
   L'assistant ne s'affiche que sur les sites declares dans votre espace. Il annonce toujours qu'il est une intelligence artificielle. */
(function () {
  'use strict';
  var script = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
  var cle = script && script.getAttribute('data-cle');
  if (!cle || window.__keydouWidget) return;
  window.__keydouWidget = true;
  var base; try { base = new URL(script.src).origin; } catch (e) { return; }
  var API = base + '/api/entreprise-public';
  var visiteur = '';
  try { visiteur = localStorage.getItem('keydou_visiteur_' + cle) || ''; } catch (e) {}
  if (!/^[a-z0-9]{12,40}$/i.test(visiteur)) {
    visiteur = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^a-z0-9]/g, '').slice(0, 28);
    try { localStorage.setItem('keydou_visiteur_' + cle, visiteur); } catch (e) {}
  }

  fetch(API + '?cle=' + encodeURIComponent(cle)).then(function (r) { return r.ok ? r.json() : null; }).then(function (cfg) {
    if (cfg && cfg.actif) monter(cfg);
  }).catch(function () {});

  function monter(cfg) {
    var couleur = /^#[0-9a-fA-F]{6}$/.test(cfg.couleur) ? cfg.couleur : '#FF6B4A';
    var hote = document.createElement('div');
    hote.setAttribute('data-keydou', '');
    var ombre = hote.attachShadow ? hote.attachShadow({ mode: 'open' }) : hote;
    ombre.innerHTML =
      '<style>' +
      ':host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}' +
      '.b{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:60px;height:60px;border-radius:50%;border:0;background:' + couleur + ';color:#fff;font-size:28px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.28)}' +
      '.b:focus-visible,.s:focus-visible,.i:focus-visible{outline:3px solid #1b1b1b;outline-offset:2px}' +
      '.p{position:fixed;right:16px;bottom:88px;z-index:2147483001;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 110px));background:#fff;color:#1c1c1c;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.35);display:none;flex-direction:column;overflow:hidden}' +
      '.p.o{display:flex}' +
      '.h{background:' + couleur + ';color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px}' +
      '.h b{font-size:15px;line-height:1.2;flex:1}.h small{display:block;font-weight:400;opacity:.92;font-size:11.5px}' +
      '.x{background:transparent;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}' +
      '.m{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#faf8f5}' +
      '.g{max-width:86%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}' +
      '.k{align-self:flex-start;background:#fff;border:1px solid #e8e2d8;border-bottom-left-radius:4px}' +
      '.v{align-self:flex-end;background:' + couleur + ';color:#fff;border-bottom-right-radius:4px}' +
      '.e{align-self:center;background:#fff4f2;color:#8a1f11;border:1px solid #f1c9c2;font-size:13px}' +
      '.f{display:flex;gap:8px;padding:10px;border-top:1px solid #eee;background:#fff}' +
      '.i{flex:1;border:1.5px solid #ddd;border-radius:12px;padding:10px 12px;font-size:15px;resize:none;max-height:90px}' +
      '.s{border:0;border-radius:12px;background:' + couleur + ';color:#fff;padding:0 16px;font-size:15px;font-weight:700;cursor:pointer}.s:disabled{opacity:.5}' +
      '.t{font-size:11px;color:#6b6b6b;text-align:center;padding:0 10px 8px;background:#fff}' +
      '@media (max-width:480px){.p{right:0;bottom:0;width:100vw;height:100vh;border-radius:0}.b{right:12px;bottom:12px}}' +
      '</style>' +
      '<button class="b" type="button" aria-label="Discuter avec l\u2019assistant de ' + esc(cfg.nom) + '">\uD83D\uDCAC</button>' +
      '<div class="p" role="dialog" aria-label="Assistant de ' + esc(cfg.nom) + '">' +
      '<div class="h"><b>' + esc(cfg.assistant || 'Keydou') + '<small>Assistant virtuel de ' + esc(cfg.nom) + ' \u00B7 intelligence artificielle</small></b><button class="x" type="button" aria-label="Fermer">\u00D7</button></div>' +
      '<div class="m" aria-live="polite"></div>' +
      '<div class="f"><textarea class="i" rows="1" maxlength="1000" placeholder="\u00C9crivez votre question\u2026" aria-label="Votre message"></textarea><button class="s" type="button">Envoyer</button></div>' +
      '<div class="t">Ne partagez jamais de code secret ni de num\u00E9ro de carte. \u00C9crit avec Keydou, STAR ENTREPRISE.</div></div>';
    document.body.appendChild(hote);
    var q = function (s) { return ombre.querySelector(s); };
    var bouton = q('.b'), panneau = q('.p'), flux = q('.m'), champ = q('.i'), envoyer = q('.s'), fermer = q('.x');
    var occupe = false, salue = false;
    function bulle(classe, texte) { var d = document.createElement('div'); d.className = 'g ' + classe; d.textContent = texte; flux.appendChild(d); flux.scrollTop = flux.scrollHeight; return d; }
    function ouvrir() {
      panneau.classList.add('o'); bouton.style.display = 'none';
      if (!salue) { salue = true; bulle('k', cfg.accueil || ''); }
      setTimeout(function () { champ.focus(); }, 50);
    }
    function clore() { panneau.classList.remove('o'); bouton.style.display = ''; bouton.focus(); }
    function envoi() {
      var texte = champ.value.trim();
      if (!texte || occupe) return;
      occupe = true; envoyer.disabled = true; champ.value = '';
      bulle('v', texte);
      var attente = bulle('k', '\u2026');
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cle: cle, visiteur: visiteur, message: texte }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (x) {
          if (x.ok && x.d.reponse) attente.textContent = x.d.reponse;
          else { attente.className = 'g e'; attente.textContent = x.d.error || 'L\u2019assistant est indisponible un instant. R\u00E9essayez dans une minute.'; }
        })
        .catch(function () { attente.className = 'g e'; attente.textContent = 'Connexion impossible. V\u00E9rifiez votre r\u00E9seau et r\u00E9essayez.'; })
        .then(function () { occupe = false; envoyer.disabled = false; flux.scrollTop = flux.scrollHeight; champ.focus(); });
    }
    bouton.addEventListener('click', ouvrir); fermer.addEventListener('click', clore); envoyer.addEventListener('click', envoi);
    champ.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoi(); } if (e.key === 'Escape') clore(); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
})();
