# US : Création et connexion de compte

**En tant que** visiteur, **je veux** me connecter sans mot de passe via un lien envoyé par e-mail,
**afin de** créer un compte ou me reconnecter simplement.

Statut : POC repris dans Vue + Shadcn-Vue (`frontend/src/App.vue`, `frontend/src/services/firebase.ts`). Ancien POC conservé dans `public/`. Tests de composants dans `frontend/tests/`, services externes simulés.

## Critères d'acceptation (Happy Path)

| # | Critère |
|---|---------|
| CA1 | Saisie email & contrôle de validité — validation syntaxique en temps réel, message d'erreur sans requête réseau si format invalide |
| CA2 | Écran de confirmation immédiat après soumission du formulaire, invitant à consulter sa messagerie |
| CA3 | Email reçu & clic "Se connecter" — lien sécurisé (15 min), connexion instantanée et redirection vers l'espace connecté |
| CA4 | Provisioning ou reconnexion fluide — création automatique si nouveau compte, reconnexion transparente sans doublon si email déjà référencé |
| CA5 | Lien périmé & renvoi sous 60s — blocage avec alerte explicite si lien expiré/rejoué, bouton de réémission disponible après 60 secondes |

## Spécifications techniques

| # | Détail |
|---|--------|
| ST1 | Envoi passwordless (Firebase Auth) — `sendSignInLinkToEmail`, délègue génération du token et envoi SMTP |
| ST2 | Validation & consommation du lien — `signInWithEmailLink` à l'atterrissage, anti-rejeu géré par Firebase |
| ST3 | Table des utilisateurs (Firestore `users/{uid}`) — insertion à la 1ère visite (`email`, `createdAt`), jamais écrasée ensuite |
| ST4 | Maintien de l'état de session — `onAuthStateChanged` sur `users.html`/`index.html` |
| ST5 | `ActionCodeSettings.url` pointe vers `/login.html` du domaine courant ; domaines autorisés dans Firebase Auth |

## Cas gérés

- **GERE1** — Format email/domaine invalide : rejet immédiat en front, sans appel Firebase
- **GERE2** — Lien expiré ou déjà consommé (`auth/invalid-action-code`) : proposition d'un nouveau lien en 1 clic
- **GERE3** — Rupture réseau/échec d'envoi : toast d'alerte non bloquant, réessai possible

## Exclusions (hors scope)

- **EXCLU1** — Ouverture cross-device/navigateur : confirmation de l'email requise, pas de synchronisation
- **EXCLU2** — Pas de canal de secours (SMS, code vocal) si le mail atterrit en spam
- **EXCLU3** — Quotas Firebase standards uniquement ; pas de captcha maison ni gestion de sessions distantes

## Inscription pas à pas (nouveaux comptes)

Après le premier lien validé, formulaire de complément de profil (`profileComplete: false` → `true`) :
Prénom, Nom, Type d'utilisateur (Organisateur / Participant), Adresse postale, Photo (URL, facultatif).

## Règles de sécurité Firestore

```
match /users/{userId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null && request.auth.uid == userId;
}
```

## À faire manuellement (une fois)

- Ajouter `novart-app.web.app` aux domaines autorisés Firebase Auth (console)
- Vérifier "Email/Password" + lien passwordless activé (console)
