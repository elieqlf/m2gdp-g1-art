import { computed, reactive } from 'vue'
import { listMembers, setFavorite, type Account, type Member, type Profile } from '@/services/firebase'
import { getActivity, listActivities, watchMyOffers } from '@/services/activities'
import { LYON_CENTER, activeOffer, isMember, isPast, startsAt, waitlistOf, type Activity, type Point } from '@/lib/activity'

// État partagé entre les écrans de l'application connectée.
export const store = reactive({
  account: null as Account | null,
  profile: {} as Partial<Profile>,
  activities: [] as Activity[],
  activitiesStatus: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
  members: {} as Record<string, Member>,
  membersStatus: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
  gps: null as Point | null,
  gpsStatus: 'idle' as 'idle' | 'pending' | 'granted' | 'denied' | 'unavailable',
  notice: '' as string,
  /** Activités où une place m'est proposée (temps réel). */
  offers: [] as Activity[],
  /** Notifications déjà vues (mémorisées sur cet appareil). */
  seenNotifications: [] as string[],
})

export const uid = computed(() => store.account?.uid ?? '')
export const displayName = computed(() => [store.profile.firstName, store.profile.lastName].filter(Boolean).join(' ') || store.account?.email || 'Moi')
export const me = computed(() => ({ uid: uid.value, name: store.profile.firstName || displayName.value, photo: store.profile.photoUrl || '' }))
export const favorites = computed(() => store.profile.favoriteIds ?? [])
/** Point de référence pour les distances : position demandée, sinon adresse du profil, sinon centre de Lyon. */
export const origin = computed<Point>(() => store.gps
  ?? (typeof store.profile.addressLat === 'number' && typeof store.profile.addressLng === 'number' ? { lat: store.profile.addressLat, lng: store.profile.addressLng } : LYON_CENTER))
export const originLabel = computed(() => store.gps ? 'ta position' : typeof store.profile.addressLat === 'number' ? 'ton adresse' : 'le centre de Lyon')

export function resetStore() {
  stopWatchers()
  pending = []
  Object.assign(store, { account: null, profile: {}, activities: [], activitiesStatus: 'idle', members: {}, membersStatus: 'idle', gps: null, gpsStatus: 'idle', notice: '', offers: [], seenNotifications: [] })
}
let noticeTimer: ReturnType<typeof setTimeout> | undefined
let pending: { text: string; duration: number }[] = []
/**
 * Message éphémère. Une réponse à une action (« Activité publiée ») s'affiche tout de suite ;
 * un message d'arrière-plan (place libérée, localisation) attend la fin du message en cours.
 */
export function notify(text: string, duration = 3500, background = false) {
  if (background && store.notice) { pending.push({ text, duration }); return }
  store.notice = text
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    store.notice = ''
    const next = pending.shift()
    if (next) setTimeout(() => notify(next.text, next.duration), 300)
  }, duration)
}
/** Message flottant quand la position de l'appareil n'a pas pu être obtenue. */
export function notifyPositionFallback() {
  const where = typeof store.profile.addressLat === 'number' ? 'ton adresse' : 'le centre de Lyon'
  notify(store.gpsStatus === 'denied'
    ? `Localisation désactivée : les distances partent de ${where}. Tu peux l’autoriser dans les réglages de ton navigateur.`
    : `Position introuvable : les distances partent de ${where}.`, 6000, true)
}
export async function loadActivities(force = false) {
  if (!force && (store.activitiesStatus === 'loading' || store.activitiesStatus === 'ready')) return
  store.activitiesStatus = 'loading'
  try { store.activities = await listActivities(); store.activitiesStatus = 'ready' }
  catch { store.activitiesStatus = 'error' }
}
export async function loadMembers(force = false) {
  if (!force && (store.membersStatus === 'loading' || store.membersStatus === 'ready')) return
  store.membersStatus = 'loading'
  try {
    const list = await listMembers()
    store.members = Object.fromEntries(list.map(m => [m.uid, m]))
    store.membersStatus = 'ready'
  } catch { store.membersStatus = 'error' }
}
export const activityById = (id?: string) => store.activities.find(a => a.id === id)
/** Lien direct vers une fiche : l'activité est lue dans Firestore si la liste n'est pas encore chargée. */
export async function ensureActivity(id: string): Promise<Activity | null> {
  const known = activityById(id)
  if (known) return known
  const fetched = await getActivity(id)
  if (fetched) upsertActivity(fetched)
  return fetched
}
export function upsertActivity(activity: Activity) {
  const index = store.activities.findIndex(a => a.id === activity.id)
  if (index >= 0) store.activities.splice(index, 1, activity)
  else store.activities.unshift(activity)
}
export function removeActivity(id: string) {
  store.activities = store.activities.filter(a => a.id !== id)
}
export function memberName(id: string) {
  if (id === uid.value) return store.profile.firstName || 'Moi'
  const m = store.members[id]
  return m ? [m.firstName, m.lastName].filter(Boolean).join(' ') || 'Membre' : 'Membre'
}
/** Favori optimiste : l'interface change tout de suite et revient en arrière en cas d'échec. */
export async function toggleFavorite(activityId: string) {
  const current = favorites.value
  const on = !current.includes(activityId)
  store.profile.favoriteIds = on ? [...current, activityId] : current.filter(id => id !== activityId)
  try { await setFavorite(uid.value, activityId, on) }
  catch { store.profile.favoriteIds = current; throw new Error('Favori non enregistré') }
}
/**
 * Position de l'appareil : demandée à l'ouverture de l'application (le navigateur
 * demande l'autorisation la première fois). En cas de refus ou d'échec, les distances
 * se calculent depuis l'adresse du profil, sinon depuis le centre de Lyon.
 */
export function requestPosition(): Promise<boolean> {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) { store.gpsStatus = 'unavailable'; return resolve(false) }
    store.gpsStatus = 'pending'
    navigator.geolocation.getCurrentPosition(
      position => { store.gps = { lat: position.coords.latitude, lng: position.coords.longitude }; store.gpsStatus = 'granted'; resolve(true) },
      error => { store.gpsStatus = error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'; resolve(false) },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}

// ——— Liste d'attente et notifications ———

let unsubscribers: (() => void)[] = []
function stopWatchers() { unsubscribers.forEach(stop => stop()); unsubscribers = [] }
const seenKey = () => `novart.notifications.${uid.value}`

/**
 * Écoute en temps réel les places proposées à la personne connectée : dès qu'une
 * place se libère pour elle, un message flottant la prévient (où qu'elle soit dans l'appli).
 */
export function startWatchers() {
  if (!uid.value || unsubscribers.length) return
  try { store.seenNotifications = JSON.parse(localStorage.getItem(seenKey()) || '[]') } catch { store.seenNotifications = [] }
  let first = true
  const stop = watchMyOffers(uid.value, list => {
    const known = new Set(store.offers.map(a => a.id))
    store.offers = list
    list.forEach(upsertActivity)
    const fresh = list.filter(a => activeOffer(a) && !known.has(a.id))
    if (fresh[0] && (!first || !store.seenNotifications.includes(offerKey(fresh[0]))))
      notify(`Une place s’est libérée pour «\u00a0${fresh[0].title}\u00a0» : confirme-la dans tes notifications.`, 6000, true)
    first = false
  }, () => { /* hors ligne : les notifications se mettront à jour au retour du réseau */ })
  unsubscribers.push(stop)
}

export type NotificationKind = 'offer' | 'waitlist' | 'reminder' | 'message'
export interface AppNotification { id: string; kind: NotificationKind; activity: Activity; atMs: number; group: 'activites' | 'messages' }
const offerKey = (a: Activity) => `offer:${a.id}:${a.offer?.expiresAtMs ?? 0}`
const REMINDER_MS = 48 * 3600 * 1000
const MESSAGE_WINDOW_MS = 7 * 24 * 3600 * 1000

/** Fil de notifications (écran Notifications), du plus récent au plus ancien. */
export const notifications = computed<AppNotification[]>(() => {
  const now = Date.now()
  const list: AppNotification[] = []
  const seen = new Set<string>()
  for (const a of [...store.offers, ...store.activities]) {
    if (seen.has(a.id)) continue
    seen.add(a.id)
    if (activeOffer(a, now)?.uid === uid.value) list.push({ id: offerKey(a), kind: 'offer', activity: a, atMs: a.offer?.offeredAtMs ?? now, group: 'activites' })
    if (waitlistOf(a).includes(uid.value)) list.push({ id: `waitlist:${a.id}`, kind: 'waitlist', activity: a, atMs: 0, group: 'activites' })
    const last = a.lastMessage
    if (last && isMember(a, uid.value) && !isPast(a) && (last.authorId ? last.authorId !== uid.value : last.authorName !== me.value.name) && now - last.sentAtMs < MESSAGE_WINDOW_MS)
      list.push({ id: `message:${a.id}:${last.sentAtMs}`, kind: 'message', activity: a, atMs: last.sentAtMs, group: 'messages' })
    const start = startsAt(a).getTime()
    if ((a.participantIds.includes(uid.value) || a.organizerId === uid.value) && !isPast(a) && start - now < REMINDER_MS)
      list.push({ id: `reminder:${a.id}`, kind: 'reminder', activity: a, atMs: start - REMINDER_MS, group: 'activites' })
  }
  // Places à confirmer d'abord, puis du plus récent au plus ancien ; les rangs en file d'attente à la fin.
  return list.sort((x, y) => Number(y.kind === 'offer') - Number(x.kind === 'offer') || y.atMs - x.atMs)
})
/** Pastille de la cloche : notifications jamais vues (la position dans la file n'en est pas une). */
export const unreadNotifications = computed(() => notifications.value.filter(n => n.kind !== 'waitlist' && !store.seenNotifications.includes(n.id)).length)
export function markNotificationsSeen() {
  const ids = notifications.value.map(n => n.id)
  if (ids.every(id => store.seenNotifications.includes(id))) return
  store.seenNotifications = [...new Set([...store.seenNotifications, ...ids])].slice(-200)
  try { localStorage.setItem(seenKey(), JSON.stringify(store.seenNotifications)) } catch { /* navigation privée */ }
}
