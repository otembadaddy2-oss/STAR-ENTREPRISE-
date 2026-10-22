/* KOMYO — les prix suivent le pays.
   Les tarifs sont fixés en FCFA (1 000 FCFA pour Keydou, 1 500 et 5 000 FCFA par mois pour les abonnements).
   Partout dans le monde, la même règle : on affiche à côté de chaque prix son équivalent dans la monnaie du pays,
   « 1 000 FCFA (≈ 1,52 €) ». Dans les pays qui utilisent le FCFA, rien ne change.
   C'est un équivalent indicatif : le règlement reste celui des moyens de paiement ouverts dans le pays. */
(function () {
  'use strict';

  // 1 EUR = 655,957 FCFA (parité officielle fixe). Les autres monnaies viennent des taux de référence de la BCE
  // du 15/10/2026 : à mettre à jour de temps en temps (colonne « pour 1 EUR »).
  var TAUX = { date: '15/10/2026', fcfaParEur: 655.957, parEur: { EUR: 1, USD: 1.1208, GBP: 0.8461, CHF: 0.9305, CAD: 1.5923 } };
  var ZONE_FCFA = 'CM CF TD CG GQ GA BJ BF CI GW ML NE SN TG'.split(' ');
  var ZONE_EURO = 'FR BE DE ES IT PT NL LU IE AT FI GR SK SI EE LV LT MT CY HR MC SM VA AD'.split(' ');
  var AUTRES = { GB: 'GBP', CH: 'CHF', LI: 'CHF', CA: 'CAD', US: 'USD' };

  function monnaie(pays) {
    if (!pays || ZONE_FCFA.indexOf(pays) !== -1) return '';          // FCFA : pas de conversion
    if (ZONE_EURO.indexOf(pays) !== -1) return 'EUR';
    return AUTRES[pays] || 'USD';                                     // ailleurs : équivalent en dollars US
  }
  function lang() { return (document.documentElement.lang || 'fr').slice(0, 2); }
  function equivalent(fcfa, pays) {
    var m = monnaie(pays);
    if (!m || !isFinite(fcfa) || fcfa <= 0) return '';
    var v = fcfa / TAUX.fcfaParEur * TAUX.parEur[m];
    try { return '≈ ' + new Intl.NumberFormat(lang() === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency: m, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 }).format(v); }
    catch (e) { return '≈ ' + v.toFixed(2) + ' ' + m; }
  }

  var pays = '';
  function lire(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ecrire(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* tant pis */ } }
  function paysDuTelephone() {                                        // plan B : la région de la langue du téléphone (fr-FR, en-GB…)
    var m = /[-_]([A-Za-z]{2})\b/.exec(navigator.language || '');
    return m ? m[1].toUpperCase() : '';
  }

  var RE = /(\d{1,3}(?:[   ,.]\d{3})+|\d+)(\s*)FCFA(?!\s*\(≈)/g;
  function traiteTexte(n) {
    var p = n.parentNode;
    if (!p || p.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA|OPTION|TITLE)$/.test(p.tagName)) return;
    var v = n.nodeValue;
    if (!v || v.indexOf('FCFA') === -1 || v.indexOf('≈') !== -1) return;
    var nv = v.replace(RE, function (tout, nombre, esp) {
      var e = equivalent(parseInt(nombre.replace(/\D/g, ''), 10), pays);
      return e ? nombre + esp + 'FCFA (' + e + ')' : tout;
    });
    if (nv !== v) n.nodeValue = nv;
  }
  function traite(racine) {
    if (!racine || !pays || !monnaie(pays)) return;
    if (racine.nodeType === 3) { traiteTexte(racine); return; }
    if (racine.nodeType !== 1) return;
    var w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, null), n, l = [];
    while ((n = w.nextNode())) l.push(n);
    l.forEach(traiteTexte);
    // montants écrits dans des balises séparées : <b data-fcfa="1500"></b>
    var cibles = racine.querySelectorAll ? racine.querySelectorAll('[data-fcfa]') : [];
    for (var i = 0; i < cibles.length; i++) cibles[i].textContent = equivalent(Number(cibles[i].getAttribute('data-fcfa')), pays);
  }

  var obs = null;
  function demarre(code) {
    pays = code || '';
    window.KOMYO_PAYS = pays;
    window.KOMYO_PRIX = { equivalent: function (f) { return equivalent(f, pays); }, monnaie: monnaie(pays), pays: pays };
    try { document.dispatchEvent(new CustomEvent('komyo:pays', { detail: { pays: pays } })); } catch (e) { /* vieux navigateur */ }
    if (!monnaie(pays)) return;
    traite(document.body);
    if (obs) obs.disconnect();
    obs = new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (r.type === 'characterData') traiteTexte(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) traite(r.addedNodes[j]);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function lance() {
    var memo = lire('komyo_pays');
    if (memo !== null) { demarre(memo); return; }
    var fini = false;
    function fin(code) { if (fini) return; fini = true; if (code) ecrire('komyo_pays', code); demarre(code || paysDuTelephone()); }
    if (!window.fetch) { fin(''); return; }
    setTimeout(function () { fin(''); }, 2500);                       // serveur trop lent : plan B (région de la langue du téléphone)
    fetch('/api/starvibe-pays').then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { fin(d && d.pays ? String(d.pays).toUpperCase() : ''); })
      .catch(function () { fin(''); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(lance, 0); });
  else setTimeout(lance, 0);
})();
