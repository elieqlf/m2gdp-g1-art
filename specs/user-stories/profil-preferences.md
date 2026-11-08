# EPIC E7 : Profil et préférences

Backlog original : US-13 et US-14 (MUST). Maquettes : 12, 24.

## US-13 — Consulter son profil

Photo ou initiales, prénom, description, centres d'intérêt, statistiques (activités réalisées, à venir, rencontres artistiques = personnes croisées lors d'activités passées), menus vers informations, centres d'intérêt, favoris, activités, conversations, communauté (carte des membres de la première version), confidentialité et conditions (site vitrine), déconnexion.

## US-14 — Modifier ses informations

| # | Critère d'acceptation | Test |
|---|---|---|
| CA1 | Prénom et nom obligatoires ; description 160 caractères ; photo en lien http(s) | `scenario.spec.ts` US-13/14 |
| CA2 | Rôle principal participant / organisateur, centres d'intérêt (alimentent « Selon tes envies ») | idem |
| CA3 | Changement d'adresse : coordonnées remplacées par la suggestion choisie, effacées en saisie libre | `ProfileEditView.vue` |

## Favoris

Cœur sur toutes les cartes et fiches, enregistrement immédiat dans `users/{uid}.favoriteIds` (retour en arrière en cas d'échec), écran « Mes favoris ».

## Point à arbitrer

Les règles Firestore donnent accès au document de profil entier à tout membre connecté (adresse et coordonnées comprises). Avant une ouverture plus large, décider quels champs sont publics (par exemple un document `publicProfiles/{uid}` sans adresse).
