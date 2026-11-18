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
      if (m === "GET" && u.searchParams.get("avec")) {
        const apres = Number(u.searchParams.get("apres")) || 0;
        return rep({ ami: { profilId: 7, nom: "Alice", photoUrl: null }, messages: msgs.filter((x) => x.id > apres), enPause: false });
      }
      if (m === "POST") {
        const b = JSON.parse(route.request().postData()); envois.push(b);
        if (b.action === "envoyer") { const nm = { id: 3, moi: true, texte: b.texte, date: new Date().toISOString(), lu: false }; msgs.push(nm); return rep({ ok: true, message: nm, notifie: true }); }
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
