<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { AlignLeft, ArrowRight, CalendarDays, ChevronLeft, Clock, MapPin, Pencil, Trash, Users } from '@lucide/vue'
import CapacityStepper from '@/components/CapacityStepper.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CoverPicker from '@/components/CoverPicker.vue'
import MascotState from '@/components/MascotState.vue'
import PlacePicker from '@/components/PlacePicker.vue'
import { validateDraft, type Activity, type ActivityDraft, type DraftErrors } from '@/lib/activity'
import { ensureActivity, notify, removeActivity, store, uid, upsertActivity } from '@/lib/store'
import { goBack, navigate } from '@/lib/router'
import { deleteActivity, updateActivity } from '@/services/activities'

// US-08 : l'organisateur modifie ou supprime son activité.
const props = defineProps<{ id: string }>()
const status = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
const draft = reactive<ActivityDraft>({ title: '', discipline: '', subDiscipline: '', description: '', level: 'tous', equipment: '', coverUrl: '', placeName: '', address: '', district: '', lat: null, lng: null, date: '', startTime: '', endTime: '', capacity: 2 })
const errors = ref<DraftErrors>({})
const busy = ref(false)
const failure = ref('')
const changingCover = ref(false)
const confirmDelete = ref(false)
const activity = computed(() => store.activities.find(a => a.id === props.id))
const registered = computed(() => activity.value?.participantIds.length ?? 0)
const owner = computed(() => activity.value?.organizerId === uid.value)

function fill(a: Activity) {
  const { title, discipline, subDiscipline = '', description, level, equipment = '', coverUrl, placeName, address, district = '', lat, lng, date, startTime, endTime, capacity } = a
  Object.assign(draft, { title, discipline, subDiscipline, description, level, equipment, coverUrl, placeName, address, district, lat, lng, date, startTime, endTime, capacity })
}
let loadRevision = 0
async function loadActivity(id = props.id) {
  const revision = ++loadRevision
  status.value = 'loading'
  failure.value = ''
  try {
    const a = await ensureActivity(id)
    if (revision !== loadRevision) return
    if (a) { fill(a); status.value = 'ready' } else status.value = 'missing'
  } catch {
    if (revision === loadRevision) status.value = 'error'
  }
}
watch(() => props.id, id => { void loadActivity(id) }, { immediate: true })

async function save() {
  // Une date déjà passée reste acceptée si elle n'a pas été modifiée.
  const now = activity.value && draft.date === activity.value.date ? new Date(`${draft.date}T00:00:00`) : new Date()
  errors.value = validateDraft(draft, 'all', registered.value, now)
  if (Object.keys(errors.value).length || !activity.value) return
  busy.value = true; failure.value = ''
  try {
    const changes = { ...draft, title: draft.title.trim(), description: draft.description.trim() }
    await updateActivity(props.id, changes)
    upsertActivity({ ...activity.value, ...changes })
    notify('Modifications enregistrées.')
    navigate(`activite/${encodeURIComponent(props.id)}`)
  } catch { failure.value = 'Enregistrement impossible pour le moment. Tes modifications sont conservées, réessaie.' }
  finally { busy.value = false }
}
async function remove() {
  busy.value = true; failure.value = ''
  try {
    await deleteActivity(props.id)
    removeActivity(props.id)
    notify('Activité supprimée.')
    navigate('mes-activites')
  } catch { failure.value = 'Suppression impossible pour le moment. Réessaie.'; confirmDelete.value = false }
  finally { busy.value = false }
}
</script>

<template>
  <div class="page page--form">
    <div class="topbar"><button type="button" class="icon-button icon-button--plain" aria-label="Retour" @click="goBack()"><ChevronLeft aria-hidden="true" /></button><h1 class="topbar__title">Modifier l’activité</h1><span class="topbar__spacer"></span></div>
    <p v-if="status === 'loading'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement…</p>
    <MascotState v-else-if="status === 'missing' || (status === 'ready' && !activity)" title="Activité introuvable" text="Elle a peut-être été supprimée ou son lien n’est plus valide."><a href="#/mes-activites" class="btn btn--primary">Mes activités</a></MascotState>
    <MascotState v-else-if="status === 'error'" title="Impossible de charger l’activité" text="Vérifie ta connexion. Le formulaire n’a pas encore été ouvert."><button type="button" class="btn btn--primary" @click="loadActivity()">Réessayer</button><a href="#/mes-activites" class="btn btn--soft">Mes activités</a></MascotState>
    <MascotState v-else-if="!owner" title="Modification réservée" text="Seule la personne qui organise cette activité peut la modifier."><a :href="`#/activite/${encodeURIComponent(id)}`" class="btn btn--primary">Voir l’activité</a></MascotState>
    <form v-else class="edit-form" novalidate @submit.prevent="save">
      <div class="edit-cover"><img :src="draft.coverUrl" alt="" /><button type="button" class="edit-cover__button" :aria-expanded="changingCover" @click="changingCover = !changingCover">{{ changingCover ? 'Fermer' : 'Changer la photo' }}</button></div>
      <section v-if="changingCover" class="edit-block"><CoverPicker v-model="draft.coverUrl" :invalid="!!errors.coverUrl" /><p v-if="errors.coverUrl" class="field-error">{{ errors.coverUrl }}</p></section>
      <section class="edit-block"><Pencil class="edit-block__icon" aria-hidden="true" /><div>
        <label for="edit-title" class="field-label field-label--accent">Titre de l’activité <span aria-hidden="true">*</span></label>
        <input id="edit-title" v-model="draft.title" class="text-field" maxlength="60" :aria-invalid="!!errors.title" /><span class="counter counter--below">{{ draft.title.length }}/60</span>
        <p v-if="errors.title" class="field-error">{{ errors.title }}</p></div></section>
      <section class="edit-block"><AlignLeft class="edit-block__icon" aria-hidden="true" /><div>
        <label for="edit-description" class="field-label field-label--accent">Description <span aria-hidden="true">*</span></label>
        <textarea id="edit-description" v-model="draft.description" class="text-field text-area" rows="4" maxlength="500" :aria-invalid="!!errors.description"></textarea><span class="counter counter--below">{{ draft.description.length }}/500</span>
        <p v-if="errors.description" class="field-error">{{ errors.description }}</p></div></section>
      <section class="edit-block"><CalendarDays class="edit-block__icon" aria-hidden="true" /><div>
        <label for="edit-date" class="field-label field-label--accent">Date <span aria-hidden="true">*</span></label>
        <input id="edit-date" v-model="draft.date" type="date" class="text-field" :aria-invalid="!!errors.date" />
        <p v-if="errors.date" class="field-error">{{ errors.date }}</p>
        <p class="field-label field-label--accent mt-4"><Clock class="inline-icon" aria-hidden="true" />Heure <span aria-hidden="true">*</span></p>
        <div class="two-columns two-columns--tight">
          <div><label for="edit-start" class="hint">Heure de début</label><input id="edit-start" v-model="draft.startTime" type="time" class="text-field" step="900" /></div>
          <div><label for="edit-end" class="hint">Heure de fin</label><input id="edit-end" v-model="draft.endTime" type="time" class="text-field" step="900" :aria-invalid="!!errors.endTime" /></div>
        </div>
        <p v-if="errors.endTime || errors.startTime" class="field-error">{{ errors.endTime || errors.startTime }}</p></div></section>
      <section class="edit-block"><MapPin class="edit-block__icon" aria-hidden="true" /><div><p class="field-label field-label--accent">Lieu <span aria-hidden="true">*</span></p><PlacePicker :draft="draft" :error="errors.place" /></div></section>
      <section class="edit-block edit-block--capacity"><Users class="edit-block__icon" aria-hidden="true" /><div>
        <label for="capacity" class="field-label field-label--accent">Nombre de places <span aria-hidden="true">*</span></label>
        <CapacityStepper v-model="draft.capacity" :min="Math.max(2, registered)" :invalid="!!errors.capacity" describedby="edit-capacity-hint" />
        <p id="edit-capacity-hint" class="hint">{{ registered }} personne{{ registered > 1 ? 's' : '' }} déjà inscrite{{ registered > 1 ? 's' : '' }} (minimum {{ Math.max(2, registered) }} places)</p>
        <p v-if="errors.capacity" class="field-error">{{ errors.capacity }}</p></div>
        <aside v-if="registered > 0" class="mascot-hint"><img src="/images/novart-onboarding-complete-hd.webp" alt="" width="1536" height="1024" decoding="async" /><p>Tu ne peux pas mettre moins de places que le nombre de personnes déjà inscrites.</p></aside>
      </section>
      <p v-if="failure" class="form-alert" role="alert">{{ failure }}</p>
      <button type="submit" class="btn btn--primary btn--wide btn--big" :disabled="busy">{{ busy ? 'Enregistrement…' : 'Enregistrer les modifications' }}<ArrowRight aria-hidden="true" /></button>
      <button type="button" class="btn btn--soft btn--center" @click="confirmDelete = true"><Trash aria-hidden="true" />Supprimer l’activité</button>
    </form>
    <ConfirmDialog v-if="confirmDelete && activity" title="Supprimer l’activité ?" :text="registered ? `${registered} personne${registered > 1 ? 's sont inscrites' : ' est inscrite'}. L’activité et son groupe ne seront plus visibles.` : 'L’activité ne sera plus visible.'" confirm-label="Supprimer" :busy="busy" @confirm="remove" @cancel="confirmDelete = false" />
  </div>
</template>
