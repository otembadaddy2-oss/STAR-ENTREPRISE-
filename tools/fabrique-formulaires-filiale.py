#!/usr/bin/env python3
"""Fiches à remplir (A4) d'une filiale de STAR ENTREPRISE.
Règles de mise en page demandées par Carry :
 - EN TÊTE : le logo de la filiale, AU CENTRE, bien visible et grand ;
 - EN BAS À DROITE de chaque document : le logo officiel STAR ENTREPRISE avec son slogan dessous,
   bien visible mais PLUS PETIT que le logo d'en-tête ;
 - cases et lignes de renseignements, couleurs STAR ENTREPRISE (bleu nuit, or, blanc).
Aucune règle commerciale inventée : les fiches ne contiennent ni prix, ni taux, ni montants.
Usage : python3 tools/fabrique-formulaires-filiale.py liboke [dossier de sortie]"""
import os, sys, io, zipfile, html, subprocess, base64, tempfile
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
exec(open(ROOT + '/tools/formulaires-liboke.py', encoding='utf-8').read())  # définit FILIALE et FORMS
OUT = sys.argv[2] if len(sys.argv) > 2 else ROOT + '/docs/documents-filiales/liboke-formulaires/'
os.makedirs(OUT, exist_ok=True)
E = html.escape
ZIP = ROOT + '/docs/archives/STAR-ENTREPRISE-site-officiel-hostinger-2026-11-23-CORRIGE-FINAL-SANS-SECRETS.zip'
FONT = ROOT + '/decouvrir/polices/'
SLOGAN = 'Une seule entreprise, toutes les solutions pour votre vie.'

def durl(b, mime): return f'data:{mime};base64,' + base64.b64encode(b).decode()
with zipfile.ZipFile(ZIP) as z:
    lg = Image.open(io.BytesIO(z.read(FILIALE['logo_zip']))).convert('RGB')
# couleur de fond du logo (coins) : l'en-tête prend exactement cette couleur, sans rectangle visible autour du logo
cs = [lg.getpixel(p) for p in [(4, 4), (lg.width - 5, 4), (4, lg.height - 5), (lg.width - 5, lg.height - 5)]]
BG = '#%02x%02x%02x' % tuple(sum(c[i] for c in cs) // 4 for i in range(3))
b = io.BytesIO(); lg.save(b, 'JPEG', quality=93); LOGO = durl(b.getvalue(), 'image/jpeg')
st = Image.open(ROOT + '/decouvrir/img/logo-star.webp').convert('RGBA'); b = io.BytesIO(); st.save(b, 'PNG'); STAR = durl(b.getvalue(), 'image/png')

CSS = f"""
@font-face{{font-family:ID;font-weight:300;src:url(file://{FONT}inter-display-300.woff2)}}
@font-face{{font-family:ID;font-weight:600;src:url(file://{FONT}inter-display-600.woff2)}}
@font-face{{font-family:ID;font-weight:800;src:url(file://{FONT}inter-display-800.woff2)}}
@font-face{{font-family:PF;font-weight:700;src:url(file://{FONT}playfair-display-latin-700-normal.woff2)}}
@font-face{{font-family:PF;font-weight:800;src:url(file://{FONT}playfair-display-latin-800-normal.woff2)}}
@font-face{{font-family:PF;font-weight:700;font-style:italic;src:url(file://{FONT}playfair-display-latin-700-italic.woff2)}}
@font-face{{font-family:CG;font-weight:500;font-style:italic;src:url(file://{FONT}cormorant-garamond-latin-500-italic.woff2)}}
@page{{size:A4;margin:0}}*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:ID,sans-serif;font-weight:300;color:#1b1f2b;width:210mm;background:#fff}}
.page{{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;background:#fff}}
.tete{{height:56mm;background:{BG};display:flex;align-items:center;justify-content:center}}
.tete img{{height:52mm;width:auto;display:block}}
.bande{{height:2.4mm;background:linear-gradient(90deg,#b98a2c,#ffe29a 50%,#b98a2c)}}
.titre{{display:flex;justify-content:space-between;align-items:flex-end;padding:3.6mm 14mm 0;gap:8mm}}
.titre .rub{{font-weight:600;font-size:7.5pt;letter-spacing:.24em;text-transform:uppercase;color:#a77a1c}}
.titre h1{{font-family:PF,serif;font-weight:800;font-size:20pt;line-height:1.05;color:#041030;margin-top:1mm}}
.titre h1 em{{font-style:italic;color:#a77a1c}}
.titre .sub{{font-family:CG,serif;font-style:italic;font-weight:500;font-size:10.5pt;color:#4a5068;margin-top:.8mm}}
.res{{flex:0 0 62mm;border:.35mm solid #b98a2c;border-radius:2mm;padding:1.8mm 3mm 2mm;background:#fffdf5}}
.res b{{display:block;font-weight:600;font-size:6.6pt;letter-spacing:.16em;text-transform:uppercase;color:#a77a1c;margin-bottom:.6mm}}
.res div{{display:flex;align-items:flex-end;gap:2mm;font-size:7pt;color:#6a6f82;margin-top:1.1mm}}
.res div i{{flex:1;border-bottom:.25mm solid #c9b57a;height:3.4mm}}
.corps{{padding:2mm 14mm 0}}
.sec{{display:flex;align-items:center;gap:2.4mm;margin:2.9mm 0 1.5mm}}
.sec span{{flex:0 0 5.2mm;height:5.2mm;border-radius:50%;background:#041030;color:#ffe29a;font-weight:800;font-size:8pt;display:grid;place-items:center}}
.sec h2{{font-family:PF,serif;font-weight:700;font-size:11.5pt;color:#041030}}
.sec:after{{content:"";flex:1;height:.3mm;background:linear-gradient(90deg,#e3c98a,transparent)}}
.g{{display:grid;grid-template-columns:repeat(12,1fr);gap:1.3mm 2.6mm}}
.f{{min-width:0}}
.f label{{display:block;font-weight:600;font-size:6.5pt;letter-spacing:.13em;text-transform:uppercase;color:#7a5a12;margin-bottom:.7mm}}
.f .bx{{border:.3mm solid #c9b57a;border-radius:1.4mm;background:#fffefa}}
.cb{{display:flex;flex-wrap:wrap;gap:1.2mm 4.2mm;align-items:center;min-height:6.4mm;padding:.2mm 0}}
.cb span{{display:inline-flex;align-items:center;gap:1.6mm;font-size:8.6pt;color:#262b3d;font-weight:600}}
.cb span:before{{content:"";width:3.7mm;height:3.7mm;border:.35mm solid #7a5a12;border-radius:.8mm;background:#fff;flex:0 0 auto}}
.note{{font-size:7.4pt;line-height:1.35;color:#4a5068;margin-top:1.6mm}}
.note b{{color:#041030;font-weight:600}}
table{{width:100%;border-collapse:collapse}}
th{{background:#041030;color:#ffe29a;font-weight:600;font-size:6.8pt;letter-spacing:.12em;text-transform:uppercase;padding:1.6mm 2mm;text-align:left;border:.3mm solid #041030}}
td{{border:.3mm solid #c9b57a;height:var(--lh,8mm);padding:0 2mm;font-size:8pt}}
tbody tr:nth-child(even) td{{background:#fbf7ea}}
.sig{{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:3mm;margin-top:2mm}}
.sig .z{{border:.3mm solid #c9b57a;border-radius:1.6mm;height:var(--sh,20mm);padding:1.6mm 2.4mm;background:#fffefa}}
.sig .z b{{display:block;font-weight:600;font-size:6.5pt;letter-spacing:.13em;text-transform:uppercase;color:#7a5a12}}
.pied{{position:absolute;left:0;right:0;bottom:0;height:36mm}}
.pied .l{{position:absolute;left:14mm;bottom:9mm;width:112mm;font-size:6.8pt;line-height:1.55;color:#6a6f82}}
.pied .l b{{display:block;font-weight:800;letter-spacing:.2em;font-size:7.4pt;color:#041030;margin-bottom:.6mm}}
.pied .l span{{display:block;margin-top:1.4mm;color:#a77a1c;font-weight:600;letter-spacing:.1em;text-transform:uppercase;font-size:6.4pt}}
.pied .r{{position:absolute;right:12mm;bottom:8.5mm;width:62mm;text-align:center}}
.pied .r img{{height:25mm;width:25mm;object-fit:contain;display:block;margin:0 auto}}
.pied .r p{{font-family:CG,serif;font-style:italic;font-weight:500;font-size:8.4pt;line-height:1.15;color:#041030;margin-top:1.2mm}}
.pied .ligne{{position:absolute;left:14mm;right:14mm;top:0;height:.35mm;background:linear-gradient(90deg,#b98a2c,#ffe29a,#b98a2c)}}
"""

def champ(label, span=12, h=6.2, contenu=''):
    return f'<div class="f" style="grid-column:span {span}"><label>{E(label)}</label><div class="bx" style="height:{h}mm">{contenu}</div></div>'
def cases(label, options, span=12):
    return f'<div class="f" style="grid-column:span {span}"><label>{E(label)}</label><div class="cb">{"".join(f"<span>{E(o)}</span>" for o in options)}</div></div>'
def lignes(label, n=3, span=12, h=7):
    return f'<div class="f" style="grid-column:span {span}"><label>{E(label)}</label>' + ''.join(f'<div style="border-bottom:.3mm solid #c9b57a;height:{h}mm"></div>' for _ in range(n)) + '</div>'
def section(num, titre, corps): return f'<div class="sec"><span>{num}</span><h2>{E(titre)}</h2></div><div class="g">{corps}</div>'
def table(cols, n, lh=8, largeurs=None):
    th = ''.join(f'<th{(" style=width:" + largeurs[i]) if largeurs else ""}>{E(c)}</th>' for i, c in enumerate(cols))
    return f'<table style="--lh:{lh}mm"><thead><tr>{th}</tr></thead><tbody>' + ''.join('<tr>' + '<td></td>' * len(cols) + '</tr>' for _ in range(n)) + '</tbody></table>'
def signatures(a='Signature du titulaire', b='Date et lieu', c='Visa et cachet LIBOKÉ', h=20):
    return f'<div class="sig" style="--sh:{h}mm"><div class="z"><b>{E(a)}</b></div><div class="z"><b>{E(b)}</b></div><div class="z"><b>{E(c)}</b></div></div>'
def reserve(items):
    return '<div class="res"><b>Réservé à LIBOKÉ</b>' + ''.join(f'<div>{E(x)}<i></i></div>' for x in items) + '</div>'

def page(f, n, total):
    return f"""<div class="page"><div class="tete"><img src="{LOGO}"></div><div class="bande"></div>
<div class="titre"><div><div class="rub">{E(FILIALE['nom'])} · filiale de STAR ENTREPRISE</div><h1>{f['titre']}</h1><div class="sub">{E(f['sous'])}</div></div>{reserve(f['reserve'])}</div>
<div class="corps">{f['corps']}</div>
<div class="pied"><div class="ligne"></div>
<div class="l"><b>{E(FILIALE['nom'].upper())}</b>Fiche {n} sur {total} · {E(f['court'])}<br>WhatsApp +242 06 656 50 50 · contact@starentreprise.com · www.starentreprise.com<span>© 2026 STAR ENTREPRISE — Tous droits réservés</span></div>
<div class="r"><img src="{STAR}"><p>{E(SLOGAN)}</p></div></div></div>"""

FORMS = make_forms(champ, cases, lignes, section, table, signatures)
tmp = tempfile.mkdtemp(); pdfs = []
env = {**os.environ, 'NODE_PATH': subprocess.check_output(['npm', 'root', '-g']).decode().strip()}
for i, f in enumerate(FORMS, 1):
    h = f'{tmp}/{i:02d}.html'
    open(h, 'w', encoding='utf-8').write(f'<!doctype html><meta charset=utf-8><style>{CSS}</style>' + page(f, i, len(FORMS)))
    pdf = os.path.join(OUT, f'{i:02d}-{f["fichier"]}.pdf'); pdfs.append(pdf)
    open(f'{tmp}/r{i}.cjs', 'w').write(f"const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://{h}');await p.waitForTimeout(500);const mm=await p.evaluate(()=>{{const px=96/25.4;const c=document.querySelector('.corps').getBoundingClientRect().bottom/px;const l=document.querySelector('.pied .l').getBoundingClientRect().top/px;const r=document.querySelector('.pied .r').getBoundingClientRect().top/px;return [Math.round(c),Math.round(Math.min(l,r))]}});console.log('contrôle fiche {i} : contenu finit à '+mm[0]+' mm, pied commence à '+mm[1]+' mm'+(mm[0]>mm[1]-1?'  <<< DÉBORDE':''));await p.pdf({{path:'{pdf}',format:'A4',printBackground:true,preferCSSPageSize:true}});await b.close()}})();")
    subprocess.run(['node', f'{tmp}/r{i}.cjs'], check=True, env=env)
dossier = os.path.join(OUT, f'{FILIALE["cle"].upper()}-dossier-complet-{len(FORMS)}-fiches.pdf')
subprocess.run(['pdfunite'] + pdfs + [dossier], check=True)
print('OK', len(FORMS), 'fiches +', os.path.basename(dossier), os.path.getsize(dossier) // 1024, 'Ko')
