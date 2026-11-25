# Tests de « Passeport Sûr » (à relancer avant toute mise en ligne)

Aucun coût, aucun réseau : tout tourne en local contre une vraie base PostgreSQL.

1. `service postgresql start`
2. Serveur de test : `node --experimental-strip-types tools/serveur-local-passeport.mts 8766` (laisser tourner)
3. Serveur (38+ contrôles) : `node --experimental-strip-types tools/test-passeport-serveur.mts`
4. Navigateur (Playwright installé globalement) : `NODE_PATH=$(npm root -g) node tools/tests-passeport/t_multi.cjs` (idem pour les autres)

| Fichier | Ce qu'il vérifie |
|---|---|
| t_smoke | chargement sans erreur, écran en mode local |
| t_multi | plusieurs postes + 2 écrans : paiement, rendez-vous, appel aux portes, coupure réseau d'un écran |
| t_citoyen | lien du demandeur : suivi, envoi de pièce, accès refusés, rendez-vous en direct |
| t_file | file d'annonces : 10 s par numéro, voix, absent en fin de file |
| t_guide | visite guidée de chaque profil (ordinateur + téléphone), clavier, aide, FAQ |
| t_robuste | panne du serveur et reprise, double encaissement, textes piégés, 800 dossiers (lance son propre serveur, port 8767) |
| t_effacer | bouton « Effacer l'espace » (lance son propre serveur, port 8768) |
| t_tel | parcours complet sur téléphone (signature au doigt, caisse, demandeur, porte, télévision) |
| t_verre | transitions de pages en verre |

Sous test automatisé, la visite guidée ne se lance pas toute seule (sauf avec `?guide=1`).
