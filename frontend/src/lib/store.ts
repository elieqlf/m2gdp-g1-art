import { computed, reactive } from 'vue'
import { listMembers, setFavorite, type Account, type Member, type Profile } from '@/services/firebase'
import { getActivity, listActivities } from '@/services/activities'
import { LYON_CENTER, type Activity, type Point } from '@/lib/activity'

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
  Object.assign(store, { account: null, profile: {}, activities: [], activitiesStatus: 'idle', members: {}, membersStatus: 'idle', gps: null, gpsStatus: 'idle', notice: '' })
}
let noticeTimer: ReturnType<typeof setTimeout> | undefined
/** Message de confirmation éphémère (« Activité publiée », etc.). */
export function notify(text: string, duration = 3500) {
  store.notice = text
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { store.notice = '' }, duration)
}
/** Message flottant quand la position de l'appareil n'a pas pu être obtenue. */
export function notifyPositionFallback() {
  const where = typeof store.profile.addressLat === 'number' ? 'ton adresse' : 'le centre de Lyon'
  notify(store.gpsStatus === 'denied'
    ? `Localisation désactivée : les distances partent de ${where}. Tu peux l’autoriser dans les réglages de ton navigateur.`
    : `Position introuvable : les distances partent de ${where}.`, 6000)
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
