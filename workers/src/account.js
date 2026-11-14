// US-23 : suppression de compte (droit à l'effacement, RGPD).
// Les règles Firestore interdisent à un membre d'effacer ses messages ou ses conversations ;
// l'effacement se fait donc ici, avec le compte de service, dans cet ordre :
//   1. activités organisées : messages du groupe, puis l'activité ;
//   2. activités rejointes : retrait des participants, de la liste d'attente et de l'offre
//      de place (la place libérée est aussitôt proposée au suivant, comme dans l'appli) ;
//   3. messages écrits dans les autres groupes ;
//   4. conversations privées et leurs messages ;
//   5. profil public et profil privé ; photos d'activités dans R2 ;
//   6. en dernier, le compte de connexion Firebase.
// Chaque étape peut être rejouée : si une étape échoue, la personne reste connectée et réessaie.

import { accessToken, UpstreamError } from './google.js'

const FIRESTORE = 'https://firestore.googleapis.com/v1'
const OFFER_DELAY_MS = 24 * 3600 * 1000
const BATCH = 400

// ---------- valeurs Firestore (format REST) ----------
export function decode(value) {
  if (!value || 'nullValue' in value) return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode)
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)]))
  return null
}
export function encode(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } }
}
const fieldsOf = doc => Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)]))

// ---------- heure de Paris (date et heure des activités) ----------
const parisParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
/** Instant (ms) d'une date « AAAA-MM-JJ » et d'une heure « HH:MM » à Paris. */
export function parisTime(date, time = '00:00') {
  const [y, m, d] = String(date).split('-').map(Number)
  const [h, mi] = String(time || '00:00').split(':').map(Number)
  if (!y || !m || !d) return NaN
  const guess = Date.UTC(y, m - 1, d, h || 0, mi || 0)
  const p = Object.fromEntries(parisParts.formatToParts(new Date(guess)).map(x => [x.type, x.value]))
  const offset = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - guess
  return guess - offset
}

/**
 * Retire la personne d'une activité dont elle n'est pas l'organisatrice.
 * Même règle que l'appli (frontend/src/lib/waitlist.ts) : sans offre en cours, la place
 * libérée est proposée au premier de la file, qui a 24 h (au plus tard le début) pour confirmer.
 * Renvoie les champs à modifier, ou null s'il n'y a rien à faire.
 */
export function withoutMember(activity, uid, now = Date.now()) {
  const participants = activity.participantIds || []
  const waitlist = activity.waitlistIds || []
  const offer = activity.offer && typeof activity.offer.uid === 'string' ? activity.offer : null
  const lastMine = activity.lastMessage?.authorId === uid
  const wasParticipant = participants.includes(uid)
  const hadOffer = offer?.uid === uid
  if (!wasParticipant && !waitlist.includes(uid) && !hadOffer && !lastMine) return null
  const patch = {}
  const participantIds = participants.filter(p => p !== uid)
  let waitlistIds = waitlist.filter(w => w !== uid)
  let nextOffer = hadOffer ? null : offer
  const start = parisTime(activity.date, activity.startTime)
  const offerLive = nextOffer && nextOffer.expiresAtMs > now
  if ((wasParticipant || hadOffer) && !offerLive && !(start <= now) && waitlistIds.length && participantIds.length < Number(activity.capacity || 0)) {
    const [first, ...rest] = waitlistIds
    nextOffer = { uid: first, expiresAtMs: Math.max(now + 3600 * 1000, Math.min(now + OFFER_DELAY_MS, start)), offeredAtMs: now }
    waitlistIds = rest
  } else if (hadOffer || (nextOffer && !offerLive && !waitlistIds.length)) nextOffer = null
  if (wasParticipant) patch.participantIds = participantIds
  if (waitlistIds.length !== waitlist.length || waitlistIds.some((w, i) => w !== waitlist[i])) patch.waitlistIds = waitlistIds
  if (JSON.stringify(nextOffer) !== JSON.stringify(offer)) patch.offer = nextOffer
  if (lastMine) patch.lastMessage = null
  if (Object.keys(patch).length) patch.updatedAtMs = now
  return patch
}

// ---------- accès Firestore et Identity Toolkit ----------
function client(account) {
  const root = `projects/${account.project_id}/databases/(default)/documents`
  const call = async (url, init = {}) => {
    const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${await accessToken(account)}`, 'content-type': 'application/json', ...init.headers } })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const error = new UpstreamError(`Google ${response.status} ${body?.error?.status || ''}`.trim(), response.status)
      error.reason = body?.error?.status || ''
      throw error
    }
    return response.json()
  }
  return {
    root,
    /** Documents d'une collection (ou de toutes les collections de ce nom) où champ op valeur. */
    async query(parent, collectionId, field, op, value, { allDescendants = false } = {}) {
      const where = { fieldFilter: { field: { fieldPath: field }, op, value: encode(value) } }
      const rows = await call(`${FIRESTORE}/${parent}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId, allDescendants }], where } }) })
      return rows.filter(r => r.document).map(r => r.document)
    },
    async list(parent, collectionId) {
      const rows = await call(`${FIRESTORE}/${parent}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId }], select: { fields: [{ fieldPath: '__name__' }] } } }) })
      return rows.filter(r => r.document).map(r => r.document)
    },
    get: name => call(`${FIRESTORE}/${name}`).catch(error => { if (error.status === 404) return null; throw error }),
    commit: writes => call(`${FIRESTORE}/projects/${account.project_id}/databases/(default)/documents:commit`, { method: 'POST', body: JSON.stringify({ writes }) }),
    async deleteAll(names) {
      for (let i = 0; i < names.length; i += BATCH) await this.commit(names.slice(i, i + BATCH).map(name => ({ delete: name })))
    },
    deleteUser: uid => call(`https://identitytoolkit.googleapis.com/v1/projects/${account.project_id}/accounts:delete`, { method: 'POST', body: JSON.stringify({ localId: uid }) })
      .catch(error => { if (error.status === 400 && /USER_NOT_FOUND/.test(error.message + error.reason)) return {}; throw error }),
  }
}

/** Efface toutes les données de la personne, puis son compte. Renvoie ce qui a été effacé. */
export async function deleteAccount(env, account, uid, now = Date.now()) {
  const fs = client(account)
  const done = { activities: 0, leftActivities: 0, messages: 0, privateChats: 0, photos: 0 }

  // 1. Activités organisées.
  for (const activity of await fs.query(fs.root, 'activities', 'organizerId', 'EQUAL', uid)) {
    const messages = (await fs.list(activity.name, 'messages')).map(d => d.name)
    await fs.deleteAll([...messages, activity.name])
    done.activities++
    done.messages += messages.length
  }

  // 2. Activités rejointes, en liste d'attente, avec une place proposée ou dont elle a écrit le dernier message.
  const touched = new Map()
  for (const [field, op] of [['participantIds', 'ARRAY_CONTAINS'], ['waitlistIds', 'ARRAY_CONTAINS'], ['offer.uid', 'EQUAL'], ['lastMessage.authorId', 'EQUAL']]) {
    for (const doc of await fs.query(fs.root, 'activities', field, op, uid)) touched.set(doc.name, doc)
  }
  for (let doc of touched.values()) {
    for (let attempt = 0; doc && attempt < 4; attempt++) {
      const patch = withoutMember(fieldsOf(doc), uid, now)
      if (!patch) break
      try {
        await fs.commit([{ update: { name: doc.name, fields: Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, encode(v)])) }, updateMask: { fieldPaths: Object.keys(patch) }, currentDocument: { updateTime: doc.updateTime } }])
        done.leftActivities++
        break
      } catch (error) {
        // Quelqu'un a modifié l'activité entre-temps : on relit et on recommence.
        if (attempt < 3 && (error.reason === 'FAILED_PRECONDITION' || error.status === 409)) doc = await fs.get(doc.name)
        else throw error
      }
    }
  }

  // 3. Messages écrits dans les groupes (et conversations privées) d'autres membres.
  let written
  try { written = await fs.query(fs.root, 'messages', 'authorId', 'EQUAL', uid, { allDescendants: true }) }
  catch (error) {
    // Index de groupe de collections pas encore déployé : on parcourt les groupes connus.
    if (error.reason !== 'FAILED_PRECONDITION') throw error
    written = []
    for (const name of touched.keys()) written.push(...await fs.query(name, 'messages', 'authorId', 'EQUAL', uid))
  }
  await fs.deleteAll(written.map(d => d.name))
  done.messages += written.length

  // 4. Conversations privées : supprimées pour les deux membres.
  for (const chat of await fs.query(fs.root, 'privateChats', 'memberIds', 'ARRAY_CONTAINS', uid)) {
    const messages = (await fs.list(chat.name, 'messages')).map(d => d.name)
    await fs.deleteAll([...messages, chat.name])
    done.privateChats++
    done.messages += messages.length
  }

  // 5. Profils et photos.
  await fs.deleteAll([`${fs.root}/publicProfiles/${uid}`, `${fs.root}/users/${uid}`])
  if (env.FILES?.list) {
    let cursor
    do {
      const page = await env.FILES.list({ prefix: `covers/${uid}/`, cursor })
      const keys = page.objects.map(o => o.key)
      if (keys.length) await env.FILES.delete(keys)
      done.photos += keys.length
      cursor = page.truncated ? page.cursor : undefined
    } while (cursor)
  }

  // 6. Compte de connexion, en dernier.
  await fs.deleteUser(uid)
  return done
}
