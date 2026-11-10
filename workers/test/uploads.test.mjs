// Envoi des photos de couverture (R2) : jeton Firebase signé pour le test,
// clés publiques Google, R2 et D1 simulés.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.js'
import { resetKeyCache, verifyIdToken } from '../src/auth.js'
import { UPLOAD_LIMIT } from '../src/files.js'

const APP = 'https://novart-app.web.app'
const PROJECT = 'novart-109bf'
const KID = 'cle-test'
const b64url = data => Buffer.from(data).toString('base64url')

const google = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
const jwk = { ...(await crypto.subtle.exportKey('jwk', google.publicKey)), kid: KID, alg: 'RS256', use: 'sig' }
const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])

async function idToken({ uid = 'membre-1', aud = PROJECT, exp = 3600, key = google.privateKey, kid = KID } = {}) {
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: `https://securetoken.google.com/${aud}`, aud, sub: uid, iat: now - 10, auth_time: now - 10, exp: now + exp }))}`
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  return `${unsigned}.${b64url(new Uint8Array(signature))}`
}

const WEBP = new Uint8Array([...Buffer.from('RIFF'), 0x24, 0, 0, 0, ...Buffer.from('WEBPVP8 '), ...new Array(64).fill(7)])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(32).fill(1)])

function memoryR2() {
  const objects = new Map()
  return {
    objects,
    async put(key, body, options) { objects.set(key, { body: new Uint8Array(body), ...options }) },
    async get(key) {
      const item = objects.get(key)
      if (!item) return null
      return { body: item.body, httpEtag: '"etag"', writeHttpMetadata: headers => headers.set('content-type', item.httpMetadata.contentType) }
    },
  }
}
function memoryD1() {
  const rows = []
  return {
    rows,
    prepare(sql) {
      return { bind(...args) { return {
        async run() {
          if (sql.startsWith('DELETE')) { for (let i = rows.length - 1; i >= 0; i--) if (rows[i].created_at < args[0]) rows.splice(i, 1) }
          else rows.push({ uid_hash: args[0], created_at: args[1] })
        },
        async first() { const m = rows.filter(r => r.uid_hash === args[0] && r.created_at >= args[1]); return { n: m.length, first: m.length ? Math.min(...m.map(r => r.created_at)) : null } },
      } } }
    },
  }
}

let env
let keyFetches
beforeEach(() => {
  resetKeyCache()
  keyFetches = 0
  env = { ALLOWED_ORIGINS: APP, FIREBASE_PROJECT_ID: PROJECT, FILES: memoryR2(), DB: memoryD1() }
  globalThis.fetch = async url => {
    if (String(url).includes('securetoken@system.gserviceaccount.com')) { keyFetches++; return Response.json({ keys: [jwk] }, { headers: { 'cache-control': 'public, max-age=19000' } }) }
    throw new Error(`appel inattendu ${url}`)
  }
})

const upload = async (body, { token, type = 'image/webp', origin = APP } = {}) => worker.fetch(new Request('https://projet-art-api.example.workers.dev/uploads/cover', {
  method: 'POST', body, headers: { origin, 'content-type': type, ...(token === null ? {} : { authorization: `Bearer ${token ?? await idToken()}` }) },
}), env)

test('stocke la photo dans R2 et renvoie son adresse publique', async () => {
  const response = await upload(WEBP)
  assert.equal(response.status, 201)
  const { url } = await response.json()
  assert.match(url, /^https:\/\/projet-art-api\.example\.workers\.dev\/files\/covers\/membre-1\/\d+-[0-9a-f]{12}\.webp$/)
  const [key, stored] = [...env.FILES.objects][0]
  assert.equal(stored.httpMetadata.contentType, 'image/webp')
  assert.equal(stored.customMetadata.uid, 'membre-1')

  const served = await worker.fetch(new Request(url), env)
  assert.equal(served.status, 200)
  assert.equal(served.headers.get('content-type'), 'image/webp')
  assert.match(served.headers.get('cache-control'), /immutable/)
  assert.deepEqual(new Uint8Array(await served.arrayBuffer()), WEBP)
  assert.ok(key.startsWith('covers/membre-1/'))
})

test('réservé aux membres connectés : jeton absent, d’un autre projet, expiré ou mal signé', async () => {
  for (const token of [null, 'pas-un-jeton', await idToken({ aud: 'autre-projet' }), await idToken({ exp: -60 }), await idToken({ key: other.privateKey })]) {
    const response = await upload(WEBP, { token })
    assert.equal(response.status, 401, String(token).slice(0, 20))
  }
  assert.equal(env.FILES.objects.size, 0)
})

test('refuse ce qui n’est pas une image, ou une image trop lourde', async () => {
  assert.equal((await upload(new TextEncoder().encode('<script>'), { type: 'text/html' })).status, 415)
  // Type annoncé et contenu réel doivent correspondre.
  assert.equal((await upload(PNG, { type: 'image/webp' })).status, 415)
  assert.equal((await upload(PNG, { type: 'image/png' })).status, 201)
  assert.equal((await upload(new Uint8Array(2 * 1024 * 1024 + 1).fill(1))).status, 413)
})

test('refuse les envois venant d’ailleurs que l’appli', async () => {
  assert.equal((await upload(WEBP, { origin: 'https://pirate.example' })).status, 403)
})

test('limite le nombre d’envois par membre', async () => {
  const token = await idToken()
  for (let i = 0; i < UPLOAD_LIMIT.max; i++) assert.equal((await upload(WEBP, { token })).status, 201)
  const blocked = await upload(WEBP, { token })
  assert.equal(blocked.status, 429)
  assert.equal((await upload(WEBP, { token: await idToken({ uid: 'membre-2' }) })).status, 201)
  assert.ok(env.DB.rows.every(r => !r.uid_hash.includes('membre')))
})

test('met en cache les clés publiques de Google', async () => {
  await upload(WEBP)
  await upload(WEBP)
  assert.equal(keyFetches, 1)
})

test('ne sert que des chemins de couverture valides', async () => {
  for (const path of ['/files/../secret', '/files/covers/x/../../a.webp', '/files/autre/fichier.webp']) {
    assert.equal((await worker.fetch(new Request(`https://api.test${path}`), env)).status, 404)
  }
})

test('signale un stockage non configuré', async () => {
  delete env.FILES
  assert.equal((await upload(WEBP)).status, 503)
})

test('vérifie un jeton valide hors requête', async () => {
  assert.equal(await verifyIdToken(await idToken({ uid: 'abc' }), PROJECT), 'abc')
})
