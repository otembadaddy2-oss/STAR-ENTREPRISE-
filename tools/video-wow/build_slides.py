"""
Build 10 branded 1080x1920 slide PNGs from the 9 source images, ready to be
turned into Ken-Burns video clips by ffmpeg.
"""
import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

random.seed(7)

W, H = 1080, 1920
SRC = "src"
OUT = "slides"
import os
os.makedirs(OUT, exist_ok=True)

GOLD = (232, 184, 92)
GOLD_LIGHT = (255, 221, 150)
NAVY_DARK = (5, 10, 22)
NAVY = (10, 20, 40)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"

logo = Image.open(f"{SRC}/09_logo_transparent.png").convert("RGBA")


def font(path, size):
    return ImageFont.truetype(path, size)


def radial_navy_bg(seed_extra=0, warm=False):
    """Deep navy branded background with a soft radial glow + gold bokeh particles."""
    im = Image.new("RGB", (W, H), NAVY_DARK)
    cx, cy = W // 2, int(H * 0.42)
    maxr = int(math.hypot(W, H) * 0.62)
    px = im.load()
    # radial gradient (coarse loop over a downscaled canvas for speed, then upscale)
    small = Image.new("RGB", (W // 6, H // 6))
    spx = small.load()
    sw, sh = small.size
    for y in range(sh):
        for x in range(sw):
            dx = (x * 6 - cx) / maxr
            dy = (y * 6 - cy) / maxr
            d = min(1.0, math.hypot(dx, dy))
            t = 1 - d
            t = t ** 1.6
            r = int(NAVY_DARK[0] + (58 - NAVY_DARK[0]) * t)
            g = int(NAVY_DARK[1] + (72 - NAVY_DARK[1]) * t)
            b = int(NAVY_DARK[2] + (110 - NAVY_DARK[2]) * t)
            if warm:
                r = int(r + 18 * t)
                g = int(g + 6 * t)
            spx[x, y] = (r, g, b)
    im = small.resize((W, H), Image.BICUBIC)

    draw = ImageDraw.Draw(im, "RGBA")
    # subtle diagonal light rays
    ray_layer = Image.new("L", (W, H), 0)
    rdraw = ImageDraw.Draw(ray_layer)
    rnd = random.Random(42 + seed_extra)
    for i in range(10):
        ang = rnd.uniform(0, math.pi)
        length = rnd.uniform(1400, 2200)
        cxr, cyr = cx, cy
        x2 = cxr + length * math.cos(ang)
        y2 = cyr + length * math.sin(ang)
        x1 = cxr - length * math.cos(ang)
        y1 = cyr - length * math.sin(ang)
        rdraw.line([(x1, y1), (x2, y2)], fill=rnd.randint(10, 22), width=rnd.randint(40, 90))
    ray_layer = ray_layer.filter(ImageFilter.GaussianBlur(60))
    gold_layer = Image.new("RGB", (W, H), GOLD)
    im = Image.composite(Image.blend(im, gold_layer, 0.5), im, ray_layer)

    # gold bokeh particles
    bokeh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bokeh)
    for i in range(46):
        x = rnd.uniform(0, W)
        y = rnd.uniform(0, H)
        r = rnd.uniform(2, 7)
        a = rnd.randint(40, 150)
        bdraw.ellipse([x - r, y - r, x + r, y + r], fill=(*GOLD_LIGHT, a))
    bokeh = bokeh.filter(ImageFilter.GaussianBlur(1.2))
    im = Image.alpha_composite(im.convert("RGBA"), bokeh).convert("RGB")

    # gentle vignette
    vign = Image.new("L", (W, H), 0)
    vdraw = ImageDraw.Draw(vign)
    vdraw.ellipse([-W * 0.35, -H * 0.25, W * 1.35, H * 1.15], fill=255)
    vign = vign.filter(ImageFilter.GaussianBlur(220))
    black = Image.new("RGB", (W, H), (0, 0, 0))
    im = Image.composite(im, black, vign)
    return im


def cover_blurred_bg(src_img, blur=34, darken=0.32, sat=1.12):
    im = ImageOps.exif_transpose(src_img).convert("RGB")
    iw, ih = im.size
    scale = max(W / iw, H / ih) * 1.08
    im = im.resize((int(iw * scale), int(ih * scale)), Image.LANCZOS)
    l = (im.width - W) // 2
    t = (im.height - H) // 2
    im = im.crop((l, t, l + W, t + H))
    im = im.filter(ImageFilter.GaussianBlur(blur))
    # boost saturation a touch, then darken for text/legibility
    from PIL import ImageEnhance
    im = ImageEnhance.Color(im).enhance(sat)
    dark = Image.new("RGB", im.size, (0, 0, 0))
    im = Image.blend(im, dark, darken)
    return im


def drop_shadow_for(fg_rgba, blur=28, alpha=140, offset=(0, 22)):
    alpha_ch = fg_rgba.split()[-1]
    shadow = Image.new("RGBA", fg_rgba.size, (0, 0, 0, 0))
    solid = Image.new("RGBA", fg_rgba.size, (0, 0, 0, alpha))
    shadow.paste(solid, (0, 0), alpha_ch)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas = Image.new("RGBA", (fg_rgba.width + offset[0] + blur * 3, fg_rgba.height + offset[1] + blur * 3), (0, 0, 0, 0))
    return shadow, offset


def paste_shadowed(base, fg_rgba, cx, top_y, blur=30, shadow_alpha=150, y_off=20):
    """Paste fg_rgba (RGBA) onto base centered horizontally at cx, top at top_y, with soft shadow."""
    alpha_ch = fg_rgba.split()[-1]
    shadow = Image.new("RGBA", fg_rgba.size, (0, 0, 0, shadow_alpha))
    shadow.putalpha(alpha_ch.point(lambda a: min(255, int(a * (shadow_alpha / 255)))))
    pad = blur * 3
    sh_canvas = Image.new("RGBA", (fg_rgba.width + pad * 2, fg_rgba.height + pad * 2), (0, 0, 0, 0))
    sh_canvas.paste(shadow, (pad, pad), shadow)
    sh_canvas = sh_canvas.filter(ImageFilter.GaussianBlur(blur))
    sx = cx - fg_rgba.width // 2 - pad
    sy = top_y - pad + y_off
    base.paste(sh_canvas, (sx, sy), sh_canvas)
    fx = cx - fg_rgba.width // 2
    base.paste(fg_rgba, (fx, top_y), fg_rgba)


def brand_top_bar(im, label="STAR ENTREPRISE"):
    draw = ImageDraw.Draw(im, "RGBA")
    # soft top gradient for legibility
    grad = Image.new("L", (1, 220), 0)
    for y in range(220):
        grad.putpixel((0, y), int(200 * (1 - y / 220)))
    grad = grad.resize((W, 220))
    black = Image.new("RGB", (W, 220), (0, 0, 0))
    top = im.crop((0, 0, W, 220))
    top = Image.composite(black, top, grad)
    im.paste(top, (0, 0))

    icon = logo.resize((78, int(78 * logo.height / logo.width)), Image.LANCZOS)
    iy = 34
    im.paste(icon, (44, iy), icon)
    d = ImageDraw.Draw(im)
    f = font(FONT_BOLD, 40)
    tx = 44 + icon.width + 22
    ty = iy + (icon.height - 46) // 2
    d.text((tx + 2, ty + 2), label, font=f, fill=(0, 0, 0, 120))
    d.text((tx, ty), label, font=f, fill=GOLD_LIGHT)
    return im


def wrap_text(draw, text, f, max_width):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=f) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def content_slide(idx, src_name, caption=None, fit_w=1000, top_pad=250, bottom_pad=230):
    src = Image.open(f"{SRC}/{src_name}")
    bg = cover_blurred_bg(src)
    fg = ImageOps.exif_transpose(src).convert("RGBA")
    fw, fh = fg.size
    avail_h = H - top_pad - (bottom_pad if caption else 70)
    scale = min(fit_w / fw, avail_h / fh)
    fg = fg.resize((int(fw * scale), int(fh * scale)), Image.LANCZOS)

    top_y = top_pad + max(0, (avail_h - fg.height) // 2)
    paste_shadowed(bg, fg, W // 2, top_y, blur=36, shadow_alpha=170, y_off=26)

    bg = brand_top_bar(bg)

    if caption:
        d = ImageDraw.Draw(bg, "RGBA")
        f = font(FONT_BOLD, 40)
        lines = wrap_text(d, caption, f, W - 140)
        total_h = len(lines) * 52
        y0 = H - total_h - 56
        # gradient strip behind caption
        strip = Image.new("L", (1, total_h + 90), 0)
        for y in range(strip.height):
            strip.putpixel((0, y), int(190 * (y / strip.height)))
        strip = strip.resize((W, strip.height))
        black = Image.new("RGB", (W, strip.height), (0, 0, 0))
        region = bg.crop((0, H - strip.height, W, H))
        region = Image.composite(black, region, strip)
        bg.paste(region, (0, H - strip.height))
        d = ImageDraw.Draw(bg, "RGBA")
        for i, line in enumerate(lines):
            tw = d.textlength(line, font=f)
            x = (W - tw) / 2
            y = y0 + i * 52
            d.text((x + 2, y + 2), line, font=f, fill=(0, 0, 0, 160))
            d.text((x, y), line, font=f, fill=(255, 255, 255))

    bg.convert("RGB").save(f"{OUT}/slide_{idx:02d}.png", quality=95)
    print("saved", f"slide_{idx:02d}.png", bg.size)


def logo_slide(idx, cta=False):
    bg = radial_navy_bg(seed_extra=idx, warm=True)
    lg = logo.copy()
    target_w = 760
    lg = lg.resize((target_w, int(target_w * lg.height / lg.width)), Image.LANCZOS)

    # soft gold glow behind logo
    glow_src = lg.split()[-1].point(lambda a: 255 if a > 10 else 0)
    glow = Image.new("RGBA", lg.size, (*GOLD, 0))
    glow.putalpha(glow_src)
    pad = 140
    canvas = Image.new("RGBA", (lg.width + pad * 2, lg.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(glow, (pad, pad), glow)
    canvas = canvas.filter(ImageFilter.GaussianBlur(70))

    cy_top = 430 if not cta else 300
    cx = W // 2
    gx = cx - canvas.width // 2
    gy = cy_top - pad
    bg = bg.convert("RGBA")
    bg.alpha_composite(canvas, (gx, gy))
    paste_shadowed(bg, lg, cx, cy_top, blur=30, shadow_alpha=150, y_off=18)

    if cta:
        d = ImageDraw.Draw(bg, "RGBA")
        max_w = W - 120
        f1 = font(FONT_BOLD, 56)
        cta_lines = ["CONTACTEZ-NOUS", "DÈS MAINTENANT"]
        while max(d.textlength(t, font=f1) for t in cta_lines) > max_w:
            f1 = font(FONT_BOLD, f1.size - 2)
        y = cy_top + lg.height + 78
        for line in cta_lines:
            tw = d.textlength(line, font=f1)
            d.text(((W - tw) / 2 + 2, y + 2), line, font=f1, fill=(0, 0, 0, 160))
            d.text(((W - tw) / 2, y), line, font=f1, fill=GOLD_LIGHT)
            y += f1.size + 10

        y2 = y + 22
        f2 = font(FONT_REG, 32)
        line2 = "Facebook  •  Instagram  •  TikTok  •  WhatsApp"
        while d.textlength(line2, font=f2) > max_w:
            f2 = font(FONT_REG, f2.size - 2)
        tw2 = d.textlength(line2, font=f2)
        d.text(((W - tw2) / 2, y2), line2, font=f2, fill=(230, 230, 235))

        # whatsapp-green pill
        f3 = font(FONT_BOLD, 34)
        line3 = "Écrivez-nous sur WhatsApp"
        pad_x = 60
        pill_w = int(d.textlength(line3, font=f3)) + pad_x * 2
        pill_h = 96
        px0 = (W - pill_w) // 2
        py0 = y2 + 86
        d.rounded_rectangle([px0, py0, px0 + pill_w, py0 + pill_h], radius=48,
                             fill=(37, 160, 90, 255))
        tw3 = d.textlength(line3, font=f3)
        d.text(((W - tw3) / 2, py0 + (pill_h - 40) / 2), line3, font=f3, fill=(255, 255, 255))
    else:
        d = ImageDraw.Draw(bg, "RGBA")
        y = cy_top + lg.height + 70
        f1 = font(FONT_REG, 34)
        line1 = "Une seule agence. Toutes les solutions."
        tw = d.textlength(line1, font=f1)
        d.text(((W - tw) / 2, y), line1, font=f1, fill=(225, 225, 232))

    bg.convert("RGB").save(f"{OUT}/slide_{idx:02d}.png", quality=95)
    print("saved", f"slide_{idx:02d}.png", bg.size)


def yes_slide(idx):
    bg = radial_navy_bg(seed_extra=idx + 99, warm=False)
    src = Image.open(f"{SRC}/08_yes.jpg").convert("RGB")
    # make the white background transparent, but only the region connected
    # to the border, so the white fill inside "YES!" letters stays intact.
    import numpy as np
    from collections import deque
    arr = np.array(src)
    iw_, ih_ = src.size
    white_candidate = (arr[:, :, 0] > 235) & (arr[:, :, 1] > 235) & (arr[:, :, 2] > 235)
    visited = np.zeros((ih_, iw_), dtype=bool)
    dq = deque()
    for x in range(iw_):
        for y in (0, ih_ - 1):
            if white_candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    for y in range(ih_):
        for x in (0, iw_ - 1):
            if white_candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < ih_ and 0 <= nx < iw_ and not visited[ny, nx] and white_candidate[ny, nx]:
                visited[ny, nx] = True
                dq.append((ny, nx))
    rgba = np.dstack([arr, np.full(arr.shape[:2], 255, dtype=np.uint8)])
    rgba[visited, 3] = 0
    fg = Image.fromarray(rgba, mode="RGBA")
    # feather the alpha edge to hide jpeg-compression speckle from the
    # low-res source, without touching color
    r, g, b, a = fg.split()
    a = a.filter(ImageFilter.GaussianBlur(1.4)).point(lambda v: 255 if v > 160 else 0)
    a = a.filter(ImageFilter.GaussianBlur(1.0))
    fg = Image.merge("RGBA", (r, g, b, a))
    target_w = 620
    fg = fg.resize((target_w, int(target_w * fg.height / fg.width)), Image.LANCZOS)

    cy_top = 760
    cx = W // 2
    bg = bg.convert("RGBA")
    paste_shadowed(bg, fg, cx, cy_top, blur=32, shadow_alpha=160, y_off=20)
    d = ImageDraw.Draw(bg, "RGBA")
    y = cy_top + fg.height + 60
    f1 = font(FONT_BOLD, 78)
    line1 = "VALIDE."
    tw = d.textlength(line1, font=f1)
    d.text(((W - tw) / 2 + 3, y + 3), line1, font=f1, fill=(0, 0, 0, 160))
    d.text(((W - tw) / 2, y), line1, font=f1, fill=(255, 255, 255))
    y2 = y + 100
    f2 = font(FONT_REG, 36)
    line2 = "Votre projet entre de bonnes mains"
    tw2 = d.textlength(line2, font=f2)
    d.text(((W - tw2) / 2, y2), line2, font=f2, fill=(210, 220, 225))
    bg.convert("RGB").save(f"{OUT}/slide_{idx:02d}.png", quality=95)
    print("saved", f"slide_{idx:02d}.png", bg.size)


# ---- build sequence ----
logo_slide(0, cta=False)
content_slide(1, "02_trop_idees.png", caption="Trop d'idées, trop de projets en tête ?")
content_slide(2, "03_tu_deborde.png", caption="Restaurant, salle de sport, yaourt, entreprise...")
content_slide(3, "04_diamant.png", caption="Nous la transformons en diamant pour vous")
content_slide(4, "01_lapin_bio.png", caption="Conçu et créé par STAR ENTREPRISE")
content_slide(5, "05_whatsapp_key.png", caption="100% disponible pour vos projets")
content_slide(6, "06_sarah.png", caption="Une équipe dédiée, à votre écoute")
content_slide(7, "07_groupe.png", caption="Un seul groupe, toutes les solutions")
yes_slide(8)
logo_slide(9, cta=True)
print("DONE")
