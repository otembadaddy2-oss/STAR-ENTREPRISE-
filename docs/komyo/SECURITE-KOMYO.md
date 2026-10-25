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
