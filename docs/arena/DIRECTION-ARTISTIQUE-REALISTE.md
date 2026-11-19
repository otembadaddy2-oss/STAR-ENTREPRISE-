# X SAPHIR ARENA — passage au rendu réaliste (direction artistique)

Statut : **préparé, rien n'est encore généré** (les crédits Higgsfield ne sont dépensés qu'avec l'accord de Carry).
Dernier relevé (19/11/2026) : solde Higgsfield 10,73 crédits (offre « plus »). Estimation d'une image au modèle gpt_image_2_6 : **0,25 crédit**.

## 1. Ce que montrent les 3 vidéos de référence (images extraites et vues le 19/11/2026)
Rendu 3D de jeu de combat moderne, cadrage vertical 9:16 :
- personnages **réalistes** : matières crédibles (tissu, cuir, métal, peau), lumière de contour (« rim light »), reflets ;
- **caméra de cinéma** : plongées, contre-plongées, gros plans qui bougent pendant les coups ;
- **effets d'énergie** : traînées lumineuses, onde de choc, particules, flash blanc à l'impact, couleur propre à chaque personnage ;
- **décors vivants** : arène avec foule, ciel dramatique, sol brillant avec symbole, fumée et braises ;
- présentation : jauges de vie, nom du combattant, pose de victoire, ralenti au K.O.
Les personnages et décors de ces vidéos appartiennent à leurs auteurs : on reprend **le niveau de réalisme et de mise en scène**, jamais leurs personnages, leurs coups, leurs musiques ni leurs plans.

## 2. Nos 4 combattants (fiches existantes : arena/img/*-art.jpg)
| Combattant | Idée forte | Couleurs / matières | Énergie |
|---|---|---|---|
| CALPROS | Le porteur des Trois Forces ; jeune homme sobre qui se transforme | armure noire et or, plusieurs « tomes » d'évolution, symbole X | onde Saphir (bleu-or) |
| NIA MENSAH | Ingénieure ghanéenne, « architecte magnétique » | armure articulée noir/or, gants-aimants, tresses | polarité, disques polaires |
| AYANDA ZULU | Guerrière zouloue, « le Phénix » | or, noir, perles, lance, ailes de feu | feu du phénix |
| KOR-MAL | La menace rouge, colosse de lave | roche noire fissurée, braise rouge, cornes | onde rouge sombre |

## 3. Règles de rendu (identiques pour toute la série)
- Même éclairage : rim light bleu-doré, fond neutre pour le détourage.
- Hauteur, carrure et proportions fixes par personnage (voir `scale` dans arena/js/data.js : 1.0, 0.98, 1.0, 1.14).
- Tenues de combat sobres et dignes : aucun contenu sexualisé (le jeu est tout public ; les fiches existantes d'Ayanda sont plus suggestives que ce que le jeu doit montrer).
- Fond uni vert/gris pour pouvoir détourer proprement (outil de retrait de fond), un fichier PNG transparent par pose.

## 4. Liste des poses par combattant (8)
`idle` (garde de repos) · `punch` (coup de poing lancé) · `kick` (coup de pied) · `block` (garde) · `jump` (saut) · `hit` (touché) · `super` (super / invocation d'énergie) · `win` (victoire).

## 5. Modèle de prompt (à adapter par personnage) — français, à passer à Higgsfield
> « Rendu 3D de jeu de combat photoréaliste, plan américain en pied, <PERSONNAGE> : <description fixe>. Pose : <pose>. Éclairage de cinéma, lumière de contour bleue et dorée, matières réalistes (peau, tissu, métal), pores et coutures visibles, fond uni gris neutre, vertical 9:16, sans texte, sans logo, personnage unique centré. »

Descriptions fixes (à partir des fiches) :
- **CALPROS** : « jeune homme noir athlétique, 25 ans, armure noire mate à motifs or, symbole X doré sur la poitrine, regard déterminé, énergie bleu saphir dans les mains ».
- **NIA MENSAH** : « jeune femme ghanéenne, tresses nouées, armure articulée noir et or avec gants magnétiques lumineux, regard d'ingénieure concentrée ».
- **AYANDA ZULU** : « guerrière zouloue puissante, peau mate, bijoux de perles dorées, tenue de combat noire et or sobre, lance courte, aura de feu orange ».
- **KOR-MAL** : « colosse de roche noire fissurée, lave rouge incandescente entre les plaques, cornes courtes, yeux de braise, aura rouge sombre ».

## 6. Plan de dépense (à valider par Carry)
1. **Essai : 4 images** (une par personnage, pose `idle`) ≈ 4 × 0,25 = **1 crédit**. Carry juge la qualité.
2. Si OK : 7 poses restantes × 4 personnages = 28 images ≈ **7 crédits** + détourage (coût à estimer avant, probablement très faible par image).
3. Total estimé ≈ **8 à 9 crédits** sur 10,73 disponibles. Estimation à reconfirmer pour chaque modèle ; un modèle plus puissant peut coûter davantage.
4. Cohérence d'un même personnage d'une pose à l'autre : utiliser la fiche (`*-art.jpg`) comme image de référence à chaque génération.

## 7. Limites honnêtes
- Des **images fixes** ne font pas une animation fluide : dans le jeu, on enchaîne les poses avec des mouvements calculés par le code (glissement, rebond, flash, ralenti). C'est correct et léger, mais **pas le niveau d'un vrai modèle 3D animé** comme dans les vidéos. Ce niveau exige des modèles 3D (Blender) et des animations : un projet de plusieurs semaines.
- Le style de chaque image varie un peu d'une génération à l'autre : il faudra trier et parfois regénérer.
- Intégration dans le jeu : une fois les images reçues, ajout d'un affichage « poses réalistes » avec repli automatique sur le dessin actuel si une image manque. Non commencé tant que les images n'existent pas.
