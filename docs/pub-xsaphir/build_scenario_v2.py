from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
R='/home/user/STAR-ENTREPRISE-/docs/pub-xsaphir/'; PDF=R+'PUB-X-SAPHIR-analyse-et-scenario-v2.pdf'; MD=R+'PUB-X-SAPHIR-analyse-et-scenario-v2.md'
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

h1("Pub X SAPHIR : analyse des BD (tomes 1 à 5) et scénario v2")
p("Préparé pour Carry OTEMBA · STAR ENTREPRISE · 29/10/2026. J'ai lu <b>les 208 planches des tomes 1 à 5</b>. Les tomes 6 à 10 ne sont pas encore reçus : pour eux je n'ai que les couvertures. Rien n'est dépensé tant que tu n'as pas écrit « ok ».")
h2("1. L'histoire telle que je l'ai lue")
table([["Tome","Titre","Ce qui se passe"],
["1","Les Cendres du Ciel","Un fragment tombé du ciel (l'Astéronium) frappe Brazzaville. Calpros, coursier en moto, voit sa main s'embraser d'or. KORA, l'intelligence du Nova Lab, le repère. Amina Diarra arrive de Bamako. Nakata, le Roi de la Nuit Éternelle, envoie un porteur. Calpros défend sa grand-mère : « Pour ceux que j'aime ! ». Fin : l'Aube-de-Fer."],
["2","Le Saphir des Deux Mondes","La faille reste ouverte. Calpros va au Seuil Astral, affronte son ombre (le Miroir de Colère), puis Baraka Lemayian, gardien du Rift dévoré par la colère. Le vieux sage meurt en lui laissant le Saphir. « Deux forces. »"],
["3","La Puce d'Astéronium","Calpros porte le Saphir. Nadia Sabri, au Nova Lab, déchiffre le Livre de Louxor. Un visiteur sans visage attaque le laboratoire. Il révèle que le père de Calpros, disparu depuis douze ans, n'est peut-être pas parti."],
["4","Les Visages Originels","Le clan s'étend en Afrique : Ayanda (le feu, « VUKA ! ») à Durban, Yaw et le Saphir, Rasia (les ronces) attaque le Nova Lab et vole la carte des Neuf Portes. La trahison sans voix."],
["5","Les Neuf Portes","Huit seuils à sceller. Désert, village des larmes, montagne au poing de pierre, océan, ruines, grotte. Naomie disparaît ; Calpros la retrouve dans la forêt, et Rasia est vaincue par un éclat d'or. La huitième porte est scellée."]],[10,40,124])
h2("2. Les 18 meilleurs moments d'action (page par page)")
table([["#","Tome · page","Ce qu'on voit","Idée d'animation"],
["1","T1 · p10","Comète « VROOOM », explosion « BOUM » sur la ville","Comète qui passe, souffle sur la ville"],
["2","T1 · p13","Calpros qui s'embrase d'or, « Respire »","Or qui monte, ralenti"],
["3","T1 · p23-24","Yeux d'or, poing « KLANG ! » : « Pour ceux que j'aime »","Zoom sur les yeux, impact"],
["4","T1 · p36-39","Amina « FWOOSH », « BOOOM » du ciel","Vent blanc, onde de choc"],
["5","T2 · p4","« À terre ! » : le ciel s'écroule sur la ville","Poussière, caméra qui tremble"],
["6","T2 · p16-17","Le monde astral, îles de pierre qui flottent","Travelling lent dans le bleu"],
["7","T2 · p29","Calpros entouré d'anneaux de lumière","Anneaux qui tournent"],
["8","T2 · p35-36","Combat contre Baraka, feu orange « FSSSH »","Ralenti puis accélération"],
["9","T3 · p18-19","Calpros qui vole dans un tunnel de données","Vitesse, flou de mouvement"],
["10","T3 · p27-30","La silhouette violette dans le labo","Fumée violette, souffle"],
["11","T4 · p8","Ayanda en feu : « VUKA ! »","Flammes, cri"],
["12","T4 · p12-13","Yaw en armure lion, bleu et or","Cape, souffle"],
["13","T4 · p29-30","Rasia et ses ronces dans le Nova Lab","Ronces qui jaillissent"],
["14","T5 · p7-9","Duel dans le désert, sable doré","Sable en tourbillon"],
["15","T5 · p14-16","Le poing de pierre géant de la montagne","Éboulis, ralenti"],
["16","T5 · p17-19","Combat sous l'océan","Bulles, courants bleus"],
["17","T5 · p35-36","Calpros tire un éclat d'or dans la forêt","Éclat, explosion de feuilles"],
["18","T5 · p39","Carte des Neuf Portes qui s'allume","Points d'or qui s'allument"]],[8,24,72,60])
h2("3. Le scénario v2 (≈ 37 s, vertical 9:16)")
p("<b>Rythme demandé :</b> intensité élevée, <b>ralenti naturel</b> sur les grandes actions (≈ 40 % de vitesse), puis <b>accélération</b> à la coupe suivante. Les sons descendent en grave pendant le ralenti, puis remontent. Les planches sont animées telles quelles (Kling, image vers vidéo) pour garder le dessin de la BD.")
table([["Temps","Image et animation","Vitesse","Voix off (Clémence)","Sons à bien entendre"],
["0–3","Noir. Fragment qui tombe (T1 p4-5), comète (T1 p10), explosion sur Brazzaville","Normale puis ralenti","« Un jour, le ciel est tombé. »","Battement grave, sifflement de comète, BOUM"],
["3–7","Calpros s'embrase d'or (T1 p13), yeux d'or, poing « KLANG » (T1 p24)","Ralenti, puis accélération","« À Brazzaville, un jeune homme a reçu une force qu'il n'avait pas choisie. »","Souffle, craquement doré, impact"],
["7–11","Monde astral (T2 p17), anneaux de lumière, combat contre Baraka (T2 p35-36)","Travelling lent, puis accélération","« Entre deux mondes, il apprend ce que la force coûte. »","Chœur grave, tonnerre, flammes"],
["11–15","Vol dans les données (T3), ombre violette ; Ayanda « VUKA ! » (T4 p8), ronces de Rasia (T4 p29)","Rapide","« Le clan grandit. L'ennemi aussi. »","Électricité, cri, ronces qui craquent"],
["15–19","Désert (T5 p7), poing de pierre (T5 p15), océan (T5 p18), éclat d'or dans la forêt (T5 p35)","Ralenti sur le poing de pierre","« Neuf portes. Une famille à protéger. »","Sable, éboulis, eau, explosion"],
["19–21","Flash des 10 couvertures","Éclair","« Dix tomes. Une épopée née au Congo. »","Impact sec sur chaque couverture"],
["21–28","ARENA : compte à rebours 3 2 1, course, saut en tirant, glissade, robots mono-roue, boss Omega Monarch","Ralenti sur le saut et l'explosion","« Et maintenant, l'aventure devient un jeu. X SAPHIR ARENA : Steel Pursuit. »","Moteur de mono-roue, lasers, pièces, explosion"],
["28–31","X SAPHIR Alpha de Calpros","Accélération","« Et bientôt, Calpros dans X SAPHIR Alpha. »","Coups, métal, souffle"],
["31–34","Logo X SAPHIR animé, « BIENTÔT », lien","Normale","« X SAPHIR. Bientôt. »","Cloche dorée, impact final"],
["34–37","« RÉALISÉ PAR STAR ENTREPRISE » puis logo STAR (signature obligatoire)","Normale","—","Note de fin"]],[13,56,22,43,40])
h2("4. Budget : les 100 crédits du PDF précédent ne suffisent plus")
p("Les 100 crédits comptaient 10 plans faits à partir des couvertures. Avec les vraies planches de la BD, le film est plus riche. Voici trois options (Kling 3.0 : environ 10 crédits pour 5 s ; Seedance : environ 35) :")
table([["Option","Plans","Crédits estimés","Ce que ça donne"],
["Courte","12 plans","≈ 120 à 160","Tomes 1, 2, 5 + ARENA, sans Alpha"],
["<b>Recommandée</b>","18 plans animés","<b>≈ 180 à 240</b> (reprises comprises)","Tomes 1 à 5 + ARENA + Alpha, ralentis et accélérations"],
["Premium","18 plans dont 4 en Seedance","≈ 320 à 400","Plans-clés plus réalistes"]],[34,34,48,58])
p("Il reste 829 crédits Higgsfield : l'option recommandée en laisserait environ 600. <b>Aucun plan ne part sans ton « ok ».</b>")
h2("5. Ce que j'ai besoin que tu décides")
bl(["<b>Les tomes 6 à 10 :</b> envoie-les pour que le film couvre tout le Cycle I (sinon je n'utilise que leurs couvertures).","<b>Les noms officiels des héroïnes d'ARENA</b> (Lyra, Vipera, Nyra, Luna ou Aélys, Zahra, Noxia ?) et <b>le type de jeu de X SAPHIR Alpha</b>.","<b>Le lien final</b> et la phrase d'appel (« Bientôt » ou une adresse).","<b>Voix :</b> Clémence est ta voix officielle ; d'accord pour cette pub ?","<b>TikTok / Meta :</b> on cadre l'action et les robots, pas le corps des héroïnes.","<b>Droits :</b> les BD sont à toi ; la musique est composée ici ; la voix de Clémence est sous licence ElevenLabs."])
small("Document privé, préparé par Claude. Version 2, à valider avant toute dépense de crédits.")
f=[]
for it in DOC:
    k=it[0]
    if k=='h1': f.append(Paragraph(it[1],H1))
    elif k=='h2': f.append(Paragraph(it[1],H2))
    elif k=='p': f+= [Paragraph(it[1],B),Spacer(1,3)]
    elif k=='s': f+=[Spacer(1,4),Paragraph(it[1],S)]
    elif k=='bl': f+=[Paragraph(i,BL,bulletText='•') for i in it[1]]
    elif k=='tbl': f+=[tb(it[1],it[2]),Spacer(1,4)]
doc=SimpleDocTemplate(PDF,pagesize=A4,leftMargin=16*mm,rightMargin=16*mm,topMargin=14*mm,bottomMargin=14*mm,title="Pub X SAPHIR - analyse des BD et scénario v2",author="STAR ENTREPRISE")
doc.build(f); open(MD,'w').write('\n'.join(md)+'\n'); print('ok')
