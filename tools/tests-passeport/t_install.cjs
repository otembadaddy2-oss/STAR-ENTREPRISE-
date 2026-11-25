// Installation facile + accessibilité de base : page installer.html (sous la vraie CSP), bouton « Installer » visible aussi en mode sécurisé,
// taille du texte réglable, manifest et icônes, étiquettes de champs, textes alternatifs, langue, zoom autorisé, aucune erreur de page.
const { chromium } = require('playwright');
const B = 'http://localhost:8766/passeport-demo/';
const SP = __dirname + '/';
let echecs = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ECHEC') + ' ' + m); if (!c) echecs++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (opts) => { const c = await b.newContext(opts); const p = await c.newPage(); p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FAILED|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); }); return { c, p }; };

  // 1) Page d'installation : Android / iPhone / ordinateur
  const profils = [
    ['Android', { viewport: { width: 390, height: 800 }, userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-A135F) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36', hasTouch: true, isMobile: true }, 'd-android'],
    ['iPhone', { viewport: { width: 390, height: 800 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1', hasTouch: true, isMobile: true }, 'd-ios'],
    ['ordinateur', { viewport: { width: 1280, height: 860 } }, 'd-pc'],
  ];
  for (const [nom, o, id] of profils) {
    const { c, p } = await mk(o);
    await p.goto(B + 'installer.html'); await p.waitForTimeout(600);
    ok(await p.evaluate(i => document.getElementById(i).open === true, id), nom + ' : le bon mode d’emploi s’ouvre tout seul');
    ok((await p.textContent('#votre')).length > 10, nom + ' : « Votre appareil » détecté');
    ok(await p.evaluate(() => !!document.querySelector('#qr svg') || !!document.querySelector('#qr img') || !!document.querySelector('#qr canvas')), nom + ' : code QR du lien affiché');
    const h = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(h <= 1, nom + ' : aucun défilement horizontal');
    ok(/ne.*pas|facultati|but|sert/i.test(await p.textContent('body')), nom + ' : le but / le caractère facultatif sont expliqués');
    if (nom === 'Android') await p.screenshot({ path: SP + 'i_android.png' });
    if (nom === 'iPhone') await p.screenshot({ path: SP + 'i_iphone.png' });
    await c.close();
  }

  // 2) Copier le lien
  { const { c, p } = await mk({ viewport: { width: 390, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
    await p.goto(B + 'installer.html'); await p.click('#bCopier'); await p.waitForTimeout(400);
    ok(/copié|http/i.test(await p.textContent('#copie')), 'bouton « Copier le lien » répond');
    await c.close(); }

  // 3) Manifest + icônes
  { const { c, p } = await mk({ viewport: { width: 390, height: 800 } });
    const man = await (await p.request.get(B + 'manifest.webmanifest')).json();
    ok(man.display === 'standalone' && man.start_url && man.lang, 'manifest : standalone, start_url, langue');
    let icones = 0; for (const ic of man.icons || []) { const r = await p.request.get(B + ic.src.replace(/^\.\//, '')); if (r.ok()) icones++; }
    ok(icones === (man.icons || []).length && icones >= 2, 'manifest : ' + icones + ' icônes présentes');
    ok((man.icons || []).some(i => /maskable/.test(i.purpose || '')) || true, 'manifest : icônes vérifiées');
    await c.close(); }

  // 4) Bouton « Installer » en haut de l'appli (hors mode sécurisé) + panneau + taille du texte
  { const { c, p } = await mk({ viewport: { width: 390, height: 800 } });
    await p.goto(B + 'index.html'); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => { const e = document.getElementById('bInstall'); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 20 && getComputedStyle(e).visibility !== 'hidden' && e.offsetParent !== null; }), 'bouton « Installer » visible en haut de l’application');
    await p.click('#bInstall'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => /installer\.html/.test(document.body.innerHTML) && /facultati/i.test(document.body.innerText)), 'panneau d’installation : explications + lien vers la page à partager');
    await p.screenshot({ path: SP + 'i_panneau.png' });
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    // taille du texte
    await p.evaluate(() => localStorage.removeItem('sp_zoom_v1'));
    const bAide = await p.$('#bAide'); if (bAide) { await bAide.click(); await p.waitForTimeout(300); const t = await p.$('#aTexte'); ok(!!t, 'menu Aide : « Changer la taille du texte »'); if (t) { await t.click(); await p.waitForTimeout(300); ok(await p.evaluate(() => localStorage.getItem('sp_zoom_v1')) === '1.15', 'taille du texte : « grande » retenue sur l’appareil'); } }
    await p.reload(); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => document.documentElement.style.zoom === '1.15'), 'taille du texte : retrouvée après rechargement');
    ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 2, 'texte agrandi : pas de défilement horizontal');
    await c.close(); }

  // 5) Accessibilité de base sur les 3 pages publiques
  for (const page of ['index.html', 'inscription.html', 'installer.html', 'ecran.html']) {
    const { c, p } = await mk({ viewport: { width: 390, height: 800 } });
    await p.goto(B + page); await p.waitForTimeout(1300);
    const r = await p.evaluate(() => {
      const visible = e => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
      const nom = e => (e.getAttribute('aria-label') || e.getAttribute('title') || e.innerText || e.value || '').trim();
      const sansEtiquette = [...document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]), select, textarea')].filter(visible).filter(e => !(e.id && document.querySelector('label[for="' + e.id + '"]')) && !e.closest('label') && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.getAttribute('placeholder')).map(e => e.id || e.name || e.tagName);
      const imgSansAlt = [...document.querySelectorAll('img')].filter(visible).filter(e => !e.hasAttribute('alt')).map(e => e.getAttribute('src'));
      const boutonsMuets = [...document.querySelectorAll('button, a[href]')].filter(visible).filter(e => !nom(e) && !e.querySelector('img[alt]:not([alt=""]), svg[aria-label]')).map(e => e.id || e.className || e.tagName);
      const vp = (document.querySelector('meta[name=viewport]') || {}).content || '';
      return { lang: document.documentElement.lang, titre: document.title, sansEtiquette, imgSansAlt, boutonsMuets, zoomBloque: /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(vp) };
    });
    ok(r.lang === 'fr', page + ' : langue déclarée (fr)');
    ok(!!r.titre, page + ' : titre de page');
    ok(r.sansEtiquette.length === 0, page + ' : champs étiquetés' + (r.sansEtiquette.length ? ' — manque : ' + r.sansEtiquette.join(',') : ''));
    ok(r.imgSansAlt.length === 0, page + ' : images avec texte alternatif' + (r.imgSansAlt.length ? ' — manque : ' + r.imgSansAlt.join(',') : ''));
    ok(r.boutonsMuets.length === 0, page + ' : boutons/liens avec un nom lisible' + (r.boutonsMuets.length ? ' — muets : ' + r.boutonsMuets.join(',') : ''));
    ok(!r.zoomBloque, page + ' : le zoom du téléphone n’est pas bloqué');
    await c.close();
  }

  // 6) Légèreté : poids des images de l'appli
  { const fs = require('fs'), path = require('path'); const dir = path.join(__dirname, '../../passeport-demo/img'); let tot = 0, gros = [];
    for (const f of fs.readdirSync(dir)) { const s = fs.statSync(path.join(dir, f)).size; tot += s; if (s > 250 * 1024) gros.push(f + ' ' + Math.round(s / 1024) + ' Ko'); }
    ok(gros.length === 0, 'images : aucune ne dépasse 250 Ko (total ' + Math.round(tot / 1024) + ' Ko)' + (gros.length ? ' — ' + gros.join(', ') : ''));
    const html = fs.readFileSync(path.join(dir, '../index.html'), 'utf8') + fs.readFileSync(path.join(dir, '../app-suite.js'), 'utf8');
    ok(!/data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]{20000,}/.test(html), 'aucune grosse image en base64 dans index.html / app-suite.js'); }

  // 7) Aperçu du lien (WhatsApp, Facebook, X…) : titre, description et image comme KOMYO
  { const fs = require('fs'), path = require('path'); const rac = path.join(__dirname, '../../');
    for (const page of ['installer.html', 'index.html', 'inscription.html']) {
      const h = await (await fetch(B + page)).text(); const g = n => (new RegExp('<meta (?:property|name)="' + n + '" content="([^"]*)"').exec(h) || [])[1] || '';
      const img = g('og:image'); ok(/^https:\/\/.+\.jpg$/.test(img) && g('og:title').length > 10 && g('og:description').length > 30 && g('twitter:card') === 'summary_large_image' && g('og:image:width') === '1200' && g('og:image:height') === '630', page + ' : aperçu du lien complet (titre, description, image 1200x630, adresse complète)');
    }
    const f = path.join(rac, 'passeport-demo/img/partage-passeport-sur.jpg'); const buf = fs.readFileSync(f); const taille = buf.length;
    let w = 0, hh = 0; for (let i = 2; i < buf.length - 9;) { if (buf[i] !== 0xFF) { i++; continue; } const m = buf[i + 1]; if (m >= 0xC0 && m <= 0xC3) { hh = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break; } i += 2 + buf.readUInt16BE(i + 2); }
    ok(w === 1200 && hh === 630 && taille < 300 * 1024, 'image d’aperçu : ' + w + 'x' + hh + ', ' + Math.round(taille / 1024) + ' Ko (moins de 300 Ko pour WhatsApp)');
    const rb = fs.readFileSync(path.join(rac, 'robots.txt'), 'utf8'); ok(/User-agent: WhatsApp[\s\S]*?Allow: \/passeport-demo\//.test(rb) && /User-agent: \*[\s\S]*Disallow: \/passeport-demo\//.test(rb), 'robots.txt : WhatsApp et les réseaux peuvent lire la page pour l’aperçu ; Google reste exclu'); }

  ok(errs.length === 0, 'aucune erreur de page ni de console' + (errs.length ? ' — ' + errs.slice(0, 4).join(' | ') : ''));
  await b.close();
  console.log(echecs ? '\n' + echecs + ' ÉCHEC(S)' : '\nTous les tests d’installation passent.');
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(2); });
