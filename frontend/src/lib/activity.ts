import catalog from '@/data/catalog.json'

export type LevelId = 'tous' | 'debutant' | 'intermediaire' | 'avance'
export interface LastMessage { text: string; authorName: string; authorId?: string; sentAtMs: number }
/** Place libérée proposée à la première personne de la liste d'attente, à confirmer avant expiration. */
export interface Offer { uid: string; expiresAtMs: number; offeredAtMs?: number }
export interface Activity {
  id: string
  title: string
  discipline: string
  subDiscipline?: string
  description: string
  level: LevelId
  equipment?: string
  coverUrl: string
  placeName: string
  address: string
  district?: string
  lat: number | null
  lng: number | null
  date: string // AAAA-MM-JJ
  startTime: string // HH:MM
  endTime: string
  capacity: number
  participantIds: string[]
  /** Liste d'attente, dans l'ordre d'inscription. */
  waitlistIds?: string[]
  offer?: Offer | null
  organizerId: string
  organizerName: string
  organizerPhoto?: string
  status?: 'published'
  createdAtMs: number
  lastMessage?: LastMessage | null
  demo?: boolean
}
export type ActivityDraft = Pick<Activity, 'title' | 'discipline' | 'subDiscipline' | 'description' | 'level' | 'equipment' | 'coverUrl' | 'placeName' | 'address' | 'district' | 'lat' | 'lng' | 'date' | 'startTime' | 'endTime' | 'capacity'>

export const disciplines = catalog.disciplines
export const levels = catalog.levels as { id: LevelId; label: string }[]
export const templates = catalog.templates
export const venueTypes = catalog.venueTypes
export const disciplineLabel = (id: string) => disciplines.find(d => d.id === id)?.label ?? 'Autre'
export const levelLabel = (id: string) => levels.find(l => l.id === id)?.label ?? 'Tous niveaux'
export const defaultCover = (discipline: string, variant = 1) => `/images/activities/${disciplines.some(d => d.id === discipline) ? discipline : 'autre'}-${variant}.svg`

/** Centre de Lyon (place Bellecour), utilisé quand le profil n'a pas de coordonnées. */
export const LYON_CENTER = { lat: 45.7578, lng: 4.832 }
export interface Point { lat: number; lng: number }

export function distanceKm(a: Point, b: Point) {
  const rad = (deg: number) => deg * Math.PI / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}
export const activityDistance = (activity: Activity, origin: Point) =>
  typeof activity.lat === 'number' && typeof activity.lng === 'number' ? distanceKm(origin, { lat: activity.lat, lng: activity.lng }) : null
export function formatDistance(km: number | null) {
  if (km === null) return ''
  if (km < 1) return `${Math.max(50, Math.round(km * 20) * 50)} m`
  return `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`
}

// Une place proposée à quelqu'un de la liste d'attente reste réservée jusqu'à son expiration.
export const activeOffer = (a: Activity, now = Date.now()) => a.offer && a.offer.expiresAtMs > now ? a.offer : null
export const placesLeft = (a: Activity, now = Date.now()) => Math.max(0, a.capacity - a.participantIds.length - (activeOffer(a, now) ? 1 : 0))
export const isFull = (a: Activity, now = Date.now()) => placesLeft(a, now) === 0
export const isMember = (a: Activity, uid?: string) => !!uid && (a.organizerId === uid || a.participantIds.includes(uid))
export const waitlistOf = (a: Activity) => a.waitlistIds ?? []
/** Inscription directe : seulement s'il reste une place et que personne n'attend (sinon la file est prioritaire). */
export const canJoinDirectly = (a: Activity, now = Date.now()) => !isFull(a, now) && waitlistOf(a).length === 0
/** Une place libre attend d'être proposée (offre expirée ou désistement pendant une offre). */
export const queueNeedsRefresh = (a: Activity, now = Date.now()) => !activeOffer(a, now) && (!!a.offer || (waitlistOf(a).length > 0 && a.participantIds.length < a.capacity))
/** Rang dans la liste d'attente (1 = prochain servi), 0 si absent. */
export const waitlistPosition = (a: Activity, uid?: string) => uid ? waitlistOf(a).indexOf(uid) + 1 : 0
export const hasOfferFor = (a: Activity, uid?: string, now = Date.now()) => !!uid && activeOffer(a, now)?.uid === uid
export const OFFER_DELAY_MS = 24 * 3600 * 1000
/** Délai pour confirmer : 24 h, sans dépasser le début de l'activité. */
export const offerDeadline = (a: Pick<Activity, 'date' | 'startTime'>, now = Date.now()) =>
  Math.max(now + 3600 * 1000, Math.min(now + OFFER_DELAY_MS, new Date(`${a.date}T${a.startTime || '00:00'}:00`).getTime()))
/** Échéance lisible : « aujourd’hui à 18h30 », « demain à 9h » ou « le 12 nov. à 14h ». */
export function deadlineLabel(ms: number, now = Date.now()) {
  const d = new Date(ms)
  const time = shortHour(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`)
  const today = toIsoDay(new Date(now))
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  if (toIsoDay(d) === today) return `aujourd’hui à ${time}`
  if (toIsoDay(d) === toIsoDay(tomorrow)) return `demain à ${time}`
  return `le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(d)} à ${time}`
}
export const startsAt = (a: Activity) => new Date(`${a.date}T${a.startTime || '00:00'}:00`)
export const isPast = (a: Activity, now = new Date()) => new Date(`${a.date}T${a.endTime || '23:59'}:00`) < now

const pad = (n: number) => String(n).padStart(2, '0')
export const toIsoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayDate = (iso: string) => new Date(`${iso}T12:00:00`)
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** « Sam. 12 avr. » */
export function shortDay(iso: string) {
  const d = dayDate(iso)
  const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d)
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d)
  return `${capitalize(day.endsWith('.') ? day : day + '.')} ${d.getDate()} ${month}`
}
/** « Samedi 12 avril 2026 » */
export const longDay = (iso: string) => capitalize(new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dayDate(iso)))
/** Bloc date des cartes « Mes activités » : SAM / 12 / AVR. */
export function dateBlock(iso: string) {
  const d = dayDate(iso)
  return { weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d).replace('.', '').toUpperCase(), day: d.getDate(), month: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d).toUpperCase() }
}
/** « 14h – 17h » ou « 14h30 – 17h » */
export const shortHour = (time: string) => { const [h, m] = time.split(':'); return `${Number(h)}h${m && m !== '00' ? m : ''}` }
export const timeRange = (a: Pick<Activity, 'startTime' | 'endTime'>) => `${shortHour(a.startTime)} – ${shortHour(a.endTime)}`
export const clockRange = (a: Pick<Activity, 'startTime' | 'endTime'>) => `${a.startTime} – ${a.endTime}`
export function relativeTime(ms: number, now = Date.now()) {
  const date = new Date(ms)
  if (toIsoDay(date) === toIsoDay(new Date(now))) return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  if (toIsoDay(date) === toIsoDay(yesterday)) return 'Hier'
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

/** « À l’instant », « Il y a 5 min », « Il y a 3 h », « Il y a 2 jours » (maquette 13). */
export function agoLabel(ms: number, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - ms) / 60000))
  if (minutes < 1) return 'À l’instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Il y a ${hours} h`
  const days = Math.round(hours / 24)
  return days < 7 ? `Il y a ${days} jour${days > 1 ? 's' : ''}` : `Le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(ms))}`
}
/** « dans 2 heures », « dans 35 minutes », « demain à 9h » : pour les rappels d'activité. */
export function startsInLabel(a: Activity, now = Date.now()) {
  const minutes = Math.round((startsAt(a).getTime() - now) / 60000)
  if (minutes <= 0) return 'a commencé'
  if (minutes < 60) return `commence dans ${minutes} minute${minutes > 1 ? 's' : ''}`
  if (minutes < 12 * 60) { const h = Math.round(minutes / 60); return `commence dans ${h} heure${h > 1 ? 's' : ''}` }
  return `commence ${deadlineLabel(startsAt(a).getTime(), now)}`
}

export type DatePreset = 'toutes' | 'aujourdhui' | 'semaine' | 'weekend'
export type PlacesPreset = 'tous' | '1-5' | '6-10' | '10+'
export type SortKey = 'proximite' | 'date' | 'popularite'
export interface Filters {
  query: string
  disciplines: string[]
  datePreset: DatePreset
  day: string // date précise (AAAA-MM-JJ), prioritaire sur le préréglage
  radiusKm: number // 50 = sans limite
  places: PlacesPreset
  level: LevelId
  sort: SortKey
}
export const defaultFilters = (): Filters => ({ query: '', disciplines: [], datePreset: 'toutes', day: '', radiusKm: 50, places: 'tous', level: 'tous', sort: 'proximite' })
export const activeFilterCount = (f: Filters) =>
  f.disciplines.length + (f.datePreset !== 'toutes' || f.day ? 1 : 0) + (f.radiusKm < 50 ? 1 : 0) + (f.places !== 'tous' ? 1 : 0) + (f.level !== 'tous' ? 1 : 0)

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
function inDateWindow(a: Activity, f: Filters, now: Date) {
  if (f.day) return a.date === f.day
  const today = toIsoDay(now)
  if (f.datePreset === 'aujourdhui') return a.date === today
  if (f.datePreset === 'semaine') { const end = new Date(now); end.setDate(end.getDate() + 7); return a.date >= today && a.date <= toIsoDay(end) }
  if (f.datePreset === 'weekend') {
    const sat = new Date(now); sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7))
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1)
    const start = now.getDay() === 0 ? today : toIsoDay(sat)
    return a.date >= start && a.date <= toIsoDay(now.getDay() === 0 ? now : sun)
  }
  return true
}
function matchesPlaces(a: Activity, preset: PlacesPreset) {
  const left = placesLeft(a)
  if (preset === '1-5') return left >= 1 && left <= 5
  if (preset === '6-10') return left >= 6 && left <= 10
  if (preset === '10+') return left > 10
  return true
}
/** Recherche et filtres (US-04/US-05) : seules les activités à venir sont proposées. */
export function filterActivities(list: Activity[], f: Filters, origin: Point, now = new Date()) {
  const words = normalize(f.query.trim()).split(/\s+/).filter(Boolean)
  const results = list.filter(a => {
    if (isPast(a, now)) return false
    if (f.disciplines.length && !f.disciplines.includes(a.discipline)) return false
    if (!inDateWindow(a, f, now)) return false
    if (!matchesPlaces(a, f.places)) return false
    if (f.level !== 'tous' && a.level !== f.level && a.level !== 'tous') return false
    if (f.radiusKm < 50) { const d = activityDistance(a, origin); if (d === null || d > f.radiusKm) return false }
    if (words.length) {
      const haystack = normalize([a.title, a.description, a.placeName, a.address, a.district, disciplineLabel(a.discipline), a.subDiscipline, a.organizerName].filter(Boolean).join(' '))
      if (!words.every(w => haystack.includes(w))) return false
    }
    return true
  })
  return sortActivities(results, f.sort, origin)
}
export function sortActivities(list: Activity[], sort: SortKey, origin: Point) {
  const byDate = (a: Activity, b: Activity) => startsAt(a).getTime() - startsAt(b).getTime()
  return [...list].sort((a, b) => {
    if (sort === 'date') return byDate(a, b)
    if (sort === 'popularite') return b.participantIds.length - a.participantIds.length || byDate(a, b)
    return (activityDistance(a, origin) ?? 999) - (activityDistance(b, origin) ?? 999) || byDate(a, b)
  })
}

export interface DraftErrors { [field: string]: string }
/** Validation du formulaire de création / modification (US-07/US-08). */
export function validateDraft(d: ActivityDraft, step: 1 | 2 | 3 | 'all', registered = 0, now = new Date()): DraftErrors {
  const e: DraftErrors = {}
  if (step === 1 || step === 'all') {
    if (!d.title.trim()) e.title = 'Donne un titre à ton activité.'
    else if (d.title.trim().length > 60) e.title = 'Le titre ne doit pas dépasser 60 caractères.'
    if (!d.discipline) e.discipline = 'Choisis une discipline.'
    if (!d.description.trim()) e.description = 'Décris ton activité en quelques mots.'
    else if (d.description.length > 500) e.description = 'La description ne doit pas dépasser 500 caractères.'
    if ((d.equipment || '').length > 300) e.equipment = 'Le matériel ne doit pas dépasser 300 caractères.'
  }
  if (step === 2 || step === 'all') {
    if (!d.coverUrl) e.coverUrl = 'Choisis une photo principale.'
    else if (!d.coverUrl.startsWith('/images/') && !/^https:\/\/\S+$/i.test(d.coverUrl)) e.coverUrl = 'Le lien de la photo doit commencer par https://.'
  }
  if (step === 3 || step === 'all') {
    if (!d.placeName.trim() && !d.address.trim()) e.place = 'Indique le lieu de l’activité.'
    if (!d.date) e.date = 'Choisis une date.'
    else if (d.date < toIsoDay(now)) e.date = 'La date doit être aujourd’hui ou plus tard.'
    if (!d.startTime) e.startTime = 'Indique l’heure de début.'
    if (!d.endTime) e.endTime = 'Indique l’heure de fin.'
    else if (d.startTime && d.endTime <= d.startTime) e.endTime = 'L’heure de fin doit suivre l’heure de début.'
    if (!Number.isInteger(d.capacity) || d.capacity < 2) e.capacity = 'Prévois au moins 2 places.'
    else if (d.capacity > 100) e.capacity = '100 places maximum.'
    else if (d.capacity < registered) e.capacity = `Tu ne peux pas mettre moins de places que le nombre de personnes déjà inscrites (${registered}).`
  }
  return e
}
