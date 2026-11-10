# EPIC E7 : Profil et préférences

Backlog original : US-13 et US-14 (MUST). Maquettes : 12, 24.

## US-13 — Consulter son profil

Photo ou initiales, prénom, description, centres d'intérêt, statistiques (activités réalisées, à venir, rencontres artistiques = personnes croisées lors d'activités passées), menus vers informations, centres d'intérêt, favoris, activités, conversations, communauté, confidentialité et conditions (site vitrine), déconnexion.

## US-14 — Modifier ses informations

| # | Critère d'acceptation | Test |
|---|---|---|
| CA1 | Prénom obligatoire ; nom facultatif ; description 160 caractères ; photo facultative choisie depuis la galerie ou les fichiers | `scenario.spec.ts` US-13/14 |
| CA2 | Rôle principal participant / organisateur, centres d'intérêt (alimentent « Selon tes envies ») | idem |
| CA3 | Ville/quartier facultatif et privé ; coordonnées remplacées par la suggestion choisie, effacées en saisie libre | `ProfileEditView.vue` |

## Favoris

Cœur sur toutes les cartes et fiches, enregistrement immédiat dans `users/{uid}.favoriteIds` (retour en arrière en cas d'échec), écran « Mes favoris ».

## Données personnelles (RGPD)

Décision d'équipe : l'adresse e-mail n'est pas visible des autres membres.
Firestore ne masque pas un champ isolé (un profil lisible l'est en entier), donc :

- l'e-mail n'est plus enregistré dans `users/{uid}` ; il reste dans Firebase Authentication ;
- `users/{uid}` est lisible uniquement par son propriétaire ;
- les membres visibles dans la communauté sont lus depuis `publicProfiles/{uid}`, qui n'accepte que prénom, nom, photo, bio et centres d'intérêt ;
- adresse, quartier et coordonnées ne sont jamais copiés dans ce profil public et ne sont pas affichés dans la communauté ;
- les anciens profils sont nettoyés à la connexion suivante, ou en une fois avec
  `npm run purge-emails` dans `scripts/seed` ;
- l'interface n'affiche jamais d'e-mail d'un autre membre (test `App.test.ts`).

La ville/quartier est facultative, sert uniquement aux recommandations de la personne, et
peut être supprimée depuis ses informations. Le GPS n'est demandé qu'après une action
explicite de la personne. La communauté ne place plus les membres sur une carte.
