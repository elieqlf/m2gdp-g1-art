import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { ME, demoData, openApp } from './fixtures'

// Captures de l'application pour le site vitrine (landing/assets/screens), avec les données
// de démonstration. Ignoré par défaut ; à relancer quand l'interface change :
//   CAPTURE_LANDING=1 npx playwright test tests/e2e/landing-screens.spec.ts --project mobile
//   python3 scripts/design/landing-screens.py
// iPhone 13 (390 × 844) en ×2 : 780 × 1688 px, net dans les cadres de téléphone du site.
test.skip(!process.env.CAPTURE_LANDING, 'captures du site vitrine : CAPTURE_LANDING=1')
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const OUT = resolve(__dirname, '../../test-results/landing-screens')
const today = () => new Date().toISOString().slice(0, 10)

async function shoot(page: Page, name: string) {
  // Pas de messages flottants ni d'écran de chargement sur les captures.
  await page.addStyleTag({ content: '.toast, .novart-splash-screen { display: none !important } *, *::before, *::after { animation: none !important; transition: none !important }' })
  await page.evaluate(async () => {
    await document.fonts.ready
    document.querySelectorAll<HTMLImageElement>('img').forEach(image => { image.loading = 'eager' })
    await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => undefined)))
  })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  mkdirSync(OUT, { recursive: true })
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

test('captures de l’application pour le site vitrine', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'une seule série de captures')
  test.setTimeout(120_000)
  const { activities } = demoData()
  const upcoming = activities.filter(a => a.date > today())
  const joined = upcoming.find(a => a.participantIds.includes(ME.uid))!
  const featured = upcoming.find(a => a.organizerId !== ME.uid && !a.participantIds.includes(ME.uid) && a.participantIds.length >= 3 && a.participantIds.length < a.capacity && !a.waitlistIds?.length)!

  // Écran de connexion dans un onglet à part : changer seulement l'ancre ne recharge pas l'appli.
  const login = await page.context().newPage()
  await openApp(login, 'request')
  await expect(login.locator('.auth-mascot')).toBeVisible()
  await shoot(login, 'connexion')
  await login.close()

  await openApp(page, 'app', '#/decouvrir')
  await page.getByRole('button', { name: 'Tout voir' }).click()
  await expect(page.getByRole('heading', { name: 'Activités populaires' })).toBeVisible()
  await shoot(page, 'decouvrir')

  await page.goto('/#/rechercher')
  await expect(page.getByRole('searchbox')).toBeVisible()
  await shoot(page, 'rechercher')
  await page.goto('/#/rechercher?filtres=1')
  await expect(page.getByRole('dialog')).toBeVisible()
  await shoot(page, 'filtres')

  await page.goto(`/#/activite/${featured.id}`)
  await expect(page.getByRole('heading', { name: featured.title, level: 1 })).toBeVisible()
  await shoot(page, 'fiche')

  await page.goto(`/#/activite/${joined.id}/participation`)
  await expect(page.getByRole('heading', { name: 'Tu participes !' })).toBeVisible()
  await shoot(page, 'participation')

  await page.goto(`/#/conversations/${joined.id}`)
  await expect(page.locator('.message').first()).toBeVisible()
  await shoot(page, 'conversation')

  await page.goto('/#/mes-activites')
  await expect(page.getByRole('heading', { name: 'Mes activités' })).toBeVisible()
  await shoot(page, 'mes-activites')

  await page.goto('/#/profil')
  await expect(page.getByRole('heading', { name: 'Camille', level: 1 })).toBeVisible()
  await shoot(page, 'profil')

  await page.goto('/#/creer')
  await page.getByLabel('Titre de l’activité').fill('Aquarelle sur les quais du Rhône')
  await page.getByRole('button', { name: 'Peinture', exact: true }).click()
  await page.getByLabel('Description').fill('Peinture en plein air au bord du Rhône. Matériel prêté, tous niveaux bienvenus !')
  await page.getByRole('button', { name: 'Débutant' }).click()
  await shoot(page, 'creer')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.locator('.venue-option').first().click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByRole('heading', { name: 'Aperçu de ton activité' })).toBeVisible()
  await shoot(page, 'apercu')
})
