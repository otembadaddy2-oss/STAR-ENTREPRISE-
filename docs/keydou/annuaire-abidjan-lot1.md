# Annuaire d'Abidjan pour Keydou — lot 1 (préparé, pas encore en service)

Préparé le 22 octobre 2026. **Rien n'est visible par les clients** : les fichiers sont gardés dans le dépôt, Keydou ne les lit pas encore.

## Contenu

| Fichier | Rôle |
|---|---|
| `netlify/functions/keydou-annuaire-abidjan-lot1.json` | 66 fiches (même format que l'annuaire du Congo) |
| `netlify/functions/keydou-urgences-abidjan.json` | Numéros d'urgence de Côte d'Ivoire (180, 185, 110/111/170), à valider |
| `tools/keydou-annuaire-abidjan.js` | Le « générateur » : on corrige ou on ajoute une fiche dedans, puis `node tools/keydou-annuaire-abidjan.js` réécrit les deux JSON |

Répartition : hôtels 13, restaurants 8, voyages 10, supermarchés 6, banques 5, santé 4, sport 3, mariage 3, voiture 3, mécanique/vente auto 3, événementiel 2, spa 2, beauté 1, bureau 1, station 1, pharmacie 1.
**32 fiches ont un numéro, 34 n'en ont pas encore** (marquées « Numéro non publié : à chercher »).
Fiabilité : A = 1 (Emirates, page officielle), B = 13, C = 52. **Aucune fiche n'est « vérifiée par appel ».**

## Règles suivies

- Aucun numéro inventé : un numéro n'apparaît que s'il est écrit dans une source consultée (listes de l'ambassade d'Allemagne, du Royaume-Uni, DAT/Climate Chance 2026, Pages Jaunes Abidjan.net, annuaires en ligne, page officielle Emirates).
- **Réforme de la numérotation du 31 janvier 2021** : les numéros ivoiriens ont 10 chiffres. Les anciens numéros à 8 chiffres cités par des sources anciennes ont reçu le préfixe **27** seulement quand l'ancien début était 20 ou 22 (fixes Orange à Abidjan, confirmé par plusieurs fiches récentes, ex. 22 48 26 26 → 27 22 48 26 26). Les numéros commençant par 21 (Azalaï, Hertz, Avis, Prosuma, Vivo) sont laissés tels quels : le préfixe (27, 25 ou 21) dépend de l'opérateur et doit être confirmé. Chaque fiche concernée le dit dans sa description.
- Quand deux listes donnent des numéros différents (Mövenpick, Pullman, Azalaï), les deux sont gardés et la fiche le signale.

## Ce qui manque (à compléter dès que possible)

1. Les 34 numéros à chercher (surtout restaurants, salles de sport, salles de mariage, agences de voyages, concessions).
2. Hôtels connus non trouvés : Golden Tulip Le Diplomate, Sunset, Palm Club Hôtel (numéro).
3. Catégories vides : tourisme (parc national du Banco…), loisirs pour enfants, coiffure (une seule fiche), pharmacies de garde.
4. Appeler chaque numéro pour passer les fiches en « vérifié ». Les pages web ne remplacent pas un appel.
5. Autres villes : Yamoussoukro, Bouaké, San-Pédro… et le Ghana (Accra, Kumasi, Tema).

## Pour mettre en service (quand tu donnes le feu vert)

- Côté serveur (`api-starvibe-keydou.mts`) : ajouter « Abidjan » aux villes, deux nouveaux besoins (`sante`, `pharmacie`), l'import du fichier (comme l'annuaire 2026, marqué fait une seule fois) et les urgences de Côte d'Ivoire selon le pays du client.
- Côté page Keydou : liste de villes et de besoins selon le pays, numéro de paiement et monnaie du pays (**à fournir : Orange Money / MTN / Wave en Côte d'Ivoire, MTN MoMo au Ghana**).
- Voix : en anglais Keydou parle avec la voix du téléphone ; des voix enregistrées demandent des crédits (prix donné avant).
