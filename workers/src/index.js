// API NOVART (Cloudflare Worker).
//
// POST /auth/email-link  { email, continueUrl }
//   Génère le lien de connexion Firebase avec le compte de service du projet et
//   l'envoie via Brevo avec l'e-mail NOVART (texte du directeur artistique).
//   Anti-abus par Cloudflare D1. Si ce service échoue, l'application revient
//   d'elle-même à l'envoi standard de Firebase (frontend/src/services/emailLink.ts).
// GET /health
//
// Secrets (jamais dans le dépôt) : FIREBASE_SERVICE_ACCOUNT (fichier JSON entier),
// BREVO_API_KEY, SENDER_EMAIL. Variables publiques : wrangler.toml.

import { ConfigError, readServiceAccount, signInLink, UpstreamError } from './google.js'
import { sendEmail } from './brevo.js'
import { signInEmail } from './email-template.js'
import { checkAndRecord } from './limits.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const origins = env => (env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)

function cors(origin, env) {
  return origins(env).includes(origin)
    ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'Origin' }
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const headers = cors(request.headers.get('origin') || '', env)
    if (url.pathname === '/health') return json({ status: 'ok' }, 200, headers)
    if (url.pathname === '/auth/email-link') {
      if (request.method === 'OPTIONS') return new Response(null, { status: Object.keys(headers).length ? 204 : 403, headers })
      if (request.method === 'POST') return emailLink(request, env, headers)
      return json({ error: 'method-not-allowed' }, 405, headers)
    }
    return json({ error: 'not-found' }, 404, headers)
  },
}
