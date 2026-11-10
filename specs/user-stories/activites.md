# EPIC E2 à E4 : Découvrir, rechercher et organiser des activités

Backlog original : US-03 à US-08 (MUST). Maquettes : 05 à 10 et 16 à 23 (`Maquettes/Parcours utilisateur`).
Code : `frontend/src/views/`, logique pure dans `frontend/src/lib/activity.ts`, service Firestore `frontend/src/services/activities.ts`.

## US-03 — Consulter le flux des activités (accueil « Découvrir »)

**En tant qu'**utilisateur, **je veux** consulter le flux des activités **afin de** découvrir des propositions proches de mes centres d'intérêt.

| # | Critère d'acceptation | Test |
|---|---|---|
| CA0 | À l'ouverture, carte plein écran centrée sur l'utilisateur, épingles des activités à venir, bouton « Me localiser » | `scenario.spec.ts` US-03 |
| CA1 | Barre de recherche (envoie vers Rechercher) et bouton filtres, posés sur la carte | `scenario.spec.ts` US-03 |
| CA2 | Puces de discipline « Tous / Peinture / … » qui filtrent toutes les sections | idem |
| CA3 | Panneau du bas « Autour de toi » : activités à venir non complètes, triées par distance ; toucher une épingle met l'activité en avant ; « Tout voir » déplie le panneau (bouton ou glissement) | idem |
| CA4 | « Selon tes envies » (centres d'intérêt du profil), « Activités populaires », « À ne pas manquer » | idem |
| CA5 | États chargement, erreur avec « Réessayer », aucune activité avec appel à créer | `App.test.ts` |

Distance : depuis la **position de l'appareil**, demandée à l'ouverture de l'application (autorisation du navigateur la première fois). Si elle est refusée ou introuvable, un message flottant prévient pendant quelques secondes et les distances partent de l'adresse du profil, sinon du centre de Lyon (place Bellecour). Le bouton « Me localiser » relance la demande. L'origine utilisée est affichée dans le panneau.

## US-04 / US-05 — Rechercher et filtrer

| # | Critère d'acceptation | Test |
|---|---|---|
| CA1 | Recherche texte sans accents ni casse sur titre, description, lieu, quartier, discipline, organisation | `activity.test.ts` |
| CA2 | Filtres : disciplines (multiple), date (aujourd'hui, semaine, week-end, date précise), rayon 1–50 km, places disponibles, niveau | `activity.test.ts`, `scenario.spec.ts` |
| CA3 | Les filtres ne s'appliquent qu'à la validation ; le bouton annonce le nombre de résultats ; « Réinitialiser » | `scenario.spec.ts` |
| CA4 | Tri par proximité, date ou popularité | `activity.test.ts` |
| CA5 | Bascule Liste / Carte (Leaflet) avec fiche de l'activité sélectionnée | `scenario.spec.ts` US-05 |
| CA6 | Aucun résultat : mascotte, « Modifier mes filtres », « Voir toutes les activités » | idem |

Les activités passées ne sont jamais proposées. La recherche se fait dans le navigateur : quelques centaines d'activités, pas d'index composite Firestore.

## US-06 — Consulter une fiche activité

Fiche : couverture, titre, discipline et sous-discipline, date et horaires, lieu et distance, places, niveau, matériel, météo du jour (Open-Meteo, jusqu'à 14 jours avant), description, organisation, mini-carte, liste des participants, partage (partage natif ou copie du lien), favori.
Lien direct `#/activite/<id>` : l'activité est lue dans Firestore si la liste n'est pas chargée ; « Activité introuvable » sinon.

## US-07 — Créer une activité (4 étapes)

| # | Critère d'acceptation | Test |
|---|---|---|
| CA1 | Étape 1 : titre (60 car.), discipline, sous-discipline facultative, description (500), niveau, matériel (300) ; modèles d'activités pour pré-remplir | `scenario.spec.ts` US-07 |
| CA2 | Étape 2 : photo principale importée depuis l'appareil (recadrée 16:10, réduite, stockée dans Cloudflare R2), illustration NOVART (suit la discipline) ou lien https ; aussi dans « Modifier » | idem, `uploads.test.ts`, `workers/test/uploads.test.mjs` |
| CA3 | Étape 3 : lieux suggérés (127 lieux de la Métropole, selon la discipline et la distance) ou adresse Google Places ; date, heures, places (2 à 100) | idem |
| CA4 | Étape 4 : aperçu, retour à une étape en touchant une ligne, « Publier l'activité » | idem |
| CA5 | Erreurs affichées sous chaque champ ; on ne passe pas à l'étape suivante | idem, `activity.test.ts` |
| CA6 | Brouillon conservé sur l'appareil (fermeture, rechargement), « Recommencer » ; supprimé après publication | — |
| CA7 | Après publication : fiche affichée, visible dans la recherche, la carte et « Mes activités » | `scenario.spec.ts` |

## US-08 — Modifier ou supprimer son activité

| # | Critère d'acceptation | Test |
|---|---|---|
| CA1 | Réservé à l'organisateur (message sinon) ; formulaire sur une page (maquette 23) | `scenario.spec.ts` US-08 |
| CA2 | Impossible de mettre moins de places que d'inscrits (bouton bloqué + règle Firestore) | idem |
| CA3 | Une date déjà passée reste acceptée si elle n'est pas modifiée | `activity.ts` |
| CA4 | Suppression après confirmation dans l'interface | idem |

## Spécifications techniques

```mermaid
flowchart LR
  UI[Vue : écrans] --> Store[lib/store.ts]
  Store --> Svc[services/activities.ts]
  Svc --> FS[(Firestore activities)]
  Svc --> MSG[(activities/{id}/messages)]
  UI --> Places[Google Places API]
  UI --> Meteo[Open-Meteo]
  UI --> OSM[Tuiles OpenStreetMap]
```

- [x] Modèle `Activity` et validation (`lib/activity.ts`)
- [x] Service Firestore : `listActivities`, `getActivity`, `createActivity`, `updateActivity`, `deleteActivity`
- [x] Règles Firestore : création par l'organisateur, champs validés, capacité ≥ inscrits (`docs/firestore.rules`)
- [x] Jeu de démonstration et chargement (`scripts/seed/`)

## Exclusions (hors MVP)

- Suppression des anciennes photos dans R2 quand l'organisateur en change (nettoyage à prévoir).
- Assistance IA à la rédaction (maquette 22), notifications (maquette 13), brouillons multiples.
- Liste d'attente et paiement : non développés.
