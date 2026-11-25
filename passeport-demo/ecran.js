(function () {
  var KEY = 'sp_demo_v4', CK = 'sp_espace_v1', HOUR = 3600000;
  var q = new URLSearchParams(location.search), apercu = q.get('apercu') === '1'; if (apercu) document.body.classList.add('apercu');
  var $ = function (s) { return document.querySelector(s); };
  var pad = function (n, l) { return String(n).padStart(l || 2, '0'); };
  var nettoyer = function (s) { return String(s == null ? '' : s).replace(/[<>&"]/g, ''); };
  var dernierHtml = '', dernierPr = '', versionVue = -1, dernierChg = Date.now(), son = false, derniere = null, premier = true, code = '', nomEc = '', echecs = 0;
  function bip() { try { var C = window.AudioContext || window.webkitAudioContext, a = new C(); [[880, 0], [660, .22], [880, .44]].forEach(function (n) { var o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = n[0]; g.gain.setValueAtTime(.0001, a.currentTime + n[1]); g.gain.exponentialRampToValueAtTime(.35, a.currentTime + n[1] + .03); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + n[1] + .3); o.connect(g); g.connect(a.destination); o.start(a.currentTime + n[1]); o.stop(a.currentTime + n[1] + .32); }); } catch (e) { } }
  /* Mode local : l'état est lu dans les données de cet appareil. */
  function lireLocal() {
    var db = []; try { db = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(db)) db = []; } catch (e) { }
    var cfg = {}; try { cfg = JSON.parse(localStorage.getItem('sp_reglages_v1') || '{}') || {}; } catch (x) { }
    var jr = new Date(Date.now() + 3600000 + (cfg.decalage || 0) * 86400000).toISOString().slice(0, 10);
    var appels = db.filter(function (d) { return d.appel && d.status === 'recu' && d.rdv && d.rdv.date === jr; }).sort(function (a, b) { return b.appel.at.localeCompare(a.appel.at); }).map(function (d) { return { ticket: d.ticket, nom: d.person.nom, prenoms: d.person.prenoms, sexe: d.person.sexe, porte: d.appel.porte, at: d.appel.at, id: d.id }; });
    var att = db.filter(function (d) { return d.status === 'paye' && d.rdv && d.rdv.date === jr; }).sort(function (a, b) { return (a.rang != null ? a.rang : a.ticket) - (b.rang != null ? b.rang : b.ticket); }).map(function (d) { return d.ticket; });
    return { appels: appels, prochains: att.slice(0, 14), portes: { n: cfg.portes || 6, noms: cfg.noms || {} }, lieu: cfg.lieu || 'Préfecture de Brazzaville' };
  }
  /* Annonces : chaque appel est montré au moins 10 secondes, dans l'ordre où il a été fait, avec la voix.
     S'il y a plusieurs appels d'un coup (plusieurs portes), ils passent l'un après l'autre. */
  var MIN_MS = 10000, REPETE_MS = 6000;
  var vus = {}, attente = [], courant = null, depuis = 0, dernier = { portes: { n: 6, noms: {} }, appels: [], prochains: [], lieu: '' };
  var cleDe = function (a) { return a.id + '@' + a.at; };
  function phrase(a) {
    var civ = a.sexe === 'F' ? 'Madame' : a.sexe === 'M' ? 'Monsieur' : '';
    var nomPorte = dernier.portes && dernier.portes.noms && dernier.portes.noms[a.porte] ? ', ' + nettoyer(dernier.portes.noms[a.porte]) : '';
    return 'Numéro ' + a.ticket + '. ' + civ + ' ' + nettoyer(a.prenoms) + ' ' + nettoyer(a.nom).toLowerCase() + ', veuillez vous diriger vers la porte ' + a.porte + nomPorte + '.';
  }
  function parler(a) { try { var u = new SpeechSynthesisUtterance(phrase(a)); u.lang = 'fr-FR'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { } }
  function montrer(a, silencieux) {
    courant = a; depuis = silencieux ? 0 : Date.now(); vus[cleDe(a)] = 1;   // un affichage de reprise (non annoncé) ne retarde pas le premier vrai appel
    $('#num').textContent = pad(a.ticket, 3); $('#nom').textContent = nettoyer(a.nom) + ' ' + nettoyer(a.prenoms);
    var p = $('#porte'); p.style.display = ''; p.textContent = '➜ PORTE ' + a.porte;
    if (!silencieux) {
      var z = $('#appel'); z.classList.remove('nouveau'); void z.offsetWidth; z.classList.add('nouveau');
      if (son && !apercu) { bip(); setTimeout(function () { if (courant === a) parler(a); }, 900); setTimeout(function () { if (courant === a) parler(a); }, REPETE_MS); }
    }
  }
  function pomper() {
    if (attente.length && (!courant || Date.now() - depuis >= MIN_MS)) { montrer(attente.shift()); }
    var s = $('#suite'); if (s) s.textContent = attente.length ? '+ ' + attente.length + ' appel' + (attente.length > 1 ? 's' : '') + ' à annoncer' : '';
    dessiner();
  }
  /* La grille des portes ne montre que les appels déjà annoncés. */
  function dessiner() {
    var s = dernier, n = (s.portes && s.portes.n) || 6, noms = (s.portes && s.portes.noms) || {}, h = '';
    for (var k = 1; k <= n; k++) {
      var cur = (s.appels || []).filter(function (d) { return d.porte === k && vus[cleDe(d)]; })[0], nm = noms[k] ? ' · ' + nettoyer(noms[k]) : '';
      h += '<div class="p ' + (cur ? '' : 'libre ') + (courant && courant.porte === k && cur && cleDe(cur) === cleDe(courant) ? 'on' : '') + '"><span>PORTE ' + k + nm + '</span><b>' + (cur ? pad(cur.ticket, 3) : '—') + '</b><em>' + (cur ? nettoyer(cur.nom) + ' ' + nettoyer(cur.prenoms) : 'libre') + '</em></div>';
    }
    var pr = (s.prochains || []).slice(0, 10).map(function (t) { return '<i>' + pad(t, 3) + '</i>'; }).join('') || '<span class="vide">Personne n\'attend</span>';
    if (h !== dernierHtml) { dernierHtml = h; $('#portes').innerHTML = h; } if (pr !== dernierPr) { dernierPr = pr; $('#prochains').innerHTML = pr; }
    var d = new Date(); $('#heure').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    var sub = document.querySelector('header h1 small'); if (sub && s.lieu) sub.textContent = nettoyer(s.lieu) + ' · démonstration';
  }
  function afficher(s) {
    dernier = s; var appels = s.appels || [];
    if (premier) {   // première lecture : on montre le dernier appel sans l'annoncer
      appels.forEach(function (a) { vus[cleDe(a)] = 1; });
      if (appels[0]) montrer(appels[0], true); else { $('#num').textContent = '---'; $('#nom').textContent = 'En attente du prochain appel'; $('#porte').style.display = 'none'; }
      premier = false;
    } else {
      var neufs = appels.filter(function (a) { return !vus[cleDe(a)] && !attente.some(function (x) { return cleDe(x) === cleDe(a); }); }).sort(function (a, b) { return a.at.localeCompare(b.at); });
      neufs.forEach(function (a) { attente.push(a); });
      if (!courant && !attente.length) { $('#num').textContent = '---'; $('#nom').textContent = 'En attente du prochain appel'; $('#porte').style.display = 'none'; }
    }
    pomper();
  }
  setInterval(pomper, 500);
  function etat(ok, texte) { var e = $('#etat'); e.style.display = ''; e.className = ok ? '' : 'ko'; e.textContent = texte; }
  async function tourServeur() {
    try {
      var r = await fetch('/api/passeport?op=ecran&espace=' + encodeURIComponent(code) + '&nom=' + encodeURIComponent(apercu ? '' : nomEc), { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 404 ? 'Espace introuvable' : 'Erreur ' + r.status);
      var s = await r.json(); echecs = 0; if (s.version !== versionVue) { versionVue = s.version; dernierChg = Date.now(); } afficher(s); etat(true, '🟢 Connecté · ' + (s.enAttente || 0) + ' en attente');
    } catch (e) { echecs++; if (echecs >= 2) etat(false, '⚠ Connexion perdue — le dernier affichage reste visible'); }
    /* rythme économe : 1,5 s tant que ça bouge, 3 s après 5 minutes calmes, 5 s après 30 minutes calmes */
    var calme = Date.now() - dernierChg; setTimeout(tourServeur, document.hidden ? 5000 : apercu ? 3000 : calme < 300000 ? 1500 : calme < 1800000 ? 3000 : 5000);
  }
  function demarrer(m, c, n) {
    code = c; nomEc = n; $('#demarrage').style.display = 'none'; if (!apercu) $('#son').style.display = '';
    if (m === 'serveur') { try { localStorage.setItem(CK + '_ecran', JSON.stringify({ code: c, nom: n })); } catch (e) { } tourServeur(); }
    else { etat(true, '⚪ Mode local'); var loc = function () { afficher(lireLocal()); }; window.addEventListener('storage', function (e) { if (e.key === KEY) loc(); }); setInterval(loc, 1500); loc(); }
    try { if (!apercu && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () { }); } catch (e) { }
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () { }); } catch (e) { }
  }
  $('#bDemarrer').onclick = async function () {
    var c = $('#codeEsp').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8), n = $('#nomEcran').value.trim() || 'Écran de la salle', err = $('#err'); err.textContent = '';
    if (c.length !== 8) { err.textContent = 'Le code de l\'espace comporte 8 caractères.'; return; }
    try { var r = await fetch('/api/passeport?op=ecran&espace=' + c + '&nom=' + encodeURIComponent(n), { cache: 'no-store' }); if (!r.ok) throw new Error(r.status === 404 ? 'Code inconnu : vérifiez-le auprès de la Préfecture.' : 'Serveur indisponible, réessayez.'); } catch (e) { err.textContent = e.message || 'Serveur indisponible.'; return; }
    demarrer('serveur', c, n);
  };
  $('#bLocal').onclick = function () { demarrer('local', '', ''); };
  $('#son').onclick = function () { son = true; $('#son').style.display = 'none'; bip(); try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) { } };
  setInterval(function () { var d = new Date(); $('#heure').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()); }, 5000);
  /* Départ : aperçu intégré (sans clic) ou code déjà connu. */
  var qc = (q.get('espace') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8), sv = {}; try { sv = JSON.parse(localStorage.getItem(CK + '_ecran') || '{}') || {}; } catch (e) { }
  var cc = qc.length === 8 ? qc : (sv.code || '');
  if (apercu) { if (qc.length === 8) demarrer('serveur', qc, ''); else demarrer('local', '', ''); }
  else { if (cc) $('#codeEsp').value = cc; if (sv.nom) $('#nomEcran').value = sv.nom; }
})();
