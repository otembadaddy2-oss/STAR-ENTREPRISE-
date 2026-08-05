// STAR ENTREPRISE — core interactions
(function(){
  "use strict";

  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if(toggle && links){
    toggle.addEventListener('click', function(){
      links.classList.toggle('open');
      toggle.classList.toggle('active');
    });
    links.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ links.classList.remove('open'); });
    });
  }

  // Navbar scroll state
  var navbar = document.querySelector('.navbar');
  function onScroll(){
    if(!navbar) return;
    if(window.scrollY > 12) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }
  document.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // Active nav link
  var here = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-links a[href]').forEach(function(a){
    var href = a.getAttribute('href');
    if(href === here || (here === '' && href === 'index.html')){
      a.classList.add('active');
    }
  });

  // Scroll reveal
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, {threshold:.15, rootMargin:"0px 0px -60px 0px"});
  document.querySelectorAll('.reveal, .reveal-scale').forEach(function(el){ io.observe(el); });

  // Animated counters
  function animateCounter(el){
    var target = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || '';
    var dur = 1400, start = null, from = 0;
    function step(ts){
      if(!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = from + (target - from) * eased;
      el.textContent = (target % 1 !== 0 ? val.toFixed(1) : Math.round(val)) + suffix;
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if(counters.length){
    var cio = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ animateCounter(e.target); cio.unobserve(e.target); }
      });
    }, {threshold:.4});
    counters.forEach(function(el){ cio.observe(el); });
  }

  // Portfolio filter (if present)
  var filterBtns = document.querySelectorAll('.filter-btn');
  var workCards = document.querySelectorAll('[data-cat]');
  filterBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      filterBtns.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var cat = btn.dataset.filter;
      workCards.forEach(function(card){
        var show = (cat === 'all' || card.dataset.cat === cat);
        card.style.display = show ? '' : 'none';
      });
    });
  });

  // Contact / lead form -> WhatsApp handoff
  var WA_NUMBER = "24266565050";
  window.STAR_WA_NUMBER = WA_NUMBER;
  window.buildWhatsAppLink = function(message){
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(message);
  };

  var leadForm = document.getElementById('lead-form');
  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var data = new FormData(leadForm);
      var nom = data.get('nom') || '';
      var contact = data.get('contact') || '';
      var service = data.get('service') || '';
      var budget = data.get('budget') || '';
      var msg = data.get('message') || '';
      var text = "Bonjour STAR ENTREPRISE ✨\n" +
        "Je suis " + nom + ".\n" +
        (service ? "Projet : " + service + "\n" : "") +
        (budget ? "Budget estimé : " + budget + "\n" : "") +
        (contact ? "Mon contact : " + contact + "\n" : "") +
        (msg ? "\nDétails : " + msg : "");
      window.open(window.buildWhatsAppLink(text), "_blank");
      var note = document.getElementById('lead-note');
      if(note){ note.textContent = "Message prêt ✔ Ouverture de WhatsApp… Si rien ne s'ouvre, contactez-nous directement au +242 06 656 50 50."; }
      leadForm.reset();
    });
  }

  // Newsletter (front-end only, stores locally)
  var newsForm = document.getElementById('news-form');
  if(newsForm){
    newsForm.addEventListener('submit', function(e){
      e.preventDefault();
      var input = newsForm.querySelector('input[type=email]');
      var note = document.getElementById('news-note');
      if(input && input.value){
        if(note) note.textContent = "Merci ! Vous recevrez nos actualités très bientôt. ✨";
        newsForm.reset();
      }
    });
  }

  // Current year
  document.querySelectorAll('.year').forEach(function(el){ el.textContent = new Date().getFullYear(); });

})();
