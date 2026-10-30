// Construit l'annuaire d'Abidjan — lot 1 (format identique à keydou-annuaire-2026.json).
// Règle : aucun numéro inventé. Un numéro n'apparaît que s'il figure dans une source consultée ;
// les anciens numéros à 8 chiffres (avant le 31/01/2021) sont "convertis" seulement quand le préfixe est sûr (20 et 22 → 27),
// et la fiche le dit. Tout reste "à reconfirmer par appel" (aucune fiche vérifiée).
const fs = require('fs');
const DATE = '22/10/2026';
const SRC = {
  hotelsPdf: 'https://www.climate-chance.org/wp-content/uploads/2026/06/hotels-plateau-cocody-marcory.docx.pdf',
  restosPdf: 'https://www.climate-chance.org/wp-content/uploads/2026/06/restaurants-cocody-plateau-marcory.docx.pdf',
  icao: 'https://www.icao.int/WACAF/African-FPP/Documents/2019/AIRSPACE%20DESIGN%20ABJ/List%20of%20Hotels_hotel%20list.pdf',
  itu: 'https://academy.itu.int/sites/default/files/media/file/4thSCMNotedinformationCtedIvoireFranaisRev.pdf',
  jetro: 'https://www.jetro.go.jp/ext_images/en/events/jafef3/pdf/HOTELHOMOLOGUES_fr.pdf',
  banksSgbc: 'https://www.african-markets.com/fr/bourse/brvm/listed-companies/company?code=SGBC',
  banksBicc: 'https://www.african-markets.com/fr/bourse/brvm/listed-companies/company?code=BICC',
  banksEcoc: 'https://www.african-markets.com/en/stock-markets/brvm/listed-companies/company?code=ECOC',
  banksSibc: 'https://www.african-markets.com/fr/bourse/brvm/listed-companies/company?code=SIBC',
  nsia: 'https://business.abidjan.net/pages-jaunes/details-1-services-aux-entreprises-129-banques-ets-financiers/1455-nsia-banque-cote-divoire',
  kayak: 'https://www.za.kayak.com/Abidjan-Felix-H-Boigny-Airport-Car-Hire.ABJ.cap.ksp',
  discover: 'https://www.discovercars.com/fr/partners/europcar-1990',
  emirates: 'https://www.emirates.com/be/french/help/offices/abj/abidjan/',
  airGabon: 'https://business.abidjan.net/pages-jaunes/details-14-logistique-62-compagnies-aeriennes/548-air-gabon',
  afriq: 'https://business.abidjan.net/pages-jaunes/details-14-logistique-62-compagnies-aeriennes/543-afriqiyah-airways',
  mauritania: 'https://annuaireci.com/entreprises/mauritania-airlines-abidjan-cote-divoire/',
  tunisair: 'https://annuaireci.com/entreprises/tunisair-societe-tunisienne-de-lair-abidjan-cote-divoire/',
  airMer: 'https://business.abidjan.net/pages-jaunes/details-1-services-aux-entreprises-108-agences-de-voyages/13252-air-mer-sarl',
  voyages: 'https://annuaireci.com/categorie/agences-de-voyage/abidjan/',
  prosuma: 'https://eoiabidjan.gov.in/docs/1717086912Supermarket and Retailers.pdf',
  playce: 'https://www.wendelgroup.com/sites/default/files/pdfs/presse/official_opening_of_the_second_playce_shopping_centre_in_abidjan.pdf',
  koaci: 'https://www.koaci.com/article/2021/09/02/cote-divoire/economie/cote-divoire-apres-le-carrefour-market-de-cocody-las-palmas-carrefour-ouvre-un-autre-supermarche-de-proximite-a-marcory-zone-4_153597.html',
  vivo: 'https://business.abidjan.net/pages-jaunes/details-12-matieres-premieres-595-produits-petroliers/22187-vivo-energy',
  toyota: 'https://annuaireci.com/en/entreprises/toyota-cfao-motors-cote-divoire-abidjan/',
  hyundai: 'https://annuaireci.com/entreprises/hyundai-afrique-motors-abidjan-cote-divoire/',
  gym: 'https://annuaireci.com/entreprises/cascade-fitness-abidjan-cote-divoire/',
  gym2: 'https://annuaireci.com/entreprises/espace-brutal-gym-abidjan-cote-divoire/',
  gym3: 'https://annuaireci.com/en/entreprises/vitalis-fit-and-form-abidjan-cote-divoire/',
  eclat: 'https://annuaireci.com/entreprises/institut-de-beaute-eclat/',
  expat: 'https://www.expat.com/en/business/africa/ivory-coast/12_beauty-wellness/',
  regus: 'https://www.regus.com/en/ci/abidjan/cocody/coworking',
  jeckad: 'https://www.goafricaonline.com/ci/1193763-espace-jeckad-evenementiel-abijan-cote-ivoire',
  palm: 'https://www.goafricaonline.com/ci/599654-palm-club-location-salles-lieux-reception-abidjan-cote-ivoire',
  thoanny: 'https://annuaireci.com/entreprises/villa-thoannyd-linstant-africain-abidjan-cote-divoire/',
  hk: 'https://annuaireci.com/entreprises/hk-sono-et-traiteur-abidjan-cote-divoire/',
  cynthe: 'https://annuaireci.com/en/entreprises/cynthe-multi-services-abidjan-cote-divoire/',
  pisam: 'https://business.abidjan.net/pages-jaunes/details-6-biens-de-consommation-et-services-790-sante/8674-polyclinique-internationale-sainte-anne-marie-pisam',
  chu: 'https://business.abidjan.net/pages-jaunes/details-6-biens-de-consommation-et-services-790-sante/22323-centre-hospitalier-et-universitaire-de-cocody-chu-cocody',
  gov: 'https://gov.uk/government/publications/cote-divoire-list-of-medical-facilitiespractitioners/cote-divoire-list-of-medical-facilities',
  de: 'https://abidjan.diplo.de/resource/blob/2747402/f2417f0c5b070f8e60f2b11d19de3869/aerzteliste-2025-data.pdf',
  pharmaOrdre: 'https://annuaireci.com/entreprises/ordre-des-pharmaciens-de-cote-divoire/',
  gardes: 'https://annuaireci.com/en/pharmacies-de-garde/abidjan/',
  restoBlog: 'https://annuaireci.com/blog/les-meilleurs-endroits-ou-manger-a-abidjan-un-guide-culinaire/',
};
const NOTE = (grade, how) => `Annuaire Abidjan lot 1 · ${DATE} · fiabilité ${grade} · ${how} · à reconfirmer par appel`;
const NONUM = 'Numéro non publié : à chercher.';
const E = []; // service, nom, adresse, tel, desc, srcKey, grade, how
const add = (service, nom, adresse, telephone, description, src, grade, how, whatsapp = '') =>
  E.push({ service, ville: 'Abidjan', nom, adresse, telephone, whatsapp, description, source_url: SRC[src] || src, source_note: NOTE(grade, how) });

const OLD = ' (ancien format à 8 chiffres : le préfixe 27 a été ajouté d\'après la réforme du 31/01/2021)';
// ---- HÔTELS
add('hotel', 'Sofitel Abidjan Hôtel Ivoire', 'Boulevard Hassan II, Cocody', '+225 27 22 48 26 26', 'Hôtel de luxe. E-mail : sofitel.abidjan@sofitel.com. Restaurant Le Toit d\'Abidjan.', 'hotelsPdf', 'B', 'liste hôtels Climate Chance 2026');
add('hotel', 'Pullman Abidjan', 'Rue Abdoulaye Fadiga, Plateau', '+225 27 20 33 40 00', 'Hôtel. E-mail : abidjan.reservation@accor.com. Attention : le même numéro et le même e-mail sont cités pour le Mövenpick dans une autre liste.', 'hotelsPdf', 'C', 'liste hôtels Climate Chance 2026 (numéro cité aussi pour un autre hôtel)');
add('hotel', 'Noom Hôtel Abidjan Plateau', 'Boulevard Général de Gaulle, Plateau', '+225 25 20 00 80 00', 'Hôtel avec spa (massages). E-mail : info.abidjan@noomhotels.com', 'hotelsPdf', 'B', 'liste hôtels Climate Chance 2026');
add('hotel', 'Novotel Abidjan', 'Plateau', '+225 27 20 31 80 00', 'Hôtel Accor, fax cité : 20 31 80 20.' + OLD, 'itu', 'C', 'liste ITU, numéro à 8 chiffres converti');
add('hotel', 'Azalaï Hôtel Abidjan', 'Marcory', '+225 21 222 555 / +225 21 26 50 34', 'Hôtel avec spa. Deux numéros cités selon la liste (ITU / ICAO 2019), anciens formats à 8 chiffres : préfixe à confirmer. E-mail : reservationaha@azalaihotels.com', 'itu', 'C', 'listes ITU et ICAO 2019, numéros à 8 chiffres non convertis');
add('hotel', 'Radisson Blu Abidjan Airport', 'Port-Bouët (aéroport)', '+225 21 22 20 00', 'Hôtel près de l\'aéroport. E-mail : mne.abidjan@radissonblu.com. Ancien format à 8 chiffres : préfixe à confirmer.', 'icao', 'C', 'liste ICAO 2019, numéro à 8 chiffres non converti');
add('hotel', 'Hôtel Tiama', 'Plateau', '+225 27 20 31 33 33 / +225 27 20 31 32 32 / +225 27 20 31 30 31', 'Hôtel du Plateau (chambre standard/double : 95 000 à 110 000 FCFA selon la liste 2026). E-mail : com@hotel-tiama.ci', 'hotelsPdf', 'B', 'listes Climate Chance 2026 et DAT');
add('hotel', 'Mövenpick Hôtel Abidjan', 'Plateau', '+225 27 20 23 20 23 / +225 27 20 33 40 00', 'Deux numéros différents selon les listes (DAT / Climate Chance) : à départager par appel. E-mail cité : hotel.abidjan@movenpick.com', 'hotelsPdf', 'C', 'numéros contradictoires entre deux listes');
add('hotel', 'Seen Hotel Abidjan', 'Plateau', '+225 27 20 00 67 06 / +225 07 76 99 98 06', 'Hôtel du Plateau.', 'hotelsPdf', 'B', 'liste DAT');
add('hotel', 'Ibis Abidjan Plateau', 'Plateau', '+225 27 20 30 16 00', 'Hôtel Ibis.', 'hotelsPdf', 'B', 'liste DAT');
add('hotel', 'Ibis Abidjan Marcory', 'Marcory', '+225 27 21 75 63 00', 'Hôtel Ibis.', 'hotelsPdf', 'B', 'liste DAT');
add('hotel', 'Aichti Hôtel', 'Marcory', '', NONUM, 'hotelsPdf', 'C', 'cité dans la liste DAT sans numéro');
add('hotel', 'Hôtel Capitol Abidjan', 'Cocody', '', 'Hôtel avec hammam et spa. ' + NONUM, 'https://www.expedia.com/Abidjan-Hotels-Spa-Hotel.0-0-d267-tSpaHotel.Travel-Guide-Filter-Hotels', 'C', 'site de réservation, sans numéro');
// ---- RESTAURANTS
add('restaurant', 'Le Toit d\'Abidjan', 'Sofitel Hôtel Ivoire, Cocody', '+225 27 22 48 25 91', 'Cuisine internationale. Le standard de l\'hôtel est le +225 27 22 48 26 26.', 'restosPdf', 'B', 'liste restaurants Climate Chance 2026');
add('restaurant', 'Le Comptoir', 'Ivoire Trade Center, bd Germain Koffi Gadeau, Cocody', '+225 07 98 97 46 07', 'Cuisine ivoirienne et internationale.', 'restosPdf', 'B', 'liste restaurants Climate Chance 2026');
add('restaurant', 'Le Saakan', 'Avenue Chardy, Plateau', '+225 07 58 55 47 63', 'Cuisine africaine contemporaine.', 'restosPdf', 'B', 'liste restaurants Climate Chance 2026');
add('restaurant', 'Maquis Chez Hélène', 'Deux Plateaux, Cocody', '', 'Grillades (poulet braisé, brochettes d\'escargots). ' + NONUM, 'restoBlog', 'C', 'guide gourmand, sans numéro');
add('restaurant', 'Le Jardin Gourmand', 'Marcory Zone 4', '', 'Cuisine française et internationale, cadre verdoyant. ' + NONUM, 'restoBlog', 'C', 'guide gourmand, sans numéro');
add('restaurant', 'Le Maquis Le Virage', 'Marcory Zone 4', '', 'Viandes grillées. ' + NONUM, 'restoBlog', 'C', 'guide gourmand, sans numéro');
add('restaurant', 'Le Grand Large', 'Marcory Zone 4', '', 'Poissons et fruits de mer. ' + NONUM, 'restoBlog', 'C', 'guide gourmand, sans numéro');
add('restaurant', 'Restaurant Chez Marie', 'Zone 4, entre Cocody et Marcory', '', 'Cuisine locale. Pas de numéro direct (formulaire de contact sur l\'annuaire).', 'https://annuaireci.com/entreprises/restaurant-chez-marie-abidjan-cote-divoire/', 'C', 'annuaire en ligne, sans numéro');
// ---- BANQUES
add('banque', 'SGBCI (Société Générale Côte d\'Ivoire)', '5 et 7 avenue Joseph Anoma, Plateau, BP 1355', '+225 27 20 20 12 34', 'Siège / standard.' + OLD, 'banksSgbc', 'C', 'fiche boursière, numéro à 8 chiffres converti');
add('banque', 'BICICI', 'Avenue Franchet d\'Esperey, Plateau, BP 1298', '+225 27 20 20 16 00', 'Standard (groupe BNP Paribas).' + OLD, 'banksBicc', 'C', 'fiche boursière, numéro à 8 chiffres converti');
add('banque', 'Ecobank Côte d\'Ivoire', 'Immeuble Alliance, avenue Terrasson de Fougères, Plateau, BP 4107', '+225 27 20 31 92 00', 'E-mail général : ecobankenquiries@ecobank.com.' + OLD, 'banksEcoc', 'C', 'fiche boursière, numéro à 8 chiffres converti');
add('banque', 'SIB (Société Ivoirienne de Banque)', 'Bd de la République, immeuble Alpha 2000, Plateau', '+225 27 20 20 00 00', 'Standard.' + OLD, 'banksSibc', 'C', 'fiche boursière, numéro à 8 chiffres converti');
add('banque', 'NSIA Banque Côte d\'Ivoire', '8-10 avenue Joseph Anoma, Plateau, 01 BP 1274', '+225 27 20 20 07 20', 'Standard. Site : nsiabanque.ci.' + OLD, 'nsia', 'C', 'Pages Jaunes Abidjan.net, numéro à 8 chiffres converti');
// ---- LOCATION DE VOITURES
add('voiture', 'Europcar (aéroport)', 'Aéroport Félix Houphouët-Boigny ; autre adresse : km 4, bd de Marseille', '+225 27 21 75 03 55', 'Location de voitures. Numéro relevé sur un comparateur : peu sûr.', 'discover', 'C', 'comparateur de locations');
add('voiture', 'Hertz (aéroport)', 'Aéroport Félix Houphouët-Boigny', '+225 21 21 40 33', 'Location de voitures. Ancien format à 8 chiffres : préfixe à confirmer. Horaires cités : lundi-vendredi 8h-12h30.', 'kayak', 'C', 'comparateur de locations, numéro non converti');
add('voiture', 'Avis (aéroport)', 'Aéroport Félix Houphouët-Boigny, 07 BP 30 Abidjan 07', '+225 21 27 78 98', 'Location de voitures. Ancien format à 8 chiffres : préfixe à confirmer.', 'discover', 'C', 'comparateur de locations, numéro non converti');
// ---- VOYAGES
add('voyage', 'Emirates (service clients)', 'Plaza Tower, avenue Mathieu Ekra, Plateau', '+225 27 22 46 89 30 / +225 25 20 01 13 60', 'Service clients et agence locale.', 'emirates', 'A', 'page officielle Emirates');
add('voyage', 'Air Gabon', 'Avenue Delafosse, immeuble Delafosse, Plateau, 01 BP 623', '+225 27 20 21 55 06', 'Compagnie aérienne.', 'airGabon', 'B', 'Pages Jaunes Abidjan.net');
add('voyage', 'Afriqiyah Airways', 'Avenue Crosson Duplessis, Plateau', '+225 27 20 33 53 53 / +225 27 20 33 54 54 / +225 27 21 58 55 55', 'Compagnie aérienne. Fiche ancienne : vérifier que le bureau est toujours ouvert.', 'afriq', 'C', 'Pages Jaunes Abidjan.net, fiche ancienne');
add('voyage', 'Mauritania Airlines', 'Rue du Commerce, immeuble Amiral, face à la CNPS, Plateau, 17 BP 199', '', NONUM, 'mauritania', 'C', 'annuaire en ligne, sans numéro');
add('voyage', 'Tunisair', 'Rue du Commerce, Galerie Résidence Nabil, Plateau, 01 BP 11642', '', NONUM, 'tunisair', 'C', 'annuaire en ligne, sans numéro');
add('voyage', 'Air & Mer SARL', '1 rue Jean-Paul II, immeuble CCIA, Plateau', '+225 27 20 21 80 05', 'Agence de voyages.' + OLD, 'airMer', 'C', 'Pages Jaunes Abidjan.net, numéro à 8 chiffres converti');
add('voyage', 'Ivoire Olympique Voyage', 'Bd Latrille, carrefour Mobil, face station Olibya, Deux Plateaux, Cocody, BP 2863', '', 'Billetterie, séjours, hôtellerie. ' + NONUM, 'voyages', 'C', 'annuaire en ligne, sans numéro');
add('voyage', 'Univers Voyages', 'Face LG, Deux Plateaux Vallon, Cocody, 18 BP 994', '', 'Billetterie, réservations d\'hôtels, voyages sur mesure. Fiche signalée « fermée » : à vérifier. ' + NONUM, 'voyages', 'C', 'annuaire en ligne, sans numéro');
add('voyage', 'Nectar Voyages', 'Angré 7e tranche, Cocody', '', NONUM, 'voyages', 'C', 'annuaire en ligne, sans numéro');
add('voyage', 'Tropical Voyages', 'Deux Plateaux, Cocody', '', NONUM, 'voyages', 'C', 'annuaire en ligne, sans numéro');
// ---- SUPERMARCHÉS
add('supermarche', 'Prosuma', 'Abidjan', '+225 21 22 32 32 / +225 21 25 53 82 / +225 21 25 29 22', 'Siège du groupe. E-mail : contact@infoprosuma.ci. Anciens formats à 8 chiffres : préfixe à confirmer.', 'prosuma', 'C', 'liste fournisseurs de l\'ambassade d\'Inde, date inconnue');
add('supermarche', 'Carrefour PlaYce Marcory', 'Centre PlaYce Marcory', '', 'Hypermarché de 3 200 m² avec 55 boutiques. ' + NONUM, 'playce', 'C', 'communiqué de presse, sans numéro');
add('supermarche', 'Carrefour Market PlaYce Palmeraie', 'PlaYce Palmeraie, Cocody', '', 'Supermarché de 2 400 m². ' + NONUM, 'koaci', 'C', 'article de presse, sans numéro');
add('supermarche', 'Carrefour Market Marcory Zone 4', 'Rue du 7 Décembre, Marcory Zone 4', '', 'Supermarché de proximité. ' + NONUM, 'koaci', 'C', 'article de presse, sans numéro');
add('supermarche', 'Cap Sud (Hyper Hayat)', 'Marcory', '', 'Centre commercial de 74 boutiques avec un hypermarché. ' + NONUM, 'https://eoiabidjan.gov.in/docs/1717086912Supermarket and Retailers.pdf', 'C', 'liste fournisseurs de l\'ambassade d\'Inde, sans numéro');
add('supermarche', 'Sococé (Super U)', 'Cocody', '', 'Centre commercial avec un supermarché Super U. ' + NONUM, 'https://eoiabidjan.gov.in/docs/1717086912Supermarket and Retailers.pdf', 'C', 'liste fournisseurs de l\'ambassade d\'Inde, sans numéro');
// ---- STATION / GARAGES / CONCESSIONS
add('station', 'Vivo Energy Côte d\'Ivoire (Shell)', 'Vridi, Port-Bouët', '+225 21 75 27 27', 'Siège du réseau de stations Shell. Ancien format à 8 chiffres : préfixe à confirmer ; fiche de plusieurs années.', 'vivo', 'C', 'Pages Jaunes Abidjan.net, numéro non converti');
add('mecanique', 'Toyota CFAO Motors', 'Rue Pasteur, rond-point du CHU de Treichville, 01 BP 2114', '', 'Grande concession Toyota (2015). Fiche signalée « fermée » : à vérifier. ' + NONUM, 'toyota', 'C', 'annuaire en ligne, sans numéro');
add('mecanique', 'Hyundai Afrique Motors', 'Bd de Marseille, km 4, Zone 3, Treichville, 16 BP 684', '', 'Concessionnaire Hyundai : véhicules neufs et d\'occasion, entretien, pièces. ' + NONUM, 'hyundai', 'C', 'annuaire en ligne, sans numéro');
add('vente_auto', 'Hyundai Afrique Motors', 'Bd de Marseille, km 4, Zone 3, Treichville', '', 'Vente de véhicules neufs et d\'occasion. ' + NONUM, 'hyundai', 'C', 'annuaire en ligne, sans numéro');
// ---- SPORT / BEAUTÉ / SPA
add('sport', 'Cascade Fitness', 'Angré 7e tranche, Cocody', '', 'Salle de sport. Statut ouvert/fermé contradictoire selon la page : à vérifier. ' + NONUM, 'gym', 'C', 'annuaire en ligne, sans numéro');
add('sport', 'Espace Brutal Gym', 'Les Jardins, Riviera 2, Cocody, 25 BP 1514', '', 'Salle de sport. ' + NONUM, 'gym2', 'C', 'annuaire en ligne, sans numéro');
add('sport', 'Vitalis Fit and Form', 'Rue Pierre et Marie Curie, face Prima Center, Zone 4C, Marcory', '', 'Centre sportif : fitness et activités variées. ' + NONUM, 'gym3', 'C', 'annuaire en ligne, sans numéro');
add('spa', 'Institut de Beauté Éclat', 'Riviera Palmeraie, Cocody', '', 'Soins du visage, épilation, maquillage, manucure, pédicure, massages relaxants. ' + NONUM, 'eclat', 'C', 'annuaire en ligne, sans numéro');
add('spa', 'Royaume 23 Beauty Clinic & Spa', 'Riviera Palmeraie, Cocody (fiche aussi à Marcory)', '', 'Clinique de la peau, laser et beauté avec spa. ' + NONUM, 'expat', 'C', 'Expat.com, sans numéro');
add('coiffure', 'Institut de Beauté Éclat', 'Riviera Palmeraie, Cocody', '', 'Soins esthétiques, manucure, pédicure. ' + NONUM, 'eclat', 'C', 'annuaire en ligne, sans numéro');
// ---- BUREAU / MARIAGE / ÉVÉNEMENT
add('bureau', 'Regus Cocody Vallons', 'Immeuble Sayegh, 2e étage, angle rue des Jardins et rue J66, Cocody', '', 'Bureaux, coworking, salles de réunion, domiciliation. Ouverture à confirmer (une page indique « ouverture prochaine »). ' + NONUM, 'regus', 'C', 'site Regus, sans numéro');
add('mariage', 'Espace Jeckad', 'Angré 7e tranche, rue L155, Cocody', '', 'Trois salles ; la salle Shalom (500 m²) accueille jusqu\'à 600 personnes en théâtre ou 400 en banquet. Sono, écrans LED, podium. ' + NONUM, 'jeckad', 'C', 'annuaire GoAfrica, sans numéro');
add('mariage', 'Palm Club Hôtel', 'Boulevard Latrille, Cocody', '', '10 salles de 10 à 350 personnes (réunions, séminaires, mariages, banquets). ' + NONUM, 'palm', 'C', 'annuaire GoAfrica, sans numéro');
add('mariage', 'Villa Thoanny — L\'Instant Africain', 'Angré 7e tranche, Cocody', '', 'Salle Wakanda de 170 places (dont 100 debout), terrasse, piscine. ' + NONUM, 'thoanny', 'C', 'annuaire en ligne, sans numéro');
add('evenement', 'HK Sono et Traiteur', 'Deux Plateaux, Cocody', '', 'Sonorisation et traiteur pour réceptions et mariages. ' + NONUM, 'hk', 'C', 'annuaire en ligne, sans numéro');
add('evenement', 'Cynthe Multi-Services', 'Vallon, Cocody', '', 'Organisation de mariages, location de vaisselle, décoration. ' + NONUM, 'cynthe', 'C', 'annuaire en ligne, sans numéro');
// ---- SANTÉ (nouveaux besoins pour Keydou : "sante" et "pharmacie")
add('sante', 'PISAM — Polyclinique Internationale Sainte Anne-Marie', 'Rue Cannebière, avenue Joseph Blohorn, Cocody, 01 BP 1463', '+225 27 22 48 31 31', 'Urgences 24 h/24 : +225 27 22 48 31 12 (ancien format 22 48 31 12 + préfixe 27). Site : pisam.ci', 'pisam', 'B', 'Pages Jaunes Abidjan.net et liste des établissements de santé du Royaume-Uni');
add('sante', 'CHU de Cocody', 'Cocody, près de l\'université Félix Houphouët-Boigny', '+225 27 22 44 91 00', 'Centre hospitalier universitaire.', 'chu', 'B', 'Pages Jaunes Abidjan.net');
add('sante', 'Clinique La Providence', 'Cocody', '+225 27 22 44 95 86 / +225 27 22 44 95 87 / +225 27 22 44 95 88', 'Clinique citée dans la liste médicale de l\'ambassade d\'Allemagne (mai 2025).', 'de', 'B', 'liste médicale de l\'ambassade d\'Allemagne 2025');
add('sante', 'Polyclinique Farah', 'Carrefour Donwahi, Marcory', '+225 21 26 00 93', 'Autres numéros cités : 23 08 00 ; mobiles 47 11 11 11 et 05 25 25 25 (formats à vérifier). Conventionnée CNPS (accidents du travail) en 2025.', 'gov', 'C', 'liste médicale du Royaume-Uni, formats à vérifier');
add('pharmacie', 'Ordre national des pharmaciens de Côte d\'Ivoire', 'Deux Plateaux ENA, Cocody, villa 428, 06 BP 942', '', 'Pas de numéro trouvé. Les pharmacies doivent afficher la liste des pharmacies de garde de leur zone ; liste de garde en ligne sur annuaireci.com (pharmacies-de-garde/abidjan).', 'pharmaOrdre', 'C', 'annuaire en ligne, sans numéro');

fs.writeFileSync(require('path').join(__dirname, '..', 'netlify', 'functions', 'keydou-annuaire-abidjan-lot1.json'), JSON.stringify(E, null, 1) + '\n');
const urg = {
  pays: 'Côte d\'Ivoire', ville: 'Abidjan',
  numeros: [
    { numero: '180', motif: 'Sapeurs-pompiers', note: 'Numéro cité par le gouvernement du Canada (fiche Abidjan) et un guide suisse. À reconfirmer.' },
    { numero: '185', motif: 'Urgences médicales (SAMU)', note: 'Cité par un guide suisse et la fiche canadienne. À reconfirmer.' },
    { numero: '110', motif: 'Police secours', note: '110, 111 ou 170 selon les sources. À reconfirmer.' },
    { numero: '111', motif: 'Police secours (2e numéro)', note: 'Cité avec le 110 et le 170. À reconfirmer.' },
    { numero: '170', motif: 'Police (3e numéro)', note: 'Cité avec le 110 et le 111. À reconfirmer.' }
  ],
  avertissement: 'Numéros relevés dans des guides officiels étrangers (Canada, Suisse), pas dans une source ivoirienne : à valider auprès de la Police ou des Sapeurs-pompiers avant mise en service.',
  source: 'Recherche web du 22 octobre 2026 : fiches voyage du gouvernement du Canada et guide d\'affaires suisse sur la Côte d\'Ivoire'
};
fs.writeFileSync(require('path').join(__dirname, '..', 'netlify', 'functions', 'keydou-urgences-abidjan.json'), JSON.stringify(urg, null, 1) + '\n');
const avec = E.filter(e => e.telephone).length;
const grades = E.reduce((o, e) => { const g = /fiabilité (\w)/.exec(e.source_note)[1]; o[g] = (o[g] || 0) + 1; return o; }, {});
const sv = E.reduce((o, e) => (o[e.service] = (o[e.service] || 0) + 1, o), {});
console.log('fiches', E.length, '| avec numéro', avec, '| sans', E.length - avec, '| fiabilité', JSON.stringify(grades), '|', JSON.stringify(sv));
