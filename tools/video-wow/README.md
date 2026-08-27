# Générateur de vidéo "wow" pour réseaux sociaux

Scripts utilisés pour produire `assets/social/star-entreprise-video-wow-2026-08.mp4`
(format vertical 1080×1920, ~23 s) à partir de visuels marketing fournis par
Carry OTEMBA et du logo officiel STAR ENTREPRISE.

## Étapes

1. `remove_black_bg.py` — détoure le fond noir du logo (flood-fill depuis les
   bords + conservation du plus grand composant connexe pour ignorer les
   artefacts de capture d'écran). Produit `09_logo_transparent.png`
   (copié ici sous `assets/img/branding/logo-star-transparent.png`).
2. `build_slides.py` — compose 10 diapositives 1080×1920 (fond flouté "cover"
   de chaque visuel + habillage marque : bandeau logo, légende, écrans logo
   avec dégradé navy/or pour l'intro et le CTA final).
3. `build_video.py` — anime chaque diapositive (effet Ken Burns via
   `zoompan`) puis enchaîne les 10 clips avec des fondus (`xfade`).
4. `build_audio.py` — synthétise une bande son (nappe douce + carillons +
   whooshes aux transitions) entièrement générée par ffmpeg (aucun
   copyright), puis la mixe avec la vidéo silencieuse.

## Ré-exécution

Nécessite `ffmpeg` et `pip install Pillow numpy scipy`. Les 9 visuels sources
(posters marketing + logo) doivent être placés dans `src/` avec les mêmes
noms que dans `build_slides.py` (non versionnés ici — fournis par Carry lors
de la session). Lancer dans l'ordre : `remove_black_bg.py`,
`build_slides.py`, `build_video.py`, `build_audio.py`, puis muxer :

```
ffmpeg -i out/video_silent.mp4 -i audio/final_audio.wav \
  -c:v copy -c:a aac -b:a 192k -ac 2 -shortest out/final.mp4
```
