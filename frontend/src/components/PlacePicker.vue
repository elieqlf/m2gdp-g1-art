<script setup lang="ts">
import { computed, ref } from 'vue'
import { MapPin } from '@lucide/vue'
import AddressInput from './AddressInput.vue'
import ActivityMap from './ActivityMap.vue'
import venues from '@/data/venues.json'
import { distanceKm, formatDistance, templates, venueTypes, type ActivityDraft } from '@/lib/activity'
import { origin } from '@/lib/store'
import type { AddressSelection } from '@/services/places'

// Lieu de l'activité : lieux publics suggérés (liste NOVART de 120+ lieux de la
// Métropole de Lyon) ou adresse libre avec les suggestions Google Places.
// Le brouillon (objet réactif du parent) est complété directement par ce composant.
const props = defineProps<{ draft: ActivityDraft; error?: string }>()
const typeLabel = (id: string) => venueTypes.find(t => t.id === id)?.label ?? ''
const preferred = computed(() => templates.find(t => t.discipline === props.draft.discipline)?.venueTypes ?? [])
const expanded = ref(false)
const suggestions = computed(() => venues
  .map(v => ({ ...v, km: origin.value ? distanceKm(origin.value, v) : null, score: (preferred.value.includes(v.type) ? 0 : 3) + (origin.value ? distanceKm(origin.value, v) : 0) }))
  .sort((a, b) => a.score - b.score)
  .slice(0, expanded.value ? 12 : 4))
function chooseVenue(v: (typeof venues)[number]) {
  Object.assign(props.draft, { placeName: v.name, address: v.address, district: v.district, lat: v.lat, lng: v.lng })
}
function chooseAddress(selection: AddressSelection | null) {
  if (!selection) { Object.assign(props.draft, { lat: null, lng: null }); return }
  Object.assign(props.draft, { address: selection.address, lat: selection.lat, lng: selection.lng, district: '' })
  if (!props.draft.placeName) props.draft.placeName = selection.address.split(',')[0] ?? ''
}
const point = computed(() => [{ id: 'lieu', lat: props.draft.lat, lng: props.draft.lng, title: props.draft.placeName }])
</script>
<template>
  <div class="place-picker">
    <div class="place-picker__map">
      <ActivityMap v-if="draft.lat !== null && draft.lng !== null" :points="point" label="Lieu choisi sur la carte" :zoom="15" />
      <div v-else class="place-picker__placeholder"><MapPin aria-hidden="true" /><span>Choisis un lieu suggéré ou une adresse proposée pour le voir sur la carte.</span></div>
      <p v-if="draft.placeName" class="place-picker__chosen"><MapPin aria-hidden="true" /><span><strong>{{ draft.placeName }}</strong><small>{{ draft.address }}</small></span></p>
    </div>
    <p class="field-label mt-4" id="venue-suggestions">Lieux suggérés</p>
    <ul class="venue-list" aria-labelledby="venue-suggestions">
      <li v-for="v in suggestions" :key="v.id">
        <button type="button" class="venue-option" :class="{ 'is-selected': draft.placeName === v.name && draft.address === v.address }" :aria-pressed="draft.placeName === v.name && draft.address === v.address" @click="chooseVenue(v)">
          <MapPin aria-hidden="true" /><span><strong>{{ v.name }}</strong><small>{{ typeLabel(v.type) }} · {{ v.district }}<template v-if="v.km !== null"> · {{ formatDistance(v.km) }}</template></small></span>
        </button>
      </li>
    </ul>
    <button v-if="!expanded" type="button" class="link-button" @click="expanded = true">Voir plus de lieux</button>
    <label for="place-name" class="field-label mt-4">Nom du lieu</label>
    <input id="place-name" v-model="draft.placeName" class="text-field" placeholder="Ex. : Café des Arts" maxlength="80" :aria-invalid="!!error" />
    <label for="activity-address" class="field-label mt-4">Adresse</label>
    <AddressInput v-model="draft.address" input-id="activity-address" placeholder="Rechercher un lieu ou saisir une adresse…" @select="chooseAddress" />
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
  </div>
</template>
