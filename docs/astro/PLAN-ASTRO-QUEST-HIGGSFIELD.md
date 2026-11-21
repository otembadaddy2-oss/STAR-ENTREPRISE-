# ASTRO QUEST — passage au réalisme avec Higgsfield (PLAN, rien n'est généré)

Décision de Carry (21/11/2026) : « Tu vas les améliorer avec Higgsfield, ce serait vraiment plus réaliste et meilleur ? Si oui, garde-le, on le fera plus tard. »
Statut : **mis de côté pour plus tard**. Aucun crédit dépensé. Le jeu reste caché (`/jeu-astro/*` renvoie 404).

## Point de départ (déjà fait, 21/11/2026)
Habillage « premium » dessiné par calcul : vaisseau, 4 ennemis, gardiens holographiques, planètes sphériques éclairées, nébuleuses, polices Inter Display / JetBrains Mono. Fichiers : `jeu-astro/premium.js`, `jeu-astro/index.html`, `jeu-astro/game.js`. Aperçu envoyé à Carry.

## Ce que Higgsfield peut apporter (ordre de valeur)
1. **8 gardiens réalistes** (un par planète) : personnages de science-fiction avec une identité propre. Plus grand gain visuel.
2. **4 ennemis** réalistes (drone, chasseur, sentinelle, mine) + **vaisseau du joueur**.
3. **Planètes** : disques photoréalistes (Mercure à Pluton) ; textures « carte à plat » à tester (risque de raccord visible).
4. **Fonds** : nébuleuses de haute qualité (4 à 8 variantes).

## Coûts (prix relevés : nano_banana_2_1, 1k, ≈ 1,5 crédit l'image ; autres modèles ≈ 2 crédits)
| Lot | Images | Crédits (1 essai) | Avec retouches (x2) |
|---|---|---|---|
| Gardiens (8) | 8 | ≈ 12 | ≈ 24 |
| Ennemis (4) + vaisseau (1) | 5 | ≈ 8 | ≈ 16 |
| Planètes (9) | 9 | ≈ 14 | ≈ 28 |
| Fonds (6) | 6 | ≈ 9 | ≈ 18 |
| Détourage (fond transparent) | ≈ 13 | à vérifier avant | à vérifier |
Total indicatif : **≈ 45 crédits, jusqu'à ≈ 90 avec les retouches**. Solde au 20/11 : ≈ 1 crédit (plan « plus »). **Il faut le forfait/les crédits avant de commencer.** Toujours annoncer le prix exact à Carry et attendre son accord.

## Méthode proposée
1. Un **essai unique** (1 gardien, 1,5 crédit) pour valider le style avec Carry : sheet de référence → mêmes personnages cohérents (comme pour Lyra, voir docs/arena).
2. Style commun à fixer : science-fiction sobre, éclairage de cinéma, tout public, aucun contenu sexualisé, pas de logo ni de texte.
3. Génération par lots (batch), vue de face, fond uni pour détourage ; format 3:4 pour les gardiens.
4. Détourage, puis export **WebP** léger (cible : 60 à 150 Ko par image, jeu complet < 3 Mo, toujours jouable hors connexion).
5. Intégration : image du gardien animée par le code (flottement, lueur, balayage), vaisseau et ennemis en sprites avec lueurs ajoutées par le code ; le code actuel reste en **secours** si une image manque.
6. Tests (`tools/test-jeu-astro.cjs`) + captures, puis aperçu à Carry avant tout déploiement.

## Précautions honnêtes
- Cohérence : 8 gardiens du même univers demandent une feuille de référence et des retouches.
- Les images IA sont statiques : l'animation vient du code (pas de vidéo dans le jeu).
- Textures de planètes à plat : risque de raccord et de déformation aux pôles ; alternative : disque photoréaliste sans rotation.
- Droits : vérifier les conditions de la formule Higgsfield pour un usage commercial avant de vendre le jeu.
- Prix, quotas et modèles évoluent : relire le solde et le prix exact au moment de lancer.

## Vision de distribution (demande de Carry, 21/11/2026)
« Les créer de façon à permettre aux gens de les télécharger sur leur téléphone et de les jouer, comme tous les autres jeux X SAPHIR, X SAPHIR Arena, le film X SAPHIR (tomes 1 à 10) : tout cela serait amélioré. »
- **Déjà vrai pour ASTRO QUEST** : jeu installable (PWA) : `manifest.webmanifest`, `sw.js` (version astro-v2, polices et premium.js ajoutés au cache hors connexion), icônes, bouton « Installer sur mon téléphone » (Android) et consigne iPhone.
- **À faire pour la famille X SAPHIR** (après les jeux eux-mêmes) : un **portail unique installable** « X SAPHIR » regroupant ASTRO QUEST, Steel Pursuit, X SAPHIR Arena (combat), et plus tard le film / les 10 tomes (bandes-annonces, affiches). Chaque jeu reste aussi installable seul. Même charte visuelle premium (polices Inter Display / JetBrains Mono, interface en verre).
- **Boutiques d'applications (option, plus tard)** : Android Play Store (compte développeur ≈ 25 $ une fois, via une application web empaquetée) ; iPhone App Store (≈ 99 $/an, règles plus strictes). L'installation par le navigateur (PWA) ne coûte rien et marche tout de suite.
- **Prérequis** : mise en ligne publique (retirer les lignes `/jeu-astro/*` etc. de `_redirects` au moment voulu par Carry), crédits Netlify suffisants, images Higgsfield pour le réalisme.
- **Photos de la NASA** : non téléchargeables depuis le bac à sable (hôtes d'images bloqués par le proxy). Il faudrait que Carry autorise l'accès réseau à un hôte d'images libres de droits (la demande s'affiche à lui dans l'application) ; sinon les planètes restent générées par calcul ou viennent de Higgsfield.
