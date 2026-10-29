import re
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
R='/home/user/STAR-ENTREPRISE-/docs/komyo/'; PDF=R+'KOMYO-Choisir-sa-passerelle-de-paiement.pdf'; MD=R+'KOMYO-Choisir-sa-passerelle-de-paiement.md'
INK=colors.HexColor('#241536'); GOLD=colors.HexColor('#E8A93D'); CORAL=colors.HexColor('#FF6B4A'); LINE=colors.HexColor('#eee2cc'); DIM=colors.HexColor('#6b5f80')
H1=ParagraphStyle('h1',fontName='Helvetica-Bold',fontSize=21,leading=25,textColor=INK,spaceAfter=3)
H2=ParagraphStyle('h2',fontName='Helvetica-Bold',fontSize=13.5,leading=17,textColor=CORAL,spaceBefore=11,spaceAfter=4)
B=ParagraphStyle('b',fontName='Helvetica',fontSize=10,leading=14,textColor=INK)
S=ParagraphStyle('s',fontName='Helvetica',fontSize=8.5,leading=11.5,textColor=DIM)
BL=ParagraphStyle('bl',parent=B,leftIndent=12,bulletIndent=2)
MSG=ParagraphStyle('msg',parent=B,fontSize=9.5,leading=13,leftIndent=8,borderPadding=5,backColor=colors.HexColor('#fffaf0'),borderColor=LINE,borderWidth=0.6,spaceAfter=6)
def tbl(rows,widths):
    t=Table([[Paragraph(str(c),ParagraphStyle('c',parent=B,fontSize=8.4,leading=11,fontName='Helvetica-Bold' if r==0 else 'Helvetica',textColor=colors.white if r==0 else INK)) for c in row] for r,row in enumerate(rows)],colWidths=[w*mm for w in widths],repeatRows=1)
    t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.4,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),('BACKGROUND',(0,0),(-1,0),CORAL)])); return t
DOC=[]
def h2(t): DOC.append(('h2',t))
def p(t): DOC.append(('p',t))
def bl(i): DOC.append(('bl',i))
def table(r,w): DOC.append(('tbl',r,w))
def msg(t): DOC.append(('msg',t))
def small(t): DOC.append(('s',t))
p("But : recevoir les paiements des clients (carte Visa / Mastercard, MTN MoMo, Airtel Money) sur un compte marchand, puis <b>envoyer l'argent sur ton MTN MoMo</b> et le retirer en espèces chez un agent. Document du 29 octobre 2026, à remplir au fil de tes appels. <b>Les informations ci-dessous viennent de recherches sur internet (pages commerciales et blogs) : rien n'est confirmé tant que le service ne te l'a pas écrit.</b>")
h2("1. Le chemin de l'argent")
bl(["Le client paie par carte ou par Mobile Money sur KOMYO.","L'argent arrive sur ton <b>compte marchand</b> chez la passerelle de paiement.","La passerelle <b>envoie le solde sur ton numéro MTN MoMo</b> (retrait / virement vers Mobile Money).","Tu retires l'argent chez un agent MTN Mobile Money."])
h2("2. Les services à contacter")
table([["Service","Ce que j'ai lu (à confirmer)","Type"],
 ["Moneroo","Page de couverture : Visa et Mastercard en XAF pour le Congo, MTN et Airtel. Page non ouverte par moi.","Passerelle (cartes + Mobile Money)"],
 ["CinetPay","Afrique francophone ; une fiche Shopify cite le Congo. Détails cartes et retrait non confirmés.","Passerelle"],
 ["Hub2","Paiements par Mobile Money et carte en Afrique. Pas de détail Congo trouvé.","Passerelle"],
 ["Flutterwave","Cartes et Mobile Money en Afrique. Rien ne confirme le Congo-Brazzaville.","Passerelle"],
 ["PayDunya, Monetbil, DPO Pay","Cités dans des comparatifs. Congo non confirmé.","Passerelles"],
 ["OpenPay, PayZen Congo, Capay","Solutions locales ou régionales, surtout Mobile Money.","Mobile Money (cartes ?)"],
 ["MTN MoMo et Airtel Money en direct","API marchande de collecte et de décaissement. Compte marchand, dossier entreprise et tests nécessaires. Pas de cartes.","Opérateurs"],
 ["Stripe, PayPal","À ma connaissance, pas de compte marchand avec retrait local depuis le Congo-Brazzaville. À vérifier.","International"]],[38,98,38])
h2("3. La grille à remplir pour chaque service (une ligne par appel)")
table([["Question","Réponse du service"],
 ["Le Congo-Brazzaville est-il couvert pour les ENCAISSEMENTS ? (à distinguer du Congo-RDC)",""],
 ["Visa et Mastercard acceptés ? (et American Express, Apple Pay, Google Pay ?)",""],
 ["MTN MoMo et Airtel Money acceptés pour l'encaissement ?",""],
 ["RETRAIT vers MTN MoMo du Congo-Brazzaville : possible ? Manuel ou automatique ? Montant minimum ?",""],
 ["Frais par paiement carte / par paiement Mobile Money / par retrait",""],
 ["Délai pour recevoir l'argent (en jours) et pour le retrait sur MTN (en heures)",""],
 ["Compte au nom de l'entreprise : documents demandés et délai d'ouverture",""],
 ["Le numéro MTN qui reçoit doit-il être au nom de l'entreprise ou du gérant ?",""],
 ["Mode test (sandbox) disponible pour que je branche KOMYO avant de passer en vrai ?",""],
 ["Confirmation automatique du paiement (webhook) et remboursements possibles ?",""]],[100,74])
h2("4. Message à envoyer (WhatsApp ou e-mail)")
msg("Bonjour, je suis Carry OTEMBA, dirigeant de STAR ENTREPRISE (Congo-Brazzaville, Pointe-Noire / Brazzaville). Nous avons une application, KOMYO, et nous voulons encaisser des paiements par carte Visa/Mastercard et par MTN MoMo / Airtel Money, puis recevoir nos fonds sur notre MTN MoMo. Pouvez-vous me répondre : 1) le Congo-Brazzaville est-il couvert pour les encaissements ? 2) cartes Visa et Mastercard acceptées ? 3) retrait vers MTN MoMo du Congo-Brazzaville possible, avec quels frais et quel délai ? 4) quels documents pour ouvrir un compte entreprise ? 5) un mode test pour intégration par API ? Merci.")
h2("5. Documents à préparer (tu as déjà le registre de commerce et le numéro fiscal)")
bl(["☐ Registre de commerce de STAR ENTREPRISE","☐ Numéro d'identification fiscale","☐ Statuts de l'entreprise (si demandés)","☐ Pièce d'identité du gérant (recto/verso, lisible)","☐ Adresse de l'entreprise et justificatif","☐ Numéro MTN MoMo du titulaire du compte (SIM enregistrée au bon nom)","☐ Adresse du site : https://komyo.starentreprise.com","☐ Mentions légales, conditions de vente et politique de remboursement publiées sur le site (beaucoup de services les demandent)","☐ E-mail professionnel : contact@starentreprise.com"])
h2("6. Après le choix : ce que je fais dans KOMYO")
bl(["Je branche le paiement par carte et Mobile Money pour les abonnements, les annonces et Keydou, avec <b>confirmation automatique</b> du paiement.","Les clés vont dans les réglages secrets de Netlify, jamais dans le code ni dans la conversation.","Je teste d'abord en mode test, puis un petit paiement réel de ta part.","Je garde la confirmation manuelle actuelle comme solution de secours."])
h2("7. Sécurité et prudence")
bl(["Ne donne jamais les clés secrètes dans un message, un e-mail ou un groupe.","Utilise uniquement le site officiel du service (adresse écrite à la main), jamais un lien reçu par message.","Aucun service sérieux ne demande de payer des frais « de déblocage » avant d'ouvrir ton compte.","Sépare l'argent de l'entreprise et ton argent personnel."])
small("À compléter : nom du service retenu, date d'ouverture du compte, frais confirmés par écrit.")
f=[Paragraph("Choisir sa passerelle de paiement",H1),Paragraph("KOMYO · STAR ENTREPRISE · carte Visa / Mastercard, MTN MoMo, Airtel Money",ParagraphStyle('sub',parent=B,textColor=GOLD,fontName='Helvetica-Bold')),Spacer(1,6)]
for it in DOC:
    k=it[0]
    if k=='h2': f.append(Paragraph(it[1],H2))
    elif k=='p': f+= [Paragraph(it[1],B),Spacer(1,4)]
    elif k=='bl': f+= [Paragraph(x,BL,bulletText='•' if not x.startswith('☐') else '') for x in it[1]]
    elif k=='tbl': f+= [tbl(it[1],it[2]),Spacer(1,6)]
    elif k=='msg': f.append(Paragraph(it[1],MSG))
    elif k=='s': f+= [Paragraph(it[1],S),Spacer(1,4)]
def pied(c,d):
    c.saveState(); c.setFont('Helvetica',8); c.setFillColor(DIM); c.drawString(18*mm,10*mm,'STAR ENTREPRISE · Document de travail · 29/10/2026'); c.drawRightString(192*mm,10*mm,'Page %d'%d.page); c.restoreState()
SimpleDocTemplate(PDF,pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=16*mm,bottomMargin=16*mm,title='Choisir sa passerelle de paiement',author='STAR ENTREPRISE').build(f,onFirstPage=pied,onLaterPages=pied)
def md(t): return re.sub(r'</?b>','**',t)
L=["# Choisir sa passerelle de paiement","_KOMYO · STAR ENTREPRISE — 29/10/2026_",""]
for it in DOC:
    k=it[0]
    if k=='h2': L+=["",'## '+md(it[1]),""]
    elif k=='p': L+=[md(it[1]),""]
    elif k=='bl': L+=['- '+md(x) for x in it[1]]+[""]
    elif k=='tbl':
        r=it[1]; L.append('| '+' | '.join(r[0])+' |'); L.append('|'+'---|'*len(r[0]))
        for row in r[1:]: L.append('| '+' | '.join(str(c).replace('|','/') for c in row)+' |')
        L.append("")
    elif k=='msg': L+=['> '+md(it[1]),""]
    elif k=='s': L+=['_'+md(it[1])+'_',""]
open(MD,'w').write('\n'.join(L)); print('ok')
