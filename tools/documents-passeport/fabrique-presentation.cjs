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
<tr><td><b>Le demandeur</b></td><td>Un accusé sur son téléphone, un rendez-vous précis, le suivi de son dossier, la possibilité d’envoyer une pièce manquante sans revenir au guichet.</td></tr>
<tr><td><b>L’agent de guichet</b></td><td>Une fiche qui se remplit à partir de la pièce scannée, la liste des pièces à fournir, la signature sur l’écran.</td></tr>
<tr><td><b>La caisse</b></td><td>L’ouverture du dossier par scan du code QR, des contrôles avant l’encaissement, un reçu avec le rendez-vous.</td></tr>
<tr><td><b>Les agents de porte</b></td><td>Une file claire, des boutons « appeler le suivant », « rappeler », « absent ».</td></tr>
<tr><td><b>La Préfecture</b></td><td>Le pilotage du site (portes, capacité, jours ouverts), les alertes de fraude à examiner, tous les dossiers.</td></tr>
<tr><td><b>Le Ministère</b></td><td>Une vue d’ensemble en temps réel : qui a demandé, payé, été reçu, reçu son passeport ; l’export Excel.</td></tr></table>
<div class="note"><b>Ce que ce document est — et n’est pas.</b> C’est la présentation d’une <b>proposition de projet</b> avec une <b>démonstration fonctionnelle</b> dont toutes les données sont fictives. Ce n’est pas un système en service. L’application <b>ne prétend pas vérifier l’authenticité</b> des documents : elle signale des incohérences pour qu’un agent les examine. Les tarifs et la liste des pièces montrés sont des <b>exemples à confirmer avec la Préfecture</b>.</div>`,

`<h1 style="margin-top:9mm">2. Les situations que le système veut traiter</h1>
<p>Le projet part de situations que l’on rencontre couramment dans les services qui reçoivent du public. Elles sont présentées ici comme des <b>hypothèses de travail, à valider avec la Préfecture</b> par des observations sur le terrain :</p>
<ul><li><b>Des files d’attente désordonnées</b> : on ne sait pas dans quel ordre on sera reçu ni à quelle heure.</li>
<li><b>Une démarche peu lisible</b> pour le citoyen : où en est mon dossier ? que me manque-t-il ?</li>
<li><b>Des dossiers incomplets découverts tard</b>, qui obligent à revenir plusieurs fois.</li>
<li><b>Peu de visibilité d’ensemble</b> pour les responsables : combien de demandes, combien de passeports remis, où cela bloque-t-il ?</li>
<li><b>Des risques de fraude</b> : pièces falsifiées, même personne déposant sous plusieurs identités, intermédiaires, passages « en force » dans la procédure.</li></ul>
<h2>La réponse proposée, en un coup d’œil</h2>
<div class="etapes"><div><i>1</i><b>Dépôt</b>Scan, pièces, signature, accusé WhatsApp</div><div><i>2</i><b>Paiement</b>Scan du QR, contrôles, reçu</div><div><i>3</i><b>Rendez-vous</b>Date donnée après paiement</div><div><i>4</i><b>Salle</b>Numéros, noms et portes à l’écran</div><div><i>5</i><b>Traitement</b>Étapes suivies et datées</div><div><i>6</i><b>Remise</b>Passeport remis, dossier clos</div></div>
${fig('d_accueil', 'L’écran d’accueil : chaque profil voit d’emblée par où commencer.', 1500)}`,

`<h1 class="chap">3. Le parcours, de A à Z</h1>
<h2>Étape 1 — Le dépôt au guichet</h2>
<p>L’agent photographie la pièce d’identité : la <b>zone de lecture automatique</b> (MRZ) est lue et la fiche se remplit toute seule, avec contrôle des chiffres de clé. Il joint les pièces (photo ou fichier), fait signer le demandeur du doigt, puis un <b>accusé</b> avec numéro de reçu et code QR est envoyé sur le téléphone du demandeur. Un dossier incomplet est enregistré « incomplet » : il pourra être terminé plus tard, par l’agent ou par le demandeur lui-même.</p>
${duo(['d_guichet_fiche', 'La fiche remplie à partir de la pièce.'], ['d_guichet_pieces', 'Les pièces à joindre, obligatoires et facultatives.'])}
${duo(['d_guichet_signature', 'Signature au doigt ou au stylet.'], ['d_accuse', 'L’accusé avec code QR, prêt à être envoyé par WhatsApp.'])}`,

`<h2 style="margin-top:0">Étape 2 — Le paiement à la caisse</h2>
<p>Le demandeur présente son accusé. La caisse <b>scanne le code QR</b> (ou saisit le numéro) : la fiche, les pièces, la signature et les alertes s’affichent. L’encaissement est <b>bloqué</b> si une pièce obligatoire manque ou si une alerte grave n’a pas été examinée par la Préfecture. Après le paiement, un reçu est édité avec le <b>rendez-vous d’enrôlement</b> et le <b>numéro d’appel</b>.</p>
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

`<h1 class="chap">4. Contrôle anti-fraude</h1>
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

`<h1 class="chap">5. Pilotage pour le Ministère et la Préfecture</h1>
<p>Le <b>tableau de bord</b> montre la situation réelle : demandes enregistrées, dossiers reçus, en traitement, passeports prêts et remis, renouvellements, alertes, dossiers incomplets, délai moyen de remise. Un <b>export Excel</b> fournit les tableaux et les graphiques pour les rapports.</p>
${fig('d_tableau_demo', 'Le tableau de bord (données de démonstration fictives).', 1300, 'p')}
<h2>Mise en place d’un site : l’« espace partagé »</h2>
<p>La Préfecture crée un <b>espace</b> : un code à 8 caractères. Les postes (guichet, caisse, portes, préfecture) et les écrans de salle le rejoignent, et <b>tout se synchronise en direct</b>. Les réglages (nombre de portes de 1 à 12, capacité par jour, jours ouverts, heure de début, lieu) s’appliquent à tous.</p>
${duo(['d_espace', 'Le panneau de l’espace : code, QR, liens des postes et des écrans.'], ['d_reglages', 'Les réglages du site.'])}`,

`<h1 class="chap">6. Simplicité d’utilisation et fluidité</h1>
<p>L’application est pensée pour des agents qui ne sont pas informaticiens et pour des demandeurs qui utilisent surtout leur <b>téléphone</b>.</p>
<ul><li><b>Guide intégré</b> : au premier lancement, l’application demande « Quel est votre rôle ? » et propose une <b>visite guidée</b> d’environ une minute pour chaque profil ; un bouton ❓ Aide donne les questions fréquentes.</li>
<li><b>Téléphone et ordinateur</b> : mêmes fonctions, boutons agrandis pour le doigt, installation possible sur l’écran d’accueil du téléphone.</li>
<li><b>Fluidité mesurée</b> : en simulation d’un téléphone d’entrée de gamme sur réseau 4G, l’application s’ouvre en environ <b>1,5 seconde</b> (1,1 Mo téléchargés) et les changements de page restent entre <b>52 et 60 images par seconde</b> sur un téléphone moyen. Ce sont des mesures de laboratoire ; l’essai sur le matériel réel de la Préfecture reste à faire.</li>
<li><b>Résilience</b> : en cas de coupure du serveur, les postes l’indiquent, restent utilisables et se resynchronisent seuls ; les écrans gardent leur dernier affichage.</li></ul>
<div class="tel-duo">${fig('t_visite', 'Visite guidée', 600)}${fig('t_caisse', 'Caisse sur téléphone', 600)}${fig('t_tableau', 'Tableau de bord sur téléphone', 600)}</div>`,

`<h1 class="chap">7. Sécurité et protection des données personnelles</h1>
<div class="butband"><small>En lien avec le but de l’application</small><p>Un système qui suit des demandes de passeport manipule des <b>données personnelles sensibles</b>. Les protéger fait partie du but : un système sûr, au service du citoyen.</p></div>
<h3>Ce que fait déjà la démonstration</h3>
<ul><li>Toutes les données sont <b>fictives</b>.</li><li>Un <b>code d’espace</b> donne accès aux postes ; le demandeur n’accède qu’à <b>son dossier</b>, avec son numéro et un <b>code de contrôle</b> propre.</li><li>La version « demandeur » d’un dossier est <b>réduite au nécessaire</b> (pas de numéro de pièce, pas de date de naissance).</li><li>Les textes saisis sont neutralisés (aucune injection de code), les écritures simultanées sont contrôlées, la capacité et les numéros d’appel ne peuvent pas être dépassés ni dupliqués.</li><li>Un bouton <b>« Effacer définitivement l’espace »</b> supprime les dossiers et les pièces du serveur.</li></ul>
<h3>Ce qu’il faudra pour un usage réel</h3>
<table><tr><th style="width:55mm">Sujet</th><th>Exigence proposée</th></tr>
<tr><td>Comptes</td><td>Comptes <b>nominatifs</b> pour chaque agent, mots de passe robustes, double authentification, droits par profil.</td></tr>
<tr><td>Hébergement</td><td>Serveur dédié, <b>hébergement conforme aux exigences de l’État</b> (y compris le lieu d’hébergement), sauvegardes, supervision.</td></tr>
<tr><td>Traçabilité</td><td>Journal d’audit <b>infalsifiable</b> de toutes les consultations et modifications.</td></tr>
<tr><td>Chiffrement</td><td>Chiffrement des échanges et des données au repos, gestion des clés.</td></tr>
<tr><td>Cadre juridique</td><td>Conformité à la réglementation congolaise sur la protection des données personnelles : finalité, durée de conservation, droits des personnes, responsable du traitement.</td></tr>
<tr><td>Vérification indépendante</td><td>Audit de sécurité et tests de charge avant toute mise en service.</td></tr></table>`,

`<h1 class="chap">8. Ce qui est démontré, ce qui reste à construire</h1>
<table><tr><th style="width:62mm">Démontré aujourd’hui</th><th>À construire / à décider pour un usage réel</th></tr>
<tr><td>Parcours complet du dépôt à la remise, sur téléphone et ordinateur</td><td>Comptes nominatifs, journal d’audit, hébergement dédié</td></tr>
<tr><td>Lecture de la zone MRZ d’une pièce (testée sur images de test)</td><td>Essai avec de <b>vraies pièces</b> et les appareils de la Préfecture</td></tr>
<tr><td>Accusé et message de rendez-vous préparés pour WhatsApp (envoi par bouton)</td><td>Envoi <b>automatique</b> : API WhatsApp Business de Meta (modèles de messages approuvés, coût par message) ou SMS</td></tr>
<tr><td>Caisse : contrôles, reçu, numéro d’appel (montants fictifs)</td><td>Tarifs officiels, liaison avec les moyens de paiement réels</td></tr>
<tr><td>Salle d’attente : portes, écrans, voix, file ordonnée</td><td>Matériel (téléviseurs, tablettes), réseau du site, voix française testée sur place</td></tr>
<tr><td>Alertes anti-fraude par règles explicables</td><td>Liaison avec les bases officielles pour vérifier l’authenticité (accords à obtenir)</td></tr>
<tr><td>Tableau de bord et export Excel</td><td>Indicateurs définis avec le Ministère</td></tr></table>
<div class="note">La <b>capture des empreintes et de la photo</b> reste faite avec le matériel officiel d’enrôlement : l’application organise le rendez-vous, la file et le suivi ; elle ne remplace pas ce matériel.</div>
<h1 class="chap">9. Feuille de route proposée</h1>
<table><tr><th style="width:36mm">Phase</th><th>Contenu</th><th style="width:48mm">Résultat attendu</th></tr>
<tr><td><b>0 · Validation</b></td><td>Ateliers avec la Préfecture : pièces exigées, tarifs, jours et horaires, nombre de portes, rôles des agents.</td><td>Cahier des charges validé</td></tr>
<tr><td><b>1 · Pilote</b></td><td>Un site (Brazzaville), un petit nombre d’agents, données réelles limitées, mesures avant/après.</td><td>Preuve sur le terrain</td></tr>
<tr><td><b>2 · Consolidation</b></td><td>Sécurité, hébergement, WhatsApp/SMS automatiques, formation des agents.</td><td>Version prête à l’exploitation</td></tr>
<tr><td><b>3 · Extension</b></td><td>Autres sites, autres services, rapports nationaux.</td><td>Déploiement progressif</td></tr></table>
<p><b>Indicateurs de réussite à mesurer</b> : temps d’attente moyen, part des dossiers complets dès le premier passage, délai moyen jusqu’à la remise, nombre d’alertes examinées et traitées, satisfaction des demandeurs et des agents. Les calendriers et les coûts seront établis à l’issue de la phase 0.</p>`,

`<h1 style="margin-top:9mm">10. Décisions attendues</h1>
<ol class="pas"><li><b>Valider le but et le périmètre</b> : suivre, ordonner, sécuriser — pour quels sites et quels types de demandes (première demande, renouvellement).</li>
<li><b>Désigner un référent</b> à la Préfecture et un correspondant au Ministère.</li>
<li><b>Fixer les règles locales</b> : liste des pièces, tarifs officiels, jours et horaires, capacité journalière, nombre de portes.</li>
<li><b>Choisir l’hébergement</b> et le cadre de protection des données personnelles.</li>
<li><b>Choisir le canal de notification</b> : WhatsApp Business (compte de la Préfecture) et/ou SMS.</li>
<li><b>Choisir le site pilote</b> et les agents participants.</li></ol>
<h2>Annexe — Glossaire</h2>
<table><tr><th style="width:42mm">Terme</th><th>Signification</th></tr>
<tr><td>Accusé</td><td>Document remis au demandeur après l’enregistrement, avec son numéro de reçu et un code QR.</td></tr>
<tr><td>Enrôlement</td><td>Prise des empreintes et de la photo avec le matériel officiel, au rendez-vous donné.</td></tr>
<tr><td>MRZ</td><td>Les lignes de caractères lisibles par machine, en bas d’une pièce d’identité ou d’un passeport.</td></tr>
<tr><td>Espace</td><td>Ensemble partagé (dossiers, réglages) auquel les postes et les écrans d’un site se connectent avec un code.</td></tr>
<tr><td>N° d’appel</td><td>Numéro donné au paiement pour passer dans la salle d’attente le jour du rendez-vous.</td></tr>
<tr><td>Porte</td><td>Poste de réception numéroté (Porte 1, Porte 2…) qui appelle les personnes une par une.</td></tr>
<tr><td>Alerte</td><td>Signal automatique demandant l’examen d’un dossier par une personne.</td></tr></table>
${signature()}`,

`<section class="fin"><img src="file://${RACINE}/passeport-demo/img/star-entreprise.webp" alt="STAR ENTREPRISE"><h2>STAR ENTREPRISE</h2><p>Brazzaville, République du Congo · www.starentreprise.com</p><p><b>Passeport Sûr</b> — suivre chaque demande de passeport de A à Z, ordonner la file d’attente, détecter les fraudes.</p><p style="margin-top:10mm;font-size:9pt">Tous droits réservés. Démonstration avec données entièrement fictives.</p></section>`
].join('\n');
rendre({ html, titre: 'Passeport Sûr — Dossier de présentation', sortie: path.join(RACINE, 'docs', 'passeport-sur', 'Passeport-Sur-Dossier-de-presentation.pdf') }).catch(e => { console.log('CRASH', e.message); process.exit(1); });
