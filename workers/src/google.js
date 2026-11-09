// Lien de connexion Firebase généré côté serveur avec le compte de service du projet
// (équivalent de generateSignInWithEmailLink du SDK Admin, sans dépendance : WebCrypto + fetch).

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/identitytoolkit'
let cached = { token: '', expiresAt: 0 }

const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const encodeJson = value => base64url(new TextEncoder().encode(JSON.stringify(value)))

/** Clé de compte de service : le fichier JSON entier, stocké en secret (FIREBASE_SERVICE_ACCOUNT). */
export function readServiceAccount(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new ConfigError('FIREBASE_SERVICE_ACCOUNT manquant')
  const account = typeof env.FIREBASE_SERVICE_ACCOUNT === 'string' ? JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) : env.FIREBASE_SERVICE_ACCOUNT
  if (!account.client_email || !account.private_key || !account.project_id) throw new ConfigError('compte de service incomplet')
  return account
}
export class ConfigError extends Error {}
export class UpstreamError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

async function importPrivateKey(pem) {
  const body = pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(body), c => c.charCodeAt(0))
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
}

/** Jeton d'accès OAuth 2 (JWT signé RS256 échangé contre un jeton), mis en cache jusqu'à expiration. */
export async function accessToken(account, now = Date.now()) {
  if (cached.token && cached.expiresAt - 60_000 > now) return cached.token
  const issuedAt = Math.floor(now / 1000)
  const unsigned = `${encodeJson({ alg: 'RS256', typ: 'JWT' })}.${encodeJson({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat: issuedAt, exp: issuedAt + 3600 })}`
  const key = await importPrivateKey(account.private_key)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${base64url(signature)}` }),
  })
  if (!response.ok) throw new UpstreamError(`jeton Google refusé (${response.status})`, response.status)
  const data = await response.json()
  cached = { token: data.access_token, expiresAt: now + (Number(data.expires_in) || 3600) * 1000 }
  return cached.token
}
export const resetTokenCache = () => { cached = { token: '', expiresAt: 0 } }

/** Lien magique Firebase (mode=signIn) pour cette adresse, sans que Firebase n'envoie d'e-mail. */
export async function signInLink(account, email, continueUrl) {
  const token = await accessToken(account)
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${account.project_id}/accounts:sendOobCode`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ requestType: 'EMAIL_SIGNIN', email, continueUrl, canHandleCodeInApp: true, returnOobLink: true }),
  })
  if (!response.ok) throw new UpstreamError(`lien Firebase refusé (${response.status})`, response.status)
  const data = await response.json()
  if (!data.oobLink) throw new UpstreamError('lien Firebase absent de la réponse', 502)
  return data.oobLink
}
