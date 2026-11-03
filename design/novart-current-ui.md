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

## Visuels

La mascotte de `frontend/public/images/novart-mascot.png` a été recréée avec un outil
de génération d'images à partir de la planche fournie/validée par l'utilisateur.
Le nom Novart est composé en texte accessible, avec Lilita One ; le texte courant
utilise Nunito Sans, chargé via Google Fonts comme la police précédente.
Ces polices constituent une approximation de la typographie des maquettes.

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
