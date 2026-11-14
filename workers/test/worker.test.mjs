// Tests du Worker sans Cloudflare ni réseau : Google, Brevo et D1 sont simulés,
// la signature RS256 est réelle (clé générée pour le test).
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.js'
import { resetTokenCache } from '../src/google.js'
import { LIMITS } from '../src/limits.js'
import { signInEmail } from '../src/email-template.js'

const APP = 'https://novart-app.web.app'
const LINK = 'https://novart-109bf.firebaseapp.com/__/auth/action?mode=signIn&oobCode=abc&continueUrl=https%3A%2F%2Fnovart-app.web.app%2Flogin.html'

async function serviceAccount() {
  const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  const der = Buffer.from(await crypto.subtle.exportKey('pkcs8', keys.privateKey)).toString('base64')
  // Comme dans le fichier JSON de Google : retours à la ligne échappés.
  const pem = `-----BEGIN PRIVATE KEY-----\\n${der.match(/.{1,64}/g).join('\\n')}\\n-----END PRIVATE KEY-----\\n`
  return { account: JSON.stringify({ type: 'service_account', project_id: 'novart-109bf', client_email: 'firebase-adminsdk@novart-109bf.iam.gserviceaccount.com', private_key: pem }), publicKey: keys.publicKey }
}
const { account, publicKey } = await serviceAccount()

/** D1 en mémoire, limité aux requêtes du Worker. */
function memoryD1() {
  const rows = []
  return {
    rows,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.startsWith('DELETE')) { for (let i = rows.length - 1; i >= 0; i--) if (rows[i].created_at < args[0]) rows.splice(i, 1) }
              else if (sql.startsWith('INSERT')) rows.push({ email_hash: args[0], ip_hash: args[1], created_at: args[2] })
              return { success: true }
            },
            async first() {
              const column = sql.includes('email_hash = ?') ? 'email_hash' : 'ip_hash'
              const matching = rows.filter(r => r[column] === args[0] && r.created_at >= args[1])
              return { n: matching.length, first: matching.length ? Math.min(...matching.map(r => r.created_at)) : null }
            },
          }
        },
      }
    },
  }
}

let calls
let env
beforeEach(() => {
  resetTokenCache()
  calls = []
  env = { FIREBASE_SERVICE_ACCOUNT: account, BREVO_API_KEY: 'brevo-test', SENDER_EMAIL: 'equipe@novart.test', ALLOWED_ORIGINS: `${APP},http://localhost:5173`, APP_URL: APP, DB: memoryD1() }
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    if (String(url).startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'jeton-google', expires_in: 3600 })
    if (String(url).includes('accounts:sendOobCode')) return Response.json({ email: JSON.parse(init.body).email, oobLink: LINK })
    if (String(url).startsWith('https://api.brevo.com')) return Response.json({ messageId: '<id@brevo>' }, { status: 201 })
    throw new Error(`appel inattendu ${url}`)
  }
})

const ask = (body, { origin = APP, ip = '203.0.113.7', method = 'POST' } = {}) => worker.fetch(new Request('https://api.novart.test/auth/email-link', {
  method, headers: { origin, 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: method === 'POST' ? JSON.stringify(body) : undefined,
}), env)
const valid = { email: 'camille@example.com', continueUrl: `${APP}/login.html?remember=1` }

test('envoie l’e-mail NOVART avec le lien Firebase généré par le compte de service', async () => {
  const response = await ask(valid)
  assert.equal(response.status, 202)
  assert.equal(response.headers.get('access-control-allow-origin'), APP)

  // 1. Jeton Google : JWT RS256 signé avec la clé du compte de service, vérifiable.
  const assertion = new URLSearchParams(calls[0].init.body).get('assertion')
  const [header, payload, signature] = assertion.split('.')
  const claims = JSON.parse(Buffer.from(payload, 'base64url'))
  assert.equal(claims.iss, 'firebase-adminsdk@novart-109bf.iam.gserviceaccount.com')
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore')
  assert.ok(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, Buffer.from(signature, 'base64url'), new TextEncoder().encode(`${header}.${payload}`)))

  // 2. Lien de connexion demandé sans envoi par Firebase, vers l'appli.
  assert.match(calls[1].url, /projects\/novart-109bf\/accounts:sendOobCode$/)
  assert.equal(calls[1].init.headers.authorization, 'Bearer jeton-google')
  assert.deepEqual(JSON.parse(calls[1].init.body), { requestType: 'EMAIL_SIGNIN', email: valid.email, continueUrl: valid.continueUrl, canHandleCodeInApp: true, returnOobLink: true })

  // 3. E-mail Brevo : expéditeur NOVART, texte du DA, lien dans le bouton.
  const mail = JSON.parse(calls[2].init.body)
  assert.equal(calls[2].init.headers['api-key'], 'brevo-test')
  assert.deepEqual(mail.sender, { name: 'NOVART', email: 'equipe@novart.test' })
  assert.deepEqual(mail.to, [{ email: valid.email }])
  assert.equal(mail.subject, 'Ton lien sécurisé pour accéder à NOVART')
  assert.match(mail.textContent, /Si c’est ta première visite, tu pourras créer ton profil après connexion/)
  assert.ok(mail.htmlContent.includes(LINK.replace(/&/g, '&amp;')))
  assert.ok(mail.textContent.includes(LINK))
})

test('réutilise le jeton Google tant qu’il est valide', async () => {
  await ask(valid)
  await ask({ ...valid, email: 'lou@example.com' })
  assert.equal(calls.filter(c => c.url.startsWith('https://oauth2')).length, 1)
})

test('refuse une origine inconnue et une redirection hors de l’appli', async () => {
  assert.equal((await ask(valid, { origin: 'https://pirate.example' })).status, 403)
  const outside = await ask({ ...valid, continueUrl: 'https://pirate.example/login.html' })
  assert.equal(outside.status, 400)
  assert.deepEqual(await outside.json(), { error: 'invalid-continue-url' })
  assert.equal(calls.length, 0)
})

test('refuse un e-mail invalide sans rien appeler', async () => {
  const response = await ask({ ...valid, email: 'pas-un-email' })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'invalid-email' })
  assert.equal(calls.length, 0)
})

test('limite les demandes par adresse (D1) sans stocker l’adresse en clair', async () => {
  for (let i = 0; i < LIMITS.perEmail.max; i++) assert.equal((await ask(valid)).status, 202)
  const blocked = await ask(valid)
  assert.equal(blocked.status, 429)
  assert.ok(Number(blocked.headers.get('retry-after')) > 0)
  assert.equal((await ask({ ...valid, email: 'autre@example.com' })).status, 202)
  assert.ok(env.DB.rows.every(row => /^[0-9a-f]{64}$/.test(row.email_hash) && !JSON.stringify(row).includes('example.com') && !JSON.stringify(row).includes('203.0.113')))
})

test('limite les demandes par appareil', async () => {
  for (let i = 0; i < LIMITS.perIp.max; i++) await ask({ ...valid, email: `membre${i}@example.com` })
  assert.equal((await ask({ ...valid, email: 'encore@example.com' })).status, 429)
  assert.equal((await ask({ ...valid, email: 'encore@example.com' }, { ip: '198.51.100.2' })).status, 202)
})

test('signale un service non configuré ou en panne (l’appli bascule alors sur Firebase)', async () => {
  delete env.FIREBASE_SERVICE_ACCOUNT
  assert.equal((await ask(valid)).status, 503)
  env.FIREBASE_SERVICE_ACCOUNT = account
  globalThis.fetch = async url => String(url).startsWith('https://api.brevo.com') ? new Response('{}', { status: 401 }) : String(url).includes('oauth2') ? Response.json({ access_token: 't', expires_in: 3600 }) : Response.json({ oobLink: LINK })
  const failed = await ask(valid)
  assert.equal(failed.status, 502)
  assert.deepEqual(await failed.json(), { error: 'send-failed' })
})

test('accepte les demandes même si D1 est indisponible', async () => {
  env.DB = { prepare() { throw new Error('D1 hors service') } }
  assert.equal((await ask(valid)).status, 202)
})

test('répond au pré-contrôle CORS seulement pour l’appli', async () => {
  assert.equal((await ask(null, { method: 'OPTIONS' })).status, 204)
  assert.equal((await ask(null, { method: 'OPTIONS', origin: 'https://pirate.example' })).status, 403)
  const health = await worker.fetch(new Request('https://api.novart.test/health'), env)
  assert.deepEqual(await health.json(), { status: 'ok' })
})

test('échappe le lien dans le HTML', () => {
  const { html } = signInEmail('https://x.test/?a=1&b="2"<script>')
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&amp;b=&quot;2&quot;&lt;script&gt;'))
})
