# Keydou, gardien des espaces de mineurs (PIOUPIOU et KOMYO Jeunes)

Mis en service le 31 octobre 2026. Chaque vidéo publiée pour les enfants est contrôlée automatiquement.

## Ce qui se passe
1. À la publication, une tâche de fond (`keydou-gardien-background`) extrait jusqu'à 10 images de la vidéo (ffmpeg) et les envoie à l'IA de Keydou avec la légende. Un balayage toutes les 5 minutes (`keydou-gardien`) rattrape les vidéos restées en attente.
2. Décision (`decider()` dans `_gardien.mts`), volontairement prudente :
   - **ok** avec confiance ≥ 0,85 et au moins 3 images → approuvée toute seule, message « Ta vidéo est dans PIOUPIOU » à l'auteur ;
   - **refuse** avec confiance ≥ 0,80 → refusée, message « Vidéo non acceptable dans PIOUPIOU » avec la raison ;
   - **doute**, IA indisponible (3 essais) ou trop peu d'images → reste en attente, l'auteur est prévenu qu'elle est en cours de vérification, **Carry reçoit une notification** et la page Modération affiche « Keydou hésite : … ». **Jamais d'approbation dans le doute.**
3. Le son n'est pas analysé (images et légende seulement).

## Réglages
- Modèle : variable `KEYDOU_GARDIEN_MODEL` (défaut `claude-sonnet-5-5`). Clé : `ANTHROPIC_API_KEY` (celle de Keydou).
- État des outils : `/api/keydou-gardien-etat` (ffmpeg, présence de la clé ; aucun secret).
- Colonnes `gardien_verdict`, `gardien_raison`, `gardien_essais`, `gardien_le` dans `starvibe_videos`.
- Test : `node --experimental-strip-types tools/test-gardien.mts une_video.mp4`.
- KOMYO Jeunes (13-17 ans) : même contrôle avec des règles d'adolescents (nudité, images sexuelles, pornographie, violence, drogue, harcèlement bloqués). Liberté voulue par Carry : les échanges avec des adultes du cadre normal (famille, voisins, grands du quartier, entraîneurs) restent permis ; seuls les signes clairs de danger (propos sexuels, photos intimes demandées, secret, rendez-vous seul, chantage) sont bloqués. PIOUPIOU reste strict.
- Hors périmètre : les épisodes officiels (validés par Carry).
- Prévu : transcription du son (service payant) en deuxième étape.
