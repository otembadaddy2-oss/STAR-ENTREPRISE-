# Générateur du plan de croissance & campagne publicitaire

Produit `docs/plan-croissance-campagne-star-entreprise.pdf` — plan d'action de
15 pages pour le Marketplace STAR ENTREPRISE : campagne publicitaire à deux
publics (vendeurs / acheteurs), programme d'ambassadeurs, offre de lancement,
partenariat Mobile Money, 10 nouvelles sources de revenus, textes
publicitaires Meta Ads &amp; WhatsApp prêts à coller, et paramètres de
ciblage exacts pour Meta Ads Manager.

Ce document est la suite directe de `tools/marche-pdf/` (étude de marché) —
mêmes chaîne de rendu et système visuel.

## Ré-exécution

```
cd tools/campagne-pdf
python3 -m http.server 8096 &
node render_pdf.js   # nécessite Playwright (module global de l'environnement)
```

Le PDF est généré dans le scratchpad de session ; le copier ensuite vers
`docs/plan-croissance-campagne-star-entreprise.pdf`.
