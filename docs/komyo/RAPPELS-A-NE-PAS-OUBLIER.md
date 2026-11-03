# Rappels à ne pas oublier (KOMYO)

Liste tenue par Claude et Carry. Claude relit ce fichier au début d'une session et rappelle à Carry ce qui devient d'actualité.

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

## 3. Autres points ouverts
- Airtel Money : nom de l'expéditeur + exemple de SMS, puis deuxième règle MacroDroid.
- Côte d'Ivoire (proposition de la belle-sœur de Carry, 2 novembre 2026) : recevoir les paiements là-bas avec une SIM ivoirienne. **Ne jamais partager ni recevoir de code PIN Mobile Money** : inutile pour KOMYO. Méthode : un téléphone Android en Côte d'Ivoire avec la SIM + MacroDroid qui transfère les SMS de dépôt au site (comme pour le Congo), avec un code pays. Il faudra : nom de l'expéditeur et un exemple de SMS de chaque opérateur (ex. Orange Money, MTN, Moov, Wave), numéro de dépôt par pays, vue par pays dans l'espace équipe. Côté légal : compte au nom d'une personne identifiée ou d'une société, idéalement un compte « marchand / business » ; voir un comptable pour le transfert d'argent vers le Congo.
- Paiement par carte (Visa / Mastercard) : réponse du service de paiement.
- Netlify : recharge automatique avec un plafond avant le lancement public.
- Bissa POP (pub animée) : en pause ; reprendre quand Higgsfield est rechargé (voix et destination à choisir).
- Commentaires des personnes bloquées : à cacher aussi sur les vidéos.
