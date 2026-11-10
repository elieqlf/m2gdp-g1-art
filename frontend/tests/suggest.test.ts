import { describe, expect, it } from 'vitest'
import { fold, highlight, match, suggest } from '../src/lib/suggest'
import type { Activity } from '../src/lib/activity'

const now = new Date('2026-11-10T10:00:00')
let n = 0
const make = (patch: Partial<Activity>): Activity => ({
  id: `a${++n}`, title: 'Atelier', discipline: 'peinture', subDiscipline: 'Aquarelle', description: '', level: 'tous', coverUrl: '', placeName: 'Parc de la Tête d’Or',
  address: '', district: 'Brotteaux, Lyon 6e', lat: null, lng: null, date: '2026-11-20', startTime: '14:00', endTime: '16:00', capacity: 8, participantIds: [],
  organizerId: 'o', organizerName: 'Org', createdAtMs: 0, ...patch,
})
const activities = [
  make({ title: 'Aquarelle au bord de l’eau', date: '2026-11-14' }),
  make({ title: 'Atelier peinture libre', date: '2026-11-12' }),
  make({ title: 'Atelier peinture libre', date: '2026-11-26' }),
  make({ title: 'Initiation danse contemporaine', discipline: 'danse', subDiscipline: 'Contemporaine', placeName: 'Théâtre de la Croix-Rousse', district: 'Croix-Rousse, Lyon 4e' }),
  make({ title: 'Théâtre d’impro', discipline: 'theatre', subDiscipline: 'Improvisation', date: '2026-11-01' }), // passée
]

describe('autocomplétion de la recherche', () => {
  it('ignore accents et majuscules, et surligne au bon endroit', () => {
    expect(fold('Théâtre').folded).toBe('theatre')
    const hit = match('Théâtre de la Croix-Rousse', 'theatre')!
    expect(hit.score).toBe(0)
    expect(highlight('Théâtre de la Croix-Rousse', hit.ranges)).toEqual([{ text: 'Théâtre', hit: true }, { text: ' de la Croix-Rousse', hit: false }])
    expect(match('Initiation danse contemporaine', 'contemp')).toMatchObject({ score: 1 })
    expect(match('Croix-Rousse', 'rousse')).toMatchObject({ score: 1, ranges: [[6, 12]] })
    expect(match('Aquarelle', 'rel')).toMatchObject({ score: 2 })
    expect(match('Atelier peinture libre', 'libre atelier')).toMatchObject({ score: 3 })
    expect(match('Atelier', 'zz')).toBeNull()
  })
  it('attend au moins deux lettres', () => {
    expect(suggest(activities, 'a', now)).toEqual([])
  })
  it('propose les activités à venir, en ouvrant la fiche ou en cherchant toutes les dates', () => {
    const list = suggest(activities, 'atel', now)
    expect(list[0]).toMatchObject({ kind: 'title', value: 'Atelier peinture libre', detail: expect.stringContaining('2 dates à venir') })
    const single = suggest(activities, 'aquarelle au', now)[0]
    expect(single).toMatchObject({ kind: 'activity', label: 'Aquarelle au bord de l’eau', detail: expect.stringContaining('Parc de la Tête d’Or') })
    // Les activités passées ne sont jamais proposées.
    expect(suggest(activities, 'impro', now).some(s => s.label === 'Théâtre d’impro')).toBe(false)
  })
  it('propose disciplines, pratiques et lieux avec le nombre d’activités', () => {
    const list = suggest(activities, 'dans', now)
    expect(list).toContainEqual(expect.objectContaining({ kind: 'discipline', id: 'danse', label: 'Danse', detail: '1 activité à venir' }))
    expect(suggest(activities, 'aquar', now)).toContainEqual(expect.objectContaining({ kind: 'practice', value: 'Aquarelle', detail: 'Peinture · 3 activités' }))
    const places = suggest(activities, 'croix', now).filter(item => item.kind === 'place')
    expect(places).toEqual([
      expect.objectContaining({ value: 'Croix-Rousse', detail: 'Quartier · Lyon 4e · 1 activité' }),
      expect.objectContaining({ value: 'Théâtre de la Croix-Rousse', detail: 'Lieu · 1 activité' }),
    ])
    expect(suggest(activities, 'brott', now)).toContainEqual(expect.objectContaining({ kind: 'place', value: 'Brotteaux', detail: 'Quartier · Lyon 6e · 3 activités' }))
  })
})
