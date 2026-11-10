<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ArrowRight, Camera, Check, ChevronLeft, GraduationCap, Heart, Lightbulb, Mail, MapPin, Sprout, Star, Users } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import AddressInput from '@/components/AddressInput.vue'
import DisciplineIcon from '@/components/DisciplineIcon.vue'
import BottomNav from '@/components/BottomNav.vue'
import DiscoverView from '@/views/DiscoverView.vue'
import SearchView from '@/views/SearchView.vue'
import ActivityView from '@/views/ActivityView.vue'
import ParticipationView from '@/views/ParticipationView.vue'
import CreateActivityView from '@/views/CreateActivityView.vue'
import EditActivityView from '@/views/EditActivityView.vue'
import ConversationsView from '@/views/ConversationsView.vue'
import ConversationView from '@/views/ConversationView.vue'
import MyActivitiesView from '@/views/MyActivitiesView.vue'
import ProfileView from '@/views/ProfileView.vue'
import ProfileEditView from '@/views/ProfileEditView.vue'
import FavoritesView from '@/views/FavoritesView.vue'
import CommunityView from '@/views/CommunityView.vue'
import NotificationsView from '@/views/NotificationsView.vue'
import PrivateChatView from '@/views/PrivateChatView.vue'
import { isValidEmail, hasSignInLink, pendingEmail, pendingSocialProvider, clearPendingSocialProvider, rememberedSessionChoice, setAuthPersistence, requestSignInLink, completeSignIn, signInWithSocialProvider, consumeSocialRedirect, observeAccount, getProfile, saveOnboardingProgress, saveProfile, logout, type Account, type Profile } from '@/services/firebase'
import type { AddressSelection } from '@/services/places'
import { InvalidEmailError, TooManyRequestsError } from '@/services/emailLink'
import { disciplines } from '@/lib/activity'
import { loadActivities, loadMembers, notifyPositionFallback, requestPosition, resetStore, startWatchers, store } from '@/lib/store'
import { tabOf, useRoute } from '@/lib/router'

type Screen = 'loading' | 'request' | 'sent' | 'confirm' | 'expired' | 'profile' | 'preferences' | 'complete' | 'app' | 'account-error'
const screen = ref<Screen>('loading')
const splashVisible = computed(() => import.meta.env.MODE !== 'test' && screen.value === 'loading')
const email = ref('')
const accountIntent = ref<'signin' | 'signup'>('signin')
const rememberMe = ref(rememberedSessionChoice())
const error = ref('')
const busy = ref(false)
const account = ref<Account | null>(null)
const cooldown = ref(0)
const route = useRoute()
// Écrans de l'application connectée, choisis selon l'ancre (#/…).
const views = { decouvrir: DiscoverView, rechercher: SearchView, activite: ActivityView, participation: ParticipationView, creer: CreateActivityView, modifier: EditActivityView, conversations: ConversationsView, conversation: ConversationView, 'mes-activites': MyActivitiesView, profil: ProfileView, 'profil-modifier': ProfileEditView, favoris: FavoritesView, communaute: CommunityView, notifications: NotificationsView, message: PrivateChatView }
const currentView = computed(() => views[route.value.name])
const viewKey = computed(() => `${route.value.name}:${route.value.id ?? ''}`)
const showNav = computed(() => !['participation', 'conversation', 'message'].includes(route.value.name))
const selection = ref<AddressSelection | null>(null)
const blankProfile = (): Profile => ({ firstName: '', lastName: '', userType: 'participant', address: '', addressLat: null, addressLng: null, photoUrl: '', interests: [], discoveryRadiusKm: 10, useCurrentLocation: false, onboardingGoals: [], onboardingStep: 1 })
const profile = reactive<Profile>(blankProfile())
const isOnboardingScreen = computed(() => ['profile', 'preferences', 'complete'].includes(screen.value))
const onboardingStep = computed(() => screen.value === 'preferences' ? 2 : screen.value === 'complete' ? 3 : 1)
const signupDisciplines = computed(() => disciplines.filter(d => ['peinture', 'dessin', 'musique', 'danse', 'photo', 'theatre', 'street-art', 'artisanat', 'autre'].includes(d.id)))
const goalOptions = [
  { id: 'meet-people', label: 'Rencontrer du monde', icon: Users },
  { id: 'discover', label: 'Découvrir de nouvelles pratiques', icon: Sprout },
  { id: 'create', label: 'Créer ensemble', icon: Heart },
  { id: 'learn', label: 'Apprendre', icon: GraduationCap },
  { id: 'go-out', label: 'Sortir et se divertir', icon: Star },
  { id: 'inspiration', label: 'Être inspiré·e', icon: Lightbulb },
]
const radiusOptions = [
  { label: '2 km', value: 2 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '20 km', value: 20 },
  { label: 'Toute la ville', value: null },
]
const photoInput = ref<HTMLInputElement | null>(null)
const showCityEditor = ref(false)
let unsubscribe: (() => void) | undefined
let countdown: ReturnType<typeof setInterval> | undefined
let accountRevision = 0
let authStateReady = false
let pendingSocialError = ''
const titles: Record<string, string> = { loading: '', request: 'Bienvenue', sent: 'Consulte ta boîte mail', confirm: 'Confirme ton e-mail', expired: 'Ce lien n’est plus valide', profile: 'Crée ton profil', preferences: 'Personnalise ton expérience', complete: 'Presque terminé !', 'account-error': 'Chargement interrompu' }
const title = computed(() => titles[screen.value] ?? '')
function startCooldown() {
  clearInterval(countdown)
  cooldown.value = 60
  countdown = setInterval(() => { cooldown.value--; if (cooldown.value <= 0) clearInterval(countdown) }, 1000)
}
function toggleAccountIntent() {
  accountIntent.value = accountIntent.value === 'signin' ? 'signup' : 'signin'
  document.getElementById('email')?.focus()
}
async function sendLink() {
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
    resetStore(); Object.assign(profile, blankProfile()); selection.value = null; screen.value = 'request'
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
    // Compte Google : prénom, nom et photo proposés à l'inscription (modifiables).
    if (user.displayName && !profile.firstName && !profile.lastName) {
      const [first = '', ...rest] = user.displayName.trim().split(/\s+/)
      profile.firstName = first
      profile.lastName = rest.join(' ')
    }
    if (!profile.photoUrl && user.photoURL) profile.photoUrl = user.photoURL
    store.profile = { ...saved }
    if (profile.useCurrentLocation) void requestPosition()
    // Le drapeau historique peut être périmé : les champs obligatoires restent la référence.
    const requiredProfileReady = typeof profile.firstName === 'string'
      && profile.firstName.trim().length > 0
      && typeof profile.address === 'string'
      && profile.address.trim().length > 0
      && Array.isArray(profile.interests)
      && profile.interests.length > 0
    // Après authentification, les profils incomplets reprennent la bonne étape.
    if (!saved.profileComplete || !requiredProfileReady) {
      const step = requiredProfileReady ? Number(saved.onboardingStep) || 2 : 1
      screen.value = step >= 3 ? 'complete' : step === 2 ? 'preferences' : 'profile'
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
function toggleInterest(id: string) {
  const selected = profile.interests ?? []
  profile.interests = selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]
}
function toggleGoal(id: string) {
  const selected = profile.onboardingGoals ?? []
  profile.onboardingGoals = selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]
}
function handleAddressSelection(value: AddressSelection | null) {
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
  if (!file.type.startsWith('image/')) { error.value = 'Choisis un fichier image.'; return }
  if (file.size > 10 * 1024 * 1024) { error.value = 'Cette image est trop lourde (10 Mo maximum).'; return }
  error.value = ''
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('invalid-image')); image.src = url })
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = 384
    canvas.height = 384
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas-unavailable')
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 384, 384)
    profile.photoUrl = canvas.toDataURL('image/webp', .84)
  } catch { error.value = 'Cette image n’a pas pu être chargée. Réessaie avec un autre fichier.' }
  finally { URL.revokeObjectURL(url) }
}
async function submitProfile() {
  error.value = ''
  if (!profile.firstName.trim() || !profile.address.trim()) { error.value = 'Indique ton prénom ou pseudo et ta ville ou ton quartier.'; return }
  if (!(profile.interests?.length)) { error.value = 'Choisis au moins un centre d’intérêt artistique.'; return }
  if (!account.value) return
  busy.value = true
  try {
    const saved: Partial<Profile> = { firstName: profile.firstName.trim(), lastName: profile.lastName.trim(), userType: 'participant', address: profile.address.trim(), photoUrl: profile.photoUrl, addressLat: profile.addressLat, addressLng: profile.addressLng, interests: [...(profile.interests ?? [])] }
    await saveOnboardingProgress(account.value.uid, saved, 2)
    Object.assign(profile, saved, { onboardingStep: 2 })
    screen.value = 'preferences'
  } catch { error.value = 'Ton profil n’a pas pu être enregistré. Réessaie.' }
  finally { busy.value = false }
}
async function toggleCurrentLocation() {
  error.value = ''
  if (profile.useCurrentLocation) {
    profile.useCurrentLocation = false
    store.gps = null
    return
  }
  busy.value = true
  try {
    const enabled = await requestPosition()
    if (!enabled) { error.value = 'La localisation n’est pas disponible. Tu peux continuer avec ta ville ou ton quartier.'; return }
    profile.useCurrentLocation = true
  } finally { busy.value = false }
}
async function savePreferences() {
  if (!account.value) return
  error.value = ''
  busy.value = true
  try {
    const saved: Partial<Profile> = { discoveryRadiusKm: profile.discoveryRadiusKm ?? 10, useCurrentLocation: !!profile.useCurrentLocation, onboardingGoals: [...(profile.onboardingGoals ?? [])] }
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
    const saved: Profile = { ...profile, firstName: profile.firstName.trim(), lastName: profile.lastName.trim(), userType: 'participant', address: profile.address.trim(), addressLat: profile.addressLat, addressLng: profile.addressLng, photoUrl: profile.photoUrl, interests: [...(profile.interests ?? [])], discoveryRadiusKm: profile.discoveryRadiusKm ?? 10, useCurrentLocation: !!profile.useCurrentLocation, onboardingGoals: [...(profile.onboardingGoals ?? [])], onboardingStep: 3, profileComplete: true }
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
    if (account.value) await saveOnboardingProgress(account.value.uid, {}, 1).catch(() => { error.value = 'La progression n’a pas pu être enregistrée.' })
    return
  }
  await disconnect()
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
    for (const src of ['/images/novart-mascot-login.webp', '/images/novart-logo-primary-vector.svg']) {
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
      <component :is="currentView" :id="route.id" :key="viewKey" @logout="disconnect" />
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

      <section class="onboarding-intro" :class="`onboarding-intro--${screen}`">
        <div class="onboarding-intro-copy">
          <h1>{{ title }}</h1>
          <p v-if="screen === 'profile'">Rejoins la communauté NOVART et découvre des activités artistiques près de chez toi.</p>
          <p v-else-if="screen === 'preferences'">Quelques choix pour te proposer des activités qui te correspondent.</p>
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
          <label for="onboarding-photo" class="onboarding-photo-picker" :class="{ 'has-photo': !!profile.photoUrl }" aria-label="Ajouter une photo de profil, optionnel">
            <img v-if="profile.photoUrl" :src="profile.photoUrl" alt="Aperçu de la photo de profil" />
            <Camera v-else aria-hidden="true" />
            <span class="onboarding-photo-add" aria-hidden="true">+</span>
          </label>
          <input id="onboarding-photo" ref="photoInput" class="sr-only" type="file" accept="image/*" @change="chooseProfilePhoto" />
          <div class="onboarding-photo-copy"><strong>Photo de profil</strong><span>Ajoute une photo pour te présenter <span class="optional">(au choix)</span></span></div>
        </div>

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
            <Label for="onboarding-city">Ville ou quartier <span class="required-mark">*</span></Label>
            <div class="onboarding-address-field">
              <MapPin class="onboarding-field-icon" aria-hidden="true" />
              <AddressInput v-model="profile.address" input-id="onboarding-city" placeholder="Ex. : Paris, Belleville" @select="handleAddressSelection" />
            </div>
          </div>
        </div>

        <fieldset class="onboarding-interest-section">
          <legend>Tes centres d’intérêt artistiques</legend>
          <p>Choisis au moins un domaine qui t’intéresse.</p>
          <div class="onboarding-interest-grid">
            <button v-for="discipline in signupDisciplines" :key="discipline.id" type="button" class="onboarding-interest-chip" :class="{ 'is-selected': profile.interests?.includes(discipline.id) }" :aria-pressed="profile.interests?.includes(discipline.id) ?? false" @click="toggleInterest(discipline.id)">
              <DisciplineIcon :discipline="discipline.id" />
              <span>{{ discipline.label }}</span>
              <span v-if="profile.interests?.includes(discipline.id)" class="onboarding-chip-check"><Check aria-hidden="true" /></span>
            </button>
          </div>
        </fieldset>

        <p v-if="error" class="onboarding-error" role="alert">{{ error }}</p>
        <button type="submit" class="onboarding-submit" :disabled="busy">
          <span>{{ busy ? 'Enregistrement…' : 'Créer mon profil' }}</span><ArrowRight aria-hidden="true" />
        </button>
      </form>

      <form v-else-if="screen === 'preferences'" class="onboarding-form onboarding-form--preferences" novalidate @submit.prevent="savePreferences">
        <section class="onboarding-preference-section">
          <div class="onboarding-section-heading">
            <MapPin aria-hidden="true" />
            <div><h2>Jusqu’où veux-tu découvrir des activités ?</h2><p>Choisis un rayon autour de ta localisation.</p></div>
          </div>
          <div class="onboarding-radius-options" role="group" aria-label="Rayon de découverte">
            <button v-for="option in radiusOptions" :key="option.label" type="button" :class="{ 'is-selected': profile.discoveryRadiusKm === option.value }" :aria-pressed="profile.discoveryRadiusKm === option.value" @click="profile.discoveryRadiusKm = option.value">{{ option.label }}</button>
          </div>
          <button type="button" class="onboarding-location-toggle" role="switch" :aria-checked="!!profile.useCurrentLocation" :disabled="busy" @click="toggleCurrentLocation">
            <span class="onboarding-location-icon" aria-hidden="true"><span></span></span>
            <span class="onboarding-location-copy"><strong>Utiliser ma localisation actuelle</strong><small>Pour te proposer des activités près de toi.</small></span>
            <span class="onboarding-switch" aria-hidden="true"><span></span></span>
          </button>
          <button type="button" class="onboarding-city-toggle" :aria-expanded="showCityEditor" @click="showCityEditor = !showCityEditor">
            <MapPin aria-hidden="true" />
            <span><strong>Utiliser ma ville ou mon quartier</strong><small>{{ profile.address || 'Choisis ta zone de découverte' }}</small></span>
            <ChevronLeft aria-hidden="true" />
          </button>
          <div v-if="showCityEditor" class="onboarding-city-editor">
            <Label for="onboarding-city-edit">Ville ou quartier</Label>
            <div class="onboarding-address-field">
              <MapPin class="onboarding-field-icon" aria-hidden="true" />
              <AddressInput v-model="profile.address" input-id="onboarding-city-edit" placeholder="Ex. : Paris, Belleville" @select="handleAddressSelection" />
            </div>
          </div>
        </section>

        <fieldset class="onboarding-preference-section onboarding-goal-section">
          <legend><Heart aria-hidden="true" />Ce que tu recherches sur NOVART</legend>
          <p>Tu peux choisir plusieurs options.</p>
          <div class="onboarding-goal-grid">
            <button v-for="goal in goalOptions" :key="goal.id" type="button" class="onboarding-goal-card" :class="{ 'is-selected': profile.onboardingGoals?.includes(goal.id) }" :aria-pressed="profile.onboardingGoals?.includes(goal.id) ?? false" @click="toggleGoal(goal.id)">
              <component :is="goal.icon" aria-hidden="true" />
              <span>{{ goal.label }}</span>
              <span v-if="profile.onboardingGoals?.includes(goal.id)" class="onboarding-chip-check"><Check aria-hidden="true" /></span>
            </button>
          </div>
        </fieldset>

        <p v-if="error" class="onboarding-error" role="alert">{{ error }}</p>
        <button type="submit" class="onboarding-submit" :disabled="busy">
          <span>{{ busy ? 'Enregistrement…' : 'Continuer' }}</span><ArrowRight aria-hidden="true" />
        </button>
      </form>

      <section v-else class="onboarding-complete">
        <div class="onboarding-email-card">
          <span class="onboarding-email-icon"><Mail aria-hidden="true" /><span><Check aria-hidden="true" /></span></span>
          <h2>{{ account?.emailVerified ? 'Ton adresse est confirmée' : 'Ta connexion est confirmée' }}</h2>
          <p>{{ account?.emailVerified ? 'Elle a été vérifiée lors de ta connexion sécurisée.' : 'Ton compte est prêt à rejoindre la communauté.' }}</p>
          <span class="onboarding-email-address"><Mail aria-hidden="true" />{{ account?.email }}</span>
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

    <main v-else class="auth-layout" :class="{ 'auth-layout--profile': screen === 'profile', 'auth-layout--home': screen === 'request', 'auth-layout--home-has-error': screen === 'request' && !!error, 'auth-layout--status': ['sent', 'confirm', 'expired', 'account-error'].includes(screen), 'auth-layout--sent': screen === 'sent' }">
      <section v-if="screen !== 'profile'" class="auth-story">
        <a href="/" class="wordmark wordmark--stacked" aria-label="Novart, accueil"><span class="brand-logo brand-logo--primary" aria-hidden="true"></span></a>
        <h1 class="brand-slogan"><span>L’art se crée ensemble</span></h1>
        <div class="auth-mascot-frame">
          <img src="/images/novart-mascot-login.webp" alt="" class="auth-mascot" width="1520" height="1035" fetchpriority="high" decoding="async" />
        </div>
      </section>
      <Card class="auth-panel" :class="{ 'auth-panel--home': screen === 'request' }">
        <CardHeader v-if="screen !== 'request' && screen !== 'loading'" class="auth-panel-heading">
          <div>
            <h1 v-if="screen === 'profile'" class="form-title">{{ title }}</h1>
            <h2 v-else class="form-title">{{ title }}</h2>
            <CardDescription v-if="screen === 'profile'">Quelques informations pour compléter ton inscription.</CardDescription>
          </div>
          <img v-if="screen === 'profile'" src="/images/novart-mascot-joy.webp" alt="" class="profile-mascot" width="159" height="133" />
        </CardHeader>
        <CardContent :class="screen === 'request' ? 'auth-panel-content--home' : 'space-y-5'">
          <form v-if="screen === 'request'" class="auth-home-form" novalidate @submit.prevent="sendLink">
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
            <p class="auth-account-switch">
              <span>{{ accountIntent === 'signin' ? 'Pas encore de compte ?' : 'Tu as déjà un compte ?' }}</span>
              <button type="button" class="auth-account-switch-link" @click="toggleAccountIntent">{{ accountIntent === 'signin' ? 'Créer un compte' : 'Se connecter' }}</button>
            </p>
          </form>
          <div v-else-if="screen === 'sent'" class="auth-sent-content">
            <span class="auth-sent-icon" aria-hidden="true"><Mail /><Check /></span>
            <p class="auth-sent-lead">Le lien pour accéder à NOVART a été envoyé à</p>
            <div class="auth-sent-address"><Mail aria-hidden="true" /><strong>{{ email }}</strong></div>
            <p class="auth-sent-next">Ouvre-le sur cet appareil pour te connecter. Si tu découvres NOVART, tu pourras ensuite créer ton profil.</p>
            <p class="auth-sent-hint">Tu ne vois pas le message ? Regarde dans tes courriers indésirables.</p>
            <Button variant="outline" class="auth-sent-resend" :disabled="busy || cooldown > 0" @click="sendLink">{{ cooldown > 0 ? `Renvoyer le lien dans ${cooldown} s` : 'Renvoyer le lien' }}</Button>
            <Button variant="link" class="auth-sent-change" @click="screen = 'request'; error = ''">Utiliser une autre adresse</Button>
          </div>
          <form v-else-if="screen === 'confirm'" class="space-y-5" novalidate @submit.prevent="finishLink">
            <p class="text-sm text-muted-foreground">Tu as ouvert le lien sur un autre appareil ? Indique la même adresse e-mail que celle à laquelle il a été envoyé.</p>
            <div class="space-y-2"><Label for="confirm-email">Adresse e-mail</Label><Input id="confirm-email" v-model="email" type="email" autocomplete="email" /></div>
            <Button class="w-full" type="submit" :disabled="busy">{{ busy ? 'Connexion…' : 'Confirmer mon e-mail' }}</Button>
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
    <footer class="site-footer">Novart · Une communauté de pratiques artistiques.</footer>
  </div>
</template>
