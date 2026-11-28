/* STAR Scanner — mini générateur de PDF (images JPEG, une par page). Aucune bibliothèque, tout se passe sur l'appareil. */
(function () {
'use strict';
const enc = new TextEncoder();
function jpegBytes(canvas, q) {
  const d = canvas.toDataURL('image/jpeg', q || 0.86).split(',')[1]; const bin = atob(d); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u;
}
// pages : [{ canvas }] ; format : 'a4' (image ajustée sur une page A4, portrait ou paysage) ou 'image' (page à la taille de l'image)
function construirePdf(pages, opt) {
  opt = opt || {}; const parts = []; const offs = []; let pos = 0;
  const push = b => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); pos += u.length; };
  const obj = (n, corps) => { offs[n] = pos; push(n + ' 0 obj\n'); if (typeof corps === 'string') push(corps); else corps.forEach(push); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const N = pages.length; const kids = []; let nxt = 3 + 0;
  // numérotation : 1 catalogue, 2 pages, puis pour chaque page : page, contenu, image
  const ids = pages.map((_, i) => ({ page: 3 + i * 3, cont: 4 + i * 3, img: 5 + i * 3 }));
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [' + ids.map(x => x.page + ' 0 R').join(' ') + '] /Count ' + N + ' >>');
  pages.forEach((p, i) => {
    const c = p.canvas; const iw = c.width, ih = c.height; const jb = jpegBytes(c, opt.qualite);
    let pw, ph;
    if (opt.format === 'image') { pw = 595; ph = Math.round(595 * ih / iw); } else { const paysage = iw > ih * 1.15; pw = paysage ? 842 : 595; ph = paysage ? 595 : 842; }
    const marge = opt.format === 'image' ? 0 : 18; const s = Math.min((pw - 2 * marge) / iw, (ph - 2 * marge) / ih); const w = iw * s, h = ih * s, x = (pw - w) / 2, y = (ph - h) / 2;
    const cont = 'q ' + w.toFixed(2) + ' 0 0 ' + h.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' cm /Im0 Do Q';
    obj(ids[i].page, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 ' + ids[i].img + ' 0 R >> >> /Contents ' + ids[i].cont + ' 0 R >>');
    obj(ids[i].cont, '<< /Length ' + cont.length + ' >>\nstream\n' + cont + '\nendstream');
    obj(ids[i].img, ['<< /Type /XObject /Subtype /Image /Width ' + iw + ' /Height ' + ih + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jb.length + ' >>\nstream\n', jb, '\nendstream']);
  });
  const total = 3 + N * 3; const xref = pos;
  push('xref\n0 ' + total + '\n0000000000 65535 f \n');
  for (let n = 1; n < total; n++) push(String(offs[n]).padStart(10, '0') + ' 00000 n \n');
  push('trailer\n<< /Size ' + total + ' /Root 1 0 R /Info << /Title (Scan STAR) /Producer (STAR Scanner) >> >>\nstartxref\n' + xref + '\n%%EOF');
  return new Blob(parts, { type: 'application/pdf' });
}
window.StarPdf = { construirePdf };
})();
