# X SAPHIR ARENA réaliste — personnages et pouvoirs (version de travail du 19/11/2026)

Demande de Carry : plus de 4 combattants ; **personnages différents, pouvoirs différents** ; ennemis démoniaques déchaînés ; combos, intensité, vrais mouvements ; qualité « meilleure que Street Fighter », style réaliste de l'affiche. Un long métrage X SAPHIR (Cycle I, d'après les BD) est aussi prévu : le jeu et le film partagent les mêmes personnages et la même direction artistique.

Légende : **[canon]** = déjà dans les documents du projet (BD, scénario) ; **[proposition]** = idée à valider par Carry, à ne pas considérer comme fixée.

## Deux ennemis distincts (corrigé le 19/11 d'après les catalogues de Carry)
| | SATANA NAKATA | KOR-MAL |
|---|---|---|
| Rôle | **Boss final**, Seigneur des Enfers, souverain suprême de l'En-Bas | Démon manipulateur, antagoniste majeur, « celui qui nourrit la colère » |
| Apparence | **Homme** à barbe et dreadlocks, yeux rouges, balafre, grande couronne dorée à deux cornes et rubis, armure impériale noire et dorée à crânes d'or, cape rouge | **Colosse de roche noire et lave**, deux cornes courbes, couronne dorée brisée, chaînes, bannière rouge déchirée |
| Pouvoirs | Flammes infernales, contrôle des âmes, corruption, manipulation, stratégie millénaire [canon : catalogue Cycle II] | Amplifie les colères cachées, corrompt les émotions, déforme les transformations, rend les armures plus monstrueuses [canon : catalogue] |
| Style de combat (jeu) | [proposition] Lent et écrasant, magie de zone, invocation d'âmes enchaînées, contrôle de l'espace, super « Loi des Enfers » | [proposition] Corps à corps brutal, rage qui monte (barre de colère), saisies, corruption : il transforme les coups reçus en dégâts |

## Les 4 combattants déjà dessinés
| Personnage | Pouvoir [canon] | Style de combat [proposition] |
|---|---|---|
| CALPROS | Fusion avec l'Astéronium, armure or-bleu, forme blanche et or (Tome 10) | Équilibré : onde Saphir, anti-aérien « Ascension », super « Force Divine » |
| NIA MENSAH | Architecte magnétique | Contrôle : disques polaires, attraction, rempart |
| AYANDA ZULU | Phénix, feu, « VUKA ! » | Rapide : feu, anti-aérien, vol de feu |
| STEEL PURSUIT : NYRA VOLT, VIPERA SHADE, LUNA BLAZE (+ une 4e à nommer) | Hackeuse, infiltration, vitesse (fiches de Carry) | Réservées au jeu de course/poursuite (autre mode) |

## Combattants à ajouter pour dépasser 4 (tirés des BD, pouvoirs à confirmer par Carry)
| Personnage | Ce qu'on sait [canon] | Idée de pouvoir [proposition] |
|---|---|---|
| YAW | « Armure lion » (Tome 4) | Force et charges, rugissement qui étourdit |
| RASIA | Ronces ; a volé la carte des Neuf Portes | Piégeuse : ronces au sol, entraves |
| AMINA (de Bamako) | Arrive au Tome 1 | À définir avec Carry |
| NAOMIE | Dessine la neuvième porte | Soutien : portes, déplacements instantanés |
| KORA / KORA Zéro | Intelligence du Nova Lab, née de la première fusion avec l'Astéronium | Hologrammes, anneaux d'or, mémoire du monde |
| MORDREK | Géant enchaîné de l'En-Bas | Boss intermédiaire massif, chaînes |
| Géants rouges / signatures ennemies | Tome 9 | Sous-boss |

Objectif proposé : **8 combattants jouables + 3 boss** (Mordrek, Kor-Mal, Satana Nakata) pour la première version du jeu réaliste.

## Ce qui rend un combat « intense » (cahier des charges pour la construction)
- Chaîne de coups (combos), jauge de super, ralenti à l'impact, tremblement d'écran, étincelles et éclats de matière, poussière.
- Trois niveaux de coups par personnage + un spécial par direction + un super + une « transformation » (Calpros → forme blanche et or ; Kor-Mal enragé).
- Mode « rage de démon » : le boss gagne de nouvelles attaques sous 30 % de vie.
- Sons d'impact synchronisés, voix de l'annonceur, musique par décor.

## Plan de réalisation (après la mise en ligne actuelle)
1. **Valider** la liste des combattants et leurs pouvoirs avec Carry.
2. **Images réalistes de chaque pose** (garde, coups, saut, touché, victoire, super) : ≈ 0,25 crédit l'image ; Calpros et Satana Nakata d'abord.
3. **Nouveau moteur d'affichage** utilisant ces images avec animations calculées (glissements, ralentis, effets), en gardant le moteur de combat actuel (testé).
4. **Mode Steel Pursuit** (course/tir) comme jeu séparé.
5. Version téléphone + PC avec le réglage « Économie » (pas de surchauffe).
Limite honnête : des images fixes animées par le code ne valent pas des modèles 3D animés ; le niveau « film » demande des vidéos générées par plan (Higgsfield) ou un vrai pipeline 3D, plus cher et plus long.
