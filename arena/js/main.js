/* X SAPHIR — ARENA : le jeu (écrans, menus, boucle de combat, réglages).
   Univers X SAPHIR © Carry OTEMBA / STAR ENTREPRISE. */
(function () {
  'use strict';
  var XS = window.XS, Core = XS.Core, Data = XS.Data, Draw = XS.Draw, Stage = XS.Stage, BTN = Core.BTN;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- textes ----------
  var TX = {
    fr: {
      tagline: 'Le combat dessiné à l\'encre', sub: 'L\'univers X SAPHIR en jeu de combat 2D. Coups spéciaux, supers, 1 ou 2 joueurs. Sur téléphone, tablette et ordinateur.', press: 'TOUCHE POUR COMMENCER',
      arcade: 'ARCADE', arcadeS: 'Affronte tous les héros, jusqu\'au boss', versus: 'COMBAT', versusS: '1 joueur contre l\'ordinateur', vs2: '2 JOUEURS', vs2S: 'Sur le même clavier ou avec 2 manettes', training: 'ENTRAÎNEMENT', trainingS: 'Apprends les coups, sans pression', moves: 'COMMANDES & COUPS', movesS: 'Comment jouer, liste des coups', options: 'OPTIONS', optionsS: 'Langue, son, difficulté, effets', install: 'INSTALLER LE JEU', installS: 'Ajouter sur l\'écran d\'accueil',
      choose: 'CHOISIS TON COMBATTANT', chooseP1: 'JOUEUR 1 — CHOISIS', chooseP2: 'JOUEUR 2 — CHOISIS', stage: 'CHOISIS LE DÉCOR', back: 'RETOUR', go: 'COMBATTRE !', random: 'AU HASARD',
      power: 'Puissance', speed: 'Vitesse', reach: 'Portée', control: 'Contrôle',
      resume: 'REPRENDRE', restart: 'RECOMMENCER', quit: 'QUITTER LE COMBAT', pause: 'PAUSE', movelist: 'LISTE DES COUPS',
      win: 'VICTOIRE !', lose: 'DÉFAITE', draw: 'ÉGALITÉ', next: 'COMBAT SUIVANT', rematch: 'REVANCHE', menu: 'MENU', retry: 'RÉESSAYER', nextOpp: 'Prochain adversaire', champion: 'TU ES LE CHAMPION !', champS: 'Tous les héros sont tombés. L\'Arène X SAPHIR est à toi.', fightN: 'COMBAT',
      dummy: 'Adversaire', stand: 'Debout', crouch: 'Accroupi', jump: 'Saute', cpu: 'Ordinateur', guard: 'Garde', gNone: 'Aucune', gAll: 'Toujours', superBar: 'Jauge de super', sNormal: 'Normale', sInf: 'Infinie', showIn: 'Afficher mes commandes', yes: 'Oui', no: 'Non', reset: 'REMETTRE EN PLACE',
      language: 'Langue', music: 'Musique', sfx: 'Bruitages', voice: 'Voix de l\'annonceur', volume: 'Volume', difficulty: 'Difficulté (contre l\'ordinateur)', rounds: 'Manches pour gagner', fx: 'Effets visuels', fxFull: 'Complets', fxLow: 'Réduits', flash: 'Flashs lumineux', touch: 'Commandes tactiles', tAuto: 'Auto', tOn: 'Oui', tOff: 'Non', on: 'Oui', off: 'Non',
      lv1: 'Facile', lv2: 'Normal', lv3: 'Difficile', lv4: 'Féroce',
      rotate: 'Tourne ton téléphone en mode paysage', hint: 'Joystick à gauche pour bouger · Boutons P / PP / K / KK pour frapper · Maintiens SPÉCIAL + un bouton pour lancer un coup spécial · SUPER quand la jauge est pleine',
      credit: 'X SAPHIR © Carry OTEMBA · STAR ENTREPRISE · Les noms des techniques sont des désignations de travail', installHelp: 'Sur iPhone : Partager → « Sur l\'écran d\'accueil ». Sur Android/ordinateur : bouton Installer.',
      howTitle: 'COMMENT JOUER', c_keys: 'Clavier', c_pad: 'Manette', c_touch: 'Écran tactile', c_goal: 'But', goalTxt: 'Vide la barre de vie de l\'adversaire avant la fin du temps. Chaque coup donné ou reçu remplit ta jauge de SUPER. Gagne le nombre de manches choisi.',
      easy: 'Mode facile (tactile, clavier, manette)', easyTxt: 'Maintiens SPÉCIAL puis appuie sur un coup : boule d\'énergie (P/K) · avec ↑ : coup montant invincible · avec ← : charge. Poing/Pied léger = version rapide, fort = version puissante.',
      normals: 'Coups normaux', specials: 'Coups spéciaux', superT: 'Super', throwT: 'Projection', standing: 'Debout', crouching: 'Accroupi', air: 'En l\'air', light: 'léger', heavy: 'fort', gauge: 'jauge pleine', or: 'ou', button: 'bouton',
      keysP1: 'Joueur 1 : déplacements <kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> (ou flèches en solo) · <kbd>U</kbd> poing léger <kbd>I</kbd> poing fort <kbd>J</kbd> pied léger <kbd>K</kbd> pied fort · <kbd>L</kbd> projection · <kbd>O</kbd> super · <kbd>Espace</kbd> spécial',
      keysP2: 'Joueur 2 : flèches · <kbd>,</kbd> <kbd>.</kbd> <kbd>;</kbd> <kbd>/</kbd> = P PP K KK · <kbd>\'</kbd> super · <kbd>Maj droite</kbd> projection · <kbd>Entrée</kbd> spécial',
      padTxt: 'Croix ou stick = déplacements · X = poing léger · Y = poing fort · A = pied léger · B = pied fort · LB = projection · RB = spécial · RT/LT = super · Start = pause',
      touchTxt: 'Joystick à gauche (glisse le doigt). Boutons à droite : P, PP, K, KK, SPÉCIAL (maintenir), SUPER, PROJ.',
      motionHelp: '↓↘→ = quart de cercle avant · →↓↘ = coup montant · ↓↙← = quart de cercle arrière. Le sens suit celui de ton combattant.'
    },
    en: {
      tagline: 'The ink-drawn fighting game', sub: 'The X SAPHIR universe as a 2D fighting game. Special moves, supers, 1 or 2 players. On phone, tablet and computer.', press: 'TAP TO START',
      arcade: 'ARCADE', arcadeS: 'Beat every hero, up to the boss', versus: 'FIGHT', versusS: '1 player vs the computer', vs2: '2 PLAYERS', vs2S: 'Same keyboard or 2 gamepads', training: 'TRAINING', trainingS: 'Learn the moves, no pressure', moves: 'CONTROLS & MOVES', movesS: 'How to play, move list', options: 'OPTIONS', optionsS: 'Language, sound, difficulty, effects', install: 'INSTALL THE GAME', installS: 'Add to your home screen',
      choose: 'CHOOSE YOUR FIGHTER', chooseP1: 'PLAYER 1 — CHOOSE', chooseP2: 'PLAYER 2 — CHOOSE', stage: 'CHOOSE THE STAGE', back: 'BACK', go: 'FIGHT!', random: 'RANDOM',
      power: 'Power', speed: 'Speed', reach: 'Reach', control: 'Control',
      resume: 'RESUME', restart: 'RESTART', quit: 'QUIT FIGHT', pause: 'PAUSED', movelist: 'MOVE LIST',
      win: 'VICTORY!', lose: 'DEFEAT', draw: 'DRAW', next: 'NEXT FIGHT', rematch: 'REMATCH', menu: 'MENU', retry: 'TRY AGAIN', nextOpp: 'Next opponent', champion: 'YOU ARE THE CHAMPION!', champS: 'Every hero has fallen. The X SAPHIR Arena is yours.', fightN: 'FIGHT',
      dummy: 'Opponent', stand: 'Standing', crouch: 'Crouching', jump: 'Jumping', cpu: 'Computer', guard: 'Guard', gNone: 'None', gAll: 'Always', superBar: 'Super gauge', sNormal: 'Normal', sInf: 'Infinite', showIn: 'Show my inputs', yes: 'Yes', no: 'No', reset: 'RESET POSITIONS',
      language: 'Language', music: 'Music', sfx: 'Sound effects', voice: 'Announcer voice', volume: 'Volume', difficulty: 'Difficulty (vs computer)', rounds: 'Rounds to win', fx: 'Visual effects', fxFull: 'Full', fxLow: 'Reduced', flash: 'Light flashes', touch: 'Touch controls', tAuto: 'Auto', tOn: 'On', tOff: 'Off', on: 'On', off: 'Off',
      lv1: 'Easy', lv2: 'Normal', lv3: 'Hard', lv4: 'Fierce',
      rotate: 'Rotate your phone to landscape', hint: 'Left joystick to move · P / PP / K / KK buttons to strike · Hold SPECIAL + a button for a special move · SUPER when the gauge is full',
      credit: 'X SAPHIR © Carry OTEMBA · STAR ENTREPRISE · Technique names are working designations', installHelp: 'On iPhone: Share → "Add to Home Screen". On Android/desktop: Install button.',
      howTitle: 'HOW TO PLAY', c_keys: 'Keyboard', c_pad: 'Gamepad', c_touch: 'Touch screen', c_goal: 'Goal', goalTxt: 'Empty your opponent\'s health bar before time runs out. Every hit you give or take fills your SUPER gauge. Win the chosen number of rounds.',
      easy: 'Easy mode (touch, keyboard, gamepad)', easyTxt: 'Hold SPECIAL then press a strike: energy ball (P/K) · with ↑: invincible rising strike · with ←: charge. Light punch/kick = fast version, heavy = strong version.',
      normals: 'Normal moves', specials: 'Special moves', superT: 'Super', throwT: 'Throw', standing: 'Standing', crouching: 'Crouching', air: 'In the air', light: 'light', heavy: 'heavy', gauge: 'full gauge', or: 'or', button: 'button',
      keysP1: 'Player 1: move <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> (or arrows in solo) · <kbd>U</kbd> light punch <kbd>I</kbd> heavy punch <kbd>J</kbd> light kick <kbd>K</kbd> heavy kick · <kbd>L</kbd> throw · <kbd>O</kbd> super · <kbd>Space</kbd> special',
      keysP2: 'Player 2: arrows · <kbd>,</kbd> <kbd>.</kbd> <kbd>;</kbd> <kbd>/</kbd> = P PP K KK · <kbd>\'</kbd> super · <kbd>Right Shift</kbd> throw · <kbd>Enter</kbd> special',
      padTxt: 'D-pad or stick = move · X = light punch · Y = heavy punch · A = light kick · B = heavy kick · LB = throw · RB = special · RT/LT = super · Start = pause',
      touchTxt: 'Joystick on the left (slide your thumb). Buttons on the right: P, PP, K, KK, SPECIAL (hold), SUPER, THROW.',
      motionHelp: '↓↘→ = quarter circle forward · →↓↘ = rising strike · ↓↙← = quarter circle back. Directions follow your fighter\'s facing.'
    }
  };
  var CHARTXT = {
    calpros: { en: { titre: 'Bearer of the Three Forces', style: 'Balanced · Sapphire · Ascension' } }, nia: { en: { titre: 'The magnetic architect', style: 'Control · Polarity · Rampart' } },
    ayanda: { en: { titre: 'The Phoenix', style: 'Fast · Fire · VUKA!' } }, kormal: { en: { titre: 'The red menace', style: 'Brute · Dark energy · Spikes' } }
  };

  // ---------- réglages ----------
  var S = { lang: 'fr', music: true, sfx: true, voice: true, vol: 0.9, fx: 'full', flash: true, touch: 'auto', level: 2, rounds: 2 };
  try { var sv = JSON.parse(localStorage.getItem('xs_arena_v1') || '{}'); for (var k in sv) if (k in S) S[k] = sv[k]; } catch (e) { /* stockage indisponible */ }
  function save() { try { localStorage.setItem('xs_arena_v1', JSON.stringify(S)); } catch (e) { /* rien */ } }
  function t(k) { return (TX[S.lang] || TX.fr)[k] || TX.fr[k] || k; }

  // ---------- état ----------
  var cv = $('cv'), audio = new XS.Audio(), input = new XS.Input(), touch = new XS.Touch($('touch'));
  input.touch = touch; input.active = true;
  var art = {}, por = {};
  Data.order.forEach(function (id) { var a = new Image(); a.src = 'img/' + id + '-portrait.jpg'; art[id] = a; por[id] = a; });
  var R = new XS.Render(cv, { art: art, portraits: por, lang: S.lang });
  var G = { screen: 'title', mode: 'arcade', p1: 'calpros', p2: 'kormal', stage: 'pointe-noire', match: null, demo: null, ai: [null, null], paused: false, arcade: null, over: 0, sel: 0, selSide: 0, training: { dummy: 'stand', block: 'none', rage: false, infinite: true }, acc: 0, vacc: 0, last: 0, t: 0 };
  var touchMode = false;

  function applySettings() {
    audio.sfxOn = S.sfx; audio.voiceOn = S.voice; audio.lang = S.lang; audio.setVolume(S.vol); audio.setMusic(S.music); R.lang = S.lang; R.fxOn = S.fx === 'full'; R.flashOn = S.flash; R.lowFx = S.fx !== 'full';
    document.documentElement.lang = S.lang; $('rotate-t').textContent = t('rotate'); $('hud-btn').setAttribute('aria-label', t('pause'));
    updateTouchVisible();
  }
  function updateTouchVisible() {
    var on = (S.touch === 'on' || (S.touch === 'auto' && touchMode)) && G.screen === 'fight' && !G.paused; $('touch').classList.toggle('on', on);
    $('hud-btn').classList.toggle('on', G.screen === 'fight' && !G.paused);
    document.getElementById('touch').style.pointerEvents = on ? 'auto' : 'none';
  }
  if (('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer:coarse)').matches)) touchMode = true;
  window.addEventListener('touchstart', function () { touchMode = true; updateTouchVisible(); }, { passive: true });

  // ---------- mise en page ----------
  function fit() {
    var vw = window.innerWidth, vh = window.innerHeight, w = Math.min(vw, vh * 16 / 9), h = w * 9 / 16;
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; R.resize();
    var portrait = vh > vw && touchMode; $('rotate').style.display = portrait ? 'flex' : 'none'; touch.placeDefault();
  }
  window.addEventListener('resize', fit); window.addEventListener('orientationchange', function () { setTimeout(fit, 200); });

  // ---------- écrans ----------
  var SCREENS = ['title', 'menu', 'select', 'stage', 'moves', 'options', 'pause', 'result'];
  function show(name) {
    SCREENS.forEach(function (s) { $('scr-' + s).classList.toggle('on', s === name); });
    if (G.screen !== 'fight') G.screen = name; G.shown = name; updateTouchVisible();
  }
  function hideAll() { SCREENS.forEach(function (s) { $('scr-' + s).classList.remove('on'); }); }

  function btn(label, sub, cls) { return '<button type="button" class="mbtn ' + (cls || '') + '"><span>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</span></button>'; }
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; if (G.shown === 'menu') renderMenu(); });

  function renderTitle() {
    var el = $('scr-title'); el.innerHTML = '<div class="logo">X SAPHIR<small>ARENA</small></div><p class="sub">' + t('sub') + '</p><div class="press">' + t('press') + '</div><div class="credit">' + t('credit') + '</div>';
    show('title'); setMode('demo');
  }
  function go(name) { audio.play('ui'); name(); }
  function renderMenu() {
    var el = $('scr-menu'), h = '<div class="logo" style="font-size:clamp(34px,9vh,72px)">X SAPHIR<small>ARENA</small></div><div class="menu" id="mainmenu">' +
      btn(t('arcade'), t('arcadeS')) + btn(t('versus'), t('versusS')) + btn(t('vs2'), t('vs2S')) + btn(t('training'), t('trainingS')) + btn(t('moves'), t('movesS')) + btn(t('options'), t('optionsS')) +
      (deferredInstall ? btn(t('install'), t('installS'), 'alt') : '') + '</div>';
    el.innerHTML = h + '<div class="credit">' + t('credit') + '</div>'; show('menu'); setMode('demo'); audio.playMusic('menu');
    var b = el.querySelectorAll('.mbtn'), acts = [function () { G.mode = 'arcade'; renderSelect(0); }, function () { G.mode = 'versus'; renderSelect(0); }, function () { G.mode = 'vs2'; renderSelect(0); }, function () { G.mode = 'training'; renderSelect(0); }, renderMoves, renderOptions];
    if (deferredInstall) acts.push(function () { deferredInstall.prompt(); deferredInstall = null; renderMenu(); });
    b.forEach(function (x, i) { x.onclick = function () { audio.unlock(); audio.play('ok'); acts[i](); }; });
    G.sel = 0; markSel(b);
  }
  function markSel(list) { for (var i = 0; i < list.length; i++) list[i].classList.toggle('sel', i === G.sel); }

  // --- choix du combattant ---
  var cardLoop = null;
  function renderSelect(side) {
    G.selSide = side; var el = $('scr-select');
    var title = G.mode === 'vs2' ? (side === 0 ? t('chooseP1') : t('chooseP2')) : t('choose');
    var cards = Data.order.map(function (id, i) { var C = Data.chars[id]; return '<div class="card" data-i="' + i + '" style="--glow:' + C.palette.glow + '"><span class="tag p1">P1</span><span class="tag p2">' + (G.mode === 'vs2' ? 'P2' : 'CPU') + '</span><canvas width="240" height="320"></canvas><div class="nm">' + C.nom + '<small>' + esc(chTxt(C, 'titre')) + '</small></div></div>'; }).join('');
    el.innerHTML = '<h2 class="t">' + title + '</h2><div class="cards">' + cards + '</div><div class="info" id="chinfo"></div><div class="row"><button class="btn alt" id="sb-back" type="button"><span>' + t('back') + '</span></button><button class="btn" id="sb-go" type="button"><span>OK</span></button></div>';
    show('select'); G.sel = Math.max(0, Data.order.indexOf(side === 0 ? G.p1 : G.p2));
    var cs = el.querySelectorAll('.card');
    cs.forEach(function (c, i) {
      c.onclick = function () { audio.unlock(); if (G.sel === i) { confirmChar(); } else { G.sel = i; audio.play('ui'); updateCards(); } };
    });
    $('sb-back').onclick = function () { audio.play('back'); if (side === 1) renderSelect(0); else renderMenu(); };
    $('sb-go').onclick = function () { audio.unlock(); confirmChar(); };
    updateCards(); if (cardLoop) cancelAnimationFrame(cardLoop); drawCards();
  }
  function chTxt(C, k) { var o = CHARTXT[C.id]; return S.lang === 'en' && o && o.en ? o.en[k] : C[k]; }
  function updateCards() {
    var cs = $('scr-select').querySelectorAll('.card'); cs.forEach(function (c, i) { c.classList.toggle('sel', i === G.sel); var s1 = G.selSide === 0 ? i === G.sel : Data.order.indexOf(G.p1) === i, s2 = G.selSide === 1 && i === G.sel; c.classList.toggle('sel1', s1); c.classList.toggle('sel2', s2); });
    var C = Data.chars[Data.order[G.sel]], st = C.stats;
    function bar(l, v) { return '<span>' + l + '</span><i><s style="width:' + (v * 20) + '%"></s></i>'; }
    $('chinfo').innerHTML = '<div><b>' + C.nom + '</b><br>' + esc(chTxt(C, 'style')) + '</div><div class="stat">' + bar(t('power'), st.puissance) + bar(t('speed'), st.vitesse) + bar(t('reach'), st.portee) + bar(t('control'), st.controle) + '</div>';
  }
  function drawCards() {
    var cs = $('scr-select').querySelectorAll('.card'); if (!cs.length || G.shown !== 'select') return;
    var tt = performance.now() / 16.7;
    cs.forEach(function (c, i) {
      var cx = c.querySelector('canvas'), x = cx.getContext('2d'), id = Data.order[i], C = Data.chars[id], pal = C.palette, sel = i === G.sel;
      var g = x.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, pal.suit); g.addColorStop(1, '#05030a'); x.fillStyle = g; x.fillRect(0, 0, 240, 320);
      var rg = x.createRadialGradient(120, 190, 10, 120, 190, 150); rg.addColorStop(0, Draw.hexA(pal.glow, sel ? 0.55 : 0.28)); rg.addColorStop(1, Draw.hexA(pal.glow, 0)); x.fillStyle = rg; x.fillRect(0, 0, 240, 320);
      var f = { C: C, cid: id, face: 1, x: 0, y: 0, vy: 0, state: sel ? 'win' : 'idle', sf: 0, animT: Math.floor(tt) + i * 17, rage: sel ? 100 : 0, flash: 0, mf: 0, move: null, kdT: 0 };
      if (sel) { f.state = 'idle'; f.rage = 100; }
      Draw.drawFighter(x, f, 120, 296, 1.5 / Math.max(0.9, C.scale), { noShadow: false });
    });
    cardLoop = requestAnimationFrame(drawCards);
  }
  function confirmChar() {
    var id = Data.order[G.sel]; audio.play('ok');
    if (G.mode === 'vs2' && G.selSide === 0) { G.p1 = id; G.sel = Data.order.indexOf(G.p2); renderSelect(1); return; }
    if (G.mode === 'vs2') G.p2 = id; else G.p1 = id;
    if (G.mode === 'arcade') { startArcade(); return; }
    renderStage();
  }

  // --- choix du décor ---
  function renderStage() {
    var el = $('scr-stage'); el.innerHTML = '<h2 class="t">' + t('stage') + '</h2><div class="stages">' + Data.stages.map(function (s, i) { return '<div class="stg" data-i="' + i + '"><canvas width="320" height="180"></canvas><div>' + s.nom + '<small>' + s.sous + '</small></div></div>'; }).join('') + '</div><div class="row"><button class="btn alt" id="st-back" type="button"><span>' + t('back') + '</span></button><button class="btn" id="st-rnd" type="button"><span>' + t('random') + '</span></button></div>';
    show('stage'); G.sel = Math.max(0, Data.stages.map(function (s) { return s.id; }).indexOf(G.stage));
    var cs = el.querySelectorAll('.stg');
    cs.forEach(function (c, i) {
      var x = c.querySelector('canvas').getContext('2d'); x.save(); x.scale(1 / 3, 1 / 3); Stage.draw(x, Data.stages[i], 800, 1.1, 20); x.restore();
      c.onclick = function () { audio.unlock(); G.sel = i; G.stage = Data.stages[i].id; audio.play('ok'); startFight(); };
    });
    $('st-back').onclick = function () { audio.play('back'); renderSelect(G.mode === 'vs2' ? 1 : 0); };
    $('st-rnd').onclick = function () { audio.play('ok'); G.stage = Data.stages[Math.floor(Math.random() * Data.stages.length)].id; startFight(); };
    markStage();
  }
  function markStage() { $('scr-stage').querySelectorAll('.stg').forEach(function (c, i) { c.classList.toggle('sel', i === G.sel); }); }

  // --- commandes et liste des coups ---
  var MV = { '236': '↓↘→', '623': '→↓↘', '214': '↓↙←' };
  function renderMoves(tab) {
    tab = tab === undefined ? 0 : tab; var el = $('scr-moves');
    var tabs = '<div class="tabs"><button class="' + (tab === 0 ? 'on' : '') + '" data-t="0">' + t('howTitle') + '</button>' + Data.order.map(function (id, i) { return '<button class="' + (tab === i + 1 ? 'on' : '') + '" data-t="' + (i + 1) + '">' + Data.chars[id].nom + '</button>'; }).join('') + '</div>';
    var body = '';
    if (tab === 0) {
      body = '<h3>' + t('c_goal') + '</h3><p>' + t('goalTxt') + '</p><h3>' + t('easy') + '</h3><p>' + t('easyTxt') + '</p><p>' + t('motionHelp') + '</p><h3>' + t('c_keys') + '</h3><p>' + t('keysP1') + '</p><p>' + t('keysP2') + '</p><h3>' + t('c_pad') + '</h3><p>' + t('padTxt') + '</p><h3>' + t('c_touch') + '</h3><p>' + t('touchTxt') + '</p>';
    } else {
      var C = Data.chars[Data.order[tab - 1]], N = C.normals, sp = C.specials;
      function row(a, b, c) { return '<tr><td>' + a + '</td><td>' + b + '</td><td>' + (c || '') + '</td></tr>'; }
      body = '<h3>' + C.nom + ' — ' + esc(chTxt(C, 'titre')) + '</h3><h3>' + t('specials') + '</h3><table><tr><th></th><th>' + (S.lang === 'en' ? 'Input' : 'Commande') + '</th><th></th></tr>' +
        ['236', '623', '214'].map(function (k) { return row('<b>' + sp[k].L.name + '</b>', MV[k] + ' + <kbd>P</kbd>/<kbd>K</kbd> (' + t('light') + ') · <kbd>PP</kbd>/<kbd>KK</kbd> (' + t('heavy') + ')', ''); }).join('') +
        row('<b>' + C.sup.name + '</b> (' + t('superT') + ')', '↓↘→↓↘→ + <kbd>P</kbd> (' + t('gauge') + ') ' + t('or') + ' ' + t('button') + ' <kbd>SUPER</kbd>', '') + '</table>' +
        '<h3>' + t('normals') + '</h3><table>' + row(t('standing'), '<kbd>P</kbd> ' + N.lp.name + ' · <kbd>PP</kbd> ' + N.hp.name + ' · <kbd>K</kbd> ' + N.lk.name + ' · <kbd>KK</kbd> ' + N.hk.name) + row(t('crouching'), '↓ + <kbd>P</kbd> ' + N.clp.name + ' · <kbd>PP</kbd> ' + N.chp.name + ' · <kbd>K</kbd> ' + N.clk.name + ' · <kbd>KK</kbd> ' + N.chk.name) + row(t('air'), '<kbd>P</kbd> ' + N.jlp.name + ' · <kbd>PP</kbd> ' + N.jhp.name + ' · <kbd>K</kbd> ' + N.jlk.name + ' · <kbd>KK</kbd> ' + N.jhk.name) + row(t('throwT'), '<kbd>P</kbd>+<kbd>K</kbd> ' + t('or') + ' ' + t('button') + ' <kbd>PROJ.</kbd>') + '</table><p>' + t('motionHelp') + '</p>';
    }
    el.innerHTML = '<h2 class="t">' + t('moves') + '</h2>' + tabs + '<div class="panel">' + body + '</div><div class="row"><button class="btn alt" id="mv-back" type="button"><span>' + t('back') + '</span></button></div>';
    show('moves'); el.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { audio.play('ui'); renderMoves(+b.getAttribute('data-t')); }; });
    $('mv-back').onclick = function () { audio.play('back'); if (G.screen === 'fight') showPause(); else renderMenu(); };
  }

  // --- options ---
  function seg(id, opts, cur) { return '<div class="seg" data-id="' + id + '">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (String(o[0]) === String(cur) ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function renderOptions() {
    var el = $('scr-options');
    var rows = [
      ['language', seg('lang', [['fr', 'FRANÇAIS'], ['en', 'ENGLISH']], S.lang)],
      ['difficulty', seg('level', [[1, t('lv1')], [2, t('lv2')], [3, t('lv3')], [4, t('lv4')]], S.level)],
      ['rounds', seg('rounds', [[1, '1'], [2, '2'], [3, '3']], S.rounds)],
      ['music', seg('music', [[1, t('on')], [0, t('off')]], S.music ? 1 : 0)],
      ['sfx', seg('sfx', [[1, t('on')], [0, t('off')]], S.sfx ? 1 : 0)],
      ['voice', seg('voice', [[1, t('on')], [0, t('off')]], S.voice ? 1 : 0)],
      ['volume', '<input type="range" id="op-vol" min="0" max="100" value="' + Math.round(S.vol * 100) + '" aria-label="' + t('volume') + '">'],
      ['fx', seg('fx', [['full', t('fxFull')], ['low', t('fxLow')]], S.fx)],
      ['flash', seg('flash', [[1, t('on')], [0, t('off')]], S.flash ? 1 : 0)],
      ['touch', seg('touch', [['auto', t('tAuto')], ['on', t('tOn')], ['off', t('tOff')]], S.touch)]
    ];
    el.innerHTML = '<h2 class="t">' + t('options') + '</h2><div class="panel">' + rows.map(function (r) { return '<div class="opt"><label>' + t(r[0]) + '</label>' + r[1] + '</div>'; }).join('') + '<p class="install">' + t('installHelp') + '</p></div><div class="row"><button class="btn alt" id="op-back" type="button"><span>' + t('back') + '</span></button></div>';
    show('options');
    el.querySelectorAll('.seg').forEach(function (sg) {
      var id = sg.getAttribute('data-id');
      sg.querySelectorAll('button').forEach(function (b) {
        b.onclick = function () {
          audio.unlock(); var v = b.getAttribute('data-v'); audio.play('ui');
          if (id === 'lang') S.lang = v; else if (id === 'level') S.level = +v; else if (id === 'rounds') S.rounds = +v; else if (id === 'music' || id === 'sfx' || id === 'voice' || id === 'flash') S[id] = v === '1'; else S[id] = v;
          save(); applySettings(); renderOptions(); if (id === 'music' && S.music) audio.playMusic('menu');
        };
      });
    });
    $('op-vol').oninput = function () { S.vol = this.value / 100; audio.setVolume(S.vol); save(); };
    $('op-back').onclick = function () { audio.play('back'); if (G.screen === 'fight') showPause(); else renderMenu(); };
  }

  // ---------- combat ----------
  var LEVELS = [1, 2, 3, 4, 5];
  function startArcade() {
    var others = Data.order.filter(function (i) { return i !== G.p1; });
    for (var i = others.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = others[i]; others[i] = others[j]; others[j] = tmp; }
    var kIdx = others.indexOf('kormal'); if (kIdx >= 0) { others.splice(kIdx, 1); others.push('kormal'); }
    G.arcade = { order: others, idx: 0 }; G.p2 = others[0]; G.stage = Data.stages[0].id; startFight();
  }
  function stageForArcade() { return Data.stages[(G.arcade ? G.arcade.idx : 0) % Data.stages.length].id; }

  function startFight() {
    if (G.mode === 'arcade' && G.arcade) { G.p2 = G.arcade.order[G.arcade.idx]; G.stage = stageForArcade(); }
    audio.unlock(); if (cardLoop) { cancelAnimationFrame(cardLoop); cardLoop = null; }
    var lvl = Math.min(5, [1, 1, 3, 4, 5][S.level] + (G.mode === 'arcade' && G.arcade ? G.arcade.idx : 0));
    var cfg = { p1: G.p1, p2: G.p2, winsNeeded: S.rounds, seed: (Math.random() * 1e6) | 0, mode: G.mode === 'training' ? 'training' : 'versus' };
    if (G.mode === 'vs2' || G.mode === 'training') { cfg.cpu1 = null; cfg.cpu2 = { cpu: false }; } else { cfg.cpu1 = null; cfg.cpu2 = { cpu: true, level: lvl }; }
    if (G.mode === 'training') cfg.training = G.training;
    G.match = new Core.Match(cfg); G.match.f[1].cpuDummy = G.mode === 'training';
    G.ai = [null, (G.mode === 'versus' || G.mode === 'arcade') ? XS.AI.create(lvl, cfg.seed) : (G.mode === 'training' && G.training.dummy === 'cpu' ? XS.AI.create(2, cfg.seed) : null)];
    input.solo = G.mode !== 'vs2';
    R.setStage(G.stage); R.reset(G.match); R.hudOn = true; R.showInputs = G.mode === 'training' && !!G.training.showIn; R.lang = S.lang;
    G.screen = 'fight'; G.paused = false; G.over = 0; G.acc = 0; G.vacc = 0; touch.reset(); hideAll(); updateTouchVisible(); fit();
    audio.playMusic(G.stage); G.demoOn = false;
    G.resultShown = false;
    if (touchMode && !G.hinted) { G.hinted = true; var h = $('hint'); h.textContent = t('hint'); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on'); }
  }

  function setMode(m) { // 'demo' : combat automatique en fond des menus
    if (m === 'demo') {
      if (!G.demo || G.demo.phase === 'over') newDemo(); G.demoOn = true; R.hudOn = false; touch.reset(); updateTouchVisible();
    }
  }
  function newDemo() {
    var ids = Data.order.slice(), a = ids.splice(Math.floor(Math.random() * 4), 1)[0], b = ids[Math.floor(Math.random() * 3)];
    G.demo = new Core.Match({ p1: a, p2: b, cpu1: { cpu: true, level: 3 }, cpu2: { cpu: true, level: 3 }, seed: (Math.random() * 1e6) | 0 }); G.demoAI = [XS.AI.create(3, 11), XS.AI.create(3, 23)];
    R.setStage(Data.stages[Math.floor(Math.random() * 2)].id); R.reset(G.demo); G.demoSkip = 0;
  }

  function dummyInput(m) {
    var d = G.training.dummy, i = { x: 0, y: 0, btn: 0 };
    if (d === 'crouch') i.y = -1; else if (d === 'jump') { if (m.frame % 100 === 0) i.y = 1; }
    return i;
  }
  function getInput(m, side) {
    if (side === 1 && G.mode === 'training') { if (G.ai[1]) return G.ai[1].think(m, 1); return dummyInput(m); }
    if (G.ai[side]) return G.ai[side].think(m, side);
    return input.read(side);
  }
  function simStep() {
    var m = G.match, inp = [getInput(m, 0), getInput(m, 1)];
    if (G.mode === 'training') { m.f[1].cpuDummy = true; if (G.training.rage) { m.f[0].rage = 100; m.f[1].rage = 100; } }
    m.step(inp); R.onEvents(m); audio.onEvents(m);
    if (m.phase === 'over') G.over++;
  }
  function demoStep() {
    var m = G.demo; m.step([G.demoAI[0].think(m, 0), G.demoAI[1].think(m, 1)]); R.onEvents(m);
    if (m.phase === 'over' || (m.phase === 'result' && m.pt > 150)) { newDemo(); }
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = Math.min(50, ts - (G.last || ts)); G.last = ts; G.t++;
    pollPad();
    if (G.screen === 'fight' && G.match) {
      var m = G.match;
      if (!G.paused) {
        G.acc += dt / 16.667 * (m.phase === 'ko' ? m.slow : 1); var n = 0;
        while (G.acc >= 1 && n < 4) { simStep(); G.acc -= 1; n++; }
        if (G.acc > 4) G.acc = 0;
        G.vacc += dt / 16.667; while (G.vacc >= 1) { R.tick(m); G.vacc -= 1; }
        touch.superReady(m.f[0].rage >= 100);
        if (G.over > 110 && !G.resultShown) { G.resultShown = true; showResult(); }
      }
      R.draw(m);
    } else if (G.demoOn && G.demo) {
      G.vacc += dt / 16.667; while (G.vacc >= 1) { demoStep(); R.tick(G.demo); G.vacc -= 1; }
      R.draw(G.demo);
    }
  }

  // ---------- pause / résultats ----------
  function showPause() {
    G.paused = true; updateTouchVisible(); var el = $('scr-pause'), tr = G.mode === 'training';
    var h = '<h2 class="t">' + t('pause') + '</h2><div class="menu">' + btn(t('resume')) + btn(t('movelist')) + btn(t('options')) + (tr ? '' : btn(t('restart'))) + btn(t('quit')) + '</div>';
    if (tr) {
      var T = G.training;
      h += '<div class="panel" style="margin-top:10px;max-width:640px">' +
        '<div class="opt"><label>' + t('dummy') + '</label>' + seg('dummy', [['stand', t('stand')], ['crouch', t('crouch')], ['jump', t('jump')], ['cpu', t('cpu')]], T.dummy) + '</div>' +
        '<div class="opt"><label>' + t('guard') + '</label>' + seg('block', [['none', t('gNone')], ['all', t('gAll')]], T.block) + '</div>' +
        '<div class="opt"><label>' + t('superBar') + '</label>' + seg('rage', [[0, t('sNormal')], [1, t('sInf')]], T.rage ? 1 : 0) + '</div>' +
        '<div class="opt"><label>' + t('showIn') + '</label>' + seg('showIn', [[1, t('yes')], [0, t('no')]], T.showIn ? 1 : 0) + '</div>' +
        '<div class="row"><button class="btn" id="tr-reset" type="button"><span>' + t('reset') + '</span></button></div></div>';
    }
    el.innerHTML = h; show('pause'); G.sel = 0;
    var b = el.querySelectorAll('.mbtn'), acts = [resumeFight, function () { renderMoves(); }, function () { renderOptions(); }];
    if (!tr) acts.push(function () { startFight(); G.resultShown = false; }); acts.push(quitFight);
    b.forEach(function (x, i) { x.onclick = function () { audio.play('ok'); acts[i](); }; }); markSel(b);
    el.querySelectorAll('.seg').forEach(function (sg) { var id = sg.getAttribute('data-id'); sg.querySelectorAll('button').forEach(function (bb) { bb.onclick = function () { audio.play('ui'); var v = bb.getAttribute('data-v'); if (id === 'rage') G.training.rage = v === '1'; else if (id === 'showIn') { G.training.showIn = v === '1'; R.showInputs = G.training.showIn; } else G.training[id] = v; if (id === 'dummy' && v === 'cpu') G.ai[1] = XS.AI.create(2, 5); else if (id === 'dummy') G.ai[1] = null; showPause(); }; }); });
    var rs = $('tr-reset'); if (rs) rs.onclick = function () { audio.play('ok'); startFight(); G.resultShown = false; };
  }
  function resumeFight() { G.paused = false; hideAll(); updateTouchVisible(); touch.reset(); audio.unlock(); }
  function quitFight() { G.paused = false; G.match = null; G.screen = 'menu'; G.resultShown = false; audio.stopMusic(); G.shown = 'menu'; renderMenu(); }

  function showResult() {
    var m = G.match, el = $('scr-result'), w = m.winner, you = w === 0, big, sub = '', btns = '';
    audio.playMusic('result');
    if (G.mode === 'arcade' && G.arcade) {
      if (you && G.arcade.idx >= G.arcade.order.length - 1) { big = '<div class="big">' + t('champion') + '</div>'; sub = '<p class="sub">' + t('champS') + '</p>'; btns = btn(t('menu')); }
      else if (you) { var nx = Data.chars[G.arcade.order[G.arcade.idx + 1]]; big = '<div class="big">' + t('win') + '</div>'; sub = '<p class="sub">' + t('nextOpp') + ' : <b>' + nx.nom + '</b></p>'; btns = btn(t('next')) + btn(t('menu')); }
      else { big = '<div class="big lose">' + t('lose') + '</div>'; btns = btn(t('retry')) + btn(t('menu')); }
    } else {
      var who = G.mode === 'vs2' ? (w === 0 ? Data.chars[G.p1].nom : Data.chars[G.p2].nom) : '';
      big = w < 0 ? '<div class="big">' + t('draw') + '</div>' : '<div class="big ' + (you || G.mode === 'vs2' ? '' : 'lose') + '">' + (G.mode === 'vs2' ? esc(who) + ' !' : (you ? t('win') : t('lose'))) + '</div>'; btns = btn(t('rematch')) + btn(t('menu'));
    }
    el.innerHTML = big + sub + '<div class="menu">' + btns + '</div>'; show('result'); G.sel = 0;
    var b = el.querySelectorAll('.mbtn');
    b.forEach(function (x, i) {
      x.onclick = function () {
        audio.play('ok'); G.resultShown = false;
        var label = x.textContent;
        if (G.mode === 'arcade' && G.arcade) {
          if (you && G.arcade.idx >= G.arcade.order.length - 1) { quitFight(); return; }
          if (you && i === 0) { G.arcade.idx++; startFight(); return; }
          if (!you && i === 0) { startFight(); return; }
          quitFight(); return;
        }
        if (i === 0) startFight(); else quitFight();
      };
    });
    markSel(b);
  }
  $('hud-btn').onclick = function () { audio.unlock(); if (G.screen === 'fight' && !G.paused) showPause(); };

  // ---------- navigation clavier / manette dans les menus ----------
  var padPrev = {};
  function synth(code) { handleKey({ code: code, preventDefault: function () { } }); }
  function pollPad() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [], p = null; for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { p = pads[i]; break; } if (!p) return;
    function edge(name, cond) { var was = padPrev[name]; padPrev[name] = cond; return cond && !was; }
    var ax = p.axes[0] || 0, ay = p.axes[1] || 0, b = p.buttons;
    if (G.screen === 'fight' && !G.paused) { if (edge('start', b[9] && b[9].pressed)) showPause(); return; }
    if (edge('up', ay < -0.6 || (b[12] && b[12].pressed))) synth('ArrowUp'); if (edge('down', ay > 0.6 || (b[13] && b[13].pressed))) synth('ArrowDown');
    if (edge('left', ax < -0.6 || (b[14] && b[14].pressed))) synth('ArrowLeft'); if (edge('right', ax > 0.6 || (b[15] && b[15].pressed))) synth('ArrowRight');
    if (edge('a', b[0] && b[0].pressed) || edge('start2', b[9] && b[9].pressed)) synth('Enter'); if (edge('b', b[1] && b[1].pressed)) synth('Escape');
  }
  function handleKey(e) {
    var c = e.code, sc = G.shown;
    if (G.screen === 'fight' && !G.paused && !$('scr-pause').classList.contains('on') && !$('scr-result').classList.contains('on')) { if (c === 'Escape' || c === 'KeyP') { e.preventDefault(); showPause(); } return; }
    audio.unlock();
    if (sc === 'title') { if (c === 'Enter' || c === 'Space' || c === 'KeyZ' || c === 'KeyJ') { e.preventDefault(); audio.play('ok'); renderMenu(); } return; }
    var scrEl = $('scr-' + sc); if (!scrEl) return;
    if (sc === 'select') {
      var n = Data.order.length;
      if (c === 'ArrowLeft' || c === 'KeyA' || c === 'KeyQ') { G.sel = (G.sel + n - 1) % n; audio.play('ui'); updateCards(); }
      else if (c === 'ArrowRight' || c === 'KeyD') { G.sel = (G.sel + 1) % n; audio.play('ui'); updateCards(); }
      else if (c === 'Enter' || c === 'Space') { e.preventDefault(); confirmChar(); } else if (c === 'Escape') { $('sb-back').click(); }
      return;
    }
    if (sc === 'stage') {
      var m = Data.stages.length;
      if (c === 'ArrowLeft' || c === 'ArrowRight' || c === 'KeyA' || c === 'KeyD') { G.sel = (G.sel + 1) % m; audio.play('ui'); markStage(); }
      else if (c === 'Enter' || c === 'Space') { e.preventDefault(); G.stage = Data.stages[G.sel].id; audio.play('ok'); startFight(); } else if (c === 'Escape') { $('st-back').click(); }
      return;
    }
    var list = scrEl.querySelectorAll('.mbtn'); if (sc === 'menu' || sc === 'pause' || sc === 'result') {
      if (c === 'ArrowDown' || c === 'KeyS') { G.sel = (G.sel + 1) % list.length; audio.play('ui'); markSel(list); e.preventDefault(); }
      else if (c === 'ArrowUp' || c === 'KeyW' || c === 'KeyZ') { G.sel = (G.sel + list.length - 1) % list.length; audio.play('ui'); markSel(list); e.preventDefault(); }
      else if (c === 'Enter' || c === 'Space') { e.preventDefault(); if (list[G.sel]) list[G.sel].click(); }
      else if (c === 'Escape') { if (sc === 'pause') resumeFight(); else if (sc === 'result') quitFight(); }
      return;
    }
    if (c === 'Escape') { var bk = scrEl.querySelector('.row .btn'); if (bk) bk.click(); }
  }
  window.addEventListener('keydown', function (e) { handleKey(e); });
  // « toucher pour commencer »
  $('scr-title').addEventListener('click', function () { audio.unlock(); audio.play('ok'); renderMenu(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && G.screen === 'fight' && !G.paused && !$('scr-result').classList.contains('on')) showPause(); });
  // le défilement du navigateur ne doit jamais bouger la page
  document.addEventListener('touchmove', function (e) { if (!e.target.closest || !e.target.closest('.panel')) e.preventDefault(); }, { passive: false });

  // ---------- démarrage ----------
  applySettings(); fit(); G.screen = 'title'; renderTitle(); requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () { /* hors ligne non disponible */ });
  window.__arena = { G: G, S: S, R: R, startFight: startFight, renderMenu: renderMenu, renderSelect: renderSelect, renderStage: renderStage, renderMoves: renderMoves, renderOptions: renderOptions, showPause: showPause, audio: audio };
})();
