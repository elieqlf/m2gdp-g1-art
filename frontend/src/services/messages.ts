import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, type DocumentData } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Messagerie privée entre deux membres (« Contact » du sujet ART) : par exemple pour
 * poser une question à l'organisateur avant de s'inscrire.
 *
 * Confidentialité : les règles Firestore réservent la lecture aux deux membres de la
 * conversation. Les échanges sont chiffrés en transit (HTTPS) et au repos (Google Cloud),
 * mais pas de bout en bout : un administrateur du projet Firebase peut techniquement les lire.
 */
export interface PrivateMessage { id: string; authorId: string; text: string; sentAtMs: number }
export interface PrivateChat {
  id: string
  memberIds: [string, string]
  /** Activité à propos de laquelle la conversation a commencé (facultatif). */
  activityId?: string
  activityTitle?: string
  lastMessage: { text: string; authorId: string; sentAtMs: number } | null
  /** Dernière lecture de chaque membre (pour les non-lus). */
  readAtMs: Record<string, number>
  updatedAtMs: number
}
export interface ChatContext { activityId: string; activityTitle: string }

/** Identifiant stable : les deux uid triés, pour qu'il n'existe qu'une conversation par paire. */
export const chatIdFor = (a: string, b: string) => [a, b].sort().join('__')
export const otherMember = (chat: Pick<PrivateChat, 'memberIds'>, uid: string) => chat.memberIds.find(id => id !== uid) ?? uid
export const isUnread = (chat: PrivateChat, uid: string) =>
  !!chat.lastMessage && chat.lastMessage.authorId !== uid && chat.lastMessage.sentAtMs > (chat.readAtMs?.[uid] ?? 0)

const toChat = (id: string, data: DocumentData): PrivateChat => ({
  id,
  memberIds: data.memberIds,
  activityId: data.activityId || undefined,
  activityTitle: data.activityTitle || undefined,
  lastMessage: data.lastMessage ?? null,
  readAtMs: data.readAtMs ?? {},
  updatedAtMs: Number(data.updatedAtMs) || 0,
})

/** Mes conversations privées, en temps réel (la requête correspond à la règle de lecture). */
export function watchMyChats(uid: string, onChats: (chats: PrivateChat[]) => void, onError: (error: Error) => void) {
  return onSnapshot(query(collection(db, 'privateChats'), where('memberIds', 'array-contains', uid)), (snapshot: { docs: { id: string; data(): DocumentData }[] }) => {
    onChats(snapshot.docs.map(item => toChat(item.id, item.data())).sort((a, b) => b.updatedAtMs - a.updatedAtMs))
  }, onError)
}

/** Messages d'une conversation existante (une conversation inconnue n'est pas lisible). */
export function watchPrivateMessages(chatId: string, onMessages: (messages: PrivateMessage[]) => void, onError: (error: Error) => void) {
  return onSnapshot(query(collection(db, 'privateChats', chatId, 'messages'), orderBy('sentAtMs', 'asc')), (snapshot: { docs: { id: string; data(): DocumentData }[] }) => {
    onMessages(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PrivateMessage)))
  }, onError)
}

/**
 * Envoi : la conversation est créée au premier message (setDoc fusionné : création ou
 * mise à jour selon le cas), puis le message est ajouté.
 */
export async function sendPrivateMessage(from: string, to: string, text: string, context?: ChatContext) {
  const clean = text.trim()
  const sentAtMs = Date.now()
  const chatId = chatIdFor(from, to)
  await setDoc(doc(db, 'privateChats', chatId), {
    memberIds: [from, to].sort(),
    lastMessage: { text: clean, authorId: from, sentAtMs },
    readAtMs: { [from]: sentAtMs },
    updatedAtMs: sentAtMs,
    ...(context ? { activityId: context.activityId, activityTitle: context.activityTitle } : {}),
  }, { merge: true })
  await addDoc(collection(db, 'privateChats', chatId, 'messages'), { authorId: from, text: clean, sentAtMs, createdAt: serverTimestamp() })
  return chatId
}

export const markChatRead = (chatId: string, uid: string) =>
  updateDoc(doc(db, 'privateChats', chatId), { [`readAtMs.${uid}`]: Date.now() })
