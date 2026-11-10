import { describe, expect, it, vi } from 'vitest'
import { activityIdeas, AiError, toIdeas } from '../src/services/ai'
import { coverOf, defaultCover, validateDraft, type ActivityDraft } from '../src/lib/activity'

const API = 'https://api.novart.test'
const reply = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))

describe('Idées d’activités par IA (Mistral via le Worker)', () => {
  it('envoie les mots-clés, la discipline et ses pratiques avec le jeton de connexion', async () => {
    const fetchImpl = reply(200, { ideas: [{ title: 'Aquarelle au parc', discipline: 'peinture', subDiscipline: 'aquarelle', description: 'Peindre ensemble.', level: 'debutant', equipment: 'Pinceaux', durationHours: 2 }] })
    const ideas = await activityIdeas({ keywords: ' aquarelle, parc ', discipline: 'peinture' }, 'jeton', API, fetchImpl as unknown as typeof fetch)
    expect(ideas).toEqual([{ title: 'Aquarelle au parc', discipline: 'peinture', subDiscipline: 'Aquarelle', description: 'Peindre ensemble.', level: 'debutant', equipment: 'Pinceaux', durationHours: 2 }])
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${API}/ai/activity-ideas`)
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer jeton')
    const body = JSON.parse(String(init.body))
    expect(body.keywords).toBe('aquarelle, parc')
    expect(body.practices).toContain('Aquarelle')
  })
  it('revérifie les idées avec le catalogue de l’application', () => {
    expect(toIdeas({ ideas: [{ title: 'X', discipline: 'cuisine', subDiscipline: 'Inventée', description: 'Y', level: 'expert', durationHours: 12 }, { title: '', description: 'sans titre' }] }))
      .toEqual([{ title: 'X', discipline: 'autre', subDiscipline: '', description: 'Y', level: 'tous', equipment: '', durationHours: 4 }])
  })
  it('transmet le code d’erreur et le délai d’attente', async () => {
    await expect(activityIdeas({ keywords: 'danse' }, 'jeton', API, reply(429, { error: 'too-many-requests', retryAfter: 600 }) as unknown as typeof fetch)).rejects.toMatchObject({ code: 'too-many-requests', retryAfter: 600 })
    await expect(activityIdeas({ keywords: 'danse' }, 'jeton', API, vi.fn(async () => { throw new TypeError('offline') }) as unknown as typeof fetch)).rejects.toMatchObject({ code: 'network' })
    await expect(activityIdeas({ keywords: 'danse' }, 'jeton', '')).rejects.toBeInstanceOf(AiError)
  })
})

describe('Illustrations par défaut', () => {
  const draft = { title: 'Atelier', discipline: 'danse', description: 'Danser ensemble.', coverUrl: '' } as ActivityDraft
  it('utilise la version claire de l’illustration de la discipline', () => {
    expect(defaultCover('danse')).toBe('/images/activities/danse-2.svg')
    expect(defaultCover('inconnue')).toBe('/images/activities/autre-2.svg')
    expect(coverOf(draft)).toBe('/images/activities/danse-2.svg')
    expect(coverOf({ ...draft, coverUrl: 'https://cdn.test/photo.webp' })).toBe('https://cdn.test/photo.webp')
  })
  it('la photo est facultative', () => {
    expect(validateDraft(draft, 2).coverUrl).toBeUndefined()
  })
})
