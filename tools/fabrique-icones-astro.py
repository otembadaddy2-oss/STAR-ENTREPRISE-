"""Fabrique les icônes du jeu ASTRO QUEST (192, 512 et « maskable » 512) : fusée, planète à anneaux, étoiles.
Lancer depuis la racine du dépôt : python3 tools/fabrique-icones-astro.py"""
import math, random
from PIL import Image, ImageDraw, ImageFilter

G = 1024  # taille de travail, réduite ensuite (anticrénelage)

def fond(marge):
    img = Image.new("RGB", (G, G), (5, 7, 26))
    px = img.load()
    cx, cy = G * 0.38, G * 0.32
    for y in range(G):
        for x in range(G):
            d = math.hypot(x - cx, y - cy) / (G * 0.95)
            t = min(1, d)
            r = int(52 * (1 - t) + 5 * t); g = int(30 * (1 - t) + 7 * t); b = int(120 * (1 - t) + 26 * t)
            px[x, y] = (r, g, b)
    d = ImageDraw.Draw(img, "RGBA")
    random.seed(7)
    for _ in range(90):
        x, y = random.randint(0, G), random.randint(0, G)
        r = random.choice([1, 1, 2, 2, 3]); a = random.randint(110, 255)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
    return img

def planete(img, cx, cy, r):
    layer = Image.new("RGBA", (G, G), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    # anneau arrière
    ring = Image.new("RGBA", (G, G), (0, 0, 0, 0)); rd = ImageDraw.Draw(ring)
    for k, (f, w, col) in enumerate([(1.55, 22, (232, 205, 150, 170)), (1.75, 30, (250, 230, 170, 210)), (1.95, 14, (200, 175, 125, 150))]):
        rd.ellipse([cx - r * f, cy - r * f * .32, cx + r * f, cy + r * f * .32], outline=col, width=w)
    ring = ring.rotate(18, center=(cx, cy), resample=Image.BICUBIC)
    layer.alpha_composite(ring)
    # sphère avec dégradé et bandes
    sph = Image.new("RGBA", (G, G), (0, 0, 0, 0)); sd = ImageDraw.Draw(sph)
    for i in range(r, 0, -2):
        t = i / r
        col = (int(250 - 90 * t), int(205 - 100 * t), int(120 - 80 * t), 255)
        off = (1 - t) * r * 0.35
        sd.ellipse([cx - i - off * .6, cy - i - off * .7, cx + i - off * .6, cy + i - off * .7], fill=col)
    mask = Image.new("L", (G, G), 0); ImageDraw.Draw(mask).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    for j in range(-4, 5):
        y0 = cy + j * r * .22
        ImageDraw.Draw(sph).rectangle([cx - r, y0, cx + r, y0 + r * .07], fill=(150, 90, 40, 70))
    shade = Image.new("RGBA", (G, G), (0, 0, 20, 0)); sh = ImageDraw.Draw(shade)
    for i in range(r, 0, -3):
        a = int(150 * max(0, (1 - i / r) ** 0.0) * 0)
    sph.putalpha(mask)
    # ombre côté droit/bas
    om = Image.new("RGBA", (G, G), (0, 0, 20, 0)); od = ImageDraw.Draw(om)
    od.ellipse([cx - r * .55, cy - r * .55, cx + r * 1.6, cy + r * 1.6], fill=(0, 0, 25, 150))
    om.putalpha(Image.composite(om.getchannel("A"), Image.new("L", (G, G), 0), mask))
    layer.alpha_composite(sph); layer.alpha_composite(om)
    # anneau avant (moitié basse)
    ring2 = Image.new("RGBA", (G, G), (0, 0, 0, 0)); r2 = ImageDraw.Draw(ring2)
    for f, w, col in [(1.55, 22, (232, 205, 150, 235)), (1.75, 30, (250, 230, 170, 245)), (1.95, 14, (200, 175, 125, 190))]:
        r2.arc([cx - r * f, cy - r * f * .32, cx + r * f, cy + r * f * .32], 0, 180, fill=col, width=w)
    ring2 = ring2.rotate(18, center=(cx, cy), resample=Image.BICUBIC)
    layer.alpha_composite(ring2)
    glow = layer.filter(ImageFilter.GaussianBlur(26)); img.paste(glow, (0, 0), glow)
    img.paste(layer, (0, 0), layer)

def fusee(img, cx, cy, h, angle):
    s = h / 400.0
    L = Image.new("RGBA", (G, G), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    def P(x, y): return (cx + x * s, cy + y * s)
    # flamme
    for k, (w, ln, col) in enumerate([(64, 230, (255, 90, 20, 140)), (46, 180, (255, 190, 70, 210)), (26, 120, (255, 255, 220, 255))]):
        d.polygon([P(-w / 2, 170), P(0, 170 + ln), P(w / 2, 170)], fill=col)
    L = L.filter(ImageFilter.GaussianBlur(5)); d = ImageDraw.Draw(L)
    # ailerons
    d.polygon([P(-70, 20), P(-150, 190), P(-70, 140)], fill=(214, 48, 48, 255)); d.polygon([P(70, 20), P(150, 190), P(70, 140)], fill=(214, 48, 48, 255))
    d.polygon([P(-70, 20), P(-150, 190), P(-118, 178), P(-70, 70)], fill=(240, 100, 85, 255)); d.polygon([P(70, 20), P(150, 190), P(118, 178), P(70, 70)], fill=(240, 100, 85, 255))
    # corps
    body = [P(0, -250)] + [P(70 * math.sin(math.radians(a)) * 1.0 + 0, -250 + (170 + 250) * (1 - math.cos(math.radians(a))) * .0) for a in []]
    d.polygon([P(0, -250), P(48, -170), P(70, -40), P(70, 170), P(-70, 170), P(-70, -40), P(-48, -170)], fill=(236, 240, 248, 255))
    d.polygon([P(0, -250), P(48, -170), P(70, -40), P(70, 170), P(30, 170), P(34, -40), P(24, -170)], fill=(188, 198, 216, 255))
    d.polygon([P(0, -250), P(48, -170), P(-48, -170)], fill=(222, 54, 54, 255))
    d.rectangle([P(-70, 110), P(70, 140)], fill=(222, 54, 54, 255))
    d.rectangle([P(-34, 168), P(34, 196)], fill=(85, 96, 111, 255))
    # hublot
    d.ellipse([P(-42, -105), P(42, -21)], fill=(110, 127, 153, 255)); d.ellipse([P(-33, -96), P(33, -30)], fill=(63, 172, 255, 255))
    d.ellipse([P(-33, -96), P(10, -50)], fill=(150, 215, 255, 255)); d.ellipse([P(-22, -88), P(-4, -70)], fill=(255, 255, 255, 230))
    L = L.rotate(angle, center=(cx, cy), resample=Image.BICUBIC)
    glow = L.filter(ImageFilter.GaussianBlur(14)); img.paste(glow, (0, 0), glow); img.paste(L, (0, 0), L)

def etoile(img, cx, cy, r, col=(255, 210, 77, 255)):
    d = ImageDraw.Draw(img, "RGBA"); pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5; rr = r if i % 2 == 0 else r * .42
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    d.polygon(pts, fill=col)

def fabrique(nom, taille, marge_securite=False):
    img = fond(0)
    k = 0.8 if marge_securite else 1.0     # « maskable » : tout reste dans les 80 % centraux
    ox = G * (1 - k) / 2
    planete(img, ox + G * k * .70, ox + G * k * .72, int(G * k * .17))
    fusee(img, ox + G * k * .40, ox + G * k * .45, int(G * k * .56), 32)
    etoile(img, ox + G * k * .82, ox + G * k * .2, int(G * k * .045)); etoile(img, ox + G * k * .16, ox + G * k * .74, int(G * k * .03))
    img.resize((taille, taille), Image.LANCZOS).save("jeu-astro/icons/" + nom, optimize=True)

fabrique("icon-512.png", 512); fabrique("icon-192.png", 192); fabrique("icon-maskable-512.png", 512, True)
print("icônes écrites dans jeu-astro/icons/")
