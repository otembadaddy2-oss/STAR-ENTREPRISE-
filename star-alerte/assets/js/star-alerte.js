"use strict";
/* ============================================================
   STAR ALERTE — logique applicative
   Aucune donnée n'est envoyée automatiquement. Le partage se fait
   uniquement via le menu natif de partage du téléphone, à l'initiative
   de l'utilisateur (voir confidentialite.html).
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------------- Toasts ---------------- */
function toast(msg, kind = "") {
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
  }, 3200);
}

/* ---------------- Splash ---------------- */
window.addEventListener("load", () => {
  const splash = $("#splash");
  if (splash) {
    setTimeout(() => splash.classList.add("hide"), 2100);
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

/* ---------------- Tab navigation ---------------- */
const SCREENS = ["accueil", "signaler", "urgences", "historique"];
function goScreen(name, opts = {}) {
  if (!SCREENS.includes(name)) name = "accueil";
  SCREENS.forEach((s) => {
    const el = $("#screen-" + s);
    if (el) el.classList.toggle("active", s === name);
  });
  $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.screen === name));
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  if (name === "historique") renderHistory();
  if (name === "urgences") renderContacts();
  if (name === "signaler" && opts.reset) resetWizard(opts.type || null);
  observeReveals();
}
$$(".nav-btn[data-screen]").forEach((btn) => {
  btn.addEventListener("click", () => goScreen(btn.dataset.screen, { reset: btn.dataset.screen === "signaler" }));
});
$$("[data-go]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.go;
    const type = btn.dataset.type || null;
    goScreen(target, { reset: target === "signaler", type });
  });
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
window.addEventListener("appinstalled", () => {
  $$(".btn-install").forEach((b) => (b.hidden = true));
  toast("STAR ALERTE est installée sur votre appareil.", "ok");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ============================================================
   WIZARD — Signaler une urgence
   ============================================================ */
const INCIDENT_TYPES = {
  accident: { label: "Accident de la route", icon: "⚠️" },
  incendie: { label: "Incendie / fumée", icon: "🔥" },
  agression: { label: "Agression / violence", icon: "🛡️" },
  inondation: { label: "Inondation", icon: "🌊" },
  vol: { label: "Vol / cambriolage", icon: "🚨" },
  autre: { label: "Autre urgence", icon: "❗" },
};

let wizStep = 1;
let report = null;
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordTimerId = null;
let recordStartTs = 0;
let audioCtx, analyser, waveRAF;

function blankReport() {
  return {
    id: null,
    type: null,
    typeLabel: null,
    description: "",
    photoDataUrl: null,
    audioBlobUrl: null,
    audioBlob: null,
    lat: null,
    lng: null,
    accuracy: null,
    createdAt: null,
  };
}

function resetWizard(preselectType) {
  wizStep = 1;
  report = blankReport();
  stopCameraStream();
  stopRecordingIfAny(true);
  $$(".type-chip").forEach((c) => c.classList.toggle("selected", c.dataset.type === preselectType));
  if (preselectType) {
    report.type = preselectType;
    report.typeLabel = INCIDENT_TYPES[preselectType]?.label || preselectType;
  }
  $("#photoPreviewImg").hidden = true;
  $("#camPlaceholder").hidden = false;
  $("#camVideo").hidden = true;
  $("#audioPlayback").hidden = true;
  $("#audioPlayback").removeAttribute("src");
  $("#descInput").value = "";
  $("#locStatus").textContent = "Position non partagée pour l'instant.";
  $("#locCoords").hidden = true;
  renderWizStep();
}

function renderWizStep() {
  $$(".steps-track i").forEach((el, idx) => {
    const stepNum = idx + 1;
    el.classList.toggle("done", stepNum < wizStep);
    el.classList.toggle("active", stepNum === wizStep);
  });
  $$(".wiz-step").forEach((el) => (el.hidden = Number(el.dataset.step) !== wizStep));
  const backBtn = $("#wizBack");
  const nextBtn = $("#wizNext");
  backBtn.hidden = wizStep === 1;
  nextBtn.hidden = wizStep === 4;
  nextBtn.textContent = wizStep === 3 ? "Vérifier mon signalement" : "Continuer";
  $("#wizNav").classList.toggle("static", wizStep === 4);
  if (wizStep === 4) buildReview();
}

$("#wizBack")?.addEventListener("click", () => {
  if (wizStep > 1) {
    wizStep -= 1;
    renderWizStep();
  }
});
$("#wizNext")?.addEventListener("click", () => {
  if (wizStep === 1 && !report.type) {
    toast("Choisissez le type d'urgence pour continuer.", "warn");
    return;
  }
  if (wizStep < 4) {
    wizStep += 1;
    renderWizStep();
  }
});

$$(".type-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    $$(".type-chip").forEach((c) => c.classList.remove("selected"));
    chip.classList.add("selected");
    report.type = chip.dataset.type;
    report.typeLabel = INCIDENT_TYPES[chip.dataset.type]?.label || chip.dataset.type;
  });
});

/* ---- Step 2: photo ---- */
async function startCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    const video = $("#camVideo");
    video.srcObject = mediaStream;
    video.hidden = false;
    $("#camPlaceholder").hidden = true;
    $("#photoPreviewImg").hidden = true;
    await video.play();
  } catch (err) {
    toast("Caméra indisponible — utilisez « Choisir une photo ».", "warn");
  }
}
function stopCameraStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
}
$("#btnOpenCamera")?.addEventListener("click", startCamera);
$("#btnShutter")?.addEventListener("click", () => {
  const video = $("#camVideo");
  if (!mediaStream) {
    toast("Ouvrez d'abord la caméra.", "warn");
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 960;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  report.photoDataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const img = $("#photoPreviewImg");
  img.src = report.photoDataUrl;
  img.hidden = false;
  video.hidden = true;
  stopCameraStream();
  toast("Photo capturée.", "ok");
});
$("#fileFallback")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    report.photoDataUrl = reader.result;
    const img = $("#photoPreviewImg");
    img.src = report.photoDataUrl;
    img.hidden = false;
    $("#camVideo").hidden = true;
    $("#camPlaceholder").hidden = true;
  };
  reader.readAsDataURL(file);
});
$("#btnRemovePhoto")?.addEventListener("click", () => {
  report.photoDataUrl = null;
  $("#photoPreviewImg").hidden = true;
  $("#camPlaceholder").hidden = false;
  stopCameraStream();
});

/* ---- Step 2: voice message ---- */
function drawWave() {
  if (!analyser) return;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const bars = $$("#waveBars span");
  const step = Math.floor(data.length / bars.length) || 1;
  bars.forEach((bar, i) => {
    const v = data[i * step] || 0;
    bar.style.height = Math.max(12, (v / 255) * 100) + "%";
  });
  waveRAF = requestAnimationFrame(drawWave);
}
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    src.connect(analyser);
    drawWave();

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      report.audioBlob = blob;
      report.audioBlobUrl = URL.createObjectURL(blob);
      const audioEl = $("#audioPlayback");
      audioEl.src = report.audioBlobUrl;
      audioEl.hidden = false;
      stream.getTracks().forEach((t) => t.stop());
    };
    mediaRecorder.start();
    recordStartTs = Date.now();
    $("#micBtn").classList.add("recording");
    recordTimerId = setInterval(() => {
      const sec = Math.floor((Date.now() - recordStartTs) / 1000);
      $("#micTimer").textContent = String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
    }, 250);
  } catch (err) {
    toast("Microphone indisponible sur cet appareil/navigateur.", "warn");
  }
}
function stopRecordingIfAny(silent) {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
  if (recordTimerId) clearInterval(recordTimerId);
  if (waveRAF) cancelAnimationFrame(waveRAF);
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
  $("#micBtn")?.classList.remove("recording");
  if (!silent) $("#micTimer").textContent = "00:00";
}
$("#micBtn")?.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecordingIfAny();
  } else {
    $("#audioPlayback").hidden = true;
    startRecording();
  }
});
$("#btnRemoveAudio")?.addEventListener("click", () => {
  report.audioBlob = null;
  report.audioBlobUrl = null;
  $("#audioPlayback").hidden = true;
  $("#micTimer").textContent = "00:00";
});
$("#descInput")?.addEventListener("input", (e) => {
  report.description = e.target.value;
});

/* ---- Step 3: location ---- */
$("#btnGeoloc")?.addEventListener("click", () => {
  if (!("geolocation" in navigator)) {
    toast("Géolocalisation non disponible sur cet appareil.", "warn");
    return;
  }
  $("#locStatus").textContent = "Recherche de votre position…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      report.lat = pos.coords.latitude;
      report.lng = pos.coords.longitude;
      report.accuracy = Math.round(pos.coords.accuracy);
      $("#locStatus").textContent = "Position obtenue ✓";
      $("#locCoords").hidden = false;
      $("#locCoords").textContent =
        report.lat.toFixed(5) + ", " + report.lng.toFixed(5) + " · précision ±" + report.accuracy + " m";
      toast("Position ajoutée au signalement.", "ok");
    },
    (err) => {
      $("#locStatus").textContent = "Position refusée ou indisponible.";
      toast("Impossible d'obtenir votre position (permission refusée ?).", "warn");
    },
    { enableHighAccuracy: true, timeout: 12000 }
  );
});

/* ---- Step 4: review + share ---- */
function buildReview() {
  const wrap = $("#reviewList");
  wrap.innerHTML = "";
  const rows = [
    { icon: INCIDENT_TYPES[report.type]?.icon || "❗", label: "Type d'urgence", value: report.typeLabel || "Non précisé", step: 1 },
    { icon: "📝", label: "Description", value: report.description || "Aucune description ajoutée", step: 2 },
    { icon: "📷", label: "Photo", value: report.photoDataUrl ? "1 photo jointe" : "Aucune photo", step: 2, img: report.photoDataUrl },
    { icon: "🎙️", label: "Message vocal", value: report.audioBlobUrl ? "Message vocal enregistré" : "Aucun message vocal", step: 2 },
    {
      icon: "📍",
      label: "Position",
      value: report.lat ? report.lat.toFixed(5) + ", " + report.lng.toFixed(5) : "Aucune position partagée",
      step: 3,
    },
  ];
  rows.forEach((r) => {
    const div = document.createElement("div");
    div.className = "review-item";
    div.innerHTML = `
      <div class="ri-ic">${r.icon}</div>
      <div class="ri-body">
        <b>${r.label}</b>
        <span>${r.value}</span>
        ${r.img ? `<img src="${r.img}" alt="">` : ""}
      </div>
      <button class="ri-edit" data-step="${r.step}">Modifier</button>
    `;
    wrap.appendChild(div);
  });
  $$(".ri-edit", wrap).forEach((btn) =>
    btn.addEventListener("click", () => {
      wizStep = Number(btn.dataset.step);
      renderWizStep();
    })
  );
}

function saveHistoryEntry(status) {
  const key = "staralerte_history";
  const list = JSON.parse(localStorage.getItem(key) || "[]");
  const entry = {
    id: "r_" + Date.now(),
    type: report.type,
    typeLabel: report.typeLabel,
    description: report.description,
    hasPhoto: !!report.photoDataUrl,
    hasAudio: !!report.audioBlobUrl,
    lat: report.lat,
    lng: report.lng,
    status,
    createdAt: new Date().toISOString(),
  };
  list.unshift(entry);
  localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
}

function buildShareText() {
  const lines = [
    "🚨 SIGNALEMENT STAR ALERTE",
    "Type : " + (report.typeLabel || "Non précisé"),
    report.description ? "Détails : " + report.description : null,
    report.lat ? "Position : https://maps.google.com/?q=" + report.lat + "," + report.lng : "Position : non partagée",
    "Date : " + new Date().toLocaleString("fr-FR"),
    "",
    "Envoyé via l'application STAR ALERTE (STAR ENTREPRISE) — République du Congo.",
  ].filter(Boolean);
  return lines.join("\n");
}

$("#btnShareReport")?.addEventListener("click", async () => {
  if (!report.type) {
    toast("Choisissez au moins un type d'urgence avant de partager.", "warn");
    return;
  }
  const text = buildShareText();
  const files = [];
  try {
    if (report.photoDataUrl) {
      const blob = await (await fetch(report.photoDataUrl)).blob();
      files.push(new File([blob], "photo-signalement.jpg", { type: "image/jpeg" }));
    }
    if (report.audioBlob) {
      files.push(new File([report.audioBlob], "message-vocal.webm", { type: "audio/webm" }));
    }
  } catch (e) {
    /* fichiers optionnels, on continue sans */
  }

  let shared = false;
  if (navigator.share) {
    try {
      if (files.length && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ title: "Signalement STAR ALERTE", text, files });
      } else {
        await navigator.share({ title: "Signalement STAR ALERTE", text });
      }
      shared = true;
    } catch (e) {
      shared = false;
    }
  }
  if (!shared) {
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
    if (files.length) {
      toast("WhatsApp ouvert avec le texte — joignez la photo/le message vocal manuellement.", "warn");
    }
  }
  saveHistoryEntry(shared ? "Partagé" : "Préparé");
  toast("Signalement enregistré dans votre historique local.", "ok");
});

$("#btnSaveDraft")?.addEventListener("click", () => {
  if (!report.type) {
    toast("Choisissez au moins un type d'urgence.", "warn");
    return;
  }
  saveHistoryEntry("Brouillon");
  toast("Brouillon enregistré localement (photo/audio non archivés).", "ok");
  goScreen("historique");
});

/* ============================================================
   HISTORIQUE
   ============================================================ */
function renderHistory() {
  const list = JSON.parse(localStorage.getItem("staralerte_history") || "[]");
  const wrap = $("#historyList");
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 8v5l3 3"/><circle cx="12" cy="12" r="9"/></svg>
        <p>Aucun signalement pour l'instant.<br>Votre historique local apparaîtra ici.</p>
      </div>`;
    return;
  }
  wrap.innerHTML = list
    .map(
      (r) => `
    <div class="hist-card">
      <div class="hist-thumb">${INCIDENT_TYPES[r.type]?.icon || "❗"}</div>
      <div class="hist-body">
        <b>${r.typeLabel || "Urgence"}</b>
        <span>${new Date(r.createdAt).toLocaleString("fr-FR")}</span>
        <span class="hist-status">${r.status}</span>
      </div>
      <div class="hist-actions">
        <button data-del="${r.id}" aria-label="Supprimer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg>
        </button>
      </div>
    </div>`
    )
    .join("");
  $$("[data-del]", wrap).forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.dataset.del;
      const filtered = list.filter((r) => r.id !== id);
      localStorage.setItem("staralerte_history", JSON.stringify(filtered));
      renderHistory();
      toast("Signalement supprimé de l'historique.");
    })
  );
}
$("#btnClearHistory")?.addEventListener("click", () => {
  if (confirm("Supprimer tout l'historique local ?")) {
    localStorage.removeItem("staralerte_history");
    renderHistory();
    toast("Historique local vidé.");
  }
});

/* ============================================================
   URGENCES — contacts personnalisés
   ============================================================ */
function renderContacts() {
  const list = JSON.parse(localStorage.getItem("staralerte_contacts") || "[]");
  const wrap = $("#contactList");
  if (!wrap) return;
  wrap.innerHTML = list
    .map(
      (c, i) => `
    <div class="contact-row">
      <div><b>${c.name}</b><span>${c.phone}</span></div>
      <div class="cr-actions">
        <a href="tel:${c.phone.replace(/\s+/g, "")}" aria-label="Appeler">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </a>
        <button data-delc="${i}" aria-label="Supprimer">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg>
        </button>
      </div>
    </div>`
    )
    .join("");
  $$("[data-delc]", wrap).forEach((btn) =>
    btn.addEventListener("click", () => {
      list.splice(Number(btn.dataset.delc), 1);
      localStorage.setItem("staralerte_contacts", JSON.stringify(list));
      renderContacts();
    })
  );
}
$("#contactForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#contactName").value.trim();
  const phone = $("#contactPhone").value.trim();
  if (!name || !phone) return;
  const list = JSON.parse(localStorage.getItem("staralerte_contacts") || "[]");
  list.push({ name, phone });
  localStorage.setItem("staralerte_contacts", JSON.stringify(list));
  $("#contactForm").reset();
  renderContacts();
  toast("Contact ajouté (enregistré uniquement sur cet appareil).", "ok");
});

/* ============================================================
   Effet lumière au toucher — passe sur la surface à chaque tap
   ============================================================ */
const SHINE_SEL = ".incident-card, .hero-card, .svc-row, .quickcall, .note-row, .type-chip, .review-item, .hist-card, .contact-row, .capture-block, .map-box";
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
const shineObserver = new MutationObserver(() => armShine());
shineObserver.observe(document.body, { childList: true, subtree: true });

/* ---------------- init ---------------- */
observeReveals();
renderContacts();
armShine();
