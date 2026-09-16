import { initializeApp } from 'firebase/app'
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'
import { firebaseConfig } from '../../../public/firebase-config.js'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const EMAIL_KEY = 'art_pending_signin_email'
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
  email?: string
}
export type Member = Partial<Profile> & { uid: string }
export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
export const hasSignInLink = () => isSignInWithEmailLink(auth, window.location.href)
export const pendingEmail = () => localStorage.getItem(EMAIL_KEY) || ''
export async function requestSignInLink(email: string) {
  await sendSignInLinkToEmail(auth, email, { url: `${window.location.origin}/login.html`, handleCodeInApp: true })
  localStorage.setItem(EMAIL_KEY, email)
}
export async function completeSignIn(email: string) {
  const result = await signInWithEmailLink(auth, email, window.location.href)
  localStorage.removeItem(EMAIL_KEY)
  return result.user
}
export const observeAccount = (callback: (user: Account | null) => void, onError: (error: Error) => void) => onAuthStateChanged(auth, callback, onError)
export async function getProfile(user: Account): Promise<Partial<Profile>> {
  const ref = doc(db, 'users', user.uid)
  const snapshot = await getDoc(ref)
  if (snapshot.exists()) return snapshot.data() as Partial<Profile>
  const profile = { email: user.email, createdAt: serverTimestamp(), profileComplete: false }
  await setDoc(ref, profile)
  return { email: user.email || '', profileComplete: false }
}
export async function saveProfile(uid: string, profile: Profile) {
  await setDoc(doc(db, 'users', uid), { ...profile, profileComplete: true }, { merge: true })
}
export async function listMembers(): Promise<Member[]> {
  const snapshot = await getDocs(collection(db, 'users'))
  return snapshot.docs.map(item => ({ ...item.data(), uid: item.id }))
}
export const logout = () => signOut(auth)
