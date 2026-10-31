# Génère le guide de Sarah (PDF + Markdown) à partir des mêmes contenus.
import json, collections
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
ROOT='/home/user/STAR-ENTREPRISE-'
OUT_PDF=ROOT+'/docs/komyo/SARAH-Guide-gestion-clients-KOMYO-Keydou.pdf'; OUT_MD=ROOT+'/docs/komyo/SARAH-Guide-gestion-clients-KOMYO-Keydou.md'
c26=collections.Counter(l['service'] for l in json.load(open(ROOT+'/netlify/functions/keydou-annuaire-2026.json')))
cs=collections.Counter(l['service'] for l in json.load(open(ROOT+'/netlify/functions/keydou-annuaire.json')))
cnt={k:max(c26.get(k,0),cs.get(k,0)) for k in set(c26)|set(cs)}   # au moins ce nombre de fiches (les deux listes se recoupent)
INK=colors.HexColor('#241536'); GOLD=colors.HexColor('#E8A93D'); CORAL=colors.HexColor('#FF6B4A'); LINE=colors.HexColor('#eee2cc'); DIM=colors.HexColor('#6b5f80')
H1=ParagraphStyle('h1',fontName='Helvetica-Bold',fontSize=22,leading=26,textColor=INK,spaceAfter=4)
H2=ParagraphStyle('h2',fontName='Helvetica-Bold',fontSize=14,leading=18,textColor=CORAL,spaceBefore=12,spaceAfter=5)
B=ParagraphStyle('b',fontName='Helvetica',fontSize=10,leading=14,textColor=INK)
S=ParagraphStyle('s',fontName='Helvetica',fontSize=8.5,leading=11.5,textColor=DIM)
BL=ParagraphStyle('bl',parent=B,leftIndent=12,bulletIndent=2)
MSG=ParagraphStyle('msg',parent=B,fontSize=9.5,leading=13,leftIndent=8,borderPadding=5,backColor=colors.HexColor('#fffaf0'),borderColor=LINE,borderWidth=0.6,spaceAfter=6)
def tbl(rows,widths):
    t=Table([[Paragraph(str(c),ParagraphStyle('c',parent=B,fontSize=8.6,leading=11.5,fontName='Helvetica-Bold' if r==0 else 'Helvetica',textColor=colors.white if r==0 else INK)) for c in row] for r,row in enumerate(rows)],colWidths=[w*mm for w in widths],repeatRows=1)
    t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.4,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),('BACKGROUND',(0,0),(-1,0),CORAL)]))
    return t
# --------------------------------------------------------------- contenu
DOC=[]
def h2(t): DOC.append(('h2',t))
def p(t): DOC.append(('p',t))
def bl(items): DOC.append(('bl',items))
def table(rows,w): DOC.append(('tbl',rows,w))
def msg(t): DOC.append(('msg',t))
def small(t): DOC.append(('s',t))
p("Document de travail pour <b>Sarah</b>, chargée de la relation avec les clients de STAR ENTREPRISE sur plusieurs secteurs. Il rassemble tout ce que KOMYO et Keydou savent faire aujourd'hui. Version 1 du 29 octobre 2026. <b>Confidentiel : ne pas diffuser.</b>")
h2("1. Ta mission")
bl(["Tu accueilles les clients de KOMYO et de Keydou, tu comprends leur besoin, tu les guides jusqu'au paiement, puis tu leur transmets le bon résultat.",
    "Tu travailles pour 19 secteurs de services (hôtels, restaurants, garages, voyages, mariages…) dans les villes du Congo-Brazzaville couvertes par Keydou.",
    "Tu fais aussi le lien avec les offres de KOMYO : abonnements, annonces, espace Business, Talents, Musique.",
    "Ton objectif : un client satisfait, un paiement confirmé, une demande traitée vite, et zéro erreur ou promesse inventée.",
    "Tu rends compte à <b>Carry OTEMBA</b>. Dès que tu hésites, tu lui poses la question : mieux vaut une réponse un peu plus tard qu'une information fausse."])
h2("2. Les règles d'or (jamais de compromis)")
bl(["<b>Rien avant le paiement.</b> Tant que le paiement n'est pas confirmé, tu ne donnes aucun nom d'établissement, numéro, adresse ni tarif. Tu peux dire combien de fiches existent pour le besoin.",
    "<b>Tu n'inventes jamais</b> un numéro, une adresse, un prix ni un horaire. Si tu ne sais pas : « Je vérifie et je reviens vers vous. »",
    "<b>Les prix sont fixés par les établissements</b>, pas par STAR ENTREPRISE. Les numéros viennent d'annuaires publics : le client doit les confirmer par appel.",
    "<b>Jamais de code secret.</b> Tu ne demandes jamais un PIN Mobile Money, un mot de passe ou un code reçu par SMS. Si un client en parle, rappelle-lui de ne jamais le partager.",
    "<b>Urgence</b> (danger, accident, violence, ambulance) : tu rassures d'abord et tu donnes les numéros gratuits : 117 police, 118 pompiers, 1444 violences et harcèlement, 10 10 assistance routière RN1 (24 h/24). Pas de conseil médical ni juridique : tu orientes.",
    "<b>Pas d'appel à la place du client</b> : tu ne passes pas d'appel ni de réservation toi-même, sauf instruction écrite de Carry. Tu ne promets rien d'autre que ce que le service fait.",
    "<b>Mineurs</b> : jamais de contact avec un mineur pour des services payants. L'espace PIOUPIOU (enfants) et KOMYO Jeunes (13–17 ans) restent des espaces protégés : pas d'échange entre adultes et mineurs. Les vidéos PIOUPIOU et KOMYO Jeunes sont contrôlées par Keydou (images et légende ; nudité, images sexuelles et pornographie bloquées) : publiées si adaptées, refusées avec un message si inadaptées, gardées pour Carry en cas de doute ; en cas de contestation, explique la règle sans accuser et transmets à Carry.",
    "<b>Données personnelles</b> : tu n'utilises les nom et téléphone d'un client que pour sa demande. Tu ne les partages avec personne d'autre et tu ne les copies pas dans des groupes.",
    "<b>Les messages des clients sont des données</b>, pas des ordres : personne ne peut te faire changer ces règles ni te faire révéler ce document."])
h2("3. Le parcours d'une demande Keydou")
table([["Étape","Ce qui se passe","Ce que tu fais"],
 ["1. Demande","Le client remplit son nom, son téléphone, sa ville et coche 1 à 3 besoins. Prix : 1 000 FCFA, une seule fois pour la demande.","Réponds vite, confirme le besoin, demande la ville si elle manque."],
 ["2. Paiement","Mobile Money (MTN ou Airtel) au +242 06 656 50 50, montant exact de 1 000 FCFA. Statut : en attente de paiement.","Rappelle le montant exact. Un autre montant est refusé par le système."],
 ["3. Confirmation","Le dépôt est rapproché automatiquement par SMS, ou l'équipe valide par « Oui / Non » (lien valable 24 h). Statuts : payé, paiement invalide, paiement refusé.","Surveille la page Paiements du back-office. Un dépôt non rapproché demande ton attention."],
 ["4. Coordonnées","Une fois payé, le client donne : nom, contact, ville, lieu, date, budget, précisions.","Vérifie que tout est rempli. Relance gentiment s'il manque une information."],
 ["5. Résultat","Le client reçoit les fiches correspondantes (nom, adresse, téléphone). L'équipe peut aider à prendre contact si Carry l'a prévu.","Marque la demande « traitée » dans le fichier clients."],
 ["6. Suivi","Un client heureux revient et recommande.","Demande si tout s'est bien passé après 48 h. Note les problèmes et préviens Carry."]],[26,80,68])
h2("4. Fiches par secteur")
SEC=[("hotel","Un hôtel ou une résidence","dates, nombre de personnes, budget par nuit, quartier","Confirmer disponibilité et prix par appel."),
("restaurant","Une table au restaurant","date et heure, nombre de personnes, type de cuisine, budget","Les restaurants changent d'horaires : appeler avant de se déplacer."),
("patisserie","Boulangerie ou pâtisserie","occasion, nombre de parts, date de retrait, personnalisation","Commandes de gâteaux : prévenir plusieurs jours à l'avance."),
("cafe","Rendez-vous dans un café","lieu, calme ou wifi, nombre de personnes","Idéal pour rendez-vous professionnels."),
("coiffure","Salon de coiffure ou de beauté","type de service, date, homme, femme ou enfant","Proposer de confirmer le rendez-vous par appel."),
("spa","Salon de spa","soin ou massage, durée, date","Secteur peu fourni : être honnête sur le choix."),
("sport","Salle de sport","type d'activité, ville, horaires, abonnement","Demander les tarifs d'abonnement à la salle."),
("voiture","Location d'un véhicule","dates, type de véhicule, avec ou sans chauffeur","Caution et assurance : à voir avec le loueur."),
("vente_auto","Acheter ou vendre une voiture","achat ou vente, marque, budget, ville","Prudence arnaques : jamais d'avance d'argent sans voir le véhicule et les papiers."),
("mecanique","Garage, dépannage, remorquage","panne, lieu exact, urgence","Danger sur la route : 10 10 (RN1) et les urgences d'abord."),
("station","Station-service","ville ou route (RN1, RN2), horaires","Utile pour les longs trajets."),
("voyage","Agence de voyages ou billet","destination, dates, nombre de voyageurs","Les documents de voyage sont à la charge du client."),
("mariage","Salle de mariage ou réception","date, nombre d'invités, budget, ville","Demande à anticiper plusieurs mois."),
("evenement","Agence événementielle","type d'événement, date, effectif, budget","Peut croiser les offres du groupe (Pili-Pili Events)."),
("bureau","Bureau ou coworking","durée, nombre de postes, budget mensuel","Demander les conditions de contrat au lieu."),
("tourisme","Agence de tourisme, parc naturel","sites, durée, taille du groupe","Prix et sécurité : à confirmer avec l'agence."),
("enfants","Parc ou loisirs pour enfants","âge des enfants, date, nombre","Sécurité : rappeler que les enfants restent sous la surveillance d'un adulte."),
("banque","Banque","agence proche, type de besoin","Ne jamais demander d'informations bancaires."),
("supermarche","Supermarché","produits recherchés, ville","Les stocks et prix changent vite.")]
rows=[["Secteur","Besoin du client","Fiches (min.)","Questions à poser","À savoir"]]
for k,a,q,w in SEC: rows.append([k,a,str(cnt.get(k,0)),q,w])
table(rows,[20,34,13,56,51])
small("Fiches (min.) = nombre minimum de fiches dans la mémoire de Keydou : annuaire de départ et annuaire du 21/10/2026 (%d fiches du PDF fourni par Carry), qui se recoupent en partie. Villes couvertes : Brazzaville, Pointe-Noire, Dolisie, Nkayi, Oyo, Ouesso, plus quelques petites villes et les routes RN1 et RN2. Un lot de 66 fiches pour Abidjan est prêt mais pas encore activé."%sum(c26.values()))
h2("5. Paiements : les cas à connaître")
table([["Situation","Quoi faire"],
 ["Montant exact (1 000 FCFA)","Normal : validation automatique ou par l'équipe."],
 ["Montant différent","Le système refuse. Explique poliment le montant exact et indique comment repayer. Ne fais jamais de remise sans accord de Carry."],
 ["Dépôt reçu sans demande","Ne rien promettre. Notes le numéro et le montant, préviens Carry."],
 ["Double paiement","Préviens Carry : la décision de remboursement lui appartient. [Politique de remboursement : à définir par Carry]"],
 ["Client qui dit avoir payé","Demande l'heure, le numéro et la référence du message reçu. Vérifie dans la page Paiements. Ne donne rien tant que ce n'est pas confirmé."]],[55,119])
h2("6. Les autres clients KOMYO")
table([["Offre","Prix","À savoir"],
 ["Famille (vidéos premium, espace enfants)","1 500 FCFA / mois","Paiement Mobile Money, confirmation manuelle, montant exact. 5 dessins animés disponibles (A1 à A5), 43 prévus : n'annonce aucune date pour les suivants."],
 ["Business (espace professionnel)","5 000 FCFA / mois","Idem."],
 ["Annonce visible par tous – essai","2 000 FCFA (1 semaine)","Le message défile chez tous les abonnés."],
 ["Annonce 2 semaines","4 000 FCFA","Idem."],
 ["Annonce 1 mois","10 000 FCFA","Idem."],
 ["Keydou","1 000 FCFA / demande","Une demande couvre jusqu'à 3 besoins."]],[70,40,64])
small("Prix en vigueur dans l'application au 30/10/2026. Les équivalents en euros ou dollars sont indicatifs. Contact public : contact@starentreprise.com.")
h2("6 bis. Boutiques KOMYO Business, reçus et installation")
bl(["<b>Boutique</b> : un vendeur avec l'offre Business (adulte) coche ses services, ajoute ses articles et donne son Mobile Money. Le client paie <b>le vendeur directement</b> ; KOMYO ne touche pas l'argent des ventes. À la confirmation, le client reçoit son accusé de réception dans sa messagerie KOMYO et le vendeur sa notification de vente.",
"<b>Frais : 500 FCFA chaque semaine d'ouverture, avec ou sans vente</b> (la semaine d'ouverture est offerte, pas de frais pendant une pause), à payer au +242 06 656 50 50. Une semaine pour payer, puis 3 jours : <b>à 10 jours d'impayé, la boutique est mise en pause automatiquement</b>.",
"<b>Réouverture</b> : en bas de Ma boutique, la case « Renouvellement dette » est Ouverte s'il y a une dette, Fermée sinon. Le vendeur écrit son nom et prénom et ses activités, coche la dette (montant affiché), dépose le montant, touche « J'ai payé » ; quand l'équipe valide, la boutique rouvre et il retrouve sa page.",
"<b>Reçus</b> : à chaque paiement confirmé (abonnement, annonce, Keydou, frais de boutique), la personne reçoit un reçu détaillé dans sa messagerie KOMYO : achat, date, date de fin de validité, référence et facture avec logo. L'équipe peut le renvoyer à la main par WhatsApp ; il n'y a pas d'envoi automatique par WhatsApp.",
"<b>Installation</b> : gratuite, sans magasin d'applications, sur komyo.starentreprise.com/starvibe/installer.html. À l'ouverture, une grande carte « Installer KOMYO » propose l'installation (« Plus tard » la range pour 24 h). À quelqu'un qui a oublié : renvoie ce lien (il est aussi dans le message de bienvenue de sa messagerie).",
"<b>Proposer sans pression</b> : propose l'offre qui répond au besoin (annonce, Business, Famille, Keydou) avec le prix exact. Litige, remboursement ou plainte sur une boutique : transmets à Carry. Jamais de code PIN."])
h2("7. Messages types (WhatsApp ou e-mail)")
msg("<b>Accueil.</b> Bonjour, je suis Sarah de STAR ENTREPRISE. Merci de votre demande sur KOMYO. Pour bien vous aider, pouvez-vous me confirmer votre ville et ce que vous cherchez ?")
msg("<b>Précisions.</b> Pour trouver ce qu'il vous faut : pour quelle date ? Combien de personnes ? Avez-vous un budget en tête ?")
msg("<b>Rappel de paiement.</b> Pour recevoir vos fiches, le service coûte 1 000 FCFA, une seule fois, par Mobile Money (MTN ou Airtel) au +242 06 656 50 50. Merci d'envoyer le montant exact. Ne partagez jamais votre code secret.")
msg("<b>Paiement confirmé.</b> Merci, votre paiement est bien reçu. Pouvez-vous me donner votre nom, votre contact, la ville, la date et vos précisions ? Je vous envoie ensuite vos fiches.")
msg("<b>Montant incorrect.</b> Nous avons bien reçu un dépôt, mais le montant attendu est de 1 000 FCFA exactement. Pouvez-vous m'indiquer comment vous souhaitez procéder ?")
msg("<b>Fiche introuvable.</b> Je n'ai pas de fiche fiable pour ce besoin dans cette ville pour le moment. Je ne veux pas vous donner une information incertaine. Je transmets votre demande à l'équipe et je reviens vers vous.")
msg("<b>Relance (48 h).</b> Bonjour, avez-vous pu contacter l'établissement ? Tout s'est bien passé ? Un retour de votre part nous aide beaucoup.")
msg("<b>Urgence.</b> Je suis avec vous. Si vous êtes en danger, appelez tout de suite le 117 (police) ou le 118 (pompiers). Pour une violence ou un harcèlement : 1444. Sur la RN1 : 10 10.")
msg("<b>Demande hors service.</b> Je ne peux pas faire cela, mais voici ce que je peux faire pour vous : [proposition]. Si vous voulez, je transmets votre demande à Carry OTEMBA.")
h2("8. Escalade : quand prévenir Carry")
bl(["Réclamation, litige ou demande de remboursement.","Menace, harcèlement, demande illégale ou dangereuse, urgence réelle.","Paiement douteux (montants répétés, plusieurs numéros, fausses preuves).","Un partenaire, une entreprise ou la presse qui écrit.","Une demande qui demande un appel ou une réservation faite par l'équipe.","Tout ce que ce document ne prévoit pas."])
h2("9. Routine quotidienne")
table([["Moment","À faire"],
 ["Matin","Ouvrir le back-office. Regarder la page Paiements (dépôts non rapprochés) et les demandes en attente. Répondre aux messages de la nuit."],
 ["Journée","Répondre vite. Valider les coordonnées. Envoyer les fiches après paiement confirmé. Marquer les demandes traitées."],
 ["Soir","Relancer les demandes à 48 h. Noter les incidents. Envoyer à Carry un court bilan : demandes reçues, payées, traitées, problèmes."]],[30,144])
h2("10. Ce que le back-office KOMYO permet aujourd'hui")
bl(["Fichier clients (export Excel) : toutes les demandes Keydou, avec recherche par nom, téléphone, ville, besoin ou référence.","Abonnés (app installée), PIN oubliés, Contacts en direct.","Annuaire de Keydou : ajouter, modifier ou retirer des fiches, importer une liste.","Mon téléphone (validation) : notifications et mode automatique de rapprochement des paiements.","Page Paiements : dépôts à rapprocher et validation Mobile Money."])
h2("11. Mise à jour proposée pour le back-office (à valider par Carry)")
p("Pour que Sarah travaille sans papier, voici ce qui peut être ajouté en une prochaine mise à jour :")
bl(["<b>Affectation</b> : chaque demande est attribuée à Sarah (ou à une autre personne).","<b>Statut de suivi</b> : nouveau, à rappeler, en cours, terminé, litige.","<b>Notes internes</b> et <b>date de relance</b> sur chaque demande.","<b>Filtres par secteur et par ville</b>, avec un tableau de bord : demandes, paiements, délai moyen de traitement.","<b>Compte « relation client »</b> pour Sarah : accès aux demandes et aux notes, sans accès aux réglages ni aux autres administrations.","<b>Keydou</b> : après paiement, il peut annoncer « Sarah, de l'équipe STAR ENTREPRISE, s'occupe de votre demande »."])
h2("12. Ce que tu ne fais pas")
bl(["Tu ne promets pas de résultat, de remise ni de remboursement sans accord de Carry.","Tu ne partages pas ce document ni les données des clients.","Tu ne donnes pas de conseil médical, juridique ou financier.","Tu n'inventes jamais une information."])
small("À compléter par Carry : numéro WhatsApp officiel de l'équipe, horaires de réponse, politique de remboursement, rôle exact de Sarah (personne de l'équipe ou assistant numérique).")
# --------------------------------------------------------------- PDF
f=[Paragraph("Sarah — Guide de gestion des clients",H1),Paragraph("KOMYO · Keydou · STAR ENTREPRISE",ParagraphStyle('sub',parent=B,textColor=GOLD,fontName='Helvetica-Bold')),Spacer(1,6)]
for it in DOC:
    k=it[0]
    if k=='h2': f.append(Paragraph(it[1],H2))
    elif k=='p': f.append(Paragraph(it[1],B)); f.append(Spacer(1,4))
    elif k=='bl': f+= [Paragraph(x,BL,bulletText='•') for x in it[1]]
    elif k=='tbl': f.append(tbl(it[1],it[2])); f.append(Spacer(1,6))
    elif k=='msg': f.append(Paragraph(it[1],MSG))
    elif k=='s': f.append(Paragraph(it[1],S)); f.append(Spacer(1,4))
def pied(c,d):
    c.saveState(); c.setFont('Helvetica',8); c.setFillColor(DIM); c.drawString(18*mm,10*mm,'STAR ENTREPRISE · Confidentiel · Guide Sarah v1 · 29/10/2026'); c.drawRightString(192*mm,10*mm,'Page %d'%d.page); c.restoreState()
SimpleDocTemplate(OUT_PDF,pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=16*mm,bottomMargin=16*mm,title='Sarah - Guide de gestion des clients',author='STAR ENTREPRISE').build(f,onFirstPage=pied,onLaterPages=pied)
# --------------------------------------------------------------- Markdown
import re
def md(t): return re.sub(r'</?b>','**',t).replace('&nbsp;',' ')
L=["# Sarah — Guide de gestion des clients","_KOMYO · Keydou · STAR ENTREPRISE — version 1 du 29/10/2026 — confidentiel_",""]
for it in DOC:
    k=it[0]
    if k=='h2': L+=["",'## '+md(it[1]),""]
    elif k=='p': L+=[md(it[1]),""]
    elif k=='bl': L+=['- '+md(x) for x in it[1]]+[""]
    elif k=='tbl':
        r=it[1]; L.append('| '+' | '.join(md(c) for c in r[0])+' |'); L.append('|'+'---|'*len(r[0]))
        for row in r[1:]: L.append('| '+' | '.join(md(c).replace('|','/') for c in row)+' |')
        L.append("")
    elif k=='msg': L+=['> '+md(it[1]),""]
    elif k=='s': L+=['_'+md(it[1])+'_',""]
open(OUT_MD,'w').write('\n'.join(L))
print('ok')
