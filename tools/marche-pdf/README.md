# Générateur de l'étude de marché e-commerce Afrique

Produit `docs/etude-marche-ecommerce-afrique.pdf` — étude de 16 pages sur le
marché du e-commerce au Congo-Brazzaville, Gabon, Angola, Côte d'Ivoire,
Ghana, Mali, Burkina Faso, Guinée-Bissau, Guinée-Conakry et Kenya, avec
diagnostic transversal et propositions concrètes pour le Marketplace
STAR ENTREPRISE.

Les données citées proviennent de recherches web (DataReportal, GSMA,
Statista, ECDB.com, IMARC Group, Communications Authority of Kenya, presse
spécialisée africaine, rapports Jumia, etc.) — sources listées en dernière
page du document. Les zones où aucune donnée fiable n'a été trouvée sont
signalées explicitement plutôt qu'estimées.

## Ré-exécution

```
cd tools/marche-pdf
python3 -m http.server 8097 &
node render_pdf.js   # nécessite Playwright (module global de l'environnement)
```

Le PDF est généré dans le scratchpad de session ; le copier ensuite vers
`docs/etude-marche-ecommerce-afrique.pdf`.
