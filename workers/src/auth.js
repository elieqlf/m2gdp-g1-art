// Vérification du jeton de connexion Firebase (ID token) envoyé par l'appli :
// signature RS256 avec les clés publiques de Google, projet, émetteur et dates.
// https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library

const KEYS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
let keys = { byKid: new Map(), expiresAt: 0 }
export const resetKeyCache = () => { keys = { byKid: new Map(), expiresAt: 0 } }
export class AuthError extends Error {}

const decode = part => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))))
const bytes = part => Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

async function publicKey(kid, now) {
  if (now >= keys.expiresAt || !keys.byKid.has(kid)) {
    const response = await fetch(KEYS_URL)
    if (!response.ok) throw new AuthError('clés Google indisponibles')
    const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') || '')?.[1] || 3600)
    const { keys: list = [] } = await response.json()
    const byKid = new Map()
    for (const jwk of list) byKid.set(jwk.kid, await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']))
    keys = { byKid, expiresAt: now + maxAge * 1000 }
  }
  const key = keys.byKid.get(kid)
  if (!key) throw new AuthError('clé de signature inconnue')
  return key
}

/** Renvoie l'uid de la personne connectée, ou lève AuthError. */
export async function verifyIdToken(token, projectId, now = Date.now()) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw new AuthError('jeton absent ou mal formé')
  let header, claims
  try { header = decode(parts[0]); claims = decode(parts[1]) } catch { throw new AuthError('jeton illisible') }
  if (header.alg !== 'RS256' || !header.kid) throw new AuthError('algorithme inattendu')
  const seconds = Math.floor(now / 1000)
  if (claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}`) throw new AuthError('jeton d’un autre projet')
  if (!claims.sub || typeof claims.sub !== 'string') throw new AuthError('jeton sans utilisateur')
  if (!(claims.exp > seconds) || claims.iat > seconds + 300 || claims.auth_time > seconds + 300) throw new AuthError('jeton expiré')
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', await publicKey(header.kid, now), bytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
  if (!valid) throw new AuthError('signature invalide')
  return claims.sub
}
