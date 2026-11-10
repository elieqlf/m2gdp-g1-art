// Envoi d'une photo de couverture à l'API NOVART (Cloudflare Worker → R2).
import { AUTH_API_URL } from './emailLink'

export class UploadError extends Error {
  code: string
  constructor(code: string) { super(code); this.code = code }
}
export const uploadsEnabled = () => !!AUTH_API_URL
/** Photo stockée par l'API (et non lien collé par l'organisateur). */
export const isUploadedFile = (url: string) => !!AUTH_API_URL && url.startsWith(`${AUTH_API_URL}/files/`)

export async function uploadCover(image: Blob, token: string, apiUrl = AUTH_API_URL, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (!apiUrl) throw new UploadError('not-configured')
  let response: Response
  try {
    response = await fetchImpl(`${apiUrl}/uploads/cover`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': image.type }, body: image })
  } catch { throw new UploadError('network') }
  const body = await response.json().catch(() => ({})) as { url?: string; error?: string }
  if (response.ok && body.url) return body.url
  throw new UploadError(body.error || `http-${response.status}`)
}
