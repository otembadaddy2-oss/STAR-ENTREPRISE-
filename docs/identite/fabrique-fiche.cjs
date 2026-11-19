// Fabrique la fiche d'identité légale de STAR ENTREPRISE (PDF, 2 pages) : page 1 = fiche lisible, page 2 = bloc à placer sur les documents.
// Lancer depuis la racine : node docs/identite/fabrique-fiche.cjs [NIU]   (sans NIU : une ligne à remplir à la main)
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const racine = process.cwd();
const niu = (process.argv[2] || "").trim();
const logo = "data:image/webp;base64," + fs.readFileSync(path.join(racine, "assets/img/logo-star-rounded-v1.webp")).toString("base64");
const NIU = niu ? `<b class="num">${niu}</b>` : `<span class="vide">&nbsp;</span>`;
const NIUtxt = niu || "............................";
const marques = ["KOMYO (réseau social vidéo et Salon)", "Keydou (assistant personnel et pour entreprises)", "STAR CRÉAT (studio créatif)", "ALPHA (diffusion et campagnes)", "SOS DOC et PIOUPIOU", "KIDIMBOU (guichet unique des démarches)", "STAR ALERTE (signalement d'urgence)", "La Maison de la Drépanocytose (Pointe-Noire)", "Pili-Pili Events (événementiel)", "S.O — gestion des membres", "STAR Marketplace", "D-INNOVATION BTP (Pointe-Noire)", "D-INNOVATION Pressing (Pointe-Noire)", "STAR Énergie (kit solaire)", "JARDIS (assistant de direction)", "X SAPHIR (jeu et film, en préparation)"];
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:"Helvetica Neue",Arial,sans-serif;color:#1b1b2b;font-size:12.5pt;line-height:1.45}
.page{width:210mm;height:297mm;padding:12mm 16mm 14mm;position:relative;page-break-after:always;overflow:hidden}
.page:last-child{page-break-after:auto}
.bandeau{display:flex;align-items:center;gap:14px;border-bottom:3px solid #1b1b2b;padding-bottom:8px;margin-bottom:8px}
.bandeau img{width:62px;height:62px;border-radius:14px}
.bandeau h1{margin:0;font-size:25pt;letter-spacing:.5px}
.bandeau p{margin:2px 0 0;font-size:11pt;color:#555}
h2{font-size:12pt;margin:12px 0 5px;text-transform:uppercase;letter-spacing:1px;color:#1b1b2b;border-left:6px solid #d4a017;padding-left:8px}
table{width:100%;border-collapse:collapse}
td{padding:4px 8px;border:1px solid #c9c9d6;vertical-align:top;font-size:11pt;line-height:1.35}
td:first-child{width:36%;background:#f3f3f8;font-weight:700}
.num{font-size:12.5pt;letter-spacing:.6px;font-family:"Courier New",monospace}
.vide{display:inline-block;min-width:60mm;border-bottom:1.5px solid #1b1b2b}
ul{margin:4px 0 0;padding-left:18px;columns:2;column-gap:18px;font-size:10.5pt;line-height:1.3}
li{margin-bottom:2px;break-inside:avoid}
.note{font-size:9.5pt;color:#555;margin-top:8px}
.pied{position:absolute;left:16mm;right:16mm;bottom:9mm;font-size:9.5pt;color:#555;border-top:1px solid #c9c9d6;padding-top:5px}
.bloc{border:2.5px solid #1b1b2b;border-radius:6px;padding:11px 14px;margin:8px 0 18px;font-size:12pt;line-height:1.5}
.bloc.petit{font-size:9.5pt;line-height:1.35;padding:7px 10px;border-width:1.5px}
.bloc b{letter-spacing:.2px}
.copie{white-space:pre-wrap;font-family:"Courier New",monospace;font-size:10.5pt;background:#f3f3f8;border:1px dashed #9a9ab0;border-radius:6px;padding:10px 12px}
</style></head><body>
<div class="page">
 <div class="bandeau"><img src="${logo}" alt=""><div><h1>STAR ENTREPRISE</h1><p>Ets STAR ENTREPRISE · Brazzaville, République du Congo</p></div></div>
 <h2>Identité de l'entreprise</h2>
 <table>
  <tr><td>Nom commercial / enseigne</td><td>STAR ENTREPRISE — Ets STAR ENTREPRISE</td></tr>
  <tr><td>Forme juridique</td><td>Entreprise individuelle</td></tr>
  <tr><td>Représentant légal</td><td>OTEMBA KIBANGOU Daddyh Cariany (Carry OTEMBA), président-fondateur</td></tr>
  <tr><td>Activité déclarée</td><td>Programmation informatique — J620001 (conception de site web)</td></tr>
  <tr><td>Adresse du principal établissement</td><td>30, avenue Mbemba Théophile, Makélékélé, Brazzaville</td></tr>
  <tr><td>Contact</td><td>WhatsApp +242 06 656 50 50 · contact@starentreprise.com</td></tr>
 </table>
 <h2>Références officielles</h2>
 <table>
  <tr><td>N° RCCM</td><td><b class="num">CG-BZV-01-2026-A10-01950</b><br>Tribunal de Commerce de Brazzaville, immatriculé le 03/09/2026</td></tr>
  <tr><td>NIU</td><td>${NIU}</td></tr>
  <tr><td>N° SCIEN (entreprise)</td><td><b class="num">2174308</b><br>Institut National de la Statistique, 06/09/2026</td></tr>
  <tr><td>N° SCIET (établissement)</td><td><b class="num">2174308013</b></td></tr>
  <tr><td>Autorisation d'exercice des activités commerciales</td><td><b class="num">AEXE20540EI19575BZV070926/MCAC/DGCI/DPCN</b><br>Ministère du Commerce, 07/09/2026 — code activité J620001.04.20540</td></tr>
  <tr><td>Dossier de création</td><td>ACPCE, Direction interdépartementale de Brazzaville-Pool, n° 02510, 02/09/2026</td></tr>
 </table>
 <h2>Marques et projets portés par STAR ENTREPRISE</h2>
 <ul>${marques.map((m) => `<li>${m}</li>`).join("")}</ul>
 <p class="note">Les documents originaux (extrait RCCM, certificat INS, autorisation d'exercice) peuvent être présentés sur demande et vérifiés auprès des autorités qui les ont délivrés. Seul le greffier du Tribunal de Commerce délivre des extraits signés en original.</p>
 <div class="pied">STAR ENTREPRISE · Vos idées. Notre éclat. Un diamant. · Fiche établie le 16/11/2026</div>
</div>
<div class="page">
 <div class="bandeau"><img src="${logo}" alt=""><div><h1>Bloc légal des documents</h1><p>Factures, devis, contrats, courriers : à copier tel quel en pied de page</p></div></div>
 <h2>Version lisible (factures, devis)</h2>
 <div class="bloc"><b>STAR ENTREPRISE</b> — Ets STAR ENTREPRISE, entreprise individuelle<br>
 30, avenue Mbemba Théophile, Makélékélé, Brazzaville (Congo)<br>
 <b>RCCM</b> CG-BZV-01-2026-A10-01950 · <b>NIU</b> ${NIUtxt}<br>
 <b>SCIEN</b> 2174308 · <b>SCIET</b> 2174308013<br>
 Autorisation d'exercice n° AEXE20540EI19575BZV070926/MCAC/DGCI/DPCN<br>
 contact@starentreprise.com · +242 06 656 50 50</div>
 <h2>Version courte (pied de page, petit format)</h2>
 <div class="bloc petit">STAR ENTREPRISE — Ets STAR ENTREPRISE, entreprise individuelle · 30, avenue Mbemba Théophile, Makélékélé, Brazzaville · RCCM CG-BZV-01-2026-A10-01950 · NIU ${NIUtxt} · SCIEN 2174308 · SCIET 2174308013 · contact@starentreprise.com</div>
 <h2>Texte à copier</h2>
 <div class="copie">STAR ENTREPRISE — Ets STAR ENTREPRISE, entreprise individuelle
30, avenue Mbemba Théophile, Makélékélé, Brazzaville (Congo)
RCCM CG-BZV-01-2026-A10-01950 · NIU ${NIUtxt}
SCIEN 2174308 · SCIET 2174308013
Autorisation d'exercice n° AEXE20540EI19575BZV070926/MCAC/DGCI/DPCN
contact@starentreprise.com · +242 06 656 50 50</div>
 <p class="note">Ce bloc ne contient que des références d'entreprise. Il ne doit jamais contenir le domicile personnel, la date de naissance ni les numéros de pièce d'identité du représentant.</p>
 <div class="pied">STAR ENTREPRISE · Bloc légal · Fiche établie le 16/11/2026</div>
</div></body></html>`;
(async () => {
  const nav = await chromium.launch(); const page = await nav.newPage();
  await page.setContent(html, { waitUntil: "load" });
  const sortie = path.join(racine, "docs/identite/STAR-ENTREPRISE-Fiche-identite-legale.pdf");
  await page.pdf({ path: sortie, format: "A4", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: "/tmp/fiche-p1.png", fullPage: true });
  await nav.close(); console.log("écrit", sortie);
})();
