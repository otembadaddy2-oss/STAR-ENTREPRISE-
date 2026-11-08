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
for name, f in [('Sora', 'sora-600.ttf'), ('Sora-Bold', 'sora-800.ttf'), ('Inter', 'inter-400.ttf'), ('Inter-Semi', 'inter-600.ttf'), ('Inter-Bold', 'inter-700.ttf')]:
    pdfmetrics.registerFont(TTFont(name, os.path.join(A, f)))
pdfmetrics.registerFontFamily('Inter', normal='Inter', bold='Inter-Bold', italic='Inter', boldItalic='Inter-Bold')
pdfmetrics.registerFontFamily('Sora', normal='Sora', bold='Sora-Bold', italic='Sora', boldItalic='Sora-Bold')

INK = colors.HexColor('#241536'); GOLD = colors.HexColor('#E8A93D'); CORAL = colors.HexColor('#FF6B4A'); DEEP = colors.HexColor('#0b0710')
LINE = colors.HexColor('#eee2cc'); DIM = colors.HexColor('#6b5f80'); CREAM = colors.HexColor('#FFFBF3'); OK = colors.HexColor('#1f8f4a')
W, H = A4
CW = W - 44 * mm   # largeur utile

KICK = ParagraphStyle('k', fontName='Inter-Bold', fontSize=8.5, leading=11, textColor=CORAL, spaceAfter=2)
H2 = ParagraphStyle('h2', fontName='Sora-Bold', fontSize=12.5, leading=16, textColor=INK, spaceBefore=12, spaceAfter=5)
B = ParagraphStyle('b', fontName='Inter', fontSize=10.2, leading=15.2, textColor=INK, spaceAfter=4.5)
BIG = ParagraphStyle('big', parent=B, fontSize=11.4, leading=17, textColor=colors.HexColor('#3a2c52'))
S = ParagraphStyle('s', fontName='Inter', fontSize=8.4, leading=11.5, textColor=DIM)
BL = ParagraphStyle('bl', parent=B, leftIndent=14, bulletIndent=3, spaceAfter=3)
CELL = ParagraphStyle('c', parent=B, fontSize=9, leading=12.6, spaceAfter=0)


class Chapitre(Flowable):
    """Titre de chapitre : grand numéro doré, filet, titre en Sora. Alimente le sommaire."""
    def __init__(self, n, titre, intro=None):
        super().__init__(); self.n = n; self.titre = titre
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
        super().__init__(); self.path = path; self.w = w; self.leg = legende
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
    t = Table([[gauche, phone]], colWidths=[CW - 62 * mm, 62 * mm])
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
    c.setFillColor(GOLD); c.rect(W / 2 - 18 * mm, 118 * mm, 36 * mm, 1.3, stroke=0, fill=1)
    c.setFillColor(colors.white); c.setFont('Sora-Bold', 30); c.drawCentredString(W / 2, 100 * mm, "Guide d'utilisation")
    c.setFont('Inter', 12); c.setFillColor(colors.HexColor('#e7ddc9'))
    for i, l in enumerate(["De l'installation à ta première vidéo, aux médailles du parrainage :", "tout ce qu'il faut savoir, pas à pas, même si c'est ta première application."]):
        c.drawCentredString(W / 2, 88 * mm - i * 6.3 * mm, l)
    c.setFillColor(GOLD); c.setFont('Sora-Bold', 11); c.drawCentredString(W / 2, 40 * mm, 'komyo.starentreprise.com')
    c.setFillColor(colors.HexColor('#b9ad98')); c.setFont('Inter', 9)
    c.drawCentredString(W / 2, 32 * mm, 'Gratuit · téléphone, tablette et ordinateur · en français · édition de novembre 2026')
    c.drawCentredString(W / 2, 25.5 * mm, 'Conçu et créé par STAR ENTREPRISE')
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
toc.levelStyles = [ParagraphStyle('t0', fontName='Inter', fontSize=11, leading=22, textColor=INK, leftIndent=0)]
toc.dotsMinLevel = 0
toc.rightColumnWidth = 14 * mm

# ------------------------------------------------------------------ sommaire
S_ += [PageBreak(), Paragraph('SOMMAIRE', KICK), Paragraph('Ce que contient ce guide', ParagraphStyle('h1', fontName='Sora-Bold', fontSize=24, leading=28, textColor=INK, spaceAfter=10)), toc,
       Spacer(1, 8)]
S_ += box("Chaque chapitre tient en une ou deux pages et peut se lire seul. Les numéros de page sont indiqués en bas à droite : « Page X sur N ».", 'tip')

# 1
S_ += [PageBreak(), Chapitre(1, 'Découvrir KOMYO', "KOMYO est une application de vidéos courtes, filmées en vertical avec ton téléphone. Son idée : <b>Apprendre, Créer, Partager</b>. Elle est faite pour toutes les cultures, partout dans le monde, avec un vrai espace séparé et protégé pour les enfants."), Spacer(1, 4)]
S_ += [Paragraph('Ce que tu peux faire', H2)] + bl([
    "<b>Regarder</b> des vidéos de créateurs proches de toi, de ta ville, de ta culture.",
    "<b>Filmer et publier</b> tes propres vidéos, directement depuis ton téléphone.",
    "<b>Aimer, commenter et partager</b> les vidéos des autres.",
    "<b>Inviter tes amis</b> avec Myo, et <b>gagner des médailles</b> grâce au parrainage.",
    "<b>Parler à Keydou</b>, l'assistant qui te trouve un hôtel, un restaurant, un dépannage…",
    "<b>Offrir à tes enfants</b> les 10 dessins animés de PIOUPIOU, dans un espace protégé.",
    "<b>Faire connaître</b> ta musique, ta boutique ou ton événement avec une annonce."])
S_ += [Paragraph('Qui peut utiliser KOMYO ?', H2)]
S_ += tbl([['Âge', 'Espace', 'Ce qui est ouvert'],
           ['3 à 6 ans', 'PIOUPIOU', "Dessins animés éducatifs, <b>100 % séparés</b> du reste de KOMYO, avec un parent qui supervise."],
           ['13 à 17 ans', 'KOMYO Jeunes', "Accès limité et protégé : chaque vidéo est vérifiée avant d'être montrée."],
           ['18 ans et plus', 'KOMYO complet', "Fil, Talents, Business, Musique, Découverte, Myo, Parrainage, Keydou et annonces."]], [30, 38, CW / mm - 68])
S_ += box("Regarder, publier et partager, c'est <b>gratuit</b>. Tu ne paies que si tu veux aller plus loin : annonce, abonnement Business ou Famille, ou une demande à Keydou.", 'ok')
S_ += box("KOMYO a besoin d'une <b>connexion internet</b> (données mobiles ou Wi-Fi) : il ne fonctionne pas hors connexion.", 'warn')

# 2
S_ += [PageBreak(), Chapitre(2, 'Installer KOMYO', "KOMYO s'installe comme une vraie application, <b>sans passer par un magasin</b> (pas de Play Store ni d'App Store). C'est gratuit, léger, et il n'y a aucune mise à jour à faire. Rends-toi sur <b>komyo.starentreprise.com/starvibe/installer.html</b>."), Spacer(1, 4)]
gauche = [Paragraph('Sur Android (Chrome ou Samsung Internet)', H2),
          Step(1, "Ouvre la page d'installation", "Dans <b>Chrome</b>, ouvre le lien de KOMYO."),
          Step(2, "Touche « Installer maintenant »", "Puis <b>Installer</b> dans la petite fenêtre. Si rien ne s'affiche : menu <b>(trois points)</b> > <b>Installer l'application</b>."),
          Step(3, "Ouvre KOMYO depuis ton écran d'accueil", "L'icône KOMYO apparaît : un seul toucher, plein écran, comme WhatsApp."),
          Paragraph('Sur iPhone et iPad (Safari)', H2),
          Step(1, "Touche « Partager »", "Le carré avec une flèche vers le haut, en bas de Safari."),
          Step(2, "Choisis « Sur l'écran d'accueil »", "Puis touche <b>Ajouter</b>. Apple ne permet pas l'installation en un seul bouton : ces deux gestes suffisent.")]
S_ += a_cote(gauche, Phone(os.path.join(A, 'installer.png'), legende="La page d'installation"))
S_ += [Paragraph("Sur ordinateur", H2)] + bl(["<b>Chrome ou Edge</b> (Windows, Mac, Linux) : « Installer maintenant », ou l'icône + à droite de la barre d'adresse.",
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
S_ += [Paragraph('Code PIN oublié ? Pas de panique', H2)]
S_ += [Step(1, "Demande un code", "Sur la page de connexion, touche « Code PIN oublié ». Écris ton numéro et ton nom, puis « Demander un code »."),
       Step(2, "Attends le code par WhatsApp", "L'équipe KOMYO vérifie que c'est bien toi, puis t'envoie un <b>code temporaire à 6 chiffres</b> par WhatsApp (en général dans la journée)."),
       Step(3, "Choisis un nouveau PIN", "Entre le code reçu, puis ton nouveau PIN (4 ou 5 chiffres) deux fois, et touche « Enregistrer mon nouveau PIN ».")]
S_ += box("Ne donne <b>jamais</b> ton code PIN à personne : ni à un ami, ni à quelqu'un qui dit travailler pour KOMYO. L'équipe ne te le demandera jamais.", 'warn')

# 4
S_ += [PageBreak(), Chapitre(4, 'Ton espace personnel', "« Mon espace » est la page d'accueil de ton compte. Tout part de là, et le <b>menu (les trois petits traits, en haut)</b> te montre tout ce que tu peux faire."), Spacer(1, 4)]
S_ += tbl([['Ce que tu vois', 'À quoi ça sert'],
           ['Mes profils', "Ton profil personnel, et le profil « Mon enfant (3–6 ans) » si tu en as créé un."],
           ['Keydou', "Parler à l'assistant multiservices (hôtel, restaurant, dépannage…)."],
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
S_ += [Paragraph('Regarder', H2)] + bl(["<b>Fais glisser vers le haut</b> pour voir la vidéo suivante, vers le bas pour revenir.",
                                         "Les boutons <b>flèche haut</b> et <b>flèche bas</b> font la même chose si tu préfères toucher.",
                                         "En haut, choisis ce que tu veux voir : <b>Tous · Talents · Business · Musique · Découverte · Jeunes</b>.",
                                         "La barre du bas : <b>Accueil · Publier · Fil</b>."])
S_ += [Paragraph('Aimer, commenter, partager', H2)] + bl(["Touche le <b>« + »</b> sur une vidéo pour faire apparaître le <b>cœur</b> (j'aime) et la <b>bulle</b> (commentaires).",
                                                          "Dans les commentaires, tu peux répondre à quelqu'un : reste poli et respectueux.",
                                                          "Pour <b>partager</b> : touche Partager, puis choisis WhatsApp, Facebook, e-mail, ou copie le lien."])
S_ += [Paragraph('Publier ta vidéo', H2)]
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
S_ += [Paragraph("Pour les parents", H2)] + bl(["Le profil enfant (3–6 ans) est <b>séparé</b> : il n'a pas accès au reste de l'application.",
                                                  "Aucune vidéo pour enfants n'est montrée sans avoir été vérifiée par l'équipe.",
                                                  "Pas d'échange possible entre adultes et mineurs : c'est volontaire."])
S_ += box("KOMYO Jeunes est visible seulement par les 13–17 ans. Les adultes ne le voient pas.", 'ok')

# 7 PIOUPIOU
S_ += [PageBreak(), Chapitre(7, 'PIOUPIOU, les dessins animés des 3–6 ans', "PIOUPIOU est le poussin qui apprend les <b>bonnes habitudes</b> du quotidien : dire bonjour, se laver les mains, se brosser les dents, dire merci. Les <b>10 épisodes</b> du premier pack sont disponibles."), Spacer(1, 4)]
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
S_ += [Paragraph('Comment ça marche', H2)] + bl([
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
S_ += [Paragraph("Kaba+ : tu décides ce que tu partages", H2), Paragraph("Un ami te demande ton <b>Gmail</b> ou ton <b>WhatsApp</b> ? Une fenêtre s'ouvre : tu choisis ce que tu partages, ou tu refuses. Rien n'est donné sans ton accord.", B)]
S_ += [Paragraph("Regarder ensemble", H2), Paragraph("Un ami Myo peut t'inviter à regarder une vidéo avec lui. Si tu réponds « Oui », la même vidéo s'ouvre chez toi ; si tu réponds « Non », il n'en est pas prévenu.", B)]
S_ += box("Myo n'existe pas dans l'espace PIOUPIOU des enfants. Un adulte ne peut pas inviter un mineur.", 'ok')

# 9 Parrainage
S_ += [PageBreak(), Chapitre(9, 'Parrainage et médailles', "Invite tes amis sur KOMYO avec ton <b>lien personnel</b> : chaque mois, les trois personnes qui ont fait connaître KOMYO au plus grand nombre d'amis gagnent une <b>médaille</b>."), Spacer(1, 4)]
gauche = [Paragraph('Comment participer', H2),
          Step(1, "Ouvre « Parrainage · médailles »", "Dans le menu de Mon espace (les trois petits traits, en haut)."),
          Step(2, "Envoie ton lien", "Touche <b>Envoyer par WhatsApp</b>, ou <b>Copier mon lien</b> pour le coller où tu veux."),
          Step(3, "Ton ami s'inscrit avec ton lien", "Il crée son compte en ouvrant ton lien : il est rattaché à toi. Il peut aussi écrire ton code à l'inscription."),
          Step(4, "Il compte quand il est connecté", "Un ami compte dès qu'il s'est <b>connecté sur au moins 2 jours différents</b>. Tu suis ta progression sur la page.")]
S_ += a_cote(gauche, Phone(os.path.join(A, 'parrainage.png'), legende='La page Parrainage'))
S_ += [Paragraph('Le classement du mois', H2)]
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
S_ += [PageBreak(), Chapitre(10, 'Keydou, ton assistant multiservices', "Keydou connaît les bonnes adresses du Congo : <b>hôtel, restaurant, salle de sport, spa, voiture, dépannage…</b> Tu n'as pas besoin de compte pour lui parler : juste ton nom, ton téléphone et ta ville."), Spacer(1, 4)]
S_ += [Step(1, "Ouvre Keydou", "Depuis Mon espace, ou sur la page d'accueil « Parler à Keydou »."),
       Step(2, "Parle-lui ou écris-lui", "<b>Monte le volume de ton téléphone</b>, appuie sur le micro et parle : Keydou t'écoute, puis te répond à voix haute. Exemple : « je cherche un hôtel à Pointe-Noire ». Tu peux aussi écrire."),
       Step(3, "Remplis ton inscription Keydou", "Nom et prénom, numéro de téléphone, ville. Coche ton besoin (jusqu'à 3)."),
       Step(4, "Paie 1 000 FCFA", "Une seule fois pour tes besoins cochés. Voir le chapitre 12 pour payer."),
       Step(5, "Reçois ta réponse", "Une fois le paiement confirmé, Keydou te donne les adresses et les numéros.")]
S_ += [Paragraph('Ce que Keydou peut te trouver', H2)]
S_ += tbl([['Besoin', 'Exemples'],
           ['Se loger et se restaurer', "Hôtels et résidences, restaurants, cafés, boulangeries et pâtisseries."],
           ['Se déplacer', "Location de véhicule, garages et dépannage, stations-service, agences de voyages."],
           ['Se faire plaisir', "Salons de coiffure et de beauté, spas, salles de sport, parcs et loisirs pour enfants, tourisme."],
           ['Organiser', "Salles de mariage et de réception, agences événementielles, bureaux et coworking."],
           ['Au quotidien', "Banques, supermarchés, achat et vente de voitures."]], [48, CW / mm - 48])
S_ += box("Keydou ne donne la réponse qu'<b>après réception de ton paiement</b>. Ses frais d'assistance sont distincts du prix de l'hôtel, du restaurant ou de toute autre prestation.", 'warn')
S_ += box("Les numéros viennent d'annuaires publics : <b>confirme-les par un appel</b> avant de te déplacer. En cas d'urgence : police 117, pompiers 118, violences et harcèlement 1444.", 'tip')

# 11 Annonces
S_ += [PageBreak(), Chapitre(11, 'Faire connaître ton activité', "Une <b>annonce</b> défile en bas de l'écran de tous les abonnés connectés, quelques secondes à chaque passage. Idéal pour une musique, un événement ou une boutique."), Spacer(1, 4)]
S_ += [Step(1, "Ouvre la page d'annonce", "Mon espace > « Faire connaître ma musique ou mon activité »."),
       Step(2, "Écris ton message", "100 caractères au maximum. Exemple : « DJ Kaled — nouvel album disponible dans l'espace Musique »."),
       Step(3, "Choisis le type", "Musique · Événement · Boutique / activité · Autre."),
       Step(4, "Choisis où envoyer les gens", "Quand on touche l'annonce : nulle part, l'espace Musique, Business ou Talents de KOMYO, ou ton propre lien."),
       Step(5, "Choisis la durée et paie", "1 semaine (essai) 2 000 FCFA · 2 semaines 4 000 FCFA · 1 mois 10 000 FCFA.")]
S_ += box("Ton annonce n'est affichée qu'<b>après paiement confirmé et relecture</b> par l'équipe STAR ENTREPRISE. Elle est réservée aux personnes de <b>18 ans et plus</b>. Tu retrouves tes annonces dans « Mes annonces ».", 'ok')
S_ += box("Messages interdits : arnaques, haine, contenu pour adultes, fausses promesses.", 'warn')
S_ += [Paragraph('Ouvrir ta boutique (abonnement Business)', H2)]
S_ += [Step(1, "Crée ton compte KOMYO", "C'est gratuit."), Step(2, "Active l'abonnement Business", "5 000 FCFA par mois, payé en Mobile Money, sur la page « Mon abonnement »."),
       Step(3, "Ouvre « Ouvrir ma boutique »", "Nom, ville, numéro Mobile Money, ce que tu vends. Tes clients te paient directement ; reçus et messages arrivent dans leur messagerie KOMYO.")]

# 12 Tarifs
S_ += [PageBreak(), Chapitre(12, 'Tarifs et paiement', "Regarder, publier et partager, c'est gratuit. Voici ce qui est payant."), Spacer(1, 4)]
gauche = tbl([['Offre', 'Prix', 'Ce que tu obtiens'],
              ['Découverte', '0 FCFA', "Compte, fil, publier, aimer, commenter, partager, Myo, Parrainage, KOMYO Jeunes."],
              ['Annonce', "2 000 FCFA (1 sem.)<br/>4 000 FCFA (2 sem.)<br/>10 000 FCFA (1 mois)", "Ton message visible par tous les abonnés."],
              ['Business', '5 000 FCFA / mois', "Mise en avant de tes vidéos, statistiques, boutique."],
              ['Famille', '1 500 FCFA / 30 jours', "Les 10 dessins animés PIOUPIOU, profils enfants illimités."],
              ['Keydou', '1 000 FCFA / demande', "Jusqu'à 3 besoins cochés, réponse après paiement."]], [21, 30, CW / mm - 62 - 51])
S_ += a_cote(gauche, Phone(os.path.join(A, 'tarifs.png'), w=44 * mm, legende='La page des tarifs'))
S_ += [Paragraph('Comment payer (Mobile Money)', H2)]
S_ += [Step(1, "Prépare le montant exact", "Le montant doit être <b>exactement</b> celui de l'offre choisie. Un autre montant est refusé."),
       Step(2, "Envoie le paiement", "Par <b>MTN Mobile Money</b> ou <b>Airtel Money</b> au <b>+242 06 656 50 50</b>."),
       Step(3, "Attends la confirmation", "Rien n'est activé tant que l'équipe STAR ENTREPRISE n'a pas confirmé la réception. Le statut passe de « en attente » à « payé ». Les prix sont en FCFA ; l'équivalent dans ta monnaie est indicatif.")]
S_ += box("<b>Ne donne jamais ton code secret Mobile Money</b> (PIN) ni un code reçu par SMS : ni à nous, ni à quelqu'un d'autre. Nous ne te les demanderons jamais.", 'warn')

# 13 Statistiques
S_ += [PageBreak(), Chapitre(13, 'Tes statistiques', "Pour savoir si tes vidéos plaisent, ouvre <b>Mes statistiques</b> depuis Mon espace."), Spacer(1, 4)]
S_ += bl(["<b>Vues</b> : combien de personnes ont regardé chaque vidéo.", "<b>Durée réellement regardée</b> : les gens regardent-ils jusqu'au bout ?", "<b>J'aime et commentaires</b> : l'engagement, vidéo par vidéo."])
S_ += box("Pour avoir plus de vues : publie <b>régulièrement</b>, rends les 3 premières secondes très accrocheuses, choisis le bon espace, invite tes amis à te suivre et partage tes vidéos sur WhatsApp.", 'tip')

# 14 Sécurité
S_ += [Chapitre(14, 'Sécurité et bonnes règles', "KOMYO veut rester un endroit agréable pour tout le monde."), Spacer(1, 4)]
S_ += [Paragraph('Protège ton compte', H2)] + bl(["Ton code PIN est secret. Il est enregistré <b>chiffré</b>, jamais en clair.", "Après plusieurs essais ratés, le compte est <b>verrouillé temporairement</b>.",
                                                  "Sur un téléphone partagé, déconnecte-toi après usage.", "Méfie-toi des faux messages qui disent « KOMYO a besoin de ton PIN » : c'est une arnaque."])
S_ += [Paragraph('Respecte les autres', H2)] + bl(["Pas d'insultes, de haine, de harcèlement, ni de contenu pour adultes.", "Pas d'arnaques ni de fausses promesses.", "Ne filme pas quelqu'un sans son accord, surtout un enfant.",
                                                   "Les vidéos qui ne respectent pas les règles peuvent être retirées par la modération."])
S_ += box("Certaines nouveautés — ÉCLAT (le direct), le Salon (appel vidéo en groupe), le vœu d'anniversaire de Keydou — arrivent bientôt : elles apparaîtront automatiquement dans l'application, sans rien installer.", 'ok')

# 15 Problèmes
S_ += [PageBreak(), Chapitre(15, 'Problèmes fréquents', "Avant de nous écrire, essaie ceci."), Spacer(1, 4)]
S_ += tbl([['Problème', 'Solution'],
           ["Je n'arrive pas à installer l'application", "Utilise Chrome (Android) ou Safari (iPhone). Depuis WhatsApp ou Facebook : « Ouvrir dans le navigateur ». Sinon garde la page en favori : ça marche aussi."],
           ["J'ai oublié mon code PIN", "Page de connexion > « Code PIN oublié » > attends le code par WhatsApp > choisis un nouveau PIN."],
           ["Mon compte est bloqué", "Trop d'essais ratés : attends un peu, puis réessaie. Sinon, utilise « Code PIN oublié »."],
           ["Les vidéos sont lentes", "Vérifie ta connexion (Wi-Fi ou données), ferme les autres applications, puis rouvre KOMYO."],
           ["La caméra ne s'ouvre pas", "Autorise la caméra et le micro quand le téléphone le demande (réglages du navigateur)."],
           ["Keydou ne m'entend pas", "Monte le volume, autorise le micro, appuie sur le micro avant de parler. Tu peux aussi écrire ta demande."],
           ["J'ai payé mais rien ne s'est activé", "Le paiement doit être <b>exact</b> et confirmé par l'équipe, en général dans la journée. Écris-nous avec ton numéro et l'heure du paiement."],
           ["Mon ami n'apparaît pas dans mon parrainage", "Il doit s'être inscrit avec ton lien et s'être connecté sur 2 jours différents. Les amis déjà inscrits avant l'ouverture du parrainage ne comptent pas."],
           ["Ma vidéo n'apparaît pas", "Une vidéo pour enfants est vérifiée avant publication. Pour les autres, vérifie ta connexion et réessaie."]], [54, CW / mm - 54])
S_ += [Paragraph("Nous contacter", H2), Paragraph("E-mail : <b>contact@starentreprise.com</b> — formulaire de contact sur la page d'accueil de KOMYO — WhatsApp : <b>+242 06 656 50 50</b>.", B)]
S_ += box("Garde ce guide dans ton téléphone ou imprime-le. Partage-le avec ta famille et tes amis : plus il y a de monde sur KOMYO, plus tes vidéos sont vues.", 'tip')
S_ += [Spacer(1, 10), Paragraph('<font color="#6b5f80">KOMYO — Apprendre · Créer · Partager. Conçu et créé par STAR ENTREPRISE.</font>', ParagraphStyle('end', parent=B, alignment=1))]

doc = Doc(OUT, pagesize=A4, title="KOMYO — Guide d'utilisation", author='STAR ENTREPRISE', subject="Guide d'utilisation de l'application KOMYO, édition de novembre 2026")
fr = Frame(22 * mm, 20 * mm, W - 44 * mm, H - 40 * mm, id='f', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id='cover', frames=[Frame(0, 0, 1, 1)], onPage=cover), PageTemplate(id='inner', frames=[fr], onPage=inner)])
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
