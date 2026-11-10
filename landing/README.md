# Site vitrine NOVART

Site statique (HTML, CSS, JS sans dépendance), mobile-first, aux couleurs et à la typographie de l'application (rouge NOVART, titres en Caveat, fond gris clair).

Les pages sont générées par `python3 scripts/design/build-landing.py` (à la racine du dépôt) : modifier ce script plutôt que les fichiers HTML, puis le relancer.
Publié par la cible Firebase Hosting `landing` : https://novart-109bf.web.app

| Page | Contenu (attendus du cours) |
| --- | --- |
| `index.html` | Marque et bannière, application, vidéo de présentation (`assets/video/`), solution, présentation, disciplines, pour qui, tarifs, parcours utilisateurs, lieux et partenaires, appel à l'action |
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
- `assets/img/` : logo vectoriel de l'application (`novart-logo.svg`, utilisé comme masque CSS, rouge ou blanc), visuels HD de la mascotte de la charte 2026 (`mascotte-*-hd.webp`, pour les grands emplacements) et poses découpées dans la planche « Mascotte NOVART » du DA (affichées à 170 px au plus pour rester nettes sur un écran ×3).
- `assets/screens/` : captures de l'application (données de démonstration, 780 × 1688 px). À refaire quand l'interface change :
  `CAPTURE_LANDING=1 npx playwright test tests/e2e/landing-screens.spec.ts --project mobile` puis `python3 scripts/design/landing-screens.py`.
- `assets/covers/` : illustrations par discipline (`scripts/design/generate-covers.mjs`).
- Pictogrammes Lucide (ISC) intégrés en sprite au début de chaque page ; polices dans `assets/fonts/` avec leurs licences.

## Reste à faire

- **Formulaire de contact** : il vérifie la saisie mais n'envoie rien ; le message de confirmation le dit. À brancher sur un service d'envoi si besoin.
- **Tarifs, parcours et textes légaux** : à relire et valider par l'équipe (grille indicative, portraits imaginés à partir des personas, documents sans valeur contractuelle).
- Les tests Playwright `tests/e2e/landing.spec.ts` vérifient les cinq pages aux trois tailles d'écran.
