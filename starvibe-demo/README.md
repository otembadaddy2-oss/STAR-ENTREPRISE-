# STAR VIBE — démo cliquable

Prototype de démonstration : les 9 écrans de la maquette STAR VIBE, reliés
entre eux pour qu'on puisse naviguer d'écran en écran en cliquant, comme
dans une vraie application. **Rien n'est fonctionnel derrière** (pas de
vrais comptes, pas de vraies vidéos) — c'est uniquement pour donner une
sensation réaliste lors d'une présentation.

Ouvrir `index.html` — c'est la coquille (téléphone + barre d'outils
Retour/Recommencer) qui charge chaque écran dans un iframe et gère la
navigation entre eux via `parent.go('NomEcran')` et `parent.toast(...)`,
appelés depuis chaque écran.

## Parcours câblés

- Splash → (auto, 2,4s ou clic) → Promo
- Promo → Passer / Continuer → Login
- Login → « Moi-même » → Créer mon compte → Main
- Login → « Mon enfant (3–6 ans) » → Créer mon compte → KidsHome
- Main : barre du bas (Accueil / Découvrir / + / Messages / Profil),
  toucher la vidéo fait défiler vers CleanCity
- CleanCity : même barre, Accueil ramène à Main
- Upload : flèche retour → Main, Publier → confirmation puis Main
- KidsHome : tuile « Rue propre » → KidsLesson (les autres tuiles
  affichent « bientôt disponible »)
- KidsLesson : Leçon suivante → retour à KidsHome

## Régénérer les écrans

Les fichiers `*.html` (hors `index.html`) sont générés depuis les
originaux `.dc.html` de la maquette de design via un script de
transformation (ajout d'identifiants + petit script de navigation par
écran). Si la maquette source change, il faut relancer cette
transformation plutôt que d'éditer ces fichiers à la main.
