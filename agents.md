# Instructions pour l'IA — Projet ART

## Contexte

Marketplace de pratiques artistiques (musique, danse, théâtre, art...). Un organisateur crée des
sessions (lieu, contenu, fréquence, frais) ; les intéressés s'inscrivent par session et se
contactent par messagerie. Des annonceurs font de la publicité pour des événements/équipements.

Voir [README.md](README.md) pour le concept complet et la structure du dépôt.

## Architecture

Serverless : Firebase Hosting (front) → Cloudflare Workers (`/workers`, API Gateway) → services
auto-gérés (Firestore, Firebase Realtime DB, Cloudflare D1, Cloudflare R2). Voir
[docs/stack-technique.md](docs/stack-technique.md).

## Conventions

- Specs fonctionnelles/techniques en markdown dans `/specs` (OpenAPI, diagrammes Mermaid, jeux de
  données JSON fictifs).
- Maquettes et prototypes HTML dans `/design`.
- Tests E2E Playwright dans `/tests`, basés sur les critères d'acceptation des User Stories.
- Ne pas gérer les problèmes de production (volumétrie, performance, scalabilité) : ce n'est pas
  évalué. Déléguer au maximum aux services auto-gérés.
- Ne pas travailler sur des fonctionnalités hors roadmap validée (voir `/specs/roadmap.md`).

## Ce qui est évalué (rappel)

- Fonctionnel (50%) : scénario nominal + cas à la marge, tests automatisés
- Ergonomie (25%) : navigation claire, mobile-first, charte graphique respectée
- Réaliste (25%) : vocabulaire sans faute, données fictives riches (90+ annonces, 30+ profils,
  10+ conversations, 10+ réservations)

Ce qui n'est pas évalué : architecture/qualité du code, sécurité/infra/performance.
