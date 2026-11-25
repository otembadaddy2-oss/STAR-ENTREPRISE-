// Dossier de présentation « Passeport Sûr » (Ministère / Préfecture de Brazzaville). Lancer : NODE_PATH=$(npm root -g) node tools/documents-passeport/fabrique-presentation.cjs
const L = require('./lib-documents.cjs'); const path = require('path');
const { fig, duo, tels, couverture, butBand, signature, rendre, RACINE } = L;
const html = [
couverture({ kic: 'Proposition de projet · Brazzaville', titre: 'Passeport Sûr', sous: 'Suivi · Contrôle · Transparence<br>Dossier de présentation', aQui: 'À l’attention du Ministère et de la Préfecture de Brazzaville' }),

`<h1>1. Le but de l’application</h1>${butBand()}
<p>Le passeport est un document essentiel pour les citoyens, et son obtention doit être <b>claire, équitable et sûre</b>. « Passeport Sûr » est une application proposée pour accompagner chaque demande, depuis le dépôt jusqu’à la remise du passeport.</p>
<div class="cartes">
<div class="carte"><h3>1 · Suivre</h3><p>Chaque dossier est suivi de A à Z : dépôt, paiement, rendez-vous d’enrôlement, traitement, remise. Le demandeur voit lui-même où en est son passeport.</p></div>
<div class="carte j"><h3>2 · Ordonner</h3><p>Après le paiement, un rendez-vous est donné. Le jour venu, les numéros s’affichent sur des écrans avec le nom et la porte : chacun passe à son tour, personne ne passe devant.</p></div>
<div class="carte r"><h3>3 · Sécuriser</h3><p>Doublons, pièces modifiées, fausses identités, réseaux d’intermédiaires, délais anormaux : le système les signale automatiquement à la Préfecture, qui décide des suites.</p></div></div>
<h2>Pour qui ?</h2>
<table><tr><th style="width:34mm">Qui</th><th>Ce que l’application lui apporte</th></tr>
<tr><td><b>Le demandeur</b></td><td>La possibilité de se pré-enregistrer avant de se déplacer, un accusé sur son téléphone, un rendez-vous précis, le suivi de son dossier, la possibilité d’envoyer une pièce manquante sans revenir au guichet.</td></tr>
<tr><td><b>L’accueil (front office)</b></td><td>Il reçoit les personnes pré-enregistrées, scanne l’accusé, compare la fiche aux pièces originales, contrôle le paiement et les pièces, puis valide le paiement — ou signale un écart.</td></tr>
<tr><td><b>L’agent de guichet</b></td><td>Une fiche qui se remplit à partir de la pièce scannée, la liste des pièces à fournir, la signature sur l’écran.</td></tr>
<tr><td><b>La caisse</b></td><td>L’ouverture du dossier par scan du code QR, des contrôles avant l’encaissement, un reçu avec le rendez-vous.</td></tr>
<tr><td><b>Les agents de porte</b></td><td>Une file claire, des boutons « appeler le suivant », « rappeler », « absent ».</td></tr>
<tr><td><b>La Préfecture</b></td><td>Le pilotage du site (portes, capacité, jours ouverts), les alertes de fraude à examiner, tous les dossiers.</td></tr>
<tr><td><b>Le Ministère</b></td><td>Une vue d’ensemble en temps réel : qui a demandé, payé, été reçu, reçu son passeport ; l’export Excel.</td></tr></table>
<div class="note"><b>Ce que ce document est — et n’est pas.</b> C’est la présentation d’une <b>proposition de projet</b> avec une <b>démonstration fonctionnelle</b> dont toutes les données sont fictives. Ce n’est pas un système en service. L’application <b>ne prétend pas vérifier l’authenticité</b> des documents : elle signale des incohérences pour qu’un agent les examine. Les tarifs et la liste des pièces montrés sont des <b>exemples à confirmer avec la Préfecture</b>.</div>`,

`<h1 class="chap">2. Son rôle, son importance, ses avantages</h1>
<p><b>Son rôle.</b> « Passeport Sûr » est l’outil de travail commun de tous ceux qui touchent à une demande de passeport : le guichet, la caisse, les portes, la Préfecture et le Ministère. Il ne remplace ni la loi, ni les agents, ni la décision de délivrer un passeport : il <b>met de l’ordre, de la clarté et de la traçabilité</b> dans la démarche.</p>
<h2>Pourquoi c’est important</h2>
<ul><li><b>Pour le citoyen</b> : un droit essentiel — pouvoir voyager, étudier, se soigner ou travailler à l’étranger — passe par un document que l’on doit pouvoir demander <b>sans perdre des journées</b> et <b>sans devoir connaître quelqu’un</b>.</li>
<li><b>Pour l’État</b> : un passeport est un document d’identité de la République. Chaque dossier doit être traité <b>de façon identique, traçable et contrôlable</b>, pour protéger la valeur et la confiance dans le document.</li>
<li><b>Pour les agents</b> : un travail plus lisible, moins de contestations, des consignes claires à chaque étape.</li></ul>
<h2>Ses avantages</h2>
<table><tr><th style="width:44mm">Avantage</th><th>Ce que cela change concrètement</th></tr>
<tr><td><b>Transparence</b></td><td>Le demandeur sait où en est son dossier et ce qui manque ; chaque étape est datée dans l’historique.</td></tr>
<tr><td><b>Équité</b></td><td>L’ordre de passage suit l’ordre du paiement et du rendez-vous ; le numéro s’affiche à l’écran avec le nom et la porte.</td></tr>
<tr><td><b>Gain de temps</b></td><td>Fiche pré-remplie par scan, pièces manquantes envoyées depuis le téléphone, moins d’allers-retours.</td></tr>
<tr><td><b>Contrôle</b></td><td>Alertes automatiques (doublons, pièces modifiées, délais anormaux) à examiner par une personne, jamais de décision automatique.</td></tr>
<tr><td><b>Pilotage</b></td><td>Chiffres en temps réel et export Excel pour les rapports et les décisions.</td></tr>
<tr><td><b>Simplicité</b></td><td>Visite guidée par profil, fonctionne sur téléphone comme sur ordinateur, installation en quelques touches.</td></tr>
<tr><td><b>Légèreté</b></td><td>Application légère (environ 1,4 Mo hors lecteur de pièces), pensée pour des réseaux et des appareils modestes.</td></tr></table>
<div class="note"><b>Les avantages décrits sont ceux que la démonstration permet de montrer.</b> Les gains réels (temps d’attente, nombre de dossiers incomplets, fraudes repérées) devront être <b>mesurés pendant une phase pilote</b> et ne sont pas chiffrés ici.</div>`,

`<h1 class="chap">3. La vision de son créateur</h1>
<p>« Passeport Sûr » est conçu par <b>STAR ENTREPRISE</b>, entreprise congolaise basée à Brazzaville, dirigée par <b>Carry OTEMBA</b>. L’idée directrice est simple : <b>mettre la technologie congolaise au service d’un service public plus clair, plus juste et plus sûr</b>.</p>
<div class="cartes">
<div class="carte"><h3>Un service public lisible</h3><p>Que chaque citoyen sache, à tout moment, où en est sa demande, ce qu’il doit fournir et quand il sera reçu.</p></div>
<div class="carte j"><h3>Un accueil digne</h3><p>Que personne ne soit contraint de « connaître quelqu’un » : chacun est appelé à son tour, avec son nom, à une porte précise.</p></div>
<div class="carte r"><h3>Une confiance durable</h3><p>Que chaque étape laisse une trace, que les anomalies soient signalées, et que la décision reste toujours entre les mains des agents habilités.</p></div></div>
<h2>Les principes qui guident la conception</h2>
<ul><li><b>L’humain décide.</b> L’application signale, elle n’accuse pas et ne tranche pas.</li>
<li><b>Utilisable par tous.</b> Peu de mots, de gros boutons, une aide intégrée, un téléphone suffit.</li>
<li><b>Léger et accessible.</b> Qu’il s’ouvre vite et s’installe facilement sur n’importe quel téléphone ou ordinateur, même avec une connexion limitée : une page d’installation à partager par WhatsApp (détection de l’appareil, code QR), un bouton « Installer » dans l’application, un texte réglable en taille, des images allégées (moins de 1 Mo au total) et un fonctionnement possible sans installation.</li>
<li><b>Données protégées.</b> Seules les informations utiles sont gardées ; chacun ne voit que ce dont il a besoin ; l’hébergement et la durée de conservation sont décidés avec l’autorité.</li>
<li><b>Honnêteté.</b> Une démonstration est présentée comme une démonstration ; ce qui reste à construire est dit clairement.</li></ul>
<div class="note"><b>Ambition.</b> Si la démonstration convainc, STAR ENTREPRISE propose de la transformer, avec le Ministère et la Préfecture, en un <b>projet pilote sur un site</b>, évalué avant tout élargissement.</div>`,

`<h1 class="chap">4. Le rôle du Ministère et de la Préfecture</h1>
<p>Une application seule ne suffit pas : le projet repose sur des <b>décisions et des responsabilités qui appartiennent à l’autorité</b>. Voici, à titre de proposition, ce que le Ministère et la Préfecture auraient « en charge ».</p>
<table><tr><th style="width:44mm">Responsable</th><th>Ce qui lui revient dans le projet</th></tr>
<tr><td><b>Le Ministère</b></td><td>Valider le principe du projet pilote et le cadre légal ; fixer la procédure officielle, les <b>pièces exigées</b> et les <b>tarifs</b> (ceux de la démonstration sont des exemples) ; choisir l’hébergement et les règles de conservation des données ; suivre les résultats avec le tableau de bord.</td></tr>
<tr><td><b>La Préfecture</b></td><td>Désigner le site pilote, le nombre de portes et les jours d’ouverture ; nommer et former les agents (guichet, caisse, portes) ; créer et gérer l’espace partagé ; <b>examiner les alertes</b> de fraude et décider des suites.</td></tr>
<tr><td><b>Les agents</b></td><td>Utiliser l’application selon leur profil ; appeler les personnes à leur tour ; ne jamais partager l’accès du poste.</td></tr>
<tr><td><b>STAR ENTREPRISE</b></td><td>Fournir et maintenir l’application, former les premiers utilisateurs, corriger ce que le pilote révèle, et rendre compte des résultats.</td></tr></table>
<h2>Ce que le Ministère garde toujours</h2>
<ul><li>La <b>décision</b> de délivrer ou non un passeport, et toute décision à la suite d’une alerte.</li>
<li>Le <b>contrôle</b> de l’accès aux données et de leur usage.</li>
<li>La possibilité d’<b>arrêter ou de corriger</b> le dispositif à tout moment.</li></ul>
<div class="note"><b>À confirmer ensemble.</b> Cette répartition est une proposition de travail. Les textes officiels, les tarifs et la liste des pièces restent ceux fixés par les autorités.</div>`,

`<h1 class="chap">5. Le back-office de réception, les comptes et les droits</h1>
<div class="butband"><small>En lien avec le but de l’application</small><p>Suivre chaque demande, ordonner la file et détecter les fraudes suppose de savoir <b>qui fait quoi</b> : chaque agent a son compte et des droits limités à son rôle, et le Ministre voit la situation réelle, avec une alerte immédiate en cas de fraude.</p></div>
<h2>Le back-office de réception</h2>
<p>L’<b>agent d’accueil</b> dispose d’un espace de gestion de réception. Il peut <b>voir tous les dossiers enregistrés</b> dans le système et il ne peut que <b>contrôler et vérifier</b> : le dossier est-il payé ou non ? manque-t-il une pièce ? Il <b>valide le paiement</b>. Dès cette validation, le système attribue <b>automatiquement</b> le <b>numéro d’appel</b> et la <b>date de rendez-vous d’enrôlement</b>, les transmet au dossier et les <b>fait apparaître sur l’accusé</b> du demandeur (son lien de suivi et son reçu).</p>
<h2>Connexion par identifiant et mot de passe</h2>
<ul><li>L’accueil, la caisse, le guichet, les portes, la Préfecture et le Ministère <b>doivent se connecter</b> : un identifiant et un mot de passe <b>personnels</b>.</li>
<li>La <b>Préfecture crée les comptes</b>. Elle remet à chaque agent un <b>mot de passe temporaire</b> (affiché une seule fois) que l’agent doit <b>changer dès sa première connexion</b>. Un mot de passe contient au moins 8 caractères, avec une lettre et un chiffre.</li>
<li>Les mots de passe ne sont <b>jamais enregistrés en clair</b> (empreinte à sens unique avec sel). Après <b>5 essais ratés</b>, le compte est bloqué 15 minutes. Une session dure 12 heures au plus ; la Préfecture peut désactiver un compte ou le réinitialiser, ce qui ferme aussitôt sa session.</li>
<li>Le <b>rôle est imposé par le compte</b> : on ne peut plus « choisir son profil ». Surtout, les droits sont <b>appliqués par le serveur</b> : même en manipulant l’écran, un agent ne peut pas faire ce que son rôle interdit.</li></ul>
${duo(['d_connexion', 'L’écran de connexion : identifiant, mot de passe, « mot de passe oublié ».'], ['d_comptes', 'La Préfecture crée et gère les comptes de son espace.'])}
<h2>Mot de passe oublié</h2>
<table><tr><th style="width:52mm">Qui</th><th>Comment retrouver l’accès</th></tr>
<tr><td><b>Un agent</b> (accueil, caisse, guichet, porte, Ministère)</td><td>Il saisit son identifiant : la demande apparaît chez la <b>Préfecture</b>, qui <b>réinitialise</b> et lui remet un mot de passe temporaire. La réponse est la même que l’identifiant existe ou non : on ne révèle pas quels comptes existent.</td></tr>
<tr><td><b>La Préfecture</b></td><td>Elle utilise son <b>code de secours</b>, remis une seule fois à la création de l’espace (à ranger en lieu sûr). Il est <b>renouvelé</b> à chaque usage.</td></tr></table>
<div class="note"><b>Limite actuelle.</b> Aucun service d’envoi de <b>courriel ou de SMS</b> n’est encore branché : la réinitialisation passe donc par la Préfecture. L’envoi automatique d’un lien ou d’un code se branchera avec un fournisseur choisi avec le Ministère, et s’ajoutera à ce dispositif sans le remplacer.</div>
<h2>Les droits de chaque rôle</h2>
<table><tr><th style="width:36mm">Rôle</th><th>Ce que le serveur autorise</th></tr>
<tr><td><b>Préfecture</b></td><td>Tout : comptes, réglages du site et montant officiel, dossiers, paiement, appels, anti-fraude, effacement de l’espace.</td></tr>
<tr><td><b>Ministère</b></td><td><b>Consulter seulement</b> : tableau de bord, anti-fraude, tous les dossiers. Aucune écriture.</td></tr>
<tr><td><b>Accueil</b></td><td>Voir les dossiers, vérifier les pièces, <b>valider le paiement</b> ; pas de réglages, pas de comptes.</td></tr>
<tr><td><b>Caisse</b></td><td>Voir les dossiers et encaisser.</td></tr>
<tr><td><b>Agent de guichet</b></td><td>Enregistrer et compléter les dossiers ; ne peut pas encaisser.</td></tr>
<tr><td><b>Agent de porte</b></td><td>Appeler, rappeler, signaler un absent ; ne modifie pas les dossiers.</td></tr></table>
<h2>Le Ministre voit la situation réelle, et est alerté en temps réel</h2>
<p>Connecté avec son compte, le Ministre (ou son cabinet) voit <b>la situation réelle</b> de tout ce qui se passe : dossiers, paiements, rendez-vous, tableau de bord. Dès qu’une <b>alerte de fraude grave</b> apparaît — pièce déjà utilisée, pièce modifiée, écart signalé à l’accueil… — un <b>message s’affiche sur son interface de contrôle</b> : un bandeau d’alerte, avec le dossier concerné et le motif, et un message qui apparaît aussitôt. Le bandeau reste jusqu’à ce que les alertes soient lues. <b>Une alerte sonore</b> (sirène et vibration) retentit en même temps tant que l’application est ouverte ; au premier lancement, un toucher de l’écran suffit pour l’activer, et le Ministre peut la couper ou la rétablir. Dans les essais, le message apparaît en quelques secondes (la fréquence de mise à jour de l’écran).</p>
${duo(['d_ministre_alerte', 'L’interface du Ministre : le bandeau d’alerte de fraude, en temps réel.'], ['d_tarif', 'Le montant officiel, saisi une seule fois dans les réglages.'])}
<div class="note"><b>Une alerte n’est pas une preuve.</b> Elle signale un cas à examiner par une personne habilitée. Le Ministre est informé ; la Préfecture examine ; la décision reste humaine.</div>
<h2>Le montant officiel du passeport</h2>
<p>Quand l’administration communiquera le <b>montant officiel</b>, la Préfecture le saisit <b>une seule fois</b> dans les réglages (première demande, renouvellement). Il s’applique alors <b>automatiquement à tous les postes</b> : la caisse l’affiche sans pouvoir le modifier, le reçu le porte, et le serveur <b>refuse tout autre montant</b>. Tant qu’il n’est pas saisi, la démonstration accepte un montant fictif. <b>Aucun tarif n’est inventé</b> dans ce dossier.</p>`,

`<h1 style="margin-top:9mm">6. Les situations que le système veut traiter</h1>
<p>Le projet part de situations que l’on rencontre couramment dans les services qui reçoivent du public. Elles sont présentées ici comme des <b>hypothèses de travail, à valider avec la Préfecture</b> par des observations sur le terrain :</p>
<ul><li><b>Des files d’attente désordonnées</b> : on ne sait pas dans quel ordre on sera reçu ni à quelle heure.</li>
<li><b>Une démarche peu lisible</b> pour le citoyen : où en est mon dossier ? que me manque-t-il ?</li>
<li><b>Des dossiers incomplets découverts tard</b>, qui obligent à revenir plusieurs fois.</li>
<li><b>Peu de visibilité d’ensemble</b> pour les responsables : combien de demandes, combien de passeports remis, où cela bloque-t-il ?</li>
<li><b>Des risques de fraude</b> : pièces falsifiées, même personne déposant sous plusieurs identités, intermédiaires, passages « en force » dans la procédure.</li></ul>
<h2>La réponse proposée, en un coup d’œil</h2>
<div class="etapes"><div><i>1</i><b>Dépôt</b>Scan, pièces, signature, accusé WhatsApp</div><div><i>2</i><b>Paiement</b>Scan du QR, contrôles, reçu</div><div><i>3</i><b>Rendez-vous</b>Date donnée après paiement</div><div><i>4</i><b>Salle</b>Numéros, noms et portes à l’écran</div><div><i>5</i><b>Traitement</b>Étapes suivies et datées</div><div><i>6</i><b>Remise</b>Passeport remis, dossier clos</div></div>
${fig('d_accueil', 'L’écran d’accueil : chaque profil voit d’emblée par où commencer.', 1500)}`,

`<h1 class="chap">7. Le parcours, de A à Z</h1>
<h2>Étape 1 — Le dépôt au guichet</h2>
<p>L’agent photographie la pièce d’identité : la <b>zone de lecture automatique</b> (MRZ) est lue et la fiche se remplit toute seule, avec contrôle des chiffres de clé. Il joint les pièces (photo ou fichier), fait signer le demandeur du doigt, puis un <b>accusé</b> avec numéro de reçu et code QR est envoyé sur le téléphone du demandeur. Un dossier incomplet est enregistré « incomplet » : il pourra être terminé plus tard, par l’agent ou par le demandeur lui-même.</p>
${duo(['d_guichet_fiche', 'La fiche remplie à partir de la pièce.'], ['d_guichet_pieces', 'Les pièces à joindre, obligatoires et facultatives.'])}
${duo(['d_guichet_signature', 'Signature au doigt ou au stylet.'], ['d_accuse', 'L’accusé avec code QR, prêt à être envoyé par WhatsApp.'])}`,

`<h2 style="margin-top:0">Autre entrée possible — le pré-enregistrement par le demandeur et l’accueil (front office)</h2>
<p>Les personnes qui ont l’application peuvent <b>préparer leur demande avant de se déplacer</b>. Avec le lien donné par la Préfecture, le demandeur remplit sa fiche sur son téléphone et reçoit un <b>accusé avec code QR</b>. Il se présente ensuite à l’<b>accueil</b> (le « front office ») avec ses pièces originales.</p>
<div class="tel-duo">${fig('t_inscription', 'Le demandeur ouvre le lien', 600)}${fig('t_inscription_champs', 'Il remplit sa fiche', 600)}${fig('t_inscription_recu', 'Il reçoit son accusé et son code QR', 600)}</div>
<p>À l’accueil, l’agent <b>scanne l’accusé</b>, <b>compare la fiche aux originaux</b> (pièce d’identité, visage, pièces à fournir), corrige les petites erreurs de saisie, puis coche les trois vérifications et envoie la personne à la <b>caisse</b>. S’il constate un écart (identité différente, pièce suspecte), il le signale : la Préfecture est alertée et <b>la caisse reste bloquée</b>.</p>
${duo(['d_accueil_liste', 'L’accueil : les pré-enregistrés attendus.'], ['d_accueil_fiche', 'La fiche à comparer avec les originaux, et les trois vérifications.'])}
${duo(['d_caisse_bloquee', 'Sans vérification à l’accueil, la caisse ne peut pas encaisser.'], ['d_accueil_ok', 'Après vérification : le demandeur peut passer à la caisse.'])}
<div class="note"><b>Pourquoi cette étape ?</b> Les informations saisies par le demandeur lui-même ne sont pas fiables tant qu’elles n’ont pas été comparées aux originaux : c’est le contrôle qui empêche de payer, et d’obtenir un rendez-vous, sur une fiche non vérifiée. Le pré-enregistrement <b>ne remplace pas</b> le dépôt au guichet : les deux entrées mènent à la même caisse.</div>`,

`<h2 style="margin-top:0">Étape 2 — Le paiement à la caisse</h2>
<p>Le demandeur présente son accusé. La caisse <b>scanne le code QR</b> (ou saisit le numéro) : la fiche, les pièces, la signature et les alertes s’affichent. L’encaissement est <b>bloqué</b> si une pièce obligatoire manque ou si une alerte grave n’a pas été examinée par la Préfecture. Après le paiement, un reçu est édité avec le <b>montant payé</b>, le <b>rendez-vous d’enrôlement</b> et le <b>numéro d’appel</b>. Le même contenu — <b>montant payé compris</b> — est préparé comme message WhatsApp pour le téléphone du demandeur, et affiché sur son suivi.</p>
${duo(['d_caisse_dossier', 'Le dossier ouvert par la caisse, avec ses contrôles.'], ['d_recu', 'Le reçu : numéro, rendez-vous et message WhatsApp.'])}
<h2>Étape 3 — Le rendez-vous et la salle d’attente</h2>
<p>Le rendez-vous est donné automatiquement au <b>premier jour ouvré où il reste de la place</b>, selon les réglages de la Préfecture (nombre de personnes par jour, jours ouverts, heures). Le jour venu, chaque <b>porte</b> appelle « le suivant » : le <b>numéro, le nom et la porte</b> s’affichent sur les écrans de la salle, annoncés à voix haute. Chaque numéro reste affiché au moins <b>10 secondes</b> ; une personne absente repart en fin de file.</p>`,

`${fig('d_ecran_appel2', 'L’écran de la salle d’attente (démonstration) : l’appel en cours, les portes et les prochains numéros.', 1300, 'p')}
${fig('d_file_apres', 'Le poste des portes : chaque porte appelle, rappelle ou signale un absent.', 1300, 'p')}`,

`<h2 style="margin-top:0">Étape 4 — Le suivi par le demandeur</h2>
<p>Le demandeur ouvre le lien reçu par WhatsApp : <b>sans compte ni mot de passe</b>, il voit son dossier (et seulement le sien), les étapes franchies, son <b>rendez-vous</b> et son numéro d’appel. S’il manque une pièce, il la prend en photo et l’envoie depuis son téléphone.</p>
<div class="tel-duo">${fig('t_accuse', 'Accusé sur le téléphone', 600)}${fig('t_demandeur', 'Suivi du dossier', 600)}${fig('t_demandeur_rdv', 'Rendez-vous et numéro d’appel', 600)}</div>
<h2>Étapes 5 et 6 — Traitement et remise</h2>
<p>Chaque changement d’état (dossier reçu, en traitement, passeport prêt, remis au demandeur) est <b>daté et attribué</b> à un agent. L’historique complet est conservé dans la fiche du dossier.</p>
${fig('d_fiche', 'La fiche d’un dossier : état, historique, pièces et alertes.', 1300, 'p')}`,

`<h1 class="chap">8. Contrôle anti-fraude</h1>
<div class="butband"><small>En lien avec le but de l’application</small><p>Le troisième but est de <b>sécuriser</b> : repérer automatiquement les fraudes et les contournements, et les mettre sous les yeux de la Préfecture.</p></div>
<p>Le système calcule pour chaque dossier un <b>score de risque (0 à 100)</b> à partir de règles claires et explicables :</p>
<table><tr><th style="width:52mm">Signal</th><th>Ce qu’il détecte</th></tr>
<tr><td>Pièce modifiée</td><td>Les chiffres de contrôle de la pièce lue ne correspondent pas.</td></tr>
<tr><td>Doublon de pièce</td><td>Le même numéro de pièce est utilisé dans plusieurs dossiers.</td></tr>
<tr><td>Double identité</td><td>La même personne apparaît sous plusieurs numéros de dossier.</td></tr>
<tr><td>Réseau</td><td>Un même téléphone est associé à plusieurs identités différentes.</td></tr>
<tr><td>Pièce expirée / renouvellement irrégulier</td><td>Pièce périmée présentée, ou renouvellement incohérent avec l’ancien passeport.</td></tr>
<tr><td>Étape sautée</td><td>Un dossier avance sans passer par une étape obligatoire (ex. paiement).</td></tr>
<tr><td>Remise éclair, action de nuit</td><td>Délais anormalement courts, opérations en dehors des heures de service.</td></tr>
<tr><td>Dossier bloqué</td><td>Dossier sans mouvement depuis plus de 25 jours.</td></tr>
<tr><td>Agent à surveiller</td><td>Concentration d’alertes sur les dossiers saisis par un même agent.</td></tr></table>
<div class="note r"><b>Important.</b> Ces signaux sont des <b>alertes à examiner par des personnes</b>, pas des preuves de fraude. La démonstration <b>ne vérifie pas l’authenticité</b> d’un document : cela nécessiterait des liaisons avec les bases officielles, à convenir avec les autorités. Une alerte grave non examinée <b>bloque l’encaissement</b> ; la Préfecture l’examine puis l’autorise ou ouvre une enquête.</div>
${fig('d_fraude', 'Le contrôle anti-fraude : cas classés du plus grave au moins grave (données fictives).', 1300, 'p')}`,

`<h1 class="chap">9. Pilotage pour le Ministère et la Préfecture</h1>
<p>Le <b>tableau de bord</b> montre la situation réelle : demandes enregistrées, dossiers reçus, en traitement, passeports prêts et remis, renouvellements, alertes, dossiers incomplets, délai moyen de remise. Un <b>export Excel</b> fournit les tableaux et les graphiques pour les rapports.</p>
${fig('d_tableau_demo', 'Le tableau de bord (données de démonstration fictives).', 1300, 'p')}
<h2>Mise en place d’un site : l’« espace partagé »</h2>
<p>La Préfecture crée un <b>espace</b> : un code à 8 caractères. Les postes (guichet, caisse, portes, préfecture) et les écrans de salle le rejoignent, et <b>tout se synchronise en direct</b>. Les réglages (nombre de portes de 1 à 12, capacité par jour, jours ouverts, heure de début, lieu) s’appliquent à tous.</p>
${duo(['d_espace', 'Le panneau de l’espace : code, QR, liens des postes et des écrans.'], ['d_reglages', 'Les réglages du site.'])}`,

`<h1 class="chap">10. Simplicité d’utilisation et fluidité</h1>
<p>L’application est pensée pour des agents qui ne sont pas informaticiens et pour des demandeurs qui utilisent surtout leur <b>téléphone</b>.</p>
<ul><li><b>Guide intégré</b> : au premier lancement, l’application demande « Quel est votre rôle ? » et propose une <b>visite guidée</b> d’environ une minute pour chaque profil ; un bouton ❓ Aide donne les questions fréquentes.</li>
<li><b>Téléphone et ordinateur</b> : mêmes fonctions, boutons agrandis pour le doigt, installation possible sur l’écran d’accueil du téléphone.</li>
<li><b>Fluidité mesurée</b> : en simulation d’un téléphone d’entrée de gamme sur réseau 4G, l’application s’ouvre en environ <b>1,5 seconde</b> (1,1 Mo téléchargés) et les changements de page restent entre <b>52 et 60 images par seconde</b> sur un téléphone moyen. Ce sont des mesures de laboratoire ; l’essai sur le matériel réel de la Préfecture reste à faire.</li>
<li><b>Résilience</b> : en cas de coupure du serveur, les postes l’indiquent, restent utilisables et se resynchronisent seuls ; les écrans gardent leur dernier affichage.</li></ul>
<div class="tel-duo">${fig('t_visite', 'Visite guidée', 600)}${fig('t_caisse', 'Caisse sur téléphone', 600)}${fig('t_tableau', 'Tableau de bord sur téléphone', 600)}</div>`,

`<h1 class="chap">11. Sécurité et protection des données personnelles</h1>
<div class="butband"><small>En lien avec le but de l’application</small><p>Un système qui suit des demandes de passeport manipule des <b>données personnelles sensibles</b>. Les protéger fait partie du but : un système sûr, au service du citoyen.</p></div>
<h3>Ce que fait déjà la démonstration pour se protéger</h3>
<div class="note"><b>Aucun système n’est inviolable</b>, et ce document ne le prétend pas. Les mesures ci-dessous rendent le contournement <b>difficile, visible et attribuable</b> ; elles ne dispensent pas d’un audit de sécurité indépendant avant tout usage réel.</div>
<table><tr><th style="width:50mm">Risque</th><th>Protection mise en place (et testée automatiquement)</th></tr>
<tr><td><b>Un agent ou un informaticien « bricole » l’application pour se donner des droits</b></td><td>Les droits sont <b>appliqués par le serveur</b>, pas par l’écran : même en modifiant le navigateur, un agent ne peut ni régler le site, ni créer de comptes, ni encaisser s’il n’en a pas le droit (refus 403, aussitôt noté).</td></tr>
<tr><td><b>Fabriquer un faux paiement, un faux rendez-vous, un faux numéro d’appel</b></td><td>Le paiement, le numéro d’appel, le rendez-vous et l’appel en salle sont <b>créés par le serveur seul</b>. Un poste qui les envoie quand même est ignoré, remis à l’état réel et signalé.</td></tr>
<tr><td><b>Sauter une étape ou faire passer un dossier sans vérification</b></td><td>L’étape ne peut avancer que <b>d’un cran</b>, par les rôles habilités. Un dossier pré-enregistré ne peut pas être encaissé tant que l’accueil ne l’a pas vérifié, et seul l’accueil ou la Préfecture peut poser cette vérification.</td></tr>
<tr><td><b>Effacer ou réécrire l’historique, antidater une action, se faire passer pour un autre</b></td><td>L’historique ne peut qu’être <b>complété</b> : chaque ligne est <b>signée du compte connecté</b> et <b>datée par le serveur</b>.</td></tr>
<tr><td><b>Changer le montant du passeport</b></td><td>Une fois le montant officiel saisi par la Préfecture, <b>le serveur refuse tout autre montant</b> ; la tentative est notée comme grave.</td></tr>
<tr><td><b>Deviner des mots de passe ou des codes de suivi</b></td><td>Mots de passe stockés en <b>empreinte à sens unique</b> ; <b>blocage</b> du compte après 5 essais, de l’appareil après trop d’essais, et des codes de suivi après 20 essais ratés ; messages identiques que le compte existe ou non.</td></tr>
<tr><td><b>Voler une session</b></td><td>Jeton aléatoire non stocké en clair, valable 12 h au plus, <b>fermé à la déconnexion, à la réinitialisation ou après 30 minutes d’inactivité</b>.</td></tr>
<tr><td><b>Injecter du code (texte piégé, base de données, fichiers déguisés)</b></td><td>Textes affichés comme du texte, <b>politique de sécurité du navigateur</b> (aucun script en ligne ni venu d’un autre site), requêtes à la base paramétrées, fichiers contrôlés sur leur <b>contenu réel</b> (JPEG, PNG, PDF), taille limitée.</td></tr>
<tr><td><b>Effacer ses traces</b></td><td>Un <b>journal de sécurité</b> note connexions, refus, modifications de réglages, paiements et tentatives de triche. Chaque ligne contient l’empreinte de la précédente : <b>en modifier ou en supprimer une rompt la chaîne</b>, et le Ministère peut le vérifier d’un bouton.</td></tr>
<tr><td><b>Agir sans que les responsables le sachent</b></td><td>Les événements graves déclenchent un <b>message en temps réel</b> sur l’interface du Ministère et de la Préfecture.</td></tr></table>
${duo(['d_securite', 'Le journal de sécurité, visible de la Préfecture et du Ministère.'], ['d_securite_alerte', 'L’alerte de sécurité en temps réel sur l’écran du Ministre.'])}
<p>Ces protections sont vérifiées par <b>plus de 160 contrôles automatiques côté serveur</b>, dont <b>18 scénarios d’attaque</b> (faux paiements, historique réécrit, étapes sautées, injections, fichiers déguisés, force brute, falsification du journal…), et par des essais dans un navigateur réel.</p>
<h3>Ce que ces mesures n’empêchent pas — à dire franchement</h3>
<ul><li><b>Une personne qui contrôle la base de données ou l’hébergeur</b> pourrait modifier des données, et même recalculer la chaîne du journal. Réponse : hébergement maîtrisé, accès restreints, et <b>copie du journal vers un stockage à écriture unique</b> hors de portée des administrateurs.</li>
<li><b>Un poste infecté ou un mot de passe volé ou prêté</b> : l’application ne peut pas distinguer l’agent légitime de celui qui a son mot de passe. Réponse : <b>double authentification</b>, formation, interdiction de partager les comptes.</li>
<li><b>Un agent habilité qui abuse de ses droits normaux</b> (par exemple, collusion à l’accueil) : les droits limités, la signature des actions, le journal et les alertes le rendent <b>visible</b>, pas impossible.</li>
<li><b>Les attaques de masse sur le réseau</b> (saturation) : relèvent des protections du fournisseur d’hébergement.</li></ul>
<h3>Ce qu’il faudra pour un usage réel</h3>
<table><tr><th style="width:55mm">Sujet</th><th>Exigence proposée</th></tr>
<tr><td>Comptes</td><td>Déjà présents dans la démonstration : comptes individuels, mots de passe robustes, droits par rôle. À ajouter : <b>double authentification</b>, envoi automatique par courriel ou SMS pour le mot de passe oublié, rattachement des comptes à l’identité officielle des agents, <b>minimisation des données visibles par rôle</b>.</td></tr>
<tr><td>Hébergement</td><td>Serveur dédié, <b>hébergement conforme aux exigences de l’État</b> (y compris le lieu d’hébergement), sauvegardes, supervision.</td></tr>
<tr><td>Traçabilité</td><td>Déjà présent : journal chaîné des actions sensibles. À ajouter : journal des <b>consultations</b> de dossiers, copie vers un stockage à écriture unique, conservation selon la loi.</td></tr>
<tr><td>Chiffrement</td><td>Chiffrement des échanges et des données au repos, gestion des clés.</td></tr>
<tr><td>Cadre juridique</td><td>Conformité à la réglementation congolaise sur la protection des données personnelles : finalité, durée de conservation, droits des personnes, responsable du traitement.</td></tr>
<tr><td>Vérification indépendante</td><td><b>Audit de sécurité et test d’intrusion par un tiers indépendant</b>, tests de charge, avant toute mise en service ; puis contrôles réguliers.</td></tr>
<tr><td>Organisation</td><td>Procédure d’arrivée et de départ des agents (création et fermeture de comptes), responsable sécurité désigné, plan de réponse en cas d’incident, sauvegardes testées.</td></tr></table>`,

`<h1 class="chap">12. Ce qui est démontré, ce qui reste à construire</h1>
<table><tr><th style="width:62mm">Démontré aujourd’hui</th><th>À construire / à décider pour un usage réel</th></tr>
<tr><td>Parcours complet du dépôt à la remise, sur téléphone et ordinateur ; pré-enregistrement par le demandeur et accueil</td><td>Journal d’audit infalsifiable, hébergement dédié, double authentification</td></tr>
<tr><td>Comptes du personnel, droits par rôle, mot de passe oublié (via la Préfecture)</td><td>Envoi automatique par courriel ou SMS ; comptes liés à l’identité officielle</td></tr>
<tr><td>Alerte de fraude en temps réel sur l’interface du Ministre</td><td>Définir avec le Ministère qui est alerté, par quel canal (écran, SMS, courriel) et à quelle gravité</td></tr>
<tr><td>Lecture de la zone MRZ d’une pièce (testée sur images de test)</td><td>Essai avec de <b>vraies pièces</b> et les appareils de la Préfecture</td></tr>
<tr><td>Accusé et message de paiement (montant, reçu, rendez-vous, numéro d’appel) préparés pour WhatsApp (envoi par bouton)</td><td>Envoi <b>automatique</b> à chaque paiement : API WhatsApp Business de Meta (modèles de messages approuvés, coût par message) ou SMS</td></tr>
<tr><td>Caisse : contrôles, reçu, numéro d’appel ; montant officiel à saisir une seule fois (montants de la démonstration fictifs)</td><td>Montant officiel à communiquer, liaison avec les moyens de paiement réels</td></tr>
<tr><td>Salle d’attente : portes, écrans, voix, file ordonnée</td><td>Matériel (téléviseurs, tablettes), réseau du site, voix française testée sur place</td></tr>
<tr><td>Alertes anti-fraude par règles explicables</td><td>Liaison avec les bases officielles pour vérifier l’authenticité (accords à obtenir)</td></tr>
<tr><td>Tableau de bord et export Excel</td><td>Indicateurs définis avec le Ministère</td></tr></table>
<div class="note">La <b>capture des empreintes et de la photo</b> reste faite avec le matériel officiel d’enrôlement : l’application organise le rendez-vous, la file et le suivi ; elle ne remplace pas ce matériel.</div>
<h1 class="chap">13. Feuille de route proposée</h1>
<table><tr><th style="width:36mm">Phase</th><th>Contenu</th><th style="width:48mm">Résultat attendu</th></tr>
<tr><td><b>0 · Validation</b></td><td>Ateliers avec la Préfecture : pièces exigées, tarifs, jours et horaires, nombre de portes, rôles des agents.</td><td>Cahier des charges validé</td></tr>
<tr><td><b>1 · Pilote</b></td><td>Un site (Brazzaville), un petit nombre d’agents, données réelles limitées, mesures avant/après.</td><td>Preuve sur le terrain</td></tr>
<tr><td><b>2 · Consolidation</b></td><td>Sécurité, hébergement, WhatsApp/SMS automatiques, formation des agents.</td><td>Version prête à l’exploitation</td></tr>
<tr><td><b>3 · Extension</b></td><td>Autres sites, autres services, rapports nationaux.</td><td>Déploiement progressif</td></tr></table>
<p><b>Indicateurs de réussite à mesurer</b> : temps d’attente moyen, part des dossiers complets dès le premier passage, délai moyen jusqu’à la remise, nombre d’alertes examinées et traitées, satisfaction des demandeurs et des agents. Les calendriers et les coûts seront établis à l’issue de la phase 0.</p>`,

`<h1 style="margin-top:9mm">14. Décisions attendues</h1>
<ol class="pas"><li><b>Valider le but et le périmètre</b> : suivre, ordonner, sécuriser — pour quels sites et quels types de demandes (première demande, renouvellement).</li>
<li><b>Désigner un référent</b> à la Préfecture et un correspondant au Ministère.</li>
<li><b>Fixer les règles locales</b> : liste des pièces, tarifs officiels, jours et horaires, capacité journalière, nombre de portes.</li>
<li><b>Choisir l’hébergement</b> et le cadre de protection des données personnelles.</li>
<li><b>Choisir le canal de notification</b> : WhatsApp Business (compte de la Préfecture) et/ou SMS.</li>
<li><b>Choisir le site pilote</b> et les agents participants.</li>
<li><b>Communiquer le montant officiel</b> du passeport (première demande, renouvellement) : il sera saisi une seule fois et appliqué partout.</li>
<li><b>Choisir le canal du « mot de passe oublié »</b> (courriel et/ou SMS) et le fournisseur d’envoi, en complément de la réinitialisation par la Préfecture.</li>
<li><b>Définir l’alerte du Ministre</b> : qui est alerté, par quel canal (écran, SMS, courriel) et à partir de quelle gravité.</li>
<li><b>Décider du recueil de la signature</b> pour un dossier pré-enregistré (à l’accueil, sur écran ou sur papier).</li>
<li><b>Valider le nom de l’application</b> et vérifier sa disponibilité (marque, nom de domaine).</li></ol>
<h2>Annexe — Glossaire</h2>
<table><tr><th style="width:42mm">Terme</th><th>Signification</th></tr>
<tr><td>Accusé</td><td>Document remis au demandeur après l’enregistrement, avec son numéro de reçu et un code QR.</td></tr>
<tr><td>Enrôlement</td><td>Prise des empreintes et de la photo avec le matériel officiel, au rendez-vous donné.</td></tr>
<tr><td>MRZ</td><td>Les lignes de caractères lisibles par machine, en bas d’une pièce d’identité ou d’un passeport.</td></tr>
<tr><td>Espace</td><td>Ensemble partagé (dossiers, réglages) auquel les postes et les écrans d’un site se connectent avec un code.</td></tr>
<tr><td>N° d’appel</td><td>Numéro donné au paiement pour passer dans la salle d’attente le jour du rendez-vous.</td></tr>
<tr><td>Porte</td><td>Poste de réception numéroté (Porte 1, Porte 2…) qui appelle les personnes une par une.</td></tr>
<tr><td>Alerte</td><td>Signal automatique demandant l’examen d’un dossier par une personne.</td></tr>
<tr><td>Front office (accueil)</td><td>Poste qui reçoit les demandeurs, scanne l’accusé et compare la fiche aux pièces originales.</td></tr>
<tr><td>Back-office de réception</td><td>Espace de gestion de l’accueil : voir les dossiers, contrôler les pièces et le paiement, valider le paiement.</td></tr>
<tr><td>Pré-enregistrement</td><td>Fiche remplie par le demandeur lui-même sur son téléphone, validée ensuite à l’accueil.</td></tr>
<tr><td>Espace sécurisé</td><td>Espace où chaque agent se connecte avec son identifiant et son mot de passe, avec des droits selon son rôle.</td></tr>
<tr><td>Code de secours</td><td>Code remis une seule fois à la Préfecture pour retrouver l’accès si elle oublie son mot de passe.</td></tr>
<tr><td>Montant officiel</td><td>Montant fixé par l’administration, saisi une seule fois et appliqué à tous les postes.</td></tr></table>
${signature()}`,

`<section class="fin"><img src="file://${RACINE}/passeport-demo/img/star-entreprise.webp" alt="STAR ENTREPRISE"><h2>STAR ENTREPRISE</h2><p>Brazzaville, République du Congo · www.starentreprise.com</p><p><b>Passeport Sûr</b> — suivre chaque demande de passeport de A à Z, ordonner la file d’attente, détecter les fraudes.</p><p style="margin-top:10mm;font-size:9pt">Tous droits réservés. Démonstration avec données entièrement fictives.</p></section>`
].join('\n');
rendre({ html, titre: 'Passeport Sûr — Dossier de présentation', sortie: path.join(RACINE, 'docs', 'passeport-sur', 'Passeport-Sur-Dossier-de-presentation.pdf') }).catch(e => { console.log('CRASH', e.message); process.exit(1); });
