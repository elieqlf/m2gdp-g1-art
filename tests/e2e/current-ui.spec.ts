import { expect, test } from '@playwright/test'
import { capture, openApp } from './fixtures'

test('connexion : présentation mobile et envoi du lien', async ({ page }, testInfo) => {
  await openApp(page, 'request')
  // Écran de connexion refondu (branche hadi-app-ux) : slogan, mascotte, Google, e-mail.
  await expect(page.getByRole('heading', { name: 'L’art se crée ensemble' })).toBeVisible()
  await expect(page.locator('.auth-mascot')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuer avec Google' })).toBeVisible()
  await expect(page.getByLabel('Rester connecté·e sur cet appareil')).not.toBeChecked()
  await capture(page, testInfo, 'connexion', '.auth-mascot')
  await page.getByLabel('Rester connecté·e sur cet appareil').check()
  await page.getByLabel('Adresse e-mail', { exact: true }).fill('preview@example.com')
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Consulte ta boîte mail' })).toBeVisible()
})

test('connexion : continuer avec Google ouvre l’inscription pré-remplie', async ({ page }) => {
  await openApp(page, 'request')
  await page.getByRole('button', { name: 'Continuer avec Google' }).click()
  await expect(page.getByRole('heading', { name: 'Crée ton profil' })).toBeVisible()
  await expect(page.locator('#onboarding-name')).toHaveValue('Camille')
  await expect(page.locator('.onboarding-photo-picker.has-photo')).toBeVisible()
})

test('inscription : les trois étapes mènent à Découvrir', async ({ page }, testInfo) => {
  await openApp(page, 'profile')
  await expect(page.getByRole('heading', { name: 'Crée ton profil' })).toBeVisible()
  // Étape 1 : prénom ou pseudo, ville ou quartier.
  await page.getByRole('button', { name: 'Créer mon profil' }).click()
  await expect(page.getByRole('alert')).toContainText('Indique ton prénom ou ton pseudo')
  await page.locator('#onboarding-name').fill('Camille')
  await page.locator('#onboarding-city').fill('Lyon')
  await capture(page, testInfo, 'inscription-profil')
  await page.getByRole('button', { name: 'Créer mon profil' }).click()
  // Étape 2 : préférences, avec au moins une pratique choisie dans les suggestions.
  await expect(page.getByRole('heading', { name: 'Ton univers créatif' })).toBeVisible()
  await page.locator('#onboarding-practice').fill('Peinture')
  await page.getByRole('option', { name: /Peinture/ }).first().click()
  await capture(page, testInfo, 'inscription-preferences')
  await page.getByRole('button', { name: 'Continuer' }).click()
  // Étape 3 : récapitulatif.
  await expect(page.getByRole('heading', { name: 'Presque terminé !' })).toBeVisible()
  await page.getByRole('button', { name: 'Découvrir NOVART' }).click()
  await expect(page.getByRole('region', { name: 'Carte des activités autour de toi' })).toBeVisible()
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

test('profil : supprimer son compte, après confirmation (US-23)', async ({ page }, testInfo) => {
  await openApp(page, 'app', '#/profil')
  await page.getByRole('button', { name: 'Supprimer mon compte' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Supprimer ton compte ?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Annuler' })).toBeFocused()
  const confirm = dialog.getByRole('button', { name: 'Supprimer définitivement' })
  await expect(confirm).toBeDisabled()
  // Au clavier : la case « J'ai compris » est atteignable avant les boutons.
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('checkbox')).toBeFocused()
  await page.keyboard.press('Space')
  await expect(confirm).toBeEnabled()
  await capture(page, testInfo, 'suppression-compte')
  await confirm.click()
  await expect(dialog.getByRole('button', { name: 'Un instant…' })).toBeDisabled()
  await expect(page.getByRole('status').filter({ hasText: 'Ton compte NOVART et tes données ont bien été supprimés' })).toBeVisible()
  await expect(page.getByLabel('Adresse e-mail', { exact: true })).toBeVisible()
})

