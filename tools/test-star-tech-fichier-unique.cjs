// Vérifie la version « un seul fichier » (celle qu'on ouvre sur téléphone) : la panne vue le 19/11 (balise </script> dans un commentaire).
// Lancer : python3 tools/fabrique-star-tech.py /tmp/star-tech && node tools/test-star-tech-fichier-unique.cjs /tmp/star-tech/STAR-TECH-demo.html
const { chromium } = require("playwright"); const path = require("path");
let ko = 0; const ok = (c, m) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
(async () => {
  const f = path.resolve(process.argv[2] || "/tmp/star-tech/STAR-TECH-demo.html");
  const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text()); });
  await page.goto("file://" + f); await page.waitForTimeout(1500);
  ok(!/…/.test(await page.textContent("#info")) && /GPU actif/.test(await page.textContent("#info")), "la carte « Ton appareil » s'affiche : " + (await page.textContent("#info")).split("\n")[0]);
  ok(!/StarGPU|function \(racine\)|const gpu =/.test(await page.evaluate(() => document.body.innerText)), "aucun code ne s'affiche en texte dans la page");
  const noir = await page.evaluate(() => { const c = document.getElementById("cvImg"), x = document.createElement("canvas"); x.width = c.width; x.height = c.height; const t = x.getContext("2d"); t.drawImage(c, 0, 0); const d = t.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s; });
  ok(noir > 1e5, "l'image filtrée n'est pas noire (somme des couleurs " + noir + ")");
  await page.click("#bUc"); await page.waitForTimeout(2500); const uc = await page.evaluate(() => window.__uc);
  ok(uc && uc.ecartMax < 1e-2, "UC STAR répond dans la version un seul fichier : " + JSON.stringify(uc));
  // STAR IA dans la version un seul fichier : choisir un modèle sur l'appareil et discuter (petit modèle de test)
  const modele = path.resolve(process.argv[3] || "/tmp/ia-test/test-q8_0.gguf");
  if (require("fs").existsSync(modele)) {
    ok(await page.evaluate(() => typeof StarIA === "object" && typeof StarIA.charger === "function"), "STAR IA est présent dans le fichier unique");
    await page.setInputFiles("#iaFic", modele); await page.waitForSelector("#iaChat:not([hidden])", { timeout: 60000 });
    await page.fill("#iaSaisie", "Bonjour"); await page.fill("#iaLong", "32"); await page.click("#iaEnvoi");
    await page.waitForFunction(() => /mots\/seconde/.test(document.getElementById("iaStats").textContent), null, { timeout: 60000 });
    const nbBulles = (await page.$$("#iaFil .bu")).length;
    ok(/GPU/.test(await page.textContent("#iaEtat")) && nbBulles === 2, "conversation avec un modèle dans le fichier unique : " + (await page.textContent("#iaStats")).split("\n").join(" | "));
  }
  ok(erreurs.length === 0, "aucune erreur dans la console " + erreurs.slice(0, 2).join(" | "));
  await nav.close(); console.log(ko ? ko + " ÉCHEC(S)" : "TOUS LES TESTS PASSENT"); process.exit(ko ? 1 : 0);
})().catch((e) => { console.log("ÉCHEC", e); process.exit(1); });
