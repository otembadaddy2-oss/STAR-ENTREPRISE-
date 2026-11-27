#!/usr/bin/env python3
"""Catalogue STAR CASA à partir des 8 planches fournies par Carry (images de référence, type Pinterest) :
chaque coiffure est numérotée (lettre de la planche + numéro), les bandeaux publicitaires d'un autre imprimeur sont remplacés par STAR CASA,
puis le catalogue est joint à la fiche de réservation à domicile. Usage : python3 tools/dossiers-speciaux/planches.py"""
import os, sys, subprocess
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
os.environ.setdefault('SPECIAUX_CACHE', '/tmp/dossiers-speciaux-cache')
FONT = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
CACHE = os.environ['SPECIAUX_CACHE']; os.makedirs(CACHE, exist_ok=True)
def badge(d, x, y, n, r=15):
    d.ellipse((x - r - 2, y - r - 2, x + r + 2, y + r + 2), fill=(255, 255, 255)); d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 214, 0))
    f = ImageFont.truetype(FONT, 17 if n < 100 else 14); t = str(n); w = d.textlength(t, font=f)
    d.text((x - w / 2, y - 10), t, font=f, fill=(20, 12, 0))
def grille(L, cols, rows, y0=0, h=None, x0=0, w=None, marge=19):
    im = Image.open(f'{HERE}/planches/{L}.jpg').convert('RGB'); d = ImageDraw.Draw(im)
    w = w or im.width; h = h or (im.height - y0); cw, ch = w / cols, h / rows; n = 0
    for r in range(rows):
        for c in range(cols):
            n += 1; badge(d, int(x0 + c * cw + marge), int(y0 + r * ch + marge), n)
    return im, n
def bandeau(im, box, titre, sous, fond, tdy=0.22):
    d = ImageDraw.Draw(im); d.rectangle(box, fill=fond); x0, y0, x1, y1 = box
    f1 = ImageFont.truetype(FONT, 26); f2 = ImageFont.truetype(FONT, 14)
    for txt, f, dy, col in [(titre, f1, tdy, (255, 214, 0)), (sous, f2, 0.66, (255, 255, 255))]:
        w = d.textlength(txt, font=f); d.text(((x0 + x1 - w) / 2, y0 + (y1 - y0) * dy), txt, font=f, fill=col)
PLANCHES = {}
# A : 4 colonnes x 5 lignes ; B : 3 x 3 (bandeau noir en haut) ; G et H : 3 x 3
im, n = grille('A', 4, 5); PLANCHES['A'] = (im, n, 'Twists, bantu knots et chignons')
im, n = grille('B', 3, 3, y0=25); PLANCHES['B'] = (im, n, 'Knotless braids et boucles')
# E : collage libre -> numéros posés sur chaque photo
E = Image.open(f'{HERE}/planches/E.jpg').convert('RGB'); dE = ImageDraw.Draw(E)
for i, (x, y) in enumerate([(22, 22), (176, 22), (372, 24), (492, 22), (18, 232), (172, 232), (334, 222), (482, 232), (18, 405), (164, 442), (339, 460), (509, 440),
                            (24, 582), (126, 700), (304, 680), (502, 658), (16, 832), (496, 838), (30, 1020), (132, 948), (306, 905), (496, 1050)], 1):
    badge(dE, x, y, i)
PLANCHES['E'] = (E, 22, 'Nattes collées modernes et boucles')
im, n = grille('G', 3, 3); PLANCHES['G'] = (im, n, 'Nattes, knotless et chignons')
im, n = grille('H', 3, 3); PLANCHES['H'] = (im, n, 'Nattes collées, tresses et boucles')
# C, D, F : affiches déjà numérotées -> on garde les numéros, on retire titre et coordonnées de l'autre imprimeur
C = Image.open(f'{HERE}/planches/C.jpg').convert('RGB').crop((0, 104, 736, 1042)); bandeau(C, (0, 880, 490, 938), 'STAR CASA', 'Coiffure à domicile · WhatsApp +242 06 656 50 50', (36, 16, 44), 0.04)
PLANCHES['C'] = (C, 29, 'Élégance : afro, chignons et nattes')
D = Image.open(f'{HERE}/planches/D.jpg').convert('RGB').crop((0, 118, 736, 1042)); PLANCHES['D'] = (D, 30, 'Beauty braids : boucles et nattes')
F = Image.open(f'{HERE}/planches/F.jpg').convert('RGB').crop((0, 118, 736, 1042)); bandeau(F, (244, 782, 486, 892), 'STAR CASA', 'WhatsApp +242 06 656 50 50', (60, 15, 70)); PLANCHES['F'] = (F, 31, 'African braids : nattes tirées en arrière')
OUTIMG = {}
for L, (im, n, t) in PLANCHES.items():
    p = f'{CACHE}/planche-{L}.jpg'; im.save(p, quality=92); OUTIMG[L] = p
TOTAL = sum(n for _, n, _ in PLANCHES.values())
if __name__ == '__main__':
    from PIL import Image as I
    ms = [I.open(OUTIMG[L]).resize((300, int(300 * I.open(OUTIMG[L]).height / I.open(OUTIMG[L]).width))) for L in 'ABCDEFGH']
    W = I.new('RGB', (1240, 1100), 'white'); x = y = 0
    for i, m in enumerate(ms): W.paste(m, ((i % 4) * 310, (i // 4) * 560))
    W.save(f'{CACHE}/planches-apercu.jpg'); print('total', TOTAL)
