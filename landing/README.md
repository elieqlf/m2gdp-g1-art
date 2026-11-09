# Site vitrine NOVART

Site statique (HTML, CSS, JS sans dépendance), mobile-first, aux couleurs de la charte.
Publié par la cible Firebase Hosting `landing` : https://novart-109bf.web.app

| Page | Contenu (attendus du cours) |
| --- | --- |
| `index.html` | Marque et bannière, application, vidéo (emplacement), solution, présentation, disciplines, pour qui, tarifs, parcours utilisateurs, lieux et partenaires, appel à l'action |
| `fonctionnement.html` | Comment ça marche : étapes participant et organisateur avec captures de l'app, confiance |
| `faq.html` | Foire aux questions : participants, organisateurs, compte et données |
| `contact.html` | Formulaire de contact (vérification de la saisie) et accès à l'application |
| `legal.html` | Mentions légales, CGU (et CGV sans objet), politique de confidentialité |

## Prévisualiser

Ouvrir `landing/index.html` dans un navigateur, ou servir le dossier :

```bash
python3 -m http.server 8080 --directory landing   # http://localhost:8080
```

## Publier (par l'équipe)

```bash
npx --yes --package firebase-tools firebase deploy --only hosting:landing --project novart-109bf
```

## Ressources

- `assets/site.css` : styles (base téléphone, puis `min-width` 30, 48 et 64 rem) ; `assets/site.js` : menu mobile, apparition au défilement, formulaire.
- `assets/img/` : logos officiels (le secondaire détouré), mascotte et onze poses découpées dans la planche « Mascotte NOVART » du DA, agrandies ×3 (`scripts/design/agrandir-mascotte.py`), détourées (`scripts/design/detourer-fond.py`) et enregistrées en WebP. Les fichiers HD d'origine du DA donneraient un rendu encore meilleur.
- `assets/screens/` : captures de l'application (données de démonstration), à refaire si l'interface change.
- `assets/covers/` : illustrations par discipline (`scripts/design/generate-covers.mjs`).
- Pictogrammes Lucide (ISC) intégrés en sprite au début de chaque page ; polices dans `assets/fonts/` avec leurs licences.

## Reste à faire

- **Vidéo d'animation (2 min)** : remplacer l'emplacement de la section « NOVART en deux minutes » (`index.html`, commentaire dans le code).
- **Formulaire de contact** : il vérifie la saisie mais n'envoie rien ; le message de confirmation le dit. À brancher sur un service d'envoi si besoin.
- **Tarifs, parcours et textes légaux** : à relire et valider par l'équipe (grille indicative, portraits imaginés à partir des personas, documents sans valeur contractuelle).
- Les tests Playwright `tests/e2e/landing.spec.ts` vérifient les cinq pages aux trois tailles d'écran.
