// ANNONCES KOMYO — le bandeau qui défile en bas de l'écran des abonnés connectés.
// L'annonce qui s'affiche et le moment où elle s'affiche viennent de l'HEURE DU SERVEUR : tous les abonnés voient la même annonce
// en même temps (à une seconde près), pendant quelques secondes, puis elle disparaît partout en même temps.
// Jamais dans PIOUPIOU (espace enfants). Les annonces sont marquées « ANNONCE » : ce sont des messages payés par des annonceurs.
(function () {
  var API = '/api/starvibe-pub', REFRESH_MS = 60000;
  var token = null; try { token = localStorage.getItem('starvibe_token'); } catch (e) {}
  if (!token || window.komyoPub) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var css = document.createElement('style');
  css.textContent =
    '#pubBandeau{position:fixed;left:10px;right:10px;z-index:2147482000;display:flex;align-items:center;gap:10px;max-width:520px;margin:0 auto;padding:9px 12px;border-radius:14px;background:linear-gradient(135deg,rgba(10,16,48,.94),rgba(36,21,54,.94));color:#fff;box-shadow:0 10px 26px -10px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.14);font-family:Inter,Arial,sans-serif;text-decoration:none;overflow:hidden;transform:translateY(140%);opacity:0;transition:transform .45s cubic-bezier(.2,.9,.3,1.1),opacity .3s;}' +
    '#pubBandeau.on{transform:none;opacity:1;}' +
    '#pubBandeau .tag{flex:none;font:800 9.5px Sora,Arial,sans-serif;letter-spacing:.12em;color:#0a1030;background:linear-gradient(135deg,#ffe27a,#e8a93d);padding:3px 7px;border-radius:6px;}' +
    '#pubBandeau .fen{flex:1;min-width:0;overflow:hidden;white-space:nowrap;}' +
    '#pubBandeau .txt{display:inline-block;font:600 13.5px Inter,Arial,sans-serif;padding-left:100%;animation:pubDefile linear forwards;}' +
    '@keyframes pubDefile{from{transform:translateX(0)}to{transform:translateX(-100%)}}' +
    '@media (prefers-reduced-motion:reduce){#pubBandeau .txt{animation:none;padding-left:0}}';
  document.head.appendChild(css);
  var el = document.createElement('a'); el.id = 'pubBandeau'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'off');
  el.innerHTML = '<span class="tag">ANNONCE</span><span class="fen"><span class="txt"></span></span>';
  document.body.appendChild(el);
  var txt = el.querySelector('.txt');
  function place() { var nav = document.querySelector('.bottomnav'); el.style.bottom = (nav ? (nav.offsetHeight + 8) + 'px' : 'calc(12px + env(safe-area-inset-bottom))'); }

  var data = null, offset = 0, affiche = -1;
  function charger() {
    var t0 = Date.now();
    fetch(API + '?actives=1', { headers: { 'Authorization': 'Bearer ' + token } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.annonces) return; data = d; offset = d.now - (t0 + Date.now()) / 2;   // écart entre l'horloge du téléphone et celle du serveur
    }).catch(function () { /* hors ligne : on garde la dernière liste */ });
  }
  function tick() {
    if (!data || !data.annonces.length || document.hidden) { cacher(); return; }
    var cycle = data.cycleSec * 1000, montre = data.montreSec * 1000, t = Date.now() + offset;
    var n = Math.floor(t / cycle), pos = t - n * cycle;
    if (pos >= montre) { cacher(); return; }
    var a = data.annonces[n % data.annonces.length];
    if (affiche !== n) {
      affiche = n; place(); txt.textContent = a.texte;
      txt.style.animationDuration = Math.max(4, (montre - pos) / 1000 - 0.6) + 's';
      txt.style.animation = 'none'; void txt.offsetWidth; txt.style.animation = '';   // relance le défilement
      txt.style.animationDuration = Math.max(4, (montre - pos) / 1000 - 0.6) + 's';
      if (a.lien) { el.href = a.lien; if (/^https:/.test(a.lien)) { el.target = '_blank'; el.rel = 'noopener noreferrer'; } else { el.removeAttribute('target'); } el.style.pointerEvents = 'auto'; }
      else { el.removeAttribute('href'); el.style.pointerEvents = 'none'; }
      el.classList.add('on');
    }
  }
  function cacher() { if (affiche !== -1) { affiche = -1; el.classList.remove('on'); } }
  window.komyoPub = { recharger: charger };
  charger(); setInterval(charger, REFRESH_MS); setInterval(tick, 500);
})();
