#!/usr/bin/env python3
"""Télécharge les photos Unsplash (licence libre) retenues pour « Passeport Sûr », les convertit en WebP légers
et extrait le logo officiel STAR ENTREPRISE du zip du site officiel. Usage : python3 tools/photos-passeport-sur.py"""
import urllib.request, io, os, zipfile
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = ROOT + '/passeport-demo/img/'; os.makedirs(OUT, exist_ok=True)
PHOTOS = [  # fichier, identifiant photo, largeur
    ('brazzaville-esplanade', '1719851851994-51013662597f', 1700),
    ('brazzaville-ville', '1719851852409-ccf04bd38464', 1500),
    ('batiment-rond', '1719851852005-6b38b767d847', 1400),
    ('passeport-visas', '1655722725332-9925c96dd627', 1500),
    ('empreinte', '1585079374502-415f8516dcc3', 1500),
    ('aeroport', '1787839137485-da1cc270d970', 1500)]
for nom, ident, w in PHOTOS:
    data = urllib.request.urlopen(f'https://images.unsplash.com/photo-{ident}?fm=jpg&q=82&w={w}').read()
    im = Image.open(io.BytesIO(data)).convert('RGB'); im.save(OUT + nom + '.webp', 'WEBP', quality=74, method=6)
    print(nom, im.size, os.path.getsize(OUT + nom + '.webp') // 1024, 'Ko')
# logo officiel STAR ENTREPRISE (fond bleu nuit du logo conservé)
z = zipfile.ZipFile(ROOT + '/docs/archives/STAR-ENTREPRISE-site-officiel-hostinger-2026-11-23-CORRIGE-FINAL-SANS-SECRETS.zip')
lg = Image.open(io.BytesIO(z.read('images/logo-star-entreprise.jpg'))).convert('RGB')
m = int(min(lg.size) * 0.02); lg = lg.crop((m, m, lg.width - m, lg.height - m)); lg.thumbnail((700, 700))
lg.save(OUT + 'star-entreprise.webp', 'WEBP', quality=90)
c = [lg.getpixel(p) for p in [(3, 3), (lg.width - 4, 3), (3, lg.height - 4), (lg.width - 4, lg.height - 4)]]
print('logo STAR', lg.size, 'fond', '#%02x%02x%02x' % tuple(sum(x[i] for x in c) // 4 for i in range(3)))
