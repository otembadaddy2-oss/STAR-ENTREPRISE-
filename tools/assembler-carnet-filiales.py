#!/usr/bin/env python3
"""Assemble le carnet général des 21 filiales (couverture + index + tous les dossiers) et range les PDF par filiale.
Usage : python3 tools/assembler-carnet-filiales.py <dossier des dossiers générés> <dossier de sortie>
Entrées : <dossiers générés>/<clé>/*.pdf (20 filiales) + docs/documents-filiales/ (LIBOKÉ)."""
import os, sys, io, re, shutil, subprocess, base64, tempfile, zipfile, html
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEN, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
E = html.escape
ORDRE = [('liboke', 'LIBOKÉ Épargne + Santé'), ('clinique', 'Clinique Havre de Vie'), ('vital', 'STAR VITAL'), ('immo', 'STAR IMMO'), ('pamep', 'STAR P.A.M.E.P'),
         ('galerie', 'STAR Galerie Meubles'), ('decobaby', 'STAR Déco Baby'), ('jet', 'STAR JET'), ('beach', 'STAR Beach Village'), ('wedding', 'STAR Beauty Wedding'),
         ('casa', 'STAR CASA'), ('trans', 'STAR TRANS'), ('express', 'STAR EXPRESS'), ('caros', 'STARCAROS'), ('carryo', 'CARRY.O AFRIQUE'), ('creat', 'STAR CRÉAT'),
         ('cleaning', 'STAR CLEANING'), ('grimpeurs', "Les P'tits Grimpeurs"), ('events', 'STAR EVENTS'), ('energie', 'STAR ÉNERGIE'), ('mbote', 'STAR MBOTÉ')]
slug = lambda s: re.sub(r'[^A-Za-z0-9]+', '-', s.replace('É', 'E').replace('é', 'e').replace('è', 'e').replace("'", '')).strip('-')
LIB = ROOT + '/docs/documents-filiales/'
def pages(p): return int(re.search(r'Pages:\s+(\d+)', subprocess.check_output(['pdfinfo', p]).decode()).group(1))

dossiers = {}   # clé -> [pdf du dossier complet]
for i, (cle, nom) in enumerate(ORDRE, 1):
    dest = os.path.join(OUT, 'Par-filiale', f'{i:02d}-{slug(nom)}'); os.makedirs(dest, exist_ok=True)
    if cle == 'liboke':
        src = [LIB + 'LIBOKE-Epargne-Sante-fiche-complete.pdf'] + sorted(os.path.join(LIB + 'liboke-formulaires', f) for f in os.listdir(LIB + 'liboke-formulaires') if re.match(r'0\d-', f))
        for s in src: shutil.copy(s, dest)
        dossiers[cle] = [LIB + 'LIBOKE-Epargne-Sante-fiche-complete.pdf', LIB + 'liboke-formulaires/LIBOKE-dossier-complet-7-fiches.pdf']
    else:
        d = os.path.join(GEN, cle); fich = sorted(os.listdir(d))
        for f in fich: shutil.copy(os.path.join(d, f), dest)
        dossiers[cle] = [os.path.join(d, f) for f in fich if 'dossier-complet' in f]

# index : pages de départ (couverture = 1 page)
debut = 2; lignes = []
for i, (cle, nom) in enumerate(ORDRE, 1):
    n = sum(pages(p) for p in dossiers[cle]); lignes.append((i, nom, debut, n)); debut += n
total = debut - 1

FONT = ROOT + '/decouvrir/polices/'
def durl(b, m): return f'data:{m};base64,' + base64.b64encode(b).decode()
Z = zipfile.ZipFile(ROOT + '/docs/archives/STAR-ENTREPRISE-site-officiel-hostinger-2026-11-23-CORRIGE-FINAL-SANS-SECRETS.zip')
lg = Image.open(io.BytesIO(Z.read('images/logo-star-entreprise.jpg'))).convert('RGB'); lg.thumbnail((700, 700))
b = io.BytesIO(); lg.save(b, 'JPEG', quality=88); LOGO = durl(b.getvalue(), 'image/jpeg')
cs = [lg.getpixel(p) for p in [(3, 3), (lg.width - 4, 3), (3, lg.height - 4), (lg.width - 4, lg.height - 4)]]
BG = '#%02x%02x%02x' % tuple(sum(c[i] for c in cs) // 4 for i in range(3))
rows = ''.join(f'<div class="r"><span class="n">{i:02d}</span><span class="t">{E(nom)}</span><span class="d"></span><span class="p">p. {d}</span></div>' for i, nom, d, n in lignes)
H = f"""<!doctype html><meta charset=utf-8><style>
@font-face{{font-family:ID;font-weight:300;src:url(file://{FONT}inter-display-300.woff2)}}
@font-face{{font-family:ID;font-weight:600;src:url(file://{FONT}inter-display-600.woff2)}}
@font-face{{font-family:PF;font-weight:800;src:url(file://{FONT}playfair-display-latin-800-normal.woff2)}}
@font-face{{font-family:PF;font-weight:700;font-style:italic;src:url(file://{FONT}playfair-display-latin-700-italic.woff2)}}
@font-face{{font-family:CG;font-weight:500;font-style:italic;src:url(file://{FONT}cormorant-garamond-latin-500-italic.woff2)}}
@page{{size:A4;margin:0}}*{{box-sizing:border-box;margin:0;padding:0}}body{{width:210mm;height:297mm;font-family:ID,sans-serif;font-weight:300;color:#1b1f2b;position:relative;overflow:hidden}}
.top{{height:92mm;background:{BG};display:flex;align-items:center;justify-content:center}}.top img{{height:84mm}}
.band{{height:3mm;background:linear-gradient(90deg,#b98a2c,#ffe29a 50%,#b98a2c)}}
h1{{font-family:PF,serif;font-weight:800;font-size:25pt;color:#041030;text-align:center;margin-top:9mm}}h1 em{{font-style:italic;color:#a77a1c}}
.sub{{font-family:CG,serif;font-style:italic;font-weight:500;font-size:12pt;color:#4a5068;text-align:center;margin:1.6mm 0 6mm}}
.idx{{margin:0 22mm}}.r{{display:flex;align-items:baseline;gap:3mm;padding:1.5mm 0;border-bottom:.2mm solid #eee3c3;font-size:9.4pt}}
.r .n{{font-weight:600;color:#a77a1c;width:7mm}}.r .t{{font-weight:600;color:#041030}}.r .d{{flex:1}}.r .p{{color:#6a6f82}}
.pied{{position:absolute;left:0;right:0;bottom:0;height:18mm;background:#041030;color:#d8dcec;text-align:center;font-size:7.6pt;padding-top:5.5mm;letter-spacing:.05em}}
.pied b{{color:#ffe29a;letter-spacing:.24em}}
</style>
<div class="top"><img src="{LOGO}"></div><div class="band"></div>
<h1>Les 21 filiales <em>de STAR ENTREPRISE</em></h1><div class="sub">Fiches de présentation et fiches à remplir · {total} pages · édition du 24 novembre 2026</div>
<div class="idx">{rows}</div>
<div class="pied"><b>STAR ENTREPRISE</b> · Une seule entreprise, toutes les solutions pour votre vie.<br>© 2026 STAR ENTREPRISE — Tous droits réservés · contact@starentreprise.com · +242 06 656 50 50</div>"""
tmp = tempfile.mkdtemp(); open(tmp + '/c.html', 'w', encoding='utf-8').write(H)
cover = tmp + '/couverture.pdf'
open(tmp + '/c.cjs', 'w').write(f"const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://{tmp}/c.html');await p.waitForTimeout(400);await p.pdf({{path:'{cover}',format:'A4',printBackground:true,preferCSSPageSize:true}});await b.close()}})();")
subprocess.run(['node', tmp + '/c.cjs'], check=True, env={**os.environ, 'NODE_PATH': subprocess.check_output(['npm', 'root', '-g']).decode().strip()})
liste = [cover]
for cle, nom in ORDRE: liste += dossiers[cle]
carnet = os.path.join(OUT, 'STAR-ENTREPRISE-Carnet-des-21-filiales.pdf')
subprocess.run(['pdfunite'] + liste + [carnet], check=True)
print('carnet', pages(carnet), 'pages', os.path.getsize(carnet) // 1024, 'Ko')
for i, nom, d, n in lignes: print(f'{i:02d} {nom}: p.{d} ({n} pages)')
shutil.rmtree(tmp)
