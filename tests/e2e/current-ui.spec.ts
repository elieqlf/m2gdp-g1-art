import { expect, test } from '@playwright/test'
import { capture, openApp } from './fixtures'

test('connexion : présentation mobile et envoi du lien', async ({ page }, testInfo) => {
  await openApp(page, 'request')
  await expect(page.getByRole('heading', { name: 'L’art se crée ensemble' })).toBeVisible()
  await expect(page.locator('.auth-mascot')).toBeVisible()
  await capture(page, testInfo, 'connexion')
  await page.getByLabel('Adresse e-mail', { exact: true }).fill('preview@example.com')
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Consulte ta boîte mail' })).toBeVisible()
})

test('inscription : les trois étapes mènent à Découvrir', async ({ page }, testInfo) => {
  await openApp(page, 'profile')
  await expect(page.getByRole('heading', { name: 'Crée ton profil' })).toBeVisible()
  await capture(page, testInfo, 'profil')
  await page.getByLabel('Prénom ou pseudo').fill('Camille')
  await page.getByLabel('Ville ou quartier').fill('Lyon')
  await page.getByRole('button', { name: 'Peinture' }).click()
  await page.getByRole('button', { name: 'Créer mon profil' }).click()
  await expect(page.getByRole('heading', { name: 'Personnalise ton expérience' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByRole('heading', { name: 'Presque terminé !' })).toBeVisible()
  await page.getByRole('button', { name: 'Découvrir NOVART' }).click()
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
