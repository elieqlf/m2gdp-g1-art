import { expect, test, type Page, type TestInfo } from '@playwright/test'

const firebaseFixture = "\nconst mode = __MODE__;\nlet accountObserver;\nexport const isValidEmail = email => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim());\nexport const hasSignInLink = () => false;\nexport const pendingEmail = () => '';\nexport const requestSignInLink = async () => {};\nexport const completeSignIn = async () => {};\nexport const observeAccount = callback => {\n  accountObserver = callback;\n  queueMicrotask(() => callback(mode === 'request' ? null : { uid: 'preview-user', email: 'preview@example.com' }));\n  return () => {};\n};\nexport const getProfile = async () => ({ profileComplete: mode === 'community' });\nexport const saveProfile = async () => {};\nexport const listMembers = async () => [\n  { uid: 'camille', firstName: 'Camille', lastName: 'Martin', userType: 'participant', address: 'Paris', addressLat: 48.8566, addressLng: 2.3522 },\n  { uid: 'alex', firstName: 'Alex', lastName: 'Durand', userType: 'organisateur', address: 'Belleville, Paris', addressLat: 48.872, addressLng: 2.384 }\n];\nexport const logout = async () => { accountObserver?.(null); };\n"

// Replace service modules only in the dev server used by the tests.
// No real sign-in email, Firestore write or Places request is made.
async function openScreen(page: Page, mode: 'request' | 'profile' | 'community') {
  await page.route('**/src/services/firebase.ts*', route => route.fulfill({
    contentType: 'application/javascript',
    body: firebaseFixture.replace('__MODE__', JSON.stringify(mode)),
  }));
  await page.route('**/src/services/places.ts*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export const suggestAddresses = async () => []; export const resolveAddress = async () => null;',
  }));
  await page.goto('/')
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath(name + '.png'), fullPage: true })
}

test('connexion : présentation mobile et envoi du lien', async ({ page }, testInfo) => {
  await openScreen(page, 'request')
  await expect(page.getByRole('heading', { name: 'Bienvenue', exact: true })).toBeVisible()
  await expect(page.locator('.auth-mascot')).toBeVisible()
  await capture(page, testInfo, 'connexion')
  await page.getByLabel('Adresse e-mail', { exact: true }).fill('preview@example.com')
  await page.getByRole('button', { name: 'Recevoir mon lien de connexion' }).click()
  await expect(page.getByRole('heading', { name: 'Consultez votre boîte mail' })).toBeVisible()
})

test('profil : champs existants et inscription', async ({ page }, testInfo) => {
  await openScreen(page, 'profile')
  await expect(page.getByRole('heading', { name: 'Faisons connaissance' })).toBeVisible()
  await expect(page.getByLabel('Je souhaite participer en tant que')).toHaveText('Participant')
  await capture(page, testInfo, 'profil')
  await page.getByLabel('Prénom', { exact: true }).fill('Camille')
  await page.getByLabel('Nom', { exact: true }).fill('Martin')
  await page.getByLabel('Adresse', { exact: true }).fill('Paris')
  await page.getByRole('button', { name: 'Terminer mon inscription' }).click()
  await expect(page.getByRole('heading', { name: 'Utilisateurs inscrits' })).toBeVisible()
})

test('communauté : carte, membres et déconnexion', async ({ page }, testInfo) => {
  await openScreen(page, 'community')
  await expect(page.getByRole('heading', { name: 'Utilisateurs inscrits' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Carte des utilisateurs' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Camille Martin' })).toBeVisible()
  await capture(page, testInfo, 'communaute')
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page.getByLabel('Adresse e-mail', { exact: true })).toBeVisible()
})
