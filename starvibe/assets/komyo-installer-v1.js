// KOMYO — invitation à installer l'application (comme sur le site STAR ENTREPRISE).
//
// - La carte « Installer KOMYO » apparaît quelques secondes après l'ouverture
//   et reste 20 secondes (une barre dorée se vide), puis se range toute seule.
// - « Installer » lance l'installation : sur Android/ordinateur le navigateur
//   n'affiche plus qu'une confirmation ; sur iPhone la carte explique les deux
//   gestes à faire (Partager → Sur l'écran d'accueil).
// - Une fois l'application installée (ou ouverte en mode application), la carte
//   n'apparaît plus jamais. « Plus tard » la repousse à demain.
// - Elle ne s'affiche qu'une fois par visite, pour ne pas harceler pendant
//   la navigation d'une page à l'autre.
(function(){
  'use strict';
  if (window.__komyoInstaller) return;
  window.__komyoInstaller = true;

  var SW = '/starvibe/sw-komyo.js';
  var K_DONE = 'komyo_installe', K_LATER = 'komyo_install_plus_tard', K_SESSION = 'komyo_install_vu';
  var DUREE = 20000, DELAI = 2500, REPORT = 24 * 3600 * 1000;

  function ls(k, v){
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  function ss(k, v){
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {}
    return null;
  }

  function dejaApp(){
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  // Le service worker rend l'application installable et la garde utilisable hors connexion.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function(){ navigator.serviceWorker.register(SW, { scope: '/starvibe/' }).catch(function(){}); });
  }

  if (dejaApp()) { ls(K_DONE, '1'); return; }
  if (ls(K_DONE) === '1') return;

  var ua = navigator.userAgent || '';
  var ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var iosSafari = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  var evt = null, box = null, timer = 0;

  window.addEventListener('appinstalled', function(){
    ls(K_DONE, '1');
    fermer(true);
  });

  // Si KOMYO est déjà installée sur cet appareil, Chrome peut nous le dire.
  if (navigator.getInstalledRelatedApps) {
    navigator.getInstalledRelatedApps().then(function(apps){ if (apps && apps.length) { ls(K_DONE, '1'); fermer(true); } }).catch(function(){});
  }

  function peutAfficher(){
    if (ls(K_DONE) === '1' || dejaApp()) return false;
    if (ss(K_SESSION) === '1') return false;
    var t = parseInt(ls(K_LATER) || '0', 10);
    if (t && Date.now() - t < REPORT) return false;
    return true;
  }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    evt = e;
    planifier();
  });
  if (iosSafari) planifier();

  var planifie = false;
  function planifier(){
    if (planifie) return;
    planifie = true;
    var go = function(){ setTimeout(afficher, DELAI); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  }

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
    '.kin-p b{color:#ffd466;font-weight:700}' +
    '.kin-steps{margin:0 0 14px;padding:10px 12px 10px 30px;border-radius:12px;background:rgba(255,255,255,.07);font-size:13.5px;line-height:1.5;color:#f1ecfa}' +
    '.kin-row{display:flex;gap:10px}' +
    '.kin-b{flex:1;min-height:46px;border-radius:13px;border:0;font:inherit;font-size:15px;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.kin-b:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
    '.kin-ok{background:linear-gradient(180deg,#ffd466,#d9a92f);color:#1b1405}' +
    '.kin-ok:active{transform:scale(.98)}' +
    '.kin-no{background:rgba(255,255,255,.08);color:#f4efe2;border:1px solid rgba(255,255,255,.22)}' +
    '.kin-bar{position:absolute;left:0;bottom:0;height:4px;width:100%;background:linear-gradient(90deg,#ffd466,#d9a92f);transform-origin:left;animation:kin-bar ' + (DUREE / 1000) + 's linear forwards}' +
    '@keyframes kin-bar{to{transform:scaleX(0)}}' +
    '.kin:hover .kin-bar,.kin:focus-within .kin-bar{animation-play-state:paused}' +
    '@media (prefers-reduced-motion:reduce){.kin,.kin.out{animation:none}.kin-bar{animation-duration:' + (DUREE / 1000) + 's}}';

  function afficher(){
    if (box || !peutAfficher()) return;
    ss(K_SESSION, '1');
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    box = document.createElement('div');
    box.className = 'kin';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Installer l\'application KOMYO');
    box.innerHTML =
      '<div class="kin-top">' +
        '<img class="kin-logo" src="/starvibe/assets/img/icons/komyo-192-v1.png" alt="Logo KOMYO" width="58" height="58">' +
        '<div><div class="kin-t">📱 Installer KOMYO</div><div class="kin-s">Application officielle · gratuite</div></div>' +
      '</div>' +
      '<p class="kin-p">Garde <b>KOMYO</b> et <b>Keydou</b> sur ton écran d\'accueil : un seul toucher pour tes vidéos et tous les services du Congo, en plein écran, même quand le réseau est lent.</p>' +
      '<div class="kin-row">' +
        '<button type="button" class="kin-b kin-ok" id="kinOk">Installer</button>' +
        '<button type="button" class="kin-b kin-no" id="kinNo">Plus tard</button>' +
      '</div>' +
      '<div class="kin-bar" aria-hidden="true"></div>';
    document.body.appendChild(box);

    box.querySelector('#kinNo').addEventListener('click', function(){ ls(K_LATER, String(Date.now())); fermer(); });
    box.querySelector('#kinOk').addEventListener('click', installer);
    timer = setTimeout(function(){ fermer(); }, DUREE);
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
    if (iosSafari) { // pas d'installation automatique sur iPhone : on montre les deux gestes
      clearTimeout(timer);
      var bar = box.querySelector('.kin-bar'); if (bar) bar.remove();
      var p = box.querySelector('.kin-p');
      var ol = document.createElement('ol');
      ol.className = 'kin-steps';
      ol.innerHTML = '<li>Touche <b>Partager</b> ⬆️ en bas de Safari</li><li>Choisis <b>Sur l\'écran d\'accueil</b> ➕</li><li>Touche <b>Ajouter</b> — c\'est fait !</li>';
      p.replaceWith(ol);
      var ok = box.querySelector('#kinOk'); ok.textContent = 'J\'ai compris'; ok.onclick = function(){ fermer(); };
      box.querySelector('#kinOk').removeEventListener('click', installer);
      return;
    }
    fermer();
  }

  function fermer(vite){
    clearTimeout(timer);
    if (!box) return;
    var b = box; box = null;
    if (vite) { b.remove(); return; }
    b.classList.add('out');
    setTimeout(function(){ b.remove(); }, 300);
  }
})();
