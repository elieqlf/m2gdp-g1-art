# Front Vue — Projet ART

Interface Vue 3 + TypeScript + Vite, Tailwind CSS 4 et composants officiels Shadcn-Vue.
Les composants sont intégrés dans `src/components/ui` et configurés dans `components.json`.

## Démarrer

Depuis la racine du dépôt, avec Node 22.22.2+ (ou Node 24.15+) et npm :

```bash
npm ci --prefix frontend
npm run dev
```

Ouvrir l’adresse affichée par Vite (habituellement http://localhost:5173).
Les URL historiques `/login.html` et `/users.html` chargent également l’application.
Firebase détermine l’écran à afficher selon l’état de connexion et le profil.

## Parcours disponibles

- Connexion et inscription par lien envoyé par Firebase Authentication.
- Confirmation de l’e-mail quand le lien est ouvert dans un autre navigateur.
- Nouveau lien après expiration et délai de 60 secondes avant renvoi.
- Création du profil Firestore ; reprise d’un profil incomplet après reconnexion.
- Adresse avec Google Places (New), choix au clavier et saisie manuelle possible.
- Enregistrement de l’adresse et de ses coordonnées, supprimées si la saisie change.
- Liste des utilisateurs, états vide/chargement/erreur et déconnexion.

Shadcn-Vue est utilisé pour Button, Input, Label, Card, Select, Alert et Badge.
Leaflet et les fonctionnalités annonces/réservations/messagerie seront ajoutés ensuite.
La PWA installable n’est pas encore configurée.

## Configuration existante

Les services réutilisent `../public/firebase-config.js` et `../public/places-config.js`.
Ne pas y mettre de clés privées de service. Les restrictions de domaine des clés publiques
et les domaines autorisés Firebase doivent inclure le domaine utilisé pour les essais.
Les anciens fichiers HTML dans `public/` restent comme référence du POC ; Firebase Hosting
publie désormais le build `frontend/dist`.

## Vérifier et publier

Depuis la racine :

```bash
npm run test:frontend
npm run build
npm run preview
```

Les tests de composants utilisent des services Firebase/Places simulés : aucun e-mail envoyé,
aucune donnée créée dans le cloud, aucun appel Places facturable. Ils couvrent les erreurs,
la connexion, les profils, la déconnexion et les suggestions d’adresse.
Le parcours réel de réception/clic du mail reste à vérifier avec un compte de test.

La configuration `firebase.json` construit automatiquement le front avant un déploiement
de la cible `app`. Pour publier uniquement l’application (avec la CLI Firebase installée) :

```bash
npx firebase deploy --only hosting:app
```

Le site vitrine reste dans `landing/`. Aucun déploiement n’est effectué lors d’un simple build.

## Ajouter un composant

Depuis `frontend/` :

```bash
npx shadcn-vue add nom-du-composant
```

Documentation : https://www.shadcn-vue.com/docs/installation/vite
