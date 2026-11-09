<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import AddressInput from '@/components/AddressInput.vue'
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
import { isValidEmail, hasSignInLink, pendingEmail, pendingSocialProvider, clearPendingSocialProvider, rememberedSessionChoice, setAuthPersistence, requestSignInLink, completeSignIn, signInWithSocialProvider, consumeSocialRedirect, observeAccount, getProfile, saveProfile, logout, type Account, type Profile } from '@/services/firebase'
import type { AddressSelection } from '@/services/places'
import { loadActivities, loadMembers, resetStore, store } from '@/lib/store'
import { tabOf, useRoute } from '@/lib/router'

type Screen = 'loading' | 'request' | 'sent' | 'confirm' | 'expired' | 'profile' | 'app' | 'account-error'
const screen = ref<Screen>('loading')
const splashVisible = ref(import.meta.env.MODE !== 'test')
const email = ref('')
const accountIntent = ref<'signin' | 'signup'>('signin')
const rememberMe = ref(rememberedSessionChoice())
const error = ref('')
const busy = ref(false)
const account = ref<Account | null>(null)
const cooldown = ref(0)
const route = useRoute()
// Écrans de l'application connectée, choisis selon l'ancre (#/…).
const views = { decouvrir: DiscoverView, rechercher: SearchView, activite: ActivityView, participation: ParticipationView, creer: CreateActivityView, modifier: EditActivityView, conversations: ConversationsView, conversation: ConversationView, 'mes-activites': MyActivitiesView, profil: ProfileView, 'profil-modifier': ProfileEditView, favoris: FavoritesView, communaute: CommunityView }
const currentView = computed(() => views[route.value.name])
const viewKey = computed(() => `${route.value.name}:${route.value.id ?? ''}`)
const showNav = computed(() => !['participation', 'conversation'].includes(route.value.name))
const selection = ref<AddressSelection | null>(null)
const blankProfile = (): Profile => ({ firstName: '', lastName: '', userType: 'participant', address: '', addressLat: null, addressLng: null, photoUrl: '' })
const profile = reactive<Profile>(blankProfile())
let unsubscribe: (() => void) | undefined
let countdown: ReturnType<typeof setInterval> | undefined
let splashTimer: ReturnType<typeof setTimeout> | undefined
let accountRevision = 0
let pendingSocialError = ''
const titles: Record<string, string> = { request: 'Bienvenue', sent: 'Consulte ta boîte mail', confirm: 'Confirme ton e-mail', expired: 'Ce lien n’est plus valide', profile: 'Faisons connaissance', 'account-error': 'Chargement interrompu' }
const title = computed(() => titles[screen.value] || 'Connexion en cours…')
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
  try { await setAuthPersistence(rememberMe.value); await requestSignInLink(email.value); screen.value = 'sent'; startCooldown() }
  catch { error.value = 'Envoi impossible pour le moment. Vérifie ta connexion et réessaie.' }
  finally { busy.value = false }
}
function socialErrorMessage(cause: unknown, provider?: 'Apple' | 'Google') {
  const code = (cause as { code?: string })?.code
  if (code === 'auth/unauthorized-domain') return 'Ajoute cette URL aux domaines autorisés de Firebase Authentication.'
  if (code === 'auth/operation-not-allowed') return `Active la connexion ${provider ?? 'sociale'} dans Firebase Authentication.`
  if (code === 'auth/invalid-oauth-provider' || code === 'auth/invalid-client-id') return `La configuration OAuth ${provider ?? ''} est incomplète dans Firebase.`
  if (code === 'auth/account-exists-with-different-credential') return 'Cet e-mail utilise déjà une autre méthode. Connecte-toi avec celle-ci.'
  if (code === 'auth/network-request-failed') return 'Connexion réseau interrompue. Réessaie.'
  return `Connexion ${provider ?? 'sociale'} impossible${code ? ` (${code})` : ''}. Vérifie le fournisseur dans Firebase.`
}
async function startSocialSignIn(provider: 'apple' | 'google') {
  error.value = ''
  busy.value = true
  try { await signInWithSocialProvider(provider, rememberMe.value) }
  catch (cause) {
    clearPendingSocialProvider()
    error.value = socialErrorMessage(cause, provider === 'apple' ? 'Apple' : 'Google')
  }
  finally { busy.value = false }
}
async function handleSocialRedirect() {
  const provider = pendingSocialProvider()
  try {
    const result = await consumeSocialRedirect()
    if (!result) clearPendingSocialProvider()
  }
  catch (cause) {
    pendingSocialError = socialErrorMessage(cause, provider === 'apple' ? 'Apple' : provider === 'google' ? 'Google' : undefined)
    error.value = pendingSocialError
    clearPendingSocialProvider()
  }
}
function enterApp() {
  screen.value = 'app'
  Object.assign(store.profile, { ...profile })
  void loadActivities(true)
  void loadMembers(true)
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
  store.account = user
  screen.value = 'loading'
  try {
    const saved = await getProfile(user)
    if (revision !== accountRevision) return
    Object.assign(profile, blankProfile(), saved)
    store.profile = { ...saved }
    if (!saved.profileComplete) screen.value = 'profile'
    else enterApp()
  } catch {
    if (revision === accountRevision) { screen.value = 'account-error'; error.value = 'Impossible de charger ton profil. Vérifie ta connexion puis réessaie.' }
  }
}
function startAccountObserver() {
  if (!unsubscribe) unsubscribe = observeAccount(user => { void loadAccount(user) }, () => { screen.value = 'request'; error.value = 'Connexion indisponible. Réessaie.' })
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
async function submitProfile() {
  error.value = ''
  if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.address.trim()) { error.value = 'Complète ton prénom, ton nom et ton adresse.'; return }
  if (profile.photoUrl && !/^https?:\/\/\S+$/i.test(profile.photoUrl.trim())) { error.value = 'La photo doit être une URL commençant par http:// ou https://.'; return }
  if (!account.value) return
  busy.value = true
  try {
    const selected = selection.value?.address === profile.address.trim() ? selection.value : null
    const saved: Profile = { firstName: profile.firstName.trim(), lastName: profile.lastName.trim(), userType: profile.userType, address: profile.address.trim(), photoUrl: profile.photoUrl.trim(), addressLat: selected?.lat ?? null, addressLng: selected?.lng ?? null }
    await saveProfile(account.value.uid, saved)
    Object.assign(profile, saved, { profileComplete: true })
    enterApp()
  } catch { error.value = 'Ton profil n’a pas pu être enregistré. Tes informations sont conservées, réessaie.' }
  finally { busy.value = false }
}
async function disconnect() {
  busy.value = true
  error.value = ''
  try { await logout() }
  catch { error.value = 'Déconnexion impossible. Réessaie.' }
  finally { busy.value = false }
}
onMounted(() => {
  if (splashVisible.value) {
    for (const src of ['/images/novart-mascot-login.webp', '/images/novart-logo-primary-mask.webp']) {
      const image = new Image()
      image.src = src
    }
    splashTimer = setTimeout(() => { splashVisible.value = false }, 850)
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
onBeforeUnmount(() => { unsubscribe?.(); clearInterval(countdown); clearTimeout(splashTimer); accountRevision++ })
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
  <div v-else class="novart-app" :class="{ 'novart-app--auth-home': screen === 'request' }">
    <header v-if="account" class="site-header">
      <a href="/" class="wordmark wordmark--compact" aria-label="Novart, accueil"><span class="brand-logo brand-logo--primary" aria-hidden="true"></span></a>
      <Button v-if="screen !== 'loading'" variant="outline" size="sm" :disabled="busy" @click="disconnect">Se déconnecter</Button>
    </header>

    <main class="auth-layout" :class="{ 'auth-layout--profile': screen === 'profile', 'auth-layout--home': screen === 'request', 'auth-layout--home-has-error': screen === 'request' && !!error }">
      <section v-if="screen !== 'profile'" class="auth-story">
        <a href="/" class="wordmark wordmark--stacked" aria-label="Novart, accueil"><span class="brand-logo brand-logo--primary" aria-hidden="true"></span></a>
        <h1 class="brand-slogan"><span>L’art se crée ensemble.</span></h1>
        <div class="auth-mascot-frame">
          <img src="/images/novart-mascot-login.webp" alt="" class="auth-mascot" width="1520" height="1035" fetchpriority="high" decoding="async" />
        </div>
      </section>
      <Card class="auth-panel" :class="{ 'auth-panel--home': screen === 'request' }">
        <CardHeader v-if="screen !== 'request'" class="auth-panel-heading">
          <div>
            <h1 v-if="screen === 'profile'" class="form-title">{{ title }}</h1>
            <h2 v-else class="form-title">{{ title }}</h2>
            <CardDescription v-if="screen === 'profile'">Quelques informations pour compléter ton inscription.</CardDescription>
          </div>
          <img v-if="screen === 'profile'" src="/images/novart-mascot-joy.webp" alt="" class="profile-mascot" width="159" height="133" />
        </CardHeader>
        <CardContent :class="screen === 'request' ? 'auth-panel-content--home' : 'space-y-5'">
          <p v-if="screen === 'loading'" role="status" class="text-sm text-muted-foreground">Nous préparons ton espace…</p>
          <form v-if="screen === 'request'" class="auth-home-form" novalidate @submit.prevent="sendLink">
            <div class="auth-social-buttons">
              <button type="button" class="auth-social-button" :disabled="busy" @click="startSocialSignIn('apple')">
                <svg class="auth-social-icon auth-social-icon--apple" viewBox="4.8 2.3 14.4 19.6" aria-hidden="true"><path d="M16.37 12.01c.02 2.16 1.9 2.88 1.92 2.9-.02.05-.3 1.03-.98 2.04-.59.87-1.2 1.74-2.16 1.75-.94.02-1.25-.57-2.34-.57-1.08 0-1.43.55-2.32.59-.93.04-1.64-.95-2.24-1.82-1.23-1.78-2.17-5.03-.91-7.23.62-1.09 1.73-1.78 2.93-1.8.92-.02 1.78.63 2.34.63.56 0 1.61-.78 2.71-.66.46.02 1.77.19 2.61 1.43-.07.04-1.56.91-1.55 2.74ZM14.59 5.98c.49-.6.82-1.43 0.73-2.26-.71.03-1.57.47-2.08 1.07-.46.53-.86 1.37-.75 2.17.79.06 1.61-.4 2.1-.98Z"/></svg>
                <span>Continuer avec Apple</span>
              </button>
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
          <div v-else-if="screen === 'sent'" class="space-y-5">
            <p class="text-sm leading-relaxed">Un lien de connexion a été envoyé à <strong class="break-all">{{ email }}</strong>. Clique sur ce lien pour continuer.</p>
            <p class="text-sm text-muted-foreground">Pense à vérifier tes courriers indésirables.</p>
            <Button variant="outline" class="w-full" :disabled="busy || cooldown > 0" @click="sendLink">{{ cooldown > 0 ? `Renvoyer dans ${cooldown} s` : 'Renvoyer le lien' }}</Button>
            <Button variant="link" class="w-full" @click="screen = 'request'; error = ''">Utiliser une autre adresse</Button>
          </div>
          <form v-else-if="screen === 'confirm'" class="space-y-5" novalidate @submit.prevent="finishLink">
            <p class="text-sm text-muted-foreground">Pour utiliser ce lien sur cet appareil, indique l’adresse e-mail utilisée lors de la demande.</p>
            <div class="space-y-2"><Label for="confirm-email">Adresse e-mail</Label><Input id="confirm-email" v-model="email" type="email" autocomplete="email" /></div>
            <Button class="w-full" type="submit" :disabled="busy">{{ busy ? 'Connexion…' : 'Confirmer mon e-mail' }}</Button>
          </form>
          <form v-else-if="screen === 'expired'" class="space-y-5" novalidate @submit.prevent="sendLink">
            <p class="text-sm text-muted-foreground">Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien pour continuer.</p>
            <div class="space-y-2"><Label for="resend-email">Adresse e-mail</Label><Input id="resend-email" v-model="email" type="email" autocomplete="email" /></div>
            <Button class="w-full" type="submit" :disabled="busy || cooldown > 0">{{ cooldown > 0 ? `Renvoyer dans ${cooldown} s` : 'Recevoir un nouveau lien' }}</Button>
          </form>
          <form v-else-if="screen === 'profile'" class="space-y-5" novalidate @submit.prevent="submitProfile">
            <div class="grid gap-5 sm:grid-cols-2">
              <div class="space-y-2"><Label for="firstName">Prénom</Label><Input id="firstName" v-model="profile.firstName" autocomplete="given-name" placeholder="Ton prénom" /></div>
              <div class="space-y-2"><Label for="lastName">Nom</Label><Input id="lastName" v-model="profile.lastName" autocomplete="family-name" placeholder="Ton nom" /></div>
            </div>
            <div class="space-y-2"><Label for="userType">Je souhaite participer en tant que</Label><Select v-model="profile.userType"><SelectTrigger id="userType" class="w-full"><SelectValue placeholder="Choisir un rôle" /></SelectTrigger><SelectContent><SelectItem value="participant">Participant</SelectItem><SelectItem value="organisateur">Organisateur</SelectItem></SelectContent></Select></div>
            <div class="space-y-2"><Label for="address">Adresse</Label><AddressInput v-model="profile.address" @select="selection = $event" /></div>
            <div class="space-y-2">
              <Label for="photoUrl">Lien vers ta photo <span class="font-normal text-muted-foreground">(facultatif)</span></Label>
              <div class="field-control">
                <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m10 13 4-4m-6 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(2 0)"/></svg>
                <Input id="photoUrl" v-model="profile.photoUrl" type="url" placeholder="https://…" />
              </div>
            </div>
            <Button class="w-full" type="submit" :disabled="busy">{{ busy ? 'Enregistrement…' : 'Terminer mon inscription' }}</Button>
          </form>
          <Button v-else-if="screen === 'account-error'" class="w-full" @click="loadAccount(account)">Réessayer</Button>
          <Alert v-if="error" id="form-error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
        </CardContent>
      </Card>
    </main>
    <footer class="site-footer">Novart · Une communauté de pratiques artistiques.</footer>
  </div>
</template>
