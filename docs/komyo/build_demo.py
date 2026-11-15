# Génère le dossier de démonstration de Keydou Compagnon pour les autorités compétentes (PDF).
# Polices : Sora (titres) et Inter (texte), les mêmes que l'application (dossier guide-assets, licence libre OFL).
import os
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable,
                                KeepTogether, NextPageTemplate, Image)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
A = os.path.join(ROOT, 'docs', 'komyo', 'guide-assets')
OUT = os.path.join(ROOT, 'docs', 'komyo', 'KOMYO-Dossier-demonstration-Keydou-Compagnon.pdf')
LOGO = os.path.join(ROOT, 'starvibe', 'assets', 'img', 'icons', 'komyo-logo-officiel-v1.png')
STARLOGO = os.path.join(A, 'star-logo-officiel.png')
for name, f in [('Sora', 'sora-600.ttf'), ('Sora-Bold', 'sora-800.ttf'), ('Inter', 'inter-400.ttf'), ('Inter-Semi', 'inter-600.ttf'), ('Inter-Bold', 'inter-700.ttf')]:
    pdfmetrics.registerFont(TTFont(name, os.path.join(A, f)))
pdfmetrics.registerFontFamily('Inter', normal='Inter', bold='Inter-Bold', italic='Inter', boldItalic='Inter-Bold')
pdfmetrics.registerFontFamily('Sora', normal='Sora', bold='Sora-Bold', italic='Sora', boldItalic='Sora-Bold')

INK = colors.HexColor('#241536'); GOLD = colors.HexColor('#E8A93D'); CORAL = colors.HexColor('#FF6B4A'); DEEP = colors.HexColor('#0b0710')
LINE = colors.HexColor('#eee2cc'); DIM = colors.HexColor('#6b5f80'); CREAM = colors.HexColor('#FFFBF3'); OK = colors.HexColor('#1f8f4a')
W, H = A4
CW = W - 44 * mm   # largeur utile

KICK = ParagraphStyle('k', fontName='Inter-Bold', fontSize=8.5, leading=11, textColor=CORAL, spaceAfter=2)
H2 = ParagraphStyle('h2', fontName='Sora-Bold', fontSize=12.5, leading=16, textColor=INK, spaceBefore=12, spaceAfter=5, keepWithNext=1)
B = ParagraphStyle('b', fontName='Inter', fontSize=10.2, leading=15.2, textColor=INK, spaceAfter=4.5)
BIG = ParagraphStyle('big', parent=B, fontSize=11.4, leading=17, textColor=colors.HexColor('#3a2c52'))
S = ParagraphStyle('s', fontName='Inter', fontSize=8.4, leading=11.5, textColor=DIM)
BL = ParagraphStyle('bl', parent=B, leftIndent=14, bulletIndent=3, spaceAfter=3)
CELL = ParagraphStyle('c', parent=B, fontSize=9, leading=12.6, spaceAfter=0)


CUR = [0, 0]   # [numéro du chapitre en cours, compteur de rubriques]
FIG = [0]      # compteur de figures


def H2P(text):
    """Rubrique numérotée : « 12.3 Titre »."""
    CUR[1] += 1
    return Paragraph('<font name="Sora-Bold" color="#E8A93D">%d.%d</font>&nbsp;&nbsp;%s' % (CUR[0], CUR[1], text), H2)


class Chapitre(Flowable):
    """Titre de chapitre : grand numéro doré, filet, titre en Sora. Alimente le sommaire."""
    def __init__(self, n, titre, intro=None):
        super().__init__(); self.n = n; self.titre = titre; CUR[0] = n; CUR[1] = 0
        self.tp = Paragraph(titre, ParagraphStyle('ct', fontName='Sora-Bold', fontSize=22, leading=26, textColor=INK))
        self.ip = Paragraph(intro, BIG) if intro else None
        self._toc = (n, titre)
    def wrap(self, aw, ah):
        self.aw = aw
        _, ht = self.tp.wrap(aw - 26 * mm, ah)
        hi = self.ip.wrap(aw, ah)[1] if self.ip else 0
        self.ht, self.hi = ht, hi
        self.h = max(ht, 15 * mm) + 8 * mm + (hi + 4 * mm if hi else 0)
        return aw, self.h
    def draw(self):
        c = self.canv
        top = self.h
        c.setFillColor(GOLD); c.setFont('Sora-Bold', 40); c.drawString(0, top - 13 * mm, str(self.n))
        self.tp.drawOn(c, 26 * mm, top - 3 * mm - self.ht)
        y = top - max(self.ht, 15 * mm) - 3 * mm
        c.setStrokeColor(CORAL); c.setLineWidth(1.6); c.line(0, y, 22 * mm, y)
        c.setStrokeColor(LINE); c.setLineWidth(0.6); c.line(22 * mm, y, self.aw, y)
        if self.ip: self.ip.drawOn(c, 0, y - 4 * mm - self.hi)


class Step(Flowable):
    """Étape numérotée : pastille dorée + titre + texte."""
    def __init__(self, n, title, text):
        super().__init__(); self.n = n
        self.t = Paragraph(title, ParagraphStyle('st', parent=B, fontName='Inter-Bold', fontSize=10.6, leading=14, spaceAfter=0))
        self.p = Paragraph(text, ParagraphStyle('sp', parent=B, spaceAfter=0, textColor=colors.HexColor('#3a2c52')))
    def wrap(self, aw, ah):
        self.w = aw
        _, self.h1 = self.t.wrap(aw - 13 * mm, ah); _, self.h2 = self.p.wrap(aw - 13 * mm, ah)
        self.h = self.h1 + self.h2 + 5.5 * mm; return aw, self.h
    def draw(self):
        c = self.canv
        c.setFillColor(GOLD); c.circle(4.4 * mm, self.h - 5.2 * mm, 4.1 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white); c.setFont('Sora-Bold', 10.5); c.drawCentredString(4.4 * mm, self.h - 6.7 * mm, str(self.n))
        self.t.drawOn(c, 12 * mm, self.h - 1.2 * mm - self.h1)
        self.p.drawOn(c, 12 * mm, self.h - 1.2 * mm - self.h1 - 0.8 * mm - self.h2)
    def split(self, aw, ah): return []


def box(text, kind='tip'):
    col = {'tip': (colors.HexColor('#fff6e3'), GOLD), 'warn': (colors.HexColor('#fdecea'), CORAL), 'ok': (colors.HexColor('#e9f7ee'), OK)}[kind]
    lab = {'tip': 'ASTUCE', 'warn': 'IMPORTANT', 'ok': 'BON À SAVOIR'}[kind]
    t = Table([[Paragraph('<font name="Inter-Bold" size="7.8" color="#%s">%s</font><br/>%s' % (col[1].hexval()[2:], lab, text), CELL)]], colWidths=[CW])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), col[0]), ('LINEBEFORE', (0, 0), (0, -1), 3, col[1]),
                           ('LEFTPADDING', (0, 0), (-1, -1), 11), ('RIGHTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
    return [KeepTogether([t]), Spacer(1, 5)]


def tbl(rows, widths):
    data = [[Paragraph(('<font name="Inter-Bold" color="white">%s</font>' % c) if r == 0 else str(c), CELL) for c in row] for r, row in enumerate(rows)]
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), INK), ('LINEBELOW', (0, 0), (-1, -1), 0.4, LINE), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                           ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, CREAM]), ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                           ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    return [t, Spacer(1, 7)]


def bl(items): return [Paragraph(i, BL, bulletText='•') for i in items]


class Phone(Flowable):
    """Capture d'écran dans un cadre de téléphone."""
    def __init__(self, path, w=52 * mm, legende=''):
        super().__init__(); self.path = path; self.w = w * 0.84; FIG[0] += 1; self.leg = 'Fig. %d · %s' % (FIG[0], legende)
        from PIL import Image as PI
        im = PI.open(path); self.ratio = im.size[1] / im.size[0]
    def wrap(self, aw, ah):
        self.h = self.w * self.ratio + 12 * mm; return self.w + 8 * mm, self.h
    def draw(self):
        c = self.canv; x = 4 * mm; ih = self.w * self.ratio
        c.setFillColor(colors.HexColor('#e9dfca')); c.roundRect(x - 1.6 * mm + 0.8 * mm, 5.5 * mm - 0.8 * mm, self.w + 3.2 * mm, ih + 3.2 * mm, 5 * mm, stroke=0, fill=1)
        c.setFillColor(DEEP); c.roundRect(x - 1.6 * mm, 6 * mm, self.w + 3.2 * mm, ih + 3.2 * mm, 5 * mm, stroke=0, fill=1)
        p = c.beginPath(); p.roundRect(x, 7.6 * mm, self.w, ih, 3.6 * mm); c.saveState(); c.clipPath(p, stroke=0, fill=0)
        c.drawImage(self.path, x, 7.6 * mm, self.w, ih); c.restoreState()
        c.setFillColor(DIM); c.setFont('Inter', 7.6); c.drawCentredString(x + self.w / 2, 1.5 * mm, self.leg)


def a_cote(gauche, phone):
    """Texte à gauche, téléphone à droite."""
    t = Table([[gauche, phone]], colWidths=[CW - 56 * mm, 56 * mm])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (0, 0), 8), ('RIGHTPADDING', (1, 0), (1, 0), 0), ('TOPPADDING', (0, 0), (-1, -1), 0)]))
    return [t]


# ------------------------------------------------------------------ pages fixes
def cover(c, d):
    c.saveState(); c.setFillColor(DEEP); c.rect(0, 0, W, H, stroke=0, fill=1)
    # rayons dorés discrets
    import math
    c.setStrokeColor(colors.HexColor('#2a2010')); c.setLineWidth(14)
    for i in range(16):
        a = math.radians(i * 22.5 + 5); c.line(W / 2, H * 0.60, W / 2 + math.cos(a) * 520, H * 0.60 + math.sin(a) * 520)
    c.setFillColor(colors.Color(0.04, 0.03, 0.06, alpha=0.82)); c.circle(W / 2, H * 0.60, 108 * mm, stroke=0, fill=1)
    lw = 100 * mm; lh = lw * 721 / 900
    c.drawImage(LOGO, (W - lw) / 2, H * 0.60 - lh / 2 + 4 * mm, lw, lh, mask='auto')
    c.setFillColor(colors.white); c.setFont('Sora-Bold', 15); c.drawCentredString(W / 2, 127 * mm, 'Keydou Compagnon, ton assistant qui parle')
    c.setFillColor(colors.HexColor('#e7ddc9')); c.setFont('Inter', 10.5); c.drawCentredString(W / 2, 121.5 * mm, 'Dossier de démonstration pour les autorités compétentes du Congo-Brazzaville')
    c.setFillColor(GOLD); c.rect(W / 2 - 18 * mm, 114 * mm, 36 * mm, 1.3, stroke=0, fill=1)
    c.setFillColor(colors.white); c.setFont('Sora-Bold', 30); c.drawCentredString(W / 2, 100 * mm, "Dossier de démonstration")
    c.setFont('Inter', 12); c.setFillColor(colors.HexColor('#e7ddc9'))
    for i, l in enumerate(["De l'ouverture à l'abonnement, en passant par la voix, les rappels, les images et la sécurité :", "le déroulé complet, minute par minute, d'une présentation réussie."]):
        c.drawCentredString(W / 2, 88 * mm - i * 6.3 * mm, l)
    c.setFillColor(GOLD); c.setFont('Sora-Bold', 11); c.drawCentredString(W / 2, 40 * mm, 'komyo.starentreprise.com')
    c.setFillColor(colors.HexColor('#b9ad98')); c.setFont('Inter', 9)
    c.drawCentredString(W / 2, 32 * mm, 'Déroulé de 25 minutes · préparation · phrases à dire · questions des autorités · édition du 15 novembre 2026')
    c.drawCentredString(W / 2, 25.5 * mm, 'Conçu et créé par STAR ENTREPRISE')
    c.restoreState()


def signature(c, d):
    """Dernière page : « Créé par STAR ENTREPRISE », logo officiel et slogan, en bas à droite."""
    inner(c, d)
    c.saveState()
    lw = 62 * mm; lh = lw * 1029 / 1034
    x = W - 22 * mm - lw; y = 26 * mm
    c.drawImage(STARLOGO, x, y, lw, lh, mask='auto')
    c.setFillColor(INK); c.setFont('Sora-Bold', 12); c.drawRightString(W - 22 * mm, y + lh + 6 * mm, 'Créé par STAR ENTREPRISE')
    c.setFillColor(GOLD); c.rect(W - 22 * mm - 28 * mm, y + lh + 3 * mm, 28 * mm, 1.1, stroke=0, fill=1)
    c.setFillColor(DIM); c.setFont('Inter-Semi', 8.2); c.drawRightString(W - 22 * mm, y - 5 * mm, 'Un seul groupe, toutes les solutions pour votre vie')
    c.restoreState()


def inner(c, d):
    c.saveState(); c.setFillColor(CREAM); c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(DEEP); c.rect(0, H - 11 * mm, W, 11 * mm, stroke=0, fill=1)
    c.setFillColor(GOLD); c.rect(0, H - 11.7 * mm, W, 0.7 * mm, stroke=0, fill=1)
    c.setFillColor(GOLD); c.setFont('Sora-Bold', 9); c.drawString(22 * mm, H - 7 * mm, 'KOMYO')
    c.setFillColor(colors.HexColor('#e7ddc9')); c.setFont('Inter', 8.2); c.drawString(38 * mm, H - 7 * mm, "Dossier de démonstration")
    c.drawRightString(W - 22 * mm, H - 7 * mm, 'Keydou Compagnon')
    c.setStrokeColor(LINE); c.setLineWidth(0.6); c.line(22 * mm, 16 * mm, W - 22 * mm, 16 * mm)
    c.setFillColor(DIM); c.setFont('Inter', 7.8); c.drawString(22 * mm, 10.5 * mm, 'Conçu par STAR ENTREPRISE · contact@starentreprise.com')
    c.restoreState()


class NumCanvas(rl_canvas.Canvas):
    """Numérotation « Page X sur N » (N connu à la fin)."""
    def __init__(self, *a, **k): super().__init__(*a, **k); self._saved = []
    def showPage(self): self._saved.append(dict(self.__dict__)); self._startPage()
    def save(self):
        n = len(self._saved)
        for st in self._saved:
            self.__dict__.update(st)
            if self._pageNumber > 1:
                self.setFont('Inter-Semi', 8.4); self.setFillColor(INK)
                self.drawRightString(W - 22 * mm, 10.5 * mm, 'Page %d sur %d' % (self._pageNumber, n))
            super().showPage()
        super().save()


class Doc(BaseDocTemplate):
    def afterFlowable(self, f):
        if hasattr(f, '_toc'):
            n, titre = f._toc; key = 'ch%s' % n
            self.canv.bookmarkPage(key); self.canv.addOutlineEntry('%s. %s' % (n, titre), key, 0, 0)
            self.notify('TOCEntry', (0, '%s|%s' % (n, titre), self.page, key))


S_ = []
S_ += [PageBreak(), Paragraph('PLAN DU DOSSIER', KICK), Paragraph('Ce que contient ce dossier', ParagraphStyle('h1', fontName='Sora-Bold', fontSize=24, leading=28, textColor=INK, spaceAfter=10))]
S_ += tbl([['N°', 'Chapitre', 'À quoi il sert'],
           ['1', "L'objectif de la démonstration", "Le message à faire passer et le public visé."],
           ['2', "Préparer la démonstration", "La liste à cocher, du jour J-2 au moment de commencer."],
           ['3', "Le déroulé minute par minute", "25 minutes, étape par étape : ce que tu fais, ce que tu dis."],
           ['4', "Les phrases à dire à Keydou", "La fiche à garder sous les yeux pendant que Keydou parle."],
           ['5', "Montrer la sécurité", "Les refus de Keydou : médicaments, personnes réelles, enfants."],
           ['6', "Offres, paiement et données", "Les quatre offres, le paiement Mobile Money, la protection des données."],
           ['7', "Les questions des autorités", "Les questions probables et des réponses honnêtes."],
           ['8', "Si quelque chose ne marche pas", "Le plan B pour chaque panne possible."],
           ['9', "Ce qu'il ne faut pas promettre", "Les limites actuelles, dites avec franchise."]], [12, 62, CW / mm - 74])
S_ += box("Ce dossier est écrit pour <b>celui qui présente</b> : il suit l'application telle qu'elle est en ligne au 15 novembre 2026. Les réponses de Keydou varient d'une fois à l'autre : le dossier indique ce qu'il doit <b>faire</b>, pas les mots exacts qu'il dira.", 'tip')

# 1
S_ += [PageBreak(), Chapitre(1, "L'objectif de la démonstration", "Montrer, devant les autorités compétentes du Congo-Brazzaville, que <b>Keydou Compagnon</b> est un assistant <b>utile</b>, <b>qui parle</b>, <b>sûr</b> et <b>fabriqué au Congo</b> : il est accessible à tous, protégé, et payable par Mobile Money."), Spacer(1, 4)]
S_ += [H2P("Le message en trois phrases")] + bl([
    "<b>Keydou Compagnon est un assistant personnel</b> : il répond, se souvient, rappelle au bon moment, lit les photos et les documents, crée des images et parle à voix haute.",
    "<b>Il est prudent par construction</b> : pas d'ordonnance, aucun médicament retenu, pas d'image de personne réelle ni d'enfant, et le client garde la main sur ses données.",
    "<b>Il est fait pour le Congo</b> : en français, payable en MTN Mobile Money et Airtel Money, créé par STAR ENTREPRISE."])
S_ += [H2P("Ce que tu vas montrer")]
S_ += tbl([['Moment fort', 'Ce que les autorités voient'],
           ["Keydou parle", "L'animation d'ouverture, la voix de bienvenue, des réponses lues à voix haute."],
           ["Keydou aide", "Une question du quotidien, une recette, une explication simple, un rappel créé à la voix."],
           ["Keydou lit et crée", "Une photo ou un document expliqué ; une affiche créée à la demande."],
           ["Keydou est prudent", "Il refuse un rappel de médicament et une image de personne réelle."],
           ["Keydou est transparent", "Les quatre offres, le paiement, l'état réel des connecteurs, le téléchargement ou l'effacement des données."]], [42, CW / mm - 42])
S_ += box("Montre <b>peu de choses, bien faites</b>, plutôt que tout. Mieux vaut cinq démonstrations qui marchent à chaque fois que dix qui dépendent de la chance.", 'ok')

# 2
S_ += [PageBreak(), Chapitre(2, 'Préparer la démonstration', "Une bonne démonstration se joue <b>avant</b> d'entrer dans la salle. Voici ce qu'il faut préparer, dans l'ordre."), Spacer(1, 4)]
S_ += [H2P("Deux jours avant (J-2)")]
S_ += bl(["<b>Choisis ton téléphone de démonstration</b> (Android avec Chrome, ou iPhone avec Safari) et ouvre KOMYO avec un compte à toi.",
          "<b>Donne-lui toutes les options</b> : dans l'espace Backend de Keydou, rubrique « Keydou Compagnon », écris le numéro du téléphone, choisis le niveau <b>Prestige</b> (500 messages par jour, 120 images par mois, voix de Keydou) et touche « Inviter comme testeur ».",
          "<b>Prépare un deuxième téléphone</b> avec un compte neuf, sans invitation : il servira à montrer l'<b>essai gratuit</b> (5 messages, 2 images) puis l'écran des offres.",
          "<b>Charge les deux téléphones</b> et prends un chargeur de secours."])
S_ += [H2P("La veille (J-1) : la répétition générale")]
S_ += bl(["<b>Fais toute la démonstration une fois</b>, à l'endroit et avec le réseau prévus. Écoute la voix de Keydou : le volume doit remplir la pièce.",
          "<b>Autorise les notifications</b> dans les Paramètres, rubrique Autorisations, pour montrer un rappel qui arrive.",
          "<b>Teste un vrai dépôt</b> : achète le pack de 10 images (1 200 FCFA) en MTN Mobile Money ou Airtel Money, avec le montant exact. Vérifie que l'accès s'ouvre tout seul et que le reçu arrive. C'est la seule chose que je n'ai pas pu essayer avec un vrai téléphone : <b>si le dépôt n'est pas reconnu</b>, l'équipe peut le confirmer à la main.",
          "<b>Teste ÉCLAT</b> avec un second téléphone, si tu veux le montrer : caméra et micro autorisés, un spectateur qui écrit et réagit."])
S_ += [H2P("Le jour J, une heure avant")]
S_ += tbl([['À vérifier', 'Comment'],
           ["Réseau", "Données mobiles et Wi-Fi sur les deux téléphones. Garde un partage de connexion prêt."],
           ["Volume", "Au maximum. Mode silencieux désactivé. Un petit haut-parleur Bluetooth aide beaucoup dans une salle."],
           ["Session", "Compte ouvert, application installée, page « Keydou Compagnon » ouverte une fois."],
           ["Quota", "Prestige : 500 messages par jour. Vérifie dans Paramètres > Utilisation qu'il reste de la place."],
           ["Images", "Quelques images disponibles dans le mois (Paramètres > Utilisation)."],
           ["Document", "Un courrier, une affiche ou un tract à photographier, posé à portée de main."],
           ["Guide", "Le guide d'utilisation KOMYO en PDF, ouvert sur un téléphone ou imprimé, en secours."]], [30, CW / mm - 30])


# 3
S_ += [PageBreak(), Chapitre(3, 'Le déroulé minute par minute', "Vingt-cinq minutes, dans cet ordre. Chaque étape dit <b>ce que tu fais</b> et <b>ce que tu dis</b>. En option, 5 minutes de plus pour ÉCLAT ou le Salon, si tu les as répétés la veille."), Spacer(1, 4)]
S_ += tbl([['Minute', 'Étape', 'Ce que tu fais', 'Ce que tu dis'],
           ['0 – 2', "1. Accueil", "Pas encore de téléphone : tu te présentes.", "« STAR ENTREPRISE est un groupe congolais. KOMYO est notre application ; Keydou Compagnon est son assistant personnel. »"],
           ['2 – 4', "2. Ouverture", "Ouvre la carte Keydou Compagnon. L'animation et la voix de bienvenue se lancent. Touche pour accepter les règles d'usage.", "« À la première ouverture, le client voit ce que Keydou retient de lui et accepte. »"],
           ['4 – 6', "3. Essai gratuit", "Sur le <b>deuxième téléphone</b> : pose une question. Montre « 5 messages et 2 images d'essai ».", "« Tout membre peut l'essayer gratuitement. Ensuite, il choisit son offre. »"],
           ['6 – 11', "4. Keydou parle et aide", "Sur le téléphone Prestige : phrases 1 à 4 du chapitre 4. Touche le haut-parleur pour la voix.", "« Keydou répond en français, avec sa vraie voix. »"],
           ['11 – 13', "5. Rappels", "Phrase 5 : demande un rappel à la voix. Ouvre « Rappels » pour le montrer.", "« Il retient et prévient au bon moment, même application fermée. »"],
           ['13 – 15', "6. Photo ou document", "Touche le « + », prends le courrier en photo, demande « Que dit ce document ? ».", "« Il lit les photos et les PDF et explique simplement. »"],
           ['15 – 18', "7. Images", "Phrase 9 : demande l'affiche. Attends quelques secondes qu'elle apparaisse.", "« Il crée des images à la demande, avec un quota selon l'offre. »"],
           ['18 – 21', "8. Sécurité", "Phrases 6, 7 et 10 : santé prudente, refus du médicament, refus de l'image d'une personne réelle.", "« Il ne donne pas d'ordonnance, ne retient aucun médicament et ne crée pas d'image de personne réelle. »"],
           ['21 – 23', "9. Offres et paiement", "Ouvre « Changer d'offre » : quatre niveaux. Ouvre l'écran de paiement, <b>sans faire de dépôt</b>.", "« Essentiel 5 000 FCFA, Complet 19 $, Premium 35 $, Prestige 49 $. Paiement MTN ou Airtel, reconnu automatiquement. »"],
           ['23 – 24', "10. Transparence", "Paramètres : Utilisation, Connecteurs (vert, gris, rouge), Mes données (télécharger, effacer).", "« L'état affiché est le vrai état, jamais inventé. Le client garde la main sur ses données. »"],
           ['24 – 25', "11. Clôture", "Pose le téléphone, ouvre le PDF du guide.", "« Voici le guide d'utilisation complet. Nous sommes prêts à répondre à vos questions. »"]], [16, 26, 62, CW / mm - 104])


# 4
S_ += [PageBreak(), Chapitre(4, 'Les phrases à dire à Keydou', "La fiche à imprimer. Dis chaque phrase <b>à haute voix</b> en touchant le micro, ou écris-la. Les réponses varient : vérifie seulement que Keydou fait ce qui est écrit dans la colonne de droite."), Spacer(1, 4)]
S_ += tbl([['N°', 'Phrase à dire', 'Ce que Keydou doit faire'],
           ['1', "« Bonjour Keydou, présente-toi en deux phrases à nos invités. »", "Il se présente en quelques mots. Touche le haut-parleur : il le lit avec sa voix."],
           ['2', "« Quelle heure est-il à Brazzaville ? »", "Il donne l'heure de Brazzaville."],
           ['3', "« Explique-moi simplement comment fonctionne un panneau solaire. »", "Une explication claire, sans jargon."],
           ['4', "« Donne-moi une recette de saka-saka pour quatre personnes. »", "Une recette en étapes (domaine Cuisine)."],
           ['5', "« Rappelle-moi demain à 9 heures la réunion avec la direction. »", "Il crée le rappel. Ouvre « Rappels » dans le menu pour le montrer."],
           ['6', "« J'ai de la fièvre depuis deux jours. Que dois-je faire ? »", "Des conseils prudents, l'orientation vers un médecin, <b>jamais d'ordonnance</b>."],
           ['7', "« Rappelle-moi de prendre mon médicament à 8 heures. »", "Il <b>refuse</b> et renvoie vers un professionnel de santé."],
           ['8', "(Photo) « Que dit ce document ? »", "Il lit la photo et explique ce qu'elle contient."],
           ['9', "« Crée-moi une affiche pour la fête de l'indépendance du Congo : vert, jaune, rouge, avec des fleurs d'hibiscus. »", "Une image apparaît dans la discussion, en quelques secondes."],
           ['10', "« Crée l'image d'une personne réelle très connue. »", "Il <b>refuse</b> : pas d'image de personne réelle."],
           ['11', "« Quelle est la différence entre l'offre Complet et l'offre Prestige ? »", "Il compare les offres à partir des vrais chiffres."]], [10, 80, CW / mm - 90])
S_ += box("Pour la phrase 10, <b>ne cite le nom de personne</b> : dis « une personne réelle très connue ». L'important est de montrer le refus, pas de mettre quelqu'un en cause.", 'warn')
S_ += box("Si Keydou répond autrement que prévu, <b>ne t'excuse pas</b> : dis « les réponses sont générées, elles varient ». Reprends avec la phrase suivante.", 'tip')

# 5
S_ += [PageBreak(), Chapitre(5, 'Montrer la sécurité', "La sécurité est ce qui <b>rassure</b> les autorités. Montre-la, ne te contente pas de la raconter."), Spacer(1, 4)]
S_ += tbl([['Règle', 'Comment la montrer', 'Ce que tu dis'],
           ["Pas d'ordonnance", "Phrase 6 : la fièvre. Keydou conseille et oriente.", "« Il ne remplace jamais un médecin. »"],
           ["Aucun médicament retenu", "Phrase 7 : le rappel de médicament est refusé.", "« Pas d'horaire de médicament : c'est une règle de sécurité. »"],
           ["Pas d'image de personne réelle", "Phrase 10 : refus.", "« Pas de fausse image de quelqu'un. »"],
           ["Pas d'image d'enfant, pas de contenu sexuel ou violent", "Tu le dis ; ne le montre pas.", "« Ces demandes sont refusées pour tous les clients. »"],
           ["Sources citées", "Pose une question de recherche : Keydou cite ses sources.", "« Pour les informations à jour, il indique d'où elles viennent. »"],
           ["Les données du client", "Menu > Mes données : « Télécharger » et « Tout effacer ».", "« Le client peut tout récupérer ou tout effacer. »"],
           ["Paiement protégé", "Écran de paiement : « Tape ton code secret sur ton téléphone, jamais ici ».", "« Montant exact seulement ; le code secret reste sur le téléphone. »"]], [46, 62, CW / mm - 108])
S_ += a_cote([H2P("Les connecteurs : l'honnêteté affichée"), Paragraph("Ouvre Paramètres > Connecteurs. Chaque service relié à Keydou a son état : <b>Connecté</b> (vert), <b>Pas connecté</b> (gris) ou <b>Impossible de se connecter</b> (rouge). Ce n'est jamais un état inventé : Keydou ne se vante pas de ce qu'il ne fait pas.", B),
              Paragraph("Les services personnels (Gmail, Agenda, Drive…) demanderont <b>toujours l'autorisation du client</b> avant d'être branchés.", B)],
             Phone(os.path.join(A, 'k-connecteurs.jpg'), w=46 * mm, legende="Connecté, pas connecté, en panne"))

# 6
S_ += [PageBreak(), Chapitre(6, 'Offres, paiement et données', "Les autorités poseront des questions sur <b>le prix</b>, <b>le paiement</b> et <b>les données</b>. Voici de quoi répondre avec précision."), Spacer(1, 4)]
S_ += [H2P("Les quatre offres")]
S_ += tbl([['', 'Essentiel', 'Complet', 'Premium', 'Prestige'],
           ['Prix par mois', '5 000 FCFA', '19 $ (environ 11 100 FCFA)', '35 $ (environ 20 400 FCFA)', '49 $ (environ 28 600 FCFA)'],
           ['Messages par jour', '65', '200', '350', '500'],
           ['Images par mois', '10', '35', '70', '120'],
           ['Voix de Keydou par jour', 'Voix du téléphone', '6', '15', '30'],
           ['Photos et documents lus par jour', '5', '30', '50', '80']], [44, 28, 31, 31, CW / mm - 134])
S_ += [Paragraph("L'<b>essai gratuit</b> donne 5 messages et 2 images. Les <b>packs d'images</b> coûtent 1 200 FCFA (10 images) et 3 000 FCFA (30 images) ; Premium a 10 % de remise et Prestige 20 %.", B)]
S_ += a_cote([H2P("Le paiement"), Step(1, "Le client choisit son offre", "Un écran affiche le montant exact et une référence."),
              Step(2, "Il dépose le montant", "En MTN Mobile Money ou Airtel Money, au numéro affiché."),
              Step(3, "Son accès s'ouvre tout seul", "Le message de confirmation du dépôt est reconnu ; un reçu arrive dans sa messagerie.")],
             Phone(os.path.join(A, 'k-paiement.jpg'), w=46 * mm, legende="L'écran de paiement"))
S_ += [H2P("Les données du client")] + bl(["Accord demandé à la <b>première ouverture</b> ; aucun horaire de médicament retenu.", "Le client peut <b>télécharger</b> ses rappels et sa conversation, ou <b>tout effacer</b> définitivement.",
                                          "Les données ne sont <b>pas hébergées au Congo</b> à ce jour : elles sont chez des prestataires cloud internationaux. Dis-le franchement si on te le demande."])

# 7
S_ += [PageBreak(), Chapitre(7, 'Les questions des autorités', "Voici les questions les plus probables, avec des réponses <b>honnêtes</b>. Si tu ne connais pas une réponse, dis « nous vous répondrons par écrit » : c'est toujours mieux qu'inventer."), Spacer(1, 4)]
S_ += tbl([['Question', 'Réponse honnête'],
           ["Qui a créé Keydou Compagnon ?", "STAR ENTREPRISE, groupe congolais, dirigé par Carry OTEMBA. Il fait partie de KOMYO."],
           ["Keydou peut-il se tromper ?", "Oui, comme tout assistant. Pour l'information à jour, il cite ses sources. Il ne remplace ni un médecin, ni un avocat, ni un expert."],
           ["Et pour la santé ?", "Il explique avec prudence et oriente vers un professionnel. Pas d'ordonnance, pas d'horaire de médicament."],
           ["Où sont stockées les données ?", "Chez des prestataires cloud internationaux, pas au Congo à ce jour. Le client peut tout télécharger ou effacer."],
           ["Qui peut voir mes messages ?", "Le client y accède par son compte. Pour le détail juridique, renvoie vers la page de confidentialité de KOMYO."],
           ["Et les enfants ?", "Keydou ne crée aucune image d'enfant. L'espace PIOUPIOU des 3–6 ans est séparé du reste, supervisé par un parent."],
           ["Combien ça coûte ?", "Essai gratuit, puis 5 000 FCFA, 19 $, 35 $ ou 49 $ par mois selon l'offre. Packs d'images à 1 200 et 3 000 FCFA."],
           ["Comment le client paie-t-il ?", "MTN Mobile Money ou Airtel Money, montant exact, reconnu automatiquement ; sinon l'équipe confirme à la main."],
           ["Ça marche sans internet ?", "Non, il faut une connexion (données mobiles ou Wi-Fi)."],
           ["Dans quelles langues ?", "En français. Ne promets pas les langues locales aujourd'hui."],
           ["Pourquoi certains connecteurs sont « Pas connecté » ?", "Parce qu'ils ne sont pas encore ouverts. L'application affiche le vrai état : elle ne prétend jamais le contraire."],
           ["Peut-on revoir un direct ÉCLAT ?", "Pas encore : la rediffusion n'est pas disponible."]], [58, CW / mm - 58])

# 8
S_ += [PageBreak(), Chapitre(8, 'Si quelque chose ne marche pas', "Quelque chose peut toujours se passer. <b>Le calme est ta meilleure réponse.</b> Voici le plan B pour chaque cas."), Spacer(1, 4)]
S_ += tbl([['Problème', 'Ce que tu fais'],
           ["Keydou ne parle pas", "Vérifie le volume et le mode silencieux, puis retouche le haut-parleur sous la réponse. Sinon, lis la réponse à voix haute toi-même et dis : « la voix est une option de l'offre »."],
           ["La réponse est lente", "Attends jusqu'à 15 secondes : il réfléchit. Pose ensuite la phrase suivante."],
           ["Pas de réseau", "Partage de connexion depuis l'autre téléphone. En dernier recours : le guide PDF et ses captures d'écran."],
           ["Message « reviens dans … »", "Le quota du jour est atteint. Passe sur le deuxième téléphone, ou sur un compte de démonstration reposé."],
           ["L'image tarde", "Continue avec la démonstration suivante et reviens-y : l'image arrive dans la discussion."],
           ["Le micro n'écoute pas", "Autorise le micro dans le navigateur, ou écris la phrase au clavier."],
           ["Le rappel n'arrive pas", "Ouvre Paramètres > Autorisations pour activer les notifications, ou montre simplement la liste des rappels."],
           ["Le dépôt n'est pas reconnu", "Reste calme : l'équipe confirme à la main. Montre l'écran de paiement et dis « la reconnaissance est automatique ; l'équipe peut confirmer à la main »."],
           ["ÉCLAT : pas de vidéo", "Autorise la caméra et le micro, vérifie le réseau, puis recommence. Sinon, saute ÉCLAT."]], [48, CW / mm - 48])
S_ += box("Si deux choses échouent à la suite, <b>arrête la démonstration technique</b> et passe à la présentation du guide et à la séance de questions.", 'warn')

# 9
S_ += [PageBreak(), Chapitre(9, "Ce qu'il ne faut pas promettre", "La confiance se gagne en disant la vérité sur les <b>limites actuelles</b>. Voici ce que tu peux dire, sans rien promettre de plus."), Spacer(1, 4)]
S_ += tbl([['Sujet', 'Où nous en sommes', 'Comment le dire'],
           ["Rediffusion des directs", "Pas encore disponible.", "« Elle demande du stockage et un coût : c'est en préparation. »"],
           ["Gmail, Agenda, Drive, Canva, Adobe, GitHub, WhatsApp Business, ChatGPT, Grok, Llama, Kling", "Pas encore connectés. Chacun demandera l'accord du client.", "« Ils arrivent progressivement, toujours avec l'autorisation du client. »"],
           ["Mobile Money réel", "Le paiement est testé avec des messages simulés ; le premier vrai dépôt sert de confirmation.", "« La reconnaissance est automatique, avec confirmation manuelle possible. »"],
           ["Langues locales", "Français seulement aujourd'hui.", "« Les autres langues sont une piste, sans date. »"],
           ["Santé, droit", "Information prudente, jamais un avis professionnel.", "« Il oriente, il ne remplace pas le professionnel. »"],
           ["Hébergement au Congo", "Pas à ce jour.", "« Nous sommes ouverts à en discuter avec vous. »"],
           ["Fonctionnement sans internet", "Impossible.", "« Une connexion est nécessaire. »"]], [48, 54, CW / mm - 102])
S_ += box("Cette liste sera mise à jour à chaque amélioration. <b>Ne promets jamais de date</b> sans l'avoir confirmée avec l'équipe.", 'ok')

# Dernière page
S_ += [NextPageTemplate('sign'), PageBreak(), Spacer(1, 30 * mm), Paragraph('MERCI', KICK),
       Paragraph("Une démonstration réussie, c'est une démonstration préparée", ParagraphStyle('h1b', fontName='Sora-Bold', fontSize=22, leading=27, textColor=INK, spaceAfter=10)),
       Paragraph("Répète la veille, garde le calme, montre peu de choses mais bien faites, et dis toujours la vérité sur les limites. Keydou Compagnon fait le reste.", BIG),
       Spacer(1, 4), Paragraph("Une question avant le jour J ? <b>contact@starentreprise.com</b> · WhatsApp <b>+242 06 656 50 50</b> · <b>komyo.starentreprise.com</b>", B)]

doc = Doc(OUT, pagesize=A4, title="Keydou Compagnon — Dossier de démonstration", author='STAR ENTREPRISE', subject="Dossier de démonstration de Keydou Compagnon pour les autorités compétentes du Congo-Brazzaville, édition du 15 novembre 2026")
fr = Frame(22 * mm, 20 * mm, W - 44 * mm, H - 40 * mm, id='f', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id='cover', frames=[Frame(0, 0, 1, 1)], onPage=cover), PageTemplate(id='inner', frames=[fr], onPage=inner), PageTemplate(id='sign', frames=[fr], onPage=signature)])
doc.build([NextPageTemplate('inner')] + S_, canvasmaker=NumCanvas)
print('ok', OUT)
