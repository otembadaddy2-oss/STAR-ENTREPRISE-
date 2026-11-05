# Fabrique le post-it « BONUS » doré de KOMYO Mboté en SVG (très léger, net sur tous les écrans).
# Lancer : python3 tools/fabrique-postit.py   (écrit starvibe/assets/img/bonus/postit-bonus-v1.svg)
# Utilisation : à mettre EN LIGNE DANS LA PAGE (balise <svg> directe), car la police « Permanent Marker » du mot BONUS doit être chargée par la page.
import math, os, random
random.seed(7)
OUT = os.path.join(os.path.dirname(__file__), '..', 'starvibe', 'assets', 'img', 'bonus', 'postit-bonus-v1.svg')
def r(x): return ('%.1f' % x).rstrip('0').rstrip('.')
def fleur(i, cx, cy, taille, rot, n=8, c0='#ffffff', c1='#ffe9a8', centre='#e8920c'):
    d = ['<g transform="translate(%s %s) rotate(%s) scale(%s)">' % (r(cx), r(cy), r(rot), r(taille))]
    d.append('<ellipse cx="0" cy="3" rx="25" ry="25" fill="#7a4a05" opacity=".28" filter="url(#fl)"/>')
    for k in range(n):
        d.append('<ellipse cx="0" cy="-15" rx="8.6" ry="15" transform="rotate(%s)" fill="url(#pt%d)" stroke="#e7b44a" stroke-width=".7"/>' % (r(k * 360 / n), i))
        d.append('<path d="M0-8V-26" transform="rotate(%s)" stroke="#f1c764" stroke-width=".6" opacity=".7"/>' % r(k * 360 / n))
    d.append('<circle r="8.5" fill="url(#ce%d)" stroke="#a85f06" stroke-width=".8"/>' % i)
    for k in range(9):
        a = k * 40 * math.pi / 180; d.append('<circle cx="%s" cy="%s" r="1" fill="#fff0b0"/>' % (r(5 * math.cos(a)), r(5 * math.sin(a))))
    d.append('<circle r="2.2" fill="#fff0b0"/></g>')
    defs = '<radialGradient id="pt%d" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></radialGradient><radialGradient id="ce%d" cx=".4" cy=".35"><stop offset="0" stop-color="#ffc247"/><stop offset="1" stop-color="%s"/></radialGradient>' % (i, c0, c1, i, centre)
    return ''.join(d), defs
def etoile(x, y, s, delai, dur=2.6):
    # le placement est sur le <g>, l'animation (échelle) sur le tracé : sinon l'animation écrase le placement
    return '<g transform="translate(%s %s) scale(%s)"><path class="et" style="animation-delay:%ss;animation-duration:%ss" d="M0-10 2.6-2.6 10 0 2.6 2.6 0 10-2.6 2.6-10 0-2.6-2.6z" fill="#fff"/></g>' % (r(x), r(y), r(s), r(delai), r(dur))
fl, defs = [], []
for i, (cx, cy, t, rot, n) in enumerate([(52, 56, 1.15, -12, 8), (258, 40, .9, 18, 7), (44, 252, .95, 8, 8), (264, 262, .75, -20, 6)]):
    g, d = fleur(i, cx, cy, t, rot, n, '#ffffff' if i % 2 == 0 else '#fff6d6'); fl.append(g); defs.append(d)
grains = ''.join('<circle cx="%s" cy="%s" r="%s" fill="#fff" opacity="%s"/>' % (r(random.uniform(20, 280)), r(random.uniform(30, 270)), r(random.uniform(.5, 1.5)), r(random.uniform(.12, .4))) for _ in range(46))
et = ''.join(etoile(x, y, s, dl) for x, y, s, dl in [(120, 80, .9, 0), (230, 110, .7, .7), (90, 200, .6, 1.3), (205, 220, 1, .4), (150, 40, .6, 1.9), (170, 160, .5, 1.1), (60, 150, .55, 2.1)])
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 310" role="img" aria-label="Post-it BONUS KOMYO Mboté">
<defs>
<linearGradient id="or" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".22" stop-color="#ffd54a"/><stop offset=".5" stop-color="#f2a91d"/><stop offset=".75" stop-color="#ffd76a"/><stop offset="1" stop-color="#d98a0a"/></linearGradient>
<linearGradient id="lettre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffd84f"/><stop offset=".62" stop-color="#e79a10"/><stop offset="1" stop-color="#8a5206"/></linearGradient>
<linearGradient id="coin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8d2"/><stop offset="1" stop-color="#d9a233"/></linearGradient>
<linearGradient id="bande" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".75"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
<radialGradient id="halo" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#ffe07a" stop-opacity=".9"/><stop offset="1" stop-color="#ffe07a" stop-opacity="0"/></radialGradient>
<filter id="ombre" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="fl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
<clipPath id="feuille"><path d="M14 22Q150 8 286 22L292 232 252 292Q150 300 14 292z"/></clipPath>
''' + ''.join(defs) + '''</defs>
<style>
.et{animation:etin 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes etin{0%,100%{transform:scale(.2);opacity:.1}50%{transform:scale(1.1);opacity:1}}
.bal{animation:bal 3.8s ease-in-out infinite}@keyframes bal{0%{transform:translateX(-160px)}55%,100%{transform:translateX(420px)}}
.fl{transform-box:fill-box}
@media (prefers-reduced-motion:reduce){.et,.bal{animation:none}.bal{opacity:0}}
</style>
<ellipse cx="150" cy="284" rx="118" ry="14" fill="#000" opacity=".5" filter="url(#ombre)"/>
<ellipse cx="150" cy="150" rx="150" ry="140" fill="url(#halo)" opacity=".35"/>
<g>
<path d="M14 22Q150 8 286 22L292 232 252 292Q150 300 14 292z" fill="url(#or)"/>
<g clip-path="url(#feuille)">
<path d="M14 22Q150 8 286 22L286 60Q150 40 14 60z" fill="#fff" opacity=".22"/>
<g opacity=".16"><path d="M0 90h300M0 120h300M0 150h300M0 180h300M0 210h300M0 240h300" stroke="#8a5206" stroke-width=".6"/></g>
''' + grains + '''
<rect class="bal" x="0" y="0" width="90" height="320" fill="url(#bande)" transform="skewX(-18)"/>
</g>
<path d="M252 292L292 232Q262 244 250 262z" fill="url(#coin)" stroke="#c98c1f" stroke-width=".8"/>
<path d="M252 292Q260 262 292 232" fill="none" stroke="#7a4a05" stroke-width=".8" opacity=".5"/>
<path d="M14 22Q150 8 286 22" fill="none" stroke="#fff6c0" stroke-width="1.5" opacity=".8"/>
</g>
<g transform="translate(150 20) rotate(-3)"><rect x="-50" y="-14" width="100" height="26" fill="#fff" opacity=".42" stroke="#fff" stroke-opacity=".55"/><path d="M-50-14l-4 3 4 3-4 3 4 3-4 3 4 3M50-14l4 3-4 3 4 3-4 3 4 3-4 3" stroke="#fff" stroke-opacity=".5" fill="none"/></g>
''' + ''.join(fl) + '''
<g transform="translate(150 150) rotate(-3)" text-anchor="middle">
<text y="22" font-family="'Permanent Marker',cursive" font-size="78" fill="#7a4a05" stroke="#7a4a05" stroke-width="9" stroke-linejoin="round" opacity=".6">BONUS</text>
<text y="16" font-family="'Permanent Marker',cursive" font-size="78" fill="#a85f06" stroke="#a85f06" stroke-width="7" stroke-linejoin="round">BONUS</text>
<text y="13" font-family="'Permanent Marker',cursive" font-size="78" fill="url(#lettre)" stroke="#8a5206" stroke-width="1.6" stroke-linejoin="round">BONUS</text>
<text y="9" font-family="'Permanent Marker',cursive" font-size="78" fill="none" stroke="#fff8d0" stroke-width=".8" opacity=".7">BONUS</text>
</g>
<g>''' + et + '''</g>
</svg>'''
open(OUT, 'w').write(svg); print(len(svg), 'octets')
