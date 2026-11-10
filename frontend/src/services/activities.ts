import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, where, type DocumentData } from 'firebase/firestore'
import { db } from './firebase'
import { canJoinDirectly, defaultCover, type Activity, type ActivityDraft, type Offer } from '@/lib/activity'
import * as queue from '@/lib/waitlist'

export interface Author { uid: string; name: string; photo?: string }
export interface Message { id: string; authorId: string; authorName: string; authorPhoto?: string; text: string; sentAtMs: number }
export class ActivityFullError extends Error { constructor() { super('Cette activité est complète.') } }

const toActivity = (id: string, data: DocumentData): Activity => {
  const discipline = typeof data.discipline === 'string' ? data.discipline : 'autre'
  const savedCover = typeof data.coverUrl === 'string' ? data.coverUrl : ''
  const coverUrl = !savedCover || /^\/images\/activities\/[^/]+-\d\.svg$/i.test(savedCover) ? defaultCover(discipline) : savedCover
  return {
    ...data,
    id,
    coverUrl,
    participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
    waitlistIds: Array.isArray(data.waitlistIds) ? data.waitlistIds : [],
    offer: data.offer && typeof data.offer.uid === 'string' ? data.offer as Offer : null,
    capacity: Number(data.capacity) || 0,
    lat: typeof data.lat === 'number' ? data.lat : null,
    lng: typeof data.lng === 'number' ? data.lng : null,
  } as Activity
}

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
    waitlistIds: [] as string[],
    offer: null,
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
    if (!canJoinDirectly(current)) throw new ActivityFullError()
    transaction.update(ref, { participantIds: arrayUnion(uid), updatedAtMs: Date.now() })
    return { ...current, participantIds: [...current.participantIds, uid] }
  })
}

async function inTransaction(id: string, change: (a: Activity) => Partial<Activity> | null): Promise<Activity> {
  const ref = doc(db, 'activities', id)
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) throw new Error('Activité introuvable.')
    const current = toActivity(id, snapshot.data() ?? {})
    const patch = change(current)
    if (!patch) return current
    transaction.update(ref, { ...patch, updatedAtMs: Date.now() })
    return { ...current, ...patch }
  })
}

// US-10 : désinscription. La place libérée est proposée à la liste d'attente.
export const leaveActivity = (id: string, uid: string) => inTransaction(id, a => queue.leave(a, uid))
// Liste d'attente (sujet ART) : rejoindre, quitter, confirmer ou laisser une place proposée.
export const joinWaitlist = (id: string, uid: string) => inTransaction(id, a => queue.wait(a, uid))
export const leaveWaitlist = (id: string, uid: string) => inTransaction(id, a => queue.stopWaiting(a, uid))
export const acceptOffer = (id: string, uid: string) => inTransaction(id, a => queue.accept(a, uid))
export const declineOffer = (id: string, uid: string) => inTransaction(id, a => queue.decline(a, uid))
/**
 * Échéance dépassée (ou place restée libre) : la place passe à la personne suivante.
 * Sans serveur, c'est le premier membre qui affiche l'activité qui fait avancer la file.
 */
export const refreshQueue = (id: string) => inTransaction(id, a => queue.refresh(a))
/** Places proposées à cette personne, en temps réel (notifications). */
export function watchMyOffers(uid: string, onOffers: (activities: Activity[]) => void, onError: (error: Error) => void) {
  return onSnapshot(query(collection(db, 'activities'), where('offer.uid', '==', uid)), (snapshot: { docs: { id: string; data(): DocumentData }[] }) => {
    onOffers(snapshot.docs.map(item => toActivity(item.id, item.data())))
  }, onError)
}

/**
 * Activités dont je suis membre (inscrit ou organisateur), en temps réel : le dernier message
 * des groupes de discussion s'actualise dans la liste des conversations et les non-lus.
 * Deux requêtes (Firestore ne combine pas array-contains et == sur des champs différents en OU).
 */
export function watchMyActivities(uid: string, onActivities: (activities: Activity[]) => void, onError: (error: Error) => void) {
  const parts: Record<'joined' | 'organized', Activity[]> = { joined: [], organized: [] }
  const ready = { joined: false, organized: false }
  const listen = (part: 'joined' | 'organized', constraint: ReturnType<typeof where>) =>
    onSnapshot(query(collection(db, 'activities'), constraint), (snapshot: { docs: { id: string; data(): DocumentData }[] }) => {
      parts[part] = snapshot.docs.map(item => toActivity(item.id, item.data()))
      ready[part] = true
      if (ready.joined && ready.organized) onActivities([...new Map([...parts.joined, ...parts.organized].map(a => [a.id, a])).values()])
    }, onError)
  const stops = [listen('joined', where('participantIds', 'array-contains', uid)), listen('organized', where('organizerId', '==', uid))]
  return () => stops.forEach(stop => stop())
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
  await updateDoc(doc(db, 'activities', activityId), { lastMessage: { text: clean, authorName: author.name, authorId: author.uid, sentAtMs } })
}
