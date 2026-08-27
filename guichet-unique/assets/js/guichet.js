"use strict";
/* ============================================================
   KINDIMBOU — Guichet unique de la République du Congo
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const API = "/api/guichet-auth";
const API_DEMANDES = "/api/guichet-demandes";

/* ---------------- Toasts ---------------- */
function toast(msg, kind = "", duration = 3200) {
  const wrap = $("#toastWrap");
  if (!wrap) return;
  const el = document.createElement("div");
  el.className = "toast" + (kind ? " " + kind : "");
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition = "opacity .3s ease, transform .3s ease";
    setTimeout(() => el.remove(), 320);
  }, duration);
}

/* ---------------- Splash ---------------- */
window.addEventListener("load", () => {
  const splash = $("#splash");
  if (splash) {
    setTimeout(() => splash.classList.add("hide"), 3400);
    splash.addEventListener("click", () => splash.classList.add("hide"));
  }
});

/* ---------------- Scroll reveal ---------------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealObserver.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);
function observeReveals(root = document) {
  $$(".reveal", root).forEach((el) => revealObserver.observe(el));
}

/* ============================================================
   DÉMARCHES — catalogue (contenu réel, sources officielles)
   ============================================================ */
const DEMARCHES = [
  {
    code: "KDB / 01", key: "entreprise-individuelle", cat: "creation", catLabel: "Création",
    title: "Entreprise individuelle",
    lede: "Préparez votre activité et vérifiez les pièces exigées avant le dépôt officiel.",
    pieces: ["Pièce d'identité (CNI, passeport ou carte de résident)", "Casier judiciaire ou déclaration sur l'honneur", "Justificatif de localisation de l'activité", "Formulaires OHADA requis"],
    portail: "https://www.acpce.cg",
  },
  {
    code: "KDB / 02", key: "creer-societe", cat: "creation", catLabel: "Création",
    title: "Créer une société",
    lede: "Orientez votre projet de SARL, SA ou autre forme vers les formalités adaptées.",
    pieces: ["Statuts de la société", "Pièces d'identité des associés et dirigeants", "Déclaration de régularité", "Justificatif du siège social"],
    portail: "https://www.acpce.cg",
  },
  {
    code: "KDB / 03", key: "succursale", cat: "creation", catLabel: "Création",
    title: "Succursale",
    lede: "Identifiez les pièces utiles à l'implantation d'une succursale en République du Congo.",
    pieces: ["Décision d'ouverture", "Actes de la société mère", "Pièce d'identité du représentant", "Adresse de la succursale"],
    portail: "https://www.acpce.cg",
  },
  {
    code: "KDB / 04", key: "modifier-entreprise", cat: "entreprise", catLabel: "Entreprise",
    title: "Modifier une entreprise",
    lede: "Centralisez les changements de dirigeant, siège, activité ou dénomination.",
    pieces: ["Procès-verbal de décision", "Actes mis à jour", "Ancien extrait RCCM", "Pièce d'identité du représentant"],
    portail: "https://www.acpce.cg",
  },
  {
    code: "KDB / 05", key: "niu-fiscalite", cat: "fiscalite", catLabel: "Fiscalité",
    title: "NIU & fiscalité",
    lede: "Préparez les informations nécessaires à l'identification fiscale de l'activité.",
    pieces: ["Extrait RCCM ou preuve de création", "Adresse de l'activité", "Pièce d'identité du responsable", "Coordonnées de contact"],
    portail: "https://www.acpce.cg",
  },
  {
    code: "KDB / 06", key: "cnss-personnel", cat: "social", catLabel: "Social",
    title: "CNSS & personnel",
    lede: "Anticipez les démarches sociales liées à l'employeur et à ses agents.",
    pieces: ["Pièce d'identité de l'employeur", "Extrait RCCM / NIU", "Liste du personnel", "Contrats ou données d'embauche"],
    portail: "https://www.acpce.cg",
  },
  {
    code: "KDB / 07", key: "foncier", cat: "foncier", catLabel: "Foncier",
    title: "Foncier & implantation",
    lede: "Clarifiez les prérequis d'un projet nécessitant terrain, permis ou implantation.",
    pieces: ["Plan de localisation", "Titre ou justificatif foncier", "Description du projet", "Coordonnées du promoteur"],
    portail: "https://www.entreprises.gouv.cg",
  },
  {
    code: "KDB / 08", key: "documents-modeles", cat: "ressources", catLabel: "Ressources",
    title: "Documents & modèles",
    lede: "Retrouvez une bibliothèque claire de formulaires, modèles et repères officiels.",
    pieces: ["Formulaires OHADA", "Modèles de déclarations", "Guides de préparation", "Liens vers les services compétents"],
    portail: "https://www.entreprises.gouv.cg",
  },
];

const CATS = [
  { key: "tout", label: "Tout" },
  { key: "creation", label: "Création" },
  { key: "entreprise", label: "Entreprise" },
  { key: "fiscalite", label: "Fiscalité" },
  { key: "social", label: "Social" },
  { key: "foncier", label: "Foncier" },
  { key: "ressources", label: "Ressources" },
];

let activeCat = "tout";
let activeSearch = "";
let currentDemarche = null;

function renderChips() {
  const wrap = $("#catChips");
  if (!wrap) return;
  wrap.innerHTML = CATS.map(
    (c) => `<button class="chip${c.key === activeCat ? " active" : ""}" data-cat="${c.key}">${c.label}</button>`
  ).join("");
  $$(".chip", wrap).forEach((chip) =>
    chip.addEventListener("click", () => {
      activeCat = chip.dataset.cat;
      renderChips();
      renderServiceGrid();
    })
  );
}

function iconFor(cat) {
  const icons = {
    creation: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    entreprise: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    fiscalite: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    social: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M16 4a3 3 0 0 1 0 6M22 21v-1a6 6 0 0 0-4.5-5.8"/></svg>',
    foncier: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    ressources: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z"/></svg>',
  };
  return icons[cat] || icons.entreprise;
}
function bgFor(cat) {
  const g = {
    creation: "linear-gradient(135deg,#c8942f,#8f6a1f)",
    entreprise: "linear-gradient(135deg,#3d5fc4,#233a80)",
    fiscalite: "linear-gradient(135deg,#2f7d4f,#1a4a2e)",
    social: "linear-gradient(135deg,#a06de0,#5f3a99)",
    foncier: "linear-gradient(135deg,#e07a3d,#a1481b)",
    ressources: "linear-gradient(135deg,#0c1936,#1c3466)",
  };
  return g[cat] || g.entreprise;
}

function renderServiceGrid() {
  const wrap = $("#svcGrid");
  if (!wrap) return;
  const q = activeSearch.trim().toLowerCase();
  const list = DEMARCHES.filter((d) => {
    const matchCat = activeCat === "tout" || d.cat === activeCat;
    const matchQ = !q || d.title.toLowerCase().includes(q) || d.lede.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  if (!list.length) {
    wrap.innerHTML = `<p style="color:var(--ink-dim);font-size:.88rem;text-align:center;padding:30px 10px;">Aucune démarche ne correspond à votre recherche.</p>`;
    return;
  }
  wrap.innerHTML = list
    .map(
      (d) => `
    <div class="svc-card reveal in" data-key="${d.key}">
      <div class="svc-top">
        <span class="svc-code">${d.code}</span>
        <span class="svc-cat-tag">${d.catLabel}</span>
      </div>
      <h4>${d.title}</h4>
      <p>${d.lede}</p>
      <div class="svc-foot">
        <span class="svc-tagline">Checklist guidée</span>
        <span class="svc-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
      </div>
    </div>`
    )
    .join("");
  $$(".svc-card", wrap).forEach((card) =>
    card.addEventListener("click", () => openDemarche(card.dataset.key))
  );
}

$("#searchInput")?.addEventListener("input", (e) => {
  activeSearch = e.target.value;
  renderServiceGrid();
});

/* ============================================================
   Navigation — écrans + pile "retour"
   ============================================================ */
const SCREENS = ["accueil", "demarches", "demarche-detail", "connexion", "espace"];
let navStack = ["accueil"];

function showScreen(name, opts = {}) {
  SCREENS.forEach((s) => {
    const el = $("#screen-" + s);
    if (el) el.classList.toggle("active", s === name);
  });
  if (!opts.fromBack) {
    if (navStack[navStack.length - 1] !== name) navStack.push(name);
  }
  window.scrollTo({ top: 0 });
  if (name === "demarches") renderServiceGrid();
  if (name === "espace") loadEspace();
  observeReveals();
}

function goBack() {
  if (navStack.length > 1) {
    navStack.pop();
    const prev = navStack[navStack.length - 1];
    showScreen(prev, { fromBack: true });
  } else {
    showScreen("accueil", { fromBack: true });
  }
}

$$("[data-go]").forEach((btn) =>
  btn.addEventListener("click", () => showScreen(btn.dataset.go))
);
$$(".back-btn").forEach((btn) => btn.addEventListener("click", goBack));

$$(".nav-btn[data-screen]").forEach((btn) => {
  btn.addEventListener("click", () => {
    navStack = [btn.dataset.screen];
    showScreen(btn.dataset.screen);
    $$(".nav-btn[data-screen]").forEach((b) => b.classList.toggle("active", b === btn));
  });
});

/* ============================================================
   Démarche detail
   ============================================================ */
function updateSuiviGate() {
  const boxes = $$("#dmPieces input[type=checkbox]");
  const total = boxes.length;
  const checked = boxes.filter((b) => b.checked).length;
  const btn = $("#btnAjouterSuivi");
  const counter = $("#dmPiecesCount");
  if (counter) counter.textContent = `${checked}/${total} pièces confirmées`;
  if (btn) btn.disabled = checked < total;
}

function openDemarche(key) {
  currentDemarche = DEMARCHES.find((d) => d.key === key);
  if (!currentDemarche) return;
  const d = currentDemarche;
  $("#dmKicker").textContent = "Démarche " + d.code;
  $("#dmTitle").textContent = d.title;
  $("#dmLede").textContent = d.lede;
  $("#dmPieces").innerHTML = d.pieces
    .map(
      (p, i) => `<label class="piece-row piece-row--check">
        <input type="checkbox" data-piece="${i}">
        <span class="piece-check-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6 9 17l-5-5"/></svg></span>
        <span>${p}</span>
      </label>`
    )
    .join("");
  $$("#dmPieces input[type=checkbox]").forEach((b) => b.addEventListener("change", updateSuiviGate));
  $("#dmPortailLink").href = d.portail;
  updateSuiviGate();
  navStack.push("demarche-detail");
  showScreen("demarche-detail", { fromBack: true });
}

$("#btnAjouterSuivi")?.addEventListener("click", async () => {
  if (!currentDemarche) return;
  const boxes = $$("#dmPieces input[type=checkbox]");
  const missing = boxes.filter((b) => !b.checked).length;
  if (missing > 0) {
    toast(`Il manque ${missing} pièce${missing > 1 ? "s" : ""} confirmée${missing > 1 ? "s" : ""} — le dossier ne peut pas être transmis à votre suivi.`, "warn");
    return;
  }
  const token = localStorage.getItem("kdb_token");
  if (!token) {
    toast("Connectez-vous pour ajouter cette démarche à votre suivi.", "warn");
    showScreen("connexion");
    return;
  }
  try {
    const res = await fetch(API_DEMANDES, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: JSON.stringify({
        serviceCode: currentDemarche.key,
        serviceLabel: currentDemarche.title,
        details: "Checklist préparée via KINDIMBOU — toutes les pièces confirmées par le déclarant",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Erreur lors de l'ajout.", "warn");
      return;
    }
    toast(`Dossier ajouté — numéro ${data.demande.numeroDossier}. Conservez-le précieusement : il vous sera demandé à l'ACPCE.`, "ok", 6000);
  } catch {
    toast("Connexion impossible. Réessayez.", "warn");
  }
});

/* ============================================================
   Install prompt (PWA)
   ============================================================ */
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  $$(".btn-install").forEach((b) => (b.hidden = false));
});
$$(".btn-install").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      toast("Ouvrez le menu de votre navigateur puis « Ajouter à l'écran d'accueil ».");
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  });
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ============================================================
   AUTH — connexion / inscription
   ============================================================ */
let authMode = "login";
let selectedTypePiece = "cni";
let pieceFile = null;

function setAuthMode(mode) {
  authMode = mode;
  $$(".auth-tab").forEach((t) => t.classList.toggle("active", t.dataset.mode === mode));
  $("#loginForm").hidden = mode !== "login";
  $("#registerForm").hidden = mode !== "register";
}
$$(".auth-tab").forEach((t) => t.addEventListener("click", () => setAuthMode(t.dataset.mode)));

$$(".pw-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.querySelector(".pw-eye").hidden = show;
    btn.querySelector(".pw-eye-off").hidden = !show;
    btn.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
  });
});
$$(".tp-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    $$(".tp-chip").forEach((c) => c.classList.remove("selected"));
    chip.classList.add("selected");
    selectedTypePiece = chip.dataset.tp;
  });
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

$("#pieceUpload")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  pieceFile = file;
  const box = $("#uploadBox");
  box.classList.add("has-file");
  $("#uploadBoxText").innerHTML = `Pièce sélectionnée : <span class="uf-name">${file.name}</span>`;
});

$("#loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;
  $("#authError").hidden = true;
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      $("#authError").textContent = data.error || "Connexion impossible.";
      $("#authError").hidden = false;
      return;
    }
    localStorage.setItem("kdb_token", data.token);
    localStorage.setItem("kdb_name", `${data.citoyen.prenom} ${data.citoyen.nom}`);
    toast("Bienvenue, " + data.citoyen.prenom + " !", "ok");
    navStack = ["espace"];
    showScreen("espace");
  } catch {
    $("#authError").textContent = "Connexion au serveur impossible. Réessayez.";
    $("#authError").hidden = false;
  }
});

$("#registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#authError").hidden = true;
  const payload = {
    action: "register",
    nom: $("#regNom").value.trim(),
    prenom: $("#regPrenom").value.trim(),
    email: $("#regEmail").value.trim().toLowerCase(),
    password: $("#regPassword").value,
    dateNaissance: $("#regDateNaissance").value,
    lieuNaissance: $("#regLieuNaissance").value.trim(),
    nationalite: $("#regNationalite").value.trim(),
    telephone: $("#regTelephone").value.trim(),
    typePiece: selectedTypePiece,
    numeroPiece: $("#regNumeroPiece").value.trim(),
  };
  if (pieceFile) {
    try {
      payload.pieceBase64 = await fileToBase64(pieceFile);
      payload.pieceMime = pieceFile.type;
    } catch {
      /* pièce optionnelle si l'encodage échoue */
    }
  }
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      $("#authError").textContent = data.error || "Inscription impossible.";
      $("#authError").hidden = false;
      return;
    }
    localStorage.setItem("kdb_token", data.token);
    localStorage.setItem("kdb_name", `${data.citoyen.prenom} ${data.citoyen.nom}`);
    toast("Compte créé — bienvenue " + data.citoyen.prenom + " !", "ok");
    navStack = ["espace"];
    showScreen("espace");
  } catch {
    $("#authError").textContent = "Connexion au serveur impossible. Réessayez.";
    $("#authError").hidden = false;
  }
});

/* ============================================================
   MON ESPACE — profil + suivi
   ============================================================ */
async function loadEspace() {
  const token = localStorage.getItem("kdb_token");
  if (!token) {
    $("#espaceLoggedOut").hidden = false;
    $("#espaceLoggedIn").hidden = true;
    return;
  }
  $("#espaceLoggedOut").hidden = true;
  $("#espaceLoggedIn").hidden = false;

  try {
    const [profileRes, demandesRes] = await Promise.all([
      fetch(API, { headers: { authorization: "Bearer " + token } }),
      fetch(API_DEMANDES, { headers: { authorization: "Bearer " + token } }),
    ]);
    if (profileRes.status === 401) return logout();
    const profile = await profileRes.json();
    const demandes = await demandesRes.json();

    const c = profile.citoyen;
    $("#espaceAvatar").textContent = (c.prenom[0] || "") + (c.nom[0] || "");
    $("#espaceName").textContent = `${c.prenom} ${c.nom}`;
    $("#espaceEmail").textContent = c.email;
    $("#espacePieceStatus").textContent = c.pieceDeposee
      ? `Pièce déposée : ${labelTypePiece(c.typePiece)}`
      : "Aucune pièce d'identité déposée";

    const list = demandes.demandes || [];
    const wrap = $("#suiviList");
    if (!list.length) {
      wrap.innerHTML = `<p style="color:var(--ink-dim);font-size:.86rem;text-align:center;padding:20px 10px;">Aucune démarche suivie pour l'instant. Ajoutez-en une depuis le catalogue.</p>`;
    } else {
      wrap.innerHTML = list
        .map(
          (d) => `
        <div class="suivi-card">
          <div class="suivi-ic">📋</div>
          <div class="suivi-body">
            <b>${d.serviceLabel}</b>
            <span class="suivi-num">${d.numeroDossier}</span><br>
            <span>${new Date(d.createdAt).toLocaleDateString("fr-FR")}</span>
            <div class="status-badge status-${d.statut}">${labelStatut(d.statut)}</div>
          </div>
        </div>`
        )
        .join("");
    }
  } catch {
    toast("Impossible de charger votre espace pour l'instant.", "warn");
  }
}

function labelTypePiece(t) {
  return { cni: "Carte Nationale d'Identité", passeport: "Passeport", carte_resident: "Carte de résident" }[t] || t;
}
function labelStatut(s) {
  return { recue: "Enregistrée", en_cours: "En préparation", validee: "Complétée" }[s] || s;
}
function logout() {
  localStorage.removeItem("kdb_token");
  localStorage.removeItem("kdb_name");
  navStack = ["accueil"];
  showScreen("accueil");
  toast("Déconnecté.");
}
$("#btnLogout")?.addEventListener("click", logout);

/* ============================================================
   Effet lumière au toucher — passe sur la surface à chaque tap
   ============================================================ */
const SHINE_SEL = ".svc-card, .hero-card, .demarche-hero, .checklist-card, .card, .trust-item, .profile-card, .suivi-card, .hero-stat";
function armShine(root = document) {
  root.querySelectorAll(SHINE_SEL).forEach((el) => {
    if (el.dataset.shineArmed) return;
    el.dataset.shineArmed = "1";
    el.classList.add("se-shine");
    const sweep = document.createElement("span");
    sweep.className = "shine-sweep";
    sweep.setAttribute("aria-hidden", "true");
    el.appendChild(sweep);
    const resetShine = () => {
      sweep.classList.add("shine-reset");
      sweep.classList.remove("shine-run");
      void sweep.offsetWidth; // force reflow so the transition can restart cleanly
      sweep.classList.remove("shine-reset");
    };
    el.addEventListener("pointerdown", () => {
      resetShine();
      void sweep.offsetWidth;
      requestAnimationFrame(() => sweep.classList.add("shine-run"));
    });
    sweep.addEventListener("transitionend", (e) => {
      if (e.propertyName === "transform") resetShine();
    });
  });
}
// nouvelles cartes injectées dynamiquement (catalogue, suivi...) : on
// réarme après chaque rendu.
const shineObserver = new MutationObserver(() => armShine());
shineObserver.observe(document.body, { childList: true, subtree: true });

/* ---------------- init ---------------- */
renderChips();
observeReveals();
armShine();
