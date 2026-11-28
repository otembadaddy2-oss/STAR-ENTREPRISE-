/* TERRAIN SÛR — journal chaîné : chaque relevé contient l'empreinte du précédent. Modifier ou effacer un relevé casse la chaîne et se voit.
   Tout est stocké sur l'appareil (hors connexion). La synchronisation avec un serveur d'État n'existe pas encore (voir le dossier). */
(function () {
'use strict';
// SHA-256 en JavaScript pur : fonctionne aussi hors HTTPS
function sha256(msg) {
  const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  const bytes = typeof msg === 'string' ? new TextEncoder().encode(msg) : msg; const l = bytes.length; const nb = ((l + 9 + 63) >> 6) << 6; const b = new Uint8Array(nb); b.set(bytes); b[l] = 0x80;
  const dv = new DataView(b.buffer); dv.setUint32(nb - 4, (l * 8) >>> 0); dv.setUint32(nb - 8, Math.floor(l * 8 / 4294967296));
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19; const w = new Uint32Array(64);
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < nb; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0; }
    let a = h0, bb = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) { const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) >>> 0, S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0; }
    h0 = (h0 + a) >>> 0; h1 = (h1 + bb) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(x => x.toString(16).padStart(8, '0')).join('');
}
function sha256Octets(buf) { return sha256(new Uint8Array(buf)); }
const CLE = 'terrain-sur-journal-v1', CLE_CH = 'terrain-sur-chantiers-v1';
function lire(cle) { try { return JSON.parse(localStorage.getItem(cle) || '[]'); } catch (e) { return []; } }
function ecrire(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); return true; } catch (e) { return false; } }
function tout() { return lire(CLE); }
function contenu(e) { const c = Object.assign({}, e); delete c.hash; delete c.thumb; return JSON.stringify(c); }
function ajouter(rel) {
  const j = tout(); const prev = j.length ? j[j.length - 1].hash : '0'.repeat(64);
  const e = Object.assign({}, rel, { n: j.length + 1, prev }); e.hash = sha256(prev + contenu(e)); j.push(e);
  if (!ecrire(CLE, j)) { // stockage plein : on retire les miniatures les plus anciennes (le hash ne dépend pas d'elles)
    j.forEach((x, i) => { if (i < j.length - 5) delete x.thumb; }); ecrire(CLE, j);
  }
  return e;
}
function verifier() { // retourne { ok, n, cassure }
  const j = tout(); let prev = '0'.repeat(64);
  for (let i = 0; i < j.length; i++) { const e = j[i]; if (e.prev !== prev) return { ok: false, n: j.length, cassure: e.n, raison: 'Le lien avec le relevé précédent est rompu.' };
    if (sha256(e.prev + contenu(e)) !== e.hash) return { ok: false, n: j.length, cassure: e.n, raison: 'Le contenu du relevé a été modifié après coup.' }; prev = e.hash; }
  return { ok: true, n: j.length };
}
function trouver(code) { const c = String(code || '').trim().toLowerCase(); if (!c) return null; return tout().find(e => e.hash.startsWith(c) || (e.id || '').toLowerCase() === c) || null; }
function simulerFalsification() { const j = tout(); if (!j.length) return false; const e = j[Math.max(0, j.length - 2)]; e.score = Math.max(0, (e.score || 0) - 30); e.niveau = 'favorable'; ecrire(CLE, j); return true; }
function vider() { try { localStorage.removeItem(CLE); } catch (e) {} }
function chantiers() { return lire(CLE_CH); } function sauverChantiers(c) { ecrire(CLE_CH, c); }
function distanceM(a, b) { const R = 6371000, r = x => x * Math.PI / 180; const dLa = r(b.lat - a.lat), dLo = r(b.lon - a.lon); const s = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); }
window.TSJournal = { sha256, sha256Octets, ajouter, tout, verifier, trouver, simulerFalsification, vider, chantiers, sauverChantiers, distanceM };
})();
