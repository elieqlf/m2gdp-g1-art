import { test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { ME, demoData, openApp } from './fixtures'

// Captures de l'application pour la page de présentation du projet (landing/presentation),
// avec les données de démonstration. Ignoré par défaut ; à relancer quand l'interface change :
//   CAPTURE_PRESENTATION=1 npx playwright test tests/e2e/presentation-screens.spec.ts --project mobile
//   python3 scripts/design/build-presentation.py --screens
test.skip(!process.env.CAPTURE_PRESENTATION, 'captures de la page de présentation : CAPTURE_PRESENTATION=1')
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const OUT = resolve(__dirname, '../../test-results/presentation-screens')
const today = () => new Date().toISOString().slice(0, 10)

async function shoot(page: Page, name: string) {
  await page.addStyleTag({ content: '.toast, .novart-splash-screen { display: none !important } *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important } :focus { outline: none !important }' })
  await page.evaluate(async () => {
    await document.fonts.ready
    document.querySelectorAll<HTMLImageElement>('img').forEach(image => { image.loading = 'eager' })
    await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => undefined)))
  })
  await page.waitForTimeout(400)
  mkdirSync(OUT, { recursive: true })
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

test('captures de l’application pour la page de présentation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'une seule série de captures')
  test.setTimeout(150_000)
  const { activities } = demoData()
  const group = activities.find(a => a.participantIds.includes(ME.uid) && a.date > today())!
  const featured = activities.find(a => a.date > today() && a.organizerId !== ME.uid && !a.participantIds.includes(ME.uid) && a.participantIds.length >= 3 && a.participantIds.length < a.capacity)!

  await openApp(page, 'app', '#/decouvrir')
  await page.waitForTimeout(2500)
  await shoot(page, 'carte')
  await page.getByRole('button', { name: /Afficher/ }).click()
  await shoot(page, 'apercu')

  await page.goto('/#/rechercher')
  await page.getByRole('combobox', { name: 'Rechercher' }).fill('dan')
  await page.waitForTimeout(400)
  await shoot(page, 'recherche')

  await page.goto(`/#/activite/${featured.id}`)
  await page.getByRole('heading', { level: 1 }).waitFor()
  await shoot(page, 'fiche')

  await page.goto(`/#/conversations/${group.id}`)
  await page.locator('.chat-activity__organizer').waitFor()
  await page.waitForTimeout(600)
  await shoot(page, 'conversation')

  await page.goto('/#/creer')
  await page.getByRole('button', { name: 'Danse', exact: true }).click()
  await page.getByRole('button', { name: /Trouver une idée avec l’IA/ }).click()
  await page.getByLabel('Mots-clés pour l’IA').fill('afro, parc, débutants')
  await page.getByRole('button', { name: 'Proposer des idées' }).click()
  await page.locator('.ai-idea').first().waitFor()
  await page.locator('.ai-ideas').evaluate(el => el.scrollIntoView({ block: 'start' }))
  await shoot(page, 'ia')
  await page.locator('.ai-idea .btn').first().click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await shoot(page, 'photo')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: /Choisir le lieu/ }).click()
  await shoot(page, 'lieu')
})
