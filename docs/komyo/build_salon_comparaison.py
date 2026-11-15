# Génère le comparatif « Le Salon KOMYO (appel vidéo en famille) : services vidéo et coûts » (PDF, 9 novembre 2026).
import os
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
A = os.path.join(ROOT, 'docs', 'komyo', 'guide-assets')
OUT = os.path.join(ROOT, 'docs', 'komyo', 'KOMYO-Salon-comparaison-services-video.pdf')
for name, f in [('Sora', 'sora-600.ttf'), ('Sora-Bold', 'sora-800.ttf'), ('Inter', 'inter-400.ttf'), ('Inter-Bold', 'inter-700.ttf')]:
    pdfmetrics.registerFont(TTFont(name, os.path.join(A, f)))
pdfmetrics.registerFontFamily('Inter', normal='Inter', bold='Inter-Bold', italic='Inter', boldItalic='Inter-Bold')
INK = colors.HexColor('#241536'); GOLD = colors.HexColor('#E8A93D'); CORAL = colors.HexColor('#FF6B4A'); LINE = colors.HexColor('#eee2cc')
DIM = colors.HexColor('#6b5f80'); CREAM = colors.HexColor('#FFFBF3'); OK = colors.HexColor('#1f8f4a')
H1 = ParagraphStyle('h1', fontName='Sora-Bold', fontSize=19, leading=23, textColor=INK, spaceAfter=3)
H2 = ParagraphStyle('h2', fontName='Sora-Bold', fontSize=12, leading=15, textColor=INK, spaceBefore=10, spaceAfter=4)
B = ParagraphStyle('b', fontName='Inter', fontSize=9.4, leading=13.6, textColor=INK, spaceAfter=4)
S = ParagraphStyle('s', fontName='Inter', fontSize=8, leading=11, textColor=DIM)
BL = ParagraphStyle('bl', parent=B, leftIndent=12, bulletIndent=2, spaceAfter=2.5)
C = ParagraphStyle('c', parent=B, fontSize=8.2, leading=11, spaceAfter=0)
CH = ParagraphStyle('ch', parent=C, fontName='Inter-Bold', textColor=colors.white)
K = ParagraphStyle('k', fontName='Inter-Bold', fontSize=8, leading=10, textColor=CORAL)
FX = 584   # 1 $ vaut environ 584 FCFA (19 $ = 11 100 FCFA, comme dans KOMYO)
def fc(usd): return f"{round(usd * FX / 1000) * 1000:,}".replace(',', ' ') + ' FCFA'
def bl(items): return [Paragraph(i, BL, bulletText='•') for i in items]
def tbl(rows, widths, head=True):
    data = [[Paragraph(str(c), CH if (head and r == 0) else C) for c in row] for r, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1)
    st = [('GRID', (0, 0), (-1, -1), 0.4, LINE), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
          ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3), ('BACKGROUND', (0, 0), (-1, 0), INK)]
    for r in range(1, len(rows)):
        if r % 2 == 0: st.append(('BACKGROUND', (0, r), (-1, r), colors.HexColor('#fff4df')))
    t.setStyle(TableStyle(st)); return t
def box(text, kind='tip'):
    col = {'tip': GOLD, 'ok': OK, 'warn': CORAL}[kind]
    t = Table([[Paragraph(text, C)]], colWidths=[W - 36 * mm]); t.setStyle(TableStyle([('LINEBEFORE', (0, 0), (0, 0), 3, col), ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fff9ec')),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)])); return t
W, H = A4

# ---- calculs (visibles dans le tableau) : 4 appels x 30 min x 3 personnes = 360 minutes-participant par famille et par mois
PM = 360
SC = [100, 500, 2000]
def livekit(pm):    # Ship 50 $/mois, 150 000 min incluses, puis 0,0005 $/min
    return 50 + max(0, pm - 150_000) * 0.0005
def daily(pm):      # 10 000 min gratuites, puis 0,004 $/min (vidéo)
    return max(0, pm - 10_000) * 0.004
def agora(pm):      # 10 000 min gratuites, puis 3,99 $ / 1 000 min (vidéo HD)
    return max(0, pm - 10_000) * 3.99 / 1000
def jaas(fam):      # par utilisateur actif : 300 -> 99 $, 1 500 -> 499 $, 3 000 -> 999 $, au-delà 0,99 $ par utilisateur
    u = fam * 3
    if u <= 25: return 0
    if u <= 300: return 99
    if u <= 1500: return 499
    if u <= 3000: return 999
    return 999 + (u - 3000) * 0.99
rows = [['Service', 'Comment il facture', f'{SC[0]} familles', f'{SC[1]} familles', f'{SC[2]} familles']]
def line(nom, how, f):
    cells = [nom, how]
    for n in SC:
        usd = f(n); per = usd * FX / n
        cells.append(f"<b>{usd:,.0f} $</b> = {fc(usd)}<br/>soit {round(per):,} FCFA par famille".replace(',', ' ') if usd else "gratuit")
    return cells
rows.append(line('LiveKit Cloud', "Abonnement Ship 50 $ par mois (150 000 minutes comprises), puis 0,0005 $ la minute par personne.", lambda n: livekit(n * PM)))
rows.append(line('Daily', "10 000 minutes gratuites par mois, puis environ 0,004 $ la minute par personne (vidéo).", lambda n: daily(n * PM)))
rows.append(line('Agora', "10 000 minutes gratuites, puis environ 3,99 $ les 1 000 minutes (vidéo HD).", lambda n: agora(n * PM)))
rows.append(line('8x8 Jitsi (JaaS)', "Par utilisateur actif dans le mois (pas par minute) : 99 $ jusqu'à 300, 499 $ jusqu'à 1 500, 999 $ jusqu'à 3 000, puis 0,99 $ de plus par personne.", lambda n: jaas(n)))

story = [Paragraph('KOMYO — Le Salon, l\'appel vidéo en famille', H1),
         Paragraph('Comparaison de services vidéo et coût estimé · 9 novembre 2026 · pour décision de Carry OTEMBA, avant tout développement', S), Spacer(1, 6)]
story += [Paragraph('1. Ce qu\'on veut construire', H2)] + bl([
    "Un appel vidéo à plusieurs dans le même écran, comme une conférence : <b>Salon Famille</b> (parents et enfants, sur invitation) et <b>Salon Amis</b>.",
    "De 4 à 12 personnes, micro et caméra que chacun peut couper, l'organisateur peut couper un participant, un mode <b>économie de données</b> (voir la maquette).",
    "Les enfants entrent avec le compte de leur parent. Aucun enregistrement par défaut."])
story += [Paragraph('2. Hypothèse de calcul', H2),
          Paragraph("Une famille active fait <b>4 appels par mois de 30 minutes à 3 personnes</b> : cela fait <b>360 « minutes-participant »</b> par famille et par mois (une personne connectée une minute compte une minute). C'est un exemple prudent : si les familles appellent plus, les prix par minute augmentent en proportion. Taux utilisé : 1 $ vaut environ 584 FCFA.", B)]
story += [Paragraph('3. Les services comparés', H2),
          tbl(rows, [24 * mm, 54 * mm, (W - 36 * mm - 78 * mm) / 3, (W - 36 * mm - 78 * mm) / 3, (W - 36 * mm - 78 * mm) / 3]), Spacer(1, 4),
          Paragraph("Prix relevés sur les pages des fournisseurs et des comparatifs le 9 novembre 2026. Ils peuvent changer et plusieurs chiffres viennent de sites tiers : <b>à confirmer sur la page officielle avant de s'engager</b>. Les remises de volume ne sont pas comptées.", S)]
fam = 1500
story += [Paragraph('4. Ce que ça représente par rapport à l\'abonnement Famille (1 500 FCFA pour 30 jours)', H2)] + bl([
    f"<b>LiveKit</b> : environ {round(livekit(500*PM)*FX/500)} à {round(livekit(100*PM)*FX/100)} FCFA par famille et par mois, soit 5 % à 20 % du prix de l'abonnement.",
    f"<b>Daily et Agora</b> : environ {round(daily(100*PM)*FX/100)} à {round(daily(2000*PM)*FX/2000)} FCFA par famille et par mois, soit <b>40 % à 55 %</b> du prix de l'abonnement : trop cher pour l'inclure dans Famille sans le faire payer.",
    f"<b>JaaS</b> : environ {round(jaas(100)*FX/100)} FCFA par famille jusqu'à 500 familles, puis plus cher au-delà de 1 000 familles sans remise.",
    "<b>Pour les petits volumes (un test avec quelques familles)</b>, Daily (10 000 minutes gratuites par mois) et LiveKit (5 000 minutes gratuites) ne coûtent presque rien."])
story += [Paragraph('5. Notre avis', H2)]
story += [box("<b>Recommandation : LiveKit Cloud</b> pour la version durable. C'est le moins cher dès qu'il y a plusieurs centaines de familles, il gère les salons de plusieurs personnes et le réglage de la qualité selon la connexion. Pour le <b>test de départ</b> avec quelques familles, le gratuit de LiveKit ou de Daily suffit. <b>Daily</b> est le plus rapide à mettre en place (écran d'appel prêt à intégrer), mais le plus cher à grande échelle.", 'ok'), Spacer(1, 4)]
story += [Paragraph('6. Les points de vigilance', H2)] + bl([
    "<b>Données mobiles :</b> une vidéo en basse définition consomme de l'ordre de 150 à 250 Mo par heure et par personne, contre une vingtaine de Mo en audio seul (ordres de grandeur). Au Congo, les données coûtent cher : prévoir un mode <b>audio seul</b> et une vidéo légère par défaut.",
    "<b>Qualité du réseau :</b> le service doit s'adapter quand le réseau faiblit. À tester avec de vraies familles à Brazzaville et à Pointe-Noire avant de promettre quoi que ce soit.",
    "<b>Enfants :</b> salons sur invitation seulement, pas d'enregistrement, pas d'échange entre adultes et mineurs (même règle que dans KOMYO). Un parent peut fermer le salon.",
    "<b>Coût variable :</b> contrairement à un abonnement fixe, la facture monte avec l'usage. Il faut un plafond (durée maximale d'un salon, nombre de personnes) et un suivi dans le Backend.",
    "<b>Développement :</b> il faut un petit service qui crée les salons et délivre les accès aux seuls abonnés Famille, puis l'écran du Salon dans l'application."])
story += [Paragraph('7. La maquette', H2),
          Paragraph("La maquette de l'écran existe déjà, dans l'Artifact « KOMYO Mboté et Salon », onglet <b>1 · Salon (appel de groupe)</b> : choix Famille ou Amis, création du salon et invitations, puis l'écran d'appel avec 4, 6, 9 ou 12 personnes, les boutons micro, caméra, inviter et quitter, et l'indicateur d'économie de données. Lien : https://claude.ai/artifact/TcEyWsCvZ1LnvSG9LRK3NR", B)]
story += [Paragraph('8. Ce qu\'il nous faut de toi pour décider', H2)] + bl([
    "Le Salon est-il <b>inclus dans l'abonnement Famille</b> (1 500 FCFA), ou une <b>option payante à part</b> ?",
    "Combien de personnes au maximum dans un salon : 4, 6 ou 12 ?",
    "La vidéo ou l'audio seul par défaut, pour économiser les données de tes clients ?",
    "OK pour un <b>test fermé</b> avec quelques familles invitées, avant d'ouvrir à tout le monde ?"])
story += [Spacer(1, 6), Paragraph("Rien n'est construit ni engagé : aucun compte n'a été créé chez ces fournisseurs et aucun crédit n'a été dépensé pour ce comparatif.", S)]

def pied(c, d):
    c.saveState(); c.setFont('Inter', 8); c.setFillColor(DIM); c.drawString(18 * mm, 10 * mm, 'STAR ENTREPRISE · KOMYO · Le Salon : comparatif des services vidéo · 9 novembre 2026')
    c.drawRightString(W - 18 * mm, 10 * mm, 'Page %d' % d.page); c.setFillColor(GOLD); c.rect(0, H - 4 * mm, W, 4 * mm, stroke=0, fill=1); c.restoreState()
doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=14 * mm, bottomMargin=16 * mm, title='KOMYO — Le Salon : comparatif des services vidéo', author='STAR ENTREPRISE')
doc.build(story, onFirstPage=pied, onLaterPages=pied)
print('ok', OUT)
