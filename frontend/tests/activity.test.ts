import { describe, expect, it } from 'vitest'
import { defaultFilters, distanceKm, filterActivities, formatDistance, isPast, validateDraft, type Activity, type ActivityDraft } from '../src/lib/activity'
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
