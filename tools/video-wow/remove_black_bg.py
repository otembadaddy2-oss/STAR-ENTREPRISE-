import sys
from collections import deque
from PIL import Image, ImageFilter
import numpy as np

SRC = "src/09_logo_black.jpg"
DST = "src/09_logo_transparent.png"

im = Image.open(SRC).convert("RGB")
w, h = im.size
arr = np.array(im, dtype=np.int16)

# "near pure black" background candidate mask (tolerant of jpeg noise)
maxc = arr.max(axis=2)
bg_candidate = maxc <= 14

# Flood fill (BFS) from border pixels that are bg_candidate, so any dark
# interior logo pixel (navy ~ (6,18,42)) that is NOT connected to the
# border through near-black pixels stays intact.
visited = np.zeros((h, w), dtype=bool)
dq = deque()
for x in range(w):
    for y in (0, h - 1):
        if bg_candidate[y, x] and not visited[y, x]:
            visited[y, x] = True
            dq.append((y, x))
for y in range(h):
    for x in (0, w - 1):
        if bg_candidate[y, x] and not visited[y, x]:
            visited[y, x] = True
            dq.append((y, x))

while dq:
    y, x = dq.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and bg_candidate[ny, nx]:
            visited[ny, nx] = True
            dq.append((ny, nx))

bg_mask = visited  # True = background to remove

# Discard any foreground blob that isn't the main logo (e.g. thin
# screenshot-edge/status-bar slivers with a slightly-off-black gray that
# survived the border flood fill) by keeping only the largest connected
# foreground component.
from scipy import ndimage

fg = ~bg_mask
labeled, n = ndimage.label(fg, structure=np.ones((3, 3)))
if n > 1:
    sizes = ndimage.sum(fg, labeled, index=range(1, n + 1))
    largest_label = 1 + int(np.argmax(sizes))
    fg_main = labeled == largest_label
    bg_mask = ~fg_main

# Build alpha channel: 0 where background, 255 where logo, with a soft
# feather at the boundary for clean anti-aliased edges.
alpha = np.where(bg_mask, 0, 255).astype(np.uint8)
alpha_img = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(1.2))

out = im.convert("RGBA")
out.putalpha(alpha_img)

# Crop to the logo's bounding box (tight, with a small margin) so the
# exported asset isn't mostly empty transparent canvas.
bbox = out.getbbox()
if bbox:
    l, t, r, b = bbox
    margin = 8
    l = max(0, l - margin)
    t = max(0, t - margin)
    r = min(w, r + margin)
    b = min(h, b + margin)
    out = out.crop((l, t, r, b))

out.save(DST)
print("saved", DST, out.size)
