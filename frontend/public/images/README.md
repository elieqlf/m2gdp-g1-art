# Visuels officiels Novart

Sources : dossier du directeur artistique « 01 — CHARTE GRAPHIQUE », fourni par
l'utilisateur. Les usages sont ceux du Brand Board NOVART et des PDF de règles.

| Fichier intégré | Original |
| --- | --- |
| `novart-logo-primary.png` | `Assets/Logos NOVART/Logo primaire — PNG.png`, 947 × 838 |
| `novart-logo-secondary.png` | `Assets/Logos NOVART/Logo secondaire — PNG.png`, 924 × 886 |
| `novart-logo-submark.png` | `Assets/Logos NOVART/Logo submark - PNG.png`, 952 × 887 |
| `novart-mascot-welcome.webp` | `Assets/Mascotte NOVART.pdf`, personnage principal, extrait de 558 × 380 agrandi ×2 (1116 × 760) |
| `novart-mascot-joy.webp` | Même PDF, expression Joie, extrait de 159 × 133 agrandi ×3 (477 × 399) |

Les logos primaire et submark sont copiés à l'identique. Le fond blanc rosé uni du logo
secondaire (utilisé dans l'application) a été rendu transparent, sans toucher aux lettres. Le PDF de la mascotte est une planche raster,
pas un ensemble de personnages isolés. Le fond rosé uni des deux extraits a été rendu
transparent (remplissage depuis les bords, tolérance 30, bord adouci) avec
`scripts/design/detourer-fond.py`, pour que la mascotte se fonde dans le fond des
écrans. Le personnage principal conserve l'accroche originale du DA. Aucun trait
n'a été redessiné. La précédente mascotte générée est supprimée.

**Netteté** : la planche ne contient qu'une image de 1536 × 840 pixels ; les extraits
sont donc petits et flous une fois agrandis sur les écrans haute densité. Ils sont agrandis
à l'avance avec `scripts/design/agrandir-mascotte.py` (débruitage JPEG, agrandissement ×4,
lissage des aplats et resserrement des traits rouges), réduits à ×3 (×2 pour le personnage
principal), détourés puis enregistrés en WebP. **Pour un rendu parfait, demander au DA les
fichiers d'origine en haute définition** et les déposer sous les mêmes noms.

Pour reproduire les extraits : rendre l'unique page du PDF à 4/3 pixels par point
(1536 × 840), recadrer les rectangles suivants sans redimensionnement, puis détourer :

- personnage principal : `(24, 175, 582, 555)` ;
- expression Joie : `(617, 183, 776, 316)`.

Le nom accessible du lien d'accueil reste « Novart, accueil » ; les images y sont
décoratives pour éviter une lecture redondante par les lecteurs d'écran.
