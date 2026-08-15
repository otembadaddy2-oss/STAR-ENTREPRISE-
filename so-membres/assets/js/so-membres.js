/* S.O — Gestion des membres. Backend partagé du groupe STAR ENTREPRISE (Postgres + connexion). */
(function () {
  "use strict";

  var AUTH_KEY = "so_auth_v1";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------------------------------------------------------------- */
  /*  Icônes (traits, cohérentes avec le reste du site STAR ENTREPRISE) */
  /* ---------------------------------------------------------------- */
  var ICON = {
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>',
    mapPin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'
  };
  function icon(name, size) {
    size = size || 16;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICON[name] || "") + "</svg>";
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function emptyMembre() {
    return {
      id: null, dateEnregistrement: todayISO(),
      nom: "", prenom: "", adresse: "", email: "",
      dateNaissance: "", lieuNaissance: "", ville: "", pays: "",
      fonction: "", cv: "", photo: null
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Authentification — connexion unique pour le groupe STAR ENTREPRISE */
  /* ---------------------------------------------------------------- */
  function getAuth() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function setAuth(data) {
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function clearAuth() {
    try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
  }

  var appEl = document.getElementById("soApp");
  var authRoot = document.getElementById("soAuthRoot");

  function renderLogin(errorMsg) {
    appEl.style.display = "none";
    authRoot.innerHTML =
      '<div class="so-login-wrap">' +
        '<div class="so-login-card card">' +
          '<div class="so-login-brand">' +
            '<img src="assets/img/logo-so.jpg" alt="S.O">' +
            '<div><div class="nm so-display">S.O</div><div class="tg so-mono">Gestion des membres</div></div>' +
          "</div>" +
          '<h1 class="so-login-title so-display">' + icon("lock", 18) + " Connexion au groupe</h1>" +
          '<p class="so-login-sub so-sans">Identifiant et mot de passe STAR ENTREPRISE.</p>' +
          (errorMsg ? '<div class="so-login-error so-sans">' + esc(errorMsg) + "</div>" : "") +
          '<label class="so-field"><span class="lbl so-sans">Identifiant</span><input class="so-input so-sans" id="loginUser" autocomplete="username"></label>' +
          '<label class="so-field"><span class="lbl so-sans">Mot de passe</span>' +
            '<span style="position:relative;display:block">' +
              '<input class="so-input so-sans" type="password" id="loginPass" autocomplete="current-password" style="padding-right:66px">' +
              '<button type="button" id="loginPassToggle" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:7px;color:#E8C77C;font-size:11px;padding:6px 10px;cursor:pointer">Afficher</button>' +
            "</span>" +
          "</label>" +
          '<button class="so-btn btn-gold so-login-btn" id="loginSubmit">' + icon("lock", 15) + " Se connecter</button>" +
        "</div>" +
      "</div>";

    var userInput = document.getElementById("loginUser");
    var passInput = document.getElementById("loginPass");
    var submitBtn = document.getElementById("loginSubmit");
    var passToggle = document.getElementById("loginPassToggle");
    passToggle.addEventListener("click", function () {
      var showing = passInput.type === "text";
      passInput.type = showing ? "password" : "text";
      passToggle.textContent = showing ? "Afficher" : "Cacher";
    });

    function doLogin() {
      var username = userInput.value.trim();
      var password = passInput.value;
      if (!username || !password) return;
      submitBtn.disabled = true;
      submitBtn.textContent = "Connexion...";
      fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "login", username: username, password: password })
      })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) {
          if (!res.ok) {
            renderLogin(res.data.error || "Connexion impossible.");
            return;
          }
          setAuth({ token: res.data.token, account: res.data.account });
          boot();
        })
        .catch(function () { renderLogin("Connexion impossible — vérifiez votre connexion internet."); });
    }

    submitBtn.addEventListener("click", doLogin);
    [userInput, passInput].forEach(function (el) {
      el.addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
    });
    userInput.focus();
  }

  /* ---------------------------------------------------------------- */
  /*  Appels API — base de données partagée du groupe (fini localStorage) */
  /* ---------------------------------------------------------------- */
  function api(path, opts) {
    opts = opts || {};
    var auth = getAuth();
    var headers = Object.assign({}, opts.headers || {});
    if (auth && auth.token) headers.Authorization = "Bearer " + auth.token;
    if (opts.body && !headers["content-type"]) headers["content-type"] = "application/json";
    return fetch(path, { method: opts.method || "GET", headers: headers, body: opts.body })
      .then(function (r) {
        if (r.status === 401) {
          clearAuth();
          renderLogin("Session expirée — reconnectez-vous.");
          throw new Error("unauthorized");
        }
        return r.json().then(function (data) { return { ok: r.ok, data: data }; });
      });
  }

  var state = {
    membres: [],
    view: "liste",
    editing: null,
    query: "",
    anneeFiltre: "toutes",
    mobileOpen: false,
    loading: true
  };

  function upsertLocal(m) {
    var exists = state.membres.some(function (x) { return x.id === m.id; });
    state.membres = exists
      ? state.membres.map(function (x) { return x.id === m.id ? m : x; })
      : state.membres.concat([m]);
  }
  function removeLocal(id) {
    state.membres = state.membres.filter(function (m) { return m.id !== id; });
  }

  /* ---------------------------------------------------------------- */
  /*  UI utilitaires                                                   */
  /* ---------------------------------------------------------------- */
  var toastEl = document.getElementById("soToast");
  var toastTimer = null;
  function toast(msg) {
    toastEl.innerHTML = icon("check", 15) + "<span>" + esc(msg) + "</span>";
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2400);
  }

  var modalRoot = document.getElementById("soModalRoot");
  function confirmDelete(m) {
    modalRoot.innerHTML =
      '<div class="so-modal-scrim" id="soScrimModal">' +
        '<div class="card so-modal" id="soModalBox">' +
          "<p>Supprimer la fiche de <b>" + esc(m.prenom + " " + m.nom) + "</b> ? Cette action est définitive.</p>" +
          '<div class="row">' +
            '<button class="so-btn btn-ghost" id="soCancelDel">Annuler</button>' +
            '<button class="so-btn btn-danger" id="soConfirmDel">' + icon("trash", 14) + " Supprimer</button>" +
          "</div>" +
        "</div>" +
      "</div>";
    document.getElementById("soScrimModal").addEventListener("click", closeModal);
    document.getElementById("soModalBox").addEventListener("click", function (e) { e.stopPropagation(); });
    document.getElementById("soCancelDel").addEventListener("click", closeModal);
    document.getElementById("soConfirmDel").addEventListener("click", function () {
      api("/api/members?id=" + encodeURIComponent(m.id), { method: "DELETE" }).then(function (res) {
        if (!res.ok) { toast(res.data.error || "Suppression impossible."); return; }
        removeLocal(m.id);
        closeModal();
        toast("Fiche supprimée.");
        renderView();
      });
    });
  }
  function closeModal() { modalRoot.innerHTML = ""; }

  /* ---------------------------------------------------------------- */
  /*  Photo picker — redimensionnée en carré 300px avant stockage      */
  /* ---------------------------------------------------------------- */
  function handlePhotoFile(file, onDone) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var size = 300;
        var canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext("2d");
        var ratio = Math.max(size / img.width, size / img.height);
        var w = img.width * ratio, h = img.height * ratio;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        onDone(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------------------------------------------------------------- */
  /*  Export Excel (SheetJS, bundlé localement — fonctionne hors-ligne) */
  /* ---------------------------------------------------------------- */
  function exportToExcel(list) {
    if (!window.XLSX) { toast("Export Excel indisponible."); return; }
    var data = list.map(function (m) {
      return {
        "Nom": m.nom, "Prénom": m.prenom, "Adresse": m.adresse, "E-mail": m.email,
        "Date de naissance": m.dateNaissance, "Lieu de naissance": m.lieuNaissance,
        "Ville": m.ville, "Pays": m.pays, "Fonction": m.fonction, "CV": m.cv,
        "Date d'enregistrement": m.dateEnregistrement
      };
    });
    var ws = XLSX.utils.json_to_sheet(data);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Membres");
    XLSX.writeFile(wb, "SO-Membres-" + todayISO() + ".xlsx");
    toast("Export Excel généré.");
  }

  /* ---------------------------------------------------------------- */
  /*  Rendu — Topbar                                                    */
  /* ---------------------------------------------------------------- */
  var titleEl = document.getElementById("soTitle");
  var subEl = document.getElementById("soSubtitle");
  var actionsEl = document.getElementById("soTopbarActions");
  function setTopbar(title, subtitle, rightHTML) {
    titleEl.textContent = title;
    subEl.textContent = subtitle || "";
    actionsEl.innerHTML = rightHTML || "";
  }

  /* ---------------------------------------------------------------- */
  /*  Rendu — Liste des membres                                        */
  /* ---------------------------------------------------------------- */
  var viewEl = document.getElementById("soView");

  function renderListView() {
    if (state.loading) {
      setTopbar("Membres", "Chargement...", "");
      viewEl.innerHTML = '<div class="so-view so-empty card"><div class="ico">' + icon("users", 26) + '</div><h3>Chargement des fiches...</h3><p>Connexion à la base du groupe STAR ENTREPRISE.</p></div>';
      return;
    }

    var years = Array.from(new Set(state.membres.map(function (m) {
      return (m.dateEnregistrement || "").slice(0, 4);
    }).filter(Boolean))).sort().reverse();

    var filtered = state.membres
      .filter(function (m) { return state.anneeFiltre === "toutes" || (m.dateEnregistrement || "").indexOf(state.anneeFiltre) === 0; })
      .filter(function (m) {
        var q = state.query.toLowerCase();
        if (!q) return true;
        return (m.nom + " " + m.prenom + " " + m.fonction + " " + m.ville).toLowerCase().indexOf(q) !== -1;
      })
      .sort(function (a, b) { return (b.dateEnregistrement || "").localeCompare(a.dateEnregistrement || ""); });

    setTopbar("Membres", state.membres.length + (state.membres.length > 1 ? " fiches enregistrées" : " fiche enregistrée"),
      '<button class="so-btn btn-ghost so-btn-sm" id="soExportBtn" ' + (filtered.length === 0 ? "disabled" : "") + ">" + icon("download", 14) + " Excel</button>" +
      '<button class="so-btn btn-gold so-btn-sm" id="soNewBtnTop">' + icon("userPlus", 14) + " Nouvelle fiche</button>"
    );

    if (state.membres.length === 0) {
      viewEl.innerHTML =
        '<div class="so-view so-empty card">' +
          '<div class="ico">' + icon("users", 26) + "</div>" +
          "<h3>Aucune fiche pour le moment</h3>" +
          "<p>Ajoutez la première fiche d'adhésion pour commencer à organiser vos membres.</p>" +
          '<button class="so-btn btn-gold" id="soEmptyNewBtn">' + icon("userPlus", 16) + " Nouvelle fiche</button>" +
        "</div>";
      bindTopbarActions(filtered);
      document.getElementById("soEmptyNewBtn").addEventListener("click", function () { openForm(null); });
      enhance(viewEl);
      return;
    }

    var stats =
      '<div class="so-stats-row">' +
        '<div class="so-stat-chip card"><div class="n so-display">' + state.membres.length + '</div><div class="l">Total</div></div>' +
        '<div class="so-stat-chip card"><div class="n so-display">' + years.length + '</div><div class="l">Années couvertes</div></div>' +
        '<div class="so-stat-chip card"><div class="n so-display">' + state.membres.filter(function (m) { return (m.dateEnregistrement || "").indexOf(String(new Date().getFullYear())) === 0; }).length + '</div><div class="l">Nouveaux ' + new Date().getFullYear() + '</div></div>' +
      "</div>";

    var toolbar =
      '<div class="so-toolbar">' +
        '<div class="so-search">' + icon("search", 15) +
          '<input class="so-input so-sans" id="soSearchInput" placeholder="Rechercher un nom, une fonction, une ville..." value="' + esc(state.query) + '">' +
        "</div>" +
      "</div>";

    var yearRow = '<div class="so-year-row">' +
      '<button class="so-pill so-sans' + (state.anneeFiltre === "toutes" ? " active" : "") + '" data-year="toutes">Toutes les années</button>' +
      years.map(function (y) {
        return '<button class="so-pill so-sans' + (state.anneeFiltre === y ? " active" : "") + '" data-year="' + y + '">' + y + "</button>";
      }).join("") +
      "</div>";

    var list;
    if (filtered.length === 0) {
      list = '<div class="so-view so-empty card"><div class="ico">' + icon("search", 24) + '</div><h3>Aucun résultat</h3><p>Essayez un autre nom, une autre fonction ou une autre année.</p></div>';
    } else {
      list = '<div class="so-list">' + filtered.map(function (m) {
        return (
          '<div class="so-member-row card" data-id="' + m.id + '">' +
            '<button class="so-member-main" data-edit="' + m.id + '">' +
              '<span class="avatar">' + (m.photo ? '<img src="' + m.photo + '" alt="">' : icon("users", 18)) + "</span>" +
              '<span class="so-member-info">' +
                '<span class="nm so-sans">' + esc(m.prenom) + " " + esc(m.nom) + "</span>" +
                '<span class="meta so-sans">' + esc(m.fonction || "Membre") + (m.ville ? " · " + esc(m.ville) : "") + "</span>" +
              "</span>" +
            "</button>" +
            '<span class="right">' +
              '<span class="date">' + esc(formatDateFr(m.dateEnregistrement)) + "</span>" +
              '<button class="so-icon-btn" data-del="' + m.id + '" aria-label="Supprimer">' + icon("trash", 15) + "</button>" +
            "</span>" +
          "</div>"
        );
      }).join("") + "</div>";
    }

    viewEl.innerHTML = '<div class="so-view">' + stats + toolbar + yearRow + list + "</div>";

    bindTopbarActions(filtered);
    document.getElementById("soSearchInput").addEventListener("input", function (e) {
      state.query = e.target.value;
      renderView();
      var input = document.getElementById("soSearchInput");
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    });
    viewEl.querySelectorAll("[data-year]").forEach(function (btn) {
      btn.addEventListener("click", function () { state.anneeFiltre = btn.getAttribute("data-year"); renderView(); });
    });
    viewEl.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var m = state.membres.find(function (x) { return x.id === btn.getAttribute("data-edit"); });
        openForm(m);
      });
    });
    viewEl.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var m = state.membres.find(function (x) { return x.id === btn.getAttribute("data-del"); });
        confirmDelete(m);
      });
    });
    enhance(viewEl);
  }

  function bindTopbarActions(filtered) {
    var exp = document.getElementById("soExportBtn");
    if (exp) exp.addEventListener("click", function () { exportToExcel(filtered); });
    var nw = document.getElementById("soNewBtnTop");
    if (nw) nw.addEventListener("click", function () { openForm(null); });
    enhance(actionsEl);
  }

  function formatDateFr(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  /* ---------------------------------------------------------------- */
  /*  Rendu — Formulaire (nouvelle fiche / modification)                */
  /* ---------------------------------------------------------------- */
  function openForm(existing) {
    state.editing = existing || null;
    state.view = "nouveau";
    renderView();
  }

  var currentForm = null; // objet en cours d'édition

  function field(label, iconName, inputHTML, required) {
    return (
      '<label class="so-field">' +
        '<span class="lbl so-sans">' + (iconName ? icon(iconName, 12) : "") + " " + esc(label) + (required ? '<span class="req"> *</span>' : "") + "</span>" +
        inputHTML +
      "</label>"
    );
  }

  function renderFormView() {
    currentForm = currentForm && currentForm.__id === (state.editing ? state.editing.id : "new")
      ? currentForm
      : Object.assign({}, state.editing || emptyMembre(), { __id: state.editing ? state.editing.id : "new" });

    var f = currentForm;
    var canSave = f.nom.trim() && f.prenom.trim();

    setTopbar(state.editing ? "Modifier la fiche" : "Nouvelle fiche d'adhésion", "Les champs marqués * sont obligatoires",
      '<button class="so-btn btn-ghost so-btn-sm" id="soCancelForm">Annuler</button>' +
      '<button class="so-btn btn-gold so-btn-sm" id="soSaveForm" ' + (canSave ? "" : "disabled") + ">" + icon("check", 14) + " Enregistrer</button>"
    );

    viewEl.innerHTML =
      '<div class="so-view">' +
        '<div class="so-panel card">' +
          '<div class="so-photo-picker">' +
            '<span class="so-photo-preview">' + (f.photo ? '<img src="' + f.photo + '" alt="">' : icon("camera", 26)) + "</span>" +
            '<div class="so-photo-actions">' +
              '<label class="so-photo-btn so-sans">' + icon("camera", 14) + (f.photo ? " Changer la photo" : " Ajouter une photo") +
                '<input type="file" accept="image/*" id="soPhotoInput" style="display:none">' +
              "</label>" +
              (f.photo ? '<button class="so-photo-remove so-sans" id="soPhotoRemove">Retirer la photo</button>' : "") +
            "</div>" +
          "</div>" +

          '<div class="so-grid-2">' +
            field("Nom", null, '<input class="so-input so-sans" id="f_nom" value="' + esc(f.nom) + '">', true) +
            field("Prénom", null, '<input class="so-input so-sans" id="f_prenom" value="' + esc(f.prenom) + '">', true) +
          "</div>" +

          field("Adresse", "mapPin", '<input class="so-input so-sans" id="f_adresse" placeholder="Quartier, avenue..." value="' + esc(f.adresse) + '">') +
          field("E-mail (facultatif)", null, '<input type="email" class="so-input so-sans" id="f_email" value="' + esc(f.email) + '">') +

          '<div class="so-grid-2">' +
            field("Date de naissance", "calendar", '<input type="date" class="so-input so-sans" id="f_dateNaissance" value="' + esc(f.dateNaissance) + '">') +
            field("Lieu de naissance", null, '<input class="so-input so-sans" id="f_lieuNaissance" value="' + esc(f.lieuNaissance) + '">') +
          "</div>" +
          '<div class="so-grid-2">' +
            field("Ville", "mapPin", '<input class="so-input so-sans" id="f_ville" value="' + esc(f.ville) + '">') +
            field("Pays", null, '<input class="so-input so-sans" id="f_pays" value="' + esc(f.pays) + '">') +
          "</div>" +

          field("Fonction", "briefcase", '<input class="so-input so-sans" id="f_fonction" placeholder="Ex. Membre, Responsable local..." value="' + esc(f.fonction) + '">') +
          field("CV (facultatif)", "fileText", '<textarea class="so-textarea so-sans" id="f_cv" rows="2" placeholder="Résumé du parcours, ou lien vers un CV">' + esc(f.cv) + "</textarea>") +
          field("Date d'enregistrement", null, '<input type="date" class="so-input so-sans" id="f_dateEnregistrement" value="' + esc(f.dateEnregistrement) + '">') +
        "</div>" +
      "</div>";

    ["nom", "prenom", "adresse", "email", "dateNaissance", "lieuNaissance", "ville", "pays", "fonction", "cv", "dateEnregistrement"].forEach(function (key) {
      var el = document.getElementById("f_" + key);
      el.addEventListener("input", function () {
        currentForm[key] = el.value;
        var save = document.getElementById("soSaveForm");
        if (save) save.disabled = !(currentForm.nom.trim() && currentForm.prenom.trim());
      });
    });

    document.getElementById("soPhotoInput").addEventListener("change", function (e) {
      handlePhotoFile(e.target.files[0], function (dataUrl) {
        currentForm.photo = dataUrl;
        renderFormView();
      });
    });
    var rm = document.getElementById("soPhotoRemove");
    if (rm) rm.addEventListener("click", function () { currentForm.photo = null; renderFormView(); });

    document.getElementById("soCancelForm").addEventListener("click", function () {
      currentForm = null;
      state.view = "liste"; state.editing = null;
      renderView();
    });
    document.getElementById("soSaveForm").addEventListener("click", function () {
      if (!(currentForm.nom.trim() && currentForm.prenom.trim())) return;
      var payload = Object.assign({}, currentForm);
      delete payload.__id;
      var saveBtn = document.getElementById("soSaveForm");
      saveBtn.disabled = true;

      var isEdit = !!state.editing;
      var req = isEdit
        ? api("/api/members", { method: "PUT", body: JSON.stringify(Object.assign({}, payload, { id: state.editing.id })) })
        : api("/api/members", { method: "POST", body: JSON.stringify(payload) });

      req.then(function (res) {
        if (!res.ok) { toast(res.data.error || "Enregistrement impossible."); saveBtn.disabled = false; return; }
        upsertLocal(res.data.membre);
        currentForm = null;
        toast(isEdit ? "Fiche mise à jour." : "Fiche enregistrée.");
        state.view = "liste"; state.editing = null;
        renderView();
      });
    });

    enhance(viewEl);
    enhance(actionsEl);
  }

  /* ---------------------------------------------------------------- */
  /*  Dispatch                                                          */
  /* ---------------------------------------------------------------- */
  function renderView() {
    if (state.view === "nouveau") renderFormView();
    else renderListView();
    document.querySelectorAll(".so-nav button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === state.view);
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Navigation / sidebar mobile                                       */
  /* ---------------------------------------------------------------- */
  var sidebar = document.getElementById("soSidebar");
  var scrim = document.getElementById("soScrim");
  function setSidebarOpen(open) {
    state.mobileOpen = open;
    sidebar.classList.toggle("open", open);
    scrim.classList.toggle("open", open);
  }
  document.getElementById("soMenuBtn").addEventListener("click", function () { setSidebarOpen(!state.mobileOpen); });
  scrim.addEventListener("click", function () { setSidebarOpen(false); });
  document.querySelectorAll(".so-nav button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var v = btn.getAttribute("data-view");
      if (v === "nouveau") { openForm(null); } else { state.view = v; state.editing = null; renderView(); }
      setSidebarOpen(false);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Compte connecté + déconnexion                                     */
  /* ---------------------------------------------------------------- */
  function renderAccountFoot(account) {
    var foot = document.querySelector(".so-sidebar-foot");
    if (!foot) return;
    foot.innerHTML =
      '<div class="so-account so-sans">' +
        '<div class="who"><span class="dot"></span>' + esc(account.displayName) + "</div>" +
        '<button class="so-logout" id="soLogoutBtn">' + icon("logOut", 13) + " Déconnexion</button>" +
      "</div>";
    document.getElementById("soLogoutBtn").addEventListener("click", function () {
      clearAuth();
      state.membres = []; state.loading = true;
      renderLogin();
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Effets premium locaux pour le contenu généré dynamiquement        */
  /*  (le scan global de effects-v1.js ne voit que le DOM au chargement) */
  /* ---------------------------------------------------------------- */
  function enhance(root) {
    if (!root) return;
    root.querySelectorAll(".card, .so-member-row, .so-panel, .so-stat-chip").forEach(function (el) {
      el.classList.add("se-shine");
      if (fine && !reduced && !el.__soTilt) {
        el.__soTilt = true;
        el.classList.add("se-tilt");
        el.addEventListener("mousemove", function (e) {
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = "perspective(900px) rotateX(" + (py * -4) + "deg) rotateY(" + (px * 4) + "deg)";
        });
        el.addEventListener("mouseleave", function () { el.style.transform = "perspective(900px) rotateX(0) rotateY(0)"; });
      }
    });
    root.querySelectorAll(".btn-gold").forEach(function (btn) {
      if (fine && !reduced && !btn.__soMag) {
        btn.__soMag = true;
        btn.addEventListener("mousemove", function (e) {
          var r = btn.getBoundingClientRect();
          btn.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.22 + "px," + (e.clientY - r.top - r.height / 2) * 0.28 + "px)";
        });
        btn.addEventListener("mouseleave", function () { btn.style.transform = "translate(0,0)"; });
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Démarrage — vérifie la session puis charge les fiches partagées   */
  /* ---------------------------------------------------------------- */
  function boot() {
    var auth = getAuth();
    if (!auth || !auth.token) { renderLogin(); return; }

    authRoot.innerHTML = "";
    appEl.style.display = "";
    renderAccountFoot(auth.account);
    state.loading = true;
    renderView();

    api("/api/members").then(function (res) {
      state.loading = false;
      if (!res.ok) { toast(res.data.error || "Impossible de charger les fiches."); state.membres = []; renderView(); return; }
      state.membres = res.data.membres || [];
      renderView();
    }).catch(function () {});
  }

  boot();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
