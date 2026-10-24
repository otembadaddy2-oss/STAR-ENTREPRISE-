// KOMYO — visite guidée du premier lancement : de grandes flèches montrent où toucher.
// S'ouvre une seule fois (mémorisé dans le téléphone) ; « Passer » est toujours visible ; fil.html?guide=1 la relance.
(function () {
  'use strict';
  var KEY = 'komyo_guide_v1';
  var force = /[?&]guide=1/.test(location.search);
  function lire() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function noter() { try { localStorage.setItem(KEY, '1'); } catch (e) { /* sans gravité */ } }
  if (!force && lire()) return;

  var ETAPES = [
    { cible: '#btnAdd', titre: 'Publier', texte: 'Touche ici pour filmer ou publier ta vidéo.' },
    { cible: '#navFil', titre: 'Le fil', texte: 'Ici, tu reviens aux vidéos. Fais glisser vers le haut pour voir la suivante.' },
    { cible: '.slide .plus-btn', titre: 'Aimer, commenter, partager', texte: 'Touche le « + » sur une vidéo : le cœur pour aimer, la bulle pour commenter.' },
    { cible: '#espaces', titre: 'Les espaces', texte: 'Talents, Business, Musique, Découverte… choisis ce qui te plaît.' },
    { cible: '.eclat-btn', titre: 'ÉCLAT', texte: 'Le direct de KOMYO : touche pour voir ce qui se passe en ce moment.' },
    { cible: '.kdb-btn', titre: 'Keydou', texte: 'Un service, une question ? Keydou t\'aide en direct.' },
    { cible: 'a.home', titre: 'Mon espace', texte: 'Ton profil, tes amis et tes messages sont ici.' }
  ];

  var css = '' +
    '.gd-back{position:fixed;inset:0;z-index:2147483000;pointer-events:auto;}' +
    '.gd-spot{position:fixed;z-index:2147483001;border-radius:16px;box-shadow:0 0 0 9999px rgba(8,5,16,.78),0 0 0 3px #f5b942,0 0 22px 6px rgba(245,185,66,.65);pointer-events:none;transition:all .35s ease;animation:gdp 1.4s ease-in-out infinite;}' +
    '@keyframes gdp{50%{box-shadow:0 0 0 9999px rgba(8,5,16,.78),0 0 0 3px #fff,0 0 30px 10px rgba(245,185,66,.9);}}' +
    '.gd-arrow{position:fixed;z-index:2147483002;width:70px;height:70px;pointer-events:none;transition:all .35s ease;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6));}' +
    '.gd-arrow svg{width:100%;height:100%;animation:gdb .8s ease-in-out infinite;}' +
    '@keyframes gdb{50%{transform:translateY(-10px);}}' +
    '.gd-card{position:fixed;left:16px;right:16px;z-index:2147483003;max-width:420px;margin:0 auto;background:#fff;color:#241536;border-radius:18px;padding:16px 18px;box-shadow:0 18px 40px -10px rgba(0,0,0,.6);font-family:system-ui,sans-serif;}' +
    '.gd-card h3{margin:0 0 4px;font-size:19px;}.gd-card p{margin:0 0 12px;font-size:15px;line-height:1.35;}' +
    '.gd-row{display:flex;align-items:center;justify-content:space-between;gap:10px;}.gd-pas{font-size:12px;color:#7a6a8a;}' +
    '.gd-card button{border:0;border-radius:999px;font-weight:700;font-size:15px;padding:10px 20px;cursor:pointer;}' +
    '.gd-next{background:linear-gradient(135deg,#ff6a4d,#f0b13f);color:#fff;}.gd-skip{background:none;color:#7a6a8a;text-decoration:underline;padding:10px 6px !important;}' +
    '@media (prefers-reduced-motion:reduce){.gd-spot,.gd-arrow svg{animation:none;}.gd-spot,.gd-arrow{transition:none;}}';

  function visible(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; }
  function trouver(sel) { var l = document.querySelectorAll(sel); for (var i = 0; i < l.length; i++) if (visible(l[i])) return l[i]; return null; }

  var steps = [], i = 0, back, spot, arrow, card;
  function fermer() { noter(); [back, spot, arrow, card].forEach(function (e) { if (e && e.parentNode) e.parentNode.removeChild(e); }); window.removeEventListener('resize', place); }
  function suivante() { i++; montrer(); }
  function place() { if (steps[i]) poser(steps[i]); }

  function poser(e) {
    var r = e.el.getBoundingClientRect(), pad = 6;
    spot.style.left = (r.left - pad) + 'px'; spot.style.top = (r.top - pad) + 'px';
    spot.style.width = (r.width + 2 * pad) + 'px'; spot.style.height = (r.height + 2 * pad) + 'px';
    var enHaut = r.top + r.height / 2 < innerHeight / 2;           // cible en haut de l'écran : flèche dessous, carte en bas
    var ax = Math.min(Math.max(r.left + r.width / 2 - 35, 6), innerWidth - 76);
    arrow.style.left = ax + 'px';
    arrow.firstChild.style.transform = '';
    arrow.innerHTML = '<svg viewBox="0 0 70 70" fill="#f5b942" stroke="#fff" stroke-width="3" stroke-linejoin="round" style="' + (enHaut ? 'transform:rotate(180deg)' : '') + '"><path d="M35 62 8 30h17V6h20v24h17z"/></svg>';
    if (enHaut) { arrow.style.top = (r.bottom + pad + 4) + 'px'; card.style.top = ''; card.style.bottom = '24px'; }
    else { arrow.style.top = (r.top - pad - 76) + 'px'; card.style.bottom = ''; card.style.top = '24px'; }
  }

  function montrer() {
    while (i < steps.length && !steps[i].el) i++;
    if (i >= steps.length) { fermer(); return; }
    var e = steps[i];
    card.innerHTML = '<h3>' + e.titre + ' <small style="font-weight:400;font-size:12px;color:#7a6a8a">' + (i + 1) + '/' + steps.length + '</small></h3><p>' + e.texte + '</p>' +
      '<div class="gd-row"><button type="button" class="gd-skip">Passer</button><button type="button" class="gd-next">' + (i === steps.length - 1 ? 'C\'est parti !' : 'Suivant') + '</button></div>';
    card.querySelector('.gd-skip').onclick = fermer;
    card.querySelector('.gd-next').onclick = suivante;
    poser(e);
  }

  function demarrer() {
    steps = ETAPES.map(function (e) { return { cible: e.cible, titre: e.titre, texte: e.texte, el: trouver(e.cible) }; }).filter(function (e) { return e.el; });
    if (steps.length < 2) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    back = document.createElement('div'); back.className = 'gd-back';
    spot = document.createElement('div'); spot.className = 'gd-spot';
    arrow = document.createElement('div'); arrow.className = 'gd-arrow'; arrow.innerHTML = '<svg></svg>';
    card = document.createElement('div'); card.className = 'gd-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite');
    [back, spot, arrow, card].forEach(function (e) { document.body.appendChild(e); });
    window.addEventListener('resize', place);
    i = 0; montrer();
  }

  // on attend que la page (fil chargé, boutons affichés) soit prête
  var essais = 0;
  var t = setInterval(function () {
    essais++;
    var pret = visible(document.getElementById('btnAdd')) && visible(document.getElementById('navFil'));
    if (pret) { clearInterval(t); setTimeout(demarrer, 900); }
    else if (essais > 40) clearInterval(t);
  }, 500);
})();
