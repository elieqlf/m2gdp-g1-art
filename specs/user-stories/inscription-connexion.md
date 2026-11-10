# US : Création et connexion de compte

**En tant que** visiteur, **je veux** me connecter sans mot de passe via un lien envoyé par e-mail,
**afin de** créer un compte ou me reconnecter simplement.

Statut : POC repris dans Vue + Shadcn-Vue (`frontend/src/App.vue`, `frontend/src/services/firebase.ts`). Ancien POC conservé dans `public/`. Tests de composants dans `frontend/tests/`, services externes simulés.

## Critères d'acceptation (Happy Path)

| # | Critère |
|---|---------|
| CA1 | Saisie email & contrôle de validité — validation syntaxique en temps réel, message d'erreur sans requête réseau si format invalide |
| CA2 | Écran de confirmation immédiat après soumission du formulaire, invitant à consulter sa messagerie |
| CA3 | E-mail reçu et lien ouvert — authentification Firebase, puis orientation selon l'état du profil |
| CA4 | Nouveau profil — après authentification, la personne complète les trois étapes de profil avant d'entrer dans l'application |
| CA5 | Profil existant complet — accès direct à l'application, sans créer de doublon ni repasser par l'inscription |
| CA6 | Connexion Google — au retour du fournisseur, le même routage selon l'état du profil est appliqué |
| CA7 | Lien périmé & renvoi sous 60s — blocage avec alerte explicite si lien expiré/rejoué, bouton de réémission disponible après 60 secondes |

## Spécifications techniques

| # | Détail |
|---|--------|
| ST1 | Envoi passwordless (Firebase Auth) — `sendSignInLinkToEmail`, délègue génération du token et envoi SMTP |
| ST2 | Validation & consommation du lien — `signInWithEmailLink` à l'atterrissage, anti-rejeu géré par Firebase |
| ST3 | Profil Firestore `users/{uid}` — création après authentification avec `profileComplete: false`; l'adresse e-mail reste dans Firebase Authentication et n'est pas copiée dans le profil |
| ST4 | Maintien de l'état de session — `onAuthStateChanged` sur `users.html`/`index.html` |
| ST5 | `ActionCodeSettings.url` pointe vers `/login.html` du domaine courant ; domaines autorisés dans Firebase Auth |
| ST6 | Reprise du profil — `onboardingStep` enregistre l'étape à reprendre après une reconnexion |
| ST7 | Google OAuth — le résultat de redirection est consommé explicitement, puis suit le même routage que le lien e-mail |

## Cas gérés

- **GERE1** — Format email/domaine invalide : rejet immédiat en front, sans appel Firebase
- **GERE2** — Lien expiré ou déjà consommé (`auth/invalid-action-code`) : proposition d'un nouveau lien en 1 clic
- **GERE3** — Rupture réseau/échec d'envoi : toast d'alerte non bloquant, réessai possible

## Exclusions (hors scope)

- **EXCLU1** — Ouverture cross-device/navigateur : confirmation de l'email requise, pas de synchronisation
- **EXCLU2** — Pas de canal de secours (SMS, code vocal) si le mail atterrit en spam
- **EXCLU3** — Quotas Firebase standards uniquement ; pas de captcha maison ni gestion de sessions distantes

## Inscription pas à pas

L'e-mail sert d'abord à authentifier la personne. Après le clic sur le lien, l'application vérifie
le profil associé :

- nouveau profil ou profil incomplet : reprise au premier écran non terminé ;
- profil complet : accès direct à l'application.

Le profil se complète ensuite en trois étapes :

1. **Créer ton profil** — prénom ou pseudo, adresse e-mail affichée en lecture seule, ville ou
   quartier, au moins un centre d'intérêt artistique ; la photo est facultative ;
2. **Personnaliser ton expérience** — rayon de découverte, localisation actuelle ou ville/quartier,
   objectifs sur NOVART ;
3. **Terminer** — récapitulatif de la connexion et des informations enregistrées, puis entrée dans
   l'application. Aucun second e-mail de vérification n'est envoyé à cette étape.

Les données de chaque étape sont enregistrées avec `profileComplete: false`. Le passage dans
l'application marque le profil `profileComplete: true`.

## Règles de sécurité Firestore

```
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create, update: if request.auth != null && request.auth.uid == userId;
}
match /publicProfiles/{userId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null && request.auth.uid == userId
    && request.resource.data.keys().hasOnly(['firstName', 'lastName', 'photoUrl', 'bio', 'interests']);
}
```

La version complète et ses contraintes figurent dans `docs/firestore.rules`.

## À faire manuellement (une fois)

- Ajouter `novart-app.web.app` aux domaines autorisés Firebase Auth (console)
- Vérifier "Email/Password" + lien passwordless activé (console)
