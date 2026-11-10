# Front Vue — Projet ART

Interface Vue 3 + TypeScript + Vite, Tailwind CSS 4 et composants officiels Shadcn-Vue.
Les composants sont intégrés dans `src/components/ui` et configurés dans `components.json`.
Les styles complémentaires de Shadcn-Vue 2.8.2 sont conservés dans
`src/styles/shadcn.css`, avec leur licence MIT. Le CLI de génération n'est pas une
dépendance permanente de l'application.

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

- Connexion et inscription par lien e-mail, avec retour Google OAuth lorsque le fournisseur est activé dans Firebase.
- Confirmation de l’e-mail quand le lien est ouvert dans un autre navigateur.
- Nouveau lien après expiration et délai de 60 secondes avant renvoi.
- Après authentification, création du profil en trois étapes ; les profils existants vont
  directement dans l’application et les profils incomplets reprennent à l’étape enregistrée.
- Adresse avec Google Places (New), choix au clavier et saisie manuelle possible.
- Enregistrement de l’adresse et de ses coordonnées, supprimées si la saisie change.
- Application connectée avec navigation basse (maquettes 05 à 26) :
  Découvrir, Rechercher (liste, carte, filtres, aucun résultat), fiche activité,
  inscription et confirmation, création en 4 étapes, modification et suppression,
  conversations de groupe en temps réel, Mes activités, Profil, Mes favoris, Communauté.
- Navigation par ancre (`#/rechercher`, `#/activite/<id>`…), voir `src/lib/router.ts`.
- Données : Firestore `activities` et `activities/{id}/messages` (`src/services/activities.ts`),
  listes métier dans `src/data/`, météo Open-Meteo (`src/services/weather.ts`).

Shadcn-Vue est utilisé pour les écrans de connexion et de profil. Les écrans de
l’application utilisent les styles de `src/styles/app.css` et les icônes Lucide.
La PWA installable n’est pas encore configurée.

## Données de démonstration

Voir [docs/donnees-firestore.md](../docs/donnees-firestore.md) : règles Firestore à publier
et chargement du jeu de démonstration (120 membres, 220 activités).

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
npm audit --prefix frontend
```

Les tests de composants utilisent des services Firebase/Places simulés : aucun e-mail envoyé,
aucune donnée créée dans le cloud, aucun appel Places facturable. Ils couvrent les erreurs,
la connexion, les profils, la déconnexion et les suggestions d’adresse.
Le parcours réel de réception/clic du mail reste à vérifier avec un compte de test.

Les versions corrigées de `@grpc/grpc-js` et `source-map-js` sont imposées dans
`overrides` : le SDK Firebase fixe encore une ancienne version de gRPC, et les
outils Vue/Tailwind utilisent source-map-js. Ces corrections ne changent pas
le parcours utilisateur.

Avec npm 12, les scripts d'installation nécessaires sont autorisés par version
dans `allowScripts`. Une mise à jour qui change ces versions demande une nouvelle
vérification des scripts (`npm install-scripts ls` depuis `frontend/`).

Dans WSL Debian, utiliser Node et npm Linux, puis lancer les commandes habituelles :

```bash
source ~/.nvm/nvm.sh
nvm use 24
npm ci --prefix frontend
npm run dev
```

Ne pas utiliser `npm.cmd` dans Bash : c'est la commande Windows.

La configuration `firebase.json` construit automatiquement le front avant un déploiement
de la cible `app`. Pour publier uniquement l’application (avec la CLI Firebase installée) :

```bash
npx firebase deploy --only hosting:app
```

Le site vitrine reste dans `landing/`. Aucun déploiement n’est effectué lors d’un simple build.

## Ajouter un composant

Depuis `frontend/` :

```bash
npx shadcn-vue@2.8.2 add nom-du-composant
```

Documentation : https://www.shadcn-vue.com/docs/installation/vite
