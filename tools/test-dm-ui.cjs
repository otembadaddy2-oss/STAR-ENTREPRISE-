// Test navigateur de la page Discussions (starvibe/discussions.html) avec une API SIMULÉE : aucun serveur réel, aucun coût.
// Lancer depuis la racine du dépôt : node tools/test-dm-ui.cjs   (captures dans /tmp/dm-*.png)
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const racine = process.cwd();
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json" };
const srv = http.createServer((rq, rs) => {
  const p = new URL(rq.url, "http://x").pathname;
  const f = path.normalize(path.join(racine, decodeURIComponent(p)));
  if (f.startsWith(racine) && fs.existsSync(f) && fs.statSync(f).isFile()) { rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(fs.readFileSync(f)); }
  else { rs.writeHead(404); rs.end(); }
});
let ko = 0;
const ok = (c, m) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
const UA_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
const UA_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

(async () => {
  await new Promise((r) => srv.listen(0, r));
  const base = "http://localhost:" + srv.address().port;
  const nav = await chromium.launch();
  const envois = [];
  const msgs = [
    { id: 1, moi: false, texte: "Salut Carry, tu viens ce soir ?", date: new Date().toISOString(), lu: true },
    { id: 2, moi: true, texte: "Oui j'arrive !", date: new Date().toISOString(), lu: true },
  ];

  async function ouvre(ua, mode) {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, userAgent: ua });
    const page = await ctx.newPage();
    await page.addInitScript(() => { localStorage.setItem("starvibe_token", "jeton"); });
    // Chromium sans interface répond « denied » par défaut : on fixe l'état voulu (« default » = pas encore demandé, comme un vrai téléphone neuf).
    const etat = mode === "denied" ? "denied" : "default";
    await page.addInitScript((e) => { try { Object.defineProperty(Notification, "permission", { get: () => e }); } catch (x) { /* ignoré */ } }, etat);
    return { ctx, page };
  }
  async function api(page, opt) {
    const mineur = !!(opt && opt.mineur);
    await page.route("**/api/starvibe-dm**", async (route) => {
      const u = new URL(route.request().url()); const m = route.request().method();
      const rep = (d, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(d) });
      if (m === "GET" && u.searchParams.get("conversations")) {
        if (mineur) return rep({ autorise: false, message: "Les discussions entre amis sont réservées pour l'instant aux personnes de 18 ans et plus.", conversations: [] });
        return rep({ autorise: true, conversations: [
          { profilId: 7, nom: "Alice", photoUrl: null, dernier: { texte: "Salut Carry, tu viens ce soir ?", deMoi: false, date: new Date().toISOString() }, nonLus: 2 },
          { profilId: 8, nom: "Bob", photoUrl: null, dernier: null, nonLus: 0 }] });
      }
      if (m === "GET" && u.searchParams.get("photo")) return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64") });
      if (m === "GET" && u.searchParams.get("avec")) {
        const apres = Number(u.searchParams.get("apres")) || 0;
        return rep({ ami: { profilId: 7, nom: "Alice", photoUrl: null }, messages: msgs.filter((x) => x.id > apres), enPause: false });
      }
      if (m === "POST") {
        const b = JSON.parse(route.request().postData()); envois.push(b);
        if (b.action === "envoyer") { const nm = { id: msgs.length + 1, moi: true, texte: b.texte, date: new Date().toISOString(), lu: false }; msgs.push(nm); return rep({ ok: true, message: nm, notifie: true }); }
        if (b.action === "photo") { const nm = { id: msgs.length + 1, moi: true, texte: "[[photo:7-9/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa]]", date: new Date().toISOString(), lu: false }; msgs.push(nm); return rep({ ok: true, message: nm, notifie: true }); }
        if (b.action === "signaler") return rep({ ok: true, message: "Merci. L'équipe KOMYO va regarder. Tu peux aussi bloquer cette personne pour ne plus recevoir ses messages." });
      }
      return rep({ error: "?" }, 400);
    });
    await page.route("**/api/starvibe-myo**", async (route) => { envois.push(JSON.parse(route.request().postData())); route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ etat: "bloque" }) }); });
  }

  // 1. Android : liste, bandeau « Activer », conversation, envoi, signalement, blocage
  let { ctx, page } = await ouvre(UA_ANDROID);
  const erreurs = []; page.on("pageerror", (e) => erreurs.push(String(e)));
  await api(page);
  await page.goto(base + "/starvibe/discussions.html"); await page.waitForSelector(".ami");
  ok((await page.$$(".ami")).length === 2, "la liste montre les 2 amis");
  ok((await page.textContent(".badge")) === "2", "la pastille « 2 non lus » est visible sur Alice");
  ok(/Activer les notifications/.test(await page.textContent("#notifs")), "Android : le bandeau « Activer les notifications » apparaît tout seul");
  await page.screenshot({ path: "/tmp/dm-liste.png" });
  await page.click(".ami[data-id='7']"); await page.waitForSelector(".b");
  ok((await page.$$(".b")).length === 2 && /Salut Carry/.test(await page.textContent(".b.lui")), "la discussion s'ouvre avec les messages d'Alice et les miens");
  ok(page.url().includes("avec=7"), "l'adresse contient la discussion (le lien de notification ouvrira la bonne conversation)");
  await page.fill("#texte", "Super, j'apporte à manger"); await page.click("#btnEnvoi");
  await page.waitForFunction(() => document.querySelectorAll(".b").length === 3);
  ok(envois.some((e) => e.action === "envoyer" && e.texte === "Super, j'apporte à manger"), "l'envoi appelle le serveur avec le bon texte");
  ok(/j'apporte à manger/.test(await page.textContent("#fil")), "le message apparaît tout de suite dans la discussion");
  await page.screenshot({ path: "/tmp/dm-conv.png" });
  // --- Écran façon messagerie moderne (inspiré de la capture TikTok de Carry) ---
  ok(/Alice/.test(await page.textContent(".intro")) && /amis sur KOMYO/.test(await page.textContent(".intro")), "en-tête de profil de l'ami en haut de la discussion");
  ok((await page.$$(".sep")).length === 1 && /Aujourd'hui \d\d:\d\d/.test(await page.textContent(".sep")), "séparateur de jour « Aujourd'hui HH:MM » (un seul pour les messages du même moment)");
  ok((await page.$$(".l.lui .av")).length >= 1, "la photo/initiale de l'ami est à côté de ses messages");
  ok((await page.$$("#reacts button")).length === 8, "8 réactions rapides sous la discussion");
  const avant = envois.length; await page.click("#reacts button[data-e='❤️']"); await page.waitForTimeout(250);
  ok(envois.length === avant + 1 && envois[envois.length - 1].texte === "❤️", "un seul toucher sur ❤️ envoie la réaction");
  ok(await page.evaluate(() => [...document.querySelectorAll(".b.moi.gros")].some((e) => /❤️/.test(e.textContent))), "un message qui n'est qu'un émoji s'affiche en grand, sans bulle");
  await page.click("#bEmo"); ok(await page.isVisible("#panneau"), "le bouton 😊 ouvre le panneau d'émojis");
  await page.click("#gEmo button[data-e='😂']"); ok((await page.inputValue("#texte")).includes("😂"), "un émoji touché s'ajoute au message en cours");
  await page.fill("#texte", ""); await page.click("#panneau .onglets button[data-o='st']"); ok(await page.evaluate(() => document.getElementById("gEmo").classList.contains("st")), "l'onglet Autocollants affiche de grands autocollants");
  const av2 = envois.length; await page.click("#gEmo button[data-e='🔥']"); await page.waitForTimeout(250);
  ok(envois.length === av2 + 1 && envois[envois.length - 1].texte === "🔥" && !(await page.isVisible("#panneau")), "un autocollant s'envoie tout de suite et ferme le panneau");
  await page.screenshot({ path: "/tmp/dm-conv2.png" });
  // --- Photos, caméra et « j'aime » KOMYO ---
  ok(await page.isVisible("#bPlus"), "bouton « + » pour joindre une photo, à gauche de la zone d'écriture");
  await page.click("#bPlus"); ok(await page.isVisible("#menuJoindre") && /Prendre une photo/.test(await page.textContent("#menuJoindre")) && /galerie/.test(await page.textContent("#menuJoindre")), "le menu propose « Prendre une photo » et « Photo de la galerie »");
  ok(await page.getAttribute("#fCam", "capture") === "environment" && await page.evaluate(() => document.getElementById("jVid").disabled), "« Prendre une photo » ouvre la caméra arrière ; la vidéo est annoncée « bientôt »");
  const PNG1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");
  await page.click("#jGal"); await page.setInputFiles("#fGal", { name: "p.png", mimeType: "image/png", buffer: PNG1 });
  await page.waitForSelector("#pOui"); ok(/Envoyer cette photo à Alice/.test(await page.textContent(".dlg")), "un aperçu demande confirmation avant l'envoi de la photo");
  const avP = envois.length; await page.click("#pOui"); await page.waitForSelector(".b.photo img.ph");
  const pe = envois[envois.length - 1]; ok(envois.length === avP + 1 && pe.action === "photo" && /^data:image\/jpeg;base64,/.test(pe.image) && pe.profilId === 7, "la photo est réduite en JPEG puis envoyée à la bonne personne");
  await page.waitForFunction(() => { const i = document.querySelector("img.ph"); return i && i.src.startsWith("blob:"); }); ok(true, "la photo privée s'affiche (chargée avec le jeton d'accès)");
  await page.click("img.ph"); ok(await page.isVisible(".dlg img"), "toucher la photo l'ouvre en grand"); await page.click("#zFin");
  const avJ = envois.length; await page.click("#reacts button[data-e='[[jaime]]']"); await page.waitForTimeout(250);
  ok(envois.length === avJ + 1 && envois[envois.length - 1].texte === "[[jaime]]", "le j'aime KOMYO (pouce orange) est la 1re réaction rapide et s'envoie en un toucher");
  ok(await page.evaluate(() => !!document.querySelector(".b.moi.gros svg.pouce")) && !/\[\[jaime/.test(await page.textContent("#fil")), "le j'aime s'affiche en grand pouce orange, sans le texte technique");
  await page.screenshot({ path: "/tmp/dm-conv3.png" });
  await page.click("#titre"); await page.click("#mSig"); await page.waitForSelector("#sOui");
  await page.screenshot({ path: "/tmp/dm-signal.png" });
  await page.click("#sOui"); await page.waitForSelector("#sBloq");
  ok(envois.some((e) => e.action === "signaler" && e.joindre === true && e.profilId === 7), "signalement envoyé avec l'option « joindre les 10 derniers messages »");
  await page.click("#sBloq"); await page.waitForSelector("#bOui"); await page.click("#bOui"); await page.waitForSelector(".ami");
  ok(envois.some((e) => e.action === "bloquer" && e.profilId === 7), "le blocage passe par Myo et ramène à la liste");
  ok(erreurs.length === 0, "aucune erreur JavaScript " + erreurs.join("|"));
  await ctx.close();

  // 2. iPhone sans installation : message automatique
  ({ ctx, page } = await ouvre(UA_IOS)); await api(page);
  await page.goto(base + "/starvibe/discussions.html"); await page.waitForSelector("#notifs div");
  const t = await page.textContent("#notifs");
  ok(/écran d'accueil/.test(t) && /Partager/.test(t) && !/Activer les notifications/.test(t), "iPhone : message automatique « ajoute KOMYO à l'écran d'accueil » (pas de bouton Activer inutile)");
  await page.screenshot({ path: "/tmp/dm-ios.png" }); await ctx.close();

  // 3. Notifications bloquées
  ({ ctx, page } = await ouvre(UA_ANDROID, "denied")); await api(page);
  await page.goto(base + "/starvibe/discussions.html"); await page.waitForSelector("#notifs div");
  const t3 = await page.textContent("#notifs");
  ok(/bloquées/.test(t3) && /Autorisations/.test(t3), "notifications bloquées : explication pour les rouvrir"); await ctx.close();

  // 4. Mineur
  ({ ctx, page } = await ouvre(UA_ANDROID)); await api(page, { mineur: true });
  await page.goto(base + "/starvibe/discussions.html"); await page.waitForSelector(".card");
  ok(/réservées aux adultes/.test(await page.textContent("#vueListe")), "un mineur voit « Discussions réservées aux adultes »"); await ctx.close();

  // 5. Sans connexion
  const c5 = await nav.newContext(); const p5 = await c5.newPage();
  await p5.goto(base + "/starvibe/discussions.html"); await p5.waitForSelector("#sortie:not([hidden])");
  ok(true, "sans connexion : invitation à se connecter"); await c5.close();

  await nav.close(); srv.close();
  console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUS LES TESTS PASSENT");
  process.exit(ko ? 1 : 0);
})();
