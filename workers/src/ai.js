// Idées d'activités culturelles générées par Mistral à partir de mots-clés (POST /ai/activity-ideas).
// La clé MISTRAL_API_KEY est un secret Cloudflare : elle ne passe jamais par l'application.
// La réponse du modèle est relue et bornée ici (disciplines et niveaux connus, longueurs
// maximales des champs du formulaire NOVART) avant d'être renvoyée.

export class AiConfigError extends Error {}
export class AiUpstreamError extends Error {}

export const DISCIPLINES = ['peinture', 'dessin', 'musique', 'chant', 'danse', 'theatre', 'photo', 'street-art', 'artisanat', 'ecriture', 'arts-plastiques', 'autre']
export const LEVELS = ['tous', 'debutant', 'intermediaire', 'avance']
export const AI_LIMIT = { max: 20, windowMs: 3600_000 }
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'
const MAX_IDEAS = 3

const clean = (value, max) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''

/** Vérifie la demande de l'application. Renvoie { keywords, discipline, practices } ou une erreur. */
export function readRequest(body) {
  const keywords = clean(body?.keywords, 120)
  if (keywords.length < 2) return { error: 'invalid-keywords' }
  const discipline = DISCIPLINES.includes(body?.discipline) ? body.discipline : ''
  const practices = Array.isArray(body?.practices) ? body.practices.map(p => clean(p, 40)).filter(Boolean).slice(0, 15) : []
  return { keywords, discipline, practices }
}

export function buildMessages({ keywords, discipline, practices }) {
  const system = [
    'Tu es l’assistant de NOVART, une application qui réunit des passionnés de pratiques artistiques autour d’activités dans la Métropole de Lyon.',
    'Tu proposes des idées d’activités culturelles concrètes, conviviales et réalisables en petit groupe (4 à 20 personnes), dans un lieu public ou associatif : parc, médiathèque, café associatif, musée, atelier partagé.',
    'Tu écris en français, en tutoyant, sur un ton chaleureux. Tu n’inventes ni date, ni prix, ni adresse précise, ni nom de personne.',
    'Tu réponds uniquement par un objet JSON de la forme {"ideas": [...]}, sans texte autour.',
  ].join(' ')
  const user = [
    `Mots-clés de l’organisateur : « ${keywords} ».`,
    discipline ? `Discipline choisie : ${discipline}.` : `Discipline : choisis la plus adaptée parmi ${DISCIPLINES.join(', ')}.`,
    practices.length ? `Pratiques possibles pour "subDiscipline" (sinon chaîne vide) : ${practices.join(' ; ')}.` : 'Laisse "subDiscipline" vide si aucune pratique précise ne s’impose.',
    `Propose ${MAX_IDEAS} idées différentes. Chaque idée : {"title": titre accrocheur de 60 caractères maximum, "discipline": un identifiant parmi ${DISCIPLINES.join(', ')}, "subDiscipline": texte court, "description": 2 à 4 phrases (objectif, déroulement, ambiance), 450 caractères maximum, "level": un parmi ${LEVELS.join(', ')}, "equipment": matériel à prévoir, 200 caractères maximum, "durationHours": nombre entier de 1 à 4}.`,
  ].join('\n')
  return [{ role: 'system', content: system }, { role: 'user', content: user }]
}

/** Garde uniquement des idées utilisables telles quelles par le formulaire de création. */
export function sanitizeIdeas(raw, { discipline, practices }) {
  const list = Array.isArray(raw?.ideas) ? raw.ideas : Array.isArray(raw) ? raw : []
  return list.slice(0, MAX_IDEAS).map(item => {
    const chosen = discipline || (DISCIPLINES.includes(item?.discipline) ? item.discipline : 'autre')
    const sub = clean(item?.subDiscipline, 40)
    return {
      title: clean(item?.title, 60),
      discipline: chosen,
      subDiscipline: practices.length ? (practices.find(p => p.toLowerCase() === sub.toLowerCase()) ?? '') : sub,
      description: clean(item?.description, 500),
      level: LEVELS.includes(item?.level) ? item.level : 'tous',
      equipment: clean(item?.equipment, 300),
      durationHours: Math.min(4, Math.max(1, Math.round(Number(item?.durationHours) || 2))),
    }
  }).filter(idea => idea.title && idea.description)
}

export async function activityIdeas(env, request, fetchImpl = fetch) {
  if (!env.MISTRAL_API_KEY) throw new AiConfigError('MISTRAL_API_KEY manquant')
  let response
  try {
    response = await fetchImpl(MISTRAL_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.MISTRAL_API_KEY}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ model: env.MISTRAL_MODEL || 'mistral-small-latest', messages: buildMessages(request), response_format: { type: 'json_object' }, temperature: 0.8, max_tokens: 1400 }),
      signal: AbortSignal.timeout(25_000),
    })
  } catch (error) { throw new AiUpstreamError(`Mistral injoignable : ${error.message}`) }
  if (!response.ok) throw new AiUpstreamError(`Mistral a répondu ${response.status}`)
  const data = await response.json().catch(() => null)
  let parsed
  try { parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? '') } catch { throw new AiUpstreamError('Réponse de Mistral illisible') }
  const ideas = sanitizeIdeas(parsed, request)
  if (!ideas.length) throw new AiUpstreamError('Aucune idée exploitable')
  return ideas
}
