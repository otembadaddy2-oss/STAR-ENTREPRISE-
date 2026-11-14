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

## Ajout du 14 novembre (soir) : médecine experte et tests d'examen
- **Mode Santé = « Médecine et santé »** : grande connaissance (anatomie, physiologie, biologie moléculaire, biochimie, génétique, microbiologie, immunologie, pharmacologie, toutes les spécialités). **Ne prescrit jamais** (ni diagnostic, ni dose, ni médicament à prendre) ; **oriente toujours** vers la bonne spécialité avec des adresses **vérifiables** : il cherche sur le web (sites officiels, ministère, ordre des médecins, hôpital), donne le nom, la ville et le lien, et n'invente **jamais** une adresse, un numéro ou un nom de médecin. Sinon il dit où vérifier.
- **Filet de sécurité** (`gardePrescription`) : si une réponse contient une consigne de dose (« 500 mg matin et soir »…), le rappel « je ne prescris jamais » est ajouté automatiquement (sauf en mode Tests/Études, où une dose peut être un exemple d'exercice).
- **Mode Tests** (🎓) : QCM et questions d'examen avec raisonnement étape par étape, double vérification, « fais-moi passer un test » une question à la fois, note sur 10 à deux décimales **tronquée, jamais gonflée** (19/20 = 9,50 ; 1 999/2 000 = 9,99), points à revoir. Détecté automatiquement (biologie moléculaire, biochimie, génétique, QCM…) ou choisi par la puce « Tests ».
- **Texte cohérent** : en Santé et Tests, réflexion maximale (Complet : « high » ; Essentiel : « medium »), réponses jusqu'à 4 500 jetons (Complet) et 6 000 signes affichés (au lieu de 1 800), consigne de structure et de cohérence. **Coût plus élevé** par message dans ces deux modes : à surveiller dans le suivi Backend.
- **Évaluation réelle** : `tools/evaluer-compagnon.mts` fait passer à Keydou (même modèle, même réflexion, même consigne que l'application) des QCM avec corrigé et donne la note sur 10. Exemple fourni : `tools/tests-compagnon/biologie-moleculaire-exemple.json` (20 questions de bases classiques, à remplacer par de VRAIS sujets d'examen avec corrigé). Lancement : `ANTHROPIC_API_KEY=… npx tsx tools/evaluer-compagnon.mts <fichier.json> complet`. **Aucune note n'a encore été mesurée** (la clé de l'IA est dans Netlify, pas dans cette session) ; aucune note parfaite ne peut être promise.

## Tests
- `tools/test-compagnon.mts` (fonctions pures : domaines, sécurité des images, pièces jointes).
- `tools/test-compagnon-api.mts` : le vrai code serveur contre PostgreSQL local, avec faux services d'IA et d'images (32 contrôles : domaines, effort, image de bout en bout, isolation entre comptes, refus de sécurité, quota, pièces jointes, effacement, signature de la tâche de fond).
  `service postgresql start ; NETLIFY_DB_URL=postgres://postgres:kt@localhost:5432/kt npx tsx tools/test-compagnon-api.mts`

## Limites connues
- Netlify : la fabrication d'image peut prendre jusqu'à 2 à 3 minutes ; la page attend 5 minutes au plus, puis propose de réessayer.
- Les images gardées pèsent environ 0,3 à 1 Mo chacune dans la base (30 au plus par personne).
- La voix de Keydou sur les réponses écrites de Compagnon reste celle du téléphone (décision à prendre : options A, B, C).
