# Stack technique — Architecture serverless

Le schéma ci-dessous décrit l’architecture cible. Le POC actuel appelle directement Firebase Auth, Firestore et Google Places depuis le front Vue ; le Worker expose uniquement `/health`.

```mermaid
flowchart LR
    subgraph Front
        Landing[Firebase Hosting\n/landing — Site vitrine]
        App[Firebase Hosting\n/frontend/dist — App Vue]
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
| Front End | Vue 3, TypeScript, Vite, Tailwind CSS 4, Shadcn-Vue | Interface responsive ; PWA installable à venir |
| Carte | LeafletJS (prévu) | Affichage géographique des annonces |
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

- Front Vue : `npm run build` produit `frontend/dist`. Firebase Hosting cible ce dossier et reconstruit automatiquement avant publication.
- Application : `firebase deploy --only hosting:app` ; site vitrine : `firebase deploy --only hosting:landing`.
- Back (`/workers`) : `wrangler deploy`
