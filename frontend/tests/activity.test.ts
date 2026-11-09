import { describe, expect, it } from 'vitest'
import { canJoinDirectly, defaultFilters, distanceKm, filterActivities, formatDistance, hasOfferFor, isPast, offerDeadline, placesLeft, queueNeedsRefresh, validateDraft, waitlistPosition, type Activity, type ActivityDraft } from '../src/lib/activity'
import * as queue from '../src/lib/waitlist'
import { parseRoute } from '../src/lib/router'

const now = new Date('2026-11-10T10:00:00')
const base: Activity = {
  id: 'a', title: 'Atelier peinture libre', discipline: 'peinture', description: 'Peindre ensemble', level: 'tous', coverUrl: '/images/activities/peinture-1.svg',
  placeName: 'Parc de la Tête d’Or', address: 'Boulevard des Belges, 69006 Lyon', lat: 45.7772, lng: 4.8558, date: '2026-11-14', startTime: '14:00', endTime: '17:00',
  capacity: 8, participantIds: ['u1', 'u2'], organizerId: 'o1', organizerName: 'Julie Martin', createdAtMs: 0,
}
const make = (changes: Partial<Activity>): Activity => ({ ...base, ...changes })
const bellecour = { lat: 45.7578, lng: 4.832 }

describe('distances', () => {
  it('calcule et formate la distance', () => {
    const km = distanceKm(bellecour, { lat: 45.7772, lng: 4.8558 })
    expect(km).toBeGreaterThan(2.5); expect(km).toBeLessThan(3.2)
    expect(formatDistance(0.43)).toBe('450 m')
    expect(formatDistance(2.84)).toBe('2,8 km')
    expect(formatDistance(null)).toBe('')
  })
})

describe('recherche et filtres (US-04/US-05)', () => {
  const list = [
    base,
    make({ id: 'b', title: 'Jam session acoustique', placeName: 'Le Hangar créatif', discipline: 'musique', date: '2026-11-10', startTime: '19:00', endTime: '22:00', lat: 45.7578, lng: 4.832, capacity: 15, participantIds: [] }),
    make({ id: 'c', title: 'Danse au parc', placeName: 'Parc de Parilly', discipline: 'danse', date: '2026-11-20', level: 'avance', lat: 45.73, lng: 4.98 }),
    make({ id: 'passee', date: '2026-11-01' }),
  ]
  it('ignore les activités passées et trie par proximité', () => {
    expect(filterActivities(list, defaultFilters(), bellecour, now).map(a => a.id)).toEqual(['b', 'a', 'c'])
  })
  it('cherche sans tenir compte des accents ni de la casse', () => {
    expect(filterActivities(list, { ...defaultFilters(), query: 'TÊTE d’or' }, bellecour, now).map(a => a.id)).toEqual(['a'])
    expect(filterActivities(list, { ...defaultFilters(), query: 'jam' }, bellecour, now).map(a => a.id)).toEqual(['b'])
  })
  it('combine discipline, date, rayon, places et niveau', () => {
    expect(filterActivities(list, { ...defaultFilters(), disciplines: ['musique', 'danse'] }, bellecour, now).map(a => a.id)).toEqual(['b', 'c'])
    expect(filterActivities(list, { ...defaultFilters(), datePreset: 'aujourdhui' }, bellecour, now).map(a => a.id)).toEqual(['b'])
    expect(filterActivities(list, { ...defaultFilters(), datePreset: 'weekend' }, bellecour, now).map(a => a.id)).toEqual(['a'])
    expect(filterActivities(list, { ...defaultFilters(), radiusKm: 5 }, bellecour, now).map(a => a.id)).toEqual(['b', 'a'])
    expect(filterActivities(list, { ...defaultFilters(), places: '10+' }, bellecour, now).map(a => a.id)).toEqual(['b'])
    expect(filterActivities(list, { ...defaultFilters(), level: 'debutant' }, bellecour, now).map(a => a.id)).toEqual(['b', 'a'])
  })
  it('trie par date ou par popularité', () => {
    expect(filterActivities(list, { ...defaultFilters(), sort: 'date' }, bellecour, now).map(a => a.id)).toEqual(['b', 'a', 'c'])
    expect(filterActivities(list, { ...defaultFilters(), sort: 'popularite' }, bellecour, now)[2]!.id).toBe('b')
  })
  it('considère une activité terminée après son heure de fin', () => {
    expect(isPast(make({ date: '2026-11-10', endTime: '09:00' }), now)).toBe(true)
    expect(isPast(make({ date: '2026-11-10', endTime: '12:00' }), now)).toBe(false)
  })
})

describe('validation du formulaire (US-07/US-08)', () => {
  const draft: ActivityDraft = { title: 'Atelier', discipline: 'peinture', description: 'Description', level: 'tous', equipment: '', coverUrl: '/images/activities/peinture-1.svg', placeName: 'Café des Arts', address: '', lat: null, lng: null, date: '2026-11-14', startTime: '14:00', endTime: '17:00', capacity: 8 }
  it('accepte un brouillon complet', () => { expect(validateDraft(draft, 'all', 0, now)).toEqual({}) })
  it('signale les champs obligatoires et incohérents', () => {
    const errors = validateDraft({ ...draft, title: ' ', discipline: '', date: '2026-11-01', endTime: '13:00', capacity: 1, coverUrl: 'http://exemple.fr/a.jpg' }, 'all', 0, now)
    expect(Object.keys(errors).sort()).toEqual(['capacity', 'coverUrl', 'date', 'discipline', 'endTime', 'title'])
  })
  it('refuse moins de places que d’inscrits', () => {
    expect(validateDraft({ ...draft, capacity: 5 }, 3, 6, now).capacity).toContain('déjà inscrites (6)')
  })
})

describe('navigation', () => {
  it('lit les routes et leurs paramètres', () => {
    expect(parseRoute('#/activite/abc/participation')).toEqual({ name: 'participation', id: 'abc', query: {} })
    expect(parseRoute('#/rechercher?q=peinture&vue=carte')).toEqual({ name: 'rechercher', query: { q: 'peinture', vue: 'carte' } })
    expect(parseRoute('#/conversations/xyz').name).toBe('conversation')
    expect(parseRoute('').name).toBe('decouvrir')
    expect(parseRoute('#/inconnu').name).toBe('decouvrir')
  })
})

// ——— Liste d'attente (sujet ART) ———
describe('liste d’attente', () => {
  const NOW = new Date('2026-11-09T10:00:00').getTime()
  const make = (patch: Partial<Activity> = {}): Activity => ({
    id: 'a1', title: 'Croquis', discipline: 'dessin', description: '', level: 'tous', coverUrl: '', placeName: '', address: '',
    lat: null, lng: null, date: '2026-11-20', startTime: '14:00', endTime: '16:00', capacity: 3,
    participantIds: ['p1', 'p2', 'p3'], waitlistIds: [], offer: null, organizerId: 'org', organizerName: 'Org', createdAtMs: 0, ...patch,
  })

  it('n’autorise l’inscription directe que s’il reste une place et que personne n’attend', () => {
    expect(canJoinDirectly(make(), NOW)).toBe(false)
    expect(canJoinDirectly(make({ participantIds: ['p1', 'p2'] }), NOW)).toBe(true)
    expect(canJoinDirectly(make({ participantIds: ['p1', 'p2'], waitlistIds: ['w1'] }), NOW)).toBe(false)
    // Une place proposée reste réservée jusqu'à son échéance.
    expect(placesLeft(make({ participantIds: ['p1', 'p2'], offer: { uid: 'w1', expiresAtMs: NOW + 1000 } }), NOW)).toBe(0)
    expect(placesLeft(make({ participantIds: ['p1', 'p2'], offer: { uid: 'w1', expiresAtMs: NOW - 1000 } }), NOW)).toBe(1)
  })

  it('ajoute en fin de file et refuse la file s’il reste des places', () => {
    expect(queue.wait(make({ waitlistIds: ['w1'] }), 'w2', NOW)).toEqual({ waitlistIds: ['w1', 'w2'] })
    expect(queue.wait(make({ waitlistIds: ['w1'] }), 'w1', NOW)).toBeNull()
    expect(() => queue.wait(make({ participantIds: ['p1'] }), 'w1', NOW)).toThrow(queue.PlacesLeftError)
    expect(waitlistPosition(make({ waitlistIds: ['w1', 'w2'] }), 'w2')).toBe(2)
  })

  it('propose la place libérée au premier de la file pour 24 h', () => {
    const patch = queue.leave(make({ waitlistIds: ['w1', 'w2'] }), 'p2', NOW)
    expect(patch).toEqual({ participantIds: ['p1', 'p3'], waitlistIds: ['w2'], offer: { uid: 'w1', expiresAtMs: NOW + 24 * 3600 * 1000, offeredAtMs: NOW } })
    expect(queue.leave(make(), 'p2', NOW)).toEqual({ participantIds: ['p1', 'p3'], offer: null, waitlistIds: [] })
  })

  it('raccourcit le délai quand l’activité commence avant 24 h, sans descendre sous une heure', () => {
    const soon = make({ date: '2026-11-09', startTime: '18:00' })
    expect(offerDeadline(soon, NOW)).toBe(new Date('2026-11-09T18:00:00').getTime())
    expect(offerDeadline(make({ date: '2026-11-09', startTime: '10:30' }), NOW)).toBe(NOW + 3600 * 1000)
  })

  it('confirme la place, ou la passe à la personne suivante', () => {
    const offered = make({ participantIds: ['p1', 'p3'], waitlistIds: ['w2'], offer: { uid: 'w1', expiresAtMs: NOW + 1000 } })
    expect(hasOfferFor(offered, 'w1', NOW)).toBe(true)
    expect(queue.accept(offered, 'w1', NOW)).toEqual({ participantIds: ['p1', 'p3', 'w1'], offer: null, waitlistIds: ['w2'] })
    expect(queue.decline(offered, 'w1', NOW)).toEqual({ waitlistIds: [], offer: { uid: 'w2', expiresAtMs: NOW + 24 * 3600 * 1000, offeredAtMs: NOW } })
    expect(() => queue.accept(offered, 'w2', NOW)).toThrow(queue.OfferExpiredError)
  })

  it('fait avancer la file quand l’échéance est dépassée', () => {
    const expired = make({ participantIds: ['p1', 'p3'], waitlistIds: ['w2'], offer: { uid: 'w1', expiresAtMs: NOW - 1 } })
    expect(() => queue.accept(expired, 'w1', NOW)).toThrow(queue.OfferExpiredError)
    expect(queueNeedsRefresh(expired, NOW)).toBe(true)
    expect(queue.refresh(expired, NOW)).toEqual({ waitlistIds: [], offer: { uid: 'w2', expiresAtMs: NOW + 24 * 3600 * 1000, offeredAtMs: NOW } })
    expect(queue.refresh(make({ participantIds: ['p1', 'p3'], offer: { uid: 'w1', expiresAtMs: NOW - 1 } }), NOW)).toEqual({ offer: null, waitlistIds: [] })
    expect(queue.refresh(make(), NOW)).toBeNull()
  })

  it('libère une place pendant une offre sans en proposer une seconde', () => {
    const offered = make({ participantIds: ['p1', 'p3'], waitlistIds: ['w2'], offer: { uid: 'w1', expiresAtMs: NOW + 1000 } })
    expect(queue.leave(offered, 'p1', NOW)).toEqual({ participantIds: ['p3'] })
    // À la confirmation, la place restante passe à la personne suivante.
    const after = { ...offered, participantIds: ['p3'] }
    expect(queue.accept(after, 'w1', NOW)).toEqual({ participantIds: ['p3', 'w1'], waitlistIds: [], offer: { uid: 'w2', expiresAtMs: NOW + 24 * 3600 * 1000, offeredAtMs: NOW } })
  })
})
