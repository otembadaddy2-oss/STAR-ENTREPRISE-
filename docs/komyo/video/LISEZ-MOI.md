# Vidéo de démonstration de Keydou Compagnon (15/11/2026)

- Voix : narratrice = Clémence (voix officielle STAR ENTREPRISE, LFo5X4P9PhYaOLBA9Hyh) ; Keydou = Chloé (VOIX_ID de l'application). Fichiers générés avec ElevenLabs (eleven_v4), environ 1 700 crédits au total.
- Écrans : vraies pages de `starvibe/compagnon.html` enregistrées avec Playwright (`enregistrer-ecrans.cjs`), réponses de Keydou simulées (exemple de conversation, compte de démonstration).
- Assemblage : `assembler-video.py` (Pillow + ffmpeg). Version verticale 1080x1920 (téléphone), 2 min 06 : enregistrer-ecrans.cjs puis assembler-video-vertical.py (l’audio est assemblé séparément avec ffmpeg adelay/amix).
- Les fichiers son et la vidéo ne sont pas dans le dépôt (poids) ; à régénérer si l'application change.

## Version du 15/11 (soir) : deux formats et prix en dollars et en FCFA
- `enregistrer-ecrans.cjs` : variables MODE (portrait ou paysage), VW, VH, DSF. Portrait 390x562 DSF 2,1026 ; paysage 360x581 DSF 1,7222.
- `assembler-video.py portrait|paysage` : 1080x1920 (téléphone) ou 1920x1080 (ordinateur). Durée 2 min 19.
- Voix de la narratrice refaite pour la séquence « offres » : prix en dollars et en FCFA, puis « dès que le paiement par carte Mastercard ou Visa sera possible, vous en serez informés » (aucune date promise).
