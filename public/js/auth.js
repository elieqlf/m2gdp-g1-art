import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";

const EMAIL_STORAGE_KEY = "art_pending_signin_email";

// GERE1 : rejet immédiat côté front, sans appel réseau, si le format est invalide.
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function actionCodeSettings() {
  return {
    url: `${window.location.origin}/login.html`,
    handleCodeInApp: true,
  };
}

// ST1 : délègue la génération du lien sécurisé et l'envoi SMTP à Firebase Auth.
export async function requestSignInLink(email) {
  await sendSignInLinkToEmail(auth, email, actionCodeSettings());
  localStorage.setItem(EMAIL_STORAGE_KEY, email);
}

// ST2 : détecte et consomme le lien de connexion à l'atterrissage sur la page.
export function isCompletingSignIn() {
  return isSignInWithEmailLink(auth, window.location.href);
}

// EXCLU1 : si le lien est ouvert sur un autre appareil/navigateur, l'email n'est
// pas retrouvé en storage local — on redemande la confirmation de l'email.
export async function completeSignIn(emailOverride) {
  const email = emailOverride || localStorage.getItem(EMAIL_STORAGE_KEY);
  if (!email) {
    return { needsEmailConfirmation: true };
  }
  const result = await signInWithEmailLink(auth, email, window.location.href);
  localStorage.removeItem(EMAIL_STORAGE_KEY);

  const userRef = doc(db, "users", result.user.uid);
  const existing = await getDoc(userRef);
  const isNewUser = !existing.exists();

  // ST3 : création de la ligne utilisateur à la 1ère visite, jamais écrasée ensuite.
  if (isNewUser) {
    await setDoc(userRef, {
      email: result.user.email,
      createdAt: serverTimestamp(),
      profileComplete: false,
    });
  }

  return { user: result.user, isNewUser };
}

export async function saveProfile(uid, profile) {
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      firstName: profile.firstName,
      lastName: profile.lastName,
      userType: profile.userType,
      address: profile.address,
      photoUrl: profile.photoUrl || null,
      profileComplete: true,
    },
    { merge: true }
  );
}

export { auth };
