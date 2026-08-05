// JARDISSA — Assistant virtuel STAR ENTREPRISE
// Assistant conversationnel côté client : répond aux questions fréquentes et
// relaie toute demande concrète (devis, rendez-vous, projet) vers le WhatsApp
// du fondateur pour validation humaine avant tout engagement.
(function(){
  "use strict";

  var WA_NUMBER = window.STAR_WA_NUMBER || "24266565050";

  var KB = [
    {
      k: ["service", "offre", "que faites", "quoi faire", "propose", "domaine"],
      a: "Nous concevons des <b>sites web</b>, <b>applications mobiles</b>, <b>boutiques en ligne</b> (nourriture, cosmétiques, mode, accessoires…), de l'<b>identité visuelle</b> et de la <b>stratégie digitale</b>. En résumé : vous apportez l'idée, nous la transformons en diamant. 💎",
      chips: ["Voir tous les services", "Obtenir un devis"]
    },
    {
      k: ["prix", "tarif", "coût", "cout", "combien", "budget"],
      a: "Chaque projet est unique, donc le tarif dépend de la complexité, des fonctionnalités et des délais. Je peux transmettre votre besoin à Carry OTEMBA (fondateur) pour un devis précis et gratuit — avec son autorisation, il vous répond directement. Voulez-vous que je prépare votre message ?",
      chips: ["Oui, demander un devis", "Parler à un humain"]
    },
    {
      k: ["délai", "delai", "temps", "combien de temps", "durée"],
      a: "En général : site vitrine 7-15 jours, boutique en ligne 2-4 semaines, application mobile 4-10 semaines selon la complexité. On vous donne un planning précis après notre premier échange.",
      chips: ["Obtenir un devis", "Voir le processus"]
    },
    {
      k: ["application", "app", "mobile", "android", "ios", "telecharg", "télécharg"],
      a: "Oui ! Nous développons des <b>applications mobiles</b> et proposons aussi une version <b>installable gratuitement</b> directement depuis ce site (sans passer par un store) : ajoutez STAR ENTREPRISE à votre écran d'accueil en un clic.",
      chips: ["Comment l'installer ?", "Voir nos réalisations"]
    },
    {
      k: ["nourriture", "food", "restaurant", "alimentaire"],
      a: "Nous créons des applications et sites de <b>vente de nourriture</b> : commande en ligne, paiement, livraison, gestion de menu et de stock. Parlez-nous de votre concept !",
      chips: ["Demander un devis", "Voir les services e-commerce"]
    },
    {
      k: ["cosmetique", "cosmétique", "beauté", "beaute"],
      a: "Nous concevons des boutiques en ligne <b>cosmétiques</b> avec catalogue produits, fiches détaillées, paiement sécurisé et expérience visuelle premium.",
      chips: ["Demander un devis", "Voir les services e-commerce"]
    },
    {
      k: ["vetement", "vêtement", "habit", "sac", "mode", "fashion"],
      a: "Mode, habits, sacs et accessoires : nous créons des boutiques élégantes avec lookbook, filtres, panier et tunnel d'achat fluide, pensées pour convertir vos visiteurs en acheteurs.",
      chips: ["Demander un devis", "Voir les services e-commerce"]
    },
    {
      k: ["processus", "comment ça marche", "comment ca marche", "étapes", "etapes"],
      a: "Notre méthode en 4 étapes : <br>1️⃣ Écoute de votre idée <br>2️⃣ Conception & design <br>3️⃣ Développement <br>4️⃣ Lancement + accompagnement. Chaque étape est validée avec vous.",
      chips: ["Obtenir un devis", "Voir les services"]
    },
    {
      k: ["business plan", "investir", "investisseur", "financier"],
      a: "Notre business plan sur 5 ans (marché, stratégie, projections financières) est consultable en ligne et téléchargeable en PDF sur la page dédiée.",
      chips: ["Ouvrir le Business Plan"]
    },
    {
      k: ["contact", "whatsapp", "téléphone", "telephone", "appeler", "numero", "numéro"],
      a: "Vous pouvez nous écrire directement sur WhatsApp au <b>+242 06 656 50 50</b>. Je peux aussi préparer votre message tout de suite.",
      chips: ["Ouvrir WhatsApp", "Demander un devis"]
    },
    {
      k: ["bonjour", "salut", "bjr", "hello", "coucou"],
      a: "Bonjour et bienvenue chez STAR ENTREPRISE ! 👋 Je suis Jardissa, votre assistante. Comment puis-je éclairer votre projet aujourd'hui ?",
      chips: ["Nos services", "Obtenir un devis", "Parler à un humain"]
    },
    {
      k: ["merci"],
      a: "Avec plaisir ! ✨ Une autre question, ou souhaitez-vous que je transmette votre projet à Carry OTEMBA ?",
      chips: ["Obtenir un devis", "Non merci"]
    },
    {
      k: ["fondateur", "carry", "otemba", "président", "president", "qui êtes vous", "qui etes vous"],
      a: "STAR ENTREPRISE a été fondée par <b>Carry OTEMBA</b>, Président Fondateur. Sa mission : transformer les idées de ses clients en projets digitaux d'exception.",
      chips: ["Nos services", "Parler à un humain"]
    }
  ];

  var GREETING = "Bonjour, je suis <b>Jardissa</b> 💎, l'assistante virtuelle de STAR ENTREPRISE. Je connais tous nos services et je peux transmettre votre projet directement à notre fondateur sur WhatsApp. Que puis-je faire pour vous ?";
  var DEFAULT_REPLY = "Je note votre message. Pour une réponse précise et personnalisée, je peux le transmettre immédiatement à Carry OTEMBA sur WhatsApp (avec son accord, il vous répondra directement). Voulez-vous que je l'envoie ?";
  var DEFAULT_CHIPS = ["Oui, transmettre sur WhatsApp", "Voir nos services"];

  function el(tag, cls, html){
    var e = document.createElement(tag);
    if(cls) e.className = cls;
    if(html !== undefined) e.innerHTML = html;
    return e;
  }

  function buildWA(text){
    return (window.buildWhatsAppLink ? window.buildWhatsAppLink(text) : ("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text)));
  }

  function init(){
    var launcher = el('button', 'jd-launcher');
    launcher.setAttribute('aria-label', 'Ouvrir Jardissa, assistante STAR ENTREPRISE');
    launcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg><span class="jd-dot"></span>';
    document.body.appendChild(launcher);

    var panel = el('div', 'jd-panel');
    panel.innerHTML =
      '<div class="jd-head">' +
        '<div class="jd-avatar">J</div>' +
        '<div><b>Jardissa</b><span>En ligne</span></div>' +
        '<button class="jd-close" aria-label="Fermer">✕</button>' +
      '</div>' +
      '<div class="jd-body" id="jd-body"></div>' +
      '<form class="jd-foot" id="jd-form">' +
        '<input type="text" id="jd-input" placeholder="Écrivez votre message…" autocomplete="off" />' +
        '<button type="submit" aria-label="Envoyer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>' +
      '</form>' +
      '<div class="jd-disclaimer">Jardissa relaie vos demandes à Carry OTEMBA (WhatsApp) avant toute réponse engageante.</div>';
    document.body.appendChild(panel);

    var body = panel.querySelector('#jd-body');
    var form = panel.querySelector('#jd-form');
    var input = panel.querySelector('#jd-input');
    var closeBtn = panel.querySelector('.jd-close');
    var opened = false;

    function scrollDown(){ body.scrollTop = body.scrollHeight; }

    function addBotHTML(html, chips){
      var msg = el('div', 'jd-msg bot', html);
      body.appendChild(msg);
      if(chips && chips.length){
        var wrap = el('div', 'jd-quick');
        chips.forEach(function(c){
          var chip = el('button', 'jd-chip', c);
          chip.type = 'button';
          chip.addEventListener('click', function(){ handleUserText(c); });
          wrap.appendChild(chip);
        });
        body.appendChild(wrap);
      }
      scrollDown();
    }

    function addUser(text){
      body.appendChild(el('div', 'jd-msg user', escapeHTML(text)));
      scrollDown();
    }

    function escapeHTML(s){
      return s.replace(/[&<>"']/g, function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
      });
    }

    function showTyping(cb){
      var t = el('div', 'jd-typing', '<span></span><span></span><span></span>');
      body.appendChild(t);
      scrollDown();
      setTimeout(function(){
        t.remove();
        cb();
      }, 550 + Math.random()*400);
    }

    function findAnswer(text){
      var lower = text.toLowerCase();
      for(var i=0;i<KB.length;i++){
        for(var j=0;j<KB[i].k.length;j++){
          if(lower.indexOf(KB[i].k[j]) !== -1) return KB[i];
        }
      }
      return null;
    }

    function handleUserText(text){
      addUser(text);
      input.value = '';

      var lower = text.toLowerCase();

      // Direct actions
      if(lower.indexOf('whatsapp') !== -1 && (lower.indexOf('ouvrir') !== -1 || lower.indexOf('envoyer') !== -1 || lower.indexOf('transmettre') !== -1 || lower.indexOf('oui') !== -1)){
        showTyping(function(){
          addBotHTML("Parfait ! J'ouvre WhatsApp avec votre message pré-rempli pour Carry OTEMBA. Il vous répondra dès validation. 💎");
          window.open(buildWA("Bonjour STAR ENTREPRISE, je viens de discuter avec Jardissa sur le site à propos de : \"" + text + "\". Pouvez-vous me recontacter ?"), "_blank");
        });
        return;
      }
      if(lower.indexOf('business plan') !== -1 || lower.toLowerCase().indexOf('ouvrir le business') !== -1){
        showTyping(function(){
          addBotHTML('Voici notre business plan complet, consultable en ligne et téléchargeable en PDF : <a href="business-plan.html" style="color:var(--gold-2);text-decoration:underline;">Ouvrir la page Business Plan</a>');
        });
        return;
      }
      if(lower.indexOf('devis') !== -1 || lower.indexOf('humain') !== -1){
        showTyping(function(){
          addBotHTML("Je transmets votre demande à Carry OTEMBA (Fondateur) sur WhatsApp — il valide et vous répond personnellement. Cliquez pour envoyer :");
          var wrap = el('div', 'jd-quick');
          var link = el('a', 'jd-chip', '💬 Envoyer sur WhatsApp maintenant');
          link.href = buildWA("Bonjour, je souhaite un devis pour un projet avec STAR ENTREPRISE. Pouvez-vous me contacter ?");
          link.target = '_blank';
          wrap.appendChild(link);
          body.appendChild(wrap);
          scrollDown();
        });
        return;
      }
      if(lower.indexOf('installer') !== -1){
        showTyping(function(){
          addBotHTML('Sur mobile : ouvrez le menu de votre navigateur puis "Ajouter à l\'écran d\'accueil". Sur ordinateur : cliquez sur l\'icône d\'installation dans la barre d\'adresse, ou visitez notre page dédiée.', ["Voir la page application"]);
        });
        return;
      }
      if(lower.indexOf('voir la page application') !== -1){
        window.location.href = 'application.html';
        return;
      }
      if(lower.indexOf('voir tous les services') !== -1 || lower.indexOf('voir les services') !== -1 || lower === 'voir les services e-commerce'){
        window.location.href = 'services.html';
        return;
      }
      if(lower.indexOf('voir nos réalisations') !== -1 || lower.indexOf('voir nos realisations') !== -1){
        window.location.href = 'realisations.html';
        return;
      }
      if(lower.indexOf('non merci') !== -1){
        showTyping(function(){ addBotHTML("Avec plaisir ! Je reste disponible juste ici si besoin. 💎"); });
        return;
      }

      var match = findAnswer(text);
      showTyping(function(){
        if(match) addBotHTML(match.a, match.chips);
        else addBotHTML(DEFAULT_REPLY, DEFAULT_CHIPS);
      });
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var v = input.value.trim();
      if(!v) return;
      handleUserText(v);
    });

    function openPanel(){
      panel.classList.add('open');
      opened = true;
      if(!body.childElementCount){
        showTyping(function(){
          addBotHTML(GREETING, ["Nos services", "Obtenir un devis", "Voir le Business Plan"]);
        });
      }
      input.focus();
    }
    function closePanel(){ panel.classList.remove('open'); }

    launcher.addEventListener('click', function(){
      if(panel.classList.contains('open')) closePanel(); else openPanel();
    });
    closeBtn.addEventListener('click', closePanel);

    // Auto-suggest bubble once, after 8s, first visit only
    if(!sessionStorage.getItem('jd_greeted')){
      setTimeout(function(){
        if(!opened) launcher.classList.add('jd-attention');
      }, 8000);
      sessionStorage.setItem('jd_greeted', '1');
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
