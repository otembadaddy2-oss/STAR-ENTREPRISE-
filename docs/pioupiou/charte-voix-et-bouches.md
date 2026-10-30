# PIOUPIOU — charte des voix et de la synchro des bouches

Règle de production, valable pour tous les épisodes (A1, A2, A3…) : un personnage garde **la même voix** d'un épisode à l'autre, et la **bouche des personnages qui parlent suit la voix**.

## Voix officielles (ElevenLabs, modèle eleven_v4)

| Personnage | Voix | voice_id | Réglage |
|---|---|---|---|
| PIOUPIOU | Chloé | I6eWD84OrEngt4S4Antm | tel quel |
| Zola (garçon) | Aquilas | cYITNPiqwVi5OklXGv3H | tel quel |
| Mawa (fille) | Chicadi | FvmvwvObRqIHojkEGh5N | tel quel |
| Kiki (singe) | Peter | GgV5QStPLpmkN7FOHJtY | hauteur +3 demi-tons (voix plus enfantine), tempo inchangé |
| Narratrice | Caroline | kwhMCf63M8O3rCfnQ3oQ | tel quel |
| Papa Martial | — | zI8g3TAhpjmej7Iznusa | tel quel |
| Maman Fatou | — | Vza9yt3uSx3RXnRx6YfI | tel quel |

À trancher : Naël (staff technique B) a été choisi avec la voix Chloé, qui est déjà celle de PIOUPIOU. Une des deux doit changer (proposition : Solène 1A1lOhlOFIlPyxQ8NgiG ou Justine zPy2sgLU4pZ7Xrjh87uz pour Naël).

Pitch Kiki : `ffmpeg -i in.mp3 -af "asetrate=44100*1.19,aresample=44100,atempo=0.8403" out.mp3`

## Synchro des bouches

- Plan où un personnage important parle à l'écran : image clé → **Wan 2.7** (`wan2_7`), rôle `start_image` + la ligne de voix en `audio_references`. Durée du plan = durée de la voix arrondie au-dessus (3 à 7 s). Environ 1,5 crédit par seconde.
- La voix est ensuite posée sur le plan à t = début du plan (le modèle synchronise sur le début du fichier audio).
- Plans sans parole à l'écran (narratrice hors champ, brossage avec la brosse dans la bouche, décors) : Kling 3.0 reste possible.
- Dans le prompt : « beak/mouth clearly open and closing in sync with the voice », « objet tenu loin de la bouche », « visages toujours visibles ». Une brosse à dents tenue dans le bec cache la bouche : le préciser.
- Vérifier chaque plan : sur les images où la voix est forte, la bouche doit être ouverte ; sur les silences, fermée.

## Coût indicatif d'un épisode de 8 plans

8 images clés (~2 crédits) + plans parlés Wan (~45 crédits) + 2 plans Kling (~20 crédits) ≈ 70 crédits.
