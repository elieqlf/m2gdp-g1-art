import { describe, expect, it, vi } from 'vitest'
import { AccountDeletionError, deleteAccount, deletionErrorMessage, forgetLocalData } from '../src/services/account'

const API = 'https://projet-art-api.example.workers.dev'

describe('suppression de compte (US-23)', () => {
  it('demande la suppression à l’API avec le jeton et la confirmation explicite', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ deleted: true, activities: 1 }))
    await deleteAccount('jeton', API, fetchImpl)
    expect(fetchImpl).toHaveBeenCalledWith(`${API}/account/delete`, {
      method: 'POST',
      headers: { authorization: 'Bearer jeton', 'content-type': 'application/json' },
      body: JSON.stringify({ confirm: 'delete-account' }),
    })
  })
  it('traduit les refus en codes, puis en messages rassurants', async () => {
    await expect(deleteAccount('jeton', API, vi.fn(async () => Response.json({ error: 'unauthenticated' }, { status: 401 })))).rejects.toEqual(new AccountDeletionError('unauthenticated'))
    await expect(deleteAccount('jeton', API, vi.fn(async () => { throw new TypeError('Failed to fetch') }))).rejects.toEqual(new AccountDeletionError('network'))
    await expect(deleteAccount('jeton', API, vi.fn(async () => new Response('oups', { status: 500 })))).rejects.toEqual(new AccountDeletionError('http-500'))
    await expect(deleteAccount('jeton', '', vi.fn())).rejects.toEqual(new AccountDeletionError('not-configured'))
    expect(deletionErrorMessage('network')).toContain('n’a pas été supprimé')
    expect(deletionErrorMessage('unauthenticated')).toContain('reconnecte-toi')
    expect(deletionErrorMessage('delete-failed')).toContain('réessaie')
  })
  it('oublie les données gardées sur l’appareil pour ce compte seulement', () => {
    localStorage.setItem('novart.notifications.u1', '[]')
    localStorage.setItem('novart.groups.u1', '{}')
    localStorage.setItem('novart_profile_photos_u1', '[]')
    localStorage.setItem('novart.notifications.u2', '[]')
    localStorage.setItem('novart:remember', '1')
    forgetLocalData('u1')
    expect(localStorage.getItem('novart.notifications.u1')).toBeNull()
    expect(localStorage.getItem('novart.groups.u1')).toBeNull()
    expect(localStorage.getItem('novart_profile_photos_u1')).toBeNull()
    expect(localStorage.getItem('novart.notifications.u2')).toBe('[]')
    expect(localStorage.getItem('novart:remember')).toBe('1')
    localStorage.clear()
  })
})
