// Guide vidéo « Passeport Sûr » : tourne l'application RÉELLE (données fictives) dans un cadre avec légendes, pointeur et cartes de titre.
// Pré-requis : serveur de test sur 8766 (voir capturer.cjs). Lancer : NODE_PATH=$(npm root -g) node tools/documents-passeport/fabrique-video.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const BASE = process.env.BASE || 'http://localhost:8766/'; const APP = BASE + 'passeport-demo/'; const DIR = path.join(__dirname, 'video'); const FIX = path.join(__dirname, '..', 'tests-passeport') + '/';
const SORTIE = path.join(__dirname, '..', '..', 'docs', 'passeport-sur') + '/'; fs.mkdirSync(DIR, { recursive: true }); fs.mkdirSync(SORTIE, { recursive: true });
const BUT = 'Passeport Sûr a un but simple : que chaque demande de passeport soit <b>suivie</b> de A à Z, que chaque personne soit reçue <b>dans l’ordre</b>, et que les <b>fraudes et contournements</b> soient repérés automatiquement.';
const voix = []; let page, ctx; const echecs = [];
const wait = ms => page.waitForTimeout(ms); const F = n => page.frame({ name: n });
const texte = h => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const lecture = t => Math.max(3200, Math.round(texte(t).split(' ').length * 330) + 900);
const leg = async (num, titre, t, ms) => { voix.push(titre + '. ' + texte(t)); await page.evaluate(([a, b, c]) => V.leg(a, b, c), [num, titre, t]); await wait(ms || lecture(t)); };
const carte = async (html, ms, nomVoix) => { voix.push(nomVoix || texte(html)); await page.evaluate(h => V.carte(h), html); await wait(ms); await page.evaluate(() => V.carte(null)); await wait(700); };
async function pointeur(fr, sel, clic = true, nth = 0) {
  const el = fr.locator(sel).nth(nth); await el.scrollIntoViewIfNeeded().catch(() => { }); const b = await el.boundingBox(); if (!b) throw new Error('introuvable : ' + sel);
  await page.evaluate(([x, y]) => V.curseur(x, y, false), [b.x + b.width / 2 - 4, b.y + b.height / 2 - 4]); await wait(650);
  if (clic) { await page.evaluate(([x, y]) => V.curseur(x, y, true), [b.x + b.width / 2 - 4, b.y + b.height / 2 - 4]); await wait(220); try { await el.click({ timeout: 2500 }); } catch (e) { console.log('  (clic direct) ' + sel + ' : ' + e.message.split('\n').filter(l => /intercepts|not visible|detached/.test(l)).join(' ').slice(0, 160)); await el.evaluate(n => n.click()); } } return el;
}
async function taper(fr, sel, t, delai = 85) { const el = fr.locator(sel); await pointeur(fr, sel, true); await el.fill(''); await el.pressSequentially(t, { delay: delai }); }
const scene = async (nom, fn) => {
  if (process.env.SCENES && !process.env.SCENES.split(',').includes(nom)) return;
  try { await fn(); console.log('OK   ' + nom); }
  catch (e) { echecs.push(nom); console.log('ECHEC ' + nom + ' : ' + e.message.split('\n').slice(0, 10).join(' | ')); try { await page.screenshot({ path: path.join(DIR, 'echec-' + nom.replace(/\W+/g, '_') + '.png') }); } catch (x) { } }
};
const api = (body) => page.evaluate(async b => { const r = await fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return r.json(); }, body);

(async () => {
  const b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, locale: 'fr-FR', timezoneId: 'Africa/Brazzaville', recordVideo: { dir: DIR, size: { width: 1280, height: 720 } } });
  await ctx.addInitScript(() => { try { Element.prototype.requestFullscreen = function () { return Promise.resolve(); }; Element.prototype.webkitRequestFullscreen = Element.prototype.requestFullscreen; } catch (e) { } }); // le plein écran de l'écran de salle masquerait le cadre de tournage
  page = await ctx.newPage(); page.on('pageerror', e => console.log('  (erreur page) ' + e.message));
  await page.goto(BASE + 'tools/documents-passeport/video-cadre.html'); await page.evaluate(() => localStorage.clear()); await wait(800);
  let dos = null, code = '', pub = '';

  // ============ Titre + but ============
  await scene('titre', async () => {
    await carte(`<img class="lg" src="/passeport-demo/logo.svg"><div class="kic">Guide vidéo d’utilisation · de A à Z</div><h1>Passeport Sûr</h1><div class="sous">Suivi · Contrôle · Transparence</div><div class="but"><small>Le but de l’application</small><p>${BUT}</p></div>`, 11000, 'Guide vidéo d’utilisation de Passeport Sûr, de A à Z. ' + texte(BUT));
    await carte(`<div class="kic">En trois mots</div><h1 style="font-size:46px">À quoi sert Passeport Sûr ?</h1><div class="tr"><div><h3>Suivre</h3><p>Chaque dossier est suivi : dépôt, paiement, rendez-vous, traitement, remise. Le demandeur voit où en est son passeport.</p></div><div><h3>Ordonner</h3><p>Un rendez-vous après paiement, des numéros, des portes, des écrans de salle d’attente : chacun passe à son tour.</p></div><div><h3>Sécuriser</h3><p>Doublons, pièces modifiées, faux, réseaux d’intermédiaires : le système les signale à la Préfecture.</p></div></div><p style="margin-top:22px;font-size:20px;color:#cfe5d9">Pour : les demandeurs, les agents de guichet, la caisse, les agents de porte, la Préfecture et le Ministère. Cette vidéo vous montre chaque rôle, pas à pas.</p>`, 14000);
    await carte(`<div class="kic">La vision de son créateur</div><h1 style="font-size:44px">Un service public plus clair, plus juste, plus sûr</h1><div class="tr"><div><h3>Un service lisible</h3><p>Que chaque citoyen sache où en est sa demande, ce qu’il doit fournir et quand il sera reçu.</p></div><div><h3>Un accueil digne</h3><p>Que personne n’ait besoin de « connaître quelqu’un » : chacun est appelé à son tour, avec son nom, à une porte précise.</p></div><div><h3>Une confiance durable</h3><p>Que chaque étape laisse une trace, et que la décision reste toujours à l’agent habilité.</p></div></div><p style="margin-top:22px;font-size:20px;color:#cfe5d9">Conçu par STAR ENTREPRISE, à Brazzaville, sous la direction de Carry OTEMBA.</p>`, 13000);
    await carte(`<div class="kic">Qui fait quoi</div><h1 style="font-size:44px">Le rôle du Ministère et de la Préfecture</h1><div class="tr"><div><h3>Le Ministère</h3><p>Fixe la procédure, les pièces exigées et les tarifs officiels ; choisit l’hébergement des données ; suit les résultats.</p></div><div><h3>La Préfecture</h3><p>Désigne le site, forme les agents, gère l’espace partagé et examine les alertes de fraude.</p></div><div><h3>STAR ENTREPRISE</h3><p>Fournit et maintient l’application, forme les premiers utilisateurs et rend compte des résultats.</p></div></div><p style="margin-top:22px;font-size:20px;color:#cfe5d9">Répartition proposée, à confirmer avec les autorités. La décision de délivrer un passeport reste toujours humaine.</p>`, 13000);
  });

  // ============ 1. Démarrer ============
  await scene('démarrer', async () => {
    await page.evaluate(() => { V.mode('tel'); V.note('<h3>Installer, c’est facultatif</h3>Une page à partager par <b>WhatsApp</b> : elle reconnaît l’appareil et ne montre que les étapes utiles.'); });
    await page.evaluate(u => V.src('t', u), APP + 'installer.html'); await wait(2800);
    await leg('Étape 1 sur 10 · Démarrer', 'Une page d’installation pour tous', 'La Préfecture partage un lien par WhatsApp. La page reconnaît l’appareil — Android, iPhone ou ordinateur — et montre <b>seulement les étapes utiles</b>, avec un <b>code QR</b> à partager. <b>L’installation est facultative</b>.', 8500);
    await page.evaluate(() => V.mode('plein')); await page.evaluate(u => V.src('plein', u), APP + 'index.html?guide=1'); await wait(2800);
    await leg('Étape 1 sur 10 · Démarrer', 'Ouvrir le lien et choisir son rôle', 'Rien à installer, pas de compte : on ouvre le lien. Au premier lancement, l’application demande <b>« Quel est votre rôle ? »</b> et s’adapte.');
    await pointeur(F('plein'), '#guideProfil [data-p="agent"]'); await wait(1600);
    await leg('Étape 1 sur 10 · Démarrer', 'Une visite guidée d’une minute', 'Pour chaque rôle, une <b>visite guidée</b> met en lumière ce qu’il faut utiliser. On peut la passer à tout moment, et la relancer avec le bouton <b>❓ Aide</b>.', 6500);
    await pointeur(F('plein'), '#gSuiv'); await wait(2200); await pointeur(F('plein'), '#gSuiv'); await wait(2200); await pointeur(F('plein'), '#gPasser'); await wait(900);
  });

  // ============ 2. Guichet ============
  await scene('guichet', async () => {
    const f = F('plein'); await page.evaluate(u => V.src('plein', u), APP + 'index.html'); await wait(2500);
    await pointeur(f, 'nav button[data-v="guichet"]'); await wait(900);
    await leg('Étape 2 sur 10 · Agent de guichet', 'Enregistrer une demande', 'L’agent ouvre <b>Nouvelle demande</b>. D’abord le <b>type</b> : première demande, ou renouvellement d’un passeport expiré.', 5500);
    await leg('Étape 2 sur 10 · Agent de guichet', 'Scanner la pièce', 'Il photographie la <b>bande de lecture</b> de la pièce d’identité. Ici, un exemple : la <b>fiche se remplit toute seule</b>, avec contrôle des chiffres de clé.', 4500);
    await pointeur(f, '[data-ex="cni"]'); await wait(1500);
    await f.locator('#gt3').scrollIntoViewIfNeeded(); await wait(1200);
    await leg('Étape 2 sur 10 · Agent de guichet', 'Contrôler la fiche', 'L’agent vérifie la fiche et ajoute le <b>téléphone du demandeur</b> : c’est là que l’accusé sera envoyé.', 4000);
    await taper(f, '#f_tel', '+242 06 123 45 67'); await wait(900);
    await f.locator('#gt4').scrollIntoViewIfNeeded(); await wait(900);
    await leg('Étape 2 sur 10 · Agent de guichet', 'Joindre les pièces', 'Photo ou fichier, pièce par pièce. Si une pièce manque, le dossier reste <b>« incomplet »</b> : on pourra le terminer plus tard, ou le demandeur enverra la pièce depuis son téléphone.', 7500);
    await pointeur(f, '#edGuichet [data-pj="photo"][data-k="photo"]'); await f.locator('#pjPhoto').setInputFiles(FIX + 'visage-test.png'); await wait(900);
    for (const k of ['identite', 'naissance', 'nationalite']) { await pointeur(f, '#edGuichet [data-pj="fichier"][data-k="' + k + '"]'); await f.locator('#pjFichier').setInputFiles(FIX + 'visage-test.png'); await wait(800); }
    await f.locator('#sigPad').scrollIntoViewIfNeeded(); await wait(600);
    await leg('Étape 2 sur 10 · Agent de guichet', 'Faire signer', 'Le demandeur <b>signe avec le doigt</b> ou un stylet, directement sur l’écran.', 3800);
    const sb = await f.locator('#sigPad').boundingBox(); await page.evaluate(([x, y]) => V.curseur(x, y, false), [sb.x + 60, sb.y + 90]); await wait(700); await page.mouse.move(sb.x + 60, sb.y + 90); await page.mouse.down();
    for (let i = 0; i < 50; i++) { await page.mouse.move(sb.x + 60 + i * 10, sb.y + 90 + Math.sin(i / 3) * 48); await page.evaluate(([x, y]) => V.curseur(x, y, false), [sb.x + 60 + i * 10, sb.y + 90 + Math.sin(i / 3) * 48]); await wait(30); } await page.mouse.up(); await wait(800);
    await leg('Étape 2 sur 10 · Agent de guichet', 'Valider et remettre l’accusé', 'Un clic sur <b>Valider</b> : le dossier est créé et l’<b>accusé</b> s’affiche, avec son <b>numéro de reçu</b> et un <b>code QR</b>. Il est envoyé au demandeur sur WhatsApp.', 4500);
    await pointeur(f, '#bValider'); await wait(3800);
    dos = await f.evaluate(() => { const X = window.__spApi, d = X.DB.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; return { id: d.id, code: X.code(d.id, d.person.nom) }; });
    await wait(3000); await f.evaluate(() => { const t = document.getElementById('tiroir'); t && t.classList.remove('on'); });
  });

  // ============ 3. Caisse ============
  await scene('caisse', async () => {
    const f = F('plein'); await f.locator('#role').selectOption('caisse'); await wait(600); await pointeur(f, 'nav button[data-v="caisse"]'); await wait(900);
    await leg('Étape 3 sur 10 · Caisse', 'Ouvrir le dossier', 'Le demandeur présente son accusé. La caisse <b>scanne le code QR</b> — ou saisit le numéro de reçu et le code de contrôle — et le dossier s’ouvre.', 6500);
    await taper(f, '#k_id', dos.id, 70); await taper(f, '#k_code', dos.code, 90); await pointeur(f, '#bCaisseOuvrir'); await f.locator('#k_montant').waitFor({ timeout: 8000 }); await wait(1200);
    await leg('Étape 3 sur 10 · Caisse', 'Vérifier avant d’encaisser', 'La fiche, les pièces, la signature et les alertes s’affichent. <b>L’encaissement est bloqué</b> si une pièce obligatoire manque ou si une alerte grave n’a pas été examinée par la Préfecture.', 7500);
    await f.locator('#k_montant').scrollIntoViewIfNeeded().catch(() => { }); await wait(900);
    await leg('Étape 3 sur 10 · Caisse', 'Encaisser et éditer le reçu', 'Le montant officiel, <b>50 000 FCFA</b>, s’affiche déjà et ne peut pas être modifié à la caisse. On choisit le mode de paiement, puis <b>Encaisser</b>. Le <b>reçu</b> donne le <b>rendez-vous d’enrôlement</b> et le <b>numéro d’appel</b>.', 5500);
    await pointeur(f, '#bPayer'); await f.locator('.recu').waitFor({ timeout: 8000 }); await wait(3500);
    await f.evaluate(() => { const t = document.querySelector('#tiroir .feuille'); t && t.scrollTo({ top: 600, behavior: 'smooth' }); }); await wait(3500);
    await leg('Étape 3 sur 10 · Caisse', 'Le message WhatsApp du rendez-vous', 'Le demandeur reçoit <b>la date de son rendez-vous</b> et son numéro d’appel. Les numéros sont sans doublon, et la capacité du jour ne peut pas être dépassée.', 6000);
    await f.evaluate(() => { const t = document.getElementById('tiroir'); t && t.classList.remove('on'); });
  });

  // ============ 4. Préfecture : espace partagé ============
  await scene('préfecture : espace', async () => {
    const f = F('plein'); await page.evaluate(u => V.src('plein', u), APP + 'index.html'); await wait(2500); await f.locator('#role').selectOption('prefecture'); await wait(500);
    await leg('Étape 4 sur 10 · Préfecture', 'Créer l’espace partagé', 'Pour que tous les postes travaillent ensemble, la <b>Préfecture crée un espace</b> : un code à 8 caractères que le guichet, la caisse, les portes et les écrans rejoignent.', 6500);
    await pointeur(f, '#chipEspace'); await wait(900); await pointeur(f, '#bCreerEsp'); await f.waitForLoadState('load').catch(() => { }); await wait(3500);
    code = await f.evaluate(() => JSON.parse(localStorage.getItem('sp_espace_v1')).code); pub = await f.evaluate(() => window.__spSync.publique());
    await f.locator('#role').selectOption('prefecture'); await wait(400); await pointeur(f, '#chipEspace'); await wait(500);
    await leg('Étape 4 sur 10 · Préfecture', 'Le code, le QR et les liens', 'Le panneau donne le <b>code de l’espace</b>, un QR pour relier un poste, et le <b>lien des écrans de salle</b>. À ne pas partager publiquement.', 7000);
    await pointeur(f, '#bFerme'); await wait(500);
    await pointeur(f, 'nav button[data-v="reglages"]'); await wait(1200);
    await leg('Étape 4 sur 10 · Préfecture', 'Régler le site', 'Nombre de portes, personnes par jour, jours ouverts, heure de début, lieu. Ces valeurs sont des <b>exemples à fixer avec la Préfecture</b>.', 6500);
    await f.evaluate(() => window.scrollBy({ top: 360, behavior: 'smooth' })); await wait(2500);
  });

  // ============ 5. Pré-enregistrement du demandeur + accueil (front office) ============
  await scene('pré-enregistrement et accueil', async () => {
    await page.evaluate(() => { V.mode('tel'); V.note('<h3>Le demandeur se pré-enregistre</h3>Avec le <b>lien donné par la Préfecture</b>, il prépare sa demande depuis son téléphone, <b>sans compte</b>, avant de se déplacer.'); });
    await page.evaluate(u => V.src('t', u), APP + 'inscription.html?esp=' + pub); await wait(3000); const t = F('t');
    await leg('Étape 5 sur 10 · Pré-enregistrement', 'Le demandeur prépare sa demande', 'Il choisit le type de demande, puis remplit sa fiche : nom, prénoms, naissance, téléphone et pièce d’identité — <b>exactement comme sur la pièce originale</b>.', 7500);
    await taper(t, '#nom', 'Okemba', 80); await taper(t, '#prenoms', 'Prisca', 80);
    await pointeur(t, '#naiss'); await t.locator('#naiss').fill('1993-05-17'); await pointeur(t, '#sexe'); await t.locator('#sexe').selectOption('F');
    await taper(t, '#tel', '+242 06 321 54 76', 60); await taper(t, '#pnum', 'CNI772201', 80); await pointeur(t, '#pexp'); await t.locator('#pexp').fill('2031-02-28'); await wait(800);
    await leg('Étape 5 sur 10 · Pré-enregistrement', 'Il envoie, et reçoit son accusé', 'Il touche <b>« Envoyer »</b> et reçoit un <b>accusé avec code QR</b>. Ce n’est pas encore un dépôt : il devra se présenter à l’<b>accueil</b> avec ses <b>pièces originales</b>.', 6500);
    await pointeur(t, '#bEnvoyer'); await t.locator('#vRecu:not([hidden])').waitFor({ timeout: 10000 }); await wait(4500);
    const pre = await t.evaluate(() => ({ id: document.getElementById('rNum').textContent.trim(), code: document.getElementById('rCode').textContent.trim() }));
    await page.evaluate(() => V.mode('plein')); await page.evaluate(u => V.src('plein', u), APP + 'index.html?espace=' + code); await wait(3500); const f = F('plein');
    await f.waitForFunction(i => window.__spApi && window.__spApi.DB.some(d => d.id === i), pre.id, { timeout: 15000 });
    await f.evaluate(i => { const X = window.__spApi, d = X.DB.find(x => x.id === i); d.pieces = ['photo', 'identite', 'naissance', 'nationalite'].map((k, n) => ({ id: 'PJ-demo' + n, type: k, nom: k, mime: 'image/jpeg', taille: 1, at: new Date().toISOString(), par: 'demandeur', demo: true })); X.sauver(); }, pre.id);
    await f.locator('#role').selectOption('accueil'); await wait(600);
    await leg('Étape 5 sur 10 · Accueil (front office)', 'L’accueil reçoit la personne', 'L’agent d’<b>accueil</b> ouvre la page <b>Réception</b> et <b>scanne l’accusé</b> du demandeur — ou saisit le numéro de dossier et le code de contrôle.', 6500);
    await pointeur(f, 'nav button[data-v="reception"]'); await wait(1500);
    await taper(f, '#r_id', pre.id, 60); await taper(f, '#r_code', pre.code, 90); await pointeur(f, '#bRecepOuvrir'); await f.locator('#bRecepOk').waitFor({ timeout: 8000 }); await wait(1200);
    await leg('Étape 5 sur 10 · Accueil (front office)', 'Comparer avec les pièces originales', 'La fiche et les pièces s’affichent. L’agent <b>compare avec les originaux</b>, corrige les petites erreurs de saisie, puis coche les <b>trois vérifications</b>.', 7500);
    for (let i = 0; i < 3; i++) await pointeur(f, '.rv', true, i);
    await wait(900);
    await leg('Étape 5 sur 10 · Accueil (front office)', 'Vérifié : envoyer à la caisse', 'Un clic sur <b>« Vérifié »</b> envoie la personne à la caisse. En cas d’<b>écart</b> (identité différente, pièce suspecte), l’agent le signale : la Préfecture est alertée et <b>la caisse reste bloquée</b>.', 8000);
    await pointeur(f, '#bRecepOk'); await wait(3500);
  });

  // ============ 6. Salle d'attente : portes + écran ============
  await scene('portes et écran de salle', async () => {
    await page.evaluate(() => V.mode('split')); await page.evaluate(([a, b]) => { V.src('g', a); V.src('d', b); }, [APP + 'index.html?espace=' + code, APP + 'ecran.html?espace=' + code]); await wait(3500);
    const g = F('g'), d = F('d');
    await leg('Étape 6 sur 10 · Salle d’attente', 'Allumer l’écran de la salle', 'Sur la télévision, on ouvre le lien de l’écran, on donne un <b>nom à l’écran</b> et on touche <b>Démarrer</b>. Il affiche alors les appels en direct, avec la voix.', 6500);
    await taper(d, '#nomEcran', 'Salle d’attente 1', 70); await pointeur(d, '#bDemarrer'); await wait(2000);
    await g.locator('#role').selectOption('porte'); await wait(500); await pointeur(g, 'nav button[data-v="file"]'); await wait(1500);
    await leg('Étape 6 sur 10 · Salle d’attente', 'Chaque porte appelle le suivant', 'Les personnes ont <b>rendez-vous aujourd’hui</b>, dans l’ordre de leur paiement. Chaque porte touche <b>« Appeler le suivant »</b>.', 5500);
    await g.locator('#portes').scrollIntoViewIfNeeded(); await wait(500);
    await pointeur(g, '[data-act="appeler"][data-p="1"]'); await wait(700); await pointeur(g, '[data-act="appeler"][data-p="2"]'); await wait(700); await pointeur(g, '[data-act="appeler"][data-p="3"]');
    await leg('Étape 6 sur 10 · Salle d’attente', 'Numéro, nom et porte — à l’écran et à la voix', 'Trois portes appellent en même temps : l’écran les affiche <b>l’un après l’autre</b>. Chaque numéro reste <b>au moins 10 secondes</b> et est annoncé à voix haute avec sa porte.', 11000);
    await wait(14000);
    await leg('Étape 6 sur 10 · Salle d’attente', 'Absent ? En fin de file', 'Si la personne ne se présente pas : <b>« Absent »</b>. Elle repart <b>à la fin de la file</b> et ne sera rappelée qu’après les autres.', 6000);
    await pointeur(g, '[data-act="absent"][data-p="1"]'); await wait(2500);
  });

  // ============ 6. Le demandeur sur téléphone ============
  await scene('demandeur (téléphone)', async () => {
    const g = F('g'); const info = await g.evaluate(() => { const X = window.__spApi, d = X.DB.find(x => x.paiement && x.rdv && x.status === 'paye') || X.DB.find(x => x.paiement); return d && { id: d.id, code: X.code(d.id, d.person.nom) }; });
    await page.evaluate(() => { V.mode('tel'); V.note('<h3>Le demandeur</h3>Il ouvre le lien reçu sur WhatsApp : <b>sans compte ni mot de passe</b>, il voit son dossier — et seulement le sien.'); });
    await page.evaluate(u => V.src('t', u), APP + 'index.html?suivi=' + info.id + '&code=' + info.code + '&esp=' + pub); await wait(3500);
    await leg('Étape 7 sur 10 · Le demandeur', 'Suivre son dossier depuis son téléphone', 'Il voit les <b>étapes franchies</b>, son <b>rendez-vous</b> (jour, heure, lieu) et son <b>numéro d’appel</b>. Le jour dit : il regarde l’écran et va à la porte indiquée.', 8500);
    await F('t').evaluate(() => window.scrollTo({ top: 360, behavior: 'smooth' })); await wait(3000);
    await leg('Étape 7 sur 10 · Le demandeur', 'Une pièce manque ? Il l’envoie lui-même', 'Il prend la pièce en <b>photo</b> ou la joint depuis son téléphone : inutile de revenir au guichet.', 5500);
    await F('t').evaluate(() => window.scrollTo({ top: 1100, behavior: 'smooth' })); await wait(3000);
  });

  // ============ 7. Pilotage ============
  await scene('pilotage', async () => {
    await page.evaluate(() => V.mode('plein')); await page.evaluate(u => V.src('plein', u), APP + 'index.html?espace=' + code); await wait(3500); const f = F('plein');
    await f.locator('#role').selectOption('ministere'); await wait(600); await pointeur(f, 'nav button[data-v="tableau"]'); await wait(3500);
    await leg('Étape 8 sur 10 · Ministère et Préfecture', 'Le tableau de bord', 'La <b>situation réelle</b> : qui a demandé, payé, été reçu, reçu son passeport, délais moyens, renouvellements. Un export <b>Excel</b> fournit les tableaux et graphiques.', 8000);
    await f.evaluate(() => window.scrollBy({ top: 420, behavior: 'smooth' })); await wait(4000);
    await pointeur(f, 'nav button[data-v="fraude"]'); await wait(3500);
    await leg('Étape 8 sur 10 · Ministère et Préfecture', 'Le contrôle anti-fraude', 'Doublons, pièces modifiées, fausses identités, réseaux, délais anormaux : les cas sont classés du plus grave au moins grave. Ce sont des <b>alertes à examiner par une personne</b>, pas des preuves.', 9000);
    await pointeur(f, 'nav button[data-v="dossiers"]'); await wait(1500);
    await leg('Étape 8 sur 10 · Ministère et Préfecture', 'Tous les dossiers, avec leur historique', 'Recherche, filtres, et la fiche complète de chaque dossier : pièces, signature, <b>historique daté</b>, alertes.', 5500);
    await pointeur(f, '#tb tr.cl', true, 2); await wait(3500); await f.evaluate(() => { const t = document.getElementById('tiroir'); t && t.classList.remove('on'); });
  });

  // ============ 8bis. Connexion sécurisée, alerte de fraude et de sécurité du Ministre ============
  await scene('connexion et alerte de sécurité', async () => {
    const apiJ = (body, jeton) => page.evaluate(async ([b, j]) => { const r = await fetch('/api/passeport', { method: 'POST', headers: j ? { authorization: 'Bearer ' + j } : {}, body: JSON.stringify(b) }); return r.json(); }, [body, jeton]);
    const sec = await apiJ({ op: 'creer', nom: 'Démonstration sécurisée', admin: { login: 'prefecture.demo', nom: 'Le Préfet', mdp: 'Brazza2026ok' } });
    const T0 = (await apiJ({ op: 'connexion', espace: sec.code, login: 'prefecture.demo', mdp: 'Brazza2026ok' })).jeton;
    const mk = async (login, nom, role) => { const c = await apiJ({ op: 'comptes-creer', espace: sec.code, login, nom, role }, T0); const l = await apiJ({ op: 'connexion', espace: sec.code, login, mdp: c.motDePasseTemporaire }); const n = await apiJ({ op: 'changer-mdp', espace: sec.code, ancien: c.motDePasseTemporaire, nouveau: 'Mdp2026demo' }, l.jeton); return n.jeton || l.jeton; };
    await mk('cabinet.ministre', 'Cabinet du Ministre', 'ministere'); const jG = await mk('guichet.paul', 'Paul Mavoungou', 'agent');
    await page.evaluate(() => { try { localStorage.setItem('sp_guide_v1', JSON.stringify({ vu: true, faits: { agent: 'passe', caisse: 'passe', porte: 'passe', prefecture: 'passe', ministere: 'passe', accueil: 'passe' } })); localStorage.removeItem('sp_espace_v1'); sessionStorage.clear(); } catch (e) { } });
    await page.evaluate(() => V.mode('plein')); await page.evaluate(u => V.src('plein', u), APP + 'index.html?espace=' + sec.code); await wait(3500); const f = F('plein');
    await f.locator('#cpt_f').waitFor({ timeout: 15000 });
    await leg('Étape 8 sur 10 · Connexion sécurisée', 'Un identifiant et un mot de passe pour chacun', 'Dans un <b>espace sécurisé</b>, chaque personne se connecte avec <b>son identifiant et son mot de passe</b>, et ne voit que ce que son rôle permet. En cas d’oubli, la Préfecture réinitialise ; après cinq essais ratés, le compte est <b>bloqué quinze minutes</b>.', 9500);
    await taper(f, '#cpt_login', 'cabinet.ministre', 70); await taper(f, '#cpt_mdp', 'Mdp2026demo', 70); await pointeur(f, '#cpt_ok'); await f.locator('#cptChip').waitFor({ timeout: 15000 }); await wait(2500);
    await leg('Étape 8 sur 10 · Connexion sécurisée', 'Le Ministre voit la situation réelle', 'Le Ministre en poste se connecte : il voit <b>en temps réel</b> tout ce qui se passe sur l’interface, mais il ne modifie rien. Une tentative de triche est <b>refusée par le serveur</b> et inscrite dans un <b>journal infalsifiable</b>.', 8500);
    const dos = n => ({ id: 'BZV-2026-V0' + n, type: 'premiere', status: 'depose', createdAt: new Date().toISOString(), mrzOk: true, agent: 'Agent 03', lieu: 'Makélékélé', person: { nom: 'BOUKA', prenoms: n === 1 ? 'Rodrigue' : 'Rodrigue Aimé', naissance: '1985-05-0' + n, sexe: 'M', tel: '+242 06 9' + n + '0 00 00', piece: { type: 'CNI', numero: 'CNI4455667', expiration: '2031-01-01' } }, pieces: [], history: [{ s: 'depose', at: new Date().toISOString(), by: 'x', note: 'Dossier enregistré' }] });
    await apiJ({ op: 'ecrire', espace: sec.code, dossiers: [dos(1), dos(2)].map(d => ({ id: d.id, baseRev: 0, data: d })) }, jG);
    await f.locator('#alerteFraude').waitFor({ state: 'attached', timeout: 30000 }); await wait(1500);
    await leg('Étape 8 sur 10 · Alerte du Ministre', 'Une fraude ? Un message s’affiche tout de suite', 'Deux dossiers portent <b>le même numéro de pièce</b> avec des noms différents : un <b>message rouge</b> apparaît sur l’écran du Ministre, avec le dossier concerné, <b>et une sirène retentit</b>. Ce sont des alertes à <b>examiner par une personne</b>, pas des preuves.', 9500);
    // l'agent de guichet tente de contourner le système
    let vu = false; for (let k = 0; k < 4 && !vu; k++) { await apiJ({ op: 'comptes-creer', espace: sec.code, login: 'faux.admin' + k, nom: 'Faux ' + k, role: 'prefecture' }, jG); await apiJ({ op: 'reglages', espace: sec.code, config: { tarifs: { premiere: 1, renouvellement: 1 } } }, jG); vu = await f.locator('#secToast').waitFor({ state: 'attached', timeout: 24000 }).then(() => true, () => false); }
    await leg('Étape 8 sur 10 · Alerte de sécurité', 'Une tentative de contournement est signalée', 'Un agent de guichet essaie de créer un compte « Préfecture » ou de changer lui-même le <b>montant officiel</b> : le serveur refuse, et <b>le Ministre est averti aussitôt, par un message et par un son</b>. Même en trafiquant l’écran, les règles sont <b>revérifiées par le serveur</b> : le contournement depuis l’application ne passe pas.', 9500);
    await pointeur(f, 'nav button[data-v="securite"]'); await wait(3500);
    await leg('Étape 8 sur 10 · Journal de sécurité', 'Qui a fait quoi, quand', 'Le journal garde chaque connexion, chaque refus et chaque tentative. Chaque ligne est liée à la précédente : <b>on peut vérifier qu’il n’a pas été retouché</b>.', 7500);
    await pointeur(f, '#sec_verif'); await wait(3000);
  });

  // ============ 8. Aide ============
  await scene('aide', async () => {
    const f = F('plein'); await f.evaluate(() => window.scrollTo({ top: 0 })); await pointeur(f, '#bAide'); await wait(900); await pointeur(f, '#aFaq'); await wait(900); await pointeur(f, '#guideFaqBox summary', true, 3); await wait(500);
    await leg('Étape 9 sur 10 · Aide', 'Toujours une aide sous la main', 'Le bouton <b>❓ Aide</b> relance la visite guidée, permet de <b>changer de profil</b> et donne les réponses aux questions fréquentes.', 7500);
    await pointeur(f, '#fFerme'); await wait(600);
  });

  // ============ 9. Fin ============
  await scene('fin', async () => {
    await api({ op: 'supprimer', espace: code, confirmation: 'EFFACER' }).catch(() => { }); await page.evaluate(() => V.leg('', '', ''));
    await carte(`<div class="fin"><img src="/passeport-demo/img/star-entreprise.webp" alt=""><div class="kic" style="margin-top:20px">Étape 10 sur 10 · Pour conclure</div><h1 style="font-size:46px">Passeport Sûr</h1><div class="but" style="margin:18px auto 0;text-align:left"><small>Le but de l’application</small><p>${BUT}</p></div><p style="margin-top:22px;font-size:20px;color:#cfe5d9">Conçu par STAR ENTREPRISE, Brazzaville · www.starentreprise.com<br>Démonstration avec des données entièrement fictives · Tous droits réservés</p></div>`, 12000, 'Pour conclure : ' + texte(BUT) + ' Passeport Sûr est conçu par STAR ENTREPRISE, à Brazzaville.');
  });

  const v = page.video(); await ctx.close(); const brut = await v.path(); await b.close();
  fs.writeFileSync(path.join(DIR, 'texte-de-la-voix.txt'), 'TEXTE DE LA VOIX OFF — Guide vidéo « Passeport Sûr »\n(les durées suivent les légendes ; une seule voix, ton posé et chaleureux)\n\n' + voix.map((t, i) => (i + 1) + '. ' + t).join('\n\n') + '\n');
  const mp4 = SORTIE + 'Passeport-Sur-Guide-video.mp4';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', brut, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-b:a', '48k', '-shortest', '-movflags', '+faststart', mp4]);
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim();
  console.log(echecs.length ? 'ÉCHECS : ' + echecs.join(', ') : 'TOUTES LES SCÈNES OK'); console.log('MP4 : ' + mp4 + ' · ' + Math.round(dur) + ' s · ' + Math.round(fs.statSync(mp4).size / 1024 / 1024 * 10) / 10 + ' Mo');
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
