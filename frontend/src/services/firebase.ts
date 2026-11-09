import { initializeApp } from 'firebase/app'
import { browserLocalPersistence, browserSessionPersistence, getAuth, getRedirectResult, GoogleAuthProvider, sendSignInLinkToEmail, isSignInWithEmailLink, OAuthProvider, onAuthStateChanged, setPersistence, signInWithEmailLink, signInWithRedirect, signOut, type User } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore'
import { firebaseConfig } from '../../../public/firebase-config.js'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
export const db = getFirestore(app)
const EMAIL_KEY = 'art_pending_signin_email'
const REMEMBER_KEY = 'art_remember_signin'
export type Account = Pick<User, 'uid' | 'email'>
export interface Profile {
  firstName: string
  lastName: string
  userType: 'organisateur' | 'participant'
  address: string
  addressLat: number | null
  addressLng: number | null
  photoUrl: string
  profileComplete?: boolean
  bio?: string
  interests?: string[]
  favoriteIds?: string[]
}
export type Member = Partial<Profile> & { uid: string }
export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
export const hasSignInLink = () => isSignInWithEmailLink(auth, window.location.href)
export const pendingEmail = () => localStorage.getItem(EMAIL_KEY) || ''
export const rememberedSessionChoice = () => localStorage.getItem(REMEMBER_KEY) === '1'
export async function setAuthPersistence(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
}
export async function signInWithSocialProvider(providerName: 'apple' | 'google', remember: boolean) {
  await setAuthPersistence(remember)
  if (providerName === 'google') {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    await signInWithRedirect(auth, provider)
    return
  }
  const provider = new OAuthProvider('apple.com')
  provider.addScope('email')
  provider.addScope('name')
  await signInWithRedirect(auth, provider)
}
export async function consumeSocialRedirect() {
  const result = await getRedirectResult(auth)
  if (result) localStorage.removeItem(REMEMBER_KEY)
  return result
}
export async function requestSignInLink(email: string) {
  const continueUrl = new URL('/login.html', window.location.origin)
  continueUrl.searchParams.set('remember', localStorage.getItem(REMEMBER_KEY) === '1' ? '1' : '0')
  await sendSignInLinkToEmail(auth, email, { url: continueUrl.toString(), handleCodeInApp: true })
  localStorage.setItem(EMAIL_KEY, email)
}
export async function completeSignIn(email: string) {
  const remember = new URLSearchParams(window.location.search).get('remember')
  if (remember !== null) await setAuthPersistence(remember === '1')
  const result = await signInWithEmailLink(auth, email, window.location.href)
  localStorage.removeItem(EMAIL_KEY)
  localStorage.removeItem(REMEMBER_KEY)
  return result.user
}
export const observeAccount = (callback: (user: Account | null) => void, onError: (error: Error) => void) => onAuthStateChanged(auth, callback, onError)
// RGPD : l'e-mail n'est jamais enregistré dans le profil, lisible par les autres
// membres. Il reste uniquement dans Firebase Authentication (visible de l'équipe).
export async function getProfile(user: Account): Promise<Partial<Profile>> {
  const ref = doc(db, 'users', user.uid)
  const snapshot = await getDoc(ref)
  if (snapshot.exists()) {
    const { email, ...profile } = (snapshot.data() ?? {}) as Partial<Profile> & { email?: string }
    // Profils créés avant ce changement : l'e-mail est retiré à la connexion suivante.
    if (email !== undefined) await updateDoc(ref, { email: deleteField() }).catch(() => undefined)
    return profile
  }
  await setDoc(ref, { createdAt: serverTimestamp(), profileComplete: false })
  return { profileComplete: false }
}
export async function saveProfile(uid: string, profile: Profile) {
  await setDoc(doc(db, 'users', uid), { ...profile, profileComplete: true }, { merge: true })
}
export async function listMembers(): Promise<Member[]> {
  const snapshot = await getDocs(collection(db, 'users'))
  // Par précaution, un ancien e-mail encore présent n'est jamais transmis à l'interface.
  return snapshot.docs.map(item => {
    const { email: _email, ...profile } = item.data() as Partial<Profile> & { email?: string }
    return { ...profile, uid: item.id }
  })
}
// US-14 : modification des informations de base (photo, nom, description, centres d'intérêt).
export async function updateProfile(uid: string, changes: Partial<Profile>) {
  await setDoc(doc(db, 'users', uid), changes, { merge: true })
}
// Favoris : liste d'identifiants d'activités conservée dans le profil.
export async function setFavorite(uid: string, activityId: string, favorite: boolean) {
  await updateDoc(doc(db, 'users', uid), { favoriteIds: favorite ? arrayUnion(activityId) : arrayRemove(activityId) })
}
export const logout = () => signOut(auth)
