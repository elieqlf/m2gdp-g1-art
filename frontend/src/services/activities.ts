import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, type DocumentData } from 'firebase/firestore'
import { db } from './firebase'
import type { Activity, ActivityDraft } from '@/lib/activity'

export interface Author { uid: string; name: string; photo?: string }
export interface Message { id: string; authorId: string; authorName: string; authorPhoto?: string; text: string; sentAtMs: number }
export class ActivityFullError extends Error { constructor() { super('Cette activité est complète.') } }

const toActivity = (id: string, data: DocumentData): Activity => ({
  ...data,
  id,
  participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
  capacity: Number(data.capacity) || 0,
  lat: typeof data.lat === 'number' ? data.lat : null,
  lng: typeof data.lng === 'number' ? data.lng : null,
} as Activity)

// US-03/US-04 : flux et recherche. Le volume (quelques centaines d'activités)
// permet de filtrer côté navigateur, sans index composite.
export async function listActivities(): Promise<Activity[]> {
  const snapshot = await getDocs(collection(db, 'activities'))
  return snapshot.docs.map(item => toActivity(item.id, item.data()))
}

// US-06 : fiche activité.
export async function getActivity(id: string): Promise<Activity | null> {
  const snapshot = await getDoc(doc(db, 'activities', id))
  return snapshot.exists() ? toActivity(snapshot.id, snapshot.data() ?? {}) : null
}

// US-07 : publication. L'organisateur ne fait pas partie des participants.
export async function createActivity(draft: ActivityDraft, organizer: Author): Promise<Activity> {
  const activity = {
    ...draft,
    participantIds: [] as string[],
    organizerId: organizer.uid,
    organizerName: organizer.name,
    organizerPhoto: organizer.photo || '',
    status: 'published' as const,
    createdAtMs: Date.now(),
    lastMessage: null,
  }
  const ref = await addDoc(collection(db, 'activities'), { ...activity, createdAt: serverTimestamp() })
  return { ...activity, id: ref.id }
}

// US-08 : modification et suppression par l'organisateur.
export async function updateActivity(id: string, draft: ActivityDraft) {
  await updateDoc(doc(db, 'activities', id), { ...draft, updatedAtMs: Date.now() })
}
export const deleteActivity = (id: string) => deleteDoc(doc(db, 'activities', id))

// US-09 : inscription, dans une transaction pour ne jamais dépasser la capacité.
export async function joinActivity(id: string, uid: string): Promise<Activity> {
  const ref = doc(db, 'activities', id)
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) throw new Error('Activité introuvable.')
    const current = toActivity(id, snapshot.data() ?? {})
    if (current.participantIds.includes(uid)) return current
    if (current.participantIds.length >= current.capacity) throw new ActivityFullError()
    transaction.update(ref, { participantIds: arrayUnion(uid), updatedAtMs: Date.now() })
    return { ...current, participantIds: [...current.participantIds, uid] }
  })
}

// US-10 : désinscription.
export async function leaveActivity(id: string, uid: string) {
  await updateDoc(doc(db, 'activities', id), { participantIds: arrayRemove(uid), updatedAtMs: Date.now() })
}

// US-11 : groupe de l'activité, mis à jour en temps réel.
export function watchMessages(activityId: string, onMessages: (messages: Message[]) => void, onError: (error: Error) => void) {
  const messages = query(collection(db, 'activities', activityId, 'messages'), orderBy('sentAtMs', 'asc'))
  return onSnapshot(messages, (snapshot: { docs: { id: string; data(): DocumentData }[] }) => {
    onMessages(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Message)))
  }, onError)
}

// US-12 : envoi d'un message au groupe. Le dernier message alimente la liste des conversations.
export async function sendMessage(activityId: string, author: Author, text: string) {
  const sentAtMs = Date.now()
  const clean = text.trim()
  await addDoc(collection(db, 'activities', activityId, 'messages'), { authorId: author.uid, authorName: author.name, authorPhoto: author.photo || '', text: clean, sentAtMs, createdAt: serverTimestamp() })
  await updateDoc(doc(db, 'activities', activityId), { lastMessage: { text: clean, authorName: author.name, sentAtMs } })
}
