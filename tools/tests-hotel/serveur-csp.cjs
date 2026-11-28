// Serveur statique de test qui applique les en-têtes de _headers (CSP, etc.) aux chemins /terrain-sur, /hotel-reception, /passeport-demo.
// Lancer : node tools/tests-hotel/serveur-csp.cjs  (port 8769) puis BASE=http://127.0.0.1:8769/hotel-reception/ node tools/tests-hotel/t_hotel.cjs
const http = require('http'), fs = require('fs'), path = require('path'); const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.mp4': 'video/mp4', '.gz': 'application/gzip', '.traineddata': 'application/octet-stream' };
const blocs = []; let cur = null;
fs.readFileSync(path.join(ROOT, '_headers'), 'utf8').split('\n').forEach(l => { if (/^\s*#/.test(l) || !l.trim()) return; if (/^\S/.test(l)) { cur = { motif: l.trim(), h: {} }; blocs.push(cur); } else if (cur) { const i = l.indexOf(':'); cur.h[l.slice(0, i).trim()] = l.slice(i + 1).trim(); } });
const ok = (motif, p) => motif.endsWith('/*') ? p.startsWith(motif.slice(0, -1)) : motif === p || (motif.includes('*') && new RegExp('^' + motif.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(p));
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  const h = { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }; blocs.filter(b => ok(b.motif, p)).forEach(b => Object.assign(h, b.h)); if (/\.gz$/.test(f)) { delete h['Content-Type']; h['Content-Type'] = 'application/octet-stream'; }
  res.writeHead(200, h); fs.createReadStream(f).pipe(res);
}).listen(8769, '127.0.0.1', () => console.log('serveur CSP sur 8769'));
