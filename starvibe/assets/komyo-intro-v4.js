// KOMYO — générique d'ouverture : le logo se RECONSTRUIT sous les yeux (≈ 6 s), avant l'accueil.
//
//   1. un point de lumière éclate : onde de choc, rayons dorés qui tournent ;
//   2. des milliers de particules d'or, aspirées en spirales de tout l'écran, convergent et forment peu à peu
//      le K, puis chaque lettre de KOMYO, le slogan et la ligne — chaque particule porte la couleur exacte
//      du point du logo où elle va se poser ;
//   3. un faisceau lumineux balaie le logo de gauche à droite : derrière lui, les particules se fondent dans
//      le vrai logo net, et des étincelles jaillissent le long du faisceau ;
//   4. l'étoile éclate, un éclat traverse le logo, il bat comme un cœur, puis on entre dans l'application.
// Une seule fois par visite et à chaque lancement de l'application installée ; un toucher passe l'animation ;
// rien du tout si la personne a demandé moins d'animations. Une seule image est chargée (le logo officiel).
(function(){
  'use strict';
  if (window.__komyoIntro) return;
  window.__komyoIntro = true;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  try { if (sessionStorage.getItem('komyo_intro_vu') === '1') return; sessionStorage.setItem('komyo_intro_vu', '1'); } catch (e) {}

  var LOGO = '/starvibe/assets/img/icons/komyo-logo-officiel-v2.webp';
  var BW = 900, BH = 721;                                   // repère de l'image du logo
  var DUREE = 6.2, SORTIE = 500;                            // secondes / millisecondes
  var COUPES = [0, 165, 350, 558, 692, 900];                // colonnes entre les lettres de KOMYO
  var STAR = { x: 741, y: 89 };
  var T_SCAN = 3.55, D_SCAN = 1.3, T_SHINE = 4.95;
  var faible = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  var NB = faible ? 2300 : 3400;                            // nombre de particules

  var css =
    '.ki{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#050509;overflow:hidden;touch-action:manipulation;' +
      'transition:opacity ' + SORTIE + 'ms ease;}' +
    '.ki.out{opacity:0;pointer-events:none;}' +
    '.ki-glow{position:absolute;left:50%;top:46%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;opacity:0;' +
      'background:radial-gradient(circle,rgba(255,196,64,.30) 0,rgba(255,150,0,.09) 14%,rgba(0,0,0,0) 32%);}' +
    '.ki-cv{position:absolute;inset:0;width:100%;height:100%;}' +
    '.ki-cam{position:relative;width:min(84vw,500px);aspect-ratio:' + BW + '/' + BH + ';will-change:transform;}' +
    '.ki-img{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;clip-path:inset(0 100% 0 0);}' +
    '.ki-shine{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:0;' +
      'background:linear-gradient(105deg,rgba(255,255,255,0) 43%,rgba(255,243,200,.85) 50%,rgba(255,255,255,0) 57%) 160% 0/260% 100% no-repeat;' +
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
    '.ki.out .ki-cam{transform:scale(1.3)!important;transition:transform ' + SORTIE + 'ms cubic-bezier(.5,0,.9,.4);}' +
    '@media (prefers-reduced-motion:reduce){.ki{display:none}}';

  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var box = document.createElement('div');
  box.className = 'ki';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML =
    '<div class="ki-glow"></div><canvas class="ki-cv"></canvas>' +
    '<div class="ki-cam"><img class="ki-img" alt="" src="' + LOGO + '" decoding="async">' +
      '<div class="ki-shine"></div><div class="ki-flash"></div><div class="ki-star"></div></div>';
  (document.body || document.documentElement).appendChild(box);
  var prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  var $ = function(s){ return box.querySelector(s); };
  var elCam = $('.ki-cam'), elGlow = $('.ki-glow'), cv = $('.ki-cv'), g = cv.getContext && cv.getContext('2d');
  var elImg = $('.ki-img'), elShine = $('.ki-shine'), elStar = $('.ki-star'), elFlash = $('.ki-flash');

  // ---------- Courbes ----------
  function c01(x){ return x < 0 ? 0 : x > 1 ? 1 : x; }
  function outCubic(x){ x = c01(x); return 1 - Math.pow(1 - x, 3); }
  function inOutCubic(x){ x = c01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  // ---------- Particules : chacune connaît sa place et sa couleur dans le logo ----------
  var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0;
  var TX, TY, SX, SY, CX, CY, T0, DU, BIN, GR;               // cibles (repère logo), départs (px écran), courbure, début, durée, teinte, groupe
  var NBIN = 10, binRGB = [], etincelles = [], pret = false;

  function taille(){ W = box.clientWidth; H = box.clientHeight; cv.width = W * dpr; cv.height = H * dpr; if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0); }

  function groupe(x, y){
    if (y < 468) return 0;                                       // le K et sa tête
    if (y < 626){ for (var i = 0; i < 5; i++) if (x < COUPES[i + 1]) return 1 + i; return 5; }
    if (y < 676) return 6;                                       // le slogan
    return 7;                                                    // la ligne
  }
  var DEBUT = [0.25, 0.9, 1.07, 1.24, 1.41, 1.58, 1.95, 2.25];  // début d'arrivée par groupe

  function preparer(img){
    var SW = 450, SH = Math.round(450 * BH / BW), oc = document.createElement('canvas');
    oc.width = SW; oc.height = SH;
    var og = oc.getContext('2d', { willReadFrequently: true });
    og.drawImage(img, 0, 0, SW, SH);
    var d = og.getImageData(0, 0, SW, SH).data, pts = [];
    for (var y = 0; y < SH; y++) for (var x = 0; x < SW; x++){
      var k = (y * SW + x) * 4;
      if (d[k + 3] > 150) pts.push(k | 0, x, y);
    }
    var np = pts.length / 3;
    if (!np) return false;
    TX = new Float32Array(NB); TY = new Float32Array(NB); SX = new Float32Array(NB); SY = new Float32Array(NB);
    CX = new Float32Array(NB); CY = new Float32Array(NB); T0 = new Float32Array(NB); DU = new Float32Array(NB); BIN = new Uint8Array(NB); GR = new Uint8Array(NB);
    var lum = new Float32Array(NB), rgb = new Float32Array(NB * 3), cx0 = W / 2, cy0 = H * 0.47, R0 = Math.hypot(W, H) * 0.62;
    for (var i = 0; i < NB; i++){
      var p = ((Math.random() * np) | 0) * 3, k2 = pts[p], px = pts[p + 1], py = pts[p + 2];
      var lx = (px + Math.random()) * BW / SW, ly = (py + Math.random()) * BH / SH;
      TX[i] = lx; TY[i] = ly;
      var r = d[k2], gg = d[k2 + 1], b = d[k2 + 2];
      rgb[i * 3] = r; rgb[i * 3 + 1] = gg; rgb[i * 3 + 2] = b; lum[i] = 0.3 * r + 0.59 * gg + 0.11 * b;
      var grp = groupe(lx, ly); GR[i] = grp;
      // départ : sur trois bras de spirale, tout autour de l'écran
      var arm = (i % 3) * 2.0944 + (Math.random() - 0.5) * 0.9, rad = R0 * (0.55 + Math.random() * 0.6);
      SX[i] = cx0 + Math.cos(arm) * rad; SY[i] = cy0 + Math.sin(arm) * rad * 0.9;
      T0[i] = DEBUT[grp] + Math.random() * 0.5; DU[i] = 0.95 + Math.random() * 0.6;
      CX[i] = (Math.random() - 0.5) * 1.2; CY[i] = 0;                       // courbure (fraction de la distance)
    }
    // teintes : 10 niveaux de luminosité, couleur moyenne de chacun
    var mn = 1e9, mx = -1e9, i2;
    for (i2 = 0; i2 < NB; i2++){ if (lum[i2] < mn) mn = lum[i2]; if (lum[i2] > mx) mx = lum[i2]; }
    var sum = [], cnt = [];
    for (i2 = 0; i2 < NBIN; i2++){ sum.push([0, 0, 0]); cnt.push(0); }
    for (i2 = 0; i2 < NB; i2++){
      var bi = Math.min(NBIN - 1, Math.floor((lum[i2] - mn) / (mx - mn + 1) * NBIN)); BIN[i2] = bi; cnt[bi]++;
      sum[bi][0] += rgb[i2 * 3]; sum[bi][1] += rgb[i2 * 3 + 1]; sum[bi][2] += rgb[i2 * 3 + 2];
    }
    for (i2 = 0; i2 < NBIN; i2++){
      var c = cnt[i2] || 1;
      binRGB.push('rgb(' + Math.min(255, Math.round(sum[i2][0] / c * 1.08)) + ',' + Math.min(255, Math.round(sum[i2][1] / c * 1.08)) + ',' + Math.min(255, Math.round(sum[i2][2] / c * 1.08)) + ')');
    }
    return true;
  }

  function halo(x, y, r, a1, a2){
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,248,210,' + a1 + ')'); gr.addColorStop(0.35, 'rgba(255,205,80,' + a2 + ')'); gr.addColorStop(1, 'rgba(255,170,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
  }
  function rayons(cx, cy, t, a){
    if (a <= 0.01) return;
    var R = Math.hypot(W, H) * 0.75, N = 12, rot = t * 0.16;
    var gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    gr.addColorStop(0, 'rgba(255,214,120,' + (0.22 * a) + ')'); gr.addColorStop(0.55, 'rgba(255,190,70,' + (0.07 * a) + ')'); gr.addColorStop(1, 'rgba(255,170,0,0)');
    g.fillStyle = gr;
    for (var i = 0; i < N; i++){
      var a0 = rot + i * 6.2832 / N, w = 0.06;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0 - w, a0 + w); g.closePath(); g.fill();
    }
  }
  function etincelle(x, y, t, n){
    for (var i = 0; i < n; i++){
      var an = Math.random() * 6.2832, v = 40 + Math.random() * 150;
      etincelles.push({ x: x, y: y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 40, t: t, vie: 0.5 + Math.random() * 0.6, r: 1.1 + Math.random() * 2.2 });
    }
  }

  var t0 = 0, raf = 0, vivant = true, fini = false, demarre = false, etoile = false, scanPrec = 0;

  function image(t){
    var r = elCam.getBoundingClientRect(), ss = r.width / BW, ox = r.left, oy = r.top;
    var cxL = ox + BW / 2 * ss, cyL = oy + BH * 0.42 * ss;

    // caméra : avance doucement, bat comme un cœur après l'éclat final
    var pouls = 0.03 * Math.exp(-Math.pow((t - (T_SHINE + 0.5)) / 0.22, 2)) + 0.02 * Math.exp(-Math.pow((t - (T_SHINE + 1.05)) / 0.2, 2));
    elCam.style.transform = 'scale(' + (0.94 + 0.08 * outCubic(t / (DUREE - 0.3)) + pouls).toFixed(4) + ')';
    elGlow.style.opacity = String(c01(t / 0.9) * (0.85 + 0.15 * Math.sin(t * 3.1)) * (1 + pouls * 8));

    g.clearRect(0, 0, W, H);
    rayons(cxL, cyL, t, c01((t - 0.25) / 1.1) * (1 - c01((t - (DUREE - 1.0)) / 0.8)));

    // 1) l'éclat du début : point de lumière + onde de choc
    if (t < 1.4){
      var pc = c01(t / 1.4), pulse = Math.sin(Math.PI * Math.min(1, t / 0.9));
      halo(cxL, cyL, (10 + 70 * outCubic(pc)) * (ss * BW / 480), Math.min(1, pulse * 1.2), pulse * 0.7);
      g.save(); g.translate(cxL, cyL); g.scale(1, 0.62);
      g.strokeStyle = 'rgba(255,224,140,' + ((1 - pc) * 0.85).toFixed(3) + ')'; g.lineWidth = 2.4;
      g.beginPath(); g.arc(0, 0, outCubic(pc) * Math.max(W, H) * 0.62, 0, 6.2832); g.stroke(); g.restore();
    }

    if (!pret) return;

    // 2) les particules convergent
    var scan = c01((t - T_SCAN) / D_SCAN), sx = inOutCubic(scan) * (BW + 40) - 20;      // position du faisceau (repère logo)
    var lw = 1.7 * (ss * BW / 480) + 0.6;
    g.lineCap = 'round'; g.lineWidth = lw;
    var vol = new Array(0), i, p, e, e2, p2;
    var bin = [], b;
    for (b = 0; b < NBIN; b++) bin.push([]);
    g.beginPath();
    for (i = 0; i < NB; i++){
      p = (t - T0[i]) / DU[i];
      if (p <= 0) continue;
      var tx = ox + TX[i] * ss, ty = oy + TY[i] * ss;
      if (p < 1){
        e = 1 - Math.pow(1 - p, 2.7);
        var dx = tx - SX[i], dy = ty - SY[i], sn = Math.sin(Math.PI * e) * CX[i];
        var x = SX[i] + dx * e - dy * sn, y = SY[i] + dy * e + dx * sn;
        p2 = Math.max(0, p - 0.03 / DU[i]); e2 = 1 - Math.pow(1 - p2, 2.7);
        sn = Math.sin(Math.PI * e2) * CX[i];
        g.moveTo(SX[i] + dx * e2 - dy * sn, SY[i] + dy * e2 + dx * sn); g.lineTo(x, y);
        if (p > 0.85) bin[BIN[i]].push(x, y);
      } else if (TX[i] > sx) bin[BIN[i]].push(tx, ty);
    }
    g.strokeStyle = 'rgba(255,226,150,0.9)'; g.stroke();
    // particules posées : couleur du logo
    g.lineWidth = lw * 1.5;
    for (b = 0; b < NBIN; b++){
      var arr = bin[b]; if (!arr.length) continue;
      g.beginPath();
      for (var k = 0; k < arr.length; k += 2){ g.moveTo(arr[k], arr[k + 1]); g.lineTo(arr[k] + 0.01, arr[k + 1]); }
      g.strokeStyle = binRGB[b]; g.stroke();
    }

    // 3) le faisceau balaie le logo ; derrière lui, le vrai logo net
    if (t >= T_SCAN){
      elImg.style.opacity = '1';
      elImg.style.clipPath = 'inset(0 ' + (100 - c01(sx / BW) * 100).toFixed(2) + '% 0 0)';
      if (scan < 1){
        var bx = ox + sx * ss, y0 = oy - 10, y1 = oy + BH * ss + 10;
        var gr = g.createLinearGradient(bx - 40, 0, bx + 40, 0);
        gr.addColorStop(0, 'rgba(255,200,80,0)'); gr.addColorStop(0.36, 'rgba(255,205,90,0.10)'); gr.addColorStop(0.47, 'rgba(255,230,150,0.55)');
        gr.addColorStop(0.5, 'rgba(255,255,240,1)'); gr.addColorStop(0.53, 'rgba(255,230,150,0.55)'); gr.addColorStop(0.64, 'rgba(255,205,90,0.10)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
        g.fillStyle = gr;
        var hs = (y1 - y0) / 10;
        for (var sg = 0; sg < 10; sg++){ g.globalAlpha = Math.sin((sg + 0.5) / 10 * Math.PI); g.fillRect(bx - 40, y0 + sg * hs, 80, hs + 0.5); }
        g.globalAlpha = 1;
        halo(bx, oy + BH * 0.5 * ss, BH * ss * 0.42, 0.28, 0.16);
        for (var q = 0; q < 2; q++) etincelle(bx, y0 + 12 + Math.random() * (y1 - y0 - 24), t, 1);
      }
      if (sx > STAR.x && !etoile){ etoile = true; elStar.className = 'ki-star on'; elFlash.className = 'ki-flash on'; etincelle(ox + STAR.x * ss, oy + STAR.y * ss, t, 18); }
    }

    // 4) l'éclat de lumière final
    var pe = (t - T_SHINE) / 0.95;
    if (pe > 0 && pe < 1.05){ elShine.style.opacity = '1'; elShine.style.backgroundPosition = (160 - 220 * c01(pe)).toFixed(1) + '% 0'; }
    else if (pe >= 1.05) elShine.style.opacity = '0';

    // étincelles
    for (var j = etincelles.length - 1; j >= 0; j--){
      var s = etincelles[j], ks = t - s.t;
      if (ks > s.vie){ etincelles.splice(j, 1); continue; }
      var us = ks / s.vie;
      halo(s.x + s.vx * ks, s.y + s.vy * ks + 260 * ks * ks, s.r * 3.6, (1 - us) * 0.95, (1 - us) * 0.55);
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
  function demarrer(img){
    if (demarre) return; demarre = true;
    if (g){ taille(); try { pret = preparer(img); } catch (e) { pret = false; } window.addEventListener('resize', taille); }
    if (!pret){ elImg.style.opacity = '1'; elImg.style.clipPath = 'none'; }   // secours : on montre simplement le logo
    raf = requestAnimationFrame(boucle);
  }

  // on attend que l'image soit là (ou 900 ms), puis on joue
  var imgTest = new Image(), tGo = setTimeout(function(){ demarrer(imgTest); }, 900);
  imgTest.onload = imgTest.onerror = function(){ clearTimeout(tGo); demarrer(imgTest); };
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
