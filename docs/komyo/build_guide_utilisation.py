# Génère le guide d'utilisation de KOMYO (PDF à télécharger, édition novembre 2026) — pour tout le monde.
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
OUT = os.path.join(ROOT, 'docs', 'komyo', 'KOMYO-Guide-utilisation.pdf')
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
    c.setFillColor(colors.white); c.setFont('Sora-Bold', 15); c.drawCentredString(W / 2, 127 * mm, 'Le réseau social de toute la famille')
    c.setFillColor(colors.HexColor('#e7ddc9')); c.setFont('Inter', 10.5); c.drawCentredString(W / 2, 121.5 * mm, 'Enfants · jeunes · parents · adultes : chacun son espace')
    c.setFillColor(GOLD); c.rect(W / 2 - 18 * mm, 114 * mm, 36 * mm, 1.3, stroke=0, fill=1)
    c.setFillColor(colors.white); c.setFont('Sora-Bold', 30); c.drawCentredString(W / 2, 100 * mm, "Guide d'utilisation")
    c.setFont('Inter', 12); c.setFillColor(colors.HexColor('#e7ddc9'))
    for i, l in enumerate(["De l'installation à ta première vidéo, aux médailles du parrainage :", "tout ce qu'il faut savoir, pas à pas, même si c'est ta première application."]):
        c.drawCentredString(W / 2, 88 * mm - i * 6.3 * mm, l)
    c.setFillColor(GOLD); c.setFont('Sora-Bold', 11); c.drawCentredString(W / 2, 40 * mm, 'komyo.starentreprise.com')
    c.setFillColor(colors.HexColor('#b9ad98')); c.setFont('Inter', 9)
    c.drawCentredString(W / 2, 32 * mm, 'Gratuit · téléphone, tablette et ordinateur · en français · édition de novembre 2026 · mise à jour du 15 novembre')
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
    c.setFillColor(colors.HexColor('#e7ddc9')); c.setFont('Inter', 8.2); c.drawString(38 * mm, H - 7 * mm, "Guide d'utilisation")
    c.drawRightString(W - 22 * mm, H - 7 * mm, 'Apprendre · Créer · Partager')
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
toc = TableOfContents()
toc.levelStyles = [ParagraphStyle('t0', fontName='Inter', fontSize=10.5, leading=16.5, textColor=INK, leftIndent=0)]
toc.dotsMinLevel = 0
toc.rightColumnWidth = 14 * mm

# ------------------------------------------------------------------ sommaire
S_ += [PageBreak(), Paragraph('SOMMAIRE', KICK), Paragraph('Ce que contient ce guide', ParagraphStyle('h1', fontName='Sora-Bold', fontSize=24, leading=28, textColor=INK, spaceAfter=10)), toc,
       Spacer(1, 8)]
S_ += box("Chaque chapitre tient en une ou deux pages et peut se lire seul. Les numéros de page sont indiqués en bas à droite : « Page X sur N ».", 'tip')

# 1
S_ += [PageBreak(), Chapitre(1, 'Découvrir KOMYO', "KOMYO est une <b>application de réseau social</b> : des <b>vidéos courtes, filmées en vertical</b> avec ton téléphone, que tu regardes, publies, aimes, commentes et partages, comme sur les grands réseaux. Son idée : <b>Apprendre, Créer, Partager</b>. Elle est faite pour toutes les cultures, partout dans le monde, avec un vrai espace séparé et protégé pour les enfants."), Spacer(1, 4)]
S_ += [H2P('Ce que tu peux faire')] + bl([
    "<b>Regarder</b> des vidéos de créateurs proches de toi, de ta ville, de ta culture.",
    "<b>Filmer et publier</b> tes propres vidéos, directement depuis ton téléphone.",
    "<b>Aimer, commenter et partager</b> les vidéos des autres.",
    "<b>Inviter tes amis</b> avec Myo, et <b>gagner des médailles</b> grâce au parrainage.",
    "<b>Parler à Keydou</b>, l'assistant qui te trouve un hôtel, un restaurant, un dépannage, un kit solaire… au Congo, à Abidjan, en France et au Canada.",
    "<b>Appeler ta famille et tes amis en vidéo</b> avec <b>le Salon</b> : un appel de groupe, sans installer autre chose (ouverture progressive).",
    "<b>Avoir ton assistant personnel</b> avec <b>Keydou Compagnon</b> : il retient tes rendez-vous et tes anniversaires, te rappelle au bon moment, répond à tes questions, lit tes photos et tes documents, crée des images, à la voix comme à l'écrit. Essai gratuit, puis quatre offres.",
    "<b>Passer en direct</b> avec <b>ÉCLAT</b> : tu filmes en direct, tes abonnés écrivent et réagissent en temps réel (ouverture progressive).",
    "<b>Offrir à tes enfants</b> les 10 dessins animés de PIOUPIOU et les premiers hymnes nationaux, dans un espace protégé.",
    "<b>Faire connaître</b> ta musique, ta boutique ou ton événement avec une annonce."])
S_ += [H2P('Qui peut utiliser KOMYO ?')]
S_ += tbl([['Âge', 'Espace', 'Ce qui est ouvert'],
           ['3 à 6 ans', 'PIOUPIOU', "Dessins animés éducatifs, <b>100 % séparés</b> du reste de KOMYO, avec un parent qui supervise."],
           ['13 à 17 ans', 'KOMYO Jeunes', "Accès limité et protégé : chaque vidéo est vérifiée avant d'être montrée."],
           ['18 ans et plus', 'KOMYO complet', "Fil, Talents, Business, Musique, Découverte, Myo, Parrainage, Keydou, Keydou Compagnon, ÉCLAT (le direct), Salon et annonces."]], [30, 38, CW / mm - 68])
S_ += box("Regarder, publier et partager, c'est <b>gratuit</b>. Tu ne paies que si tu veux aller plus loin : annonce, abonnement Business ou Famille, une offre Keydou Compagnon, un pack d'images, ou une demande à Keydou.", 'ok')
S_ += box("KOMYO a besoin d'une <b>connexion internet</b> (données mobiles ou Wi-Fi) : il ne fonctionne pas hors connexion.", 'warn')

# 2
S_ += [PageBreak(), Chapitre(2, 'Installer KOMYO', "KOMYO s'installe comme une vraie application, <b>sans passer par un magasin</b> (pas de Play Store ni d'App Store). C'est gratuit, léger, et il n'y a aucune mise à jour à faire. Rends-toi sur <b>komyo.starentreprise.com/starvibe/installer.html</b>."), Spacer(1, 4)]
gauche = [H2P('Sur Android (Chrome ou Samsung Internet)'),
          Step(1, "Ouvre la page d'installation", "Dans <b>Chrome</b>, ouvre le lien de KOMYO."),
          Step(2, "Touche « Installer maintenant »", "Puis <b>Installer</b> dans la petite fenêtre. Si rien ne s'affiche : menu <b>(trois points)</b> > <b>Installer l'application</b>."),
          Step(3, "Ouvre KOMYO depuis ton écran d'accueil", "L'icône KOMYO apparaît : un seul toucher, plein écran, comme WhatsApp."),
          H2P('Sur iPhone et iPad (Safari)'),
          Step(1, "Touche « Partager »", "Le carré avec une flèche vers le haut, en bas de Safari."),
          Step(2, "Choisis « Sur l'écran d'accueil »", "Puis touche <b>Ajouter</b>. Apple ne permet pas l'installation en un seul bouton : ces deux gestes suffisent.")]
S_ += a_cote(gauche, Phone(os.path.join(A, 'installer.png'), legende="La page d'installation"))
S_ += [H2P("Sur ordinateur")] + bl(["<b>Chrome ou Edge</b> (Windows, Mac, Linux) : « Installer maintenant », ou l'icône + à droite de la barre d'adresse.",
                                               "<b>Safari sur Mac</b> : menu Fichier > Ajouter au Dock.", "<b>Firefox</b> sur ordinateur n'installe pas les applications : utilise Chrome ou Edge."])
S_ += box("Tu as ouvert le lien depuis WhatsApp, Facebook ou TikTok ? Touche les <b>trois points</b>, puis <b>Ouvrir dans le navigateur</b>. Ensuite, suis les étapes de ton appareil.", 'warn')
S_ += box("Ça ne s'installe pas ? Ce n'est pas grave : KOMYO fonctionne très bien dans le navigateur. Garde la page dans tes favoris, ou essaie un autre navigateur.", 'tip')

# 3
S_ += [PageBreak(), Chapitre(3, 'Créer ton compte', "Il te faut seulement ton <b>numéro de téléphone</b> et un <b>code PIN</b> de 4 ou 5 chiffres, comme le code de ta carte bancaire. Cela prend moins d'une minute."), Spacer(1, 4)]
S_ += [Step(1, "Touche « Créer mon compte »", "Sur la page d'accueil de KOMYO, ou sur la page d'inscription."),
       Step(2, "Remplis le formulaire", "Numéro de téléphone, nom complet, date de naissance, ville."),
       Step(3, "Choisis pour qui est le compte", "<b>Moi-même</b>, ou <b>Mon enfant (3–6 ans)</b> pour créer un profil séparé pour ta famille."),
       Step(4, "Invente ton code PIN", "4 ou 5 chiffres que tu es seul(e) à connaître. Évite 1234 ou ta date de naissance."),
       Step(5, "Touche « Créer mon compte »", "Bravo : ton compte est créé. Pour te reconnecter ensuite, entre ton numéro et ton code PIN (session ouverte environ 30 jours).")]
S_ += box("Un ami t'a envoyé son <b>lien de parrainage</b> ? Ouvre ce lien pour t'inscrire : ton ami devient ton parrain (chapitre 9). Ton âge décide de ce que tu peux faire : 13–17 ans = accès protégé, 18 ans et plus = accès complet.", 'tip')
S_ += [H2P('Code PIN oublié ? Pas de panique')]
S_ += [Step(1, "Demande un code", "Sur la page de connexion, touche « Code PIN oublié ». Écris ton numéro et ton nom, puis « Demander un code »."),
       Step(2, "Attends le code par WhatsApp", "L'équipe KOMYO vérifie que c'est bien toi, puis t'envoie un <b>code temporaire à 6 chiffres</b> par WhatsApp (en général dans la journée)."),
       Step(3, "Choisis un nouveau PIN", "Entre le code reçu, puis ton nouveau PIN (4 ou 5 chiffres) deux fois, et touche « Enregistrer mon nouveau PIN ».")]
S_ += box("Ne donne <b>jamais</b> ton code PIN à personne : ni à un ami, ni à quelqu'un qui dit travailler pour KOMYO. L'équipe ne te le demandera jamais.", 'warn')

# 4
S_ += [PageBreak(), Chapitre(4, 'Ton espace personnel', "« Mon espace » est la page d'accueil de ton compte. Tout part de là, et le <b>menu (les trois petits traits, en haut)</b> te montre tout ce que tu peux faire."), Spacer(1, 4)]
S_ += tbl([['Ce que tu vois', 'À quoi ça sert'],
           ['Mes profils', "Ton profil personnel, et le profil « Mon enfant (3–6 ans) » si tu en as créé un."],
           ['Keydou', "Parler à l'assistant multiservices (hôtel, restaurant, dépannage, kit solaire…)."],
           ['Keydou Compagnon', "Ton assistant personnel : rappels, questions, photos, images, voix. Il est ouvert à tous, avec un essai gratuit (voir chapitres 11 à 15)."],
           ['ÉCLAT · le direct', "Regarder un direct, écrire et réagir, ou lancer le tien (voir chapitre 16). Sa carte apparaît dès qu'ÉCLAT est ouvert pour toi."],
           ['Le Salon', "Appel vidéo en groupe avec ta famille et tes amis (voir chapitre 17). Sa carte apparaît sur la page d'accueil dès que le Salon est ouvert pour toi."],
           ['Faire connaître ma musique ou mon activité', "Créer une annonce visible par tous les abonnés."],
           ['Myo · mes amis', "Inviter des personnes, accepter des invitations, voir tes amis."],
           ['Parrainage · médailles', "Ton lien d'invitation, tes amis connectés ce mois-ci, le classement et les médailles."],
           ['Me filmer et publier une vidéo', "Ouvrir la caméra, te filmer, publier."],
           ['Les espaces KOMYO', "Talents, Business, Musique, Découverte, PIOUPIOU."],
           ['Découvrir le fil', "Regarder les vidéos de la communauté."],
           ['Ma messagerie', "Tes reçus, tes messages de l'équipe KOMYO et tes notifications."],
           ['Mon abonnement et mes statistiques', "Voir ton pack, payer ou renouveler ; voir combien de personnes regardent tes vidéos."],
           ['Ma boutique et ma vitrine', "Vendre tes produits ou services ; montrer tes vidéos en carrousel doré, à partager."],
           ['Voir les prix', "Tous les tarifs en FCFA."]], [58, CW / mm - 58])
S_ += box("Tu peux relancer le <b>guide de démarrage</b> (des flèches qui te montrent chaque bouton) depuis le lien « Revoir le guide de démarrage » en bas de Mon espace.", 'tip')

# 5
S_ += [PageBreak(), Chapitre(5, 'Le fil de vidéos', "Le fil est le cœur de KOMYO : une vidéo après l'autre, en plein écran."), Spacer(1, 4)]
S_ += [H2P('Regarder')] + bl(["<b>Fais glisser vers le haut</b> pour voir la vidéo suivante, vers le bas pour revenir.",
                                         "Les boutons <b>flèche haut</b> et <b>flèche bas</b> font la même chose si tu préfères toucher.",
                                         "En haut, choisis ce que tu veux voir : <b>Tous · Talents · Business · Musique · Découverte · Jeunes</b>.",
                                         "La barre du bas : <b>Accueil · Publier · Fil</b>."])
S_ += [H2P('Aimer, commenter, partager')] + bl(["Touche le <b>« + »</b> sur une vidéo pour faire apparaître le <b>cœur</b> (j'aime) et la <b>bulle</b> (commentaires).",
                                                          "Dans les commentaires, tu peux répondre à quelqu'un : reste poli et respectueux.",
                                                          "Pour <b>partager</b> : touche Partager, puis choisis WhatsApp, Facebook, e-mail, ou copie le lien."])
S_ += [H2P('Publier ta vidéo')]
S_ += [Step(1, "Touche « Publier »", "Dans la barre du bas, ou « Me filmer et publier une vidéo » dans Mon espace."),
       Step(2, "Choisis ta vidéo", "<b>Me filmer maintenant</b> ouvre la caméra ; <b>Choisir dans ma galerie</b> prend une vidéo déjà prête."),
       Step(3, "Filme", "Touche <b>Filmer</b>, parle ou montre ton talent, puis arrête. Si tu es content(e), touche <b>Utiliser</b>."),
       Step(4, "Écris une légende", "Une phrase courte. Choisis l'espace qui convient à ta vidéo (voir chapitre 6)."),
       Step(5, "Touche « Publier »", "Ta vidéo apparaît dans le fil.")]
S_ += box("Pour une belle vidéo : tiens le téléphone <b>en vertical</b>, place-toi face à la lumière (pas devant une fenêtre), et parle près du téléphone pour qu'on t'entende bien.", 'tip')
S_ += box("Tu peux supprimer tes propres vidéos ; personne d'autre ne peut le faire à ta place. Une vidéo <b>pour enfants</b> est vérifiée avant publication.", 'ok')

# 6
S_ += [PageBreak(), Chapitre(6, 'Les espaces KOMYO', "KOMYO réunit plusieurs mondes sous une même marque. Choisis celui qui te ressemble."), Spacer(1, 4)]
S_ += tbl([['Espace', 'Pour qui', 'Ce que tu y trouves'],
           ['Talents', 'Créateurs', "Chant, danse, cuisine, métier, art… montre ce que tu sais faire au monde entier."],
           ['Business', '18 ans et plus', "Présente ton activité, ton produit, ta boutique. L'abonnement Business te met en avant."],
           ['Musique', 'Artistes et DJ', "Clips, sons et nouveautés. Tu peux aussi faire une annonce pour ta musique."],
           ['Découverte', 'Tout le monde', "Explore le monde et ses cultures à travers les vidéos de la communauté."],
           ['KOMYO Jeunes', '13–17 ans', "Découvrir, créer et partager entre ados, en sécurité : chaque vidéo est vérifiée."],
           ['PIOUPIOU', '3–6 ans', "Dessins animés éducatifs, séparés du reste de KOMYO (voir chapitre 7)."]], [32, 32, CW / mm - 64])
S_ += [H2P("Pour les parents")] + bl(["Le profil enfant (3–6 ans) est <b>séparé</b> : il n'a pas accès au reste de l'application.",
                                                  "Aucune vidéo pour enfants n'est montrée sans avoir été vérifiée par l'équipe.",
                                                  "Pas d'échange possible entre adultes et mineurs : c'est volontaire."])
S_ += box("KOMYO Jeunes est visible seulement par les 13–17 ans. Les adultes ne le voient pas.", 'ok')

# 7 PIOUPIOU
S_ += [PageBreak(), Chapitre(7, 'PIOUPIOU, les dessins animés des 3–6 ans', "PIOUPIOU est le poussin qui apprend les <b>bonnes habitudes</b> du quotidien : dire bonjour, se laver les mains, se brosser les dents, dire merci. Les <b>10 épisodes</b> du premier pack sont disponibles, ainsi que les premiers <b>hymnes nationaux</b>."), Spacer(1, 4)]
cells = []
tit = ['Bonjour papa, bonjour maman', 'Les dents du matin', 'Les mains propres avant de manger', 'Les mains propres après le repas', 'Merci !', "S'il te plaît", 'Au revoir', 'Les dents du soir', 'Bonne nuit papa, bonne nuit maman', 'Bravo, quelle belle journée !']
tw = (CW - 4 * 4 * mm) / 5
rows = []
for r in range(2):
    row = []
    for k in range(5):
        n = r * 5 + k + 1
        row.append([Image(os.path.join(A, 'a%d.jpg' % n), width=tw, height=tw * 16 / 9), Paragraph('<font name="Sora-Bold" color="#E8A93D">A%d</font><br/>%s' % (n, tit[n - 1]), ParagraphStyle('pc', parent=CELL, fontSize=7.6, leading=9.6))])
    rows.append(row)
g = Table(rows, colWidths=[tw + 4 * mm] * 5)
g.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 4 * mm), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]))
S_ += [g, Spacer(1, 4)]
hy_titre = H2P('Les hymnes nationaux (pack B)')
hy = [('b1', 'B1 · Hymne national du Congo-Brazzaville'), ('b7', 'B7 · Hymne national de la Guinée-Conakry'), ('b8', "B8 · Hymne national de la Côte d'Ivoire")]
hw = 26 * mm
hrow = [[Image(os.path.join(A, f + '.jpg'), width=hw, height=hw * 16 / 9), Paragraph(t, ParagraphStyle('hc', parent=CELL, fontSize=8, leading=10.5))] for f, t in hy]
ht = Table([[c[0] for c in hrow] + [Paragraph("<b>Trois hymnes sont déjà en ligne, et 12 autres arrivent bientôt.</b> Ils sont <b>inclus sans supplément</b> dans l'abonnement Famille (1 500 FCFA pour 30 jours).", CELL)],
            [c[1] for c in hrow] + ['']], colWidths=[hw + 4 * mm] * 3 + [CW - 3 * (hw + 4 * mm)])
ht.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 3 * mm), ('SPAN', (3, 0), (3, 1))]))
S_ += [KeepTogether([hy_titre, ht]), Spacer(1, 4)]
S_ += [H2P('Comment ça marche')] + bl([
    "Le parent crée le <b>profil « Mon enfant (3–6 ans) »</b> dans son compte (chapitre 3), puis ouvre <b>PIOUPIOU</b> dans le menu (les trois petits traits).",
    "Les dessins animés se regardent avec l'abonnement <b>Famille</b> : <b>1 500 FCFA pour 30 jours</b>, sans renouvellement automatique, profils enfants illimités.",
    "L'espace est <b>100 % séparé</b> : pas de commentaires, pas d'amis, pas de publicité pour adultes.",
    "Un parent peut aussi offrir l'abonnement Famille à un proche en le payant pour son compte."])
S_ += box("Les dessins animés sont des <b>personnages virtuels</b> créés par STAR ENTREPRISE. Les prochaines séries sont en préparation : nous prévenons les membres dès qu'elles sont ouvertes.", 'ok')

# 8 Myo
S_ += [PageBreak(), Chapitre(8, 'Myo : tes amis', "Myo est le moyen de retrouver tes amis sur KOMYO. <b>Suivre quelqu'un, c'est devenir amis.</b>"), Spacer(1, 4)]
S_ += [Step(1, "Ouvre Myo", "Depuis Mon espace, touche « Myo · mes amis »."),
       Step(2, "Invite quelqu'un", "Cherche une personne, ou invite-la depuis tes contacts, et envoie l'invitation."),
       Step(3, "Accepte une invitation", "Quand quelqu'un t'invite, une petite bulle apparaît en haut de l'écran : « Nom t'invite à te suivre et à devenir ami — Oui / Non »."),
       Step(4, "Retrouve tes amis", "Les onglets <b>Amis</b>, <b>Invitations</b> et <b>Contacts</b> te montrent tout.")]
S_ += [H2P("Kaba+ : tu décides ce que tu partages"), Paragraph("Un ami te demande ton <b>Gmail</b> ou ton <b>WhatsApp</b> ? Une fenêtre s'ouvre : tu choisis ce que tu partages, ou tu refuses. Rien n'est donné sans ton accord.", B)]
S_ += [H2P("Regarder ensemble"), Paragraph("Un ami Myo peut t'inviter à regarder une vidéo avec lui. Si tu réponds « Oui », la même vidéo s'ouvre chez toi ; si tu réponds « Non », il n'en est pas prévenu.", B)]
S_ += box("Myo n'existe pas dans l'espace PIOUPIOU des enfants. Un adulte ne peut pas inviter un mineur.", 'ok')

# 9 Parrainage
S_ += [PageBreak(), Chapitre(9, 'Parrainage et médailles', "Invite tes amis sur KOMYO avec ton <b>lien personnel</b> : chaque mois, les trois personnes qui ont fait connaître KOMYO au plus grand nombre d'amis gagnent une <b>médaille</b>."), Spacer(1, 4)]
gauche = [H2P('Comment participer'),
          Step(1, "Ouvre « Parrainage · médailles »", "Dans le menu de Mon espace (les trois petits traits, en haut)."),
          Step(2, "Envoie ton lien", "Touche <b>Envoyer par WhatsApp</b>, ou <b>Copier mon lien</b> pour le coller où tu veux."),
          Step(3, "Ton ami s'inscrit avec ton lien", "Il crée son compte en ouvrant ton lien : il est rattaché à toi. Il peut aussi écrire ton code à l'inscription."),
          Step(4, "Il compte quand il est connecté", "Un ami compte dès qu'il s'est <b>connecté sur au moins 2 jours différents</b>. Tu suis ta progression sur la page.")]
S_ += a_cote(gauche, Phone(os.path.join(A, 'parrainage.png'), legende='La page Parrainage'))
S_ += [H2P('Le classement du mois')]
med = Table([[Image(os.path.join(A, 'med_or.png'), 15 * mm, 15 * mm), Paragraph('<font name="Sora-Bold" size="10.5">1er : médaille d\'or</font><br/>30 jours de Pack « Les bonnes habitudes »', CELL),
              Image(os.path.join(A, 'med_argent.png'), 15 * mm, 15 * mm), Paragraph('<font name="Sora-Bold" size="10.5">2e : médaille d\'argent</font><br/>7 jours de Pack', CELL),
              Image(os.path.join(A, 'med_bronze.png'), 15 * mm, 15 * mm), Paragraph('<font name="Sora-Bold" size="10.5">3e : médaille de bronze</font><br/>3 jours de Pack', CELL)]],
            colWidths=[17 * mm, (CW - 51 * mm) / 3] * 3)
med.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 4)]))
S_ += [med, Spacer(1, 6)]
S_ += bl(["Pour être classé, il faut <b>au moins 50 amis connectés dans le mois</b>.", "Le classement <b>repart à zéro chaque mois</b>.",
          "Rien ne s'active tout seul : l'équipe KOMYO t'écrit dans ta <b>messagerie</b> pour te féliciter, puis te contacte pour te remettre ton avantage."])
S_ += box("Le parrainage est réservé aux personnes de 13 ans et plus. Ne crée jamais de faux comptes : seuls les amis réellement connectés comptent.", 'warn')

# 10 Keydou
S_ += [PageBreak(), Chapitre(10, 'Keydou, ton assistant multiservices', "Keydou connaît les bonnes adresses : <b>hôtel, restaurant, salle de sport, spa, voiture, dépannage, tourisme, kit solaire…</b> Il couvre le <b>Congo-Brazzaville</b> (Brazzaville, Pointe-Noire, Dolisie, Nkayi, Oyo, Ouesso), <b>Abidjan</b>, la <b>France</b> (Paris, Île-de-France, Lyon, Marseille) et le <b>Canada</b> (Montréal, Ottawa, Toronto, Québec). Tu n'as pas besoin de compte pour lui parler : juste ton nom, ton téléphone et ta ville."), Spacer(1, 4)]
S_ += [Step(1, "Ouvre Keydou", "Depuis Mon espace, ou sur la page d'accueil « Parler à Keydou »."),
       Step(2, "Parle-lui ou écris-lui", "<b>Monte le volume de ton téléphone</b>, appuie sur le micro et parle : Keydou t'écoute, puis te répond à voix haute. Exemple : « je cherche un hôtel à Pointe-Noire ». Tu peux aussi écrire."),
       Step(3, "Remplis ton inscription Keydou", "Nom et prénom, numéro de téléphone, ville. Coche ton besoin (jusqu'à 3)."),
       Step(4, "Paie la demande", "Une seule fois pour tes besoins cochés : 1 000 FCFA au Congo et à Abidjan, 1,52 € en France, 2,50 CAD au Canada. Voir le chapitre 19 pour payer."),
       Step(5, "Reçois ta réponse", "Une fois le paiement confirmé, Keydou te donne les adresses et les numéros.")]
S_ += [H2P('Ce que Keydou peut te trouver')]
S_ += tbl([['Besoin', 'Exemples'],
           ['Se loger et se restaurer', "Hôtels et résidences, restaurants, cafés, boulangeries et pâtisseries."],
           ['Se déplacer', "Location de véhicule, garages et dépannage, stations-service, agences de voyages."],
           ['Se faire plaisir', "Salons de coiffure et de beauté, spas, salles de sport, parcs et loisirs pour enfants, tourisme."],
           ['Organiser', "Salles de mariage et de réception, agences événementielles, bureaux et coworking."],
           ['Au quotidien', "Banques, supermarchés, achat et vente de voitures."],
           ['Énergie solaire', "Le kit solaire complet de STAR Énergie (voir l'encadré ci-dessous)."]], [48, CW / mm - 48])
S_ += box("Hors du Congo, la demande est acceptée tout de suite. L'équipe STAR ENTREPRISE t'envoie ensuite un <b>lien de paiement sécurisé par carte bancaire</b> (WhatsApp ou e-mail), puis Keydou répond. Ne donne jamais ton numéro de carte dans une discussion.", 'warn')
S_ += box("Keydou ne donne la réponse qu'<b>après réception de ton paiement</b>. Ses frais d'assistance sont distincts du prix de l'hôtel, du restaurant ou de toute autre prestation.", 'warn')
S_ += box("Les numéros viennent d'annuaires publics : <b>confirme-les par un appel</b> avant de te déplacer. En cas d'urgence : police 117, pompiers 118, violences et harcèlement 1444.", 'tip')

S_ += [H2P("L'offre STAR Énergie : le kit solaire complet")]
sol_txt = [Paragraph("<b>STAR Énergie</b> est la filiale énergie solaire de STAR ENTREPRISE. Son kit complet, avec batteries, alimente une grande maison.", B)] + bl([
    "<b>Ce qu'il alimente :</b> 2 chambres + salon + 3 salles de bains, 2 split, suppresseur, ampoules, grande télévision, 2 congélateurs.",
    "<b>Le matériel :</b> panneaux solaires, régulateur MPPT MYAMI, onduleur-chargeur EUROMET série SHARK, batteries gel Sunpal, coffret de protection.",
    "<b>Autonomie annoncée :</b> très grande, jusqu'à 18 h, donc jusqu'à demain matin ; puis le soleil reprend le relais de la charge.",
    "<b>Prix : 2 860 000 FCFA</b>, prix fixe de départ qui peut varier selon ton besoin.",
    "<b>Où :</b> à <b>Pointe-Noire</b> pour l'instant, bientôt à Brazzaville.",
    "<b>Plus d'infos :</b> demande à Keydou, il répond et prend ta demande."])
sol = Table([[sol_txt, Image(os.path.join(A, 'star-energie.jpg'), width=56 * mm, height=56 * mm * 2025 / 1620)]], colWidths=[CW - 60 * mm, 58 * mm])
sol.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (0, 0), 5 * mm)]))
S_ += [sol]

# 11 Keydou Compagnon
S_ += [PageBreak(), Chapitre(11, 'Keydou Compagnon, ton assistant personnel', "Keydou Compagnon est un assistant qui est <b>toujours avec toi</b>. Il retient ce que tu lui demandes (rendez-vous, anniversaires, habitudes), te rappelle au bon moment, répond à tes questions, <b>vérifie ses réponses et cite ses sources</b>. Tu lui parles à la voix ou par écrit. Il est <b>ouvert à tous les membres KOMYO</b> : tu peux l'essayer gratuitement dès maintenant."), Spacer(1, 4)]
S_ += [H2P('Ce qu\'il sait faire')] + bl([
    "<b>Retenir et te rappeler</b> : rendez-vous, anniversaires, habitudes. Il t'envoie une notification à l'heure choisie (chapitre 12).",
    "<b>Répondre à tes questions</b> dans 9 domaines : général, santé (avec prudence), droit, cuisine, mécanique, business, études, tests corrigés, et le mode Auto qui choisit pour toi.",
    "<b>Lire tes photos et tes documents PDF</b> et t'expliquer ce qu'ils contiennent.",
    "<b>Créer des images</b> à ta demande : affiches, paysages, personnages imaginaires (chapitre 13).",
    "<b>Te répondre à voix haute</b>, avec la vraie voix de Keydou selon ton offre.",
    "<b>Chercher sur internet</b> et te donner des informations à jour, avec leurs sources."])
gauche = [H2P('Pour commencer, en 5 gestes'),
          Step(1, "Touche la carte « Keydou Compagnon »", "Sur ta page d'accueil KOMYO, ou dans le menu : « Keydou Compagnon »."),
          Step(2, "Regarde l'animation d'ouverture", "La première fois, le logo KOMYO s'anime et une voix te souhaite la bienvenue. Monte le volume de ton téléphone."),
          Step(3, "Accepte les règles d'usage", "Un écran t'explique ce que Keydou retient de toi. Tu pourras tout télécharger ou tout effacer à tout moment (chapitre 19)."),
          Step(4, "Parle-lui ou écris-lui", "Touche le <b>micro</b> pour lui parler, ou écris dans la barre du bas, puis touche la flèche orange."),
          Step(5, "Installe son icône (si tu veux)", "Touche « Installer Keydou » : une icône apparaît sur ton écran d'accueil et s'ouvre directement sur ton assistant. C'est gratuit.")]
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-chat.jpg'), w=46 * mm, legende="Une discussion avec Keydou"))
S_ += [H2P("L'essai gratuit")]
S_ += a_cote([Paragraph("Sans rien payer, tu as <b>5 messages d'essai en tout</b> et <b>2 images offertes</b>, pour voir comment Keydou te répond. Ensuite, Keydou t'invite à choisir une offre : seuls les abonnés gardent les avantages.", B),
              Paragraph("Quand l'essai est fini, une carte « Voir les offres » apparaît. Tu paies par Mobile Money et <b>tout s'ouvre tout seul</b> dès que ton dépôt est reconnu (chapitres 15 et 19).", B)],
             Phone(os.path.join(A, 'k-essai-fini.jpg'), w=46 * mm, legende="L'essai est terminé : voir les offres"))
S_ += box("L'essai gratuit ne se renouvelle pas : les 5 messages sont comptés en tout, pas par jour.", 'ok')
S_ += box("<b>Les médicaments sont refusés :</b> Keydou ne retient aucun horaire de médicament et ne donne aucune ordonnance. Pour la santé, parle toujours à un professionnel de santé. En cas d'urgence, appelle les secours.", 'warn')

# 12 Compagnon au quotidien
S_ += [PageBreak(), Chapitre(12, 'Keydou Compagnon au quotidien', "Le menu, les domaines, les rappels, les photos et documents, la voix : tout ce que tu fais chaque jour avec ton assistant."), Spacer(1, 4)]
S_ += [H2P("Le menu et la barre du bas")]
gauche = bl(["Touche les <b>trois traits</b> en haut à gauche : le menu s'ouvre. Tu y trouves <b>Discuter, Rappels, Mes données, Connecteurs, Changer d'offre</b> et « Retour à KOMYO ».",
             "En bas à gauche de l'écran, le <b>« + »</b> sert à <b>joindre une photo ou un document</b>, ou à prendre une photo.",
             "À côté, le <b>domaine et ton offre</b> sont affichés, par exemple « Auto · Pro 200 » : le domaine de la question, ton offre, et ton nombre de messages par jour.",
             "À droite : le <b>micro</b> pour lui parler, et la <b>flèche orange</b> pour envoyer.",
             "Le <b>rond avec tes initiales</b>, en bas du menu, ouvre tes Paramètres (chapitre 19)."])
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-menu.jpg'), w=46 * mm, legende="Le menu de Keydou Compagnon"))
S_ += [H2P("Choisir un domaine")]
gauche = [Paragraph("Touche le domaine, en bas, pour dire à Keydou de quoi tu parles. En mode <b>Auto</b>, il choisit tout seul.", B)] + bl([
    "<b>Général</b> : culture, vie de tous les jours.", "<b>Santé</b> : explications prudentes, orientation vers le bon spécialiste, <b>jamais de prescription</b>.",
    "<b>Droit</b> : repères généraux, sans remplacer un avocat.", "<b>Cuisine</b> et <b>Mécanique</b> : recettes, pannes, entretien.",
    "<b>Business</b> : idées, démarches, argumentaires.", "<b>Études</b> : cours, résumés, explications pas à pas.",
    "<b>Tests</b> : Keydou te pose des questions, corrige et te donne une <b>note sur 10</b>."])
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-domaines.jpg'), w=46 * mm, legende="Les domaines de la question"))
S_ += [H2P("Joindre une photo ou un document")]
S_ += [Step(1, "Touche le « + »", "Choisis <b>prendre une photo</b>, <b>une image de ta galerie</b> ou <b>un fichier PDF</b>."),
       Step(2, "Écris ta question", "Par exemple : « Explique-moi cette facture » ou « Que dit ce document ? »."),
       Step(3, "Envoie", "Keydou lit le fichier et te répond. Le nombre de fichiers par jour dépend de ton offre : 5 en Essentiel, 30 en Complet, 50 en Premium, 80 en Prestige.")]
S_ += box("Ne partage pas de pièce d'identité, de carte bancaire ni de document que tu ne voudrais pas montrer : Keydou retient ce que tu lui envoies pour te répondre.", 'warn')
S_ += [H2P("Les rappels")]
gauche = [Step(1, "Demande-le simplement", "À la voix ou par écrit : « Rappelle-moi l'anniversaire de ma sœur le 3 mars »."),
          Step(2, "Ou remplis « Nouveau rappel »", "Dans le menu, ouvre <b>Rappels</b> : de quoi te rappeler, quand, s'il se répète (chaque jour, semaine, mois ou année) et combien de temps à l'avance te prévenir."),
          Step(3, "Active les notifications", "Touche <b>Activer les notifications</b> : Keydou te prévient au bon moment, même quand l'application est fermée. Sur iPhone, ajoute d'abord KOMYO à l'écran d'accueil.")]
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-rappels.jpg'), w=46 * mm, legende="Créer un rappel"))
S_ += [Paragraph("Le nombre de rappels actifs en même temps : 10 en Essentiel, 500 en Complet, 1 000 en Premium, 2 000 en Prestige. Les rappels de <b>médicaments</b> sont refusés, par sécurité.", B)]
S_ += [H2P("La voix de Keydou")]
S_ += bl(["Pour <b>lui parler</b> : touche le micro, parle, Keydou t'écoute puis te répond.",
          "Pour <b>l'entendre</b> : touche le petit haut-parleur sous une réponse. Avec <b>Complet, Premium et Prestige</b>, Keydou te lit ses réponses avec sa vraie voix : 6, 15 ou 30 lectures par jour. En Essentiel, c'est la voix de ton téléphone qui lit.",
          "Dans les réglages du domaine, <b>« Lire les réponses à voix haute »</b> lit chaque réponse automatiquement."])
S_ += [H2P("Mes données et mon quota")]
gauche = bl(["<b>Télécharger</b> : tu récupères, dans un fichier, tes rappels et ta conversation.", "<b>Tout effacer</b> : Keydou oublie tout, définitivement.",
             "<b>Ton quota de messages</b> se calcule sur <b>24 heures glissantes</b>. Si tu l'as utilisé, Keydou te dit dans combien de temps revenir."])
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-donnees.jpg'), w=46 * mm, legende="Mes données : télécharger ou effacer"))

# 13 Images
S_ += [PageBreak(), Chapitre(13, 'Créer des images avec Keydou', "Dis à Keydou ce que tu veux voir : <b>une affiche, un paysage, un personnage imaginaire, une illustration</b>. Il crée l'image directement dans la discussion, en quelques instants. Tu peux la garder ou lui demander de la modifier."), Spacer(1, 4)]
S_ += [H2P("Demander une image")]
S_ += [Step(1, "Écris ce que tu imagines", "Par exemple : « Crée-moi une affiche pour la fête des mères, fond doré, fleurs d'hibiscus »."),
       Step(2, "Attends quelques secondes", "L'image apparaît dans la conversation. Tu peux demander des changements : « Mets le fond en bleu »."),
       Step(3, "Garde ton image", "Touche l'image pour l'ouvrir en grand et l'enregistrer sur ton téléphone.")]
S_ += [H2P("Combien d'images ?")]
S_ += tbl([['Offre', 'Images par mois', 'Remise sur les packs'],
           ["Essai gratuit", "2 images en tout", "Pas de pack"], ["Essentiel", "10", "Aucune"], ["Complet", "35", "Aucune"],
           ["Premium", "70", "10 %"], ["Prestige", "120", "20 %"]], [50, 56, CW / mm - 106])
S_ += box("<b>Règles de sécurité, pour tous :</b> Keydou ne crée <b>pas d'image d'une personne réelle</b>, <b>pas d'image d'enfant</b>, et <b>aucun contenu sexuel ou violent</b>. Une image qui échoue n'est pas décomptée de ton quota.", 'warn')
S_ += [H2P("Ton quota du mois est fini ? Achète un pack")]
gauche = [Paragraph("Tu n'as pas besoin d'attendre le mois suivant : un <b>pack d'images</b> te permet de continuer tout de suite, avec <b>le même paiement par dépôt Mobile Money</b> que ton abonnement.", B)] + bl([
    "<b>Pack de 10 images : 1 200 FCFA</b>", "<b>Pack de 30 images : 3 000 FCFA</b>",
    "Avec <b>Premium</b>, <b>10 % de remise</b> (1 080 et 2 700 FCFA). Avec <b>Prestige</b>, <b>20 % de remise</b> (960 et 2 400 FCFA).",
    "Les images achetées <b>ne se périment pas</b> : elles s'ajoutent à ton quota du mois et se gardent d'un mois à l'autre.",
    "Il faut être abonné (Essentiel ou plus) pour acheter un pack."])
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-quota-images.jpg'), w=46 * mm, legende="Quota fini : Keydou propose un pack"))
gauche = [Step(1, "Touche « Acheter des images »", "Dans la discussion, ou dans le menu et « Changer d'offre »."),
          Step(2, "Choisis ton pack", "10 images ou 30 images : le prix de ton offre s'affiche."),
          Step(3, "Fais le dépôt du montant exact", "MTN Mobile Money ou Airtel Money, au numéro affiché. Un autre montant est refusé."),
          Step(4, "Tes images arrivent toutes seules", "Dès que le dépôt est reconnu, le solde « +10 » ou « +30 » s'ajoute et tu reçois un <b>reçu</b> dans ta messagerie.")]
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-packs.jpg'), w=46 * mm, legende="Les packs d'images"))

# 14 Paramètres
S_ += [PageBreak(), Chapitre(14, 'Paramètres, capacités et connecteurs', "Touche le <b>rond avec tes initiales</b>, en bas du menu : tu arrives dans tes <b>Paramètres</b>. Tu y vois ton offre, ton utilisation, ce que Keydou sait faire et les services auxquels il est relié."), Spacer(1, 4)]
gauche = [H2P("Les six rubriques")] + bl([
    "<b>Profil</b> : ton nom et ton numéro (en partie masqué).", "<b>Facturation</b> : ton offre, son prix et la date jusqu'à laquelle elle est valable ; le bouton pour la changer ou la reconduire.",
    "<b>Utilisation</b> : messages utilisés sur 24 h, images du mois, lectures de la voix du jour, fichiers lus.",
    "<b>Capacités</b> : la liste de ce que Keydou sait faire, avec « Actif » ou le détail de ce qu'il manque.",
    "<b>Connecteurs</b> : les services reliés à Keydou, avec leur état.", "<b>Autorisations</b> : notifications, micro et appareil photo."])
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-parametres.jpg'), w=46 * mm, legende="Les Paramètres"))
S_ += [KeepTogether([H2P("Utilisation et capacités")] + [Table([[Phone(os.path.join(A, 'k-utilisation.jpg'), w=42 * mm, legende="Ton utilisation"), Phone(os.path.join(A, 'k-capacites.jpg'), w=42 * mm, legende="Les capacités")]], colWidths=[(CW) / 2, (CW) / 2], style=TableStyle([('LEFTPADDING', (0, 0), (-1, -1), 0)]))])]
S_ += [H2P("Les connecteurs : vert, gris ou rouge")]
gauche = [Paragraph("Un connecteur est un service relié à Keydou : l'intelligence qui le fait réfléchir, la recherche web, les images, la voix… Son état est <b>toujours honnête</b>, jamais inventé :", B)] + bl([
    "<b>Connecté</b> (vert) : il marche en ce moment.", "<b>Pas connecté</b> (gris) : pas encore ouvert, ou il demandera ton autorisation personnelle plus tard.",
    "<b>Impossible de se connecter</b> (rouge) : un vrai problème est survenu. Keydou ne s'en sert pas et <b>réessaie tout seul au bout d'une heure</b>."])
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-connecteurs.jpg'), w=46 * mm, legende="Les connecteurs et leur état"))
S_ += tbl([['Aujourd\'hui connectés', 'Pas encore connectés (arrivent progressivement)'],
           ["Claude (le cerveau de Keydou) · Recherche web vérifiée · Images · Voix de Keydou · Rappels et notifications",
            "ChatGPT · Grok · Llama · Kling (vidéo) · Canva · Adobe · Gmail · Google Agenda · Google Drive · GitHub · WhatsApp Business"]], [78, CW / mm - 78])
S_ += box("Les services « personnels » (Gmail, Agenda, Drive, Canva…) <b>demanderont toujours ton autorisation</b>, séparément, avant d'être branchés. Rien n'est relié à ton insu.", 'ok')

# 15 Offres
S_ += [PageBreak(), Chapitre(15, 'Les quatre offres de Keydou Compagnon', "Quatre niveaux, pour que chacun trouve le sien. Plus tu montes, plus tu as de messages, d'images, de recherches, de voix et de mémoire. Chaque offre se paie <b>par mois</b>, par Mobile Money."), Spacer(1, 4)]
S_ += tbl([['', 'Essentiel', 'Complet', 'Premium', 'Prestige'],
           ['Prix par mois', '5 000 FCFA', '19 $ (environ 11 100 FCFA)', '35 $ (environ 20 400 FCFA)', '49 $ (environ 28 600 FCFA)'],
           ['Messages par jour', '65', '200', '350', '500'],
           ['Rappels actifs', '10', '500', '1 000', '2 000'],
           ['Recherches vérifiées par jour', '10', '30', '60', '100'],
           ['Photos et documents lus par jour', '5', '30', '50', '80'],
           ['Images créées par mois', '10', '35', '70', '120'],
           ['Voix de Keydou (lectures par jour)', 'Voix du téléphone', '6', '15', '30'],
           ['Mémoire : notes retenues', '80', '80', '150', '300'],
           ['Mémoire : derniers messages retenus', '12', '12', '20', '30'],
           ['Réflexion et réponses', 'Réponses courtes et claires', 'Réflexion plus poussée', 'Réflexion plus poussée, réponses plus longues', 'Réflexion approfondie, réponses les plus détaillées'],
           ['Remise sur les packs d\'images', 'Aucune', 'Aucune', '10 %', '20 %']], [44, 28, 31, 31, CW / mm - 134])
S_ += box("<b>Toutes les offres</b> gardent les mêmes règles de sécurité : pas de médicaments, pas d'ordonnance, pas d'image de personne réelle ni d'enfant. Plus l'offre est haute, plus Keydou a de place pour réfléchir et se souvenir.", 'ok')
S_ += [H2P("Choisir, changer ou reconduire")]
gauche = [Step(1, "Ouvre « Changer d'offre »", "Dans le menu de Keydou Compagnon, ou le bouton « Voir les offres » quand l'essai est fini."),
          Step(2, "Touche l'offre qui te convient", "Chaque carte montre ses avantages ; « Ton offre » marque celle que tu as déjà."),
          Step(3, "Paie par dépôt Mobile Money", "Le montant exact s'affiche (chapitre 19). Quand ton dépôt est reconnu, <b>ton offre s'ouvre toute seule</b>."),
          Step(4, "Profite", "Tu peux monter d'un niveau quand tu veux. La nouvelle période <b>s'ajoute à la fin de ton abonnement</b> : tu ne perds aucun jour.")]
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-offres.jpg'), w=46 * mm, legende="Choisir son offre"))
gauche = [Paragraph("<b>Premium</b> et <b>Prestige</b> ont leurs propres cartes, en bas de l'écran des offres, juste avant les packs d'images et l'icône à installer.", B),
          Paragraph("La veille de la fin de ton abonnement, Keydou te prévient : touche « Reconduire mon abonnement » pour continuer sans interruption.", B)]
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-offres-bas.jpg'), w=46 * mm, legende="Prestige, packs d'images"))
S_ += [H2P("Le paiement, pas à pas")]
gauche = [Step(1, "Note le montant exact", "Il s'affiche sur l'écran de paiement, avec la <b>référence</b> de ta demande (par exemple KOMYO-77)."),
          Step(2, "Envoie le dépôt", "Par <b>MTN Mobile Money</b> ou <b>Airtel Money</b>, au numéro affiché à l'écran. Tape ton code secret sur ton téléphone, jamais dans KOMYO."),
          Step(3, "Attends quelques instants", "Le message de confirmation de ton dépôt est reconnu automatiquement : l'écran passe à « accès ouvert » et tu continues de profiter de ton abonnement."),
          Step(4, "Si ça tarde", "L'équipe peut confirmer à la main. Garde ta référence et ton heure de dépôt.")]
S_ += a_cote(gauche, Phone(os.path.join(A, 'k-paiement.jpg'), w=46 * mm, legende="L'écran de paiement"))
S_ += box("<b>Ton paiement est protégé :</b> seul le montant <b>exact</b> d'une offre est reconnu ; un autre montant est refusé et rien n'est activé. Tu reçois un <b>reçu</b> dans ta messagerie KOMYO. <b>Ne donne jamais ton code secret Mobile Money ni un code reçu par SMS.</b>", 'warn')

# 16 ÉCLAT
S_ += [PageBreak(), Chapitre(16, 'ÉCLAT, le direct de KOMYO', "<b>ÉCLAT</b> te permet de <b>passer en direct</b> avec la caméra de ton téléphone, ou de <b>regarder le direct</b> d'un autre membre : <b>les gens écrivent et réagissent en temps réel</b>, et tout le monde voit les commentaires et les réactions. <b>Ouverture progressive</b> : la carte ÉCLAT apparaît dès que le direct est ouvert pour toi."), Spacer(1, 4)]
S_ += [H2P("Regarder un direct")]
gauche = [Step(1, "Ouvre ÉCLAT", "Depuis ta page d'accueil. La liste « En direct maintenant » montre les directs en cours."),
          Step(2, "Touche « Regarder »", "La vidéo s'ouvre ; en bas, la discussion en direct."),
          Step(3, "Écris un commentaire", "Dans « Ajouter un commentaire », puis <b>Envoyer</b>. Ton nom et ta photo apparaissent avec ton message."),
          Step(4, "Réagis", "Touche une réaction (pouce orange KOMYO, cœur, sourire, surprise, tristesse, flamme…). Elle <b>monte à l'écran avec ta photo</b>. Plusieurs cœurs d'affilée forment une rafale."),
          Step(5, "Cache la discussion", "Touche la <b>flèche vers le bas</b> à côté de « Discussion en direct » pour voir toute la vidéo. Le <b>petit triangle blanc</b>, à droite, la fait réapparaître.")]
S_ += a_cote(gauche, Phone(os.path.join(A, 'e-regarder.jpg'), w=46 * mm, legende="Regarder, écrire et réagir"))
S_ += [KeepTogether([Table([[Phone(os.path.join(A, 'e-accueil.jpg'), w=38 * mm, legende="L'accueil ÉCLAT"), Phone(os.path.join(A, 'e-rafale.jpg'), w=38 * mm, legende="Une rafale de réactions"), Phone(os.path.join(A, 'e-cache.jpg'), w=38 * mm, legende="Discussion cachée")]], colWidths=[CW / 3] * 3, style=TableStyle([('LEFTPADDING', (0, 0), (-1, -1), 0)]))])]
S_ += bl(["Tu peux passer la vidéo en <b>plein écran</b> (le bouton en bas à droite de la vidéo). Les vidéos <b>en largeur</b> s'affichent en grand, comme sur un grand réseau.",
          "Tu arrives en retard ? Tu vois <b>les derniers commentaires</b> déjà écrits.",
          "Les spectateurs ne publient pas de vidéo : ils regardent, écrivent et réagissent."])
S_ += [H2P("Passer en direct")]
gauche = [Step(1, "Touche « Passer en direct »", "Sur l'accueil d'ÉCLAT."),
          Step(2, "Donne un titre", "60 caractères au maximum. Exemple : « Cuisine du dimanche »."),
          Step(3, "Touche « Démarrer le direct »", "Autorise la caméra et le micro quand le téléphone te le demande."),
          Step(4, "Anime ton direct", "Tu as des boutons pour le <b>micro</b>, la <b>caméra</b>, <b>retourner la caméra</b>, <b>partager le lien</b>. Pour finir : <b>Terminer</b>.")]
S_ += a_cote(gauche, Phone(os.path.join(A, 'e-animateur.jpg'), w=46 * mm, legende="Les commandes de l'animateur"))
S_ += [H2P("Prévenir tes abonnés")]
S_ += [Paragraph("Quand tu démarres un direct, <b>tes abonnés sont prévenus par une notification</b> sur leur téléphone (jusqu'à 200 personnes). De ton côté, le bouton <b>« Me prévenir quand mes abonnements passent en direct »</b> t'avertit quand ceux que tu suis lancent un direct.", B)]
S_ += tbl([['Règle', 'Valeur'],
           ['Spectateurs en même temps', "100 au maximum, en plus de l'animateur"], ['Durée d\'un direct', "60 minutes, puis il s'arrête de lui-même"],
           ['Directs par jour et par animateur', "3"], ['Connexion perdue', "Si l'animateur disparaît plus de 90 secondes, le direct n'est plus proposé"],
           ['Prix', "Gratuit"], ['Rediffusion', "Pas encore disponible"]], [70, CW / mm - 70])
S_ += box("Un direct est <b>public pour les spectateurs</b> : ne montre pas de choses privées ni de personnes qui n'ont pas donné leur accord, surtout des enfants. Les règles de respect de KOMYO s'appliquent aussi aux commentaires (chapitre 21).", 'warn')

# 12 Le Salon
S_ += [PageBreak(), Chapitre(17, 'Le Salon, ton appel vidéo en groupe', "Le Salon est un <b>appel vidéo à plusieurs</b> pour parler avec ta famille et tes amis, <b>dans le même écran</b>, directement dans KOMYO : rien d'autre à installer. Tu ouvres un salon, tu envoies le lien, et chacun entre d'un geste. <b>Ouverture progressive :</b> la carte « Le Salon » apparaît sur ta page d'accueil dès qu'il est ouvert pour toi."), Spacer(1, 4)]
etapes = [Step(1, "Ouvre la carte « Le Salon »", "Sur ta page d'accueil, touche <b>« Ouvrir un salon »</b>."),
          Step(2, "Crée ton salon", "Donne-lui un nom, choisis <b>Famille</b> (parents et enfants) ou <b>Amis</b>, puis touche <b>« Ouvrir le salon »</b>."),
          Step(3, "Envoie le lien", "Touche <b>« Envoyer par WhatsApp »</b> et choisis une personne, ou <b>« Copier le lien »</b>. Envoie-le <b>un par un</b>, avec un petit mot."),
          Step(4, "Entre et parle", "Touche <b>« Entrer dans le salon »</b> et autorise le micro et la caméra. Ton micro est allumé, ta <b>caméra démarre éteinte</b> pour économiser tes données : allume-la quand tu veux."),
          Step(5, "Tes proches te rejoignent", "Chacun ouvre le lien. S'il n'a pas de compte KOMYO, il en crée un gratuitement, puis <b>arrive directement dans le salon</b>.")]
S_ += a_cote(etapes, Phone(os.path.join(A, 'salon_lobby.png'), w=46 * mm, legende='Ton salon est ouvert : envoie le lien'))
pendant = bl(["<b>Micro et caméra :</b> coupe-les et remets-les quand tu veux. Si tu coupes ta caméra, les autres voient ton <b>initiale</b>. Le petit micro barré montre qui est en sourdine.",
              "<b>+ Inviter :</b> envoie le lien à une autre personne sans quitter l'appel.",
              "<b>Flèche de retour (ou retour du téléphone) :</b> une fenêtre te propose de quitter ou de rester. Tu peux <b>quitter sans fermer</b> le salon et y <b>revenir</b> avec le bouton « Revenir dans le salon ».",
              "<b>Celui qui a ouvert le salon</b> peut couper le micro d'une personne, la retirer (menu « … » sur sa tuile) ou <b>terminer le salon pour tous</b>.",
              "Si ta connexion se coupe, le Salon <b>se reconnecte tout seul</b>. Une alerte te prévient quand il reste <b>2 minutes</b>."])
S_ += [KeepTogether([H2P('Pendant l\'appel')] + a_cote(pendant, Phone(os.path.join(A, 'salon_appel.png'), w=46 * mm, legende='Toute la famille dans le même écran')))]
S_ += [H2P('Combien de temps, et pour qui ?')]
S_ += tbl([['', 'Gratuit', 'Abonnement Famille'],
           ['Ouvrir et rejoindre un salon', 'Oui', 'Oui'],
           ['Durée d\'un salon', '20 minutes', '60 minutes'],
           ['Salons que tu peux ouvrir', "2 par semaine", "Autant que tu veux, dans la limite de 1 500 minutes de présence par mois (somme des minutes de chaque participant)"],
           ['Réunir beaucoup de monde', "Avec l'abonnement Famille : un message t'explique au moment voulu", "Oui, jusqu'à la limite du salon"],
           ['Prix', 'Gratuit', '1 500 FCFA pour 30 jours (chapitre 19)']], [46, 52, CW / mm - 98])
S_ += box("<b>Pour entrer dans un salon, un simple compte KOMYO gratuit suffit.</b> Seul celui qui <b>ouvre</b> le salon est limité par son offre. Ne partage le lien qu'avec des personnes que tu connais : <b>jamais en public</b>.", 'ok')
S_ += box("Le Salon utilise des données mobiles pendant l'appel. Garde la caméra éteinte si ta connexion est faible : tu peux toujours parler et écouter.", 'tip')

# 12 Annonces
S_ += [PageBreak(), Chapitre(18, 'Faire connaître ton activité', "Une <b>annonce</b> défile en bas de l'écran de tous les abonnés connectés, quelques secondes à chaque passage. Idéal pour une musique, un événement ou une boutique."), Spacer(1, 4)]
S_ += [Step(1, "Ouvre la page d'annonce", "Mon espace > « Faire connaître ma musique ou mon activité »."),
       Step(2, "Écris ton message", "100 caractères au maximum. Exemple : « DJ Kaled — nouvel album disponible dans l'espace Musique »."),
       Step(3, "Choisis le type", "Musique · Événement · Boutique / activité · Autre."),
       Step(4, "Choisis où envoyer les gens", "Quand on touche l'annonce : nulle part, l'espace Musique, Business ou Talents de KOMYO, ou ton propre lien."),
       Step(5, "Choisis la durée et paie", "1 semaine (essai) 2 000 FCFA · 2 semaines 4 000 FCFA · 1 mois 10 000 FCFA.")]
S_ += box("Ton annonce n'est affichée qu'<b>après paiement confirmé et relecture</b> par l'équipe STAR ENTREPRISE. Elle est réservée aux personnes de <b>18 ans et plus</b>. Tu retrouves tes annonces dans « Mes annonces ».", 'ok')
S_ += box("Messages interdits : arnaques, haine, contenu pour adultes, fausses promesses.", 'warn')
S_ += [H2P('Ouvrir ta boutique (abonnement Business)')]
S_ += [Step(1, "Crée ton compte KOMYO", "C'est gratuit."), Step(2, "Active l'abonnement Business", "5 000 FCFA par mois, payé en Mobile Money, sur la page « Mon abonnement »."),
       Step(3, "Ouvre « Ouvrir ma boutique »", "Nom, ville, numéro Mobile Money, ce que tu vends. Tes clients te paient directement ; reçus et messages arrivent dans leur messagerie KOMYO.")]

# 12 Tarifs
S_ += [PageBreak(), Chapitre(19, 'Tarifs et paiement', "Regarder, publier et partager, c'est gratuit. Voici ce qui est payant."), Spacer(1, 4)]
gauche = tbl([['Offre', 'Prix', 'Ce que tu obtiens'],
              ['Découverte', '0 FCFA', "Compte, fil, publier, aimer, commenter, partager, Myo, Parrainage, KOMYO Jeunes."],
              ['Annonce', "2 000 FCFA (1 sem.)<br/>4 000 FCFA (2 sem.)<br/>10 000 FCFA (1 mois)", "Ton message visible par tous les abonnés."],
              ['Business', '5 000 FCFA / mois', "Mise en avant de tes vidéos, statistiques, boutique."],
              ['Famille', '1 500 FCFA / 30 jours', "10 dessins animés PIOUPIOU, hymnes nationaux, profils enfants illimités, grands salons."],
              ['Keydou', "1 000 FCFA / demande", "Jusqu'à 3 besoins cochés. Ailleurs : 1,52 € (France), 2,50 CAD (Canada)."],
              ['Le Salon', "Gratuit ou Famille", "Appels en groupe ; grands salons avec Famille. Chapitre 17."],
              ['ÉCLAT', "Gratuit", "Le direct de KOMYO : regarder, écrire, réagir, passer en direct. Chapitre 16."],
              ['Keydou Compagnon', "Essai gratuit, puis<br/>Essentiel 5 000 FCFA<br/>Complet 19 $<br/>Premium 35 $<br/>Prestige 49 $<br/>par mois", "Assistant personnel : 5 messages et 2 images d'essai, puis l'offre de ton choix (chapitres 11 à 15). 19 $ = environ 11 100 FCFA, 35 $ = environ 20 400 FCFA, 49 $ = environ 28 600 FCFA."],
              ['Packs d\'images Compagnon', "10 images : 1 200 FCFA<br/>30 images : 3 000 FCFA", "Pour continuer à créer des images quand ton quota du mois est fini. Remise de 10 % avec Premium et de 20 % avec Prestige (chapitre 13)."]], [32, 52, CW / mm - 84])
S_ += gauche
S_ += [H2P('Comment payer (Mobile Money)')]
S_ += [Step(1, "Prépare le montant exact", "Le montant doit être <b>exactement</b> celui de l'offre choisie. Un autre montant est refusé et rien n'est activé."),
       Step(2, "Envoie le dépôt", "Par <b>MTN Mobile Money</b> ou <b>Airtel Money</b>, au numéro affiché sur l'écran de paiement (<b>+242 06 656 50 50</b>). Les prix sont en FCFA ; ailleurs, l'équivalent est indicatif."),
       Step(3, "Ton paiement est reconnu automatiquement", "Quelques instants après le dépôt, le message de confirmation est reconnu : le statut passe de « en attente » à « payé », <b>ton offre s'ouvre toute seule</b> et tu reçois un <b>reçu</b> dans ta messagerie. Tu continues alors de profiter de ton abonnement."),
       Step(4, "Si ça tarde", "L'équipe STAR ENTREPRISE peut confirmer à la main, en général dans la journée. Donne ta référence (par exemple KOMYO-77) et l'heure de ton dépôt.")]
S_ += box("<b>Ne donne jamais ton code secret Mobile Money</b> (PIN) ni un code reçu par SMS : ni à nous, ni à quelqu'un d'autre. Nous ne te les demanderons jamais.", 'warn')

# 13 Statistiques
S_ += [PageBreak(), Chapitre(20, 'Tes statistiques', "Pour savoir si tes vidéos plaisent, ouvre <b>Mes statistiques</b> depuis Mon espace."), Spacer(1, 4)]
S_ += bl(["<b>Vues</b> : combien de personnes ont regardé chaque vidéo.", "<b>Durée réellement regardée</b> : les gens regardent-ils jusqu'au bout ?", "<b>J'aime et commentaires</b> : l'engagement, vidéo par vidéo."])
S_ += box("Pour avoir plus de vues : publie <b>régulièrement</b>, rends les 3 premières secondes très accrocheuses, choisis le bon espace, invite tes amis à te suivre et partage tes vidéos sur WhatsApp.", 'tip')

# 14 Sécurité
S_ += [Chapitre(21, 'Sécurité et bonnes règles', "KOMYO veut rester un endroit agréable pour tout le monde."), Spacer(1, 4)]
S_ += [H2P('Protège ton compte')] + bl(["Ton code PIN est secret. Il est enregistré <b>chiffré</b>, jamais en clair.", "Après plusieurs essais ratés, le compte est <b>verrouillé temporairement</b>.",
                                                  "Sur un téléphone partagé, déconnecte-toi après usage.", "Méfie-toi des faux messages qui disent « KOMYO a besoin de ton PIN » : c'est une arnaque."])
S_ += [H2P('Respecte les autres')] + bl(["Pas d'insultes, de haine, de harcèlement, ni de contenu pour adultes.", "Pas d'arnaques ni de fausses promesses.", "Ne filme pas quelqu'un sans son accord, surtout un enfant.",
                                                   "Les vidéos qui ne respectent pas les règles peuvent être retirées par la modération."])
S_ += [H2P('Sécurité de Keydou Compagnon')] + bl(["Tes messages et tes rappels t'appartiennent : tu peux les <b>télécharger</b> ou les <b>effacer</b> à tout moment (chapitre 12).",
                                                "Aucun <b>médicament</b> n'est retenu ni conseillé ; la santé reste un sujet de prudence et d'orientation.",
                                                "Les <b>images</b> ne montrent ni personne réelle, ni enfant, ni contenu sexuel ou violent.",
                                                "Les services « personnels » (Gmail, Agenda…) demandent toujours <b>ton autorisation</b> avant d'être branchés (chapitre 14).",
                                                "Les <b>paiements</b> ne sont reconnus qu'au <b>montant exact</b> ; ton code secret Mobile Money ne sert qu'à ton téléphone."])
S_ += box("Keydou Compagnon, ÉCLAT (le direct), les hymnes nationaux, Keydou dans plusieurs pays et le Salon (ouverture progressive) sont <b>déjà là</b>. D'autres nouveautés — la rediffusion des directs, le vœu d'anniversaire de Keydou, de nouveaux connecteurs — arrivent plus tard : elles apparaîtront automatiquement dans l'application, sans rien installer.", 'ok')

# 15 Problèmes
S_ += [PageBreak(), Chapitre(22, 'Problèmes fréquents', "Avant de nous écrire, essaie ceci."), Spacer(1, 4)]
S_ += tbl([['Problème', 'Solution'],
           ["Je n'arrive pas à installer l'application", "Utilise Chrome (Android) ou Safari (iPhone). Depuis WhatsApp ou Facebook : « Ouvrir dans le navigateur ». Sinon garde la page en favori : ça marche aussi."],
           ["Code PIN oublié ou compte bloqué", "Trop d'essais ratés : attends un peu. Puis page de connexion > « Code PIN oublié » > code reçu par WhatsApp > nouveau PIN."],
           ["Les vidéos sont lentes", "Vérifie ta connexion (Wi-Fi ou données), ferme les autres applications, puis rouvre KOMYO."],
           ["La caméra ou le micro ne marchent pas", "Autorise la caméra et le micro dans ton navigateur, puis rouvre la page. Dans le Salon, la caméra démarre éteinte : touche « Caméra »."],
           ["Keydou Compagnon dit « Passe à l'offre » ou « essai terminé »", "Tes 5 messages d'essai sont utilisés. Touche « Voir les offres », choisis Essentiel, Complet, Premium ou Prestige et fais ton dépôt : l'accès s'ouvre tout seul."],
           ["Keydou Compagnon : « reviens dans … »", "Tes messages du jour sont utilisés (65 en Essentiel, 200 en Complet, 350 en Premium, 500 en Prestige). Reviens après le délai indiqué : le compte se fait sur 24 heures glissantes."],
           ["Mon quota d'images est fini", "Achète un pack d'images (10 images 1 200 FCFA, 30 images 3 000 FCFA) ou attends le mois suivant (chapitre 13)."],
           ["Un connecteur est « Pas connecté » ou « Impossible de se connecter »", "« Pas connecté » : il n'est pas encore ouvert, ce n'est pas une panne. « Impossible de se connecter » : Keydou ne s'en sert pas et réessaie tout seul au bout d'une heure (chapitre 14)."],
           ["Je n'entends pas la voix de Keydou", "Monte le volume. La vraie voix de Keydou est incluse dans Complet, Premium et Prestige ; en Essentiel, c'est la voix de ton téléphone qui lit."],
           ["Mon direct ÉCLAT ne démarre pas", "Autorise la caméra et le micro, vérifie ta connexion, puis recommence. Un animateur peut faire 3 directs par jour, de 60 minutes au plus."],
           ["Je ne vois pas la carte « Le Salon »", "Elle apparaît quand le Salon est ouvert pour toi : rouvre l'application. Un lien reçu d'un proche marche déjà avec un compte KOMYO."],
           ["Le Salon dit « terminé » ou ma connexion s'est coupée", "Un salon dure 20 min (gratuit) ou 60 min (Famille) : demande un nouveau lien. Connexion coupée : « Revenir dans le salon »."],
           ["Keydou ne m'entend pas", "Monte le volume, appuie sur le micro avant de parler. Tu peux aussi écrire ta demande."],
           ["J'ai payé mais rien ne s'est activé", "Le montant doit être <b>exact</b>. Attends quelques instants : ton dépôt est reconnu automatiquement. Si rien ne change, l'équipe confirme à la main, en général dans la journée : écris-nous avec ta référence (par exemple KOMYO-77), ton numéro et l'heure du dépôt."],
           ["Mon ami n'apparaît pas dans mon parrainage", "Il doit s'être inscrit avec ton lien et s'être connecté sur 2 jours différents. Les amis déjà inscrits avant l'ouverture du parrainage ne comptent pas."],
           ["Ma vidéo n'apparaît pas", "Une vidéo pour enfants est vérifiée avant publication. Pour les autres, vérifie ta connexion et réessaie."]], [54, CW / mm - 54])
S_ += [KeepTogether([H2P("Nous contacter"), Paragraph("E-mail : <b>contact@starentreprise.com</b> — formulaire de contact sur la page d'accueil de KOMYO — WhatsApp : <b>+242 06 656 50 50</b>.", B)])]
S_ += box("Garde ce guide dans ton téléphone ou imprime-le. Partage-le avec ta famille et tes amis : plus il y a de monde sur KOMYO, plus tes vidéos sont vues.", 'tip')
# 23 Nouveautés
S_ += [PageBreak(), Chapitre(23, 'Ce qui est nouveau', "Voici, de façon simple, tout ce qui a été ajouté <b>depuis l'édition précédente de ce guide</b> (mise à jour du 11 novembre 2026), jusqu'au 15 novembre 2026."), Spacer(1, 4)]
S_ += tbl([['Nouveauté', 'Ce que ça change pour toi', 'Chapitre'],
           ['Keydou Compagnon ouvert à tous', "Tout membre KOMYO peut l'essayer : 5 messages et 2 images offerts, puis une offre au choix. Plus besoin d'attendre une invitation.", '11'],
           ['Nouvelle présentation sombre', "Écran de discussion plus lisible, menu à trois traits, rond avec tes initiales, choix du domaine, micro et envoi en bas de l'écran.", '12'],
           ['Animation d\'ouverture', "À la première ouverture, le logo KOMYO s'anime et une voix te souhaite la bienvenue.", '11'],
           ['Paramètres', "Profil, facturation, utilisation, capacités, connecteurs et autorisations réunis au même endroit.", '14'],
           ['Connecteurs avec leur état réel', "Vert « Connecté », gris « Pas connecté », rouge « Impossible de se connecter » : jamais d'état inventé.", '14'],
           ['Création d\'images', "Un quota par offre (2, 10, 35, 70 ou 120 images) et des règles de sécurité strictes.", '13'],
           ['Packs d\'images', "10 images pour 1 200 FCFA, 30 images pour 3 000 FCFA, payés par dépôt Mobile Money, avec remise Premium et Prestige.", '13'],
           ['Offres Premium et Prestige', "Deux nouveaux niveaux à 35 $ et 49 $ par mois : plus de messages, d'images, de recherches, de voix et de mémoire.", '15'],
           ['Paiement reconnu automatiquement', "MTN Mobile Money et Airtel Money : ton dépôt est reconnu, ton offre s'ouvre et tu reçois un reçu.", '15 et 19'],
           ['ÉCLAT, le direct de KOMYO', "Regarder ou lancer un direct, commentaires et réactions en temps réel avec ta photo, abonnés prévenus, écran large.", '16'],
           ['Le Salon', "Appel vidéo en groupe avec ta famille et tes amis, avec reconnexion automatique.", '17']], [46, CW / mm - 70, 24])
S_ += box("Cette liste sera complétée à chaque mise à jour du guide. Prochainement : la rediffusion des directs ÉCLAT et de nouveaux connecteurs, qui demanderont toujours ton autorisation.", 'tip')

# Dernière page : remerciement + signature en bas à droite
S_ += [NextPageTemplate('sign'), PageBreak(), Spacer(1, 30 * mm), Paragraph('MERCI', KICK),
       Paragraph("Bienvenue dans la famille KOMYO", ParagraphStyle('h1b', fontName='Sora-Bold', fontSize=24, leading=28, textColor=INK, spaceAfter=10)),
       Paragraph("Apprendre, créer, partager : KOMYO grandit avec toi, et ce guide est mis à jour à chaque nouveauté. Garde-le dans ton téléphone, partage-le avec ta famille et tes amis.", BIG),
       Spacer(1, 4), Paragraph("Une question ? <b>contact@starentreprise.com</b> · WhatsApp <b>+242 06 656 50 50</b> · <b>komyo.starentreprise.com</b>", B)]

doc = Doc(OUT, pagesize=A4, title="KOMYO — Guide d'utilisation", author='STAR ENTREPRISE', subject="Guide d'utilisation de l'application KOMYO, édition de novembre 2026, mise à jour du 15 novembre")
fr = Frame(22 * mm, 20 * mm, W - 44 * mm, H - 40 * mm, id='f', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id='cover', frames=[Frame(0, 0, 1, 1)], onPage=cover), PageTemplate(id='inner', frames=[fr], onPage=inner), PageTemplate(id='sign', frames=[fr], onPage=signature)])
story = [NextPageTemplate('inner')] + S_


# le sommaire : « N  Titre ........ page »
class TocLine(Paragraph): pass


def _fmt(s):
    n, t = s.split('|', 1); return '<font name="Sora-Bold" color="#E8A93D">%s</font>&nbsp;&nbsp;&nbsp;%s' % (n.rjust(2), t)


_orig = toc.notify
def _notify(kind, stuff):
    if kind == 'TOCEntry':
        lvl, text, pg, key = stuff; toc.addEntry(lvl, _fmt(text), pg, key)
toc.notify = _notify
doc.multiBuild(story, canvasmaker=NumCanvas)
print('ok', OUT)
