<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Check, MapPin, Pencil, Search, X } from '@lucide/vue'
import AddressInput from './AddressInput.vue'
import ActivityMap from './ActivityMap.vue'
import venues from '@/data/venues.json'
import { distanceKm, formatDistance, templates, venueTypes, type ActivityDraft } from '@/lib/activity'
import { origin } from '@/lib/store'
import type { AddressSelection } from '@/services/places'

// Lieu de l'activité. L'étape n'affiche que le lieu retenu (carte + nom) ; la liste des
// lieux suggérés (120+ lieux de la Métropole de Lyon) et l'adresse libre s'ouvrent dans
// un panneau (sans téléportation : il garde les styles de l'application), refermé d'un geste (bouton, Échap, toucher à côté ou choix d'un lieu).
const props = defineProps<{ draft: ActivityDraft; error?: string }>()
const open = ref(false)
const query = ref('')
const opener = ref<HTMLButtonElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const typeLabel = (id: string) => venueTypes.find(t => t.id === id)?.label ?? ''
const preferred = computed(() => templates.find(t => t.discipline === props.draft.discipline)?.venueTypes ?? [])
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const suggestions = computed(() => {
  const words = normalize(query.value.trim()).split(/\s+/).filter(Boolean)
  return venues
    .filter(v => !words.length || words.every(w => normalize(`${v.name} ${v.district} ${typeLabel(v.type)} ${v.address}`).includes(w)))
    .map(v => ({ ...v, km: origin.value ? distanceKm(origin.value, v) : null, score: (preferred.value.includes(v.type) ? 0 : 3) + (origin.value ? distanceKm(origin.value, v) : 0) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, words.length ? 30 : 12)
})
const chosen = computed(() => !!(props.draft.placeName || props.draft.address))
const isSelected = (v: (typeof venues)[number]) => props.draft.placeName === v.name && props.draft.address === v.address

async function openPanel() {
  open.value = true
  await nextTick()
  searchInput.value?.focus()
}
function closePanel() {
  open.value = false
  query.value = ''
  void nextTick(() => opener.value?.focus())
}
function chooseVenue(v: (typeof venues)[number]) {
  Object.assign(props.draft, { placeName: v.name, address: v.address, district: v.district, lat: v.lat, lng: v.lng })
  closePanel()
}
function chooseAddress(selection: AddressSelection | null) {
  if (!selection) { Object.assign(props.draft, { lat: null, lng: null }); return }
  Object.assign(props.draft, { address: selection.address, lat: selection.lat, lng: selection.lng, district: '' })
  if (!props.draft.placeName) props.draft.placeName = selection.address.split(',')[0] ?? ''
}
const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && open.value) { event.stopPropagation(); closePanel() } }
watch(open, value => {
  if (value) document.addEventListener('keydown', onKey, true)
  else document.removeEventListener('keydown', onKey, true)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey, true))
const point = computed(() => [{ id: 'lieu', lat: props.draft.lat, lng: props.draft.lng, title: props.draft.placeName }])
</script>
<template>
  <div class="place-picker">
    <div v-if="chosen" class="place-picker__map">
      <ActivityMap v-if="draft.lat !== null && draft.lng !== null" :points="point" label="Lieu choisi sur la carte" :zoom="15" />
      <div v-else class="place-picker__placeholder"><MapPin aria-hidden="true" /><span>Adresse sans position sur la carte.</span></div>
      <p class="place-picker__chosen"><MapPin aria-hidden="true" /><span><strong>{{ draft.placeName || draft.address }}</strong><small v-if="draft.placeName">{{ draft.address }}</small></span></p>
    </div>
    <button ref="opener" type="button" class="place-picker__open" :class="{ 'is-invalid': !!error && !chosen, 'is-chosen': chosen }" aria-haspopup="dialog" @click="openPanel">
      <component :is="chosen ? Pencil : MapPin" aria-hidden="true" />
      <span>{{ chosen ? 'Changer de lieu' : 'Choisir le lieu' }}<small v-if="!chosen">Lieux suggérés près de toi ou adresse libre</small></span>
    </button>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>

      <div v-if="open" class="sheet-backdrop place-sheet" @click.self="closePanel">
        <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="place-sheet-title">
          <span class="sheet__grip" aria-hidden="true"></span>
          <header class="sheet__header">
            <h2 id="place-sheet-title" class="display-title">Choisir le lieu</h2>
            <button type="button" class="icon-button icon-button--plain" aria-label="Fermer le choix du lieu" @click="closePanel"><X aria-hidden="true" /></button>
          </header>
          <div class="sheet__content">
            <label class="search-field place-sheet__search"><Search aria-hidden="true" /><span class="sr-only">Filtrer les lieux suggérés</span>
              <input ref="searchInput" v-model="query" type="search" placeholder="Parc, médiathèque, quartier…" autocomplete="off" />
            </label>
            <p id="venue-suggestions" class="field-label mt-4">Lieux suggérés</p>
            <ul class="venue-list" aria-labelledby="venue-suggestions">
              <li v-for="v in suggestions" :key="v.id">
                <button type="button" class="venue-option" :class="{ 'is-selected': isSelected(v) }" :aria-pressed="isSelected(v)" @click="chooseVenue(v)">
                  <MapPin aria-hidden="true" /><span><strong>{{ v.name }}</strong><small>{{ typeLabel(v.type) }} · {{ v.district }}<template v-if="v.km !== null"> · {{ formatDistance(v.km) }}</template></small></span>
                </button>
              </li>
              <li v-if="!suggestions.length" class="muted">Aucun lieu suggéré ne correspond. Indique une adresse ci-dessous.</li>
            </ul>
            <p class="field-label mt-4">Ou une autre adresse</p>
            <label for="place-name" class="sr-only">Nom du lieu</label>
            <input id="place-name" v-model="draft.placeName" class="text-field" placeholder="Nom du lieu, ex. : Café des Arts" maxlength="80" />
            <label for="activity-address" class="sr-only">Adresse</label>
            <AddressInput v-model="draft.address" input-id="activity-address" placeholder="Rechercher une adresse…" class="mt-2" @select="chooseAddress" />
          </div>
          <footer class="sheet__footer">
            <button type="button" class="btn btn--primary" @click="closePanel"><Check aria-hidden="true" />{{ chosen ? 'Valider ce lieu' : 'Fermer' }}</button>
          </footer>
        </section>
      </div>
  </div>
</template>
