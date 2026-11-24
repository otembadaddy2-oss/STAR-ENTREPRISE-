#!/usr/bin/env python3
"""Document complet (A4, 2 pages) d'UNE filiale de STAR ENTREPRISE.
 - EN TÊTE : le logo de la filiale, pris dans la copie du site officiel (docs/archives/...zip)
 - EN BAS  : le logo officiel STAR ENTREPRISE (decouvrir/img/logo-star.webp)
Les textes viennent de la page officielle de la filiale (rien n'est inventé : pas de prix, pas de taux).
Usage : python3 tools/fabrique-document-filiale.py liboke  [dossier de sortie]
Ajouter une filiale = ajouter une entrée dans DOCS (tools/documents-filiales.py)."""
import os, sys, io, zipfile, html, subprocess, base64, tempfile
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
exec(open(ROOT + '/tools/documents-filiales.py', encoding='utf-8').read())  # définit DOCS
cle = sys.argv[1] if len(sys.argv) > 1 else 'liboke'
OUT = sys.argv[2] if len(sys.argv) > 2 else ROOT + '/docs/documents-filiales/'
os.makedirs(OUT, exist_ok=True)
d = DOCS[cle]; E = html.escape
ZIP = ROOT + '/docs/archives/STAR-ENTREPRISE-site-officiel-hostinger-2026-11-23-CORRIGE-FINAL-SANS-SECRETS.zip'
FONT = ROOT + '/decouvrir/polices/'

def data_url(b, mime): return f'data:{mime};base64,' + base64.b64encode(b).decode()
with zipfile.ZipFile(ZIP) as z:
    lg = Image.open(io.BytesIO(z.read(d['logo_zip']))).convert('RGB')
bio = io.BytesIO(); lg.save(bio, 'JPEG', quality=92); LOGO = data_url(bio.getvalue(), 'image/jpeg')
st = Image.open(ROOT + '/decouvrir/img/logo-star.webp').convert('RGBA'); bio = io.BytesIO(); st.save(bio, 'PNG'); STAR = data_url(bio.getvalue(), 'image/png')

def li(items): return ''.join(f'<li>{E(x)}</li>' for x in items)
def cartes(items): return ''.join(f'<div class="c"><b>{E(t)}</b><p>{E(p)}</p></div>' for t, p in items)
def etapes(items): return ''.join(f'<div class="e"><i>{n}</i><div><b>{E(t)}</b><p>{E(p)}</p></div></div>' for n, (t, p) in enumerate(items, 1))

CSS = f"""
@font-face{{font-family:ID;font-weight:300;src:url(file://{FONT}inter-display-300.woff2)}}
@font-face{{font-family:ID;font-weight:600;src:url(file://{FONT}inter-display-600.woff2)}}
@font-face{{font-family:ID;font-weight:800;src:url(file://{FONT}inter-display-800.woff2)}}
@font-face{{font-family:PF;font-weight:700;src:url(file://{FONT}playfair-display-latin-700-normal.woff2)}}
@font-face{{font-family:PF;font-weight:700;font-style:italic;src:url(file://{FONT}playfair-display-latin-700-italic.woff2)}}
@page{{size:A4;margin:0}}*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:ID,sans-serif;font-weight:300;color:#1b1f2b;background:#fff;width:210mm}}
.page{{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;background:#fff}}
.tete{{height:78mm;background:#050505;display:flex;align-items:center;justify-content:center;position:relative}}
.tete img{{height:70mm;width:auto}}
.tete.p2{{height:32mm}}.tete.p2 img{{height:29mm}}
.bande{{height:2.6mm;background:linear-gradient(90deg,#b98a2c,#ffe29a,#b98a2c)}}
.corps{{padding:7.5mm 16mm 0}}
.rub{{font-weight:600;font-size:8.5pt;letter-spacing:.22em;text-transform:uppercase;color:#a77a1c}}
h1{{font-family:PF,serif;font-weight:700;font-size:28pt;line-height:1.05;margin:2mm 0 3mm;color:#07122e}}
h1 em{{font-style:italic;color:#a77a1c}}
.intro{{font-size:11.5pt;line-height:1.5;color:#33394b}}
h2{{font-weight:800;font-size:9.5pt;letter-spacing:.2em;text-transform:uppercase;color:#07122e;margin:5.5mm 0 2.6mm;display:flex;align-items:center;gap:3mm}}
h2:after{{content:"";flex:1;height:.3mm;background:#e3c98a}}
.cartes{{display:grid;grid-template-columns:1fr 1fr;gap:3.5mm}}
.c{{border:.3mm solid #e3c98a;border-radius:2.5mm;padding:3.8mm 4.2mm;background:#fffdf7}}
.c b{{display:block;font-weight:600;font-size:10pt;color:#07122e;margin-bottom:1mm}}
.c p{{font-size:10pt;line-height:1.4;color:#3a4052}}
.formules{{display:grid;grid-template-columns:repeat(3,1fr);gap:3.5mm}}
.f{{border-radius:3mm;padding:4.5mm;background:#07122e;color:#f6f1e6;min-height:38mm}}
.f b{{display:block;font-family:PF,serif;font-weight:700;font-size:12pt;color:#ffe29a;margin-bottom:1.5mm}}
.f p{{font-size:9.8pt;line-height:1.4;color:#d6dbea}}
.cite{{margin-top:6mm;padding:3.6mm 5mm;border-left:1.2mm solid #b98a2c;background:#f7f2e4;font-family:PF,serif;font-style:italic;font-weight:700;font-size:11pt;line-height:1.45;color:#07122e}}
.cite span{{display:block;font-family:ID,sans-serif;font-style:normal;font-weight:600;font-size:8.5pt;letter-spacing:.14em;text-transform:uppercase;color:#a77a1c;margin-top:2mm}}
.e{{display:flex;gap:4mm;margin-bottom:2.2mm;align-items:flex-start}}
.e i{{flex:0 0 8.5mm;height:8.5mm;border-radius:50%;background:#b98a2c;color:#fff;font-style:normal;font-weight:800;font-size:11pt;display:grid;place-items:center}}
.e b{{display:block;font-weight:600;font-size:10.5pt;color:#07122e}}.e p{{font-size:9.6pt;color:#3a4052;line-height:1.4}}
ul{{list-style:none}}li{{position:relative;padding-left:5.5mm;margin-bottom:2mm;font-size:10pt;line-height:1.4;color:#33394b}}
li:before{{content:"★";position:absolute;left:0;color:#b98a2c;font-size:8pt;top:.4mm}}
.deux{{display:grid;grid-template-columns:1fr 1fr;gap:6mm}}
.don{{margin-top:3.5mm;border-radius:3mm;padding:4mm 5mm;background:#f7f2e4;border:.3mm solid #e3c98a}}
.don b{{font-weight:800;font-size:10pt;color:#07122e}}.don p{{font-size:9.6pt;line-height:1.45;color:#3a4052;margin-top:1mm}}
.don strong{{color:#07122e}}
.contact{{margin-top:0;display:grid;grid-template-columns:repeat(3,1fr);gap:3.5mm}}
.pied{{position:absolute;left:0;right:0;bottom:0;height:34mm;background:#041030;color:#f6f1e6;display:flex;align-items:center;gap:7mm;padding:0 16mm}}
.pied img{{width:23mm;height:23mm;object-fit:contain}}
.pied .t b{{display:block;font-weight:800;letter-spacing:.26em;font-size:11pt;color:#ffe29a}}
.pied .t span{{display:block;font-size:9pt;color:#c9ccd8;margin-top:1mm}}
.pied small{{display:block;font-size:6.8pt;color:#8d93a6;margin-top:2.2mm}}
.pied .n{{margin-left:auto;font-size:8pt;color:#8d93a6}}
"""
pied = lambda n: f"""<div class="pied"><img src="{STAR}"><div class="t"><b>STAR ENTREPRISE</b><span>Une seule entreprise, toutes les solutions pour votre vie.</span><small>© 2026 STAR ENTREPRISE — Tous droits réservés · starentreprise.com · contact@starentreprise.com</small></div><div class="n">{d['nom']} · {n}/2</div></div>"""

html_doc = f"""<!doctype html><meta charset=utf-8><style>{CSS}</style>
<div class="page"><div class="tete"><img src="{LOGO}"></div><div class="bande"></div>
<div class="corps"><div class="rub">{E(d['rub'])} · filiale de STAR ENTREPRISE</div>
<h1>{d['titre_html']}</h1><p class="intro">{E(d['intro'])}</p>
<h2>{E(d['pourquoi_titre'])}</h2><div class="cartes">{cartes(d['pourquoi'])}</div>
<h2>{E(d['formules_titre'])}</h2><div class="formules">{''.join(f'<div class="f"><b>{E(t)}</b><p>{E(p)}</p></div>' for t, p in d['formules'])}</div></div>{pied(1)}</div>
<div class="page"><div class="tete p2"><img src="{LOGO}"></div><div class="bande"></div>
<div class="corps"><div class="cite" style="margin-top:0">« {E(d['citation'])} »<span>{E(d['auteur'])}</span></div>
<h2>{E(d['etapes_titre'])}</h2>{etapes(d['etapes'])}
<div class="deux"><div><h2>{E(d['social_titre'])}</h2><ul>{li(d['social'])}</ul></div>
<div><h2>{E(d['engagement_titre'])}</h2>{''.join(f'<div class="c" style="margin-bottom:2.4mm;padding:3mm 3.8mm"><b>{E(t)}</b><p>{E(p)}</p></div>' for t, p in d['engagement'])}</div></div>
<div class="don"><b>{E(d['don_titre'])}</b><p>{E(d['don'])}</p></div>
<h2>{E(d['contact_titre'])}</h2><div class="contact">{cartes(d['contact'])}</div></div>{pied(2)}</div>"""

tmp = tempfile.mkdtemp(); h = tmp + '/doc.html'; open(h, 'w', encoding='utf-8').write(html_doc)
pdf = os.path.join(OUT, d['fichier'] + '.pdf')
js = f"const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://{h}');await p.waitForTimeout(500);await p.pdf({{path:'{pdf}',format:'A4',printBackground:true,preferCSSPageSize:true}});await b.close()}})();"
open(tmp + '/run.cjs', 'w').write(js)
subprocess.run(['node', tmp + '/run.cjs'], check=True, env={**os.environ, 'NODE_PATH': subprocess.check_output(['npm', 'root', '-g']).decode().strip()})
print('OK', pdf, os.path.getsize(pdf) // 1024, 'Ko')
