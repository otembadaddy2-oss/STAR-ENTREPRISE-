#!/usr/bin/env python3
"""Dossiers spéciaux de STAR ENTREPRISE (A4) :
 1 partenaire (groupe + fiches à remplir) · 2 STAR BEACH VILLAGE présentation · 3 STAR BEACH VILLAGE investisseur
 4 STAR CASA catalogue femmes · 5 STAR CASA catalogue filles · 6 CARRY.O AFRIQUE certificat d'authenticité.
Réutilise la charte des dossiers de filiales (tools/fabrique-dossiers-filiales.py). Usage : python3 tools/dossiers-speciaux/fabrique.py [partenaire beach-presentation beach-investisseur casa-femmes casa-filles certificat] [--sortie dossier]"""
import os, sys, re, subprocess, tempfile, shutil, html, io
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import images as I
ROOT = I.ROOT
args = sys.argv[1:]; OUT = ROOT + '/docs/dossiers-speciaux/'
if '--sortie' in args: i = args.index('--sortie'); OUT = args[i + 1]; args = args[:i] + args[i + 2:]
os.makedirs(OUT, exist_ok=True)
# --- charte : on reprend le début du générateur des filiales (CSS, champs, en-tête, pied) sans le lancer ---
src = open(ROOT + '/tools/fabrique-dossiers-filiales.py', encoding='utf-8').read().split('tmp = tempfile.mkdtemp()')[0]
_argv = sys.argv; sys.argv = ['x']
G = {'__file__': ROOT + '/tools/fabrique-dossiers-filiales.py', '__name__': 'prelude'}
exec(src, G); sys.argv = _argv
CSS, E, champ, cases, lignes, prix, table, signatures, reserve, secs, entete, page, pied = [G[k] for k in 'CSS E champ cases lignes prix table signatures reserve secs entete page pied'.split()]
STAR, STARSVG, SLOGAN, durl = G['STAR'], G['STARSVG'], G['SLOGAN'], G['durl']
EXTRA = """
.img{border-radius:2.4mm;overflow:hidden;background:#eee;position:relative}.img img{width:100%;height:100%;object-fit:cover;display:block}
.cap{font-size:6.6pt;color:#6a6f82;font-style:italic;margin-top:.8mm;line-height:1.3}
.row{display:grid;gap:3mm}.r2{grid-template-columns:1fr 1fr}.r3{grid-template-columns:1fr 1fr 1fr}.r21{grid-template-columns:2fr 1fr}.r12{grid-template-columns:1fr 2fr}
.cat{display:grid;grid-template-columns:repeat(3,1fr);gap:4.5mm 4mm;margin-top:3mm}
.cat .it{position:relative}.cat .im{height:63mm;border-radius:2.6mm;overflow:hidden;border:.4mm solid #e3c98a;background:#eee}.cat .im img{width:100%;height:100%;object-fit:cover;object-position:center 24%;display:block}
.cat .num{position:absolute;left:2mm;top:2mm;background:#041030;color:#ffe29a;font-weight:800;font-size:11pt;padding:.9mm 2.8mm;border-radius:1.6mm;letter-spacing:.06em;box-shadow:0 .6mm 2mm rgba(0,0,0,.35)}
.cat .nm{font-family:PF,serif;font-weight:700;font-size:9pt;line-height:1.15;color:#041030;margin-top:1.4mm;min-height:10.5mm}
.cat .ck{display:flex;align-items:center;gap:1.8mm;font-size:7.4pt;color:#4a5068;font-weight:600}.cat .ck:before{content:"";width:3.6mm;height:3.6mm;border:.35mm solid #7a5a12;border-radius:.8mm;background:#fff}
.vide{border:.5mm dashed #c9b57a;border-radius:2.6mm;background:#fffaf0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4mm;height:63mm}
.vide b{font-family:PF,serif;font-size:11pt;color:#041030}.vide span{font-size:8pt;color:#4a5068;margin-top:1.5mm;line-height:1.35}
.cover{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;background:#041030;color:#fff}
.liste{font-size:8.8pt;line-height:1.45;color:#2b3042}.liste li{margin:.4mm 0 .4mm 4.5mm}
.num2{display:inline-grid;place-items:center;width:5.4mm;height:5.4mm;border-radius:50%;background:#b98a2c;color:#fff;font-weight:800;font-size:8pt;margin-right:1.6mm}
.fil{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm}.fil .c{padding:2mm 2.6mm}.fil .c b{font-size:8.6pt;margin-bottom:.2mm}.fil .c p{font-size:7.4pt;line-height:1.25;color:#6a6f82}
.badge{display:inline-block;background:#fff6d8;border:.3mm solid #b98a2c;color:#7a5a12;font-weight:600;font-size:7pt;letter-spacing:.1em;text-transform:uppercase;padding:.8mm 2.4mm;border-radius:1.2mm}
"""
FULL = f'<!doctype html><meta charset=utf-8><style>{CSS}{EXTRA}</style>'
def rendre(nom, pages, css_extra=''):
    tmp = tempfile.mkdtemp(); h = f'{tmp}/{nom}.html'; pdf = os.path.join(OUT, nom + '.pdf')
    corps_html = re.sub(r'Fiche (\d+ sur \d+)', r'Page \1', ''.join(pages))
    open(h, 'w', encoding='utf-8').write(FULL + ('<style>' + css_extra + '</style>' if css_extra else '') + corps_html)
    js = f"""const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://{h}');await p.waitForTimeout(700);
await p.evaluate(()=>{{const px=96/25.4;document.querySelectorAll('.page').forEach(pg=>{{const c=pg.querySelector('.corps');const pd=pg.querySelector('.pied');if(!c||!pd)return;const o=pg.getBoundingClientRect().top;const lim=()=>Math.min(pd.querySelector('.l').getBoundingClientRect().top,pd.querySelector('.r').getBoundingClientRect().top)-o-2.5*px;let z=1;while(c.getBoundingClientRect().bottom-o>lim()&&z>0.8){{z-=0.02;c.style.zoom=z}}if(z===1){{let k=0;while(k<20){{z+=0.02;c.style.zoom=z;k++;if(c.getBoundingClientRect().bottom-o>lim()-4*px||z>1.3){{z-=0.02;c.style.zoom=z;break}}}}}}}})}});
const r=await p.evaluate(()=>[...document.querySelectorAll('.page')].map((pg,i)=>{{const c=pg.querySelector('.corps');const pd=pg.querySelector('.pied');if(!c||!pd)return null;const px=96/25.4;const o=pg.getBoundingClientRect().top;const cb=(c.getBoundingClientRect().bottom-o)/px;const l=(Math.min(pd.querySelector('.l').getBoundingClientRect().top,pd.querySelector('.r').getBoundingClientRect().top)-o)/px;return [i+1,Math.round(cb),Math.round(l)]}}).filter(Boolean));console.log(JSON.stringify(r));
await p.pdf({{path:'{pdf}',format:'A4',printBackground:true,preferCSSPageSize:true}});await b.close()}})();"""
    open(f'{tmp}/r.cjs', 'w').write(js)
    env = {**os.environ, 'NODE_PATH': subprocess.check_output(['npm', 'root', '-g']).decode().strip()}
    r = subprocess.run(['node', f'{tmp}/r.cjs'], capture_output=True, text=True, env=env)
    print(nom, r.stdout.strip() or r.stderr.strip()[:400])
    try:
        for n, cb, l in __import__('json').loads(r.stdout.strip() or '[]'):
            if cb > l - 1: print('   >>> DÉBORDE page', n, 'contenu', cb, 'mm / pied', l, 'mm')
    except Exception: pass
    shutil.rmtree(tmp); return pdf
def secs2(liste):
    return secs([(t, ''.join(c) if isinstance(c, list) else c) for t, c in liste])
def img(path, h, maxw=900, pos='center', crop=None):
    return f'<div class="img" style="height:{h}mm"><img src="{I.datauri(path, maxw, crop=crop)}" style="object-position:{pos}"></div>'
def titre_page(f, n, total, court, tete, titre, sous, corps, res=''):
    return page(f, n, total, court, tete, titre, sous, res, corps)
def sec(t): return f'<div class="sec"><span>★</span><h2>{E(t)}</h2></div>'
def cartes(items, cl=''): return f'<div class="cartes {cl}">' + ''.join(f'<div class="c"><b>{E(t)}</b><p>{E(p)}</p></div>' for t, p in items) + '</div>'
def contact_cartes(): return '<div class="contact">' + ''.join(f'<div class="c"><b>{E(t)}</b><p>{E(p)}</p></div>' for t, p in [('WhatsApp service client', '+242 06 656 50 50'), ('E-mail professionnel', 'contact@starentreprise.com'), ('Site officiel', 'www.starentreprise.com')]) + '</div>'
SVG_GRAND = STARSVG.replace('<svg ', '<svg style="width:44mm;height:42mm;filter:drop-shadow(0 0 6mm rgba(255,200,70,.8))" ')
SVG_FOND = STARSVG.replace('<svg ', '<svg fill="#b98a2c" ')
RCCM = 'RCCM Brazzaville n° CG-BZV-01-2026-A10-01950'
SITE = I.SITE
def couverture(f, titre, sous, ligne, image_html, bas_html=''):
    return f"""<div class="cover"><div style="position:absolute;inset:0 0 auto 0;height:166mm">{image_html}</div>
<div style="position:absolute;inset:166mm 0 0 0;background:radial-gradient(70% 90% at 50% 0%,#10285f,#041030 75%)"></div>
<div style="position:absolute;left:0;right:0;top:162mm;height:2.6mm;background:linear-gradient(90deg,#b98a2c,#ffe29a 50%,#b98a2c)"></div>
<div style="position:absolute;left:16mm;right:16mm;top:176mm;text-align:center"><div style="font-weight:600;font-size:8.6pt;letter-spacing:.34em;text-transform:uppercase;color:#e3b653">{E(ligne)}</div>
<div style="font-family:PF,serif;font-weight:800;font-size:31pt;line-height:1.08;margin-top:4mm">{titre}</div><div style="font-family:CG,serif;font-style:italic;font-weight:500;font-size:14pt;color:#d9e3ff;margin-top:3mm">{E(sous)}</div>{bas_html}</div>
<div style="position:absolute;left:14mm;bottom:11mm;font-size:7.4pt;line-height:1.6;color:#aeb8d6">WhatsApp +242 06 656 50 50 · contact@starentreprise.com · www.starentreprise.com<br>{E(RCCM)} · © 2026 STAR ENTREPRISE</div>
<div style="position:absolute;right:12mm;bottom:9mm;width:60mm;text-align:center"><img src="{STAR}" style="height:24mm;width:24mm;object-fit:contain"><div style="font-family:CG,serif;font-style:italic;font-size:8.2pt;color:#fff;margin-top:1mm;line-height:1.15">{E(SLOGAN)}</div></div></div>"""

FICHES = {}
# ---------------------------------------------------------------- 1. PARTENAIRE
def partenaire():
    f = dict(nom='STAR ENTREPRISE', rub='Dossier de partenariat', wordmark=True)
    tete = entete(f)[0]; T = 6
    cov = couverture(f, 'Devenez partenaire<br>de <span style="color:#ffd466">STAR ENTREPRISE</span>', 'Un seul groupe, toutes les solutions pour votre vie.', 'Dossier de partenariat',
        '<div class="wm" style="height:100%;background:radial-gradient(60% 80% at 50% 45%,#10285f,#041030 70%);display:flex;flex-direction:column;align-items:center;justify-content:center">' + SVG_GRAND + '<div class="n" style="font-size:44pt;margin-top:3mm">STAR <b>ENTREPRISE</b></div><div class="l" style="width:90mm"></div><div class="s" style="font-size:10pt">Groupe multi-métiers · Congo</div></div>')
    P = []
    P.append(cov)
    # p2 : qui sommes-nous
    c2 = ('<p class="intro">STAR ENTREPRISE est un groupe multi-métiers fondé par <b>Carry OTEMBA</b> depuis le Canada, ouvert et officiellement enregistré en République du Congo, à Brazzaville et à Pointe-Noire. '
          'Nous réunissons sous une même étoile <b>vingt-et-une filiales</b> : santé et solidarité, épargne, immobilier et patrimoine, tourisme et voyage, mariage et événements, énergie, mobilité, enfance, création et art.</p>'
          + sec('Notre mission et notre vision') + cartes([('Mission : servir, créer, accompagner', 'Transformer les idées en produits et en services d\'exception, accessibles, beaux et efficaces, pour tous les secteurs d\'activité. Simplifier la vie des familles, des commerçants, des créateurs et des organisations.'),
                                                        ('Vision : la référence en Afrique centrale', 'Devenir la référence en Afrique centrale pour les services du quotidien et la création numérique sur mesure, avec une technologie utile, compréhensible et adaptée à nos réalités.')])
          + sec('Une entreprise officielle') + f'<p class="intro" style="margin-top:1mm">STAR ENTREPRISE est immatriculée au Registre du Commerce et du Crédit Mobilier (RCCM) de Brazzaville sous le <b>n° CG-BZV-01-2026-A10-01950</b>, avec les autorisations d\'exercice délivrées par les administrations congolaises compétentes.</p>'
          + sec('Un seul compte, tout le groupe') + cartes([('Un compte, plusieurs services', 'Un seul compte, un paiement sécurisé et un programme de fidélité, STAR MBOTÉ, valables dans toutes les filiales.'), ('Des technologies de chez nous', 'KOMYO, Keydou, STAR GPU, UC STAR, STAR IA : des outils conçus ici, qui tournent sur les téléphones que les gens ont déjà.')])
          + '<div class="cite" style="margin-top:3.4mm">« Une idée, même imparfaite au départ, peut devenir un diamant si elle est taillée avec méthode, créativité et exigence. »<span>La philosophie de Carry OTEMBA, fondateur et PDG</span></div>')
    FIL = [('LIBOKÉ Épargne + Santé', 'Épargne et accompagnement social des familles'), ('Clinique Havre de Vie', 'Santé & social, Pointe-Noire'), ('STAR VITAL', 'Accompagnement social'), ('STAR IMMO', 'Immobilier & investissement'),
           ('STAR P.A.M.E.P', 'Propriété · administration · maisons · espaces'), ('STAR Galerie Meubles', 'Art de vivre · meubles et décoration'), ('STAR Déco Baby', 'Univers de l\'enfant'), ('STAR JET', 'Aviation privée & prestige'),
           ('STAR Beach Village', 'Tourisme & immobilier de prestige'), ('STAR Beauty Wedding', 'Mariage et beauté'), ('STAR CASA', 'Bien-être à domicile'), ('STAR TRANS', 'Mobilité urbaine'), ('STAR EXPRESS', 'Livraison rapide de gaz'),
           ('STARCAROS', 'Mobilité & patrimoine'), ('CARRY.O AFRIQUE', 'Galerie d\'art · art & culture'), ('STAR CRÉAT', 'Agence de création'), ('STAR CLEANING', 'Propreté & entretien'), ('Les P\'tits Grimpeurs', 'Garderie et maternelle'),
           ('STAR EVENTS', 'Moments mémorables'), ('STAR ÉNERGIE', 'Énergie & habitat'), ('STAR MBOTÉ', 'Programme de fidélité')]
    FIL_COCHES = [n for n, _ in FIL]
    c3 = ('<p class="intro">Chaque filiale a sa propre identité et son propre métier ; toutes partagent la même exigence. Voici le groupe en un coup d\'œil.</p>' + sec('Nos 21 filiales')
          + '<div class="fil cartes">' + ''.join(f'<div class="c"><b>{E(n)}</b><p>{E(d)}</p></div>' for n, d in FIL) + '</div>'
          )
    c4 = (sec('Pourquoi devenir partenaire') + cartes([('Un groupe structuré', 'Une entreprise immatriculée, des filiales complémentaires, un seul interlocuteur pour démarrer.'), ('Des métiers qui se répondent', 'Santé, épargne, immobilier, tourisme, énergie, mobilité, événements : des passerelles naturelles entre filiales.'),
                                                  ('Des outils numériques maison', 'Un compte unique, un paiement sécurisé et un programme de fidélité commun à tout le groupe.'), ('Une exigence partagée', 'La même qualité de service, de la première prise de contact à la livraison.')])
          + sec('Les formes de partenariat que nous accueillons') + '<div class="cartes t3">' + ''.join(f'<div class="sv"><b>{E(t)}</b><p>{E(p)}</p></div>' for t, p in [
              ('Distribution et revente', 'Proposer les services ou produits d\'une ou plusieurs filiales à votre clientèle.'), ('Fournisseurs et prestataires', 'Fournir matériel, matières, services ou compétences à une filiale.'),
              ('Investissement et financement', 'Participer au développement d\'un projet (immobilier, tourisme, énergie, etc.).'), ('Partenariat institutionnel', 'Institutions publiques, collectivités, autorités locales, organisations et associations.'),
              ('Partenariat technique et numérique', 'Intégrer, héberger ou développer avec nous des solutions numériques.'), ('Médias et communication', 'Visibilité, événements et campagnes communes.')]) + '</div>'
          + sec('Le parcours proposé') + '<div class="steps">' + ''.join(f'<div class="st"><i>{i}</i><b>{E(t)}</b><p>{E(p)}</p></div>' for i, (t, p) in enumerate([
              ('Vous remplissez les fiches', 'Identification et centres d\'intérêt, aux pages suivantes.'), ('Nous étudions votre demande', 'Réponse du groupe après examen du dossier.'), ('Nous nous rencontrons', 'Échange sur vos objectifs et ceux de la filiale concernée.'), ('Nous formalisons', 'Convention ou contrat écrit, signé par les deux parties.')], 1)) + '</div>'
          )
    f1 = secs2([("Le partenaire", [champ('Nom de l\'entreprise ou de l\'organisation', 8, 6.2), champ('Sigle (si besoin)', 4, 6.2), champ('Forme juridique (SARL, SA, association, institution…)', 4, 6.2), champ('Secteur d\'activité', 4, 6.2), champ('RCCM / n° d\'enregistrement', 4, 6.2),
                                  champ('NIU (si disponible)', 4, 6.2), champ('Pays et ville du siège', 4, 6.2), champ('Site web / réseaux sociaux', 4, 6.2), champ('Adresse complète', 12, 6.2)]),
              ("La personne à contacter", [champ('Nom et prénoms', 6, 6.2), champ('Fonction', 6, 6.2), champ('Téléphone', 4, 6.2), champ('WhatsApp', 4, 6.2), champ('E-mail', 4, 6.2)]),
              ("Votre activité", [lignes('Présentation de votre entreprise ou organisation (activité, ancienneté, effectif, zones couvertes)', 4, 12, 7.2), lignes('Principales références ou réalisations', 3, 12, 7.2)])])
    f2 = secs2([("Les filiales qui m'intéressent", [cases('Cochez une ou plusieurs filiales', FIL_COCHES, 12)]),
               ("La forme de partenariat souhaitée", [cases('Je souhaite', ['Distribution / revente', 'Fournisseur / prestataire', 'Investissement / financement', 'Partenariat institutionnel', 'Partenariat technique / numérique', 'Médias / communication', 'Autre'], 12), champ('Si « autre », précisez', 12, 6.4)]),
               ("Zone et calendrier", [champ('Zone géographique visée', 6, 6.4), champ('Calendrier souhaité', 6, 6.4), champ('Budget ou volume envisagé (si pertinent)', 12, 6.4)])])
    f3 = secs2([("Ma proposition", [lignes('Ce que je propose à STAR ENTREPRISE', 5, 12, 7.4), lignes('Ce que j\'attends du partenariat', 5, 12, 7.4), lignes('Informations complémentaires ou documents joints', 3, 12, 7.4)]),
               ("Mon engagement", [])])
    f3 += '<p class="note" style="margin-top:0">Je certifie que les informations données dans ce dossier sont exactes. La remise de ce dossier ne crée aucune obligation pour STAR ENTREPRISE ni pour moi : seule une convention écrite, signée par les deux parties, engage.</p>' + signatures('Signature du partenaire', 'Date et lieu', 'Visa et cachet STAR ENTREPRISE', 19)
    total = 6
    P.append(titre_page(f, 2, total, 'Présentation du groupe', tete, "Qui est <em>STAR ENTREPRISE</em>", 'Un groupe multi-métiers fondé par Carry OTEMBA', c2))
    P.append(titre_page(f, 3, total, 'Les filiales', tete, "Les 21 filiales <em>du groupe</em>", 'Une même étoile, des métiers complémentaires', c3))
    P.append(titre_page(f, 4, total, 'Devenir partenaire', tete, "Devenir <em>partenaire</em>", 'Pourquoi, comment, avec qui', c4))
    P.append(titre_page(f, 5, total, 'Identification', tete, "Fiche <em>d'identification</em>", 'À remplir par le futur partenaire', f1, reserve(['N° de dossier', 'Date de réception', 'Reçu par'])))
    P.append(titre_page(f, 6, total, 'Centres d\'intérêt', tete, "Fiche <em>d'intérêt</em>", 'Les filiales et la forme de partenariat', f2, reserve(['N° de dossier', 'Filiale référente', 'Décision'])))
    P.append(titre_page(f, 7, total, 'Proposition et engagement', tete, "Votre <em>proposition</em>", 'Ce que vous apportez, ce que vous attendez', f3, reserve(['N° de dossier', 'Rendez-vous le', 'Suite donnée'])))
    return rendre('STAR-ENTREPRISE-Dossier-de-partenariat', [p.replace('sur 6', 'sur 7') for p in P])
FICHES['partenaire'] = partenaire

# ---------------------------------------------------------------- 2 et 3. STAR BEACH VILLAGE
def beach_assets():
    ph = lambda n, *c: I.panneau(n, *c)
    return dict(
        collage=SITE + '/images/star-beach-village-entree.jpg',
        panneau_enseigne=ph('enseigne', 352, 0, 748, 720), panneau_bar=ph('bar', 0, 0, 347, 245), panneau_salon=ph('salon', 0, 248, 347, 485), panneau_tunnel=ph('tunnel', 0, 488, 347, 720),
        panneau_couple=ph('couple', 752, 0, 1080, 290), panneau_cocktails=ph('cocktails', 752, 293, 1080, 497), panneau_nuit=ph('nuit', 752, 500, 1080, 720),
        bungalows=I.unsplash(I.BEACH_UNSPLASH['bungalows'][0], 1600), village=I.unsplash(I.BEACH_UNSPLASH['village'][0], 1600), resort=I.unsplash(I.BEACH_UNSPLASH['resort'][0], 1600))
ILLU = '<div class="cap">Visuel d\'illustration, non contractuel : les images définitives du projet seront communiquées.</div>'
CRED_BEACH = 'Photos d\'ambiance : Unsplash (licence libre) — Jonathan Borba, Irvin Liang, Luc L. Visuels du collage et panneaux : documents officiels STAR BEACH VILLAGE.'
def beach_presentation():
    A = beach_assets(); f = dict(nom='STAR Beach Village', rub='Tourisme & immobilier de prestige', wordmark=True); tete = entete(f)[0]
    cov = couverture(f, 'STAR BEACH VILLAGE<br><span style="color:#ffd466">Pointe-Noire mérite sa Riviera</span>', 'La Riviera congolaise, au bord de l\'océan', 'Dossier de présentation', f'<img src="{I.datauri(A["collage"], 1080, 88)}" style="width:100%;height:100%;object-fit:cover;object-position:center 40%">')
    n = 5; P = [cov]
    p2 = ('<p class="intro">Sur la zone de la Brasserie de la Mer, <b>STAR BEACH VILLAGE</b> réunit Tiny Houses, villas d\'exception et résidences de prestige au bord de l\'océan : un projet emblématique pour le tourisme, l\'immobilier moderne et l\'attractivité économique de Pointe-Noire.</p>'
          + f'<div class="row r21" style="margin-top:2.6mm">{img(A["bungalows"], 72, 1400)}{img(A["panneau_enseigne"], 72, 700, "center 30%")}</div>' + ILLU
          + sec('Pourquoi STAR BEACH VILLAGE') + cartes([('Emplacement d\'exception', 'Zone Brasserie de la Mer, au bord de l\'océan à Pointe-Noire, à quelques minutes du centre-ville.'), ('Immobilier nouvelle génération', 'Tiny Houses, villas et résidences pensées pour le confort et le prestige.'),
                                                           ('Investissement à impact', 'Un projet qui participe au développement touristique et économique du Congo.'), ('Art de vivre et bien-être', 'Spa, restauration et espaces de détente au bord de l\'océan.')])
          + '<div class="cite" style="margin-top:3.4mm">« STAR BEACH VILLAGE n\'est pas qu\'un projet immobilier. C\'est notre façon de dire que Pointe-Noire mérite un tourisme moderne, une attractivité économique nouvelle et des emplois durables pour sa jeunesse. »<span>Carry OTEMBA, fondateur et PDG de STAR ENTREPRISE</span></div>')
    p3 = ('<p class="intro">Des espaces pensés pour la détente, le bien-être et la convivialité, au bord de l\'eau. <span class="badge">Bientôt disponible</span></p>'
          + f'<div class="row r3" style="margin-top:2.4mm">{img(A["panneau_bar"], 50, 700)}{img(A["panneau_salon"], 50, 700)}{img(A["panneau_tunnel"], 50, 700, "center 55%")}</div>'
          + sec('Le village') + cartes([('Bar de plage', 'Des moments de détente au coucher du soleil, les pieds dans le sable.'), ('Spa et bien-être', 'Soins et rituels bien-être face à l\'océan, dans un cadre apaisant.'), ('Restaurant panoramique', 'Une table d\'exception avec vue sur l\'océan.')], 't3')
          + f'<div class="row r2" style="margin-top:3mm">{img(A["panneau_couple"], 52, 700)}{img(A["panneau_cocktails"], 52, 700)}</div>'
          + sec('L\'expérience') + '<ul class="liste"><li>Accès direct au bord de mer, à quelques minutes du centre-ville.</li><li>Sécurité et conciergerie sur l\'ensemble du village.</li><li>Espaces de détente pensés pour les familles comme pour les hôtes d\'affaires.</li><li>Une passerelle naturelle avec les autres filiales du groupe : STAR JET, STAR EVENTS, STAR CASA.</li></ul>')
    p4 = ('<p class="intro">Trois signatures, une même exigence : des résidences pensées pour l\'investissement, le séjour ou la réception d\'hôtes de marque.</p>'
          + '<div class="row r3" style="margin-top:2.4mm">' + ''.join(f'<div>{img(a, 48, 700)}<div class="sv" style="margin-top:1.6mm;padding:2.6mm 3mm"><b style="font-size:9.6pt">{E(t)}</b><p style="font-size:7.8pt"><i style="color:#ffd466;font-style:normal;font-weight:600">{E(s)}</i><br>{p}</p></div></div>' for a, t, s, p in [
              (A['bungalows'], 'Tiny Houses', 'Signature compacte', 'Design contemporain et optimisé · vue mer partielle à totale selon l\'implantation · idéal pour un séjour ou un investissement locatif.'),
              (A['resort'], 'Villas Executive & Signature', 'Confort supérieur', 'Espaces généreux et lumineux · finitions haut de gamme · accès privilégié aux commodités du village.'),
              (A['village'], 'Résidence Présidentielle', 'Exception', 'Pensée pour les hôtes de marque · conciergerie dédiée · confidentialité et sécurité renforcées.')]) + '</div>' + ILLU
          + sec('Investissement et impact') + cartes([('Un investissement à forte valeur', 'Un accès privilégié à un marché touristique et immobilier en pleine croissance à Pointe-Noire, porté par un groupe déjà implanté sur plus de 20 filiales.'), ('Un impact concret pour le Congo', 'Création d\'emplois locaux, valorisation des savoir-faire congolais et renforcement de l\'attractivité économique du territoire.')])
          + sec('Un projet ouvert à ses partenaires') + '<div class="contact" style="grid-template-columns:repeat(4,1fr)">' + ''.join(f'<div class="c" style="text-align:center"><b>{E(t)}</b></div>' for t in ['Institutions publiques', 'Banques et investisseurs', 'Groupes touristiques', 'Autorités locales']) + '</div>')
    p5 = (sec('Arriver en toute discrétion : STAR JET') + f'<div class="row r12" style="margin-top:1.4mm">{img(A["village"], 46, 1100)}<div class="c"><b>Séjour + vol privé</b><p>Combinez votre séjour à STAR BEACH VILLAGE avec un vol privé STAR JET, pour une arrivée sur mesure à Pointe-Noire.</p></div></div>'
          + sec('Construisons ensemble la Riviera de Pointe-Noire') + '<p class="intro" style="margin-top:1.2mm">Investisseurs, partenaires institutionnels ou futurs résidents : parlons de votre projet. Les prix et conditions sont communiqués sur demande (« nous consulter »).</p>' + contact_cartes()
          + sec('Pour investir') + '<p class="intro" style="margin-top:1.2mm">Remplissez le <b>dossier d\'investisseur STAR BEACH VILLAGE</b> (document séparé) : choix de la résidence ou de la Tiny House, fiche investisseur et lettre d\'intention. Notre équipe vous répond ensuite.</p>'
          + f'<p class="cap" style="margin-top:4mm">{E(CRED_BEACH)}</p>')
    P.append(titre_page(f, 2, n, 'Le projet', tete, "Le projet <em>en un regard</em>", 'Zone Brasserie de la Mer, Pointe-Noire', p2))
    P.append(titre_page(f, 3, n, 'Le village', tete, "Une expérience <em>complète</em>", 'Au bord de l\'eau, du coucher du soleil au bien-être', p3))
    P.append(titre_page(f, 4, n, 'Résidences et impact', tete, "Nos <em>résidences</em>", 'Tiny Houses, villas, résidence présidentielle', p4))
    P.append(titre_page(f, 5, n, 'Contact', tete, "Nous <em>rejoindre</em>", 'Investisseurs, partenaires, futurs résidents', p5))
    return rendre('STAR-BEACH-VILLAGE-Dossier-de-presentation', [p.replace(f'sur {n}', f'sur {n + 1}') for p in P])
FICHES['beach-presentation'] = beach_presentation

def beach_investisseur():
    A = beach_assets(); f = dict(nom='STAR Beach Village', rub='Dossier d\'investisseur', wordmark=True); tete = entete(f)[0]
    cov = couverture(f, 'Investir à<br><span style="color:#ffd466">STAR BEACH VILLAGE</span>', 'Résidences et Tiny Houses au bord de l\'océan, à Pointe-Noire', 'Dossier d\'investisseur', f'<img src="{I.datauri(A["bungalows"], 1500, 88)}" style="width:100%;height:100%;object-fit:cover;object-position:center 45%">')
    n = 5; P = [cov]
    p2 = ('<p class="intro">Choisissez la signature qui correspond à votre projet : séjour, investissement locatif ou réception d\'hôtes de marque. <b>Prix et conditions : nous consulter.</b></p>'
          + ''.join(f'<div class="row r21" style="margin-top:3mm;align-items:stretch">{img(a, 44, 1200, pos)}<div class="sv"><b>{E(t)}</b><p><i style="color:#ffd466;font-style:normal;font-weight:600">{E(s)}</i></p><p style="margin-top:1mm">{p}</p></div></div>' for a, pos, t, s, p in [
              (A['bungalows'], 'center 55%', 'Tiny Houses', 'Signature compacte', '• Design contemporain et optimisé<br>• Vue mer partielle à totale selon l\'implantation<br>• Idéal pour un séjour ou un investissement locatif'),
              (A['resort'], 'center 50%', 'Villas Executive & Signature', 'Confort supérieur', '• Espaces généreux et lumineux<br>• Finitions haut de gamme<br>• Accès privilégié aux commodités du village'),
              (A['village'], 'center 40%', 'Résidence Présidentielle', 'Exception', '• Pensée pour les hôtes de marque<br>• Service de conciergerie dédié<br>• Confidentialité et sécurité renforcées')]) + ILLU)
    p3 = (sec('Pourquoi investir à STAR BEACH VILLAGE') + cartes([('Un emplacement d\'exception', 'Zone Brasserie de la Mer, au bord de l\'océan, à quelques minutes du centre-ville de Pointe-Noire.'), ('Un marché en croissance', 'Un accès privilégié à un marché touristique et immobilier en pleine croissance, porté par un groupe implanté sur plus de 20 filiales.'),
                                                                  ('Un village de vie', 'Bar de plage, spa et bien-être, restaurant panoramique (bientôt disponibles), sécurité et conciergerie.'), ('Un impact concret', 'Emplois locaux, savoir-faire congolais valorisés, attractivité économique renforcée.')])
          + f'<div class="row r3" style="margin-top:3mm">{img(A["panneau_nuit"], 46, 700)}{img(A["panneau_enseigne"], 46, 700, "center 35%")}{img(A["panneau_couple"], 46, 700)}</div>'
          + sec('Comment investir : le parcours proposé') + '<div class="steps">' + ''.join(f'<div class="st"><i>{i}</i><b>{E(t)}</b><p>{E(p)}</p></div>' for i, (t, p) in enumerate([
              ('Vous remplissez le dossier', 'Fiche investisseur et lettre d\'intention (pages suivantes).'), ('Nous vous répondons', 'Présentation détaillée, prix et disponibilités.'), ('Visite et échange', 'Rencontre avec l\'équipe et visite du site.'), ('Contrat écrit', 'Réservation et conditions formalisées par écrit.')], 1)) + '</div>'
          + f'<p class="cap" style="margin-top:3mm">{E(CRED_BEACH)}</p>')
    f1 = secs2([("L'investisseur", [champ('Nom et prénoms (ou raison sociale)', 8, 6.4), champ('Nationalité / pays de résidence', 4, 6.4), champ('Pièce d\'identité (type et n°)', 6, 6.4), champ('Profession / activité', 6, 6.4), champ('Adresse complète', 12, 6.4), champ('Téléphone', 4, 6.4), champ('WhatsApp', 4, 6.4), champ('E-mail', 4, 6.4)]),
               ("Mon projet d'investissement", [cases('Je suis intéressé(e) par', ['Tiny House', 'Villa Executive', 'Villa Signature', 'Résidence Présidentielle'], 12), cases('Usage prévu', ['Séjour personnel', 'Investissement locatif', 'Réception d\'hôtes', 'Autre'], 12),
                                                champ('Nombre d\'unités', 3, 6.4), champ('Budget indicatif envisagé (FCFA)', 5, 6.4), champ('Calendrier souhaité', 4, 6.4), cases('Mode de financement', ['Fonds propres', 'Crédit bancaire', 'Mixte', 'Autre'], 12)])])
    f2 = secs2([("Lettre d'intention", [lignes('Je souhaite investir dans STAR BEACH VILLAGE parce que… (mon projet, mes attentes)', 5, 12, 7.2), lignes('Questions ou besoins particuliers', 3, 12, 7.2)]),
               ("Ce que je demande", [cases('Je souhaite', ['Recevoir la présentation détaillée', 'Connaître les prix', 'Visiter le site', 'Rencontrer l\'équipe', 'Être rappelé(e) par WhatsApp'], 12), champ('Meilleur moment pour me joindre', 6, 6.4), champ('Langue souhaitée', 6, 6.4)])])
    f2 += '<p class="note">Cette fiche exprime une <b>intention</b> et n\'engage ni l\'investisseur ni STAR ENTREPRISE. Seul un contrat écrit, signé par les deux parties, vaut engagement. Les visuels sont des illustrations non contractuelles.</p>' + signatures('Signature de l\'investisseur', 'Date et lieu', 'Visa et cachet STAR BEACH VILLAGE', 17)
    P.append(titre_page(f, 2, n, 'Choisir sa résidence', tete, "Choisir <em>sa résidence</em>", 'Trois signatures, une même exigence', p2))
    P.append(titre_page(f, 3, n, 'Pourquoi investir', tete, "Pourquoi <em>investir ici</em>", 'Un lieu, un marché, un impact', p3))
    P.append(titre_page(f, 4, n, 'Fiche investisseur', tete, "Fiche <em>investisseur</em>", 'À remplir par la personne ou la société intéressée', f1, reserve(['N° de dossier', 'Date de réception', 'Conseiller'])))
    P.append(titre_page(f, 5, n, 'Lettre d\'intention', tete, "Lettre <em>d'intention</em>", 'Vos attentes et votre demande', f2, reserve(['N° de dossier', 'Rendez-vous le', 'Suite donnée'])))
    return rendre('STAR-BEACH-VILLAGE-Dossier-investisseur', [p.replace(f'sur {n}', f'sur {n + 1}') for p in P])
FICHES['beach-investisseur'] = beach_investisseur

# ---------------------------------------------------------------- 4 et 5. STAR CASA catalogues
def casa_catalogue(code, titre, sous, liste, nom_pdf, intro, prefixe, texte_fiche):
    f = dict(nom='STAR CASA', rub='Bien-être à domicile', wordmark=True); tete = entete(f)[0]
    paires = [liste[i:i + 6] for i in range(0, len(liste), 6)]; n = 1 + len(paires) + 1
    cov = couverture(f, titre, sous, 'Catalogue de coiffures', '<div class="img" style="height:100%;border-radius:0;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:1fr;gap:1.2mm;background:#041030">' + ''.join(f'<div class="img" style="border-radius:0"><img src="{I.datauri(I.unsplash(p, 900), 700)}" style="object-position:center 24%"></div>' for _, p, _, _ in liste[:6]) + '</div>',
                     f'<div style="margin-top:4mm"><span class="badge" style="background:#ffd466;color:#041030;border-color:#ffd466">{len(liste)} modèles numérotés {prefixe}-01 à {liste[-1][0]}</span></div>')
    P = [cov]
    for k, grp in enumerate(paires, 1):
        cells = ''.join(f'<div class="it"><div class="im"><img src="{I.datauri(I.unsplash(p, 900), 700)}"></div><div class="num">{E(num)}</div><div class="nm">{E(nm)}</div><div class="ck">Je choisis le {E(num)}</div></div>' for num, p, nm, _ in grp)
        if len(grp) < 6:
            cells += f'<div class="vide"><b>Une autre idée ?</b><span>Montrez-nous votre photo de référence : notre coiffeuse la réalisera chez vous.</span></div>'
        corps = (f'<p class="intro" style="margin-top:1.4mm">{E(intro)}</p><div class="cat">{cells}</div>')
        P.append(titre_page(f, 1 + k, n, f'Catalogue {k}/{len(paires)}', tete, f"Coiffures pour <em>{'femmes' if prefixe == 'F' else 'petites filles'}</em> ({k}/{len(paires)})", sous, corps))
    cred = ' · '.join(sorted({a for _, _, _, a in liste}))
    last = (sec('Comment réserver votre coiffure à domicile') + '<div class="steps">' + ''.join(f'<div class="st"><i>{i}</i><b>{E(t)}</b><p>{E(p)}</p></div>' for i, (t, p) in enumerate([
              ('Choisissez', f'Repérez le numéro de la coiffure qui vous plaît (ex. {liste[0][0]}).'), ('Notez le numéro', f'Écrivez-le sur la fiche « Réservation à domicile » (case N° de coiffure).'), ('Nous venons chez vous', 'Rendez-vous à l\'adresse et à l\'heure de votre choix.'), ('Profitez', 'Votre coiffure est réalisée à domicile, sans déplacement.')], 1)) + '</div>'
            + sec('Bon à savoir') + '<ul class="liste"><li>' + texte_fiche + '</li><li>Les photos sont des <b>modèles d\'inspiration</b> : le résultat dépend de votre type de cheveux, de la longueur et de l\'état de votre chevelure ; la coiffeuse vous conseille sur place.</li><li>Les prix et la durée dépendent de la coiffure choisie et sont confirmés à la réservation par STAR CASA : aucun prix n\'est indiqué dans ce catalogue.</li><li>Réservation en ligne ou par téléphone : WhatsApp +242 06 656 50 50.</li></ul>'
            + sec('Réservation rapide') + table(['N° de coiffure', 'Nom de la cliente', 'Téléphone', 'Date souhaitée', 'Adresse (repère)'], 4, 9, ['14%', '24%', '18%', '16%', '28%'])
            + f'<p class="cap" style="margin-top:3.4mm">Images d\'inspiration : Unsplash (licence libre), tous droits réservés à leurs auteurs — {E(cred)}. Ces photos ne sont pas des réalisations de STAR CASA.</p>')
    P.append(titre_page(f, n, n, 'Réserver', tete, "Réservez <em>à domicile</em>", 'Votre numéro de coiffure sur la fiche de réservation', last))
    return rendre(nom_pdf, [p.replace(f'sur {n}', f'sur {n}') for p in P])
def casa_femmes():
    return casa_catalogue('F', 'Catalogue de coiffures<br><span style="color:#ffd466">pour femmes</span>', 'Coiffures africaines : tresses, nattes, twists, afro, chignons', I.FEMMES, 'STAR-CASA-Catalogue-coiffures-femmes',
        'Choisissez votre coiffure et notez son numéro (F-01 à F-12) sur la fiche de réservation à domicile.', 'F', 'Notez le numéro de la coiffure (F-01 à F-12) dans la case « N° de coiffure » de la <b>fiche de réservation à domicile</b> STAR CASA.')
def casa_filles():
    return casa_catalogue('E', 'Catalogue de coiffures<br><span style="color:#ffd466">pour petites filles</span>', 'Nattes, tresses à perles, chignons : des coiffures douces pour les enfants', I.FILLES, 'STAR-CASA-Catalogue-coiffures-filles',
        'Choisissez la coiffure de votre fille et notez son numéro (E-01 à E-10) sur la fiche de réservation à domicile.', 'E', 'Notez le numéro de la coiffure (E-01 à E-10) dans la case « N° de coiffure » de la <b>fiche de réservation à domicile</b> STAR CASA. Les parents choisissent et restent auprès de l\'enfant pendant la coiffure.')
FICHES['casa-femmes'] = casa_femmes; FICHES['casa-filles'] = casa_filles


# ---------------------------------------------------------------- 4bis. STAR CASA : catalogue des 8 planches de Carry + fiche de réservation
def casa_planches():
    import planches as PL
    f = dict(nom='STAR CASA', rub='Bien-être à domicile', wordmark=True); tete = entete(f)[0]
    LETTRES = 'ABCDEFGH'; total = PL.TOTAL
    mos = [(f'{HERE}/planches/A.jpg', (0, 0, 184, 219)), (f'{HERE}/planches/A.jpg', (368, 219, 552, 438)), (f'{HERE}/planches/G.jpg', (0, 0, 245, 305)),
           (f'{HERE}/planches/G.jpg', (245, 305, 490, 610)), (f'{HERE}/planches/H.jpg', (245, 0, 490, 304)), (f'{HERE}/planches/B.jpg', (245, 378, 490, 731))]
    mosaique = '<div class="img" style="height:100%;border-radius:0;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:1fr;gap:1.2mm;background:#041030">' + ''.join('<div class="img" style="border-radius:0"><img src="' + I.datauri(p, 900, crop=c) + '" style="object-position:center 25%"></div>' for p, c in mos) + '</div>'
    cov = couverture(f, 'Catalogue de coiffures<br><span style="color:#ffd466">STAR CASA</span>', 'Tresses, nattes, twists, afro, chignons : choisissez, nous venons chez vous', 'Catalogue de coiffures', mosaique,
                     '<div style="margin-top:4mm"><span class="badge" style="background:#ffd466;color:#041030;border-color:#ffd466">8 planches · ' + str(total) + ' coiffures numérotées · réservation à domicile</span></div>')
    nb = 11
    steps = [('Feuilletez', 'Parcourez les 8 planches (A à H) et repérez la coiffure qui vous plaît.'), ('Notez le code', 'Lettre de la planche + numéro : par exemple C-7 ou F-15.'), ('Remplissez la fiche', 'Inscrivez le code dans la fiche « Réservation à domicile » jointe à la fin.'), ('Nous venons chez vous', 'Rendez-vous à l\'adresse et à l\'heure de votre choix.')]
    tab = ''.join('<tr><td style="font-weight:800;text-align:center;font-family:PF,serif;font-size:11pt;color:#041030">' + L + '</td><td>' + E(PL.PLANCHES[L][2]) + '</td><td style="text-align:center">' + L + '-1 à ' + L + '-' + str(PL.PLANCHES[L][1]) + '</td><td style="text-align:center">' + str(PL.PLANCHES[L][1]) + '</td></tr>' for L in LETTRES)
    p2 = ('<p class="intro">Voici le catalogue de coiffures africaines de STAR CASA : <b>' + str(total) + ' modèles</b> répartis en 8 planches. Chaque coiffure porte un numéro. Votre coiffeuse se déplace chez vous pour la réaliser.</p>'
          + sec('Comment réserver') + '<div class="steps">' + ''.join('<div class="st"><i>' + str(i) + '</i><b>' + E(a) + '</b><p>' + E(b) + '</p></div>' for i, (a, b) in enumerate(steps, 1)) + '</div>'
          + sec('Les 8 planches') + '<table style="--lh:8mm"><thead><tr><th style="width:9%">Planche</th><th>Style</th><th style="width:22%">Codes</th><th style="width:14%">Coiffures</th></tr></thead><tbody>' + tab + '<tr><td colspan="3" style="text-align:right;font-weight:600">Total</td><td style="text-align:center;font-weight:800">' + str(total) + '</td></tr></tbody></table>'
          + sec('Bon à savoir') + '<ul class="liste"><li>Les photos sont des <b>modèles d\'inspiration</b> : le résultat dépend de votre type de cheveux, de leur longueur et de leur état ; la coiffeuse vous conseille sur place.</li><li>Le prix et la durée dépendent de la coiffure choisie et sont <b>confirmés à la réservation</b> par STAR CASA : aucun prix n\'est affiché dans ce catalogue.</li><li>Réservation en ligne ou par téléphone : WhatsApp +242 06 656 50 50.</li></ul>')
    P = [cov, titre_page(f, 2, nb, 'Comment choisir', tete, "Choisir <em>sa coiffure</em>", 'Planches A à H · coiffure à domicile', p2)]
    for k, L in enumerate(LETTRES):
        im, n, th = PL.PLANCHES[L]; src = PL.OUTIMG[L]
        P.append('<div class="pl"><div class="plh"><div><span class="plk">PLANCHE</span><span class="plL">' + L + '</span></div><div class="plt"><b>' + E(th) + '</b><span>Coiffures ' + L + '-1 à ' + L + '-' + str(n) + ' · notez la lettre et le numéro sur votre fiche de réservation</span></div><div class="pls">STAR <b>CASA</b></div></div>'
                 '<div class="plim"><img src="' + I.datauri(src, 1100, 90) + '"></div>'
                 '<div class="plf"><div>STAR CASA · Coiffure à domicile · WhatsApp +242 06 656 50 50 · contact@starentreprise.com<br>Images d\'inspiration (sources Pinterest) : droits réservés à leurs auteurs. Ce ne sont pas des réalisations STAR CASA.<span>Page ' + str(3 + k) + ' sur 12</span></div><img src="' + STAR + '"></div></div>')
    dern = (sec('Réservation rapide') + '<p class="intro" style="margin-top:1.4mm">Remplissez une ligne par coiffure choisie, puis remettez cette page à STAR CASA ou envoyez-la par WhatsApp. La fiche complète « Réservation à domicile » suit.</p>'
            + table(['Code de la coiffure', 'Nom de la cliente', 'Téléphone', 'Date souhaitée', 'Adresse (repère)'], 8, 10, ['16%', '24%', '18%', '16%', '26%']))
    P.append(titre_page(f, 11, nb, 'Réservation rapide', tete, "Réservation <em>rapide</em>", 'Votre code de coiffure, votre adresse, votre date', dern))
    css = """.pl{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;background:#fffdf7}
.plh{height:23mm;background:radial-gradient(60% 120% at 40% 0%,#10285f,#041030 75%);display:flex;align-items:center;gap:6mm;padding:0 12mm;border-bottom:1.6mm solid #b98a2c;color:#fff}
.plk{display:block;font-weight:600;font-size:6.4pt;letter-spacing:.3em;color:#e3b653}.plL{font-family:PF,serif;font-weight:800;font-size:30pt;line-height:.95;color:#ffd466}
.plt{flex:1}.plt b{display:block;font-family:PF,serif;font-size:15pt;font-weight:700}.plt span{font-size:7.6pt;color:#d9e3ff}
.pls{font-family:PF,serif;font-weight:800;font-size:15pt;letter-spacing:.1em}.pls b{color:#ffd466}
.plim{position:absolute;left:0;right:0;top:23mm;bottom:21mm;display:flex;align-items:center;justify-content:center;padding:3mm 0}.plim img{max-width:200mm;max-height:100%;width:auto;height:auto;display:block;border:.5mm solid #e3c98a;box-shadow:0 1mm 4mm rgba(0,0,0,.18)}
.plf{position:absolute;left:0;right:0;bottom:0;height:21mm;display:flex;align-items:center;justify-content:space-between;padding:0 12mm;font-size:6.6pt;color:#6a6f82;line-height:1.5;border-top:.35mm solid #e3c98a}.plf span{display:block;color:#a77a1c;font-weight:600;letter-spacing:.08em}.plf img{height:15mm;width:15mm;object-fit:contain}"""
    pdf1 = rendre('STAR-CASA-Catalogue-coiffures-8-planches', [p.replace('sur 11', 'sur 12') for p in P], css)
    fiche = os.path.join(OUT, 'STAR-CASA-Fiche-de-reservation-a-domicile.pdf')
    final = os.path.join(OUT, 'STAR-CASA-Catalogue-coiffures-et-reservation.pdf')
    if os.path.exists(fiche): subprocess.run(['pdfunite', pdf1, fiche, final], check=True); print('   joint à la fiche de réservation ->', final)
    return final
FICHES['casa-planches'] = casa_planches

# ---------------------------------------------------------------- 6. CARRY.O AFRIQUE : certificat
def certificat():
    star = STAR
    css = """@page{size:A4 landscape;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{font-family:ID,sans-serif;font-weight:300;color:#1b1f2b;background:#fff;width:297mm}
.cert{position:relative;width:297mm;height:210mm;overflow:hidden;page-break-after:always;background:#fffdf7}
.b1{position:absolute;inset:6mm;border:1.6mm solid #b98a2c}.b2{position:absolute;inset:10.5mm;border:.35mm solid #b98a2c}.b3{position:absolute;inset:12.5mm;border:.35mm solid #e3c98a}
.coin{position:absolute;width:16mm;height:16mm;border:.6mm solid #b98a2c}.coin.a{left:9mm;top:9mm;border-right:0;border-bottom:0}.coin.b{right:9mm;top:9mm;border-left:0;border-bottom:0}.coin.c{left:9mm;bottom:9mm;border-right:0;border-top:0}.coin.d{right:9mm;bottom:9mm;border-left:0;border-top:0}
.fond{position:absolute;inset:0;opacity:.055;display:grid;place-items:center}.fond svg{width:150mm;height:145mm}
.ct{position:absolute;left:0;right:0;top:17mm;text-align:center}
.marque{font-family:PF,serif;font-weight:800;font-size:25pt;letter-spacing:.12em;color:#041030}.marque b{color:#a77a1c}
.sm{font-weight:600;font-size:7.6pt;letter-spacing:.34em;text-transform:uppercase;color:#a77a1c;margin-top:1mm}
.ctt{position:absolute;left:0;right:0;top:44mm;text-align:center}
.ctt h1{font-family:PF,serif;font-weight:800;font-size:27pt;color:#041030;letter-spacing:.02em}.ctt h1 em{color:#a77a1c;font-style:italic}
.ctt .l{width:92mm;height:.5mm;margin:2.4mm auto;background:linear-gradient(90deg,transparent,#b98a2c,transparent)}
.ctt p{font-family:CG,serif;font-style:italic;font-weight:500;font-size:11.5pt;color:#4a5068}
.cco{position:absolute;left:24mm;right:24mm;top:72mm}
.cadre{position:absolute;left:0;top:0;width:66mm;height:80mm;border:.5mm solid #c9b57a;background:repeating-linear-gradient(45deg,#fffefa,#fffefa 3mm,#fbf7ea 3mm,#fbf7ea 6mm);display:flex;align-items:center;justify-content:center;text-align:center;font-size:7.4pt;color:#7a5a12;letter-spacing:.14em;text-transform:uppercase;font-weight:600;line-height:1.5}
.zone{position:absolute;left:73mm;right:0;top:0}
.attest{font-size:9.2pt;line-height:1.55;color:#2b3042;margin-bottom:3.2mm}.attest b{color:#041030;font-weight:600}
.cgr{display:grid;grid-template-columns:repeat(12,1fr);gap:2mm 4mm}
.f label{display:block;font-weight:600;font-size:6.2pt;letter-spacing:.14em;text-transform:uppercase;color:#7a5a12;margin-bottom:.5mm}.f .li{border-bottom:.35mm solid #b9a463;height:6.4mm}
.cnum{font-family:PF,serif;font-weight:800;font-size:15pt;color:#041030;display:flex;align-items:flex-end;gap:2mm;height:8.6mm}.cnum span{display:inline-block;width:20mm;border-bottom:.35mm solid #b9a463;height:7mm}.cnum em{font-style:normal;font-size:12pt;color:#a77a1c}
.bas{position:absolute;left:24mm;right:24mm;bottom:20mm;display:grid;grid-template-columns:1fr 1fr 40mm 1fr;gap:6mm;align-items:end}
.sg{border-top:.4mm solid #041030;padding-top:1.2mm;font-size:7pt;letter-spacing:.1em;text-transform:uppercase;font-weight:600;color:#4a5068;min-height:0;display:flex;flex-direction:column;justify-content:flex-start}.sg i{font-family:CG,serif;font-style:italic;text-transform:none;letter-spacing:0;font-size:9.4pt;color:#041030;font-weight:500}
.sceau{width:34mm;height:34mm;border:.5mm dashed #b98a2c;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;font-size:6.2pt;letter-spacing:.14em;text-transform:uppercase;color:#a77a1c;font-weight:600;line-height:1.5;margin:0 auto}
.cp{position:absolute;left:0;right:0;bottom:12.5mm;text-align:center;font-size:6.6pt;color:#6a6f82;letter-spacing:.06em}
.logo{position:absolute;right:20mm;top:19mm;width:22mm;text-align:center}.logo img{width:22mm;height:22mm;object-fit:contain}
h2.v{font-family:PF,serif;font-weight:800;font-size:19pt;color:#041030;text-align:center;margin-top:30mm}
.vc{position:absolute;left:26mm;right:26mm;top:52mm}.vc .c{border:.3mm solid #e3c98a;border-radius:2.4mm;padding:3.2mm 4mm;background:#fffdf7;margin-bottom:3mm}.vc .c b{display:block;font-family:PF,serif;font-weight:700;font-size:11pt;color:#041030;margin-bottom:1mm}.vc .c p{font-size:9pt;line-height:1.5;color:#3a4052}
"""
    fonts = G['CSS'].split('@page')[0]
    def champs(lst): return ''.join(f'<div class="f" style="grid-column:span {s}"><label>{E(l)}</label><div class="li"></div></div>' for l, s in lst)
    p1 = f"""<div class="cert"><div class="fond">{SVG_FOND}</div><div class="b1"></div><div class="b2"></div><div class="b3"></div><div class="coin a"></div><div class="coin b"></div><div class="coin c"></div><div class="coin d"></div>
<div class="ct"><div class="marque">CARRY<b>.</b>O AFRIQUE</div><div class="sm">Galerie d'art de STAR ENTREPRISE · Congo</div></div>
<div class="ctt"><h1>Certificat d'<em>Authenticité</em> &amp; Origine Garantie</h1><div class="l"></div><p>Œuvre originale, numérotée et signée par Carry Otemba</p></div>
<div class="cco"><div class="cadre">Emplacement de la photo de l'œuvre<br>(10 × 13 cm)</div><div class="zone">
<p class="attest">La galerie <b>CARRY.O AFRIQUE</b> certifie que l'œuvre désignée ci-dessous est une <b>œuvre originale</b> de l'artiste peintre <b>Carry Otemba</b>, créée de sa main, <b>numérotée et signée</b> par ses soins, et délivrée avec le présent certificat d'authenticité.</p>
<div class="cgr"><div class="f" style="grid-column:span 12"><label>Titre de l'œuvre</label><div class="li"></div></div>
<div class="f" style="grid-column:span 5"><label>Numéro de l'œuvre</label><div class="cnum"><span></span><em>/</em><span></span></div></div>
{champs([('Année de création', 3), ('Technique et support', 4), ('Dimensions (cm)', 4), ('Lieu de création', 4), ('Référence du catalogue', 4), ('Date de délivrance', 4)])}
<div class="f" style="grid-column:span 12"><label>Remis à (nom et prénoms de l'acquéreur)</label><div class="li"></div></div></div></div></div>
<div class="bas"><div class="sg"><i></i>Signature de l'artiste · Carry Otemba</div><div class="sg"><i></i>Visa de la galerie · CARRY.O AFRIQUE</div><div class="sceau">Cachet<br>et vignette<br>de sécurité</div><div class="sg"><i></i>Signature de l'acquéreur</div></div>
<div class="logo"><img src="{star}"></div>
<div class="cp">STAR ENTREPRISE · {E(RCCM)} · WhatsApp +242 06 656 50 50 · contact@starentreprise.com · www.starentreprise.com</div></div>"""
    p2 = f"""<div class="cert"><div class="fond">{SVG_FOND}</div><div class="b1"></div><div class="b2"></div><div class="b3"></div><div class="coin a"></div><div class="coin b"></div><div class="coin c"></div><div class="coin d"></div>
<div class="ct"><div class="marque">CARRY<b>.</b>O AFRIQUE</div><div class="sm">Origine garantie · Conditions du certificat</div></div>
<div class="vc" style="top:36mm">
<div class="c"><b>Ce que le certificat garantit</b><p>• L'œuvre est un <b>original</b> de Carry Otemba, et non une reproduction.<br>• Elle est <b>numérotée</b> (numéro / total) et <b>signée</b> par l'artiste.<br>• Son <b>origine</b> est la galerie CARRY.O AFRIQUE, filiale de STAR ENTREPRISE (Congo).</p></div>
<div class="c"><b>Le suivre avec l'œuvre</b><p>Ce certificat accompagne l'œuvre : conservez-le avec elle, en cas de revente ou de transmission. Il est remis en un seul exemplaire original, numéroté comme l'œuvre.</p></div>
<div class="c"><b>Vérifier l'authenticité</b><p>Pour vérifier un certificat, contactez la galerie avec le numéro de l'œuvre : WhatsApp +242 06 656 50 50 · contact@starentreprise.com. La galerie conserve le registre des œuvres numérotées.</p></div>
<div class="c"><b>Conservation et droits</b><p>Les droits d'auteur sur l'œuvre restent à l'artiste, sauf mention écrite contraire. Toute reproduction de l'œuvre ou du certificat sans autorisation écrite est interdite.</p></div></div>
<div class="cp">STAR ENTREPRISE · {E(RCCM)} · © 2026 CARRY.O AFRIQUE — Tous droits réservés</div></div>"""
    return rendre('CARRY-O-AFRIQUE-Certificat-authenticite', [p1, p2], css)
FICHES['certificat'] = certificat

if __name__ == '__main__':
    choix = args or list(FICHES)
    for c in choix: FICHES[c]()
