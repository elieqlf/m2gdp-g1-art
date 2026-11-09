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
