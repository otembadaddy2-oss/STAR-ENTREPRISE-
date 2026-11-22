#!/usr/bin/env python3
"""Fiches A4 des 21 filiales : visuel/logo de la filiale EN TÊTE, logo officiel STAR ENTREPRISE EN BAS.
Sortie : docs/fiches-filiales/<nom>.pdf + STAR-ENTREPRISE-Carnet-des-21-filiales.pdf
Prérequis : decouvrir/img prêt (tools/fabrique-decouvrir-medias.py)."""
import os, re, sys, subprocess, html, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
exec(open(ROOT + '/tools/decouvrir-donnees.py', encoding='utf-8').read())
OUT = ROOT + '/docs/fiches-filiales/'; os.makedirs(OUT, exist_ok=True)
TMP = OUT + '_html/'; os.makedirs(TMP, exist_ok=True)
E = html.escape
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', s.lower()).encode('ascii', 'ignore').decode()).strip('-')
SRC = ROOT + '/decouvrir/img/'; IMG = OUT + '_img/'; os.makedirs(IMG, exist_ok=True)
from PIL import Image
for n in os.listdir(SRC):  # JPEG allégés (PDF légers) ; les logos à transparence restent en PNG
    if not n.endswith('.webp'): continue
    im = Image.open(SRC + n); b = n[:-5]
    if n in ('logo-star.webp', 'mark.webp'): im.save(IMG + b + '.png')
    else:
        im = im.convert('RGB'); im.thumbnail((1000, 1000)); im.save(IMG + b + '.jpg', quality=78)
FONT = ROOT + '/decouvrir/polices/'
CSS = f"""
@font-face{{font-family:ID;font-weight:300;src:url(file://{FONT}inter-display-300.woff2)}}
@font-face{{font-family:ID;font-weight:600;src:url(file://{FONT}inter-display-600.woff2)}}
@font-face{{font-family:ID;font-weight:800;src:url(file://{FONT}inter-display-800.woff2)}}
@page{{size:A4;margin:0}}*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:210mm;height:297mm}}body{{font-family:ID,sans-serif;font-weight:300;color:#1b1f2b;background:#fff;position:relative}}
.top{{height:118mm;position:relative;overflow:hidden;background:#07090f}}
.top img.v{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.top.logo-noir{{background:#050505}}.top.logo-blanc{{background:#fff}}.top.logo-noir img.v,.top.logo-blanc img.v,.top.affiche img.v{{object-fit:contain;padding:10mm}}
.top.affiche{{background:#0b1226}}
.top.art{{background:radial-gradient(70% 70% at 50% 45%,#16306e,#070b18);display:grid;place-items:center}}
.top.art-mbote{{background:radial-gradient(70% 70% at 50% 45%,#5a3a07,#0b0a05)}}
.top.art img{{width:46mm;filter:drop-shadow(0 0 14px #e3b653)}}
.band{{height:3mm;background:linear-gradient(90deg,#b98a2c,#ffe29a,#b98a2c)}}
.corps{{padding:12mm 16mm 0}}
.rub{{font-weight:600;font-size:9pt;letter-spacing:.22em;text-transform:uppercase;color:#a77a1c}}
h1{{font-weight:800;font-size:30pt;line-height:1.05;letter-spacing:-.02em;margin:3mm 0 5mm}}
.desc{{font-size:13.5pt;line-height:1.5;color:#3a4052;max-width:150mm}}
.blocs{{display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:10mm}}
.bloc{{border:.3mm solid #e3c98a;border-radius:3mm;padding:5mm}}
.bloc b{{display:block;font-weight:600;font-size:9pt;letter-spacing:.14em;text-transform:uppercase;color:#a77a1c;margin-bottom:2mm}}
.bloc p{{font-size:11pt;line-height:1.45;color:#3a4052}}
.pied{{position:absolute;left:0;right:0;bottom:0;height:46mm;background:#07090f;color:#f6f1e6;display:flex;align-items:center;gap:8mm;padding:0 16mm}}
.pied img{{width:30mm;height:30mm;object-fit:contain}}
.pied .t b{{display:block;font-weight:800;letter-spacing:.28em;font-size:12pt;color:#ffe29a}}
.pied .t span{{display:block;font-size:9.5pt;color:#c9ccd8;margin-top:1.5mm}}
.pied small{{display:block;font-size:7pt;color:#8d93a6;margin-top:3mm;max-width:105mm}}
"""
def fiche(i, f):
    nom, rub, txt, img, mode, page = f
    if mode.startswith('art-'):
        tete = f'<div class="top art {mode}"><img src="file://{IMG}mark.png"></div>'
    else:
        tete = f'<div class="top {mode}"><img class="v" src="file://{IMG}{img}.jpg"></div>'
    return f"""<!doctype html><meta charset=utf-8><style>{CSS}</style>
{tete}<div class="band"></div>
<div class="corps"><div class="rub">{E(rub)} · filiale de STAR ENTREPRISE</div><h1>{E(nom)}</h1><p class="desc">{E(txt)}</p>
<div class="blocs">
<div class="bloc"><b>Nous contacter</b><p>WhatsApp service client<br><strong>+242 06 656 50 50</strong><br>contact@starentreprise.com</p></div>
<div class="bloc"><b>Où nous trouver</b><p>Brazzaville · Pointe-Noire<br>République du Congo<br>starentreprise.com/{page}</p></div>
<div class="bloc"><b>À compléter avec Carry</b><p>Services détaillés, tarifs, horaires, adresse précise, photos et vidéos de la filiale.</p></div>
<div class="bloc"><b>Fiche n°</b><p>{i+1:02d} / {len(FILIALES)} — version 0 du 21/11/2026</p></div></div></div>
<div class="pied"><img src="file://{IMG}logo-star.png"><div class="t"><b>STAR ENTREPRISE</b><span>Un seul groupe, toutes les solutions pour votre vie.</span><small>© 2026 STAR ENTREPRISE — Tous droits réservés. Reproduction interdite sans autorisation écrite.</small></div></div>"""
js = ["const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"]
for i, f in enumerate(FILIALES):
    h = TMP + f'{i+1:02d}-{slug(f[0])}.html'; open(h, 'w', encoding='utf-8').write(fiche(i, f))
    js.append(f"await p.goto('file://{h}');await p.waitForTimeout(400);await p.pdf({{path:'{OUT}{i+1:02d}-{slug(f[0])}.pdf',format:'A4',printBackground:true}});")
js.append("await b.close()})();")
open(TMP + 'run.cjs', 'w').write('\n'.join(js))
subprocess.run(['node', TMP + 'run.cjs'], check=True, env={**os.environ, 'NODE_PATH': subprocess.check_output(['npm', 'root', '-g']).decode().strip()})
fich = sorted(OUT + x for x in os.listdir(OUT) if x.endswith('.pdf') and x[0].isdigit())
subprocess.run(['pdfunite'] + fich + [OUT + 'STAR-ENTREPRISE-Carnet-des-21-filiales.pdf'], check=True)
import shutil; shutil.rmtree(TMP); shutil.rmtree(IMG)
print(len(FILIALES), 'fiches +', 'carnet', os.path.getsize(OUT + 'STAR-ENTREPRISE-Carnet-des-21-filiales.pdf') // 1024, 'Ko')
