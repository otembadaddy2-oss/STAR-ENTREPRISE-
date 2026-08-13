/* STAR ENTREPRISE — Premium interaction & motion layer.
   Additive: targets existing shared selectors (.card, .btn-primary, .hero, ...),
   no per-page markup required. Safe no-ops if elements are absent. */
(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };

  /* ---------- Scroll progress bar ---------- */
  var bar = document.createElement("div");
  bar.id = "se-progress";
  document.body.appendChild(bar);
  var ticking = false;
  function updateProgress() {
    var h = document.documentElement;
    var scrolled = h.scrollTop || document.body.scrollTop;
    var max = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
    bar.style.width = (max > 0 ? Math.min(100, (scrolled / max) * 100) : 0) + "%";
    ticking = false;
  }
  document.addEventListener("scroll", function () {
    if (!ticking) { raf(updateProgress); ticking = true; }
  }, { passive: true });
  updateProgress();

  /* ---------- Ambient aurora backdrop (hero + CTA bands) ---------- */
  if (!reduced) {
    var auroraHosts = document.querySelectorAll(".hero, .cta-band");
    auroraHosts.forEach(function (host) {
      if (host.querySelector(".se-aurora")) return;
      var pos = getComputedStyle(host).position;
      if (pos === "static") host.style.position = "relative";
      var aurora = document.createElement("div");
      aurora.className = "se-aurora";
      aurora.innerHTML = "<span></span><span></span><span></span>";
      host.insertBefore(aurora, host.firstChild);
    });
  }

  /* ---------- Grain overlay ---------- */
  var grain = document.createElement("div");
  grain.className = "se-grain";
  document.body.appendChild(grain);

  /* ---------- Hero cursor spotlight ---------- */
  var hero = document.querySelector(".hero");
  if (hero && fine && !reduced) {
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--se-mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      hero.style.setProperty("--se-my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  }

  /* ---------- Hero visual parallax on scroll ---------- */
  var heroVisual = document.querySelector(".hero-visual");
  if (heroVisual && !reduced) {
    var pTicking = false;
    function parallax() {
      var y = window.scrollY || 0;
      heroVisual.style.transform = "translateY(" + Math.min(y * 0.18, 90) + "px)";
      pTicking = false;
    }
    document.addEventListener("scroll", function () {
      if (!pTicking) { raf(parallax); pTicking = true; }
    }, { passive: true });
  }

  /* ---------- Floating diamond motes around the hero orbit ---------- */
  var orbit = document.querySelector(".diamond-orbit");
  if (orbit && !reduced) {
    for (var m = 0; m < 8; m++) {
      var mote = document.createElement("span");
      mote.className = "se-mote";
      var size = 3 + Math.random() * 5;
      mote.style.width = size + "px";
      mote.style.height = size + "px";
      mote.style.left = (10 + Math.random() * 80) + "%";
      mote.style.top = (20 + Math.random() * 70) + "%";
      mote.style.setProperty("--mx", (Math.random() * 60 - 30) + "px");
      mote.style.animationDuration = (5 + Math.random() * 5) + "s";
      mote.style.animationDelay = (Math.random() * 6) + "s";
      orbit.appendChild(mote);
    }
  }

  /* ---------- Shine sweep on premium surfaces ---------- */
  var CARD_SEL = ".card, .plan-card, .work-card, .testi-card, .eco-card, .diamond-core, .svc-card, .showreel-card, .joy-card, .founder-card, .help-card, .contact-card, .cat-card-placeholder";
  document.querySelectorAll(CARD_SEL).forEach(function (el) {
    el.classList.add("se-shine");
  });

  /* ---------- 3D tilt on cards ---------- */
  if (fine && !reduced) {
    var tiltEls = document.querySelectorAll(CARD_SEL + ", .process-step");
    tiltEls.forEach(function (el) {
      el.classList.add("se-tilt");
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(900px) rotateX(" + (py * -7) + "deg) rotateY(" + (px * 7) + "deg) translateZ(0)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
      });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  var CTA_SEL = ".btn-primary, .btn-whatsapp, .nav-cta, .btn-gold, .btn-navy, .btn-wa";
  if (fine && !reduced) {
    document.querySelectorAll(CTA_SEL).forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var mx = (e.clientX - r.left - r.width / 2) * 0.28;
        var my = (e.clientY - r.top - r.height / 2) * 0.35;
        btn.style.transform = "translate(" + mx + "px," + my + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "translate(0,0)";
      });
    });
  }

  /* ---------- Sparkle burst on CTA click ---------- */
  function burstSparks(x, y) {
    if (reduced) return;
    for (var i = 0; i < 10; i++) {
      var s = document.createElement("span");
      s.className = "se-spark";
      var angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      var dist = 34 + Math.random() * 30;
      s.style.left = x + "px";
      s.style.top = y + "px";
      s.style.setProperty("--sx", Math.cos(angle) * dist + "px");
      s.style.setProperty("--sy", Math.sin(angle) * dist + "px");
      s.style.background = i % 3 === 0 ? "#8b6bff" : i % 3 === 1 ? "#2fe0e0" : "#e8c368";
      document.body.appendChild(s);
      (function (node) { setTimeout(function () { node.remove(); }, 750); })(s);
    }
  }
  document.querySelectorAll(CTA_SEL).forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      burstSparks(e.clientX, e.clientY);
    });
  });

  /* ---------- Custom cursor (desktop only) ---------- */
  if (fine && !reduced) {
    document.documentElement.classList.add("se-cursor-on");
    var dot = document.createElement("div");
    dot.id = "se-cursor-dot";
    var ring = document.createElement("div");
    ring.id = "se-cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
      dot.classList.remove("se-cursor-hide");
      ring.classList.remove("se-cursor-hide");
    });
    document.addEventListener("mouseleave", function () {
      dot.classList.add("se-cursor-hide");
      ring.classList.add("se-cursor-hide");
    });
    (function follow() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      raf(follow);
    })();

    document.querySelectorAll("a, button, .btn, input, textarea, select, " + CARD_SEL).forEach(function (el) {
      el.addEventListener("mouseenter", function () { ring.classList.add("se-cursor-active"); });
      el.addEventListener("mouseleave", function () { ring.classList.remove("se-cursor-active"); });
    });
  }
})();
