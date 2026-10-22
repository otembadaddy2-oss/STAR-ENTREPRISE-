// KOMYO — générique d'ouverture « étoiles filantes » : le logo est DESSINÉ par des étoiles (≈ 4,7 s).
//
//   1. des étoiles filantes traversent l'écran, chacune avec un fin trait blanc qui disparaît aussitôt ;
//   2. trois étoiles dessinent le K : la barre, la grande courbe, puis la jambe — là où une étoile est passée,
//      le vrai logo apparaît derrière elle ;
//   3. cinq étoiles arrivent de tous les côtés et font apparaître les lettres K-O-M-Y-O, une étoile balaie
//      le slogan, deux autres ouvrent la ligne dorée depuis le centre ;
//   4. la grande lumière éclate : elle fait apparaître le point au-dessus du K et le logo est parfait ;
//   5. un scanner de lumière balaie le logo (aller, puis retour plus fort), il bat comme un cœur,
//      puis l'application s'ouvre.
// Tout se joue en moins de 5 secondes. Une seule fois par visite et à chaque lancement de l'application installée ; un toucher passe l'animation ;
// rien du tout si la personne a demandé moins d'animations. Une seule image est chargée (le logo officiel).
(function(){
  'use strict';
  if (window.__komyoIntro) return;
  window.__komyoIntro = true;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  try { if (sessionStorage.getItem('komyo_intro_vu') === '1') return; sessionStorage.setItem('komyo_intro_vu', '1'); } catch (e) {}

  var LOGO = '/starvibe/assets/img/icons/komyo-logo-officiel-v1.png';
  var BW = 900, BH = 721;                                   // repère de l'image du logo
  var DUREE = 7.3, VITESSE = 1.55, SORTIE = 500;           // la séquence (7,3 s « d'écriture ») se joue 1,55× plus vite : ≈ 4,7 s réelles                            // secondes / millisecondes
  var BALL = { x: 500, y: 113, r: 68 }, TROU = BALL.r + 14; // la « tête » du K (le point)
  var K_BAS = 468, MOT_HAUT = 468, MOT_BAS = 624, SLO_HAUT = 626, SLO_BAS = 676, LIG_HAUT = 676;
  var COUPES = [0, 165, 350, 558, 692, 900];                // colonnes entre les lettres de KOMYO
  var PATH = [[205,505],[262,440],[300,398],[350,352],[425,293],[500,238],[560,196],[620,152],[690,114],[735,92]];
  var STAR = { x: 741, y: 89 };
  var T_BALL = 4.6, T_SC = 5.2;                              // T_SC : début du scanner de lumière

  var css =
    '.ki{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#050509;overflow:hidden;touch-action:manipulation;' +
      'transition:opacity ' + SORTIE + 'ms ease;}' +
    '.ki.out{opacity:0;pointer-events:none;}' +
    '.ki-glow{position:absolute;left:50%;top:46%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;opacity:0;' +
      'background:radial-gradient(circle,rgba(255,196,64,.30) 0,rgba(255,150,0,.09) 14%,rgba(0,0,0,0) 32%);}' +
    '.ki-cv{position:absolute;inset:0;width:100%;height:100%;}' +
    '.ki-cam{position:relative;width:min(84vw,500px);aspect-ratio:' + BW + '/' + BH + ';will-change:transform;pointer-events:none;}' +
    '.ki-star{position:absolute;left:' + (STAR.x / BW * 100) + '%;top:' + (STAR.y / BH * 100) + '%;width:0;height:0;pointer-events:none;}' +
    '.ki-star::before,.ki-star::after{content:"";position:absolute;left:0;top:0;border-radius:2px;opacity:0;transform:translate(-50%,-50%) scale(0);}' +
    '.ki-star::before{width:min(40vw,230px);height:3px;background:linear-gradient(90deg,rgba(255,220,120,0),#fff,rgba(255,220,120,0));}' +
    '.ki-star::after{width:3px;height:min(40vw,230px);background:linear-gradient(180deg,rgba(255,220,120,0),#fff,rgba(255,220,120,0));}' +
    '.ki-star.on::before,.ki-star.on::after{animation:ki-flare 1.8s ease-out forwards,ki-twinkle 1.6s ease-in-out 1.8s infinite;}' +
    '@keyframes ki-flare{0%{opacity:0;transform:translate(-50%,-50%) scale(0) rotate(0)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.35) rotate(18deg)}100%{opacity:.85;transform:translate(-50%,-50%) scale(.95) rotate(45deg)}}' +
    '@keyframes ki-twinkle{0%,100%{opacity:.85}50%{opacity:.3}}' +
    '.ki.out .ki-cam{transform:scale(1.3)!important;transition:transform ' + SORTIE + 'ms cubic-bezier(.5,0,.9,.4);}' +
    '@media (prefers-reduced-motion:reduce){.ki{display:none}}';

  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var box = document.createElement('div');
  box.className = 'ki';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<div class="ki-glow"></div><canvas class="ki-cv"></canvas><div class="ki-cam"><div class="ki-star"></div></div>';
  (document.body || document.documentElement).appendChild(box);
  var prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  var $ = function(s){ return box.querySelector(s); };
  var elCam = $('.ki-cam'), elGlow = $('.ki-glow'), cv = $('.ki-cv'), g = cv.getContext && cv.getContext('2d');
  var elStar = $('.ki-star');

  // ---------- Courbes ----------
  function c01(x){ return x < 0 ? 0 : x > 1 ? 1 : x; }
  function outCubic(x){ x = c01(x); return 1 - Math.pow(1 - x, 3); }
  function inOutCubic(x){ x = c01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function outBack(x, c){ x = c01(x); c = c || 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }

  var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0;
  function taille(){ W = box.clientWidth; H = box.clientHeight; cv.width = W * dpr; cv.height = H * dpr; if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0); }

  // ---------- Le logo « dessiné » : masque de révélation + logo net ----------
  var img = null, MW = 0, MH = 0, ms = 1, mask, mg, tmp, tg, disc;
  function preparerCanvas(){
    MW = Math.round(elCam.offsetWidth * dpr); MH = Math.round(MW * BH / BW); ms = MW / BW;
    mask = document.createElement('canvas'); mask.width = MW; mask.height = MH; mg = mask.getContext('2d');
    tmp = document.createElement('canvas'); tmp.width = MW; tmp.height = MH; tg = tmp.getContext('2d');
    disc = document.createElement('canvas'); disc.width = disc.height = 96;
    var dg = disc.getContext('2d'), gr = dg.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    dg.fillStyle = gr; dg.fillRect(0, 0, 96, 96);
  }
  // zones où une étoile a le droit de révéler (pour ne pas faire apparaître le voisin par erreur)
  function zone(kind, i){
    return function(c){
      c.beginPath();
      if (kind === 'K'){ c.moveTo(0, 0); c.lineTo(MW, 0); c.lineTo(MW, 440 * ms); c.lineTo(655 * ms, 440 * ms); c.lineTo(655 * ms, K_BAS * ms); c.lineTo(235 * ms, K_BAS * ms); c.lineTo(235 * ms, 440 * ms); c.lineTo(0, 440 * ms); c.closePath(); }
      else if (kind === 'L') c.rect(COUPES[i] * ms, MOT_HAUT * ms, (COUPES[i + 1] - COUPES[i]) * ms, (MOT_BAS - MOT_HAUT) * ms);
      else if (kind === 'S') c.rect(0, SLO_HAUT * ms, MW, (SLO_BAS - SLO_HAUT) * ms);
      else c.rect(0, LIG_HAUT * ms, MW, MH - LIG_HAUT * ms);
      c.clip();
    };
  }
  function composer(t){
    tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, MW, MH);
    tg.drawImage(img, 0, 0, MW, MH);
    tg.globalCompositeOperation = 'destination-in'; tg.drawImage(mask, 0, 0);
    tg.globalCompositeOperation = 'destination-out'; tg.beginPath(); tg.arc(BALL.x * ms, BALL.y * ms, TROU * ms, 0, 6.2832); tg.fill();   // la tête n'est pas encore là
    tg.globalCompositeOperation = 'source-over';
    var pb = (t - (T_BALL + 0.18)) / 0.55;                     // la grande lumière la fait apparaître
    if (pb > 0){
      var r = TROU * Math.max(0.001, outBack(pb, 2.2));
      tg.save(); tg.beginPath(); tg.arc(BALL.x * ms, BALL.y * ms, r * ms, 0, 6.2832); tg.clip();
      tg.drawImage(img, 0, 0, MW, MH); tg.restore();
    }
  }

  // ---------- Les étoiles : chemins, traînées, révélation ----------
  var tasks = [], cum = [0], LONG = 0, Rtr = 0.34;
  function geometrie(){
    cum = [0];
    for (var q = 1; q < PATH.length; q++) cum.push(cum[q - 1] + Math.hypot(PATH[q][0] - PATH[q - 1][0], PATH[q][1] - PATH[q - 1][1]));
    LONG = cum[cum.length - 1];
  }
  function surCourbe(u){
    var d = c01(u) * LONG, k = 1;
    while (k < cum.length - 1 && cum[k] < d) k++;
    var a = PATH[k - 1], b = PATH[k], f = (d - cum[k - 1]) / (cum[k] - cum[k - 1] || 1);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
  function poly(pts){
    var c = [0], L = 0, k;
    for (k = 1; k < pts.length; k++){ L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); c.push(L); }
    return function(u){
      var d = c01(u) * L, j = 1;
      while (j < pts.length - 1 && c[j] < d) j++;
      var a = pts[j - 1], b = pts[j], f = (d - c[j - 1]) / (c[j] - c[j - 1] || 1);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    };
  }
  function bez(a, b, c){ return function(u){ var v = 1 - u; return [v * v * a[0] + 2 * v * u * b[0] + u * u * c[0], v * v * a[1] + 2 * v * u * b[1] + u * u * c[1]]; }; }
  function aleaHors(){ // un point hors de l'écran, en coordonnées « logo »
    var side = Math.floor(Math.random() * 4), x, y, m = 360;
    if (side === 0){ x = -m; y = Math.random() * BH; } else if (side === 1){ x = BW + m; y = Math.random() * BH; }
    else if (side === 2){ x = Math.random() * BW; y = -m * 1.2; } else { x = Math.random() * BW; y = BH + m * 1.2; }
    return [x, y];
  }
  function ajouter(o){ o.tr = []; o.dernier = null; tasks.push(o); }

  function composerTaches(){
    tasks = [];
    // — étoiles filantes de décor : elles traversent l'écran, trait blanc fin qui s'efface aussitôt
    for (var i = 0; i < 9; i++){
      var y0 = Math.random() * H * 0.85 - 30, ang = 0.35 + Math.random() * 0.55, len = Math.max(W, H) * (1.05 + Math.random() * 0.3), sens = Math.random() < 0.7 ? 1 : -1;
      var xs = sens > 0 ? -40 - Math.random() * 80 : W + 40 + Math.random() * 80, ys = y0;
      ajouter({ scr: true, t0: 0.05 + i * 0.13 + Math.random() * 0.1, dur: 0.75 + Math.random() * 0.35, tete: 1.0 + Math.random() * 0.8,
        path: (function(xs, ys, ang, len, sens){ return function(u){ return [xs + sens * Math.cos(ang) * len * u, ys + Math.sin(ang) * len * u]; }; })(xs, ys, ang, len, sens) });
    }
    // — le K : la barre, la grande courbe, la jambe
    ajouter({ t0: 0.95, dur: 0.6, r: 74, kind: 'K', path: poly([[346, -150], [346, 40], [346, 410]]), rev0: 0.3, tete: 1.5 });
    ajouter({ t0: 1.3, dur: 0.95, r: 62, kind: 'K', path: surCourbe, rev0: 0.02, tete: 1.7, fin: 'etoile' });
    ajouter({ t0: 1.95, dur: 0.55, r: 56, kind: 'K', path: poly([[430, 300], [470, 340], [520, 392], [575, 446], [612, 470]]), rev0: 0.0, tete: 1.3 });
    // — les lettres : l'étoile arrive d'un côté, puis balaie la lettre en zigzag
    for (var l = 0; l < 5; l++){
      var x0 = COUPES[l] + 14, x1 = COUPES[l + 1] - 14, ya = MOT_HAUT + 34, yb = (MOT_HAUT + MOT_BAS) / 2, yc = MOT_BAS - 34;
      var dep = aleaHors(), debut = [(l % 2 ? x1 : x0), ya];
      var zz = poly([debut, [(l % 2 ? x0 : x1), ya], [(l % 2 ? x0 : x1), yb], [(l % 2 ? x1 : x0), yb], [(l % 2 ? x1 : x0), yc], [(l % 2 ? x0 : x1), yc]]);
      var ap = bez(dep, [(dep[0] + debut[0]) / 2 + (Math.random() - 0.5) * 260, (dep[1] + debut[1]) / 2 + (Math.random() - 0.5) * 260], debut);
      ajouter({ t0: 2.4 + l * 0.2, dur: 0.75, r: 44, kind: 'L', i: l, rev0: 0.4, tete: 1.25,
        path: (function(ap, zz){ return function(u){ return u < 0.4 ? ap(u / 0.4) : zz((u - 0.4) / 0.6); }; })(ap, zz) });
    }
    // — le slogan : une étoile arrive et le balaie de gauche à droite
    var dS = aleaHors(), sS = [30, 651];
    ajouter({ t0: 3.45, dur: 0.85, r: 40, kind: 'S', rev0: 0.3, tete: 1.3,
      path: (function(ap, bal){ return function(u){ return u < 0.3 ? ap(u / 0.3) : bal((u - 0.3) / 0.7); }; })(bez(dS, [(dS[0] + sS[0]) / 2 + 120, (dS[1] + sS[1]) / 2 - 140], sS), poly([sS, [880, 651]])) });
    // — la ligne dorée s'ouvre depuis le centre, de chaque côté
    ajouter({ t0: 4.0, dur: 0.55, r: 34, kind: 'G', rev0: 0, tete: 1.2, path: poly([[450, 696], [60, 696]]) });
    ajouter({ t0: 4.0, dur: 0.55, r: 34, kind: 'G', rev0: 0, tete: 1.2, path: poly([[450, 696], [840, 696]]) });
    for (var k = 0; k < tasks.length; k++) if (tasks[k].kind){ tasks[k].zone = zone(tasks[k].kind, tasks[k].i); }
  }

  function halo(x, y, r, a1, a2){
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,250,225,' + a1 + ')'); gr.addColorStop(0.35, 'rgba(255,205,80,' + a2 + ')'); gr.addColorStop(1, 'rgba(255,170,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
  }
  function rayons(cx, cy, t, a){
    if (a <= 0.01) return;
    var R = Math.hypot(W, H) * 0.75, N = 12, rot = t * 0.16;
    var gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    gr.addColorStop(0, 'rgba(255,214,120,' + (0.20 * a) + ')'); gr.addColorStop(0.55, 'rgba(255,190,70,' + (0.065 * a) + ')'); gr.addColorStop(1, 'rgba(255,170,0,0)');
    g.fillStyle = gr;
    for (var i = 0; i < N; i++){
      var a0 = rot + i * 6.2832 / N, w = 0.055;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0 - w, a0 + w); g.closePath(); g.fill();
    }
  }
  function tete(x, y, a, taille){  // une étoile : halo + croix de lumière
    halo(x, y, taille * 1.5, a, a * 0.5);
    g.strokeStyle = 'rgba(255,255,245,' + a + ')'; g.lineWidth = 1.3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - taille * 1.9, y); g.lineTo(x + taille * 1.9, y); g.moveTo(x, y - taille * 1.9); g.lineTo(x, y + taille * 1.9); g.stroke();
    halo(x, y, taille * 0.55, a, a);
  }
  var etincelles = [];
  function etincelle(x, y, t, n, v0){
    for (var i = 0; i < n; i++){
      var an = Math.random() * 6.2832, v = (v0 || 60) * (0.4 + Math.random());
      etincelles.push({ x: x, y: y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 30, t: t, vie: 0.5 + Math.random() * 0.6, r: 1.1 + Math.random() * 2.1 });
    }
  }

  var t0 = 0, raf = 0, vivant = true, fini = false, demarre = false, etoile = false, bumm = false, pret = false;

  function image(t){
    var r = elCam.getBoundingClientRect(), ss = r.width / BW, ox = r.left, oy = r.top, A = r.width;
    var cxL = ox + BW / 2 * ss, cyL = oy + BH * 0.42 * ss;

    // caméra : avance doucement, bat comme un cœur après l'éclat final
    var pouls = 0.03 * Math.exp(-Math.pow((t - (T_SC + 1.72)) / 0.2, 2)) + 0.02 * Math.exp(-Math.pow((t - (T_SC + 2.1)) / 0.2, 2));
    elCam.style.transform = 'scale(' + (0.95 + 0.07 * outCubic(t / (DUREE - 0.3)) + pouls).toFixed(4) + ')';
    var flash = Math.exp(-Math.pow((t - (T_BALL + 0.05)) / 0.28, 2));        // la grande lumière
    elGlow.style.opacity = String(c01(t / 0.9) * (0.8 + 0.2 * Math.sin(t * 3.1)) * (1 + pouls * 8 + flash * 0.6));

    g.clearRect(0, 0, W, H);
    rayons(cxL, cyL, t, (0.35 + c01((t - 0.9) / 1.4) * 0.65 + flash * 1.8) * (1 - c01((t - (DUREE - 1.0)) / 0.8)));

    // le logo, révélé là où les étoiles sont passées
    if (pret){
      // la tâche met à jour son étoile et peint son passage dans le masque
      for (var i = 0; i < tasks.length; i++){
        var k = tasks[i], u = (t - k.t0) / k.dur;
        if (u < 0) continue;
        var uu = c01(u);
        if (u <= k.tete){
          var P = k.path(uu), sx = k.scr ? P[0] : ox + P[0] * ss, sy = k.scr ? P[1] : oy + P[1] * ss;
          k.tr.push({ x: sx, y: sy, t: t }); k.cx = sx; k.cy = sy; k.vive = u < 1.0;
          if (k.r && uu >= k.rev0){
            mg.save(); if (k.zone) k.zone(mg);
            var rr = k.r * ms;
            if (k.dernier){
              var dx = P[0] * ms - k.dernier[0], dy = P[1] * ms - k.dernier[1], d = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(d / (rr * 0.35)));
              for (var s = 1; s <= n; s++) mg.drawImage(disc, k.dernier[0] + dx * s / n - rr, k.dernier[1] + dy * s / n - rr, rr * 2, rr * 2);
            } else mg.drawImage(disc, P[0] * ms - rr, P[1] * ms - rr, rr * 2, rr * 2);
            mg.restore(); k.dernier = [P[0] * ms, P[1] * ms];
          }
          if (u >= 1 && !k.fini){
            k.fini = true; k.vive = false;
            if (k.fin === 'etoile' && !etoile){ etoile = true; elStar.className = 'ki-star on'; etincelle(sx, sy, t, 22, 110); }
            else if (k.r) etincelle(sx, sy, t, 7, 70);
          }
        }
      }
      composer(t);
      g.drawImage(tmp, ox, oy, A, A * BH / BW);
    }

    // étoiles : traînées fines qui disparaissent aussitôt, têtes brillantes
    g.lineCap = 'round';
    for (var a = 0; a < tasks.length; a++){
      var q = tasks[a], tr = q.tr;
      while (tr.length && t - tr[0].t > Rtr) tr.shift();
      for (var m = 1; m < tr.length; m++){
        var age = (t - tr[m].t) / Rtr, al = Math.pow(1 - c01(age), 1.6);
        g.strokeStyle = 'rgba(255,255,255,' + (al * 0.95).toFixed(3) + ')'; g.lineWidth = 0.7 + 1.6 * al;
        g.beginPath(); g.moveTo(tr[m - 1].x, tr[m - 1].y); g.lineTo(tr[m].x, tr[m].y); g.stroke();
      }
      if (q.vive && tr.length){ var hd = tr[tr.length - 1]; tete(hd.x, hd.y, 0.95, (q.scr ? 5 : 8) * (A / 480)); }
    }

    // la grande lumière : elle fait apparaître le point au-dessus du K
    if (t >= T_BALL - 0.05 && t < T_BALL + 1.1){
      var kb = (t - T_BALL) / 0.9, bx = ox + BALL.x * ss, by = oy + BALL.y * ss;
      halo(bx, by, A * (0.2 + 1.1 * outCubic(kb + 0.05)), Math.max(0, 1 - kb) * 0.95, Math.max(0, 1 - kb) * 0.55);
      g.save(); g.translate(bx, by); g.strokeStyle = 'rgba(255,236,170,' + (Math.max(0, 1 - kb) * 0.8).toFixed(3) + ')'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(0, 0, A * 0.12 + A * 0.7 * outCubic(kb), 0, 6.2832); g.stroke(); g.restore();
      if (!bumm){ bumm = true; etincelle(bx, by, t, 34, 150); }
    }

    // le scanner de lumière : un faisceau balaie le logo (aller, puis retour plus fort) et l'éclaire derrière lui
    if (pret){
      var passes = [{ d: 0.88, p: (t - T_SC) / 0.88, dir: 1, f: 0.75 }, { d: 0.68, p: (t - (T_SC + 0.98)) / 0.68, dir: -1, f: 1 }];
      for (var ps = 0; ps < passes.length; ps++){
        var P2 = passes[ps];
        if (P2.p <= 0 || P2.p >= 1) continue;
        var e2 = P2.dir > 0 ? inOutCubic(P2.p) : 1 - inOutCubic(P2.p);          // 0 → 1 (aller) ou 1 → 0 (retour)
        var bx2 = ox + (-0.06 + 1.12 * e2) * A, bw = A * 0.30, h2 = A * BH / BW, y0 = oy - 14, y1 = oy + h2 + 14;
        // le logo plus lumineux dans la zone que le faisceau vient de quitter
        g.save(); g.beginPath();
        if (P2.dir > 0) g.rect(bx2 - bw, oy, bw, h2); else g.rect(bx2, oy, bw, h2);
        g.clip(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.85 * P2.f * Math.sin(Math.PI * c01(P2.p) * 0.9 + 0.2);
        g.drawImage(tmp, ox, oy, A, h2); g.drawImage(tmp, ox, oy, A, h2); g.restore();
        // le faisceau
        var gr = g.createLinearGradient(bx2 - 36, 0, bx2 + 36, 0);
        gr.addColorStop(0, 'rgba(255,200,80,0)'); gr.addColorStop(0.38, 'rgba(255,205,90,0.12)'); gr.addColorStop(0.47, 'rgba(255,232,160,0.6)');
        gr.addColorStop(0.5, 'rgba(255,255,245,1)'); gr.addColorStop(0.53, 'rgba(255,232,160,0.6)'); gr.addColorStop(0.62, 'rgba(255,205,90,0.12)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
        g.fillStyle = gr; var hs = (y1 - y0) / 10;
        for (var sg = 0; sg < 10; sg++){ g.globalAlpha = Math.sin((sg + 0.5) / 10 * Math.PI); g.fillRect(bx2 - 36, y0 + sg * hs, 72, hs + 0.5); }
        g.globalAlpha = 1;
        halo(bx2, oy + h2 * 0.5, h2 * 0.5, 0.3 * P2.f, 0.16 * P2.f);
        for (var q3 = 0; q3 < 2; q3++) etincelle(bx2, y0 + 16 + Math.random() * (y1 - y0 - 32), t, 1, 90);
      }
    }

    // étincelles
    for (var j = etincelles.length - 1; j >= 0; j--){
      var s2 = etincelles[j], ks = t - s2.t;
      if (ks > s2.vie){ etincelles.splice(j, 1); continue; }
      var us = ks / s2.vie;
      halo(s2.x + s2.vx * ks, s2.y + s2.vy * ks + 240 * ks * ks, s2.r * 3.4, (1 - us) * 0.95, (1 - us) * 0.5);
    }
  }

  function boucle(now){
    if (!vivant) return;
    raf = requestAnimationFrame(boucle);
    if (!t0) t0 = now;
    var t = (now - t0) / 1000 * VITESSE;
    if (g && !fini) image(t);
    if (t >= DUREE) terminer();
  }
  function demarrer(){
    if (demarre) return; demarre = true;
    if (g){
      taille();
      try { preparerCanvas(); geometrie(); composerTaches(); pret = !!img && img.naturalWidth > 0; } catch (e) { pret = false; }
      window.addEventListener('resize', taille);
    }
    if (!pret){ // secours : on montre simplement le logo
      var fb = new Image(); fb.src = LOGO; fb.alt = ''; fb.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      elCam.insertBefore(fb, elCam.firstChild);
    }
    raf = requestAnimationFrame(boucle);
  }

  // on attend que l'image soit là (ou 900 ms), puis on joue
  img = new Image();
  var tGo = setTimeout(demarrer, 900);
  img.onload = img.onerror = function(){ clearTimeout(tGo); demarrer(); };
  img.src = LOGO;

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
