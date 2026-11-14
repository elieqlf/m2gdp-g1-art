// US-23 : suppression de compte. L'API NOVART (Worker) efface les activités organisées,
// les participations, les messages, les conversations, les profils et les photos, puis le
// compte de connexion : les règles Firestore n'autorisent pas un membre à le faire lui-même.
import { AUTH_API_URL } from './emailLink'

export class AccountDeletionError extends Error {
  code: string
  constructor(code: string) { super(code); this.code = code }
}

export async function deleteAccount(token: string, apiUrl = AUTH_API_URL, fetchImpl: typeof fetch = fetch): Promise<void> {
  if (!apiUrl) throw new AccountDeletionError('not-configured')
  let response: Response
  try {
    response = await fetchImpl(`${apiUrl}/account/delete`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ confirm: 'delete-account' }),
    })
  } catch { throw new AccountDeletionError('network') }
  const body = await response.json().catch(() => ({})) as { deleted?: boolean; error?: string }
  if (response.ok && body.deleted) return
  throw new AccountDeletionError(body.error || `http-${response.status}`)
}

export function deletionErrorMessage(code: string) {
  if (code === 'network') return 'Pas de connexion internet : ton compte n’a pas été supprimé. Réessaie.'
  if (code === 'unauthenticated') return 'Ta session a expiré. Déconnecte-toi, reconnecte-toi puis réessaie.'
  if (code === 'not-configured') return 'La suppression n’est pas disponible pour le moment. Écris-nous depuis la page Contact du site.'
  return 'La suppression n’a pas pu aller au bout. Rien n’est perdu : réessaie dans un instant.'
}

/** Préférences gardées sur cet appareil pour ce compte (notifications vues, groupes lus, photos). */
export function forgetLocalData(uid: string, storage: Storage | undefined = typeof localStorage === 'undefined' ? undefined : localStorage) {
  if (!storage || !uid) return
  const encoded = encodeURIComponent(uid)
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key && (key.includes(uid) || key.includes(encoded))) keys.push(key)
  }
  for (const key of keys) { try { storage.removeItem(key) } catch { /* stockage indisponible */ } }
}
