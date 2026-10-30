# Génère le guide d'utilisation de KOMYO (PDF à télécharger) — destiné à tout le monde.
from reportlab.lib.pagesizes import A4
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable, KeepTogether, NextPageTemplate
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
ROOT = '/home/user/STAR-ENTREPRISE-'
OUT = ROOT + '/docs/komyo/KOMYO-Guide-utilisation.pdf'
LOGO = ROOT + '/starvibe/assets/img/komyo-logo-full.png'
INK = colors.HexColor('#241536'); GOLD = colors.HexColor('#E8A93D'); CORAL = colors.HexColor('#FF6B4A')
LINE = colors.HexColor('#eee2cc'); DIM = colors.HexColor('#6b5f80'); CREAM = colors.HexColor('#FFFBF3'); OK = colors.HexColor('#1f8f4a')
W, H = A4

H1 = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=21, leading=25, textColor=INK, spaceAfter=3)
KICK = ParagraphStyle('k', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=CORAL, spaceAfter=2)
H2 = ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=CORAL, spaceBefore=11, spaceAfter=4)
B = ParagraphStyle('b', fontName='Helvetica', fontSize=10.3, leading=14.8, textColor=INK, spaceAfter=4)
S = ParagraphStyle('s', fontName='Helvetica', fontSize=8.6, leading=11.5, textColor=DIM)
BL = ParagraphStyle('bl', parent=B, leftIndent=13, bulletIndent=2, spaceAfter=2.5)
CELL = ParagraphStyle('c', parent=B, fontSize=9, leading=12, spaceAfter=0)


class Step(Flowable):
    """Étape numérotée : pastille dorée + texte."""
    def __init__(self, n, title, text, width=170 * mm):
        super().__init__(); self.n = n; self.w = width
        self.t = Paragraph('<b>%s</b>' % title, ParagraphStyle('st', parent=B, fontSize=10.8, leading=14, spaceAfter=1))
        self.p = Paragraph(text, ParagraphStyle('sp', parent=B, spaceAfter=0))
    def wrap(self, aw, ah):
        self.w = min(self.w, aw)
        _, h1 = self.t.wrap(self.w - 14 * mm, ah); _, h2 = self.p.wrap(self.w - 14 * mm, ah)
        self.h = h1 + h2 + 5 * mm; return self.w, self.h
    def draw(self):
        c = self.canv; c.setFillColor(GOLD); c.circle(4.5 * mm, self.h - 6 * mm, 4.2 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white); c.setFont('Helvetica-Bold', 11); c.drawCentredString(4.5 * mm, self.h - 7.6 * mm, str(self.n))
        _, h1 = self.t.wrap(self.w - 14 * mm, 999); self.t.drawOn(c, 12 * mm, self.h - 1.5 * mm - h1)
        _, h2 = self.p.wrap(self.w - 14 * mm, 999); self.p.drawOn(c, 12 * mm, self.h - 1.5 * mm - h1 - 1 * mm - h2)


def box(text, kind='tip'):
    col = {'tip': (colors.HexColor('#fff6e3'), GOLD), 'warn': (colors.HexColor('#fdecea'), CORAL), 'ok': (colors.HexColor('#e9f7ee'), OK)}[kind]
    lab = {'tip': 'ASTUCE', 'warn': 'IMPORTANT', 'ok': 'BON À SAVOIR'}[kind]
    t = Table([[Paragraph('<font color="#%s"><b>%s</b></font><br/>%s' % (col[1].hexval()[2:], lab, text), CELL)]], colWidths=[170 * mm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), col[0]), ('LINEBEFORE', (0, 0), (0, -1), 3, col[1]),
                           ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9), ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    return [t, Spacer(1, 4)]


def tbl(rows, widths):
    data = [[Paragraph(('<font color="white"><b>%s</b></font>' % c) if r == 0 else str(c), CELL) for c in row] for r, row in enumerate(rows)]
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), INK), ('GRID', (0, 0), (-1, -1), 0.4, LINE), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                           ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, CREAM]), ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                           ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    return [t, Spacer(1, 6)]


def bl(items): return [Paragraph(i, BL, bulletText='•') for i in items]
def chapter(n, title, intro=None):
    out = [Paragraph('CHAPITRE %s' % n, KICK), Paragraph(title, H1)]
    if intro: out.append(Paragraph(intro, B))
    return out


# ------------------------------------------------------------------ pages
def cover(c, d):
    c.saveState(); c.setFillColor(colors.HexColor('#0b0710')); c.rect(0, 0, W, H, stroke=0, fill=1)
    lw = 120 * mm; lh = lw * 1024 / 1526
    c.drawImage(LOGO, (W - lw) / 2, H - 28 * mm - lh, lw, lh, mask='auto')
    c.setFillColor(GOLD); c.rect(W / 2 - 20 * mm, H - 38 * mm - lh, 40 * mm, 1.2, stroke=0, fill=1)
    c.setFillColor(colors.white); c.setFont('Helvetica-Bold', 26); c.drawCentredString(W / 2, H - 56 * mm - lh, "Guide d'utilisation")
    c.setFont('Helvetica', 12.5); c.setFillColor(colors.HexColor('#e7ddc9'))
    for i, l in enumerate(["De l'installation à ta première vidéo : tout ce qu'il faut savoir", "pour utiliser KOMYO, pas à pas, même si c'est ta première application."]):
        c.drawCentredString(W / 2, H - 68 * mm - lh - i * 6.2 * mm, l)
    c.setFillColor(GOLD); c.setFont('Helvetica-Bold', 11); c.drawCentredString(W / 2, 34 * mm, 'komyo.starentreprise.com')
    c.setFillColor(colors.HexColor('#b9ad98')); c.setFont('Helvetica', 9.5)
    c.drawCentredString(W / 2, 26 * mm, 'Gratuit · pour téléphone, tablette et ordinateur · en français')
    c.drawCentredString(W / 2, 19 * mm, 'Conçu et créé par STAR ENTREPRISE')
    c.restoreState()


def inner(c, d):
    c.saveState(); c.setFillColor(CREAM); c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(GOLD); c.rect(0, H - 9 * mm, W, 9 * mm, stroke=0, fill=1)
    c.setFillColor(INK); c.setFont('Helvetica-Bold', 9); c.drawString(20 * mm, H - 6.2 * mm, 'KOMYO · GUIDE D’UTILISATION')
    c.setFont('Helvetica', 8.5); c.drawRightString(W - 20 * mm, H - 6.2 * mm, 'Apprendre · Créer · Partager')
    c.setFillColor(DIM); c.setFont('Helvetica', 8); c.drawString(20 * mm, 10 * mm, 'Conçu par STAR ENTREPRISE — contact@starentreprise.com')
    c.drawRightString(W - 20 * mm, 10 * mm, 'Page %d' % d.page)
    c.restoreState()


S_ = []
# Sommaire
S_ += [PageBreak(), Paragraph('SOMMAIRE', KICK), Paragraph('Ce que contient ce guide', H1), Spacer(1, 4)]
S_ += tbl([['N°', 'Chapitre', 'Tu y apprends à…'],
           ['1', "Découvrir KOMYO", "comprendre à quoi sert l'application et ce qui est gratuit"],
           ['2', "Installer KOMYO", "mettre l'application sur ton écran d'accueil (Android, iPhone, ordinateur)"],
           ['3', "Créer ton compte", "t'inscrire avec ton numéro et un code PIN, et retrouver un PIN oublié"],
           ['4', "Ton espace personnel", "t'y retrouver dans « Mon espace »"],
           ['5', "Le fil de vidéos", "regarder, aimer, commenter, filmer et publier"],
           ['6', "Les espaces KOMYO", "choisir entre Talents, Business, Musique, Découverte, Jeunes et PIOUPIOU"],
           ['7', "Myo : tes amis", "inviter, accepter, partager ton contact avec Kaba+"],
           ['8', "Keydou, l'assistant", "trouver un hôtel, un restaurant, un dépannage…"],
           ['9', "Faire connaître ton activité", "créer une annonce visible par tous"],
           ['10', "Tarifs et paiement", "savoir ce qui est gratuit, ce qui est payant, et payer par Mobile Money"],
           ['11', "Tes statistiques", "voir combien de personnes regardent tes vidéos"],
           ['12', "Sécurité et bonnes règles", "protéger ton compte et respecter les autres"],
           ['13', "Problèmes fréquents", "résoudre les petits blocages et nous contacter"]], [12, 55, 103])

# 1
S_ += [PageBreak()] + chapter(1, 'Découvrir KOMYO', "KOMYO est une application de vidéos courtes, filmées en vertical avec ton téléphone. Son idée : <b>Apprendre, Créer, Partager</b>. Elle est faite pour toutes les cultures, partout dans le monde, avec un vrai espace séparé et protégé pour les enfants.")
S_ += [Paragraph('Ce que tu peux faire', H2)] + bl([
    "<b>Regarder</b> des vidéos de créateurs proches de toi, de ta ville, de ta culture.",
    "<b>Filmer et publier</b> tes propres vidéos, directement depuis ton téléphone.",
    "<b>Aimer, commenter et partager</b> les vidéos des autres.",
    "<b>Inviter tes amis</b> avec Myo, pour vous suivre et rester en contact.",
    "<b>Demander de l'aide à Keydou</b> : hôtel, restaurant, salle de sport, voiture, dépannage…",
    "<b>Faire connaître</b> ta musique, ta boutique ou ton événement avec une annonce."])
S_ += [Paragraph('Qui peut utiliser KOMYO ?', H2)]
S_ += tbl([['Âge', 'Espace', 'Ce qui est ouvert'],
           ['3 à 6 ans', 'PIOUPIOU', "Vidéos éducatives et amusantes, <b>100 % séparées</b> du reste de KOMYO, avec un parent qui supervise."],
           ['13 à 17 ans', 'KOMYO Jeunes', "Accès limité et protégé : chaque vidéo est vérifiée avant d'être montrée."],
           ['18 ans et plus', 'KOMYO complet', "Fil, Talents, Business, Musique, Découverte, Myo, Keydou et annonces."]], [30, 38, 102])
S_ += box("Regarder, publier et partager, c'est <b>gratuit</b>. Tu ne paies que si tu veux aller plus loin : annonce, abonnement Business ou Famille, ou une demande à Keydou.", 'ok')

# 2
S_ += [PageBreak()] + chapter(2, 'Installer KOMYO', "KOMYO s'installe comme une vraie application, <b>sans passer par un magasin</b> (pas de Play Store ni d'App Store). C'est gratuit, léger, et il n'y a aucune mise à jour à faire. Rends-toi sur <b>komyo.starentreprise.com/starvibe/installer.html</b>.")
S_ += [Paragraph('Sur Android (Chrome ou Samsung Internet)', H2)]
S_ += [Step(1, "Ouvre la page d'installation", "Dans <b>Chrome</b>, ouvre le lien de KOMYO."),
       Step(2, "Touche « Installer maintenant »", "Puis touche <b>Installer</b> dans la petite fenêtre qui s'ouvre. Si rien ne s'affiche : menu <b>(trois points)</b> > <b>Installer l'application</b>."),
       Step(3, "Ouvre KOMYO depuis ton écran d'accueil", "L'icône KOMYO apparaît. Un seul toucher, plein écran, comme WhatsApp.")]
S_ += [Paragraph('Sur iPhone et iPad (Safari)', H2)]
S_ += [Step(1, "Touche « Partager »", "C'est le carré avec une flèche vers le haut, en bas de Safari."),
       Step(2, "Choisis « Sur l'écran d'accueil »", "Puis touche <b>Ajouter</b>. Apple ne permet pas l'installation en un seul bouton : ces deux gestes suffisent.")]
S_ += [Paragraph("Sur ordinateur", H2)] + bl(["<b>Chrome ou Edge</b> (Windows, Mac, Linux) : touche « Installer maintenant », ou clique l'icône + à droite de la barre d'adresse.",
                                               "<b>Safari sur Mac</b> : menu Fichier > Ajouter au Dock.", "<b>Firefox</b> sur ordinateur n'installe pas les applications : utilise Chrome ou Edge."])
S_ += box("Tu as ouvert le lien depuis WhatsApp, Facebook ou TikTok ? Touche les <b>trois points</b> (en haut ou en bas de l'écran), puis <b>Ouvrir dans le navigateur</b>. Ensuite suis les étapes de ton appareil.", 'warn')
S_ += box("Ça ne s'installe pas ? Ce n'est pas grave : KOMYO fonctionne très bien dans le navigateur. Garde simplement la page dans tes favoris . Tu peux aussi essayer un autre navigateur (Edge, Samsung Internet, Firefox, Opera) ou mettre Chrome à jour.", 'tip')

# 3
S_ += [PageBreak()] + chapter(3, 'Créer ton compte', "Il te faut seulement ton <b>numéro de téléphone</b> et un <b>code PIN</b> de 4 ou 5 chiffres, comme le code de ta carte bancaire. Cela prend moins d'une minute.")
S_ += [Step(1, "Touche « Créer mon compte »", "Sur la page d'accueil de KOMYO, ou sur la page d'inscription."),
       Step(2, "Remplis le formulaire", "Numéro de téléphone, nom complet, date de naissance, ville."),
       Step(3, "Choisis pour qui est le compte", "<b>Moi-même</b>, ou <b>Mon enfant (3–6 ans)</b> pour créer un profil séparé pour ta famille."),
       Step(4, "Invente ton code PIN", "4 ou 5 chiffres que tu es seul(e) à connaître. Évite 1234 ou ta date de naissance."),
       Step(5, "Touche « Créer mon compte »", "Bravo : ton vrai compte est créé. Touche « Aller à mon espace ».")]
S_ += box("Ton âge décide de ce que tu peux faire : <b>13–17 ans</b> = accès limité et protégé ; <b>18 ans et plus</b> = accès complet ; l'<b>espace enfants</b> est réservé aux 3–6 ans.", 'ok')
S_ += [Paragraph('Se reconnecter', H2), Paragraph("Sur la page de connexion, entre ton numéro de téléphone et ton code PIN. Ta session reste ouverte sur ton téléphone pendant environ 30 jours.", B)]
S_ += [Paragraph('Code PIN oublié ? Pas de panique', H2)]
S_ += [Step(1, "Demande un code", "Sur la page de connexion, touche « Code PIN oublié ». Écris ton numéro et ton nom, puis « Demander un code »."),
       Step(2, "Attends le code par WhatsApp", "L'équipe KOMYO vérifie que c'est bien toi, puis t'envoie un <b>code temporaire à 6 chiffres</b> par WhatsApp (en général dans la journée)."),
       Step(3, "Choisis un nouveau PIN", "Reviens sur la page, entre le code reçu, puis ton nouveau PIN (4 ou 5 chiffres) deux fois. Touche « Enregistrer mon nouveau PIN ».")]
S_ += box("Ne donne <b>jamais</b> ton code PIN à personne : ni à un ami, ni à quelqu'un qui dit travailler pour KOMYO. L'équipe ne te le demandera jamais.", 'warn')

# 4
S_ += [PageBreak()] + chapter(4, 'Ton espace personnel', "« Mon espace » est la page d'accueil de ton compte. Tout part de là.")
S_ += tbl([['Ce que tu vois', 'À quoi ça sert'],
           ['Mes profils', "Ton profil personnel, et le profil « Mon enfant (3–6 ans) » si tu en as créé un."],
           ['Keydou', "Parler à l'assistant multiservices (hôtel, restaurant, dépannage…)."],
           ['Faire connaître ma musique ou mon activité', "Créer une annonce visible par tous les abonnés."],
           ['Myo · mes amis', "Inviter des personnes, accepter des invitations, voir tes amis."],
           ['ÉCLAT', "Le direct de KOMYO (bientôt)."],
           ['Me filmer et publier une vidéo', "Ouvrir la caméra, te filmer, publier."],
           ['Les espaces KOMYO', "Talents, Business, Musique, Découverte, PIOUPIOU."],
           ['Découvrir le fil', "Regarder les vidéos de la communauté."],
           ['Accès rapide', "Sécurité (code PIN), profils famille, mon abonnement, mes statistiques."],
           ['Inviter sur WhatsApp', "Faire grandir KOMYO : plus il y a de monde, plus tes vidéos sont vues."],
           ['Besoin d’aide ?', "L'adresse contact@starentreprise.com et la page d'installation."]], [58, 112])
S_ += box("Plus tard, tu pourras relancer le <b>guide de démarrage</b> (des flèches qui te montrent chaque bouton) depuis le lien « Revoir le guide de démarrage » en bas de Mon espace.", 'tip')

# 5
S_ += [PageBreak()] + chapter(5, 'Le fil de vidéos', "Le fil est le cœur de KOMYO : une vidéo après l'autre, en plein écran, comme sur ton téléphone.")
S_ += [Paragraph('Regarder', H2)] + bl(["<b>Fais glisser vers le haut</b> pour voir la vidéo suivante, vers le bas pour revenir.",
                                         "Les boutons <b>flèche haut</b> et <b>flèche bas</b> font la même chose si tu préfères toucher.",
                                         "En haut, choisis ce que tu veux voir : <b>Tous · Talents · Business · Musique · Découverte · Jeunes</b>.",
                                         "La barre du bas : <b>Accueil · Publier · Fil</b>."])
S_ += [Paragraph('Aimer, commenter, partager', H2)] + bl(["Touche le <b>« + »</b> sur une vidéo pour faire apparaître le <b>cœur</b> (j'aime) et la <b>bulle</b> (commentaires).",
                                                          "Dans les commentaires, tu peux répondre à quelqu'un : reste poli et respectueux.",
                                                          "Pour <b>partager</b> : touche Partager, puis choisis WhatsApp, Facebook, e-mail (Gmail), ou copie le lien."])
S_ += [Paragraph('Publier ta vidéo', H2)]
S_ += [Step(1, "Touche « Publier »", "Dans la barre du bas, ou « Me filmer et publier une vidéo » dans Mon espace."),
       Step(2, "Choisis ta vidéo", "<b>Me filmer maintenant</b> ouvre la caméra ; <b>Choisir dans ma galerie</b> prend une vidéo déjà prête."),
       Step(3, "Filme", "Touche <b>Filmer</b>, parle ou montre ton talent, puis arrête. Si tu es content(e), touche <b>Utiliser</b>."),
       Step(4, "Écris une légende", "Une phrase courte qui explique ta vidéo. Choisis l'espace qui lui convient (voir chapitre 6)."),
       Step(5, "Touche « Publier »", "Ta vidéo apparaît dans le fil.")]
S_ += box("Pour une belle vidéo : tiens le téléphone <b>en vertical</b>, filme avec de la lumière devant toi (pas derrière), et parle près du téléphone pour qu'on t'entende bien.", 'tip')
S_ += box("Une vidéo <b>adaptée aux enfants</b> (espace PIOUPIOU) est <b>vérifiée avant publication</b>. Tu peux supprimer tes propres vidéos ; personne d'autre ne peut le faire à ta place.", 'ok')

# 6
S_ += [PageBreak()] + chapter(6, 'Les espaces KOMYO', "KOMYO réunit plusieurs mondes sous une même marque. Choisis celui qui te ressemble.")
S_ += tbl([['Espace', 'Pour qui', 'Ce que tu y trouves'],
           ['Talents', 'Créateurs', "Chant, danse, cuisine, métier, art… montre ce que tu sais faire au monde entier."],
           ['Business', '18 ans et plus', "Présente ton activité, ton produit, ta boutique. Abonnement Business pour être mis en avant."],
           ['Musique', 'Artistes et DJ', "Clips, sons et nouveautés. Tu peux aussi faire une annonce pour ta musique."],
           ['Découverte', 'Tout le monde', "Explore le monde et ses cultures à travers les vidéos de la communauté."],
           ['KOMYO Jeunes', '13–17 ans', "Découvrir, créer et partager entre ados, en sécurité : chaque vidéo est vérifiée."],
           ['PIOUPIOU', '3–6 ans', "Vidéos éducatives et amusantes, séparées du reste de KOMYO, avec un parent qui supervise. Certains dessins animés sont réservés à l'abonnement Famille."]], [34, 30, 106])
S_ += [Paragraph("Pour les parents", H2)] + bl(["Le profil enfant (3–6 ans) est <b>séparé</b> : il n'a pas accès au reste de l'application.",
                                                  "Aucune vidéo pour enfants n'est montrée sans avoir été vérifiée par l'équipe.",
                                                  "L'abonnement <b>Famille</b> (1 500 FCFA par mois) donne les dessins animés premium, des profils enfants illimités et une priorité de modération."])
S_ += box("Les espaces pour mineurs (PIOUPIOU et KOMYO Jeunes) restent protégés : pas d'échange entre adultes et mineurs. C'est volontaire.", 'ok')

# 7
S_ += [PageBreak()] + chapter(7, 'Myo : tes amis', "Myo est le moyen de retrouver tes amis sur KOMYO. <b>Suivre quelqu'un, c'est devenir amis.</b>")
S_ += [Step(1, "Ouvre Myo", "Depuis Mon espace, touche « Myo · mes amis »."),
       Step(2, "Invite quelqu'un", "Cherche une personne, ou invite-la depuis tes contacts, et envoie l'invitation."),
       Step(3, "Accepte une invitation", "Quand quelqu'un t'invite, une petite bulle apparaît en haut de l'écran : « Nom t'invite à te suivre et à devenir ami — Oui / Non »."),
       Step(4, "Retrouve tes amis", "Les onglets <b>Amis</b>, <b>Invitations</b> et <b>Contacts</b> te montrent tout.")]
S_ += [Paragraph("Kaba+ : tu décides ce que tu partages", H2), Paragraph("Un ami te demande ton <b>Gmail</b> ou ton <b>WhatsApp</b> ? Une fenêtre s'ouvre : tu choisis ce que tu partages, ou tu refuses. Rien n'est donné sans ton accord.", B)]
S_ += box("Myo n'existe pas dans l'espace PIOUPIOU des enfants.", 'ok')

# 8
S_ += [PageBreak()] + chapter(8, 'Keydou, ton assistant multiservices', "Keydou connaît les bonnes adresses du Congo : <b>hôtel, restaurant, salle de sport, spa, voiture, dépannage…</b> Tu n'as pas besoin de compte pour lui parler : juste ton nom, ton téléphone et ta ville.")
S_ += [Step(1, "Ouvre Keydou", "Depuis Mon espace, ou sur la page d'accueil « Parler à Keydou »."),
       Step(2, "Dis ou écris ce que tu cherches", "Garde le doigt appuyé sur le bouton micro pendant que tu parles, puis lâche. Exemple : « je cherche un hôtel à Pointe-Noire ». Tu peux aussi écrire."),
       Step(3, "Remplis ton inscription Keydou", "Nom et prénom, numéro de téléphone, ville. Coche ton besoin (jusqu'à 3)."),
       Step(4, "Paie 1 000 FCFA", "Une seule fois pour tes besoins cochés. Voir le chapitre 10 pour payer."),
       Step(5, "Reçois ta réponse", "Une fois le paiement confirmé, Keydou te donne les adresses et les numéros.")]
S_ += box("Keydou ne donne la réponse qu'<b>après réception de ton paiement</b>. Les frais d'assistance sont distincts du prix de l'hôtel, du restaurant ou de toute autre prestation.", 'warn')
S_ += box("Les numéros viennent d'annuaires publics : <b>confirme-les par un appel</b> avant de te déplacer. En cas d'urgence : police 117, pompiers 118, violences et harcèlement 1444.", 'tip')

# 9
S_ += [PageBreak()] + chapter(9, 'Faire connaître ton activité', "Une <b>annonce</b> défile en bas de l'écran de tous les abonnés connectés, quelques secondes à chaque passage. Idéal pour une musique, un événement ou une boutique.")
S_ += [Step(1, "Ouvre la page d'annonce", "Mon espace > « Faire connaître ma musique ou mon activité »."),
       Step(2, "Écris ton message", "100 caractères au maximum. Exemple : « DJ Kaled — nouvel album disponible dans l'espace Musique »."),
       Step(3, "Choisis le type", "Musique · Événement · Boutique / activité · Autre."),
       Step(4, "Choisis où envoyer les gens", "Quand on touche l'annonce : nulle part, l'espace Musique, Business ou Talents de KOMYO, ou ton propre lien."),
       Step(5, "Choisis la durée et paie", "1 semaine (essai) 2 000 FCFA · 2 semaines 4 000 FCFA · 1 mois 10 000 FCFA.")]
S_ += box("Ton annonce n'est affichée qu'<b>après paiement confirmé et relecture</b> par l'équipe STAR ENTREPRISE. Elle est réservée aux personnes de <b>18 ans et plus</b>. Tu retrouves tes annonces dans « Mes annonces ».", 'ok')
S_ += box("Messages interdits : arnaques, haine, contenu pour adultes, fausses promesses.", 'warn')

# 10
S_ += [PageBreak()] + chapter(10, 'Tarifs et paiement', "Regarder, publier et partager, c'est gratuit. Voici ce qui est payant.")
S_ += tbl([['Offre', 'Prix', 'Ce que tu obtiens'],
           ['Découverte', '0 FCFA', "Ton compte, le fil, publier dans Talents, Business, Musique et Découverte, aimer, commenter, partager, Myo, KOMYO Jeunes."],
           ['Annonce', "2 000 FCFA (1 semaine, essai)<br/>4 000 FCFA (2 semaines)<br/>10 000 FCFA (1 mois)", "Ton message visible par tous les abonnés."],
           ['Business', '5 000 FCFA / mois', "Mise en avant de tes vidéos, statistiques (vues, durée regardée, j'aime), outils pour commerces (en cours d'ajout)."],
           ['Famille · PIOUPIOU', '1 500 FCFA / mois', "Dessins animés PIOUPIOU premium pour les 3–6 ans, profils enfants illimités, priorité de modération."],
           ['Keydou', '1 000 FCFA par demande', "Hôtel, restaurant, salle, véhicule, dépannage… tu coches ton besoin, Keydou te répond."]], [34, 50, 86])
S_ += [Paragraph('Comment payer (Mobile Money)', H2)]
S_ += [Step(1, "Prépare le montant exact", "Le montant doit être <b>exactement</b> celui de l'offre choisie. Un autre montant est refusé."),
       Step(2, "Envoie le paiement", "Par <b>MTN</b> ou <b>Airtel Money</b> au <b>+242 06 656 50 50</b>."),
       Step(3, "Attends la confirmation", "Rien n'est activé tant que l'équipe STAR ENTREPRISE n'a pas confirmé la réception. Le statut passe de « en attente » à « payé ».")]
S_ += box("<b>Ne donne jamais ton code secret Mobile Money</b> (PIN) ni un code reçu par SMS : ni à nous, ni à quelqu'un d'autre. Nous ne te les demanderons jamais.", 'warn')
S_ += box("Les prix sont fixés en FCFA ; l'équivalent dans ta monnaie est indicatif. Abonnement : tu es prévenu(e) 3 jours avant la fin, par un rappel signé Keydou.", 'tip')

# 11
S_ += [PageBreak()] + chapter(11, 'Tes statistiques', "Pour savoir si tes vidéos plaisent, ouvre <b>Mes statistiques</b> depuis Mon espace.")
S_ += bl(["<b>Vues</b> : combien de personnes ont regardé chaque vidéo.", "<b>Durée réellement regardée</b> : les gens regardent-ils jusqu'au bout ?", "<b>J'aime et commentaires</b> : l'engagement, vidéo par vidéo."])
S_ += box("Pour avoir plus de vues : publie <b>régulièrement</b>, garde les 3 premières secondes très accrocheuses, choisis le bon espace, invite tes amis et tes clients à suivre ton compte, et partage tes vidéos sur WhatsApp.", 'tip')

# 12
S_ += [Paragraph('', B)] + chapter(12, 'Sécurité et bonnes règles', "KOMYO veut rester un endroit agréable pour tout le monde.")
S_ += [Paragraph('Protège ton compte', H2)] + bl(["Ton code PIN est secret. Il est enregistré <b>chiffré</b>, jamais en clair.", "Après plusieurs essais ratés, le compte est <b>verrouillé temporairement</b>.",
                                                  "Sur un téléphone partagé, déconnecte-toi après usage.", "Méfie-toi des faux messages qui disent « KOMYO a besoin de ton PIN » : c'est une arnaque."])
S_ += [Paragraph('Respecte les autres', H2)] + bl(["Pas d'insultes, de haine, de harcèlement, ni de contenu pour adultes.", "Pas d'arnaques ni de fausses promesses.", "Ne filme pas quelqu'un sans son accord, surtout un enfant.",
                                                   "Les vidéos qui ne respectent pas les règles peuvent être retirées par la modération."])
S_ += box("Ce guide décrit KOMYO tel qu'il est utilisable aujourd'hui. Certaines nouveautés — ÉCLAT (le direct), « Regarder avec un ami », le bouton Partager amélioré et le guide de démarrage à flèches — arrivent bientôt : elles apparaîtront automatiquement dans l'application.", 'ok')

# 13
S_ += [PageBreak()] + chapter(13, 'Problèmes fréquents', "Avant de nous écrire, essaie ceci.")
S_ += tbl([['Problème', 'Solution'],
           ["Je n'arrive pas à installer l'application", "Utilise Chrome (Android) ou Safari (iPhone). Depuis WhatsApp ou Facebook : « Ouvrir dans le navigateur ». Sinon garde la page en favori : ça marche aussi."],
           ["J'ai oublié mon code PIN", "Page de connexion > « Code PIN oublié » > attends le code par WhatsApp > choisis un nouveau PIN."],
           ["Mon compte est bloqué", "Trop d'essais ratés : attends un peu, puis réessaie. Sinon, utilise « Code PIN oublié »."],
           ["Les vidéos sont lentes", "Vérifie ta connexion (Wi-Fi ou données), ferme les autres applications, puis rouvre KOMYO."],
           ["La caméra ne s'ouvre pas", "Autorise la caméra et le micro quand le téléphone le demande (réglages du navigateur)."],
           ["J'ai payé mais rien ne s'est activé", "Le paiement doit être <b>exact</b> et confirmé par l'équipe, en général dans la journée. Écris-nous avec ton numéro et l'heure du paiement."],
           ["Ma vidéo n'apparaît pas", "Une vidéo pour enfants est vérifiée avant publication. Pour les autres, vérifie ta connexion et réessaie."]], [60, 110])
S_ += [Paragraph("Nous contacter", H2), Paragraph("E-mail : <b>contact@starentreprise.com</b> — formulaire de contact sur la page d'accueil de KOMYO (bientôt) — WhatsApp du groupe STAR ENTREPRISE.", B)]
S_ += box("Garde ce guide dans ton téléphone ou imprime-le. Partage-le avec ta famille et tes amis : plus il y a de monde sur KOMYO, plus tes vidéos sont vues.", 'tip')
S_ += [Spacer(1, 10), Paragraph('<font color="#6b5f80">KOMYO — Apprendre · Créer · Partager. Conçu et créé par STAR ENTREPRISE.</font>', ParagraphStyle('end', parent=B, alignment=1))]

doc = BaseDocTemplate(OUT, pagesize=A4, title="KOMYO — Guide d'utilisation", author='STAR ENTREPRISE', subject="Guide d'utilisation de l'application KOMYO")
fr = Frame(20 * mm, 18 * mm, W - 40 * mm, H - 38 * mm, id='f', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id='cover', frames=[Frame(0, 0, 1, 1)], onPage=cover), PageTemplate(id='inner', frames=[fr], onPage=inner)])
story = [NextPageTemplate('inner')] + S_
doc.build(story)
print('ok', OUT)
