// Guide d'utilisation « Passeport Sûr » de A à Z. Lancer : NODE_PATH=$(npm root -g) node tools/documents-passeport/fabrique-guide.cjs
const L = require('./lib-documents.cjs'); const path = require('path');
const { fig, duo, tels, couverture, butBand, signature, rendre, RACINE } = L;
const role = t => `<div class="note v"><b>Son rôle dans le but de l’application.</b> ${t}</div>`;
const html = [
couverture({ kic: 'Guide d’utilisation · De A à Z', titre: 'Passeport Sûr', sous: 'Guide d’utilisation détaillé<br>pour tous les profils', aQui: 'Pour les agents de guichet, la caisse, les agents de porte, la Préfecture, le Ministère et les demandeurs' }),

`<h1>Le but de l’application</h1>${butBand()}
<div class="cartes"><div class="carte"><h3>Suivre</h3><p>Chaque demande de passeport est suivie : dépôt, paiement, rendez-vous, traitement, remise. Le demandeur voit où en est son dossier.</p></div>
<div class="carte j"><h3>Ordonner</h3><p>Un rendez-vous après le paiement, des numéros d’appel, des portes, des écrans de salle d’attente : chacun passe à son tour.</p></div>
<div class="carte r"><h3>Sécuriser</h3><p>Les doublons, pièces modifiées, fausses identités, réseaux d’intermédiaires et délais anormaux sont signalés automatiquement.</p></div></div>
<h2>Comment lire ce guide</h2>
<p>Ce guide explique, <b>pas à pas</b>, comment utiliser l’application selon votre rôle. Chaque chapitre commence par rappeler <b>à quoi il sert par rapport au but</b> de l’application. Vous pouvez aller directement au chapitre qui vous concerne :</p>
<div class="toc"><div><b>★</b>À propos : rôle, importance, avantages, vision</div><div><b>1</b>Démarrer : ouvrir, installer, choisir son profil</div><div><b>2</b>Les profils et la vie d’un dossier</div><div><b>3</b>Préfecture : mettre en place le site</div><div><b>4</b>Agent de guichet : enregistrer une demande</div><div><b>5</b>Accueil : recevoir les demandeurs pré-enregistrés</div><div><b>6</b>Caisse : encaisser</div><div><b>7</b>Agent de porte : appeler les personnes</div><div><b>8</b>L’écran de la salle d’attente</div><div><b>9</b>Le demandeur : se pré-enregistrer et suivre son dossier</div><div><b>10</b>Préfecture et Ministère : piloter</div><div><b>11</b>Questions fréquentes et dépannage</div><div><b>12</b>Bonnes pratiques</div><div><b>13</b>Glossaire</div></div>
<div class="note"><b>À savoir.</b> Cette version est une <b>démonstration</b> : toutes les personnes, pièces, numéros et montants sont <b>fictifs</b>. Le tarif et la liste des pièces sont des <b>exemples à confirmer avec la Préfecture</b>. L’application ne prétend pas vérifier l’authenticité des documents.</div>`,

`<h1 class="chap">À propos : son rôle, son importance, ses avantages</h1>
<p><b>Son rôle.</b> « Passeport Sûr » est l’outil de travail commun du guichet, de la caisse, des portes, de la Préfecture et du Ministère. Il ne remplace ni la loi ni les agents : il <b>met de l’ordre, de la clarté et de la traçabilité</b> dans la demande de passeport.</p>
<p><b>Son importance.</b> Un passeport ouvre le droit de voyager, d’étudier, de se soigner ou de travailler à l’étranger. Il doit pouvoir être demandé <b>sans perdre des journées</b> et <b>sans connaître quelqu’un</b> ; et, pour l’État, chaque dossier doit être <b>traité de la même façon, de manière traçable et contrôlable</b>.</p>
<table><tr><th style="width:40mm">Avantage</th><th>Ce que vous constaterez</th></tr>
<tr><td><b>Transparence</b></td><td>Le demandeur sait où en est son dossier et ce qui manque ; chaque étape est datée.</td></tr>
<tr><td><b>Équité</b></td><td>On passe dans l’ordre du paiement et du rendez-vous ; le numéro, le nom et la porte s’affichent.</td></tr>
<tr><td><b>Gain de temps</b></td><td>Fiche pré-remplie par scan, pièces manquantes envoyées depuis le téléphone.</td></tr>
<tr><td><b>Contrôle</b></td><td>Des alertes à examiner par une personne ; jamais de décision automatique.</td></tr>
<tr><td><b>Pilotage</b></td><td>Chiffres en direct et export Excel pour les rapports.</td></tr>
<tr><td><b>Simplicité et légèreté</b></td><td>Visite guidée, aucun compte, application légère, installation en quelques touches sur téléphone ou ordinateur.</td></tr></table>
<h2>La vision de son créateur</h2>
<p>« Passeport Sûr » est conçu par <b>STAR ENTREPRISE</b>, à Brazzaville, sous la direction de <b>Carry OTEMBA</b>. Sa vision : <b>mettre la technologie congolaise au service d’un service public plus clair, plus juste et plus sûr</b> — où chacun est reçu à son tour, avec dignité, où chaque étape laisse une trace, et où <b>la décision reste toujours à l’agent habilité</b>.</p>
<h2>Ce qui revient au Ministère et à la Préfecture</h2>
<p>Le <b>Ministère</b> fixe la procédure, les pièces exigées et les tarifs officiels, choisit l’hébergement et les règles de conservation des données, et suit les résultats. La <b>Préfecture</b> désigne le site, les portes et les jours d’ouverture, nomme et forme les agents, gère l’espace partagé et <b>examine les alertes</b>. <b>STAR ENTREPRISE</b> fournit, maintient et forme. Cette répartition est une proposition de travail, à confirmer avec les autorités.</p>
<div class="note"><b>À savoir.</b> Les gains réels (temps d’attente, dossiers incomplets, fraudes repérées) devront être <b>mesurés pendant un projet pilote</b> ; la démonstration ne les chiffre pas.</div>`,

`<h1 class="chap">1. Démarrer</h1>
${role('Pour atteindre le but, l’application doit être simple à ouvrir et à comprendre dès le premier lancement, par n’importe quel agent ou demandeur.')}
<h2 style="margin-top:2mm">Ouvrir l’application</h2>
<p>Ouvrez le <b>lien</b> que vous avez reçu (par WhatsApp, par exemple) dans le navigateur de votre téléphone ou de votre ordinateur. Il n’y a rien à télécharger ni à créer : pas de compte, pas de mot de passe.</p>
<h2>L’installer sur le téléphone (facultatif)</h2>
<table><tr><th style="width:42mm">Téléphone</th><th>Comment faire</th></tr>
<tr><td><b>Android (Chrome)</b></td><td>Touchez le menu <b>⋮</b> puis <b>« Ajouter à l’écran d’accueil »</b> (ou « Installer l’application »).</td></tr>
<tr><td><b>iPhone (Safari)</b></td><td>Touchez <b>Partager</b> (le carré avec une flèche) puis <b>« Sur l’écran d’accueil »</b>.</td></tr>
<tr><td><b>Ordinateur (Chrome ou Edge)</b></td><td>Touchez l’icône d’installation à droite de la barre d’adresse, ou le menu <b>⋮</b> puis <b>« Installer Passeport Sûr »</b>.</td></tr></table>
<p>Dans l’application, <b>❓ Aide → « Installer l’application »</b> affiche ces consignes pour votre appareil, et un bouton « Installer maintenant » quand l’appareil le permet. <b>L’installation est facultative</b> : l’application fonctionne aussi directement dans le navigateur.</p>
<p>L’icône « Passeport Sûr » apparaît alors avec vos autres applications.</p>
<h2>Se connecter (espace sécurisé)</h2>
<p>Si la Préfecture a créé un <b>espace sécurisé</b>, l’application demande d’abord de <b>se connecter</b> : tapez votre <b>identifiant</b> et votre <b>mot de passe</b> personnels. Votre <b>rôle</b> est celui de votre compte : on ne le choisit plus. À la première connexion, le mot de passe <b>temporaire</b> remis par la Préfecture doit être remplacé par le vôtre (8 caractères minimum, avec une lettre et un chiffre).</p>
<ul><li><b>Mot de passe oublié ?</b> Touchez le lien sous le bouton : saisissez votre identifiant, la demande part chez la Préfecture, qui vous remet un mot de passe temporaire. La Préfecture utilise son <b>code de secours</b>.</li><li><b>Compte bloqué ?</b> Après 5 essais ratés, le compte est bloqué 15 minutes ; la Préfecture peut aussi le réinitialiser.</li><li><b>Se déconnecter</b> : touchez votre nom en haut de l’écran. Faites-le toujours sur un poste partagé. Après <b>30 minutes sans rien toucher</b>, l’application vous déconnecte toute seule.</li><li><b>Ne partagez jamais votre mot de passe.</b> Chaque action est notée à votre nom dans l’historique et dans le journal de sécurité.</li></ul>
${duo(['d_connexion', 'L’écran de connexion.'], ['d_comptes', 'Vue de la Préfecture : les comptes de l’espace.'])}
<h2>Au premier lancement : « Quel est votre rôle ? »</h2>
<p>L’application vous demande votre rôle. Touchez le vôtre : elle règle le <b>profil</b>, ouvre la bonne page et lance une <b>visite guidée</b> d’environ une minute. Vous pouvez la passer à tout moment (« Passer » ou la touche Échap).</p>
<div class="duo">${fig('d_bienvenue', 'Sur ordinateur : choix du profil.', 1100)}<div class="tel">${fig('t_bienvenue', 'Sur téléphone.', 600)}</div></div>`,

`<h2 style="margin-top:0">La visite guidée, la carte « Commencez ici » et l’aide</h2>
<ul><li>La <b>visite guidée</b> met en lumière, étape par étape, les éléments à utiliser. Boutons <b>Suivant</b> / <b>Précédent</b> / <b>Passer</b> ; sur ordinateur, les flèches du clavier fonctionnent aussi.</li>
<li>Sur l’<b>accueil</b>, la carte <b>« Commencez ici »</b> résume votre rôle et propose un bouton qui ouvre directement la bonne page.</li>
<li>Le bouton <b>❓ Aide</b> (en haut) permet de relancer la visite, de <b>changer de profil</b> ou de lire les <b>questions fréquentes</b>.</li>
<li>L’application <b>retient votre dernier profil</b> : si vous rechargez la page, vous restez à la même place.</li></ul>
<div class="duo">${fig('d_visite', 'Une étape de la visite guidée (caisse).', 1100)}${fig('d_faq', 'Les questions fréquentes.', 1100)}</div>
${fig('d_accueil', 'L’accueil avec la carte « Commencez ici » adaptée au profil.', 1400, 'p')}`,

`<h1 class="chap">2. Les profils et la vie d’un dossier</h1>
<table><tr><th style="width:34mm">Profil</th><th>Ce qu’il fait</th><th style="width:34mm">Pages utilisées</th></tr>
<tr><td><b>Agent de guichet</b></td><td>Enregistre les demandes : scan de la pièce, pièces jointes, signature, accusé.</td><td>Nouvelle demande, Dossiers</td></tr>
<tr><td><b>Accueil</b> (front office)</td><td>Reçoit les personnes pré-enregistrées : scan de l’accusé, comparaison avec les originaux, contrôle du paiement et des pièces, validation du paiement.</td><td>Réception, Caisse, Dossiers</td></tr>
<tr><td><b>Caisse</b></td><td>Ouvre le dossier (scan du QR), vérifie, encaisse, édite le reçu avec le rendez-vous.</td><td>Caisse</td></tr>
<tr><td><b>Agent de porte</b></td><td>Appelle les personnes, une par une, à sa porte.</td><td>File d’attente</td></tr>
<tr><td><b>Préfecture</b></td><td>Crée l’espace, règle le site, examine les alertes, pilote tout.</td><td>Toutes</td></tr>
<tr><td><b>Ministère</b></td><td>Consulte la situation réelle (lecture seule), exporte vers Excel.</td><td>Tableau de bord, Anti-fraude, Dossiers</td></tr>
<tr><td><b>Demandeur</b></td><td>Se pré-enregistre avec le lien de la Préfecture, suit son dossier, envoie une pièce manquante.</td><td>Suivi (page unique)</td></tr></table>
<h2>Les six étapes d’un dossier</h2>
<div class="etapes"><div><i>1</i><b>Demande déposée</b>au guichet</div><div><i>2</i><b>Paiement effectué</b>à la caisse</div><div><i>3</i><b>Dossier reçu</b>appelé en salle</div><div><i>4</i><b>En traitement</b>par la Préfecture</div><div><i>5</i><b>Passeport prêt</b>à retirer</div><div><i>6</i><b>Remis</b>au demandeur</div></div>
<p>À chaque étape, la date et l’agent sont enregistrés dans l’<b>historique</b> du dossier : c’est ce qui permet le suivi, la transparence et le contrôle.</p>`,

`<h1 class="chap">3. Préfecture : mettre en place le site</h1>
${role('Pour ordonner la file et suivre tous les dossiers ensemble, les postes doivent travailler sur le même espace. La Préfecture le crée et le règle.')}
<h2 style="margin-top:2mm">Créer l’espace partagé</h2>
<ol class="pas"><li>Choisissez le profil <b>Préfecture</b>.</li><li>Touchez la puce <b>« Mode local »</b> en haut de l’écran.</li><li>Touchez <b>« Créer l’espace »</b>. Vous pouvez cocher « avec les dossiers de démonstration » pour essayer.</li><li>L’application affiche le <b>code de l’espace</b> (8 caractères), un <b>QR</b> pour les postes et un <b>lien</b> pour les écrans de salle.</li><li>Donnez ce code (ou envoyez le lien) aux autres postes : <b>caisse, guichet, portes</b>. Ils touchent la puce, choisissent « Rejoindre un espace » et saisissent le code.</li></ol>
${fig('d_espace', 'Le panneau de l’espace : code, QR, lien des écrans.', 1300, 'p')}
<div class="note r"><b>Ne partagez pas le code publiquement.</b> Toute personne qui le possède accède aux postes de l’espace. Le demandeur, lui, reçoit un autre accès, limité à son seul dossier.</div>`,

`<h2 style="margin-top:0">Régler le site</h2>
<p>Ouvrez la page <b>Réglages</b> (profil Préfecture) :</p>
<table><tr><th style="width:56mm">Réglage</th><th>Effet</th></tr>
<tr><td><b>Nombre de portes (1 à 12)</b></td><td>Nombre de portes ouvertes dans la salle.</td></tr>
<tr><td><b>Personnes par jour</b></td><td>Capacité : au-delà, les nouveaux rendez-vous passent au jour ouvré suivant.</td></tr>
<tr><td><b>Délai minimal</b></td><td>Nombre de jours entre le paiement et le premier rendez-vous possible.</td></tr>
<tr><td><b>Jours ouverts, heure de début, durée d’un créneau, personnes par créneau</b></td><td>Calcul de l’heure du rendez-vous donné à chaque personne.</td></tr>
<tr><td><b>Lieu</b></td><td>Texte affiché sur le reçu, le message WhatsApp et l’écran.</td></tr>
<tr><td><b>Avancer la date (démonstration)</b></td><td>Pour montrer le jour du rendez-vous sans attendre : les personnes convoquées ce jour-là apparaissent dans la file.</td></tr></table>
<div class="note">Les valeurs par défaut sont des <b>exemples</b> à fixer avec la Préfecture.</div>
${fig('d_reglages', 'La page Réglages.', 1300, 'p')}
<h2>Sécuriser l’espace : les comptes du personnel</h2>
<p>À la création de l’espace, cochez <b>« Espace sécurisé »</b> et renseignez l’<b>identifiant</b>, le <b>nom</b> et le <b>mot de passe</b> de l’administrateur. L’application affiche alors un <b>code de secours</b> : <b>notez-le immédiatement</b> et rangez-le en lieu sûr, il ne sera plus jamais affiché.</p>
<p>Ouvrez ensuite la page <b>Comptes</b> : pour chaque agent (accueil, caisse, guichet, porte, Ministère), saisissez un identifiant, un nom et un <b>rôle</b>, puis touchez <b>« Créer le compte »</b>. Un <b>mot de passe temporaire</b> s’affiche <b>une seule fois</b> : remettez-le à la personne en main propre. Les boutons de la liste permettent de <b>réinitialiser</b> un mot de passe ou de <b>désactiver</b> un compte ; les demandes « mot de passe oublié » apparaissent en haut de la page.</p>
<h2>Saisir le montant officiel</h2>
<p>Dans <b>Réglages</b>, la carte <b>« Montant officiel du passeport »</b> reçoit le montant pour la première demande et pour le renouvellement. À saisir <b>une seule fois</b>, quand l’administration l’aura communiqué : la caisse l’affiche aussitôt, sans pouvoir le modifier, et le serveur refuse tout autre montant. Tant qu’il n’est pas saisi, la démonstration accepte un montant fictif.</p>
${fig('d_tarif', 'Le montant officiel dans les réglages.', 1300, 'p')}
<h2>Mettre fin à la démonstration</h2>
<p>Dans le panneau de l’espace, ouvrez <b>« Effacer définitivement cet espace »</b>, tapez <b>EFFACER</b>, puis validez : tous les dossiers, pièces jointes et écrans de l’espace sont supprimés du serveur. <b>Impossible à annuler.</b></p>`,

`<h1 class="chap">4. Agent de guichet : enregistrer une demande</h1>
${role('C’est ici que commence le suivi : un dossier complet, une signature, un accusé. Plus le dépôt est bien fait, moins le demandeur reviendra.')}
<h2 style="margin-top:2mm">Étape 1 — Choisir le type de demande</h2>
<p>Ouvrez <b>Nouvelle demande</b>. Choisissez <b>Première demande</b> ou <b>Renouvellement</b> (passeport expiré). Pour un renouvellement, le numéro et la date d’expiration de l’ancien passeport sont demandés, et l’ancien passeport doit être restitué.</p>
<h2>Étape 2 — Scanner la pièce</h2>
<p>Touchez <b>« Scanner avec la caméra »</b> et photographiez la <b>bande de lecture automatique</b> (les lignes de lettres et de chiffres avec des « &lt; », en bas de la pièce) ; ou choisissez une photo existante. La fiche se remplit toute seule. <b>Vérifiez toujours</b> les lignes lues : si les chiffres de contrôle ne correspondent pas, l’application l’indique en rouge.</p>
<ul><li>La première lecture prend quelques secondes (le moteur de lecture se prépare), les suivantes sont plus rapides.</li><li>Si la lecture échoue (photo floue ou sombre), reprenez la photo ou <b>saisissez les lignes à la main</b>.</li><li>Les boutons « Passeport expiré », « Carte d’identité » et « Faux » servent d’<b>exemples</b> pour s’entraîner.</li></ul>
${duo(['d_guichet_scan', 'Le cadre du scan et les lignes lues.'], ['d_guichet_fiche', 'La fiche remplie automatiquement.'])}`,

`<h2 style="margin-top:0">Étape 3 — Contrôler la fiche</h2>
<p>Corrigez ou complétez : nom, prénoms, date de naissance, sexe, numéro et date d’expiration de la pièce, <b>téléphone du demandeur</b> (c’est là que l’accusé sera envoyé), secteur de résidence. Des <b>alertes</b> apparaissent en direct si quelque chose est incohérent (pièce expirée, numéro déjà utilisé…).</p>
<h2>Étape 4 — Joindre les pièces</h2>
<p>Pour chaque pièce de la liste, touchez <b>« Photo »</b> (prise directe) ou <b>« Joindre »</b> (un fichier JPEG, PNG ou PDF, 4 Mo au maximum). Les pièces <b>obligatoires</b> sont marquées. Si une pièce manque, le dossier sera enregistré <b>« incomplet »</b> : vous pourrez le terminer plus tard, ou le demandeur enverra la pièce depuis son téléphone.</p>
${fig('d_guichet_pieces', 'Les pièces à joindre, obligatoires et facultatives.', 1300, 'p')}
<div class="note"><b>Vous êtes interrompu ?</b> Le brouillon est gardé sur l’appareil : en revenant sur « Nouvelle demande », un bandeau propose de <b>reprendre</b> où vous en étiez.</div>
<h2>Étape 5 — Faire signer</h2>
<p>Le demandeur signe <b>avec le doigt ou un stylet</b> dans le cadre. « Effacer » recommence la signature.</p>
<h2>Valider et remettre l’accusé</h2>
<p>Touchez <b>« Valider »</b>. L’application crée le dossier et affiche l’<b>accusé</b> : numéro de reçu, <b>code QR</b> et code de contrôle à 6 caractères. Touchez le bouton WhatsApp pour <b>envoyer l’accusé au demandeur</b> (dans cette démonstration, le message s’ouvre dans WhatsApp et c’est vous qui touchez « Envoyer »).</p>`,

`${duo(['d_guichet_signature', 'La signature.'], ['d_accuse', 'L’accusé avec le code QR.'])}
<h2>Sur téléphone</h2>
<div class="tel-duo">${fig('t_guichet', 'Nouvelle demande', 600)}${fig('t_signature', 'Signature au doigt', 600)}${fig('t_accuse', 'Accusé prêt à envoyer', 600)}</div>
<div class="note"><b>Dossier incomplet.</b> Dans la page <b>Dossiers</b>, le filtre « incomplets » liste les dossiers auxquels il manque des pièces. Ouvrez la fiche pour joindre la pièce (photo ou fichier).</div>`,

`<h1 class="chap">5. Accueil (front office) : recevoir les demandeurs pré-enregistrés</h1>
${role('Le pré-enregistrement permet au demandeur de préparer sa demande avant de se déplacer. L’accueil vérifie ses pièces originales : c’est ce contrôle qui sécurise la suite (paiement, rendez-vous) et sert le but de l’application.')}
<h2 style="margin-top:2mm">Qui passe par l’accueil ?</h2>
<p>Les personnes qui <b>se sont pré-enregistrées elles-mêmes</b> sur leur téléphone (chapitre 9) et se présentent avec leur <b>accusé</b> (le code QR) et leurs <b>pièces originales</b>. Les dossiers déposés directement au guichet n’ont pas besoin de passer par l’accueil.</p>
<h2>Recevoir une personne, pas à pas</h2>
<ol class="pas"><li>Choisissez le profil <b>Accueil</b>, puis ouvrez la page <b>Réception</b>.</li><li>Touchez <b>« Scanner le code QR »</b> et présentez l’accusé devant la caméra. Sans caméra : saisissez le <b>N° de dossier</b> et le <b>code de contrôle</b> (6 caractères).</li><li>La fiche et les pièces s’affichent. <b>Comparez avec les originaux</b> : pièce d’identité, visage de la personne, pièces à fournir.</li><li>Corrigez si besoin les <b>prénoms</b>, la <b>date de naissance</b> ou le <b>numéro de pièce</b>. Le <b>nom</b> ne se corrige pas ici : s’il est faux, signalez un écart.</li><li>Cochez les <b>trois vérifications</b>, puis touchez <b>« Vérifié : envoyer à la caisse »</b>.</li></ol>
${duo(['d_accueil_liste', 'La page Réception : scan, saisie du numéro et liste des personnes attendues.'], ['d_accueil_fiche', 'La fiche à comparer avec les originaux, et les trois vérifications.'])}
<h2>Le montant sur l’accusé du demandeur</h2>
<p>Après chaque paiement, le message WhatsApp préparé pour le téléphone du demandeur indique le <b>montant payé</b>, le <b>reçu</b>, la <b>date du rendez-vous</b> et le <b>numéro d’appel</b>. Le demandeur voit aussi ce montant sur son suivi. Dans cette démonstration, c’est l’agent qui touche le bouton « Envoyer par WhatsApp » ; l’envoi automatique demande le compte WhatsApp Business de la Préfecture.</p>
<h2>Contrôler et valider le paiement</h2>
<p>L’accueil voit <b>tous les dossiers enregistrés</b> (page <b>Dossiers</b>) et ne peut que <b>contrôler et vérifier</b> : le dossier est-il <b>payé</b> ? manque-t-il une <b>pièce</b> ? Pour valider un paiement, ouvrez la page <b>Caisse</b>, scannez ou saisissez le dossier, puis touchez <b>« Encaisser »</b> : le <b>numéro d’appel</b> et la <b>date du rendez-vous d’enrôlement</b> sont attribués <b>automatiquement</b> et <b>apparaissent sur l’accusé</b> du demandeur. Le paiement est enregistré <b>à votre nom</b>.</p>
<h2>S’il y a un écart</h2>
<p>Identité différente de la pièce, pièce suspecte, informations à refaire : choisissez le <b>motif</b> puis touchez <b>« Signaler l’écart »</b>. L’écart apparaît comme <b>alerte grave</b> au contrôle anti-fraude de la Préfecture, et <b>la caisse ne peut pas encaisser</b> ce dossier. Après correction, l’accueil peut le vérifier de nouveau.</p>
${duo(['d_caisse_bloquee', 'Si l’accueil n’a pas vérifié, la caisse affiche « À vérifier à l’accueil d’abord ».'], ['d_accueil_ok', 'Après vérification : « Vérifié à l’accueil » et passage à la caisse.'])}
<div class="note"><b>À savoir.</b> Les pièces peuvent être jointes par le demandeur (depuis son lien de suivi) ou par l’accueil (photo ou fichier). La caisse exige toujours les pièces obligatoires. Dans cette démonstration, il n’y a pas de signature sur écran pour un pré-enregistrement : la Préfecture devra décider comment la recueillir.</div>
<h2>Donner le lien de pré-enregistrement</h2>
<p>Sur la page Réception, le bouton <b>« Copier le lien »</b> donne le lien à communiquer aux demandeurs (WhatsApp, affiche, SMS). Il demande que l’<b>espace partagé</b> soit créé par la Préfecture.</p>`,

`<h1 class="chap">6. Caisse : encaisser</h1>
${role('La caisse est le point de contrôle avant le rendez-vous : un dossier incomplet ou suspect n’est pas encaissé. Après le paiement, le demandeur reçoit sa date et son numéro d’appel : c’est le début d’une file ordonnée.')}
<h2 style="margin-top:2mm">Ouvrir le dossier</h2>
<ol class="pas"><li>Ouvrez la page <b>Caisse</b>.</li><li>Touchez <b>« Scanner le code QR »</b> et présentez l’accusé du demandeur devant la caméra : le dossier s’ouvre tout seul.</li><li>Sans caméra : saisissez le <b>N° de reçu</b> et le <b>code de contrôle</b> (6 caractères), puis <b>« Ouvrir le dossier »</b>.</li><li>Pour vous entraîner : <b>« Exemple »</b> ouvre un dossier fictif.</li></ol>
<h2>Vérifier avant d’encaisser</h2>
<p>La fiche affiche l’identité, la photo, les pièces, la signature et les alertes. <b>L’encaissement est bloqué</b> dans deux cas :</p>
<ul><li>une <b>pièce obligatoire manque</b> (vous pouvez l’ajouter ici, ou le demandeur l’envoie depuis son téléphone) ;</li><li>une <b>alerte grave</b> n’a pas encore été examinée par la Préfecture.</li></ul>
${fig('d_caisse_dossier', 'Le dossier ouvert à la caisse.', 1300, 'p')}`,

`<h2 style="margin-top:0">Encaisser et éditer le reçu</h2>
<ol class="pas"><li>Saisissez le <b>montant encaissé</b> (dans la démonstration : un montant fictif ; le tarif officiel sera fixé par l’administration).</li><li>Choisissez le <b>mode de paiement</b> (espèces, Mobile Money…).</li><li>Touchez <b>« Encaisser et éditer le reçu de paiement »</b>.</li></ol>
<p>Le <b>reçu</b> s’affiche avec : le numéro de reçu de paiement, le <b>rendez-vous d’enrôlement</b> (jour, heure, lieu), le <b>numéro d’appel</b>, un QR et le récapitulatif. Vous pouvez <b>l’imprimer</b> et <b>envoyer la date de rendez-vous par WhatsApp</b> au demandeur. Un dossier déjà payé affiche « Déjà payé » et permet de <b>réimprimer</b> le reçu.</p>
<div class="note v">Les numéros d’appel sont <b>sans doublon</b>, même si plusieurs caisses encaissent en même temps, et la <b>capacité journalière</b> ne peut pas être dépassée : le rendez-vous passe automatiquement au jour suivant.</div>
${duo(['d_recu', 'Le reçu avec le rendez-vous et le numéro d’appel.'], ['d_caisse', 'La page Caisse et les encaissements du jour.'])}
<div class="tel-duo">${fig('t_caisse', 'Caisse sur téléphone', 600)}${fig('t_recu', 'Reçu sur téléphone', 600)}</div>`,

`<h1 class="chap">7. Agent de porte : appeler les personnes</h1>
${role('C’est le cœur de la file ordonnée : chaque porte appelle la personne suivante, dans l’ordre du paiement. Personne ne passe devant, et personne n’est appelé deux fois en même temps.')}
<h2 style="margin-top:2mm">La file du jour</h2>
<p>Ouvrez <b>File d’attente</b>. En haut, la date du jour de rendez-vous ; la liste ne contient que les personnes <b>convoquées ce jour-là</b>, par ordre de numéro. Les cases montrent le nombre en attente, le prochain numéro, les personnes déjà appelées et l’attente moyenne.</p>
<h2>Les portes</h2>
<table><tr><th style="width:52mm">Bouton</th><th>Effet</th></tr>
<tr><td><b>🔔 Appeler le suivant</b></td><td>La porte reçoit la prochaine personne. Son <b>numéro, son nom et la porte</b> s’affichent sur les écrans de la salle, avec la voix.</td></tr>
<tr><td><b>↻ Rappeler</b></td><td>Répète l’appel de la personne de cette porte (si elle ne s’est pas présentée tout de suite).</td></tr>
<tr><td><b>Absent</b></td><td>La personne n’est pas venue : elle <b>repart en fin de file</b> et ne sera rappelée qu’après les autres.</td></tr>
<tr><td><b>− / +</b></td><td>Ferme ou ouvre une porte (de 1 à 12).</td></tr>
<tr><td><b>✎</b></td><td>Donne un nom à une porte, par exemple « Vérification des pièces » ou « Empreintes et photo ».</td></tr></table>
${fig('d_portes', 'Les portes, chacune avec son numéro en cours et ses boutons.', 1300, 'p')}`,

`<div class="note"><b>Qui passe quand ?</b> Les appels se font <b>dans l’ordre</b>. Un numéro déjà passé n’est rappelé qu’à la <b>fin</b>. Quand plusieurs portes appellent en même temps, l’écran affiche les appels <b>l’un après l’autre</b> : chaque numéro reste <b>au moins 10 secondes</b>, et le texte « + 2 appels à annoncer » indique ceux qui attendent leur tour.</div>
${duo(['d_file_avant', 'La file avant les appels.'], ['d_file_apres', 'Après avoir appelé aux portes 1 et 2.'])}
<div class="note"><b>Les écrans connectés</b> sont listés en haut de la page (« Écrans connectés : Salle d’attente 1… »). Si aucun n’est connecté, ouvrez l’écran (chapitre suivant).</div>`,

`<h1 class="chap">8. L’écran de la salle d’attente</h1>
${role('L’écran rend la file visible et équitable : chacun voit son numéro, son nom et sa porte, et entend l’annonce. Il remplace les cris dans les couloirs et les passages « à la faveur ».')}
<h2 style="margin-top:2mm">Installer l’écran (téléviseur, tablette ou ordinateur)</h2>
<ol class="pas"><li>Sur l’appareil de la salle, ouvrez le <b>lien « écran »</b> donné par la Préfecture (ou touchez « Ouvrir un écran ici » dans le panneau de l’espace).</li><li>Entrez le <b>code de l’espace</b> et donnez un <b>nom à l’écran</b> (ex. « Salle d’attente 1 »).</li><li>Touchez <b>« ▶ Démarrer »</b> : l’écran passe en plein écran et commence à recevoir les appels en direct.</li><li>Touchez <b>« 🔊 Activer le son et la voix »</b> une fois : sans cela, le navigateur interdit le son.</li></ol>
${duo(['d_ecran_demarrage', 'L’écran de démarrage.'], ['d_ecran_appel1', 'Un appel s’affiche.'])}`,

`<h2 style="margin-top:0">Ce que l’écran affiche</h2>
<ul><li><b>À gauche, en grand</b> : le dernier appel, avec le numéro, le nom et la porte.</li><li><b>À droite</b> : la grille de toutes les portes (le numéro et le nom de la personne reçue, ou « libre »), puis les <b>prochains numéros</b>.</li><li><b>La voix</b> annonce le numéro, le nom et la porte (« Numéro 2. Monsieur… veuillez vous diriger vers la porte 2 »), répétée une fois.</li><li>En bas à droite : l’état de la connexion. En cas de coupure, un <b>bandeau rouge</b> apparaît, le <b>dernier affichage reste visible</b>, et l’écran se reconnecte seul.</li></ul>
${fig('d_ecran_appel2', 'L’écran de la salle : deuxième appel, portes et prochains numéros.', 1400, 'p')}
<div class="note"><b>Conseils pratiques.</b> Branchez l’appareil sur secteur, désactivez sa mise en veille, vérifiez le son et la voix <b>française</b> avant l’ouverture. Plusieurs écrans peuvent être connectés en même temps : ils affichent la même chose.</div>`,

`<h1 class="chap">9. Le demandeur : se pré-enregistrer et suivre son dossier</h1>
${role('Le suivi donne au citoyen une information claire sur sa demande, sans déplacement inutile : c’est la transparence recherchée par le but de l’application.')}
<h2 style="margin-top:2mm">Se pré-enregistrer avant de se déplacer</h2>
<p>Avec le <b>lien de pré-enregistrement</b> donné par la Préfecture, le demandeur prépare sa demande depuis son téléphone, sans compte ni mot de passe :</p>
<ol class="pas"><li>Choisissez <b>Première demande</b> ou <b>Renouvellement</b> (pour un renouvellement, indiquez l’ancien passeport).</li><li>Remplissez votre <b>nom, prénoms, date de naissance, téléphone</b> et les informations de votre <b>pièce d’identité</b> — exactement comme sur la pièce originale.</li><li>Touchez <b>« Envoyer mon pré-enregistrement »</b> : vous recevez un <b>accusé avec code QR</b>. Enregistrez-le (capture d’écran ou bouton « Enregistrer l’accusé »).</li><li>Présentez-vous à l’<b>accueil</b> avec l’accusé et vos <b>pièces originales</b>. Après vérification, vous passez à la caisse.</li></ol>
<div class="tel-duo">${fig('t_inscription', 'Le lien de pré-enregistrement', 600)}${fig('t_inscription_champs', 'La fiche à remplir', 600)}${fig('t_inscription_recu', 'L’accusé avec code QR', 600)}</div>
<div class="note"><b>Important.</b> Le pré-enregistrement <b>ne vaut pas dépôt</b> : il est validé à l’accueil. Les informations doivent être identiques à vos pièces originales ; la liste des pièces à apporter est indicative, à confirmer avec la Préfecture.</div>
<h2>Recevoir et ouvrir son lien</h2>
<p>Après l’enregistrement, puis après le paiement, le demandeur reçoit des messages sur WhatsApp (accusé, puis date de rendez-vous). Le message contient un <b>lien de suivi</b>. En l’ouvrant, il voit <b>uniquement son dossier</b> : sans compte, sans mot de passe.</p>
<h2>Ce qu’il voit</h2>
<ul><li>Les <b>étapes franchies</b> de son dossier (déposée, payée, reçue, en traitement, prête, remise).</li><li>Après le paiement : son <b>rendez-vous</b> (jour, heure, lieu) et son <b>numéro d’appel</b>.</li><li>Ce qu’il <b>manque</b> éventuellement, et la possibilité de <b>l’envoyer</b>.</li></ul>
<h2>Envoyer une pièce manquante</h2>
<ol class="pas"><li>Ouvrez le lien de suivi.</li><li>Dans « Ajouter ou remplacer une pièce », touchez <b>« Photo »</b> (prise directe) ou <b>« Joindre »</b> (un fichier).</li><li>La pièce part tout de suite vers la Préfecture ; le dossier peut alors devenir complet.</li></ol>
<div class="tel-duo">${fig('t_demandeur', 'Suivi du dossier', 600)}${fig('t_demandeur_rdv', 'Rendez-vous et numéro d’appel', 600)}${fig('t_accuse', 'Accusé reçu à l’enregistrement', 600)}</div>
<div class="note r"><b>Le jour du rendez-vous</b> : venez avec votre <b>reçu de paiement</b>, asseyez-vous dans la salle, et regardez l’écran. Quand votre numéro s’affiche avec votre nom, levez-vous et allez à la <b>porte indiquée</b>.</div>`,

`<h1 class="chap">10. Préfecture et Ministère : piloter</h1>
${role('Voir la situation réelle et les cas à risque est ce qui permet d’agir : accélérer ce qui bloque, examiner ce qui est suspect, rendre des comptes.')}
<h2 style="margin-top:2mm">Le tableau de bord</h2>
<p>Il montre : demandes enregistrées, dossiers reçus, en traitement, passeports prêts et remis, pas encore remis, renouvellements, alertes à examiner, dossiers incomplets et délai moyen de remise ; avec des graphiques (répartition par état, première demande / renouvellement, demandes par jour, secteurs). Le bouton <b>« Télécharger le fichier Excel »</b> exporte les tableaux et graphiques.</p>
${fig('d_tableau_demo', 'Le tableau de bord (données fictives).', 1300, 'p')}
<h2>Le contrôle anti-fraude</h2>
<p>La page <b>Contrôle anti-fraude</b> classe les cas <b>du plus grave au moins grave</b> et liste les agents à surveiller. Pour chaque cas, ouvrez la fiche : l’historique et les signaux sont affichés. La Préfecture peut alors :</p>
<ul><li>marquer l’alerte comme <b>examinée / vérifiée</b> : l’encaissement est de nouveau possible ;</li><li>ouvrir une <b>enquête</b> (le dossier reste signalé).</li></ul>
<div class="note r"><b>Rappel.</b> Une alerte est un <b>signal à examiner</b> par une personne, pas une preuve de fraude.</div>`,

`${fig('d_fraude', 'Le contrôle anti-fraude (données fictives).', 1300, 'p')}
<h2>Le journal de sécurité</h2>
<p>La page <b>Sécurité</b> (Préfecture et Ministère) liste <b>qui a fait quoi</b> : connexions, refus, réglages modifiés, paiements — et toute <b>tentative de contournement</b>, repérée par 🚨. Le bouton <b>« Vérifier l’intégrité du journal »</b> contrôle que personne n’a modifié ni effacé une ligne : le message « Journal intact » confirme que la chaîne est complète. Dès qu’un événement grave est noté, un <b>message d’alerte de sécurité</b> s’affiche sur votre écran.</p>
${fig('d_securite', 'Le journal de sécurité.', 1300, 'p')}
<h2>L’alerte du Ministre en temps réel</h2>
<p>Quand une <b>alerte de fraude grave</b> apparaît (pièce déjà utilisée, pièce modifiée, écart signalé à l’accueil…), un <b>bandeau rouge</b> s’affiche en haut de l’interface du Ministère et de la Préfecture, avec le dossier concerné et le motif, et un message apparaît en bas de l’écran. Touchez <b>« Voir les alertes »</b> pour ouvrir le contrôle anti-fraude, ou <b>« Marquer comme lues »</b> pour retirer le bandeau. Le Ministre consulte seulement : il ne peut rien modifier.</p>
${fig('d_ministre_alerte', 'Le bandeau d’alerte sur l’interface du Ministre.', 1300, 'p')}
<h2>Dossiers et fiche d’un dossier</h2>
<p>La page <b>Dossiers</b> liste tous les dossiers ; recherchez par nom, numéro de dossier ou numéro de pièce, filtrez par état, type, secteur ou alerte, et touchez une ligne pour ouvrir la <b>fiche</b> : identité, pièces, signature, historique, alertes. La Préfecture et les agents autorisés peuvent <b>faire avancer</b> le dossier à l’étape suivante ; le Ministère est en <b>lecture seule</b>.</p>
${duo(['d_dossiers', 'La liste des dossiers.'], ['d_fiche', 'La fiche d’un dossier.'])}
<div class="tel-duo">${fig('t_tableau', 'Tableau de bord', 600)}${fig('t_fraude', 'Anti-fraude', 600)}</div>`,

`<h1 class="chap">11. Questions fréquentes et dépannage</h1>
<table><tr><th style="width:62mm">Situation</th><th>Que faire ?</th></tr>
<tr><td>Je ne sais pas quel profil choisir.</td><td>Touchez ❓ Aide puis « Changer de profil » : chaque rôle est décrit en une phrase.</td></tr>
<tr><td>La visite guidée s’est fermée trop vite.</td><td>❓ Aide → « Visite guidée de mon profil », ou le bouton « Visite guidée » de la carte « Commencez ici ».</td></tr>
<tr><td>La puce indique « Reconnexion… » (orange).</td><td>La connexion Internet est coupée. Les postes restent utilisables et se resynchronisent seuls. Évitez d’encaisser tant que la puce n’est pas redevenue verte.</td></tr>
<tr><td>J’ai encaissé mais le réseau a coupé.</td><td>Rouvrez le dossier : s’il a été encaissé, le reçu s’affiche (« Déjà payé »). Sinon, encaissez de nouveau.</td></tr>
<tr><td>« Encaissement bloqué ».</td><td>Une pièce obligatoire manque, ou une alerte grave attend l’examen de la Préfecture. Ajoutez la pièce ou demandez l’examen.</td></tr>
<tr><td>Je ne peux plus me connecter.</td><td>Vérifiez l’identifiant et le mot de passe. Après 5 essais ratés, attendez 15 minutes ou demandez une réinitialisation à la Préfecture (lien « Mot de passe oublié »).</td></tr>
<tr><td>« Votre rôle ne permet pas cette action ».</td><td>Votre compte n’a pas ce droit (par exemple, seule la Préfecture règle le site). Demandez à la Préfecture si votre rôle doit changer.</td></tr>
<tr><td>« Le montant officiel est de … FCFA ».</td><td>Le montant officiel a été saisi par la Préfecture : il est imposé à la caisse et ne peut pas être modifié.</td></tr>
<tr><td>« À vérifier à l’accueil d’abord ».</td><td>Le dossier a été pré-enregistré par le demandeur : envoyez-le à l’accueil avec ses pièces originales. Le paiement est possible après la vérification.</td></tr>
<tr><td>« Ce dossier est déjà payé ».</td><td>Une autre caisse vient de l’encaisser : un dossier ne peut être payé qu’une fois. Réimprimez le reçu.</td></tr>
<tr><td>Le scan de la pièce échoue.</td><td>Reprenez la photo (bien éclairée, à plat, bande de lecture nette et entière) ou saisissez les lignes à la main.</td></tr>
<tr><td>Le code QR ne se lit pas.</td><td>Saisissez le N° de reçu et le code de contrôle à 6 caractères.</td></tr>
<tr><td>L’écran de salle ne dit rien.</td><td>Touchez « Activer le son et la voix » ; vérifiez le volume et la voix française de l’appareil.</td></tr>
<tr><td>L’écran n’affiche aucun appel.</td><td>Vérifiez le code de l’espace, la date du jour (la file ne contient que les rendez-vous du jour) et le bandeau de connexion.</td></tr>
<tr><td>Personne dans la file un jour de démonstration.</td><td>Page Réglages → « Avancer la date » jusqu’au jour du rendez-vous.</td></tr>
<tr><td>Hors connexion, une page ne s’ouvre pas.</td><td>Une page jamais ouverte sur cet appareil a besoin d’Internet la première fois ; ensuite elle est gardée.</td></tr></table>`,

`<h1 class="chap">12. Bonnes pratiques</h1>
<div class="cartes deux"><div class="carte"><h3>Protéger les accès</h3><p>Ne partagez pas le code de l’espace publiquement. Le lien de suivi d’un demandeur ne doit être envoyé qu’à lui.</p></div>
<div class="carte j"><h3>Vérifier avant de valider</h3><p>Relisez toujours les lignes lues par le scan et la fiche : l’application aide, l’agent décide.</p></div>
<div class="carte f"><h3>Respecter les alertes</h3><p>Une alerte grave non examinée bloque l’encaissement. Ne cherchez pas à la contourner : demandez l’examen.</p></div>
<div class="carte r"><h3>Données fictives</h3><p>Dans cette version, n’entrez pas de vraies données personnelles. En fin de démonstration, effacez l’espace.</p></div></div>
<h1 style="margin-top:8mm">13. Glossaire</h1>
<table><tr><th style="width:42mm">Terme</th><th>Signification</th></tr>
<tr><td>Accusé</td><td>Document remis au demandeur à l’enregistrement, avec son numéro de reçu et un code QR.</td></tr>
<tr><td>Code de contrôle</td><td>6 caractères propres à un dossier, qui servent à l’ouvrir à la caisse ou à le suivre.</td></tr>
<tr><td>Enrôlement</td><td>Prise des empreintes et de la photo, avec le matériel officiel, au rendez-vous donné.</td></tr>
<tr><td>Front office (accueil)</td><td>Poste qui reçoit les demandeurs, scanne l’accusé et compare la fiche aux pièces originales.</td></tr>
<tr><td>Pré-enregistrement</td><td>Fiche remplie par le demandeur lui-même sur son téléphone, validée ensuite à l’accueil.</td></tr>
<tr><td>Espace sécurisé</td><td>Espace où chaque agent se connecte avec son identifiant et son mot de passe ; les droits dépendent du rôle.</td></tr>
<tr><td>Code de secours</td><td>Code remis une seule fois à la Préfecture pour retrouver l’accès si elle oublie son mot de passe.</td></tr>
<tr><td>Montant officiel</td><td>Montant fixé par l’administration, saisi une seule fois et appliqué à tous les postes.</td></tr>
<tr><td>Espace</td><td>Ensemble partagé auquel les postes et les écrans d’un site se connectent avec un code.</td></tr>
<tr><td>MRZ</td><td>Lignes de lettres et de chiffres (avec « &lt; ») en bas d’un passeport ou d’une carte, lisibles par machine.</td></tr>
<tr><td>N° d’appel</td><td>Numéro donné au paiement ; il s’affiche à l’écran quand c’est votre tour.</td></tr>
<tr><td>Porte</td><td>Poste de réception numéroté (Porte 1, Porte 2…) qui appelle les personnes une par une.</td></tr>
<tr><td>Alerte</td><td>Signal automatique demandant l’examen d’un dossier par une personne.</td></tr></table>
${signature()}`,

`<section class="fin"><img src="file://${RACINE}/passeport-demo/img/star-entreprise.webp" alt="STAR ENTREPRISE"><h2>STAR ENTREPRISE</h2><p>Brazzaville, République du Congo · www.starentreprise.com</p><p><b>Passeport Sûr</b> — suivre chaque demande de passeport de A à Z, ordonner la file d’attente, détecter les fraudes.</p><p style="margin-top:10mm;font-size:9pt">Tous droits réservés. Démonstration avec données entièrement fictives.</p></section>`
].join('\n');
rendre({ html, titre: 'Passeport Sûr — Guide d’utilisation de A à Z', sortie: path.join(RACINE, 'docs', 'passeport-sur', 'Passeport-Sur-Guide-utilisation-A-a-Z.pdf') }).catch(e => { console.log('CRASH', e.message); process.exit(1); });
