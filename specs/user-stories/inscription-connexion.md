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

## Variante : « Continuer avec Google » (maquette 01, branche hadi-app-ux)

En plus de la connexion sans mot de passe par e-mail exigée par le cours. Case « Rester connecté·e sur cet appareil » : session conservée (`browserLocalPersistence`) ou limitée à l'onglet (`browserSessionPersistence`).

| # | Critère d'acceptation | Test |
|---|---|---|
| G1 | Nouveau compte : profil pré-rempli avec le prénom, le nom et la photo Google, modifiables | `App.test.ts`, `current-ui.spec.ts` |
| G2 | Fenêtre fermée par la personne : aucun message ; fenêtre bloquée : « Autorise les fenêtres pop-up… » | `App.test.ts` |

Technique : `signInWithPopup` et non `signInWithRedirect`. Constaté sur téléphone (09/11) : avec la redirection, on revenait sur l'écran de connexion sans session, car l'appli est servie sur `novart-app.web.app` et l'authentification sur `novart-109bf.firebaseapp.com` (stockage tiers bloqué par Safari et Chrome). La fenêtre s'ouvre dans le geste de l'utilisateur ; la persistance choisie est appliquée juste après la connexion.

## E-mail de connexion NOVART (Cloudflare Worker + Brevo)

Firebase ne permet pas de modifier le texte de l'e-mail de connexion par lien. Le Worker (`workers/`) génère le même lien avec le compte de service et l'envoie via Brevo avec le texte du DA (objet « Ton lien sécurisé pour accéder à NOVART », bouton « Accéder à NOVART »).

| # | Critère d'acceptation | Test |
|---|---|---|
| E1 | E-mail expédié par « NOVART », texte du DA, lien Firebase valide ramenant sur `/login.html` | `workers/test/worker.test.mjs` |
| E2 | Appels refusés hors de l'appli ; lien de retour limité aux origines de l'appli | idem |
| E3 | 3 liens max en 10 min par adresse, 20 par heure par appareil ; message « Tu as demandé plusieurs liens d'affilée… » | idem, `App.test.ts` |
| E4 | Worker non configuré, en panne ou trop lent (8 s) : e-mail standard Firebase, sans erreur visible | `emailLink.test.ts` |
| E5 | D1 ne contient que des empreintes salées, effacées après 24 h ; aucune adresse dans les journaux | `worker.test.mjs` |

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
  allow read: if request.auth != null;
  allow create, update: if request.auth != null && request.auth.uid == userId;
}
```

## À faire manuellement (une fois)

- Ajouter `novart-app.web.app` aux domaines autorisés Firebase Auth (console)
- Vérifier "Email/Password" + lien passwordless activé (console)
