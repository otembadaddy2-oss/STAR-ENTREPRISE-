# Vidéo de démonstration de Keydou Compagnon (15/11/2026)

- Voix : narratrice = Clémence (voix officielle STAR ENTREPRISE, LFo5X4P9PhYaOLBA9Hyh) ; Keydou = Chloé (VOIX_ID de l'application). Fichiers générés avec ElevenLabs (eleven_v4), environ 1 700 crédits au total.
- Écrans : vraies pages de `starvibe/compagnon.html` enregistrées avec Playwright (`enregistrer-ecrans.cjs`), réponses de Keydou simulées (exemple de conversation, compte de démonstration).
- Assemblage : `assembler-video.py` (Pillow + ffmpeg). Version verticale 1080x1920 (téléphone), 2 min 06 : enregistrer-ecrans.cjs puis assembler-video-vertical.py (l’audio est assemblé séparément avec ffmpeg adelay/amix).
- Les fichiers son et la vidéo ne sont pas dans le dépôt (poids) ; à régénérer si l'application change.
