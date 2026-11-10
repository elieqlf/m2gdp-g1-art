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
  await page.getByRole('button', { name: 'Peinture' }).click()
  await page.getByRole('button', { name: 'Créer mon profil' }).click()
  await expect(page.getByRole('heading', { name: 'Personnalise ton expérience' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByRole('heading', { name: 'Presque terminé !' })).toBeVisible()
  await page.getByRole('button', { name: 'Découvrir NOVART' }).click()
  await expect(page.getByRole('heading', { name: 'Activités populaires' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
})

test('communauté : profils publics sans coordonnées privées, puis déconnexion', async ({ page }, testInfo) => {
  await openApp(page, 'app', '#/communaute')
  await expect(page.getByRole('heading', { name: 'Les membres NOVART' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Carte des utilisateurs' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Julie Martin' })).toBeVisible()
  await expect(page.locator('.member-tile__address')).toHaveCount(0)
  await expect(page.getByText('Croix-Rousse, Lyon 4e')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('communaute.png'), fullPage: true })
  await page.getByRole('link', { name: 'Profil' }).click()
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page.getByLabel('Adresse e-mail', { exact: true })).toBeVisible()
})

test('carte : repères NOVART avec un symbole par discipline', async ({ page }, testInfo) => {
  await openApp(page, 'app', '#/rechercher?vue=carte&rayon=50&tri=date')
  await expect(page.getByRole('region', { name: 'Carte des activités' })).toBeVisible()
  await expect(page.locator('.map-pin').first()).toBeVisible()
  await expect.poll(() => page.locator('.map-pin__art').count()).toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('carte-novart.png'), fullPage: true })
})

test('proximité : sans localisation, expliquer les options et ouvrir les informations du profil', async ({ page }, testInfo) => {
  await openApp(page, 'app-no-location', '#/rechercher?filtres=1')
  await expect(page.getByRole('dialog', { name: 'Filtres' })).toBeVisible()
  await expect(page.getByLabel('Rayon : sans limite')).toBeDisabled()
  await expect(page.getByText('Aucun lieu n’est deviné à ta place.')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('filtres-sans-localisation.png'), fullPage: true })
  await page.getByRole('link', { name: 'Choisir ma ville' }).click()
  await expect(page.getByRole('heading', { name: 'Mes informations' })).toBeVisible()
})
