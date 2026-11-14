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

## US-23 — Supprimer son compte

**En tant que** membre, **je veux** supprimer mon compte **afin que** mes données soient effacées (droit à l'effacement, RGPD).

- Profil → « Supprimer mon compte » (sous « Se déconnecter »), puis une confirmation : ce qui sera effacé,
  le nombre d'activités à venir que la personne organise et qui seront annulées, case « J'ai compris » obligatoire.
- L'appli appelle `POST /account/delete` sur l'API NOVART (jeton Firebase + `{ confirm: 'delete-account' }`).
  Les règles Firestore n'autorisent pas un membre à effacer ses messages ni ses conversations : le Worker le fait
  avec le compte de service, dans cet ordre (chaque étape peut être rejouée) :
  1. activités organisées et leurs messages ;
  2. activités rejointes : retrait des participants, de la liste d'attente, de l'offre de place ;
     la place libérée est proposée au suivant (24 h, au plus tard le début) ; dernier message retiré de l'aperçu ;
  3. messages écrits dans les autres groupes (index de groupe de collections `messages.authorId`) ;
  4. conversations privées et leurs messages, pour les deux membres ;
  5. `publicProfiles/{uid}`, `users/{uid}`, photos `covers/{uid}/…` dans R2 ;
  6. en dernier, le compte Firebase Authentication. Si une étape échoue, rien n'est supprimé du compte de connexion :
     la personne reste connectée et peut réessayer.
- Ensuite l'appli oublie les préférences gardées sur l'appareil pour ce compte, déconnecte la personne et affiche
  « Ton compte NOVART et tes données ont bien été supprimés ».
- Tests : `workers/test/account.test.mjs`, `frontend/tests/account.test.ts`, `App.test.ts`, e2e `current-ui.spec.ts`.

