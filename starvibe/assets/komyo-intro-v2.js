// KOMYO — ouverture animée « le monde en mouvement », avant l'affichage de la page d'accueil.
//
// Le logo se construit sous les yeux (≈ 3,5 s), en suivant son propre dessin :
//   1. une étoile filante parcourt la courbe du K et dessine le logo derrière elle ;
//   2. à son arrivée l'étoile éclate, et la « tête » du K tombe et rebondit à sa place ;
//   3. les lettres KOMYO se montent une à une ;
//   4. le slogan et la ligne s'ouvrent depuis le centre ; un éclat de lumière traverse le tout.
// Une seule fois par visite et à chaque lancement de l'application installée ; un toucher
// passe l'animation ; rien du tout si la personne a demandé moins d'animations.
// Création KOMYO : le logo est découpé en pièces, une seule image est chargée.
(function(){
  'use strict';
  if (window.__komyoIntro) return;
  window.__komyoIntro = true;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  try { if (sessionStorage.getItem('komyo_intro_vu') === '1') return; sessionStorage.setItem('komyo_intro_vu', '1'); } catch (e) {}

  var LOGO = '/starvibe/assets/img/icons/komyo-logo-officiel-v1.png';
  var BW = 900, BH = 721;                                      // repère de l'image du logo
  var DUREE = 3.5, SORTIE = 450;                                // secondes / millisecondes
  // courbe de l'étoile filante (centre du « swoosh »), dans le repère du logo
  var PATH = [[262,440],[300,398],[350,352],[425,293],[500,238],[560,196],[620,152],[690,114],[735,92]];
  var BALL = { x: 500, y: 113, r: 68 };                         // la « tête » du K
  var TROU = BALL.r + 14;                                       // rayon découpé dans le K (englobe le liseré sombre de la tête)
  var K_BAS = 468, MOT_HAUT = 468, MOT_BAS = 624, SLO_HAUT = 626, SLO_BAS = 676, LIG_HAUT = 676;
  var COUPES = [0, 165, 350, 558, 692, 900];                    // colonnes entre les lettres de KOMYO

  var css =
    '.ki{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#07070b;overflow:hidden;touch-action:manipulation;' +
      'transition:opacity ' + SORTIE + 'ms ease;}' +
    '.ki.out{opacity:0;pointer-events:none;}' +
    '.ki-glow{position:absolute;left:50%;top:46%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;opacity:0;' +
      'background:radial-gradient(circle,rgba(255,196,64,.30) 0,rgba(255,150,0,.09) 14%,rgba(0,0,0,0) 32%);}' +
    '.ki-cv{position:absolute;inset:0;width:100%;height:100%;}' +
    '.ki-logo{position:relative;width:min(82vw,480px);aspect-ratio:' + BW + '/' + BH + ';}' +
    '.ki-p{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;will-change:transform,opacity,clip-path;}' +
    '.ki-kz{position:absolute;inset:0;}' +
    '.ki-shine{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:0;' +
      'background:linear-gradient(105deg,rgba(255,255,255,0) 38%,rgba(255,246,205,.95) 50%,rgba(255,255,255,0) 62%) 160% 0/260% 100% no-repeat;' +
      '-webkit-mask:url(' + LOGO + ') center/contain no-repeat;mask:url(' + LOGO + ') center/contain no-repeat;}' +
    '.ki-star{position:absolute;left:' + (741 / BW * 100) + '%;top:' + (89 / BH * 100) + '%;width:0;height:0;pointer-events:none;}' +
    '.ki-star::before,.ki-star::after{content:"";position:absolute;left:0;top:0;border-radius:2px;opacity:0;transform:translate(-50%,-50%) scale(0);}' +
    '.ki-star::before{width:min(36vw,210px);height:3px;background:linear-gradient(90deg,rgba(255,220,120,0),#fff,rgba(255,220,120,0));}' +
    '.ki-star::after{width:3px;height:min(36vw,210px);background:linear-gradient(180deg,rgba(255,220,120,0),#fff,rgba(255,220,120,0));}' +
    '.ki-star.on::before,.ki-star.on::after{animation:ki-flare 1.7s ease-out forwards,ki-twinkle 1.8s ease-in-out 1.7s infinite;}' +
    '@keyframes ki-flare{0%{opacity:0;transform:translate(-50%,-50%) scale(0) rotate(0)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.3) rotate(18deg)}100%{opacity:.8;transform:translate(-50%,-50%) scale(.9) rotate(45deg)}}' +
    '@keyframes ki-twinkle{0%,100%{opacity:.8}50%{opacity:.3}}' +
    '.ki-flash{position:absolute;left:' + (741 / BW * 100) + '%;top:' + (89 / BH * 100) + '%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;opacity:0;pointer-events:none;' +
      'background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,214,102,.55) 40%,rgba(255,200,60,0) 70%);}' +
    '.ki-flash.on{animation:ki-flash .9s ease-out forwards;}' +
    '@keyframes ki-flash{0%{opacity:0;transform:scale(.2)}30%{opacity:1;transform:scale(1.7)}100%{opacity:0;transform:scale(2.8)}}' +
    '.ki-ring{position:absolute;left:' + (BALL.x / BW * 100) + '%;top:' + (BALL.y / BH * 100) + '%;width:' + (BALL.r * 2 / BW * 100) + '%;aspect-ratio:1;margin:0;transform:translate(-50%,-50%) scale(1);' +
      'border-radius:50%;border:2px solid rgba(255,214,102,.9);opacity:0;pointer-events:none;}' +
    '.ki-ring.on{animation:ki-ring .8s ease-out forwards;}' +
    '@keyframes ki-ring{0%{opacity:.9;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(2.1)}}' +
    '.ki.out .ki-logo{transform:scale(1.05);transition:transform ' + SORTIE + 'ms ease;}' +
    '@media (prefers-reduced-motion:reduce){.ki{display:none}}';

  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function calque(cls){ return '<img class="ki-p ' + cls + '" alt="" src="' + LOGO + '" decoding="async">'; }
  var box = document.createElement('div');
  box.className = 'ki';
  box.setAttribute('aria-hidden', 'true');
  var lettres = '';
  for (var i = 0; i < 5; i++) lettres += calque('ki-l');
  box.innerHTML =
    '<div class="ki-glow"></div><canvas class="ki-cv"></canvas>' +
    '<div class="ki-logo">' +
      '<div class="ki-kz">' + calque('ki-k') + '</div>' +
      calque('ki-ball') + lettres + calque('ki-slo') + calque('ki-lig') +
      '<div class="ki-shine"></div><div class="ki-ring"></div><div class="ki-flash"></div><div class="ki-star"></div>' +
    '</div>';
  (document.body || document.documentElement).appendChild(box);
  var prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  var $ = function(s){ return box.querySelector(s); };
  var elLogo = $('.ki-logo'), elGlow = $('.ki-glow'), cv = $('.ki-cv'), g = cv.getContext && cv.getContext('2d');
  var elK = $('.ki-k'), elKz = $('.ki-kz'), elBall = $('.ki-ball'), elSlo = $('.ki-slo'), elLig = $('.ki-lig'), elShine = $('.ki-shine');
  var elStar = $('.ki-star'), elFlash = $('.ki-flash'), elRing = $('.ki-ring');
  var elLet = Array.prototype.slice.call(box.querySelectorAll('.ki-l'));
  var pct = function(v, tot){ return (v / tot * 100).toFixed(3) + '%'; };

  // découpes statiques (en pourcentages du logo)
  // le K seul : sous la ligne 440, on ne garde que la largeur du K (sinon on voit le haut des lettres de KOMYO avant leur arrivée)
  elKz.style.clipPath = 'polygon(0 0,100% 0,100% ' + pct(440, BH) + ',' + pct(655, BW) + ' ' + pct(440, BH) + ',' + pct(655, BW) + ' ' + pct(K_BAS, BH) + ',' + pct(235, BW) + ' ' + pct(K_BAS, BH) + ',' + pct(235, BW) + ' ' + pct(440, BH) + ',0 ' + pct(440, BH) + ')';
  elLet.forEach(function(el, i){
    el.style.clipPath = 'inset(' + pct(MOT_HAUT, BH) + ' ' + pct(BW - COUPES[i + 1], BW) + ' ' + pct(BH - MOT_BAS, BH) + ' ' + pct(COUPES[i], BW) + ')';
  });
  elSlo.style.clipPath = 'inset(' + pct(SLO_HAUT, BH) + ' 0 ' + pct(BH - SLO_BAS, BH) + ' 0)';
  elLig.style.clipPath = 'inset(' + pct(LIG_HAUT, BH) + ' 0 0 0)';

  // ---------- Géométrie de la courbe ----------
  var cum = [0];
  for (var q = 1; q < PATH.length; q++) cum.push(cum[q - 1] + Math.hypot(PATH[q][0] - PATH[q - 1][0], PATH[q][1] - PATH[q - 1][1]));
  var LONG = cum[cum.length - 1];
  function surCourbe(u){
    var d = Math.max(0, Math.min(1, u)) * LONG, k = 1;
    while (k < cum.length - 1 && cum[k] < d) k++;
    var a = PATH[k - 1], b = PATH[k], f = (d - cum[k - 1]) / (cum[k] - cum[k - 1] || 1);
    var dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
    return { x: a[0] + dx * f, y: a[1] + dy * f, tx: dx / n, ty: dy / n };
  }

  // ---------- Courbes d'animation ----------
  function c01(x){ return x < 0 ? 0 : x > 1 ? 1 : x; }
  function outCubic(x){ x = c01(x); return 1 - Math.pow(1 - x, 3); }
  function inOutCubic(x){ x = c01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function outBack(x, c){ x = c01(x); c = c || 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function outBounce(x){ x = c01(x); var n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + .9375; return n * (x -= 2.625 / d) * x + .984375; }

  // ---------- Canevas : étoile filante, traînée, étincelles ----------
  var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, trail = [], parts = [];
  function taille(){ W = box.clientWidth; H = box.clientHeight; cv.width = W * dpr; cv.height = H * dpr; if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function graine(){
    parts = [];
    var n = Math.round(Math.min(46, Math.max(24, W / 12)));
    for (var i = 0; i < n; i++) parts.push({ x: W * (0.15 + Math.random() * 0.7), y: H * (0.55 + Math.random() * 0.5), r: 0.8 + Math.random() * 2.2, v: 14 + Math.random() * 38,
      dx: (Math.random() - 0.5) * 14, ph: Math.random() * 6.28, retard: 0.9 + Math.random() * 2.0, vie: 1.6 + Math.random() * 1.6 });
  }
  function halo(x, y, r, a1, a2){
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,248,210,' + a1 + ')'); gr.addColorStop(0.35, 'rgba(255,205,80,' + a2 + ')'); gr.addColorStop(1, 'rgba(255,170,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
  }

  var ballPose = false, starOn = false, t0 = 0, raf = 0, vivant = true, fini = false, demarre = false;

  function image(t){
    var r = elLogo.getBoundingClientRect(), s = r.width / BW, ox = r.left, oy = r.top;
    var A = BW * s; // largeur en px

    // lueur d'ambiance
    elGlow.style.opacity = String(c01(t / 0.9) * (0.85 + 0.15 * Math.sin(t * 2.6)));

    // 1) l'étoile filante dessine le K : balayage suivant la courbe
    var u = inOutCubic((t - 0.25) / 0.85), cur = surCourbe(u);
    if (t >= 0.25){
      var dir = { x: cur.tx, y: cur.ty }, n = { x: -dir.y, y: dir.x }, B = 2400;
      var cx = cur.x * s, cy = cur.y * s;
      var pts = [[cx + n.x * B, cy + n.y * B], [cx - n.x * B, cy - n.y * B], [cx - n.x * B - dir.x * B, cy - n.y * B - dir.y * B], [cx + n.x * B - dir.x * B, cy + n.y * B - dir.y * B]];
      if (u >= 1) pts = [[-B, -B], [B * 2, -B], [B * 2, B * 2], [-B, B * 2]];
      elK.style.opacity = '1';
      elK.style.clipPath = 'polygon(' + pts.map(function(p){ return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(',') + ')';
      // trou à l'emplacement de la tête (elle arrivera plus tard, en tombant)
      var hole = 'radial-gradient(circle at ' + (BALL.x * s).toFixed(1) + 'px ' + (BALL.y * s).toFixed(1) + 'px,transparent ' + ((TROU - 1) * s).toFixed(1) + 'px,#000 ' + (TROU * s).toFixed(1) + 'px)';
      if (t < 1.7){ elK.style.webkitMaskImage = hole; elK.style.maskImage = hole; }
      else { elK.style.webkitMaskImage = 'none'; elK.style.maskImage = 'none'; }
    }

    // 2) arrivée : l'étoile éclate, la tête tombe et rebondit
    if (u >= 1 && !starOn){ starOn = true; elStar.className = 'ki-star on'; elFlash.className = 'ki-flash on'; }
    var tb = (t - 1.05) / 0.6;
    if (tb > 0){
      var e = outBounce(tb), dy = -(1 - e) * BH * 0.5 * s;
      elBall.style.opacity = '1';
      elBall.style.transform = 'translateY(' + dy.toFixed(1) + 'px)';
      elBall.style.clipPath = 'circle(' + (TROU * s).toFixed(1) + 'px at ' + (BALL.x * s).toFixed(1) + 'px ' + (BALL.y * s).toFixed(1) + 'px)';
      if (tb >= 0.56 && !ballPose){ ballPose = true; elRing.className = 'ki-ring on'; }
      if (t >= 1.7){ elK.style.webkitMaskImage = 'none'; elK.style.maskImage = 'none'; }
    }

    // 3) KOMYO : les lettres se montent une à une
    for (var i = 0; i < elLet.length; i++){
      var p = (t - (1.35 + 0.09 * i)) / 0.5;
      if (p <= 0) continue;
      var eb = outBack(p, 2.3), el = elLet[i];
      el.style.opacity = String(c01(p * 3));
      el.style.transform = 'translateY(' + ((1 - eb) * 0.1 * BH * s).toFixed(1) + 'px) scale(' + (0.82 + 0.18 * eb).toFixed(3) + ')';
      el.style.transformOrigin = ((COUPES[i] + COUPES[i + 1]) / 2 / BW * 100).toFixed(1) + '% ' + ((MOT_HAUT + MOT_BAS) / 2 / BH * 100).toFixed(1) + '%';
      el.style.filter = p < 1 ? 'brightness(' + (1 + (1 - c01(p)) * 1.1).toFixed(2) + ')' : 'none';
    }

    // 4) slogan et ligne : ouverture depuis le centre
    var ps = outCubic((t - 1.9) / 0.65);
    if (ps > 0){
      elSlo.style.opacity = String(c01(ps * 2));
      elSlo.style.clipPath = 'inset(' + pct(SLO_HAUT, BH) + ' ' + ((1 - ps) * 50).toFixed(2) + '% ' + pct(BH - SLO_BAS, BH) + ' ' + ((1 - ps) * 50).toFixed(2) + '%)';
    }
    var pl = outCubic((t - 2.0) / 0.75);
    if (pl > 0){
      elLig.style.opacity = String(c01(pl * 2));
      elLig.style.clipPath = 'inset(' + pct(LIG_HAUT, BH) + ' ' + ((1 - pl) * 50).toFixed(2) + '% 0 ' + ((1 - pl) * 50).toFixed(2) + '%)';
    }

    // 5) éclat de lumière final sur tout le logo
    var pe = (t - 2.6) / 0.85;
    if (pe > 0 && pe < 1.05){ elShine.style.opacity = '1'; elShine.style.backgroundPosition = (160 - 220 * c01(pe)).toFixed(1) + '% 0'; }
    else if (pe >= 1.05) elShine.style.opacity = '0';

    // canevas
    g.clearRect(0, 0, W, H);
    if (t >= 0.25 && t < 1.4){
      trail.push({ x: ox + cur.x * s, y: oy + cur.y * s, t: t });
    }
    while (trail.length && t - trail[0].t > 0.34) trail.shift();
    for (var k = 0; k < trail.length; k++){
      var f = (k + 1) / trail.length, tp = trail[k];
      halo(tp.x, tp.y, (4 + 15 * f) * (A / 480), 0.5 * f, 0.4 * f);
    }
    if (t >= 0.25 && u < 1) halo(ox + cur.x * s, oy + cur.y * s, 26 * (A / 480), 0.95, 0.65);
    for (var j = 0; j < parts.length; j++){
      var pp = parts[j], kk = t - pp.retard;
      if (kk < 0 || kk > pp.vie) continue;
      var uu = kk / pp.vie, a = Math.sin(uu * Math.PI) * (0.55 + 0.45 * Math.sin(kk * 9 + pp.ph));
      halo(pp.x + pp.dx * kk, pp.y - pp.v * kk, pp.r * 4, a, a * 0.55);
    }
  }

  function boucle(now){
    if (!vivant) return;
    raf = requestAnimationFrame(boucle);
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    if (g) image(t);
    if (t >= DUREE) terminer();
  }
  function demarrer(){ if (demarre) return; demarre = true; if (g){ taille(); graine(); window.addEventListener('resize', taille); } raf = requestAnimationFrame(boucle); }

  // on attend que l'image soit là (ou 900 ms), puis on joue
  var imgTest = new Image(), tGo = setTimeout(demarrer, 900);
  imgTest.onload = imgTest.onerror = function(){ clearTimeout(tGo); demarrer(); };
  imgTest.src = LOGO;

  var tFin = 0;
  function terminer(){
    if (fini) return; fini = true;
    box.classList.add('out');
    tFin = setTimeout(function(){
      vivant = false; cancelAnimationFrame(raf); window.removeEventListener('resize', taille);
      if (box.parentNode) box.parentNode.removeChild(box);
      if (st.parentNode) st.parentNode.removeChild(st);
      document.documentElement.style.overflow = prevOverflow;
    }, SORTIE + 60);
  }
  box.addEventListener('click', terminer);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') terminer(); }, { once: true });
})();
