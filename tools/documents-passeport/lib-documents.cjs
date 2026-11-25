// Bibliothèque commune des documents « Passeport Sûr » : style, pièces de mise en page, conversion des images, rendu PDF (Chromium).
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const RACINE = path.join(__dirname, '..', '..'); const CAPT = path.join(__dirname, 'captures'); const TMP = path.join(__dirname, '.images'); const POL = path.join(RACINE, 'passeport-demo', 'polices');
fs.mkdirSync(TMP, { recursive: true });
const BUT_COURT = 'But : suivre chaque demande de passeport de A à Z, ordonner la file d’attente et détecter automatiquement les fraudes.';
const BUT_PHRASE = 'Passeport Sûr a un but simple : que chaque demande de passeport soit <b>suivie</b> de A à Z, que chaque personne soit reçue <b>dans l’ordre</b>, et que les <b>fraudes et contournements</b> soient repérés automatiquement.';
// Image compressée (JPEG) pour garder des PDF légers
// Les captures pleine page très hautes sont recadrées (partie haute) pour tenir dans une page : rapport hauteur/largeur maximal.
const RATIO = { d_tableau_demo: 0.78, d_tableau: 0.78, d_fraude: 0.72, d_file_apres: 0.7, d_file_avant: 0.7, d_apropos: 0.7 };
function img(nom, max = 1500) { const src = path.join(CAPT, nom + '.png'); if (!fs.existsSync(src)) throw new Error('capture manquante : ' + nom); const dst = path.join(TMP, nom + '-' + max + '.jpg'); const r = RATIO[nom];
  if (!fs.existsSync(dst) || fs.statSync(dst).mtimeMs < fs.statSync(src).mtimeMs) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', (r ? `crop=iw:min(ih\\,iw*${r}):0:0,` : '') + `scale='min(${max},iw)':-2`, '-q:v', '3', dst]); return 'file://' + dst; }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const CSS = `
@font-face{font-family:ID;font-weight:300;src:url(file://${POL}/inter-display-300.woff2) format("woff2")}
@font-face{font-family:ID;font-weight:600;src:url(file://${POL}/inter-display-600.woff2) format("woff2")}
@font-face{font-family:ID;font-weight:800;src:url(file://${POL}/inter-display-800.woff2) format("woff2")}
@font-face{font-family:PF;font-weight:800;src:url(file://${POL}/playfair-display-latin-800-normal.woff2) format("woff2")}
@font-face{font-family:PF;font-weight:700;font-style:italic;src:url(file://${POL}/playfair-display-latin-700-italic.woff2) format("woff2")}
:root{--foret:#062b1e;--foret2:#0a4430;--vert:#009543;--vert2:#e3f4e9;--jaune:#f6c928;--jaune2:#fff6cf;--rouge:#d62f26;--rouge2:#fdeceb;--ivoire:#f6f3ea;--encre:#12201a;--gris:#5d6b64;--trait:#e0dac6}
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:24mm 16mm 20mm}@page :first{margin:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:ID,sans-serif;font-weight:300;font-size:10.6pt;line-height:1.5;color:var(--encre)}
h1{font-family:PF,serif;font-weight:800;font-size:25pt;line-height:1.12;color:var(--foret);margin:0 0 5mm;break-after:avoid}
h2{font-family:PF,serif;font-weight:800;font-size:15.5pt;line-height:1.2;color:var(--foret);margin:7mm 0 2.5mm;break-after:avoid}
h3{font-weight:800;font-size:11.4pt;color:var(--foret2);margin:4.5mm 0 1.6mm;break-after:avoid}
p{margin:0 0 3mm}b,strong{font-weight:800}
ul,ol{margin:0 0 3.2mm 5.5mm}li{margin-bottom:1.4mm}
.chap{break-before:page}
.cover{height:297mm;width:210mm;position:relative;color:#fff;background:radial-gradient(150mm 110mm at 85% -8%,#0f6a45 0,transparent 70%),linear-gradient(150deg,#041f15,#0a4430);padding:22mm 18mm 18mm;display:flex;flex-direction:column;break-after:page;overflow:hidden}
.cover:after{content:"";position:absolute;left:0;right:0;bottom:0;height:7mm;background:linear-gradient(90deg,var(--vert) 0 33.3%,var(--jaune) 33.3% 66.6%,var(--rouge) 66.6%)}
.cover img.lg{height:36mm;width:auto;align-self:flex-start}
.cover .kic{margin-top:14mm;letter-spacing:.28em;font-size:9.5pt;color:#f9e08a;text-transform:uppercase}
.cover h1{color:#fff;font-size:44pt;margin:3mm 0 4mm}.cover .sous{font-size:15pt;font-weight:300;color:#d5ebde;max-width:150mm}
.cover .but{margin-top:12mm;background:#ffffff14;border:.4mm solid #ffffff3d;border-radius:5mm;padding:7mm 8mm;max-width:165mm}
.cover .but small{display:block;letter-spacing:.24em;font-size:8.6pt;color:#f9e08a;text-transform:uppercase;margin-bottom:2.5mm;font-weight:600}
.cover .but p{font-size:13pt;line-height:1.45;margin:0;color:#fff}
.cover .bas{margin-top:auto;font-size:9.6pt;color:#cfe5d9;line-height:1.5}.cover .bas b{color:#fff}
.butband{background:linear-gradient(100deg,var(--foret),var(--foret2));color:#fff;border-radius:4mm;padding:6mm 7mm;margin:0 0 6mm;break-inside:avoid}
.butband small{display:block;letter-spacing:.22em;font-size:8pt;color:#f9e08a;text-transform:uppercase;margin-bottom:1.5mm;font-weight:600}
.butband p{margin:0;font-size:12.4pt;line-height:1.45;font-weight:600;color:#fff}.butband b{color:#f9e08a}
.cartes{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin:3mm 0 5mm}.cartes.deux{grid-template-columns:repeat(2,1fr)}
.carte{border:.3mm solid var(--trait);border-top:1.3mm solid var(--vert);border-radius:3mm;padding:4mm;background:#fff;break-inside:avoid}.carte.j{border-top-color:var(--jaune)}.carte.r{border-top-color:var(--rouge)}.carte.f{border-top-color:var(--foret)}
.carte h3{margin:0 0 1.5mm;font-size:11pt}.carte p{margin:0;font-size:9.6pt}
.note{border-left:1.4mm solid var(--jaune);background:var(--jaune2);padding:3.2mm 4mm;border-radius:0 2.5mm 2.5mm 0;margin:3mm 0 4mm;font-size:9.8pt;break-inside:avoid}.note.v{border-color:var(--vert);background:var(--vert2)}.note.r{border-color:var(--rouge);background:var(--rouge2)}
figure{margin:3mm 0 4.5mm;break-inside:avoid;text-align:center}figure img{max-width:100%;max-height:112mm;width:auto;border:.25mm solid var(--trait);border-radius:2.5mm;box-shadow:0 1mm 3mm #062b1e22}figure.p img{max-height:86mm}figcaption{font-size:8.8pt;color:var(--gris);margin-top:1.6mm}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:5mm;align-items:start;break-inside:avoid;margin:3mm 0 4.5mm}.duo figure{margin:0}
.tel-duo{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin:3mm 0 4.5mm;break-inside:avoid}.tel-duo figure{margin:0}.tel-duo img{border-radius:4mm;max-height:120mm}
.tel img{width:50mm;border-radius:5mm}.col-img{display:grid;grid-template-columns:1fr 52mm;gap:6mm;align-items:start;break-inside:avoid;margin:2mm 0 4mm}.col-img figure{margin:0}
table{width:100%;border-collapse:collapse;margin:2mm 0 5mm;font-size:9.4pt;break-inside:avoid}th{background:var(--foret);color:#fff;text-align:left;padding:2.2mm 2.6mm;font-weight:600;font-size:9pt}td{padding:2.2mm 2.6mm;border-bottom:.25mm solid var(--trait);vertical-align:top}tr{break-inside:avoid}tr:nth-child(even) td{background:#faf8f1}
.etapes{display:flex;gap:0;margin:3mm 0 5mm;break-inside:avoid}.etapes div{flex:1;background:var(--vert2);border-right:.6mm solid #fff;padding:3mm 2.5mm;font-size:8.8pt;text-align:center;position:relative}.etapes div:first-child{border-radius:3mm 0 0 3mm}.etapes div:last-child{border-radius:0 3mm 3mm 0;border:0}.etapes b{display:block;font-size:9.6pt;color:var(--foret);margin-bottom:.8mm}.etapes i{display:block;font-style:normal;font-family:PF,serif;font-weight:800;font-size:15pt;color:var(--vert)}
.pas{counter-reset:p;list-style:none;margin:2mm 0 4mm}.pas li{counter-increment:p;position:relative;padding:0 0 2.2mm 9mm;margin:0;break-inside:avoid}.pas li:before{content:counter(p);position:absolute;left:0;top:.2mm;width:6.4mm;height:6.4mm;border-radius:50%;background:var(--vert);color:#fff;font-weight:800;font-size:8.6pt;text-align:center;line-height:6.4mm}
.fin{break-before:page;text-align:center;padding-top:40mm}.fin img{height:34mm}.fin h2{margin-top:10mm}.fin p{color:var(--gris)}
.sig{display:flex;align-items:center;gap:6mm;border-top:.4mm solid var(--trait);margin-top:8mm;padding-top:5mm;break-inside:avoid}.sig img{height:20mm}.sig div{font-size:9.4pt;color:var(--gris)}
.chip{display:inline-block;background:var(--vert2);color:var(--foret);border-radius:99px;padding:.4mm 3mm;font-size:8.6pt;font-weight:600}.chip.j{background:var(--jaune2)}.chip.r{background:var(--rouge2);color:var(--rouge)}
.toc{columns:2;column-gap:10mm;margin:3mm 0}.toc div{break-inside:avoid;display:flex;gap:3mm;padding:1.4mm 0;border-bottom:.25mm dotted var(--trait);font-size:10pt}.toc b{width:7mm;color:var(--vert);font-family:PF,serif;font-weight:800}
`;
const entete = titre => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:7.4px;width:100%;padding:0 16mm;color:#0a4430;display:flex;gap:8px;align-items:center;border-bottom:.6px solid #cfc8b2;padding-bottom:3px"><b style="color:#009543;letter-spacing:.14em">PASSEPORT SÛR</b><span style="color:#5d6b64">${titre}</span><span style="margin-left:auto;font-weight:bold">${BUT_COURT}</span></div>`;
const pied = titre => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:7.6px;width:100%;padding:0 16mm;color:#5d6b64;display:flex"><span>STAR ENTREPRISE — Brazzaville · ${titre} · Données de démonstration entièrement fictives</span><span style="margin-left:auto">Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
function couverture({ kic, titre, sous, aQui }) {
  return `<section class="cover"><img class="lg" src="file://${RACINE}/passeport-demo/logo.svg" alt=""><div class="kic">${kic}</div><h1>${titre}</h1><div class="sous">${sous}</div>
  <div class="but"><small>Le but de l’application</small><p>${BUT_PHRASE}</p></div>
  <div class="bas"><b>${aQui}</b><br>Version du 25 novembre 2026 · Proposition de projet : démonstration avec des données <b>entièrement fictives</b>.<br>Préparé par <b>STAR ENTREPRISE</b>, Brazzaville.</div></section>`;
}
const butBand = () => `<div class="butband"><small>Rappel : le but de l’application</small><p>${BUT_PHRASE}</p></div>`;
const fig = (nom, legende, max = 1500, cls = '') => `<figure class="${cls}"><img src="${img(nom, max)}" alt=""><figcaption>${legende}</figcaption></figure>`;
const duo = (a, b) => `<div class="duo">${fig(a[0], a[1], 1100)}${fig(b[0], b[1], 1100)}</div>`;
const tels = (liste) => `<div class="tel-duo">${liste.map(([n, l]) => fig(n, l, 600)).join('')}</div>`;
const signature = () => `<div class="sig"><img src="file://${RACINE}/passeport-demo/img/star-entreprise.webp" alt="STAR ENTREPRISE"><div><b>STAR ENTREPRISE</b> — conception et réalisation de « Passeport Sûr ».<br>Site : www.starentreprise.com · Tous droits réservés.</div></div>`;
async function rendre({ html, titre, sortie }) {
  const { chromium } = require('playwright'); const base = path.basename(sortie, '.pdf'); const f = path.join(TMP, base + '.html'), fc = path.join(TMP, base + '-couv.html');
  const page = h => '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + esc(titre) + '</title><style>' + CSS + '</style></head><body>' + h + '</body></html>';
  fs.writeFileSync(f, page(html));
  const m = html.match(/<section class="cover">[\s\S]*?<\/section>/); if (m) fs.writeFileSync(fc, page(m[0]));
  const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  const tmpPdf = path.join(TMP, base + '-corps.pdf');
  await p.pdf({ path: tmpPdf, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: entete(titre), footerTemplate: pied(titre), preferCSSPageSize: true });
  if (m) { const c = await b.newPage(); await c.goto('file://' + fc); await c.evaluate(() => document.fonts.ready); await c.waitForTimeout(500); const cp = path.join(TMP, base + '-couv.pdf'); await c.pdf({ path: cp, format: 'A4', printBackground: true, preferCSSPageSize: true, pageRanges: '1' });
    // la couverture (sans en-tête ni pied de page) remplace la première page : la numérotation reste juste
    execFileSync('/usr/bin/python3', ['-I', '-c', 'import sys\nfrom pypdf import PdfReader, PdfWriter\nw=PdfWriter(); w.add_page(PdfReader(sys.argv[2]).pages[0])\nr=PdfReader(sys.argv[1])\n[w.add_page(p) for p in r.pages[1:]]\nw.add_metadata({"/Title": sys.argv[4], "/Author": "STAR ENTREPRISE"})\nw.write(sys.argv[3])', tmpPdf, cp, sortie, titre]);
  } else fs.copyFileSync(tmpPdf, sortie);
  await b.close(); console.log('PDF : ' + sortie + ' (' + Math.round(fs.statSync(sortie).size / 1024) + ' Ko)');
}
module.exports = { BUT_COURT, BUT_PHRASE, img, fig, duo, tels, couverture, butBand, signature, rendre, RACINE };
