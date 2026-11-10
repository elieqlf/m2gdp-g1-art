<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Check, ChevronLeft } from '@lucide/vue'
import AddressInput from '@/components/AddressInput.vue'
import DisciplineIcon from '@/components/DisciplineIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { disciplines } from '@/lib/activity'
import { isProfilePhotoPath, profilePhotoChoices } from '@/lib/member-photos'
import { notify, store, uid } from '@/lib/store'
import { goBack, navigate, useRoute } from '@/lib/router'
import { updateProfile, type Profile } from '@/services/firebase'
import type { AddressSelection } from '@/services/places'

// US-14 : modifier ses informations (photo, nom, description, centres d'intérêt, adresse).
const route = useRoute()
const form = reactive({
  firstName: store.profile.firstName ?? '', lastName: store.profile.lastName ?? '', bio: store.profile.bio ?? '',
  photoUrl: store.profile.photoUrl ?? '', address: store.profile.address ?? '', userType: store.profile.userType ?? 'participant',
  interests: [...(store.profile.interests ?? [])],
})
const selection = ref<AddressSelection | null>(null)
const error = ref('')
const busy = ref(false)
function toggle(id: string) { form.interests = form.interests.includes(id) ? form.interests.filter(i => i !== id) : [...form.interests, id] }
onMounted(() => { if (route.value.query.section === 'interets') document.getElementById('interests')?.scrollIntoView() })
async function save() {
  error.value = ''
  if (!form.firstName.trim() || !form.lastName.trim()) { error.value = 'Le prénom et le nom sont obligatoires.'; return }
  if (form.photoUrl && !/^https?:\/\/\S+$/i.test(form.photoUrl.trim()) && !isProfilePhotoPath(form.photoUrl)) { error.value = 'Choisis une photo proposée ou utilise un lien commençant par https://.'; return }
  const addressChanged = form.address.trim() !== (store.profile.address ?? '')
  const changes: Partial<Profile> = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), bio: form.bio.trim(), photoUrl: form.photoUrl.trim(), userType: form.userType, interests: form.interests, address: form.address.trim() }
  if (addressChanged) Object.assign(changes, { addressLat: selection.value?.lat ?? null, addressLng: selection.value?.lng ?? null })
  busy.value = true
  try {
    await updateProfile(uid.value, changes)
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
      <fieldset class="profile-photo-picker">
        <legend class="field-label">Choisir une photo de profil <span class="optional">(optionnel)</span></legend>
        <p class="hint">Sélectionne une photo libre de droits pour apparaître dans les activités et les conversations.</p>
        <div class="profile-photo-grid" role="radiogroup" aria-label="Photos de profil proposées">
          <button type="button" role="radio" class="profile-photo-option profile-photo-option--empty" :class="{ 'is-selected': !form.photoUrl }" :aria-checked="!form.photoUrl" aria-label="Retirer la photo de profil" @click="form.photoUrl = ''"><span>Aucune</span></button>
          <button v-for="photo in profilePhotoChoices" :key="photo.url" type="button" role="radio" class="profile-photo-option" :class="{ 'is-selected': form.photoUrl === photo.url }" :aria-checked="form.photoUrl === photo.url" :aria-label="`Choisir ${photo.label.toLowerCase()}`" @click="form.photoUrl = photo.url"><img :src="photo.url" alt="" loading="lazy" /></button>
        </div>
      </fieldset>
      <div class="two-columns">
        <div><label for="edit-first" class="field-label">Prénom</label><input id="edit-first" v-model="form.firstName" class="text-field" autocomplete="given-name" /></div>
        <div><label for="edit-last" class="field-label">Nom</label><input id="edit-last" v-model="form.lastName" class="text-field" autocomplete="family-name" /></div>
      </div>
      <label for="edit-bio" class="field-label">Description <span class="optional">(optionnel)</span></label>
      <div class="counter-field"><textarea id="edit-bio" v-model="form.bio" class="text-field text-area" rows="3" maxlength="160" placeholder="Ex. : Passionnée d’aquarelle, toujours partante pour dessiner dehors."></textarea><span class="counter">{{ form.bio.length }}/160</span></div>
      <label for="edit-photo" class="field-label">Ou lien vers ta photo <span class="optional">(optionnel)</span></label>
      <input id="edit-photo" v-model="form.photoUrl" type="url" class="text-field" placeholder="https://…" />
      <fieldset class="field-group"><legend class="field-label">Je participe surtout en tant que</legend>
        <div class="chip-row"><button v-for="t in [{ id: 'participant', label: 'Participant' }, { id: 'organisateur', label: 'Organisateur' }] as const" :key="t.id" type="button" class="choice-chip" :class="{ 'is-selected': form.userType === t.id }" :aria-pressed="form.userType === t.id" @click="form.userType = t.id">{{ t.label }}</button></div>
      </fieldset>
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
