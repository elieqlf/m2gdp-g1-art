<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CalendarDays, ChevronDown, List, LocateFixed, Map as MapIcon, MapPin, Palette, Search, SlidersHorizontal, Users } from '@lucide/vue'
import ActivityCard from '@/components/ActivityCard.vue'
import ActivityMap from '@/components/ActivityMap.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import MascotState from '@/components/MascotState.vue'
import SearchBox from '@/components/SearchBox.vue'
import type { Suggestion } from '@/lib/suggest'
import { activeFilterCount, defaultFilters, disciplineLabel, disciplines, filterActivities, type DatePreset, type Filters, type LevelId, type PlacesPreset, type SortKey } from '@/lib/activity'
import { loadActivities, origin, originLabel, requestPosition, store } from '@/lib/store'
import { navigate, replaceRoute, useRoute } from '@/lib/router'

// US-04 / US-05 : recherche texte, filtres, tri, vue liste ou carte.
const route = useRoute()
const filters = reactive<Filters>(defaultFilters())
const view = ref<'liste' | 'carte'>('liste')
const sheetOpen = ref(false)
const selectedId = ref('')
const locating = ref(false)
const locateError = ref('')
const defaultRadius = () => origin.value ? 5 : 50
const defaultSort = () => origin.value ? 'proximite' : 'date'

function syncFromRoute() {
  const q = route.value.query
  const datePreset = (['toutes', 'aujourdhui', 'semaine', 'weekend'].includes(q.date ?? '') ? q.date : 'toutes') as DatePreset
  const places = (['tous', '1-5', '6-10', '10+'].includes(q.places ?? '') ? q.places : 'tous') as PlacesPreset
  const level = (['tous', 'debutant', 'intermediaire', 'avance'].includes(q.niveau ?? '') ? q.niveau : 'tous') as LevelId
  const requestedRadius = q.rayon ? Number(q.rayon) : defaultRadius()
  const radius = Number.isFinite(requestedRadius) && requestedRadius >= 1 ? Math.min(50, requestedRadius) : defaultRadius()
  const day = /^\d{4}-\d{2}-\d{2}$/.test(q.jour ?? '') ? q.jour! : ''
  Object.assign(filters, defaultFilters(), {
    query: q.q ?? '',
    disciplines: (q.discipline ?? '').split(',').filter(id => disciplines.some(d => d.id === id)),
    datePreset, day, radiusKm: radius,
    places, level, sort: (['date', 'popularite', 'proximite'].includes(q.tri ?? '') ? q.tri : defaultSort()) as SortKey,
  })
  view.value = q.vue === 'carte' ? 'carte' : 'liste'
  sheetOpen.value = q.filtres === '1'
}
syncFromRoute()
watch(() => route.value, value => { if (value.name === 'rechercher') syncFromRoute() })
function persistRoute() {
  const query: Record<string, string> = {
    q: filters.query,
    discipline: filters.disciplines.join(','),
    date: filters.datePreset === 'toutes' ? '' : filters.datePreset,
    jour: filters.day,
    rayon: filters.radiusKm === defaultRadius() ? '' : String(filters.radiusKm),
    places: filters.places === 'tous' ? '' : filters.places,
    niveau: filters.level === 'tous' ? '' : filters.level,
    tri: filters.sort === defaultSort() ? '' : filters.sort,
    vue: view.value === 'liste' ? '' : view.value,
    filtres: sheetOpen.value ? '1' : '',
  }
  replaceRoute('rechercher', query)
}
watch(filters, persistRoute, { deep: true })
watch([view, sheetOpen], persistRoute)

const results = computed(() => filterActivities(store.activities, filters, origin.value))
const count = (f: Filters) => filterActivities(store.activities, f, origin.value).length
const activeCount = computed(() => activeFilterCount(filters))
const selected = computed(() => results.value.find(a => a.id === selectedId.value) ?? results.value[0])
// Le détail et la distance apparaissent dans la carte de l’activité sélectionnée.
// Les repères restent sans étiquettes flottantes pour éviter les chevauchements.
const points = computed(() => results.value.slice(0, 150).map(a => ({ id: a.id, lat: a.lat, lng: a.lng, title: a.title, discipline: a.discipline })))
const heading = computed(() => filters.query ? `Résultats pour « ${filters.query} »` : origin.value && filters.radiusKm < 50 ? 'Activités autour de moi' : 'Toutes les activités')
const dateLabel = computed(() => filters.day ? new Date(`${filters.day}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ({ toutes: 'Date', aujourdhui: 'Aujourd’hui', semaine: 'Cette semaine', weekend: 'Ce week-end' })[filters.datePreset])
const disciplineChip = computed(() => filters.disciplines.length === 1 ? disciplineLabel(filters.disciplines[0] ?? '') : filters.disciplines.length > 1 ? `${filters.disciplines.length} disciplines` : 'Discipline')
const placesChip = computed(() => ({ tous: 'Places', '1-5': '1 à 5 places', '6-10': '6 à 10 places', '10+': '10+ places' })[filters.places])

function apply(next: Filters) { Object.assign(filters, next); sheetOpen.value = false; selectedId.value = '' }
function resetAll() { Object.assign(filters, defaultFilters(), { radiusKm: defaultRadius(), sort: defaultSort() }); selectedId.value = '' }
function showAllActivities() { Object.assign(filters, defaultFilters(), { radiusKm: 50, sort: 'date' }); selectedId.value = '' }
function toggleNearby() { if (!origin.value) { void locate(); return }; filters.radiusKm = filters.radiusKm < 50 ? 50 : 5 }
async function locate() {
  locating.value = true; locateError.value = ''
  const ok = await requestPosition()
  locating.value = false
  if (!ok) locateError.value = 'Position indisponible. Tu peux renseigner ta zone dans ton profil.'
  else { filters.sort = 'proximite'; filters.radiusKm = 5 }
}
// Autocomplétion : une activité ouvre sa fiche ; une discipline devient un filtre ; le reste, la recherche.
function pick(s: Suggestion) {
  if (s.kind === 'activity') navigate(`activite/${encodeURIComponent(s.id)}`)
  else if (s.kind === 'discipline') Object.assign(filters, { query: '', disciplines: [s.id] })
  else filters.query = s.value
}
</script>

<template>
  <div class="page page--search" :class="{ 'page--map': view === 'carte' }">
    <header class="search-top">
      <h1 class="sr-only">Rechercher une activité</h1>
      <div class="segmented search-top__views" role="group" aria-label="Affichage des résultats">
        <button type="button" :class="{ 'is-selected': view === 'liste' }" :aria-pressed="view === 'liste'" @click="view = 'liste'"><List aria-hidden="true" />Liste</button>
        <button type="button" :class="{ 'is-selected': view === 'carte' }" :aria-pressed="view === 'carte'" @click="view = 'carte'"><MapIcon aria-hidden="true" />Carte</button>
      </div>
      <form class="search-row" role="search" @submit.prevent>
        <SearchBox v-model="filters.query" placeholder="Rechercher une activité, un lieu, une discipline…" clearable @pick="pick" />
        <button type="button" class="icon-button" :aria-label="`Ouvrir les filtres${activeCount ? ` (${activeCount} actifs)` : ''}`" @click="sheetOpen = true"><SlidersHorizontal aria-hidden="true" /><span v-if="activeCount" class="icon-button__count">{{ activeCount }}</span></button>
      </form>
      <div class="chip-scroller chip-scroller--tight" role="group" aria-label="Filtres rapides">
        <button type="button" class="filter-pill" :class="{ 'is-selected': !!origin && filters.radiusKm < 50 }" :aria-pressed="!!origin && filters.radiusKm < 50" @click="toggleNearby"><MapPin aria-hidden="true" />Autour de moi<template v-if="origin && filters.radiusKm < 50"> · {{ filters.radiusKm }} km</template></button>
        <button type="button" class="filter-pill" :class="{ 'is-selected': filters.datePreset !== 'toutes' || filters.day }" @click="sheetOpen = true"><CalendarDays aria-hidden="true" />{{ dateLabel }}<ChevronDown aria-hidden="true" /></button>
        <button type="button" class="filter-pill" :class="{ 'is-selected': filters.disciplines.length }" @click="sheetOpen = true"><Palette aria-hidden="true" />{{ disciplineChip }}<ChevronDown aria-hidden="true" /></button>
        <button type="button" class="filter-pill" :class="{ 'is-selected': filters.places !== 'tous' }" @click="sheetOpen = true"><Users aria-hidden="true" />{{ placesChip }}<ChevronDown aria-hidden="true" /></button>
      </div>
      <p v-if="locateError && view === 'liste'" class="form-alert search-location-error" role="alert">{{ locateError }}</p>
    </header>

    <template v-if="view === 'carte'">
      <section class="map-view" aria-label="Résultats sur la carte">
        <ActivityMap :points="points" :origin="origin" :selected-id="selected?.id" label="Carte des activités" @select="selectedId = $event" />
        <button type="button" class="map-view__locate icon-button icon-button--round" :disabled="locating" aria-label="Me localiser" @click="locate"><LocateFixed aria-hidden="true" /></button>
        <p class="results-count map-view__count" aria-live="polite">{{ results.length }} activité{{ results.length > 1 ? 's' : '' }}<template v-if="locateError"> · {{ locateError }}</template></p>
        <p v-if="locateError" class="map-view__location-error" role="alert">{{ locateError }}</p>
        <div v-if="store.activitiesStatus === 'loading' || store.activitiesStatus === 'idle'" class="map-view__state" role="status"><span class="spinner" aria-hidden="true"></span>Chargement des activités…</div>
        <div v-else-if="store.activitiesStatus === 'error'" class="map-view__empty" role="alert"><h2>La carte n’a pas pu charger</h2><p>Vérifie ta connexion puis réessaie.</p><button type="button" class="btn btn--primary" @click="loadActivities(true)">Réessayer</button></div>
        <div v-else-if="!results.length" class="map-view__empty"><h2>Aucune activité trouvée par ici</h2><p>Élargis la zone ou ajuste tes filtres.</p><button type="button" class="btn btn--primary" @click="sheetOpen = true"><SlidersHorizontal aria-hidden="true" />Modifier mes filtres</button><button type="button" class="btn btn--soft" @click="showAllActivities(); view = 'liste'"><Search aria-hidden="true" />Voir toutes les activités</button></div>
        <div v-else-if="selected" class="map-view__sheet"><span class="sheet__grip" aria-hidden="true"></span><ActivityCard :activity="selected" variant="row" /></div>
      </section>
    </template>
    <template v-else>
      <p v-if="store.activitiesStatus === 'loading' || store.activitiesStatus === 'idle'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement des activités…</p>
      <MascotState v-else-if="store.activitiesStatus === 'error'" title="Oups, pas de connexion" text="Impossible de charger les activités. Vérifie ta connexion puis réessaie.">
        <button type="button" class="btn btn--primary" @click="loadActivities(true)">Réessayer</button>
      </MascotState>
      <MascotState v-else-if="!results.length" title="Aucune activité trouvée par ici" text="Essaie d’élargir ta zone, de modifier tes filtres ou de chercher un autre mot-clé.">
        <button type="button" class="btn btn--primary" @click="sheetOpen = true"><SlidersHorizontal aria-hidden="true" />Modifier mes filtres</button>
        <button type="button" class="btn btn--soft" @click="showAllActivities"><Search aria-hidden="true" />Voir toutes les activités</button>
      </MascotState>
      <template v-else>
        <div class="results-header">
          <h2 class="section-title">{{ heading }}</h2>
          <label class="sort-select">Tri :
            <select v-model="filters.sort" aria-label="Trier les activités"><option value="proximite">Proximité</option><option value="date">Date</option><option value="popularite">Popularité</option></select>
            <ChevronDown aria-hidden="true" />
          </label>
        </div>
        <p class="results-count sr-only" aria-live="polite">{{ results.length }} activité{{ results.length > 1 ? 's' : '' }}<template v-if="origin"> · distances depuis {{ originLabel }}</template></p>
        <div class="result-list"><ActivityCard v-for="a in results" :key="a.id" :activity="a" variant="row" /></div>
      </template>
    </template>

    <FilterSheet v-if="sheetOpen" :filters="filters" :count="count" :origin-available="!!origin" :location-error="locateError" :locating="locating" @apply="apply" @close="sheetOpen = false" @locate="locate" />
  </div>
</template>
