/* KOMYO — Français / English
   Le site est écrit en français. Quand la langue choisie est l'anglais, ce script traduit
   à la volée tout ce qui s'affiche (textes, boutons, champs, messages d'erreur, fenêtres
   d'alerte), y compris ce que les pages fabriquent après coup, grâce aux dictionnaires
   assets/i18n/en-*.js (chargés uniquement en anglais).
   Choix de la langue : ?lang=en dans l'adresse, sinon le bouton FR | EN (mémorisé sur
   l'appareil), sinon la langue du téléphone. En français, ce script ne touche à rien. */
(function () {
  'use strict';
  var script = document.currentScript;
  // Options (balise <script>) : data-key = clé de mémorisation de la langue, data-dicts = dictionnaires à charger,
  // data-switch="off" = pas de bouton FR | EN (le site a déjà le sien), et dans ce cas la page se recharge quand sa langue change.
  var KEY = (script && script.getAttribute('data-key')) || 'komyo_lang';
  var PROPRE = !!(script && script.getAttribute('data-key'));
  // INTERRUPTEUR GÉNÉRAL : tant que c'est false, KOMYO reste en français pour tout le monde (l'anglais ne s'ouvre qu'avec ?lang=en,
  // pour les essais). Passer à true le jour où l'anglais est ouvert : la langue suit alors celle du téléphone (français sinon anglais),
  // et un petit sélecteur apparaît en bas des pages.
  var ANGLAIS_OUVERT = false;
  var base = script && script.src ? script.src.replace(/[^\/]*$/, '') : 'assets/';

  function lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ecrire(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* navigation privée */ } }

  var lang = 'fr';
  try {
    var q = /[?&]lang=(fr|en)\b/i.exec(location.search);
    if (!ANGLAIS_OUVERT) {
      // L'anglais n'est pas ouvert : le français est toujours la langue, même si un essai ancien a mémorisé « en » sur cet appareil
      // (Keydou se mettait à parler anglais). Seul ?lang=en dans l'adresse l'ouvre, pour la page ouverte uniquement.
      lang = (q && q[1].toLowerCase() === 'en') ? 'en' : 'fr';
      if (lire(KEY) === 'en') ecrire(KEY, 'fr');
    }
    else if (q) { lang = q[1].toLowerCase(); ecrire(KEY, lang); ecrire(KEY + '_bouton', '1'); }
    else {
      var saved = lire(KEY);
      if (saved === 'fr' || saved === 'en') lang = saved;
      else lang = (ANGLAIS_OUVERT && !PROPRE && !/^fr\b/i.test(navigator.language || 'fr')) ? 'en' : 'fr';
    }
  } catch (e) { lang = 'fr'; }

  var I18N = window.I18N = { lang: lang, D: {}, P: [], missing: {} };
  window.KOMYO_LANG = lang;
  document.documentElement.lang = lang;
  I18N.t = function (s) { return s; };
  I18N.set = function (l) { ecrire(KEY, l); location.href = location.pathname + location.search.replace(/([?&])lang=[^&]*&?/i, '$1').replace(/[?&]$/, '') + location.hash; };

  // ---- petit sélecteur de langue, discret, en bas de page : Français · English ----
  function bouton() {
    if (!ANGLAIS_OUVERT) return;      // pas encore ouvert au public : aucun sélecteur de langue
    if (document.getElementById('komyoLang') || document.documentElement.hasAttribute('data-no-lang-switch') || (script && script.getAttribute('data-switch') === 'off')) return;
    var pied = document.querySelector('footer');
    if (!pied && (document.body.classList.contains('pg-fil') || !document.body)) return;
    var css = document.createElement('style');
    css.textContent =
      '#komyoLang{display:inline-flex;align-items:center;gap:6px;font:600 12px/1 Arial,sans-serif;color:inherit;opacity:.75;margin-top:10px;-webkit-tap-highlight-color:transparent}' +
      '#komyoLang button{all:unset;box-sizing:border-box;cursor:pointer;padding:5px 3px;text-decoration:underline;text-underline-offset:3px;color:inherit}' +
      '#komyoLang button[aria-pressed=true]{text-decoration:none;font-weight:800;opacity:1;cursor:default}' +
      '#komyoLang button:focus-visible{outline:2px solid #E8A93D;outline-offset:2px;border-radius:4px}' +
      '#komyoLang i{font-style:normal;opacity:.5}' +
      '#komyoLang.flottant{position:fixed;z-index:2147483000;right:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);margin:0;padding:3px 8px;border-radius:14px;background:rgba(36,21,54,.72);color:#fff;opacity:.8}';
    document.head.appendChild(css);
    var box = document.createElement('div');
    box.id = 'komyoLang'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Langue / Language');
    box.className = 'notranslate' + (pied ? '' : ' flottant'); box.setAttribute('translate', 'no');
    [['fr', 'Français'], ['en', 'English']].forEach(function (o, i) {
      if (i) { var sep = document.createElement('i'); sep.textContent = '·'; box.appendChild(sep); }
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = o[1]; b.lang = o[0]; b.setAttribute('aria-label', o[1]);
      b.setAttribute('aria-pressed', lang === o[0] ? 'true' : 'false');
      b.addEventListener('click', function () { if (lang !== o[0]) I18N.set(o[0]); });
      box.appendChild(b);
    });
    if (pied) { var ligne = document.createElement('div'); ligne.style.cssText = 'text-align:center'; ligne.appendChild(box); pied.appendChild(ligne); }
    else document.body.appendChild(box);
  }
  function pret(f) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f); else f(); }
  pret(bouton);

  if (lang !== 'en') return;

  // =====================================================================
  //  Mode anglais
  // =====================================================================
  // En anglais, la page est déjà traduite par KOMYO : on empêche le navigateur (Chrome, Edge…) de la « retraduire » en français
  // à sa façon, ce qui mélangeait l'anglais et le français et changeait certains titres.
  document.documentElement.setAttribute('translate', 'no');
  document.documentElement.classList.add('notranslate');
  (function () { var m = document.createElement('meta'); m.name = 'google'; m.content = 'notranslate'; (document.head || document.documentElement).appendChild(m); })();
  var FILES = ((script && script.getAttribute('data-dicts')) || 'common,public,keydou,staff,staff-blocks,data').split(',');
  FILES.forEach(function (f) { document.write('<script src="' + base + 'i18n/en-' + f + '-v1.js"><\/script>'); });

  var D = I18N.D, P = I18N.P, OUT = {};
  // Les dictionnaires s'enregistrent avec I18N.add({ "Français": "English", … }) et I18N.pat([ [/regex/, "$1"], … ])
  I18N.add = function (o) { for (var k in o) D[norm(k)] = o[k]; };
  I18N.pat = function (a) { for (var i = 0; i < a.length; i++) P.push(a[i]); };

  function norm(s) { return String(s).replace(/\s+/g, ' ').replace(/[’‘]/g, "'").trim(); }
  var LEAD = /^[^\p{L}\p{N}(\[«"“]+/u;

  function cherche(core) {
    if (Object.prototype.hasOwnProperty.call(D, core)) return D[core];
    for (var i = 0; i < P.length; i++) {
      var m = P[i][0].exec(core);
      if (m) {
        var r = P[i][1];
        return typeof r === 'function' ? r.apply(null, m) : core.replace(P[i][0], r);
      }
    }
    return null;
  }

  function traduit(s) {
    if (s == null) return s;
    s = String(s);
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    var core = norm(m[2]);
    if (!core) return s;
    if (!/[A-Za-zÀ-ÿ]/.test(core)) { // « ! 👋 », « → » : seulement si le dictionnaire les connaît
      return Object.prototype.hasOwnProperty.call(D, core) ? m[1] + D[core] + m[3] : s;
    }
    var r = cherche(core);
    if (r == null) {
      // emoji / puces / flèches en tête : on traduit le reste et on garde le symbole
      var lead = LEAD.exec(core);
      if (lead && lead[0].length < core.length) {
        var reste = core.slice(lead[0].length);
        r = cherche(reste);
        if (r != null) r = lead[0] + r;
      }
    }
    if (r == null) {
      // "Texte …", "Texte :", "Texte !" : ponctuation à la française retirée avant la recherche
      var f = /^([\s\S]+?)\s*(\.{3}|…|:|!|\?|\.)\s*$/.exec(core);
      if (f) {
        var r2 = cherche(f[1]);
        if (r2 == null) { var lead2 = LEAD.exec(f[1]); if (lead2 && lead2[0].length < f[1].length) { var r3 = cherche(f[1].slice(lead2[0].length)); if (r3 != null) r2 = lead2[0] + r3; } }
        if (r2 != null) r = r2.replace(/[.…:!?]+$/, '') + (f[2] === '...' ? '…' : f[2]);
      }
    }
    if (r == null) { if (/[a-zà-ÿ]{3}/i.test(core) && !OUT[core]) I18N.missing[core] = 1; return s; }
    OUT[norm(r)] = 1;
    return m[1] + r + m[3];
  }
  I18N.t = traduit;

  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1 };
  function ignore(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (SKIP[e.tagName] || e.hasAttribute('translate') && e.getAttribute('translate') === 'no' || e.hasAttribute('data-no-i18n')) return true;
    }
    return false;
  }
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var INLINE = /^(B|I|U|STRONG|EM|SMALL|MARK|A|SPAN|BR|SUB|SUP|S|ABBR)$/;

  function attrs(el) {
    if (el.nodeType === 1 && el.closest && el.closest('[translate=no],[data-no-i18n]')) return;
    if (el.nodeType !== 1 || SKIP[el.tagName] && el.tagName !== 'TEXTAREA') return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (el.hasAttribute(a)) { var v = el.getAttribute(a), t = traduit(v); if (t !== v) el.setAttribute(a, t); }
    }
    var tag = el.tagName;
    // images qui portent du texte français (devise du logo) : version anglaise
    if (tag === 'IMG' && el.getAttribute('src') && /komyo-logo-officiel-v[12]\.(png|webp)/.test(el.getAttribute('src'))) el.setAttribute('src', el.getAttribute('src').replace(/komyo-logo-officiel-v[12]/, function(m){ return m.replace('officiel', 'officiel-en'); }));
    if ((tag === 'INPUT' && /^(button|submit|reset)$/i.test(el.type)) || tag === 'OPTION') {
      var vv = el.getAttribute('value');
      if (vv && tag === 'INPUT') { var tv = traduit(vv); if (tv !== vv) el.setAttribute('value', tv); }
    }
    if (tag === 'META') {
      var n = el.getAttribute('name') || el.getAttribute('property') || '';
      if (/^(description|og:title|og:description|twitter:title|twitter:description)$/.test(n)) {
        var c = el.getAttribute('content'), tc = traduit(c); if (tc !== c) el.setAttribute('content', tc);
      }
    }
  }

  // Un élément qui mélange texte et balises (« Merci <b>Carry</b> ! ») peut être traduit d'un bloc :
  // le dictionnaire contient alors son HTML interne exact.
  function bloc(el) {
    if (!el.firstElementChild || ignore(el)) return false;
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 1 && !INLINE.test(c.tagName)) return false;
    }
    var key = norm(el.innerHTML);
    if (Object.prototype.hasOwnProperty.call(D, key)) {
      el.innerHTML = D[key];
      el.setAttribute('data-i18n-done', '1');
      return true;
    }
    return false;
  }

  function texte(n) {
    var p = n.parentNode;
    if (!p || p.nodeType !== 1) return;
    if (ignore(p)) return;
    var v = n.nodeValue, t = traduit(v);
    if (t !== v) n.nodeValue = t;
  }

  function parcourir(racine) {
    if (!racine) return;
    if (racine.nodeType === 3) { texte(racine); return; }
    if (racine.nodeType !== 1 && racine.nodeType !== 9) return;
    var el = racine.nodeType === 9 ? racine.documentElement : racine;
    if (el.nodeType === 1 && ignore(el)) return;
    var tous = [el].concat([].slice.call(el.getElementsByTagName('*')));
    // d'abord les blocs mixtes (du plus grand au plus petit), ensuite les fragments restants
    for (var i = 0; i < tous.length; i++) {
      var e = tous[i];
      if (e.closest && e.closest('[data-i18n-done]') && !e.hasAttribute('data-i18n-done')) continue;
      if (!e.hasAttribute('data-i18n-done')) bloc(e);
    }
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n, lst = [];
    while ((n = w.nextNode())) lst.push(n);
    lst.forEach(function (t) { if (!t.parentNode || !(t.parentNode.closest && t.parentNode.closest('[data-i18n-done]'))) texte(t); });
    tous.forEach(attrs);
  }

  var obs = null;
  function demarre() {
    parcourir(document);
    if (document.title) { var tt = traduit(document.title); if (tt !== document.title) document.title = tt; }
    obs = new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (r.type === 'characterData') texte(r.target);
        else if (r.type === 'attributes') attrs(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) {
          var a = r.addedNodes[j];
          if (a.nodeType === 1 && a.id === 'komyoLang') continue;
          if (a.nodeType === 1 && a.parentNode && a.parentNode.closest && a.parentNode.closest('[data-i18n-done]')) { parcourir(a); continue; }
          parcourir(a);
          if (a.nodeType === 1 && a.parentNode && a.parentNode.nodeType === 1) bloc(a.parentNode);
        }
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['value', 'content', 'src']) });
  }
  pret(demarre);
  // Site qui a son propre bouton de langue : quand il change la langue de la page, on recharge pour que tout suive.
  if (PROPRE) pret(function () {
    new MutationObserver(function () { if (document.documentElement.lang !== lang) location.reload(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  });

  // ---- fenêtres d'alerte du navigateur ----
  ['alert', 'confirm', 'prompt'].forEach(function (nom) {
    var o = window[nom];
    if (typeof o !== 'function') return;
    window[nom] = function (msg, def) { return o.call(window, traduit(msg), def); };
  });

  // ---- dates et nombres à l'anglaise ----
  function loc(a) { return typeof a === 'string' && /^fr\b/i.test(a) ? 'en-GB' : (a === undefined ? 'en-GB' : a); }
  ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString'].forEach(function (m) {
    var o = Date.prototype[m];
    Date.prototype[m] = function (l, opt) { return o.call(this, loc(l), opt); };
  });
  var nl = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (l, opt) { return nl.call(this, loc(l), opt); };

  // ---- le serveur sait dans quelle langue répondre (Keydou, messages) ----
  if (window.fetch) {
    var f0 = window.fetch;
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (/^(\/api\/|\/\.netlify\/functions\/|https?:\/\/[^\/]*\/(api|\.netlify\/functions)\/)/.test(url)) {
          init = init || {};
          var h = new Headers(init.headers || (typeof input !== 'string' && input.headers) || {});
          h.set('x-komyo-lang', 'en');
          init.headers = h;
        }
      } catch (e) { /* on laisse la requête partir telle quelle */ }
      return f0.call(this, input, init);
    };
  }

  // Les fichiers Excel de l'équipe sortent aussi en anglais (titres de colonnes et noms d'onglets).
  window.addEventListener('load', function () {
    var X = window.XLSX;
    if (!X || !X.utils || X.__komyoEn) return;
    X.__komyoEn = true;
    var aoa = X.utils.aoa_to_sheet, add = X.utils.book_append_sheet;
    X.utils.aoa_to_sheet = function (rows, o) {
      if (rows && rows[0]) rows = [rows[0].map(function (c) { return typeof c === 'string' ? traduit(c) : c; })].concat(rows.slice(1));
      return aoa.call(this, rows, o);
    };
    X.utils.book_append_sheet = function (wb, ws, name) { return add.call(this, wb, ws, name ? traduit(name) : name); };
  });

  // Aide pour les tests : liste des textes français qui n'ont pas de traduction.
  I18N.manquants = function () { return Object.keys(I18N.missing); };
})();
