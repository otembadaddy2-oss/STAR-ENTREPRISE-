"""Images d'aperçu (1200x630) pour le partage WhatsApp / Facebook de TERRAIN SÛR et CHECK-IN STAR. Lancer : /usr/bin/python3.12 tools/fabrique-apercus-partage.py"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SER = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'; SAN = '/usr/share/fonts/opentype/inter/Inter-Regular.otf'
def fonte(p, n):
    try: return ImageFont.truetype(p, n)
    except Exception: return ImageFont.load_default()
def apercu(photo, logo, titre, sous, sortie, accent=(242, 210, 122)):
    W, H = 1200, 630; im = Image.open(photo).convert('RGB'); k = max(W / im.width, H / im.height); im = im.resize((int(im.width * k), int(im.height * k))); im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
    ov = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(ov)
    for y in range(H):
        a = int(235 * (y / H) ** 1.2 + 25); d.line([(0, y), (W, y)], fill=(10, 23, 48, min(240, a)))
    im = Image.alpha_composite(im.convert('RGBA'), ov); d = ImageDraw.Draw(im)
    lg = Image.open(logo).convert('RGBA').resize((120, 120)); im.alpha_composite(lg, (60, 50))
    d.text((200, 70), 'STAR ENTREPRISE', font=fonte(SAN, 30), fill=(223, 230, 250)); d.text((200, 108), 'Brazzaville · République du Congo', font=fonte(SAN, 24), fill=(195, 205, 234))
    d.text((60, 340), titre, font=fonte(SER, 86), fill=accent)
    y = 465
    for ligne in sous: d.text((62, y), ligne, font=fonte(SAN, 36), fill=(255, 255, 255)); y += 50
    d.rounded_rectangle((60, 585, 380, 615), 10, fill=(31, 138, 76)); d.rectangle((380, 585, 700, 615), fill=(242, 194, 48)); d.rectangle((700, 585, 1140, 615), fill=(192, 57, 43))
    im.convert('RGB').save(sortie, quality=86); print(sortie, os.path.getsize(sortie) // 1024, 'Ko')
apercu(f'{R}/hotel-reception/img/hall.jpg', f'{R}/hotel-reception/icon-192.png', 'CHECK-IN STAR', ['Du passeport à la chambre, sans papier.', 'Réception d\'hôtel de luxe · démonstration'], f'{R}/hotel-reception/img/partage-check-in-star.jpg')
apercu(f'{R}/terrain-sur/img/piste.jpg', f'{R}/terrain-sur/icon-192.png', 'TERRAIN SÛR', ['Lire un terrain avant de construire.', 'Génie civil · chantiers sans fraude · démonstration'], f'{R}/terrain-sur/img/partage-terrain-sur.jpg')
