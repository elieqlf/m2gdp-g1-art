// Idées d'activités proposées par Mistral via l'API NOVART (Worker) : la clé Mistral reste côté serveur.
import { AUTH_API_URL } from './emailLink'
import { disciplines, levels, type ActivityDraft } from '@/lib/activity'

export interface ActivityIdea { title: string; discipline: string; subDiscipline: string; description: string; level: ActivityDraft['level']; equipment: string; durationHours: number }
export class AiError extends Error {
  code: string
  retryAfter: number
  constructor(code: string, retryAfter = 0) { super(code); this.code = code; this.retryAfter = retryAfter }
}
export const aiEnabled = () => !!AUTH_API_URL

/** Revérifie chaque idée avec le catalogue de l'application (discipline, pratique, niveau). */
export function toIdeas(raw: unknown): ActivityIdea[] {
  const list = Array.isArray((raw as { ideas?: unknown })?.ideas) ? (raw as { ideas: Record<string, unknown>[] }).ideas : []
  const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
  return list.map(item => {
    const discipline = disciplines.find(d => d.id === item.discipline) ?? disciplines.find(d => d.id === 'autre')!
    const sub = text(item.subDiscipline, 40)
    return {
      title: text(item.title, 60),
      discipline: discipline.id,
      subDiscipline: (discipline.subs ?? []).find((s: string) => s.toLowerCase() === sub.toLowerCase()) ?? '',
      description: text(item.description, 500),
      level: (levels.find(l => l.id === item.level)?.id ?? 'tous') as ActivityDraft['level'],
      equipment: text(item.equipment, 300),
      durationHours: Math.min(4, Math.max(1, Math.round(Number(item.durationHours) || 2))),
    }
  }).filter(idea => idea.title && idea.description)
}

export async function activityIdeas(input: { keywords: string; discipline?: string }, token: string, apiUrl = AUTH_API_URL, fetchImpl: typeof fetch = fetch): Promise<ActivityIdea[]> {
  if (!apiUrl) throw new AiError('not-configured')
  const practices = disciplines.find(d => d.id === input.discipline)?.subs ?? []
  let response: Response
  try {
    response = await fetchImpl(`${apiUrl}/ai/activity-ideas`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ keywords: input.keywords.trim(), discipline: input.discipline || undefined, practices }),
    })
  } catch { throw new AiError('network') }
  const body = await response.json().catch(() => ({})) as { ideas?: unknown; error?: string; retryAfter?: number }
  if (response.ok) {
    const ideas = toIdeas(body)
    if (ideas.length) return ideas
    throw new AiError('ai-failed')
  }
  throw new AiError(body.error || `http-${response.status}`, Number(body.retryAfter) || 0)
}
