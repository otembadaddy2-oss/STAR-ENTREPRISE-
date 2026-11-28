"""Guide PDF : brancher Sarah sur le WhatsApp du service à la clientèle (+242 05 597 24 27) — ce qui est prêt, ce qu'il reste à faire, pas à pas.
Lancer : /usr/bin/python3.12 tools/dossiers-speciaux/guide_sarah.py  -> docs/dossiers-speciaux/SARAH-WhatsApp-Guide-de-connexion.pdf"""
import os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')); sys.path.insert(0, HERE)
import images as I
D = os.path.join(ROOT, 'docs', 'dossiers-speciaux'); LOGO = I.logo_officiel_uri(500); LOGO_P = I.logo_officiel_jpeg_uri(150)
BASE = 'https://star-entreprise.netlify.app'
CSS = """@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:'Inter','Segoe UI',system-ui,sans-serif;color:#1b2030;font-size:10.3pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.p{width:210mm;height:297mm;padding:20mm 18mm;page-break-after:always;position:relative;overflow:hidden;background:#fff}
.cov{background:#0a1730;color:#fff;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0}.cov .lg{margin-top:30mm;width:60mm}.cov h1{font-family:Georgia,serif;font-size:30pt;margin:10mm 8mm 2mm;color:#fff}.cov h1 b{color:#f2d27a}.cov h2{font-size:14pt;margin:0 14mm 8mm;color:#d9e0f5;font-weight:400;border:0}
.cov .num{margin-top:6mm;background:#fff;color:#0a1730;border-radius:5mm;padding:6mm 10mm;font-size:12pt}.cov .num b{display:block;font-size:20pt;color:#13285a}.cov .ft{position:absolute;bottom:14mm;left:0;right:0;font-size:9.5pt;color:#c3cdea}
.bandeau{position:absolute;left:0;right:0;bottom:0;height:3mm;background:linear-gradient(90deg,#1f8a4c 33%,#f2c230 33% 66%,#c0392b 66%)}
.p:not(.cov)::after{content:attr(data-pied);position:absolute;bottom:7mm;left:18mm;font-size:8pt;color:#646b80}
h2{font-family:Georgia,serif;font-size:16pt;color:#0a1730;margin:0 0 3mm;border-bottom:2px solid #d9b25a;padding-bottom:2mm}h3{font-size:11.5pt;color:#13285a;margin:4mm 0 1.5mm}p{margin:0 0 2.5mm}
.k{background:#fff4d6;border-left:4px solid #d9b25a;padding:2.5mm 4mm;border-radius:2mm;margin:3mm 0;font-size:9.6pt}.ko{background:#fdecea;border-left-color:#c0392b}.ok{background:#e9f7ef;border-left-color:#1f8a4c}
table{width:100%;border-collapse:collapse;font-size:9.2pt;margin:2mm 0}th{background:#0a1730;color:#fff;text-align:left;padding:2mm 2.5mm}td{border-bottom:1px solid #e6dcc0;padding:1.8mm 2.5mm;vertical-align:top}
ol,ul{margin:0 0 2.6mm;padding-left:5.5mm}li{margin:0 0 1.5mm}code{background:#eef0f6;border-radius:1.5mm;padding:.3mm 1.4mm;font-size:9pt;word-break:break-all}.mini{font-size:8.6pt;color:#646b80}
.n{display:inline-block;width:6.5mm;height:6.5mm;border-radius:50%;background:#0a1730;color:#f2d27a;text-align:center;line-height:6.5mm;font-size:9pt;font-weight:700;margin-right:2mm}"""
pied = "Sarah sur WhatsApp · guide de connexion · STAR ENTREPRISE"
P = []
P.append(f"""<div class="p cov"><img class="lg" src="{LOGO}"><h1>SARAH sur <b>WhatsApp</b></h1><h2>Guide de connexion du service à la clientèle<br>ce qui est prêt, ce qu'il vous reste à faire, pas à pas</h2>
<div class="num">Numéro du service à la clientèle<b>+242 05 597 24 27</b></div><div class="ft">STAR ENTREPRISE · Brazzaville, République du Congo</div><div class="bandeau"></div></div>""")
P.append(f"""<div class="p" data-pied="{pied}"><h2>1. Où en est Sarah, en toute honnêteté</h2>
<div class="k ok"><b>Terminé et testé</b><ul><li>Le cerveau de Sarah est à jour (28/11/2026) : les 21 filiales en détail (services, parcours, prix publics, fiches à remplir), KOMYO et Keydou (prix vérifiés avec le code), le ton courtois, chaleureux et professionnel, les applications TERRAIN SÛR, CHECK-IN STAR et Passeport Sûr, la ligne +242 05 597 24 27.</li>
<li>La réception des messages WhatsApp, la réponse, la mémoire de la conversation, le passage à l'équipe, la pause quand une personne répond, les protections (carte bancaire, détresse, tentatives de piratage, trop de messages), l'arrêt d'urgence.</li>
<li>La console de l'équipe (<b>{BASE}/starvibe/sarah-admin.html</b>) : état de la ligne, conversations à reprendre, réponse humaine, effacement.</li>
<li><b>Charge testée : 50 personnes qui écrivent en même temps</b> (100 messages, puis 50 autres) : toutes reçoivent leur réponse, sans mélange entre les conversations ; deux messages envoyés coup sur coup reçoivent une seule réponse.</li>
<li><b>61 contrôles automatiques</b> passent (vraie base de données, faux WhatsApp et faux service d'IA) et la console a été essayée dans un navigateur de téléphone.</li></ul></div>
<div class="k ko"><b>Pas encore possible sans vous</b><p style="margin:1mm 0 0">Brancher réellement le numéro demande <b>vos accès personnels</b> chez Meta (WhatsApp Business) et chez Netlify. <b>L'intelligence artificielle fonctionne déjà</b> : Sarah utilise la même passerelle IA de Netlify que Keydou (vérifié en ligne le 28/11/2026). Je n'ai pas ces accès et je ne les demande pas dans une conversation. Tant que ces étapes ne sont pas faites, <b>Sarah ne répond pas</b> sur le numéro : c'est volontaire et sans danger. Le test avec un vrai téléphone n'a donc pas encore pu être fait.</p></div>
<h3>Ce que Sarah fait une fois branchée</h3>
<table><tr><th>Situation</th><th>Ce qui se passe</th></tr>
<tr><td>Question sur le groupe, KOMYO, Keydou, les filiales, les applications</td><td>Sarah répond en français, court et clair, avec les liens utiles.</td></tr>
<tr><td>Paiement annoncé, demande de partenariat, d'investissement, réclamation, message vocal ou image</td><td>Sarah rassure le client, <b>marque la conversation « à reprendre »</b> et prévient l'équipe par e-mail si l'envoi e-mail est réglé.</td></tr>
<tr><td>Une personne de l'équipe répond depuis la console</td><td>Le message part sur WhatsApp et <b>Sarah se met en pause 2 heures</b> pour ce client.</td></tr>
<tr><td>Numéro de carte, demande dangereuse, tentative de piratage, détresse</td><td>Refus poli ou numéros d'urgence du Congo (117, 118, 1444), sans passer par l'IA ; l'équipe est signalée.</td></tr>
<tr><td>Panne de l'IA ou trop de messages</td><td>Message honnête au client ; limite de 30 messages par heure et par client.</td></tr></table>
<p class="mini">Sarah n'invente ni prix, ni délai, ni promesse. Les paiements Mobile Money restent sur le +242 06 656 50 50 et sont toujours confirmés par une personne.</p><div class="bandeau"></div></div>""")
P.append(f"""<div class="p" data-pied="{pied}"><h2>2. Ce que vous devez faire (environ 1 heure)</h2>
<h3><span class="n">A</span>Chez Meta (WhatsApp Business)</h3>
<ol><li>Allez sur <b>developers.facebook.com</b>, connectez-vous avec votre compte Facebook, créez une application de type <b>« Entreprise »</b> et ajoutez le produit <b>WhatsApp</b>.</li>
<li>Dans <b>WhatsApp → Configuration de l'API</b>, ajoutez le numéro <b>+242 05 597 24 27</b> et confirmez-le avec le code reçu par SMS ou appel. <b>Important :</b> un numéro déjà utilisé dans l'application WhatsApp normale doit d'abord y être supprimé du compte, sinon Meta le refuse.</li>
<li>Notez l'<b>identifiant du numéro de téléphone</b> (« Phone number ID »), des chiffres affichés sur cette même page.</li>
<li>Dans <b>Paramètres de l'application → Informations de base</b>, copiez le <b>secret de l'application</b> (« App secret »).</li>
<li>Dans <b>Paramètres de l'entreprise → Utilisateurs système</b>, créez un utilisateur système (rôle administrateur), attribuez-lui l'application, puis <b>générez un jeton</b> sans date d'expiration avec les droits <code>whatsapp_business_messaging</code> et <code>whatsapp_business_management</code>. Copiez-le tout de suite : Meta ne le réaffiche pas.</li></ol>
<h3><span class="n">B</span>Intelligence artificielle : rien à faire</h3>
<p>Sarah utilise la passerelle IA de votre compte Netlify, comme Keydou. Chaque réponse consomme des <b>crédits Netlify</b> : surveillez-les (alerte à 300 crédits, selon vos règles).</p>
<h3><span class="n">C</span>Chez Netlify (le site)</h3>
<p>Dans le site <b>star-entreprise</b> → <b>Site configuration → Environment variables</b>, ajoutez (sans toucher à ce qui existe déjà). <b>Le mot de vérification vous a été donné dans la conversation avec Claude</b> (ne l'écrivez pas dans un document partagé) :</p>
<table><tr><th>Nom</th><th>Valeur</th></tr>
<tr><td><code>WHATSAPP_APP_SECRET</code></td><td>le secret de l'application Meta (étape A4)</td></tr>
<tr><td><code>WHATSAPP_VERIFY_TOKEN</code></td><td>un mot de passe que <b>vous inventez</b> (long, au hasard). Vous le retaperez chez Meta.</td></tr>
<tr><td><code>JWT_SECRET</code>, <code>SMTP_PASS</code></td><td>déjà présents dans Netlify : ne pas les changer (SMTP_PASS sert aux e-mails d'alerte à l'équipe)</td></tr></table>
<p class="mini">Si <code>WHATSAPP_APP_SECRET</code> et <code>WHATSAPP_VERIFY_TOKEN</code> existent déjà pour les assistants d'entreprise avec la même application Meta, ne les changez pas : Sarah partage la même adresse de réception. Si Sarah a sa propre application Meta, utilisez <code>SARAH_WA_APP_SECRET</code>. Après avoir ajouté des variables, relancez un déploiement du site.</p><div class="bandeau"></div></div>""")
P.append(f"""<div class="p" data-pied="{pied}"><h2>3. Relier Meta et le site, puis tester</h2>
<ol style="list-style:none;padding-left:0"><li><span class="n">1</span>Chez Meta, <b>WhatsApp → Configuration → Webhook</b> : adresse de rappel <code>{BASE}/api/sarah-whatsapp</code>, jeton de vérification = votre <code>WHATSAPP_VERIFY_TOKEN</code>. Cliquez sur <b>Vérifier et enregistrer</b>, puis abonnez-vous au champ <b>messages</b>.</li>
<li><span class="n">2</span>Ouvrez <b>{BASE}/starvibe/sarah-admin.html</b> et connectez-vous avec votre compte de l'équipe. La liste de contrôle doit montrer ✓ devant toutes les variables.</li>
<li><span class="n">3</span>Saisissez l'<b>identifiant du numéro</b> et le <b>jeton</b>, puis « Enregistrer et activer ». Le jeton est gardé chiffré et n'est jamais réaffiché.</li>
<li><span class="n">4</span>Appuyez sur <b>« Tester la connexion »</b> : le message doit dire « Connexion réussie : le numéro correspond au service à la clientèle ». S'il annonce un autre numéro, vous avez branché le mauvais numéro.</li>
<li><span class="n">5</span>Depuis <b>un autre téléphone</b>, écrivez « Bonjour » au +242 05 597 24 27. Sarah doit répondre en quelques secondes.</li>
<li><span class="n">6</span>Écrivez ensuite « J'ai payé 1000 FCFA » : la conversation doit apparaître dans <b>« À reprendre »</b> de la console. Répondez depuis la console et vérifiez que le message arrive sur le téléphone.</li></ol>
<div class="k ok"><b>Quand ces 6 points sont validés, Sarah est opérationnelle</b> sur le numéro. C'est à ce moment seulement que je peux vous dire « 100 % ».</div>
<h3>Bon à savoir</h3>
<ul><li><b>Fenêtre de 24 heures.</b> WhatsApp n'autorise les réponses libres que dans les 24 heures suivant le dernier message du client. Au-delà, il faut un message modèle approuvé par Meta : cette version de Sarah ne les utilise pas. Si une réponse humaine n'est pas livrée, la console le dit.</li>
<li><b>Coûts Meta.</b> Meta facture les conversations selon ses tarifs en vigueur : vérifiez-les dans votre compte WhatsApp Business avant le lancement.</li>
<li><b>Identité.</b> Sarah se présente comme assistante numérique ; une personne de l'équipe peut reprendre à tout moment.</li>
<li><b>Données.</b> Le numéro du client est gardé chiffré pour que l'équipe puisse le rappeler ; les messages sont effacés après 90 jours ; « Effacer » supprime une conversation sur demande du client.</li>
<li><b>En cas de problème.</b> Le bouton « Arrêt d'urgence » de la console coupe toutes les réponses automatiques immédiatement.</li></ul>
<table><tr><th>Si…</th><th>Alors</th></tr>
<tr><td>Meta refuse la vérification du webhook</td><td>Le mot de vérification n'est pas identique des deux côtés, ou le déploiement n'a pas été relancé après l'ajout de la variable.</td></tr>
<tr><td>Le test de connexion échoue</td><td>Jeton expiré ou sans les bons droits : recréez-le (étape A5).</td></tr>
<tr><td>Sarah ne répond pas</td><td>Regardez la console : une ligne sans ✓ indique ce qui manque (clé de l'IA, secret, ligne non activée, arrêt d'urgence).</td></tr></table>
<p class="mini" style="margin-top:3mm"><b>STAR ENTREPRISE</b> · contact@starentreprise.com · WhatsApp +242 06 656 50 50 · Brazzaville, République du Congo</p><div class="bandeau"></div></div>""")
html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>' + CSS + '</style></head><body>' + ''.join(P) + '</body></html>'
sortie = os.path.join(D, 'SARAH-WhatsApp-Guide-de-connexion.pdf'); tmp = '/tmp/guide-sarah.html'; open(tmp, 'w', encoding='utf-8').write(html)
js = f"""const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://{tmp}');await p.waitForTimeout(600);
await p.pdf({{path:'{sortie}',format:'A4',printBackground:true,margin:{{top:'0',bottom:'0',left:'0',right:'0'}}}});await b.close();}})().catch(e=>{{console.error(e);process.exit(1)}});"""
open('/tmp/guide-sarah-r.cjs', 'w').write(js); r = subprocess.run(['node', '/tmp/guide-sarah-r.cjs'], capture_output=True, text=True, cwd=ROOT)
if r.returncode: print(r.stderr); sys.exit(1)
print('OK', sortie, os.path.getsize(sortie) // 1024, 'Ko')
