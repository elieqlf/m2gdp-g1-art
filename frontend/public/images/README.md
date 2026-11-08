# Visuels officiels Novart

Sources : dossier du directeur artistique « 01 — CHARTE GRAPHIQUE », fourni par
l'utilisateur. Les usages sont ceux du Brand Board NOVART et des PDF de règles.

| Fichier intégré | Original |
| --- | --- |
| `novart-logo-primary.png` | `Assets/Logos NOVART/Logo primaire — PNG.png`, 947 × 838 |
| `novart-logo-secondary.png` | `Assets/Logos NOVART/Logo secondaire — PNG.png`, 924 × 886 |
| `novart-logo-submark.png` | `Assets/Logos NOVART/Logo submark - PNG.png`, 952 × 887 |
| `novart-mascot-welcome.png` | `Assets/Mascotte NOVART.pdf`, personnage principal, 558 × 380 |
| `novart-mascot-joy.png` | Même PDF, expression Joie, 159 × 133 |

Les logos primaire et submark sont copiés à l'identique. Le fond blanc rosé uni du logo
secondaire (utilisé dans l'application) a été rendu transparent, sans toucher aux lettres. Le PDF de la mascotte est une planche raster,
pas un ensemble de personnages isolés. Le fond rosé uni des deux extraits a été rendu
transparent (remplissage depuis les bords, tolérance 30, bord adouci) avec
`scripts/design/detourer-fond.py`, pour que la mascotte se fonde dans le fond des
écrans. Le personnage principal conserve l'accroche originale du DA. Aucun trait
n'a été redessiné. La précédente mascotte générée est supprimée.

Pour reproduire les extraits : rendre l'unique page du PDF à 4/3 pixels par point
(1536 × 840), recadrer les rectangles suivants sans redimensionnement, puis détourer :

- personnage principal : `(24, 175, 582, 555)` ;
- expression Joie : `(617, 183, 776, 316)`.

Le nom accessible du lien d'accueil reste « Novart, accueil » ; les images y sont
décoratives pour éviter une lecture redondante par les lecteurs d'écran.
