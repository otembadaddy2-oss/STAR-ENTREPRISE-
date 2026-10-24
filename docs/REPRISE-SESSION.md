# Reprise de session — à lire en premier

Propriétaire : Carry OTEMBA (STAR ENTREPRISE, Congo). Langue de travail : français, ton amical, phrases simples.

## Règles
- Clé Higgsfield : variable d'environnement `HIGGSFIELD_API_KEY` (et `HIGGSFIELD_API_SECRET` si la page en donne un). Ne jamais l'écrire dans le chat, un fichier ou un commit.
- Budget Higgsfield (API, annoncé par Carry) : 38,95 $. Donner le prix exact avant chaque génération, attendre son « ok », ne pas relancer une génération pour « réessayer » sans accord.
- Le jeu X SAPHIR ARENA reste hors ligne tant que Carry n'a pas écrit « vas-y » : la règle `/arena` et `/arena/*` à la fin de `_redirects` le bloque (la retirer à ce moment-là).
- Publication : Netlify, site `star-entreprise` (id b9c78969-5a1f-4a95-b903-c22472ab1f91), https://komyo.starentreprise.com. Attention : un déploiement remplace tout le site. Tout fichier utilisé par le site doit être dans le dépôt (ex. les 13 vidéos de Keydou dans `starvibe/assets/video/keydou/`).
- Réseau (réglages de l'environnement) : autorisés `api.netlify.com`, `netlify-mcp.netlify.app`, `*.netlify.app`.
- Branche de travail : `claude/video-mp4-social-media-0hgpf6`.

## Priorités demandées (ordre à confirmer avec Carry)
1. X SAPHIR :
   - jeu : poses clés des personnages d'ARENA (coup, garde, saut) à partir des couvertures des tomes (`docs/film/references/`), pour améliorer les combattants ;
   - film Cycle I (tomes 1–10) : plan dans `docs/film/PLAN-FILM-X-SAPHIR-CYCLE-I.md`, pilote 90 s / 14 plans, quelques plans test avant tout le reste ;
   - éventuellement une bande-annonce courte.
2. PIOUPIOU (3–6 ans) : 39 épisodes prévus (`starvibe/assets/pioupiou-episodes-v1.json`), aucun n'est encore créé. Pilote proposé : « Les dents du matin » (75 s), scénario d'abord, un seul plan test, puis décision. Vidéos vérifiées par le staff avant d'apparaître ; les vidéos premium sont réservées aux abonnés Famille (1 500 FCFA/mois).

## État de KOMYO (en ligne)
Keydou (1 000 FCFA, montant exact), « Me filmer », espaces Talents/Business/Musique/Découverte, ÉCLAT (page d'attente), Myo (suivre = ami), Kaba+, réponses aux commentaires, annonces payantes (4 000 FCFA / 2 semaines, 10 000 FCFA / 1 mois), rappel d'abonnement à J-3 signé Keydou, bouton « cœur + » dans le fil.

## À faire ensuite / en attente de décision
- Fil : remonter Keydou (il cache la barre du bas et la légende) — proposé, pas encore validé.
- Choix de l'espace au moment de publier — proposé.
- KOMYO Jeunes (8–17 ans) : fermé, en attente de l'accord de Carry pour la pré-modération.
- ÉCLAT : un vrai direct demande un fournisseur externe.
- Voir aussi l'ancienne liste : Hostinger, Noupia, MTN MoMo API, etc.

## 24/10/2026 — mise à jour KOMYO prête, PAS ENCORE EN LIGNE
- Prêt dans la branche claude/video-mp4-social-media-0hgpf6 (commit 546cc4c) : guide de démarrage à flèches (assets/guide-v1.js, relançable par fil.html?guide=1), bouton « Fil » corrigé, formulaire de contact sur l'accueil (enregistre dans le Backend via /api/leads, type komyo-contact, + notification staff ; puis boutons WhatsApp et e-mail préremplis), KOMYO Jeunes ouvert aux 13-17 ans (vidéos modérées par le staff avant affichage ; adultes exclus ; Business réservé aux 18+).
- Déploiement refusé par Netlify : « Skipped due to account credit usage exceeded » (crédits du compte épuisés). Le site en ligne reste l'ancienne version. À faire : recharger / changer de plan Netlify (ou attendre le renouvellement), puis relancer le déploiement (deploy-site de siteId b9c78969-5a1f-4a95-b903-c22472ab1f91, depuis cette branche : elle contient tous les fichiers du site).
