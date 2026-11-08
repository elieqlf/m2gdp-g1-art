<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CalendarDays, ChevronDown, List, LocateFixed, Map as MapIcon, MapPin, Palette, Search, SlidersHorizontal, Users, X } from '@lucide/vue'
import ActivityCard from '@/components/ActivityCard.vue'
import ActivityMap from '@/components/ActivityMap.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import MascotState from '@/components/MascotState.vue'
import { activeFilterCount, activityDistance, defaultFilters, disciplineLabel, filterActivities, formatDistance, type Filters, type SortKey } from '@/lib/activity'
import { loadActivities, origin, originLabel, requestPosition, store } from '@/lib/store'
import { useRoute } from '@/lib/router'

// US-04 / US-05 : recherche texte, filtres, tri, vue liste ou carte.
const route = useRoute()
const filters = reactive<Filters>(defaultFilters())
const view = ref<'liste' | 'carte'>('liste')
const sheetOpen = ref(false)
const selectedId = ref('')
const locating = ref(false)
const locateError = ref('')

function syncFromRoute() {
  const q = route.value.query
  Object.assign(filters, defaultFilters(), { query: q.q ?? '', disciplines: q.discipline ? q.discipline.split(',') : [], sort: (['date', 'popularite'].includes(q.tri ?? '') ? q.tri : 'proximite') as SortKey })
  view.value = q.vue === 'carte' ? 'carte' : 'liste'
  sheetOpen.value = q.filtres === '1'
}
syncFromRoute()
watch(() => route.value, value => { if (value.name === 'rechercher') syncFromRoute() })

const results = computed(() => filterActivities(store.activities, filters, origin.value))
const count = (f: Filters) => filterActivities(store.activities, f, origin.value).length
const activeCount = computed(() => activeFilterCount(filters))
const selected = computed(() => results.value.find(a => a.id === selectedId.value) ?? results.value[0])
// Étiquettes de distance seulement sur les 6 premiers résultats et la sélection, pour garder la carte lisible.
const points = computed(() => results.value.slice(0, 150).map((a, index) => ({ id: a.id, lat: a.lat, lng: a.lng, title: a.title, label: index < 6 || a.id === selected.value?.id ? formatDistance(activityDistance(a, origin.value)) : undefined })))
const heading = computed(() => filters.query ? `Résultats pour « ${filters.query} »` : filters.radiusKm < 50 || filters.sort === 'proximite' ? 'Activités autour de moi' : 'Toutes les activités')
const dateLabel = computed(() => filters.day ? new Date(`${filters.day}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ({ toutes: 'Date', aujourdhui: 'Aujourd’hui', semaine: 'Cette semaine', weekend: 'Ce week-end' })[filters.datePreset])
const disciplineChip = computed(() => filters.disciplines.length === 1 ? disciplineLabel(filters.disciplines[0] ?? '') : filters.disciplines.length > 1 ? `${filters.disciplines.length} disciplines` : 'Discipline')
const placesChip = computed(() => ({ tous: 'Places', '1-5': '1 à 5 places', '6-10': '6 à 10 places', '10+': '10+ places' })[filters.places])

function apply(next: Filters) { Object.assign(filters, next); sheetOpen.value = false; selectedId.value = '' }
function resetAll() { Object.assign(filters, defaultFilters()); selectedId.value = '' }
function toggleNearby() { filters.radiusKm = filters.radiusKm < 50 ? 50 : 5 }
async function locate() {
  locating.value = true; locateError.value = ''
  const ok = await requestPosition()
  locating.value = false
  if (!ok) locateError.value = 'Position indisponible : les distances sont calculées depuis ' + originLabel.value + '.'
  else filters.sort = 'proximite'
}
</script>

<template>
  <div class="page page--search" :class="{ 'page--map': view === 'carte' }">
    <header class="search-top">
      <h1 class="sr-only">Rechercher une activité</h1>
      <div class="segmented" role="group" aria-label="Affichage des résultats">
        <button type="button" :class="{ 'is-selected': view === 'liste' }" :aria-pressed="view === 'liste'" @click="view = 'liste'"><List aria-hidden="true" />Liste</button>
        <button type="button" :class="{ 'is-selected': view === 'carte' }" :aria-pressed="view === 'carte'" @click="view = 'carte'"><MapIcon aria-hidden="true" />Carte</button>
      </div>
      <form class="search-row" role="search" @submit.prevent>
        <label class="search-field"><Search aria-hidden="true" /><span class="sr-only">Rechercher</span>
          <input v-model="filters.query" type="search" placeholder="Rechercher une activité, un lieu, une discipline…" enterkeyhint="search" />
          <button v-if="filters.query" type="button" class="search-field__clear" aria-label="Effacer la recherche" @click="filters.query = ''"><X aria-hidden="true" /></button>
        </label>
        <button type="button" class="icon-button" :aria-label="`Ouvrir les filtres${activeCount ? ` (${activeCount} actifs)` : ''}`" @click="sheetOpen = true"><SlidersHorizontal aria-hidden="true" /><span v-if="activeCount" class="icon-button__count">{{ activeCount }}</span></button>
      </form>
      <div class="chip-scroller chip-scroller--tight" role="group" aria-label="Filtres rapides">
        <button type="button" class="filter-pill" :class="{ 'is-selected': filters.radiusKm < 50 }" :aria-pressed="filters.radiusKm < 50" @click="toggleNearby"><MapPin aria-hidden="true" />Autour de moi<template v-if="filters.radiusKm < 50"> · {{ filters.radiusKm }} km</template></button>
        <button type="button" class="filter-pill" :class="{ 'is-selected': filters.datePreset !== 'toutes' || filters.day }" @click="sheetOpen = true"><CalendarDays aria-hidden="true" />{{ dateLabel }}<ChevronDown aria-hidden="true" /></button>
        <button type="button" class="filter-pill" :class="{ 'is-selected': filters.disciplines.length }" @click="sheetOpen = true"><Palette aria-hidden="true" />{{ disciplineChip }}<ChevronDown aria-hidden="true" /></button>
        <button type="button" class="filter-pill" :class="{ 'is-selected': filters.places !== 'tous' }" @click="sheetOpen = true"><Users aria-hidden="true" />{{ placesChip }}<ChevronDown aria-hidden="true" /></button>
      </div>
    </header>

    <p v-if="store.activitiesStatus === 'loading' || store.activitiesStatus === 'idle'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement des activités…</p>
    <MascotState v-else-if="store.activitiesStatus === 'error'" title="Oups, pas de connexion" text="Impossible de charger les activités. Vérifie ta connexion puis réessaie.">
      <button type="button" class="btn btn--primary" @click="loadActivities(true)">Réessayer</button>
    </MascotState>
    <MascotState v-else-if="!results.length" title="Aucune activité trouvée par ici" text="Essaie d’élargir ta zone, de modifier tes filtres ou de chercher un autre mot-clé.">
      <button type="button" class="btn btn--primary" @click="sheetOpen = true"><SlidersHorizontal aria-hidden="true" />Modifier mes filtres</button>
      <button type="button" class="btn btn--soft" @click="resetAll"><Search aria-hidden="true" />Voir toutes les activités</button>
    </MascotState>
    <template v-else-if="view === 'liste'">
      <div class="results-header">
        <h2 class="section-title">{{ heading }}</h2>
        <label class="sort-select">Tri :
          <select v-model="filters.sort" aria-label="Trier les activités"><option value="proximite">Proximité</option><option value="date">Date</option><option value="popularite">Popularité</option></select>
          <ChevronDown aria-hidden="true" />
        </label>
      </div>
      <p class="results-count" aria-live="polite">{{ results.length }} activité{{ results.length > 1 ? 's' : '' }} · distances depuis {{ originLabel }}</p>
      <div class="result-list"><ActivityCard v-for="a in results" :key="a.id" :activity="a" variant="row" /></div>
    </template>
    <section v-else class="map-view" aria-label="Résultats sur la carte">
      <ActivityMap :points="points" :origin="origin" :selected-id="selected?.id" label="Carte des activités" @select="selectedId = $event" />
      <button type="button" class="map-view__locate icon-button icon-button--round" :disabled="locating" aria-label="Me localiser" @click="locate"><LocateFixed aria-hidden="true" /></button>
      <p class="results-count map-view__count" aria-live="polite">{{ results.length }} activité{{ results.length > 1 ? 's' : '' }}<template v-if="locateError"> · {{ locateError }}</template></p>
      <div v-if="selected" class="map-view__sheet"><span class="sheet__grip" aria-hidden="true"></span><ActivityCard :activity="selected" variant="row" /></div>
    </section>

    <FilterSheet v-if="sheetOpen" :filters="filters" :count="count" @apply="apply" @close="sheetOpen = false" />
  </div>
</template>
