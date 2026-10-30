// Petit œil « voir / cacher » sur tous les champs mot de passe / code PIN du site.
// Sur ordinateur : en survolant l'œil, le mot de passe s'affiche ; en le quittant, il se recache.
// Un clic fixe l'affichage (et un second clic le cache). Sur téléphone : un appui affiche / cache.
// S'ajoute tout seul, y compris aux champs créés après le chargement de la page.
(function () {
  var SVG_OPEN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var SVG_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.2A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.7A17.8 17.8 0 0 0 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  var style = document.createElement('style');
  style.textContent = '.oeil-btn{transition:opacity .15s ease,background .15s ease,transform .15s ease;}.oeil-btn:hover,.oeil-btn:focus-visible{opacity:1!important;background:rgba(127,127,127,.22)!important;transform:translateY(-50%) scale(1.08)!important;}.oeil-btn:focus-visible{outline:2px solid currentColor;outline-offset:1px;}';
  document.head.appendChild(style);
  var survol = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

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
    btn.innerHTML = '<span class="oeil-o" style="display:flex;pointer-events:none">' + SVG_OPEN + '</span><span class="oeil-x" style="display:none;pointer-events:none">' + SVG_OFF + '</span>';
    var ico1 = btn.firstChild, ico2 = btn.lastChild;
    btn.style.cssText = 'position:absolute;right:6px;top:50%;transform:translateY(-50%);width:36px;height:36px;margin:0;padding:0;border:0;background:transparent;color:inherit;opacity:.65;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:8px;';
    btn.className = 'oeil-btn';
    var fixe = false;
    function montrer(oui) {
      input.type = oui ? 'text' : 'password';
      ico1.style.display = oui ? 'none' : 'flex'; ico2.style.display = oui ? 'flex' : 'none';
      btn.setAttribute('aria-label', oui ? 'Cacher le mot de passe' : 'Voir le mot de passe');
      btn.setAttribute('aria-pressed', oui ? 'true' : 'false');
    }
    if (survol) {
      btn.addEventListener('mouseenter', function () { if (!fixe) montrer(true); });
      btn.addEventListener('mouseleave', function () { if (!fixe) montrer(false); });
    }
    btn.addEventListener('click', function () {
      if (survol) { fixe = !fixe; montrer(fixe); }
      else { montrer(input.type === 'password'); }
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
