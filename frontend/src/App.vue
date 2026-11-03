<script setup lang="ts">
import UsersMap from '@/components/UsersMap.vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import AddressInput from '@/components/AddressInput.vue'
import { isValidEmail, hasSignInLink, pendingEmail, requestSignInLink, completeSignIn, observeAccount, getProfile, saveProfile, listMembers, logout, type Account, type Profile, type Member } from '@/services/firebase'
import type { AddressSelection } from '@/services/places'

type Screen = 'loading' | 'request' | 'sent' | 'confirm' | 'expired' | 'profile' | 'users' | 'account-error'
const screen = ref<Screen>('loading')
const email = ref('')
const error = ref('')
const busy = ref(false)
const account = ref<Account | null>(null)
const members = ref<Member[]>([])
const membersLoading = ref(false)
const membersError = ref('')
const cooldown = ref(0)
const selection = ref<AddressSelection | null>(null)
const blankProfile = (): Profile => ({ firstName: '', lastName: '', userType: 'participant', address: '', addressLat: null, addressLng: null, photoUrl: '' })
const profile = reactive<Profile>(blankProfile())
let unsubscribe: (() => void) | undefined
let countdown: ReturnType<typeof setInterval> | undefined
let accountRevision = 0
const titles: Record<string, string> = { request: 'Bienvenue', sent: 'Consultez votre boîte mail', confirm: 'Confirmez votre e-mail', expired: 'Ce lien n’est plus valide', profile: 'Faisons connaissance', 'account-error': 'Chargement interrompu' }
const title = computed(() => titles[screen.value] || 'Connexion en cours…')
function startCooldown() {
  clearInterval(countdown)
  cooldown.value = 60
  countdown = setInterval(() => { cooldown.value--; if (cooldown.value <= 0) clearInterval(countdown) }, 1000)
}
async function sendLink() {
  error.value = ''
  email.value = email.value.trim()
  if (!isValidEmail(email.value)) { error.value = 'Saisissez une adresse e-mail valide.'; return }
  busy.value = true
  try { await requestSignInLink(email.value); screen.value = 'sent'; startCooldown() }
  catch { error.value = 'Envoi impossible pour le moment. Vérifiez votre connexion et réessayez.' }
  finally { busy.value = false }
}
async function refreshMembers() {
  membersLoading.value = true
  membersError.value = ''
  const uid = account.value?.uid
  try {
    const data = await listMembers()
    if (account.value?.uid === uid) members.value = data
  } catch { membersError.value = 'Impossible de charger les utilisateurs. Réessayez.' }
  finally { membersLoading.value = false }
}
async function loadAccount(user: Account | null) {
  const revision = ++accountRevision
  account.value = user
  error.value = ''
  if (!user) { members.value = []; Object.assign(profile, blankProfile()); selection.value = null; screen.value = 'request'; return }
  screen.value = 'loading'
  try {
    const saved = await getProfile(user)
    if (revision !== accountRevision) return
    Object.assign(profile, blankProfile(), saved)
    if (!saved.profileComplete) screen.value = 'profile'
    else { screen.value = 'users'; await refreshMembers() }
  } catch {
    if (revision === accountRevision) { screen.value = 'account-error'; error.value = 'Impossible de charger votre profil. Vérifiez votre connexion puis réessayez.' }
  }
}
function startAccountObserver() {
  if (!unsubscribe) unsubscribe = observeAccount(user => { void loadAccount(user) }, () => { screen.value = 'request'; error.value = 'Connexion indisponible. Réessayez.' })
}
async function finishLink() {
  if (!isValidEmail(email.value)) { error.value = 'Saisissez une adresse e-mail valide.'; return }
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
    } else { screen.value = 'confirm'; error.value = 'Connexion impossible. Vérifiez votre e-mail et votre connexion, puis réessayez.' }
  } finally { busy.value = false }
}
async function submitProfile() {
  error.value = ''
  if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.address.trim()) { error.value = 'Complétez le prénom, le nom et l’adresse.'; return }
  if (profile.photoUrl && !/^https?:\/\/\S+$/i.test(profile.photoUrl.trim())) { error.value = 'La photo doit être une URL commençant par http:// ou https://.'; return }
  if (!account.value) return
  busy.value = true
  try {
    const selected = selection.value?.address === profile.address.trim() ? selection.value : null
    await saveProfile(account.value.uid, { firstName: profile.firstName.trim(), lastName: profile.lastName.trim(), userType: profile.userType, address: profile.address.trim(), photoUrl: profile.photoUrl.trim(), addressLat: selected?.lat ?? null, addressLng: selected?.lng ?? null })
    screen.value = 'users'
    await refreshMembers()
  } catch { error.value = 'Le profil n’a pas pu être enregistré. Vos informations sont conservées, réessayez.' }
  finally { busy.value = false }
}
async function disconnect() {
  busy.value = true
  error.value = ''
  try { await logout() }
  catch { error.value = 'Déconnexion impossible. Réessayez.' }
  finally { busy.value = false }
}
onMounted(() => {
  if (hasSignInLink()) {
    email.value = pendingEmail()
    if (email.value) void finishLink()
    else screen.value = 'confirm'
  } else startAccountObserver()
})
onBeforeUnmount(() => { unsubscribe?.(); clearInterval(countdown); accountRevision++ })
</script>

<template>
  <div class="novart-app">
    <header v-if="account" class="site-header">
      <a href="/" class="wordmark wordmark--compact" aria-label="Novart, accueil">NOVART</a>
      <Button v-if="screen !== 'loading'" variant="outline" size="sm" :disabled="busy" @click="disconnect">Se déconnecter</Button>
    </header>

    <main v-if="screen === 'users'" class="community-layout">
      <div class="community-heading">
        <div>
          <p class="eyebrow">Notre communauté</p>
          <h1>Utilisateurs inscrits</h1>
          <p class="page-description">Découvre les participants et les organisateurs de Novart.</p>
        </div>
        <Badge variant="secondary" class="member-count">{{ members.length }} membre{{ members.length > 1 ? 's' : '' }}</Badge>
      </div>
      <Alert v-if="error" variant="destructive" class="mb-5"><AlertDescription>{{ error }}</AlertDescription></Alert>
      <p v-if="membersLoading" role="status" class="py-8 text-muted-foreground">Chargement des utilisateurs…</p>
      <Alert v-else-if="membersError" variant="destructive">
        <AlertTitle>Chargement impossible</AlertTitle>
        <AlertDescription>{{ membersError }}<Button variant="outline" class="mt-3" @click="refreshMembers">Réessayer</Button></AlertDescription>
      </Alert>
      <template v-else>
        <UsersMap :users="members" />
        <Card v-if="!members.length" class="empty-members"><CardContent class="py-10 text-center text-muted-foreground">Aucun utilisateur pour le moment.</CardContent></Card>
        <div v-else class="member-grid">
          <Card v-for="member in members" :key="member.uid" class="member-card">
            <CardContent class="member-content">
              <img v-if="member.photoUrl && /^https?:\/\//i.test(member.photoUrl)" :src="member.photoUrl" alt="" class="member-avatar" referrerpolicy="no-referrer" />
              <div v-else class="member-avatar member-initial" aria-hidden="true">{{ (member.firstName || member.email || '?').slice(0, 1).toUpperCase() }}</div>
              <div class="member-details">
                <h2>{{ member.firstName ? `${member.firstName} ${member.lastName || ''}` : member.email || 'Membre' }}</h2>
                <Badge variant="secondary">{{ member.userType === 'organisateur' ? 'Organisateur' : member.userType === 'participant' ? 'Participant' : 'Profil à compléter' }}</Badge>
                <p v-if="member.address" class="member-address">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                  {{ member.address }}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </template>
    </main>

    <main v-else class="auth-layout" :class="{ 'auth-layout--profile': screen === 'profile' }">
      <section v-if="screen !== 'profile'" class="auth-story">
        <a href="/" class="wordmark wordmark--stacked" aria-label="Novart, accueil"><span>NOV</span><span>ART</span></a>
        <h1 class="brand-slogan">L’art se crée ensemble.</h1>
        <img src="/images/novart-mascot.png" alt="" class="auth-mascot" width="1280" height="1280" fetchpriority="high" />
      </section>
      <Card class="auth-panel">
        <CardHeader class="auth-panel-heading">
          <div>
            <h1 v-if="screen === 'profile'" class="form-title">{{ title }}</h1>
            <h2 v-else class="form-title">{{ title }}</h2>
            <CardDescription v-if="screen === 'request'">Reçois un lien pour créer ton compte ou te reconnecter.</CardDescription>
            <CardDescription v-else-if="screen === 'profile'">Quelques informations pour compléter ton inscription.</CardDescription>
          </div>
          <img v-if="screen === 'profile'" src="/images/novart-mascot.png" alt="" class="profile-mascot" width="1280" height="1280" />
        </CardHeader>
        <CardContent class="space-y-5">
          <p v-if="screen === 'loading'" role="status" class="text-sm text-muted-foreground">Nous préparons votre espace…</p>
          <form v-if="screen === 'request'" class="space-y-5" novalidate @submit.prevent="sendLink">
            <div class="space-y-2">
              <Label for="email">Adresse e-mail</Label>
              <div class="field-control">
                <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>
                <Input id="email" v-model="email" type="email" autocomplete="email" placeholder="vous@exemple.fr" :aria-invalid="!!error" :aria-describedby="error ? 'form-error' : undefined" />
              </div>
            </div>
            <Button class="w-full" type="submit" :disabled="busy">{{ busy ? 'Envoi en cours…' : 'Recevoir mon lien de connexion' }}</Button>
            <p class="auth-hint">Connexion par e-mail, sans mot de passe.</p>
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
