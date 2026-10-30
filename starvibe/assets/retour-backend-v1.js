// Bouton « retour » du téléphone : sur les pages Paiements et Modération, il ramène au Backend
// au lieu de quitter l'application quand la page a été ouverte directement (raccourci, lien reçu…).
// Si la page a été ouverte depuis le Backend, le retour natif y ramène déjà : on ne touche à rien.
(function(){
  var DEST = '/starvibe/keydou-admin.html';
  var depuisLeSite = false;
  try { depuisLeSite = !!document.referrer && document.referrer.indexOf(location.origin) === 0; } catch (e) {}
  if (depuisLeSite) return;
  try { history.replaceState({ k: 'racine' }, ''); history.pushState({ k: 'page' }, ''); } catch (e) { return; }
  window.addEventListener('popstate', function(e){
    if (!e.state || e.state.k === 'racine') location.replace(DEST);
  });
})();
