// Visuels de partage de la page « Découvrez qui est STAR ENTREPRISE » :
//   - decouvrir/img/partage.jpg  (1200x630, aperçu du lien WhatsApp / Facebook / X)
//   - <sortie>/STAR-ENTREPRISE-statut-WhatsApp.jpg (1080x1920, statut / story, avec QR code)
// Usage : node tools/fabrique-partage.cjs <fichier QR en data-url> <dossier de sortie>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const R = path.resolve(__dirname, '..'); const D = R + '/decouvrir/'; const qr = fs.readFileSync(process.argv[2], 'utf8').trim(); const out = process.argv[3];
const f = n => 'file://' + D + n; const FONTS = `
@font-face{font-family:PF;font-weight:800;src:url(${f('polices/playfair-display-latin-800-normal.woff2')})}
@font-face{font-family:PF;font-weight:700;font-style:italic;src:url(${f('polices/playfair-display-latin-700-italic.woff2')})}
@font-face{font-family:CG;font-weight:600;font-style:italic;src:url(${f('polices/cormorant-garamond-latin-600-italic.woff2')})}
@font-face{font-family:ID;font-weight:300;src:url(${f('polices/inter-display-300.woff2')})}
@font-face{font-family:ID;font-weight:600;src:url(${f('polices/inter-display-600.woff2')})}
*{box-sizing:border-box;margin:0;padding:0}body{background:#07090f;color:#f6f1e6;font-family:ID,sans-serif;overflow:hidden}
.gold{background:linear-gradient(100deg,#b98a2c,#ffe29a 40%,#e3b653 60%,#fff1c2);-webkit-background-clip:text;color:transparent}`;
const og = `<style>${FONTS}
body{width:1200px;height:630px;position:relative;background:radial-gradient(90% 120% at 15% 30%,#14265a,#07090f)}
.g{position:absolute;right:0;top:0;bottom:0;width:560px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:8px;padding:8px 0 8px 8px}
.g img{width:100%;height:100%;object-fit:cover;border-radius:14px}.g img:first-child{grid-row:span 2}
.g::before{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(90deg,#07090f 0,#07090f00 30%)}
.t{position:absolute;left:54px;top:54px;width:600px;z-index:3}
.t img.l{width:112px;margin-bottom:20px;filter:drop-shadow(0 0 22px #e3b653aa)}
.t small{display:block;font:600 17px ID;letter-spacing:.3em;color:#e3b653;margin-bottom:12px}
.t h1{font:800 64px/1.02 PF;letter-spacing:-.01em}.t p{font:600 30px/1.2 CG;font-style:italic;color:#ffe29a;margin-top:18px;max-width:470px}
.u{position:absolute;left:54px;bottom:40px;z-index:3;font:600 21px ID;color:#e8e2d2;letter-spacing:.04em}</style>
<div class="g"><img src="${f('img/f-beach.webp')}"><img src="${f('img/x-calpros.webp')}"><img src="${f('img/g-wedding-cortege.webp')}"></div>
<div class="t"><img class="l" src="${f('img/logo-star.webp')}"><small>STAR ENTREPRISE · CONGO</small><h1>Découvrez qui est <span class="gold">STAR ENTREPRISE</span></h1><p>Un seul groupe, toutes les solutions pour votre vie.</p></div>
<div class="u">www.starentreprise.com/decouvrir</div>`;
const story = `<style>${FONTS}
body{width:1080px;height:1920px;position:relative;background:radial-gradient(120% 70% at 50% 0,#17306f,#07090f 62%)}
.top{text-align:center;padding-top:80px}.top img{width:190px;filter:drop-shadow(0 0 40px #e3b653aa)}
.top small{display:block;margin-top:26px;font:600 28px ID;letter-spacing:.34em;color:#e3b653}
h1{font:800 112px/1 PF;text-align:center;margin:24px 50px 0;letter-spacing:-.015em}
.sub{font:600 48px/1.2 CG;font-style:italic;text-align:center;color:#ffe29a;margin:20px 100px 0}
.mos{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:44px 70px 0;height:520px;grid-template-rows:520px}
.mos img{width:100%;height:100%;object-fit:cover;border-radius:26px;border:2px solid #e3b65366}
.mos div{display:grid;grid-template-rows:253px 253px;gap:14px;height:520px;overflow:hidden}
.mos div img{height:253px}
.mos>img{height:520px}
.pts{display:flex;flex-wrap:nowrap;gap:10px;justify-content:center;margin:34px 40px 0}
.pts span{font:600 26px ID;padding:12px 20px;white-space:nowrap;border-radius:99px;border:2px solid #e3b65377;background:#0d1220cc}
.bas{position:absolute;left:0;right:0;bottom:78px;display:flex;align-items:center;justify-content:center;gap:42px}
.bas img{width:250px;height:250px;border-radius:22px;border:10px solid #fff}
.bas p{font:600 38px/1.3 ID;max-width:520px}.bas b{display:block;font:800 46px/1.15 PF;color:#ffe29a;margin-bottom:8px}
.dr{position:absolute;bottom:22px;left:0;right:0;text-align:center;font:300 22px ID;color:#9aa1b4}</style>
<div class="top"><img src="${f('img/logo-star.webp')}"><small>STAR ENTREPRISE · CONGO</small></div>
<h1>Découvrez qui est <span class="gold">STAR ENTREPRISE</span></h1>
<p class="sub">Un seul groupe, toutes les solutions pour votre vie.</p>
<div class="mos"><img src="${f('img/ar-affiche-A.webp')}"><div><img src="${f('img/f-beach.webp')}"><img src="${f('img/a-komyo-bienvenue.webp')}"></div></div>
<div class="pts"><span>21 filiales</span><span>KOMYO</span><span>Keydou</span><span>STAR TECH</span><span>X SAPHIR</span></div>
<div class="bas"><img src="${qr}"><p><b>Touchez le lien ou scannez</b>www.starentreprise.com/decouvrir</p></div>
<div class="dr">© STAR ENTREPRISE — Tous droits réservés</div>`;
(async () => {
  const nav = await chromium.launch();
  async function rendre(html, w, h, dest, q) { const p = await nav.newPage({ viewport: { width: w, height: h } }); const tmp = '/tmp/partage-' + w + '.html'; fs.writeFileSync(tmp, '<!doctype html><meta charset=utf-8>' + html); await p.goto('file://' + tmp); await p.waitForTimeout(900); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: dest, type: 'jpeg', quality: q }); await p.close(); console.log(dest, Math.round(fs.statSync(dest).size / 1024), 'Ko'); }
  await rendre(og, 1200, 630, D + 'img/partage.jpg', 84);
  await rendre(story, 1080, 1920, out + '/STAR-ENTREPRISE-statut-WhatsApp.jpg', 86);
  await nav.close();
})();
