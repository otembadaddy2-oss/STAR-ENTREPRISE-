#!/usr/bin/env python3
"""Fabrique la page « Découvrez qui est STAR ENTREPRISE » : decouvrir/index.html (+ aperçu fichier unique).
Usage :
  python3 tools/fabrique-decouvrir.py            -> écrit decouvrir/index.html
  python3 tools/fabrique-decouvrir.py --apercu X  -> écrit en plus un fichier unique autonome X (images/vidéos intégrées, vidéos allégées)
Prérequis : python3 tools/fabrique-decouvrir-medias.py <images du site officiel>  (prépare decouvrir/img, video, polices)."""
import os, re, sys, base64, subprocess, html, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module
D = import_module('decouvrir-donnees'.replace('-', '_')) if False else None
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'decouvrir-donnees.py'), encoding='utf-8').read())
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = ROOT + '/decouvrir/'
E = html.escape
WA = 'https://wa.me/242066565050'
MAIL = 'contact@starentreprise.com'

# ------------------------------------------------------------------ chapitres (une filiale = un grand chapitre)
def _fig(img, leg, mode, big=False):
    cls = 'gf ' + mode
    return (f'<figure class="{cls}"><div class="gfi"><img src="img/{img}.webp" alt="{E(leg)}" loading="lazy" decoding="async"></div>'
            f'<figcaption>{E(leg)}</figcaption></figure>')
def chapitre(i, c):
    n = i + 1
    wa = f"{WA}?text=" + __import__('urllib.parse').parse.quote(f"Bonjour STAR ENTREPRISE, je souhaite des informations sur {c['nom']}.")
    if c.get('art'):
        hero = (f'<div class="ch-hero art art-{c["art"]}"><div class="art-halo"></div><img class="art-mark" src="img/mark.webp" alt="">'
                f'<span class="art-nom">{E(c["nom"])}</span></div>')
    else:
        im, leg, mode = c['imgs'][0]
        if mode == 'cover':
            hero = f'<div class="ch-hero cover"><img src="img/{im}.webp" alt="{E(leg)}" loading="lazy" decoding="async"></div>'
        elif mode == 'affiche':
            hero = (f'<div class="ch-hero affiche"><img class="bg" src="img/{im}.webp" alt="" aria-hidden="true" loading="lazy">'
                    f'<img class="fg" src="img/{im}.webp" alt="{E(leg)}" loading="lazy" decoding="async"></div>')
        else:
            hero = f'<div class="ch-hero {mode}"><img class="lg" src="img/{im}.webp" alt="{E(leg)}" loading="lazy" decoding="async"></div>'
    pts = ''.join(f'<li><b>{E(a)}</b><span>{E(b)}</span></li>' for a, b in c['pts'])
    reste = c['imgs'][1:] if not c.get('art') else c['imgs']
    if not c.get('art') and c['imgs'] and c['imgs'][0][2] != 'cover':
        pass
    galerie = ''
    if reste:
        galerie = '<div class="gal">' + ''.join(_fig(*x) for x in reste) + '</div>'
    video = ''
    if c.get('video'):
        video = (f'<div class="vid"><video id="v-{c["video"]}" muted loop playsinline preload="none" controls poster="img/p-{c["video"]}.webp">'
                 f'<source src="video/{c["video"]}.mp4" type="video/mp4"></video><span>Le film des événements STAR EVENTS</span></div>')
    return (f'<article class="chap" id="f{n}" data-n="{n}">{hero}<div class="ch-voile"></div>'
            f'<header class="ch-titre"><span class="ch-num">{n:02d}<small> / 21</small></span><span class="ch-rub">{E(c["rub"])}</span>'
            f'<h3>{E(c["nom"])}</h3><p class="ch-acc">{E(c["accroche"])}</p></header>'
            f'<div class="wrap ch-corps"><p class="ch-intro">{E(c["intro"])}</p><ul class="pts">{pts}</ul>{galerie}{video}'
            f'<div class="cta"><a class="btn wa" href="{wa}" target="_blank" rel="noopener">Demander des informations</a>'
            f'<a class="btn" href="https://starentreprise.com/{c["page"]}" target="_blank" rel="noopener">Page officielle →</a></div></div></article>')
def pole(i):
    r, nom, sous = POLES[i]
    return f'<div class="pole"><span class="pole-n">{r}</span><h2>{E(nom)}</h2><p>{E(sous)}</p></div>'
CHAP = ''
for i, c in enumerate(CHAPITRES):
    if i in POLES: CHAP += pole(i) + '\n'
    CHAP += chapitre(i, c) + '\n'
CHIPS = ''.join(f'<a href="#f{i+1}" data-n="{i+1}">{E(c["nom"])}</a>' for i, c in enumerate(CHAPITRES))
FIL = CHAP  # (nom conservé pour le gabarit)

# ------------------------------------------------------------------ tomes
TOMES = '\n'.join(f'<figure class="tome"><img src="img/t{n:02d}.webp" alt="X SAPHIR — Tome {n}, couverture" loading="lazy" decoding="async"><figcaption>TOME {n}</figcaption></figure>' for n in range(1, 11))


def gal_html(items, mode='affiche'):
    return '<div class="gal big">' + ''.join(
        f'<figure class="gf {m}"><div class="gfi"><img src="img/{i}.webp" alt="{E(l)}" loading="lazy" decoding="async"></div><figcaption>{E(l)}{(" — " + E(d)) if d else ""}</figcaption></figure>'
        for i, l, d, m in items) + '</div>'
ARENA_AFF = gal_html([
 ('ar-affiche-A', 'X SAPHIR Arena', 'Le héros et les héroïnes', 'affiche'), ('ar-affiche-B', 'X SAPHIR Arena', 'Face à la menace rouge', 'affiche'),
 ('ar-legendes-1', 'Légendes', 'Calpros en pleine puissance', 'affiche'), ('ar-legendes-2', 'Légendes', 'Les Trois Forces', 'affiche'),
 ('ar-film-pursuit', 'Steel Pursuit', 'Héroïnes et robots', 'affiche'), ('ar-pursuit-1', 'Steel Pursuit', 'La course commence', 'affiche'),
 ('ar-pursuit-2', 'Steel Pursuit', 'Équipe de choc', 'affiche')])
HEROS = ''.join(
    f'<figure class="hero-c"><img src="img/{i}.webp" alt="{E(n)}" loading="lazy" decoding="async"><figcaption><b>{E(n)}</b><span>{E(s)}</span></figcaption></figure>'
    for i, n, s in [('ar-carte-calpros', 'CALPROS', 'Le porteur des Trois Forces'), ('ar-carte-nia', 'NIA MENSAH', "L'architecte magnétique"),
                    ('ar-carte-ayanda', 'AYANDA ZULU', 'Le Phénix'), ('ar-carte-kormal', 'KOR-MAL', 'La menace rouge'), ('ar-carte-nakata', 'SATANA NAKATA', 'Une figure de la saga')])
CONCEPTS = gal_html([('ar-concept-1', 'Le roster en préparation', '', 'cover'), ('ar-concept-2', 'Affiche du jeu : concept', '', 'cover'), ('ar-luna', 'Fiche héroïne : Luna Blaze', '', 'affiche')])
ASTRO = gal_html([('g-astro', 'ASTRO QUEST', 'Cap sur les étoiles', 'affiche'), ('g-astro-regles', 'ASTRO QUEST', 'Les règles', 'affiche'),
                  ('g-astro-vol', 'ASTRO QUEST', 'Vol entre les ennemis', 'affiche'), ('g-astro-gardien', 'ASTRO QUEST', 'Le gardien de Jupiter', 'affiche')])
MARQUES = gal_html([
 ('c-lamah-poster', 'Pices LAMAH', 'La nature a le goût de l\'exception', 'affiche'), ('c-pioupiou', 'PIOUPIOU', "L'univers des petits", 'cover'),
 ('a-pioupiou-komyo', 'PIOUPIOU × KOMYO', 'Les enfants aussi ont leur espace', 'affiche'), ('c-lapinbio', 'Lapin Bio', 'Le bio de chez nous', 'cover'),
 ('c-burkina', 'Burkina Faso Bio', "Terre d'opportunités, terre de richesses", 'cover'), ('c-sosdoc', 'SOS DOC', 'Plateforme numérique', 'cover'),
 ('c-staralerte', 'STAR ALERTE', 'Un geste rapide peut sauver une vie', 'cover'), ('c-dinnovation-btp', 'D-Innovation BTP', "Des infrastructures qui tiennent l'épreuve du terrain", 'cover'),
 ('c-pressing', 'D-Innovation Pressing', 'Nettoyage à sec, lavage et repassage, avec collecte et livraison à domicile', 'cover'), ('c-kindimbou', 'Kindimbou', "Un guide d'utilisation clair", 'cover'),
 ('g-sarah', 'Sarah', 'Assistante digitale des clients STAR ENTREPRISE', 'affiche')])

CSS = r"""
@font-face{font-family:"Inter Display";font-weight:300;font-display:swap;src:url(polices/inter-display-300.woff2) format("woff2")}
@font-face{font-family:"Inter Display";font-weight:600;font-display:swap;src:url(polices/inter-display-600.woff2) format("woff2")}
@font-face{font-family:"Inter Display";font-weight:800;font-display:swap;src:url(polices/inter-display-800.woff2) format("woff2")}
@font-face{font-family:"Playfair Display";font-weight:700;font-display:swap;src:url(polices/playfair-display-latin-700-normal.woff2) format("woff2")}
@font-face{font-family:"Playfair Display";font-weight:800;font-display:swap;src:url(polices/playfair-display-latin-800-normal.woff2) format("woff2")}
@font-face{font-family:"Playfair Display";font-weight:700;font-style:italic;font-display:swap;src:url(polices/playfair-display-latin-700-italic.woff2) format("woff2")}
@font-face{font-family:"Cormorant Garamond";font-weight:500;font-style:italic;font-display:swap;src:url(polices/cormorant-garamond-latin-500-italic.woff2) format("woff2")}
@font-face{font-family:"Cormorant Garamond";font-weight:600;font-style:italic;font-display:swap;src:url(polices/cormorant-garamond-latin-600-italic.woff2) format("woff2")}
@font-face{font-family:"Great Vibes";font-weight:400;font-display:swap;src:url(polices/great-vibes-latin-400-normal.woff2) format("woff2")}
:root{--bg:#07090f;--bg2:#0d1220;--ink:#f6f1e6;--mute:#aeb4c4;--gold:#e3b653;--gold2:#ffe29a;--blue:#2c5be0;--line:rgba(227,182,83,.28);--glass:rgba(13,18,32,.62);--r:22px;--ease:cubic-bezier(.2,.8,.2,1)}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--ink);font-family:"Inter Display",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-weight:300;line-height:1.55;overflow-x:hidden}
img,video{display:block;max-width:100%}
a{color:inherit}
.wrap{width:min(1180px,100%);margin:0 auto;padding-inline:clamp(18px,5vw,40px)}
.gold{background:linear-gradient(100deg,#b98a2c 0%,var(--gold2) 35%,var(--gold) 55%,#fff1c2 75%,#b98a2c 100%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 6s linear infinite}
@keyframes shine{to{background-position:220% center}}
.eyebrow{display:inline-block;font-weight:600;font-size:.74rem;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:14px}
h1,h2,h3,.manif{font-family:"Playfair Display","Times New Roman",Georgia,serif;font-weight:800;line-height:1.08;letter-spacing:-.012em;text-wrap:balance}
.script{font-family:"Great Vibes","Brush Script MT",cursive;font-weight:400;letter-spacing:0;color:var(--gold2)}
.ital{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:500}
h2{font-size:clamp(2.35rem,9.6vw,5.4rem);margin-bottom:18px}
.lead{font-size:clamp(1.02rem,3.8vw,1.28rem);color:var(--mute);max-width:46ch;text-wrap:pretty}
section{position:relative;padding-block:clamp(70px,13vw,140px)}
.btn{display:inline-flex;align-items:center;gap:10px;font:600 1rem/1 "Inter Display",sans-serif;padding:16px 26px;border-radius:999px;text-decoration:none;border:1px solid var(--line);color:var(--ink);background:rgba(255,255,255,.05);transition:transform .3s var(--ease),background .3s,box-shadow .3s;cursor:pointer}
.btn:hover,.btn:focus-visible{transform:translateY(-3px);background:rgba(227,182,83,.14);box-shadow:0 10px 40px -10px rgba(227,182,83,.5)}
.btn.or{background:linear-gradient(135deg,#f6d27a,#c8912c);color:#1a1204;border-color:transparent}
.btn.wa{background:#1fa855;border-color:transparent;color:#fff}
:focus-visible{outline:3px solid var(--gold2);outline-offset:3px}
.droits{font-size:.72rem;letter-spacing:.06em;color:var(--mute);opacity:.85}

/* progression */
#prog{position:fixed;inset:0 auto auto 0;height:3px;width:0;background:linear-gradient(90deg,var(--gold),var(--gold2));z-index:60;box-shadow:0 0 12px var(--gold)}
/* barre */
/* en-tête de site */
#bar{position:fixed;inset:0 0 auto 0;z-index:70;height:calc(60px + env(safe-area-inset-top,0px));display:flex;align-items:center;gap:14px;padding:env(safe-area-inset-top,0px) clamp(14px,4vw,34px) 0;background:rgba(7,9,15,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid #e3b65326;transition:background .4s}
#bar.plein{background:rgba(7,9,15,.92)}
#bar .brand{display:flex;align-items:center;gap:10px;text-decoration:none;margin-right:auto}
#bar .brand img{width:40px;height:34px;object-fit:contain;filter:drop-shadow(0 0 10px rgba(227,182,83,.6))}
#bar .brand span{font-family:"Playfair Display",serif;font-weight:800;letter-spacing:.2em;font-size:.82rem;color:var(--gold2)}
#bar .topnav{display:none;gap:4px}
#bar .topnav a{font:600 .84rem/1 "Inter Display",sans-serif;text-decoration:none;color:var(--mute);padding:10px 12px;border-radius:999px;transition:all .3s}
#bar .topnav a:hover,#bar .topnav a.on{color:#1a1204;background:var(--gold)}
#bar .hcta{padding:10px 16px;font-size:.84rem}
#burger{width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:#0d1220cc;display:grid;place-content:center;gap:5px;cursor:pointer}
#burger i{display:block;width:20px;height:2px;background:var(--gold2);border-radius:2px;transition:transform .35s var(--ease),opacity .25s}
#burger[aria-expanded=true] i:nth-child(1){transform:translateY(7px) rotate(45deg)}
#burger[aria-expanded=true] i:nth-child(2){opacity:0}
#burger[aria-expanded=true] i:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
@media(min-width:1000px){#bar .topnav{display:flex}#burger{display:none}}
#menu{position:fixed;inset:0;z-index:65;background:radial-gradient(100% 70% at 50% 0,#14265a,#05070c);padding:calc(84px + env(safe-area-inset-top,0px)) 24px 30px;overflow-y:auto;animation:menuin .5s var(--ease)}
#menu[hidden]{display:none}
@keyframes menuin{from{opacity:0;transform:translateY(-14px)}}
#menu nav{display:grid;gap:2px;max-width:560px;margin:0 auto}
#menu nav a{display:flex;align-items:baseline;gap:14px;padding:13px 4px;border-bottom:1px solid #e3b65322;text-decoration:none;font-family:"Playfair Display",serif;font-weight:700;font-size:clamp(1.4rem,6.4vw,2rem)}
#menu nav a small{font:600 .72rem "Inter Display",sans-serif;color:var(--gold);letter-spacing:.1em;min-width:1.6rem}
#menu nav a:hover{color:var(--gold2)}
#menu .droits{text-align:center;margin-top:22px}
body.menu-on{overflow:hidden}
body.intro-on #bar,body.intro-on #prog{opacity:0}
/* grands titres de site */
.grandesec{padding-block:clamp(90px,16vw,190px);position:relative;overflow:hidden}
.grandesec.alt{background:linear-gradient(180deg,var(--bg),#0b1330 50%,var(--bg))}
.mega{font-size:clamp(2.3rem,11.2vw,11rem);line-height:.92;letter-spacing:-.02em;text-transform:uppercase;margin:6px 0 18px}
.mega .gold{display:inline-block}
.chapeau{font-size:clamp(1.5rem,6vw,2.6rem)!important;color:var(--gold2);max-width:30ch;line-height:1.18;margin-bottom:34px}
.deuxcol{display:grid;gap:18px;margin-top:10px}
@media(min-width:900px){.deuxcol{grid-template-columns:1fr 1fr;gap:56px}}
.cite{margin:48px 0 0;padding:28px 0 0;border-top:1px solid var(--line);max-width:34ch}
.cite .ital{display:block;font-size:clamp(1.5rem,6vw,2.4rem);line-height:1.22;color:var(--ink)}
.cite cite{display:block;margin-top:12px;font:600 .78rem "Inter Display",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);font-style:normal}
.duo2{display:grid;gap:16px;margin-top:14px}
@media(min-width:860px){.duo2{grid-template-columns:1fr 1fr;gap:26px}}
.bloc-mv{padding:clamp(24px,5vw,44px);border-radius:26px;border:1px solid var(--line);background:linear-gradient(150deg,rgba(227,182,83,.12),rgba(13,18,32,.7))}
.mv-n{display:inline-block;font:600 .74rem "Inter Display",sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--gold);margin-bottom:12px}
.bloc-mv h3{font-size:clamp(1.7rem,6.6vw,2.7rem);margin-bottom:12px}
.bloc-mv p{color:#d3d6e0;font-size:clamp(1.02rem,3.8vw,1.2rem)}
.amb{display:grid;gap:14px}
@media(min-width:760px){.amb{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1100px){.amb{grid-template-columns:repeat(3,1fr)}}
.amb>div{padding:28px;border-radius:24px;border:1px solid var(--line);background:var(--glass);position:relative;overflow:hidden}
.amb b{display:block;font-family:"Playfair Display",serif;font-style:italic;font-weight:700;font-size:3.4rem;line-height:1;color:transparent;-webkit-text-stroke:1px var(--gold);margin-bottom:10px}
.amb h3{font-size:1.45rem;margin-bottom:8px}
.amb p{color:var(--mute);font-size:1rem}
.vals{display:grid;gap:12px;margin-top:20px}
@media(min-width:760px){.vals{grid-template-columns:repeat(3,1fr)}}
.vals>div{padding:26px;border-radius:22px;border:1px solid var(--line);background:rgba(7,9,15,.55)}
.vals b{display:block;font-family:"Playfair Display",serif;font-weight:800;font-size:1.7rem;color:var(--gold2);margin-bottom:8px}
.vals span{color:#cfd2dc;font-size:1.02rem}

/* INTRO */
#intro{position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:#05070c;overflow:hidden}
#intro canvas{position:absolute;inset:0;width:100%;height:100%}
.curtain{position:absolute;top:0;bottom:0;width:50.5%;background:radial-gradient(120% 80% at 50% 50%,#101a3a,#05070c);z-index:2;transition:transform 1.6s var(--ease)}
.curtain.l{left:0;border-right:1px solid var(--gold)}
.curtain.r{right:0;border-left:1px solid var(--gold)}
.curtain::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 38px,rgba(227,182,83,.05) 38px 40px)}
#intro.open .curtain.l{transform:translateX(-101%)}
#intro.open .curtain.r{transform:translateX(101%)}
#intro .core{position:relative;z-index:3;text-align:center;padding:24px;transition:opacity .6s,transform 1.2s var(--ease);max-width:640px}
#intro.open .core{opacity:0;transform:scale(1.25)}
#intro .core img.m{width:min(46vw,210px);margin:0 auto 22px;filter:drop-shadow(0 0 40px rgba(227,182,83,.65));animation:pulse 3.2s ease-in-out infinite}
@keyframes pulse{50%{transform:scale(1.06);filter:drop-shadow(0 0 70px rgba(255,226,154,.95))}}
#intro .nm{font-weight:800;letter-spacing:.32em;font-size:clamp(1.1rem,5vw,1.7rem);margin-bottom:8px}
#intro .sl{color:var(--mute);margin-bottom:30px;font-size:clamp(.9rem,3.6vw,1.1rem)}
#entrer{font-size:clamp(1.05rem,4.6vw,1.4rem);padding:20px 32px;position:relative;overflow:hidden}
#entrer::after{content:"";position:absolute;inset:-2px;border-radius:inherit;border:2px solid var(--gold2);animation:ring 2.2s ease-out infinite}
@keyframes ring{from{transform:scale(1);opacity:.9}to{transform:scale(1.28);opacity:0}}
#intro .ig{margin-top:22px}

/* HERO */
#hero{min-height:100svh;display:grid;align-items:end;padding:0;overflow:hidden;isolation:isolate}
.slides{position:absolute;inset:0;z-index:-2}
.slide{position:absolute;inset:0;opacity:0;transition:opacity 1.6s ease}
.slide.on{opacity:1}
.slide img{width:100%;height:100%;object-fit:cover;transform:scale(1.02)}
.slide.on img{animation:kb 9s ease-out forwards}
@keyframes kb{to{transform:scale(1.16) translate(-1.5%,-1%)}}
#hero::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,#07090f99 0%,#07090f00 30%,#07090fcc 70%,var(--bg) 100%)}
#hero .in{padding-block:calc(110px + env(safe-area-inset-top,0px)) 70px}
#hero h1{font-size:clamp(2.7rem,13vw,7.6rem);margin-bottom:20px}
#hero .lead{margin-bottom:30px;color:#e4e0d6}
.cta{display:flex;flex-wrap:wrap;gap:12px}
.scrollcue{position:absolute;bottom:18px;left:50%;width:2px;height:46px;background:linear-gradient(var(--gold),transparent);animation:cue 2s ease-in-out infinite}
@keyframes cue{0%{transform:scaleY(0);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}51%{transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}

/* reveal */
.js .rv{opacity:0;transform:translateY(34px);transition:opacity 1s var(--ease),transform 1s var(--ease)}
.js .rv.in{opacity:1;transform:none}
.js .rv.d1{transition-delay:.12s}.js .rv.d2{transition-delay:.24s}.js .rv.d3{transition-delay:.36s}

/* chiffres */
.chiffres{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:40px}
.chiffre{border:1px solid var(--line);border-radius:var(--r);padding:22px 18px;background:linear-gradient(160deg,rgba(227,182,83,.10),rgba(255,255,255,.02))}
.chiffre b{display:block;font-weight:800;font-size:clamp(2.4rem,11vw,4.2rem);line-height:1}
.chiffre span{display:block;color:var(--mute);font-size:.9rem;margin-top:8px}
@media(min-width:760px){.chiffres{grid-template-columns:repeat(4,1fr)}}
.manif{font-size:clamp(1.8rem,7vw,3.8rem);line-height:1.14;max-width:22ch}
.manif span{opacity:.18;transition:opacity .6s}
.manif span.on{opacity:1}

/* fondateur */
.duo{display:grid;gap:34px;align-items:center}
@media(min-width:820px){.duo{grid-template-columns:1fr 1fr;gap:70px}.duo.inv>:first-child{order:2}}
.portrait{border-radius:var(--r);overflow:hidden;position:relative;border:1px solid var(--line);box-shadow:0 40px 80px -30px #000}
.portrait img{width:100%;height:auto}
.portrait::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,#000a)}

/* FILIALES */
#filiales{padding-inline:0;background:radial-gradient(90% 60% at 50% 0,#12204a55,transparent)}
.fhead{margin-bottom:26px}
.fstrip{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px max(18px,calc((100vw - 1180px)/2 + 40px)) 26px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.fstrip::-webkit-scrollbar{display:none}
.fcard{position:relative;flex:0 0 min(86vw,470px);height:min(78svh,640px);border-radius:28px;overflow:hidden;scroll-snap-align:center;border:1px solid var(--line);background:#000;isolation:isolate;transform:scale(.96);transition:transform .6s var(--ease),border-color .6s}
.fcard.act{transform:none;border-color:var(--gold)}
.fi{position:absolute;inset:0;z-index:-2;overflow:hidden}
.fi img{width:100%;height:100%;object-fit:cover;transition:transform 1.6s var(--ease)}
.fcard.act .fi img{transform:scale(1.07)}
.fi.logo-noir{background:#050505}.fi.logo-blanc{background:#fff}
.fi.logo-noir img,.fi.logo-blanc img{object-fit:contain;padding:8% 6% 56% }
.fi.affiche{background:#0b1226}
.fi.affiche{display:flex;justify-content:center;padding:16px 16px 0}
.fi.affiche img{height:58%;width:auto;max-width:100%;object-fit:contain;border-radius:14px;box-shadow:0 20px 50px -20px #000}
.fi.art{display:grid;place-items:center;background:radial-gradient(80% 60% at 50% 40%,#16306e,#070b18)}
.fi.art-mbote{background:radial-gradient(80% 60% at 50% 40%,#5a3a07,#0b0a05)}
.fi.art .art-halo{position:absolute;width:140%;aspect-ratio:1;background:conic-gradient(from 0deg,transparent,rgba(255,226,154,.35),transparent 30%,rgba(255,226,154,.25),transparent 60%);animation:spin 14s linear infinite;top:-35%}
@keyframes spin{to{transform:rotate(360deg)}}
.fi.art .art-mark{position:relative;width:34%;height:auto;object-fit:contain;filter:drop-shadow(0 0 30px #e3b653);margin-top:-30%}
.fi.art .art-nom{position:absolute;top:34%;font-weight:800;letter-spacing:.14em;font-size:1.25rem;color:var(--gold2)}
.fshade{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,#0000 38%,#05070cee 74%,#05070c)}
.ftxt{position:absolute;left:0;right:0;bottom:0;padding:22px 80px 24px 22px;display:flex;flex-direction:column;gap:8px}
.fnum{font-weight:800;color:var(--gold);font-size:.95rem;letter-spacing:.1em}.fnum small{color:var(--mute);font-weight:300}
.frub{font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold2)}
.fcard h3{font-size:clamp(1.6rem,7vw,2.3rem)}
.fcard p{font-size:.97rem;color:#d7d9e2;max-width:40ch}
.flink{margin-top:6px;font-weight:600;font-size:.9rem;color:var(--gold2);text-decoration:none}
.flink i{font-style:normal;display:inline-block;transition:transform .3s}.flink:hover i{transform:translateX(6px)}
.fprog{height:3px;margin:6px max(18px,calc((100vw - 1180px)/2 + 40px)) 0;background:#ffffff1a;border-radius:3px;overflow:hidden}
.fprog i{display:block;height:100%;width:4.7%;background:linear-gradient(90deg,var(--gold),var(--gold2));transition:width .3s}
.fhint{margin:14px max(18px,calc((100vw - 1180px)/2 + 40px)) 0;color:var(--mute);font-size:.85rem}


/* ===== UNIVERS : chapitres par filiale ===== */
.chips{position:sticky;top:calc(60px + env(safe-area-inset-top,0px));z-index:40;display:flex;gap:8px;overflow-x:auto;padding:8px 16px 10px;background:linear-gradient(#07090ff5 70%,#07090f00);scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chips a{flex:0 0 auto;font:600 .78rem/1 "Inter Display",sans-serif;text-decoration:none;padding:9px 13px;border-radius:999px;border:1px solid var(--line);background:#0d1220cc;color:var(--mute);white-space:nowrap;transition:all .3s}
.chips a.on{background:linear-gradient(135deg,#f6d27a,#c8912c);color:#1a1204;border-color:transparent}
.pole{padding:clamp(70px,14vw,130px) clamp(18px,5vw,40px) 26px;max-width:1180px;margin:0 auto}
.pole-n{display:block;font-family:"Playfair Display",serif;font-style:italic;font-weight:700;font-size:clamp(3.5rem,18vw,8rem);line-height:.9;color:transparent;-webkit-text-stroke:1px var(--gold);opacity:.8}
.pole h2{margin:8px 0 6px;font-size:clamp(2rem,8vw,4.4rem)}
.pole p{font-family:"Cormorant Garamond",serif;font-style:italic;font-weight:500;font-size:clamp(1.25rem,4.6vw,1.9rem);color:var(--gold2)}
.chap{position:relative;margin-bottom:clamp(60px,11vw,120px)}
.ch-hero{position:relative;height:min(94svh,860px);overflow:hidden;background:#000}
.ch-hero.cover img{width:100%;height:100%;object-fit:cover;transform:scale(1.04);transition:transform 2.4s var(--ease)}
.chap.in .ch-hero.cover img{transform:scale(1.12)}
.ch-hero.affiche{background:#080d1c}
.ch-hero.affiche .bg{position:absolute;inset:-6%;width:112%;height:112%;object-fit:cover;filter:blur(34px) brightness(.55) saturate(1.2)}
.ch-hero.affiche .fg{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);height:78%;width:auto;max-width:92%;object-fit:contain;border-radius:14px;box-shadow:0 40px 90px -20px #000,0 0 0 1px #ffffff1f}
.ch-hero.logo-noir{background:#050505}.ch-hero.logo-blanc{background:#fff}
.ch-hero .lg{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);width:min(78%,560px);height:auto;max-height:64%;object-fit:contain}
.ch-hero.art{display:grid;place-items:center;background:radial-gradient(80% 60% at 50% 42%,#16306e,#070b18);height:min(80svh,700px)}
.ch-hero.art-mbote{background:radial-gradient(80% 60% at 50% 42%,#5a3a07,#0b0a05)}
.ch-hero.art .art-halo{position:absolute;width:150%;aspect-ratio:1;background:conic-gradient(from 0deg,transparent,rgba(255,226,154,.32),transparent 30%,rgba(255,226,154,.22),transparent 60%);animation:spin 16s linear infinite;top:-40%}
.ch-hero.art .art-mark{position:relative;width:min(34%,220px);filter:drop-shadow(0 0 40px #e3b653);margin-top:-14%}
.ch-hero.art .art-nom{position:absolute;top:56%;font-family:"Playfair Display",serif;font-weight:800;letter-spacing:.16em;font-size:clamp(1.1rem,4.4vw,1.6rem);color:var(--gold2)}
.ch-voile{position:absolute;left:0;right:0;top:0;height:min(94svh,860px);pointer-events:none;background:linear-gradient(180deg,#07090f55 0%,#07090f00 28%,#07090f66 52%,#07090fee 86%,var(--bg) 100%)}
.chap:has(.art) .ch-voile{height:min(80svh,700px)}
.ch-titre{position:absolute;left:0;right:0;top:0;height:min(94svh,860px);display:flex;flex-direction:column;justify-content:flex-end;padding:0 clamp(18px,5vw,40px) clamp(26px,6vw,56px);max-width:1180px;margin:0 auto;gap:6px}
.chap:has(.art) .ch-titre{height:min(80svh,700px)}
.ch-num{font-family:"Playfair Display",serif;font-style:italic;font-weight:700;font-size:1.15rem;color:var(--gold)}
.ch-num small{font-family:"Inter Display",sans-serif;font-style:normal;font-weight:300;color:var(--mute);font-size:.8rem}
.ch-rub{font-weight:600;font-size:.72rem;letter-spacing:.24em;text-transform:uppercase;color:var(--gold2)}
.ch-titre h3{font-size:clamp(2.3rem,10.5vw,5.6rem);text-shadow:0 4px 40px #000}
.ch-acc{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:500;font-size:clamp(1.3rem,5vw,2.1rem);color:#f2e9d2;max-width:30ch;line-height:1.2;text-shadow:0 2px 20px #000}
.ch-corps{margin-top:6px}
.ch-intro{font-size:clamp(1.04rem,3.9vw,1.3rem);color:#d9dbe4;max-width:60ch;text-wrap:pretty;margin-bottom:26px}
.pts{display:grid;gap:12px;list-style:none;margin-bottom:30px}
@media(min-width:760px){.pts{grid-template-columns:repeat(2,1fr)}}
.pts li{padding:18px 18px 18px 20px;border-radius:16px;border:1px solid var(--line);background:linear-gradient(135deg,rgba(227,182,83,.10),rgba(13,18,32,.6));position:relative}
.pts li::before{content:"";position:absolute;left:0;top:18px;bottom:18px;width:3px;border-radius:3px;background:linear-gradient(var(--gold2),var(--gold))}
.pts b{display:block;font-family:"Playfair Display",serif;font-weight:700;font-size:1.12rem;margin-bottom:4px;color:var(--gold2)}
.pts span{color:var(--mute);font-size:.96rem}
.gal{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 calc(-1 * clamp(18px,5vw,40px)) 30px;padding:4px clamp(18px,5vw,40px) 14px;scrollbar-width:none}
.gal::-webkit-scrollbar{display:none}
.gf{flex:0 0 min(86vw,520px);scroll-snap-align:center}
.gf .gfi{border-radius:20px;overflow:hidden;border:1px solid var(--line);background:#000;box-shadow:0 30px 60px -28px #000}
.gf img{width:100%;height:auto;max-height:78svh;object-fit:contain}
.gf.cover img{object-fit:cover;aspect-ratio:4/3}
.gf.logo-noir .gfi{background:#050505}.gf.logo-blanc .gfi{background:#fff}
.gf figcaption{margin-top:9px;font-family:"Cormorant Garamond",serif;font-style:italic;font-weight:600;font-size:1.12rem;color:var(--gold2);text-align:center}
.vid{margin:0 auto 30px;max-width:320px}
.vid video{width:100%;aspect-ratio:9/16;border-radius:20px;border:1px solid var(--line);background:#000}
.vid span{display:block;margin-top:8px;text-align:center;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:1.1rem;color:var(--gold2)}

/* AFFICHES */
.posters{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:20px max(18px,calc((100vw - 1180px)/2 + 40px)) 30px;scrollbar-width:none;perspective:1200px}
.posters::-webkit-scrollbar{display:none}
.posters{align-items:flex-start}
.poster{flex:0 0 min(74vw,330px);scroll-snap-align:center;border-radius:20px;overflow:hidden;border:1px solid var(--line);background:#000;box-shadow:0 30px 60px -25px #000;transition:transform .25s ease-out;will-change:transform}
.poster img{width:100%;height:auto}
.avantages{display:grid;gap:12px;margin-top:34px}
@media(min-width:700px){.avantages{grid-template-columns:repeat(2,1fr)}}
.av{display:flex;gap:14px;align-items:flex-start;padding:18px;border-radius:18px;border:1px solid var(--line);background:var(--glass)}
.av b{flex:0 0 auto;display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#f6d27a,#c8912c);color:#1a1204;font-weight:800}
.av h4{font-weight:600;font-size:1.05rem;margin-bottom:2px}
.av p{color:var(--mute);font-size:.93rem}
.steps{counter-reset:s;display:grid;gap:10px;margin-top:22px}
.steps li{list-style:none;counter-increment:s;padding:14px 16px 14px 62px;position:relative;border-left:2px solid var(--line);background:linear-gradient(90deg,rgba(227,182,83,.08),transparent)}
.steps li::before{content:counter(s);position:absolute;left:14px;top:50%;transform:translateY(-50%);font-weight:800;font-size:1.6rem;color:var(--gold)}

/* téléphone vidéo */
.phone{position:relative;width:min(70vw,290px);aspect-ratio:9/19;margin-inline:auto;border-radius:38px;border:3px solid #2a2f3f;background:#000;overflow:hidden;box-shadow:0 0 0 6px #0c1020,0 50px 90px -20px #000,0 0 70px -10px rgba(227,182,83,.35)}
.phone video,.phone .vposter{width:100%;height:100%;object-fit:cover}
.play{position:absolute;inset:0;display:grid;place-items:center;background:#0006;border:0;cursor:pointer;color:#fff;font-size:2.4rem}
.play span{width:74px;height:74px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#f6d27a,#c8912c);color:#1a1204;box-shadow:0 0 0 0 rgba(227,182,83,.6);animation:ping 2s infinite}
@keyframes ping{70%{box-shadow:0 0 0 24px #e3b65300}100%{box-shadow:0 0 0 0 #e3b65300}}
.phone.on .play{display:none}
.wide{position:relative;border-radius:var(--r);overflow:hidden;border:1px solid var(--line);aspect-ratio:16/9;background:#000}
.wide video{width:100%;height:100%;object-fit:cover}

/* TECH */
#tech{background:linear-gradient(180deg,var(--bg),#0a1330 50%,var(--bg))}
#tech canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.55;z-index:0}
#tech .wrap{position:relative;z-index:1}
.cards3{display:grid;gap:14px;margin-top:34px}
@media(min-width:820px){.cards3{grid-template-columns:repeat(3,1fr)}}
.tc{padding:26px;border-radius:var(--r);border:1px solid var(--line);background:var(--glass);backdrop-filter:blur(10px)}
.tc small{display:block;color:var(--gold);letter-spacing:.2em;font-weight:600;font-size:.72rem;margin-bottom:10px}
.tc h3{font-size:1.7rem;margin-bottom:8px}
.tc p{color:var(--mute);font-size:.96rem}

/* culture */
.livre{perspective:1400px;display:grid;place-items:center}
.livre img{width:min(78vw,380px);border-radius:6px 14px 14px 6px;box-shadow:-18px 30px 60px -10px #000,0 0 80px -20px rgba(227,182,83,.45);transform:rotateY(-18deg);transition:transform .8s var(--ease)}
.livre:hover img{transform:rotateY(0)}
.tomes{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:20px max(18px,calc((100vw - 1180px)/2 + 40px)) 30px;scrollbar-width:none}
.tomes::-webkit-scrollbar{display:none}
.tome{flex:0 0 min(56vw,230px);scroll-snap-align:center;position:relative}
.tome img{width:100%;border-radius:12px;border:1px solid var(--line);box-shadow:0 24px 50px -20px #000}
.tome figcaption{margin-top:8px;text-align:center;font-weight:600;letter-spacing:.2em;font-size:.78rem;color:var(--gold)}
.duel{position:relative;display:grid;grid-template-columns:1fr 1fr;border-radius:var(--r);overflow:hidden;border:1px solid var(--line);background:#000;isolation:isolate}
.duel .side{position:relative;aspect-ratio:2/3.1;overflow:hidden}
.duel .side img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.duel .side.k img{object-position:center}
.duel .side::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#0000 55%,#000d)}
.duel .nm{position:absolute;z-index:2;left:0;right:0;bottom:14px;text-align:center;font-weight:800;letter-spacing:.1em;font-size:clamp(1rem,4.4vw,1.5rem)}
.duel .vs{position:absolute;z-index:3;left:50%;top:44%;transform:translate(-50%,-50%);font-weight:800;font-size:clamp(2rem,9vw,3.6rem);color:#fff;text-shadow:0 0 18px #5fd0ff,0 0 40px #ff5a2a;animation:flick 1.8s infinite}
@keyframes flick{0%,100%{opacity:1}45%{opacity:.7}50%{opacity:1}55%{opacity:.6}}
.duel::before{content:"";position:absolute;inset:0;z-index:2;background:linear-gradient(115deg,transparent 46%,rgba(255,255,255,.6) 50%,transparent 54%);transform:translateX(-120%);animation:slash 4s ease-in-out infinite}
@keyframes slash{40%,100%{transform:translateX(120%)}}
.bientot{position:relative;display:grid;place-items:center;text-align:center;aspect-ratio:2/1.2;border-radius:var(--r);border:1px dashed var(--line);background:radial-gradient(60% 80% at 50% 50%,#3a1308,#07090f);overflow:hidden}
.bientot b{display:block;font-weight:800;font-size:clamp(1.3rem,6vw,2.1rem)}
.bientot span{color:var(--gold2);letter-spacing:.25em;font-size:.74rem;font-weight:600}
.gridcards{display:grid;gap:14px;margin-top:20px}
@media(min-width:760px){.gridcards{grid-template-columns:repeat(3,1fr)}}
.jeu{border-radius:var(--r);overflow:hidden;border:1px solid var(--line);background:var(--glass)}
.jeu img{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover}
.jeu div{padding:14px 16px 18px}
.jeu b{display:block;font-weight:800;font-size:1.15rem}
.jeu span{color:var(--gold2);font-size:.74rem;letter-spacing:.18em;font-weight:600}
.mosaic{columns:2;column-gap:12px;margin-top:30px}
@media(min-width:760px){.mosaic{columns:3}}
.mosaic figure{break-inside:avoid;margin-bottom:12px;border-radius:16px;overflow:hidden;border:1px solid var(--line);position:relative;background:#000}
.mosaic img{width:100%;height:auto;transition:transform 1.2s var(--ease)}
.mosaic figure:hover img{transform:scale(1.06)}
.mosaic figcaption{position:absolute;left:0;right:0;bottom:0;padding:26px 12px 10px;font-weight:600;font-size:.82rem;background:linear-gradient(transparent,#000d)}
.marquee{overflow:hidden;white-space:nowrap;border-block:1px solid var(--line);padding-block:16px;background:#0a0f20}
.marquee div{display:inline-block;animation:mq 38s linear infinite;font-weight:800;font-size:clamp(1.1rem,4vw,1.8rem);letter-spacing:.06em}
.marquee span{margin-inline:22px;color:var(--gold)}
@keyframes mq{to{transform:translateX(-50%)}}


.gal.big .gf{flex-basis:min(84vw,430px)}
.gal.big .gf.cover img{aspect-ratio:16/10}
.herosrow{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:10px max(18px,calc((100vw - 1180px)/2 + 40px)) 24px;scrollbar-width:none}
.herosrow::-webkit-scrollbar{display:none}
.hero-c{flex:0 0 min(80vw,360px);scroll-snap-align:center;position:relative;border-radius:22px;overflow:hidden;border:1px solid var(--line);background:#000;box-shadow:0 40px 70px -30px #000}
.hero-c img{width:100%;height:auto}
.hero-c figcaption{position:absolute;left:0;right:0;bottom:0;padding:50px 16px 16px;background:linear-gradient(transparent,#000e);display:flex;flex-direction:column;gap:2px}
.hero-c b{font-family:"Playfair Display",serif;font-weight:800;font-size:1.3rem;letter-spacing:.04em}
.hero-c span{font-family:"Cormorant Garamond",serif;font-style:italic;font-weight:600;font-size:1.15rem;color:var(--gold2)}
.sub{margin:clamp(54px,10vw,100px) 0 14px;font-size:clamp(1.7rem,6.8vw,3rem)}
.sub small{display:block;font-family:"Inter Display",sans-serif;font-weight:600;font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
.article{display:grid;gap:14px;margin-block:44px;padding-top:34px;border-top:1px solid var(--line)}
.article h3{font-size:clamp(1.6rem,6.4vw,2.6rem)}
.article p{color:#d3d6e0;font-size:clamp(1.02rem,3.8vw,1.2rem);max-width:62ch;text-wrap:pretty}
.article .ital{margin-top:10px;font-size:clamp(1.3rem,5vw,1.8rem);color:var(--gold2);line-height:1.25}
@media(min-width:900px){.article{grid-template-columns:1fr 1.5fr;gap:60px}}
.engage{display:grid;gap:12px;margin-top:22px}
@media(min-width:760px){.engage{grid-template-columns:repeat(4,1fr)}}
.engage div{padding:22px;border-radius:20px;border:1px solid var(--line);background:var(--glass)}
.engage b{display:block;font-family:"Playfair Display",serif;font-weight:800;font-size:1.35rem;color:var(--gold2);margin-bottom:6px}
.engage span{color:var(--mute);font-size:.95rem}
details.q{border:1px solid var(--line);border-radius:16px;padding:0;margin-bottom:10px;background:var(--glass);overflow:hidden}
details.q summary{cursor:pointer;list-style:none;padding:18px 20px;font-weight:600;font-size:1.04rem;display:flex;justify-content:space-between;gap:14px}
details.q summary::-webkit-details-marker{display:none}
details.q summary::after{content:"+";color:var(--gold);font-size:1.4rem;line-height:1;transition:transform .3s}
details.q[open] summary::after{transform:rotate(45deg)}
details.q p{padding:0 20px 20px;color:var(--mute);max-width:70ch}
.signature{font-size:clamp(2.2rem,9vw,3.6rem);line-height:1;margin-top:12px}

/* contact */
#contact{background:radial-gradient(90% 70% at 50% 0,#14265a66,transparent),var(--nuit)}
.coord{display:grid;gap:12px;margin-block:26px}
.coord a{display:flex;align-items:center;gap:14px;padding:18px 20px;border-radius:18px;border:1px solid var(--line);background:var(--glass);text-decoration:none;font-weight:600;font-size:1.05rem;transition:transform .3s var(--ease),border-color .3s}
.coord a:hover{transform:translateX(6px);border-color:var(--gold)}
.coord small{display:block;color:var(--mute);font-weight:300;font-size:.8rem}
.coord .ic{flex:0 0 auto;width:44px;height:44px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,#f6d27a,#c8912c);color:#1a1204;font-size:1.2rem}
form.cv{display:grid;gap:12px;padding:22px;border-radius:var(--r);border:1px solid var(--line);background:var(--glass);backdrop-filter:blur(10px)}
form.cv h3{font-size:1.5rem}
form.cv label{font-size:.82rem;color:var(--mute);display:block;margin-bottom:4px}
form.cv input,form.cv select,form.cv textarea{width:100%;font:400 1rem "Inter Display",sans-serif;color:var(--ink);padding:14px;border-radius:12px;border:1px solid #ffffff26;background:#0a0f1e}
form.cv textarea{min-height:100px;resize:vertical}
form.cv input[type=file]{padding:12px;border-style:dashed}
.row2{display:grid;gap:12px}
@media(min-width:560px){.row2{grid-template-columns:1fr 1fr}}
.fnote{font-size:.8rem;color:var(--mute)}
#cvok{display:none;padding:18px;border-radius:14px;background:#1fa85526;border:1px solid #1fa855}
form.cv.sent #cvok{display:block}
form.cv.sent .champs{display:none}
footer{padding-block:60px 90px;text-align:center;border-top:1px solid var(--line);background:#05070c}
footer img{width:120px;margin:0 auto 18px;filter:drop-shadow(0 0 30px rgba(227,182,83,.5))}
footer .nm{font-weight:800;letter-spacing:.3em;margin-bottom:6px}
footer p{color:var(--mute);font-size:.85rem;max-width:62ch;margin:6px auto}
#flot{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:55;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:#1fa855;box-shadow:0 10px 30px -6px #000,0 0 0 0 #1fa85599;animation:ping2 2.4s infinite;text-decoration:none}
@keyframes ping2{70%{box-shadow:0 10px 30px -6px #000,0 0 0 18px #1fa85500}100%{box-shadow:0 10px 30px -6px #000,0 0 0 0 #1fa85500}}
body.intro-on #flot{display:none}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.js .rv{opacity:1;transform:none}html{scroll-behavior:auto}.manif span{opacity:1}}
/* ================= THÈME v4 : fond clair, bleu nuit du logo STAR, motif bogolan ================= */
:root{--nuit:#041030;--nuit2:#071a46;--bg:#ffffff;--bg2:#eef2fa;--ink:#0a1633;--mute:#46536f;--soft:#27344f;--line:rgba(4,16,48,.14);--glass:#ffffff;--gold:#a87a14;--gold2:#1a3f9e;--hl1:#16358f;--hl2:#2f66ea;--hl3:#1d46b8;--sh:0 22px 44px -26px rgba(4,16,48,.45);--blue:#1f4fd1}
.nuit,.tk-nuit,#intro,#hero,.ch-titre,.ch-voile,.ch-hero,footer,#menu,.marquee,#bar{color:var(--ink);--bg:var(--nuit);--ink:#f6f3ec;--mute:#b9c3de;--soft:#d6ddf2;--line:rgba(255,255,255,.17);--glass:rgba(255,255,255,.06);--gold:#e3b653;--gold2:#d8e3ff;--hl1:#b98a2c;--hl2:#ffe29a;--hl3:#e3b653;--sh:0 22px 44px -26px #000}
.nuit{background:var(--nuit);color:var(--ink);position:relative;isolation:isolate}
.nuit::before{content:"";position:absolute;inset:0;z-index:-1;background:url(img/bg-pagne.webp) center/340px;opacity:.14;mix-blend-mode:screen;pointer-events:none}
.teinte{background:var(--bg2)}
.gold{background-image:linear-gradient(100deg,var(--hl1),var(--hl2) 40%,var(--hl3) 62%,var(--hl1));background-size:220% auto}
.script{color:var(--gold2)}
.btn{background:transparent}
.btn:hover,.btn:focus-visible{background:rgba(4,16,48,.07);box-shadow:var(--sh)}
.nuit .btn:hover,.tk-nuit .btn:hover,#hero .btn:hover{background:rgba(255,255,255,.12)}
.btn.or:hover{background:linear-gradient(135deg,#ffe08a,#d39a30)}
/* en-tête bleu nuit + logo officiel */
#bar{height:calc(66px + env(safe-area-inset-top,0px));background:rgba(4,16,48,.97);border-bottom:1px solid rgba(255,255,255,.1);backdrop-filter:none;-webkit-backdrop-filter:none}
#bar.plein{background:var(--nuit);box-shadow:0 8px 30px -14px #000}
#bar .brand img{width:52px;height:52px;object-fit:contain;filter:none;border-radius:13px}
#bar .topnav a{color:#cdd6ee}
#bar .topnav a:hover,#bar .topnav a.on{color:#fff;background:rgba(255,255,255,.14)}
#burger{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.28)}
#burger i{background:#fff}
#menu{background:radial-gradient(100% 70% at 50% 0,#0b2468,var(--nuit))}
#menu nav a{border-bottom-color:rgba(255,255,255,.13);color:#fff}
#menu nav a:hover{color:#ffe29a}
.chips{top:calc(66px + env(safe-area-inset-top,0px));background:var(--bg);border-bottom:1px solid var(--line)}
.chips a{background:var(--bg2);color:var(--mute)}
.chips a.on{background:var(--nuit);color:#fff;border-color:transparent}
.grandesec.nuit{background:var(--nuit)}
.bloc-mv{background:var(--glass);box-shadow:var(--sh)}
.bloc-mv p,.article p,.vals span{color:var(--soft)}
.vals>div{background:var(--glass)}
.amb>div,.pts li,.av,.engage div,.jeu,.tc{box-shadow:var(--sh)}
.amb b{-webkit-text-stroke:1px var(--gold2)}
/* intro : motif bogolan sous le bleu, sans filet jaune */
#intro{background:var(--nuit)}
.curtain{background:linear-gradient(rgba(4,16,48,.86),rgba(4,16,48,.94)),url(img/bg-pagne.webp) center/300px}
.curtain.l,.curtain.r{border:0}
.curtain::after{display:none}
#hero::after{background:linear-gradient(180deg,rgba(4,16,48,.55) 0%,rgba(4,16,48,0) 30%,rgba(4,16,48,.82) 72%,rgba(4,16,48,.97) 100%)}
#hero .lead{color:#e6ebf7}
/* chapitres : image sombre, texte sous l'image sur fond clair */
.ch-voile{background:linear-gradient(180deg,rgba(4,16,48,.5) 0%,rgba(4,16,48,0) 28%,rgba(4,16,48,.45) 52%,rgba(4,16,48,.93) 85%,rgba(4,16,48,.99) 100%)}
.ch-titre{color:var(--ink)}
.ch-hero .lg{width:min(94%,680px);max-height:74%;top:44%}
.ch-intro{color:var(--soft)}
.pts li{background:var(--glass)}
.steps li{background:linear-gradient(90deg,rgba(4,16,48,.06),transparent)}
.phone{box-shadow:0 0 0 6px #0b1530,0 50px 90px -20px rgba(4,16,48,.6),0 0 60px -10px rgba(47,102,234,.35)}
.marquee{background:var(--nuit);border-block:0;color:var(--ink)}
.marquee span{color:var(--gold)}
form.cv input,form.cv select,form.cv textarea{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.24)}
form.cv select option{color:#000}
footer{background:#020a22;border-top:0}
.cite .ital{color:var(--ink)}
.officiel{margin-top:44px;padding:clamp(22px,5vw,38px);border-radius:24px;background:var(--nuit);color:#f6f3ec;position:relative;overflow:hidden;isolation:isolate;max-width:760px}
.officiel::before{content:"";position:absolute;inset:0;z-index:-1;background:url(img/bg-pagne.webp) center/300px;opacity:.16;mix-blend-mode:screen}
.officiel .eyebrow{color:#e3b653}
.officiel h3{font-size:clamp(1.5rem,5.6vw,2.2rem);margin-bottom:10px;color:#fff}
.officiel p{color:#cfd8ef;font-size:1.02rem}.officiel b{color:#fff;white-space:nowrap}
/* diamant */
.diamant{position:relative;width:min(46vw,170px);margin:38px 0 0;filter:drop-shadow(0 18px 24px rgba(31,79,209,.35))}
.diamant svg{width:100%;display:block;animation:flotte 5s ease-in-out infinite}
.diamant i{position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.95) 50%,transparent 60%);mix-blend-mode:overlay;transform:translateX(-120%);animation:brille 3.6s ease-in-out infinite;pointer-events:none}
@keyframes flotte{50%{transform:translateY(-8px) rotate(2deg)}}
@keyframes brille{45%,100%{transform:translateX(130%)}}
/* effets de survol et de toucher */
.pts li,.av,.amb>div,.vals>div,.tc,.bloc-mv,.engage>div,.jeu,.hero-c,.officiel{position:relative;overflow:hidden;transition:transform .45s var(--ease),box-shadow .45s,border-color .45s}
.pts li::after,.av::after,.amb>div::after,.vals>div::after,.tc::after,.bloc-mv::after,.engage>div::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(120,160,255,.28) 50%,transparent 65%);transform:translateX(-130%);transition:transform .9s;pointer-events:none}
@media(hover:hover){
 .pts li:hover,.av:hover,.amb>div:hover,.vals>div:hover,.tc:hover,.bloc-mv:hover,.engage>div:hover,.jeu:hover,.hero-c:hover{transform:translateY(-8px);border-color:var(--gold);box-shadow:0 30px 56px -26px rgba(4,16,48,.6),0 0 0 1px var(--gold)}
 .pts li:hover::after,.av:hover::after,.amb>div:hover::after,.vals>div:hover::after,.tc:hover::after,.bloc-mv:hover::after,.engage>div:hover::after{transform:translateX(130%)}
 .gf:hover img,.poster:hover img,.tome:hover img{transform:scale(1.05)}
 .gf:hover .gfi,.tome:hover img{box-shadow:0 34px 60px -24px rgba(4,16,48,.7)}
}
.pts li:active,.av:active,.amb>div:active,.vals>div:active,.tc:active{transform:scale(.98)}
.gf .gfi{overflow:hidden}.gf img,.poster img,.tome img{transition:transform .8s var(--ease),box-shadow .5s}
#lueur{position:fixed;left:0;top:0;width:420px;height:420px;border-radius:50%;pointer-events:none;z-index:4;background:radial-gradient(circle,rgba(60,115,255,.28),rgba(227,182,83,.13) 42%,transparent 68%);opacity:0;transition:opacity .45s;will-change:transform}
#lueur.on{opacity:1}
.etin{position:fixed;width:9px;height:9px;pointer-events:none;z-index:6;transform:rotate(45deg);background:linear-gradient(135deg,#fff,#7fa8ff);box-shadow:0 0 10px 2px rgba(120,165,255,.8);animation:etin .8s ease-out forwards}
.etin.g{background:linear-gradient(135deg,#fff7d1,#e3b653);box-shadow:0 0 10px 2px rgba(227,182,83,.85)}
@keyframes etin{to{transform:translate(var(--dx,0),var(--dy,30px)) rotate(225deg) scale(.1);opacity:0}}
.onde{position:fixed;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid rgba(255,226,154,.95);box-shadow:0 0 22px 5px rgba(80,130,255,.55),inset 0 0 16px rgba(255,226,154,.45);pointer-events:none;z-index:200;animation:onde 1.05s ease-out forwards}
.onde.o1{animation-delay:.12s;border-color:rgba(120,170,255,.95)}
.onde.o2{animation-delay:.25s;border-color:rgba(255,255,255,.9)}
@keyframes onde{from{transform:scale(.2);opacity:1}to{transform:scale(14);opacity:0}}
#haut{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:55;width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:var(--nuit);color:#fff;font-size:1.3rem;cursor:pointer;opacity:0;transform:translateY(14px);pointer-events:none;transition:all .4s var(--ease);box-shadow:0 10px 26px -8px #000}
#haut.on{opacity:1;transform:none;pointer-events:auto}
body.intro-on #haut,body.intro-on #lueur{display:none}

"""

WA_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>'

BODY = r"""
<div id="prog"></div>
<header id="bar">
  <a class="brand" href="#hero" aria-label="STAR ENTREPRISE, haut de page"><img src="img/logo-star.webp" alt="STAR ENTREPRISE"></a>
  <nav class="topnav" aria-label="Navigation principale"><a href="#qui">Qui sommes-nous</a><a href="#vision">Vision</a><a href="#ambitions">Ambitions</a><a href="#filiales">Filiales</a><a href="#komyo">KOMYO</a><a href="#saga">X SAPHIR</a><a href="#histoire">Blog</a></nav>
  <a class="btn or hcta" href="#contact">Contact</a>
  <button id="burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu"><i></i><i></i><i></i></button>
</header>
<div id="menu" hidden><nav aria-label="Menu"><a href="#hero"><small>00</small>Accueil</a><a href="#qui"><small>01</small>Qui sommes-nous</a><a href="#vision"><small>02</small>Mission &amp; vision</a><a href="#ambitions"><small>03</small>Nos ambitions</a><a href="#valeurs"><small>04</small>Nos valeurs</a><a href="#filiales"><small>05</small>Nos 21 filiales</a><a href="#komyo"><small>06</small>KOMYO &amp; Keydou</a><a href="#energie"><small>07</small>STAR ÉNERGIE</a><a href="#tech"><small>08</small>STAR TECH</a><a href="#culture"><small>09</small>Le livre</a><a href="#saga"><small>10</small>X SAPHIR</a><a href="#creations"><small>11</small>Nos créations</a><a href="#histoire"><small>12</small>Le blog</a><a href="#contact"><small>13</small>Contact &amp; carrières</a></nav><p class="droits">© STAR ENTREPRISE — Tous droits réservés</p></div>

<div id="intro" class="tk-nuit" role="dialog" aria-label="Bienvenue chez STAR ENTREPRISE">
  <canvas id="dust"></canvas>
  <div class="curtain l"></div><div class="curtain r"></div>
  <div class="core">
    <img class="m" src="img/logo-star.webp" alt="Logo officiel STAR ENTREPRISE">
    <div class="nm gold">STAR ENTREPRISE</div>
    <p class="sl">Un seul groupe. Toutes les solutions pour votre vie.</p>
    <button class="btn or" id="entrer" type="button">Découvrez qui est STAR ENTREPRISE</button>
    <p class="ig droits">© STAR ENTREPRISE — Tous droits réservés</p>
  </div>
</div>

<main>
<section id="hero">
  <div class="slides" aria-hidden="true">
    <div class="slide on"><img src="img/f-beach.webp" alt=""></div>
    <div class="slide"><img src="img/f-wedding.webp" alt=""></div>
    <div class="slide"><img src="img/f-grimpeurs.webp" alt=""></div>
    <div class="slide"><img src="img/f-casa.webp" alt=""></div>
    <div class="slide"><img src="img/f-meubles.webp" alt=""></div>
  </div>
  <div class="wrap in">
    <span class="eyebrow">Du Canada au Congo</span>
    <h1>Qui est <span class="gold">STAR ENTREPRISE&nbsp;?</span></h1>
    <p class="lead">Une seule entreprise. Santé, épargne, immobilier, tourisme, énergie, art, numérique… Toutes les solutions pour votre vie, réunies sous une même étoile.</p>
    <div class="cta"><a class="btn or" href="#filiales">Voir nos 21 filiales</a><a class="btn" href="#vision">Notre vision</a></div>
  </div>
  <i class="scrollcue" aria-hidden="true"></i>
</section>

<section id="qui" class="grandesec">
  <div class="wrap">
    <span class="eyebrow rv">01 — Qui sommes-nous</span>
    <h2 class="mega rv">STAR<br><span class="gold">ENTREPRISE</span></h2>
    <p class="ital rv d1 chapeau">Un seul groupe, toutes les solutions pour votre vie.</p>
    <div class="deuxcol">
      <p class="lead rv">STAR ENTREPRISE est un groupe multi-métiers fondé par Carry OTEMBA depuis le Canada, ouvert et officiellement enregistré en République du Congo, à Brazzaville et à Pointe-Noire. Nous réunissons sous une même étoile vingt-et-une filiales : santé et solidarité, épargne, immobilier et patrimoine, tourisme et voyage, mariage et événements, énergie, mobilité, enfance, création et art.</p>
      <p class="lead rv d1">Nous ne faisons pas que distribuer : nous créons. Des applications comme KOMYO et Keydou, des technologies de calcul graphique et d'intelligence artificielle, des marques, des jeux, une saga littéraire de dix tomes. Chaque création porte la même signature et la même exigence.</p>
    </div>
    <blockquote class="cite rv"><span class="ital">« Une idée, même imparfaite au départ, peut devenir un diamant si elle est taillée avec méthode, créativité et exigence. »</span><cite>— La philosophie de Carry OTEMBA</cite></blockquote>
    <div class="diamant rv" aria-hidden="true"><svg viewBox="0 0 200 170"><defs><linearGradient id="dg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#8db2ff"/></linearGradient><linearGradient id="dg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd3ff"/><stop offset="1" stop-color="#2b5bd6"/></linearGradient><linearGradient id="dg3" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6efff"/><stop offset="1" stop-color="#4f7df0"/></linearGradient></defs><polygon points="70,10 130,10 120,60 80,60" fill="url(#dg1)"/><polygon points="10,60 70,10 80,60" fill="url(#dg3)"/><polygon points="190,60 130,10 120,60" fill="url(#dg2)"/><polygon points="50,10 70,10 10,60" fill="#dce8ff"/><polygon points="150,10 130,10 190,60" fill="#7fa4f5"/><polygon points="10,60 80,60 100,165" fill="url(#dg2)"/><polygon points="80,60 120,60 100,165" fill="url(#dg1)"/><polygon points="120,60 190,60 100,165" fill="url(#dg3)"/></svg><i></i></div>
    <div class="officiel rv"><span class="eyebrow">Une entreprise officielle</span><h3>Bien enregistrée en République du Congo</h3><p>STAR ENTREPRISE est immatriculée au Registre du Commerce et du Crédit Mobilier (RCCM) de Brazzaville sous le <b>n° CG-BZV-01-2026-A10-01950</b>. Elle exerce avec les autorisations délivrées par les administrations congolaises compétentes : formalités de création, statistique nationale et autorisation d'exercice des activités commerciales.</p></div>
  </div>
</section>

<section id="manifeste" class="nuit">
  <div class="wrap">
    <span class="eyebrow rv">Notre force</span>
    <p class="manif" id="manif">Un seul compte. Une seule entreprise. Toutes les solutions pour votre vie.</p>
    <div class="chiffres">
      <div class="chiffre rv"><b class="gold" data-n="21">0</b><span>filiales, de la santé à l'énergie</span></div>
      <div class="chiffre rv d1"><b class="gold" data-n="20">0</b><span>secteurs de services trouvés par Keydou</span></div>
      <div class="chiffre rv d2"><b class="gold" data-n="10">0</b><span>tomes de la saga X SAPHIR</span></div>
      <div class="chiffre rv d3"><b class="gold" data-n="1">0</b><span>seule étoile : STAR ENTREPRISE</span></div>
    </div>
  </div>
</section>

<section id="fondateur">
  <div class="wrap duo">
    <div class="portrait rv"><img src="img/fondateur.webp" alt="Carry OTEMBA, PDG de STAR ENTREPRISE" loading="lazy"></div>
    <div>
      <span class="eyebrow rv">Le fondateur</span>
      <h2 class="rv">Carry <span class="gold">OTEMBA</span></h2>
      <p class="lead rv d1">PDG de STAR ENTREPRISE. Depuis le Canada, il a créé le groupe et l'a ouvert en République du Congo. Du soin de la famille à l'énergie solaire, de l'art à l'intelligence artificielle : une vision, celle de mettre au service des Congolais, et bien au-delà, des solutions sérieuses, belles et accessibles.</p>
      <p class="signature script rv d2">Carry Otemba</p>
      <p class="lead rv d2" style="margin-top:14px">Chaque filiale a son métier, son équipe et son identité. Toutes partagent la même promesse : <b style="color:var(--ink);font-weight:600">un seul groupe, toutes les solutions pour votre vie.</b></p>
    </div>
  </div>
</section>

<section id="vision" class="grandesec nuit">
  <div class="wrap">
    <span class="eyebrow rv">02 — Notre mission et notre vision</span>
    <h2 class="mega rv">NOTRE<br><span class="gold">VISION</span></h2>
    <p class="ital rv d1 chapeau">Donner à chaque famille et à chaque entrepreneur les outils des grandes marques.</p>
    <div class="duo2">
      <div class="bloc-mv rv"><span class="mv-n">Mission</span><h3>Servir, créer, accompagner</h3><p>Transformer les idées en produits et en services d'exception, accessibles, beaux et efficaces, pour tous les secteurs d'activité. Simplifier la vie des familles, des commerçants, des créateurs et des organisations, de la santé à l'énergie, de l'épargne à la culture.</p></div>
      <div class="bloc-mv rv d1"><span class="mv-n">Vision</span><h3>La référence en Afrique centrale</h3><p>Devenir la référence en Afrique centrale pour les services du quotidien et la création numérique sur mesure. Une technologie utile, compréhensible et adaptée à nos réalités, à nos langues et à nos usages, y compris l'intelligence artificielle, que nous voulons au service de chacun.</p></div>
    </div>
  </div>
</section>

<section id="ambitions" class="grandesec">
  <div class="wrap">
    <span class="eyebrow rv">03 — Ce que nous voulons accomplir</span>
    <h2 class="mega rv">NOS<br><span class="gold">AMBITIONS</span></h2>
    <p class="ital rv d1 chapeau">Voir grand, du Canada au Congo, et le faire bien.</p>
    <div class="amb">
      <div class="rv"><b>01</b><h3>Un compte, tout le groupe</h3><p>Un seul compte, un paiement sécurisé et un programme de fidélité, STAR MBOTÉ, valables dans toutes les filiales.</p></div>
      <div class="rv d1"><b>02</b><h3>Des technologies de chez nous</h3><p>KOMYO, Keydou, STAR GPU, UC STAR, STAR IA : des outils pensés et conçus ici, qui tournent sur les téléphones que les gens ont déjà.</p></div>
      <div class="rv d2"><b>03</b><h3>Rayonner dans toute la région</h3><p>Étendre nos services en Afrique centrale et ouvrir de nouveaux marchés, avec la même exigence de qualité.</p></div>
      <div class="rv"><b>04</b><h3>Un studio créatif et des solutions pour les PME</h3><p>Mettre notre savoir-faire de création et de numérique à la portée des petites et moyennes entreprises.</p></div>
      <div class="rv d1"><b>05</b><h3>Une saga qui voyage</h3><p>X SAPHIR : dix tomes, un univers de jeu et, demain, de nouveaux supports pour faire connaître l'imaginaire africain.</p></div>
      <div class="rv d2"><b>06</b><h3>Des emplois et des compétences</h3><p>Recruter, former et faire grandir des talents congolais dans tous nos métiers.</p></div>
    </div>
  </div>
</section>

<section id="valeurs" class="grandesec nuit">
  <div class="wrap">
    <span class="eyebrow rv">04 — Ce qui nous guide</span>
    <h2 class="mega rv">NOS<br><span class="gold">VALEURS</span></h2>
    <div class="vals">
      <div class="rv"><b>Exigence</b><span>Chaque détail compte, du pixel à la performance, de la livraison au service après-vente.</span></div>
      <div class="rv d1"><b>Écoute</b><span>Votre idée d'abord : nous la comprenons avant de créer ou de proposer.</span></div>
      <div class="rv d2"><b>Transparence</b><span>Des délais tenus, une communication fluide, des conditions annoncées sans surprise.</span></div>
      <div class="rv"><b>Présence</b><span>Nous restons à vos côtés bien après le lancement, la vente ou la livraison.</span></div>
      <div class="rv d1"><b>Créativité</b><span>Nous aimons inventer : une marque, une application, un univers, une façon de faire.</span></div>
      <div class="rv d2"><b>Fierté africaine</b><span>Nos racines, notre force. Nous créons du Canada au Congo, pour l'Afrique et pour le monde.</span></div>
    </div>
  </div>
</section>

<section id="filiales" style="padding-inline:0">
  <div class="wrap fhead"><span class="eyebrow rv">05 — Nos filiales</span><h2 class="mega rv">21<br><span class="gold">FILIALES</span></h2><p class="ital rv d1 chapeau">Une seule étoile.</p><p class="lead rv d1">Chaque filiale a son métier, son équipe et son univers. Parcourez-les une à une : de grandes images, des services précis, et un contact direct.</p></div>
  <nav class="chips" id="chips" aria-label="Aller à une filiale">%%CHIPS%%</nav>
%%FILIALES%%
</section>

<div class="marquee" aria-hidden="true"><div>%%MARQUEE%%%%MARQUEE%%</div></div>

<section id="komyo">
  <div class="wrap">
    <span class="eyebrow rv">KOMYO · le monde en mouvement</span>
    <h2 class="rv">L'application qui réunit <span class="gold">toute la famille</span></h2>
    <p class="lead rv d1">KOMYO, c'est le nouveau réseau social de STAR ENTREPRISE : apprendre, créer, partager. Pour toi, tes enfants et bien d'autres. Chacun son écran, chacun son espace.</p>
  </div>
  <div class="posters" id="posters">
    <figure class="poster tilt"><img src="img/a-komyo-bienvenue.webp" alt="Affiche KOMYO : bienvenue" loading="lazy"></figure>
    <figure class="poster tilt"><img src="img/a-komyo-5etapes.webp" alt="Affiche : installer KOMYO en 5 étapes" loading="lazy"></figure>
    <figure class="poster tilt"><img src="img/a-komyo-famille.webp" alt="Affiche : KOMYO pour toute la famille" loading="lazy"></figure>
    <figure class="poster tilt"><img src="img/a-komyo-salon.webp" alt="Affiche : le Salon KOMYO, appels vidéo en famille" loading="lazy"></figure>
    <figure class="poster tilt"><img src="img/a-keydou-compagnon.webp" alt="Affiche : Keydou Compagnon" loading="lazy"></figure>
    <figure class="poster tilt"><img src="img/a-komyo-whatsapp.webp" alt="Affiche : KOMYO sur WhatsApp" loading="lazy"></figure>
    <figure class="poster tilt"><img src="img/a-pioupiou-komyo.webp" alt="Affiche : PIOUPIOU et KOMYO pour les enfants" loading="lazy"></figure>
  </div>
  <div class="wrap">
    <div class="avantages">
      <div class="av rv"><b>✓</b><div><h4>Gratuit pour commencer</h4><p>Créez votre compte sans frais. Il suffit d'une connexion : données mobiles ou Wi‑Fi.</p></div></div>
      <div class="av rv d1"><b>✓</b><div><h4>S'installe en quelques secondes</h4><p>Pas besoin de boutique d'applications : on l'installe depuis le navigateur du téléphone.</p></div></div>
      <div class="av rv"><b>✓</b><div><h4>Chacun son écran, son espace</h4><p>Moi-même, mon enfant (3–6 ans), les jeunes, les professionnels : un espace adapté à chacun.</p></div></div>
      <div class="av rv d1"><b>✓</b><div><h4>Le Salon : appel vidéo en famille</h4><p>Retrouvez vos proches face à face, même à l'autre bout du monde.</p></div></div>
      <div class="av rv"><b>✓</b><div><h4>Keydou, votre compagnon</h4><p>Il répond à vos questions, vous guide et vous aide à trouver hôtels, restaurants, garages, voyages…</p></div></div>
      <div class="av rv d1"><b>✓</b><div><h4>Messages entre amis, en sécurité</h4><p>Discutez avec vos proches dans un cadre pensé pour protéger, surtout les plus jeunes.</p></div></div>
    </div>
    <h3 class="rv" style="margin:50px 0 6px;font-size:clamp(1.5rem,6vw,2.3rem)">Créer son compte KOMYO en <span class="gold">4 gestes</span></h3>
    <ol class="steps">
      <li class="rv">Ouvrez KOMYO dans le navigateur de votre téléphone et touchez « Installer ».</li>
      <li class="rv d1">Touchez « Créer mon compte gratuitement ».</li>
      <li class="rv">Indiquez votre numéro avec l'indicatif, votre nom, et inventez un code PIN de 4 ou 5 chiffres.</li>
      <li class="rv d1">Choisissez pour qui vous vous connectez : vous-même ou votre enfant. C'est prêt&nbsp;!</li>
    </ol>
    <div class="duo inv" style="margin-top:60px">
      <div class="phone rv" id="ph-komyo"><video id="v-komyo" playsinline preload="none" poster="img/p-komyo-generique.webp"><source src="video/komyo-generique.mp4" type="video/mp4"></video><button class="play" type="button" aria-label="Lire la vidéo KOMYO"><span>▶</span></button></div>
      <div><span class="eyebrow rv">En vidéo</span><h2 class="rv" style="font-size:clamp(1.8rem,6.6vw,3rem)">KOMYO, le monde <span class="gold">en mouvement</span></h2><p class="lead rv d1">Écrire. Envoyer. Vivre ensemble. Regardez le film de présentation, puis contactez-nous pour en savoir plus.</p><div class="cta rv d2" style="margin-top:20px"><a class="btn wa" href="%%WA%%?text=Bonjour%20STAR%20ENTREPRISE%2C%20je%20veux%20en%20savoir%20plus%20sur%20KOMYO" target="_blank" rel="noopener">Parler à notre service client</a></div></div>
    </div>
  </div>
</section>

<section id="energie" class="teinte">
  <div class="wrap duo inv">
    <div class="portrait rv tilt"><img src="img/a-energie-affiche.webp" alt="Affiche STAR ÉNERGIE : kit solaire" loading="lazy"></div>
    <div>
      <span class="eyebrow rv">STAR ÉNERGIE</span>
      <h2 class="rv">Le soleil prend <span class="gold">le relais</span></h2>
      <p class="lead rv d1">Kits solaires résidentiels, panneaux photovoltaïques et audit énergétique : de la lumière quand le réseau fait défaut, pour la maison comme pour l'activité.</p>
      <div class="cta rv d2" style="margin-top:22px"><a class="btn wa" href="%%WA%%?text=Bonjour%2C%20je%20souhaite%20un%20devis%20STAR%20%C3%89NERGIE" target="_blank" rel="noopener">Demander un devis sur WhatsApp</a></div>
    </div>
  </div>
</section>

<section id="tech" class="nuit">
  <canvas id="grille" aria-hidden="true"></canvas>
  <div class="wrap">
    <span class="eyebrow rv">STAR TECH · notre dernière création</span>
    <h2 class="rv">La puissance du calcul, <span class="gold">dans votre poche</span></h2>
    <p class="lead rv d1">Trois technologies conçues par STAR ENTREPRISE, qui exploitent la puce graphique de votre téléphone ou de votre ordinateur, sans rien installer de plus.</p>
    <div class="cards3">
      <div class="tc rv"><small>01 · GRAPHISME</small><h3 class="gold">STAR GPU</h3><p>Une bibliothèque qui met au travail le processeur graphique de l'appareil (WebGL2, et WebGPU en essai) pour de gros calculs, directement dans le navigateur.</p></div>
      <div class="tc rv d1"><small>02 · CALCUL</small><h3 class="gold">UC STAR</h3><p>Des formules de calcul exécutées en parallèle, pour traiter beaucoup de données en même temps : statistiques, simulations, outils métier.</p></div>
      <div class="tc rv d2"><small>03 · INTELLIGENCE ARTIFICIELLE</small><h3 class="gold">STAR IA</h3><p>Un moteur d'IA qui lit des modèles de langage compacts et converse sur l'appareil lui-même : vos textes n'ont pas besoin de quitter votre téléphone.</p></div>
    </div>
    <p class="lead rv" style="margin-top:28px;max-width:60ch">Applications possibles : santé, éducation, commerce, banque, administration, jeux. Besoin d'un outil de ce type pour votre organisation&nbsp;? <a href="#contact" style="color:var(--gold2)">Contactez-nous</a>.</p>
  </div>
</section>

<section id="culture">
  <div class="wrap duo">
    <div class="livre rv"><img src="img/livre.webp" alt="Couverture du livre De l'Ombre à la Lumière" loading="lazy"></div>
    <div>
      <span class="eyebrow rv">Le livre</span>
      <h2 class="rv">De l'Ombre <span class="gold">à la Lumière</span></h2>
      <p class="ital rv d1" style="font-size:clamp(1.4rem,5.4vw,2rem);color:var(--gold2);margin-bottom:10px">Mon combat. Ma résurrection. Ma mission.</p>
      <p class="lead rv d1">Le récit de Carry OTEMBA, publié par les Éditions Renaissance : l'histoire vraie d'un entrepreneur congolais. Un parcours de résilience, de foi et de réussite. Disponible auprès de STAR ENTREPRISE.</p>
      <div class="cta rv d2" style="margin-top:22px"><a class="btn wa" href="%%WA%%?text=Bonjour%2C%20je%20veux%20commander%20le%20livre%20De%20l%27Ombre%20%C3%A0%20la%20Lumi%C3%A8re" target="_blank" rel="noopener">Commander le livre</a></div>
    </div>
  </div>
</section>

<section id="saga" class="nuit">
  <div class="wrap">
    <span class="eyebrow rv">La saga · le jeu</span>
    <h2 class="rv">X <span class="gold">SAPHIR</span></h2>
    <p class="lead rv d1">Les dix tomes sont terminés et disponibles. Une épopée née au Canada : un héros, Calpros, les Trois Forces, un clan et le Saphir des Deux Mondes. Voici les couvertures, puis l'univers du jeu qui arrive.</p>
  </div>
  <div class="tomes">
%%TOMES%%
  </div>
  <div class="wrap">
    <div class="wide rv" style="margin-top:20px"><video id="v-xs" muted loop playsinline preload="none" poster="img/p-xsaphir-intro.webp"><source src="video/xsaphir-intro.mp4" type="video/mp4"></video></div>
    <h3 class="sub rv"><small>Bientôt disponible</small>X SAPHIR <span class="gold">Arena</span></h3>
    <p class="lead rv d1">Le jeu de combat de la saga : des héros, des héroïnes et des adversaires redoutables, dans des décors inspirés de Pointe-Noire et de Brazzaville. Voici les affiches de l'univers.</p>
  </div>
%%ARENA_AFF%%
  <div class="wrap"><h3 class="sub rv"><small>Les personnages</small>Qui sont-ils <span class="gold">?</span></h3></div>
  <div class="herosrow">%%HEROS%%</div>
  <div class="wrap">
    <h3 class="sub rv"><small>Le duel</small>Calpros <span class="gold">VS</span> KOR-MAL</h3>
    <div class="duel rv">
      <div class="side"><img src="img/x-calpros.webp" alt="Calpros, le porteur des Trois Forces" loading="lazy"><div class="nm">CALPROS</div></div>
      <div class="side k"><img src="img/x-kormal.webp" alt="KOR-MAL" loading="lazy"><div class="nm">KOR-MAL</div></div>
      <div class="vs">VS</div>
    </div>
    <div class="bientot rv" style="margin-top:14px;aspect-ratio:2/.9"><div><span>BIENTÔT</span><b>CALPROS VS CRAVOS</b></div></div>
    <h3 class="sub rv"><small>En préparation</small>Dans les coulisses du <span class="gold">jeu</span></h3>
  </div>
%%CONCEPTS%%
  <div class="wrap">
    <h3 class="sub rv"><small>Jeu en cours</small>ASTRO <span class="gold">QUEST</span></h3>
    <p class="lead rv d1">Un jeu d'aventure à travers le système solaire : huit planètes, des questions d'astronomie et des gardiens à vaincre. Créé par STAR ENTREPRISE.</p>
  </div>
%%ASTRO%%
</section>

<section id="creations">
  <div class="wrap">
    <span class="eyebrow rv">Créations de STAR ENTREPRISE</span>
    <h2 class="rv">Des marques qui <span class="gold">donnent envie</span></h2>
    <p class="lead rv d1">Alimentation, enfance, santé, sécurité, infrastructures, assistance : ces marques et ces identités sont nées chez STAR ENTREPRISE.</p>
  </div>
%%MARQUES%%
  <div class="wrap">
    <div class="duo" style="margin-top:70px">
      <div class="wide rv" style="aspect-ratio:9/16;max-width:340px;margin-inline:auto"><video id="v-star" playsinline preload="none" poster="img/p-star-entreprise.webp" controls><source src="video/star-entreprise.mp4" type="video/mp4"></video></div>
      <div><span class="eyebrow rv">Notre vidéo de présentation</span><h2 class="rv" style="font-size:clamp(1.8rem,6.6vw,3rem)">STAR ENTREPRISE <span class="gold">en 22 secondes</span></h2><p class="lead rv d1">Une courte vidéo pour comprendre ce que nous faisons : un seul groupe qui réunit des métiers variés (restauration, sport, alimentation, entreprises…) pour répondre à tous vos besoins.</p></div>
    </div>
  </div>
</section>

<section id="histoire" class="teinte">
  <div class="wrap">
    <span class="eyebrow rv">Le blog de STAR ENTREPRISE</span>
    <h2 class="rv">Notre histoire, <span class="gold">en détail</span></h2>
    <p class="lead rv d1">Pourquoi un seul groupe ? Comment travaillons-nous ? Ce que vous pouvez attendre de nous.</p>

    <div class="article rv"><div><span class="eyebrow">Article 1</span><h3>Une seule étoile, des métiers qui se parlent</h3><p class="ital">Ce que la santé, l'habitat, l'énergie et la création ont en commun.</p></div>
      <div><p>STAR ENTREPRISE est née d'une idée simple : au lieu de multiplier les interlocuteurs, réunir des métiers utiles à la vie de tous les jours sous une même exigence. Une famille peut ainsi épargner avec LIBOKÉ, se soigner à la Clinique Havre de Vie, aménager sa maison avec STAR GALERIE MEUBLES, s'équiper en énergie solaire avec STAR ÉNERGIE, et garder le lien avec ses proches sur KOMYO, sans repartir de zéro à chaque fois.</p><p style="margin-top:12px">Un seul compte, plusieurs services, un paiement sécurisé et une assistance rapide : c'est la promesse du groupe. Et avec STAR MBOTÉ, la fidélité est récompensée dans toutes les filiales.</p></div></div>

    <div class="article rv"><div><span class="eyebrow">Article 2</span><h3>L'exigence STAR ENTREPRISE, appliquée à chaque détail</h3><p class="ital">Quatre habitudes qui ne changent pas, d'une filiale à l'autre.</p></div>
      <div><div class="engage" style="margin-top:0;grid-template-columns:1fr 1fr"><div><b>Écoute</b><span>Nous partons de votre besoin, pas de notre catalogue.</span></div><div><b>Qualité</b><span>Des produits et des équipes sélectionnés avec soin.</span></div><div><b>Transparence</b><span>État, délais et conditions annoncés sans surprise.</span></div><div><b>Suivi</b><span>Nous restons présents après la prestation.</span></div></div></div></div>

    <div class="article rv"><div><span class="eyebrow">Article 3</span><h3>Innover du Canada au Congo</h3><p class="ital">Des applications, de l'intelligence artificielle et une saga, créées chez nous.</p></div>
      <div><p>STAR ENTREPRISE ne se contente pas de distribuer : elle crée. KOMYO, le réseau social qui réunit la famille. Keydou, le compagnon qui répond et qui guide. STAR TECH, nos technologies de calcul graphique et d'intelligence artificielle qui tournent sur un simple téléphone. X SAPHIR, une saga de dix tomes devenue univers de jeu. Chaque création porte la même signature et reste la propriété de STAR ENTREPRISE.</p></div></div>

    <h3 class="sub rv"><small>Questions fréquentes</small>Vous vous <span class="gold">demandez</span>…</h3>
    <details class="q rv"><summary>Comment vous contacter ?</summary><p>Par WhatsApp au +242 06 656 50 50 (service client), par e-mail à contact@starentreprise.com ou par téléphone. Nous sommes dirigés depuis le Canada et implantés en République du Congo : Brazzaville et Pointe-Noire.</p></details>
    <details class="q rv"><summary>L'entreprise est-elle officiellement enregistrée ?</summary><p>Oui. STAR ENTREPRISE est immatriculée au Registre du Commerce et du Crédit Mobilier (RCCM) de Brazzaville sous le n° CG-BZV-01-2026-A10-01950, avec ses autorisations d'exercice délivrées par les administrations congolaises compétentes.</p></details>
    <details class="q rv"><summary>Comment payer ?</summary><p>Selon les services : Mobile Money, Airtel Money ou paiement à la livraison. Demandez-nous le détail pour la filiale qui vous intéresse.</p></details>
    <details class="q rv"><summary>Comment obtenir un prix ou un devis ?</summary><p>Écrivez-nous sur WhatsApp en indiquant la filiale et votre besoin : nous vous répondons avec une proposition adaptée.</p></details>
    <details class="q rv"><summary>Comment rejoindre l'équipe ?</summary><p>Remplissez le formulaire ci-dessous et joignez votre CV (PDF ou Word, 5 Mo maximum) : l'équipe recrutement vous recontacte.</p></details>
    <details class="q rv"><summary>Puis-je utiliser vos images, logos ou vidéos ?</summary><p>Non, sans autorisation écrite. Tous les droits sont réservés à STAR ENTREPRISE. Pour une collaboration ou un partenariat, contactez-nous.</p></details>
  </div>
</section>

<section id="contact" class="nuit">
  <div class="wrap duo">
    <div>
      <span class="eyebrow rv">Contact · Carrières</span>
      <h2 class="rv">Parlons de <span class="gold">votre projet</span></h2>
      <p class="lead rv d1">Un besoin, une question, une envie de rejoindre l'équipe ? Écrivez-nous, appelez-nous ou déposez votre candidature : nous répondons.</p>
      <div class="coord">
        <a class="rv" href="%%WA%%?text=Bonjour%20STAR%20ENTREPRISE" target="_blank" rel="noopener"><span class="ic">💬</span><span>WhatsApp service client<small>+242 06 656 50 50</small></span></a>
        <a class="rv d1" href="mailto:%%MAIL%%"><span class="ic">✉</span><span>E-mail professionnel<small>%%MAIL%%</small></span></a>
        <a class="rv d2" href="tel:+242066565050"><span class="ic">☎</span><span>Appeler<small>+242 06 656 50 50</small></span></a>
      </div>
    </div>
    <form class="cv rv" id="cv" novalidate>
      <div class="champs" style="display:grid;gap:12px">
        <h3>Déposer ma candidature</h3>
        <p class="fnote">Remplissez ce petit formulaire et joignez votre CV (PDF ou Word, 5 Mo maximum).</p>
        <div class="row2"><div><label for="cNom">Nom complet *</label><input id="cNom" name="nom" required autocomplete="name"></div><div><label for="cTel">Téléphone *</label><input id="cTel" name="telephone" type="tel" required autocomplete="tel" placeholder="06 xxx xx xx"></div></div>
        <div class="row2"><div><label for="cMail">E-mail</label><input id="cMail" name="email" type="email" autocomplete="email" placeholder="vous@email.com"></div>
        <div><label for="cDom">Domaine</label><select id="cDom" name="domaine"><option>Santé &amp; Bien-être</option><option>Immobilier &amp; Habitat</option><option>Tourisme &amp; Hôtellerie</option><option>Finance &amp; Épargne</option><option>Numérique &amp; Créativité</option><option>Énergie</option><option>Mobilité &amp; Transport</option><option>Art &amp; Culture</option><option>Éducation &amp; Petite enfance</option><option>Autre</option></select></div></div>
        <div><label for="cPoste">Poste souhaité (facultatif)</label><input id="cPoste" name="poste" placeholder="Ex. : assistant(e) commercial(e), comptable…"></div>
        <div><label for="cMsg">Message</label><textarea id="cMsg" name="message" placeholder="Parlez-nous de votre parcours et de vos motivations"></textarea></div>
        <div><label for="cCv">Votre CV (PDF, DOC, DOCX) *</label><input id="cCv" name="cv" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div>
        <button class="btn or" type="submit" id="cvBtn">Envoyer ma candidature</button>
        <p class="fnote" id="cvMsg" role="status"></p>
      </div>
      <div id="cvok"><b>Merci !</b> Votre candidature a bien été transmise à l'équipe recrutement. Vous serez contacté(e) par téléphone ou e-mail.</div>
    </form>
  </div>
</section>
</main>

<footer class="tk-nuit">
  <img src="img/logo-star.webp" alt="Logo officiel STAR ENTREPRISE">
  <div class="nm gold">STAR ENTREPRISE</div>
  <p>Un seul groupe, toutes les solutions pour votre vie.</p>
  <p>Du Canada, Brazzaville, Pointe-Noire — République du Congo</p>
  <p class="droits">© 2026 STAR ENTREPRISE — Tous droits réservés. Les marques, logos, images, vidéos, textes, œuvres, personnages et technologies présentés sur cette page sont la propriété de STAR ENTREPRISE. Toute reproduction ou utilisation sans autorisation écrite est interdite.</p>
</footer>
<div id="lueur" aria-hidden="true"></div><button id="haut" type="button" aria-label="Retour en haut de la page">↑</button>
<a id="flot" href="%%WA%%?text=Bonjour%20STAR%20ENTREPRISE" target="_blank" rel="noopener" aria-label="Écrire sur WhatsApp">%%WASVG%%</a>
"""

JS = r"""
(function(){
'use strict';
var de=document.documentElement,body=document.body;de.classList.add('js');
var reduit=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var $=function(s,c){return (c||document).querySelector(s)},$$=function(s,c){return [].slice.call((c||document).querySelectorAll(s))};

/* ----- INTRO : poussière d'or + rideau ----- */
var intro=$('#intro'),cv=$('#dust'),cx=cv.getContext('2d'),pts=[],W=0,H=0,raf=0,vivant=true;
function dim(){W=cv.width=innerWidth;H=cv.height=innerHeight}
function init(){pts=[];var n=Math.min(150,Math.floor(W*H/9000));for(var i=0;i<n;i++)pts.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2.2+.4,v:Math.random()*.5+.15,a:Math.random()*6.28,s:Math.random()*.03+.01})}
function tick(){if(!vivant)return;cx.clearRect(0,0,W,H);for(var i=0;i<pts.length;i++){var p=pts[i];p.y-=p.v;p.x+=Math.sin(p.a+=p.s)*.35;if(p.y<-8){p.y=H+8;p.x=Math.random()*W}var o=.35+.65*Math.abs(Math.sin(p.a*1.7));cx.beginPath();cx.fillStyle='rgba(255,226,154,'+o.toFixed(2)+')';cx.shadowColor='#e3b653';cx.shadowBlur=10;cx.arc(p.x,p.y,p.r,0,6.283);cx.fill()}raf=requestAnimationFrame(tick)}
dim();init();if(!reduit)tick();addEventListener('resize',function(){dim();init()});
body.classList.add('intro-on');body.style.overflow='hidden';
$('#entrer').addEventListener('click',function(){
  intro.classList.add('open');
  setTimeout(function(){body.classList.remove('intro-on');body.style.overflow='';vivant=false;cancelAnimationFrame(raf);intro.style.display='none';lecteursHero()},reduit?10:1500);
});

/* ----- HERO : diaporama ----- */
var sl=$$('.slide'),si=0,hid=0;
function lecteursHero(){if(hid||reduit)return;hid=setInterval(function(){sl[si].classList.remove('on');si=(si+1)%sl.length;sl[si].classList.add('on')},5200)}

/* ----- progression + barre qui se cache en descendant ----- */
var prog=$('#prog'),bar=$('#bar');function sc(){var h=de.scrollHeight-innerHeight;prog.style.width=(h>0?scrollY/h*100:0)+'%';bar.classList.toggle('plein',scrollY>innerHeight*.5)}addEventListener('scroll',sc,{passive:true});sc();
/* menu plein écran + lien actif */
var bg=$('#burger'),mn=$('#menu');
function ouvrirMenu(){mn.hidden=false;bg.setAttribute('aria-expanded',true);body.classList.add('menu-on');try{history.pushState({m:1},'')}catch(e){}}
function fermerMenu(depuisRetour,lien){mn.hidden=true;bg.setAttribute('aria-expanded',false);body.classList.remove('menu-on');if(!depuisRetour){try{if(history.state&&history.state.m){lien?history.replaceState(null,''):history.back()}}catch(e){}}}
bg.addEventListener('click',function(){mn.hidden?ouvrirMenu():fermerMenu(false)});
$$('#menu a').forEach(function(a){a.addEventListener('click',function(){fermerMenu(false,true)})});
addEventListener('popstate',function(){if(!mn.hidden)fermerMenu(true)});
addEventListener('keydown',function(e){if(e.key==='Escape'&&!mn.hidden)fermerMenu(false)});
var tl=$$('.topnav a'),tsec=tl.map(function(a){return $(a.getAttribute('href'))});
if('IntersectionObserver' in window){var tio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var i=tsec.indexOf(e.target);tl.forEach(function(a,k){a.classList.toggle('on',k===i)})}})},{rootMargin:'-45% 0px -50% 0px'});tsec.forEach(function(s){s&&tio.observe(s)})}

/* ----- apparitions ----- */
var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'}):null;
$$('.rv').forEach(function(el){io?io.observe(el):el.classList.add('in')});
setTimeout(function(){$$('.rv').forEach(function(el){el.classList.add('in')})},9000);

/* ----- manifeste mot à mot ----- */
var m=$('#manif');m.innerHTML=m.textContent.split(' ').map(function(w){return '<span>'+w+'</span>'}).join(' ');
var ms=$$('span',m),mio=io&&new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){ms.forEach(function(s,i){setTimeout(function(){s.classList.add('on')},i*(reduit?0:140))});mio.disconnect()}})},{threshold:.4});mio?mio.observe(m):ms.forEach(function(s){s.classList.add('on')});

/* ----- compteurs ----- */
var cio=io&&new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var el=e.target,n=+el.dataset.n,t0=performance.now(),d=reduit?1:1400;(function f(t){var k=Math.min(1,(t-t0)/d);el.textContent=Math.round(n*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)})(t0);cio.unobserve(el)})},{threshold:.6});
$$('.chiffre b').forEach(function(b){cio?cio.observe(b):b.textContent=b.dataset.n});

/* ----- filiales : puce active + chapitre vivant ----- */
var chips=$$('#chips a'),chaps=$$('.chap');
if('IntersectionObserver' in window){var cio2=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');var n=e.target.dataset.n;chips.forEach(function(c){var on=c.dataset.n===n;c.classList.toggle('on',on);if(on){var bar=c.parentNode;bar.scrollTo({left:c.offsetLeft-bar.clientWidth/2+c.offsetWidth/2,behavior:'smooth'})}})}})},{threshold:.35});chaps.forEach(function(c){cio2.observe(c)})}else{chaps.forEach(function(c){c.classList.add('in')})}

/* ----- inclinaison 3D des affiches ----- */
if(!reduit&&matchMedia('(hover:hover)').matches){$$('.tilt').forEach(function(el){el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform='rotateY('+(x*14)+'deg) rotateX('+(-y*14)+'deg) scale(1.03)'});el.addEventListener('pointerleave',function(){el.style.transform=''})})}

/* ----- vidéos ----- */
var ph=$('#ph-komyo');if(ph){var vk=$('#v-komyo');ph.querySelector('.play').addEventListener('click',function(){ph.classList.add('on');vk.controls=true;vk.play()})}
var vx=$('#v-xs');if(vx&&'IntersectionObserver' in window){new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){vx.play().catch(function(){})}else vx.pause()})},{threshold:.4}).observe(vx)}
$$('video').forEach(function(v){v.addEventListener('play',function(){$$('video').forEach(function(o){if(o!==v&&!o.paused&&o.id!=='v-xs')o.pause()})})});

/* ----- STAR TECH : grille de calcul ----- */
var g=$('#grille');if(g&&!reduit){var gx=g.getContext('2d'),gw=0,gh=0,gt=0,visible=false;function gd(){var r=g.parentNode.getBoundingClientRect();gw=g.width=r.width;gh=g.height=r.height}gd();addEventListener('resize',gd);
new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)gf()},{threshold:0}).observe(g.parentNode);
function gf(){if(!visible)return;gt+=.012;gx.clearRect(0,0,gw,gh);var s=34;for(var x=0;x<gw;x+=s)for(var y=0;y<gh;y+=s){var v=(Math.sin(x*.02+gt*3)+Math.cos(y*.025-gt*2)+Math.sin((x+y)*.012+gt))/3,a=Math.max(0,v)*.9;gx.fillStyle='rgba(227,182,83,'+a.toFixed(2)+')';gx.fillRect(x+s/2-1.5,y+s/2-1.5,3,3)}requestAnimationFrame(gf)}}

/* ----- formulaire CV ----- */
/* Sur le site officiel (hébergé chez Hostinger) le CV part directement vers backend/candidature-cv.php.
   Dans l'aperçu ou sur un autre domaine, le formulaire prépare un message WhatsApp : aucune donnée n'est perdue. */
var CFG=window.STAR_CONFIG||{};
var officiel=/(^|\.)starentreprise\.com$/.test(location.hostname)&&!/^komyo\./.test(location.hostname)&&CFG.apiKey;
var f=$('#cv'),msg=$('#cvMsg'),btn=$('#cvBtn');
f.addEventListener('submit',function(e){e.preventDefault();msg.style.color='';
  var nom=f.nom.value.trim(),tel=f.telephone.value.trim(),file=f.cv.files&&f.cv.files[0];
  if(!nom||!tel){msg.textContent='Merci d\'indiquer votre nom et votre téléphone.';msg.style.color='#ff9b8a';return}
  if(!file){msg.textContent='Merci de joindre votre CV (PDF ou Word).';msg.style.color='#ff9b8a';return}
  var ext=(file.name.split('.').pop()||'').toLowerCase();
  if(['pdf','doc','docx'].indexOf(ext)<0){msg.textContent='Format non accepté : envoyez un PDF, DOC ou DOCX.';msg.style.color='#ff9b8a';return}
  if(file.size>5*1024*1024){msg.textContent='Votre CV dépasse 5 Mo : envoyez une version plus légère.';msg.style.color='#ff9b8a';return}
  if(officiel){
    btn.disabled=true;msg.textContent='Envoi en cours…';
    var fd=new FormData();['nom','telephone','email','domaine','poste','message'].forEach(function(k){fd.append(k,f[k].value.trim())});fd.append('page','decouvrir');fd.append('cv',file,file.name);
    fetch(CFG.endpoint||'/backend/candidature-cv.php',{method:'POST',headers:{'Authorization':'Bearer '+CFG.apiKey},body:fd}).then(function(r){return r.json().catch(function(){return{}})}).then(function(r){if(r&&r.ok){f.classList.add('sent')}else{btn.disabled=false;msg.textContent=(r&&r.message)||'Envoi impossible pour le moment. Écrivez-nous sur WhatsApp au +242 06 656 50 50.';msg.style.color='#ff9b8a'}}).catch(function(){btn.disabled=false;msg.textContent='Envoi impossible pour le moment. Écrivez-nous sur WhatsApp au +242 06 656 50 50.';msg.style.color='#ff9b8a'});
  }else{
    var t='Bonjour STAR ENTREPRISE, je dépose ma candidature.%0ANom : '+encodeURIComponent(nom)+'%0ATéléphone : '+encodeURIComponent(tel)+'%0ADomaine : '+encodeURIComponent(f.domaine.value)+(f.poste.value?'%0APoste : '+encodeURIComponent(f.poste.value):'')+'%0AMon CV ('+encodeURIComponent(file.name)+') est joint à ce message.';
    msg.textContent='Votre message est prêt : touchez « Ouvrir WhatsApp », puis joignez votre CV.';
    btn.textContent='Ouvrir WhatsApp';btn.onclick=function(ev){ev.preventDefault();window.open('https://wa.me/242066565050?text='+t,'_blank','noopener')};
    window.open('https://wa.me/242066565050?text='+t,'_blank','noopener');
  }
});

/* ----- lueur du curseur, étincelles-diamants, ondes d'énergie au toucher, retour en haut ----- */
(function(){
  var lu=$('#lueur'),haut=$('#haut'),dernier=0,cache=0;
  function pos(x,y){lu.style.transform='translate('+(x-210)+'px,'+(y-210)+'px)';lu.classList.add('on')}
  if(!reduit){
    addEventListener('pointermove',function(e){if(e.pointerType==='mouse'){pos(e.clientX,e.clientY);var n=performance.now();if(n-dernier>45){dernier=n;var s=document.createElement('i');s.className='etin'+(Math.random()<.4?' g':'');s.style.left=(e.clientX+(Math.random()*18-9))+'px';s.style.top=(e.clientY+(Math.random()*18-9))+'px';s.style.setProperty('--dx',(Math.random()*40-20)+'px');s.style.setProperty('--dy',(20+Math.random()*30)+'px');document.body.appendChild(s);s.addEventListener('animationend',function(){s.remove()})}}},{passive:true});
    addEventListener('pointerdown',function(e){
      pos(e.clientX,e.clientY);clearTimeout(cache);
      for(var i=0;i<3;i++){var o=document.createElement('i');o.className='onde o'+i;o.style.left=e.clientX+'px';o.style.top=e.clientY+'px';document.body.appendChild(o);o.addEventListener('animationend',function(){this.remove()})}
    },{passive:true});
    addEventListener('pointerup',function(e){if(e.pointerType!=='mouse'){cache=setTimeout(function(){lu.classList.remove('on')},900)}},{passive:true});
    document.addEventListener('mouseleave',function(){lu.classList.remove('on')});
  }
  addEventListener('scroll',function(){haut.classList.toggle('on',scrollY>700)},{passive:true});
  haut.addEventListener('click',function(){scrollTo({top:0,behavior:reduit?'auto':'smooth'})});
})();
})();
"""

def page(prefix=''):
    marq = ''.join(f'<span>★</span>{E(f[0])} ' for f in FILIALES)
    b = (BODY.replace('%%ARENA_AFF%%', ARENA_AFF).replace('%%HEROS%%', HEROS).replace('%%CONCEPTS%%', CONCEPTS).replace('%%ASTRO%%', ASTRO).replace('%%MARQUES%%', MARQUES).replace('%%FILIALES%%', FIL).replace('%%CHIPS%%', CHIPS).replace('%%TOMES%%', TOMES).replace('%%MARQUEE%%', marq)
         .replace('%%WA%%', WA).replace('%%MAIL%%', MAIL).replace('%%WASVG%%', WA_SVG))
    return ('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<title>Découvrez qui est STAR ENTREPRISE</title>'
            '<meta name="description" content="STAR ENTREPRISE : une seule entreprise, 21 filiales, KOMYO, Keydou, STAR TECH, X SAPHIR. Santé, épargne, immobilier, énergie, art et numérique, du Canada au Congo.">'
            '<meta name="theme-color" content="#07090f"><meta name="robots" content="noindex">'
            '<meta property="og:title" content="Découvrez qui est STAR ENTREPRISE"><meta property="og:description" content="Un seul groupe, toutes les solutions pour votre vie : 21 filiales, KOMYO, Keydou, STAR TECH, X SAPHIR. Découvrez notre vision, nos ambitions et tout ce que nous créons.">'
            '<meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="STAR ENTREPRISE"><meta property="og:url" content="https://komyo.starentreprise.com/decouvrir/"><meta property="og:type" content="website"><meta property="og:image" content="https://komyo.starentreprise.com/decouvrir/img/partage.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Découvrez qui est STAR ENTREPRISE">'
            '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Découvrez qui est STAR ENTREPRISE"><meta name="twitter:image" content="https://komyo.starentreprise.com/decouvrir/img/partage.jpg">'
            '<link rel="icon" href="img/mark.webp">'
            '<style>' + CSS + '</style></head><body>' + b + '<script>' + JS + '</script></body></html>')

def apercu(chemin):
    """Fichier unique autonome : images, polices et vidéos allégées intégrées en base64."""
    h = page()
    tmp = tempfile.mkdtemp()
    def b64(p, mime):
        return f'data:{mime};base64,' + base64.b64encode(open(p, 'rb').read()).decode()
    def vid_leger(name):
        out = f'{tmp}/{name}.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{OUT}video/{name}.mp4', '-vf', 'scale=-2:480' if name == 'xsaphir-intro' else 'scale=-2:640',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '36', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '32k', out], check=True)
        return b64(out, 'video/mp4')
    h = re.sub(r'url\(polices/([\w-]+\.woff2)\)', lambda m: 'url(' + b64(OUT + 'polices/' + m.group(1), 'font/woff2') + ')', h)
    h = re.sub(r'url\(img/([\w-]+\.webp)\)', lambda m: 'url(' + b64(OUT + 'img/' + m.group(1), 'image/webp') + ')', h)
    h = re.sub(r'(src|poster|href)="img/([\w-]+\.webp)"', lambda m: f'{m.group(1)}="' + b64(OUT + 'img/' + m.group(2), 'image/webp') + '"', h)
    h = re.sub(r'src="video/([\w-]+)\.mp4"', lambda m: 'src="' + vid_leger(m.group(1)) + '"', h)
    open(chemin, 'w', encoding='utf-8').write(h)
    print('aperçu', chemin, os.path.getsize(chemin) // 1024, 'Ko')

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    open(OUT + 'index.html', 'w', encoding='utf-8').write(page())
    print('decouvrir/index.html', os.path.getsize(OUT + 'index.html') // 1024, 'Ko')
    if '--apercu' in sys.argv:
        apercu(sys.argv[sys.argv.index('--apercu') + 1])
