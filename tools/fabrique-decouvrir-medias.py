#!/usr/bin/env python3
"""Prépare les images et vidéos de la page « Découvrez qui est STAR ENTREPRISE » (dossier decouvrir/).
Usage : python3 tools/fabrique-decouvrir-medias.py <dossier images du site officiel (zip décompressé)>
Toutes les sources sont des créations de STAR ENTREPRISE (aucune image de tiers)."""
import sys, os, subprocess, shutil
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Z = sys.argv[1].rstrip('/') + '/'
OUT = ROOT + '/decouvrir/img/'
os.makedirs(OUT, exist_ok=True)

def img(src, name, w, q=80, alpha=False):
    im = Image.open(src)
    im = im.convert('RGBA' if alpha else 'RGB')
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(OUT + name + '.webp', quality=q, method=6)
    print(f'{name:28s} {im.size} {os.path.getsize(OUT + name + ".webp")//1024} Ko')

R = lambda p: ROOT + '/' + p
# --- identité
img(R('assets/img/branding/logo-star-transparent.png'), 'logo-star', 520, 88, True)
img(R('assets/img/branding/star-mark-gold.png'), 'mark', 200, 90, True)
img(Z + 'carry-otemba-fondateur-pdg.jpg', 'fondateur', 700, 82)
# --- filiales (photos / logos du site officiel)
F = {
 'liboke': 'liboke-epargne-sante-2.jpg', 'clinique': 'clinique-havre-de-vie.jpg', 'vital': 'star-vital-2.jpg',
 'catalogue-meubles': 'star-immo.png', 'pamep': 'star-pamep-2.jpg', 'meubles': 'mobilier-residentiel-salon.jpg',
 'decobaby': '0003.jpg', 'jet': 'star-jet-3.jpg', 'beach': 'star-beach-village-entree.jpg',
 'wedding': '0007.jpg', 'casa': '0008.jpg', 'trans': 'star-trans.jpg', 'express': 'star-express-2.jpg',
 'caros': 'starcaros.jpg', 'carryo': 'carryo-afrique-toile-de-carry-otemba.jpg', 'creat': 'star-creat-2.jpg',
 'grimpeurs': '0004.jpg', 'events': 'star-events-2.jpg', 'energie-logo': 'star-energie-2.jpg',
 'mariee': '0006.jpg', 'bebe-chambre': '0002.jpg', 'maternelle': '0001.jpg',
}
for k, f in F.items():
    img(Z + f, 'f-' + k, 1100, 78)
# retouches : la toile CARRY.O est une capture d'écran (barre d'état en haut) -> on la rogne
_c = Image.open(OUT + 'f-carryo.webp'); _c = _c.crop((0, round(_c.height * 0.145), _c.width, _c.height)); _c.save(OUT + 'f-carryo.webp', quality=80, method=6)
# --- KOMYO / Keydou / Salon / Énergie / X SAPHIR (affiches)
A = {
 'komyo-bienvenue': 'docs/komyo/KOMYO-affiche-bienvenue-sans-stores-HD.png',
 'komyo-5etapes': 'docs/komyo/KOMYO-affiche-installer-en-5-etapes.png',
 'komyo-famille': 'docs/komyo/KOMYO-affiche-toute-la-famille.png',
 'komyo-salon': 'docs/komyo/KOMYO-Salon-affiche.png',
 'keydou-compagnon': 'docs/komyo/KEYDOU-Compagnon-affiche.png',
 'komyo-whatsapp': 'docs/komyo/STAR-KOMYO-affiche-WhatsApp.png',
 'pioupiou-komyo': 'docs/komyo/AFFICHE-PIOUPIOU-KOMYO-enfants.png',
 'energie-affiche': 'docs/komyo/STAR-Energie-affiche-kit-solaire-v2.png',
 'xsaphir-10tomes': 'docs/komyo/AFFICHE-X-SAPHIR-10-tomes.png',
}
for k, f in A.items():
    img(R(f), 'a-' + k, 900, 78)
img(R('alpha/assets/img/livre-ombre-lumiere.webp'), 'livre', 760, 82)
for n in range(1, 11):
    img(R(f'docs/film/references/T{n:02d}-couverture.jpg'), f't{n:02d}', 520, 76)
for k, f in {'calpros': 'arena/img/realiste/calpros-idle.webp', 'kormal': 'arena/img/realiste/kormal-idle.webp',
             'nia': 'arena/img/realiste/nia-idle.webp', 'ayanda': 'arena/img/realiste/ayanda-idle.webp',
             'arena-saga': 'arena/img/realiste/affiche-film-saga.webp', 'arena-A': 'arena/img/realiste/affiche-A.webp',
             'arena-pursuit': 'arena/img/realiste/affiche-film-pursuit.webp'}.items():
    img(R(f), 'x-' + k, 760, 78)
# --- créations (portfolio du site)
for k in ['bissapop', 'burkina', 'dinnovation-btp', 'kindimbou', 'lamah-poster', 'lapinbio', 'pioupiou', 'sosdoc', 'staralerte', 'dinnovation-pressing']:
    img(R(f'assets/img/portfolio-{k}.webp'), 'c-' + k, 640, 76)
# --- jeu en cours
S = os.environ.get('ASTRO_APERCUS', '')
if S and os.path.exists(S + '/1-titre.png'):
    img(S + '/1-titre.png', 'g-astro', 700, 80)
# --- polices (Inter Display, SIL OFL)
for f in ['inter-display-300', 'inter-display-600', 'inter-display-800']:
    shutil.copy(R(f'jeu-astro/polices/{f}.woff2'), ROOT + '/decouvrir/polices/')
shutil.copy(R('jeu-astro/polices/LICENCES.txt'), ROOT + '/decouvrir/polices/')

# --- vidéos (propres créations STAR ENTREPRISE)
V = ROOT + '/decouvrir/video/'
def vid(src, name, w, h, crf, audio=True, t=None):
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', f'scale={w}:{h}:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2',
           '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
    cmd += ['-c:a', 'aac', '-b:a', '64k'] if audio else ['-an']
    subprocess.run(cmd + [V + name + '.mp4'], check=True)
    print(name, os.path.getsize(V + name + '.mp4') // 1024, 'Ko')
vid(R('assets/social/star-entreprise-video-wow-2026-08.mp4'), 'star-entreprise', 540, 960, 30)
vid(R('assets/video/pub-komyo-monde/pub-komyo-monde-v2-720p.mp4'), 'komyo-monde', 540, 960, 31)
vid(R('pilipili-events/assets/video/showreel.mp4'), 'events', 540, 960, 32, audio=False)
up = os.environ.get('XSAPHIR_INTRO', '')
if up and os.path.exists(up):
    vid(up, 'xsaphir-intro', 960, 540, 29, audio=False)
