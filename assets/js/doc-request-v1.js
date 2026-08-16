!function () {
  "use strict";

  // Système générique de demande de document (fiche technique, devis,
  // dossier de présentation…), réutilisable sur n'importe quelle page et
  // pour n'importe quelle filiale via l'attribut data-doc-request.
  //
  // Usage : <button data-doc-request="Fiche technique — SOS DOC"
  //                  data-doc-type="Fiche technique">Demander</button>
  // data-doc-type est optionnel (affiché tel quel, sinon déduit du texte).

  function lang() {
    if (window.STAR_LANG) return window.STAR_LANG;
    try {
      return localStorage.getItem("star_lang") || "fr";
    } catch (e) {
      return "fr";
    }
  }

  var T = {
    fr: {
      title: "Demander ce document",
      lead: "Indiquez vos coordonnées, nous vous envoyons",
      docLabel: "Document demandé",
      name: "Votre nom",
      contact: "Téléphone ou email",
      message: "Un détail à préciser ? (optionnel)",
      send: "Envoyer la demande",
      sending: "Envoi…",
      okTitle: "Demande envoyée ✔",
      okLead: "Nous revenons vers vous très vite. Vous pouvez aussi confirmer sur WhatsApp pour aller plus vite.",
      waBtn: "💬 Confirmer sur WhatsApp",
      closeBtn: "Fermer",
      errMsg: "Merci de renseigner votre nom et un moyen de vous contacter.",
      waText: function (label, nom) {
        return "Bonjour STAR ENTREPRISE ✨\nJe suis " + nom + ".\nJe souhaite recevoir : " + label + ".";
      }
    },
    en: {
      title: "Request this document",
      lead: "Leave your details and we'll send you",
      docLabel: "Requested document",
      name: "Your name",
      contact: "Phone or email",
      message: "Anything to add? (optional)",
      send: "Send request",
      sending: "Sending…",
      okTitle: "Request sent ✔",
      okLead: "We'll get back to you shortly. You can also confirm on WhatsApp to speed things up.",
      waBtn: "💬 Confirm on WhatsApp",
      closeBtn: "Close",
      errMsg: "Please enter your name and a way to reach you.",
      waText: function (label, nom) {
        return "Hello STAR ENTREPRISE ✨\nI'm " + nom + ".\nI would like to receive: " + label + ".";
      }
    }
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function waLink(text) {
    var num = window.STAR_WA_NUMBER || "242066565050";
    return window.buildWhatsAppLink ? window.buildWhatsAppLink(text) : "https://wa.me/" + num + "?text=" + encodeURIComponent(text);
  }

  var modal, currentLabel;

  function buildModal() {
    var t = T[lang()] || T.fr;
    var el = document.createElement("div");
    el.className = "docreq-overlay";
    el.innerHTML =
      '<div class="docreq-modal" role="dialog" aria-modal="true">' +
        '<button type="button" class="docreq-close" aria-label="' + esc(t.closeBtn) + '">&times;</button>' +
        '<div class="docreq-body">' +
          '<h3 class="docreq-title">' + esc(t.title) + "</h3>" +
          '<p class="docreq-lead">' + esc(t.lead) + " <b class=\"docreq-doclabel\"></b></p>" +
          '<form class="docreq-form">' +
            '<div class="field"><label>' + esc(t.name) + '</label><input type="text" name="nom" required></div>' +
            '<div class="field"><label>' + esc(t.contact) + '</label><input type="text" name="contact" required></div>' +
            '<div class="field"><label>' + esc(t.message) + '</label><textarea name="message" rows="2"></textarea></div>' +
            '<p class="docreq-err" hidden></p>' +
            '<button type="submit" class="btn btn-primary btn-block">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.8-1.5c1.5.8 3.3 1.3 5.2 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>' +
              '<span class="docreq-sendlabel">' + esc(t.send) + "</span>" +
            "</button>" +
          "</form>" +
          '<div class="docreq-ok" hidden>' +
            '<div class="docreq-ok-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg></div>' +
            '<h4>' + esc(t.okTitle) + "</h4>" +
            '<p>' + esc(t.okLead) + "</p>" +
            '<a class="btn btn-whatsapp docreq-wa" target="_blank" rel="noopener">' + esc(t.waBtn) + "</a>" +
            '<button type="button" class="btn btn-ghost docreq-close2">' + esc(t.closeBtn) + "</button>" +
          "</div>" +
        "</div>" +
      "</div>";
    document.body.appendChild(el);
    return el;
  }

  function open(label, type) {
    if (!modal) modal = buildModal();
    currentLabel = label;

    modal.classList.add("open");
    document.body.classList.add("docreq-lock");

    var docLabelEl = modal.querySelector(".docreq-doclabel");
    docLabelEl.textContent = type ? type + " — " + label : label;

    var form = modal.querySelector(".docreq-form");
    var ok = modal.querySelector(".docreq-ok");
    form.hidden = false;
    ok.hidden = true;
    form.reset();
    modal.querySelector(".docreq-err").hidden = true;

    var nomInput = form.querySelector('[name="nom"]');
    setTimeout(function () { nomInput && nomInput.focus(); }, 80);
  }

  function close() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.classList.remove("docreq-lock");
  }

  function isEmail(v) {
    return /@/.test(v);
  }

  function submit(form) {
    var t = T[lang()] || T.fr;
    var data = new FormData(form);
    var nom = (data.get("nom") || "").trim();
    var contact = (data.get("contact") || "").trim();
    var message = (data.get("message") || "").trim();
    var errEl = modal.querySelector(".docreq-err");

    if (!nom || !contact) {
      errEl.textContent = t.errMsg;
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;

    var btn = form.querySelector('button[type="submit"]');
    var sendLabel = form.querySelector(".docreq-sendlabel");
    btn.disabled = true;
    sendLabel.textContent = t.sending;

    var payload = {
      type: "document",
      nom: nom,
      email: isEmail(contact) ? contact : "",
      telephone: isEmail(contact) ? "" : contact,
      service: currentLabel,
      message: "Document demandé : " + currentLabel + (message ? "\n" + message : "")
    };

    fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
      .catch(function () {})
      .then(function () {
        showOk(nom);
      });
  }

  function showOk(nom) {
    var t = T[lang()] || T.fr;
    modal.querySelector(".docreq-form").hidden = true;
    var ok = modal.querySelector(".docreq-ok");
    ok.hidden = false;
    var waBtn = ok.querySelector(".docreq-wa");
    waBtn.href = waLink(t.waText(currentLabel, nom));
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-doc-request]");
    if (trigger) {
      e.preventDefault();
      open(trigger.getAttribute("data-doc-request"), trigger.getAttribute("data-doc-type") || "");
      return;
    }
    if (!modal) return;
    if (e.target.closest(".docreq-close") || e.target.closest(".docreq-close2")) {
      close();
      return;
    }
    if (e.target === modal) close();
  });

  document.addEventListener("submit", function (e) {
    if (!modal || !e.target.classList.contains("docreq-form")) return;
    e.preventDefault();
    submit(e.target);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && modal.classList.contains("open")) close();
  });
}();
