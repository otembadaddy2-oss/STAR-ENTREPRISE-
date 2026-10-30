# Danseuse virtuelle — fiche de reprise (30/10/2026)

Projet : faire danser la danseuse virtuelle de Carry dans une salle de danse avec un grand miroir, en copiant la danse et le rythme d'une vidéo de référence (la danseuse blonde, pas le danseur).

## Décisions de Carry
- Corps retenu : **version B** (« plus de formes »), même visage, même coupe blonde (pixie, côtés rasés), mêmes créoles dorées.
- Tenue retenue : **legging taille haute + brassière bleu pétrole, baskets blanches** (la tenue de droite ; le jogging est abandonné).
- Salle : **salle 2** (parquet doré, miroirs sur les murs, bandes lumineuses).
- Musique : la même que la vidéo de référence, mais ajoutée **dans TikTok / Instagram** (droits), pas dans le fichier.
- Mention « contenu généré par IA » dans la description des publications.
- À faire « prochainement » : Carry dira quand.

## Ce qui est conservé (bibliothèque Higgsfield du compte de Carry)
| Élément | Identifiant |
|---|---|
| Danseuse version B, en pied, salle 2 (image) | job `049b4c40-d5f7-457b-a542-ee7cddbfb3ce` |
| Version C (beaucoup de formes), pour mémoire | job `15087089-9896-4f97-8c08-eef931293c7a` |
| Version A (mince), pour mémoire | job `5518f7e0-200e-4a99-80bb-3cfbcdc11d37` |
| Fiche d'origine du personnage (image, refusée telle quelle par le filtre) | média `b77c9d48-3807-4d53-ba17-6a592464e578` |
| Visage (recadrage de la fiche) | média `94821a8b-94db-4efc-be97-3b824d55cfe0` |
| Salle 2 (décor) | média `9a0956ff-81c7-4280-8bcc-6d2ec99a58ad` |
| Vidéo de danse, partie utilisable (23,8 s, sans son, nettoyée) | média `6d9849ab-1375-4641-b84c-3cfac4492bbc` |
| Extrait 5 s (14 s à 19 s), recadré sur la danseuse | média `e4ade8c6-16f5-442d-9278-266b1b5f55e7` |
| Test de danse 5 s (version A) | job `b872a1ac-d09b-4208-8564-d3eff7f33154` |

Les fichiers vidéo eux-mêmes ne sont **pas** dans ce dépôt (il est public et la vidéo de référence appartient à un autre créateur). Carry garde l'original sur son téléphone.

## Comment refaire la danse
1. Outil `motion_control` (Kling 3.0 Motion Control), image = job version B, vidéo = média ci-dessus, `resolution: 720p`, `scene_control: image` (le décor vient de l'image, le miroir reflète la danseuse).
2. Coût constaté : environ **10 crédits pour 5 s** (≈ 2 crédits par seconde). Un essai échoué a été remboursé.
3. La vidéo de référence d'origine est abîmée après ~24 s : seule la première partie est utilisable.
4. Pour suivre la danseuse seule (pas le danseur), recadrer avant d'envoyer :
   `ffmpeg -ss 14 -i danse_propre.mp4 -t 5 -vf "crop=394:700:326:540,scale=720:1280,fps=30" -an sortie.mp4`
   (adapter x et y si la danseuse se déplace ; viser un plan 9:16 où elle est seule et entière).
5. Livrer la vidéo **sans musique** ; Carry ajoute le son dans TikTok / Instagram.

## Constat du test (version A, 5 s)
La danseuse bouge bien dans la salle, avec le reflet dans le miroir. Les mouvements sont ceux de la vidéo de référence recadrée sur la danseuse. À regarder de plus près avant une longue version : cohérence des mains et du visage sur les mouvements rapides.

## Crédits Higgsfield à la fin de cette session
Environ 68,6 sur 1 000 (plan Plus, renouvellement le 29 novembre). Recharge : 500 crédits pour 29 $.
