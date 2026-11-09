// Envoi du lien de connexion par l'API NOVART (Cloudflare Worker + Brevo) : e-mail
// aux couleurs de NOVART. Si l'API n'est pas configurée ou ne répond pas, l'appelant
// revient à l'envoi standard de Firebase : la connexion ne dépend jamais du Worker.

export class TooManyRequestsError extends Error {
  retryAfter: number
  constructor(retryAfter: number) { super('Trop de demandes de lien.'); this.retryAfter = retryAfter }
}
export class InvalidEmailError extends Error {}

/** URL de l'API (frontend/.env.production) ; vide = envoi Firebase uniquement. */
export const AUTH_API_URL: string = (import.meta.env.VITE_AUTH_API_URL ?? '').replace(/\/$/, '')
const TIMEOUT_MS = 8000

/**
 * Renvoie true si l'e-mail NOVART est parti, false s'il faut se rabattre sur Firebase.
 * Lève une erreur seulement quand se rabattre n'aurait pas de sens (adresse refusée,
 * trop de demandes).
 */
export async function sendLinkWithApi(email: string, continueUrl: string, apiUrl = AUTH_API_URL, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (!apiUrl) return false
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetchImpl(`${apiUrl}/auth/email-link`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, continueUrl }),
      signal: controller.signal,
    })
    if (response.ok) return true
    if (response.status === 429) {
      const body = await response.json().catch(() => ({})) as { retryAfter?: number }
      throw new TooManyRequestsError(Number(body.retryAfter) || 600)
    }
    if (response.status === 400) {
      const body = await response.json().catch(() => ({})) as { error?: string }
      if (body.error === 'invalid-email') throw new InvalidEmailError('Adresse e-mail refusée.')
    }
    return false
  } catch (error) {
    if (error instanceof TooManyRequestsError || error instanceof InvalidEmailError) throw error
    return false // réseau, délai dépassé, API en panne : repli Firebase
  } finally { clearTimeout(timer) }
}
