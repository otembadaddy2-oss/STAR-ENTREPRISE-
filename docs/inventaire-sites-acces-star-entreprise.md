# STAR ENTREPRISE — Inventaire des sites, applications & accès

Document de suivi interne, mis à jour à chaque nouvelle création. Ne contient **aucun mot de passe réel** — voir la note de sécurité en bas de page pour comprendre pourquoi, et où les garder à la place.

Dernière mise à jour : 13 septembre 2026 (ajout : inscriptions Marketplace visibles en temps réel + export Excel dans `admin.html`).

---

## 1. Hébergement — vue d'ensemble

Tous les sites de ce dépôt (`otembadaddy2-oss/STAR-ENTREPRISE-`) sont des sites statiques HTML/CSS/JS (+ quelques fonctions serverless Netlify pour les parties avec base de données). Le déploiement se fait via **Netlify**, connecté à ce dépôt GitHub.

- **Site principal** : `https://star-entreprise.netlify.app` — héberge la vitrine STAR ENTREPRISE et la majorité des sous-projets, chacun dans son propre dossier (ex. `/maison-drepanocytose/`, `/marketplace/`, `/starvibe/`, `/pilipili-events/`, `/guichet-unique/`, `/star-alerte/`, `/so-membres/`).
- **Sous-domaines Netlify séparés repérés dans le code** : `sos-doc.netlify.app` et `alpha-star-creat.netlify.app` — à confirmer avec toi s'il s'agit de déploiements Netlify distincts ou d'alias du même site.
- **Connexion à Netlify/GitHub** : gérée par ton compte personnel (accès e-mail `otembadaddy2@gmail.com`). Je n'ai jamais eu et ne stocke pas ton mot de passe Netlify ni GitHub — je travaille uniquement via les autorisations que tu m'accordes dans la session.

## 2. Répertoire public des sites

Une page publique liste déjà tous les projets avec leurs liens : **`diamant.html`** sur le site principal (`https://star-entreprise.netlify.app/diamant.html`). Ce document-ci est son complément **technique et interne**, avec le détail de fonctionnement de chaque brique.

## 3. Détail par site / application

| Site | URL | Dossier | Rôle | Connexion / accès |
|---|---|---|---|---|
| **STAR ENTREPRISE** (vitrine agence) | `star-entreprise.netlify.app` | racine | Site vitrine de l'agence, business plan, services, portfolio | Aucune connexion — public. Espace direction : `admin.html` (login staff partagé, voir §4) |
| **Répertoire des sites** | `/diamant.html` | racine | Page liens vers tous les projets du groupe | Public |
| **JARDIS** | `/jardis.html` | racine | Assistant personnel (documentation/manifeste) | Public |
| **STAR CRÉAT** | `/star-creat/` | `star-creat/` | Sous-marque création | Public |
| **ALPHA** | `alpha-star-creat.netlify.app` ou `/alpha/` | `alpha/` | Espace découverte/lancement, admin propre (`alpha/admin.html`, `alpha/vitrine-admin.html`) | Admin par identifiants à définir — mot de passe non stocké ici |
| **KIDIMBOU** (Guichet unique RC) | `/guichet-unique/` | `guichet-unique/` | Guichet unique administratif, PWA installable | Public |
| **STAR ALERTE** | `/star-alerte/` | `star-alerte/` | Signalement/localisation/secours, PWA | Public |
| **SOS DOC & PIOUPIOU** (ancienne version) | `sos-doc.netlify.app` | — | Vidéos éducatives / espace enfants (précurseur de KOMYO) | Public |
| **La Maison de la Drépanocytose** | `/maison-drepanocytose/` | `maison-drepanocytose/` | Dépistage, accompagnement familles, sensibilisation (Pointe-Noire) | Public. Espace membres : `espace.html`, messagerie : `discussion.html` |
| **Pili-Pili Events** | `/pilipili-events/` | `pilipili-events/` | Partenaire événementiel, PWA | Public. Espace : `espace.html`, messagerie : `discussion.html` |
| **S.O — Gestion des membres** | `/so-membres/` | `so-membres/` | Gestion d'une organisation/association | `setup.html` — configuration initiale, identifiants à définir |
| **STAR Marketplace** | `/marketplace/` | `marketplace/` | Achat/vente Congo, paiement Mobile Money | Inscription vendeur/acheteur → relais WhatsApp Business **et** enregistrement en base (table `leads`, visible dans `admin.html`). Espace compte : `compte.html` |
| **KOMYO** (ex STAR VIBE) | `/starvibe/` | `starvibe/` | App vidéo verticale + PIOUPIOU (espace enfants séparé) + abonnements Mobile Money | Compte utilisateur : numéro de téléphone + code PIN à 4 chiffres choisi à l'inscription (`inscription.html`). Org technique : `star_vibe` |
| — Modération KOMYO | `/starvibe/moderation.html` | idem | Validation des vidéos avant diffusion | Login staff partagé (voir §4) |
| — Paiements KOMYO | `/starvibe/paiements.html` | idem | Confirmation manuelle des paiements Mobile Money | Login staff partagé (voir §4) |
| **STAR VIBE — Démo cliquable** | `/starvibe-demo/` | `starvibe-demo/` | Maquette de démonstration (sans backend réel) | Aucune vraie connexion, écrans de démo |

## 4. Comptes « staff » internes (modération / paiements / direction)

Les panneaux `admin.html` (Espace direction — toutes les demandes/inscriptions du groupe, dont désormais le **Marketplace**, avec export Excel), `moderation.html` et `paiements.html` de KOMYO partagent un **même système de connexion staff** :

- Organisation technique : `star_entreprise`
- Table de comptes : `accounts` (base Netlify DB / Neon PostgreSQL)
- Le mot de passe de chaque compte staff est celui que **tu as choisi** au moment de la création du compte — il est stocké **chiffré (haché)** dans la base de données, donc même moi je ne peux pas le relire une fois créé. Si tu l'oublies, il faut le réinitialiser directement en base, pas le « retrouver ».

## 5. Comptes et clés externes (connecteurs)

Ces services sont connectés à ta session Claude directement par toi (via les paramètres de connecteurs claude.ai) — je ne vois ni ne stocke les mots de passe ou clés API, seulement le fait qu'ils sont connectés :

- **Unsplash** — recherche de photos
- **ElevenLabs** — génération de voix et musique
- **GitHub** — accès au dépôt `otembadaddy2-oss/STAR-ENTREPRISE-`
- **Netlify** — hébergement (déduit du domaine `star-entreprise.netlify.app`, accès direct à confirmer)

## 6. Note de sécurité — pourquoi pas de vrais mots de passe ici

Je ne mets **volontairement aucun mot de passe réel** dans ce document, pour deux raisons :
1. **Je n'y ai pas accès** — tes mots de passe Netlify, GitHub, Mobile Money, e-mail, etc. ne me sont jamais communiqués ; je ne peux donc pas les stocker même en le voulant.
2. **Ce serait dangereux même si je le pouvais** — ce fichier vit dans un dépôt Git. Un mot de passe écrit ici resterait *pour toujours* dans l'historique Git, même si tu le supprimes plus tard ou changes de dépôt privé à public par erreur. Un seul accès non désiré au dépôt donnerait alors accès à *tous* tes comptes d'un coup.

**Ce que je te recommande à la place** : garde tes vrais mots de passe dans un gestionnaire dédié (Bitwarden, ou même une note protégée sur ton téléphone) — et utilise ce document uniquement comme **plan du terrain** : quoi existe, où, comment ça fonctionne, quel type de connexion utiliser. Je le mets à jour à chaque nouvelle création, comme tu me l'as demandé.

---
*Document maintenu par Claude à la demande de Carry OTEMBA — à redemander à tout moment pour la version à jour.*
