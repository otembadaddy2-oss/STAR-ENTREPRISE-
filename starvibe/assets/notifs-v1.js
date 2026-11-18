/* KOMYO — invitation automatique à recevoir les messages sur le téléphone (notifications), même quand KOMYO est fermé.
   Un navigateur n'autorise JAMAIS une application à s'activer toute seule : la personne doit toucher « Activer » une fois.
   Ce script s'affiche donc tout seul, au bon moment, avec un seul bouton, et explique ce qu'il faut faire selon le téléphone :
   - Android / ordinateur : bouton « Activer » ;
   - iPhone / iPad : message automatique « ajoute KOMYO à l'écran d'accueil » (Apple l'exige) ;
   - notifications bloquées : comment les rouvrir.
   Usage : KomyoNotifs.init({ token: '…', zone: element }) */
(function () {
  var API = '/api/starvibe-dm';
  var CLE = 'komyo_notif_masque';          // date du dernier « Plus tard »
  var CLE_OK = 'komyo_notif_verifie';      // date de la dernière vérification de l'abonnement
  var JOURS_REAPPARITION = 3;

  function lire(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function ecrire(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* mode privé */ } }
  function masqueRecemment() { var t = Number(lire(CLE)); return t && Date.now() - t < JOURS_REAPPARITION * 86400000; }

  function estIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function installee() { return !!navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); }
  function gere() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }

  function b64(s) { var p = '='.repeat((4 - s.length % 4) % 4); var b = (s + p).replace(/-/g, '+').replace(/_/g, '/'); var r = atob(b), o = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; }
  function api(token, corps) {
    return fetch(API + (corps ? '' : '?pushkey=1'), corps ? { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(corps) } : { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
  }

  // Abonne ce téléphone (à appeler depuis un geste de la personne la première fois).
  function abonner(token) {
    return navigator.serviceWorker.register('/starvibe/sw-komyo.js').then(function () { return navigator.serviceWorker.ready; }).then(function (reg) {
      return api(token).then(function (k) {
        if (!k.ok) throw new Error('Clé indisponible');
        return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.d.publicKey) }); });
      });
    }).then(function (sub) {
      return api(token, { action: 'notifier', subscription: sub.toJSON(), label: navigator.userAgent.slice(0, 50) });
    }).then(function (r) { if (!r.ok) throw new Error((r.d && r.d.error) || 'Enregistrement impossible'); ecrire(CLE_OK, String(Date.now())); return true; });
  }

  function carte(zone, html) {
    var d = document.createElement('div');
    d.setAttribute('role', 'status');
    d.style.cssText = 'background:#fff;border:1.5px solid #E8A93D;border-radius:16px;padding:14px 16px;margin:0 0 14px;font-size:13.5px;line-height:1.5;color:#241536;box-shadow:0 6px 16px -10px rgba(36,21,54,.4)';
    d.innerHTML = html;
    zone.appendChild(d);
    return d;
  }
  var BTN = 'border:0;border-radius:12px;padding:10px 14px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;';

  function init(o) {
    var token = o && o.token, zone = o && o.zone;
    if (!token || !zone) return;

    // 1. iPhone / iPad : sans installation sur l'écran d'accueil, Apple n'autorise pas les notifications → message automatique.
    if (estIOS() && !installee()) {
      if (masqueRecemment()) return;
      var c1 = carte(zone, '<b>📲 Pour recevoir tes messages, installe KOMYO sur ton iPhone</b><br>Apple exige que l\'application soit sur ton écran d\'accueil. Appuie sur <b>Partager</b> (le carré avec une flèche, en bas de Safari), puis sur <b>« Sur l\'écran d\'accueil »</b>. Ouvre ensuite KOMYO depuis cette icône : tu pourras activer les notifications.<br><button type="button" id="nfPlusTard" style="' + BTN + 'margin-top:10px;background:#f3ede0;color:#241536">J\'ai compris</button>');
      c1.querySelector('#nfPlusTard').addEventListener('click', function () { ecrire(CLE, String(Date.now())); c1.remove(); });
      return;
    }
    if (!gere()) return;   // navigateur trop ancien : rien à proposer

    var perm = Notification.permission;
    // 2. Déjà autorisé : on vérifie en silence (au plus une fois par jour) que ce téléphone est bien enregistré.
    if (perm === 'granted') {
      var dernier = Number(lire(CLE_OK));
      if (!dernier || Date.now() - dernier > 86400000) abonner(token).catch(function () { /* nouvelle tentative à la prochaine ouverture */ });
      return;
    }
    // 3. Bloqué : expliquer comment rouvrir.
    if (perm === 'denied') {
      if (masqueRecemment()) return;
      var c2 = carte(zone, '<b>🔕 Les notifications de KOMYO sont bloquées</b><br>Tu ne verras pas tes nouveaux messages quand l\'application est fermée. Pour les rouvrir : touche le <b>cadenas</b> (ou ⋮) à côté de l\'adresse du site, puis <b>Autorisations → Notifications → Autoriser</b>.<br><button type="button" id="nfOk" style="' + BTN + 'margin-top:10px;background:#f3ede0;color:#241536">J\'ai compris</button>');
      c2.querySelector('#nfOk').addEventListener('click', function () { ecrire(CLE, String(Date.now())); c2.remove(); });
      return;
    }
    // 4. Pas encore demandé : un seul bouton.
    if (masqueRecemment()) return;
    var c3 = carte(zone, '<b>🔔 Reçois tes messages même quand KOMYO est fermé</b><br>Touche « Activer » : tu verras une notification sur ton téléphone dès qu\'un ami t\'écrit.<br><span id="nfEtat" style="display:block;margin-top:6px;font-size:12.5px"></span><button type="button" id="nfActiver" style="' + BTN + 'margin-top:10px;background:linear-gradient(120deg,#FF6B4A,#E8A93D);color:#fff">Activer les notifications</button> <button type="button" id="nfPlusTard" style="' + BTN + 'margin-top:10px;background:#f3ede0;color:#241536">Plus tard</button>');
    var etat = c3.querySelector('#nfEtat');
    c3.querySelector('#nfPlusTard').addEventListener('click', function () { ecrire(CLE, String(Date.now())); c3.remove(); });
    c3.querySelector('#nfActiver').addEventListener('click', function () {
      etat.textContent = 'Activation en cours…';
      Notification.requestPermission().then(function (p) {
        if (p !== 'granted') { etat.textContent = 'Les notifications n\'ont pas été autorisées. Tu pourras les activer plus tard dans les réglages du navigateur.'; return null; }
        return abonner(token).then(function () { c3.innerHTML = '<b>✅ Notifications activées sur ce téléphone.</b> Tu seras prévenu à chaque nouveau message.'; setTimeout(function () { if (c3.parentNode) c3.remove(); }, 6000); });
      }).catch(function () { etat.textContent = 'Activation impossible pour le moment. Réessaie dans un instant.'; });
    });
  }

  window.KomyoNotifs = { init: init };
})();
