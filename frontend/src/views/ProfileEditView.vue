<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Camera, Check, ChevronLeft, Upload, X } from '@lucide/vue'
import AddressInput from '@/components/AddressInput.vue'
import DisciplineIcon from '@/components/DisciplineIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { disciplines } from '@/lib/activity'
import { imageUploadError, prepareImageUpload } from '@/lib/image-upload'
import { getProfilePhotoHistory, rememberProfilePhoto } from '@/lib/profile-photo-history'
import { isValidProfilePhoto } from '@/lib/member-photos'
import { notify, store, uid } from '@/lib/store'
import { goBack, navigate, useRoute } from '@/lib/router'
import { updateProfile, type Profile } from '@/services/firebase'
import type { AddressSelection } from '@/services/places'

// US-14 : modifier ses informations (photo, nom, description, centres d'intérêt, adresse).
const route = useRoute()
const form = reactive({
  firstName: store.profile.firstName ?? '', lastName: store.profile.lastName ?? '', bio: store.profile.bio ?? '',
  photoUrl: store.profile.photoUrl ?? '',
  photoHistory: getProfilePhotoHistory(uid.value, store.profile.photoUrl ?? ''),
  address: store.profile.address ?? '',
  interests: [...(store.profile.interests ?? [])],
})
const selection = ref<AddressSelection | null>(null)
const error = ref('')
const photoError = ref('')
const photoBusy = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const previousPhotos = computed(() => form.photoHistory.filter(photo => photo !== form.photoUrl))
function toggle(id: string) { form.interests = form.interests.includes(id) ? form.interests.filter(i => i !== id) : [...form.interests, id] }
onMounted(() => { if (route.value.query.section === 'interets') document.getElementById('interests')?.scrollIntoView() })
async function choosePhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  photoError.value = ''
  if (!file) return
  photoBusy.value = true
  try {
    const photo = await prepareImageUpload(file, 'profile')
    form.photoUrl = photo
    form.photoHistory = rememberProfilePhoto(uid.value, photo, form.photoHistory)
  } catch (cause) { photoError.value = imageUploadError(cause, 'profile') }
  finally { photoBusy.value = false }
}
function selectPreviousPhoto(photo: string) {
  form.photoUrl = photo
  form.photoHistory = rememberProfilePhoto(uid.value, photo, form.photoHistory)
}
function removePhoto() {
  if (form.photoUrl) form.photoHistory = rememberProfilePhoto(uid.value, form.photoUrl, form.photoHistory)
  form.photoUrl = ''
}
async function save() {
  error.value = ''
  if (!form.firstName.trim() || !form.lastName.trim()) { error.value = 'Le prénom et le nom sont obligatoires.'; return }
  if (form.photoUrl && !isValidProfilePhoto(form.photoUrl.trim())) { error.value = 'Choisis une image JPG, PNG, WebP ou AVIF.'; return }
  const addressChanged = form.address.trim() !== (store.profile.address ?? '')
  const changes: Partial<Profile> = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), bio: form.bio.trim(), photoUrl: form.photoUrl.trim(), interests: form.interests, address: form.address.trim() }
  if (addressChanged) Object.assign(changes, { addressLat: selection.value?.lat ?? null, addressLng: selection.value?.lng ?? null })
  busy.value = true
  try {
    await updateProfile(uid.value, changes)
    if (form.photoUrl.trim()) rememberProfilePhoto(uid.value, form.photoUrl.trim(), form.photoHistory)
    Object.assign(store.profile, changes)
    notify('Profil mis à jour.')
    navigate('profil')
  } catch { error.value = 'Enregistrement impossible. Tes modifications sont conservées, réessaie.' }
  finally { busy.value = false }
}
</script>
<template>
  <div class="page page--form">
    <div class="topbar"><button type="button" class="icon-button icon-button--plain" aria-label="Retour" @click="goBack('profil')"><ChevronLeft aria-hidden="true" /></button><h1 class="topbar__title">Mes informations</h1><span class="topbar__spacer"></span></div>
    <form class="form-step" novalidate @submit.prevent="save">
      <div class="profile-preview"><UserAvatar :name="`${form.firstName} ${form.lastName}`" :photo="form.photoUrl" :user-id="uid" size="lg" /><p class="muted">Ta photo et ton prénom sont visibles par les membres de NOVART.</p></div>
      <section class="profile-photo-picker" aria-labelledby="profile-photo-title">
        <div class="profile-photo-picker__heading">
          <div><h2 id="profile-photo-title">Ma photo de profil <span class="optional">(optionnel)</span></h2><p class="hint">Ajoute une photo à toi depuis ta galerie ou tes fichiers.</p></div>
          <button type="button" class="btn btn--outline profile-photo-upload" :disabled="photoBusy" @click="photoInput?.click()"><Camera aria-hidden="true" />{{ photoBusy ? 'Préparation…' : form.photoUrl ? 'Changer' : 'Ajouter' }}</button>
          <input ref="photoInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" @change="choosePhoto" />
        </div>
        <p class="profile-photo-hint">JPG, PNG, WebP ou AVIF · 15 Mo maximum. Cette photo sera visible par les membres de NOVART.</p>
        <p v-if="photoError" class="field-error" role="alert">{{ photoError }}</p>
        <div v-if="previousPhotos.length" class="profile-photo-history" role="group" aria-label="Photos de profil déjà utilisées par toi">
          <span class="field-label">Mes anciennes photos</span>
          <button v-for="photo in previousPhotos" :key="photo" type="button" class="profile-photo-option" aria-label="Réutiliser une photo personnelle déjà utilisée" @click="selectPreviousPhoto(photo)"><img :src="photo" alt="" loading="lazy" decoding="async" /><span><Upload aria-hidden="true" /></span></button>
        </div>
        <button v-if="form.photoUrl" type="button" class="link-button profile-photo-remove" @click="removePhoto"><X aria-hidden="true" />Retirer ma photo</button>
      </section>
      <div class="two-columns">
        <div><label for="edit-first" class="field-label">Prénom</label><input id="edit-first" v-model="form.firstName" class="text-field" autocomplete="given-name" /></div>
        <div><label for="edit-last" class="field-label">Nom</label><input id="edit-last" v-model="form.lastName" class="text-field" autocomplete="family-name" /></div>
      </div>
      <label for="edit-bio" class="field-label">Quelques mots pour te présenter <span class="optional">(optionnel)</span></label>
      <div class="counter-field"><textarea id="edit-bio" v-model="form.bio" class="text-field text-area" rows="3" maxlength="160" placeholder="Ce que tu aimes créer, partager ou découvrir…"></textarea><span class="counter">{{ form.bio.length }}/160</span></div>
      <fieldset id="interests" class="field-group"><legend class="field-label">Mes centres d’intérêt</legend>
        <p class="hint">Ils servent à te proposer des activités « Selon tes envies ».</p>
        <div class="chip-grid chip-grid--3"><button v-for="d in disciplines" :key="d.id" type="button" class="choice-chip" :class="{ 'is-selected': form.interests.includes(d.id) }" :aria-pressed="form.interests.includes(d.id)" @click="toggle(d.id)"><DisciplineIcon :discipline="d.id" />{{ d.label }}<Check v-if="form.interests.includes(d.id)" class="choice-chip__check" aria-hidden="true" /></button></div>
      </fieldset>
      <label for="profile-address" class="field-label">Adresse</label>
      <AddressInput v-model="form.address" input-id="profile-address" @select="selection = $event" />
      <p class="hint">Elle sert à calculer la distance des activités et à te placer sur la carte de la communauté.</p>
      <p v-if="error" class="form-alert" role="alert">{{ error }}</p>
      <button type="submit" class="btn btn--primary btn--wide btn--big" :disabled="busy">{{ busy ? 'Enregistrement…' : 'Enregistrer' }}</button>
    </form>
  </div>
</template>
