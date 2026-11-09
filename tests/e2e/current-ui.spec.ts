import { expect, test } from '@playwright/test'
import { capture, openApp } from './fixtures'

test('connexion : présentation mobile et envoi du lien', async ({ page }, testInfo) => {
  await openApp(page, 'request')
  await expect(page.getByRole('heading', { name: 'Bienvenue', exact: true })).toBeVisible()
  await expect(page.locator('.auth-mascot')).toBeVisible()
  await capture(page, testInfo, 'connexion')
  const montserrat = await page.evaluate(() => Array.from(document.fonts).some(f => f.family.replaceAll('"', '') === 'Montserrat' && f.status === 'loaded'))
  expect(montserrat).toBe(true)
  await page.getByLabel('Adresse e-mail', { exact: true }).fill('preview@example.com')
  await page.getByRole('button', { name: 'Recevoir mon lien de connexion' }).click()
  await expect(page.getByRole('heading', { name: 'Consulte ta boîte mail' })).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Activités populaires' })).toBeVisible()
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
