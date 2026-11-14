# Keydou Compagnon v2 — notes (14 novembre 2026)

Prêt dans le dépôt, **pas encore déployé** (attente du « déploie » de Carry).

## Ce qui change
- **Domaines** : Auto, Général, Santé, Droit, Cuisine, Mécanique, Business, Études (puces sous la discussion ; en « Auto », le domaine est deviné d'après la question). Chaque domaine a ses consignes (`netlify/functions/_compagnon2.mts`). Santé : jamais de diagnostic, de dose ni de médicament précis, vérification avec source, signes graves → urgences sans inventer de numéro.
- **Réflexion** : Essentiel = effort « low », 1 400 jetons ; Complet = effort « medium », 2 200 jetons. Modèle inchangé (Sonnet 5.5). Variables facultatives : `COMPAGNON_EFFORT_ESSENTIEL`, `COMPAGNON_EFFORT_COMPLET`, `COMPAGNON_MODEL_COMPLET`.
- **Photos et documents (PDF)** : bouton trombone. Photos réduites à 1 280 px avant l'envoi, PDF jusqu'à 3,2 Mo. Lus puis **oubliés** (non gardés). Limites : 5 par jour (Essentiel), 30 par jour (Complet). Pas d'identification de visage, pas de diagnostic sur photo/analyse, codes et pièces d'identité non répétés.
- **Création d'images** (Complet : 10 par 30 jours glissants ; Essentiel : 0, message vers l'offre Complet). Fabrication en tâche de fond (`compagnon-image-background.mts`), image gardée dans la base (table `starvibe_compagnon_images`, 30 dernières par personne), affichée avec « Enregistrer » et « Refaire autrement » et la mention « Image créée par intelligence artificielle ». Effacée avec « Tout effacer ».
  - **Règles de sécurité** (filtre sur la demande de la personne ET sur la description de l'IA, double contrôle dans la tâche de fond, puis contrôle du service d'images) : refus de tout enfant ou bébé, nu ou sexuel, violence ou arme, drogue ou haine, faux documents (pièce d'identité, billet, reçu, capture de paiement, cachet), personnes réelles ou reconnaissables. Une demande refusée ou une image qui échoue **ne compte pas** dans le quota. Le texte écrit dans l'image est évité (le service reçoit « no text »).
  - **Pour l'ouvrir** : tant que `IMAGE_API_KEY` n'est pas défini dans Netlify, Keydou répond « bientôt » et l'offre n'annonce pas les images. Service attendu : compatible « OpenAI images » (`POST {IMAGE_API_BASE}/v1/images/generations`). Variables : `IMAGE_API_KEY` (secrète), `IMAGE_API_BASE` (défaut `https://api.openai.com`), `IMAGE_MODEL` (défaut `gpt-image-1`). Quotas modifiables : `COMPAGNON_IMAGES_COMPLET`, `COMPAGNON_IMAGES_ESSENTIEL`, `COMPAGNON_PIECES_COMPLET`, `COMPAGNON_PIECES_ESSENTIEL`. **Le prix par image dépend du service choisi : à mesurer avant d'ouvrir.** Ne jamais écrire la clé dans le chat.
- Aucune promesse d'exactitude : Keydou cite ses sources, dit quand il n'est pas sûr.

## Tests
- `tools/test-compagnon.mts` (fonctions pures : domaines, sécurité des images, pièces jointes).
- `tools/test-compagnon-api.mts` : le vrai code serveur contre PostgreSQL local, avec faux services d'IA et d'images (32 contrôles : domaines, effort, image de bout en bout, isolation entre comptes, refus de sécurité, quota, pièces jointes, effacement, signature de la tâche de fond).
  `service postgresql start ; NETLIFY_DB_URL=postgres://postgres:kt@localhost:5432/kt npx tsx tools/test-compagnon-api.mts`

## Limites connues
- Netlify : la fabrication d'image peut prendre jusqu'à 2 à 3 minutes ; la page attend 5 minutes au plus, puis propose de réessayer.
- Les images gardées pèsent environ 0,3 à 1 Mo chacune dans la base (30 au plus par personne).
- La voix de Keydou sur les réponses écrites de Compagnon reste celle du téléphone (décision à prendre : options A, B, C).
