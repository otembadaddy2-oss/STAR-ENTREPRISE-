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

## 24 oct. 2026 — test de dialogue + images clés plans larges
- Test dialogue Kling 3.0 std (image→vidéo, son natif) : plan de Marie, 5 s, ≈ 0,63 $ : visage fidèle, piste audio présente. Verdict voix / français / lèvres : à confirmer par Carry (voir message). Fichier : `m120/test_marie_dialogue.mp4` (scratchpad, non versionné).
- 7 images clés 16:9 des plans larges (Soul API, 720p, ≈ 0,094 $ pièce) : `images-cles/` — aérien Brazzaville, glacière zénithale, café parisien, salon de Montréal (télécommande + tablette sur la table basse), Tokyo de nuit, boutique d'Abidjan, verre d'eau macro.
- Image de référence de Clémence (visage du spot officiel) téléversée : media id Higgsfield `8bcbec5c-ff9d-453a-b26a-fa4353181ba5`.
- Domaines autorisés : `*.higgsfield.ai`, `*.cloudfront.net` (téléchargement et contrôle des sorties).

## 24 oct. 2026 — scènes 1 à 3 (Brazzaville) générées
- Élément de référence « BISSA-POP-pack » (vrai emballage) : `06715b11-b0f9-4871-94b5-a1ce1398c17c`.
- Images clés S2 / S3 : seedream_v5_lite avec éléments (Marie + vendeuse + boîte) → `images-cles/k08_*`, `k09_*`.
- Clips Kling 3.0 std, son natif, ≈ 25 s ≈ 3,2 $ : S1 aérien 7 s, S2 dialogue 10 s, S3 dégustation 8 s. Assemblage d'essai 24 s (non versionné). Voix et synchronisation labiale : à valider par Carry à l'écoute ; sinon doublage ElevenLabs après recharge.
- Contrôle de l'emballage (24 oct.) : forme, logo, couleurs, mascotte fidèles ; petits textes (« 100 % naturel », « 200 ml »…) brouillés par l'IA ; la 1re glacière S2 montrait des sachets plats au nom déformé → S2 refaite (`k08b_*`, clip Kling 3.0 std 10 s, ≈ 1,3 $) avec seulement des boîtes debout. Pour des gros plans à texte net : superposer le vrai emballage en post-production.
- Prononciation (retour de Carry) : « Bissa Pop » dit « Bissa papop », « trois cents francs » mal articulé, « bien » dit « bienne ». Clips S2 et S3 régénérés (Kling 3.0 std, ≈ 2 $) avec : nom écrit « Bissa Pop », consignes phonétiques (« bee-sa pop », « trwa-sahn frahn », « bee-yan » nasal), virgule à la place des points de suspension. Voix et timbre gardés (validés). À valider à l'écoute ; sinon : 3e essai ou doublage ElevenLabs de ces seules répliques.
- Retours de Carry (2e tour) : Marie dit encore mal « Bissa Pop », la vendeuse dit mal « trois cents francs », et en S3 la dame et la glacière derrière Marie doivent être la même vendeuse, à droite comme en S2. S3 : nouvelle image clé `k09b_*` (vendeuse + glacière à droite). S2 régénérée en 2 variantes (v4d / v4e : « Bissapop » en un mot « bi-sa-pop », « trois cents » dit une fois) ; S3 régénérée (7 s). Contrôle automatique des voix impossible (quota ElevenLabs épuisé : 9 crédits) → validation à l'écoute par Carry. Si encore faux : doublage des seules répliques fautives (ElevenLabs rechargé) puis synchronisation labiale.
- Retenu par Carry (24 oct.) : version **v4e** des scènes 1 à 3 (S2 « C'est trois cents francs, ma fille ») jugée « mieux que les autres ». Clips sources (scratchpad, non versionnés) : `clip_s1.mp4`, `clip_s2e.mp4`, `clip_s3c.mp4`. Reste éventuellement à affiner la diction au doublage final.

## 24 oct. 2026 — film complet 120 s, version 1 (16:9)
- Images clés 4–12 : Grok Image 2.0 (API, 0,07 $ pièce), décor + portrait de référence → `images-cles/k04…k12`.
- 13 clips Kling 3.0 std (son natif pour les dialogues) : S4 Marie (7 s), S5 Angèle Paris (6 s), S6a Marie (5 s), S6b Angèle (5 s), S7 Foel Montréal (10 s), S8 Messie Tokyo (10 s), S9 Sita Abidjan (12 s), S10 verre d'eau (8 s), S11 4 plans de toast muets (3 s), S12 Clémence (7 s). ≈ 11 $.
- Post-production (Python/Pillow/ffmpeg, scripts dans `post/`) : insert téléphone (appel d'Angèle — Paris → données mobiles → KOMYO, 4,2 s), mosaïque des cinq lieux avec heures (BRAZZAVILLE 12:00, PARIS 12:00, MONTRÉAL 06:00, TOKYO 20:00, ABIDJAN 11:00) et logo officiel, carte finale (logo officiel avec slogan, « Télécharge KOMYO », komyo.starentreprise.com), musique afro-soul synthétisée (piano électrique, basse, guitare claire, vibraphone, percussions douces) avec ducking sous les voix, voix officielle de Clémence « KOMYO, le monde en mouvement » (extrait de `komyo-intro-voix-monde-v1.mp3`), normalisation −16 LUFS.
- Livré à Carry pour validation : `KOMYO_monde_en_mouvement_120s_v1_leger.mp4` (scratchpad, non versionné). Non fait : télécommande et gilet HIGGSFIELD (droits à valider), déclinaisons 60/30/15 s, 9:16, 1:1, version 4K.
- Non vérifié : prononciation et voix des plans 4 à 12 (contrôle automatique impossible, quota ElevenLabs épuisé).

## 24 oct. 2026 — plan de correction des voix (à lancer après recharge ElevenLabs)
- Constat de Carry sur le film v1 : voix mauvaises, prononciation fausse, voix de Clémence différente de sa voix officielle. Cause : voix natives de Kling (différentes à chaque clip). Images, décors, musique, insert téléphone, mosaïque, carte finale : à garder.
- Solde Higgsfield annoncé par Carry : 11,36 $. ElevenLabs : 9 crédits restants sur 10 000 → recharge nécessaire (~1 000–2 000 crédits suffisent pour les répliques).
- Méthode : une voix ElevenLabs fixe par personnage (Clémence = « Clémence - Advertising », id LFo5X4P9PhYaOLBA9Hyh), répliques épelées phonétiquement, puis plans parlés à une seule personne, lèvres pilotées par le fichier audio : Wan 2.7 image→vidéo (`wan/v2.7/image-to-video`, champ `audio_url`, 1,00 $ les 10 s). Alternative testable : Seedance 2.5 reference-to-video (`bytedance/seedance-2.5/reference-to-video`, images + `audio_urls`, ≈ 0,21 $/s) pour les plans à deux personnes.
- Ordre : (1) test Clémence sur Wan (~0,70 $) ; (2) si insuffisant, même plan sur Seedance 2.5 (~1,44 $) ; (3) refaire ~60 s de plans parlés (~6–7 $) ; (4) remontage (`post/assemble.py`) puis déclinaisons 60/30/15 s, 9:16, 1:1.
- Prix Kling 3.0 std : 0,126 $/s avec son, 0,084 $/s sans son (utile pour un teaser X SAPHIR muet avec musique).

## 24 oct. 2026 (soir) — voix refaites : abonnement ElevenLabs Starter pris, test Clémence
- Carry a pris ElevenLabs « Démarreur » (1 $ le 1er mois, puis 6 $/mois, 30 000 crédits, licence commerciale). **À annuler avant le renouvellement si inutile** (Abonnement → Facturation).
- Voix de Clémence validée par Carry (« c'est sa voix ») : `eleven_v4`, voix `LFo5X4P9PhYaOLBA9Hyh`, réplique « Je vous l'avais dit : vous êtes formidables. Voici notre surprise. » (66 crédits).
- Test lèvres : Wan 2.7 image→vidéo (`wan/v2.7/image-to-video`, `audio_url` = mp3 hébergé via media_upload, 5 s, 720p, ≈ 0,50 $) sur l'image clé `k12_clemence` : bouche animée sur l'audio, visage stable. Fichier d'essai : `lip_clemence_test_v1.mp4` (scratchpad).
- Reste : choisir une voix fixe pour Marie, la vendeuse, Angèle, Foel, Messie, Sita ; générer les répliques ; plans à une personne en Wan 2.7 ; remonter avec `post/assemble.py` ; déclinaisons.

## 24 oct. 2026 — retours de Carry sur le film v1 : eau, vue immergée, logo téléphone
- **Eau qui moussait** : l'image de départ du plan du verre montrait déjà des bulles blanches ; Kling les a amplifiées. Refait : image Grok « eau transparente, ni mousse ni lait » (`k10_w1a`) puis clip Kling 3.0 std muet 4 s.
- **Vue « comme dans l'eau, avec les vagues »** (brief : traverser symboliquement le verre) : nouvelle image sous-marine (`k10_w2_sous_leau`) + clip Kling muet 5 s, caméra qui remonte vers la surface (vagues, rayons, bulles). Fondu enchaîné 0,7 s entre les deux (`s10_new.mp4`, 8,3 s). La mosaïque des cinq visages apparaît ensuite **vue à travers la surface** : déformation ondulée qui se calme en 2,2 s, teinte bleu-vert (`mosaic.py`). Bruitages synthétiques de l'eau : `post/watersfx.py`.
- **Logo coupé dans le téléphone** : le « K » avait été découpé trop court. Corrigé : écran de l'appli = logo officiel complet (K + KOMYO + slogan), icône d'appli = `komyo-k-v2.png` (K entier).
- Coût : ≈ 1 $ (2 images 0,14 $ + 9 s de vidéo muette 0,76 $).
- **2e tour sur l'eau (Carry)** : « eau claire du verre, pas l'océan ; reflet flou et zoomé de ce qui entoure ; celle qui tient le verre et se sert, c'est Sita ; le filet d'eau s'arrêtait en l'air ». Refait en 3 plans silencieux Kling 3.0 std (≈ 1,0 $) : `k10_wa_sita_verse` (Sita verse l'eau dans le verre qu'elle tient, filet continu), `k10_wb_macro_filet` (macro du filet qui entre dans l'eau), `k10_wc_dans_le_verre` (vue de l'intérieur du verre, reflet flou/agrandi de la boutique et du visage de Sita). Assemblés en `s10_v3.mp4` (10 s, fondus de 0,5 s) ; la mosaïque apparaît ensuite à travers la surface (teinte neutre, plus de bleu-vert). Les anciens plans « océan » sont abandonnés.
- **3e tour sur l'eau (Carry)** : le gros plan (capture 1) est validé ; le plan de Sita (capture 2) faisait « on montre le verre à quelqu'un » : main et verre trop hauts, regard caméra. Carry a envoyé des images de référence (versements d'eau, bulles, boire au verre, éclaboussure) comme guides de vues de caméra à combiner. Refait : verre **posé sur le comptoir**, Sita le stabilise du bout des doigts, pichet bas, regard vers le verre, caméra à hauteur de comptoir (`k10_wd_sita_naturelle`, clip Kling muet 5 s ≈ 0,42 $). Références utilisées uniquement comme guide de gestes (non reproduites, non versionnées). Séquence `s10_v4.mp4` : 4,0 s + gros plan 3,4 s + intérieur du verre 4,0 s, fondus de 0,5 s = 10,5 s.
- Idées de la sélection de Carry encore disponibles : Sita qui boit une gorgée (profil, verre incliné), éclaboussure macro pour la transition.
- **Idée de Carry : « le passage de l'eau ouvre le passage à Clémence »**, avec une vidéo d'inspiration (gros plan de profil d'une femme qui boit, verre incliné, niveau d'eau visible, lumière chaude de côté ; vidéo non reproduite, non versionnée). Nouvelle fin proposée : Sita se sert → gros plan du filet → intérieur du verre (reflet flou) → les cinq visages vus à travers la surface (mosaïque raccourcie à 8 s, ondulations au début et à la fin) → fondu ondulé vers **Clémence qui boit** en gros plan de profil (`k11_clemence_boit`, image Grok + clip Kling muet 6 s ≈ 0,50 $ : elle boit, baisse le verre, ouvre les yeux, se tourne vers la caméra en souriant) → plan de Clémence qui parle (Wan 2.7, voix officielle) → carte logo. Séquence d'essai : `sequence_eau_clemence_v1.mp4` (28 s).
- Durée visée du film après ce remaniement : eau 10,5 s + mosaïque 8 s + Clémence boit 6 s + Clémence parle ≈ 5 s + carte finale ≈ 9 s.

## 24 oct. 2026 (soir) — continuité Sita + vrai visage de Clémence
- **Retours de Carry** : Sita qui verse puis boit doit **rester au téléphone, à l'oreille du bon côté** (dans la boutique, S9, elle tient le téléphone de la main droite → oreille droite, côté gauche de l'image) ; **garder les vrais visages** (personnages, Sita, Clémence) ; le plan de l'eau chez Sita est **conservé** (il ouvre la séquence).
- **Sita** : nouvelles images clés avec portrait + image de S9 en références (`k12_sp_verse_tel` : téléphone à l'oreille droite, elle verse de la main gauche ; `k12_sp_boit_tel` : elle boit de la main gauche, téléphone toujours à l'oreille droite). Clips Kling muets 4 s + 3 s.
- **Clémence** : le visage généré précédemment ne portait pas ses vrais détails (clous d'oreilles au lieu des boucles dorées en goutte, pas de médaillon). Nouvelle référence d'identité : le gros plan de son visage tiré de la vidéo officielle (`off_face.png`, agrandi 2×). Images clés `k12_cl_boit_vrai` et `k12_cl_parle_vrai` (boucles d'oreilles dorées en goutte, chaîne et médaillon, blazer ivoire sur haut bleu à liseré or). Clip boit (Kling muet 6 s) et clip parle (Wan 2.7 sur sa voix officielle, 5 s).
- Séquence d'essai `sequence_eau_clemence_v2.mp4` (30 s) : Sita verse (3,6 s) → gros plan du filet (3,4 s) → Sita boit (3 s) → dans le verre (4 s) → mosaïque des cinq visages vus à travers l'eau (8 s) → Clémence boit (6 s) → Clémence parle (5 s).
- Coût de ce tour ≈ 1,7 $ (4 images 0,28 $ + 13 s de Kling muet ≈ 1,1 $ + 5 s Wan 0,5 $). Solde estimé de la clé Higgsfield : ≈ 6 $.
- **Retours de Carry sur la séquence (captures de la v1)** : (1) dans la vue « dans le verre », on voyait la tête de Sita en haut sans que son corps se reflète dans l'eau → partie retirée : recadrage du plan (`clip_w3c_crop.mp4`, on ne garde que l'eau et le reflet flou des étagères) ; (2) les cases de la mosaïque étaient trop petites → refaites en **5 cases verticales plus grandes** (248×560 px, 6 px d'écart, visages recadrés, une légende lieu + heure sous chaque case, plus de case logo), ondulations d'eau au début et à la fin (`mosaic.py`). Marie : plan de la connexion (S6a, sourire) plutôt que le toast.
- Séquence d'essai `sequence_eau_clemence_v3.mp4` (30 s). Aucun coût de génération pour ce tour (retouches de montage).
