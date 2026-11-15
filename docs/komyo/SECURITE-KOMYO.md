# Sécurité KOMYO — revue du 25/10/2026

## Failles trouvées et corrigées (dans le code, à publier)
1. **Back-office ouvert aux utilisateurs KOMYO (grave).** 12 API du groupe (leads/messages de contact, membres, devis, JARDIS documents/liens/journal, Maison de la Drépanocytose, Pili-Pili, Alpha) acceptaient n'importe quel jeton valide, y compris celui d'un simple compte KOMYO ou d'un client Keydou sans compte. Correctif : `requireGroupAuth` (netlify/functions/_auth.mts) refuse les jetons « star_vibe », « keydou_guest », « star_marketplace » et « guichet_unique ». Testé : 4 jetons publics refusés, jetons du personnel acceptés.
2. **Script injecté par le nom ou la légende (XSS stocké).** Le nom de l'auteur et la légende des vidéos étaient affichés sans protection dans le fil, la modération et les paiements. Correctif : texte échappé (fil.html, moderation.html, paiements.html). Testé : le script ne s'exécute plus.
3. **En-têtes de sécurité** ajoutés pour /starvibe/* et /api/* (_headers) : nosniff, pas d'affichage dans le cadre d'un autre site, politique de référent, caméra/micro limités à KOMYO, HTTPS forcé.

## Déjà en place (vérifié dans le code)
- Codes PIN stockés chiffrés (bcrypt), jamais en clair ; verrouillage temporaire après plusieurs essais ; message d'erreur identique que le numéro existe ou non.
- Clé de signature des sessions (JWT_SECRET) dans les variables d'environnement, aucun secret trouvé dans le dépôt.
- Paiements : le montant doit être exact, confirmation par le personnel ; vidéos des enfants vérifiées avant affichage ; vidéos premium protégées par lien signé.
- Chaque utilisateur ne peut supprimer que ses vidéos ; les actions de modération sont réservées au personnel.

## Limites connues (à traiter ensuite)
- **PIN à 4–5 chiffres** : le verrouillage ralentit un attaquant mais ne l'arrête pas pour un compte visé. Piste : PIN à 6 chiffres + limite par adresse IP.
- **Pas de limite d'inscriptions ni d'envois** (création de faux comptes, spam du formulaire de contact). Piste : règles de limitation de débit Netlify + vérification anti-robot.
- **Pas de politique CSP** (liste blanche des scripts) : demande des tests pour ne rien casser.
- **Jetons de 30 jours** conservés dans le téléphone : si un téléphone est volé, la session reste ouverte. Piste : bouton « Déconnecter tous mes appareils ».
- Aucune application n'est « inviolable » : l'objectif est de rendre l'attaque difficile, de limiter les dégâts et de réagir vite (journaux, sauvegardes).

## Revue du 14/11/2026 (demande de Carry : « protégé contre les pirates, accès à moi seul »)
**Corrigé dans le code :**
1. **Fichiers internes publics (grave).** Tout le dépôt étant publié, 23 fichiers de `docs/` étaient téléchargeables par n'importe qui : inventaire des sites et accès, fiches et règles de Sarah, notes de reprise, procédure Hostinger, stratégie marketing, business plan, plan de croissance, étude de marché, scripts de fabrication. Désormais introuvables (`_redirects`, vérifié en ligne après déploiement). Restent publics volontairement, car des liens ont pu être partagés : dossier institutionnel Havre de Vie, fiches produits, guide d'utilisation, guide KINDIMBOU, dossier de présentation STAR ALERTE.
2. **Connexion du personnel sans limite d'essais (grave).** `/api/auth` (back-office du groupe) pouvait être attaqué par essais répétés. Maintenant : 5 essais ratés par identifiant et par connexion → blocage 15 min ; 20 par connexion → blocage 1 h ; 12 par identifiant, quelles que soient les adresses → blocage 15 min (vérifié en ligne : le 13e essai est refusé) ; le vrai propriétaire n'est pas bloqué par l'attaque d'un autre ; même durée de réponse si l'identifiant n'existe pas ; jeton de configuration comparé en temps constant et limité à 5 essais.
3. **Marketplace : paiement « confirmé » par le navigateur (grave).** N'importe qui pouvait activer une annonce ou marquer une commande « payée » en saisissant le bon montant, sans payer. Désormais seuls le personnel (jeton) ou le service de paiement (secret du webhook) confirment ; un visiteur déclare son paiement, qui passe « en vérification ». **Il n'existe pas encore d'écran du personnel pour confirmer : à construire avant toute vraie ouverture de la Marketplace.**
4. **En-têtes de sécurité sur tout le site** (pas seulement KOMYO) : anti-affichage dans le cadre d'un autre site, pas de lecture devinée des fichiers, HTTPS forcé.
5. Tests : `tools/test-securite.mts` (14 contrôles).

**Vérifié, déjà sûr :** Compagnon (images, voix, historique : chaque personne ne voit que les siens ; quotas ; tâche de fond signée), aucun secret écrit dans le dépôt, jetons KOMYO refusés par le back-office, codes PIN chiffrés.

**À faire par Carry (hors code) :** mot de passe long et unique pour ton compte direction ; activer la vérification en deux étapes sur Netlify, GitHub, ElevenLabs, Anthropic, Hostinger et ta boîte e-mail ; ne jamais coller une clé dans le chat ; garder `JWT_SECRET`, `SETUP_TOKEN` et les clés uniquement dans Netlify ; définir `MARKETPLACE_PAYMENT_WEBHOOK_SECRET`.
**Limites connues :** pas de CSP (risque de casser des pages) ; code PIN KOMYO à 4–5 chiffres ; attaque répartie sur beaucoup d'adresses non couverte ; aucune application n'est « inviolable ».

