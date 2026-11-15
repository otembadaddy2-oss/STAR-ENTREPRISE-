// KOMYO — Keydou vivant dans une page (comme sur sa page Keydou) : mêmes séquences vidéo détourées en direct (fond vert),
// mêmes gestes (il respire, regarde autour, salue, saute, tourne, réfléchit, parle, fête). Si la vidéo ne charge pas
// (ou si « moins d'animations » est demandé), l'image fixe et de petits mouvements CSS prennent le relais.
//
//   var kd = KeydouVivant.creer(document.getElementById('kd'), { taille: 132 });
//   kd.base('idle' | 'think' | 'talk')   // état qui dure (respire, réfléchit, parle)
//   kd.jouer('wave' | 'look' | 'hop' | 'spin' | 'celebrate')   // un geste, puis retour à l'état de base
//   kd.vie(true)                         // petits gestes spontanés de temps en temps
(function(){
  var BASE = '/starvibe/assets/video/keydou/', SZ = 240;
  var reduire = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BOUCLES = { idle: 'idle', think: 'think', talk: 'talk', dance: 'dance' };
  var GESTES = { wave: 'wave', look: 'look', hop: 'jump', spin: 'spin', celebrate: 'celebrate' };

  function creer(host, opts){
    opts = opts || {};
    var img = host.querySelector('img');
    var taille = opts.taille || 132;
    var etat = 'idle', geste = '', pret = false, visible = true, mort = false, vieOn = false, vieT = 0, parle = false;
    var cv = document.createElement('canvas'); cv.width = SZ; cv.height = SZ; cv.hidden = true; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'width:' + taille + 'px;height:auto;aspect-ratio:1;display:block;filter:drop-shadow(0 5px 6px rgba(36,21,54,.2));';
    host.appendChild(cv);
    if (img) img.style.cssText = 'width:' + Math.round(taille * 0.62) + 'px;height:auto;display:block;margin:0 auto;filter:drop-shadow(0 5px 6px rgba(36,21,54,.2));';
    var g = cv.getContext && cv.getContext('2d', { willReadFrequently: true });
    var vid = document.createElement('video');
    vid.muted = true; vid.defaultMuted = true; vid.playsInline = true; vid.preload = 'auto';
    vid.setAttribute('playsinline', ''); vid.setAttribute('muted', ''); vid.style.cssText = 'position:absolute;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
    host.style.position = host.style.position || 'relative'; host.appendChild(vid);
    var utilise = !!g && !reduire && !!vid.canPlayType && vid.canPlayType('video/mp4') !== '';

    function css(){ // secours : petits mouvements CSS sur l'image fixe
      if (!img) return;
      img.className = 'kd-img kd-' + (geste || etat);
    }
    function lancer(nom, boucle, fin){
      vid.loop = !!boucle; vid.onended = fin || null; vid.playbackRate = 1;
      vid.src = BASE + nom + '.mp4';
      var p = vid.play(); if (p && p.catch) p.catch(function(){});
    }
    function jouerBase(){
      geste = '';
      if (!utilise) { css(); return; }
      var f = BOUCLES[etat] || 'idle';
      if (vid.loop && vid.src && vid.src.indexOf('/' + f + '.mp4') >= 0) return;
      lancer(f, true);
    }
    function dessiner(){
      if (mort || !utilise) return;
      if (visible && !document.hidden && vid.readyState >= 2) {
        g.drawImage(vid, 0, 0, SZ, SZ);
        var im = g.getImageData(0, 0, SZ, SZ), d = im.data;
        for (var i = 0; i < d.length; i += 4) {
          var r = d[i], gr = d[i + 1], b = d[i + 2], m = r > b ? r : b, k = gr - m;
          if (k > 28) { d[i + 3] = k >= 95 ? 0 : 255 * (1 - (k - 28) / 67); d[i + 1] = m; }
          else if (k > 0) { d[i + 1] = gr - k * 0.7; }
        }
        g.putImageData(im, 0, 0);
        if (!pret) { pret = true; cv.hidden = false; if (img) img.style.display = 'none'; }
      }
      if (vid.requestVideoFrameCallback) vid.requestVideoFrameCallback(dessiner); else requestAnimationFrame(dessiner);
    }
    vid.onerror = function(){ utilise = false; pret = false; cv.hidden = true; if (img) { img.style.display = ''; css(); } };
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(host);

    var api = {
      base: function(e){ etat = e; if (e === 'talk') parle = true; else parle = false; jouerBase(); },
      jouer: function(nom){
        if (!GESTES[nom] || reduire) return;
        geste = nom;
        if (utilise) lancer(GESTES[nom], false, function(){ jouerBase(); });
        else { css(); setTimeout(function(){ if (geste === nom) { geste = ''; css(); } }, 1800); }
      },
      vie: function(on){
        vieOn = on; clearTimeout(vieT);
        if (!on || reduire) return;
        (function tic(){
          if (mort) return;
          if (vieOn && etat === 'idle' && !geste && visible && !document.hidden) {
            var a = ['look', 'wave', 'hop', 'spin', 'look'][Math.floor(Math.random() * 5)]; api.jouer(a);
          }
          vieT = setTimeout(tic, 6000 + Math.random() * 5000);
        })();
      },
      // Bouche : pendant qu'il parle, la séquence bouge seulement quand la voix est là (actif = true) et se fige entre deux mots (false).
      parole: function(actif, vitesse){
        if (!utilise || etat !== 'talk' || geste) return;
        if (actif){ vid.playbackRate = vitesse || 1; if (vid.paused) { var p = vid.play(); if (p && p.catch) p.catch(function(){}); } }
        else if (!vid.paused) { try { vid.pause(); } catch (e) {} }
      },
      detruire: function(){ mort = true; clearTimeout(vieT); try { vid.pause(); } catch (e) {} }
    };
    css();
    if (utilise) { jouerBase(); dessiner(); }
    return api;
  }
  window.KeydouVivant = { creer: creer };
})();
