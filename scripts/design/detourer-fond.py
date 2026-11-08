# Rend transparent le fond uni des extraits de mascotte et du logo (remplissage depuis les bords).
# Usage : python3 scripts/design/detourer-fond.py source.png sortie.png [source2.png sortie2.png …] (Pillow requis)
import sys
from collections import deque
from PIL import Image, ImageFilter

def detourer(src, dst, tolerance=30):
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    px = im.load()
    border = [px[x, y] for x in range(w) for y in (0, h - 1)] + [px[x, y] for y in range(h) for x in (0, w - 1)]
    bg = tuple(sorted(c[i] for c in border)[len(border) // 2] for i in range(3))
    near = lambda c: sum((c[i] - bg[i]) ** 2 for i in range(3)) ** .5 <= tolerance
    mask = Image.new('L', (w, h), 0)
    m = mask.load()
    queue = deque((x, y) for x in range(w) for y in (0, h - 1)) + deque((x, y) for y in range(h) for x in (0, w - 1))
    while queue:
        x, y = queue.popleft()
        if m[x, y] or not near(px[x, y]): continue
        m[x, y] = 255
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not m[nx, ny]: queue.append((nx, ny))
    # Bord adouci d'un demi-pixel pour éviter un liseré.
    soft = mask.filter(ImageFilter.GaussianBlur(0.6))
    s = soft.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, min(a, 255 - s[x, y]))
    im.save(dst, optimize=True)
    removed = sum(1 for y in range(h) for x in range(w) if m[x, y])
    print(dst, 'fond', bg, 'pixels retirés', removed)

for src, dst in zip(sys.argv[1::2], sys.argv[2::2]): detourer(src, dst)
