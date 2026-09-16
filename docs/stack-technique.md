# Stack technique — Architecture serverless

```mermaid
flowchart LR
    subgraph Front
        Landing[Firebase Hosting\n/landing — Site vitrine]
        App[Firebase Hosting\n/public — App PWA]
    end

    subgraph API
        Worker[Cloudflare Workers\n/workers — API Gateway]
    end

    subgraph Services["Services auto-gérés"]
        Auth[Firebase Authentication]
        Firestore[Firestore\nBDD données]
        Realtime[Firebase Realtime DB\nMessages]
        D1[Cloudflare D1\nSessions]
        R2[Cloudflare R2\nFichiers]
    end

    App -->|Appelle le worker| Worker
    Worker -->|Envoie les infos traitées| App
    Worker -->|Appelle le service| Auth
    Worker --> Firestore
    Worker --> Realtime
    Worker --> D1
    Worker --> R2
```

## Composants

| Couche | Techno | Rôle |
|--------|--------|------|
| Front End | PWA (Shadcn / Shadcn-Vue / Spartan) | Interface mobile-first |
| Carte | LeafletJS | Affichage géographique des annonces |
| Géolocalisation | Google Places API | Autocomplete adresse + geocoding |
| Interface REST API | Cloudflare Workers | Point d'entrée unique du backend |
| Authentification | Firebase Auth | Connexion sans mot de passe (lien magique) |
| BDD Données | Firestore (NoSQL) | Annonces, profils, réservations |
| BDD Messages | Firebase Realtime DB | Messagerie |
| BDD Sessions | Cloudflare D1 (SQL) | Sessions utilisateur |
| Fichiers | Cloudflare R2 | Photos, documents |
| Hébergement | Firebase Hosting | Site vitrine + application |

## Sécurité

- Les identifiants de service Firebase sont stockés dans les secrets du Worker, jamais commités
  ni exposés côté front.
- L'accès au Worker est restreint par nom de domaine (CORS).

## Déploiement

- Front (`/landing`, `/public`) : `firebase deploy` (ou GitHub Actions)
- Back (`/workers`) : `wrangler deploy`
