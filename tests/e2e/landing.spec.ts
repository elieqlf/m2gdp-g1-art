import { expect, test } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// Site vitrine statique (landing/) : ouvert directement depuis les fichiers.
const url = (page: string) => pathToFileURL(resolve(__dirname, '../../landing', page)).href
const pages = ['index.html', 'fonctionnement.html', 'faq.html', 'contact.html', 'legal.html']

for (const name of pages) {
  test(`site vitrine : ${name} sans débordement, visuels et polices chargés`, async ({ page }, testInfo) => {
    await page.goto(url(name))
    await expect(page.locator('#site-nav')).toBeAttached()
    await expect(page.locator('h1')).toBeVisible()
    const check = await page.evaluate(async () => {
      document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach(img => { img.loading = 'eager' })
      await Promise.all(Array.from(document.images).map(img => img.decode().catch(() => undefined)))
      await document.fonts.ready
      return {
        broken: Array.from(document.images).filter(img => img.naturalWidth === 0).map(img => img.getAttribute('src')),
        caveat: Array.from(document.fonts).some(f => f.family.replaceAll('"', '') === 'Caveat' && f.status === 'loaded'),
        // Netteté : une image matricielle doit avoir assez de pixels pour l'écran (densité ×1 à ×3).
        blurry: Array.from(document.images).filter(img => !img.currentSrc.endsWith('.svg') && img.getBoundingClientRect().width > 0
          && img.naturalWidth < img.getBoundingClientRect().width * Math.min(window.devicePixelRatio, 3) * 0.95).map(img => img.getAttribute('src')),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      }
    })
    expect(check).toEqual({ broken: [], caveat: true, blurry: [], overflow: false })
    await page.screenshot({ path: testInfo.outputPath(name.replace('.html', '.png')), fullPage: true })
  })
}

test('site vitrine : menu mobile et liens vers l’application', async ({ page }) => {
  await page.goto(url('index.html'))
  const toggle = page.getByRole('button', { name: 'Ouvrir le menu' })
  if (await toggle.isVisible()) {
    await toggle.click()
    await expect(page.getByRole('button', { name: 'Fermer le menu' })).toHaveAttribute('aria-expanded', 'true')
  }
  await expect(page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Ouvrir l’application' })).toHaveAttribute('href', 'https://novart-app.web.app')
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'FAQ' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('répondre à tes questions')
  await page.getByText('NOVART est-il gratuit ?').click()
  await expect(page.getByText('l’inscription et la participation aux activités sont gratuites')).toBeVisible()
})

test('site vitrine : le formulaire de contact vérifie la saisie', async ({ page }) => {
  await page.goto(url('contact.html'))
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('Saisis une adresse e-mail valide.')).toBeVisible()
  await expect(page.getByText('Merci d’accepter')).toBeVisible()
  await page.getByLabel('Prénom').fill('Camille')
  await page.getByLabel('Adresse e-mail').fill('camille@example.com')
  await page.getByLabel('Message').fill('Bonjour, je gère une MJC à Lyon 7e.')
  await page.getByText('Lieu ou association').click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByRole('status').getByText('Merci Camille')).toBeVisible()
  await expect(page.getByText('n’envoie pas encore de message')).toBeVisible()
})
