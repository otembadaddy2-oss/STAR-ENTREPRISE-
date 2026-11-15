// Fabrique les deux PDF « Keydou pour les entreprises » :
//   KOMYO-Offre-Entreprises-Keydou.pdf          (à montrer aux entreprises : la page starvibe/entreprises.html)
//   KOMYO-Entreprises-Note-interne-cout-marge.pdf (INTERNE : coût d'un message, marge, ce qui est construit, ce qui reste)
// Lancer depuis la racine du dépôt : node docs/komyo/entreprises/fabrique-pdf.cjs [dossier de sortie]
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const racine = process.cwd(), sortie = process.argv[2] || path.join(racine, "docs/komyo/entreprises");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2" };
const srv = http.createServer((rq, rs) => {
  const f = path.normalize(path.join(racine, decodeURIComponent(new URL(rq.url, "http://x").pathname)));
  if (f.startsWith(racine) && fs.existsSync(f) && fs.statSync(f).isFile()) { rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(fs.readFileSync(f)); } else { rs.writeHead(404); rs.end(); }
});
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = "http://localhost:" + srv.address().port;
  const nav = await chromium.launch(); const page = await nav.newPage({ viewport: { width: 900, height: 1200 } });
  for (const [url, nom, pied] of [["/starvibe/entreprises.html", "KOMYO-Offre-Entreprises-Keydou.pdf", "STAR ENTREPRISE · Keydou pour les entreprises"], ["/docs/komyo/entreprises/note-interne.html", "KOMYO-Entreprises-Note-interne-cout-marge.pdf", "INTERNE — ne pas montrer aux clients"]]) {
    await page.goto(base + url); await page.evaluate(() => document.fonts.ready); await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; })); await page.emulateMedia({ media: "print" });
    await page.pdf({ path: path.join(sortie, nom), format: "A4", printBackground: true, margin: { top: "12mm", bottom: "14mm", left: "0", right: "0" }, displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: `<div style="font:9px Arial;color:#777;width:100%;text-align:center">${pied} · page <span class="pageNumber"></span>/<span class="totalPages"></span></div>` });
    console.log("écrit", nom);
  }
  await nav.close(); srv.close();
})();
