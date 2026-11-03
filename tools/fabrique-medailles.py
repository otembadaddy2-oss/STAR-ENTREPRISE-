# Fabrique les médailles KOMYO Mboté (Or 30 jours, Argent 7 jours, Bronze 3 jours) en SVG : images vectorielles très légères.
# Lancer : python3 tools/fabrique-medailles.py   (écrit starvibe/assets/img/medailles/*.svg)
import math, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'starvibe', 'assets', 'img', 'medailles')
METAUX = {
  'or':      dict(nb='30', stops=['#fff9d2', '#ffd95f', '#e9a93a', '#b9770d', '#ffe48f'], ombre='#7a4a05', creux='#b9770d', reflet='#ffffff'),
  'argent':  dict(nb='7',  stops=['#ffffff', '#e4e8f0', '#b1b9c7', '#7c8598', '#f1f3f8'], ombre='#444d5e', creux='#7c8598', reflet='#ffffff'),
  'bronze':  dict(nb='3',  stops=['#ffe5cb', '#eaa66a', '#c47d3e', '#8c4d1e', '#f7c493'], ombre='#4d2808', creux='#8c4d1e', reflet='#fff1e3'),
}
def r(x): return ('%.1f' % x).rstrip('0').rstrip('.')
def medaille(cle, m):
    p, s = cle[:2], m['stops']; cx = cy = 120
    d = []
    d.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 340" role="img" aria-label="Médaille %s KOMYO Mboté : %s jours">' % (cle, m['nb']))
    d.append('<defs>')
    d.append('<linearGradient id="%sa" x1="0" y1="0" x2="1" y2="1">%s</linearGradient>' % (p, ''.join('<stop offset="%s" stop-color="%s"/>' % (r(i / 4), c) for i, c in enumerate(s))))
    d.append('<linearGradient id="%sb" x1="1" y1="0" x2="0" y2="1">%s</linearGradient>' % (p, ''.join('<stop offset="%s" stop-color="%s"/>' % (r(i / 4), c) for i, c in enumerate(s))))
    d.append('<radialGradient id="%sc" cx=".34" cy=".28" r=".95"><stop offset="0" stop-color="%s"/><stop offset=".45" stop-color="%s"/><stop offset=".8" stop-color="%s"/><stop offset="1" stop-color="%s"/></radialGradient>' % (p, s[0], s[1], s[2], s[3]))
    d.append('<linearGradient id="%sr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="%s"/><stop offset=".25" stop-color="%s"/><stop offset=".5" stop-color="%s"/><stop offset=".75" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>' % (p, s[3], s[1], s[0], s[2], s[3]))
    # pétale et feuille réutilisés
    d.append('<g id="%sp"><rect x="-9.5" y="-98" width="19" height="46" rx="9.5" fill="url(#%sa)" stroke="%s" stroke-width=".9"/><path d="M-3-90v28" stroke="%s" stroke-width="2" stroke-linecap="round" opacity=".55"/></g>' % (p, p, m['ombre'], m['reflet']))
    d.append('<path id="%sf" d="M0-8c4 2 5 8 0 14-5-6-4-12 0-14z" fill="url(#%sb)" stroke="%s" stroke-width=".5"/>' % (p, p, m['ombre']))
    d.append('</defs>')
    # rubans (derrière)
    d.append('<g transform="rotate(9 120 168)"><path d="M82 168h44l-6 160-20-18-20 18z" fill="url(#%sb)" stroke="%s" stroke-width="1.2"/><path d="M96 168l-1 140" stroke="%s" stroke-width="3" opacity=".45"/><path d="M110 168l1 132" stroke="%s" stroke-width="2" opacity=".3"/></g>' % (p, m['ombre'], m['reflet'], m['ombre']))
    d.append('<g transform="rotate(-9 120 168)"><path d="M114 168h44l-2 160-20-18-22 18z" fill="url(#%sa)" stroke="%s" stroke-width="1.2"/><path d="M130 168l1 140" stroke="%s" stroke-width="3" opacity=".45"/><path d="M144 168l1 132" stroke="%s" stroke-width="2" opacity=".3"/></g>' % (p, m['ombre'], m['reflet'], m['ombre']))
    # rosette : deux rangées de pétales
    for i in range(28): d.append('<use href="#%sp" transform="translate(%d %d) rotate(%s) scale(1.02)" opacity=".92"/>' % (p, cx, cy, r(i * 360 / 28 + 6.4)))
    for i in range(28): d.append('<use href="#%sp" transform="translate(%d %d) rotate(%s) scale(.86)"/>' % (p, cx, cy, r(i * 360 / 28)))
    # anneaux
    d.append('<circle cx="120" cy="120" r="66" fill="url(#%sr)" stroke="%s" stroke-width="2"/>' % (p, m['ombre']))
    d.append('<circle cx="120" cy="120" r="63" fill="none" stroke="%s" stroke-width="1" opacity=".7"/>' % m['reflet'])
    # couronne de blé
    for i in range(34):
        a = i * 360 / 34
        d.append('<use href="#%sf" transform="translate(120 120) rotate(%s) translate(0 -57) rotate(%d)"/>' % (p, r(a), 38 if i % 2 else -38))
    # disque central : rayons
    d.append('<circle cx="120" cy="120" r="46" fill="url(#%sc)" stroke="%s" stroke-width="1.6"/>' % (p, m['ombre']))
    rays = []
    for i in range(0, 36, 2):
        a1, a2 = math.radians(i * 10), math.radians(i * 10 + 10)
        rays.append('M120 120L%s %sL%s %sz' % (r(120 + 45 * math.sin(a1)), r(120 - 45 * math.cos(a1)), r(120 + 45 * math.sin(a2)), r(120 - 45 * math.cos(a2))))
    d.append('<path d="%s" fill="%s" opacity=".16"/>' % (''.join(rays), m['reflet']))
    d.append('<circle cx="120" cy="120" r="41" fill="none" stroke="%s" stroke-width="1.2" opacity=".75"/>' % m['ombre'])
    # étoiles
    for i in range(10):
        a = math.radians(i * 36); x, y = 120 + 34 * math.sin(a), 120 - 34 * math.cos(a)
        d.append('<path transform="translate(%s %s) scale(.8)" d="M0-5 1.5-1.6 5-1.5 2.3.7 3.2 4.3 0 2.3-3.2 4.3-2.3.7-5-1.5-1.5-1.6z" fill="%s"/>' % (r(x), r(y), m['ombre']))
    # chiffre en relief
    fs = 38 if len(m['nb']) > 1 else 44
    d.append('<text x="121" y="%s" text-anchor="middle" font-family="Sora,Arial,sans-serif" font-weight="800" font-size="%d" fill="%s" opacity=".8">%s</text>' % (r(126), fs, m['reflet'], m['nb']))
    d.append('<text x="120" y="%s" text-anchor="middle" font-family="Sora,Arial,sans-serif" font-weight="800" font-size="%d" fill="%s">%s</text>' % (r(125), fs, m['ombre'], m['nb']))
    d.append('<text x="120" y="141" text-anchor="middle" font-family="Sora,Arial,sans-serif" font-weight="700" font-size="7.5" letter-spacing="1.6" fill="%s">JOURS</text>' % m['ombre'])
    # reflets
    d.append('<ellipse cx="96" cy="86" rx="24" ry="9" fill="#fff" opacity=".35" transform="rotate(-32 96 86)"/>')
    d.append('<ellipse cx="46" cy="76" rx="15" ry="6" fill="#fff" opacity=".28" transform="rotate(-50 46 76)"/>')
    d.append('</svg>')
    return ''.join(d)
os.makedirs(OUT, exist_ok=True)
for cle, m in METAUX.items():
    svg = medaille(cle, m); open(os.path.join(OUT, 'medaille-%s-v1.svg' % cle), 'w').write(svg); print(cle, len(svg), 'octets')
