"""Fabrique une fausse photo de document (feuille A4 en perspective sur une table en bois) pour tester STAR Scanner."""
import os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
random.seed(3)
W, H = 1600, 1200
bg = Image.new('RGB', (W, H), (120, 90, 60)); d = ImageDraw.Draw(bg)
for i in range(0, H, 14):
    d.line([(0, i), (W, i + random.randint(-6, 6))], fill=(110 + random.randint(0, 20), 82 + random.randint(0, 15), 54), width=3)
feuille = Image.new('RGB', (600, 850), (246, 244, 238)); fd = ImageDraw.Draw(feuille)
try:
    f = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf', 44); g = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Regular.otf', 26)
except Exception:
    f = g = ImageFont.load_default()
fd.text((40, 40), 'CONTRAT DE TEST', font=f, fill=(10, 10, 40))
for i in range(18):
    fd.text((40, 130 + i * 36), 'Ligne de texte numero %d : STAR ENTREPRISE Brazzaville' % (i + 1), font=g, fill=(30, 30, 30))
fd.rectangle([40, 780, 300, 820], outline=(0, 0, 0), width=3)
coef = (1, 0.12, -30, 0.05, 1, -10, 0.00012, 0.00008)
page = feuille.transform((W, H), Image.PERSPECTIVE, coef, Image.BICUBIC)
masque = Image.new('L', feuille.size, 255).transform((W, H), Image.PERSPECTIVE, coef, Image.BICUBIC)
bg.paste(page, (230, 120), masque)
bg = bg.filter(ImageFilter.GaussianBlur(0.6))
bg.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'photo-test.jpg'), quality=88)
print(bg.size)
