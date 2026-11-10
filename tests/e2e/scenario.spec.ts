import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { ME, capture, demoData, openApp } from './fixtures'

// Scénario de lancement (J5) : « Créer une activité » puis « Rechercher, s'inscrire et prendre contact ».
const today = () => new Date().toISOString().slice(0, 10)
function pickActivity(predicate: (a: ReturnType<typeof demoData>['activities'][number]) => boolean) {
  const { activities } = demoData()
  const titles = activities.map(a => a.title)
  return activities.find(a => a.date > today() && titles.filter(t => t === a.title).length === 1 && predicate(a))!
}

test('US-03 : Découvrir s’ouvre sur la carte, avec le panneau des activités proches', async ({ page }, testInfo) => {
  await openApp(page, 'app', '#/decouvrir')
  await expect(page.getByRole('region', { name: 'Carte des activités autour de toi' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Autour de toi', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Découvrir' })).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.discover-sheet__peek .activity-card').first()).toBeVisible()
  await capture(page, testInfo, 'decouvrir-carte', '.discover-sheet__peek .activity-card__media img')
  // Toucher une épingle met l'activité en avant dans le panneau.
  await page.locator('.map-pin-icon').first().click()
  await expect(page.locator('.discover-sheet__peek .activity-card.is-highlighted')).toBeVisible()
  // Le panneau s'ouvre sur le flux complet de la maquette 05.
  await page.getByRole('button', { name: 'Tout voir' }).click()
  await expect(page.getByRole('heading', { name: 'Activités populaires' })).toBeVisible()
  await capture(page, testInfo, 'decouvrir-flux', '.discover-sheet .activity-card__media img')
  await page.getByRole('button', { name: 'Voir la carte' }).click()
  await expect(page.getByRole('heading', { name: 'Activités populaires' })).toBeHidden()
})

test('US-07 : créer une activité en quatre étapes puis la retrouver', async ({ page }, testInfo) => {
  await openApp(page, 'app', '#/creer')
  await expect(page.getByRole('heading', { name: 'Créer une activité' })).toBeVisible()
  // Cas d'erreur : rien n'est rempli.
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByText('Donne un titre à ton activité.')).toBeVisible()
  await expect(page.getByText('Choisis une discipline.')).toBeVisible()
  await page.getByLabel('Titre de l’activité').fill('Aquarelle sur les quais du Rhône')
  await page.getByRole('button', { name: 'Peinture', exact: true }).click()
  await page.getByLabel('Description').fill('Peinture en plein air, matériel prêté, tous niveaux bienvenus.')
  await page.getByRole('button', { name: 'Débutant' }).click()
  await capture(page, testInfo, 'creation-etape-1')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByRole('heading', { name: 'Ajouter des médias' })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Illustration Peinture, variante 1/ })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByRole('heading', { name: 'Lieu, date et places' })).toBeVisible()
  await page.locator('.venue-option').first().click()
  await page.getByRole('button', { name: 'Ajouter une place' }).click()
  await expect(page.locator('#capacity')).toHaveValue('9')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByRole('heading', { name: 'Aperçu de ton activité' })).toBeVisible()
  await expect(page.getByText('9 places')).toBeVisible()
  await capture(page, testInfo, 'creation-apercu', '.preview-card img')
  await page.getByRole('button', { name: 'Publier l’activité' }).click()
  await expect(page.getByRole('heading', { name: 'Aquarelle sur les quais du Rhône' })).toBeVisible()
  await expect(page.getByText('Ton activité est publiée !')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Modifier' })).toBeVisible()
  // Visible dans la recherche et dans « Mes activités ».
  await page.getByRole('link', { name: 'Rechercher' }).click()
  await page.getByRole('combobox', { name: 'Rechercher' }).fill('quais du Rhône')
  await expect(page.getByRole('link', { name: 'Aquarelle sur les quais du Rhône' })).toBeVisible()
  await page.goto('/#/mes-activites')
  await expect(page.getByRole('heading', { name: /J’organise/ })).toBeVisible()
})

test('US-04/05/09/11/12 : rechercher, filtrer, s’inscrire et écrire au groupe', async ({ page }, testInfo) => {
  const target = pickActivity(a => a.participantIds.length < (a as { capacity: number }).capacity && !a.participantIds.includes(ME.uid) && a.organizerId !== ME.uid)
  await openApp(page, 'app', '#/rechercher')
  await page.getByRole('combobox', { name: 'Rechercher' }).fill(target.title)
  await page.getByRole('button', { name: /Ouvrir les filtres/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Filtres' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: 'Toutes', exact: true }).click()
  await capture(page, testInfo, 'filtres')
  await sheet.getByRole('button', { name: /^Afficher \d+ résultat/ }).click()
  await expect(sheet).toBeHidden()
  await page.getByRole('link', { name: target.title }).first().click()
  await expect(page.getByRole('heading', { name: target.title, level: 1 })).toBeVisible()
  await expect(page.getByText('Météo prévue : Éclaircies')).toBeVisible()
  await capture(page, testInfo, 'fiche-activite', '.detail__cover')
  await page.getByRole('button', { name: 'Participer' }).click()
  await expect(page.getByRole('heading', { name: 'Tu participes !' })).toBeVisible()
  await capture(page, testInfo, 'participation', '.confirm-card img')
  await page.getByRole('link', { name: 'Rejoindre le groupe de discussion' }).click()
  await expect(page.getByRole('list', { name: 'Messages du groupe' })).toBeVisible()
  await page.getByLabel('Écrire un message').fill('Bonjour à tous, j’ai hâte !')
  await page.getByRole('button', { name: 'Envoyer le message' }).click()
  await expect(page.locator('.message--mine').getByText('Bonjour à tous, j’ai hâte !')).toBeVisible()
  await capture(page, testInfo, 'conversation', '.chat-activity img')
  await page.goto('/#/conversations')
  await expect(page.getByText('Camille : Bonjour à tous, j’ai hâte !')).toBeVisible()
})

test('US-05 : aucun résultat, carte et réinitialisation', async ({ page }, testInfo) => {
  await openApp(page, 'app', '#/rechercher?q=zzzz')
  await expect(page.getByRole('heading', { name: 'Aucune activité trouvée par ici' })).toBeVisible()
  await capture(page, testInfo, 'aucun-resultat', '.mascot-state__image')
  await page.getByRole('button', { name: 'Voir toutes les activités' }).click()
  await expect(page.getByRole('heading', { name: 'Activités autour de moi' })).toBeVisible()
  await page.getByRole('button', { name: 'Carte' }).click()
  await expect(page.getByRole('region', { name: 'Carte des activités' })).toBeVisible()
  await expect(page.locator('.map-view__sheet .activity-card')).toBeVisible()
})

test('US-09/10 : activité complète, liste d’attente, désinscription et favoris', async ({ page }, testInfo) => {
  const full = pickActivity(a => a.participantIds.length >= a.capacity! && a.organizerId !== ME.uid && !a.participantIds.includes(ME.uid) && !a.offer && !a.waitlistIds?.includes(ME.uid))
  await openApp(page, 'app', `#/activite/${full.id}`)
  // Complet : on peut rejoindre la liste d'attente (sujet ART).
  await page.getByRole('button', { name: 'Rejoindre la liste d’attente' }).click()
  await expect(page.getByText('Tu es sur la liste d’attente : on te prévient si une place se libère.')).toBeVisible()
  const rank = (full.waitlistIds?.length ?? 0) + 1
  await expect(page.getByRole('heading', { name: `Tu es n°${rank} sur la liste d’attente` })).toBeVisible()
  await expect(page.getByText(`${rank} personne${rank > 1 ? 's' : ''} en liste d’attente`)).toBeVisible()
  await capture(page, testInfo, 'liste-attente')
  await page.getByRole('button', { name: 'Quitter la liste d’attente' }).click()
  await expect(page.getByRole('button', { name: 'Rejoindre la liste d’attente' })).toBeVisible()
  await page.getByRole('button', { name: /Ajouter « .* » aux favoris/ }).first().click()
  await page.goto('/#/favoris')
  await expect(page.getByRole('link', { name: full.title })).toBeVisible()
  // Désinscription d'une activité à laquelle l'utilisateur participe déjà.
  const joined = demoData().activities.find(a => a.participantIds.includes(ME.uid))!
  await page.goto(`/#/activite/${joined.id}`)
  await page.getByRole('button', { name: 'Quitter l’activité' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Quitter l’activité' }).click()
  await expect(page.getByText('Tu ne participes plus à cette activité.')).toBeVisible()
  await expect(page.getByRole('button', { name: /^(Participer|Rejoindre la liste d’attente)$/ })).toBeVisible()
})

test('Liste d’attente : la place libérée est notifiée puis confirmée', async ({ page }, testInfo) => {
  const offered = demoData().activities.find(a => a.offer?.uid === ME.uid)!
  await openApp(page, 'app', '#/decouvrir')
  // Message flottant à l'ouverture, et pastille sur la cloche.
  await expect(page.getByText(`Une place s’est libérée pour « ${offered.title} »`)).toBeVisible()
  await page.getByRole('link', { name: /^Notifications, \d+ nouvelles?$/ }).click()
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  const item = page.getByRole('link', { name: new RegExp(`Une place s’est libérée.*${offered.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })
  await expect(item).toBeVisible()
  await expect(page.getByRole('link', { name: /Liste d’attente.*Tu es n°2/ })).toBeVisible()
  await capture(page, testInfo, 'notifications')
  await page.getByRole('tab', { name: 'Messages' }).click()
  await expect(item).toBeHidden()
  await page.getByRole('tab', { name: 'Toutes' }).click()
  await item.click()
  await expect(page.getByRole('heading', { name: 'Une place s’est libérée pour toi !' })).toBeVisible()
  await capture(page, testInfo, 'place-proposee')
  await page.getByRole('button', { name: 'Confirmer ma place' }).click()
  await expect(page).toHaveURL(new RegExp(`#/activite/${offered.id}/participation`))
  // La place confirmée disparaît des notifications ; le groupe de l'activité y apparaît désormais.
  await page.goto('/#/notifications')
  await expect(page.getByRole('link', { name: /Une place s’est libérée/ })).toBeHidden()
  await page.getByRole('tab', { name: 'Messages' }).click()
  await expect(page.getByRole('link', { name: new RegExp(`Nouveau message.*${offered.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })).toBeVisible()
})

test('Contact : écrire en privé à l’organisateur avant de s’inscrire', async ({ page }, testInfo) => {
  const target = pickActivity(a => a.participantIds.length < a.capacity && !a.participantIds.includes(ME.uid) && a.organizerId !== ME.uid)
  const { users } = demoData()
  const organizer = users.find(u => u.uid === target.organizerId)!
  await openApp(page, 'app', `#/activite/${target.id}`)
  await page.getByRole('link', { name: `Contacter ${organizer.firstName}` }).click()
  await expect(page.getByRole('heading', { name: `${organizer.firstName} ${organizer.lastName}` })).toBeVisible()
  await expect(page.getByText(`seuls ${organizer.firstName} et toi pouvez la lire`)).toBeVisible()
  await expect(page.getByRole('link', { name: `À propos de « ${target.title} »` })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeHidden()
  await page.getByLabel(`Écrire à ${organizer.firstName} ${organizer.lastName}`).fill('Bonjour ! C’est ouvert aux débutants ?')
  await page.getByRole('button', { name: 'Envoyer le message' }).click()
  await expect(page.getByRole('list', { name: `Messages avec ${organizer.firstName} ${organizer.lastName}` }).getByText('Bonjour ! C’est ouvert aux débutants ?')).toBeVisible()
  await capture(page, testInfo, 'message-prive')
  // La conversation apparaît dans l'onglet « Privées », avec l'activité en contexte.
  await page.goto('/#/conversations?onglet=privees')
  const item = page.getByRole('link', { name: new RegExp(`${organizer.firstName} ${organizer.lastName}.*Toi : Bonjour`) })
  await expect(item).toBeVisible()
  await expect(item.getByText(`À propos de « ${target.title} »`)).toBeVisible()
})

test('Contact : message privé reçu, non lu puis lu', async ({ page }, testInfo) => {
  const { users, chats } = demoData()
  const sender = users.find(u => u.uid === chats[0]!.other)!
  await openApp(page, 'app', '#/decouvrir')
  await expect(page.getByRole('link', { name: /Conversations.*1 message privé non lu/ })).toBeVisible()
  await page.getByRole('link', { name: /Notifications, \d+ nouvelles?/ }).click()
  await page.getByRole('tab', { name: 'Messages' }).click()
  await expect(page.getByRole('link', { name: new RegExp(`Message privé.*${sender.firstName} ${sender.lastName} : Non, tout est fourni`) })).toBeVisible()
  await page.goto('/#/conversations')
  await page.getByRole('tab', { name: 'Privées (1)' }).click()
  await capture(page, testInfo, 'conversations-privees')
  await page.getByRole('link', { name: new RegExp(`${sender.firstName} ${sender.lastName}.*Non lu`) }).click()
  await expect(page.getByText('Non, tout est fourni, viens comme tu es !')).toBeVisible()
  await expect(page.getByText('Faut-il apporter son matériel ?')).toBeVisible()
  // Lu : plus de pastille sur l'onglet Conversations.
  await page.getByRole('button', { name: 'Retour' }).click()
  await expect(page.getByRole('tab', { name: 'Privées', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Conversations', exact: true })).toBeVisible()
})

test('Contact : depuis le groupe, toucher un prénom ouvre la conversation privée', async ({ page }) => {
  const { activities, messages, users } = demoData()
  const group = activities.find(a => a.participantIds.includes(ME.uid) && messages.some(m => m.activityId === a.id && (m as { authorId?: string }).authorId !== ME.uid))!
  const message = messages.find(m => m.activityId === group.id && (m as { authorId?: string }).authorId !== ME.uid) as { authorId: string; authorName: string }
  const author = users.find(u => u.uid === message.authorId)!
  await openApp(page, 'app', `#/conversations/${group.id}`)
  await expect(page.getByText('Touche le prénom de quelqu’un pour lui écrire en privé.')).toBeVisible()
  await page.getByRole('link', { name: `${message.authorName} : écrire en privé` }).first().click()
  await expect(page).toHaveURL(new RegExp(`#/messages/${author.uid}`))
  await expect(page.getByRole('heading', { name: `${author.firstName} ${author.lastName}` })).toBeVisible()
  await expect(page.getByRole('link', { name: `À propos de « ${group.title} »` })).toBeVisible()
})

test('Recherche : autocomplétion des activités, disciplines et lieux', async ({ page }, testInfo) => {
  const target = pickActivity(a => a.title.length > 10)
  await openApp(page, 'app', '#/decouvrir')
  const box = page.getByRole('combobox', { name: 'Rechercher' })
  const list = page.getByRole('listbox', { name: 'Suggestions de recherche' })
  // Une seule lettre : pas encore de suggestions.
  await box.fill(target.title.slice(0, 1))
  await expect(list).toBeHidden()
  // Activité : au clavier (flèche puis Entrée), ouverture directe de la fiche.
  await box.fill(target.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  await expect(list.getByRole('option').first()).toContainText(target.title)
  await expect(box).toHaveAttribute('aria-expanded', 'true')
  await capture(page, testInfo, 'autocompletion')
  await box.press('ArrowDown')
  await expect(box).toHaveAttribute('aria-activedescendant', /option-0$/)
  await box.press('Enter')
  await expect(page).toHaveURL(new RegExp(`#/activite/${target.id}$`))
  await expect(page.getByRole('heading', { name: target.title, level: 1 })).toBeVisible()
  // Discipline : ouvre la recherche filtrée.
  await page.goto('/#/decouvrir')
  await box.fill('dans')
  await expect(list.getByRole('option', { name: /^Danse\s*\d+ activités? à venir/ })).toBeVisible()
  await box.press('Escape')
  await expect(list).toBeHidden()
  await box.press('ArrowDown')
  await expect(list).toBeVisible()
  await list.getByRole('option', { name: /^Danse\s*\d+ activités? à venir/ }).click()
  await expect(page).toHaveURL(/#\/rechercher\?discipline=danse/)
  // Lieu, depuis l'écran Rechercher : devient la recherche.
  await page.goto('/#/rechercher')
  await box.fill('croix-r')
  await list.getByRole('option', { name: /^Croix-Rousse.*Quartier/ }).click()
  await expect(box).toHaveValue('Croix-Rousse')
  await expect(page.getByRole('heading', { name: 'Résultats pour « Croix-Rousse »' })).toBeVisible()
})

test('US-08 : modifier son activité sans descendre sous le nombre d’inscrits, puis la supprimer', async ({ page }, testInfo) => {
  const mine = demoData().activities.find(a => a.organizerId === ME.uid)!
  await openApp(page, 'app', `#/activite/${mine.id}/modifier`)
  await expect(page.getByRole('heading', { name: 'Modifier l’activité' })).toBeVisible()
  const registered = mine.participantIds.length
  await expect(page.getByText(`(minimum ${Math.max(2, registered)} places)`)).toBeVisible()
  await page.getByLabel('Titre de l’activité').fill('Atelier modifié')
  await capture(page, testInfo, 'modification', '.edit-cover img')
  // Photo de l'organisateur à la place de l'illustration (réduite puis envoyée à R2).
  await page.locator('.edit-cover__button').click()
  await page.locator('#cover-file').setInputFiles(resolve(__dirname, '../../frontend/public/images/novart-onboarding-profile-hd.webp'))
  await expect(page.getByRole('button', { name: 'Changer ma photo' })).toBeVisible()
  await expect(page.locator('.cover-picker__preview img')).toHaveAttribute('src', /api\.novart\.test\/files\/covers\//)
  await expect.poll(() => page.locator('.cover-picker__preview img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([1536, 960])
  await capture(page, testInfo, 'modification-photo', '.cover-picker__preview img')
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(page.getByRole('heading', { name: 'Atelier modifié', level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Modifier' }).click()
  await page.getByRole('button', { name: 'Supprimer l’activité' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByRole('heading', { name: 'Mes activités' })).toBeVisible()
  await expect(page.getByText('Activité supprimée.')).toBeVisible()
})

test('US-13/14 : profil, statistiques et modification des informations', async ({ page }, testInfo) => {
  await openApp(page, 'app', '#/profil')
  await expect(page.getByRole('heading', { name: 'Camille' })).toBeVisible()
  await expect(page.getByText('Activités à venir')).toBeVisible()
  await capture(page, testInfo, 'profil-app')
  await page.getByRole('link', { name: 'Mes informations' }).click()
  await page.getByLabel('Description').fill('Aquarelliste du dimanche.')
  await page.getByRole('button', { name: 'Théâtre' }).click()
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Aquarelliste du dimanche.')).toBeVisible()
  await expect(page.getByText('Peinture · Dessin · Musique · Théâtre')).toBeVisible()
})

test.describe('Position de l’appareil', () => {
  // Téléphone situé à Confluence (Lyon 2e), autorisation de localisation accordée.
  test.use({ geolocation: { latitude: 45.7426, longitude: 4.8185 }, permissions: ['geolocation'] })
  test('l’accueil part de la position réelle, pas du centre de Lyon', async ({ page }) => {
    await openApp(page, 'app', '#/decouvrir')
    await expect(page.getByText('Distances depuis ta position')).toBeVisible()
    await page.goto('/#/rechercher')
    await expect(page.getByText(/distances depuis ta position/)).toBeVisible()
  })
})

test('sans localisation, un message flottant prévient puis disparaît', async ({ page, context }) => {
  await context.clearPermissions()
  await openApp(page, 'app', '#/decouvrir')
  const toast = page.getByRole('status').filter({ hasText: 'les distances partent de ton adresse' })
  // Il passe après le message « place libérée », affiché en premier à l'ouverture.
  await expect(toast).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Distances depuis ton adresse')).toBeVisible()
  await expect(toast).toBeHidden({ timeout: 8000 })
})
