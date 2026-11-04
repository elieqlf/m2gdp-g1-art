# Novart — adaptation visuelle du front existant

Les trois écrans reprennent la planche validée : connexion e-mail, profil et communauté.
Les couleurs crème/rouge, titres arrondis, formulaires et cartes sont partagés entre
les écrans principaux et les états de chargement, d'erreur et de confirmation.

## Périmètre

- Authentification Firebase par lien e-mail ; renvoi, expiration et confirmation conservés.
- Profil : prénom, nom, rôle, adresse avec suggestions et URL de photo facultative.
- Communauté : membres Firestore, avatars, rôles, adresses et carte Leaflet existante.
- La carte est dans le même conteneur que le titre et la liste ; ses points sont rouges.
- Les profils de la planche servent uniquement d'exemples visuels. Aucun jeu de données
  fictif n'a été ajouté à l'application.
- Les écrans activités, favoris, réservations, messagerie et les connexions Apple/Google
  restent hors de cette modification.

## Références artistiques

Les directives du directeur artistique fournies le 4 novembre 2026 remplacent les
approximations de la première version. Les codes du PDF « Règle d'usage des couleurs »
font référence pour le numérique :

| Rôle | Couleur |
| --- | --- |
| Actions principales, identité et repères interactifs | Rouge NOVART `#C03C3A` |
| Fond principal | Crème `#FFFEF1` |
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
- Sigmar One Regular : grands titres identitaires et accroches courtes uniquement.
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

La configuration Playwright couvre les trois écrans en 1280 px, 390 px et 320 px,
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
