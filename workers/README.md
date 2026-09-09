# Backend (Cloudflare Workers)

Logique métier exposée en API REST à l'application frontend, appelant les services auto-gérés
(Firebase Auth, Firestore, Realtime DB, Cloudflare D1, Cloudflare R2).

- Déploiement : `wrangler deploy`
- Secrets (clé de service Firebase, etc.) : `wrangler secret put <NAME>` — jamais commités
- CORS restreint au nom de domaine du front
