// KOMYO — installation de l'application sur tous les appareils.
//
// Carte « Installer KOMYO » (comme sur le site STAR ENTREPRISE) :
// - apparaît ~2,5 s après l'ouverture et reste 20 s (barre dorée), puis se range ;
// - une seule fois par visite ; « Plus tard » la repousse à demain ;
// - plus jamais après l'installation (ou si KOMYO est ouverte en mode application).
//
// Selon l'appareil :
// - Android, Windows, Mac, Linux, Chromebook (Chrome, Edge, Samsung Internet, Opera, Brave) :
//   « Installer » lance l'installation, le navigateur n'affiche qu'une confirmation ;
// - iPhone / iPad (Safari, Chrome, Firefox, Edge) : Apple interdit l'installation
//   automatique, la carte montre les gestes exacts du navigateur utilisé ;
// - Firefox Android, Safari sur Mac : mêmes explications adaptées ;
// - navigateurs intégrés (Facebook, Instagram, TikTok…) : conseil d'ouvrir dans le vrai navigateur.
// La page installer.html reprend tout cela et peut rouvrir la carte à la demande.
//
// Suivi des abonnés (silencieux) : quand KOMYO est installée (ou ouverte comme une application,
// ce que l'iPhone n'annonce pas), l'appareil le signale à /api/starvibe-installs. Le nom et le
// numéro ne sont rattachés que si la personne est connectée à KOMYO ou cliente de Keydou ;
// rien n'est envoyé tant que l'application n'est pas installée.
(function(){
  'use strict';
  if (window.__komyoInstaller) return;

  var SW = '/starvibe/sw-komyo.js';
  var API_INST = '/api/starvibe-installs';
  var K_DONE = 'komyo_installe', K_LATER = 'komyo_install_plus_tard', K_SESSION = 'komyo_install_vu';
  var DUREE = 20000, DELAI = 2500, ATTENTE_EVT = 2500, REPORT = 24 * 3600 * 1000;

  function ls(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function ss(k, v){ try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} return null; }
  function dejaApp(){
    return (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || matchMedia('(display-mode: minimal-ui)').matches)) || window.navigator.standalone === true;
  }

  // ---------- Quel appareil, quel navigateur ----------
  var ua = navigator.userAgent || '';
  var ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var android = /Android/i.test(ua);
  var mac = /Macintosh/.test(ua) && !ios;
  var interne = /FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|Line\/|Snapchat|MicroMessenger|Twitter/i.test(ua);
  var firefox = /Firefox|FxiOS/.test(ua);
  var safari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS|Chromium|Android/.test(ua);
  var chromeIos = ios && /CriOS/.test(ua);

  // Le service worker rend l'application installable et la garde ouvrable hors connexion.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function(){ navigator.serviceWorker.register(SW, { scope: '/starvibe/' }).catch(function(){}); });
  }

  var evt = null, box = null, timer = 0, planifie = false;

  // ---------- Suivi des installations ----------
  function idAppareil(){
    var id = ls('komyo_install_id');
    if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
      var a = new Uint8Array(18);
      try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); }
      id = Array.prototype.map.call(a, function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
      ls('komyo_install_id', id);
    }
    return id;
  }
  function jeton(){ return ls('starvibe_token') || ls('keydou_guest_token') || ''; }
  function pister(event){
    var t = jeton(), h = { 'Content-Type': 'application/json' };
    if (t) h['Authorization'] = 'Bearer ' + t;
    try {
      fetch(API_INST, { method: 'POST', headers: h, keepalive: true, body: JSON.stringify({ installId: idAppareil(), event: event }) })
        .then(function(r){ if (r.ok && t && event !== 'visite') ls('komyo_install_lie', t.slice(-16)); }).catch(function(){});
    } catch (e) {}
  }
  function suivre(){
    // Visite : comptée à chaque page ouverte, une seule fois par chargement (l'appareil n'est compté qu'une fois par jour côté serveur).
    pister('visite');
    var t = jeton(), lie = ls('komyo_install_lie') === (t ? t.slice(-16) : '');
    if (dejaApp()) {
      if (ss('komyo_install_ouvert') !== '1') { ss('komyo_install_ouvert', '1'); pister('launch'); }
      else if (t && !lie) pister('link');
    } else if (ls(K_DONE) === '1' && t && !lie) pister('link');
  }
  if (document.readyState === 'complete') suivre(); else window.addEventListener('load', suivre);

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    evt = e;
    planifier();
  });
  window.addEventListener('appinstalled', function(){
    ls(K_DONE, '1');
    pister('installed');
    fermer(true);
    document.dispatchEvent(new Event('komyo:installe'));
  });
  if (navigator.getInstalledRelatedApps) {
    navigator.getInstalledRelatedApps().then(function(apps){ if (apps && apps.length) { ls(K_DONE, '1'); fermer(true); } }).catch(function(){});
  }

  if (dejaApp()) ls(K_DONE, '1');

  // Les explications à donner quand le navigateur n'offre pas d'installation automatique.
  function etapes(){
    if (interne) return { titre: 'Ouvre KOMYO dans ton navigateur', li: [
      'Touche <b>⋮</b> ou <b>•••</b> (ou l\'icône boussole) dans le coin',
      'Choisis <b>Ouvrir dans le navigateur</b> (Chrome ou Safari)',
      'Puis touche <b>Installer</b> sur la carte KOMYO' ] };
    if (ios && safari) return { titre: 'Sur iPhone / iPad (Safari)', li: [
      'Touche <b>Partager</b> ⬆️ (carré avec une flèche, en bas de l\'écran)',
      'Fais défiler et choisis <b>Sur l\'écran d\'accueil</b> ➕',
      'Touche <b>Ajouter</b> : KOMYO est sur ton écran !' ] };
    if (ios) return { titre: 'Sur iPhone / iPad (' + (chromeIos ? 'Chrome' : firefox ? 'Firefox' : 'ce navigateur') + ')', li: [
      'Touche <b>Partager</b> ⬆️ (dans la barre d\'adresse ou le menu <b>•••</b>)',
      'Choisis <b>Sur l\'écran d\'accueil</b> ➕ (sinon ouvre cette page dans Safari)',
      'Touche <b>Ajouter</b> : KOMYO est sur ton écran !' ] };
    if (android) return { titre: 'Sur Android' + (firefox ? ' (Firefox)' : ''), li: [
      'Touche le menu <b>⋮</b> du navigateur, puis <b>Installer l\'application</b> (ou <b>Ajouter à l\'écran d\'accueil</b>)',
      'Rien de tel ? Touche <b>Partager…</b> et cherche <b>Ajouter à l\'écran d\'accueil</b>',
      'Toujours rien ? <b>Mets Chrome à jour</b> (Play Store) ou ouvre KOMYO dans <b>Edge</b>, <b>Samsung Internet</b> ou <b>Firefox</b>',
      'Ton téléphone ne le permet pas ? Aucun souci : <b>KOMYO marche très bien sans installation</b>, ajoute simplement la page à tes favoris ⭐' ],
      aide: true };
    if (mac && safari) return { titre: 'Sur Mac (Safari)', li: [
      'Dans la barre de menus, ouvre <b>Fichier</b>',
      'Choisis <b>Ajouter au Dock…</b>',
      'Valide : KOMYO s\'ouvre comme une vraie application' ] };
    if (firefox) return { titre: 'Sur ordinateur (Firefox)', li: [
      'Firefox n\'installe pas les applications sur ordinateur',
      'Ouvre KOMYO dans <b>Chrome</b> ou <b>Edge</b>',
      'Puis clique <b>Installer</b> (icône ⊕ dans la barre d\'adresse)' ] };
    return { titre: 'Sur ordinateur', li: [
      'Cherche l\'icône <b>⊕ Installer</b> à droite de la barre d\'adresse',
      'Ou ouvre le menu <b>⋮</b> puis <b>Installer KOMYO…</b>',
      'Valide : KOMYO s\'ouvre dans sa propre fenêtre' ] };
  }
  // Faut-il montrer d'office la carte avec explications, quand l'installation automatique n'existe pas ?
  function explicable(){ return interne || ios || android || (mac && safari); }

  function peutAfficher(){
    if (ls(K_DONE) === '1' || dejaApp()) return false;
    if (ss(K_SESSION) === '1') return false;
    var t = parseInt(ls(K_LATER) || '0', 10);
    if (t && Date.now() - t < REPORT) return false;
    return true;
  }

  function planifier(){
    if (planifie) return;
    planifie = true;
    var go = function(){ setTimeout(function(){ afficher(false); }, DELAI); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  }
  // Pas d'événement d'installation au bout de quelques secondes : appareil sans installation automatique.
  window.addEventListener('load', function(){
    setTimeout(function(){ if (!evt && explicable()) planifier(); }, ATTENTE_EVT);
  });

  var css =
    '.kin{position:fixed;z-index:60;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));max-width:460px;margin:0 auto;overflow:hidden;' +
      'border-radius:20px;padding:16px 16px 18px;background:linear-gradient(160deg,#17142a 0%,#0b0b14 70%);color:#f4efe2;' +
      'border:1.5px solid #d9a92f;box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 0 1px rgba(255,214,102,.12) inset;' +
      'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;animation:kin-in .5s cubic-bezier(.2,.9,.3,1.15) both;}' +
    '@keyframes kin-in{from{opacity:0;transform:translateY(40px) scale(.96)}to{opacity:1;transform:none}}' +
    '.kin.out{animation:kin-out .3s ease both}@keyframes kin-out{to{opacity:0;transform:translateY(40px)}}' +
    '.kin-top{display:flex;align-items:center;gap:12px}' +
    '.kin-logo{flex:none;width:58px;height:58px;border-radius:16px;object-fit:cover;background:#08080c;border:1px solid rgba(217,169,47,.55);box-shadow:0 0 18px rgba(255,200,60,.25)}' +
    '.kin-t{font-size:18px;font-weight:800;line-height:1.15;color:#ffd466}' +
    '.kin-s{font-size:12.5px;color:#b9b2c9;margin-top:3px}' +
    '.kin-p{margin:12px 0 14px;font-size:14px;line-height:1.45;color:#e7e1f1}' +
    '.kin-p b,.kin-steps b{color:#ffd466;font-weight:700}' +
    '.kin-h{margin:12px 0 6px;font-size:13.5px;font-weight:700;color:#fff}' +
    '.kin-steps{margin:0 0 14px;padding:10px 12px 10px 30px;border-radius:12px;background:rgba(255,255,255,.07);font-size:13.5px;line-height:1.5;color:#f1ecfa}' +
    '.kin-steps li+li{margin-top:4px}' +
    '.kin-row{display:flex;gap:10px}' +
    '.kin-b{flex:1;min-height:46px;border-radius:13px;border:0;font:inherit;font-size:15px;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.kin-b:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
    '.kin-ok{background:linear-gradient(180deg,#ffd466,#d9a92f);color:#1b1405}' +
    '.kin-ok:active{transform:scale(.98)}' +
    '.kin-no{background:rgba(255,255,255,.08);color:#f4efe2;border:1px solid rgba(255,255,255,.22)}' +
    '.kin-bar{position:absolute;left:0;bottom:0;height:4px;width:100%;background:linear-gradient(90deg,#ffd466,#d9a92f);transform-origin:left;animation:kin-bar ' + (DUREE / 1000) + 's linear forwards}' +
    '@keyframes kin-bar{to{transform:scaleX(0)}}' +
    '.kin:hover .kin-bar,.kin:focus-within .kin-bar{animation-play-state:paused}' +
    '@media (prefers-reduced-motion:reduce){.kin,.kin.out{animation:none}}';

  function style(){
    if (document.getElementById('kinStyle')) return;
    var st = document.createElement('style');
    st.id = 'kinStyle';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function afficher(force){
    if (box) return;
    if (!force && !peutAfficher()) return;
    if (dejaApp()) return;
    if (!force) ss(K_SESSION, '1');
    style();
    box = document.createElement('div');
    box.className = 'kin';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Installer l\'application KOMYO');
    box.innerHTML =
      '<div class="kin-top">' +
        '<img class="kin-logo" src="/starvibe/assets/img/icons/komyo-192-v2.png" alt="Logo KOMYO" width="58" height="58">' +
        '<div><div class="kin-t">📱 Installer KOMYO</div><div class="kin-s">Application officielle · gratuite</div></div>' +
      '</div>' +
      '<p class="kin-p">Garde <b>KOMYO</b> et <b>Keydou</b> sur ton écran d\'accueil : un seul toucher pour tes vidéos et tous les services du Congo, en plein écran, même quand le réseau est lent.</p>' +
      '<div class="kin-row">' +
        '<button type="button" class="kin-b kin-ok" id="kinOk">Installer</button>' +
        '<button type="button" class="kin-b kin-no" id="kinNo">Plus tard</button>' +
      '</div>' +
      (force ? '' : '<div class="kin-bar" aria-hidden="true"></div>');
    document.body.appendChild(box);
    box.querySelector('#kinNo').addEventListener('click', function(){ ls(K_LATER, String(Date.now())); fermer(); });
    box.querySelector('#kinOk').addEventListener('click', installer);
    if (!force) timer = setTimeout(function(){ fermer(); }, DUREE);
  }

  function montrerEtapes(){
    clearTimeout(timer);
    if (!box) { style(); box = document.createElement('div'); box.className = 'kin'; document.body.appendChild(box); box.innerHTML = '<div class="kin-top"><img class="kin-logo" src="/starvibe/assets/img/icons/komyo-192-v2.png" alt="Logo KOMYO" width="58" height="58"><div><div class="kin-t">📱 Installer KOMYO</div><div class="kin-s">Application officielle · gratuite</div></div></div><div id="kinZone"></div>'; }
    var e = etapes();
    var bar = box.querySelector('.kin-bar'); if (bar) bar.remove();
    var zone = box.querySelector('#kinZone');
    var html = '<div class="kin-h">' + e.titre + '</div><ol class="kin-steps">' + e.li.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ol>' +
      '<div class="kin-row"><button type="button" class="kin-b kin-ok" id="kinGot">J\'ai compris</button>' +
      (e.aide && location.pathname.indexOf('installer.html') === -1 ? '<a class="kin-b kin-no" href="/starvibe/installer.html#probleme" style="display:flex;align-items:center;justify-content:center;text-decoration:none">Aide complète</a>' : '') + '</div>';
    if (zone) zone.innerHTML = html;
    else {
      var p = box.querySelector('.kin-p'), row = box.querySelector('.kin-row');
      if (p) p.remove(); if (row) row.remove();
      box.insertAdjacentHTML('beforeend', html);
    }
    box.querySelector('#kinGot').addEventListener('click', function(){ fermer(); });
  }

  function installer(){
    if (evt) {
      var e = evt; evt = null;
      clearTimeout(timer);
      e.prompt();
      e.userChoice.then(function(c){
        if (c && c.outcome === 'accepted') ls(K_DONE, '1'); else ls(K_LATER, String(Date.now()));
        fermer();
      }).catch(function(){ fermer(); });
      return;
    }
    montrerEtapes();
  }

  function fermer(vite){
    clearTimeout(timer);
    if (!box) return;
    var b = box; box = null;
    if (vite) { b.remove(); return; }
    b.classList.add('out');
    setTimeout(function(){ b.remove(); }, 300);
  }

  // Accès pour la page installer.html et les liens « Installer l'application ».
  window.__komyoInstaller = {
    ouvrir: function(){ if (dejaApp()) return false; if (box) fermer(true); afficher(true); return true; },
    installer: function(){ if (dejaApp()) return false; if (evt) { installer(); return true; } afficher(true); montrerEtapes(); return true; },
    peutAuto: function(){ return !!evt; },
    dejaInstallee: function(){ return dejaApp() || ls(K_DONE) === '1'; },
    etapes: etapes,
    diagnostic: function(){
      var m = ua.match(/(Chrome|CriOS|Firefox|FxiOS|EdgA|Edg|SamsungBrowser|OPR|Version)\/([\d.]+)/);
      var v = (m ? m[1].replace('CriOS','Chrome').replace('FxiOS','Firefox').replace('EdgA','Edge').replace('Edg','Edge').replace('OPR','Opera').replace('SamsungBrowser','Samsung Internet').replace('Version','Safari') + ' ' + m[2].split('.')[0] : 'navigateur inconnu');
      var sw = 'serviceWorker' in navigator;
      return {
        appareil: ios ? 'iPhone/iPad' : android ? 'Android' : mac ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'autre',
        navigateur: v + (interne ? ' (navigateur intégré à une appli)' : ''),
        installationAuto: !!evt, serviceWorker: sw, dejaInstallee: dejaApp() || ls(K_DONE) === '1',
        ecran: (window.screen ? screen.width + 'x' + screen.height : '?')
      };
    },
    plateforme: function(){ return interne ? 'interne' : ios ? 'ios' : android ? 'android' : mac ? 'mac' : 'ordinateur'; }
  };
})();
