#!/usr/bin/env python3
"""Dossiers imprimables des filiales de STAR ENTREPRISE (A4) : une fiche de présentation + des fiches à remplir par métier.
Règles de Carry : logo de la filiale AU CENTRE en tête (grand) ; logo officiel STAR ENTREPRISE EN BAS À DROITE avec son slogan dessous,
plus petit que le logo d'en-tête ; cases et lignes à remplir ; couleurs STAR (bleu nuit, or, blanc) ; titres Playfair Display.
Les logos viennent de la copie du site officiel (docs/archives/...zip). Quand le site n'a pas de logo pour une filiale
(seulement des photos), un logo TYPOGRAPHIQUE (étoile dorée + nom) est dessiné à la place : à remplacer par le vrai logo quand Carry l'enverra.
Les textes viennent des pages officielles : aucun prix, taux ni règle inventés.
Usage : python3 tools/fabrique-dossiers-filiales.py [clé ...] [--sortie dossier]   (sans clé : toutes les filiales)"""
import os, sys, io, zipfile, html, subprocess, base64, tempfile, shutil
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]; OUT = ROOT + '/docs/documents-filiales/'
if '--sortie' in args: i = args.index('--sortie'); OUT = args[i + 1]; args = args[:i] + args[i + 2:]
E = html.escape
ZIP = ROOT + '/docs/archives/STAR-ENTREPRISE-site-officiel-hostinger-2026-11-23-CORRIGE-FINAL-SANS-SECRETS.zip'
FONT = ROOT + '/decouvrir/polices/'
SLOGAN = 'Une seule entreprise, toutes les solutions pour votre vie.'
def durl(b, mime): return f'data:{mime};base64,' + base64.b64encode(b).decode()
Z = zipfile.ZipFile(ZIP)
st = Image.open(ROOT + '/decouvrir/img/logo-star.webp').convert('RGBA'); st = st.resize((300, int(300 * st.height / st.width)), Image.LANCZOS); b = io.BytesIO(); st.save(b, 'PNG', optimize=True); STAR = durl(b.getvalue(), 'image/png')

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
.tete{{height:56mm;display:flex;align-items:center;justify-content:center;overflow:hidden}}
.tete img{{height:52mm;width:auto;display:block}}
.wm{{text-align:center;color:#fff;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:radial-gradient(60% 90% at 50% 45%,#10285f,#041030 70%)}}
.wm svg{{width:15mm;height:15mm;filter:drop-shadow(0 0 3mm rgba(255,200,70,.75))}}
.wm .n{{font-family:PF,serif;font-weight:800;font-size:33pt;letter-spacing:.07em;line-height:1.05;margin-top:1.4mm;text-shadow:0 1mm 4mm rgba(0,0,0,.5)}}
.wm .n b{{color:#ffd466;font-weight:800}}
.wm .l{{width:62mm;height:.5mm;margin:1.8mm 0 1.6mm;background:linear-gradient(90deg,transparent,#e3b653,transparent)}}
.wm .s{{font-weight:600;font-size:8.4pt;letter-spacing:.34em;text-transform:uppercase;color:#d9e3ff}}
.bande{{height:2.4mm;background:linear-gradient(90deg,#b98a2c,#ffe29a 50%,#b98a2c)}}
.titre{{display:flex;justify-content:space-between;align-items:flex-end;padding:3.6mm 14mm 0;gap:8mm}}
.titre .rub{{font-weight:600;font-size:7.5pt;letter-spacing:.24em;text-transform:uppercase;color:#a77a1c}}
.titre h1{{font-family:PF,serif;font-weight:800;font-size:20pt;line-height:1.08;color:#041030;margin-top:1mm}}
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
.prix{{height:10.5mm;border:.55mm solid #b98a2c;background:#fff6d8;display:flex;align-items:center;justify-content:flex-end;padding-right:3mm}}.prix i{{font-style:normal;font-weight:800;font-size:9pt;letter-spacing:.14em;color:#a77a1c}}
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
/* présentation */
.intro{{font-size:10.6pt;line-height:1.5;color:#33394b;margin-top:2.4mm}}
.cartes{{display:grid;grid-template-columns:1fr 1fr;gap:2.8mm}}
.cartes.t3{{grid-template-columns:1fr 1fr 1fr}}
.c{{border:.3mm solid #e3c98a;border-radius:2.5mm;padding:3mm 3.6mm;background:#fffdf7}}
.c b{{display:block;font-weight:600;font-size:9.6pt;color:#041030;margin-bottom:.8mm}}
.c p{{font-size:8.8pt;line-height:1.38;color:#3a4052}}
.sv{{border-radius:2.5mm;padding:3.2mm 3.6mm;background:#041030;color:#f6f1e6}}
.sv b{{display:block;font-family:PF,serif;font-weight:700;font-size:10.4pt;color:#ffe29a;margin-bottom:1mm}}
.sv p{{font-size:8.6pt;line-height:1.38;color:#d6dbea}}
.steps{{display:grid;grid-template-columns:repeat(4,1fr);gap:2.6mm}}
.st{{position:relative;padding:2.8mm 3mm 3mm;border-top:.9mm solid #b98a2c;background:#faf5e6;border-radius:0 0 2mm 2mm}}
.st i{{font-style:normal;font-weight:800;font-size:12pt;color:#b98a2c;font-family:PF,serif}}
.st b{{display:block;font-weight:600;font-size:9pt;color:#041030;margin:.4mm 0 .6mm}}.st p{{font-size:8pt;line-height:1.35;color:#3a4052}}
.cite{{padding:3.2mm 5mm;border-left:1.2mm solid #b98a2c;background:#f7f2e4;font-family:PF,serif;font-style:italic;font-weight:700;font-size:9.6pt;line-height:1.45;color:#041030}}
.cite span{{display:block;font-family:ID,sans-serif;font-style:normal;font-weight:600;font-size:7.4pt;letter-spacing:.14em;text-transform:uppercase;color:#a77a1c;margin-top:1.4mm}}
.contact{{display:grid;grid-template-columns:repeat(3,1fr);gap:2.8mm}}
"""

def champ(label, span=12, h=6.2, contenu=''):
    return f'<div class="f" style="grid-column:span {span}"><label>{E(label)}</label><div class="bx" style="height:{h}mm">{contenu}</div></div>'
def cases(label, options, span=12):
    return f'<div class="f" style="grid-column:span {span}"><label>{E(label)}</label><div class="cb">{"".join(f"<span>{E(o)}</span>" for o in options)}</div></div>'
def lignes(label, n=3, span=12, h=7):
    return f'<div class="f" style="grid-column:span {span}"><label>{E(label)}</label>' + ''.join(f'<div style="border-bottom:.3mm solid #c9b57a;height:{h}mm"></div>' for _ in range(n)) + '</div>'
def prix(label, span=4):
    return f'<div class="f" style="grid-column:span {span}"><label>{E(label)}</label><div class="bx prix"><i>FCFA</i></div></div>'
def table(cols, n, lh=8, largeurs=None):
    th = ''.join(f'<th{(" style=width:" + largeurs[i]) if largeurs else ""}>{E(c)}</th>' for i, c in enumerate(cols))
    return f'<table style="--lh:{lh}mm"><thead><tr>{th}</tr></thead><tbody>' + ''.join('<tr>' + '<td></td>' * len(cols) + '</tr>' for _ in range(n)) + '</tbody></table>'
def signatures(a, b, c, h=18):
    return f'<div class="sig" style="--sh:{h}mm"><div class="z"><b>{E(a)}</b></div><div class="z"><b>{E(b)}</b></div><div class="z"><b>{E(c)}</b></div></div>'
def reserve(items):
    return '<div class="res"><b>Réservé à la filiale</b>' + ''.join(f'<div>{E(x)}<i></i></div>' for x in items) + '</div>'
def secs(liste):
    return ''.join(f'<div class="sec"><span>{n}</span><h2>{E(t)}</h2></div><div class="g">{c}</div>' for n, (t, c) in enumerate(liste, 1))

exec(open(ROOT + '/tools/dossiers-filiales-data.py', encoding='utf-8').read())  # définit FILIALES (dict) et fonction construire(f, H)
H = dict(champ=champ, cases=cases, lignes=lignes, table=table, prix=prix)

STARSVG = '<svg viewBox="0 0 100 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".55" stop-color="#e3b653"/><stop offset="1" stop-color="#b98a2c"/></linearGradient></defs><path d="M50 3l14.2 29.2 32 4.6-23.2 22.5 5.6 31.9L50 75.5 21.4 91.2 27 59.3 3.8 36.8l32-4.6z" fill="url(#g)"/></svg>'
def entete(f):
    if f.get('wordmark'):
        nom = f['nom']; mots = nom.split(' ', 1)
        n = f'<b>{E(mots[0])}</b> {E(mots[1])}' if mots[0].upper() == 'STAR' and len(mots) > 1 else E(nom)
        return f'<div class="tete"><div class="wm">{STARSVG}<div class="n">{n}</div><div class="l"></div><div class="s">{E(f["rub"])}</div></div></div>', '#041030'
    lg = Image.open(io.BytesIO(Z.read(f['logo_zip']))).convert('RGB')
    m = max(6, int(min(lg.size) * 0.022)); lg = lg.crop((m, m, lg.width - m, lg.height - m))
    cs = [lg.getpixel(p) for p in [(4, 4), (lg.width - 5, 4), (4, lg.height - 5), (lg.width - 5, lg.height - 5)]]
    bg = '#%02x%02x%02x' % tuple(sum(c[i] for c in cs) // 4 for i in range(3))
    b = io.BytesIO(); lg.save(b, 'JPEG', quality=86, optimize=True)
    return f'<div class="tete" style="background:{bg}"><img src="{durl(b.getvalue(), "image/jpeg")}"></div>', bg

def pied(f, n, total, court):
    return f"""<div class="pied"><div class="ligne"></div>
<div class="l"><b>{E(f['nom'].upper())}</b>Fiche {n} sur {total} · {E(court)}<br>WhatsApp +242 06 656 50 50 · contact@starentreprise.com · www.starentreprise.com<span>© 2026 STAR ENTREPRISE — Tous droits réservés</span></div>
<div class="r"><img src="{STAR}"><p>{E(SLOGAN)}</p></div></div>"""

def page(f, n, total, court, tete, titre_html, sous, res, corps):
    return f"""<div class="page">{tete}<div class="bande"></div>
<div class="titre"><div><div class="rub">{E(f['nom'])} · filiale de STAR ENTREPRISE</div><h1>{titre_html}</h1><div class="sub">{E(sous)}</div></div>{res}</div>
<div class="corps">{corps}</div>{pied(f, n, total, court)}</div>"""

def presentation(f, part='all'):
    P = f['pres']
    cartes = lambda it, cl='': f'<div class="cartes {cl}">' + ''.join(f'<div class="c"><b>{E(t)}</b><p>{E(p)}</p></div>' for t, p in it) + '</div>'
    sv = lambda it, cl='': f'<div class="cartes {cl}">' + ''.join(f'<div class="sv"><b>{E(t)}</b><p>{E(p)}</p></div>' for t, p in it) + '</div>'
    sec = lambda t: f'<div class="sec"><span>★</span><h2>{E(t)}</h2></div>'
    h = ''
    if part in ('all', 'A'):
        h += f'<p class="intro">{E(P["intro"])}</p>'
        h += sec(P.get("pourquoi_titre", "Pourquoi nous choisir")) + cartes(P['pourquoi'])
        h += sec(P.get("services_titre", "Nos services")) + sv(P['services'], 't3' if len(P['services']) % 3 == 0 else '')
    if part in ('all', 'B'):
        if P.get('etapes'):
            h += sec(P.get("etapes_titre", "Comment ça marche")) + '<div class="steps">' + ''.join(f'<div class="st"><i>{i}</i><b>{E(t)}</b><p>{E(p)}</p></div>' for i, (t, p) in enumerate(P['etapes'], 1)) + '</div>'
        if P.get('extra_titre'):
            h += sec(P["extra_titre"]) + cartes(P['extra'], 't3' if len(P['extra']) % 3 == 0 else '')
        if P.get('citation'):
            h += f'<div class="cite" style="margin-top:3.4mm">« {E(P["citation"])} »<span>{E(P["auteur"])}</span></div>'
        cx = ''.join(f'<div class="c"><b>{E(t)}</b><p>{E(p)}</p></div>' for t, p in [('WhatsApp service client', '+242 06 656 50 50'), ('E-mail professionnel', 'contact@starentreprise.com'), ('Site officiel', 'www.starentreprise.com')])
        h += sec(P.get("contact_titre", "Nous contacter")) + f'<div class="contact">{cx}</div>'
    return h
def deux_pages(f):
    P = f['pres']
    if P.get('pages'): return P['pages'] == 2
    return len(P['services']) + len(P['pourquoi']) + len(P.get('etapes') or []) + len(P.get('extra') or []) + (3 if P.get('citation') else 0) >= 13

tmp = tempfile.mkdtemp(); env = {**os.environ, 'NODE_PATH': subprocess.check_output(['npm', 'root', '-g']).decode().strip()}
cles = args or list(FILIALES)
rapport = []
for cle in cles:
    f = FILIALES[cle]; f['cle'] = cle
    tete, _ = entete(f)
    if deux_pages(f):
        pages = [dict(court='Présentation', titre=f['pres']['titre_html'], sous=f['pres'].get('sous', ''), res='', corps=presentation(f, 'A')),
                 dict(court='Présentation (suite)', titre="Pour aller <em>plus loin</em>", sous=f['nom'] + ' : le détail de notre offre', res='', corps=presentation(f, 'B'))]
    else:
        pages = [dict(court='Présentation', titre=f['pres']['titre_html'], sous=f['pres'].get('sous', ''), res='', corps=presentation(f))]
    for form in construire(f, H, secs, signatures, reserve):
        pages.append(dict(court=form['court'], titre=form['titre'], sous=form['sous'], res=reserve(form.get('reserve', ['N° de dossier', 'Date de réception', 'Agent'])), corps=form['corps']))
    total = len(pages)
    dossier_dir = os.path.join(OUT, cle); os.makedirs(dossier_dir, exist_ok=True)
    pdfs = []
    for i, p in enumerate(pages, 1):
        h = f'{tmp}/{cle}-{i}.html'
        open(h, 'w', encoding='utf-8').write(f'<!doctype html><meta charset=utf-8><style>{CSS}</style>' + page(f, i, total, p['court'], tete, p['titre'], p['sous'], p['res'], p['corps']))
        pdf = os.path.join(dossier_dir, f'{i:02d}-{cle}-' + ('presentation' if p['court'] == 'Présentation' else p['court'].lower().replace(' ', '-').replace("'", '').replace('é', 'e').replace('è', 'e').replace('à', 'a').replace('ô', 'o').replace('ç', 'c').replace('î', 'i').replace('â', 'a').replace('ê', 'e').replace('/', '-').replace(',', '').replace('(', '').replace(')', '')) + '.pdf')
        pdfs.append(pdf)
        js = f"""const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://{h}');await p.waitForTimeout(450);
let z=1;const px=96/25.4;const mesure=()=>p.evaluate(()=>{{const px=96/25.4;const c=document.querySelector('.corps').getBoundingClientRect().bottom/px;const l=document.querySelector('.pied .l').getBoundingClientRect().top/px;const r=document.querySelector('.pied .r').getBoundingClientRect().top/px;return [c,Math.min(l,r)]}});
let m=await mesure();let n=0;while(m[0]>m[1]-2&&n<14){{z-=0.03;n++;await p.evaluate(z=>{{document.querySelector('.corps').style.zoom=z}},z);m=await mesure()}}
if(n==0){{let k=0;while(z<1.25&&k<12){{z+=0.025;k++;await p.evaluate(z=>{{document.querySelector('.corps').style.zoom=z}},z);m=await mesure();if(m[0]>m[1]-5){{z-=0.025;await p.evaluate(z=>{{document.querySelector('.corps').style.zoom=z}},z);m=await mesure();break}}}}}}
console.log('{cle} fiche {i}: contenu finit à '+Math.round(m[0])+' mm (pied '+Math.round(m[1])+' mm) zoom '+z.toFixed(2)+(m[0]>m[1]-1?'  <<< DÉBORDE':''));
await p.pdf({{path:'{pdf}',format:'A4',printBackground:true,preferCSSPageSize:true}});await b.close()}})();"""
        open(f'{tmp}/r-{cle}-{i}.cjs', 'w').write(js)
        r = subprocess.run(['node', f'{tmp}/r-{cle}-{i}.cjs'], capture_output=True, text=True, env=env)
        print(r.stdout.strip() or r.stderr.strip()[:300]); rapport.append(r.stdout.strip())
    dos = os.path.join(dossier_dir, f'{cle.upper()}-dossier-complet-{total}-fiches.pdf')
    subprocess.run(['pdfunite'] + pdfs + [dos], check=True)
shutil.rmtree(tmp)
print('TERMINÉ :', len(cles), 'filiales')
