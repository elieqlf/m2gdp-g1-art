<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Bell, ChevronDown, ChevronRight, ChevronUp, LocateFixed, SlidersHorizontal } from '@lucide/vue'
import ActivityCard from '@/components/ActivityCard.vue'
import ActivityMap from '@/components/ActivityMap.vue'
import DisciplineIcon from '@/components/DisciplineIcon.vue'
import MascotState from '@/components/MascotState.vue'
import SearchBox from '@/components/SearchBox.vue'
import type { Suggestion } from '@/lib/suggest'
import { activityDistance, disciplines, formatDistance, isFull, isPast, placesLeft, sortActivities, startsAt } from '@/lib/activity'
import { loadActivities, notifyPositionFallback, origin, originLabel, requestPosition, store, unreadNotifications } from '@/lib/store'
import { navigate } from '@/lib/router'

// US-03 : accueil « Découvrir ». La carte s'affiche dès l'ouverture (à la manière
// des applications de transport) ; le panneau du bas reprend le flux de la maquette 05.
const query = ref('')
const discipline = ref('')
const sheetOpen = ref(false)
const selectedId = ref('')
const locating = ref(false)
const map = ref<InstanceType<typeof ActivityMap> | null>(null)
const now = new Date()
const upcoming = computed(() => store.activities.filter(a => !isPast(a, now) && (!discipline.value || a.discipline === discipline.value)))
const byDistance = computed(() => sortActivities(upcoming.value, 'proximite', origin.value))
const nearby = computed(() => byDistance.value.filter(a => !isFull(a)).slice(0, 10))
const peek = computed(() => {
  const selected = upcoming.value.find(a => a.id === selectedId.value)
  return selected ? [selected, ...nearby.value.filter(a => a.id !== selected.id)] : nearby.value
})
const popular = computed(() => sortActivities(upcoming.value, 'popularite', origin.value).slice(0, 8))
const interests = computed(() => store.profile.interests ?? [])
const forYou = computed(() => discipline.value ? [] : sortActivities(upcoming.value.filter(a => interests.value.includes(a.discipline) && !isFull(a)), 'date', origin.value).slice(0, 8))
const highlight = computed(() => {
  const soon = upcoming.value.filter(a => startsAt(a).getTime() - now.getTime() < 10 * 86400000 && placesLeft(a) >= 3)
  return [...soon].sort((a, b) => b.capacity - a.capacity)[0]
})
// Étiquettes de distance sur les activités les plus proches et la sélection, pour garder la carte lisible.
const points = computed(() => byDistance.value.slice(0, 200).map((a, index) => ({ id: a.id, lat: a.lat, lng: a.lng, title: a.title, label: index < 6 || a.id === selectedId.value ? formatDistance(activityDistance(a, origin.value)) : undefined })))
const chips = computed(() => disciplines.filter(d => d.id !== 'autre'))

function search() { navigate('rechercher', { q: query.value.trim() }) }
// Autocomplétion : une activité ouvre sa fiche, une discipline filtre la recherche, le reste devient la recherche.
function pick(s: Suggestion) {
  if (s.kind === 'activity') navigate(`activite/${encodeURIComponent(s.id)}`)
  else if (s.kind === 'discipline') navigate('rechercher', { discipline: s.id })
  else navigate('rechercher', { q: s.value })
}
async function select(id: string) {
  selectedId.value = id
  sheetOpen.value = false
  await nextTick()
  document.querySelector('.discover-sheet__peek')?.scrollTo({ left: 0, behavior: 'smooth' })
}
async function locate() {
  locating.value = true
  const ok = await requestPosition()
  locating.value = false
  map.value?.recenter(origin.value)
  if (!ok) notifyPositionFallback()
}
// Glisser le panneau vers le haut ou le bas (en plus du bouton).
let startY: number | null = null
function dragStart(event: PointerEvent) { startY = event.clientY }
function dragEnd(event: PointerEvent) {
  if (startY === null) return
  const delta = event.clientY - startY
  startY = null
  if (delta < -40) sheetOpen.value = true
  else if (delta > 40) sheetOpen.value = false
}
</script>

<template>
  <div class="discover">
    <h1 class="sr-only">Découvrir les activités autour de toi</h1>
    <ActivityMap ref="map" class="discover__map" :points="points" :origin="origin" :center="origin" :zoom="14" :selected-id="selectedId" label="Carte des activités autour de toi" @select="select" />

    <div class="discover__top">
      <form class="search-row" role="search" @submit.prevent="search">
        <SearchBox v-model="query" floating @submit="search" @pick="pick" />
        <a href="#/rechercher?filtres=1" class="icon-button icon-button--floating" aria-label="Ouvrir les filtres"><SlidersHorizontal aria-hidden="true" /></a>
        <a href="#/notifications" class="icon-button icon-button--floating has-badge" :aria-label="unreadNotifications ? `Notifications, ${unreadNotifications} nouvelle${unreadNotifications > 1 ? 's' : ''}` : 'Notifications'"><Bell aria-hidden="true" /><span v-if="unreadNotifications" class="count-badge" aria-hidden="true">{{ unreadNotifications > 9 ? '9+' : unreadNotifications }}</span></a>
      </form>
      <div class="chip-scroller chip-scroller--tight" role="group" aria-label="Filtrer par discipline">
        <button type="button" class="pill pill--floating" :class="{ 'is-selected': !discipline }" :aria-pressed="!discipline" @click="discipline = ''">Tous</button>
        <button v-for="d in chips" :key="d.id" type="button" class="pill pill--floating" :class="{ 'is-selected': discipline === d.id }" :aria-pressed="discipline === d.id" @click="discipline = discipline === d.id ? '' : d.id"><DisciplineIcon :discipline="d.id" />{{ d.label }}</button>
      </div>
    </div>

    <button type="button" class="icon-button icon-button--round discover__locate" :disabled="locating" aria-label="Me localiser" @click="locate"><LocateFixed aria-hidden="true" /></button>

    <section class="discover-sheet" :class="{ 'is-open': sheetOpen }" aria-labelledby="nearby-title">
      <div class="discover-sheet__handle" @pointerdown="dragStart" @pointerup="dragEnd">
        <span class="sheet__grip" aria-hidden="true"></span>
        <div class="discover-sheet__header">
          <h2 id="nearby-title" class="section-title">Autour de toi</h2>
          <button type="button" class="section-link discover-sheet__toggle" :aria-expanded="sheetOpen" aria-controls="discover-feed" @click="sheetOpen = !sheetOpen">
            <template v-if="sheetOpen">Voir la carte<ChevronDown aria-hidden="true" /></template>
            <template v-else>Tout voir<ChevronUp aria-hidden="true" /></template>
          </button>
        </div>
      </div>

      <div id="discover-feed" class="discover-sheet__body">
        <p v-if="store.activitiesStatus === 'loading' || store.activitiesStatus === 'idle'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement des activités…</p>
        <MascotState v-else-if="store.activitiesStatus === 'error'" title="Oups, pas de connexion" text="Impossible de charger les activités. Vérifie ta connexion puis réessaie.">
          <button type="button" class="btn btn--primary" @click="loadActivities(true)">Réessayer</button>
        </MascotState>
        <MascotState v-else-if="!upcoming.length" title="Aucune activité pour le moment" :text="discipline ? 'Aucune activité à venir dans cette discipline.' : 'Sois la première personne à proposer une rencontre artistique !'">
          <a href="#/creer" class="btn btn--primary">Créer une activité</a>
        </MascotState>
        <template v-else>
          <p v-if="store.gpsStatus === 'pending'" class="results-count" role="status">Recherche de ta position…</p>
          <p v-else class="results-count">Distances depuis {{ originLabel }}</p>
          <div v-if="!sheetOpen" class="discover-sheet__peek">
            <ActivityCard v-for="a in peek" :key="a.id" :activity="a" variant="row" :class="{ 'is-highlighted': a.id === selectedId }" />
          </div>
          <template v-else>
            <div class="result-list"><ActivityCard v-for="a in nearby.slice(0, 5)" :key="a.id" :activity="a" variant="row" :class="{ 'is-highlighted': a.id === selectedId }" /></div>
            <a href="#/rechercher" class="section-link discover-sheet__more">Voir toutes les activités<ChevronRight aria-hidden="true" /></a>
            <section v-if="forYou.length" class="feed-section" aria-labelledby="foryou-title">
              <header class="section-header"><h2 id="foryou-title" class="section-title">Selon tes envies</h2><a href="#/rechercher" class="section-link">Voir tout<ChevronRight aria-hidden="true" /></a></header>
              <div class="card-scroller card-scroller--compact"><ActivityCard v-for="a in forYou" :key="a.id" :activity="a" /></div>
            </section>
            <section class="feed-section" aria-labelledby="popular-title">
              <header class="section-header"><h2 id="popular-title" class="section-title">Activités populaires</h2><a href="#/rechercher?tri=popularite" class="section-link">Voir tout<ChevronRight aria-hidden="true" /></a></header>
              <div class="card-scroller card-scroller--compact"><ActivityCard v-for="a in popular" :key="a.id" :activity="a" /></div>
            </section>
            <section v-if="highlight" class="feed-section" aria-labelledby="highlight-title">
              <header class="section-header"><h2 id="highlight-title" class="section-title">À ne pas manquer</h2><a href="#/rechercher?tri=date" class="section-link">Voir tout<ChevronRight aria-hidden="true" /></a></header>
              <ActivityCard :activity="highlight" variant="feature" />
            </section>
          </template>
        </template>
      </div>
    </section>
  </div>
</template>
