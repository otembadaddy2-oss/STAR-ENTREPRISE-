// KOMYO — Keydou animé dans les cartes (bannière de l'accueil…), comme sur sa page :
// il dit bonjour (geste de la main), respire et regarde autour de lui, puis redit bonjour.
// Sur tout élément portant data-keydou-anim : l'image fixe sert d'attente et de secours,
// la vidéo (fond vert détouré en direct sur un petit canevas) ne se charge que quand la
// carte est visible, et s'arrête dès qu'elle ne l'est plus.
(function(){
  var BASE = '/starvibe/assets/video/keydou/', SZ = 240;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Le mode « économie de données » ne bloque plus l'animation (≈ 300 Ko pour tout Keydou) ;
  // « moins d'animations » → un seul bonjour, puis Keydou se fige.

  function init(host){
    var img = host.querySelector('img');
    if (!img) return;
    var cv = document.createElement('canvas');
    cv.width = SZ; cv.height = SZ;
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'display:none;flex:none;width:' + (host.getAttribute('data-keydou-w') || '116') + 'px;height:auto;aspect-ratio:1;filter:drop-shadow(0 5px 6px rgba(36,21,54,.2));';
    img.parentNode.insertBefore(cv, img.nextSibling);
    var g = cv.getContext && cv.getContext('2d', { willReadFrequently: true });
    if (!g) return;
    var vid = document.createElement('video');
    vid.muted = true; vid.defaultMuted = true; vid.playsInline = true;
    vid.setAttribute('playsinline', ''); vid.setAttribute('muted', ''); vid.preload = 'auto';
    var raf = 0, last = 0, shown = false, actif = false, timer = 0, mort = false;

    function clip(nom, boucle, fin){
      vid.loop = !!boucle; vid.onended = fin || null;
      vid.src = BASE + nom + '.mp4';
      var p = vid.play(); if (p && p.catch) p.catch(function(){});
    }
    function bonjour(){
      clearTimeout(timer);
      clip('wave', false, function(){
        if (reduce){ actif = false; cancelAnimationFrame(raf); vid.pause(); return; }
        clip('idle', true);
        timer = setTimeout(bonjour, 6500);
      });
    }
    function dessiner(t){
      raf = requestAnimationFrame(dessiner);
      if (vid.readyState < 2 || t - last < 45) return;
      last = t;
      g.drawImage(vid, 0, 0, SZ, SZ);
      var im = g.getImageData(0, 0, SZ, SZ), d = im.data;
      for (var i = 0; i < d.length; i += 4){
        var r = d[i], gr = d[i + 1], b = d[i + 2], m = r > b ? r : b, k = gr - m;
        if (k > 28){ d[i + 3] = k >= 95 ? 0 : 255 * (1 - (k - 28) / 67); d[i + 1] = m; }
        else if (k > 0){ d[i + 1] = gr - k * 0.7; }
      }
      g.putImageData(im, 0, 0);
      if (!shown){ shown = true; cv.style.display = 'block'; img.style.display = 'none'; }
    }
    vid.addEventListener('error', function(){
      mort = true; cancelAnimationFrame(raf); clearTimeout(timer);
      cv.style.display = 'none'; img.style.display = ''; img.style.animation = 'none';
    });
    function demarrer(){ if (actif || mort) return; actif = true; bonjour(); raf = requestAnimationFrame(dessiner); }
    function arreter(){ if (!actif) return; actif = false; clearTimeout(timer); cancelAnimationFrame(raf); vid.pause(); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) demarrer(); else arreter(); }); }, { threshold: 0.25 }).observe(host);
    } else demarrer();
  }

  function go(){ Array.prototype.forEach.call(document.querySelectorAll('[data-keydou-anim]'), init); }
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
})();
