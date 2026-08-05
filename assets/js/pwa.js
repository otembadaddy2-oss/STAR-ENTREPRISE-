// STAR ENTREPRISE — Installation PWA (application gratuite téléchargeable)
(function(){
  "use strict";

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").catch(function(){});
    });
  }

  var deferredPrompt = null;
  var installBtn = document.getElementById("installBtn");
  var installState = document.getElementById("installState");
  var banner = document.getElementById("installBanner");

  function isStandalone(){
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  if (isStandalone()) {
    if (installBtn) { installBtn.textContent = "Application déjà installée ✓"; installBtn.disabled = true; }
    if (installState) installState.textContent = "Vous utilisez déjà l'application STAR ENTREPRISE. Merci !";
  } else if (installBtn) {
    installState && (installState.textContent = "Préparation de l'installation… si le bouton reste inactif, utilisez les instructions ci-dessous.");
  }

  window.addEventListener("beforeinstallprompt", function(e){
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.disabled = false;
      installState && (installState.textContent = "Prêt à installer ! Cliquez sur le bouton ci-dessus.");
    }
    if (banner) banner.classList.add("show");
  });

  if (installBtn) {
    installBtn.addEventListener("click", function(){
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function(){ deferredPrompt = null; });
    });
  }

  window.addEventListener("appinstalled", function(){
    if (installBtn) { installBtn.textContent = "Application installée ✓"; installBtn.disabled = true; }
    if (installState) installState.textContent = "Merci ! STAR ENTREPRISE est maintenant sur votre écran d'accueil.";
    if (banner) banner.classList.remove("show");
  });

  // Generic install banner (all pages) if present
  var bannerInstallBtn = document.getElementById("bannerInstall");
  var bannerCloseBtn = document.getElementById("bannerClose");
  if (bannerInstallBtn) {
    bannerInstallBtn.addEventListener("click", function(){
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function(){ deferredPrompt = null; if(banner) banner.classList.remove("show"); });
      } else {
        window.location.href = "application.html";
      }
    });
  }
  if (bannerCloseBtn && banner) {
    bannerCloseBtn.addEventListener("click", function(){ banner.classList.remove("show"); });
  }
})();
