# Avancement du backlog original (scénario minimal)

État du code sur la branche `feat/activites-participation-conversations`. Ce tableau décrit ce qui est développé ; il ne remplace pas la roadmap validée par l'équipe.

| US | Intitulé | État | Écran(s) |
| --- | --- | --- | --- |
| US-01 | Créer un compte | Livré (version précédente) | Connexion, profil |
| US-02 | Se connecter / se déconnecter | Livré (déconnexion déplacée dans Profil) | Connexion, Profil |
| US-03 | Consulter le flux des activités | Livré | Découvrir |
| US-04 | Rechercher une activité | Livré | Rechercher |
| US-05 | Filtrer les résultats | Livré, avec vue carte et tri | Rechercher, Filtres |
| US-06 | Consulter une fiche activité | Livré, avec météo et participants | Fiche |
| US-07 | Créer une activité | Livré, 4 étapes, modèles, lieux suggérés | Créer |
| US-08 | Modifier / supprimer son activité | Livré | Modifier |
| US-09 | S'inscrire à une activité | Livré, capacité garantie | Fiche, Tu participes ! |
| US-10 | Gérer sa participation | Livré (se désinscrire, Mes activités) | Fiche, Mes activités |
| US-11 | Accéder au groupe de l'activité | Livré | Conversations |
| US-12 | Envoyer un message au groupe | Livré, temps réel | Conversation |
| US-13 | Consulter son profil | Livré | Profil |
| US-14 | Modifier ses informations | Livré | Mes informations |

En plus : favoris, communauté, rappel agenda `.ics`, partage. Application mobile-first (colonne de téléphone sur grand écran).

Site vitrine : `landing/` (accueil, fonctionnement, FAQ, contact, pages légales), voir `landing/README.md`. Reste la vidéo d'animation.

Non développé (maquettes existantes) : notifications (13), assistance IA à la création (22), étapes « centres d'intérêt » et « personnalisation » de l'inscription (02-03, les centres d'intérêt sont dans le profil), envoi de photos personnelles, liste d'attente, avis, connexion Apple/Google, PWA installable.

## Démonstration J5 (parcours conseillé)

1. « Créer une activité » : Créer › modèle « Aquarelle en plein air » › Continuer › Continuer › choisir un lieu suggéré › Continuer › Publier.
2. « Rechercher, s'inscrire et prendre contact » : Rechercher › « aquarelle » › Filtres › Ce week-end › ouvrir une fiche › Participer › Rejoindre le groupe › écrire un message.
