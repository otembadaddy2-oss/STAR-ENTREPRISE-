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

# ------------------------------------------------------------------ filiales
def carte(i, f):
    nom, rub, txt, img, mode, page = f
    if mode.startswith('art-'):
        fond = f'<div class="fi art {mode}" aria-hidden="true"><div class="art-halo"></div><img class="art-mark" src="img/mark.webp" alt=""><span class="art-nom">{E(nom)}</span></div>'
    else:
        fond = f'<div class="fi {mode}"><img src="img/{img}.webp" alt="{E(nom)} — {E(rub)}" loading="lazy" decoding="async"></div>'
    return (f'<article class="fcard" data-i="{i+1}">{fond}<div class="fshade"></div>'
            f'<div class="ftxt"><span class="fnum">{i+1:02d}<small>/{len(FILIALES)}</small></span><span class="frub">{E(rub)}</span>'
            f'<h3>{E(nom)}</h3><p>{E(txt)}</p>'
            f'<a class="flink" href="https://starentreprise.com/{page}" target="_blank" rel="noopener">Découvrir sur le site officiel <i>→</i></a></div></article>')
FIL = '\n'.join(carte(i, f) for i, f in enumerate(FILIALES))

# ------------------------------------------------------------------ tomes
TOMES = '\n'.join(f'<figure class="tome"><img src="img/t{n:02d}.webp" alt="X SAPHIR — Tome {n}, couverture" loading="lazy" decoding="async"><figcaption>TOME {n}</figcaption></figure>' for n in range(1, 11))

CSS = r"""
@font-face{font-family:"Inter Display";font-weight:300;font-display:swap;src:url(polices/inter-display-300.woff2) format("woff2")}
@font-face{font-family:"Inter Display";font-weight:600;font-display:swap;src:url(polices/inter-display-600.woff2) format("woff2")}
@font-face{font-family:"Inter Display";font-weight:800;font-display:swap;src:url(polices/inter-display-800.woff2) format("woff2")}
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
h1,h2,h3{font-weight:800;line-height:1.06;letter-spacing:-.02em;text-wrap:balance}
h2{font-size:clamp(2rem,7.4vw,4.1rem);margin-bottom:16px}
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
#bar{position:fixed;inset:0 0 auto 0;z-index:50;display:flex;justify-content:space-between;align-items:center;padding:calc(10px + env(safe-area-inset-top,0px)) clamp(16px,4vw,32px) 12px;background:linear-gradient(#07090ff2 55%,#07090f00);transition:transform .45s var(--ease);pointer-events:none}
#bar.cache{transform:translateY(-110%)}
#bar>*{pointer-events:auto}
#bar img{width:46px;height:46px;object-fit:contain;filter:drop-shadow(0 2px 10px #000)}
#bar a.btn{padding:11px 18px;font-size:.86rem;background:rgba(7,9,15,.7);backdrop-filter:blur(8px)}
body.intro-on #bar,body.intro-on #prog{opacity:0}

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
.manif{font-weight:800;font-size:clamp(1.7rem,6.8vw,3.6rem);line-height:1.12;letter-spacing:-.02em;max-width:22ch}
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

/* contact */
#contact{background:radial-gradient(90% 70% at 50% 0,#14265a66,transparent)}
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
"""

WA_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>'

BODY = r"""
<div id="prog"></div>
<header id="bar"><a href="#hero" aria-label="Haut de page"><img src="img/mark.webp" alt="STAR ENTREPRISE"></a><a class="btn or" href="#contact">Nous contacter</a></header>

<div id="intro" role="dialog" aria-label="Bienvenue chez STAR ENTREPRISE">
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
    <div class="slide"><img src="img/f-clinique.webp" alt=""></div>
    <div class="slide"><img src="img/f-casa.webp" alt=""></div>
    <div class="slide"><img src="img/f-meubles.webp" alt=""></div>
  </div>
  <div class="wrap in">
    <span class="eyebrow">Brazzaville · Pointe-Noire · Congo</span>
    <h1>Qui est <span class="gold">STAR ENTREPRISE&nbsp;?</span></h1>
    <p class="lead">Une seule entreprise. Santé, épargne, immobilier, tourisme, énergie, art, numérique… Toutes les solutions pour votre vie, réunies sous une même étoile.</p>
    <div class="cta"><a class="btn or" href="#filiales">Voir nos 21 filiales</a><a class="btn" href="#contact">Nous contacter</a></div>
  </div>
  <i class="scrollcue" aria-hidden="true"></i>
</section>

<section id="manifeste">
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
      <p class="lead rv d1">PDG de STAR ENTREPRISE. Du soin de la famille à l'énergie solaire, de l'art à l'intelligence artificielle : une vision, celle de mettre au service des Congolais, et bien au-delà, des solutions sérieuses, belles et accessibles.</p>
      <p class="lead rv d2" style="margin-top:14px">Chaque filiale a son métier, son équipe et son identité. Toutes partagent la même promesse : <b style="color:var(--ink);font-weight:600">un seul groupe, toutes les solutions pour votre vie.</b></p>
    </div>
  </div>
</section>

<section id="filiales">
  <div class="wrap fhead"><span class="eyebrow rv">Nos filiales</span><h2 class="rv">21 filiales.<br><span class="gold">Une seule étoile.</span></h2><p class="lead rv d1">Faites glisser pour découvrir chaque filiale, son univers et ce qu'elle peut faire pour vous.</p></div>
  <div class="fstrip" id="fstrip">
%%FILIALES%%
  </div>
  <div class="fprog"><i id="fbar"></i></div>
  <p class="fhint">Glissez vers la gauche ← pour la suite</p>
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
      <div class="phone rv" id="ph-komyo"><video id="v-komyo" playsinline preload="none" poster="img/p-komyo-monde.webp"><source src="video/komyo-monde.mp4" type="video/mp4"></video><button class="play" type="button" aria-label="Lire la vidéo KOMYO"><span>▶</span></button></div>
      <div><span class="eyebrow rv">En vidéo</span><h2 class="rv" style="font-size:clamp(1.8rem,6.6vw,3rem)">KOMYO, le monde <span class="gold">en mouvement</span></h2><p class="lead rv d1">Écrire. Envoyer. Vivre ensemble. Regardez le film de présentation, puis contactez-nous pour en savoir plus.</p><div class="cta rv d2" style="margin-top:20px"><a class="btn wa" href="%%WA%%?text=Bonjour%20STAR%20ENTREPRISE%2C%20je%20veux%20en%20savoir%20plus%20sur%20KOMYO" target="_blank" rel="noopener">Parler à notre service client</a></div></div>
    </div>
  </div>
</section>

<section id="energie" style="background:linear-gradient(180deg,var(--bg),#0d1a3d,var(--bg))">
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

<section id="tech">
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
      <p class="lead rv d1">Le livre de Carry OTEMBA, publié par les Éditions Renaissance. Une histoire de passage, de courage et de lumière. Disponible auprès de STAR ENTREPRISE.</p>
      <div class="cta rv d2" style="margin-top:22px"><a class="btn wa" href="%%WA%%?text=Bonjour%2C%20je%20veux%20commander%20le%20livre%20De%20l%27Ombre%20%C3%A0%20la%20Lumi%C3%A8re" target="_blank" rel="noopener">Commander le livre</a></div>
    </div>
  </div>

  <div class="wrap" style="margin-top:clamp(70px,12vw,130px)">
    <span class="eyebrow rv">La saga</span>
    <h2 class="rv">X <span class="gold">SAPHIR</span></h2>
    <p class="lead rv d1">Dix tomes. Un héros. Les Trois Forces. Découvrez les couvertures de la saga.</p>
  </div>
  <div class="tomes">
%%TOMES%%
  </div>

  <div class="wrap">
    <div class="wide rv" style="margin-top:20px"><video id="v-xs" muted loop playsinline preload="none" poster="img/p-xsaphir-intro.webp"><source src="video/xsaphir-intro.mp4" type="video/mp4"></video></div>
    <h3 class="rv" style="margin:60px 0 18px;font-size:clamp(1.5rem,6vw,2.4rem)">X SAPHIR Arena · <span class="gold">Calpros VS KOR-MAL</span></h3>
    <div class="duel rv">
      <div class="side"><img src="img/x-calpros.webp" alt="Calpros, le porteur des Trois Forces" loading="lazy"><div class="nm">CALPROS</div></div>
      <div class="side k"><img src="img/x-kormal.webp" alt="KOR-MAL" loading="lazy"><div class="nm">KOR-MAL</div></div>
      <div class="vs">VS</div>
    </div>
    <div class="gridcards">
      <div class="bientot rv"><div><span>BIENTÔT</span><b>CALPROS VS CRAVOS</b></div></div>
      <div class="jeu rv d1"><img src="img/x-arena-saga.webp" alt="Affiche du jeu X SAPHIR Arena" loading="lazy"><div><span>JEU EN PRÉPARATION</span><b>X SAPHIR Arena</b></div></div>
      <div class="jeu rv d2"><img src="img/g-astro.webp" alt="Jeu ASTRO QUEST" loading="lazy"><div><span>JEU EN COURS</span><b>ASTRO QUEST</b></div></div>
    </div>
  </div>
</section>

<section id="creations">
  <div class="wrap">
    <span class="eyebrow rv">Créations de STAR ENTREPRISE</span>
    <h2 class="rv">Des marques qui <span class="gold">donnent envie</span></h2>
    <p class="lead rv d1">Alimentation, santé, protection, éducation, culture : toutes ces marques sont nées chez STAR ENTREPRISE.</p>
    <div class="mosaic">
      <figure class="rv"><img src="img/c-lamah-poster.webp" alt="Pices LAMAH" loading="lazy"><figcaption>Pices LAMAH</figcaption></figure>
      <figure class="rv d1"><img src="img/c-pioupiou.webp" alt="PIOUPIOU" loading="lazy"><figcaption>PIOUPIOU</figcaption></figure>
      <figure class="rv d2"><img src="img/c-lapinbio.webp" alt="Lapin Bio" loading="lazy"><figcaption>Lapin Bio</figcaption></figure>
      <figure class="rv"><img src="img/c-bissapop.webp" alt="BISSA POP" loading="lazy"><figcaption>BISSA POP</figcaption></figure>
      <figure class="rv d1"><img src="img/c-burkina.webp" alt="Burkina Faso Bio" loading="lazy"><figcaption>Burkina Faso Bio</figcaption></figure>
      <figure class="rv d2"><img src="img/c-sosdoc.webp" alt="SOS DOC" loading="lazy"><figcaption>SOS DOC</figcaption></figure>
      <figure class="rv"><img src="img/c-staralerte.webp" alt="STAR ALERTE" loading="lazy"><figcaption>STAR ALERTE</figcaption></figure>
      <figure class="rv d1"><img src="img/c-kindimbou.webp" alt="Kindimbou" loading="lazy"><figcaption>Kindimbou</figcaption></figure>
      <figure class="rv d2"><img src="img/c-dinnovation-btp.webp" alt="D-Innovation BTP" loading="lazy"><figcaption>D-Innovation BTP</figcaption></figure>
    </div>
    <div class="duo" style="margin-top:70px">
      <div class="wide rv" style="aspect-ratio:9/16;max-width:340px;margin-inline:auto"><video id="v-star" playsinline preload="none" poster="img/p-star-entreprise.webp" controls><source src="video/star-entreprise.mp4" type="video/mp4"></video></div>
      <div><span class="eyebrow rv">Le film</span><h2 class="rv" style="font-size:clamp(1.8rem,6.6vw,3rem)">Un seul groupe. <span class="gold">Toutes les solutions.</span></h2><p class="lead rv d1">Regardez STAR ENTREPRISE en 20 secondes. Et pour vos mariages, anniversaires et grands événements :</p>
      <div class="wide rv d2" style="aspect-ratio:9/16;max-width:260px;margin-top:16px"><video id="v-ev" muted loop playsinline preload="none" poster="img/p-events.webp" controls><source src="video/events.mp4" type="video/mp4"></video></div></div>
    </div>
  </div>
</section>

<section id="contact">
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

<footer>
  <img src="img/logo-star.webp" alt="Logo officiel STAR ENTREPRISE">
  <div class="nm gold">STAR ENTREPRISE</div>
  <p>Un seul groupe, toutes les solutions pour votre vie.</p>
  <p>Brazzaville · Pointe-Noire — République du Congo</p>
  <p class="droits">© 2026 STAR ENTREPRISE — Tous droits réservés. Les marques, logos, images, vidéos, textes, œuvres, personnages et technologies présentés sur cette page sont la propriété de STAR ENTREPRISE. Toute reproduction ou utilisation sans autorisation écrite est interdite.</p>
</footer>
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
var prog=$('#prog'),bar=$('#bar'),y0=0;function sc(){var h=de.scrollHeight-innerHeight;prog.style.width=(h>0?scrollY/h*100:0)+'%';bar.classList.toggle('cache',scrollY>y0&&scrollY>240);y0=scrollY}addEventListener('scroll',sc,{passive:true});sc();

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

/* ----- filiales : carte active + barre ----- */
var fs=$('#fstrip'),fc=$$('.fcard',fs),fb=$('#fbar');
function actif(){var c=fs.scrollLeft+fs.clientWidth/2,best=0,bd=1e9;fc.forEach(function(k,i){var d=Math.abs(k.offsetLeft+k.offsetWidth/2-c);if(d<bd){bd=d;best=i}});fc.forEach(function(k,i){k.classList.toggle('act',i===best)});var mx=fs.scrollWidth-fs.clientWidth;fb.style.width=(100/fc.length+(mx>0?fs.scrollLeft/mx*(100-100/fc.length):0))+'%'}
fs.addEventListener('scroll',actif,{passive:true});addEventListener('resize',actif);actif();
(function(){var d=0,x0=0,s0=0;fs.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')return;d=1;x0=e.clientX;s0=fs.scrollLeft;fs.style.scrollSnapType='none';fs.style.cursor='grabbing'});addEventListener('pointermove',function(e){if(d)fs.scrollLeft=s0-(e.clientX-x0)});addEventListener('pointerup',function(){if(d){d=0;fs.style.scrollSnapType='';fs.style.cursor=''}})})();

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
})();
"""

def page(prefix=''):
    marq = ''.join(f'<span>★</span>{E(f[0])} ' for f in FILIALES)
    b = (BODY.replace('%%FILIALES%%', FIL).replace('%%TOMES%%', TOMES).replace('%%MARQUEE%%', marq)
         .replace('%%WA%%', WA).replace('%%MAIL%%', MAIL).replace('%%WASVG%%', WA_SVG))
    return ('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<title>Découvrez qui est STAR ENTREPRISE</title>'
            '<meta name="description" content="STAR ENTREPRISE : une seule entreprise, 21 filiales, KOMYO, Keydou, STAR TECH, X SAPHIR. Santé, épargne, immobilier, énergie, art et numérique au Congo.">'
            '<meta name="theme-color" content="#07090f"><meta name="robots" content="noindex">'
            '<meta property="og:title" content="Découvrez qui est STAR ENTREPRISE"><meta property="og:image" content="img/logo-star.webp">'
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
