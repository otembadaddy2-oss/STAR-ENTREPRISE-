# STAR GPU — plan pour faire tourner de l'IA générative (version de travail du 19/11/2026)

Demande de Carry : que STAR GPU soit « vraiment capable » de faire tourner des modèles d'IA générative, de A à Z.
Légende : **[mesuré]** = vérifié ; **[proposition]** = à valider ; **[à mesurer]** = seul le téléphone de Carry peut le dire.

## Ce qui est réaliste
- **Texte (petit modèle de conversation)** : réaliste sur téléphone récent et PC. Modèle visé : Qwen2.5-0.5B-Instruct (licence Apache 2.0, comprend le français), en poids compressés 4 bits (~400 Mo à télécharger une seule fois, puis gardé dans le téléphone) [proposition]. Vitesse en mots par seconde : **[à mesurer]** sur le Mali de Carry.
- **Images générées** : beaucoup plus lourd (plusieurs étapes de calcul, gros modèles). Réaliste seulement avec de très petits modèles, qualité limitée, sur PC d'abord. Étape ultérieure, pas promise.
- **Gros modèles (milliards de paramètres)** : non, pas sur un téléphone ; mémoire insuffisante. Ils restent sur serveur.

## Ce que STAR GPU a déjà [mesuré]
Matrices (×3,3 et ×8,3 sur le téléphone de Carry), calculs en parallèle (×53,9), sprites. Il lui manque : les opérations propres aux modèles de langage (normalisation, attention, positions, activation), les poids compressés 4 bits, la mémoire de conversation (cache), le chargement du modèle, et idéalement WebGPU (plus rapide que WebGL2 quand l'appareil le permet) avec WebGL2 en secours.

## Étapes (chacune testée avant la suivante)
1. **Briques de calcul** : RMSNorm, attention, RoPE, SwiGLU, softmax, produit matrice×vecteur en 4 bits. Test : même résultat que le processeur.
2. **Moteur de modèle de langage** : lecture du fichier du modèle, génération mot par mot avec cache. Test indépendant : un petit modèle aléatoire fabriqué avec une bibliothèque de référence, mêmes sorties.
3. **Démo de conversation** (page cachée) : télécharge le modèle une fois, parle français, affiche la vitesse mesurée. Test sur le téléphone de Carry.
4. **Optimisation** : WebGPU quand disponible, repli WebGL2, repli processeur ; réglage chaleur/batterie (mode Économie).
5. **Images** (plus tard) : seulement si l'étape 4 donne de bons résultats.

## Limites honnêtes
- Mon environnement n'a pas de vrai GPU et ne peut pas télécharger les modèles de Hugging Face (accès bloqué) : l'exactitude du moteur sera testée sur un petit modèle aléatoire contre une implémentation de référence ; le vrai modèle et la vitesse ne seront vérifiés que sur le téléphone de Carry.
- Des moteurs gratuits existent déjà (WebLLM, Transformers.js, ONNX Runtime Web). L'intérêt de STAR GPU est qu'il soit à STAR ENTREPRISE, réutilisable comme « clé », avec nos jeux et nos outils. Il ne sera pas forcément plus rapide.
- Rien de tout cela ne rend le GPU plus puissant : la puissance reste celle de la puce de l'appareil.
- Le modèle est un modèle ouvert d'une autre entreprise : respecter sa licence et le citer ; il est moins capable que les grands assistants en ligne.
