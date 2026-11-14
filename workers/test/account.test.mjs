// US-23 : suppression de compte. Firestore (API REST), Identity Toolkit, OAuth Google
// et R2 sont simulés en mémoire ; le jeton Firebase est signé pour le test.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.js'
import { resetKeyCache } from '../src/auth.js'
import { resetTokenCache } from '../src/google.js'
import { decode, encode, parisTime, withoutMember } from '../src/account.js'

const APP = 'https://novart-app.web.app'
const PROJECT = 'novart-109bf'
const ROOT = `projects/${PROJECT}/databases/(default)/documents`
const KID = 'cle-test'
const b64url = data => Buffer.from(data).toString('base64url')
const google = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
const jwk = { ...(await crypto.subtle.exportKey('jwk', google.publicKey)), kid: KID, alg: 'RS256', use: 'sig' }
const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', google.privateKey)).toString('base64')
const SERVICE_ACCOUNT = JSON.stringify({ project_id: PROJECT, client_email: 'admin@novart.iam.gserviceaccount.com', private_key: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----\n` })

async function idToken(uid = 'moi') {
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', kid: KID, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: uid, iat: now - 10, auth_time: now - 10, exp: now + 3600 }))}`
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', google.privateKey, new TextEncoder().encode(unsigned))
  return `${unsigned}.${b64url(new Uint8Array(signature))}`
}

// ---------- Firestore en mémoire (sous-ensemble de l'API REST utilisé par account.js) ----------
function memoryFirestore() {
  const docs = new Map()
  let clock = 0
  const stamp = () => `2026-11-14T00:00:00.${String(++clock).padStart(6, '0')}Z`
  const value = (fields, path) => path.split('.').reduce((v, k) => (v && typeof v === 'object' ? v[k] : undefined), Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)])))
  return {
    docs,
    collectionGroupIndex: true,
    conflictOnce: new Set(),
    set(path, data) { docs.set(`${ROOT}/${path}`, { fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode(v)])), updateTime: stamp() }) },
    data(path) { const d = docs.get(`${ROOT}/${path}`); return d && Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, decode(v)])) },
    has(path) { return docs.has(`${ROOT}/${path}`) },
    async handle(url, init) {
      const path = decodeURIComponent(new URL(url).pathname.replace(/^\/v1\//, ''))
      if (path.endsWith(':runQuery')) {
        const parent = path.slice(0, -':runQuery'.length)
        const { structuredQuery: q } = JSON.parse(init.body)
        const { collectionId, allDescendants } = q.from[0]
        if (allDescendants && !this.collectionGroupIndex) return Response.json({ error: { status: 'FAILED_PRECONDITION', message: 'index requis' } }, { status: 400 })
        const rows = []
        for (const [name, doc] of docs) {
          const rest = name.slice(parent.length + 1).split('/')
          if (!name.startsWith(`${parent}/`)) continue
          const ok = allDescendants ? rest.length >= 2 && rest.length % 2 === 0 && rest[rest.length - 2] === collectionId : rest.length === 2 && rest[0] === collectionId
          if (!ok) continue
          if (q.where) {
            const { field, op, value: expected } = q.where.fieldFilter
            const actual = value(doc.fields, field.fieldPath)
            const want = decode(expected)
            if (op === 'EQUAL' && actual !== want) continue
            if (op === 'ARRAY_CONTAINS' && !(Array.isArray(actual) && actual.includes(want))) continue
          }
          rows.push({ document: { name, fields: doc.fields, updateTime: doc.updateTime } })
        }
        return Response.json(rows.length ? rows : [{ readTime: 'x' }])
      }
      if (path.endsWith(':commit')) {
        const { writes } = JSON.parse(init.body)
        for (const w of writes) {
          if (w.delete) { docs.delete(w.delete); continue }
          const doc = docs.get(w.update.name)
          if (this.conflictOnce.has(w.update.name)) {
            // Un autre membre modifie l'activité juste avant : la précondition échoue.
            this.conflictOnce.delete(w.update.name)
            doc.updateTime = stamp()
          }
          if (!doc || (w.currentDocument?.updateTime && w.currentDocument.updateTime !== doc.updateTime)) return Response.json({ error: { status: 'FAILED_PRECONDITION', message: 'modifié' } }, { status: 400 })
          for (const field of w.updateMask.fieldPaths) doc.fields[field] = w.update.fields[field]
          doc.updateTime = stamp()
        }
        return Response.json({ writeResults: writes.map(() => ({})) })
      }
      const doc = docs.get(path)
      return doc ? Response.json({ name: path, fields: doc.fields, updateTime: doc.updateTime }) : Response.json({ error: { status: 'NOT_FOUND' } }, { status: 404 })
    },
  }
}
function memoryR2(keys) {
  const objects = new Set(keys)
  return {
    objects,
    async list({ prefix }) { return { objects: [...objects].filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false } },
    async delete(list) { for (const k of [].concat(list)) objects.delete(k) },
  }
}

let env, fs, deletedUsers, calls
beforeEach(() => {
  resetKeyCache()
  resetTokenCache()
  fs = memoryFirestore()
  deletedUsers = []
  calls = []
  env = { ALLOWED_ORIGINS: APP, FIREBASE_PROJECT_ID: PROJECT, FIREBASE_SERVICE_ACCOUNT: SERVICE_ACCOUNT, FILES: memoryR2(['covers/moi/1.webp', 'covers/moi/2.webp', 'covers/b/1.webp']) }
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url)
    calls.push(u)
    if (u.includes('securetoken@system.gserviceaccount.com')) return Response.json({ keys: [jwk] }, { headers: { 'cache-control': 'max-age=3600' } })
    if (u === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'jeton-admin', expires_in: 3600 })
    if (u.includes('accounts:delete')) {
      assert.equal(init.headers.authorization, 'Bearer jeton-admin')
      deletedUsers.push(JSON.parse(init.body).localId)
      return Response.json({})
    }
    if (u.startsWith('https://firestore.googleapis.com/')) return fs.handle(u, init)
    throw new Error(`appel inattendu ${u}`)
  }
  const future = new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10)
  const past = new Date(Date.now() - 10 * 86400_000).toISOString().slice(0, 10)
  const base = { title: 'Atelier', capacity: 2, date: future, startTime: '18:00', waitlistIds: [], offer: null, lastMessage: null }
  fs.set('activities/a1', { ...base, organizerId: 'moi', participantIds: ['b'] })
  fs.set('activities/a1/messages/m1', { authorId: 'moi', text: 'Bienvenue' })
  fs.set('activities/a1/messages/m2', { authorId: 'b', text: 'Merci' })
  fs.set('activities/a2', { ...base, organizerId: 'o', participantIds: ['moi', 'b'], waitlistIds: ['c', 'd'], lastMessage: { authorId: 'moi', authorName: 'Moi', text: 'À jeudi', sentAtMs: 1 } })
  fs.set('activities/a2/messages/m1', { authorId: 'moi', text: 'À jeudi' })
  fs.set('activities/a2/messages/m2', { authorId: 'b', text: 'Super' })
  fs.set('activities/a3', { ...base, organizerId: 'o', participantIds: ['x', 'y'], waitlistIds: ['moi', 'e'] })
  fs.set('activities/a4', { ...base, organizerId: 'o', participantIds: ['x'], waitlistIds: ['f'], offer: { uid: 'moi', expiresAtMs: Date.now() + 3600_000, offeredAtMs: Date.now() } })
  fs.set('activities/a5', { ...base, date: past, organizerId: 'o', participantIds: ['moi'], waitlistIds: ['g'] })
  fs.set('activities/a6', { ...base, organizerId: 'o', participantIds: ['b'] })
  fs.set('activities/a6/messages/m1', { authorId: 'moi', text: 'Ancien message' })
  fs.set('privateChats/moi__z', { memberIds: ['moi', 'z'] })
  fs.set('privateChats/moi__z/messages/m1', { authorId: 'z', text: 'Salut' })
  fs.set('privateChats/a__b', { memberIds: ['a', 'b'] })
  fs.set('privateChats/a__b/messages/m1', { authorId: 'a', text: 'Coucou' })
  fs.set('users/moi', { city: 'Lyon' })
  fs.set('publicProfiles/moi', { firstName: 'Moi' })
  fs.set('publicProfiles/b', { firstName: 'B' })
})

const remove = async ({ token, body = { confirm: 'delete-account' }, origin = APP } = {}) => worker.fetch(new Request('https://api.example/account/delete', {
  method: 'POST', body: JSON.stringify(body), headers: { origin, 'content-type': 'application/json', ...(token === null ? {} : { authorization: `Bearer ${token ?? await idToken()}` }) },
}), env)

test('efface toutes les données du membre puis son compte', async () => {
  const response = await remove()
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { deleted: true, activities: 1, leftActivities: 4, messages: 5, privateChats: 1, photos: 2 })
  // Activité organisée et son groupe.
  assert.ok(!fs.has('activities/a1') && !fs.has('activities/a1/messages/m1') && !fs.has('activities/a1/messages/m2'))
  // Activité rejointe : place proposée au premier de la file, dernier message retiré.
  const a2 = fs.data('activities/a2')
  assert.deepEqual(a2.participantIds, ['b'])
  assert.equal(a2.offer.uid, 'c')
  assert.ok(a2.offer.expiresAtMs > Date.now() + 23 * 3600_000 && a2.offer.expiresAtMs <= Date.now() + 24 * 3600_000 + 1000)
  assert.deepEqual(a2.waitlistIds, ['d'])
  assert.equal(a2.lastMessage, null)
  assert.ok(!fs.has('activities/a2/messages/m1') && fs.has('activities/a2/messages/m2'))
  // Liste d'attente, offre en cours, activité passée.
  assert.deepEqual(fs.data('activities/a3').waitlistIds, ['e'])
  assert.equal(fs.data('activities/a4').offer.uid, 'f')
  assert.deepEqual(fs.data('activities/a4').waitlistIds, [])
  assert.deepEqual(fs.data('activities/a5').participantIds, [])
  assert.equal(fs.data('activities/a5').offer, null)
  assert.deepEqual(fs.data('activities/a5').waitlistIds, ['g'])
  // Message laissé dans un groupe quitté plus tôt.
  assert.ok(fs.has('activities/a6') && !fs.has('activities/a6/messages/m1'))
  // Conversations privées, profils, photos, compte.
  assert.ok(!fs.has('privateChats/moi__z') && !fs.has('privateChats/moi__z/messages/m1'))
  assert.ok(fs.has('privateChats/a__b/messages/m1'))
  assert.ok(!fs.has('users/moi') && !fs.has('publicProfiles/moi') && fs.has('publicProfiles/b'))
  assert.deepEqual([...env.FILES.objects], ['covers/b/1.webp'])
  assert.deepEqual(deletedUsers, ['moi'])
})

test('rejouable : une deuxième demande ne trouve plus rien et réussit', async () => {
  assert.equal((await remove()).status, 200)
  const again = await remove()
  assert.equal(again.status, 200)
  assert.deepEqual(await again.json(), { deleted: true, activities: 0, leftActivities: 0, messages: 0, privateChats: 0, photos: 0 })
})

test('relit l’activité si un autre membre la modifie au même moment', async () => {
  fs.conflictOnce.add(`${ROOT}/activities/a2`)
  assert.equal((await remove()).status, 200)
  assert.deepEqual(fs.data('activities/a2').participantIds, ['b'])
  assert.equal(fs.data('activities/a2').offer.uid, 'c')
})

test('sans index de groupe de collections, parcourt les groupes connus', async () => {
  fs.collectionGroupIndex = false
  assert.equal((await remove()).status, 200)
  assert.ok(!fs.has('activities/a2/messages/m1'))
  assert.deepEqual(deletedUsers, ['moi'])
})

test('refuse sans jeton, sans confirmation, depuis un autre site', async () => {
  assert.equal((await remove({ token: null })).status, 401)
  assert.equal((await remove({ token: 'faux.jeton.x' })).status, 401)
  const noConfirm = await remove({ body: {} })
  assert.equal(noConfirm.status, 400)
  assert.equal((await noConfirm.json()).error, 'confirmation-required')
  assert.equal((await remove({ origin: 'https://ailleurs.example' })).status, 403)
  assert.deepEqual(deletedUsers, [])
  assert.ok(fs.has('users/moi'))
  assert.ok(!calls.some(u => u.startsWith('https://firestore.googleapis.com/')))
})

test('ne supprime pas le compte si l’effacement des données échoue', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (url, init) => String(url).includes('privateChats') || String(init?.body ?? '').includes('privateChats')
    ? Response.json({ error: { status: 'UNAVAILABLE' } }, { status: 503 })
    : original(url, init)
  const response = await remove()
  assert.equal(response.status, 502)
  assert.deepEqual(deletedUsers, [])
  assert.ok(fs.has('users/moi'))
})

test('non configurée sans compte de service', async () => {
  delete env.FIREBASE_SERVICE_ACCOUNT
  assert.equal((await remove()).status, 503)
})

test('heure de Paris : hiver et été', () => {
  assert.equal(parisTime('2026-11-20', '18:30'), Date.UTC(2026, 10, 20, 17, 30))
  assert.equal(parisTime('2026-07-01', '10:00'), Date.UTC(2026, 6, 1, 8, 0))
})

test('place libérée la veille : délai jusqu’au début de l’activité, au moins 1 h', () => {
  const now = Date.UTC(2026, 10, 20, 12, 0)
  const patch = withoutMember({ capacity: 2, date: '2026-11-20', startTime: '18:00', participantIds: ['moi', 'b'], waitlistIds: ['c'], offer: null }, 'moi', now)
  assert.equal(patch.offer.expiresAtMs, Date.UTC(2026, 10, 20, 17, 0))
  const soon = withoutMember({ capacity: 2, date: '2026-11-20', startTime: '13:20', participantIds: ['moi', 'b'], waitlistIds: ['c'], offer: null }, 'moi', now)
  assert.equal(soon.offer.expiresAtMs, now + 3600_000)
  assert.equal(withoutMember({ participantIds: ['b'], waitlistIds: [] }, 'moi', now), null)
})
