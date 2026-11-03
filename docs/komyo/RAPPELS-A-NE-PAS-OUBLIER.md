# Rappels à ne pas oublier (KOMYO)

Liste tenue par Claude et Carry. Claude relit ce fichier au début d'une session et rappelle à Carry ce qui devient d'actualité.

## 0. Consigne permanente de Carry (3 novembre 2026)
- **Ne rien déployer ni publier sans son accord explicite** : crédits Netlify à 493 (798,2 le 1er novembre). Un déploiement coûte environ 15 crédits ; le reste de la baisse vient du calcul (« Compute », surtout le passage des vidéos par la fonction). Regrouper les modifications en UN seul déploiement, au feu vert de Carry.
- Lot en attente (rien n'est en ligne) : vitrine Carrousel doré, « S'abonner », écran d'attente des vidéos (fil + PIOUPIOU), logo joint aux e-mails, précision Keydou/Sarah sur le déblocage automatique.

## 1. Vidéo professionnelle (Cloudflare Stream ou Mux) — quand KOMYO aura beaucoup d'utilisateurs
- **Pourquoi** : aujourd'hui les vidéos passent par une fonction Netlify. Mesuré le 2 novembre 2026 : le fichier vidéo met 1,7 s en médiane, 5 s pour 1 vidéo sur 10, jusqu'à 17 s au pire. Une affiche (première image) masque l'attente, mais le démarrage n'est pas instantané comme sur TikTok.
- **Priorité relevée (3 novembre 2026)** : des parents trouvent les épisodes PIOUPIOU lents à démarrer, même sur le wifi d'un bureau. À faire EN PREMIER pour PIOUPIOU seulement (une quarantaine d'épisodes de 1 à 2 minutes) : héberger les épisodes sur un service vidéo (Cloudflare Stream ou Mux) avec liens signés pour les abonnés. Coût estimé très faible à ce volume (à confirmer à l'inscription : Cloudflare Stream facture environ 5 $ pour 1 000 minutes stockées et 1 $ pour 1 000 minutes regardées). Carry doit créer le compte ; Claude branche le reste. Le fil général passe ensuite quand KOMYO grandit.
- **Solution** : un service spécialisé (Cloudflare Stream, Mux) : vidéos découpées et servies depuis un réseau mondial, miniatures automatiques, démarrage immédiat. Coût mensuel à prévoir (au volume vu, quelques dizaines de dollars par mois au début).
- **Quand en reparler** (le premier des signes) :
  - environ 300 membres actifs, ou
  - la ligne « Compute » de Netlify devient le premier poste de dépense à cause de `api-starvibe-video-file`, ou
  - des membres se plaignent de vidéos lentes.
- **À faire alors** : Claude chiffre le coût réel, propose le service, migre les vidéos existantes, garde les affiches.

## 2. ÉCLAT (direct) — après le lancement de KOMYO
- Aujourd'hui : page « Bientôt en direct » seulement.
- À construire : caméra en direct, commentaires qui défilent, cœurs qui s'envolent, blocage d'un spectateur dans le direct. Demande un service de diffusion en direct (coût mensuel). Claude prépare un plan avec le service et son prix, Carry décide.

## 2 bis. KOMYO Fly — livraison de repas et petits articles (idée de Carry, 2 novembre 2026) — pour plus tard
- **Idée** : commander dans KOMYO, position GPS du téléphone, prix unique livraison comprise, paiement Mobile Money à l'arrivée, appel de validation dans l'app (agent IA), livraison par drone qui revient à la base STAR ENTREPRISE.
- **Avis de Claude** : faisable par étapes. Logiciel (commande, position, prix, paiement reconnu par SMS, appel, carte de suivi) : simple. Drone : difficile (autorisation de l'aviation civile du Congo, vol hors vue interdit en général, coût du drone et des batteries, météo, sécurité, pilote qualifié obligatoire). Le drone ne « détecte » pas les abonnés : il suit les coordonnées GPS du téléphone.
- **Plan conseillé** : (1) KOMYO Fly SANS drone, avec livreur à moto, pour tester la demande et construire le logiciel ; (2) test avec un petit drone, trajet court et en vue directe, autorisation obtenue, restaurant partenaire ; (3) extension ou partenariat avec une société de drones déjà active en Afrique (ex. Zipline).
- **Premier pas quand Carry dit « on reprend KOMYO Fly »** : vérifier la réglementation locale (aviation civile du Congo) et chiffrer le coût réel.

## 2 ter. Vitrine des auteurs — décision de Carry du 3 novembre 2026
- **Choisi : « Carrousel doré »** pour la vitrine de chaque auteur (vidéos en tambour 3D, celle de devant éclairée en or, aperçu au toucher, flèches). Maquette de référence : page Artifact « Vitrine KOMYO » (https://claude.ai/artifact/3UsCinfoeeSnj676b9pAt2).
- **« Constellation » gardée pour plus tard**, pour une page spéciale (par exemple les vidéos les plus vues de KOMYO), à améliorer. « Pellicule dorée » non retenue.
- À construire : page « Ma vitrine » (depuis Mon espace), ouverte aussi en touchant le nom d'un auteur ; 8 vidéos à la fois + « Voir toutes » ; exclure les vidéos d'enfants ; mêmes règles d'âge que Myo ; vraies vidéos, vraies vues et vrais cœurs.

## 2 quater. KOMYO Mboté (bonus, médailles) — décisions de Carry du 3 novembre 2026
- **Médailles** : Or 30 jours, Argent 7 jours, Bronze 3 jours (SVG légers déjà faits : `starvibe/assets/img/medailles/`, fabriqués par `tools/fabrique-medailles.py`). **Versions définitives à refaire avec Higgsfield** quand les crédits seront rechargés, en s'inspirant des médailles de référence envoyées par Carry (rosette plissée, ruban, anneau d'étoiles) et en gardant 30 / 7 / 3 jours. Images à garder LÉGÈRES (WebP/SVG, quelques Ko).
- **Gagner une médaille** : nombre d'amis invités ET connectés sur KOMYO. Seuils proposés : Bronze 10 amis, Argent 50, Or 200 (plafond évoqué par Carry : 200 ou plus). À confirmer par Carry.
- **Récompense** : PAS d'activation automatique. À l'atteinte d'une médaille, un message de l'équipe est envoyé d'abord ; l'avantage (jours de Pack ou autre) se choisit ensemble avant activation.
- **Compteurs équipe** : nombre exact de nouveaux membres (jour/semaine/mois), nombre venus par parrainage, classement des parrains (qui a le plus). À construire dans l'espace équipe.
- **Bandeau Bonus** et **post-it BONUS** : seulement quand les bonus sont réellement actifs (pas de fausse promesse). Jamais dans PIOUPIOU.
- **Boutons de verre** (maquette 5) : pile de cercles en verre avec bande d'information, ouverture de bas en haut, fermeture de haut en bas ; pour les réseaux de la carte de visite (WhatsApp, Facebook, Instagram, YouTube…), 10 ou plus possibles. Salon : de 4 à 12 personnes dans la maquette.
- Maquettes de référence : Artifact « KOMYO Mboté et Salon » (https://claude.ai/artifact/TcEyWsCvZ1LnvSG9LRK3NR).

## 2 quinquies. Annonce aux gagnants et anniversaire Keydou — idées de Carry du 3 novembre 2026
- **Écran « gagnants » dans l'espace équipe** : classement en temps réel, envoi à 1 personne, aux 5 ou aux 15 premiers (ou plus), messages déjà écrits à choisir, « Témoin » (carte de médaille) reçu par le gagnant dans sa messagerie, partageable. Même écran que la maquette 4 et 6.
- **Anniversaire Keydou — 500 FCFA, une seule fois par personne et par anniversaire** : (1) message gratuit automatique de Keydou à chaque membre le jour de son anniversaire (à valider : date de naissance déjà demandée à l'inscription) ; (2) un membre peut offrir un voeu personnalisé à un ami : rappel « C'est l'anniversaire de Michel demain », bouton « Activer Keydou », page de paiement directe (nom du destinataire, 500 FCFA, numéro à copier 242 06 656 50 50, dépôt MTN/Airtel, validation par le PIN dans le téléphone, jamais dans KOMYO), retour automatique à la page d'origine quand le dépôt est reconnu par SMS (même mécanique que 1 500 FCFA), puis enveloppe flottante chez le destinataire (comme la bulle de messages) qui s'ouvre sur la carte de Keydou, signée « De la part de [expéditeur] ». À construire : table des voeux, type « voeu » dans la reconnaissance des SMS (montant 500 + numéro payeur), rappel 1 jour avant, reçu de 500 FCFA.
- **Décision de Carry (3 novembre 2026) : une seule voix de Keydou partout** (accueil, aide, anniversaire, assistant), pour que les gens s'y habituent. Voix actuelle de Keydou : « Chloé » (fichiers dans `starvibe/assets/audio/keydou/`, essais dans `starvibe/essais-voix.html`). À vérifier avant de générer : le voice_id exact de la voix utilisée pour ces fichiers (le registre note « Chloé » = I6eWD84OrEngt4S4Antm pour PIOUPIOU ; confirmer que c'est la même, sinon retrouver l'identifiant). Voeu d'anniversaire = cette voix + musique douce + prénom du destinataire, généré au paiement, audio de 10 à 15 s, lu seulement au toucher de l'enveloppe.
- **Salon (appel de groupe)** : chaque participant a son micro et peut le couper ; l'organisateur peut couper un participant. Nécessite un service vidéo spécialisé (coût à chiffrer).
- **Boutons de verre** : effet verre dépoli + reflet qui suit le doigt, déjà en maquette 5.

## 2 sexies. Idées de Carry du 3 novembre 2026 : clé API STAR ENTREPRISE et assistant Keydou par abonnement
- **Clé API STAR ENTREPRISE (B2B, plus tard)** : faisable. Usages proposés : (1) reconnaissance automatique des paiements Mobile Money par SMS pour des commerçants (valeur unique au Congo), (2) recherche dans l'annuaire Keydou (19 services), (3) Keydou IA pour le WhatsApp d'une entreprise, (4) annonces/boutiques KOMYO. Prix : 19 $/mois ≈ 11 000 FCFA est un prix « entreprise » ; prévoir un palier local plus bas. Prérequis : clés hachées, quotas, journal d'usage, conditions d'utilisation, protection des données. Commencer par 3 à 5 clients pilotes.
- **Keydou Assistant (abonnement mensuel pour particuliers)** : assistant quotidien qui répond avec des informations vérifiées (annuaire, aide KOMYO) et sait dire « je ne sais pas » ; carnet d'idées (l'utilisateur envoie ses idées, Keydou les range, regroupe et améliore). Limite mensuelle de messages pour maîtriser le coût de l'IA. Paiement mensuel : dépôt Mobile Money reconnu automatiquement + rappel ; renouvellement vraiment automatique seulement avec la carte bancaire (quand la passerelle sera là). Prix à fixer après chiffrage du coût IA par utilisateur. Marque : faire protéger « Keydou » et « KOMYO » (OAPI).
- **Ordre conseillé** : Keydou Assistant d'abord (revenu direct, réutilise l'existant), clé API ensuite.

## 3. Autres points ouverts
- Airtel Money : nom de l'expéditeur + exemple de SMS, puis deuxième règle MacroDroid.
- Côte d'Ivoire (proposition de la belle-sœur de Carry, 2 novembre 2026) : recevoir les paiements là-bas avec une SIM ivoirienne. **Ne jamais partager ni recevoir de code PIN Mobile Money** : inutile pour KOMYO. Méthode : un téléphone Android en Côte d'Ivoire avec la SIM + MacroDroid qui transfère les SMS de dépôt au site (comme pour le Congo), avec un code pays. Il faudra : nom de l'expéditeur et un exemple de SMS de chaque opérateur (ex. Orange Money, MTN, Moov, Wave), numéro de dépôt par pays, vue par pays dans l'espace équipe. Côté légal : compte au nom d'une personne identifiée ou d'une société, idéalement un compte « marchand / business » ; voir un comptable pour le transfert d'argent vers le Congo.
- Paiement par carte (Visa / Mastercard) : réponse du service de paiement.
- Netlify : recharge automatique avec un plafond avant le lancement public.
- Bissa POP (pub animée) : en pause ; reprendre quand Higgsfield est rechargé (voix et destination à choisir).
- Commentaires des personnes bloquées : à cacher aussi sur les vidéos.
