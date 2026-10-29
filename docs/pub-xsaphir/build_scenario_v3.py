from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
R='/home/user/STAR-ENTREPRISE-/docs/pub-xsaphir/'; PDF=R+'PUB-X-SAPHIR-analyse-et-scenario-v3.pdf'; MD=R+'PUB-X-SAPHIR-analyse-et-scenario-v3.md'
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

h1("Pub X SAPHIR : les 10 tomes lus et scénario v3")
p("Préparé pour Carry OTEMBA · STAR ENTREPRISE · 29/10/2026. J'ai lu <b>les 10 tomes du Cycle I (environ 400 planches)</b>. Rien n'est dépensé tant que tu n'as pas écrit « ok ».")
h2("1. Le Cycle I en une page")
table([["Tome","Titre","Ce qui se passe"],
["1","Les Cendres du Ciel","Un fragment tombe sur Brazzaville. Calpros, coursier en moto, s'embrase d'or. KORA (l'intelligence du Nova Lab) le repère, Amina arrive de Bamako. Il défend sa grand-mère contre le porteur de Nakata : « Pour ceux que j'aime ! »."],
["2","Le Saphir des Deux Mondes","Monde astral, combat contre son ombre, puis contre Baraka, gardien du Rift. Le vieux sage meurt en lui laissant le Saphir."],
["3","La Puce d'Astéronium","La Puce, le Livre de Louxor, une ombre violette attaque le Nova Lab. Le père de Calpros, disparu depuis douze ans, n'est peut-être pas parti."],
["4","Les Visages Originels","Le clan s'étend : Ayanda (feu, « VUKA ! »), Yaw (armure lion), Rasia (ronces) vole la carte des Neuf Portes."],
["5","Les Neuf Portes","Huit seuils à sceller (désert, montagne, océan, forêt). Naomie disparaît ; Calpros la retrouve, Rasia est vaincue par un éclat d'or."],
["6","KORA Zéro","KORA découvre qu'elle est née de la première fusion avec l'Astéronium. Nakata, géant rouge, attaque l'avenue : « Vous n'aurez pas le troisième ». Dans un monde d'or, KORA Zéro lui dit : « Tu es un choix, Calpros. »"],
["7","Le Royaume d'En-Bas","Naomie dessine la neuvième porte. Le clan descend dans le Royaume d'En-Bas : le géant enchaîné (Mordrek) explique que la peur est le contraire du courage. Calpros, en armure d'or, retrouve Naomie et lui rend sa confiance."],
["8","Les Ancêtres du Futur","Sur le pont de Brazzaville, des visiteurs du futur (ses descendants) l'avertissent : Nakata veut ouvrir les neuf portes à la fois pour fusionner les mondes. Il se réveille, le cœur battant."],
["9","Le Ciel Noir","Le ciel s'assombrit. Le clan se rassemble à Brazzaville, KORA organise l'évacuation. Combat contre des géants rouges, Ayanda « VUKA ! », eaux de Baraka, neuf signatures ennemies. Le ciel noir se déchire."],
["10","L'Inconnue X","Calpros prend une forme blanche et or à cheveux blancs. Il protège la ville, la population, les blessés. Face à Nakata il choisit : « Je resterai un homme ». Les crédits finaux montrent une fissure violette : la suite (Cycle II)."]],[10,40,124])
h2("2. Les 24 meilleurs moments d'action (page par page)")
table([["#","Tome · page","Ce qu'on voit","Idée d'animation"],
["1","T1 · p10","Comète « VROOOM », explosion « BOUM »","Comète, souffle sur la ville"],
["2","T1 · p13 et p24","Calpros s'embrase d'or, poing « KLANG ! »","Or qui monte, yeux d'or"],
["3","T2 · p16-17","Monde astral, îles de pierre qui flottent","Travelling lent"],
["4","T2 · p35-36","Combat contre Baraka, feu orange","Ralenti puis accélération"],
["5","T3 · p18-19","Calpros vole dans un tunnel de données","Vitesse, flou"],
["6","T3 · p27-30","Ombre violette dans le labo","Fumée violette"],
["7","T4 · p8","Ayanda en feu : « VUKA ! »","Flammes, cri"],
["8","T4 · p29-30","Ronces de Rasia dans le Nova Lab","Ronces qui jaillissent"],
["9","T5 · p7-9","Duel dans le désert","Sable en tourbillon"],
["10","T5 · p15","Poing de pierre géant","Éboulis, ralenti"],
["11","T5 · p35-36","Éclat d'or dans la forêt","Explosion de feuilles"],
["12","T6 · p19-22","Nakata en armure rouge sur l'avenue, fissure rouge","Cape, éclats de bitume"],
["13","T6 · p30-34","Monde d'or de KORA Zéro, mémoire du monde","Anneaux d'or qui tournent"],
["14","T7 · p9-15","Descente dans le Royaume d'En-Bas, géant enchaîné","Travelling dans le gouffre"],
["15","T7 · p34-35","Calpros en armure d'or : onde bleue contre toupie violette","Onde, éclats"],
["16","T8 · p12","Calpros qui plane au-dessus d'un océan de lumière","Plongée, lumière"],
["17","T8 · p21-22","Monde bleu et monde rouge qui se font face","Fondu bleu et rouge"],
["18","T9 · p28-29","Géants rouges et chaînes sur la ville","Ralenti, chaînes"],
["19","T9 · p32 et p34","« VUKA ! » en flammes ; vague bleue de Baraka","Feu et eau"],
["20","T9 · p39-40","Calpros sous le ciel noir, vortex bleu","Vortex qui tourne"],
["21","T10 · p3-4","Calpros contre le monstre rouge, éclats de gravats","Impact, ralenti"],
["22","T10 · p19-20","Forme blanche et or, éclairs bleus, cheveux blancs","Éclairs, cape"],
["23","T10 · p26-27","Cœur de lumière : « Je resterai un homme »","Lumière qui rayonne"],
["24","T10 · p40","Fissure violette dans la nuit (suite)","Lueur qui pulse"]],[8,24,72,60])
h2("3. Le scénario v3 (≈ 40 s, vertical 9:16)")
p("<b>Rythme demandé :</b> intensité élevée, <b>ralenti naturel</b> sur les grandes actions (≈ 40 %), puis <b>accélération</b> à la coupe suivante. Les sons descendent en grave pendant le ralenti puis remontent. Les planches sont animées telles quelles (Kling, image vers vidéo) pour garder le dessin de la BD.")
table([["Temps","Image et animation","Vitesse","Voix off (Clémence)","Sons à bien entendre"],
["0–3","Noir. Comète (T1 p10), explosion sur Brazzaville","Normale puis ralenti","« Un jour, le ciel est tombé. »","Battement grave, sifflement, BOUM"],
["3–7","Calpros s'embrase d'or (T1 p13), yeux d'or, poing « KLANG » (T1 p24)","Ralenti puis accélération","« À Brazzaville, un jeune homme a reçu une force qu'il n'avait pas choisie. »","Souffle, craquement doré, impact"],
["7–11","Monde astral (T2), Baraka (T2 p35), tunnel de données (T3 p18)","Travelling puis rapide","« Il traverse deux mondes. Il apprend ce que la force coûte. »","Chœur grave, tonnerre, flammes"],
["11–15","Clan : « VUKA ! » (T4), ronces (T4), poing de pierre (T5 p15), forêt (T5 p35)","Ralenti sur le poing","« Le clan grandit. Neuf portes. Une famille à protéger. »","Cri, ronces, éboulis, explosion"],
["15–19","Nakata sur l'avenue (T6 p19), monde d'or de KORA Zéro (T6 p30), En-Bas (T7 p9)","Ralenti, puis lent","« Mais l'ennemi connaît son nom. »","Basse profonde, chaînes, cloche"],
["19–23","Ciel noir (T9 p39), géants rouges (T9 p28), vague de Baraka (T9 p34)","Accélération","« Le ciel devient noir. »","Tonnerre, cris, eau, feu"],
["23–27","Forme blanche et or (T10 p19), cœur de lumière (T10 p26), « Je resterai un homme »","Ralenti fort","« Un seul choix. X. »","Éclairs, silence d'une demi-seconde, grosse note"],
["27–28","Flash des 10 couvertures","Éclair","« Dix tomes. Une épopée née au Congo. »","Impact sec sur chaque couverture"],
["28–34","ARENA : 3 2 1, course, saut en tirant, glissade, robots, boss Omega Monarch","Ralenti sur le saut et l'explosion","« Et maintenant, l'aventure devient un jeu. X SAPHIR ARENA : Steel Pursuit. »","Mono-roue, lasers, pièces, explosion"],
["34–36","X SAPHIR Alpha de Calpros","Accélération","« Et bientôt, Calpros dans X SAPHIR Alpha. »","Coups, métal, souffle"],
["36–39","Logo X SAPHIR animé, « BIENTÔT », lien","Normale","« X SAPHIR. Bientôt. »","Cloche dorée, impact final"],
["39–42","« RÉALISÉ PAR STAR ENTREPRISE » puis logo STAR (signature obligatoire)","Normale","—","Note de fin"]],[13,56,22,43,40])
h2("4. Budget")
p("Kling 3.0 : environ 10 crédits par plan de 5 s ; Seedance : environ 35. Il reste 829 crédits Higgsfield.")
table([["Option","Plans","Crédits estimés","Ce que ça donne"],
["Courte","14 plans","≈ 140 à 190","Tomes 1, 2, 5, 9, 10 + ARENA"],
["<b>Recommandée</b>","24 plans animés","<b>≈ 240 à 320</b> (reprises comprises)","Les 10 tomes + ARENA + Alpha"],
["Premium","24 plans dont 6 en Seedance","≈ 440 à 520","Plans-clés plus réalistes"]],[34,34,48,58])
p("L'option recommandée laisserait environ 510 à 590 crédits. <b>Aucun plan ne part sans ton « ok ».</b>")
h2("5. Ce que j'ai besoin que tu décides")
bl(["<b>L'option :</b> courte, recommandée ou premium ?","<b>Nakata et la fin du tome 10 :</b> on les montre (menace) ou on les laisse en mystère dans la pub ?","<b>Les noms officiels des héroïnes d'ARENA</b> (Lyra, Vipera, Nyra, Luna ou Aélys, Zahra, Noxia ?) et <b>le type de jeu de X SAPHIR Alpha</b>.","<b>Le lien final</b> et la phrase d'appel (« Bientôt » ou une adresse).","<b>Voix :</b> Clémence est ta voix officielle ; d'accord pour cette pub ?","<b>TikTok / Meta :</b> on cadre l'action et les robots, pas le corps des héroïnes."])
small("Document privé, préparé par Claude. Version 3, à valider avant toute dépense de crédits.")
f=[]
for it in DOC:
    k=it[0]
    if k=='h1': f.append(Paragraph(it[1],H1))
    elif k=='h2': f.append(Paragraph(it[1],H2))
    elif k=='p': f+= [Paragraph(it[1],B),Spacer(1,3)]
    elif k=='s': f+=[Spacer(1,4),Paragraph(it[1],S)]
    elif k=='bl': f+=[Paragraph(i,BL,bulletText='•') for i in it[1]]
    elif k=='tbl': f+=[tb(it[1],it[2]),Spacer(1,4)]
doc=SimpleDocTemplate(PDF,pagesize=A4,leftMargin=16*mm,rightMargin=16*mm,topMargin=14*mm,bottomMargin=14*mm,title="Pub X SAPHIR - analyse des BD et scénario v3",author="STAR ENTREPRISE")
doc.build(f); open(MD,'w').write('\n'.join(md)+'\n'); print('ok')
