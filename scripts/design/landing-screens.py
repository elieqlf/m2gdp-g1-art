# Convertit les captures de l'application (test-results/landing-screens/*.png, produites par
# tests/e2e/landing-screens.spec.ts) en WebP pour le site vitrine (landing/assets/screens).
# Usage, à la racine du dépôt : python3 scripts/design/landing-screens.py
import pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC, DST = ROOT / 'test-results/landing-screens', ROOT / 'landing/assets/screens'
for png in sorted(SRC.glob('*.png')):
    image = Image.open(png).convert('RGB')
    target = DST / f'{png.stem}.webp'
    image.save(target, 'WEBP', quality=86, method=6)
    print(f'{target.relative_to(ROOT)} {image.size[0]}×{image.size[1]} {target.stat().st_size // 1024} Ko')
