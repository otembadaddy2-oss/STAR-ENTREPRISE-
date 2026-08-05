# STAR ENTREPRISE — Vos idées. Notre éclat. Un diamant.

Site vitrine + application installable (PWA) + business plan 5 ans pour **STAR ENTREPRISE**, agence digitale fondée par **Carry OTEMBA** (Brazzaville, République du Congo), spécialisée dans la conception de sites web, d'applications mobiles et de boutiques en ligne (nourriture, cosmétiques, mode, accessoires…) pour tout secteur.

## Contenu du site

| Page | Description |
|---|---|
| `index.html` | Accueil — hero, services, méthode, secteurs, témoignages |
| `services.html` | Détail des offres (web, mobile, e-commerce, branding, marketing, support) + formules |
| `realisations.html` | Portfolio filtrable par catégorie |
| `business-plan.html` | Résumé interactif du business plan 5 ans + lien de téléchargement PDF |
| `apropos.html` | Fondateur, mission, vision, valeurs, trajectoire |
| `contact.html` | Formulaire de contact → relais WhatsApp automatique |
| `application.html` | Présentation et installation de l'application (PWA gratuite, sans store) |

## Fonctionnalités clés

- **Design 100% sur-mesure** (aucun framework CSS externe), thème "diamant" (violet/cyan/or), animations au scroll, micro-interactions.
- **Bilingue FR|EN** — sélecteur de langue dans la barre de navigation (`assets/js/i18n.js`), traduit le site et Jardissa à la volée, préférence mémorisée (localStorage).
- **Jardissa** (`assets/js/jardissa.js`) — assistante virtuelle bilingue : répond aux questions fréquentes (services, tarifs, délais, secteurs) et relaie toute demande de devis directement vers le WhatsApp du fondateur pour validation humaine avant réponse engageante.
- **Intégration WhatsApp** — bouton flottant + formulaires qui génèrent un message pré-rempli vers `+242 06 656 50 50`.
- **Application installable gratuite (PWA)** — `manifest.json` + `sw.js` : installation en un clic depuis le navigateur (Android/iOS/desktop), fonctionne hors-ligne, sans passer par un store.
- **Business plan 2026–2031** — étude de marché, modèle économique, organisation, feuille de route, plan financier détaillé, SWOT — généré en PDF dans `docs/business-plan-star-entreprise.pdf`.

## Performance

Le site pèse **~330 Ko au total** (HTML+CSS+JS+icônes+PDF inclus) — aucune photo lourde, uniquement des graphismes vectoriels (SVG). CSS et JS sont minifiés (`terser` / `clean-css`). Les polices Google Fonts se chargent en asynchrone (technique `media="print" onload`) pour ne jamais bloquer l'affichage, important sur les connexions mobiles plus lentes. `.htaccess` (Apache/Hostinger) et `_headers` (Netlify) activent la compression Gzip et la mise en cache navigateur.

## Lancer le site en local

Aucune dépendance ni build : c'est du HTML/CSS/JS statique.

```bash
python3 -m http.server 8080
# puis ouvrir http://localhost:8080/index.html
```

## Déploiement

Le site est un site statique standard : il peut être déployé tel quel sur Netlify, Vercel, GitHub Pages ou tout hébergement statique. Le dossier racine contient déjà tous les fichiers nécessaires (`manifest.json`, `sw.js`, `docs/`, `assets/`).

## Structure

```
index.html, services.html, realisations.html, business-plan.html,
apropos.html, contact.html, application.html
assets/
  css/style.css        — design system complet
  js/main.js            — navigation, animations, formulaires
  js/jardissa.js         — assistante virtuelle
  js/pwa.js               — installation PWA
  img/icons/               — favicon + icônes d'application
manifest.json, sw.js
docs/business-plan-star-entreprise.pdf
```

## Notes

- Le numéro WhatsApp du fondateur (+242 06 656 50 50) est centralisé dans `assets/js/main.js` (`STAR_WA_NUMBER`).
- L'application mobile est livrée comme **PWA installable gratuitement** (aucun compte développeur requis). Une version native Android/iOS sur les stores officiels est planifiée dans la feuille de route du business plan (page 9 du PDF).
