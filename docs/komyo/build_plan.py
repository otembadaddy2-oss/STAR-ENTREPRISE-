from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
OUT='/home/user/STAR-ENTREPRISE-/docs/komyo/KOMYO-Plan-Revenus-et-Etat-des-lieux.pdf'
INK=colors.HexColor('#241536'); GOLD=colors.HexColor('#E8A93D'); CORAL=colors.HexColor('#FF6B4A'); LINE=colors.HexColor('#eee2cc'); DIM=colors.HexColor('#6b5f80')
H1=ParagraphStyle('h1',fontName='Helvetica-Bold',fontSize=22,leading=26,textColor=INK,spaceAfter=4)
H2=ParagraphStyle('h2',fontName='Helvetica-Bold',fontSize=14,leading=18,textColor=CORAL,spaceBefore=12,spaceAfter=5)
H3=ParagraphStyle('h3',fontName='Helvetica-Bold',fontSize=11,leading=14,textColor=INK,spaceBefore=6,spaceAfter=2)
B=ParagraphStyle('b',fontName='Helvetica',fontSize=10,leading=14,textColor=INK)
S=ParagraphStyle('s',fontName='Helvetica',fontSize=8.5,leading=11.5,textColor=DIM)
BL=ParagraphStyle('bl',parent=B,leftIndent=12,bulletIndent=2)
def P(t,st=B): return Paragraph(t,st)
def bl(items): return [Paragraph(i,BL,bulletText='•') for i in items]
def tbl(rows,widths,head=True):
    t=Table([[Paragraph(str(c),ParagraphStyle('c',parent=B,fontSize=9,leading=12,fontName='Helvetica-Bold' if (head and r==0) else 'Helvetica',textColor=colors.white if (head and r==0) else INK)) for c in row] for r,row in enumerate(rows)],colWidths=widths,repeatRows=1 if head else 0)
    st=[('GRID',(0,0),(-1,-1),0.4,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]
    if head: st.append(('BACKGROUND',(0,0),(-1,0),CORAL))
    t.setStyle(TableStyle(st)); return t
doc=SimpleDocTemplate(OUT,pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=16*mm,bottomMargin=16*mm,title='KOMYO - Plan de revenus et etat des lieux',author='STAR ENTREPRISE')
f=[]
f+= [P('KOMYO : gagner de l\'argent',H1),P('Plan pour les 1 000 premiers utilisateurs, et état des lieux au 25 octobre 2026',ParagraphStyle('sub',parent=B,textColor=DIM,fontSize=11)),Spacer(1,6)]
f+= [P('1. Le principe',H2),
 P('Facebook et TikTok sont gratuits pour toi, mais <b>quelqu\'un d\'autre paie</b> : les entreprises. Chez Meta, la publicité représente près de 98 % des revenus (environ 196 milliards de dollars en 2025, d\'après son rapport annuel). Pour TikTok, les chiffres sont des estimations : publicité environ 77 %, boutique intégrée environ 20 %, cadeaux dans les directs 5 à 10 %. Le moteur est toujours le même : <b>beaucoup de monde qui revient chaque jour</b>, puis des entreprises qui paient pour lui parler.'),
 P('Pour KOMYO, la règle est simple : <b>d\'abord les utilisateurs, ensuite l\'argent</b>. Sans audience, aucune annonce ne se vend. Mais les caisses sont déjà posées ci-dessous.')]
f+= [P('2. Ce que KOMYO vend (prix en FCFA)',H2)]
f+= [tbl([
 ['Offre','Prix','Pour qui','État'],
 ['Annonce visible par tous – essai 1 semaine','2 000','Petit commerce, artiste qui teste','Prêt, pas encore en ligne'],
 ['Annonce – 2 semaines','4 000','Musique, événement, boutique','En ligne'],
 ['Annonce – 1 mois','10 000','Idem, durée plus longue','En ligne'],
 ['Abonnement Business','5 000 / mois','Commerces, prestataires, créateurs','En ligne (paiement confirmé à la main)'],
 ['Abonnement Famille (PIOUPIOU)','1 500 / mois','Parents d\'enfants de 3 à 6 ans','En ligne (idem)'],
 ['Keydou : demande de service','1 000 par demande','Hôtel, restaurant, salle, véhicule, dépannage','En ligne'],
 ['Partenariat / sponsor (campagne de marque)','25 000 à 100 000, à négocier','Marques, entreprises du groupe, institutions','À proposer (pas de code nécessaire)'],
 ['Offre fondateurs : 1re annonce d\'une semaine à 1 000','1 000 (promotion)','Les 50 premiers commerces','Idée à valider, activation à la main'],
 ['Cadeaux dans ÉCLAT (direct), commission boutique','Commission %','Créateurs, vendeurs','Phase 2 (paiement automatique requis)'],
],[58*mm,28*mm,48*mm,38*mm])]
f+= [P('Sur le site, tout est réuni sur une page <b>Tarifs</b> (tarifs.html), reliée depuis l\'accueil et le pied de page. L\'équivalent du prix dans la monnaie du pays s\'affiche automatiquement pour les visiteurs de l\'étranger.',S)]
f+= [P('3. Ce que cela peut rapporter avec 1 000 utilisateurs actifs',H2),
 P('<b>Attention : ce sont des estimations, pas des promesses.</b> Elles supposent 1 000 personnes qui reviennent régulièrement et une minorité qui paie. Taux de change : 1 euro = 655,957 FCFA.')]
f+= [tbl([
 ['Par mois','Prudent','Réaliste','Ambitieux'],
 ['Annonces vendues (prix moyen)','8 × 5 000 = 40 000','20 × 6 000 = 120 000','40 × 7 000 = 280 000'],
 ['Abonnés Business (5 000)','5 = 25 000','15 = 75 000','40 = 200 000'],
 ['Abonnés Famille (1 500)','10 = 15 000','30 = 45 000','60 = 90 000'],
 ['Demandes Keydou (1 000)','15 = 15 000','40 = 40 000','100 = 100 000'],
 ['Sponsors (75 000)','0','0','2 = 150 000'],
 ['<b>Total par mois (FCFA)</b>','<b>95 000</b>','<b>280 000</b>','<b>820 000</b>'],
 ['En euros, environ','145 €','427 €','1 250 €'],
],[52*mm,40*mm,40*mm,40*mm])]
f+= [P('Lecture honnête : avec 1 000 utilisateurs, KOMYO rapporte de quoi payer ses frais et un début de revenu. Le « beaucoup d\'argent » arrive avec l\'échelle : en gardant les mêmes proportions, <b>10 000 utilisateurs actifs</b> donneraient environ <b>2,8 millions de FCFA par mois</b> (cas réaliste), et la diaspora (France, Canada, etc.) paie plus, grâce à l\'affichage des prix dans sa monnaie.',S)]
f+= [P('4. Plan des 30 premiers jours',H2)]
f+= [tbl([
 ['Semaine','À faire','Résultat attendu'],
 ['1','Débloquer Netlify et publier la mise à jour. Publier 20 vidéos de départ (équipe + proches) pour que le fil ne soit pas vide. Tester un vrai paiement Mobile Money de bout en bout.','Un fil vivant et un paiement qui marche'],
 ['2','Recruter les 30 premiers commerces et artistes : réseau STAR ENTREPRISE (Pices LAMAH, Pili-Pili, Maison de la Drépanocytose, SOS DOC, boutiques partenaires). Offre fondateurs : 1re annonce d\'une semaine à 1 000 FCFA.','30 comptes Business, premières annonces'],
 ['3','Lancer la pub : version 15 s en statut WhatsApp, 30 s sur TikTok et Facebook, 60 s sur YouTube. Chaque utilisateur reçoit le bouton « Inviter sur WhatsApp ».','Premières centaines d\'inscriptions'],
 ['4','Mesurer et ajuster : inscriptions, part de personnes qui publient, annonces vendues, abonnements. Garder les prix qui se vendent, changer les autres.','Décision : quoi pousser le mois suivant'],
],[20*mm,110*mm,40*mm])]
f+= [P('Chiffres à suivre chaque semaine : inscriptions, utilisateurs qui reviennent après 7 jours, vidéos publiées, annonces achetées, abonnements Business et Famille, demandes Keydou.',S)]
f+= [P('5. Les points de vigilance',H2)]
f+= bl(['<b>Paiement manuel :</b> aujourd\'hui, chaque paiement Mobile Money est confirmé à la main par l\'équipe. C\'est correct pour les 100 premiers clients, mais ce sera un goulot ensuite. Étape suivante : brancher un service de paiement (CinetPay, Flutterwave ou équivalent). Il faut pour cela tes clés de compte marchand.',
 '<b>Mineurs :</b> KOMYO Jeunes est ouvert aux 13–17 ans, chaque vidéo est vérifiée par l\'équipe avant d\'apparaître, et les adultes n\'y ont pas accès. Les 7–12 ans n\'ont pas d\'espace : cela demande l\'accord des parents.',
 '<b>Modération :</b> plus de monde, c\'est plus de vidéos à vérifier (Jeunes, PIOUPIOU, annonces). Prévoir une personne dédiée dès les premières centaines d\'utilisateurs.',
 '<b>Hébergement :</b> Netlify facture au trafic et aux publications. Plus de vidéos et de visites coûtent plus cher : suivre la consommation chaque mois (voir l\'état des lieux).',
 '<b>Obligations :</b> déclarer ces revenus et la structure juridique avec ton comptable.'])
f+= [PageBreak(),P('État des lieux au 25 octobre 2026',H1),Spacer(1,4)]
f+= [P('A. La publicité KOMYO',H2)]
f+= bl(['Film « Le monde en mouvement » en version 4 : 1 min 55 s, voix validées (Marie, la vendeuse, Angèle, Foel, Messie, Sita), prononciation de « Bissa Pop » et « trois cents francs » corrigée.',
 'Scène 9 refaite : dialogue de Sita validé, nouveau balayage de caméra et écran de téléphone propre avec l\'appel KOMYO.',
 'Déclinaisons livrées : 60 s, 30 s et 15 s, chacune en 16:9, 9:16 (vertical) et 1:1 (carré), avec un contrôle du texte parlé sur la version 60 s.',
 'Générique animé du logo KOMYO (11,5 s, avec le son) envoyé pour WhatsApp.',
 'Nouvelle idée de pub proposée : « La table du dimanche », avec la phrase « KOMYO, c\'est ici, ensemble. Tout près, et partout à la fois. ». <b>En attente de ton choix (A, B, C ou A + B) et du budget.</b>'])
f+= [P('B. Le site KOMYO (komyo.starentreprise.com)',H2)]
f+= [P('<b>Déjà en ligne et testé par toi :</b> inscription, connexion, filmer et publier, espaces Talents / Business / Musique / Découverte, fil « Tous », J\'aime, commentaires, suppression, annonces payantes, abonnements, Keydou.'),Spacer(1,3),
 P('<b>Prêt dans le code, pas encore en ligne</b> (Netlify bloque les publications) :')]
f+= bl(['Bouton « Fil » corrigé (il ne ressemble plus à un « + » et il fonctionne).',
 'Guide de démarrage avec grandes flèches, en 7 étapes, une seule fois ; relançable depuis Mon espace.',
 'Formulaire « Une question sur KOMYO ? » sur l\'accueil : message enregistré dans le Backend avec notification, puis boutons WhatsApp et e-mail préremplis ; adresse contact@starentreprise.com affichée ; bloc « Besoin d\'aide ? » dans Mon espace.',
 'KOMYO Jeunes ouvert aux 13–17 ans, vidéos vérifiées avant affichage ; Business réservé aux 18 ans et plus.',
 'Bouton Partager sur chaque vidéo : WhatsApp, Facebook, e-mail / Gmail, envoi du fichier vidéo, copie du lien.',
 'Vidéos plus rapides : préchargement, relance de la lecture, roue d\'attente, cache côté serveur.',
 'Nouvelle page Tarifs ; annonce d\'essai à 2 000 FCFA ; carte « Fais grandir KOMYO avec tes amis » (invitation WhatsApp) ; lien « Faire connaître mon activité » dans Business, Musique et Talents.',
 'Le site reste en français par défaut (l\'anglais ne s\'ouvre que si on le demande).'])
f+= [P('C. Ce qui bloque, et ce qu\'il reste à décider',H2),
 tbl([
 ['Sujet','Situation','Qui'],
 ['Publication sur Netlify','Refusée : « account credit usage exceeded ». Le site actuel fonctionne. J\'ai compté 26 publications en octobre, ce qui a pu consommer les crédits. Il faut regarder Billing / Usage chez Netlify, recharger ou écrire au support, puis me prévenir.','Toi, puis moi'],
 ['Nouvelle pub','Choisir l\'idée (A, B, C, A + B) et le budget Higgsfield (solde estimé : environ 2 dollars, non vérifié).','Toi'],
 ['E-mail automatique du formulaire','Demande un service d\'envoi avec une clé (par exemple Resend). Sans cela : message dans le Backend + boutons préremplis.','Toi (clé) puis moi'],
 ['Paiement Mobile Money automatique','Demande tes clés de compte marchand chez un service de paiement.','Toi'],
 ['Test du formulaire et de contact@starentreprise.com','Envoyer un message test à l\'adresse pour vérifier qu\'elle répond.','Toi'],
 ['X SAPHIR','Pilote de 90 secondes prêt dans le dossier de production ; dossier d\'analyse de références enregistré. Rien n\'est lancé tant que tu n\'as pas dit « on y va ».','Toi'],
 ['Sécurité','Révoquer la clé Higgsfield utilisée ; décider si on annule le renouvellement d\'ElevenLabs.','Toi'],
 ],[40*mm,100*mm,30*mm])]
f+= [Spacer(1,6),P('Tout le code et les documents sont sur la branche claude/video-mp4-social-media-0hgpf6 du dépôt STAR-ENTREPRISE-. Le plan de production de la pub est dans docs/pub-komyo-monde/120s/.',S)]
doc.build(f); print(OUT)
