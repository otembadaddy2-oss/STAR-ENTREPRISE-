// KOMYO — ouverture animée « effet waouh », avant l'affichage de la page d'accueil (≈ 5,6 s).
//
// Tout le logo est en mouvement et en lumière, sur un fond de rayons dorés :
//   1. un point de lumière s'étire en trait horizontal, la poussière d'or est aspirée vers le centre ;
//   2. une étoile filante dessine le K, l'étoile éclate (éclat + trait de lumière), la tête retombe et rebondit ;
//   3. les lettres K-O-M-Y-O foncent chacune d'une direction différente en 3D, s'abattent à leur place
//      (flash, gerbe d'étincelles, onde de choc, la caméra tremble) ;
//   4. le slogan arrive mot par mot, les lettres se resserrent dans la lumière, puis la ligne dorée s'ouvre ;
//   5. un éclat traverse tout le logo, il bat comme un cœur, la caméra s'avance, puis on entre dans l'application.
// Une seule fois par visite et à chaque lancement de l'application installée ; un toucher passe l'animation ;
// rien du tout si la personne a demandé moins d'animations. Création KOMYO : une seule image est chargée,
// le logo est découpé en pièces (K, tête, 5 lettres, 4 mots du slogan, ligne).
(function(){
  'use strict';
  if (window.__komyoIntro) return;
  window.__komyoIntro = true;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  try { if (sessionStorage.getItem('komyo_intro_vu') === '1') return; sessionStorage.setItem('komyo_intro_vu', '1'); } catch (e) {}

  var LOGO = '/starvibe/assets/img/icons/komyo-logo-officiel-v2.webp';
  var BW = 900, BH = 721;                                      // repère de l'image du logo
  var DUREE = 5.6, SORTIE = 500;                                // secondes / millisecondes
  var PATH = [[262,440],[300,398],[350,352],[425,293],[500,238],[560,196],[620,152],[690,114],[735,92]];
  var BALL = { x: 500, y: 113, r: 68 };                         // la « tête » du K
  var TROU = BALL.r + 14;
  var K_BAS = 468, MOT_HAUT = 468, MOT_BAS = 624, SLO_HAUT = 626, SLO_BAS = 676, LIG_HAUT = 676;
  var COUPES = [0, 165, 350, 558, 692, 900];                    // colonnes entre les lettres de KOMYO
  var MOTS = [[20, 115], [115, 361], [361, 466], [466, 900]];   // LE · MONDE · EN · MOUVEMENT
  var STAR = { x: 741, y: 89 };
  // arrivée de chaque lettre : d'où elle vient (décalage en unités du logo, rotations en degrés, grossissement)
  var VOL = [
    { tx: -480, ty:  70, rx:   0, ry: -80, sc: 1.7 },   // K  : de la gauche
    { tx: -120, ty: -560, rx:  75, ry:   0, sc: 1.8 },  // O  : du haut
    { tx:    0, ty:  560, rx: -70, ry:   0, sc: 2.1 },  // M  : du bas, en grand
    { tx:  320, ty: -520, rx:  60, ry:  55, sc: 1.7 },  // Y  : du haut à droite
    { tx:  480, ty:  40, rx:   0, ry:  85, sc: 1.6 }    // O  : de la droite
  ];
  var T_LET = 1.55, PAS_LET = 0.17, DUR_LET = 0.62, T_SLO = 3.1, PAS_MOT = 0.24, DUR_MOT = 0.55, T_FIN = 4.1;

  var css =
    '.ki{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#050509;overflow:hidden;touch-action:manipulation;' +
      'transition:opacity ' + SORTIE + 'ms ease;}' +
    '.ki.out{opacity:0;pointer-events:none;}' +
    '.ki-glow{position:absolute;left:50%;top:46%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;opacity:0;' +
      'background:radial-gradient(circle,rgba(255,196,64,.34) 0,rgba(255,150,0,.10) 14%,rgba(0,0,0,0) 32%);}' +
    '.ki-cv{position:absolute;inset:0;width:100%;height:100%;}' +
    '.ki-cam{position:relative;width:min(84vw,500px);aspect-ratio:' + BW + '/' + BH + ';will-change:transform;}' +
    '.ki-logo{position:absolute;inset:0;perspective:900px;}' +
    '.ki-p{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;will-change:transform,opacity,clip-path,filter;}' +
    '.ki-kz{position:absolute;inset:0;}' +
    '.ki-shine{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:0;' +
      'background:linear-gradient(105deg,rgba(255,255,255,0) 43%,rgba(255,243,200,.82) 50%,rgba(255,255,255,0) 57%) 160% 0/260% 100% no-repeat;' +
      '-webkit-mask:url(' + LOGO + ') center/contain no-repeat;mask:url(' + LOGO + ') center/contain no-repeat;}' +
    '.ki-star{position:absolute;left:' + (STAR.x / BW * 100) + '%;top:' + (STAR.y / BH * 100) + '%;width:0;height:0;pointer-events:none;}' +
    '.ki-star::before,.ki-star::after{content:"";position:absolute;left:0;top:0;border-radius:2px;opacity:0;transform:translate(-50%,-50%) scale(0);}' +
    '.ki-star::before{width:min(40vw,230px);height:3px;background:linear-gradient(90deg,rgba(255,220,120,0),#fff,rgba(255,220,120,0));}' +
    '.ki-star::after{width:3px;height:min(40vw,230px);background:linear-gradient(180deg,rgba(255,220,120,0),#fff,rgba(255,220,120,0));}' +
    '.ki-star.on::before,.ki-star.on::after{animation:ki-flare 1.8s ease-out forwards,ki-twinkle 1.6s ease-in-out 1.8s infinite;}' +
    '@keyframes ki-flare{0%{opacity:0;transform:translate(-50%,-50%) scale(0) rotate(0)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.35) rotate(18deg)}100%{opacity:.85;transform:translate(-50%,-50%) scale(.95) rotate(45deg)}}' +
    '@keyframes ki-twinkle{0%,100%{opacity:.85}50%{opacity:.3}}' +
    '.ki-flash{position:absolute;left:' + (STAR.x / BW * 100) + '%;top:' + (STAR.y / BH * 100) + '%;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;opacity:0;pointer-events:none;' +
      'background:radial-gradient(circle,rgba(255,255,255,.98),rgba(255,214,102,.55) 40%,rgba(255,200,60,0) 70%);}' +
    '.ki-flash.on{animation:ki-flash .9s ease-out forwards;}' +
    '@keyframes ki-flash{0%{opacity:0;transform:scale(.2)}30%{opacity:1;transform:scale(1.8)}100%{opacity:0;transform:scale(3)}}' +
    '.ki-ring{position:absolute;left:' + (BALL.x / BW * 100) + '%;top:' + (BALL.y / BH * 100) + '%;width:' + (BALL.r * 2 / BW * 100) + '%;aspect-ratio:1;transform:translate(-50%,-50%) scale(1);' +
      'border-radius:50%;border:2px solid rgba(255,214,102,.9);opacity:0;pointer-events:none;}' +
    '.ki-ring.on{animation:ki-ring .8s ease-out forwards;}' +
    '@keyframes ki-ring{0%{opacity:.9;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(2.2)}}' +
    '.ki.out .ki-cam{transform:scale(1.3)!important;transition:transform ' + SORTIE + 'ms cubic-bezier(.5,0,.9,.4);}' +
    '@media (prefers-reduced-motion:reduce){.ki{display:none}}';

  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function calque(cls){ return '<img class="ki-p ' + cls + '" alt="" src="' + LOGO + '" decoding="async">'; }
  var box = document.createElement('div');
  box.className = 'ki';
  box.setAttribute('aria-hidden', 'true');
  var lettres = '', mots = '';
  for (var i = 0; i < 5; i++) lettres += calque('ki-l');
  for (var m = 0; m < MOTS.length; m++) mots += calque('ki-w');
  box.innerHTML =
    '<div class="ki-glow"></div><canvas class="ki-cv"></canvas>' +
    '<div class="ki-cam"><div class="ki-logo">' +
      '<div class="ki-kz">' + calque('ki-k') + '</div>' +
      calque('ki-ball') + lettres + mots + calque('ki-lig') +
      '<div class="ki-shine"></div><div class="ki-ring"></div><div class="ki-flash"></div><div class="ki-star"></div>' +
    '</div></div>';
  (document.body || document.documentElement).appendChild(box);
  var prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  var $ = function(s){ return box.querySelector(s); };
  var elCam = $('.ki-cam'), elLogo = $('.ki-logo'), elGlow = $('.ki-glow'), cv = $('.ki-cv'), g = cv.getContext && cv.getContext('2d');
  var elK = $('.ki-k'), elKz = $('.ki-kz'), elBall = $('.ki-ball'), elLig = $('.ki-lig'), elShine = $('.ki-shine');
  var elStar = $('.ki-star'), elFlash = $('.ki-flash'), elRing = $('.ki-ring');
  var elLet = Array.prototype.slice.call(box.querySelectorAll('.ki-l'));
  var elMot = Array.prototype.slice.call(box.querySelectorAll('.ki-w'));
  var pct = function(v, tot){ return (v / tot * 100).toFixed(3) + '%'; };

  // découpes statiques (en pourcentages du logo)
  elKz.style.clipPath = 'polygon(0 0,100% 0,100% ' + pct(440, BH) + ',' + pct(655, BW) + ' ' + pct(440, BH) + ',' + pct(655, BW) + ' ' + pct(K_BAS, BH) + ',' + pct(235, BW) + ' ' + pct(K_BAS, BH) + ',' + pct(235, BW) + ' ' + pct(440, BH) + ',0 ' + pct(440, BH) + ')';
  elLet.forEach(function(el, i){
    el.style.clipPath = 'inset(' + pct(MOT_HAUT, BH) + ' ' + pct(BW - COUPES[i + 1], BW) + ' ' + pct(BH - MOT_BAS, BH) + ' ' + pct(COUPES[i], BW) + ')';
    el.style.transformOrigin = ((COUPES[i] + COUPES[i + 1]) / 2 / BW * 100).toFixed(1) + '% ' + ((MOT_HAUT + MOT_BAS) / 2 / BH * 100).toFixed(1) + '%';
  });
  elMot.forEach(function(el, i){
    el.style.clipPath = 'inset(' + pct(SLO_HAUT, BH) + ' ' + pct(BW - MOTS[i][1], BW) + ' ' + pct(BH - SLO_BAS, BH) + ' ' + pct(MOTS[i][0], BW) + ')';
    el.style.transformOrigin = ((MOTS[i][0] + MOTS[i][1]) / 2 / BW * 100).toFixed(1) + '% ' + ((SLO_HAUT + SLO_BAS) / 2 / BH * 100).toFixed(1) + '%';
  });
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
  function outQuart(x){ x = c01(x); return 1 - Math.pow(1 - x, 4); }
  function inOutCubic(x){ x = c01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function outBack(x, c){ x = c01(x); c = c || 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function outBounce(x){ x = c01(x); var n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + .9375; return n * (x -= 2.625 / d) * x + .984375; }

  // ---------- Canevas : rayons, trait de lumière, étoile filante, poussière d'or, gerbes d'étincelles ----------
  var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, trail = [], parts = [], aspire = [], gerbes = [];
  function taille(){ W = box.clientWidth; H = box.clientHeight; cv.width = W * dpr; cv.height = H * dpr; if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function graine(){
    parts = []; aspire = [];
    var n = Math.round(Math.min(40, Math.max(22, W / 14)));
    for (var i = 0; i < n; i++) parts.push({ x: W * (0.12 + Math.random() * 0.76), y: H * (0.5 + Math.random() * 0.55), r: 0.8 + Math.random() * 2.2, v: 16 + Math.random() * 40,
      dx: (Math.random() - 0.5) * 16, ph: Math.random() * 6.28, retard: 2.6 + Math.random() * 2.2, vie: 1.8 + Math.random() * 1.6 });
    var na = Math.round(Math.min(46, Math.max(26, W / 10)));
    for (var j = 0; j < na; j++) aspire.push({ a: Math.random() * 6.2832, R: 0.45 + Math.random() * 0.75, r: 0.9 + Math.random() * 1.8, t0: Math.random() * 0.5, tour: 1.2 + Math.random() * 1.8 });
  }
  function halo(x, y, r, a1, a2){
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,248,210,' + a1 + ')'); gr.addColorStop(0.35, 'rgba(255,205,80,' + a2 + ')'); gr.addColorStop(1, 'rgba(255,170,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
  }
  // trait de lumière horizontal (reflet d'objectif), centré en (x, y), demi-longueur L
  function trait(x, y, L, a){
    if (a <= 0.01 || L < 2) return;
    g.save(); g.translate(x, y); g.scale(1, 0.045);
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, L);
    gr.addColorStop(0, 'rgba(255,255,240,' + a + ')'); gr.addColorStop(0.25, 'rgba(255,214,110,' + (a * 0.65) + ')'); gr.addColorStop(1, 'rgba(255,170,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, L, 0, 6.2832); g.fill(); g.restore();
  }
  function rayons(cx, cy, t, a){
    if (a <= 0.01) return;
    var R = Math.hypot(W, H) * 0.75, N = 12, rot = t * 0.16;
    var gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    gr.addColorStop(0, 'rgba(255,214,120,' + (0.24 * a) + ')'); gr.addColorStop(0.55, 'rgba(255,190,70,' + (0.08 * a) + ')'); gr.addColorStop(1, 'rgba(255,170,0,0)');
    g.fillStyle = gr;
    for (var i = 0; i < N; i++){
      var a0 = rot + i * 6.2832 / N, w = 0.06;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0 - w, a0 + w); g.closePath(); g.fill();
    }
  }
  function gerbe(x, y, t, fort){
    var n = fort ? 16 : 11;
    for (var i = 0; i < n; i++){
      var an = -Math.PI * (0.05 + 0.9 * Math.random()), v = (70 + Math.random() * 190) * (fort ? 1.25 : 1);
      gerbes.push({ x: x, y: y, vx: Math.cos(an) * v * (Math.random() < .5 ? -1 : 1) * 0.9, vy: Math.sin(an) * v, t: t, vie: 0.55 + Math.random() * 0.5, r: 1.2 + Math.random() * 2.4 });
    }
  }

  var ballPose = false, starOn = false, t0 = 0, raf = 0, vivant = true, fini = false, demarre = false;
  var posee = [false, false, false, false, false], tPose = [0, 0, 0, 0, 0], ondes = [];

  function image(t){
    var r = elLogo.getBoundingClientRect(), ss = r.width / BW, ox = r.left, oy = r.top; // échelle écran (caméra comprise)
    var s = elLogo.offsetWidth / BW;                                                      // échelle locale (pour les découpes)
    var A = BW * ss, cxL = ox + BW / 2 * ss, cyL = oy + BH / 2 * ss;

    // caméra : avance lentement, bat comme un cœur à la fin, tremble quand une lettre tombe
    var shake = 0;
    for (var z = 0; z < 5; z++) if (posee[z]) shake += Math.exp(-(t - tPose[z]) * 8.5);
    var pouls = 0.03 * Math.exp(-Math.pow((t - (T_FIN + 0.45)) / 0.22, 2)) + 0.022 * Math.exp(-Math.pow((t - (T_FIN + 1.0)) / 0.2, 2));
    var cam = 0.9 + 0.13 * outCubic(t / (DUREE - 0.3)) + pouls;
    elCam.style.transform = 'translate(' + (Math.sin(t * 61) * shake * 3.2).toFixed(1) + 'px,' + (Math.cos(t * 73) * shake * 2.6).toFixed(1) + 'px) scale(' + cam.toFixed(4) + ')';

    // lueur d'ambiance
    elGlow.style.opacity = String(c01(t / 0.9) * (0.9 + 0.1 * Math.sin(t * 3.1)) * (1 + 0.35 * pouls * 20));

    g.clearRect(0, 0, W, H);
    // rayons dorés qui tournent, trait de lumière du début, poussière d'or aspirée
    rayons(cxL, oy + BH * 0.44 * ss, t, c01((t - 0.35) / 1.2) * (1 - c01((t - (DUREE - 0.9)) / 0.7)));
    var pS = c01(t / 1.05);
    if (t < 1.4) trait(W / 2, cyL - A * 0.02, W * 0.62 * outCubic(pS) + 4, Math.sin(Math.PI * c01(t / 1.4)) * 0.95);
    if (t < 1.8){
      for (var a2 = 0; a2 < aspire.length; a2++){
        var pa = aspire[a2], k2 = (t - pa.t0) / pa.tour;
        if (k2 <= 0 || k2 >= 1) continue;
        var Rr = pa.R * Math.max(W, H) * 0.6 * Math.pow(1 - k2, 1.6), an = pa.a + k2 * 5.2;
        halo(cxL + Math.cos(an) * Rr, cyL + Math.sin(an) * Rr * 0.8, pa.r * 4.2, Math.sin(k2 * Math.PI) * 0.9, Math.sin(k2 * Math.PI) * 0.5);
      }
    }

    // 1) l'étoile filante dessine le K : balayage suivant la courbe
    var u = inOutCubic((t - 0.55) / 0.85), cur = surCourbe(u);
    if (t >= 0.55){
      var dir = { x: cur.tx, y: cur.ty }, n = { x: -dir.y, y: dir.x }, B = 2400;
      var cx = cur.x * s, cy = cur.y * s;
      var pts = [[cx + n.x * B, cy + n.y * B], [cx - n.x * B, cy - n.y * B], [cx - n.x * B - dir.x * B, cy - n.y * B - dir.y * B], [cx + n.x * B - dir.x * B, cy + n.y * B - dir.y * B]];
      if (u >= 1) pts = [[-B, -B], [B * 2, -B], [B * 2, B * 2], [-B, B * 2]];
      elK.style.opacity = '1';
      elK.style.clipPath = 'polygon(' + pts.map(function(p){ return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(',') + ')';
      var hole = 'radial-gradient(circle at ' + (BALL.x * s).toFixed(1) + 'px ' + (BALL.y * s).toFixed(1) + 'px,transparent ' + ((TROU - 1) * s).toFixed(1) + 'px,#000 ' + (TROU * s).toFixed(1) + 'px)';
      if (t < 2.05){ elK.style.webkitMaskImage = hole; elK.style.maskImage = hole; }
      else { elK.style.webkitMaskImage = 'none'; elK.style.maskImage = 'none'; }
    }

    // 2) arrivée : l'étoile éclate, la tête tombe et rebondit
    if (u >= 1 && !starOn){ starOn = true; elStar.className = 'ki-star on'; elFlash.className = 'ki-flash on'; gerbe(ox + STAR.x * ss, oy + STAR.y * ss, t, true); }
    if (starOn){ trait(ox + STAR.x * ss, oy + STAR.y * ss, A * 0.9, Math.max(0, 0.95 - (t - 1.4) * 1.1)); }
    var tb = (t - 1.4) / 0.6;
    if (tb > 0){
      var e = outBounce(tb), dy2 = -(1 - e) * BH * 0.55 * s;
      elBall.style.opacity = '1';
      elBall.style.transform = 'translateY(' + dy2.toFixed(1) + 'px)';
      elBall.style.clipPath = 'circle(' + (TROU * s).toFixed(1) + 'px at ' + (BALL.x * s).toFixed(1) + 'px ' + (BALL.y * s).toFixed(1) + 'px)';
      if (tb >= 0.56 && !ballPose){ ballPose = true; elRing.className = 'ki-ring on'; gerbe(ox + BALL.x * ss, oy + (BALL.y + 40) * ss, t, false); }
      if (t >= 2.05){ elK.style.webkitMaskImage = 'none'; elK.style.maskImage = 'none'; }
    }

    // 3) KOMYO : chaque lettre fonce d'une direction différente et s'abat à sa place
    for (var i = 0; i < elLet.length; i++){
      var p = (t - (T_LET + PAS_LET * i)) / DUR_LET;
      if (p <= 0) continue;
      var v = VOL[i], el = elLet[i], ep = outQuart(p), re = 1 - ep, ob = outBack(p, 1.5) - ep; // ob : léger dépassement à l'arrivée
      el.style.opacity = String(c01(p * 4));
      el.style.transform = 'translate3d(' + (v.tx * re * s).toFixed(1) + 'px,' + ((v.ty * re - ob * 26) * s).toFixed(1) + 'px,0) rotateX(' + (v.rx * re).toFixed(1) + 'deg) rotateY(' + (v.ry * re).toFixed(1) + 'deg) scale(' + (1 + (v.sc - 1) * re + ob * 0.06).toFixed(3) + ')';
      el.style.filter = p < 1 ? 'blur(' + (re * 7).toFixed(1) + 'px) brightness(' + (1 + re * 1.6).toFixed(2) + ')' : (t - tPose[i] < 0.35 ? 'brightness(' + (1 + (1 - (t - tPose[i]) / 0.35) * 0.9).toFixed(2) + ')' : 'none');
      if (p >= 1 && !posee[i]){
        posee[i] = true; tPose[i] = t;
        var lx = ox + (COUPES[i] + COUPES[i + 1]) / 2 * ss, ly = oy + (MOT_HAUT + MOT_BAS) / 2 * ss;
        gerbe(lx, oy + MOT_BAS * ss, t, true);
        ondes.push({ x: lx, y: oy + (MOT_BAS - 6) * ss, t: t, w: (COUPES[i + 1] - COUPES[i]) * ss });
        halo(lx, ly, (COUPES[i + 1] - COUPES[i]) * ss * 0.9, 0.55, 0.35);
      }
    }
    // ondes de choc au sol des lettres
    for (var o = ondes.length - 1; o >= 0; o--){
      var od = ondes[o], ko = (t - od.t) / 0.55;
      if (ko >= 1){ ondes.splice(o, 1); continue; }
      g.save(); g.translate(od.x, od.y); g.scale(1, 0.18); g.strokeStyle = 'rgba(255,224,140,' + ((1 - ko) * 0.8).toFixed(3) + ')'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, od.w * (0.35 + 1.1 * outCubic(ko)), 0, 6.2832); g.stroke(); g.restore();
    }

    // 4) slogan : mot par mot, les lettres se resserrent dans la lumière
    for (var w = 0; w < elMot.length; w++){
      var pw = (t - (T_SLO + PAS_MOT * w)) / DUR_MOT;
      if (pw <= 0) continue;
      var ew = outQuart(pw), rw = 1 - ew, em = elMot[w];
      em.style.opacity = String(c01(pw * 3));
      em.style.transform = 'scaleX(' + (1 + rw * 1.9).toFixed(3) + ') translateY(' + (rw * -14 * s).toFixed(1) + 'px)';
      em.style.filter = pw < 1 ? 'blur(' + (rw * 6).toFixed(1) + 'px) brightness(' + (1 + rw * 1.8).toFixed(2) + ')' : 'none';
      if (pw > 0.0 && pw < 0.12 && !em._g){ em._g = 1; gerbe(ox + (MOTS[w][0] + MOTS[w][1]) / 2 * ss, oy + SLO_BAS * ss, t, false); }
    }
    var pl = outCubic((t - (T_SLO + 0.5)) / 0.8);
    if (pl > 0){
      elLig.style.opacity = String(c01(pl * 2));
      elLig.style.clipPath = 'inset(' + pct(LIG_HAUT, BH) + ' ' + ((1 - pl) * 50).toFixed(2) + '% 0 ' + ((1 - pl) * 50).toFixed(2) + '%)';
      if (pl < 1) { // deux étincelles qui courent aux extrémités de la ligne
        var ly2 = oy + (LIG_HAUT + 17) * ss, half = (BW / 2) * pl * ss * 0.96;
        halo(cxL - half, ly2, 15 * (A / 480), 0.95, 0.6); halo(cxL + half, ly2, 15 * (A / 480), 0.95, 0.6);
      }
    }

    // 5) éclat de lumière final sur tout le logo + trait de lumière
    var pe = (t - T_FIN) / 0.95;
    if (pe > 0 && pe < 1.05){ elShine.style.opacity = '1'; elShine.style.backgroundPosition = (160 - 220 * c01(pe)).toFixed(1) + '% 0'; }
    else if (pe >= 1.05) elShine.style.opacity = '0';
    if (pe > 0 && pe < 1) trait(cxL, oy + (MOT_HAUT + MOT_BAS) / 2 * ss, W * 0.55 * outCubic(pe), Math.sin(Math.PI * pe) * 0.8);

    // traînée de l'étoile filante
    if (t >= 0.55 && t < 1.75){ trail.push({ x: ox + cur.x * ss, y: oy + cur.y * ss, t: t }); }
    while (trail.length && t - trail[0].t > 0.36) trail.shift();
    for (var k = 0; k < trail.length; k++){
      var f = (k + 1) / trail.length, tp = trail[k];
      halo(tp.x, tp.y, (4 + 16 * f) * (A / 480), 0.5 * f, 0.4 * f);
    }
    if (t >= 0.55 && u < 1) halo(ox + cur.x * ss, oy + cur.y * ss, 28 * (A / 480), 0.95, 0.65);

    // gerbes d'étincelles
    for (var q2 = gerbes.length - 1; q2 >= 0; q2--){
      var ge = gerbes[q2], kg = t - ge.t;
      if (kg > ge.vie){ gerbes.splice(q2, 1); continue; }
      var ug = kg / ge.vie;
      halo(ge.x + ge.vx * kg, ge.y + ge.vy * kg + 330 * kg * kg, ge.r * 3.6, (1 - ug) * 0.95, (1 - ug) * 0.55);
    }
    // poussière d'or qui monte
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
    if (g && !fini) image(t);
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
