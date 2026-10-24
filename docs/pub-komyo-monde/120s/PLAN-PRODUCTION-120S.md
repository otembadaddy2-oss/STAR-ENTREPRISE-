# KOMYO — LE MONDE EN MOUVEMENT — production du film de 120 s (16:9) et déclinaisons

Brief source : `BRIEF-MASTER-120S.txt` (Carry). Règle du brief : aucune dépense sans accord de Carry ; ne jamais annoncer un film fini sans fichier MP4 vérifié.

## Distribution (portraits verrouillés dans `personnages/`)
Marie (Brazzaville), Angèle (Paris), Foel (Montréal), Messie (Tokyo), Sita (Abidjan), la vendeuse (Brazzaville) ; Clémence = visage du spot officiel, tenue : haut bleu STAR + tailleur ivoire, décor salon STAR ENTREPRISE (images de départ dans `assets/img/pub/clemence-bleu-9x16.jpg`).

## Ce que savent faire les outils (vérifié)
- API Higgsfield : Soul (images, ≈ 0,094 $), Kling 2.5 turbo (≈ 0,35 $ / 5 s, muet), **Kling 3.0 std image→vidéo avec son natif : ≈ 0,126 $ / s (0,63 $ / 5 s ; 1,26 $ / 10 s)**, Kling 3.0 pro ≈ 0,168 $ / s. Kling 3.0 : 3 à 15 s, option multi-plans (jusqu'à 6), `image_url` = première image, `last_image_url` = dernière image, `sound: on/off`.
- À tester avant tout : qualité du français parlé, lèvres synchronisées, et surtout **la même voix pour le même personnage d'un plan à l'autre** (sinon : plans muets + doublage ElevenLabs, quota actuellement épuisé).
- Texte, logos, interfaces téléphone, numéros, slogan : ajoutés en postproduction (logo officiel : `assets/img/pub/komyo-logo-or-monde.png`).
- Les versions 60 / 30 / 15 s se montent à partir des plans du film de 120 s (aucun coût de génération en plus). 9:16 et 1:1 : recadrage / plans complémentaires.

## Budget (solde annoncé 38,95 $ ; ≈ 31 $ restants avant ce chantier)
| Étape | Coût estimé |
|---|---|
| Portraits (fait) | ≈ 0,6 $ |
| Images clés 16:9 (≈ 22 images, 1,5 essai) | ≈ 3,5 $ |
| Test dialogue (1 plan de 5 s, Kling 3.0 std son) | ≈ 0,63 $ |
| 120 s de plans, 1 passage (Kling 3.0 std) | ≈ 15 $ |
| Reprises (≈ 40 % des plans) | ≈ 6 $ |
| **Total** | **≈ 26 $** |
Réserve ≈ 4–5 $. Aucun plan vidéo lancé avant le feu vert de Carry sur le test de dialogue.

## Découpage (durées du brief)
1. 0–7 Brazzaville aérien → glacière (Crane Down)
2. 7–17 vendeuse + Marie, « 300 francs » ; plongée glacière, macro
3. 17–27 dégustation, « Ah… ça fait du bien ! »
4. 27–38 appel ANGÈLE — PARIS, données mobiles, KOMYO, traversée de l'écran (VFX en post)
5. 38–49 Paris, café, Arc 120°, « Maintenant, je te vois ! »
6. 49–60 raccord de regard Marie/Angèle, « Reste là, j'appelle Foel »
7. 60–72 Montréal hiver, télécommande (logo en post si droits OK), orbite
8. 72–84 Tokyo nuit, FPV → Messie
9. 84–96 Abidjan, boutique, orbite, cliente, « Abidjan est là, hein ! »
10. 96–106 eau dans le verre, macro, traversée du verre (composition)
11. 106–115 les cinq cadres réunis, Marie lève son BISSA POP
12. 115–120 Clémence, logo officiel, slogan typographié, voix finale

## Avant diffusion (brief §6)
Vérifier : pays où KOMYO est vraiment disponible, fonctions de l'appli, prix 300 FCFA du BISSA POP, droits d'utilisation du nom HIGGSFIELD. Si KOMYO n'est pas lancé partout : présenter la pub comme l'annonce de son arrivée.

## État au 24 oct. 2026 (soir) — préproduction
- Portraits verrouillés : `personnages/*.jpg` (+ `portraits_ids.json`).
- « Éléments de référence » créés dans le compte Higgsfield (web) : Marie-Brazzaville `064ed9fa-8592-4edc-93ea-038949ec4c19`, Angele-Paris `aa4abaf4-5753-44cf-a4e7-08851dcb6675`, Foel-Montreal `e80e1f4d-ef31-4693-bc6a-795ba004425a`, Messie-Tokyo `36d731ac-6b69-45fd-b5f1-f0098ee625bd`, Sita-Abidjan `0ee1df62-be77-4c8c-abd8-03ffd0d2e072`, Vendeuse-Brazza `06ce8903-b5e6-4331-ad9d-7c4f5683d063`. Ce compte contient aussi les éléments X SAPHIR (Calpros, Ayanda, Kor-Mal, Nakata, Kravoss, Naomie, Fanfan, Mama Adèle, Élise Bakala, Lilyth, Rosine, Kéla, Nia Mensah, Porsche de Kravoss) — ne pas appeler `manage_reference_elements action=list` sans nécessité : réponse énorme.
- Constats : (1) Soul 2 avec image de référence recopie le portrait (ignore la scène) → inutilisable pour les images clés ; (2) les images clés avec éléments passent par `nano_banana_2` (1,5 crédit web) ou `seedream_v5_lite` (1 crédit web) : le compte web (plan gratuit) n'a qu'environ 4 crédits ; (3) l'API (clé Carry) : Soul texte seul (≈ 0,094 $), Kling 3.0 std son natif (≈ 0,126 $/s) ; (4) hôtes des images générées à autoriser pour pouvoir les contrôler : `*.cloudfront.net`.
- Décision attendue de Carry : mode de production des images clés (voir message du 24 oct.).
