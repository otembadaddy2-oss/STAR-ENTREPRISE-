# Générateur du dossier institutionnel STAR ALERTE

Produit `docs/star-alerte-dossier-presentation.pdf` — le dossier de 13 pages
présentant STAR ALERTE aux autorités compétentes de la République du Congo.

## Étapes

1. Servir `star-alerte/` en local (ex. `python3 -m http.server 8099` à la
   racine du dépôt) puis lancer `pdf_shots.js` (Playwright, avec caméra/micro/
   géolocalisation simulés) pour capturer des écrans réels de l'application,
   remplis d'exemples réalistes (signalement d'accident RN1, position de
   Brazzaville, etc.).
2. Copier les captures produites à côté de `dossier.html` (même dossier).
3. Lancer `render_pdf.js` (Playwright) : sert `dossier.html` en local puis
   exporte un vrai PDF vectoriel via `page.pdf()`, avec numérotation
   automatique des pages et la mention « Conçu par STAR ENTREPRISE » en bas
   à droite de chaque page (pied de page injecté par Playwright, pas par le
   HTML).

Les captures d'écran intermédiaires ne sont pas versionnées ici (régénérables
en quelques secondes) — seul `docs/star-alerte-dossier-presentation.pdf`,
le livrable final, est commité.

## Ré-exécution

```
pip install playwright  # ou npm — le rendu utilise le Playwright global de l'environnement
cd /chemin/vers/STAR-ENTREPRISE-
python3 -m http.server 8099 &
node pdf_shots.js
cp pdf_shots/*.png tools/dossier-pdf/
python3 -m http.server 8098 --directory tools/dossier-pdf &
node render_pdf.js
```
