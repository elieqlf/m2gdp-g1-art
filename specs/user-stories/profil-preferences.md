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

## Données personnelles (RGPD)

Décision d'équipe : l'adresse e-mail n'est pas visible des autres membres.
Firestore ne masque pas un champ isolé (un profil lisible l'est en entier), donc :

- l'e-mail n'est plus enregistré dans `users/{uid}` ; il reste dans Firebase Authentication ;
- les règles refusent tout profil contenant un champ `email` (`docs/firestore.rules`) ;
- les anciens profils sont nettoyés à la connexion suivante, ou en une fois avec
  `npm run purge-emails` dans `scripts/seed` ;
- l'interface n'affiche jamais d'e-mail d'un autre membre (test `App.test.ts`).

Reste à arbitrer : l'adresse postale et ses coordonnées restent lisibles par les membres
connectés (distances, carte de la communauté). Pour les masquer, il faudrait un document
public séparé (par exemple `publicProfiles/{uid}` avec le quartier seulement).
