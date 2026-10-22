// KOMYO — Keydou flottant : la mascotte-assistant respire en bas à gauche de
// chaque page, avec une petite bulle « Besoin d'un service ? ». Un toucher
// ouvre l'espace Keydou. Le petit « × » la range pour la journée.
//
// - Léger : l'image s'affiche tout de suite, la vidéo (fond vert détouré en
//   direct sur un petit canevas) n'est chargée qu'après le chargement de la page.
// - Discret : pas de vidéo si l'utilisateur a demandé moins d'animations ou si
//   le mode économie de données est actif.
(function(){
  if (window.__keydouBulle) return;
  window.__keydouBulle = true;
  var KEY = 'keydou_bulle_off';
  function store(k, v){
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  var jour = new Date().toISOString().slice(0, 10);
  if (store(KEY) === jour) return;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var avecVideo = !reduce && !conn.saveData;
  var BASE = '/starvibe/';
  var SZ = 180;

  var css =
    '.kdb{position:fixed;z-index:34;left:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;align-items:flex-end;gap:6px;' +
      'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;animation:kdb-in .5s cubic-bezier(.2,.9,.3,1.2) both;}' +
    '@keyframes kdb-in{from{opacity:0;transform:translateY(20px) scale(.85)}to{opacity:1;transform:none}}' +
    '.kdb-btn{position:relative;display:block;width:92px;height:104px;padding:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;}' +
    '.kdb-btn:focus-visible{outline:3px solid #ffb703;outline-offset:2px;border-radius:14px;}' +
    '.kdb-btn img,.kdb-btn canvas{position:absolute;left:0;bottom:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(0,0,0,.35));}' +
    '.kdb-btn canvas{display:none;}' +
    '.kdb.vid .kdb-btn canvas{display:block;}.kdb.vid .kdb-btn img{display:none;}' +
    '.kdb-say{position:relative;margin-bottom:46px;max-width:176px;padding:8px 26px 8px 12px;border-radius:14px 14px 14px 4px;background:#fff;color:#241536;' +
      'font-size:13px;line-height:1.3;font-weight:600;box-shadow:0 6px 18px rgba(0,0,0,.28);cursor:pointer;animation:kdb-pop .45s .6s cubic-bezier(.2,.9,.3,1.3) both;}' +
    '@keyframes kdb-pop{from{opacity:0;transform:scale(.7) translateX(-10px)}to{opacity:1;transform:none}}' +
    '.kdb-say small{display:block;font-weight:500;font-size:11px;color:#6b5a7d;margin-top:2px;}' +
    '.kdb-x{position:absolute;top:2px;right:2px;width:22px;height:22px;border:0;border-radius:50%;background:none;color:#6b5a7d;font-size:16px;line-height:1;cursor:pointer;}' +
    '.kdb-x:hover{background:#f0e9f7;}.kdb-x:focus-visible{outline:2px solid #ffb703;}' +
    '.kdb.mini .kdb-say{display:none;}' +
    '@media (max-width:480px){.kdb-btn{width:76px;height:86px}.kdb-say{margin-bottom:38px;max-width:150px;font-size:12px}}' +
    '@media (prefers-reduced-motion:reduce){.kdb,.kdb-say{animation:none}}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var box = document.createElement('div');
  box.className = 'kdb';
  box.innerHTML =
    '<a class="kdb-btn" href="' + BASE + 'keydou.html" aria-label="Parler à Keydou, l\'assistant de KOMYO">' +
      '<img src="' + BASE + 'assets/img/keydou.webp" alt="" width="92" height="104">' +
      '<canvas width="' + SZ + '" height="' + SZ + '" aria-hidden="true"></canvas>' +
    '</a>' +
    '<div class="kdb-say" role="note">Salut, je suis <b>Keydou</b> ! 👋<small>Un service ? Je m\'en occupe.</small>' +
      '<button class="kdb-x" type="button" aria-label="Ranger Keydou pour aujourd\'hui">×</button></div>';
  document.body.appendChild(box);

  var say = box.querySelector('.kdb-say');
  say.addEventListener('click', function(e){
    if (e.target.closest('.kdb-x')) {
      e.preventDefault();
      store(KEY, jour);
      box.style.transition = 'opacity .25s, transform .25s';
      box.style.opacity = '0';
      box.style.transform = 'translateY(16px)';
      setTimeout(function(){ box.remove(); }, 260);
      return;
    }
    location.href = BASE + 'keydou.html';
  });
  // La bulle de texte se range d'elle-même après un moment : il reste Keydou.
  setTimeout(function(){ box.classList.add('mini'); }, 12000);

  if (!avecVideo) return;
  function demarrer(){
    var cv = box.querySelector('canvas'), g = cv.getContext && cv.getContext('2d', { willReadFrequently: true });
    if (!g) return;
    var vid = document.createElement('video');
    vid.muted = true; vid.defaultMuted = true; vid.loop = true; vid.playsInline = true;
    vid.setAttribute('playsinline', ''); vid.setAttribute('muted', '');
    vid.preload = 'auto';
    var ok = false, raf = 0, last = 0;
    function dessiner(t){
      raf = requestAnimationFrame(dessiner);
      if (document.hidden || vid.readyState < 2 || t - last < 55) return; // ~18 images/s, suffisant pour une petite vignette
      last = t;
      g.drawImage(vid, 0, 0, SZ, SZ);
      var im = g.getImageData(0, 0, SZ, SZ), d = im.data;
      for (var i = 0; i < d.length; i += 4){
        var r = d[i], gr = d[i + 1], b = d[i + 2], m = r > b ? r : b, k = gr - m;
        if (k > 28){ d[i + 3] = k >= 95 ? 0 : 255 * (1 - (k - 28) / 67); d[i + 1] = m; }
        else if (k > 0){ d[i + 1] = gr - k * 0.7; }
      }
      g.putImageData(im, 0, 0);
      if (!ok){ ok = true; box.classList.add('vid'); }
    }
    vid.addEventListener('error', function(){ cancelAnimationFrame(raf); box.classList.remove('vid'); });
    vid.src = BASE + 'assets/video/keydou/idle.mp4';
    var p = vid.play(); if (p && p.catch) p.catch(function(){});
    raf = requestAnimationFrame(dessiner);
  }
  var go = function(){ setTimeout(demarrer, 1200); };
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
})();
