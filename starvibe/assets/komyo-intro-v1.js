// KOMYO — ouverture animée du logo, avant l'affichage de la page d'accueil.
//
// Le logo se révèle d'un balayage doré, un éclat de lumière le traverse, l'étoile
// scintille et de petites étincelles montent autour, puis l'écran s'efface (≈ 3 s).
//  - une seule fois par visite ; à chaque lancement de l'application installée ;
//  - un toucher passe l'animation ;
//  - rien du tout si la personne a demandé moins d'animations.
(function(){
  'use strict';
  if (window.__komyoIntro) return;
  window.__komyoIntro = true;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  try { if (sessionStorage.getItem('komyo_intro_vu') === '1') return; sessionStorage.setItem('komyo_intro_vu', '1'); } catch (e) {}

  var LOGO = '/starvibe/assets/img/icons/komyo-logo-officiel-v1.png';
  var DUREE = 3000, SORTIE = 500;

  var css =
    '.ki{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#07070b;overflow:hidden;touch-action:manipulation;' +
      'transition:opacity ' + SORTIE + 'ms ease;}' +
    '.ki.out{opacity:0;pointer-events:none;}' +
    '.ki-glow{position:absolute;left:50%;top:48%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;' +
      'background:radial-gradient(circle,rgba(255,196,64,.34) 0,rgba(255,150,0,.10) 14%,rgba(0,0,0,0) 32%);opacity:0;transform:scale(.4);}' +
    '.ki.go .ki-glow{animation:ki-glow 1.6s ease-out .1s forwards, ki-breathe 2.4s ease-in-out 1.7s infinite;}' +
    '@keyframes ki-glow{to{opacity:1;transform:scale(1)}}' +
    '@keyframes ki-breathe{0%,100%{opacity:1}50%{opacity:.7}}' +
    '.ki-spark{position:absolute;inset:0;width:100%;height:100%;}' +
    '.ki-logo{position:relative;width:min(80vw,470px);aspect-ratio:1404/1126;}' +
    '.ki-img{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transform:scale(.86);filter:brightness(2.4) blur(6px);' +
      '-webkit-mask-image:linear-gradient(112deg,#000 0,#000 42%,transparent 58%);mask-image:linear-gradient(112deg,#000 0,#000 42%,transparent 58%);' +
      '-webkit-mask-size:320% 100%;mask-size:320% 100%;-webkit-mask-position:100% 0;mask-position:100% 0;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;}' +
    '.ki.go .ki-img{animation:ki-reveal 1.35s cubic-bezier(.2,.75,.2,1) .3s forwards;}' +
    '@keyframes ki-reveal{0%{opacity:0;transform:scale(.86);filter:brightness(2.4) blur(6px);-webkit-mask-position:100% 0;mask-position:100% 0}' +
      '30%{opacity:1}' +
      '100%{opacity:1;transform:scale(1);filter:brightness(1) blur(0);-webkit-mask-position:0 0;mask-position:0 0}}' +
    '.ki-shine{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:0;' +
      'background:linear-gradient(105deg,rgba(255,255,255,0) 38%,rgba(255,244,200,.95) 50%,rgba(255,255,255,0) 62%) 160% 0/260% 100% no-repeat;' +
      '-webkit-mask:url(' + LOGO + ') center/contain no-repeat;mask:url(' + LOGO + ') center/contain no-repeat;}' +
    '.ki.go .ki-shine{animation:ki-shine 1.25s ease-in-out 1.55s forwards;}' +
    '@keyframes ki-shine{0%{opacity:1;background-position:160% 0}100%{opacity:1;background-position:-60% 0}}' +
    '.ki-star{position:absolute;left:82.4%;top:12.3%;width:0;height:0;pointer-events:none;}' +
    '.ki-star::before,.ki-star::after{content:"";position:absolute;left:0;top:0;border-radius:50%;opacity:0;transform:translate(-50%,-50%) scale(0);' +
      'background:radial-gradient(circle,#fff 0,rgba(255,236,160,.9) 18%,rgba(255,200,60,0) 70%);}' +
    '.ki-star::before{width:min(34vw,200px);height:3px;border-radius:2px;background:linear-gradient(90deg,rgba(255,220,120,0),#fff,rgba(255,220,120,0));}' +
    '.ki-star::after{width:3px;height:min(34vw,200px);border-radius:2px;background:linear-gradient(180deg,rgba(255,220,120,0),#fff,rgba(255,220,120,0));}' +
    '.ki.go .ki-star::before,.ki.go .ki-star::after{animation:ki-flare 1.7s ease-out 1.3s forwards, ki-twinkle 1.8s ease-in-out 3s infinite;}' +
    '@keyframes ki-flare{0%{opacity:0;transform:translate(-50%,-50%) scale(0) rotate(0)}35%{opacity:1;transform:translate(-50%,-50%) scale(1.25) rotate(20deg)}100%{opacity:.75;transform:translate(-50%,-50%) scale(.9) rotate(45deg)}}' +
    '@keyframes ki-twinkle{0%,100%{opacity:.75}50%{opacity:.3}}' +
    '.ki-flash{position:absolute;left:82.4%;top:12.3%;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;opacity:0;pointer-events:none;' +
      'background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,214,102,.55) 40%,rgba(255,200,60,0) 70%);}' +
    '.ki.go .ki-flash{animation:ki-flash .9s ease-out 1.3s forwards;}' +
    '@keyframes ki-flash{0%{opacity:0;transform:scale(.2)}30%{opacity:1;transform:scale(1.6)}100%{opacity:0;transform:scale(2.6)}}' +
    '.ki.out .ki-logo{transform:scale(1.05);transition:transform ' + SORTIE + 'ms ease;}' +
    '@media (prefers-reduced-motion:reduce){.ki{display:none}}';

  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var box = document.createElement('div');
  box.className = 'ki';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML =
    '<div class="ki-glow"></div><canvas class="ki-spark"></canvas>' +
    '<div class="ki-logo"><img class="ki-img" alt="" src="' + LOGO + '" decoding="async">' +
    '<div class="ki-shine"></div><div class="ki-flash"></div><div class="ki-star"></div></div>';
  (document.body || document.documentElement).appendChild(box);
  var prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  // ---------- Étincelles dorées qui montent ----------
  var cv = box.querySelector('canvas'), g = cv.getContext && cv.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, parts = [], raf = 0, t0 = 0, vivant = true;
  function taille(){ W = box.clientWidth; H = box.clientHeight; cv.width = W * dpr; cv.height = H * dpr; if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function graine(){
    parts = [];
    var n = Math.round(Math.min(46, Math.max(24, W / 12)));
    for (var i = 0; i < n; i++) parts.push({
      x: W * (0.15 + Math.random() * 0.7), y: H * (0.55 + Math.random() * 0.5),
      r: 0.8 + Math.random() * 2.2, v: 14 + Math.random() * 38, dx: (Math.random() - 0.5) * 14,
      ph: Math.random() * 6.28, retard: Math.random() * 1.6, vie: 1.6 + Math.random() * 1.6
    });
  }
  function dessiner(now){
    if (!vivant) return;
    raf = requestAnimationFrame(dessiner);
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    g.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++){
      var p = parts[i], k = t - p.retard;
      if (k < 0 || k > p.vie) continue;
      var u = k / p.vie, a = Math.sin(u * Math.PI) * (0.55 + 0.45 * Math.sin(k * 9 + p.ph));
      var x = p.x + p.dx * k, y = p.y - p.v * k;
      var gr = g.createRadialGradient(x, y, 0, x, y, p.r * 4);
      gr.addColorStop(0, 'rgba(255,240,180,' + a + ')'); gr.addColorStop(0.35, 'rgba(255,200,70,' + a * 0.55 + ')'); gr.addColorStop(1, 'rgba(255,170,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, p.r * 4, 0, 6.2832); g.fill();
    }
  }
  if (g){ taille(); graine(); window.addEventListener('resize', taille); raf = requestAnimationFrame(dessiner); }

  // ---------- Déroulé ----------
  var fini = false, tGo = 0, tOut = 0, tFin = 0;
  function lancer(){ if (!box.classList.contains('go')) box.classList.add('go'); }
  var img = box.querySelector('.ki-img');
  if (img.complete) lancer(); else { img.addEventListener('load', lancer); img.addEventListener('error', lancer); tGo = setTimeout(lancer, 900); }
  function terminer(){
    if (fini) return; fini = true;
    clearTimeout(tGo); clearTimeout(tOut);
    box.classList.add('out');
    tFin = setTimeout(function(){
      vivant = false; cancelAnimationFrame(raf); window.removeEventListener('resize', taille);
      if (box.parentNode) box.parentNode.removeChild(box);
      if (st.parentNode) st.parentNode.removeChild(st);
      document.documentElement.style.overflow = prevOverflow;
    }, SORTIE + 60);
  }
  tOut = setTimeout(terminer, DUREE);
  box.addEventListener('click', terminer);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') terminer(); }, { once: true });
})();
