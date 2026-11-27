#!/usr/bin/env python3
"""Documents RH et contractuels de STAR ENTREPRISE (A4) : certificat de travail + attestation de travail, contrat de travail CDI, contrat de travail CDD,
contrat de prestation de services. Modèles à compléter (champs vides) ; à faire valider par un conseil juridique avant usage.
Usage : python3 tools/dossiers-speciaux/contrats.py [certificat cdi cdd prestation] [--sortie dossier]"""
import os, sys, html, subprocess, tempfile, shutil, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import images as I
ROOT = I.ROOT; E = html.escape
args = sys.argv[1:]; OUT = ROOT + '/docs/dossiers-speciaux/'
if '--sortie' in args: i = args.index('--sortie'); OUT = args[i + 1]; args = args[:i] + args[i + 2:]
os.makedirs(OUT, exist_ok=True)
FONT = ROOT + '/decouvrir/polices/'
RCCM = 'RCCM Brazzaville n° CG-BZV-01-2026-A10-01950'
REP = 'OTEMBA KIBANGOU Daddyh Cariany'; QUAL = 'Fondateur et Président Directeur Général'
SIEGE = os.environ.get('STAR_SIEGE', 'République du Congo')   # adresse du siège : à renseigner (variable STAR_SIEGE) ; vide = ligne à remplir à la main
CSS = f"""@font-face{{font-family:ID;font-weight:300;src:url(file://{FONT}inter-display-300.woff2)}}
@font-face{{font-family:ID;font-weight:600;src:url(file://{FONT}inter-display-600.woff2)}}
@font-face{{font-family:PF;font-weight:700;src:url(file://{FONT}playfair-display-latin-700-normal.woff2)}}
@font-face{{font-family:PF;font-weight:800;src:url(file://{FONT}playfair-display-latin-800-normal.woff2)}}
@font-face{{font-family:CG;font-weight:500;font-style:italic;src:url(file://{FONT}cormorant-garamond-latin-500-italic.woff2)}}
@page{{size:A4;margin:40mm 19mm 21mm}}*{{box-sizing:border-box}}
body{{font-family:ID,sans-serif;font-weight:300;font-size:10pt;line-height:1.5;color:#1b1f2b;margin:0}}
h1{{font-family:PF,serif;font-weight:800;font-size:19pt;text-align:center;color:#041030;margin:0 0 1mm;letter-spacing:.02em}}
h1 small{{display:block;font-family:ID,sans-serif;font-weight:600;font-size:8pt;letter-spacing:.3em;color:#a77a1c;text-transform:uppercase;margin-bottom:1.6mm}}
.sous{{text-align:center;font-family:CG,serif;font-style:italic;font-weight:500;font-size:11.5pt;color:#4a5068;margin-bottom:5mm}}
.filet{{width:70mm;height:.5mm;margin:2mm auto 5mm;background:linear-gradient(90deg,transparent,#b98a2c,transparent)}}
h2{{font-family:PF,serif;font-weight:700;font-size:11.5pt;color:#041030;margin:5.5mm 0 1.6mm;break-after:avoid;border-bottom:.3mm solid #e3c98a;padding-bottom:.8mm}}
h2 b{{color:#a77a1c;margin-right:2mm}}
p{{margin:0 0 2.2mm;text-align:left}}ul{{margin:0 0 2.4mm 5mm;padding:0}}li{{margin:.6mm 0;text-align:left}}
.b{{display:inline-block;min-width:34mm;border-bottom:.3mm solid #8b7a3f;height:4.6mm;vertical-align:bottom}}.b.l{{min-width:60mm}}.b.c{{min-width:18mm}}.b.xl{{min-width:100mm}}
.case{{display:inline-block;width:3.4mm;height:3.4mm;border:.35mm solid #7a5a12;border-radius:.6mm;vertical-align:-.5mm;margin:0 1.2mm 0 3mm}}
.cadre{{border:.35mm solid #c9b57a;border-radius:2mm;background:#fffdf7;padding:3mm 4mm;margin:2mm 0 3mm;break-inside:avoid}}
.cadre .t{{font-weight:600;font-size:7pt;letter-spacing:.16em;text-transform:uppercase;color:#7a5a12;margin-bottom:1.2mm}}
.gr{{display:grid;grid-template-columns:1fr 1fr;gap:2.2mm 6mm}}.gr .f{{font-size:9.4pt}}
table{{width:100%;border-collapse:collapse;margin:2mm 0 3mm;break-inside:avoid}}th{{background:#041030;color:#ffe29a;font-weight:600;font-size:7.6pt;letter-spacing:.1em;text-transform:uppercase;padding:1.8mm 2mm;text-align:left}}td{{border:.3mm solid #c9b57a;padding:0 2mm;height:8mm;font-size:9pt}}
.sig{{display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-top:7mm;break-inside:avoid}}.sig div{{border-top:.4mm solid #041030;padding-top:1.4mm;min-height:30mm;font-size:8.4pt;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#4a5068}}.sig i{{display:block;font-family:CG,serif;font-style:italic;text-transform:none;letter-spacing:0;font-size:9.6pt;color:#1b1f2b;font-weight:500;margin-top:.6mm}}
.note{{font-size:8pt;color:#6a6f82;font-style:italic;margin-top:5mm;border-top:.3mm solid #e3c98a;padding-top:2mm}}
.num{{text-align:right;font-size:9pt;color:#4a5068;margin-bottom:3mm}}
.saut{{break-before:page}}.ni{{break-inside:avoid}}.compact{{font-size:9.5pt;line-height:1.42}}.compact h2{{margin:4mm 0 1.2mm}}.compact p{{margin-bottom:1.8mm}}
.cert{{position:relative;font-size:10.4pt;line-height:1.55}}.cert p{{margin-bottom:3mm}}.cert .b{{min-width:48mm}}
"""
FIL = None        # filiale concernée (nom) ; None = modèle général
COMPTE = [0]      # numérotation automatique des articles
def FV(): return V(FIL) if FIL else '<span class="b l"></span>'
def V(t): return '<span class="b" style="min-width:0;font-weight:600;color:#041030;padding:0 2mm">' + E(t) + '</span>'
LIEU = '<span class="b" style="min-width:0;font-weight:600;color:#041030;padding:0 2mm">Brazzaville</span>'
def S(n='_'): return '<span class="b"></span>'
def B(cls='', n=1): return ''.join(f'<span class="b {cls}"></span> ' for _ in range(n))
def case(t, on=False): return ('<span class="case" style="background:#041030"></span>' if on else '<span class="case"></span>') + E(t)
def art(n, t, corps):
    COMPTE[0] += 1
    return f'<h2><b>Article {COMPTE[0]}</b>{E(t)}</h2>{corps}'
LOGO = I.logo_officiel_jpeg_uri(150)
HEADER = f'''<div style="width:100%;font-family:Arial,sans-serif;font-size:7.4pt;color:#041030;padding:0 19mm;display:flex;align-items:center;justify-content:space-between;border-bottom:.5mm solid #b98a2c;padding-bottom:2mm;margin-top:7mm">
<div style="display:flex;align-items:center;gap:3mm"><img src="{LOGO}" style="height:17mm;width:17mm;object-fit:contain"><div><div style="font-size:15pt;font-weight:800;letter-spacing:.14em;font-family:Georgia,serif">STAR <span style="color:#a77a1c">ENTREPRISE</span></div><div style="letter-spacing:.2em;color:#a77a1c;font-weight:bold;font-size:6.4pt">UN SEUL GROUPE, TOUTES LES SOLUTIONS POUR VOTRE VIE</div></div></div>
<div style="text-align:right;line-height:1.5;color:#4a5068">{RCCM}<br>Brazzaville · Pointe-Noire · République du Congo<br>WhatsApp +242 06 656 50 50 · contact@starentreprise.com</div></div>'''
def footer(label):
    return f'''<div style="width:100%;font-family:Arial,sans-serif;font-size:7pt;color:#6a6f82;padding:0 19mm;display:flex;justify-content:space-between;border-top:.3mm solid #e3c98a;padding-top:1.6mm">
<span>STAR ENTREPRISE · {label}</span><span>Paraphes : ........ / ........</span><span>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></span></div>'''
def rendre(nom, corps, label, paraphes=True):
    tmp = tempfile.mkdtemp(); h = f'{tmp}/{nom}.html'; pdf = os.path.join(OUT, nom + '.pdf')
    open(h, 'w', encoding='utf-8').write(f'<!doctype html><meta charset=utf-8><style>{CSS}</style><body>{corps}</body>')
    foot = footer(label) if paraphes else footer(label).replace('<span>Paraphes : ........ / ........</span>', '<span></span>')
    js = f"""const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://{h}');await p.waitForTimeout(500);
await p.pdf({{path:'{pdf}',format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:{json.dumps(HEADER)},footerTemplate:{json.dumps(foot)}}});await b.close()}})();"""
    open(f'{tmp}/r.cjs', 'w').write(js)
    env = {**os.environ, 'NODE_PATH': subprocess.check_output(['npm', 'root', '-g']).decode().strip()}
    r = subprocess.run(['node', f'{tmp}/r.cjs'], capture_output=True, text=True, env=env)
    if r.returncode: print(r.stderr[:500])
    n = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
    print(nom, [l for l in n.split('\n') if l.startswith('Pages')]); shutil.rmtree(tmp); return pdf
NOTE = '<p class="note">Modèle établi par STAR ENTREPRISE à titre d\'exemplaire : à compléter, puis à faire valider par un conseil juridique (avocat ou inspection du travail) avant usage, conformément au Code du travail et aux textes en vigueur en République du Congo.</p>'
EMP = f'STAR ENTREPRISE, société immatriculée au Registre du Commerce et du Crédit Mobilier (RCCM) de Brazzaville sous le n° CG-BZV-01-2026-A10-01950, dont le siège est à {V(SIEGE) if SIEGE else B("l")}, représentée par {V(REP)}, agissant en qualité de {V(QUAL)}, ci-après « <b>l\'Employeur</b> »'

# ---------------------------------------------------------------- certificat + attestation de travail
def certificat():
    c = ('<div class="num">N° <span class="b c"></span> / STAR / RH / <span class="b c"></span></div>'
         '<h1><small>STAR ENTREPRISE</small>CERTIFICAT DE TRAVAIL</h1><div class="filet"></div>'
         '<div class="cert"><p>Je soussigné(e), ' + V(REP) + ', agissant en qualité de ' + V(QUAL) + ' de <b>STAR ENTREPRISE</b>, société immatriculée au RCCM de Brazzaville sous le n° CG-BZV-01-2026-A10-01950, certifie que :</p>'
         '<div class="cadre"><div class="gr"><div class="f">M. / Mme : <span class="b l"></span></div><div class="f">Né(e) le : <span class="b"></span></div><div class="f">À : <span class="b"></span></div><div class="f">Nationalité : <span class="b"></span></div><div class="f">Pièce d\'identité n° : <span class="b"></span></div><div class="f">N° CNSS (si applicable) : <span class="b"></span></div></div></div>'
         '<p>a été employé(e) au sein de notre entreprise, <b>du</b> <span class="b"></span> <b>au</b> <span class="b"></span>, sous contrat à durée ' + case('indéterminée (CDI)') + case('déterminée (CDD)') + ',<br>en qualité de <span class="b l"></span>, ' + 'rattaché(e) à la filiale / au service ' + FV() + '.</p>'
         '<p>Dernier poste occupé : <span class="b l"></span>. Principales fonctions exercées : <span class="b xl"></span></p><p><span class="b" style="min-width:170mm"></span></p>'
         '<p>L\'intéressé(e) nous quitte ce jour, <b>libre de tout engagement</b> envers notre entreprise.</p>'
         '<p>Le présent certificat lui est délivré pour servir et valoir ce que de droit.</p>'
         '<p style="margin-top:6mm">Fait à ' + LIEU + ', le <span class="b"></span></p></div>'
         '<div class="sig"><div>Pour STAR ENTREPRISE<i>Nom, fonction, signature et cachet</i></div><div>Reçu par l\'intéressé(e)<i>Date et signature</i></div></div>' + NOTE)
    a = ('<div class="saut"></div><div class="num">N° <span class="b c"></span> / STAR / RH / <span class="b c"></span></div>'
         '<h1><small>STAR ENTREPRISE</small>ATTESTATION DE TRAVAIL</h1><div class="sous">Agent en poste</div><div class="filet"></div>'
         '<div class="cert"><p>Je soussigné(e), ' + V(REP) + ', agissant en qualité de ' + V(QUAL) + ' de <b>STAR ENTREPRISE</b>, société immatriculée au RCCM de Brazzaville sous le n° CG-BZV-01-2026-A10-01950, atteste que :</p>'
         '<div class="cadre"><div class="gr"><div class="f">M. / Mme : <span class="b l"></span></div><div class="f">Né(e) le : <span class="b"></span></div><div class="f">À : <span class="b"></span></div><div class="f">Nationalité : <span class="b"></span></div><div class="f">Pièce d\'identité n° : <span class="b"></span></div><div class="f">N° CNSS (si applicable) : <span class="b"></span></div></div></div>'
         '<p>est employé(e) au sein de notre entreprise <b>depuis le</b> <span class="b"></span>, sous contrat à durée ' + case('indéterminée (CDI)') + case('déterminée (CDD) jusqu\'au ') + '<span class="b c"></span>,<br>en qualité de <span class="b l"></span>, filiale / service : ' + FV() + '.</p>'
         '<p>L\'intéressé(e) est actuellement <b>en poste</b> et exerce ses fonctions à ce jour.</p>'
         '<p>La présente attestation est délivrée à la demande de l\'intéressé(e), pour servir et valoir ce que de droit' + ', notamment auprès de <span class="b l"></span>.</p>'
         '<p style="margin-top:6mm">Fait à ' + LIEU + ', le <span class="b"></span></p></div>'
         '<div class="sig"><div>Pour STAR ENTREPRISE<i>Nom, fonction, signature et cachet</i></div><div>Reçu par l\'intéressé(e)<i>Date et signature</i></div></div>' + NOTE)
    return rendre('STAR-ENTREPRISE-Certificat-et-attestation-de-travail', c + a, 'Certificat de travail', paraphes=False)

# ---------------------------------------------------------------- contrats de travail
def parties_agent():
    return ('<div class="cadre"><div class="t">Entre les soussignés</div><p style="margin:0">' + EMP + '.</p></div>'
            '<p style="text-align:center;margin:1mm 0">d\'une part, et</p>'
            '<div class="cadre"><div class="t">Le salarié</div><div class="gr"><div class="f">M. / Mme : <span class="b l"></span></div><div class="f">Né(e) le : <span class="b"></span> à <span class="b"></span></div><div class="f">Nationalité : <span class="b"></span></div><div class="f">Pièce d\'identité n° : <span class="b"></span></div>'
            '<div class="f">Adresse : <span class="b l"></span></div><div class="f">Téléphone / WhatsApp : <span class="b"></span></div><div class="f">N° CNSS (si existant) : <span class="b"></span></div><div class="f">Situation familiale : <span class="b"></span></div></div><p style="margin:2mm 0 0">ci-après « <b>le Salarié</b> », d\'autre part.</p></div>'
            '<p>Il a été convenu et arrêté ce qui suit, conformément au Code du travail et aux textes en vigueur en République du Congo.</p>')
def clauses_communes(cdd):
    return (
        art('3', 'Lieu de travail', '<p>Le Salarié exerce ses fonctions à <span class="b l"></span>. Il pourra être amené à se déplacer, à titre occasionnel ou régulier, sur les différents sites et filiales du groupe en République du Congo, pour les besoins de son activité, dans le respect de la loi.</p>')
        + art('4', 'Durée et organisation du travail', '<p>La durée du travail est de <span class="b c"></span> heures par semaine, dans la limite des durées maximales fixées par la réglementation, selon l\'horaire suivant : <span class="b l"></span>. Les heures supplémentaires éventuelles, demandées par l\'Employeur, sont rémunérées ou compensées conformément à la loi.</p>')
        + art('5', 'Rémunération', '<p>En contrepartie de son travail, le Salarié perçoit une rémunération mensuelle brute de <span class="b"></span> FCFA (en lettres : <span class="b l"></span>), à laquelle s\'ajoutent, le cas échéant : <span class="b l"></span>.</p><p>Elle est versée à la fin de chaque mois, par ' + case('virement') + case('Mobile Money') + case('espèces contre reçu') + ', sous déduction des retenues légales et sociales en vigueur. Un bulletin de paie est remis au Salarié.</p>')
        + art('6', 'Congés', '<p>Le Salarié bénéficie des congés payés et des jours de repos prévus par la législation en vigueur. Les dates de congé sont fixées d\'un commun accord, en tenant compte des nécessités du service.</p>')
        + art('7', 'Protection sociale', '<p>L\'Employeur déclare le Salarié et verse les cotisations dues à la Caisse nationale de sécurité sociale (CNSS), conformément à la loi. Le Salarié bénéficie des prestations prévues par la réglementation (accidents du travail, maladie professionnelle, famille, retraite).</p>')
        + art('8', 'Obligations du Salarié', '<p>Le Salarié s\'engage à exécuter son travail avec soin, loyauté et diligence, à respecter les directives de sa hiérarchie, le règlement intérieur et les règles d\'hygiène et de sécurité, à préserver les biens et le matériel confiés, et à avoir un comportement respectueux envers ses collègues, la clientèle et les partenaires du groupe.</p>')
        + art('9', 'Confidentialité', '<p>Le Salarié <b>reconnaît</b> que, du fait de ses fonctions, il aura connaissance d\'informations confidentielles de l\'Employeur, de ses filiales, de ses clients et partenaires (données personnelles, financières et commerciales, codes sources, applications et outils, plans, tarifs, fichiers clients, procédés, projets et créations non publiés). Il s\'engage, pendant toute la durée du contrat <b>et après sa fin</b>, à ne les divulguer à aucun tiers, à ne pas les utiliser pour son compte ou celui d\'autrui et à les protéger, conformément aux règles du droit congolais (secret professionnel, protection des données personnelles, responsabilité civile et pénale).</p><p>Les modalités détaillées figurent dans l\'<b>Engagement de confidentialité et de non-concurrence</b> annexé, qui fait partie intégrante du contrat et que le Salarié signe séparément.</p>')
        + art('10', 'Non-concurrence et non-sollicitation', '<p>Pendant l\'exécution du contrat, le Salarié s\'interdit d\'exercer, directement ou indirectement, une activité concurrente de celle de l\'Employeur ou de ses filiales, sans autorisation écrite préalable (obligation de loyauté). Après la fin du contrat, une clause de non-concurrence et de non-sollicitation peut s\'appliquer dans les conditions, limites de durée, d\'espace et d\'activité, et avec la contrepartie précisées dans l\'Engagement annexé, dans la mesure permise par le droit congolais.</p>')
        + art('10', 'Propriété intellectuelle', '<p>Les œuvres, logiciels, applications, textes, images, marques et créations réalisés par le Salarié dans le cadre de ses fonctions ou avec les moyens de l\'Employeur sont la propriété de l\'Employeur, dans les limites permises par la loi, qui les exploitera librement. Le Salarié s\'engage à signer tout document utile à cette fin.</p>')
        + art('11', 'Matériel et moyens de l\'entreprise', '<p>Le matériel, les comptes, outils numériques et accès confiés au Salarié restent la propriété de l\'Employeur et sont réservés à un usage professionnel. Ils sont restitués à la fin du contrat. Les accès personnels ne doivent jamais être partagés.</p>')
        + art('12', 'Discipline', '<p>Tout manquement aux obligations du présent contrat ou au règlement intérieur peut donner lieu aux sanctions disciplinaires prévues par la loi, dans le respect des droits de la défense.</p>'))
def fin_contrat(cdd):
    sig = ('<p>Fait à ' + LIEU + ', le <span class="b"></span>, en <b>deux exemplaires originaux</b>, dont un remis à chaque partie.</p>'
           '<div class="sig"><div>L\'Employeur<i>« Lu et approuvé » — nom, fonction, signature et cachet</i></div><div>Le Salarié<i>« Lu et approuvé » — nom et signature</i></div></div>')
    return sig + NOTE
def cdi():
    COMPTE[0] = 0
    c = ('<h1><small>Contrat de travail</small>CONTRAT À DURÉE INDÉTERMINÉE</h1><div class="sous">(CDI) · N° <span class="b c"></span> / STAR / RH / <span class="b c"></span></div><div class="filet"></div>' + parties_agent()
         + art('1', 'Engagement et fonctions', '<p>L\'Employeur engage le Salarié en qualité de <span class="b l"></span>, catégorie / échelon <span class="b c"></span>, au sein de la filiale / du service ' + FV() + ', sous l\'autorité de <span class="b l"></span>.</p><p>Principales missions : <span class="b xl"></span></p><p><span class="b" style="min-width:170mm"></span></p><p>Le Salarié peut se voir confier toute tâche connexe à sa fonction, correspondant à ses qualifications.</p>')
         + art('2', 'Date d\'effet et période d\'essai', '<p>Le présent contrat, conclu pour une <b>durée indéterminée</b>, prend effet le <span class="b"></span>.</p><p>Il comporte une période d\'essai de <span class="b c"></span> (dans la limite prévue par la réglementation), pendant laquelle chaque partie peut y mettre fin dans les conditions fixées par la loi. Elle peut être renouvelée une fois si la loi le permet, par accord écrit.</p>')
         + clauses_communes(False)
         + art('13', 'Rupture du contrat', '<p>Le présent contrat peut prendre fin à l\'initiative de l\'une ou l\'autre partie, dans les conditions, formes et délais de préavis prévus par le Code du travail et les textes applicables, ou d\'un commun accord. À la fin du contrat, l\'Employeur remet au Salarié le solde de tout compte, le <b>certificat de travail</b> et les documents prévus par la loi.</p>')
         + art('14', 'Dispositions finales', '<p>Toute modification du présent contrat fait l\'objet d\'un avenant écrit signé des deux parties. Pour tout litige relatif à son exécution ou à son interprétation, les parties recherchent d\'abord une solution amiable ; à défaut, le tribunal du travail territorialement compétent (Brazzaville ou Pointe-Noire) est saisi, selon la loi congolaise.</p>')
         + fin_contrat(False))
    return rendre('STAR-ENTREPRISE-Contrat-de-travail-CDI', c, 'Contrat de travail CDI')
def cdd():
    COMPTE[0] = 0
    c = ('<h1><small>Contrat de travail</small>CONTRAT À DURÉE DÉTERMINÉE</h1><div class="sous">(CDD) · N° <span class="b c"></span> / STAR / RH / <span class="b c"></span></div><div class="filet"></div>' + parties_agent()
         + art('1', 'Engagement, fonctions et motif', '<p>L\'Employeur engage le Salarié en qualité de <span class="b l"></span>, catégorie / échelon <span class="b c"></span>, au sein de la filiale / du service ' + FV() + ', sous l\'autorité de <span class="b l"></span>.</p><p>Principales missions : <span class="b xl"></span></p>'
               '<p><b>Motif du recours au contrat à durée déterminée</b> (à cocher et à préciser) :<br>' + case('remplacement d\'un salarié absent : ') + '<span class="b l"></span><br>' + case('accroissement temporaire d\'activité / projet ponctuel : ') + '<span class="b l"></span><br>' + case('travail saisonnier ou à caractère occasionnel : ') + '<span class="b l"></span><br>' + case('autre cas autorisé par la loi : ') + '<span class="b l"></span></p>')
         + art('2', 'Durée, date d\'effet et période d\'essai', '<p>Le présent contrat est conclu pour une <b>durée déterminée</b>, du <span class="b"></span> au <span class="b"></span> (terme précis).</p><p>Il comporte une période d\'essai de <span class="b c"></span> (dans la limite prévue par la réglementation).</p><p>Il peut être renouvelé ' + case('une fois') + case('non renouvelable') + ', dans les limites de durée et de renouvellement fixées par la loi, par avenant écrit signé avant le terme. Au-delà de ces limites, la loi s\'applique.</p>')
         + clauses_communes(True)
         + art('13', 'Fin et rupture du contrat', '<p>Le contrat prend fin de plein droit à l\'arrivée du terme. Avant le terme, il ne peut être rompu que dans les cas prévus par la loi (accord des parties, faute grave, force majeure, ou autre cas légal). Le cas échéant, l\'indemnité de fin de contrat ou de précarité prévue par la réglementation est versée au Salarié. À la fin du contrat, l\'Employeur remet le solde de tout compte, le <b>certificat de travail</b> et les documents prévus par la loi.</p>')
         + art('14', 'Dispositions finales', '<p>Toute modification fait l\'objet d\'un avenant écrit. Pour tout litige, les parties recherchent d\'abord une solution amiable ; à défaut, le tribunal du travail territorialement compétent (Brazzaville ou Pointe-Noire) est saisi, selon la loi congolaise.</p>')
         + fin_contrat(True))
    return rendre('STAR-ENTREPRISE-Contrat-de-travail-CDD', c, 'Contrat de travail CDD')

# ---------------------------------------------------------------- contrat de prestation de services
def prestation():
    COMPTE[0] = 0
    c = ('<h1><small>Contrat</small>PRESTATION DE SERVICES</h1><div class="sous">N° <span class="b c"></span> / STAR / CP / <span class="b c"></span></div><div class="filet"></div>'
         '<div class="cadre"><div class="t">Entre les soussignés</div><p style="margin:0">STAR ENTREPRISE, société immatriculée au RCCM de Brazzaville sous le n° CG-BZV-01-2026-A10-01950, dont le siège est à ' + (V(SIEGE) if SIEGE else '<span class="b l"></span>') + ', représentée par ' + V(REP) + ', en qualité de ' + V(QUAL) + ', agissant ' + case('pour son propre compte') + case('pour sa filiale : ', bool(FIL)) + FV() + ', ci-après « <b>le Prestataire</b> »,</p></div>'
         '<p style="text-align:center;margin:1mm 0">d\'une part, et</p>'
         '<div class="cadre"><div class="t">Le client</div><div class="gr"><div class="f">Nom / raison sociale : <span class="b l"></span></div><div class="f">RCCM / NIU (si société) : <span class="b"></span></div><div class="f">Représenté(e) par : <span class="b l"></span></div><div class="f">Qualité : <span class="b"></span></div><div class="f">Adresse : <span class="b l"></span></div><div class="f">Téléphone / WhatsApp : <span class="b"></span></div><div class="f">E-mail : <span class="b l"></span></div></div><p style="margin:2mm 0 0">ci-après « <b>le Client</b> », d\'autre part.</p></div>'
         '<p>Les parties ont convenu ce qui suit, conformément au droit en vigueur en République du Congo.</p>'
         + art('1', 'Objet', '<p>Le présent contrat a pour objet la fourniture par le Prestataire au Client des services décrits à l\'<b>Annexe 1 — Fiche de service</b> et, plus généralement, de tout service convenu par écrit entre les parties.</p>')
         + art('2', 'Description des services et livrables', '<p>Les services, les livrables, les délais et les critères d\'acceptation sont précisés à l\'Annexe 1. Toute demande en dehors de ce périmètre fait l\'objet d\'un avenant ou d\'un devis écrit.</p>')
         + art('3', 'Durée', '<p>Le contrat prend effet le <span class="b"></span> et se termine ' + case('à la livraison complète des services') + case('le ') + '<span class="b"></span> ' + case('par tacite reconduction, par périodes de ') + '<span class="b c"></span>, sauf dénonciation écrite moyennant un préavis de <span class="b c"></span>.</p>')
         + art('4', 'Prix et paiement', '<p>Le prix total des services est de <span class="b"></span> FCFA (en lettres : <span class="b l"></span>), ' + case('hors taxes') + case('toutes taxes comprises') + '.</p><p>Paiement : acompte de <span class="b c"></span> % à la signature, solde ' + case('à la livraison') + case('par échéances : ') + '<span class="b l"></span>. Modes de paiement acceptés : ' + case('virement') + case('Mobile Money') + case('espèces contre reçu') + '. Un reçu ou une facture est remis au Client pour chaque paiement.</p><p>Tout retard de paiement peut entraîner la suspension des services après mise en demeure écrite, et des pénalités de retard de <span class="b c"></span> par mois, dans les limites de la loi.</p>')
         + art('5', 'Obligations du Prestataire', '<p>Le Prestataire exécute les services avec le soin et le professionnalisme attendus d\'une entreprise du secteur, dans les délais convenus, tient le Client informé de l\'avancement et affecte du personnel qualifié. Il est tenu à une obligation de moyens, sauf mention contraire à l\'Annexe 1.</p>')
         + art('6', 'Obligations du Client', '<p>Le Client fournit en temps utile les informations, accès, contenus et validations nécessaires, règle le prix aux échéances convenues, et désigne un interlocuteur. Les retards du Client repoussent d\'autant les délais du Prestataire.</p>')
         + art('7', 'Confidentialité et données personnelles', '<p>Chaque partie garde confidentielles les informations non publiques reçues de l\'autre, pendant la durée du contrat et après sa fin. Les données personnelles éventuellement traitées le sont uniquement pour l\'exécution du contrat, avec des mesures de sécurité adaptées, dans le respect de la réglementation applicable.</p>')
         + art('8', 'Propriété intellectuelle', '<p>Chaque partie conserve ses droits sur ses œuvres, marques, outils et savoir-faire préexistants. Sauf mention contraire à l\'Annexe 1, les livrables spécifiquement créés pour le Client lui sont cédés ou concédés pour l\'usage prévu, <b>après paiement intégral du prix</b>. Le Prestataire peut citer le Client comme référence, sauf refus écrit.</p>')
         + art('9', 'Responsabilité', '<p>La responsabilité du Prestataire est limitée aux dommages directs et prévisibles résultant d\'un manquement prouvé à ses obligations, et plafonnée, sauf faute lourde ou dol, au montant des sommes effectivement payées au titre du contrat. Aucune partie n\'est responsable des dommages indirects.</p>')
         + art('10', 'Force majeure', '<p>Aucune partie n\'est responsable d\'un retard ou d\'une inexécution dus à un cas de force majeure au sens de la loi (événement imprévisible, irrésistible et extérieur). La partie concernée en informe l\'autre sans délai.</p>')
         + art('11', 'Résiliation', '<p>Chaque partie peut résilier le contrat en cas de manquement grave de l\'autre non réparé dans un délai de <span class="b c"></span> jours après mise en demeure écrite. Les services déjà exécutés restent dus.</p>')
         + art('12', 'Dispositions finales', '<p>Le contrat, avec son annexe, constitue l\'accord complet des parties ; toute modification se fait par avenant écrit. Les parties cherchent d\'abord une solution amiable ; à défaut, le tribunal compétent de ' + case('Brazzaville') + case('Pointe-Noire') + ' est saisi, selon la loi congolaise.</p>')
         + '<p>Fait à ' + LIEU + ', le <span class="b"></span>, en <b>deux exemplaires originaux</b>, dont un remis à chaque partie.</p><div class="sig"><div>Pour le Prestataire — STAR ENTREPRISE<i>« Lu et approuvé » — nom, fonction, signature et cachet</i></div><div>Pour le Client<i>« Lu et approuvé » — nom, fonction, signature et cachet</i></div></div>'
         '<div class="saut"></div><h1><small>Annexe 1</small>FICHE DE SERVICE</h1><div class="sous">Services commandés, livrables, délais et prix</div><div class="filet"></div>'
         '<div class="cadre"><div class="t">Filiale concernée</div><p style="margin:0">' + case('LIBOKÉ') + case('Clinique Havre de Vie') + case('STAR VITAL') + case('STAR IMMO') + case('STAR P.A.M.E.P') + case('STAR Galerie Meubles') + case('STAR Déco Baby') + case('STAR JET') + case('STAR Beach Village') + case('STAR Beauty Wedding') + case('STAR CASA') + case('STAR TRANS') + case('STAR EXPRESS') + case('STARCAROS') + case('CARRY.O AFRIQUE') + case('STAR CRÉAT') + case('STAR CLEANING') + case('Les P\'tits Grimpeurs') + case('STAR EVENTS') + case('STAR ÉNERGIE') + case('STAR MBOTÉ') + case('Autre : ') + '<span class="b"></span></p></div>'
         '<table><thead><tr><th style="width:5%">N°</th><th style="width:32%">Service</th><th style="width:25%">Livrable</th><th style="width:14%">Délai</th><th style="width:14%">Prix (FCFA)</th><th>Visa</th></tr></thead><tbody>' + ''.join('<tr><td></td><td></td><td></td><td></td><td></td><td></td></tr>' for _ in range(7)) + '<tr><td colspan="4" style="text-align:right;font-weight:600">Total</td><td></td><td></td></tr></tbody></table>'
         '<div class="cadre"><div class="t">Précisions et conditions particulières</div><p><span class="b" style="min-width:165mm"></span></p><p><span class="b" style="min-width:165mm"></span></p><p><span class="b" style="min-width:165mm"></span></p><p style="margin-bottom:0"><span class="b" style="min-width:165mm"></span></p></div>'
         '<div class="gr" style="margin-top:3mm"><div class="f">Date de début : <span class="b"></span></div><div class="f">Date de livraison prévue : <span class="b"></span></div><div class="f">Interlocuteur du Prestataire : <span class="b l"></span></div><div class="f">Interlocuteur du Client : <span class="b l"></span></div></div>' + NOTE)
    return rendre('STAR-ENTREPRISE-Contrat-de-prestation-de-services', c, 'Contrat de prestation de services')

# ---------------------------------------------------------------- engagement de confidentialité et de non-concurrence (annexe)
def engagement():
    COMPTE[0] = 0
    c = ('<div class="compact"><h1><small>Annexe au contrat de travail</small>ENGAGEMENT DE CONFIDENTIALITÉ<br>ET DE NON-CONCURRENCE</h1><div class="sous">N° <span class="b c"></span> / STAR / RH / <span class="b c"></span> · Droit de la République du Congo</div><div class="filet"></div>'
         '<div class="cadre"><div class="t">L\'Employeur</div><p style="margin:0">' + EMP + '.</p></div>'
         '<div class="cadre"><div class="t">Le soussigné (le Salarié ou collaborateur)</div><div class="gr"><div class="f">M. / Mme : <span class="b l"></span></div><div class="f">Né(e) le : <span class="b"></span> à <span class="b"></span></div><div class="f">Nationalité : <span class="b"></span></div><div class="f">Pièce d\'identité n° : <span class="b"></span></div><div class="f">Poste : <span class="b l"></span></div><div class="f">Filiale / service : ' + FV() + '</div><div class="f">Contrat de référence : ' + case('CDI') + case('CDD') + case('prestation') + ' n° <span class="b c"></span></div></div></div>'
         '<h2>PARTIE A — CONFIDENTIALITÉ</h2>'
         + art('', 'Reconnaissance', '<p>Je reconnais que, dans l\'exercice de mes fonctions au sein de STAR ENTREPRISE et de ses filiales, j\'ai accès à des informations qui ne sont pas publiques et dont la divulgation causerait un préjudice à l\'entreprise, à ses clients ou à ses partenaires. Je reconnais avoir été informé(e) de mon obligation de discrétion et je m\'engage à la respecter, conformément aux règles du droit congolais.</p>')
         + art('', 'Informations confidentielles', '<p>Sont confidentielles, sous quelque forme que ce soit (écrite, orale, numérique, image), toutes les informations non publiques relatives notamment : aux clients, patients, adhérents et aux données personnelles ; aux finances, prix, tarifs, contrats et marges ; aux codes sources, applications, bases de données, outils, procédés et accès informatiques ; aux projets, créations, plans, marques et œuvres non publiés ; à l\'organisation, aux salariés et à la stratégie du groupe ; ainsi que toute information indiquée comme confidentielle.</p>')
         + art('', 'Mes engagements', '<ul><li>ne divulguer ces informations à aucun tiers (famille, amis, concurrents, médias, réseaux sociaux, messageries) ;</li><li>ne les copier, photographier, transférer ou emporter que si mes fonctions l\'exigent ;</li><li>ne les utiliser ni pour mon propre compte, ni pour celui d\'un tiers, ni pour un emploi ou un projet extérieur ;</li><li>protéger mes accès : mots de passe personnels, jamais partagés ; verrouillage des appareils ; pas de stockage sur des comptes personnels non autorisés ;</li><li>signaler sans délai toute perte, fuite ou accès suspect à mon responsable.</li></ul>')
         + art('', 'Exceptions', '<p>Ne sont pas visées les informations déjà publiques sans faute de ma part, celles que je connaissais légitimement avant mon engagement, et celles dont la communication est exigée par la loi ou par une autorité judiciaire ou administrative compétente ; dans ce dernier cas, j\'en informe l\'Employeur sans délai et je ne communique que ce qui est requis.</p>')
         + art('', 'Durée', '<p>Cet engagement s\'applique pendant toute la durée de ma collaboration et <b>après sa fin</b>, pendant <span class="b c"></span> an(s) (au minimum, aussi longtemps que l\'information n\'est pas devenue publique ; sans limite de durée pour les données personnelles et les codes sources).</p>')
         + art('', 'Restitution', '<p>À la fin de ma collaboration, ou à tout moment sur demande, je restitue ou détruis, selon les instructions de l\'Employeur, tous les documents, fichiers, supports, accès et copies en ma possession, et je le confirme par écrit.</p>')
         + art('', 'Données personnelles', '<p>Je traite les données personnelles auxquelles j\'ai accès uniquement pour les besoins de mes fonctions, avec les mesures de sécurité demandées, dans le respect de la réglementation applicable en République du Congo.</p>')
         + art('', 'Responsabilité et sanctions', '<p>Toute violation de cet engagement m\'expose à des sanctions disciplinaires pouvant aller jusqu\'au licenciement, ainsi qu\'à la réparation du préjudice causé et, le cas échéant, à des poursuites civiles et pénales prévues par les lois de la République du Congo (notamment en matière de secret professionnel et d\'abus de confiance).</p>')
         + '<h2>PARTIE B — NON-CONCURRENCE ET NON-SOLLICITATION</h2>'
         + art('', 'Pendant la collaboration (loyauté)', '<p>Pendant la durée de mon contrat, je m\'interdis d\'exercer, directement ou indirectement, pour mon compte ou celui d\'un tiers, toute activité concurrente de celle de STAR ENTREPRISE ou de la filiale où je travaille, sauf autorisation écrite préalable de l\'Employeur.</p>')
         + art('', 'Après la fin du contrat', '<p>La présente clause de non-concurrence post-contractuelle est ' + case('applicable') + case('non applicable') + ' à mon poste. Si elle est applicable :</p><ul><li><b>Durée :</b> <span class="b c"></span> mois après la fin du contrat ;</li><li><b>Zone :</b> ' + case('Brazzaville') + case('Pointe-Noire') + case('ensemble de la République du Congo') + case('autre : ') + '<span class="b"></span> ;</li><li><b>Activités visées :</b> <span class="b xl"></span> ;</li><li><b>Contrepartie financière :</b> <span class="b"></span> FCFA par mois pendant toute la durée de l\'interdiction (ou <span class="b c"></span> % de ma dernière rémunération mensuelle).</li></ul><p>Elle est limitée dans le temps, dans l\'espace et dans son objet, et protège un intérêt légitime de l\'Employeur. Si elle devait être jugée excessive par le juge compétent, elle serait réduite à ce qui est permis par le droit congolais.</p>')
         + art('', 'Non-sollicitation', '<p>Pendant <span class="b c"></span> mois après la fin du contrat, je m\'interdis de démarcher les clients, adhérents et partenaires de STAR ENTREPRISE que j\'ai eu l\'occasion de suivre, et de débaucher ses salariés, dans la limite de ce que permet la loi.</p>')
         + art('', 'Clause pénale (facultative)', '<p>' + case('Applicable') + case('Non applicable') + ' : en cas de violation avérée de la partie A ou B, je serai redevable d\'une indemnité de <span class="b"></span> FCFA par manquement, sans exclure la réparation d\'un préjudice supérieur dans la limite de la loi.</p>')
         + art('', 'Droit applicable et litiges', '<p>Le présent engagement est régi par le droit de la République du Congo. Les parties recherchent d\'abord une solution amiable ; à défaut, le tribunal compétent de Brazzaville ou de Pointe-Noire est saisi, selon la loi.</p>')
         + '<div class="cadre" style="margin-top:4mm"><div class="t">Reconnaissance</div><p style="margin:0">Je soussigné(e) reconnais avoir <b>lu et compris</b> le présent engagement, en avoir reçu un exemplaire, et m\'engage à le respecter pendant et après ma collaboration avec STAR ENTREPRISE et ses filiales, conformément au droit de la République du Congo.</p></div>'
         '<p>Fait à ' + LIEU + ', le <span class="b"></span>, en <b>deux exemplaires originaux</b>, dont un remis à chaque partie.</p>'
         '<div class="sig"><div>Le Salarié / collaborateur<i>« Lu et approuvé » — nom et signature</i></div><div>L\'Employeur<i>« Lu et approuvé » — nom, fonction, signature et cachet</i></div></div></div>' + NOTE)
    return rendre('STAR-ENTREPRISE-Engagement-de-confidentialite-et-de-non-concurrence', c, 'Engagement de confidentialité et non-concurrence')

F = {'certificat': certificat, 'cdi': cdi, 'cdd': cdd, 'prestation': prestation, 'engagement': engagement}
if __name__ == '__main__':
    for k in (args or list(F)): F[k]()
