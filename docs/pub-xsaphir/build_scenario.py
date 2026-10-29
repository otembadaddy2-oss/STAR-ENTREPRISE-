from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
R='/home/user/STAR-ENTREPRISE-/docs/pub-xsaphir/'; PDF=R+'PUB-X-SAPHIR-analyse-et-scenario-v1.pdf'; MD=R+'PUB-X-SAPHIR-analyse-et-scenario-v1.md'
INK=colors.HexColor('#0d1530'); GOLD=colors.HexColor('#b8892b'); BLUE=colors.HexColor('#1d4fd8'); LINE=colors.HexColor('#d8dcea'); DIM=colors.HexColor('#5b6482')
H1=ParagraphStyle('h1',fontName='Helvetica-Bold',fontSize=20,leading=24,textColor=INK,spaceAfter=3)
H2=ParagraphStyle('h2',fontName='Helvetica-Bold',fontSize=13,leading=16,textColor=BLUE,spaceBefore=11,spaceAfter=4)
B=ParagraphStyle('b',fontName='Helvetica',fontSize=9.8,leading=13.5,textColor=INK)
S=ParagraphStyle('s',fontName='Helvetica',fontSize=8.4,leading=11.5,textColor=DIM)
BL=ParagraphStyle('bl',parent=B,leftIndent=12,bulletIndent=2)
DOC=[]; md=[]
def h1(t): DOC.append(('h1',t)); md.append('# '+t+'\n')
def h2(t): DOC.append(('h2',t)); md.append('\n## '+t+'\n')
def p(t): DOC.append(('p',t)); md.append(t.replace('<b>','**').replace('</b>','**').replace('<i>','_').replace('</i>','_')+'\n')
def bl(items):
    DOC.append(('bl',items)); [md.append('- '+i.replace('<b>','**').replace('</b>','**')) for i in items]; md.append('')
def table(rows,w):
    DOC.append(('tbl',rows,w))
    md.append('| '+' | '.join(rows[0])+' |'); md.append('|'+'---|'*len(rows[0]))
    for r in rows[1:]: md.append('| '+' | '.join(c.replace('<b>','**').replace('</b>','**') for c in r)+' |')
    md.append('')
def small(t): DOC.append(('s',t)); md.append('_'+t+'_\n')
def tb(rows,widths):
    t=Table([[Paragraph(str(c),ParagraphStyle('c',parent=B,fontSize=8,leading=10.5,fontName='Helvetica-Bold' if r==0 else 'Helvetica',textColor=colors.white if r==0 else INK)) for c in row] for r,row in enumerate(rows)],colWidths=[x*mm for x in widths],repeatRows=1)
    t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.4,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),BLUE),('LEFTPADDING',(0,0),(-1,-1),3.5),('RIGHTPADDING',(0,0),(-1,-1),3.5),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
    return t

h1("Pub X SAPHIR : analyse et scénario (version 1, à valider)")
p("Préparé pour Carry OTEMBA · STAR ENTREPRISE · 29/10/2026. Rien n'est dépensé tant que tu n'as pas écrit « ok ».")
h2("1. Ce qu'on annonce")
bl(["<b>L'existence des 10 tomes</b> de X SAPHIR.","<b>L'arrivée du jeu X SAPHIR ARENA : Steel Pursuit.</b>","<b>L'arrivée de X SAPHIR Alpha de Calpros</b> (jeu tiré des tomes 1 à 10)."])
h2("2. Ce que j'ai analysé")
bl(["Les <b>10 couvertures des tomes</b> (dépôt, dossier docs/film/references).","Les <b>9 planches ARENA</b> que tu viens d'envoyer : fiches Lyra Spark, Vipera Shade, Nyra Volt, Luna Blaze, deux catalogues de robots, deux fiches « concept du jeu », l'affiche principale.","Je n'ai pas le scénario dialogué des tomes dans ce dossier : je m'appuie seulement sur ce que montrent les images. Dis-moi si un titre ou un sens est faux."])
h2("3. Les 10 tomes : image forte et idée d'animation")
table([["Tome","Titre","Ce qu'on voit","Animation proposée"],
["1","Les Cendres du Ciel","Ville au coucher du soleil, enfants qui regardent le ciel, héros au poing doré, débris en feu","Cendres qui tombent, poing qui s'embrase"],
["2","Le Saphir des Deux Mondes","Héros, main ouverte avec un saphir bleu ; sage à barbe blanche ; éclairs","Le saphir pulse, éclairs bleus"],
["3","La Puce d'Astéronium","Cité dorée sur des chutes d'eau, héros tenant la puce","Lumière dorée qui monte"],
["4","(titre illisible sur ma copie)","Trois personnages, braises, grande ombre dans le ciel","Braises, ombre qui bouge"],
["5","Les Neuf Portes","Héros, main levée devant des portes de lumière","Portes qui s'allument"],
["6","Kora Zéro","Visage d'or d'une figure féminine et son double bleu lumineux","Halo qui tourne"],
["7","Le Royaume d'En-Bas","Géant de pierre enchaîné, héros qui porte une jeune fille","Chaînes qui vibrent"],
["8","Les Ancêtres du Futur","Héros pensif, trois personnages, pont de ville","Léger mouvement de caméra"],
["9","Le Ciel Noir","Héros en armure or et bleu, vortex noir dans le ciel, ville la nuit","Vortex qui tourne, cape et poussière"],
["10","L'Inconnue X","Armure blanche et or au coucher du soleil, ville au bord du fleuve","Soleil qui se lève, reflets sur l'armure"]],[10,38,70,56])
p("<b>Fil rouge de la pub :</b> du ciel qui tombe (tome 1) au saphir, aux portes, à l'En-Bas, au ciel noir, jusqu'à l'Inconnue X. Le X, c'est la décision humaine.")
h2("4. ARENA : ce que j'ai retenu des planches")
bl(["<b>Les héroïnes :</b> course étincelante, saut avec tir, glissade sous les lasers, grappin, fouet d'énergie, lame de bras, disques de choc.","<b>Les robots mono-roue :</b> du petit Scout Wheel (étage 1) jusqu'à <b>Omega Monarch</b>, le boss de 5,5 m aux pinces, aux missiles et aux yeux rouges.","<b>Les objets :</b> pièces d'or, cristaux X, compte à rebours « 3 2 1 », 10 étages.","<b>Attention aux noms :</b> les planches ne donnent pas les mêmes noms (Lyra, Vipera, Nyra, Luna / Aélys, Zahra, Noxia / Raven, Zara, Luna). Je dois savoir lesquels sont les noms officiels avant d'en prononcer un dans une voix off."])
h2("5. Les moments forts retenus (12)")
table([["#","Moment","Source","Intensité"],
["1","Le saphir qui pulse dans la main","Tome 2","Très forte"],
["2","Le poing doré qui s'embrase au-dessus de la ville","Tome 1","Forte"],
["3","Le héros en armure sous le vortex du ciel noir","Tome 9","Très forte"],
["4","L'armure blanche et or au lever du soleil","Tome 10","Forte (émotion)"],
["5","Le compte à rebours 3 2 1 et le départ de la course","Affiche ARENA","Forte"],
["6","La course : étincelles, poussière, robots qui poursuivent","Panneau « Run » (Lyra)","Très forte"],
["7","Le saut en tirant au-dessus des drones","Panneau « Jump »","Très forte"],
["8","La glissade sous les lasers","Panneau « Slide »","Forte"],
["9","Le robot Scout Wheel qui fonce, flammes des canons","Catalogue robots","Forte"],
["10","Omega Monarch : yeux rouges, pinces, missiles","Catalogue robots","Maximale"],
["11","Le rayon d'énergie contre le boss","Panneau « boss multi-phase »","Maximale"],
["12","Le plongeon de l'héroïne vers la caméra, pièces dorées","Affiche principale","Très forte"]],[8,86,56,24])
h2("6. Le scénario (≈ 34 s, vertical 9:16)")
p("Règle de rythme demandée : intensité élevée, <b>ralenti naturel</b> sur les actions fortes (vitesse ≈ 40 %), puis <b>accélération</b> (≈ 160 %) à la coupe suivante. Le son descend en grave pendant le ralenti puis remonte.")
table([["Temps","Image et animation","Vitesse","Voix off","Sons à bien entendre"],
["0–2,5","Noir. Le saphir bleu apparaît (tome 2) et pulse. Flash de 10 couvertures en 1 s","Normale","—","Battement grave, souffle, claquement sec sur chaque couverture"],
["2,5–7","Tome 1 : cendres qui tombent, poing doré qui s'embrase. Coupe sur la main et le saphir (tome 2)","Ralenti puis accéléré","« Un saphir tombé du ciel. Un choix qui change tout. »","Craquement de feu, souffle, impact grave à la coupe"],
["7–12","Tome 9 : le héros relève la tête, le vortex tourne. Fondu vers le tome 10 (lever de soleil)","Ralenti, puis normale","« X SAPHIR. Dix tomes. Une épopée née au Congo. »","Chœur grave, impact, cloche"],
["12–13","Flash blanc, passage dans ARENA","—","—","Alerte, montée de tension"],
["13–22","Compte à rebours 3 2 1, course (Lyra), saut en tirant, glissade, robots mono-roue qui poursuivent","Ralenti sur le saut, accélération sur la glissade","« Et maintenant, l'aventure devient un jeu. X SAPHIR ARENA : Steel Pursuit. Cours. Esquive. Combats. »","Moteur de mono-roue, tirs d'énergie, pièces qui tintent, semelles sur le métal"],
["22–26","Omega Monarch, gros plan sur les yeux rouges. L'héroïne tire un rayon, explosion","Ralenti sur l'explosion","« Dix étages. Un boss final. »","Rugissement mécanique, rayon, explosion, silence d'une demi-seconde"],
["26–29","X SAPHIR Alpha de Calpros : le héros des tomes en action (images du jeu si disponible)","Accélération","« Et bientôt, retrouve Calpros dans X SAPHIR Alpha. »","Coups, métal, souffle"],
["29–33","Logo X SAPHIR animé, « BIENTÔT », lien","Normale","« X SAPHIR. Bientôt. »","Cloche dorée, impact final"],
["33–36","Carton « RÉALISÉ PAR STAR ENTREPRISE » puis logo STAR (signature obligatoire)","Normale","—","Note de fin"]],[14,56,22,40,42])
h2("7. Voix et sons")
bl(["<b>Voix :</b> Clémence (voix officielle de toutes les vidéos du groupe, décision du 16/10/2026), pour garder la même signature. Je te la fais écouter avant le montage.","<b>Musique :</b> musique originale (synthétisée ici), de plus en plus intense, avec des ruptures nettes aux changements de scène.","<b>Sons :</b> je les écris moi-même et je les cale à l'image : impacts, souffles, lasers, moteur, pièces, explosion.","<b>Sous-titres :</b> je les ajoute pour ceux qui regardent sans le son."])
h2("8. Fabrication et coût estimé")
bl(["Chaque plan animé est fabriqué par Higgsfield (Kling 3.0, image vers vidéo) à partir de tes images : environ 10 crédits pour 5 secondes.","Plans à animer : tome 1, tome 2, tome 9, tome 10, course, saut, glissade, robot Scout, Omega Monarch, plongeon de l'affiche = <b>10 plans ≈ 100 crédits</b>, plus environ 30 crédits de reprises.","Il reste 829 crédits ; après cette pub il en resterait environ 700.","Voix Clémence : quelques centimes de dollar sur ton compte ElevenLabs.","<b>Aucune génération ne part sans ton « ok ».</b>"])
h2("9. Ce que j'ai besoin que tu décides")
bl(["<b>Les noms officiels</b> des héroïnes (voir section 4), ou on n'en cite aucun.","<b>X SAPHIR Alpha de Calpros :</b> quel type de jeu (combat ?), et existe-t-il déjà des images du jeu ?","<b>Le lien final</b> et la phrase d'appel : « Bientôt » seulement, ou une adresse ?","<b>Les images d'ARENA :</b> ce sont des visuels de concept en 3D. Le jeu jouable actuellement est un combat en 2D. Dis-moi si la pub montre l'art de concept (« Steel Pursuit ») ou des vraies images du jeu.","<b>Réseaux :</b> certaines planches montrent des tenues très ajustées. Pour TikTok et Meta, on évite de cadrer le corps et on privilégie l'action. Je cadrerai sur la course, le saut et les robots.","<b>Voix :</b> Clémence te convient-elle pour cette pub ?"])
small("Document privé, préparé par Claude. Version 1, à valider avant toute dépense de crédits.")
f=[]
for it in DOC:
    k=it[0]
    if k=='h1': f.append(Paragraph(it[1],H1))
    elif k=='h2': f.append(Paragraph(it[1],H2))
    elif k=='p': f+= [Paragraph(it[1],B),Spacer(1,3)]
    elif k=='s': f+=[Spacer(1,4),Paragraph(it[1],S)]
    elif k=='bl': f+=[Paragraph(i,BL,bulletText='•') for i in it[1]]
    elif k=='tbl': f+=[tb(it[1],it[2]),Spacer(1,4)]
doc=SimpleDocTemplate(PDF,pagesize=A4,leftMargin=16*mm,rightMargin=16*mm,topMargin=14*mm,bottomMargin=14*mm,title="Pub X SAPHIR - analyse et scénario",author="STAR ENTREPRISE")
doc.build(f); open(MD,'w').write('\n'.join(md)+'\n'); print('ok')
