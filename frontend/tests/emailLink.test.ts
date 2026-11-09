import { describe, expect, it, vi } from 'vitest'
import { InvalidEmailError, sendLinkWithApi, TooManyRequestsError } from '../src/services/emailLink'

// L'e-mail NOVART passe par l'API ; tout échec technique renvoie vers l'envoi Firebase.
const API = 'https://projet-art-api.example.workers.dev'
const reply = (status: number, body: unknown = {}) => vi.fn(async () => new Response(JSON.stringify(body), { status }))

describe('envoi du lien par l’API NOVART', () => {
  it('appelle le Worker avec l’adresse et l’URL de retour', async () => {
    const fetchImpl = reply(202, { sent: true })
    expect(await sendLinkWithApi('camille@example.com', 'https://novart-app.web.app/login.html?remember=1', API, fetchImpl)).toBe(true)
    expect(fetchImpl).toHaveBeenCalledWith(`${API}/auth/email-link`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'camille@example.com', continueUrl: 'https://novart-app.web.app/login.html?remember=1' }) }))
  })
  it('se rabat sur Firebase si l’API n’est pas configurée, en panne ou injoignable', async () => {
    const unused = vi.fn()
    expect(await sendLinkWithApi('a@b.fr', 'https://x/login.html', '', unused)).toBe(false)
    expect(unused).not.toHaveBeenCalled()
    for (const status of [500, 502, 503, 403]) expect(await sendLinkWithApi('a@b.fr', 'https://x/login.html', API, reply(status))).toBe(false)
    expect(await sendLinkWithApi('a@b.fr', 'https://x/login.html', API, vi.fn(async () => { throw new TypeError('Failed to fetch') }))).toBe(false)
  })
  it('ne contourne pas la limite anti-abus', async () => {
    await expect(sendLinkWithApi('a@b.fr', 'https://x/login.html', API, reply(429, { retryAfter: 420 }))).rejects.toEqual(new TooManyRequestsError(420))
  })
  it('signale une adresse refusée', async () => {
    await expect(sendLinkWithApi('a@b', 'https://x/login.html', API, reply(400, { error: 'invalid-email' }))).rejects.toBeInstanceOf(InvalidEmailError)
  })
})
