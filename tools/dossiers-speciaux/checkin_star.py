"""Dossier de présentation CHECK-IN STAR (réception d'hôtel de luxe : passeport -> chambre -> accusé QR).
Lancer : /usr/bin/python3.12 tools/dossiers-speciaux/checkin_star.py  -> docs/dossiers-speciaux/CHECK-IN-STAR-Dossier-de-presentation.pdf
Faits sur l'hôtel de référence et tarifs : sources publiques citées en fin de document ; aucun chiffre inventé."""
import os, sys, base64, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')); sys.path.insert(0, HERE)
import images as I
CAP = os.path.join(ROOT, 'docs', 'dossiers-speciaux', 'check-in-star', 'captures'); OUT = os.path.join(ROOT, 'docs', 'dossiers-speciaux', 'CHECK-IN-STAR-Dossier-de-presentation.pdf')
def img(n):
    with open(n if os.path.isabs(n) else os.path.join(CAP, n), 'rb') as f: return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode()
HOTEL = lambda n: img(os.path.join(ROOT, 'hotel-reception', 'img', n))
LOGO = I.logo_officiel_uri(500); LOGO_P = I.logo_officiel_jpeg_uri(150)
SRC = [
 ('Radisson Hotels — Radisson Blu M\'Bamou Palace Hotel, Brazzaville (178 chambres, types de chambres)', 'https://www.radissonhotels.com/fr-fr/hotels/radisson-blu-brazzaville-mbamou/chambres'),
 ('Cvent — fiche de l\'hôtel (répartition par catégorie : 118 / 30 / 10 / 10 / 3 / 3 / 2 / 2)', 'https://www.cvent.com/venues/brazzaville/hotel/radisson-blu-m-bamou-palace-hotel-brazzaville/venue-0f1ee664-a1e1-4224-b9f0-6b819b4ed00b'),
 ('Hotels.com — 178 chambres sur 12 étages', 'https://uk.hotels.com/ho396103168/radisson-blu-m-bamou-palace-hotel-brazzaville-republic-of-the-congo'),
 ('Momondo — fourchette de prix 184 $ à 735 $', 'https://www.momondo.com/hotels/brazzaville/Radisson-Blu-M-Bamou-Palace-Hotel-Brazzaville.mhd2407748.ksp'),
 ('MakeMyTrip — chambre supérieure 247 $ la nuit (+ 28 $ de taxes et frais)', 'https://www.makemytrip.global/hotels-international/en-us/republic_of_congo/brazzaville-hotels/radisson_blu_m_bamou_palace_hotel_brazzaville-details.html'),
 ('Trip.com — liste des catégories de suites', 'https://uk.trip.com/hotels/brazzaville-hotel-detail-4056023/radisson-blu-m-bamou-palace-hotel-brazzaville'),
]
CSS = """
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:'Inter','Segoe UI',system-ui,sans-serif;color:#1b2030;font-size:10.4pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.p{width:210mm;height:297mm;padding:20mm 18mm 20mm;page-break-after:always;position:relative;overflow:hidden;background:#fff}
.cov{background:#0a1730;color:#fff;padding:0;display:flex;flex-direction:column;align-items:center;text-align:center}.cov .ph{position:absolute;inset:0;background:center/cover;opacity:.42}.cov::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#0a173099,#0a1730f0 80%)}.cov>*{position:relative;z-index:2}
.cov .lg{margin-top:30mm;width:70mm}.cov h1{font-family:Georgia,serif;font-size:36pt;margin:10mm 0 2mm;letter-spacing:.06em;color:#fff}.cov h1 b{color:#f2d27a}.cov .sub{font-size:14pt;color:#dfe6fa;max-width:150mm}.cov .bd{margin-top:14mm;padding:6px 16px;border:1px solid #f2d27a99;border-radius:99px;color:#f2d27a;font-size:10pt;letter-spacing:.08em}.cov .ft{position:absolute;bottom:16mm;left:0;right:0;font-size:9.5pt;color:#c3cdea}
.bandeau{position:absolute;left:0;right:0;bottom:0;height:3mm;background:linear-gradient(90deg,#1f8a4c 33%,#f2c230 33% 66%,#c0392b 66%)}
.p:not(.cov)::after{content:'CHECK-IN STAR · STAR ENTREPRISE · prototype de démonstration';position:absolute;bottom:7mm;left:18mm;font-size:8pt;color:#646b80}
h2{font-family:Georgia,serif;font-size:17pt;color:#0a1730;margin:0 0 3mm;border-bottom:2px solid #d9b25a;padding-bottom:2mm}h3{font-size:12pt;color:#13285a;margin:4mm 0 1.5mm}p{margin:0 0 2.6mm}
.k{background:#fff4d6;border-left:4px solid #d9b25a;padding:3mm 4mm;border-radius:2mm;margin:3mm 0;font-size:9.8pt}.ko{background:#fdecea;border-left-color:#c0392b}.ok{background:#e9f7ef;border-left-color:#1f8a4c}
table{width:100%;border-collapse:collapse;font-size:9.2pt;margin:2mm 0}th{background:#0a1730;color:#fff;text-align:left;padding:2mm 2.5mm}td{border-bottom:1px solid #e6dcc0;padding:1.8mm 2.5mm;vertical-align:top}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.f{border:1px solid #ddd;border-radius:3mm;overflow:hidden}.f img{width:100%;display:block;object-fit:cover;object-position:top}.f figcaption{font-size:8.4pt;color:#646b80;padding:1.5mm 2.5mm;background:#f7f2e6}figure{margin:0}
ul{margin:0 0 2.6mm;padding-left:5mm}li{margin:0 0 1.2mm}.src li{font-size:8.4pt;word-break:break-all}.mini{font-size:8.6pt;color:#646b80}
.st{display:flex;gap:3mm;margin:3mm 0}.st div{flex:1;background:#0a1730;color:#fff;border-radius:3mm;padding:3mm;text-align:center;font-size:9pt}.st b{display:block;font-family:Georgia,serif;font-size:15pt;color:#f2d27a}
"""
def pages():
    P = []
    P.append(f"""<div class="p cov"><div class="ph" style="background-image:url({HOTEL('hall.jpg')})"></div><img class="lg" src="{LOGO}"><h1>CHECK-IN <b>STAR</b></h1><div class="sub">Du passeport à la chambre, sans papier.<br>Lecture de la pièce, enregistrement, attribution de la chambre et accusé en code QR.</div><div class="bd">RÉCEPTION D'HÔTEL DE LUXE · CONGO-BRAZZAVILLE</div><div class="ft">STAR ENTREPRISE · Brazzaville, République du Congo<br>RCCM CG-BZV-01-2026-A10-01950 · 28 novembre 2026 · prototype de démonstration</div><div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>1. Le principe, en une page</h2>
    <p>Un client arrive à la réception d'un hôtel de luxe. Il présente son passeport. <b>L'application fait le reste</b> : elle lit la pièce, l'enregistre, demande seulement la durée du séjour, choisit la meilleure chambre disponible et envoie au client un <b>accusé de réception en code QR</b> sur son téléphone.</p>
    <div class="st"><div><b>1</b>Photo du passeport</div><div><b>2</b>Nombre de nuits</div><div><b>3</b>Chambre attribuée</div><div><b>4</b>Accusé QR</div></div>
    <div class="g2"><figure class="f"><img src="{img('passeport.jpg')}" style="height:62mm"><figcaption><b>1. Lecture du passeport.</b> Les deux lignes de lecture automatique sont lues ; chiffres de contrôle vérifiés, expiration et doublons contrôlés.</figcaption></figure>
    <figure class="f"><img src="{img('chambre.jpg')}" style="height:62mm"><figcaption><b>3. Chambre attribuée.</b> Photo de la catégorie, numéro, étage, prix du séjour et raison du choix.</figcaption></figure></div>
    <h3>Ce que l'application fait à la place de la réception</h3>
    <ul><li><b>Enregistre</b> l'identité complète à partir du passeport (nom, prénoms, naissance, nationalité, numéro, expiration).</li><li><b>Contrôle</b> : pièce expirée, chiffres de contrôle faux (pièce possiblement falsifiée), même passeport déjà en séjour.</li><li><b>Choisit la chambre</b> parmi les 170 : catégorie souhaitée, étage élevé, accès mobilité réduite, chambre propre et libre pour toute la durée.</li><li><b>Calcule le prix</b> à partir des tarifs de l'hôtel.</li><li><b>Remet au client</b> un accusé (QR) par WhatsApp ou partage d'image, et archive une <b>fiche d'enregistrement</b> en PDF.</li><li><b>Tient le registre</b> dans un journal verrouillé et un plan en temps réel de toutes les chambres.</li></ul>
    <div class="k"><b>Positionnement honnête.</b> Des solutions d'enregistrement sans contact existent déjà dans le monde. La valeur de CHECK-IN STAR est son adaptation : passeport lu depuis un simple téléphone ou une tablette, fonctionnement hors connexion, français, tarifs en dollars et FCFA, et une chaîne complète de la pièce d'identité jusqu'à la chambre.</div><div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>2. L'hôtel de référence : ce que disent les sources</h2>
    <p>Vous avez demandé de partir de l'hôtel Radisson Blu de Brazzaville. Il s'agit du <b>Radisson Blu M'Bamou Palace Hotel</b>. Voici ce que j'ai trouvé en ligne.</p>
    <ul><li><b>178 chambres</b> d'après le site officiel du groupe (une page de réservation affiche 216, chiffre probablement ancien).</li><li>Répartition publiée sur une fiche professionnelle : 118 chambres standard, 30 Business Class, 10 Junior Suites, 10 Suites Exécutives, 3 Suites Diplomatiques, 3 Suites Royales, 2 Suites Présidentielles, 2 Penthouses, soit 178.</li><li>Un bâtiment sur <b>12 étages</b>.</li></ul>
    <h3>Les tarifs : des repères, pas des prix officiels</h3>
    <p>Les prix officiels s'affichent seulement avec des dates sur le site de l'hôtel. Les comparateurs donnent ces repères, en dollars, variables selon les dates :</p>
    <table><tr><th>Catégorie</th><th>Repère trouvé</th><th>Remarque</th></tr><tr><td>Chambre supérieure</td><td>environ 184 à 247 $ la nuit</td><td>247 $ + 28 $ de taxes et frais sur une page de réservation</td></tr><tr><td>Chambre exécutive</td><td>environ 269 $ la nuit</td><td>correspond à la catégorie Business Class dans notre plan</td></tr><tr><td>Suites</td><td>à partir d'environ 397 $ la nuit</td><td>un seul repère, sans détail par suite</td></tr><tr><td>Suites supérieures, Penthouse</td><td><b>aucun tarif public trouvé</b></td><td>« sur devis »</td></tr></table>
    <p class="mini">Fourchette générale relevée : de 184 $ à 735 $ la nuit. Aucun tarif en FCFA n'a été trouvé : les montants en francs CFA se calculent avec le taux du jour saisi par l'hôtel. Ces repères ne sont pas les tarifs de votre hôtel : <b>c'est la direction qui saisit ses vrais tarifs</b> dans l'application.</p>
    <h3>Notre plan de 170 chambres</h3>
    <p>Comme vous l'avez supposé, j'ai construit un hôtel de <b>170 chambres</b> en reprenant la répartition ci-dessus, légèrement réduite : 112 Supérieures, 28 Business, 10 Junior Suites, 10 Suites Exécutives, 3 Diplomatiques, 3 Royales, 2 Présidentielles, 2 Penthouses, sur 12 étages (étages 1 à 9 : chambres standard et Business ; 10 : Junior et Exécutives ; 11 : Diplomatiques et Royales ; 12 : Présidentielles et Penthouses).</p>
    <figure class="f"><img src="{img('plan.jpg')}" style="height:78mm"><figcaption><b>Le plan en temps réel</b> : libre, occupée, départ aujourd'hui, à nettoyer, arrivée prévue, maintenance. Toucher une chambre affiche le client et les actions.</figcaption></figure><div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>3. Comment la chambre est choisie</h2>
    <p>L'attribution n'est pas aléatoire. Pour chaque arrivée, l'application :</p>
    <ul><li>ne garde que les chambres <b>propres, sans panne et libres pour toutes les nuits</b> du séjour (en tenant compte des réservations à venir) ;</li><li>cherche d'abord la catégorie demandée (Supérieure par défaut), puis les catégories supérieures en <b>surclassement signalé</b>, puis les inférieures ;</li><li>préfère la chambre qui <b>remplit le mieux le calendrier</b> : celle dont la prochaine arrivée suit juste la fin du séjour, pour éviter les trous invendables ;</li><li>applique les préférences : étage élevé, accès mobilité réduite ;</li><li>propose la meilleure chambre et <b>cinq alternatives</b>, en expliquant chaque choix à l'écran.</li></ul>
    <div class="g2"><figure class="f"><img src="{img('sejour.jpg')}" style="height:56mm"><figcaption>Le séjour : nuits, dates, catégorie, personnes, WhatsApp du client.</figcaption></figure><figure class="f"><img src="{img('tableau.jpg')}" style="height:56mm"><figcaption>Le tableau de bord de la réception.</figcaption></figure></div>
    <h3>L'accusé du client</h3>
    <div class="g2"><figure class="f"><img src="{img('mobile-accuse.jpg')}" style="height:98mm"><figcaption>L'accusé sur le téléphone : photo de l'hôtel, numéro de chambre, dates et code QR.</figcaption></figure>
    <div><p>Le QR contient le code du séjour, la chambre, les dates et un <b>sceau d'authenticité</b>. Au restaurant, au spa ou à la porte, l'agent le scanne : <b>séjour valide, terminé, pas commencé, QR altéré ou inconnu</b>.</p><div class="k ok"><b>Envoi au client.</b> Le bouton WhatsApp ouvre la conversation avec le message prêt ; « Partager l'image » envoie le QR lui-même. Une image PNG et une fiche PDF sont aussi disponibles.</div><div class="k"><b>Fiche d'enregistrement.</b> Un PDF de deux pages : page 1 = archive de l'hôtel (identité, séjour, signatures) ; page 2 = accusé du client.</div></div></div><div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>4. Sécurité, données et limites</h2>
    <h3>Contre la fraude et les erreurs</h3>
    <ul><li><b>Pièce falsifiée ou mal lue</b> : les chiffres de contrôle de la zone de lecture ne correspondent pas, l'enregistrement est bloqué ; un responsable peut passer outre, la décision est inscrite au journal.</li><li><b>Passeport expiré</b> : bloqué de la même manière.</li><li><b>Même passeport dans deux chambres</b> : alerte.</li><li><b>Accusé falsifié</b> : le sceau ne correspond plus, le QR est refusé.</li><li><b>Journal verrouillé</b> : chaque arrivée et chaque départ porte l'empreinte du précédent ; une modification cachée casse la chaîne et se voit.</li></ul>
    <h3>Données personnelles</h3>
    <p>La photo du passeport n'est <b>pas conservée</b>. Les données d'identité restent sur l'appareil dans ce prototype et sont masquées dans les listes. Les numéros de pièce ne sont pas écrits en clair dans le journal. Un déploiement réel demandera un hébergement sécurisé, des droits d'accès par rôle et la conformité avec la réglementation congolaise, à valider avec les autorités et un conseil juridique.</p>
    <h3>Ce que le prototype ne fait pas encore</h3>
    <table><tr><th>Limite</th><th>Suite possible</th></tr>
    <tr><td>Pas de serrures connectées : le QR est un accusé et une preuve de séjour, pas une clé de porte</td><td>Intégrer des serrures à carte, code ou Bluetooth</td></tr>
    <tr><td>Envoi WhatsApp semi-automatique (le message s'ouvre, l'agent appuie sur envoyer)</td><td>WhatsApp Business ou SMS officiel</td></tr>
    <tr><td>La lecture optique dépend de la photo : floue ou avec reflets, elle échoue ; la saisie manuelle reste possible</td><td>Lecteur de passeport dédié, lecture de la puce sans contact</td></tr>
    <tr><td>Aucun paiement ni facture</td><td>Paiement Mobile Money et carte, facture, taxes de séjour</td></tr>
    <tr><td>Tarifs : repères en ligne, taxes non incluses</td><td>L'hôtel saisit ses tarifs réels, par saison</td></tr>
    <tr><td>Données sur un seul appareil</td><td>Serveur sécurisé, plusieurs postes, sauvegarde</td></tr>
    <tr><td>Fiche de police et déclarations officielles non branchées</td><td>Modèle à valider avec les autorités, envoi électronique si autorisé</td></tr></table>
    <h3>Feuille de route proposée</h3>
    <p><b>Phase 0 (faite)</b> : prototype complet et démonstration. <b>Phase 1</b> : pilote dans un hôtel, serveur sécurisé, tarifs réels, formation de la réception. <b>Phase 2</b> : serrures, paiement, WhatsApp Business, interface avec le logiciel de gestion existant. <b>Phase 3</b> : autres hôtels du groupe et partenaires. Aucun prix ni calendrier n'est avancé ici : ils se chiffrent avec l'hôtel pilote.</p>
    <div class="bandeau"></div></div>""")
    P.append(f"""<div class="p"><h2>5. Sources</h2><ul class="src">{''.join(f'<li>{t} — {u}</li>' for t, u in SRC)}</ul>
    <p class="mini">Données relevées en novembre 2026 ; les tarifs et le nombre de chambres peuvent changer et doivent être revérifiés auprès de l'hôtel avant toute communication. Cet hôtel est cité comme <b>référence publique</b> : CHECK-IN STAR n'est lié ni à Radisson ni à aucun autre groupe hôtelier. Les noms de clients, séjours et chambres affichés dans la démonstration sont <b>fictifs</b>. Photos : Unsplash (licence libre), voir le fichier LISEZ-MOI.</p>
    <div style="margin-top:8mm;display:flex;align-items:center;gap:6mm;border-top:2px solid #d9b25a;padding-top:4mm"><img src="{LOGO_P}" style="width:18mm"><div><b>STAR ENTREPRISE</b><br><span class="mini">Fondateur et Président Directeur Général : OTEMBA KIBANGOU Daddyh Cariany<br>Brazzaville, République du Congo · contact@starentreprise.com · WhatsApp +242 06 656 50 50</span></div></div>
    <div class="g2" style="margin-top:8mm"><figure class="f"><img src="{HOTEL('piscine.jpg')}" style="height:50mm"></figure><figure class="f"><img src="{HOTEL('reception.jpg')}" style="height:50mm"></figure></div><div class="bandeau"></div></div>""")
    return P
def main():
    html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>' + CSS + '</style></head><body>' + ''.join(pages()) + '</body></html>'
    tmp = '/tmp/checkin-dossier.html'; open(tmp, 'w', encoding='utf-8').write(html)
    js = f"""const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://{tmp}');await p.waitForTimeout(700);
await p.pdf({{path:'{OUT}',format:'A4',printBackground:true,margin:{{top:'0',bottom:'0',left:'0',right:'0'}}}});await b.close();}})().catch(e=>{{console.error(e);process.exit(1)}});"""
    open('/tmp/checkin-r.cjs', 'w').write(js)
    r = subprocess.run(['node', '/tmp/checkin-r.cjs'], capture_output=True, text=True, cwd=ROOT)
    if r.returncode: print(r.stderr); sys.exit(1)
    print('OK', OUT, os.path.getsize(OUT) // 1024, 'Ko')
main()
