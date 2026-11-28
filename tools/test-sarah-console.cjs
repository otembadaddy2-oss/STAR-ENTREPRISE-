// Essai de la console de Sarah dans un navigateur (téléphone) contre tools/serveur-sarah-local.mts
const { chromium } = require("playwright");
const fs = require("fs");
const B = "http://127.0.0.1:8791"; const OUT = process.argv[2] || "/tmp/sarah-console"; fs.mkdirSync(OUT, { recursive: true });
let ko = 0; const ok = (c, m) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
const att = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const token = await (await fetch(B + "/__token")).text();
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const erreurs = []; p.on("pageerror", (e) => erreurs.push(String(e))); p.on("dialog", (d) => d.accept());
  // 1. sans connexion → écran de connexion
  await p.goto(B + "/starvibe/sarah-admin.html"); await att(500);
  ok(await p.isVisible("#loginView") && !(await p.isVisible("#mainView")), "sans connexion : seul l'écran de connexion est visible");
  await p.screenshot({ path: OUT + "/01-connexion.png" });
  // 2. connecté (jeton staff)
  await p.evaluate((t) => localStorage.setItem("starvibe_admin_token", t), token); await p.reload(); await att(900);
  ok(await p.isVisible("#mainView"), "avec le jeton de l'équipe : la console s'ouvre");
  ok(/Pas encore en service/.test(await p.textContent("#badge")), "avant la connexion : « Pas encore en service »");
  const liste = await p.$$eval("#checklist li", (l) => l.map((x) => x.textContent));
  ok(liste.some((x) => /WHATSAPP_VERIFY_TOKEN/.test(x)) && liste.some((x) => /non enregistré/.test(x)), "la liste de contrôle dit précisément ce qui manque");
  ok(/https?:\/\/.*\/api\/sarah-whatsapp/.test(await p.textContent("#urlHook")), "l'adresse du Webhook à donner à Meta est affichée");
  await p.screenshot({ path: OUT + "/02-etat-avant.png", fullPage: true });
  // 3. enregistrement + test
  await p.fill("#fPhone", "109876543210123"); await p.fill("#fToken", "EAAG-jeton-de-test-très-secret"); await p.click("#btnSave"); await att(900);
  ok(/Enregistré/.test(await p.textContent("#cfgMsg")), "numéro et jeton enregistrés");
  ok(await p.inputValue("#fToken") === "", "le jeton saisi est effacé de l'écran");
  await p.click("#btnTest"); await att(900);
  ok(/Connexion réussie/.test(await p.textContent("#cfgMsg")), "test de connexion : le numéro du service à la clientèle est confirmé");
  await p.reload(); await att(900);
  ok(/Sarah est en service/.test(await p.textContent("#badge")), "après la connexion : « Sarah est en service »");
  ok(!(await p.content()).includes("EAAG-jeton"), "le jeton n'apparaît nulle part dans la page");
  // 4. des clients écrivent
  await fetch(B + "/__client?de=242055111222&nom=Mireille%20K&t=" + encodeURIComponent("Bonjour, c'est quoi STAR ENTREPRISE ?")); await att(500);
  await fetch(B + "/__client?de=242066333444&nom=Rodrigue%20M&t=" + encodeURIComponent("J'ai payé 1000 FCFA, voici la référence")); await att(600);
  const envois = await (await fetch(B + "/__envois")).json(); ok(envois.length === 2 && envois.every((e) => e.texte.length > 10), "Sarah a répondu aux 2 clients");
  await p.click("#tabAll"); await att(700);
  ok((await p.$$("#convList .conv")).length === 2, "liste « Toutes » : 2 conversations");
  await p.click("#tabTodo"); await att(700);
  ok((await p.$$("#convList .conv")).length === 1 && /Rodrigue/.test(await p.textContent("#convList")), "liste « À reprendre » : seulement la personne qui annonce un paiement");
  await p.screenshot({ path: OUT + "/03-liste.png", fullPage: true });
  // 5. ouvrir, répondre
  await p.click("#convList .conv"); await att(700);
  ok(await p.isVisible("#convView") && /242066333444/.test(await p.textContent("#convWho")), "la conversation montre le numéro du client pour le rappeler");
  const bulles = await p.$$eval("#bubbles .b", (l) => l.map((x) => x.className));
  ok(bulles.some((c) => /client/.test(c)) && bulles.some((c) => /sarah/.test(c)), "les messages du client et de Sarah sont distingués");
  await p.screenshot({ path: OUT + "/04-conversation.png" });
  await p.fill("#fReply", "Bonjour Rodrigue, c'est l'équipe STAR ENTREPRISE : votre paiement est bien reçu."); await p.click("#btnSend"); await att(900);
  ok(/envoyé sur WhatsApp/.test(await p.textContent("#convMsg")), "la réponse de l'équipe est envoyée");
  const e2 = await (await fetch(B + "/__envois")).json(); ok(e2.length === 3 && /c'est l'équipe/.test(e2[2].texte) && e2[2].a === "242066333444", "elle arrive bien au bon numéro WhatsApp");
  ok((await p.$$eval("#bubbles .b.equipe", (l) => l.length)) === 1, "le message de l'équipe apparaît dans la conversation");
  await p.screenshot({ path: OUT + "/05-reponse-equipe.png" });
  await p.click("#btnDone"); await att(1400);
  ok(await p.isVisible("#mainView") && (await p.$$("#convList .conv")).length === 0, "« Marquer traité » : retour à la liste, plus rien à reprendre");
  // 6. arrêt d'urgence
  await p.click("#btnUrg"); await att(800);
  ok(/Arrêt d'urgence/.test(await p.textContent("#badge")), "arrêt d'urgence : affiché clairement");
  await fetch(B + "/__client?de=242055777888&t=Bonjour"); await att(500);
  ok((await (await fetch(B + "/__envois")).json()).length === 3, "pendant l'arrêt d'urgence : aucune réponse automatique");
  await p.click("#btnUrg"); await att(800);
  ok(/en service/.test(await p.textContent("#badge")), "arrêt d'urgence levé : Sarah est de nouveau en service");
  await p.screenshot({ path: OUT + "/06-etat-apres.png", fullPage: true });
  // 7. déconnexion
  await p.click("#btnLogout"); ok(await p.isVisible("#loginView"), "déconnexion : retour à l'écran de connexion");
  // 8. horizontal overflow
  const ov = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); ok(!ov, "aucun débordement horizontal sur téléphone");
  ok(erreurs.length === 0, "aucune erreur JavaScript" + (erreurs.length ? " : " + erreurs.join(" | ") : ""));
  await br.close(); console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTous les contrôles passent"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.log("CRASH", e); process.exit(1); });
