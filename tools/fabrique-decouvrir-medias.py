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
for k in ['burkina', 'dinnovation-btp', 'kindimbou', 'lamah-poster', 'lapinbio', 'pioupiou', 'sosdoc', 'staralerte', 'dinnovation-pressing']:
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
if '--video' in sys.argv: vid(R('assets/social/star-entreprise-video-wow-2026-08.mp4'), 'star-entreprise', 540, 960, 30)
if '--video' in sys.argv: vid(R('pilipili-events/assets/video/showreel.mp4'), 'events', 540, 960, 32, audio=False)
up = os.environ.get('XSAPHIR_INTRO', '')
if '--video' in sys.argv and up and os.path.exists(up):
    vid(up, 'xsaphir-intro', 960, 540, 29, audio=False)

kg = os.environ.get('KOMYO_GENERIQUE', '')
if '--video' in sys.argv and kg and os.path.exists(kg):
    vid(kg, 'komyo-generique', 540, 960, 31)

# ================= V2 : grandes images par filiale, univers X SAPHIR Arena, créations =================
def gal(src, name, w=1200, q=80): img(src, name, w, q)
ZI = lambda f: Z + f
V2 = {
 'g-liboke-social': ZI('liboke-accompagnement-social-des-familles.jpg'), 'g-clinique-logo': ZI('logo-clinique-havre-de-vie.jpg'),
 'g-immo-chambre': ZI('mobilier-residentiel-chambre.jpg'), 'g-meubles-chambre': ZI('mobilier-residentiel-chambre.jpg'),
 'g-decobaby-ours': ZI('0002.jpg'), 'g-jet-2': ZI('showcase-new.jpg'),
 'g-beach-panorama': ZI('vue-de-star-beach-village-bord-de-mer-a-pointe-noire.jpg'),
 'g-wedding-mariee': ZI('0006.jpg'), 'g-wedding-cortege': ZI('0007.jpg'), 'g-wedding-m1': ZI('M1.jpg'), 'g-wedding-m2': ZI('M2.jpg'), 'g-wedding-5': ZI('star-beauty-wedding-5.jpg'),
 'g-casa-coiffure': ZI('0008.jpg'), 'g-casa-tresses': ZI('0009.jpg'), 'g-casa-maquillage': ZI('0010.jpg'), 'g-casa-soin': ZI('0011.jpg'),
 'g-art-1': ZI('carryo-kaleidoscope.jpg'), 'g-art-2': ZI('carryo-racines.jpg'), 'g-art-3': ZI('carryo-elegance.jpg'), 'g-art-4': ZI('carryo-regard-sauvage.jpg'),
 'g-art-5': ZI('carryo-vibrations-d.jpg'), 'g-art-6': ZI('carryo-visages-multiples.jpg'), 'g-art-7': ZI('carryo-marche-de-couleurs.jpg'), 'g-art-8': ZI('carryo-eclats-d.jpg'),
 'g-creat-lamah': R('alpha/assets/img/carousel-branding.webp'), 'g-creat-services': R('alpha/assets/img/carousel-services.webp'),
 'g-creat-idees': R('alpha/assets/img/carousel-idees.webp'), 'g-creat-diamant': R('alpha/assets/img/carousel-diamant.webp'),
 'g-creat-cle': R('alpha/assets/img/carousel-cle.webp'), 'g-sarah': R('alpha/assets/img/carousel-equipe.webp'),
 'g-energie-carte': ZI('star-energie-carte.jpg'),
 # X SAPHIR Arena
 'ar-affiche-A': R('arena/img/realiste/affiche-A.webp'), 'ar-affiche-B': R('arena/img/realiste/affiche-B.webp'),
 'ar-film-pursuit': R('arena/img/realiste/affiche-film-pursuit.webp'), 'ar-legendes-1': R('arena/img/realiste/affiche-legendes-1.webp'),
 'ar-legendes-2': R('arena/img/realiste/affiche-legendes-2.webp'), 'ar-pursuit-1': R('arena/img/realiste/affiche-pursuit-1.webp'),
 'ar-pursuit-2': R('arena/img/realiste/affiche-pursuit-2.webp'),
 'ar-carte-calpros': R('arena/img/realiste/carte-calpros.webp'), 'ar-carte-nia': R('arena/img/realiste/carte-nia.webp'),
 'ar-carte-ayanda': R('arena/img/realiste/carte-ayanda.webp'), 'ar-carte-kormal': R('arena/img/realiste/carte-kormal.webp'),
 'ar-carte-nakata': R('arena/img/realiste/carte-nakata.webp'),
 'ar-concept-1': R('docs/arena/catalogue/references/arena-concept-jeu-aelys-zahra-noxia.png'),
 'ar-concept-2': R('docs/arena/catalogue/references/arena-affiche-raven-zara-luna.png'),
 'ar-luna': R('docs/arena/catalogue/references/arena-fiche-luna-blaze.png'),
}
for k, f in V2.items():
    try: gal(f, k, 1100 if k.startswith(('g-art', 'g-wedding', 'g-casa', 'ar-')) else 1000, 80)
    except Exception as e: print('ABSENT', k, e)
for f in ['playfair-display-latin-700-normal', 'playfair-display-latin-800-normal', 'playfair-display-latin-700-italic',
          'cormorant-garamond-latin-500-italic', 'cormorant-garamond-latin-600-italic', 'great-vibes-latin-400-normal']:
    for d in ['playfair-display', 'cormorant-garamond', 'great-vibes']:
        s = os.environ.get('FONTSOURCE', '') + f'/{d}/files/{f}.woff2'
        if os.path.exists(s): shutil.copy(s, ROOT + '/decouvrir/polices/'); print('police', f)
open(ROOT + '/decouvrir/polices/LICENCES.txt', 'a').write("\n- Playfair Display, Cormorant Garamond, Great Vibes (sous-ensembles latins, via Fontsource) : SIL Open Font License 1.1.\n")
# aperçus du jeu ASTRO QUEST (créé par STAR ENTREPRISE)
if S and os.path.isdir(S):
    for n, f in [('g-astro-regles', '2-regles.png'), ('g-astro-vol', '3-vol-ennemis.png'), ('g-astro-gardien', '4-jupiter-gardien.png')]:
        if os.path.exists(S + '/' + f): img(S + '/' + f, n, 700, 80)
