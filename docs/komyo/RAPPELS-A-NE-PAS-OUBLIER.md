# Rappels à ne pas oublier (KOMYO)

Liste tenue par Claude et Carry. Claude relit ce fichier au début d'une session et rappelle à Carry ce qui devient d'actualité.

## 1. Vidéo professionnelle (Cloudflare Stream ou Mux) — quand KOMYO aura beaucoup d'utilisateurs
- **Pourquoi** : aujourd'hui les vidéos passent par une fonction Netlify. Mesuré le 2 novembre 2026 : le fichier vidéo met 1,7 s en médiane, 5 s pour 1 vidéo sur 10, jusqu'à 17 s au pire. Une affiche (première image) masque l'attente, mais le démarrage n'est pas instantané comme sur TikTok.
- **Solution** : un service spécialisé (Cloudflare Stream, Mux) : vidéos découpées et servies depuis un réseau mondial, miniatures automatiques, démarrage immédiat. Coût mensuel à prévoir (au volume vu, quelques dizaines de dollars par mois au début).
- **Quand en reparler** (le premier des signes) :
  - environ 300 membres actifs, ou
  - la ligne « Compute » de Netlify devient le premier poste de dépense à cause de `api-starvibe-video-file`, ou
  - des membres se plaignent de vidéos lentes.
- **À faire alors** : Claude chiffre le coût réel, propose le service, migre les vidéos existantes, garde les affiches.

## 2. ÉCLAT (direct) — après le lancement de KOMYO
- Aujourd'hui : page « Bientôt en direct » seulement.
- À construire : caméra en direct, commentaires qui défilent, cœurs qui s'envolent, blocage d'un spectateur dans le direct. Demande un service de diffusion en direct (coût mensuel). Claude prépare un plan avec le service et son prix, Carry décide.

## 3. Autres points ouverts
- Airtel Money : nom de l'expéditeur + exemple de SMS, puis deuxième règle MacroDroid.
- Paiement par carte (Visa / Mastercard) : réponse du service de paiement.
- Netlify : recharge automatique avec un plafond avant le lancement public.
- Bissa POP (pub animée) : en pause ; reprendre quand Higgsfield est rechargé (voix et destination à choisir).
- Commentaires des personnes bloquées : à cacher aussi sur les vidéos.
