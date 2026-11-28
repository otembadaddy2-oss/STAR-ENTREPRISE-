"""Dossier de présentation TERRAIN SÛR pour l'administration congolaise (étude du besoin + produit + limites + feuille de route).
Lancer : python3 tools/dossiers-speciaux/terrain_sur.py  → docs/dossiers-speciaux/TERRAIN-SUR-Dossier-de-presentation.pdf
Les faits sur le Congo viennent de sources publiques citées en fin de document ; rien n'est inventé (pas de prix, pas de chiffre sans source)."""
import os, sys, base64
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')); sys.path.insert(0, HERE)
import images as I
import subprocess
CAP = os.path.join(ROOT, 'docs', 'dossiers-speciaux', 'terrain-sur', 'captures'); OUT = os.path.join(ROOT, 'docs', 'dossiers-speciaux', 'TERRAIN-SUR-Dossier-de-presentation.pdf')
def img(n):
    with open(os.path.join(CAP, n), 'rb') as f: return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode()
LOGO = I.logo_officiel_uri(500); LOGO_P = I.logo_officiel_jpeg_uri(150)
SRC = [
 ('Allafrica — Basungi consacre son édition aux érosions à Brazzaville (17/09/2024)', 'https://fr.allafrica.com/stories/202409170534.html'),
 ('Allafrica — Talangaï : début des travaux de traitement du ravin de Ngamakosso (10/07/2024)', 'https://fr.allafrica.com/stories/202407100478.html'),
 ('Allafrica — article de août 2026 sur les effondrements de maisons à Ngamakosso et Ibalico', 'https://fr.allafrica.com/stories/202608090109.html'),
 ('Mémoire de D. Kaya-Mabiala (Université Marien Ngouabi, 2007) — érosion hydrique, bassins de Kingouari, M\'filou et Djoué', 'https://www.memoireonline.com/10/18/10385/Dynamique-actuelle-de-l-erosion-hydrique-dans-les-bassins-versants-de-Kingouari-m-filou-et-Djoue.html'),
 ('Africanews — Soil erosion leaves trail of devastation in Congo (24/07/2021), Pointe-Noire', 'https://www.africanews.com/2021/07/24/soil-erosion-leaves-trail-of-devastation-in-congo/'),
 ('AFD — Améliorer l\'assainissement et les outils de prévision des inondations à Pointe-Noire', 'https://www.afd.fr/fr/projets/ameliorer-lassainissement-et-les-outils-de-prevision-des-inondations-pointe-noire'),
 ('AFD — Améliorer le drainage des eaux de pluie pour limiter les risques liés aux inondations (Brazzaville)', 'https://www.afd.fr/fr/projets/ameliorer-le-drainage-des-eaux-de-pluie-pour-limiter-les-risques-lies-aux-inondations'),
 ('Allafrica — Crues du fleuve Congo et ses affluents (14/01/2024)', 'https://fr.allafrica.com/stories/202401140050.html'),
 ('OMS Afrique — Supporting flood emergency response in Congo', 'https://www.afro.who.int/countries/congo/news/supporting-flood-emergency-response-congo'),
 ('Allafrica — BCBTP : le budget 2026 adopté (rôle du bureau de contrôle)', 'https://fr.allafrica.com/stories/202601200354.html'),
 ('Allafrica — Modernisation des voiries urbaines : J. D. Mondelé inspecte les chantiers de Brazzaville (05/02/2026)', 'https://fr.allafrica.com/stories/202602050308.html'),
]
CSS = """
@page{size:A4;margin:0}
*{box-sizing:border-box}body{margin:0;font-family:'Inter','Segoe UI',system-ui,sans-serif;color:#1a2030;font-size:10.4pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.p{width:210mm;height:297mm;padding:20mm 18mm 20mm;page-break-after:always;position:relative;overflow:hidden;background:#fff}
.cov{background:radial-gradient(90% 70% at 50% 0,#0d2a5c,#06142e 70%);color:#fff;padding:0;display:flex;flex-direction:column;align-items:center;text-align:center}
.cov .lg{margin-top:34mm;width:100mm}.cov h1{font-size:34pt;margin:12mm 0 2mm;letter-spacing:.06em}.cov h1 b{color:#ffd466}.cov .sub{font-size:14pt;color:#d7e0f7;max-width:150mm}
.cov .bd{margin-top:14mm;padding:6px 16px;border:1px solid #ffd46699;border-radius:99px;color:#ffd466;font-size:10pt;letter-spacing:.08em}.cov .ft{position:absolute;bottom:16mm;left:0;right:0;font-size:9.5pt;color:#b9c6e6}
.p:not(.cov)::after{content:'TERRAIN SÛR · STAR ENTREPRISE · prototype de démonstration — ne remplace pas une étude géotechnique';position:absolute;bottom:7mm;left:18mm;font-size:8pt;color:#5a6275}.bandeau{position:absolute;left:0;right:0;bottom:0;height:3mm;background:linear-gradient(90deg,#1f8a4c 33%,#f2c230 33% 66%,#c0392b 66%)}
h2{font-size:17pt;color:#06142e;margin:0 0 3mm;border-bottom:2px solid #e3b653;padding-bottom:2mm}h3{font-size:12pt;color:#0d2a5c;margin:5mm 0 1.5mm}p{margin:0 0 2.6mm}
.k{background:#fff6d8;border-left:4px solid #e3b653;padding:3mm 4mm;border-radius:2mm;margin:3mm 0;font-size:9.8pt}.ko{background:#fdecea;border-left-color:#c0392b}.ok{background:#e9f7ef;border-left-color:#1f8a4c}
table{width:100%;border-collapse:collapse;font-size:9.4pt;margin:2mm 0}th{background:#06142e;color:#fff;text-align:left;padding:2mm 2.5mm}td{border-bottom:1px solid #e6dfc8;padding:2mm 2.5mm;vertical-align:top}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.f{border:1px solid #ddd;border-radius:3mm;overflow:hidden}.f img{width:100%;display:block;object-fit:cover;object-position:top}.f figcaption{font-size:8.6pt;color:#5a6275;padding:1.5mm 2.5mm;background:#f7f4ea}figure{margin:0}
ul{margin:0 0 2.6mm;padding-left:5mm}li{margin:0 0 1.2mm}.src li{font-size:8.6pt;word-break:break-all}.mini{font-size:8.6pt;color:#5a6275}
.ph{display:inline-block;background:#06142e;color:#ffd466;border-radius:99px;padding:.5mm 3mm;font-size:8.6pt;font-weight:700;margin-right:2mm}
"""
def pages():
    P = []
    P.append(f"""<div class="p cov"><img class="lg" src="{LOGO}"><h1>TERRAIN <b>SÛR</b></h1><div class="sub">Lire un terrain avant de construire.<br>Suivre les chantiers sans fraude.</div><div class="bd">DOSSIER DE PRÉSENTATION · ADMINISTRATION CONGOLAISE</div>
    <div class="ft">STAR ENTREPRISE · Brazzaville, République du Congo<br>RCCM CG-BZV-01-2026-A10-01950 · 28 novembre 2026 · prototype de démonstration</div><div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>1. En une page</h2>
    <p><b>Le problème.</b> À Brazzaville et à Pointe-Noire, on construit vite, parfois sur des sols sableux fragiles, au bord de ravines ou en zone inondable. Les sources publiques rapportent des maisons emportées par l'érosion, des quartiers inondés chaque saison des pluies et un contrôle des chantiers qui reste difficile. Quand un rapport ou une photo peut être refait, réutilisé ou daté à la main, la fraude est facile.</p>
    <p><b>La proposition.</b> <b>TERRAIN SÛR</b> est une application installable sur téléphone, qui fonctionne même sans connexion. Un agent, un ingénieur ou un citoyen photographie le sol, répond à dix questions guidées, et obtient un <b>pré-diagnostic expliqué</b> : niveau de risque, causes, actions et étapes obligatoires. Chaque relevé est daté, localisé et <b>verrouillé</b> dans un journal chaîné, avec un QR code qui permet de vérifier le rapport.</p>
    <div class="g2"><div class="k ok"><b>Ce qu'elle apporte</b><ul><li>Un premier tri rapide des terrains à risque</li><li>Un langage commun et expliqué pour tous</li><li>Des preuves de chantier difficiles à truquer</li><li>Un tableau de bord pour décider</li></ul></div>
    <div class="k ko"><b>Ce qu'elle ne fait pas</b><ul><li>Elle ne mesure pas la portance réelle d'un sol</li><li>Elle ne remplace pas l'étude géotechnique</li><li>Elle n'autorise aucune construction</li><li>Elle n'est pas encore reliée à un serveur d'État</li></ul></div></div>
    <p>Notre position est volontairement honnête : <b>une photo ne dit pas tout</b>. Sa force est de repérer vite les terrains dangereux, d'orienter vers la bonne étude et de rendre la fraude visible. La mesure du sol reste le travail des bureaux d'études et des laboratoires.</p>
    <h3>Les six modules</h3>
    <table><tr><th>Module</th><th>Rôle</th></tr><tr><td>Scan du terrain</td><td>Photo, position GPS, lecture visuelle des surfaces, contrôle de qualité de l'image</td></tr><tr><td>Questions guidées</td><td>10 questions de terrain (pente, eau, ravines, sol, fissures, voisinage, remblai, drainage…)</td></tr><tr><td>Moteur de risque expliqué</td><td>Cinq risques notés ; chaque point du score est justifié ; règles de sécurité imposées</td></tr><tr><td>Anti-fraude</td><td>Photo réutilisée, photo ancienne, mauvais lieu, mauvaise date : alertes automatiques</td></tr><tr><td>Journal verrouillé + rapport PDF</td><td>Chaîne d'empreintes, QR code, vérification d'authenticité</td></tr><tr><td>Tableau de bord de l'État</td><td>Carte des sites, anomalies, chantiers « déclaré contre constaté »</td></tr></table><div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>2. Étude du besoin : ce que disent les sources</h2>
    <p class="mini">Synthèse de sources publiques (presse, organismes internationaux, travaux universitaires), citées en fin de document. Il n'existe pas, dans ce que nous avons trouvé, de cartographie officielle récente à l'échelle de la ville : c'est précisément un manque que l'outil peut aider à combler.</p>
    <h3>Brazzaville : sols sableux et ravinement</h3>
    <ul><li>Les sols des plateaux de Brazzaville sont décrits comme ferrallitiques, sableux ou sablo-argileux (type Batéké), peu liés, donc sensibles à l'érosion.</li><li>La presse (2024) cite <b>Don-Bosco, Ngamakosso, Massengo et Mayanga</b> comme quartiers touchés par l'érosion, avec des déplacements de population. Un article d'août 2026 évoque des effondrements de maisons à <b>Ngamakosso et Ibalico</b>.</li><li>Un mémoire de l'Université Marien Ngouabi (2007) décrit l'aggravation de l'érosion hydrique dans les quartiers nord (bassins de Kingouari, M'filou, Djoué), avec des maisons écroulées et des voiries ravinées.</li><li>Des travaux de traitement du ravin de Ngamakosso ont démarré en juillet 2024 : l'État agit, mais sur des sites déjà dégradés.</li></ul>
    <h3>Pointe-Noire : sable, ravines et eau</h3>
    <ul><li>Selon les autorités citées par Africanews (2021), les sols sableux se dégradent facilement ; les ravines ont grandi et « avalent chaque année davantage de logements et de terres agricoles » ; la construction en zones interdites aggrave le phénomène.</li><li>L'AFD note une urbanisation rapide, des quartiers précaires, un réseau d'assainissement sous-dimensionné et, chaque saison des pluies, des milliers de personnes touchées par les inondations.</li></ul>
    <h3>Inondations et urbanisation</h3>
    <ul><li>Début 2024, le pays a connu les pires inondations de son histoire récente : 9 départements sur 12 touchés. L'OMS rapporte plus de 64 000 maisons détruites ou endommagées, 120 écoles et 34 centres de santé touchés dans les zones concernées.</li><li>À Brazzaville, un atelier de janvier 2026 a cité parmi les zones très exposées Mpila, Intendance, Texaco Tsiémé et le Fleuve Congo, ainsi que des quartiers de Talangaï ; l'AFD finance un projet de drainage visant notamment Talangaï et Mfilou.</li><li>Selon l'AFD, la population de Brazzaville est passée de 1 à 1,8 million d'habitants depuis 2004, avec des quartiers précaires qui se développent en périphérie faute de planification.</li></ul>
    <h3>Contrôle des chantiers et entretien</h3>
    <ul><li>Le BCBTP (Bureau de contrôle du bâtiment et des travaux publics) assure le contrôle technique des chantiers et propose des études géotechniques ; il a lui-même rappelé son rôle après des effondrements d'ouvrages à Brazzaville et à Pointe-Noire.</li><li>Une analyse relève que l'État construit des routes mais éprouve des difficultés à les entretenir de façon durable ; le ministre en charge des voiries affirme qu'« il n'y aura pas d'éléphant blanc ». Un outil de preuve par photos datées et localisées sert précisément cet engagement.</li></ul>
    <div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>3. Comment ça marche : du terrain au rapport</h2>
    <div class="g3"><figure class="f"><img src="{img('accueil.jpg')}" style="height:56mm"><figcaption><b>Accueil.</b> Quatre outils, voix guide, indicateur hors ligne.</figcaption></figure>
    <figure class="f"><img src="{img('lecture.jpg')}" style="height:56mm"><figcaption><b>Lecture visuelle.</b> Surfaces colorées, qualité de la photo, alertes.</figcaption></figure>
    <figure class="f"><img src="{img('questions.jpg')}" style="height:56mm"><figcaption><b>Questions guidées.</b> Chaque réponse sera expliquée.</figcaption></figure></div>
    <h3>Ce que l'application lit sur la photo</h3>
    <p>Sur l'appareil, sans rien envoyer, elle classe les zones de l'image (végétation, terre rouge, terre brune, sol clair sableux, gris minéral, eau ou reflet, ciel). Elle mesure la netteté, la luminosité et la rugosité de la surface, et refuse de conclure si la photo est floue, sombre ou si le sol est peu visible. Ce sont des <b>indices visuels</b>, pas des mesures du sous-sol.</p>
    <h3>Le moteur de risque</h3>
    <p>Cinq risques sont notés de 0 à 100 : érosion et ravinement, eau et inondation, portance du sol, stabilité de pente, remblai. Le score tient compte de l'usage prévu (maison, immeuble, route, drainage) : une route est plus sensible à l'eau, un immeuble à la portance. Des <b>règles de sécurité</b> imposent un niveau minimum dans les cas graves (grande ravine proche, ancienne décharge, terrain déjà inondé, affaissement visible). Les seuils sont des repères d'ingénierie de bon sens, <b>à faire valider par des ingénieurs géotechniciens</b> avant tout usage officiel.</p>
    <div class="g2"><figure class="f"><img src="{img('resultat.jpg')}" style="height:76mm"><figcaption><b>Résultat.</b> Niveau, score, risques par nature, pourquoi chaque point, que faire.</figcaption></figure>
    <div><div class="k"><b>L'application parle.</b> Un bouton « Écouter » lit le résultat à voix haute en français ; une voix guide peut accompagner chaque étape. C'est utile sur le terrain, mains occupées, ou pour un utilisateur qui lit peu.</div>
    <div class="k"><b>Niveaux de sortie</b><br>Favorable · Vigilance · Risque élevé · Critique</div>
    <div class="k ok"><b>Confiance affichée.</b> Elle n'est jamais « élevée » : une photo ne suffit pas. Elle baisse si la photo est mauvaise ou si des questions restent sans réponse.</div></div></div><div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>4. La lutte contre la fraude</h2>
    <p>La fraude se joue souvent sur la <b>preuve</b> : une vieille photo présentée comme récente, la même photo pour deux chantiers, un rapport modifié après coup. TERRAIN SÛR rend ces ruses visibles.</p>
    <table><tr><th>Contrôle</th><th>Ce que l'application détecte</th><th>Limite honnête</th></tr>
    <tr><td>Photo déjà utilisée</td><td>Même fichier ou même scène (empreinte visuelle), même recadrée ou recompressée</td><td>Une photo vraiment différente du même lieu n'est pas détectée</td></tr>
    <tr><td>Photo ancienne</td><td>Fichier vieux de plus de 15 minutes présenté comme pris sur place ; image de galerie signalée</td><td>La date d'un fichier peut être modifiée : à renforcer côté serveur</td></tr>
    <tr><td>Mauvais lieu</td><td>Position à plus de 300 m du chantier déclaré</td><td>Un GPS peut être falsifié sur certains téléphones ; le serveur croisera les données</td></tr>
    <tr><td>Mauvaise date</td><td>Photo antérieure à l'ordre de service</td><td>Dépend de la date du fichier</td></tr>
    <tr><td>Photo inutilisable</td><td>Floue, sombre, éblouie : signalée</td><td>—</td></tr>
    <tr><td>Rapport modifié</td><td>Chaque relevé porte l'empreinte du précédent ; toute modification casse la chaîne et se voit</td><td>Ne prouve pas que le contenu initial était vrai</td></tr></table>
    <div class="g2"><figure class="f"><img src="{img('journal.jpg')}" style="height:70mm"><figcaption><b>Journal verrouillé.</b> Chaîne intacte, ou falsification détectée au relevé n° X.</figcaption></figure>
    <figure class="f"><img src="{img('verif.jpg')}" style="height:70mm"><figcaption><b>Vérifier un rapport.</b> Par code ou par QR : authentique, introuvable ou falsifié.</figcaption></figure></div>
    <div class="k">Les contrôles tournent <b>sur le téléphone</b> même sans connexion. Dans la version avec serveur d'État, ils seront renforcés : les mêmes règles s'appliqueraient à tous les relevés de tous les agents, et un rapport inconnu serait signalé où qu'il soit présenté.</div><div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>5. Pour l'administration</h2>
    <div class="g2"><figure class="f"><img src="{img('etat.jpg')}" style="height:112mm"><figcaption><b>Tableau de bord de l'État</b> — données fictives de démonstration : indicateurs, plan par ville, alertes anti-fraude, chantiers déclaré/constaté.</figcaption></figure>
    <div><h3 style="margin-top:0">Ce qu'on y voit</h3><ul><li>Le nombre de sites évalués et de terrains critiques</li><li>Un plan par ville, coloré par niveau de risque, avec les anomalies marquées</li><li>Les alertes à traiter, classées par gravité</li><li>Pour chaque chantier : avancement <b>déclaré</b> contre avancement <b>constaté par les photos</b></li></ul>
    <h3>Qui s'en sert, comment</h3><ul><li><b>Agent de terrain / ingénieur</b> : fait le relevé, le scelle, envoie le rapport.</li><li><b>Bureau d'études ou laboratoire</b> : reçoit l'alerte, réalise l'étude, joint ses résultats.</li><li><b>Urbanisme, travaux publics</b> : priorise les sites, suspend ou autorise selon l'étude.</li><li><b>Citoyen, acheteur, banque</b> : scanne le QR pour vérifier un rapport.</li></ul>
    <div class="k"><b>Hors connexion, puis en ligne.</b> L'application s'installe depuis le navigateur, fonctionne sans réseau, et garde les relevés sur l'appareil. Dès qu'un serveur d'État existera, elle enverra les relevés mis en attente quand la connexion revient.</div></div></div>
    <h3>Où elle aide concrètement</h3>
    <table><tr><th>Besoin</th><th>Apport de TERRAIN SÛR</th></tr>
    <tr><td>Érosion, ravines (Brazzaville, Pointe-Noire)</td><td>Repérer vite les terrains à risque avant la vente ou la construction ; priorités pour les études</td></tr>
    <tr><td>Inondations</td><td>Signaler l'eau stagnante, les traces de crue, la proximité du fleuve ; conseils de drainage</td></tr>
    <tr><td>Contrôle des chantiers et routes</td><td>Preuves datées et localisées, comparaison déclaré/constaté, alertes d'anomalies</td></tr>
    <tr><td>Fraude documentaire</td><td>Rapports verrouillés et vérifiables par QR</td></tr>
    <tr><td>Aide à la décision</td><td>Tableau de bord, délais d'instruction, priorités</td></tr></table><div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>6. Rapport remis à l'utilisateur</h2>
    <div class="g2"><figure class="f"><img src="{img('rapport-1.jpg')}"><figcaption>Page 1 : identité du relevé, photo et lecture visuelle, niveau et risques</figcaption></figure><figure class="f"><img src="{img('rapport-2.jpg')}"><figcaption>Page 2 : causes, actions, étapes obligatoires, avertissement, QR et sceau</figcaption></figure></div>
    <p class="mini">Exemple généré par le prototype à partir d'une photo d'exemple (Unsplash, licence libre), pas d'un terrain réel. Le rapport indique clairement qu'il ne vaut pas autorisation de construire.</p>
    <h2 style="margin-top:6mm">7. Honnêteté sur les limites actuelles</h2>
    <ul><li><b>Prototype.</b> L'application est une démonstration complète, mais aucun serveur d'État n'est relié et aucune donnée réelle n'a été collectée.</li><li><b>Pas de mesure du sous-sol.</b> La portance, la nature précise du sol et la nappe ne se déduisent pas d'une photo. Seuls sondages et essais le font.</li><li><b>Règles à valider.</b> Les pondérations du moteur sont un point de départ à calibrer avec des géotechniciens et des relevés congolais réels.</li><li><b>Contexte local.</b> Les quartiers cités viennent de la presse : ce n'est pas une carte officielle des zones à risque.</li><li><b>Fraude.</b> Un utilisateur déterminé peut contourner des contrôles locaux ; le serveur et la signature des agents sont nécessaires pour une sécurité complète.</li><li><b>Photos d'exemple.</b> Elles ne viennent pas du Congo.</li></ul></div>""")
    P.append(f"""<div class="p"><h2>8. Feuille de route proposée</h2>
    <p><span class="ph">Phase 0</span><b>Prototype (fait).</b> Application de démonstration, tests automatiques, dossier de présentation.</p>
    <p><span class="ph">Phase 1</span><b>Pilote sur une commune.</b> Serveur sécurisé, comptes et rôles, signature des agents ; validation des règles avec des géotechniciens (par exemple avec le BCBTP ou un laboratoire) ; formation de quelques agents ; premiers relevés réels.</p>
    <p><span class="ph">Phase 2</span><b>Calibrage et cartes.</b> Ajuster le moteur sur les relevés réels et les résultats de laboratoire ; intégrer les zones à risque officielles si l'État les fournit ; liaison avec le dépôt de permis.</p>
    <p><span class="ph">Phase 3</span><b>Extension.</b> Autres villes, routes et ouvrages d'art, échanges avec les banques et notaires pour la vérification des rapports.</p>
    <div class="k">Aucun prix ni calendrier précis n'est avancé ici : ils se chiffrent <b>avec les partenaires</b> une fois le périmètre du pilote choisi.</div>
    <h2 style="margin-top:6mm">9. Ce dont le projet a besoin</h2>
    <ul><li>Un <b>partenaire technique</b> (bureau de contrôle, laboratoire, université) pour valider et calibrer les règles.</li><li>Un <b>cadre institutionnel</b> : quelle administration reçoit les relevés, quel statut juridique donner au rapport.</li><li>L'accès aux <b>données publiques</b> existantes : zones à risque, plans d'urbanisme, ouvrages en cours.</li><li>Un <b>site pilote</b> et quelques agents volontaires.</li><li>La validation du <b>traitement des données</b> (photos, positions) avec les autorités compétentes.</li></ul>
    <div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>10. Sources</h2><ul class="src">{''.join(f'<li>{t} — {u}</li>' for t, u in SRC)}</ul>
    <p class="mini">Les citations ont été relevées en novembre 2026 ; leur contenu doit être revérifié avant toute communication officielle. Photos d'exemple : Unsplash (licence libre) — voir le fichier LISEZ-MOI.</p>
    <div style="margin-top:5mm;display:flex;align-items:center;gap:6mm;border-top:2px solid #e3b653;padding-top:4mm"><img src="{LOGO_P}" style="width:18mm"><div><b>STAR ENTREPRISE</b><br><span class="mini">Fondateur et Président Directeur Général : OTEMBA KIBANGOU Daddyh Cariany<br>Brazzaville, République du Congo · contact@starentreprise.com · WhatsApp +242 06 656 50 50</span></div></div><div class="bandeau"></div></div>""")
    return P
def main():
    html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>' + CSS + '</style></head><body>' + ''.join(pages()) + '</body></html>'
    tmp = '/tmp/terrain-sur-dossier.html'; open(tmp, 'w', encoding='utf-8').write(html)
    js = f"""const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://{tmp}');await p.waitForTimeout(700);
await p.pdf({{path:'{OUT}',format:'A4',printBackground:true,margin:{{top:'0',bottom:'0',left:'0',right:'0'}}}});await b.close();}})().catch(e=>{{console.error(e);process.exit(1)}});"""
    open('/tmp/terrain-sur-r.cjs', 'w').write(js); env = dict(os.environ)
    r = subprocess.run(['node', '/tmp/terrain-sur-r.cjs'], capture_output=True, text=True, env=env, cwd=ROOT)
    if r.returncode: print(r.stderr); sys.exit(1)
    print('OK', OUT, os.path.getsize(OUT) // 1024, 'Ko')
main()
