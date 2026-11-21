// Test du moteur WebGPU de STAR IA (étape 1) : produit matrice × vecteur 4 et 8 bits, comparé au processeur.
// Lance Chromium avec un GPU simulé par logiciel (SwiftShader) : vérifie que les calculs sont JUSTES, pas la vitesse.
// Usage : NODE_PATH=$(npm root -g) node tools/test-star-ia-webgpu.cjs
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader', '--no-sandbox'] });
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.join(__dirname, 'test-webgpu-telephone.html'));   // une page « sûre » (WebGPU n'existe pas sur about:blank)
  await p.addScriptTag({ path: path.join(__dirname, '../star-gpu/star-ia.js') });
  await p.addScriptTag({ path: path.join(__dirname, '../star-gpu/star-ia-webgpu.js') });
  const r = await p.evaluate(async () => {
    const out = {};
    const api = await StarIAWebGPU.ouvrir();
    if (!api) return { absent: true };
    out.adaptateur = api.adaptateur; out.limites = api.limites;
    out.normal = await StarIAWebGPU.autoTest(api, StarIA);
    // Même test avec de TOUT PETITS tampons : force le découpage en plusieurs morceaux
    const api2 = StarIAWebGPU.creer(api.device, { octetsMaxTampon: 4096 });
    out.decoupe = await StarIAWebGPU.autoTest(api2, StarIA);
    out.erreursGPU = api.erreurs.concat(api2.erreurs);
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  console.log('ERREURS PAGE', errs);
  await b.close();
  const ok = r && !r.absent && r.normal.ok && r.decoupe.ok && !errs.length && !r.erreursGPU.length;
  console.log(ok ? 'RÉSULTAT : TOUT EST JUSTE' : 'RÉSULTAT : ÉCHEC'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
