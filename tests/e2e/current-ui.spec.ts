import { expect, test } from '@playwright/test'
import { capture, openApp } from './fixtures'

test('connexion : présentation mobile et envoi du lien', async ({ page }, testInfo) => {
  await openApp(page, 'request')
  // Écran de connexion refondu (branche hadi-app-ux) : slogan, mascotte, Google, e-mail.
  await expect(page.getByRole('heading', { name: 'L’art se crée ensemble' })).toBeVisible()
  await expect(page.locator('.auth-mascot')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuer avec Google' })).toBeVisible()
  await expect(page.getByLabel('Rester connecté·e sur cet appareil')).not.toBeChecked()
  await capture(page, testInfo, 'connexion', '.auth-mascot', 'Caveat')
  await page.getByLabel('Rester connecté·e sur cet appareil').check()
  await page.getByLabel('Adresse e-mail', { exact: true }).fill('preview@example.com')
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Consulte ta boîte mail' })).toBeVisible()
})

test('connexion : continuer avec Google ouvre l’inscription', async ({ page }) => {
  await openApp(page, 'request')
  await page.getByRole('button', { name: 'Continuer avec Google' }).click()
  await expect(page.getByRole('heading', { name: 'Faisons connaissance' })).toBeVisible()
})

test('profil : champs existants puis arrivée sur Découvrir', async ({ page }, testInfo) => {
  await openApp(page, 'profile')
  await expect(page.getByRole('heading', { name: 'Faisons connaissance' })).toBeVisible()
  await expect(page.getByLabel('Je souhaite participer en tant que')).toHaveText('Participant')
  await capture(page, testInfo, 'profil')
  await page.getByLabel('Prénom', { exact: true }).fill('Camille')
  await page.getByLabel('Nom', { exact: true }).fill('Martin')
  await page.getByLabel('Adresse', { exact: true }).fill('Lyon')
  await page.getByRole('button', { name: 'Terminer mon inscription' }).click()
  await expect(page.getByRole('region', { name: 'Carte des activités autour de toi' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
})

test('communauté : carte, membres et déconnexion depuis le profil', async ({ page }, testInfo) => {
  await openApp(page, 'app', '#/communaute')
  await expect(page.getByRole('heading', { name: 'Utilisateurs inscrits' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Carte des utilisateurs' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Julie Martin' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('communaute.png'), fullPage: true })
  await page.getByRole('link', { name: 'Profil' }).click()
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page.getByLabel('Adresse e-mail', { exact: true })).toBeVisible()
})
