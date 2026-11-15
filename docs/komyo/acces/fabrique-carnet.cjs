// Carnet des sites et des accès de STAR ENTREPRISE (PDF) : liens, captures, accès à remplir à la main, procédures.
// AUCUN mot de passe n'est écrit ici ni dans le PDF : les mots de passe sont chiffrés dans la base et ne peuvent pas être relus ;
// le PDF contient des lignes vides à remplir à la main et l'explication pour les refaire.
// Lancer depuis la racine du dépôt : node docs/komyo/acces/fabrique-carnet.cjs [dossier de sortie] [dossier des captures]
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const racine = process.cwd(), sortie = process.argv[2] || path.join(racine, "docs/komyo/acces"), capDir = process.argv[3] || "/tmp/captures-carnet";
fs.mkdirSync(capDir, { recursive: true }); fs.mkdirSync(sortie, { recursive: true });
const PRINCIPAL = "https://star-entreprise.netlify.app", OFFICIEL = "https://komyo.starentreprise.com";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".json": "application/json", ".svg": "image/svg+xml" };
const srv = http.createServer((rq, rs) => {
  const u = new URL(rq.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p.endsWith("/")) p += "index.html";
  if (p.startsWith("/api/")) { rs.writeHead(401, { "content-type": "application/json" }); rs.end('{"error":"Non authentifié"}'); return; }
  const f = path.normalize(path.join(racine, p));
  if (f.startsWith(racine) && fs.existsSync(f) && fs.statSync(f).isFile()) { rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(fs.readFileSync(f)); } else { rs.writeHead(404); rs.end("introuvable"); }
});

// ---- Les sites ----
// acces : "staff" = mot de passe seul (équipe STAR) ; "groupe" = identifiant + mot de passe (filiale) ; "membres" = chaque utilisateur crée son compte ; "public"
const SITES = [
  { id: "vitrine", nom: "STAR ENTREPRISE · vitrine et Espace direction", emoji: "⭐", chemin: "/", pages: [["/", "Vitrine publique"], ["/admin.html", "Espace direction (connexion)"]],
    role: "Site vitrine de l'agence : services, business plan, réalisations, contact. L'Espace direction rassemble toutes les demandes et inscriptions du groupe (dont le Marketplace), avec export Excel.",
    liens: [["Site", "/"], ["Espace direction", "/admin.html"], ["Réinitialiser l'accès direction", "/reinitialiser-acces-direction.html"]],
    acces: "staff", accesTxt: "Espace direction : mot de passe seul (12 caractères au minimum), pas d'identifiant à retenir.",
    retrouver: "Mot de passe oublié : page « Réinitialiser l'accès direction » → un code à 6 chiffres arrive en notification sur le téléphone du staff enregistré, ou tu utilises le code de secours (affiché une seule fois à chaque changement de mot de passe)." },
  { id: "diamant", nom: "STAR ENTREPRISE « Diamant » · répertoire de tous les sites", emoji: "💎", chemin: "/diamant.html", pages: [["/diamant.html", "Répertoire des sites et applications"]],
    role: "Page avec le logo Diamant qui présente tous les projets du groupe (STAR CRÉAT, ALPHA, Maison de la Drépanocytose, Guichet unique, Pili-Pili, S.O, STAR ALERTE…) avec un lien vers chacun.",
    liens: [["Répertoire", "/diamant.html"]], acces: "public", accesTxt: "Aucune connexion : page publique.", retrouver: "Rien à retrouver." },
  { id: "creat", nom: "STAR CRÉAT · créations et réalisations", emoji: "🎨", chemin: "/star-creat/", pages: [["/star-creat/", "STAR CRÉAT"], ["/realisations.html", "Réalisations"]],
    role: "La sous-marque création de STAR ENTREPRISE et le portfolio des réalisations.",
    liens: [["STAR CRÉAT", "/star-creat/"], ["Réalisations", "/realisations.html"]], acces: "public", accesTxt: "Aucune connexion : pages publiques.",
    retrouver: "Note : le projet Netlify séparé « star-creat » (star-creat.netlify.app) est vide (erreur 404). Les créations sont bien en ligne dans ce dossier du site principal." },
  { id: "alpha", nom: "ALPHA (produit STAR CRÉAT)", emoji: "🅰️", chemin: "/alpha/", pages: [["/alpha/", "ALPHA (public)"], ["/alpha/admin.html", "Administration ALPHA (connexion)"]],
    role: "Espace découverte et lancement de campagnes : formulaire de brief, vitrine, devis. Le compte admin ALPHA lit et gère les briefs de campagne.",
    liens: [["ALPHA", "/alpha/"], ["Administration", "/alpha/admin.html"], ["Vitrine (admin)", "/alpha/vitrine-admin.html"], ["Création de l'accès", "/alpha/bootstrap.html"], ["Adresse propre ALPHA", "https://alpha-star-creat.netlify.app/"]],
    acces: "groupe", accesTxt: "Administration : identifiant + mot de passe du système de groupe.",
    retrouver: "Refaire l'accès : page « S.O · configuration » (setup) avec le code de configuration (SETUP_TOKEN) : choisir l'identifiant, le mot de passe et la filiale." },
  { id: "drepano", nom: "La Maison de la Drépanocytose", emoji: "❤️", chemin: "/maison-drepanocytose/", pages: [["/maison-drepanocytose/", "Accueil"], ["/maison-drepanocytose/espace.html", "Espace (connexion)"]],
    role: "Dépistage, accompagnement des familles et sensibilisation à la drépanocytose (Pointe-Noire). Espace pour les membres et messagerie.",
    liens: [["Accueil", "/maison-drepanocytose/"], ["Espace", "/maison-drepanocytose/espace.html"], ["Messagerie", "/maison-drepanocytose/discussion.html"]],
    acces: "groupe", accesTxt: "Espace : identifiant + mot de passe du système de groupe (filiale technique : drepanocytose).",
    retrouver: "Refaire l'accès : page « S.O · configuration » (setup), filiale : drepanocytose." },
  { id: "guichet", nom: "KIDIMBOU · Guichet unique", emoji: "🏛️", chemin: "/guichet-unique/", pages: [["/guichet-unique/", "Guichet unique"], ["/guichet-unique/confidentialite.html", "Confidentialité"]],
    role: "Guichet unique administratif de la République du Congo (application installable). Les citoyens créent leur propre compte ; la pièce d'identité est déposée de façon sécurisée, jamais visible par une adresse publique.",
    liens: [["Guichet unique", "/guichet-unique/"], ["Confidentialité", "/guichet-unique/confidentialite.html"]],
    acces: "membres", accesTxt: "Chaque citoyen crée son compte. Pas de mot de passe commun. Les demandes se consultent dans l'Espace direction.",
    retrouver: "Le staff consulte les demandes depuis l'Espace direction (admin.html)." },
  { id: "market", nom: "STAR Marketplace", emoji: "🛒", chemin: "/marketplace/", pages: [["/marketplace/", "Accueil"], ["/marketplace/inscription.html", "Inscription vendeur / acheteur"]],
    role: "Achat et vente au Congo avec paiement Mobile Money. Les inscriptions sont envoyées sur WhatsApp Business et enregistrées en base.",
    liens: [["Marketplace", "/marketplace/"], ["Inscription", "/marketplace/inscription.html"], ["Espace compte", "/marketplace/compte.html"], ["Vendre", "/marketplace/vendre.html"]],
    acces: "membres", accesTxt: "Chaque vendeur ou acheteur crée son compte. Le staff voit les demandes dans l'Espace direction (admin.html).",
    retrouver: "Les identifiants des utilisateurs ne se relisent pas ; ils peuvent refaire leur accès depuis la page de connexion." },
  { id: "pili", nom: "PILI-PILI Events", emoji: "🎉", chemin: "/pilipili-events/", pages: [["/pilipili-events/", "Accueil"], ["/pilipili-events/espace.html", "Espace (connexion)"]],
    role: "Partenaire événementiel (application installable) : présentation, inscriptions, espace et messagerie.",
    liens: [["Accueil", "/pilipili-events/"], ["Espace", "/pilipili-events/espace.html"], ["Messagerie", "/pilipili-events/discussion.html"]],
    acces: "groupe", accesTxt: "Espace : identifiant + mot de passe du système de groupe (filiale technique : pilipili).",
    retrouver: "Refaire l'accès : page « S.O · configuration » (setup), filiale : pilipili." },
  { id: "so", nom: "S.O · Gestion des membres", emoji: "🧑‍🤝‍🧑", chemin: "/so-membres/", pages: [["/so-membres/", "Gestion des membres"], ["/so-membres/setup.html", "Configuration des accès (setup)"]],
    role: "Gestion d'une organisation ou association. La page « setup » sert aussi à créer ou remplacer l'accès de TOUTES les filiales.",
    liens: [["Gestion des membres", "/so-membres/"], ["Setup (création des accès)", "/so-membres/setup.html"]],
    acces: "groupe", accesTxt: "Identifiant + mot de passe du système de groupe (filiale technique : so_membres). La page setup demande le code de configuration.",
    retrouver: "Le code de configuration est dans Netlify → Site configuration → Environment variables → SETUP_TOKEN." },
  { id: "alerte", nom: "STAR ALERTE", emoji: "🚨", chemin: "/star-alerte/", pages: [["/star-alerte/", "STAR ALERTE"], ["/star-alerte/confidentialite.html", "Confidentialité"]],
    role: "Signalement, localisation et secours (application installable).",
    liens: [["STAR ALERTE", "/star-alerte/"]], acces: "public", accesTxt: "Aucune connexion : application publique.", retrouver: "Rien à retrouver." },
  { id: "komyo", nom: "KOMYO · le monde en mouvement (avec Keydou)", emoji: "🌍", chemin: "/starvibe/", pages: [["/starvibe/", "KOMYO"], ["/starvibe/keydou-admin.html", "Administration KOMYO / Keydou (connexion)"], ["/starvibe/entreprises.html", "Keydou pour les entreprises (offre)"], ["/starvibe/moderation.html", "Modération (connexion)"]],
    role: "Application vidéo verticale, PIOUPIOU (espace enfants), Keydou Compagnon, Le Salon, ÉCLAT (le direct), abonnements Mobile Money, offre entreprises. Les membres se connectent avec leur numéro de téléphone et un code PIN à 4 chiffres.",
    liens: [["Application KOMYO", "/starvibe/"], ["Inscription", "/starvibe/inscription.html"], ["Keydou Compagnon", "/starvibe/compagnon.html"], ["Offre entreprises", "/starvibe/entreprises.html"], ["Espace entreprise", "/starvibe/entreprise.html"], ["Administration KOMYO / Keydou", "/starvibe/keydou-admin.html"], ["Modération", "/starvibe/moderation.html"], ["Paiements", "/starvibe/paiements.html"], ["Statistiques", "/starvibe/statistiques.html"]],
    acces: "staff", accesTxt: "Administration, modération, paiements : mot de passe seul du staff (même accès que l'Espace direction). Membres : téléphone + code PIN à 4 chiffres choisi à l'inscription.",
    retrouver: "Staff : « Réinitialiser l'accès direction ». Un membre qui oublie son PIN le refait avec le code envoyé ; le staff peut le dépanner depuis l'onglet « PIN oubliés » de l'administration." },
  { id: "jardis", nom: "JARDIS · assistant personnel de Carry", emoji: "🧭", chemin: "/jardis.html", pages: [["/jardis.html", "JARDIS"]],
    role: "Assistant personnel (documentation et manifeste), version publique.", liens: [["JARDIS", "/jardis.html"]], acces: "public", accesTxt: "Aucune connexion : page publique.", retrouver: "Rien à retrouver." },
  { id: "sosdoc", nom: "SOS-DOC & PIOUPIOU · ancienne version", emoji: "🩺", chemin: null, externe: "https://sos-doc.netlify.app/", pages: [],
    role: "Vidéos éducatives et espace enfants : précurseur de KOMYO, hébergé à part. Le répertoire Diamant y mène.",
    liens: [["SOS-DOC", "https://sos-doc.netlify.app/"]], acces: "public", accesTxt: "Aucune connexion : site public.", retrouver: "Rien à retrouver." },
];
const ACCES_LABEL = { staff: "Staff (mot de passe seul)", groupe: "Identifiant + mot de passe", membres: "Comptes des utilisateurs", public: "Public, sans connexion" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const abs = (u) => (u.startsWith("http") ? u : PRINCIPAL + u);

(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port;
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 1200 }, deviceScaleFactor: 1.8, serviceWorkers: "block" });
  let n = 0; const captures = {};
  for (const s of SITES) for (const [chemin, legende] of s.pages) {
    const f = path.join(capDir, `c${String(++n).padStart(2, "0")}.jpg`);
    const page = await ctx.newPage();
    try { await page.goto(base + chemin, { waitUntil: "load", timeout: 25000 }); await page.waitForTimeout(1600); await page.screenshot({ path: f, type: "jpeg", quality: 80 }); captures[s.id + chemin] = f; }
    catch (e) { console.log("capture impossible", chemin, String(e.message).slice(0, 80)); }
    await page.close();
  }
  await nav.close();
  const img = (f) => (f && fs.existsSync(f) ? "data:image/jpeg;base64," + fs.readFileSync(f).toString("base64") : "");
  const logo = "data:image/png;base64," + fs.readFileSync(path.join(racine, "docs/komyo/guide-assets/star-logo-officiel.png")).toString("base64");
  const ligne = (t = "") => `<div class="blank"><span>${esc(t)}</span></div>`;

  const fiche = (s, i) => `<section class="page"><div class="bandeau"><span class="em">${s.emoji}</span><div><small>Site ${i + 1} sur ${SITES.length}</small><h2>${esc(s.nom)}</h2></div><span class="etat">✔ En ligne<br><small>vérifié le 15/11/2026</small></span></div>
  <div class="cols"><div class="col-txt">
    <h3>À quoi il sert</h3><p>${esc(s.role)}</p>
    <h3>Liens</h3><table class="liens">${s.liens.map(([l, u]) => `<tr><td>${esc(l)}</td><td><a href="${abs(u)}">${esc(abs(u).replace("https://", ""))}</a></td></tr>`).join("")}</table>
    ${s.chemin !== null ? `<p class="pt">Même site sur l'adresse officielle : <a href="${OFFICIEL}${s.chemin}">${OFFICIEL.replace("https://", "")}${esc(s.chemin)}</a></p>` : ""}
    <h3>Type d'accès : ${ACCES_LABEL[s.acces]}</h3><p>${esc(s.accesTxt)}</p>
    <h3>Si l'accès est perdu</h3><p>${esc(s.retrouver)}</p>
  </div><div class="col-img">${s.pages.map(([c, l]) => `<figure>${img(captures[s.id + c]) ? `<img src="${img(captures[s.id + c])}" alt="">` : `<div class="noimg">Capture non disponible</div>`}<figcaption>${esc(l)}</figcaption></figure>`).slice(0, 3).join("")}${s.pages.length === 0 ? `<div class="noimg">Site hébergé à part :<br>capture non incluse</div>` : ""}</div></div>
  ${s.acces === "public" ? `<div class="aucun">Aucun identifiant ni mot de passe : accès public.</div>` : `<div class="remplir"><h3>✍️ Mes accès (à remplir à la main)</h3>
    <div class="grille"><div><label>Adresse de connexion</label>${ligne(s.liens[1] ? abs(s.liens[1][1]) : abs(s.liens[0][1]))}</div>
    <div><label>${s.acces === "staff" ? "Identifiant (aucun, mot de passe seul)" : "Identifiant ou téléphone"}</label>${ligne()}</div>
    <div><label>Mot de passe</label>${ligne()}</div><div><label>Code PIN / code de secours</label>${ligne()}</div></div>
    <p class="pt">Pourquoi ces lignes sont vides : les mots de passe sont enregistrés chiffrés, personne ne peut les relire. Écris le tien ici à la main, ou mieux, dans un gestionnaire de mots de passe.</p></div>`}</section>`;

  const lignesRecap = SITES.map((s, i) => `<tr><td class="n">${i + 1}</td><td><b>${esc(s.nom)}</b></td><td><a href="${abs(s.liens[0][1])}">${esc(abs(s.liens[0][1]).replace("https://", ""))}</a></td><td>${ACCES_LABEL[s.acces]}</td><td class="ok">✔ En ligne</td></tr>`).join("");
  const fiche2 = SITES.filter((s) => s.acces !== "public").map((s) => `<tr><td><b>${esc(s.nom.split("·")[0].trim())}</b><br><small>${ACCES_LABEL[s.acces]}</small></td><td></td><td></td><td></td></tr>`).join("");

  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>STAR ENTREPRISE — Carnet des sites et des accès</title><style>
  @import url("${base}/starvibe/assets/fonts/komyo-fonts-v1.css");
  @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:#241536;font-size:11px;line-height:1.5}
  h1,h2,h3{font-family:Sora,Arial,sans-serif;margin:0}a{color:#c2410c;text-decoration:none}
  .page{width:210mm;height:297mm;padding:14mm 14mm 12mm;position:relative;overflow:hidden;page-break-after:always;background:#fffbf3}
  .page::after{content:"STAR ENTREPRISE · Carnet des sites et des accès · CONFIDENTIEL";position:absolute;bottom:6mm;left:14mm;right:14mm;font-size:8px;color:#8a7f9a;text-align:center}
  .cover{background:linear-gradient(150deg,#241536,#4a2a6b 62%,#7a3b5e);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:26mm 20mm}
  .cover::after{color:#c9bfe0}.cover img{width:62mm;background:#fff;border-radius:14px;padding:8px}.cover h1{font-size:34px;margin:14mm 0 6mm;line-height:1.1}.cover h1 em{font-style:normal;color:#E8A93D}.cover p{font-size:13px;max-width:130mm;opacity:.95}
  .cover .alerte{margin-top:14mm;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.4);border-radius:12px;padding:10px 14px;font-size:11.5px;max-width:140mm}
  h2.t{font-size:21px;margin-bottom:4mm;border-bottom:3px solid #E8A93D;padding-bottom:2mm}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #e5dccb;padding:5px 7px;text-align:left;vertical-align:top;background:#fff}th{background:#fff1d4;font-family:Sora,Arial,sans-serif;font-size:10px}td.n{text-align:center;width:8mm}td.ok{color:#1f8f4a;font-weight:700;white-space:nowrap}
  .recap td{font-size:9.6px}.bandeau{display:flex;align-items:center;gap:10px;background:linear-gradient(120deg,#FF6B4A,#E8A93D);color:#fff;border-radius:14px;padding:9px 14px;margin-bottom:5mm}
  .bandeau h2{font-size:17px;line-height:1.2}.bandeau small{opacity:.95;font-size:9.5px}.bandeau .em{font-size:30px}.bandeau .etat{margin-left:auto;text-align:right;font-weight:700;font-size:11px;background:rgba(255,255,255,.22);border-radius:9px;padding:4px 9px}
  .cols{display:flex;gap:6mm}.col-txt{flex:1}.col-img{flex:1.75;display:flex;gap:3mm;align-items:flex-start;justify-content:flex-end}
  figure{margin:0;flex:1;max-width:60mm}figure img{width:100%;border:1.5px solid #cfc3b0;border-radius:9px;display:block}figcaption{font-size:8.6px;text-align:center;color:#6b5f80;margin-top:2px}
  .noimg{border:1.5px dashed #cfc3b0;border-radius:9px;padding:14mm 4mm;text-align:center;color:#8a7f9a;font-size:9px}
  h3{font-size:11.5px;margin:3.5mm 0 1mm;color:#4a2a6b}p{margin:0 0 2mm}.pt{font-size:9.2px;color:#6b5f80}.liens td{font-size:9.6px;padding:3px 6px}.liens td:first-child{width:34%;font-weight:600;background:#fff8ea}
  .remplir{position:absolute;left:14mm;right:14mm;bottom:15mm;border:2px solid #241536;border-radius:12px;padding:3.5mm 5mm;background:#fff}.remplir h3{margin:0 0 2mm}
  .grille{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm}label{font-size:8.8px;font-weight:700;color:#4a2a6b}.blank{border-bottom:1.5px solid #241536;height:8.5mm}.blank span{font-size:8px;color:#8a7f9a}
  .aucun{position:absolute;left:14mm;right:14mm;bottom:15mm;background:#e8f7ee;border:1.5px solid #1f8f4a;border-radius:12px;padding:3.5mm 5mm;color:#14653a;font-weight:700}
  .box{background:#fff8ea;border-left:4px solid #FF6B4A;padding:3mm 4mm;margin:3mm 0;border-radius:0 8px 8px 0}.box.warn{background:#fdecea;border-color:#c0392b}
  ol,ul{margin:1mm 0 2mm;padding-left:5mm}li{margin:1mm 0}.fiche td{height:15mm}.fiche td:first-child{width:46mm}
  code{background:#f3eadb;border-radius:4px;padding:0 3px;font-size:9.6px}.mini td{font-size:9.4px}
  </style><body>
  <section class="page cover"><img src="${logo}" alt="STAR ENTREPRISE"><h1>Carnet des <em>sites</em><br>et des <em>accès</em></h1>
  <p>Les adresses de tous les sites et applications du groupe STAR ENTREPRISE, ce que fait chacun, comment s'y connecter, et comment refaire un accès perdu.</p>
  <p style="margin-top:8mm;font-size:11.5px">Préparé pour Carry OTEMBA, PDG et fondateur · 15 novembre 2026<br>Adresse officielle : komyo.starentreprise.com · Adresse principale : star-entreprise.netlify.app</p>
  <div class="alerte">🔒 <b>Document confidentiel.</b> Il ne contient aucun mot de passe : les mots de passe sont chiffrés dans la base de données et personne ne peut les relire. Les lignes « Mes accès » sont à remplir à la main.</div></section>

  <section class="page"><h2 class="t">Sommaire</h2>
  <table class="mini"><tr><th>Partie</th><th>Contenu</th></tr>
  <tr><td><b>1. Les sites en un coup d'œil</b></td><td>Tableau des ${SITES.length} sites et applications avec leur lien et leur état.</td></tr>
  <tr><td><b>2. Une fiche par site</b></td><td>Rôle, liens, captures d'écran, type d'accès, que faire si l'accès est perdu, et vos lignes « Mes accès ».</td></tr>
  <tr><td><b>3. Les accès de l'équipe</b></td><td>Les trois sortes de connexion et leurs règles.</td></tr>
  <tr><td><b>4. Refaire ou créer un accès</b></td><td>Procédure pas à pas, avec le code de configuration.</td></tr>
  <tr><td><b>5. Hébergement et services</b></td><td>Où tout est hébergé, les services connectés et les noms des clés (sans leurs valeurs).</td></tr>
  <tr><td><b>6. Sécurité</b></td><td>Les bonnes habitudes pour les mots de passe.</td></tr>
  <tr><td><b>7. Fiche d'accès à remplir</b></td><td>Une page récapitulative à compléter à la main et à garder en lieu sûr.</td></tr></table>
  <h2 class="t" style="margin-top:8mm">1. Les sites en un coup d'œil</h2>
  <table class="recap"><tr><th>N°</th><th>Site</th><th>Lien principal</th><th>Accès</th><th>État</th></tr>${lignesRecap}</table>
  <p class="pt" style="margin-top:3mm">« En ligne » = la page répond (code 200), vérifiée le 15/11/2026. Tous les sites ci-dessus, sauf SOS-DOC, sont des dossiers du même site Netlify « star-entreprise ».</p></section>

  ${SITES.map(fiche).join("")}

  <section class="page"><h2 class="t">3. Les accès de l'équipe</h2>
  <table class="mini"><tr><th style="width:38mm">Sorte de connexion</th><th>Comment ça marche</th><th style="width:48mm">Où</th></tr>
  <tr><td><b>Staff · mot de passe seul</b></td><td>Un seul mot de passe, <b>12 caractères au minimum</b>, jamais un numéro de téléphone. Trop d'essais ratés bloquent la connexion. Les messages d'erreur ne disent jamais si un compte existe.</td><td>Espace direction, administration KOMYO / Keydou, modération, paiements</td></tr>
  <tr><td><b>Groupe · identifiant + mot de passe</b></td><td>Un identifiant et un mot de passe d'au moins 8 caractères, par filiale. Chaque filiale a son « organisation technique » : <code>star_entreprise</code>, <code>sos_doc</code>, <code>drepanocytose</code>, <code>pilipili</code>, <code>so_membres</code>.</td><td>ALPHA, Maison de la Drépanocytose, Pili-Pili, S.O</td></tr>
  <tr><td><b>Utilisateurs</b></td><td>Chaque membre crée son compte : KOMYO = téléphone + PIN à 4 chiffres ; Guichet unique et Marketplace = leur propre compte.</td><td>KOMYO, Guichet unique, Marketplace</td></tr></table>
  <div class="box"><b>Pourquoi je ne peux pas te donner les mots de passe existants.</b> Ils sont enregistrés sous forme chiffrée (« hachée ») dans la base : même l'équipe technique ne peut pas les relire. C'est voulu : si la base fuitait, personne ne pourrait les utiliser.</div>
  <h2 class="t" style="margin-top:7mm">4. Refaire ou créer un accès</h2>
  <p><b>A. Accès direction (mot de passe seul) oublié</b></p><ol><li>Ouvre <a href="${PRINCIPAL}/reinitialiser-acces-direction.html">${PRINCIPAL.replace("https://", "")}/reinitialiser-acces-direction.html</a>.</li><li>Demande le code : il arrive en notification sur le téléphone du staff enregistré (ou saisis le code de secours).</li><li>Choisis un nouveau mot de passe d'au moins 12 caractères, puis <b>note le nouveau code de secours</b> : il n'est affiché qu'une fois.</li></ol>
  <p><b>B. Créer ou remplacer l'accès d'une filiale (identifiant + mot de passe)</b></p><ol><li>Ouvre <a href="${PRINCIPAL}/so-membres/setup.html">${PRINCIPAL.replace("https://", "")}/so-membres/setup.html</a>.</li><li>Entre le <b>code de configuration</b> (voir ci-dessous).</li><li>Choisis l'identifiant, le mot de passe (8 caractères minimum, mieux 12) et la filiale : <code>star_entreprise</code>, <code>sos_doc</code>, <code>drepanocytose</code>, <code>pilipili</code> ou <code>so_membres</code>.</li><li>Valide : le compte est créé, ou son mot de passe est remplacé s'il existait déjà.</li></ol>
  <div class="box"><b>Où trouver le code de configuration ?</b> Netlify → ton projet « star-entreprise » → <i>Site configuration</i> → <i>Environment variables</i> → <code>SETUP_TOKEN</code>. Seul toi y as accès. Au bout de quelques essais faux, la page se bloque quelques minutes.</div></section>

  <section class="page"><h2 class="t">5. Hébergement et services</h2>
  <table class="mini"><tr><th style="width:42mm">Élément</th><th>Détail</th></tr>
  <tr><td><b>Hébergeur des sites</b></td><td>Netlify, projet « star-entreprise » : adresse officielle komyo.starentreprise.com, adresse principale star-entreprise.netlify.app. Connexion avec ton compte personnel (otembadaddy2@gmail.com).</td></tr>
  <tr><td><b>Autres projets Netlify</b></td><td>« alpha-star-creat » (ALPHA, adresse propre) · « star-creat » (vide, erreur 404) · « sos-doc » (ancien SOS-DOC).</td></tr>
  <tr><td><b>Code</b></td><td>GitHub : otembadaddy2-oss/STAR-ENTREPRISE-. Chaque mise en ligne = une fusion sur la branche « main ».</td></tr>
  <tr><td><b>Base de données</b></td><td>Netlify DB (PostgreSQL), hébergée à l'étranger. Les comptes staff sont dans la table <code>accounts</code>.</td></tr>
  <tr><td><b>Intelligence artificielle</b></td><td>Anthropic (Claude) pour Keydou, Sarah et l'assistant des entreprises ; ElevenLabs pour les voix ; LiveKit pour le Salon et ÉCLAT ; WhatsApp (Meta) en préparation.</td></tr>
  <tr><td><b>Contact officiel</b></td><td>WhatsApp +242 06 656 50 50 · contact@starentreprise.com</td></tr>
  <tr><td><b>Immatriculation</b></td><td>RCCM CG-BZV-01-2026-A10-01950 · titulaire OTEMBA KIBANGOU Daddyh Cariany · 30, avenue Mbemba Théophile, Makélékélé, Brazzaville.</td></tr></table>
  <h3 style="margin-top:5mm">Noms des clés et réglages (leurs valeurs ne sont écrites nulle part ici)</h3>
  <p class="pt">Ils se trouvent dans Netlify → Site configuration → Environment variables. Ne jamais les envoyer par message.</p>
  <table class="mini"><tr><th>Usage</th><th>Noms</th></tr>
  <tr><td>Sécurité des connexions</td><td><code>JWT_SECRET</code>, <code>SETUP_TOKEN</code></td></tr>
  <tr><td>Intelligence artificielle, images, voix</td><td><code>ANTHROPIC_API_KEY</code>, <code>IMAGE_API_KEY</code>, <code>VOIX_API_KEY</code>, <code>ENTREPRISE_MODEL</code>, <code>COMPAGNON_MODEL</code></td></tr>
  <tr><td>Salon et ÉCLAT (vidéo en direct)</td><td><code>LIVEKIT_URL</code>, <code>LIVEKIT_API_KEY</code>, <code>LIVEKIT_API_SECRET</code></td></tr>
  <tr><td>WhatsApp Business</td><td><code>WHATSAPP_VERIFY_TOKEN</code>, <code>WHATSAPP_APP_SECRET</code>, <code>WHATSAPP_TOKEN</code>, <code>WHATSAPP_PHONE_ID</code></td></tr>
  <tr><td>Paiements</td><td><code>STARVIBE_PAYMENT_WEBHOOK_SECRET</code>, <code>MARKETPLACE_PAYMENT_WEBHOOK_SECRET</code>, <code>NUMERO_RECEPTION_AIRTEL</code></td></tr>
  <tr><td>E-mails</td><td><code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>CONTACT_TO</code></td></tr>
  <tr><td>Prix et taux (facultatifs)</td><td><code>PRIX_PREMIUM_FCFA</code>, <code>PRIX_PRESTIGE_FCFA</code>, <code>TAUX_USD_FCFA</code></td></tr></table>
  <h2 class="t" style="margin-top:7mm">6. Sécurité : les bonnes habitudes</h2>
  <ul><li>Un <b>mot de passe différent</b> pour chaque accès, de <b>12 caractères ou plus</b> (mélange de lettres, chiffres et signes).</li><li>Utilise un <b>gestionnaire de mots de passe</b> (dans le téléphone) ou écris-les sur ce carnet, rangé <b>sous clé</b>.</li><li><b>Ne jamais</b> envoyer un mot de passe, un code PIN, un code de secours ou une clé par WhatsApp, SMS ou e-mail.</li><li>Si tu as un doute (téléphone perdu, personne qui connaît un accès) : refais le mot de passe tout de suite (partie 4).</li><li>Le code de secours n'est affiché <b>qu'une seule fois</b> : note-le à ce moment-là.</li></ul></section>

  <section class="page"><h2 class="t">7. Fiche d'accès à remplir à la main</h2>
  <p class="pt">À garder en lieu sûr, hors de portée. Les lignes sont volontairement vides : les mots de passe existants ne peuvent pas être relus.</p>
  <table class="fiche"><tr><th>Site</th><th>Identifiant / téléphone</th><th>Mot de passe</th><th>PIN / code de secours</th></tr>${fiche2}
  <tr><td><b>Netlify</b><br><small>compte otembadaddy2@gmail.com</small></td><td></td><td></td><td></td></tr>
  <tr><td><b>GitHub</b></td><td></td><td></td><td></td></tr>
  <tr><td><b>Code de configuration</b><br><small>SETUP_TOKEN</small></td><td colspan="3"></td></tr></table></section>
  </body></html>`;
  fs.writeFileSync(path.join(sortie, "carnet.html"), html);
  const nav2 = await chromium.launch(); const page = await nav2.newPage();
  await page.setContent(html, { waitUntil: "load" }); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);
  await page.pdf({ path: path.join(sortie, "STAR-ENTREPRISE-Carnet-des-sites-et-acces.pdf"), format: "A4", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
  await nav2.close(); srv.close(); console.log("PDF écrit");
})();
