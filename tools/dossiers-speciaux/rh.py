#!/usr/bin/env python3
"""Packs RH de STAR ENTREPRISE : pour le modèle général et pour chacune des 21 filiales, un dossier PDF et un fichier Word (.docx) contenant
certificat + attestation de travail, contrat CDI, contrat CDD, engagement de confidentialité et de non-concurrence, contrat de prestation de services.
Les textes viennent de contrats.py (une seule source). Pour changer une adresse ou une règle : modifier contrats.py puis relancer ce script.
Usage : python3 tools/dossiers-speciaux/rh.py [--sortie dossier] [--sans-word] [--sans-filiales]"""
import os, sys, re, json, subprocess, tempfile, shutil, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
args = sys.argv[1:]
import contrats as C
import images as I
OUT = C.ROOT + '/docs/dossiers-speciaux/rh/'
if '--sortie' in args: i = args.index('--sortie'); OUT = args[i + 1] + '/'
os.makedirs(OUT + 'PDF', exist_ok=True); os.makedirs(OUT + 'Word', exist_ok=True)
FILIALES = ['LIBOKÉ Épargne + Santé', 'Clinique Havre de Vie', 'STAR VITAL', 'STAR IMMO', 'STAR P.A.M.E.P', 'STAR Galerie Meubles', 'STAR Déco Baby', 'STAR JET', 'STAR Beach Village', 'STAR Beauty Wedding', 'STAR CASA',
            'STAR TRANS', 'STAR EXPRESS', 'STARCAROS', 'CARRY.O AFRIQUE', 'STAR CRÉAT', 'STAR CLEANING', "Les P'tits Grimpeurs", 'STAR EVENTS', 'STAR ÉNERGIE', 'STAR MBOTÉ']
slug = lambda t: re.sub(r'[^A-Za-z0-9]+', '-', unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode()).strip('-')
C.rendre = lambda nom, corps, label, paraphes=True: dict(nom=nom, corps=corps, label=label, paraphes=paraphes)
def documents(fil):
    C.FIL = fil
    return [C.certificat(), C.cdi(), C.cdd(), C.engagement(), C.prestation()]
# ---------------- PDF (un seul fichier par pack : polices embarquées une seule fois)
def rendre_pdf(jobs):
    """jobs : liste de (docs, pdf, etiquette)"""
    tmp = tempfile.mkdtemp(); lst = []
    for k, (docs, pdf, etiquette) in enumerate(jobs):
        corps = ''.join(('<div class="saut"></div>' if n else '') + d['corps'] for n, d in enumerate(docs))
        h = f'{tmp}/{k}.html'; open(h, 'w', encoding='utf-8').write(f'<!doctype html><meta charset=utf-8><style>{C.CSS}</style><body>{corps}</body>')
        lst.append(dict(html=h, pdf=pdf, header=C.HEADER, footer=C.footer(etiquette)))
    open(f'{tmp}/jobs.json', 'w').write(json.dumps(lst))
    js = f"""const {{chromium}}=require('playwright');const L=JSON.parse(require('fs').readFileSync('{tmp}/jobs.json','utf8'));(async()=>{{const b=await chromium.launch();for(const t of L){{const p=await b.newPage();await p.goto('file://'+t.html);await p.waitForTimeout(150);await p.pdf({{path:t.pdf,format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:t.header,footerTemplate:t.footer}});await p.close()}}await b.close()}})();"""
    open(f'{tmp}/r.cjs', 'w').write(js); env = {**os.environ, 'NODE_PATH': subprocess.check_output(['npm', 'root', '-g']).decode().strip()}
    r = subprocess.run(['node', f'{tmp}/r.cjs'], capture_output=True, text=True, env=env)
    if r.returncode: print(r.stderr[:600])
    shutil.rmtree(tmp)
# ---------------- Word : HTML simplifié (traits de remplissage, cases ☐) converti par LibreOffice
def mot_html(docs, titre_fil, dossier):
    logo = f'{dossier}/logo.png'
    if not os.path.exists(logo):
        import base64; open(logo, 'wb').write(base64.b64decode(I.logo_officiel_uri(300).split(',')[1]))
    corps = ''
    for n, d in enumerate(docs):
        h = d['corps']
        h = re.sub(r'<span class="case" style="[^"]*background[^"]*"></span>', '☒ ', h); h = h.replace('<span class="case"></span>', '☐ ')
        def trait(m):
            cl = m.group(1) or ''; st = m.group(2) or ''
            long = 'min-width:170mm' in st or 'min-width:165mm' in st
            return '_' * (70 if long else 50 if 'xl' in cl else 28 if 'l' in cl.split() else 6 if 'c' in cl.split() else 14)
        h = re.sub(r'<span class="b((?: [a-z]+)*)"((?: style="[^"]*")?)></span>', trait, h)
        h = re.sub(r'<div class="sig"><div>(.*?)</div><div>(.*?)</div></div>', lambda m: '<table style="margin-top:10pt"><tr><td style="height:70pt;vertical-align:bottom;border-top:1px solid #000">' + m.group(1) + '</td><td style="width:8%;border:none"></td><td style="vertical-align:bottom;border-top:1px solid #000">' + m.group(2) + '</td></tr></table>', h, flags=re.S)
        h = h.replace('<div class="saut"></div>', '<p style="page-break-before:always"></p>')
        h = re.sub(r'<small>(.*?)</small>', r'<small>\1</small><br>', h); h = re.sub(r'<h2><b>(Article \d+)</b>', r'<h2>\1 — ', h)
        entete = '<table style="border:none"><tr><td style="border:none;width:70pt"><img src="logo.png" width="64" height="64"></td><td style="border:none"><b style="font-size:15pt">STAR ENTREPRISE</b><br>' + C.RCCM + '<br>Brazzaville · Pointe-Noire · République du Congo · WhatsApp +242 06 656 50 50 · contact@starentreprise.com</td></tr></table><hr>'
        corps += ('<p style="page-break-before:always"></p>' if n else '') + entete + h
    css = 'body{font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.35}h1{text-align:center;font-size:17pt;color:#041030}h1 small{display:block;font-size:8pt;color:#a77a1c;letter-spacing:2px}.sous{text-align:center;font-style:italic}h2{font-size:12pt;color:#041030;border-bottom:1px solid #b98a2c;margin-top:12pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:4pt;font-size:9.5pt}th{background:#041030;color:#ffe29a}.cadre{border:1px solid #c9b57a;padding:6pt;margin:6pt 0;background:#fffdf7}.t{font-size:8pt;font-weight:bold;color:#7a5a12}.num{text-align:right}.note{font-size:8pt;color:#666;font-style:italic}.b{}'
    return f'<!doctype html><html><head><meta charset="utf-8"><title>{C.E(titre_fil)}</title><style>{css}</style></head><body>{corps}</body></html>'
def convertir_word(entrees):
    """entrees : liste de (html, nom_docx_sans_extension). LibreOffice convertit tous les fichiers d'un coup."""
    tmp = tempfile.mkdtemp(); fichiers = []
    for html_, nom in entrees:
        h = f'{tmp}/{nom}.html'; open(h, 'w', encoding='utf-8').write(html_); fichiers.append(h)
    shutil.copy(f'{tmp}/../logo.png', f'{tmp}/logo.png') if False else None
    return tmp, fichiers
if __name__ == '__main__':
    sans_word = '--sans-word' in args; sans_fil = '--sans-filiales' in args
    cibles = [(None, 'STAR-ENTREPRISE-Pack-RH-modele-general')] + ([] if sans_fil else [(f, f'{i:02d}-{slug(f)}-Pack-RH') for i, f in enumerate(FILIALES, 1)])
    jobs = []; tmpw = tempfile.mkdtemp(); fichiers = []
    for fil, nom in cibles:
        docs = documents(fil); jobs.append((docs, f'{OUT}PDF/{nom}.pdf', (fil or 'Modèle général') + ' · Dossier RH'))
        if not sans_word:
            open(f'{tmpw}/{nom}.html', 'w', encoding='utf-8').write(mot_html(docs, fil or 'STAR ENTREPRISE', tmpw)); fichiers.append(f'{tmpw}/{nom}.html')
    # documents séparés du modèle général, en Word
    if not sans_word:
        os.makedirs(OUT + 'Word/documents-separes', exist_ok=True)
        for d in documents(None):
            nom = d['nom']; open(f'{tmpw}/{nom}.html', 'w', encoding='utf-8').write(mot_html([d], 'STAR ENTREPRISE', tmpw)); fichiers.append(f'{tmpw}/{nom}.html')
    rendre_pdf(jobs)
    if not sans_word:
        sep = [f for f in fichiers if '-Pack-RH' not in os.path.basename(f)]; packs = [f for f in fichiers if f not in sep]
        subprocess.run(['soffice', '--headless', '--infilter=HTML (StarWriter)', '--convert-to', 'docx:MS Word 2007 XML', '--outdir', OUT + 'Word'] + packs, capture_output=True, text=True, timeout=1200)
        subprocess.run(['soffice', '--headless', '--infilter=HTML (StarWriter)', '--convert-to', 'docx:MS Word 2007 XML', '--outdir', OUT + 'Word/documents-separes'] + sep, capture_output=True, text=True, timeout=1200)
    n_pdf = len([f for f in os.listdir(OUT + 'PDF') if f.endswith('.pdf')]); n_doc = len([f for f in os.listdir(OUT + 'Word') if f.endswith('.docx')])
    print('PDF :', n_pdf, '| Word :', n_doc, '->', OUT)
