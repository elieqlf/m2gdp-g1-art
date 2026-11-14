<script setup lang="ts">
import { computed, defineAsyncComponent, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ArrowRight, Check, ChevronLeft, GraduationCap, Heart, Lightbulb, Mail, MapPin, Search, Sprout, Star, Users, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import AddressInput from '@/components/AddressInput.vue'
import BottomNav from '@/components/BottomNav.vue'
import { isValidEmail, hasSignInLink, pendingEmail, pendingSocialProvider, clearPendingSocialProvider, rememberedSessionChoice, setAuthPersistence, requestSignInLink, completeSignIn, signInWithSocialProvider, consumeSocialRedirect, observeAccount, getProfile, saveOnboardingProgress, saveProfile, logout, type Account, type Profile } from '@/services/firebase'
import type { AddressSelection } from '@/services/places'
import { InvalidEmailError, TooManyRequestsError } from '@/services/emailLink'
import { forgetLocalData } from '@/services/account'
import { disciplines } from '@/lib/activity'
import { imageUploadError, prepareImageUpload } from '@/lib/image-upload'
import { suggestCityOrNeighborhood } from '@/services/reverse-geocode'
import { rememberProfilePhoto } from '@/lib/profile-photo-history'
import { loadActivities, loadMembers, notifyPositionFallback, requestPosition, resetStore, startWatchers, store } from '@/lib/store'
import { tabOf, useRoute } from '@/lib/router'

type Screen = 'loading' | 'request' | 'sent' | 'confirm' | 'expired' | 'profile' | 'preferences' | 'complete' | 'app' | 'account-error'
type CityDetectionStatus = 'idle' | 'locating' | 'found' | 'denied' | 'unavailable' | 'unsupported'
const screen = ref<Screen>('loading')
const splashVisible = computed(() => import.meta.env.MODE !== 'test' && screen.value === 'loading')
const email = ref('')
const rememberMe = ref(rememberedSessionChoice())
const error = ref('')
const busy = ref(false)
const account = ref<Account | null>(null)
const cooldown = ref(0)
const route = useRoute()
function focusPageHeading() {
  if (screen.value !== 'app') return
  // Ne pas retirer le focus d'un champ où la personne a déjà commencé à écrire.
  const active = document.activeElement
  if (active && active !== document.body && document.getElementById('app-main')?.contains(active) && active.matches('input, textarea, select, [contenteditable="true"]')) return
  const heading = document.querySelector<HTMLElement>('#app-main h1')
  if (heading) {
    heading.tabIndex = -1
    heading.focus({ preventScroll: true })
  }
}
// Écrans de l'application connectée, choisis selon l'ancre (#/…).
const PageLoading = defineComponent({
  setup: () => () => h('p', { class: 'loading-line', role: 'status' }, [h('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Chargement de la page…']),
})
const PageLoadError = defineComponent({
  setup: () => () => h('section', { class: 'form-alert', role: 'alert' }, [
    'Cette page ne s’est pas chargée. Vérifie ta connexion puis ',
    h('button', { class: 'link-button', type: 'button', onClick: () => window.location.reload() }, 'réessaie'),
    '.',
  ]),
})
const asyncView = (loader: () => Promise<unknown>) => defineAsyncComponent({ loader: loader as never, loadingComponent: PageLoading, errorComponent: PageLoadError, delay: 0, timeout: 15_000 })
const views = {
  decouvrir: asyncView(() => import('@/views/DiscoverView.vue')),
  rechercher: asyncView(() => import('@/views/SearchView.vue')),
  activite: asyncView(() => import('@/views/ActivityView.vue')),
  participation: asyncView(() => import('@/views/ParticipationView.vue')),
  creer: asyncView(() => import('@/views/CreateActivityView.vue')),
  modifier: asyncView(() => import('@/views/EditActivityView.vue')),
  conversations: asyncView(() => import('@/views/ConversationsView.vue')),
  conversation: asyncView(() => import('@/views/ConversationView.vue')),
  'mes-activites': asyncView(() => import('@/views/MyActivitiesView.vue')),
  profil: asyncView(() => import('@/views/ProfileView.vue')),
  'profil-modifier': asyncView(() => import('@/views/ProfileEditView.vue')),
  favoris: asyncView(() => import('@/views/FavoritesView.vue')),
  communaute: asyncView(() => import('@/views/CommunityView.vue')),
  notifications: asyncView(() => import('@/views/NotificationsView.vue')),
  message: asyncView(() => import('@/views/PrivateChatView.vue')),
}
const currentView = computed(() => views[route.value.name])
const viewKey = computed(() => `${route.value.name}:${route.value.id ?? ''}`)
const showNav = computed(() => !['participation', 'conversation', 'message'].includes(route.value.name))
const selection = ref<AddressSelection | null>(null)
const cityDetectionStatus = ref<CityDetectionStatus>('idle')
const cityDetectionMessage = computed(() => {
  if (cityDetectionStatus.value === 'locating') return 'Détection de ta zone en cours.'
  if (cityDetectionStatus.value === 'found') return 'Ta zone a été préremplie automatiquement.'
  if (cityDetectionStatus.value === 'denied') return 'La localisation a été refusée. Tu peux saisir ta zone manuellement.'
  if (cityDetectionStatus.value === 'unsupported') return 'La détection n’est pas disponible. Tu peux saisir ta zone manuellement.'
  if (cityDetectionStatus.value === 'unavailable') return 'La détection est indisponible. Tu peux saisir ta zone manuellement.'
  return ''
})
const blankProfile = (): Profile => ({ firstName: '', lastName: '', userType: 'participant', address: '', addressLat: null, addressLng: null, photoUrl: '', bio: '', interests: [], practiceTags: [], discoveryRadiusKm: 10, useCurrentLocation: false, onboardingGoals: [], onboardingStep: 1 })
const profile = reactive<Profile>(blankProfile())
const isOnboardingScreen = computed(() => ['profile', 'preferences', 'complete'].includes(screen.value))
const onboardingStep = computed(() => screen.value === 'preferences' ? 2 : screen.value === 'complete' ? 3 : 1)
type PracticeOption = { key: string; label: string; disciplineId: string; disciplineLabel: string }
const normalizePractice = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr')
const practiceOptions = computed<PracticeOption[]>(() => disciplines.flatMap((discipline) => [
  { key: 'discipline:' + discipline.id, label: discipline.label, disciplineId: discipline.id, disciplineLabel: discipline.label },
  ...(discipline.subs ?? []).map((label: string) => ({ key: 'practice:' + discipline.id + ':' + normalizePractice(label).replace(/\s+/g, '-'), label, disciplineId: discipline.id, disciplineLabel: discipline.label })),
]))
const practiceQuery = ref('')
const practiceSuggestionsOpen = ref(false)
const selectedPracticeOptions = computed(() => {
  const selected = new Set(profile.practiceTags ?? [])
  return practiceOptions.value.filter(option => selected.has(option.key))
})
const matchingPracticeOptions = computed(() => {
  const query = normalizePractice(practiceQuery.value.trim())
  if (!query) return []
  const selected = new Set(profile.practiceTags ?? [])
  return practiceOptions.value.filter(option => !selected.has(option.key) && normalizePractice(option.label + ' ' + option.disciplineLabel).includes(query)).slice(0, 6)
})
const goalOptions = [
  { id: 'meet-people', label: 'Rencontrer du monde', icon: Users },
  { id: 'discover', label: 'Découvrir de nouvelles pratiques', icon: Sprout },
  { id: 'create', label: 'Créer ensemble', icon: Heart },
  { id: 'learn', label: 'Apprendre', icon: GraduationCap },
  { id: 'go-out', label: 'Sortir et se divertir', icon: Star },
  { id: 'inspiration', label: 'Être inspiré·e', icon: Lightbulb },
]
const confettiPieces = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: ((index * 37) % 100) + '%',
  delay: ((index % 8) * 0.055) + 's',
  duration: (1.55 + (index % 5) * 0.12) + 's',
  drift: (((index % 7) - 3) * 2.8) + 'vw',
  color: ['#FF0000', '#ff6573', '#ffadb5', '#ffd9dc'][index % 4],
}))
const photoInput = ref<HTMLInputElement | null>(null)
const photoBusy = ref(false)
const photoError = ref('')
const photoPreviewFailed = ref(false)
let unsubscribe: (() => void) | undefined
let countdown: ReturnType<typeof setInterval> | undefined
let accountRevision = 0
let cityPrefillAttempted = false
let cityDetectionRevision = 0
let authStateReady = false
let pendingSocialError = ''
const titles: Record<string, string> = { loading: '', request: 'Bienvenue', sent: 'Consulte ta boîte mail', confirm: 'Confirme ton e-mail', expired: 'Ce lien n’est plus valide', profile: 'Crée ton profil', preferences: 'Ton univers créatif', complete: 'Presque terminé !', 'account-error': 'Chargement interrompu' }
const title = computed(() => titles[screen.value] ?? '')
function startCooldown() {
  clearInterval(countdown)
  cooldown.value = 60
  countdown = setInterval(() => { cooldown.value--; if (cooldown.value <= 0) clearInterval(countdown) }, 1000)
}
async function sendLink() {
  farewell.value = false
  error.value = ''
  email.value = email.value.trim()
  if (!isValidEmail(email.value)) { error.value = 'Saisis une adresse e-mail valide.'; return }
  busy.value = true
  try {
    // Connexion et inscription suivent volontairement le même chemin e-mail :
    // Firebase ne révèle pas si l'adresse possède déjà un compte.
    await setAuthPersistence(rememberMe.value)
    await requestSignInLink(email.value)
    screen.value = 'sent'
    startCooldown()
  }
  catch (cause) {
    if (cause instanceof TooManyRequestsError) {
      const minutes = Math.max(1, Math.ceil(cause.retryAfter / 60))
      error.value = `Tu as demandé plusieurs liens d’affilée. Utilise le dernier reçu, ou réessaie dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
    } else if (cause instanceof InvalidEmailError) error.value = 'Saisis une adresse e-mail valide.'
    else error.value = 'Envoi impossible pour le moment. Vérifie ta connexion et réessaie.'
  }
  finally { busy.value = false }
}
function socialErrorMessage(cause: unknown, provider?: 'Apple' | 'Google') {
  const code = (cause as { code?: string })?.code
  if (code === 'auth/popup-closed-by-user') return 'La fenêtre Google a été fermée avant la fin de la connexion. Réessaie.'
  if (code === 'auth/popup-blocked') return 'Ton navigateur a bloqué la fenêtre Google. Autorise les fenêtres pop-up pour NOVART, puis réessaie.'
  if (code === 'auth/cancelled-popup-request') return 'Une connexion Google est déjà en cours. Termine-la ou ferme sa fenêtre, puis réessaie.'
  if (code === 'auth/unauthorized-domain') return 'Ajoute cette URL aux domaines autorisés de Firebase Authentication.'
  if (code === 'auth/operation-not-allowed') return `Active la connexion ${provider ?? 'sociale'} dans Firebase Authentication.`
  if (code === 'auth/invalid-oauth-provider' || code === 'auth/invalid-client-id') return `La configuration OAuth ${provider ?? ''} est incomplète dans Firebase.`
  if (code === 'auth/account-exists-with-different-credential') return 'Cet e-mail utilise déjà une autre méthode. Connecte-toi avec celle-ci.'
  if (code === 'auth/network-request-failed') return 'Connexion réseau interrompue. Réessaie.'
  if (code === 'auth/popup-blocked') return `La fenêtre ${provider ?? ''} a été bloquée. Autorise les fenêtres pop-up pour ce site, puis réessaie.`
  return `Connexion ${provider ?? 'sociale'} impossible${code ? ` (${code})` : ''}. Vérifie le fournisseur dans Firebase.`
}
async function startSocialSignIn(provider: 'apple' | 'google') {
  farewell.value = false
  error.value = ''
  busy.value = true
  try {
    const result = await signInWithSocialProvider(provider, rememberMe.value)
    if (result && account.value?.uid !== result.user.uid) await loadAccount(result.user)
  }
  catch (cause) {
    clearPendingSocialProvider()
    const code = (cause as { code?: string })?.code
    // Fenêtre fermée par la personne : ce n'est pas une erreur.
    if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request')
      error.value = socialErrorMessage(cause, provider === 'apple' ? 'Apple' : 'Google')
  }
  finally { busy.value = false }
}
async function handleSocialRedirect() {
  const provider = pendingSocialProvider()
  try {
    const result = await consumeSocialRedirect()
    if (result) {
      await loadAccount(result.user)
      clearPendingSocialProvider()
      return
    }
    if (provider) pendingSocialError = `La connexion ${provider === 'google' ? 'Google' : 'Apple'} a été interrompue. Réessaie.`
    clearPendingSocialProvider()
    if (provider && authStateReady && !account.value) await loadAccount(null)
  }
  catch (cause) {
    pendingSocialError = socialErrorMessage(cause, provider === 'apple' ? 'Apple' : provider === 'google' ? 'Google' : undefined)
    error.value = pendingSocialError
    clearPendingSocialProvider()
    if (authStateReady && !account.value) await loadAccount(null)
  }
}
function enterApp() {
  screen.value = 'app'
  Object.assign(store.profile, { ...profile })
  void loadActivities(true)
  void loadMembers(true)
  startWatchers()
  // Comme une application de carte, on part de la position réelle de l'appareil.
  if (store.gpsStatus === 'idle') void requestPosition().then(found => { if (!found) notifyPositionFallback() })
}
async function loadAccount(user: Account | null) {
  const revision = ++accountRevision
  account.value = user
  if (!user) {
    resetStore(); Object.assign(profile, blankProfile()); selection.value = null; photoPreviewFailed.value = false; practiceQuery.value = ''; practiceSuggestionsOpen.value = false; cityDetectionRevision++; cityPrefillAttempted = false; cityDetectionStatus.value = 'idle'; screen.value = 'request'
    error.value = pendingSocialError
    pendingSocialError = ''
    return
  }
  error.value = ''
  email.value = user.email ?? ''
  store.account = user
  screen.value = 'loading'
  try {
    const saved = await getProfile(user)
    if (revision !== accountRevision) return
    Object.assign(profile, blankProfile(), saved)
    photoPreviewFailed.value = false
    practiceQuery.value = ''
    practiceSuggestionsOpen.value = false
    if (!profile.practiceTags?.length && profile.interests?.length) {
      const legacyTags = profile.interests
        .map(id => practiceOptions.value.find(option => option.key === 'discipline:' + id)?.key)
        .filter((key): key is string => Boolean(key))
      profile.practiceTags = [...new Set(legacyTags)]
    }
    // Compte Google : prénom, nom et photo proposés à l'inscription (modifiables).
    if (user.displayName && !profile.firstName && !profile.lastName) {
      const [first = '', ...rest] = user.displayName.trim().split(/\s+/)
      profile.firstName = first
      profile.lastName = rest.join(' ')
    }
    if (!profile.photoUrl && user.photoURL) profile.photoUrl = user.photoURL
    if (profile.photoUrl) rememberProfilePhoto(user.uid, profile.photoUrl)
    store.profile = { ...saved }
    if (profile.useCurrentLocation) void requestPosition()
    // La première étape valide les informations personnelles ; les pratiques
    // artistiques se choisissent ensuite dans les préférences.
    const profileBasicsReady = typeof profile.firstName === 'string' && profile.firstName.trim().length > 0
    const interestsReady = Array.isArray(profile.interests) && profile.interests.length > 0
    if (!saved.profileComplete || !profileBasicsReady || !interestsReady) {
      const savedStep = Number(saved.onboardingStep) || 1
      if (!profileBasicsReady || savedStep <= 1) screen.value = 'profile'
      else if (!interestsReady) screen.value = 'preferences'
      else screen.value = savedStep >= 3 ? 'complete' : 'preferences'
      if (screen.value === 'profile' && !profile.address.trim()) {
        void nextTick().then(() => { if (screen.value === 'profile') startAutomaticCityDetection() })
      }
    } else enterApp()
  } catch {
    if (revision === accountRevision) { screen.value = 'account-error'; error.value = 'Impossible de charger ton profil. Vérifie ta connexion puis réessaie.' }
  }
}
function startAccountObserver() {
  if (!unsubscribe) unsubscribe = observeAccount(user => {
    authStateReady = true
    if (!user && pendingSocialProvider()) {
      screen.value = 'loading'
      return
    }
    void loadAccount(user)
  }, () => { authStateReady = true; screen.value = 'request'; error.value = 'Connexion indisponible. Réessaie.' })
}
async function finishLink() {
  if (!isValidEmail(email.value)) { error.value = 'Saisis une adresse e-mail valide.'; return }
  busy.value = true
  error.value = ''
  try {
    await completeSignIn(email.value.trim())
    window.history.replaceState({}, '', '/login.html')
    startAccountObserver()
  } catch (cause) {
    const code = (cause as { code?: string }).code
    if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') {
      screen.value = 'expired'; startCooldown()
    } else { screen.value = 'confirm'; error.value = 'Connexion impossible. Vérifie ton e-mail et ta connexion, puis réessaie.' }
  } finally { busy.value = false }
}
function selectPractice(option: PracticeOption) {
  const tags = new Set(profile.practiceTags ?? [])
  tags.add(option.key)
  profile.practiceTags = [...tags]
  profile.interests = [...new Set([...(profile.interests ?? []), option.disciplineId])]
  practiceQuery.value = ''
  practiceSuggestionsOpen.value = false
}
function selectFirstPractice() {
  const first = matchingPracticeOptions.value[0]
  if (first) selectPractice(first)
}
function removePractice(key: string) {
  profile.practiceTags = (profile.practiceTags ?? []).filter(tag => tag !== key)
  const selectedCategories = new Set(practiceOptions.value.filter(option => profile.practiceTags?.includes(option.key)).map(option => option.disciplineId))
  profile.interests = [...new Set((profile.interests ?? []).filter(id => selectedCategories.has(id)))]
}
function toggleGoal(id: string) {
  const selected = profile.onboardingGoals ?? []
  profile.onboardingGoals = selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]
}
function startAutomaticCityDetection() {
  if (cityPrefillAttempted || profile.address.trim()) return
  cityPrefillAttempted = true
  void detectCityFromPosition()
}
async function detectCityFromPosition() {
  if (cityDetectionStatus.value === 'locating' || profile.address.trim()) return
  const revision = ++cityDetectionRevision
  if (!('geolocation' in navigator)) {
    cityDetectionStatus.value = 'unsupported'
    return
  }
  cityDetectionStatus.value = 'locating'
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 })
    })
    if (revision !== cityDetectionRevision || profile.address.trim()) return
    const suggestion = await suggestCityOrNeighborhood(position.coords.latitude, position.coords.longitude)
    if (revision !== cityDetectionRevision || profile.address.trim()) return
    if (!suggestion) {
      cityDetectionStatus.value = 'unavailable'
      return
    }
    profile.address = suggestion
    profile.addressLat = null
    profile.addressLng = null
    selection.value = null
    cityDetectionStatus.value = 'found'
  } catch (cause) {
    if (revision !== cityDetectionRevision) return
    cityDetectionStatus.value = (cause as GeolocationPositionError)?.code === 1 ? 'denied' : 'unavailable'
  }
}
function handleAddressSelection(value: AddressSelection | null) {
  if (!value && profile.address.trim()) {
    if (cityDetectionStatus.value === 'locating') cityDetectionRevision++
    if (cityDetectionStatus.value === 'locating' || cityDetectionStatus.value === 'found') cityDetectionStatus.value = 'idle'
  }
  selection.value = value
  if (value) {
    profile.addressLat = value.lat
    profile.addressLng = value.lng
  } else {
    profile.addressLat = null
    profile.addressLng = null
  }
}
async function chooseProfilePhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  photoError.value = ''
  photoBusy.value = true
  try {
    const photo = await prepareImageUpload(file, 'profile')
    photoPreviewFailed.value = false
    profile.photoUrl = photo
    rememberProfilePhoto(account.value?.uid, photo)
  } catch (cause) { photoError.value = imageUploadError(cause, 'profile') }
  finally { photoBusy.value = false }
}
async function submitProfile() {
  error.value = ''
  if (!profile.firstName.trim()) { error.value = 'Indique ton prénom ou ton pseudo.'; return }
  if (!account.value) return
  busy.value = true
  try {
    const saved: Partial<Profile> = { firstName: profile.firstName.trim(), lastName: profile.lastName.trim(), bio: profile.bio?.trim() ?? '', userType: 'participant', address: profile.address.trim(), photoUrl: profile.photoUrl, addressLat: profile.addressLat, addressLng: profile.addressLng }
    await saveOnboardingProgress(account.value.uid, saved, 2)
    Object.assign(profile, saved, { onboardingStep: 2 })
    screen.value = 'preferences'
  } catch { error.value = 'Ton profil n’a pas pu être enregistré. Réessaie.' }
  finally { busy.value = false }
}
async function savePreferences() {
  if (!account.value) return
  error.value = ''
  if (!(profile.practiceTags?.length)) { error.value = 'Ajoute au moins une pratique artistique.'; return }
  busy.value = true
  try {
    const interests = [...new Set([...(profile.interests ?? []), ...selectedPracticeOptions.value.map(option => option.disciplineId)])]
    const saved: Partial<Profile> = { discoveryRadiusKm: profile.discoveryRadiusKm ?? 10, useCurrentLocation: !!profile.useCurrentLocation, interests, practiceTags: [...(profile.practiceTags ?? [])], onboardingGoals: [...(profile.onboardingGoals ?? [])] }
    await saveOnboardingProgress(account.value.uid, saved, 3)
    Object.assign(profile, saved, { onboardingStep: 3 })
    screen.value = 'complete'
  } catch { error.value = 'Tes préférences n’ont pas pu être enregistrées. Réessaie.' }
  finally { busy.value = false }
}
async function finishOnboarding() {
  if (!account.value) return
  error.value = ''
  busy.value = true
  try {
    const saved: Profile = { ...profile, firstName: profile.firstName.trim(), lastName: profile.lastName.trim(), bio: profile.bio?.trim() ?? '', userType: 'participant', address: profile.address.trim(), addressLat: profile.addressLat, addressLng: profile.addressLng, photoUrl: profile.photoUrl, interests: [...(profile.interests ?? [])], discoveryRadiusKm: profile.discoveryRadiusKm ?? 10, useCurrentLocation: !!profile.useCurrentLocation, onboardingGoals: [...(profile.onboardingGoals ?? [])], onboardingStep: 3, profileComplete: true }
    await saveProfile(account.value.uid, saved)
    Object.assign(profile, saved)
    enterApp()
  } catch { error.value = 'Ton inscription n’a pas pu être finalisée. Réessaie.' }
  finally { busy.value = false }
}
async function goBackOnboarding() {
  if (screen.value === 'complete') {
    screen.value = 'preferences'
    profile.onboardingStep = 2
    if (account.value) await saveOnboardingProgress(account.value.uid, {}, 2).catch(() => { error.value = 'La progression n’a pas pu être enregistrée.' })
    return
  }
  if (screen.value === 'preferences') {
    screen.value = 'profile'
    profile.onboardingStep = 1
    if (!profile.address.trim()) void nextTick().then(() => { if (screen.value === 'profile') startAutomaticCityDetection() })
    if (account.value) await saveOnboardingProgress(account.value.uid, {}, 1).catch(() => { error.value = 'La progression n’a pas pu être enregistrée.' })
    return
  }
  await disconnect()
}
// US-23 : compte supprimé par l'API. On oublie aussi ce qui reste sur cet appareil.
const farewell = ref(false)
async function accountDeleted() {
  forgetLocalData(account.value?.uid ?? '')
  farewell.value = true
  try { await logout() } catch { /* le compte n'existe plus : la session locale se ferme quand même */ }
}
async function disconnect() {
  busy.value = true
  error.value = ''
  try { await logout() }
  catch { error.value = 'Déconnexion impossible. Réessaie.' }
  finally { busy.value = false }
}
onMounted(() => {
  if (import.meta.env.MODE !== 'test') {
    for (const src of ['/images/novart-mascot-login.webp', '/images/novart-onboarding-complete-hd.webp', '/images/novart-logo-primary-vector.svg']) {
      const image = new Image()
      image.src = src
    }
  }
  if (hasSignInLink()) {
    email.value = pendingEmail()
    if (email.value) void finishLink()
    else screen.value = 'confirm'
  } else {
    startAccountObserver()
    void handleSocialRedirect()
  }
})
onBeforeUnmount(() => { unsubscribe?.(); clearInterval(countdown); accountRevision++ })
</script>

<template>
  <main v-if="splashVisible" class="novart-splash-screen" role="status" aria-label="Chargement de Novart">
    <img src="/images/novart-logo-submark-vivid.svg" class="novart-splash-mark" width="952" height="887" alt="Logo Novart" fetchpriority="high" />
    <span class="novart-splash-spinner" aria-hidden="true"></span>
    <span class="sr-only">Préparation de l’application…</span>
  </main>
  <div v-else-if="screen === 'app'" class="novart-app app-frame">
    <a href="#app-main" class="skip-link">Aller au contenu</a>
    <main id="app-main" class="app-main" :class="{ 'app-main--no-nav': !showNav }">
      <Transition name="view" mode="out-in" @after-enter="focusPageHeading">
        <component :is="currentView" :id="route.id" :key="viewKey" @logout="disconnect" @account-deleted="accountDeleted" />
      </Transition>
    </main>
    <BottomNav v-if="showNav" :active="tabOf(route.name)" />
    <p v-if="store.notice" class="toast" role="status">{{ store.notice }}</p>
    <p v-if="error" class="toast toast--error" role="alert">{{ error }}</p>
  </div>
  <div v-else class="novart-app" :class="{ 'novart-app--auth-home': screen === 'request', 'novart-app--onboarding': isOnboardingScreen }">
    <header v-if="account && !isOnboardingScreen" class="site-header">
      <a href="/" class="wordmark wordmark--compact" aria-label="Novart, accueil"><span class="brand-logo brand-logo--primary" aria-hidden="true"></span></a>
      <Button v-if="screen !== 'loading'" variant="outline" size="sm" :disabled="busy" @click="disconnect">Se déconnecter</Button>
    </header>

    <main v-if="isOnboardingScreen" class="onboarding-screen">
      <nav class="onboarding-topbar" aria-label="Étapes de création du compte">
        <button type="button" class="onboarding-back" aria-label="Retour" :disabled="busy" @click="goBackOnboarding"><ChevronLeft aria-hidden="true" /></button>
        <div class="onboarding-progress" aria-hidden="true">
          <span v-for="step in [1, 2, 3]" :key="step" :class="{ 'is-active': step <= onboardingStep }"></span>
        </div>
        <span class="onboarding-step-number">{{ onboardingStep }}/3</span>
      </nav>

      <div v-if="screen === 'complete'" class="onboarding-confetti" aria-hidden="true">
        <span
          v-for="piece in confettiPieces"
          :key="piece.id"
          class="onboarding-confetti-piece"
          :style="{ '--confetti-left': piece.left, '--confetti-delay': piece.delay, '--confetti-duration': piece.duration, '--confetti-drift': piece.drift, '--confetti-color': piece.color }"
        ></span>
      </div>

      <section :key="screen" class="onboarding-intro" :class="`onboarding-intro--${screen}`">
        <div class="onboarding-intro-copy">
          <h1>{{ title }}</h1>
          <p v-if="screen === 'profile'">Rejoins la communauté NOVART et découvre des activités artistiques près de chez toi.</p>
          <p v-else-if="screen === 'preferences'">Dis-nous ce qui t’inspire.</p>
          <p v-else>Un dernier petit pas pour rejoindre NOVART.</p>
        </div>
        <img
          :src="screen === 'profile' ? '/images/novart-onboarding-profile-hd.webp' : screen === 'preferences' ? '/images/novart-onboarding-location-hd.webp' : '/images/novart-onboarding-complete-hd.webp'"
          :alt="screen === 'profile' ? 'Le chat NOVART te souhaite la bienvenue' : screen === 'preferences' ? 'Le chat NOVART découvre une carte' : 'Le chat NOVART célèbre ton inscription'"
          class="onboarding-mascot"
          width="1536"
          height="1024"
          fetchpriority="high"
          decoding="async"
        />
      </section>

      <form v-if="screen === 'profile'" class="onboarding-form onboarding-form--profile" novalidate @submit.prevent="submitProfile">
        <div class="onboarding-photo-row">
          <button type="button" class="onboarding-photo-picker" :class="{ 'has-photo': !!profile.photoUrl && !photoPreviewFailed }" :disabled="photoBusy" :aria-label="profile.photoUrl && !photoPreviewFailed ? 'Modifier la photo de profil' : 'Choisir une photo depuis la galerie ou les fichiers'" @click="photoInput?.click()">
            <img v-if="profile.photoUrl && !photoPreviewFailed" :src="profile.photoUrl" alt="" @error="photoPreviewFailed = true" />
            <svg v-else class="onboarding-avatar-placeholder" viewBox="0 0 64 64" aria-hidden="true">
              <path class="onboarding-avatar-shadow" transform="translate(1.4 2.2)" d="M13 30 10.5 12.3c-.2-1.6 1.5-2.4 2.8-1.6l12 7.9a23 23 0 0 1 13.4 0l12-7.9c1.3-.8 3 .1 2.8 1.6L51 30c4.2 5 5.2 10.7 3 16-3.1 7.4-11.2 11.8-22 11.8S13.1 53.4 10 46c-2.2-5.3-1.2-11 3-16Z" />
              <path class="onboarding-avatar-cat" d="M13 30 10.5 12.3c-.2-1.6 1.5-2.4 2.8-1.6l12 7.9a23 23 0 0 1 13.4 0l12-7.9c1.3-.8 3 .1 2.8 1.6L51 30c4.2 5 5.2 10.7 3 16-3.1 7.4-11.2 11.8-22 11.8S13.1 53.4 10 46c-2.2-5.3-1.2-11 3-16Z" />
              <path class="onboarding-avatar-face" d="M21.5 36c.8-1.8 2.1-2.7 3.8-2.7m13.4 0c1.7 0 3 .9 3.8 2.7M28.5 42c2.1 2.1 4.9 2.1 7 0m-3.5 0v2.8m0 0c-1.2 1.1-2.3 1.1-3.4.1m3.4-.1c1.1 1 2.2 1 3.4-.1" />
              <circle class="onboarding-avatar-cheek" cx="20.5" cy="42" r="3.1" />
              <circle class="onboarding-avatar-cheek" cx="43.5" cy="42" r="3.1" />
            </svg>
            <span class="onboarding-photo-add" aria-hidden="true">+</span>
          </button>
          <input id="onboarding-photo" ref="photoInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" @change="chooseProfilePhoto" />
          <div class="onboarding-photo-copy"><strong>Photo de profil <span class="optional">(optionnelle)</span></strong><span>{{ photoBusy ? 'Préparation de ta photo…' : 'Appuie pour choisir dans ta galerie ou tes fichiers.' }}</span></div>
        </div>
        <p v-if="photoError" class="onboarding-error" role="alert">{{ photoError }}</p>

        <div class="onboarding-fields">
          <div class="onboarding-field">
            <Label for="onboarding-name">Prénom ou pseudo <span class="required-mark">*</span></Label>
            <Input id="onboarding-name" v-model="profile.firstName" autocomplete="given-name" placeholder="Ton prénom ou pseudo" required />
          </div>
          <div class="onboarding-field">
            <Label for="onboarding-email">Adresse e-mail <span class="required-mark">*</span></Label>
            <Input id="onboarding-email" v-model="email" type="email" autocomplete="email" readonly aria-readonly="true" />
          </div>
          <div class="onboarding-field">
            <div class="onboarding-location-label-row">
              <Label for="onboarding-city">Ta zone <span class="optional">(facultatif)</span></Label>
              <a class="onboarding-location-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" title="La détection utilise une position approximative avec ton autorisation." aria-label="© OpenStreetMap contributors">© OpenStreetMap contributors</a>
            </div>
            <div class="onboarding-address-field">
              <MapPin class="onboarding-field-icon" aria-hidden="true" />
              <AddressInput v-model="profile.address" input-id="onboarding-city" placeholder="Ex. : Belleville, Paris" :show-hint="false" @select="handleAddressSelection" />
            </div>
            <p class="sr-only" role="status" aria-live="polite">{{ cityDetectionMessage }}</p>
          </div>
          <div class="onboarding-field">
            <Label for="onboarding-bio">Quelques mots pour te présenter <span class="optional">(optionnel)</span></Label>
            <div class="counter-field"><textarea id="onboarding-bio" v-model="profile.bio" class="onboarding-bio-field" maxlength="160" rows="2" placeholder="Ce que tu aimes créer ou découvrir…"></textarea><span class="counter">{{ profile.bio?.length ?? 0 }}/160</span></div>
          </div>
        </div>

        <p v-if="error" class="onboarding-error" role="alert">{{ error }}</p>
        <button type="submit" class="onboarding-submit" :disabled="busy">
          <span>{{ busy ? 'Enregistrement…' : 'Créer mon profil' }}</span><ArrowRight aria-hidden="true" />
        </button>
      </form>

      <form v-else-if="screen === 'preferences'" class="onboarding-form onboarding-form--preferences" novalidate @submit.prevent="savePreferences">
        <fieldset class="onboarding-practice-section">
          <Label for="onboarding-practice">Qu’aimes-tu pratiquer ?</Label>
          <div class="onboarding-practice-picker" @focusout="event => { if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) practiceSuggestionsOpen = false }">
            <div class="onboarding-practice-input">
              <Search class="onboarding-practice-search-icon" aria-hidden="true" />
              <Input
                id="onboarding-practice"
                v-model="practiceQuery"
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="onboarding-practice-options"
                :aria-expanded="practiceSuggestionsOpen && matchingPracticeOptions.length > 0"
                placeholder="Ex. : aquarelle, hip-hop…"
                autocomplete="off"
                @focus="practiceSuggestionsOpen = true"
                @keydown.enter.prevent="selectFirstPractice"
                @keydown.escape.stop="practiceSuggestionsOpen = false"
              />
            </div>
            <ul v-if="practiceSuggestionsOpen && matchingPracticeOptions.length" id="onboarding-practice-options" class="onboarding-practice-suggestions" role="listbox" aria-label="Pratiques suggérées">
              <li v-for="option in matchingPracticeOptions" :key="option.key" role="presentation">
                <button type="button" role="option" :aria-selected="false" @mousedown.prevent @click="selectPractice(option)">
                  <span>{{ option.label }}</span><small>{{ option.disciplineLabel }}</small>
                </button>
              </li>
            </ul>
          </div>
          <div v-if="selectedPracticeOptions.length" class="onboarding-practice-tags" aria-label="Pratiques choisies">
            <button v-for="option in selectedPracticeOptions" :key="option.key" type="button" class="onboarding-practice-tag" :aria-label="'Retirer ' + option.label" @click="removePractice(option.key)">
              <span>{{ option.label }}</span><X aria-hidden="true" />
            </button>
          </div>
          <p v-if="practiceQuery && practiceSuggestionsOpen && !matchingPracticeOptions.length" class="onboarding-practice-empty">Aucune pratique trouvée.</p>
        </fieldset>

        <section class="onboarding-goal-section" aria-labelledby="onboarding-goal-title">
          <h2 id="onboarding-goal-title" class="onboarding-goal-heading">Qu’aimerais-tu trouver sur NOVART ?</h2>
          <p>Tu peux choisir plusieurs options.</p>
          <div class="onboarding-goal-grid" role="group" aria-labelledby="onboarding-goal-title">
            <button v-for="goal in goalOptions" :key="goal.id" type="button" class="onboarding-goal-card" :class="{ 'is-selected': profile.onboardingGoals?.includes(goal.id) }" :aria-pressed="profile.onboardingGoals?.includes(goal.id) ?? false" @click="toggleGoal(goal.id)">
              <component :is="goal.icon" aria-hidden="true" />
              <span>{{ goal.label }}</span>
            </button>
          </div>
        </section>

        <p v-if="error" class="onboarding-error" role="alert">{{ error }}</p>
        <button type="submit" class="onboarding-submit" :disabled="busy">
          <span>{{ busy ? 'Enregistrement…' : 'Continuer' }}</span><ArrowRight aria-hidden="true" />
        </button>
      </form>

      <section v-else class="onboarding-complete">
        <div class="onboarding-email-card">
          <h2>{{ account?.emailVerified ? 'Ton adresse est confirmée' : 'Ta connexion est confirmée' }}</h2>
          <p>{{ account?.emailVerified ? 'Adresse confirmée à ta connexion.' : 'Ton compte est prêt pour NOVART.' }}</p>
          <span class="onboarding-email-address">{{ account?.email }}</span>
        </div>
        <ol class="onboarding-timeline">
          <li class="is-complete"><span class="onboarding-timeline-mark"><Check aria-hidden="true" /></span><div><strong>Compte créé</strong><p>Tes informations sont bien enregistrées.</p></div></li>
          <li class="is-complete"><span class="onboarding-timeline-mark"><Check aria-hidden="true" /></span><div><strong>{{ account?.emailVerified ? 'E-mail confirmé' : 'Connexion sécurisée' }}</strong><p>{{ account?.emailVerified ? 'Ton adresse e-mail est validée.' : 'Ton compte est authentifié.' }}</p></div></li>
          <li class="is-current"><span class="onboarding-timeline-mark"><span>···</span></span><div><strong>C’est parti !</strong><p>Découvre les activités artistiques près de chez toi.</p></div></li>
        </ol>
        <p v-if="error" class="onboarding-error" role="alert">{{ error }}</p>
        <button type="button" class="onboarding-submit" :disabled="busy" @click="finishOnboarding">
          <span>{{ busy ? 'Ouverture de NOVART…' : 'Découvrir NOVART' }}</span><ArrowRight aria-hidden="true" />
        </button>
      </section>
    </main>

    <main v-else class="auth-layout" :class="{ 'auth-layout--profile': screen === 'profile', 'auth-layout--home': screen === 'request', 'auth-layout--home-has-error': screen === 'request' && !!error, 'auth-layout--status': ['sent', 'confirm', 'expired', 'account-error'].includes(screen), 'auth-layout--sent': screen === 'sent', 'auth-layout--confirm': screen === 'confirm' }">
      <section v-if="screen !== 'profile'" class="auth-story">
        <a href="/" class="wordmark wordmark--stacked" aria-label="Novart, accueil"><span class="brand-logo brand-logo--primary" aria-hidden="true"></span></a>
        <h1 class="brand-slogan"><span>L’art se crée ensemble</span></h1>
        <div class="auth-mascot-frame" :class="{ 'auth-sent-illustration': screen === 'sent' }">
          <img :src="screen === 'sent' ? '/images/novart-email-box-hd.png' : '/images/novart-mascot-login.webp'" alt="" class="auth-mascot" :width="screen === 'sent' ? 1536 : 1520" :height="screen === 'sent' ? 1024 : 1035" fetchpriority="high" decoding="async" />
                  </div>
      </section>
      <Card class="auth-panel" :class="{ 'auth-panel--home': screen === 'request' }">
        <CardHeader v-if="screen !== 'request' && screen !== 'loading'" class="auth-panel-heading">
          <div>
            <h1 v-if="screen === 'profile'" class="form-title">{{ title }}</h1>
            <h2 v-else class="form-title">{{ title }}</h2>
            <CardDescription v-if="screen === 'profile'">Quelques informations pour compléter ton inscription.</CardDescription>
          </div>
          <img v-if="screen === 'profile'" src="/images/novart-onboarding-profile-hd.webp" alt="" class="profile-mascot" width="1536" height="1024" />
        </CardHeader>
        <CardContent :class="screen === 'request' ? 'auth-panel-content--home' : screen === 'confirm' ? 'auth-panel-content--confirm' : 'space-y-5'">
          <form v-if="screen === 'request'" class="auth-home-form" novalidate @submit.prevent="sendLink">
            <p v-if="farewell" class="auth-farewell" role="status">Ton compte NOVART et tes données ont bien été supprimés. Merci d’être passé·e par là.</p>
            <div class="auth-social-buttons">
              <button type="button" class="auth-social-button" :disabled="busy" @click="startSocialSignIn('google')">
                <svg class="auth-social-icon auth-social-icon--google" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4 6l6.5 5c3.8-3.5 6.1-8.6 6.1-14.7Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.5-5c-1.8 1.2-4.1 2-7 2-5.4 0-10-3.7-11.7-8.7l-6.7 5.1C9 39.3 15.9 44 24 44Z"/><path fill="#FBBC05" d="M12.3 27.5a12 12 0 0 1 0-7l-6.7-5.1a20 20 0 0 0 0 17.2l6.7-5.1Z"/><path fill="#EA4335" d="M24 11.8c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.6 29.5 4 24 4 15.9 4 9 8.7 5.6 15.4l6.7 5.1c1.7-5 6.3-8.7 11.7-8.7Z"/></svg>
                <span>Continuer avec Google</span>
              </button>
            </div>
            <div class="auth-home-divider" aria-hidden="true"><span>ou</span></div>
            <div class="auth-home-field">
              <Label for="email" class="auth-home-label">Adresse e-mail</Label>
              <div class="field-control">
                <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>
                <Input id="email" v-model="email" type="email" autocomplete="email" inputmode="email" placeholder="exemple@mail.com" :aria-invalid="!!error" :aria-describedby="error ? 'form-error' : undefined" />
              </div>
            </div>
            <label class="auth-remember-control" for="remember-session">
              <input id="remember-session" v-model="rememberMe" type="checkbox" />
              <span>Rester connecté·e sur cet appareil</span>
            </label>
            <Button class="auth-continue-button" type="submit" :disabled="busy">
              <span>{{ busy ? 'Envoi en cours…' : 'Continuer' }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" /></svg>
            </Button>
        </form>
          <div v-else-if="screen === 'sent'" class="auth-sent-content">
            <p class="auth-sent-lead" :title="email"><span>Lien d’accès envoyé à</span><strong class="auth-sent-address">{{ email }}</strong></p>
            <p class="auth-sent-hint">Tu ne le vois pas ? Vérifie tes spams.</p>
            <Button variant="default" class="auth-sent-resend" :disabled="busy || cooldown > 0" @click="sendLink">{{ busy ? 'Envoi en cours…' : cooldown > 0 ? 'Renvoyer dans ' + cooldown + ' s' : 'Renvoyer le lien' }}</Button>
            <Button variant="link" class="auth-sent-change" @click="screen = 'request'; error = ''">Utiliser une autre adresse</Button>
          </div>
          <form v-else-if="screen === 'confirm'" class="auth-confirm-form" novalidate @submit.prevent="finishLink">
            <p class="auth-confirm-copy">Tu as ouvert le lien sur un autre appareil ? Indique la même adresse e-mail que celle à laquelle il a été envoyé.</p>
            <div class="auth-confirm-field"><Label for="confirm-email">Adresse e-mail utilisée</Label><div class="auth-confirm-input-wrap"><Mail aria-hidden="true" /><Input id="confirm-email" v-model="email" type="email" autocomplete="email" inputmode="email" placeholder="exemple@mail.com" :aria-invalid="!!error" /></div></div>
            <Button class="auth-confirm-button" type="submit" :disabled="busy"><span>{{ busy ? 'Vérification…' : 'Continuer' }}</span><ArrowRight aria-hidden="true" /></Button>
          </form>
          <form v-else-if="screen === 'expired'" class="space-y-5" novalidate @submit.prevent="sendLink">
            <p class="text-sm text-muted-foreground">Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien pour continuer.</p>
            <div class="space-y-2"><Label for="resend-email">Adresse e-mail</Label><Input id="resend-email" v-model="email" type="email" autocomplete="email" /></div>
            <Button class="w-full" type="submit" :disabled="busy || cooldown > 0">{{ cooldown > 0 ? `Renvoyer dans ${cooldown} s` : 'Recevoir un nouveau lien' }}</Button>
          </form>
          <Button v-else-if="screen === 'account-error'" class="w-full" @click="loadAccount(account)">Réessayer</Button>
          <Alert v-if="error" id="form-error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
        </CardContent>
      </Card>
    </main>
  </div>
</template>
