# Novart — adaptation visuelle du front existant

Les trois écrans reprennent la planche validée : connexion e-mail, profil et communauté.
Les couleurs crème/rouge, titres arrondis, formulaires et cartes sont partagés entre
les écrans principaux et les états de chargement, d'erreur et de confirmation.

## Périmètre

- Authentification Firebase par lien e-mail ; renvoi, expiration et confirmation conservés.
- Profil : prénom, nom, rôle, adresse avec suggestions et URL de photo facultative.
- Communauté : membres Firestore, avatars, rôles, adresses et carte Leaflet existante.
- La carte est dans le même conteneur que le titre et la liste ; ses points sont rouges.
- Les écrans de l'application connectée suivent les maquettes « Parcours utilisateur »
  05 à 26 (voir la section dédiée ci-dessous).
- Les connexions Apple/Google restent hors périmètre.

## Mobile-first

Les feuilles de styles partent du téléphone (règles de base), puis s'enrichissent
avec `min-width` (26 rem pour les grands téléphones). Sur un écran plus large,
l'application garde une colonne de la largeur d'un téléphone (30 rem), centrée sur
un fond rosé : connexion, profil et écrans de l'app ont la même présentation que
sur mobile, conformément aux maquettes.

## Écrans de l'application (novembre 2026)

| Maquette | Écran | Écarts assumés |
| --- | --- | --- |
| 05, 06 | Découvrir | Section « Selon tes envies » ajoutée (centres d'intérêt) |
| 07 à 10 | Rechercher, filtres, carte, aucun résultat | Épingles de carte aux couleurs de la charte (pas de couleur par discipline) |
| 11 | Tu participes ! | « Ajouter un rappel » télécharge un fichier agenda `.ics` |
| 12 | Mes favoris | — |
| 14, 15 | Conversations, groupe | Sans pièces jointes ni réactions |
| 16 | Fiche activité | Enrichie : description, niveau, matériel, météo, carte |
| 17 | Mes activités | Sans onglet « Mes brouillons » (un brouillon unique est repris automatiquement) |
| 18 à 21 | Créer une activité | Illustrations NOVART ou lien au lieu de l'envoi de photos ; modèles d'activités et lieux suggérés |
| 23 | Modifier l'activité | — |
| 24 | Profil | « Mes amis » remplacé par « Communauté » ; pas de paramètres de notifications |
| 25, 26 | Chargement, pas de connexion | Repris dans chaque écran avec la mascotte officielle |
| 13, 22 | Notifications, assistance IA | Non développés |

Les photos des maquettes sont des illustrations générées que nous n'avons pas :
24 couvertures originales par discipline sont produites par
`scripts/design/generate-covers.mjs` (pictogrammes Lucide, licence ISC, et couleurs
de la charte). Les avatars sans photo affichent les initiales sur une teinte de la charte.
Les titres utilisent Fredoka, une sans-serif arrondie et lisible ; les textes
et l'interface utilisent Poppins. La tagline garde Caveat.

## Références artistiques

Les directives du directeur artistique fournies le 4 novembre 2026 remplacent les
approximations de la première version. Les codes du PDF « Règle d'usage des couleurs »
font référence pour le numérique :

| Rôle | Couleur |
| --- | --- |
| Actions principales, identité et repères interactifs | Rouge NOVART `#FF0000` |
| Fond principal | Gris clair `#F5F5F5` |
| Cartes, surfaces et fond secondaire | Blanc rosé `#FFFBFB` |
| Sélections, états actifs et accents ponctuels | Rouge profond `#781C27` |
| Texte et informations neutres | Gris foncé `#545454` |

Le nuancier PNG intitulé `#D9D9D9.png` et le Brand Board contiennent une incohérence :
il s'agit visuellement d'un rouge profond. Le code explicite `#781C27` du PDF de
règles est utilisé, pas le nom de ce fichier. Les bordures discrètes utilisent une
teinte dérivée du gris ; le focus et les sélections disposent d'un contraste propre.

### Typographies

Les fontes exactes fournies sont servies depuis `frontend/public/fonts/`, avec
`font-display: swap` et un secours sans-serif :

- Poppins Regular, Medium et SemiBold : interface, formulaires, boutons, petits titres
  et textes essentiels. Pas de graisses 800/900 synthétiques pour l'interface.
- Fredoka Medium à Bold : titres d'interface et grands titres. La graisse 600 évite l'effet très massif de Sigmar One tout en gardant une personnalité ronde.
- Caveat : uniquement la tagline manuscrite « L’art se crée ensemble ».
- Montserrat Extra Light : informations secondaires suffisamment grandes, pas les
  petits messages de formulaire ni les labels essentiels.

Les licences SIL Open Font License des trois familles sont conservées avec les fontes.
L'archive Bright Retro fournie ne contient que `bright-demo.otf` ; son `info.txt`
indique « Free for Personal Use ». Cette version n'est pas embarquée. Les accents
éditoriaux utilisent Poppins tant qu'une version avec licence web appropriée n'est
pas fournie par le DA. Aucune police approximative n'est présentée comme Bright Retro.

### Logos et mascotte

Le logo secondaire est utilisé pour l'application, conformément au Brand Board.
Le logo primaire et le submark originaux sont aussi disponibles dans la bibliothèque
d'assets ; les fichiers PNG sont conservés tels que fournis.

La mascotte générée de la première version a été remplacée par deux extraits du PDF
« Mascotte NOVART ». Ce sont des recadrages du document officiel, sans redessin ni
génération : personnage principal pour la connexion, expression Joie pour le profil.
Voir `frontend/public/images/README.md` pour leur provenance et leurs dimensions.

Les marqueurs Leaflet utilisent les mêmes variables de couleur que l'interface.

## Vérifications

Depuis la racine :

```bash
npm ci
npm ci --prefix frontend
npm run test:frontend
npm run build
npx playwright install chromium
npm test
```

La configuration Playwright couvre les écrans en 1280 px, 390 px et 320 px,
contrôle l'absence de débordement horizontal et vérifie l'envoi du lien, le formulaire
de profil et la déconnexion. Les services Firebase/Places sont remplacés uniquement
dans le navigateur de test. Aucun e-mail réel ni écriture cloud n'est effectué.
Les captures se trouvent dans `test-results/` et le rapport dans `playwright-report/`.

Le workflow Frontend exécute les tests de composants, le contrôle TypeScript, le build
et ces vérifications navigateur. Il conserve rapports et captures pendant sept jours.
La réception réelle du lien e-mail reste à vérifier avec un compte de test.

Si une ancienne prévisualisation tourne déjà sur 5173, les tests peuvent utiliser
un serveur distinct : `PLAYWRIGHT_PORT=5183 npm test`. Le port strict évite de tester
par erreur un serveur différent de celui attendu.
