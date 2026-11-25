/* Passeport Sûr — page d'installation : détecte l'appareil, propose les bonnes étapes, bouton « Installer maintenant » quand le navigateur le permet. */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var ua = navigator.userAgent || '', ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), android = /Android/.test(ua);
  var enWhatsApp = /FBAN|FBAV|Instagram|WhatsApp/i.test(ua);
  var standalone = false; try { standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { }
  var id = ios ? 'd-ios' : android ? 'd-android' : 'd-pc'; $('#' + id).open = true;
  var nom = ios ? 'un iPhone ou un iPad' : android ? 'un téléphone Android' : 'un ordinateur';
  $('#votre').innerHTML = '👉 Votre appareil : <b>' + nom + '</b>.' + (ios && enWhatsApp ? ' <b>Important :</b> ouvrez d’abord ce lien dans <b>Safari</b>.' : android && enWhatsApp ? ' <b>Important :</b> ouvrez d’abord ce lien dans <b>Chrome</b>.' : '');
  if (standalone) { $('#dejaInstalle').hidden = false; $('#votre').hidden = true; }
  var diff = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); diff = e; if (!standalone) $('#bInstaller').hidden = false; });
  window.addEventListener('appinstalled', function () { diff = null; $('#bInstaller').hidden = true; $('#dejaInstalle').hidden = false; });
  $('#bInstaller').onclick = function () { if (!diff) return; diff.prompt(); diff.userChoice.then(function () { diff = null; $('#bInstaller').hidden = true; }); };
  var lien = location.origin + location.pathname;
  try { var q = qrcode(0, 'M'); q.addData(lien); q.make(); $('#qr').innerHTML = q.createSvgTag(4, 0); } catch (e) { }
  if (navigator.share) { $('#bPartager').hidden = false; $('#bPartager').onclick = function () { navigator.share({ title: 'Passeport Sûr', text: 'Installer l’application Passeport Sûr', url: lien }).catch(function () { }); }; }
  $('#bCopier').onclick = function () { try { navigator.clipboard.writeText(lien).then(function () { $('#copie').textContent = '✔ Lien copié.'; }, function () { $('#copie').textContent = lien; }); } catch (e) { $('#copie').textContent = lien; } };
})();
