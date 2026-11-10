// Idées d'activités par Mistral : jeton Firebase signé pour le test, Mistral et D1 simulés.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.js'
import { resetKeyCache } from '../src/auth.js'
import { AI_LIMIT, buildMessages, readRequest, sanitizeIdeas } from '../src/ai.js'

const APP = 'https://novart-app.web.app'
const PROJECT = 'novart-109bf'
const KID = 'cle-test'
const b64url = data => Buffer.from(data).toString('base64url')
const google = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
const jwk = { ...(await crypto.subtle.exportKey('jwk', google.publicKey)), kid: KID, alg: 'RS256', use: 'sig' }
async function idToken(uid = 'membre-1') {
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', kid: KID, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: uid, iat: now - 10, auth_time: now - 10, exp: now + 3600 }))}`
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', google.privateKey, new TextEncoder().encode(unsigned))
  return `${unsigned}.${b64url(new Uint8Array(signature))}`
}
function memoryD1() {
  const rows = []
  return { rows, prepare(sql) { return { bind(...args) { return {
    async run() { if (sql.startsWith('DELETE')) { for (let i = rows.length - 1; i >= 0; i--) if (rows[i].created_at < args[0]) rows.splice(i, 1) } else rows.push({ uid_hash: args[0], created_at: args[1] }) },
    async first() { const m = rows.filter(r => r.uid_hash === args[0] && r.created_at >= args[1]); return { n: m.length, first: m.length ? Math.min(...m.map(r => r.created_at)) : null } },
  } } } } }
}
const IDEAS = { ideas: [
  { title: 'Aquarelle au bord du Rhône', discipline: 'peinture', subDiscipline: 'aquarelle', description: 'On peint ensemble les quais au fil de l’eau.', level: 'debutant', equipment: 'Carnet et pinceaux', durationHours: 2 },
  { title: 'Croquis au parc', discipline: 'inconnue', subDiscipline: 'Inventée', description: 'Dessin d’observation en plein air.', level: 'expert', equipment: '', durationHours: 9 },
  { title: '', description: 'Sans titre : ignorée' },
] }

let env, mistralCalls, mistralReply
beforeEach(() => {
  resetKeyCache()
  mistralCalls = []
  mistralReply = () => Response.json({ choices: [{ message: { role: 'assistant', content: JSON.stringify(IDEAS) } }] })
  env = { ALLOWED_ORIGINS: APP, FIREBASE_PROJECT_ID: PROJECT, MISTRAL_API_KEY: 'cle-mistral-test', DB: memoryD1() }
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('securetoken@system.gserviceaccount.com')) return Response.json({ keys: [jwk] }, { headers: { 'cache-control': 'public, max-age=19000' } })
    if (String(url) === 'https://api.mistral.ai/v1/chat/completions') { mistralCalls.push({ init, body: JSON.parse(init.body) }); return mistralReply() }
    throw new Error(`appel inattendu ${url}`)
  }
})
const ask = async (body, { token, origin = APP } = {}) => worker.fetch(new Request('https://projet-art-api.example.workers.dev/ai/activity-ideas', {
  method: 'POST', body: JSON.stringify(body), headers: { origin, 'content-type': 'application/json', ...(token === null ? {} : { authorization: `Bearer ${token ?? await idToken()}` }) },
}), env)

test('renvoie des idées relues et bornées, avec la clé Mistral côté serveur uniquement', async () => {
  const response = await ask({ keywords: 'aquarelle, quais, débutants', discipline: 'peinture', practices: ['Aquarelle', 'Gouache'] })
  assert.equal(response.status, 200)
  const { ideas } = await response.json()
  assert.equal(ideas.length, 2)
  assert.deepEqual(ideas[0], { title: 'Aquarelle au bord du Rhône', discipline: 'peinture', subDiscipline: 'Aquarelle', description: 'On peint ensemble les quais au fil de l’eau.', level: 'debutant', equipment: 'Carnet et pinceaux', durationHours: 2 })
  // Discipline imposée par l'organisateur, pratique inconnue retirée, niveau et durée bornés.
  assert.equal(ideas[1].discipline, 'peinture')
  assert.equal(ideas[1].subDiscipline, '')
  assert.equal(ideas[1].level, 'tous')
  assert.equal(ideas[1].durationHours, 4)
  const [call] = mistralCalls
  assert.equal(call.init.headers.authorization, 'Bearer cle-mistral-test')
  assert.equal(call.body.model, 'mistral-small-latest')
  assert.deepEqual(call.body.response_format, { type: 'json_object' })
  assert.match(call.body.messages[1].content, /aquarelle, quais, débutants/)
  assert.equal(response.headers.get('access-control-allow-origin'), APP)
})

test('réservé aux membres connectés, depuis l’application', async () => {
  assert.equal((await ask({ keywords: 'danse' }, { token: null })).status, 401)
  assert.equal((await ask({ keywords: 'danse' }, { token: 'faux.jeton.signature' })).status, 401)
  assert.equal((await ask({ keywords: 'danse' }, { origin: 'https://ailleurs.example' })).status, 403)
  assert.equal(mistralCalls.length, 0)
})

test('refuse des mots-clés vides et choisit la discipline si aucune n’est imposée', async () => {
  assert.equal((await ask({ keywords: ' ' })).status, 400)
  assert.deepEqual(readRequest({ keywords: 'x'.repeat(300), discipline: 'cuisine', practices: 'non' }), { keywords: 'x'.repeat(120), discipline: '', practices: [] })
  const ideas = sanitizeIdeas(IDEAS, { discipline: '', practices: [] })
  assert.equal(ideas[1].discipline, 'autre')
  assert.equal(ideas[0].subDiscipline, 'aquarelle')
  assert.match(buildMessages({ keywords: 'slam', discipline: '', practices: [] })[1].content, /choisis la plus adaptée/)
})

test('erreurs de Mistral et service non configuré', async () => {
  mistralReply = () => new Response('quota', { status: 429 })
  assert.equal((await ask({ keywords: 'théâtre' })).status, 502)
  mistralReply = () => Response.json({ choices: [{ message: { content: 'pas du JSON' } }] })
  assert.equal((await ask({ keywords: 'théâtre' })).status, 502)
  delete env.MISTRAL_API_KEY
  assert.equal((await ask({ keywords: 'théâtre' })).status, 503)
})

test(`limite à ${AI_LIMIT.max} demandes par heure et par membre`, async () => {
  for (let i = 0; i < AI_LIMIT.max; i++) assert.equal((await ask({ keywords: 'photo de rue' })).status, 200)
  const blocked = await ask({ keywords: 'photo de rue' })
  assert.equal(blocked.status, 429)
  assert.ok(Number(blocked.headers.get('retry-after')) > 0)
  // Un autre membre n'est pas concerné ; le quota des photos non plus.
  assert.equal((await ask({ keywords: 'photo de rue' }, { token: await idToken('membre-2') })).status, 200)
})

test('sans clé Mistral : Mistral Small hébergé par Cloudflare Workers AI (gratuit)', async () => {
  delete env.MISTRAL_API_KEY
  const runs = []
  env.AI = { async run(model, input) { runs.push({ model, input }); return { response: '```json\n' + JSON.stringify(IDEAS) + '\n```' } } }
  const response = await ask({ keywords: 'danse afro, parc', discipline: 'danse', practices: ['Danse africaine'] })
  assert.equal(response.status, 200)
  const { ideas } = await response.json()
  assert.equal(ideas.length, 2)
  assert.equal(ideas[0].discipline, 'danse')
  assert.equal(runs[0].model, '@cf/mistralai/mistral-small-3.1-24b-instruct')
  assert.match(runs[0].input.messages[1].content, /danse afro, parc/)
  assert.equal(mistralCalls.length, 0)
})

test('Workers AI : quota du jour épuisé, puis réponse illisible', async () => {
  delete env.MISTRAL_API_KEY
  env.AI = { async run() { throw new Error('4006: you have used up your daily free allocation of 10,000 neurons') } }
  const limited = await ask({ keywords: 'slam' })
  assert.equal(limited.status, 429)
  assert.equal((await limited.json()).error, 'daily-limit')
  env.AI = { async run() { return { response: 'Désolé, je ne peux pas.' } } }
  assert.equal((await ask({ keywords: 'slam' })).status, 502)
})
