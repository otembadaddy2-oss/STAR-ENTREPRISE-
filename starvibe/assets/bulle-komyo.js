// KOMYO — bulle flottante de notifications, façon "bulles de discussion"
// de Messenger. Dès qu'un abonné reçoit un j'aime ou un commentaire sur
// ses vidéos, une bulle ronde (photo de la personne — ou ses initiales si
// elle n'en a pas mis — + pastille rouge
// avec le nombre de non lus) flotte doucement de haut en bas, comme le
// logo ALPHA. L'aperçu du message sort de la bulle puis y rentre.
//
// - Toucher la bulle : ouvre la liste des notifications (tout passe en lu).
// - Glisser la bulle sur le X en bas : la bulle disparaît ICI seulement.
//   Les notifications ne sont pas supprimées, elles restent dans la liste
//   et la bulle revient au prochain nouveau message.
//
// Inclus sur les pages KOMYO d'un abonné connecté (pas dans PIOUPIOU).
(function(){
  var API = '/api/starvibe-videos';
  var POLL_MS = 15000;
  var token = null;
  try { token = localStorage.getItem('starvibe_token'); } catch (e) {}
  if (!token) return;

  function store(key, value){
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function authFetch(url, opts){
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers, { 'Authorization': 'Bearer ' + token });
    return fetch(url, opts);
  }

  function phrase(ev, court){
    if (ev.type === 'like') return '<b>' + esc(ev.auteur) + '</b> a aimé ta vidéo ❤️';
    var t = ev.texte || '';
    var max = court ? 70 : 160;
    if (t.length > max) t = t.slice(0, max - 2) + '…';
    return '<b>' + esc(ev.auteur) + '</b> a commenté : « ' + esc(t) + ' »';
  }

  function quand(iso){
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'à l\'instant';
    if (s < 3600) return 'il y a ' + Math.floor(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.floor(s / 3600) + ' h';
    return 'il y a ' + Math.floor(s / 86400) + ' j';
  }

  // ---------- Styles (autonomes, valables sur les pages claires et sombres) ----------
  var css =
    '.kb-bubble{position:fixed;z-index:35;width:62px;height:62px;touch-action:none;user-select:none;-webkit-user-select:none;' +
      'transition:left .35s cubic-bezier(.2,.9,.3,1.2), top .35s ease, opacity .3s ease, transform .3s ease;}' +
    '.kb-bubble.dragging{transition:none;}' +
    '.kb-bubble.out{opacity:0;transform:scale(.3);pointer-events:none;}' +
    '.kb-float{width:100%;height:100%;animation:kbFloat 6s ease-in-out infinite;}' +
    '.kb-bubble.dragging .kb-float{animation-play-state:paused;}' +
    '@keyframes kbFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}' +
    '.kb-face{position:relative;overflow:hidden;width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;' +
      'background:linear-gradient(135deg,#FF6B4A,#E8A93D);border:3px solid #fff;color:#fff;' +
      'font:800 20px/1 Sora,Arial,sans-serif;box-shadow:0 10px 24px -6px rgba(36,21,54,.55);}' +
    '.kb-face img,.kb-item .av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;}' +
    '.kb-badge{position:absolute;top:-3px;right:-3px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#e5243b;' +
      'color:#fff;font:800 12px/22px Inter,Arial,sans-serif;text-align:center;border:2px solid #fff;}' +
    '.kb-mark{position:absolute;bottom:-2px;right:-2px;width:22px;height:22px;border-radius:7px;border:2px solid #fff;background:#241536;}' +
    '.kb-pop{position:fixed;z-index:35;max-width:min(270px,calc(100vw - 100px));background:#fff;color:#241536;border-radius:16px;' +
      'padding:9px 13px;font:500 12.5px/1.4 Inter,Arial,sans-serif;box-shadow:0 12px 28px -10px rgba(36,21,54,.45);' +
      'opacity:0;pointer-events:none;transition:opacity .35s ease, transform .35s ease;}' +
    '.kb-pop b{font-family:Sora,Arial,sans-serif;font-weight:800;}' +
    '.kb-pop.left{transform:translateX(-14px) scale(.9);transform-origin:left center;}' +
    '.kb-pop.right{transform:translateX(14px) scale(.9);transform-origin:right center;}' +
    '.kb-pop.show{opacity:1;transform:none;}' +
    '.kb-trash{position:fixed;z-index:34;left:50%;bottom:calc(28px + env(safe-area-inset-bottom,0px));width:58px;height:58px;margin-left:-29px;' +
      'border-radius:50%;background:rgba(20,12,30,.78);border:2px solid rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;' +
      'opacity:0;transform:translateY(20px);pointer-events:none;transition:opacity .2s ease, transform .2s ease, background .2s ease;}' +
    '.kb-trash.show{opacity:1;transform:none;}' +
    '.kb-trash.hot{background:#e5243b;transform:scale(1.15);}' +
    '.kb-trash svg{width:24px;height:24px;}' +
    '.kb-sheet{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;background:rgba(0,0,0,.5);}' +
    '.kb-panel{background:#17101f;color:#fff;width:100%;max-width:480px;margin:0 auto;border-radius:20px 20px 0 0;max-height:75vh;' +
      'display:flex;flex-direction:column;animation:kbUp .3s ease both;font-family:Inter,Arial,sans-serif;}' +
    '@keyframes kbUp{from{transform:translateY(30px);opacity:0;}to{transform:none;opacity:1;}}' +
    '.kb-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 10px;border-bottom:1px solid rgba(255,255,255,.1);}' +
    '.kb-head h2{margin:0;font:800 15px Sora,Arial,sans-serif;}' +
    '.kb-head button{background:rgba(255,255,255,.1);border:none;color:#fff;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:16px;}' +
    '.kb-list{overflow-y:auto;padding:8px 14px calc(14px + env(safe-area-inset-bottom,0px));}' +
    '.kb-item{display:flex;gap:11px;align-items:flex-start;padding:10px 6px;border-bottom:1px solid rgba(255,255,255,.07);}' +
    '.kb-item .av{position:relative;overflow:hidden;flex:none;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#FF6B4A,#E8A93D);display:flex;' +
      'align-items:center;justify-content:center;font:800 14px Sora,Arial,sans-serif;}' +
    '.kb-item .tx{font-size:13px;line-height:1.45;color:rgba(255,255,255,.9);}' +
    '.kb-item .tx b{font-family:Sora,Arial,sans-serif;color:#fff;}' +
    '.kb-item .meta{font-size:11px;color:rgba(255,255,255,.5);margin-top:2px;}' +
    '.kb-item.new{background:rgba(232,169,61,.1);border-radius:12px;}' +
    '.kb-item.new .meta::after{content:" · nouveau";color:#f0c47a;font-weight:700;}' +
    '.kb-empty{text-align:center;padding:30px 10px;font-size:13px;color:rgba(255,255,255,.55);line-height:1.6;}' +
    '.kb-bubble :focus-visible,.kb-head button:focus-visible{outline:3px solid #f0c47a;outline-offset:2px;}' +
    '@media (prefers-reduced-motion: reduce){.kb-float{animation:none;}.kb-bubble,.kb-pop{transition:opacity .2s ease;}}';
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- Éléments ----------
  var bubble = document.createElement('div');
  bubble.className = 'kb-bubble out';
  bubble.hidden = true;
  bubble.innerHTML =
    '<div class="kb-float">' +
      '<div class="kb-face" role="button" tabindex="0" aria-label="Notifications KOMYO"><span class="kb-ini"></span><img alt="" hidden></div>' +
      '<img class="kb-mark" src="assets/img/komyo-icon.png" alt="">' +
      '<span class="kb-badge"></span>' +
    '</div>';
  var face = bubble.querySelector('.kb-face');
  var iniEl = bubble.querySelector('.kb-ini');
  var photoEl = bubble.querySelector('.kb-face img');
  // Photo introuvable : on retombe sur les initiales.
  photoEl.addEventListener('error', function(){ photoEl.hidden = true; });
  var badgeEl = bubble.querySelector('.kb-badge');

  var pop = document.createElement('div');
  pop.className = 'kb-pop left';
  pop.setAttribute('aria-live', 'polite');

  var trash = document.createElement('div');
  trash.className = 'kb-trash';
  trash.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  var sheet = document.createElement('div');
  sheet.className = 'kb-sheet';
  sheet.hidden = true;
  sheet.innerHTML =
    '<div class="kb-panel" role="dialog" aria-label="Notifications">' +
      '<div class="kb-head"><h2>Notifications</h2><button type="button" aria-label="Fermer">✕</button></div>' +
      '<div class="kb-list"></div>' +
    '</div>';
  var list = sheet.querySelector('.kb-list');

  document.body.appendChild(trash);
  document.body.appendChild(pop);
  document.body.appendChild(bubble);
  document.body.appendChild(sheet);

  // ---------- Position (mémorisée : côté gauche/droit + hauteur) ----------
  var SIZE = 62, MARGIN = 10;
  var side = store('komyo_bulle_cote') === 'droite' ? 'droite' : 'gauche';
  var topPos = Number(store('komyo_bulle_haut')) || Math.round(window.innerHeight * 0.42);

  function clampTop(t){ return Math.min(Math.max(t, 70), window.innerHeight - SIZE - 120); }
  function placeAtSide(){
    topPos = clampTop(topPos);
    bubble.style.top = topPos + 'px';
    bubble.style.left = (side === 'gauche' ? MARGIN : window.innerWidth - SIZE - MARGIN) + 'px';
  }
  placeAtSide();
  window.addEventListener('resize', placeAtSide);

  // ---------- État ----------
  var evenements = [];
  var nonLues = 0;
  var connus = {};           // ids déjà vus pendant cette session
  var premierChargement = true;
  var popTimer = null;

  function plusRecentNonLu(){
    for (var i = 0; i < evenements.length; i++) if (evenements[i].nonLu) return evenements[i];
    return null;
  }

  function render(){
    var top = plusRecentNonLu();
    var masqueJusqua = store('komyo_bulle_masquee');
    var visible = nonLues > 0 && top && top.id !== masqueJusqua && sheet.hidden;
    if (!visible){
      bubble.classList.add('out');
      setTimeout(function(){ if (bubble.classList.contains('out')) bubble.hidden = true; }, 320);
      return;
    }
    iniEl.textContent = top.initiales || '?';
    if (top.photoUrl){
      if (photoEl.getAttribute('src') !== top.photoUrl){ photoEl.hidden = false; photoEl.src = top.photoUrl; }
    } else {
      photoEl.hidden = true;
      photoEl.removeAttribute('src');
    }
    badgeEl.textContent = nonLues > 99 ? '99+' : String(nonLues);
    face.setAttribute('aria-label', nonLues + ' notification' + (nonLues > 1 ? 's' : '') + ' non lue' + (nonLues > 1 ? 's' : '') + ' — ouvrir');
    if (bubble.hidden){
      bubble.hidden = false;
      placeAtSide();
      requestAnimationFrame(function(){ bubble.classList.remove('out'); });
    }
  }

  function montrerApercu(ev){
    if (!ev || bubble.hidden) return;
    pop.innerHTML = phrase(ev, true);
    var r = bubble.getBoundingClientRect();
    pop.style.top = (r.top + 8) + 'px';
    if (side === 'gauche'){
      pop.className = 'kb-pop left';
      pop.style.left = (r.right + 10) + 'px';
      pop.style.right = 'auto';
    } else {
      pop.className = 'kb-pop right';
      pop.style.right = (window.innerWidth - r.left + 10) + 'px';
      pop.style.left = 'auto';
    }
    requestAnimationFrame(function(){ pop.classList.add('show'); });
    clearTimeout(popTimer);
    popTimer = setTimeout(function(){ pop.classList.remove('show'); }, 4200);
  }

  // ---------- Interrogation du serveur ----------
  function poll(){
    if (document.visibilityState === 'hidden') return;
    authFetch(API + '?notifications=1')
      .then(function(res){
        if (res.status === 401){ token = null; return null; }
        return res.json();
      })
      .then(function(data){
        if (!data) return;
        evenements = data.evenements || [];
        nonLues = data.nonLues || 0;
        var nouveaux = evenements.filter(function(e){ return e.nonLu && !connus[e.id]; });
        evenements.forEach(function(e){ connus[e.id] = true; });
        if (nouveaux.length && !premierChargement){
          store('komyo_bulle_masquee', null); // un nouveau message fait revenir la bulle
          try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {}
        }
        render();
        if (nouveaux.length) setTimeout(function(){ montrerApercu(nouveaux[0]); }, premierChargement ? 900 : 350);
        premierChargement = false;
        if (!sheet.hidden) remplirListe();
      })
      .catch(function(){});
  }

  // ---------- Liste des notifications ----------
  function remplirListe(){
    if (!evenements.length){
      list.innerHTML = '<div class="kb-empty">Aucune notification pour l\'instant.<br>Quand quelqu\'un aime ou commente tes vidéos, ça arrive ici.</div>';
      return;
    }
    list.innerHTML = evenements.map(function(e){
      return '<div class="kb-item' + (e.nonLu ? ' new' : '') + '">' +
        '<span class="av">' + esc(e.initiales || '?') +
          (e.photoUrl ? '<img src="' + esc(e.photoUrl) + '" alt="" onerror="this.remove()">' : '') + '</span>' +
        '<div><div class="tx">' + phrase(e, false) + '</div>' +
        '<div class="meta">' + quand(e.createdAt) + (e.legende ? ' · « ' + esc(e.legende.slice(0, 40)) + ' »' : '') + '</div></div>' +
      '</div>';
    }).join('');
  }

  function ouvrirListe(){
    pop.classList.remove('show');
    remplirListe();
    sheet.hidden = false;
    render(); // la bulle s'efface pendant la lecture
    sheet.querySelector('.kb-head button').focus();
    if (nonLues > 0){
      authFetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notifs_vues' })
      }).catch(function(){});
    }
  }

  function fermerListe(){
    sheet.hidden = true;
    evenements.forEach(function(e){ e.nonLu = false; });
    nonLues = 0;
    render();
  }

  sheet.addEventListener('click', function(e){ if (e.target === sheet) fermerListe(); });
  sheet.querySelector('.kb-head button').addEventListener('click', fermerListe);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !sheet.hidden) fermerListe(); });
  face.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrirListe(); } });

  // ---------- Glisser la bulle (vers un bord, ou sur le X pour la masquer) ----------
  var drag = null;

  function surLaCroix(x, y){
    var r = trash.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return Math.hypot(x - cx, y - cy) < 70;
  }

  bubble.addEventListener('pointerdown', function(e){
    var r = bubble.getBoundingClientRect();
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
    bubble.setPointerCapture(e.pointerId);
  });

  bubble.addEventListener('pointermove', function(e){
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
    if (!drag.moved){
      drag.moved = true;
      bubble.classList.add('dragging');
      pop.classList.remove('show');
      trash.classList.add('show');
    }
    bubble.style.left = (e.clientX - drag.dx) + 'px';
    bubble.style.top = (e.clientY - drag.dy) + 'px';
    trash.classList.toggle('hot', surLaCroix(e.clientX, e.clientY));
  });

  function finDrag(e){
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    bubble.classList.remove('dragging');
    trash.classList.remove('show');
    if (!d.moved){ ouvrirListe(); return; }
    if (surLaCroix(e.clientX, e.clientY)){
      trash.classList.remove('hot');
      // Masquée ici seulement : les notifications restent non lues dans la liste.
      var top = plusRecentNonLu();
      store('komyo_bulle_masquee', top ? top.id : '');
      bubble.classList.add('out');
      setTimeout(function(){ bubble.hidden = true; }, 320);
      return;
    }
    side = e.clientX < window.innerWidth / 2 ? 'gauche' : 'droite';
    topPos = clampTop(e.clientY - d.dy);
    store('komyo_bulle_cote', side);
    store('komyo_bulle_haut', String(Math.round(topPos)));
    placeAtSide();
  }
  bubble.addEventListener('pointerup', finDrag);
  bubble.addEventListener('pointercancel', finDrag);

  // ---------- Démarrage ----------
  poll();
  setInterval(function(){ if (token) poll(); }, POLL_MS);
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible' && token) poll(); });
})();
