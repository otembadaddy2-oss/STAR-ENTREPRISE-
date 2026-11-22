#!/usr/bin/env python3
"""Allège les images de decouvrir/img (visiteurs sur données mobiles, crédits Netlify = 20 crédits par Go).
Largeur max 860 px (1000 px pour les paysages), qualité 66. Les logos à transparence restent intacts.
À lancer APRÈS tools/fabrique-decouvrir-medias.py."""
import os
from PIL import Image
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/decouvrir/img/'
avant = apres = 0
for n in sorted(os.listdir(D)):
    if not n.endswith('.webp') or n in ('logo-star.webp', 'mark.webp'): continue
    p = D + n; t0 = os.path.getsize(p); avant += t0
    im = Image.open(p)
    if im.mode not in ('RGB',): im = im.convert('RGB')
    w = 1000 if im.width > im.height * 1.2 else 860
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(p, quality=66, method=6)
    if os.path.getsize(p) > t0: pass
    apres += os.path.getsize(p)
print(f'images : {avant//1024} Ko -> {apres//1024} Ko')
