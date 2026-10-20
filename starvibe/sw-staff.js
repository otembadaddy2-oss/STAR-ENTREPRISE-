// Notifications du staff : "Valider le dépôt ? Oui / Non" directement depuis l'écran du téléphone.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function(e){
  var d = {};
  try { d = e.data.json(); } catch (x) { d = { title: 'Keydou', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Keydou', {
    body: d.body || '',
    tag: d.tag || 'keydou',
    data: d,
    actions: d.actions || [],
    requireInteraction: !!(d.actions && d.actions.length),
    icon: '/starvibe/assets/img/keydou.webp',
    badge: '/starvibe/assets/img/keydou.webp'
  }));
});

self.addEventListener('notificationclick', function(e){
  var d = e.notification.data || {};
  e.notification.close();
  if ((e.action === 'oui' || e.action === 'non') && d.decide) {
    e.waitUntil(
      fetch('/api/starvibe-keydou', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decider', k: d.decide.kind, r: d.decide.id, exp: d.decide.exp, t: d.decide.t, d: e.action })
      }).then(function(r){ return r.json(); }).then(function(res){
        var title = res.ok ? (e.action === 'oui' ? '✅ Dépôt validé — Keydou répond au client' : '❌ Dépôt refusé') : 'Déjà traité ou lien expiré';
        return self.registration.showNotification(title, { tag: (d.tag || 'keydou') + '-fait', icon: '/starvibe/assets/img/keydou.webp' });
      }).catch(function(){
        return self.registration.showNotification('Connexion impossible', { body: 'Touchez la notification pour valider depuis la page.', tag: (d.tag || 'keydou') + '-erreur' });
      })
    );
    return;
  }
  e.waitUntil(self.clients.openWindow(d.url || '/starvibe/keydou-admin.html'));
});
