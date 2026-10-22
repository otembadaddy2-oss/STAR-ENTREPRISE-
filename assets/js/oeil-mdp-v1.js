// Petit œil « voir / cacher » sur tous les champs mot de passe / code PIN du site.
// S'ajoute tout seul, y compris aux champs créés après le chargement de la page.
(function () {
  var SVG_OPEN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var SVG_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.2A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.7A17.8 17.8 0 0 0 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  function ajouter(input) {
    if (input.dataset.oeil) return;
    input.dataset.oeil = '1';
    var parent = input.parentNode;
    if (!parent) return;
    var wrap = document.createElement('span');
    wrap.style.cssText = 'position:relative;display:block;width:100%;';
    parent.insertBefore(wrap, input);
    wrap.appendChild(input);
    var pad = parseInt(window.getComputedStyle(input).paddingRight, 10) || 0;
    if (pad < 46) input.style.paddingRight = '46px';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Voir le mot de passe');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = SVG_OPEN;
    btn.style.cssText = 'position:absolute;right:6px;top:50%;transform:translateY(-50%);width:36px;height:36px;margin:0;padding:0;border:0;background:transparent;color:inherit;opacity:.65;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:8px;';
    btn.addEventListener('click', function () {
      var voir = input.type === 'password';
      input.type = voir ? 'text' : 'password';
      btn.innerHTML = voir ? SVG_OFF : SVG_OPEN;
      btn.setAttribute('aria-label', voir ? 'Cacher le mot de passe' : 'Voir le mot de passe');
      btn.setAttribute('aria-pressed', voir ? 'true' : 'false');
      input.focus();
    });
    wrap.appendChild(btn);
  }

  function scan(racine) {
    var list = (racine || document).querySelectorAll('input[type="password"]');
    for (var i = 0; i < list.length; i++) ajouter(list[i]);
  }

  function start() {
    scan(document);
    if (window.MutationObserver) {
      new MutationObserver(function () { scan(document); }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
