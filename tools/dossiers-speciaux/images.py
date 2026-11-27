# Images des dossiers spéciaux : récupère (Unsplash, licence libre) et prépare les visuels. Les crédits sont listés dans les documents.
import os, io, urllib.request
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.environ.get('SPECIAUX_CACHE', '/tmp/dossiers-speciaux-cache'); os.makedirs(CACHE, exist_ok=True)
SITE = os.environ.get('SITE_DIR', '/tmp/site-officiel')
def unsplash(photo, w=900):
    p = f'{CACHE}/{photo}-{w}.jpg'
    if not os.path.exists(p):
        u = f'https://images.unsplash.com/photo-{photo}?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=82&w={w}'
        urllib.request.urlretrieve(u, p)
    return p
# (id Unsplash, auteur) — chaque photo est créditée dans le document
FEMMES = [  # n°, photo, nom de la coiffure, auteur
 ('F-01', '1658497730270-b5f4fef00ae1', 'Box braids longues', 'Jabari Timothy'),
 ('F-02', '1658497714148-eb009d3ea195', 'Chignon de box braids', 'Jabari Timothy'),
 ('F-03', '1690561115659-bfdb29e0007d', 'Tresses noires volumineuses', 'Ste Lorena'),
 ('F-04', '1762810548877-63512759805e', 'Tresses fines très longues', 'Luigi Ritchie'),
 ('F-05', '1770182023775-4706ce1bed72', 'Nattes collées et longue queue bouclée', 'Michael Kyule'),
 ('F-06', '1768489037970-601e0f2d50ba', 'Nattes collées ornées de cauris', 'Dwayne Joe'),
 ('F-07', '1774773132713-52f8f7825e63', 'Tresses à perles colorées', 'Michael Kyule'),
 ('F-08', '1527203561188-dae1bc1a417f', 'Queue de cheval tressée lisse', 'Jessica Felicio'),
 ('F-09', '1533674639815-52f8aea1b132', 'Chignon haut de tresses', 'Suad Kamardeen'),
 ('F-10', '1535588706069-af8f2d837332', 'Twists (vanilles)', 'Leighann Blackwood'),
 ('F-11', '1632765854612-9b02b6ec2b15', 'Afro naturel', 'Good Faces'),
 ('F-12', '1656473031961-9d5d9ee19f40', 'Boucles naturelles volumineuses', 'Jabari Timothy'),
]
FILLES = [
 ('E-01', '1759131844551-482e7affa5d7', 'Nattes collées vers le chignon', 'Mugabi Owen'),
 ('E-02', '1540429071038-04d88623bc9e', 'Natte sur le côté', 'Muhammad-Taha Ibrahim'),
 ('E-03', '1761370571919-0c99c0011d27', 'Tresses ornées de perles blanches', 'Muhammad-Taha Ibrahim'),
 ('E-04', '1672911734337-99b67318a340', 'Chignon de nattes', 'David Eluwole'),
 ('E-05', '1744973055670-e8ebb6261541', 'Longues tresses fines', 'Lisa Marie Theck'),
 ('E-06', '1785547217618-b3c40af30f4b', 'Tresses à perles multicolores', 'Gylain Omer'),
 ('E-07', '1614161080475-39e14c0b373a', 'Longues tresses, barrette et perles', 'Emmanuel Yeboah Okine'),
 ('E-08', '1572338643345-5783b4438538', 'Tresses à perles, petite fille', 'Gift Habeshaw'),
 ('E-09', '1754331542884-22aa334daed7', 'Coiffure bouffante avec barrette', 'Michael Kyule'),
 ('E-10', '1740509835004-d755aca66cca', 'Petit chignon bouclé avec barrette', 'Michael Kyule'),
]
BEACH_UNSPLASH = {'bungalows': ('1771526087519-ae6e37449c20', 'Jonathan Borba'), 'village': ('1780734323790-6f18edf42997', 'Irvin Liang'), 'resort': ('1790802044292-0c05834179c9', 'Luc L')}
def datauri(path, maxw=900, q=84, crop=None):
    im = Image.open(path).convert('RGB')
    if crop: im = im.crop(crop)
    if im.width > maxw: im = im.resize((maxw, int(im.height * maxw / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=q, optimize=True)
    import base64; return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
def panneau(nom, x0, y0, x1, y1, fois=2):
    """Découpe un panneau du collage officiel de STAR BEACH VILLAGE (agrandi, lissé)."""
    im = Image.open(f'{SITE}/images/star-beach-village-entree.jpg').convert('RGB').crop((x0, y0, x1, y1))
    im = im.resize((im.width * fois, im.height * fois), Image.LANCZOS)
    p = f'{CACHE}/panneau-{nom}.jpg'; im.save(p, quality=90); return p
