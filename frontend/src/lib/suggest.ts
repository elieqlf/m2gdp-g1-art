import { disciplineLabel, disciplines, isPast, startsAt, type Activity } from './activity'

// Autocomplétion de la recherche : activités à venir, disciplines et pratiques, lieux et quartiers.
// Tout est calculé dans le navigateur à partir des activités déjà chargées (pas d'appel réseau).

export type Range = [start: number, end: number]
export type Suggestion =
  | { kind: 'activity'; key: string; id: string; label: string; detail: string; discipline: string; ranges: Range[] }
  | { kind: 'title'; key: string; value: string; label: string; detail: string; discipline: string; ranges: Range[] }
  | { kind: 'discipline'; key: string; id: string; label: string; detail: string; discipline: string; ranges: Range[] }
  | { kind: 'practice'; key: string; value: string; label: string; detail: string; discipline: string; ranges: Range[] }
  | { kind: 'place'; key: string; value: string; label: string; detail: string; ranges: Range[] }
export type SuggestionGroup = 'Activités' | 'Disciplines' | 'Lieux'
export const groupOf = (s: Suggestion): SuggestionGroup => s.kind === 'activity' || s.kind === 'title' ? 'Activités' : s.kind === 'place' ? 'Lieux' : 'Disciplines'
export const MIN_CHARS = 2

/** Texte sans accents ni majuscules, avec la position d'origine de chaque caractère (pour surligner). */
export function fold(text: string) {
  let folded = ''
  const origin: number[] = []
  Array.from(text).reduce((index, char) => {
    const plain = char.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    for (const c of plain) { folded += c; origin.push(index) }
    return index + char.length
  }, 0)
  return { folded, origin }
}

/**
 * Pertinence d'un texte pour la requête : 0 = commence par la requête, 1 = un mot commence par
 * la requête, 2 = la contient, 3 = contient tous ses mots ; null sinon. Renvoie aussi les zones à surligner.
 */
export function match(text: string, query: string): { score: number; ranges: Range[] } | null {
  const q = fold(query.trim().replace(/\s+/g, ' ')).folded
  if (!q) return null
  const { folded, origin } = fold(text)
  const toRange = (start: number, length: number): Range => [origin[start]!, origin[start + length - 1]! + 1]
  const at = folded.indexOf(q)
  if (at === 0) return { score: 0, ranges: [toRange(0, q.length)] }
  const wordStart = folded.search(new RegExp(`(^|[\\s'’\\-(])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  // (le cas « commence par » est déjà traité : ici, la requête suit un séparateur)
  if (wordStart >= 0) return { score: 1, ranges: [toRange(wordStart + 1, q.length)] }
  if (at > 0) return { score: 2, ranges: [toRange(at, q.length)] }
  const words = q.split(' ').filter(w => w.length > 1)
  if (words.length > 1 && words.every(w => folded.includes(w))) return { score: 3, ranges: words.map(w => toRange(folded.indexOf(w), w.length)).sort((a, b) => a[0] - b[0]) }
  return null
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`
const dayLabel = (a: Activity) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(startsAt(a))

export function suggest(activities: Activity[], query: string, now = new Date(), limits = { activities: 5, disciplines: 3, places: 3 }): Suggestion[] {
  if (query.trim().length < MIN_CHARS) return []
  const upcoming = activities.filter(a => !isPast(a, now)).sort((a, b) => startsAt(a).getTime() - startsAt(b).getTime())

  // Activités : un même titre peut revenir à plusieurs dates ; on propose alors de les chercher toutes.
  const byTitle = new Map<string, Activity[]>()
  for (const a of upcoming) {
    const key = fold(a.title.trim()).folded
    byTitle.set(key, [...(byTitle.get(key) ?? []), a])
  }
  const activityHits: (Suggestion & { score: number; at: number })[] = []
  for (const [key, list] of byTitle) {
    const first = list[0]!
    const hit = match(first.title, query)
    if (!hit) continue
    const base = { label: first.title, discipline: first.discipline, ranges: hit.ranges, score: hit.score, at: startsAt(first).getTime() }
    activityHits.push(list.length === 1
      ? { ...base, kind: 'activity', key: `activite:${first.id}`, id: first.id, detail: `${dayLabel(first)} · ${first.placeName}` }
      : { ...base, kind: 'title', key: `titre:${key}`, value: first.title, detail: `${plural(list.length, 'date')} à venir · dès le ${dayLabel(first)}` })
  }

  // Disciplines et pratiques (sous-disciplines), avec le nombre d'activités à venir.
  const count = (keep: (a: Activity) => boolean) => upcoming.filter(keep).length
  const disciplineHits: (Suggestion & { score: number })[] = []
  for (const d of disciplines) {
    const hit = match(d.label, query)
    const n = count(a => a.discipline === d.id)
    if (hit && n) disciplineHits.push({ kind: 'discipline', key: `discipline:${d.id}`, id: d.id, label: d.label, discipline: d.id, detail: plural(n, 'activité') + ' à venir', ranges: hit.ranges, score: hit.score })
    for (const sub of d.subs) {
      const subHit = match(sub, query)
      const m = count(a => a.subDiscipline === sub)
      if (subHit && m) disciplineHits.push({ kind: 'practice', key: `pratique:${d.id}:${sub}`, value: sub, label: sub, discipline: d.id, detail: `${disciplineLabel(d.id)} · ${plural(m, 'activité')}`, ranges: subHit.ranges, score: subHit.score + 0.5 })
    }
  }

  // Lieux et quartiers où se déroulent des activités à venir.
  // Quartier au format « Croix-Rousse, Lyon 4e » : le quartier est proposé, l'arrondissement en détail.
  const places = new Map<string, { label: string; n: number; kind: string }>()
  for (const a of upcoming) {
    const [quarter = '', ...city] = (a.district ?? '').split(',').map(part => part.trim())
    for (const [label, kind] of [[a.placeName, 'Lieu'], [quarter, ['Quartier', ...city].join(' · ')]] as const) {
      if (!label) continue
      const key = fold(label).folded
      places.set(key, { label, n: (places.get(key)?.n ?? 0) + 1, kind })
    }
  }
  const placeHits: (Suggestion & { score: number; n: number })[] = []
  for (const [key, place] of places) {
    const hit = match(place.label, query)
    if (hit) placeHits.push({ kind: 'place', key: `lieu:${key}`, value: place.label, label: place.label, detail: `${place.kind} · ${plural(place.n, 'activité')}`, ranges: hit.ranges, score: hit.score, n: place.n })
  }

  const strip = <T extends { score: number }>({ score: _s, ...rest }: T) => rest as unknown as Suggestion
  return [
    ...activityHits.sort((a, b) => a.score - b.score || a.at - b.at).slice(0, limits.activities).map(({ at: _a, ...s }) => strip(s)),
    ...disciplineHits.sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, 'fr')).slice(0, limits.disciplines).map(strip),
    ...placeHits.sort((a, b) => a.score - b.score || b.n - a.n).slice(0, limits.places).map(({ n: _n, ...s }) => strip(s)),
  ]
}

/** Découpe un libellé en morceaux normaux et surlignés. */
export function highlight(label: string, ranges: Range[]) {
  const parts: { text: string; hit: boolean }[] = []
  let cursor = 0
  for (const [start, end] of ranges) {
    if (start < cursor) continue
    if (start > cursor) parts.push({ text: label.slice(cursor, start), hit: false })
    parts.push({ text: label.slice(start, end), hit: true })
    cursor = end
  }
  if (cursor < label.length) parts.push({ text: label.slice(cursor), hit: false })
  return parts
}
