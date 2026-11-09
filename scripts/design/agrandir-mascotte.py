# Usage : python3 scripts/design/agrandir-mascotte.py extrait.png sortie.png [...] (OpenCV et NumPy requis)
# Agrandit ×4 un dessin au trait et resserre ses contours : les aplats sont lissés,
# les traits rouges redeviennent nets (transition courte et anti-crénelée).
import sys, cv2, numpy as np
def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def reink(src, dst, factor=4):
    img = cv2.imread(src, cv2.IMREAD_COLOR)
    clean = cv2.fastNlMeansDenoisingColored(img, None, 4, 4, 7, 21)
    big = clean
    for _ in range(int(np.log2(factor))):
        big = cv2.resize(big, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    # Aplats : filtre qui préserve les bords pour effacer le grain.
    flat = cv2.bilateralFilter(big, 9, 40, 9)
    flat = cv2.bilateralFilter(flat, 9, 30, 9)
    f = flat.astype(np.float32) / 255
    b, g, r = f[..., 0], f[..., 1], f[..., 2]
    # « Encre » : rouge saturé et soutenu (traits, motifs). Plus g et b sont bas, plus c'est de l'encre.
    ink = np.clip((r - (g + b) / 2) * 1.6 - (g + b) * .35, 0, 1)
    a = smoothstep(.28, .42, ink)[..., None]
    # La couleur d'encre est celle de l'image elle-même, un peu plus saturée (pas plus sombre).
    deep = np.clip(f * np.array([.86, .86, 1.0], np.float32), 0, 1)
    out = f * (1 - a) + deep * a
    blur = cv2.GaussianBlur(out, (0, 0), 1.2)
    out = np.clip(out * 1.3 - blur * .3, 0, 1)
    cv2.imwrite(dst, (out * 255).astype(np.uint8))
for s, d in zip(sys.argv[1::2], sys.argv[2::2]): reink(s, d)
