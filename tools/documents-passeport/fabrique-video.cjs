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
  if (clic) { await page.evaluate(([x, y]) => V.curseur(x, y, true), [b.x + b.width / 2 - 4, b.y + b.height / 2 - 4]); await wait(220); await el.click({ timeout: 8000 }); } return el;
}
async function taper(fr, sel, t, delai = 85) { const el = fr.locator(sel); await pointeur(fr, sel, true); await el.fill(''); await el.pressSequentially(t, { delay: delai }); }
const scene = async (nom, fn) => { try { await fn(); console.log('OK   ' + nom); } catch (e) { echecs.push(nom); console.log('ECHEC ' + nom + ' : ' + e.message.split('\n')[0]); } };
const api = (body) => page.evaluate(async b => { const r = await fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return r.json(); }, body);

(async () => {
  const b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, locale: 'fr-FR', timezoneId: 'Africa/Brazzaville', recordVideo: { dir: DIR, size: { width: 1280, height: 720 } } });
  page = await ctx.newPage(); page.on('pageerror', e => console.log('  (erreur page) ' + e.message));
  await page.goto(BASE + 'tools/documents-passeport/video-cadre.html'); await page.evaluate(() => localStorage.clear()); await wait(800);
  let dos = null, code = '', pub = '';

  // ============ Titre + but ============
  await scene('titre', async () => {
    await carte(`<img class="lg" src="/passeport-demo/logo.svg"><div class="kic">Guide vidéo d’utilisation · de A à Z</div><h1>Passeport Sûr</h1><div class="sous">Suivi · Contrôle · Transparence</div><div class="but"><small>Le but de l’application</small><p>${BUT}</p></div>`, 11000, 'Guide vidéo d’utilisation de Passeport Sûr, de A à Z. ' + texte(BUT));
    await carte(`<div class="kic">En trois mots</div><h1 style="font-size:46px">À quoi sert Passeport Sûr ?</h1><div class="tr"><div><h3>Suivre</h3><p>Chaque dossier est suivi : dépôt, paiement, rendez-vous, traitement, remise. Le demandeur voit où en est son passeport.</p></div><div><h3>Ordonner</h3><p>Un rendez-vous après paiement, des numéros, des portes, des écrans de salle d’attente : chacun passe à son tour.</p></div><div><h3>Sécuriser</h3><p>Doublons, pièces modifiées, faux, réseaux d’intermédiaires : le système les signale à la Préfecture.</p></div></div><p style="margin-top:22px;font-size:20px;color:#cfe5d9">Pour : les demandeurs, les agents de guichet, la caisse, les agents de porte, la Préfecture et le Ministère. Cette vidéo vous montre chaque rôle, pas à pas.</p>`, 14000);
  });

  // ============ 1. Démarrer ============
  await scene('démarrer', async () => {
    await page.evaluate(() => V.mode('plein')); await page.evaluate(u => V.src('plein', u), APP + 'index.html?guide=1'); await wait(2800);
    await leg('Étape 1 sur 9 · Démarrer', 'Ouvrir le lien et choisir son rôle', 'Rien à installer, pas de compte : on ouvre le lien. Au premier lancement, l’application demande <b>« Quel est votre rôle ? »</b> et s’adapte.');
    await pointeur(F('plein'), '#guideProfil [data-p="agent"]'); await wait(1600);
    await leg('Étape 1 sur 9 · Démarrer', 'Une visite guidée d’une minute', 'Pour chaque rôle, une <b>visite guidée</b> met en lumière ce qu’il faut utiliser. On peut la passer à tout moment, et la relancer avec le bouton <b>❓ Aide</b>.', 6500);
    await pointeur(F('plein'), '#gSuiv'); await wait(2200); await pointeur(F('plein'), '#gSuiv'); await wait(2200); await pointeur(F('plein'), '#gPasser'); await wait(900);
  });

  // ============ 2. Guichet ============
  await scene('guichet', async () => {
    const f = F('plein'); await page.evaluate(u => V.src('plein', u), APP + 'index.html'); await wait(2500);
    await pointeur(f, 'nav button[data-v="guichet"]'); await wait(900);
    await leg('Étape 2 sur 9 · Agent de guichet', 'Enregistrer une demande', 'L’agent ouvre <b>Nouvelle demande</b>. D’abord le <b>type</b> : première demande, ou renouvellement d’un passeport expiré.', 5500);
    await leg('Étape 2 sur 9 · Agent de guichet', 'Scanner la pièce', 'Il photographie la <b>bande de lecture</b> de la pièce d’identité. Ici, un exemple : la <b>fiche se remplit toute seule</b>, avec contrôle des chiffres de clé.', 4500);
    await pointeur(f, '[data-ex="cni"]'); await wait(1500);
    await f.locator('#gt3').scrollIntoViewIfNeeded(); await wait(1200);
    await leg('Étape 2 sur 9 · Agent de guichet', 'Contrôler la fiche', 'L’agent vérifie la fiche et ajoute le <b>téléphone du demandeur</b> : c’est là que l’accusé sera envoyé.', 4000);
    await taper(f, '#f_tel', '+242 06 123 45 67'); await wait(900);
    await f.locator('#gt4').scrollIntoViewIfNeeded(); await wait(900);
    await leg('Étape 2 sur 9 · Agent de guichet', 'Joindre les pièces', 'Photo ou fichier, pièce par pièce. Si une pièce manque, le dossier reste <b>« incomplet »</b> : on pourra le terminer plus tard, ou le demandeur enverra la pièce depuis son téléphone.', 7500);
    await pointeur(f, '#edGuichet [data-pj="photo"][data-k="photo"]'); await f.locator('#pjPhoto').setInputFiles(FIX + 'visage-test.png'); await wait(900);
    for (const k of ['identite', 'naissance', 'nationalite']) { await pointeur(f, '#edGuichet [data-pj="fichier"][data-k="' + k + '"]'); await f.locator('#pjFichier').setInputFiles(FIX + 'visage-test.png'); await wait(800); }
    await f.locator('#sigPad').scrollIntoViewIfNeeded(); await wait(600);
    await leg('Étape 2 sur 9 · Agent de guichet', 'Faire signer', 'Le demandeur <b>signe avec le doigt</b> ou un stylet, directement sur l’écran.', 3800);
    const sb = await f.locator('#sigPad').boundingBox(); await page.evaluate(([x, y]) => V.curseur(x, y, false), [sb.x + 60, sb.y + 90]); await wait(700); await page.mouse.move(sb.x + 60, sb.y + 90); await page.mouse.down();
    for (let i = 0; i < 50; i++) { await page.mouse.move(sb.x + 60 + i * 10, sb.y + 90 + Math.sin(i / 3) * 48); await page.evaluate(([x, y]) => V.curseur(x, y, false), [sb.x + 60 + i * 10, sb.y + 90 + Math.sin(i / 3) * 48]); await wait(30); } await page.mouse.up(); await wait(800);
    await leg('Étape 2 sur 9 · Agent de guichet', 'Valider et remettre l’accusé', 'Un clic sur <b>Valider</b> : le dossier est créé et l’<b>accusé</b> s’affiche, avec son <b>numéro de reçu</b> et un <b>code QR</b>. Il est envoyé au demandeur sur WhatsApp.', 4500);
    await pointeur(f, '#bValider'); await wait(3800);
    dos = await f.evaluate(() => { const X = window.__spApi, d = X.DB.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; return { id: d.id, code: X.code(d.id, d.person.nom) }; });
    await wait(3000); await f.evaluate(() => { const t = document.getElementById('tiroir'); t && t.classList.remove('on'); });
  });

  // ============ 3. Caisse ============
  await scene('caisse', async () => {
    const f = F('plein'); await f.locator('#role').selectOption('caisse'); await wait(600); await pointeur(f, 'nav button[data-v="caisse"]'); await wait(900);
    await leg('Étape 3 sur 9 · Caisse', 'Ouvrir le dossier', 'Le demandeur présente son accusé. La caisse <b>scanne le code QR</b> — ou saisit le numéro de reçu et le code de contrôle — et le dossier s’ouvre.', 6500);
    await taper(f, '#k_id', dos.id, 70); await taper(f, '#k_code', dos.code, 90); await pointeur(f, '#bCaisseOuvrir'); await f.locator('#k_montant').waitFor({ timeout: 8000 }); await wait(1200);
    await leg('Étape 3 sur 9 · Caisse', 'Vérifier avant d’encaisser', 'La fiche, les pièces, la signature et les alertes s’affichent. <b>L’encaissement est bloqué</b> si une pièce obligatoire manque ou si une alerte grave n’a pas été examinée par la Préfecture.', 7500);
    await taper(f, '#k_montant', '75000', 110); await wait(700);
    await leg('Étape 3 sur 9 · Caisse', 'Encaisser et éditer le reçu', 'Montant, mode de paiement, puis <b>Encaisser</b>. Le <b>reçu</b> donne le <b>rendez-vous d’enrôlement</b> et le <b>numéro d’appel</b>. Ici, des montants fictifs.', 5500);
    await pointeur(f, '#bPayer'); await f.locator('.recu').waitFor({ timeout: 8000 }); await wait(3500);
    await f.evaluate(() => { const t = document.querySelector('#tiroir .feuille'); t && t.scrollTo({ top: 600, behavior: 'smooth' }); }); await wait(3500);
    await leg('Étape 3 sur 9 · Caisse', 'Le message WhatsApp du rendez-vous', 'Le demandeur reçoit <b>la date de son rendez-vous</b> et son numéro d’appel. Les numéros sont sans doublon, et la capacité du jour ne peut pas être dépassée.', 6000);
    await f.evaluate(() => { const t = document.getElementById('tiroir'); t && t.classList.remove('on'); });
  });

  // ============ 4. Préfecture : espace partagé ============
  await scene('préfecture : espace', async () => {
    const f = F('plein'); await page.evaluate(u => V.src('plein', u), APP + 'index.html'); await wait(2500); await f.locator('#role').selectOption('prefecture'); await wait(500);
    await leg('Étape 4 sur 9 · Préfecture', 'Créer l’espace partagé', 'Pour que tous les postes travaillent ensemble, la <b>Préfecture crée un espace</b> : un code à 8 caractères que le guichet, la caisse, les portes et les écrans rejoignent.', 6500);
    await pointeur(f, '#chipEspace'); await wait(900); await pointeur(f, '#bCreerEsp'); await f.waitForLoadState('load').catch(() => { }); await wait(3500);
    code = await f.evaluate(() => JSON.parse(localStorage.getItem('sp_espace_v1')).code); pub = await f.evaluate(() => window.__spSync.publique());
    await f.locator('#role').selectOption('prefecture'); await wait(400); await pointeur(f, '#chipEspace'); await wait(500);
    await leg('Étape 4 sur 9 · Préfecture', 'Le code, le QR et les liens', 'Le panneau donne le <b>code de l’espace</b>, un QR pour relier un poste, et le <b>lien des écrans de salle</b>. À ne pas partager publiquement.', 7000);
    await pointeur(f, '#bFerme'); await wait(500);
    await pointeur(f, 'nav button[data-v="reglages"]'); await wait(1200);
    await leg('Étape 4 sur 9 · Préfecture', 'Régler le site', 'Nombre de portes, personnes par jour, jours ouverts, heure de début, lieu. Ces valeurs sont des <b>exemples à fixer avec la Préfecture</b>.', 6500);
    await f.evaluate(() => window.scrollBy({ top: 360, behavior: 'smooth' })); await wait(2500);
  });

  // ============ 5. Salle d'attente : portes + écran ============
  await scene('portes et écran de salle', async () => {
    await page.evaluate(() => V.mode('split')); await page.evaluate(([a, b]) => { V.src('g', a); V.src('d', b); }, [APP + 'index.html?espace=' + code, APP + 'ecran.html?espace=' + code]); await wait(3500);
    const g = F('g'), d = F('d');
    await leg('Étape 5 sur 9 · Salle d’attente', 'Allumer l’écran de la salle', 'Sur la télévision, on ouvre le lien de l’écran, on donne un <b>nom à l’écran</b> et on touche <b>Démarrer</b>. Il affiche alors les appels en direct, avec la voix.', 6500);
    await taper(d, '#nomEcran', 'Salle d’attente 1', 70); await pointeur(d, '#bDemarrer'); await wait(2000);
    await g.locator('#role').selectOption('porte'); await wait(500); await pointeur(g, 'nav button[data-v="file"]'); await wait(1500);
    await leg('Étape 5 sur 9 · Salle d’attente', 'Chaque porte appelle le suivant', 'Les personnes ont <b>rendez-vous aujourd’hui</b>, dans l’ordre de leur paiement. Chaque porte touche <b>« Appeler le suivant »</b>.', 5500);
    await g.locator('#portes').scrollIntoViewIfNeeded(); await wait(500);
    await pointeur(g, '[data-act="appeler"][data-p="1"]'); await wait(700); await pointeur(g, '[data-act="appeler"][data-p="2"]'); await wait(700); await pointeur(g, '[data-act="appeler"][data-p="3"]');
    await leg('Étape 5 sur 9 · Salle d’attente', 'Numéro, nom et porte — à l’écran et à la voix', 'Trois portes appellent en même temps : l’écran les affiche <b>l’un après l’autre</b>. Chaque numéro reste <b>au moins 10 secondes</b> et est annoncé à voix haute avec sa porte.', 11000);
    await wait(14000);
    await leg('Étape 5 sur 9 · Salle d’attente', 'Absent ? En fin de file', 'Si la personne ne se présente pas : <b>« Absent »</b>. Elle repart <b>à la fin de la file</b> et ne sera rappelée qu’après les autres.', 6000);
    await pointeur(g, '[data-act="absent"][data-p="1"]'); await wait(2500);
  });

  // ============ 6. Le demandeur sur téléphone ============
  await scene('demandeur (téléphone)', async () => {
    const g = F('g'); const info = await g.evaluate(() => { const X = window.__spApi, d = X.DB.find(x => x.paiement && x.rdv && x.status === 'paye') || X.DB.find(x => x.paiement); return d && { id: d.id, code: X.code(d.id, d.person.nom) }; });
    await page.evaluate(() => { V.mode('tel'); V.note('<h3>Le demandeur</h3>Il ouvre le lien reçu sur WhatsApp : <b>sans compte ni mot de passe</b>, il voit son dossier — et seulement le sien.'); });
    await page.evaluate(u => V.src('t', u), APP + 'index.html?suivi=' + info.id + '&code=' + info.code + '&esp=' + pub); await wait(3500);
    await leg('Étape 6 sur 9 · Le demandeur', 'Suivre son dossier depuis son téléphone', 'Il voit les <b>étapes franchies</b>, son <b>rendez-vous</b> (jour, heure, lieu) et son <b>numéro d’appel</b>. Le jour dit : il regarde l’écran et va à la porte indiquée.', 8500);
    await F('t').evaluate(() => window.scrollTo({ top: 360, behavior: 'smooth' })); await wait(3000);
    await leg('Étape 6 sur 9 · Le demandeur', 'Une pièce manque ? Il l’envoie lui-même', 'Il prend la pièce en <b>photo</b> ou la joint depuis son téléphone : inutile de revenir au guichet.', 5500);
    await F('t').evaluate(() => window.scrollTo({ top: 1100, behavior: 'smooth' })); await wait(3000);
  });

  // ============ 7. Pilotage ============
  await scene('pilotage', async () => {
    await page.evaluate(() => V.mode('plein')); await page.evaluate(u => V.src('plein', u), APP + 'index.html?espace=' + code); await wait(3500); const f = F('plein');
    await f.locator('#role').selectOption('ministere'); await wait(600); await pointeur(f, 'nav button[data-v="tableau"]'); await wait(3500);
    await leg('Étape 7 sur 9 · Ministère et Préfecture', 'Le tableau de bord', 'La <b>situation réelle</b> : qui a demandé, payé, été reçu, reçu son passeport, délais moyens, renouvellements. Un export <b>Excel</b> fournit les tableaux et graphiques.', 8000);
    await f.evaluate(() => window.scrollBy({ top: 420, behavior: 'smooth' })); await wait(4000);
    await pointeur(f, 'nav button[data-v="fraude"]'); await wait(3500);
    await leg('Étape 7 sur 9 · Ministère et Préfecture', 'Le contrôle anti-fraude', 'Doublons, pièces modifiées, fausses identités, réseaux, délais anormaux : les cas sont classés du plus grave au moins grave. Ce sont des <b>alertes à examiner par une personne</b>, pas des preuves.', 9000);
    await pointeur(f, 'nav button[data-v="dossiers"]'); await wait(1500);
    await leg('Étape 7 sur 9 · Ministère et Préfecture', 'Tous les dossiers, avec leur historique', 'Recherche, filtres, et la fiche complète de chaque dossier : pièces, signature, <b>historique daté</b>, alertes.', 5500);
    await pointeur(f, '#tb tr.cl', true, 2); await wait(3500); await f.evaluate(() => { const t = document.getElementById('tiroir'); t && t.classList.remove('on'); });
  });

  // ============ 8. Aide ============
  await scene('aide', async () => {
    const f = F('plein'); await f.evaluate(() => window.scrollTo({ top: 0 })); await pointeur(f, '#bAide'); await wait(900); await pointeur(f, '#aFaq'); await wait(900); await pointeur(f, '#guideFaqBox summary', true, 3); await wait(500);
    await leg('Étape 8 sur 9 · Aide', 'Toujours une aide sous la main', 'Le bouton <b>❓ Aide</b> relance la visite guidée, permet de <b>changer de profil</b> et donne les réponses aux questions fréquentes.', 7500);
    await pointeur(f, '#fFerme'); await wait(600);
  });

  // ============ 9. Fin ============
  await scene('fin', async () => {
    await api({ op: 'supprimer', espace: code, confirmation: 'EFFACER' }).catch(() => { }); await page.evaluate(() => V.leg('', '', ''));
    await carte(`<div class="fin"><img src="/passeport-demo/img/star-entreprise.webp" alt=""><div class="kic" style="margin-top:20px">Étape 9 sur 9 · Pour conclure</div><h1 style="font-size:46px">Passeport Sûr</h1><div class="but" style="margin:18px auto 0;text-align:left"><small>Le but de l’application</small><p>${BUT}</p></div><p style="margin-top:22px;font-size:20px;color:#cfe5d9">Conçu par STAR ENTREPRISE, Brazzaville · www.starentreprise.com<br>Démonstration avec des données entièrement fictives · Tous droits réservés</p></div>`, 12000, 'Pour conclure : ' + texte(BUT) + ' Passeport Sûr est conçu par STAR ENTREPRISE, à Brazzaville.');
  });

  const v = page.video(); await ctx.close(); const brut = await v.path(); await b.close();
  fs.writeFileSync(path.join(DIR, 'texte-de-la-voix.txt'), 'TEXTE DE LA VOIX OFF — Guide vidéo « Passeport Sûr »\n(les durées suivent les légendes ; une seule voix, ton posé et chaleureux)\n\n' + voix.map((t, i) => (i + 1) + '. ' + t).join('\n\n') + '\n');
  const mp4 = SORTIE + 'Passeport-Sur-Guide-video.mp4';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', brut, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-b:a', '64k', '-shortest', '-movflags', '+faststart', mp4]);
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim();
  console.log(echecs.length ? 'ÉCHECS : ' + echecs.join(', ') : 'TOUTES LES SCÈNES OK'); console.log('MP4 : ' + mp4 + ' · ' + Math.round(dur) + ' s · ' + Math.round(fs.statSync(mp4).size / 1024 / 1024 * 10) / 10 + ' Mo');
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
