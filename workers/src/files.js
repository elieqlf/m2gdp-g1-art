// Photos de couverture des activités (Cloudflare R2), envoyées par les membres connectés.
// L'appli réduit l'image avant l'envoi (WebP 1600 × 1000) ; le Worker revérifie tout.

import { fingerprint } from './limits.js'

export const MAX_BYTES = 2 * 1024 * 1024
export const UPLOAD_LIMIT = { max: 30, windowMs: 60 * 60_000 }
const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }

/** Le contenu correspond-il vraiment au type annoncé ? (signatures de fichier) */
export function matchesType(buffer, type) {
  const b = new Uint8Array(buffer.slice(0, 12))
  if (type === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  if (type === 'image/png') return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
  if (type === 'image/webp') return String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP'
  return false
}

/**
 * Quota par membre (table D1 upload_requests, empreinte salée de « type:uid », effacée après 1 h).
 * Renvoie le nombre de secondes à attendre si la limite est atteinte, sinon 0 (et compte la demande).
 */
export async function memberQuota(db, kind, uid, salt, limit, now = Date.now()) {
  if (!db) return 0
  const hash = await fingerprint(`${kind}:${uid}`, salt)
  await db.prepare('DELETE FROM upload_requests WHERE created_at < ?').bind(now - 60 * 60_000).run()
  const row = await db.prepare('SELECT COUNT(*) AS n, MIN(created_at) AS first FROM upload_requests WHERE uid_hash = ? AND created_at >= ?').bind(hash, now - limit.windowMs).first()
  if (Number(row?.n ?? 0) >= limit.max) return Math.max(1, Math.ceil((Number(row.first) + limit.windowMs - now) / 1000))
  await db.prepare('INSERT INTO upload_requests (uid_hash, created_at) VALUES (?, ?)').bind(hash, now).run()
  return 0
}
/** Nombre de secondes à attendre si la personne a trop envoyé de photos, sinon 0. */
export const uploadQuota = (db, uid, salt, now = Date.now()) => memberQuota(db, 'upload', uid, salt, UPLOAD_LIMIT, now)

export function coverKey(uid, type, now = Date.now()) {
  const random = [...crypto.getRandomValues(new Uint8Array(6))].map(n => n.toString(16).padStart(2, '0')).join('')
  return `covers/${uid}/${now}-${random}.${TYPES[type]}`
}
export const isAllowedType = type => Object.hasOwn(TYPES, type)

/** GET /files/covers/... : lecture publique (une couverture s'affiche à tous les membres). */
export async function serveFile(bucket, key, request) {
  if (!bucket) return new Response('Stockage non configuré', { status: 503 })
  if (!/^covers\/[A-Za-z0-9_-]{1,128}\/\d+-[0-9a-f]{12}\.(webp|jpg|png)$/.test(key)) return new Response('Introuvable', { status: 404 })
  const object = await bucket.get(key, { onlyIf: request.headers })
  if (!object) return new Response('Introuvable', { status: 404 })
  const headers = new Headers()
  object.writeHttpMetadata?.(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('x-content-type-options', 'nosniff')
  // Requête conditionnelle satisfaite (If-None-Match) : pas de corps.
  if (!('body' in object) || !object.body) return new Response(null, { status: 304, headers })
  return new Response(object.body, { headers })
}
