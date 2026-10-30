// Champ date « à roulettes » : une seule ligne qui s'agrandit au toucher, avec jour / mois / année
// qui défilent de bas en haut. On choisit, puis on touche « OK » à droite.
// Remplace le calendrier natif sur tous les <input type="date"> (la valeur reste au format AAAA-MM-JJ).
(function () {
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var H = 44;       // hauteur d'une ligne
  var LIGNES = 5;   // lignes visibles
  var uid = 0;

  var css = document.createElement('style');
  css.textContent =
    '.roue-date{box-sizing:border-box;width:100%;border:1.5px solid rgba(127,127,127,.4);border-radius:12px;overflow:hidden;background:inherit;transition:border-color .2s ease,box-shadow .2s ease;}' +
    '.roue-date.ouvert{border-color:#E8A93D;box-shadow:0 8px 22px -14px rgba(0,0,0,.45);}' +
    '.roue-date .rd-ligne{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:46px;padding:0 6px 0 14px;cursor:pointer;}' +
    '.roue-date .rd-texte{flex:1;min-width:0;font:inherit;text-align:left;background:none;border:0;color:inherit;padding:11px 0;cursor:pointer;}' +
    '.roue-date .rd-texte.vide{opacity:.55;}' +
    '.roue-date .rd-ok{display:none;border:0;border-radius:10px;padding:9px 18px;font:inherit;font-weight:800;color:#fff;background:linear-gradient(135deg,#FF6B4A,#E8A93D);cursor:pointer;}' +
    '.roue-date.ouvert .rd-ok{display:block;}' +
    '.roue-date .rd-corps{height:0;overflow:hidden;transition:height .28s ease;}' +
    '.roue-date.ouvert .rd-corps{height:' + (H * LIGNES) + 'px;}' +
    '.roue-date .rd-roues{position:relative;display:flex;height:' + (H * LIGNES) + 'px;}' +
    '.roue-date .rd-bande{position:absolute;left:8px;right:8px;top:' + (H * 2) + 'px;height:' + H + 'px;border-radius:10px;background:rgba(127,127,127,.18);pointer-events:none;}' +
    '.roue-date .rd-col{position:relative;flex:1;height:100%;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;outline:none;' +
    '-webkit-mask-image:linear-gradient(transparent,#000 28%,#000 72%,transparent);mask-image:linear-gradient(transparent,#000 28%,#000 72%,transparent);}' +
    '.roue-date .rd-col::-webkit-scrollbar{display:none;}' +
    '.roue-date .rd-col:focus-visible{box-shadow:inset 0 0 0 2px #E8A93D;}' +
    '.roue-date .rd-col.mois{flex:1.6;}' +
    '.roue-date .rd-item{height:' + H + 'px;display:flex;align-items:center;justify-content:center;scroll-snap-align:center;font-size:17px;font-weight:600;}' +
    '.roue-date .rd-cale{height:' + (H * 2) + 'px;scroll-snap-align:none;}' +
    '@media (prefers-reduced-motion:reduce){.roue-date .rd-corps{transition:none;}}';
  document.head.appendChild(css);

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function joursDans(m, a) { return new Date(a, m, 0).getDate(); }

  function monter(input) {
    if (input.dataset.roue) return;
    input.dataset.roue = '1';
    var naissance = /naissance|birth|dob/i.test(input.id + ' ' + input.name);
    var an = new Date().getFullYear();
    var anMin = naissance ? an - 110 : an - 2, anMax = naissance ? an : an + 6;
    var anDefaut = naissance ? an - 25 : an;

    var champ = document.createElement('div');
    champ.className = 'roue-date';
    var id = 'rd' + (++uid);
    champ.innerHTML =
      '<div class="rd-ligne"><button type="button" class="rd-texte vide" aria-expanded="false" aria-controls="' + id + '">jj / mm / aaaa</button><button type="button" class="rd-ok">OK</button></div>' +
      '<div class="rd-corps" id="' + id + '"><div class="rd-roues"><div class="rd-bande"></div>' +
      '<div class="rd-col jour" tabindex="0" role="listbox" aria-label="Jour"></div>' +
      '<div class="rd-col mois" tabindex="0" role="listbox" aria-label="Mois"></div>' +
      '<div class="rd-col annee" tabindex="0" role="listbox" aria-label="Année"></div></div></div>';
    var cs = window.getComputedStyle(input);
    champ.style.font = cs.font; champ.style.color = cs.color;
    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') champ.style.background = cs.backgroundColor;
    if (cs.borderRadius) champ.style.borderRadius = cs.borderRadius;

    input.parentNode.insertBefore(champ, input);
    // le vrai champ reste dans la page (valeur, validation) mais invisible
    input.style.cssText += ';position:absolute;opacity:0;pointer-events:none;height:1px;width:1px;';
    input.tabIndex = -1;

    var texte = champ.querySelector('.rd-texte'), ok = champ.querySelector('.rd-ok');
    var colJ = champ.querySelector('.jour'), colM = champ.querySelector('.mois'), colA = champ.querySelector('.annee');
    var sel = { j: 1, m: 1, a: anDefaut };

    function remplir(col, labels) {
      col.innerHTML = '<div class="rd-item rd-cale"></div>' + labels.map(function (l) { return '<div class="rd-item" role="option">' + l + '</div>'; }).join('') + '<div class="rd-item rd-cale"></div>';
    }
    function lire(col) { return Math.round(col.scrollTop / H); }
    function aller(col, index, doux) { col.scrollTo({ top: index * H, behavior: doux ? 'smooth' : 'auto' }); }

    var labelsA = []; for (var y = anMax; y >= anMin; y--) labelsA.push(y);
    remplir(colM, MOIS);
    remplir(colA, labelsA);
    function majJours() {
      var n = joursDans(sel.m, sel.a), l = []; for (var d = 1; d <= n; d++) l.push(d);
      remplir(colJ, l);
      if (sel.j > n) sel.j = n;
      aller(colJ, sel.j - 1, false);
    }
    function indexAnnee(a) { return anMax - a; }

    function positionner() {
      majJours();
      aller(colM, sel.m - 1, false);
      aller(colA, indexAnnee(sel.a), false);
    }

    function relire() {
      var j = lire(colJ) + 1, m = lire(colM) + 1, a = anMax - lire(colA);
      var changeMA = (m !== sel.m || a !== sel.a);
      sel.m = Math.min(12, Math.max(1, m));
      sel.a = Math.min(anMax, Math.max(anMin, a));
      if (changeMA) { var jPrec = sel.j; majJours(); sel.j = Math.min(jPrec, joursDans(sel.m, sel.a)); aller(colJ, sel.j - 1, false); }
      else { sel.j = Math.min(Math.max(1, j), joursDans(sel.m, sel.a)); }
    }
    [colJ, colM, colA].forEach(function (col) {
      var t = null;
      col.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(relire, 90); });
      col.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); aller(col, lire(col) + (e.key === 'ArrowDown' ? 1 : -1), true); }
        if (e.key === 'Enter') { e.preventDefault(); valider(); }
      });
    });

    function ouvrir() {
      if (champ.classList.contains('ouvert')) return;
      var v = input.value && /^\d{4}-\d{2}-\d{2}$/.test(input.value) ? input.value.split('-') : null;
      if (v) { sel.a = Math.min(anMax, Math.max(anMin, +v[0])); sel.m = +v[1]; sel.j = +v[2]; }
      champ.classList.add('ouvert'); texte.setAttribute('aria-expanded', 'true');
      setTimeout(positionner, 20);
    }
    function fermer() { champ.classList.remove('ouvert'); texte.setAttribute('aria-expanded', 'false'); }
    function valider() {
      relire();
      var val = sel.a + '-' + pad(sel.m) + '-' + pad(sel.j);
      input.value = val;
      texte.textContent = pad(sel.j) + ' ' + MOIS[sel.m - 1] + ' ' + sel.a;
      texte.classList.remove('vide');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      fermer();
    }
    texte.addEventListener('click', function () { champ.classList.contains('ouvert') ? fermer() : ouvrir(); });
    champ.querySelector('.rd-ligne').addEventListener('click', function (e) { if (e.target === this) texte.click(); });
    ok.addEventListener('click', valider);

    if (input.value && /^\d{4}-\d{2}-\d{2}$/.test(input.value)) { var p = input.value.split('-'); texte.textContent = p[2] + ' ' + MOIS[+p[1] - 1] + ' ' + p[0]; texte.classList.remove('vide'); }
  }

  function scan() { var l = document.querySelectorAll('input[type="date"]'); for (var i = 0; i < l.length; i++) monter(l[i]); }
  function start() { scan(); if (window.MutationObserver) new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
