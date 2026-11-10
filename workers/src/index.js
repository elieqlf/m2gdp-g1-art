// API NOVART (Cloudflare Worker).
//
// POST /auth/email-link  { email, continueUrl }
//   Génère le lien de connexion Firebase avec le compte de service du projet et
//   l'envoie via Brevo avec l'e-mail NOVART (texte du directeur artistique).
//   Anti-abus par Cloudflare D1. Si ce service échoue, l'application revient
//   d'elle-même à l'envoi standard de Firebase (frontend/src/services/emailLink.ts).
// POST /uploads/cover  (corps : l'image ; en-tête Authorization: Bearer <jeton Firebase>)
//   Photo de couverture d'une activité, stockée dans Cloudflare R2. Renvoie { url }.
// GET /files/covers/…  Lecture publique des photos.
// POST /ai/activity-ideas  { keywords, discipline?, practices? } (en-tête Authorization: Bearer <jeton Firebase>)
//   Trois idées d'activités culturelles proposées par Mistral Small (Cloudflare Workers AI). Renvoie { ideas }.
// GET /health
//
// Secrets (jamais dans le dépôt) : FIREBASE_SERVICE_ACCOUNT (fichier JSON entier),
// BREVO_API_KEY, SENDER_EMAIL, MISTRAL_API_KEY (facultatif). Variables publiques : wrangler.toml.

import { ConfigError, readServiceAccount, signInLink, UpstreamError } from './google.js'
import { sendEmail } from './brevo.js'
import { signInEmail } from './email-template.js'
import { checkAndRecord } from './limits.js'
import { AuthError, verifyIdToken } from './auth.js'
import { coverKey, isAllowedType, matchesType, MAX_BYTES, memberQuota, serveFile, uploadQuota } from './files.js'
import { activityIdeas, AI_LIMIT, aiConfigured, AiConfigError, AiQuotaError, AiUpstreamError, readRequest } from './ai.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const origins = env => (env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)

function cors(origin, env) {
  return origins(env).includes(origin)
    ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', 'access-control-max-age': '86400', vary: 'Origin' }
    : {}
}
const json = (body, status, headers = {}) => Response.json(body, { status, headers })

async function emailLink(request, env, headers) {
  const origin = request.headers.get('origin') || ''
  if (!origins(env).includes(origin)) return json({ error: 'origin-not-allowed' }, 403)
  let body
  try { body = await request.json() } catch { return json({ error: 'invalid-body' }, 400, headers) }
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  if (!EMAIL.test(email) || email.length > 254) return json({ error: 'invalid-email' }, 400, headers)
  // Le lien ne peut ramener que vers l'application NOVART (pas de redirection ouverte).
  let continueUrl
  try { continueUrl = new URL(body?.continueUrl) } catch { return json({ error: 'invalid-continue-url' }, 400, headers) }
  if (!origins(env).includes(continueUrl.origin)) return json({ error: 'invalid-continue-url' }, 400, headers)

  try {
    const account = readServiceAccount(env)
    const wait = await checkAndRecord(env.DB, { email, ip: request.headers.get('cf-connecting-ip'), salt: env.HASH_SALT || account.project_id })
      .catch(error => { console.warn('D1 indisponible, demande acceptée sans limite :', error.message); return 0 })
    if (wait) return json({ error: 'too-many-requests', retryAfter: wait }, 429, { ...headers, 'retry-after': String(wait) })
    const link = await signInLink(account, email, continueUrl.toString())
    const message = signInEmail(link, env.APP_URL)
    await sendEmail(env, { to: email, ...message })
    return json({ sent: true }, 202, headers)
  } catch (error) {
    // Jamais d'adresse e-mail dans les journaux.
    console.error('Envoi du lien impossible :', error.message)
    if (error instanceof ConfigError) return json({ error: 'not-configured' }, 503, headers)
    if (error instanceof UpstreamError) return json({ error: 'send-failed' }, 502, headers)
    return json({ error: 'internal' }, 500, headers)
  }
}

async function uploadCover(request, env, headers) {
  const origin = request.headers.get('origin') || ''
  if (!origins(env).includes(origin)) return json({ error: 'origin-not-allowed' }, 403)
  if (!env.FILES) return json({ error: 'not-configured' }, 503, headers)
  const projectId = env.FIREBASE_PROJECT_ID
  if (!projectId) return json({ error: 'not-configured' }, 503, headers)
  let uid
  try { uid = await verifyIdToken((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''), projectId) }
  catch (error) {
    if (error instanceof AuthError) return json({ error: 'unauthenticated' }, 401, headers)
    throw error
  }
  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (!isAllowedType(type)) return json({ error: 'unsupported-type' }, 415, headers)
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) return json({ error: 'too-large' }, 413, headers)
  const body = await request.arrayBuffer()
  if (body.byteLength === 0) return json({ error: 'empty' }, 400, headers)
  if (body.byteLength > MAX_BYTES) return json({ error: 'too-large' }, 413, headers)
  if (!matchesType(body, type)) return json({ error: 'unsupported-type' }, 415, headers)
  const wait = await uploadQuota(env.DB, uid, env.HASH_SALT || projectId)
    .catch(error => { console.warn('D1 indisponible, envoi accepté sans limite :', error.message); return 0 })
  if (wait) return json({ error: 'too-many-requests', retryAfter: wait }, 429, { ...headers, 'retry-after': String(wait) })
  const key = coverKey(uid, type)
  await env.FILES.put(key, body, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { uid } })
  return json({ url: new URL(`/files/${key}`, request.url).toString() }, 201, headers)
}

async function aiIdeas(request, env, headers) {
  const origin = request.headers.get('origin') || ''
  if (!origins(env).includes(origin)) return json({ error: 'origin-not-allowed' }, 403)
  const projectId = env.FIREBASE_PROJECT_ID
  if (!projectId || !aiConfigured(env)) return json({ error: 'not-configured' }, 503, headers)
  // Réservé aux membres connectés : le quota gratuit de Workers AI est partagé par toute l'appli.
  let uid
  try { uid = await verifyIdToken((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''), projectId) }
  catch (error) {
    if (error instanceof AuthError) return json({ error: 'unauthenticated' }, 401, headers)
    throw error
  }
  let body
  try { body = await request.json() } catch { return json({ error: 'invalid-body' }, 400, headers) }
  const input = readRequest(body)
  if (input.error) return json({ error: input.error }, 400, headers)
  const wait = await memberQuota(env.DB, 'ai', uid, env.HASH_SALT || projectId, AI_LIMIT)
    .catch(error => { console.warn('D1 indisponible, demande acceptée sans limite :', error.message); return 0 })
  if (wait) return json({ error: 'too-many-requests', retryAfter: wait }, 429, { ...headers, 'retry-after': String(wait) })
  try { return json({ ideas: await activityIdeas(env, input) }, 200, headers) }
  catch (error) {
    // Les mots-clés ne sont jamais journalisés.
    console.error('Idées IA impossibles :', error.message)
    if (error instanceof AiConfigError) return json({ error: 'not-configured' }, 503, headers)
    if (error instanceof AiQuotaError) return json({ error: 'daily-limit' }, 429, headers)
    if (error instanceof AiUpstreamError) return json({ error: 'ai-failed' }, 502, headers)
    throw error
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const headers = cors(request.headers.get('origin') || '', env)
    if (url.pathname === '/health') return json({ status: 'ok' }, 200, headers)
    if (url.pathname.startsWith('/files/') && (request.method === 'GET' || request.method === 'HEAD')) return serveFile(env.FILES, decodeURIComponent(url.pathname.slice('/files/'.length)), request)
    if (url.pathname === '/uploads/cover') {
      if (request.method === 'OPTIONS') return new Response(null, { status: Object.keys(headers).length ? 204 : 403, headers })
      if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405, headers)
      try { return await uploadCover(request, env, headers) }
      catch (error) { console.error('Envoi de photo impossible :', error.message); return json({ error: 'internal' }, 500, headers) }
    }
    if (url.pathname === '/ai/activity-ideas') {
      if (request.method === 'OPTIONS') return new Response(null, { status: Object.keys(headers).length ? 204 : 403, headers })
      if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405, headers)
      try { return await aiIdeas(request, env, headers) }
      catch (error) { console.error('Idées IA impossibles :', error.message); return json({ error: 'internal' }, 500, headers) }
    }
    if (url.pathname === '/auth/email-link') {
      if (request.method === 'OPTIONS') return new Response(null, { status: Object.keys(headers).length ? 204 : 403, headers })
      if (request.method === 'POST') return emailLink(request, env, headers)
      return json({ error: 'method-not-allowed' }, 405, headers)
    }
    return json({ error: 'not-found' }, 404, headers)
  },
}
