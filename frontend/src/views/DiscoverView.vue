<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, MapPin, Search, SlidersHorizontal } from '@lucide/vue'
import ActivityCard from '@/components/ActivityCard.vue'
import DisciplineIcon from '@/components/DisciplineIcon.vue'
import MascotState from '@/components/MascotState.vue'
import { activityDistance, disciplines, isFull, isPast, placesLeft, sortActivities, startsAt } from '@/lib/activity'
import { loadActivities, origin, store } from '@/lib/store'
import { navigate } from '@/lib/router'

// US-03 : accueil « Découvrir » (maquette 05).
const query = ref('')
const discipline = ref('')
const now = new Date()
const upcoming = computed(() => store.activities.filter(a => !isPast(a, now) && (!discipline.value || a.discipline === discipline.value)))
const nearby = computed(() => sortActivities(upcoming.value.filter(a => !isFull(a) && (activityDistance(a, origin.value) ?? 99) < 8), 'proximite', origin.value).slice(0, 2))
const popular = computed(() => sortActivities(upcoming.value.filter(a => !isFull(a)), 'popularite', origin.value).filter(a => !nearby.value.some(n => n.id === a.id)).slice(0, 6))
const highlight = computed(() => {
  const soon = upcoming.value.filter(a => startsAt(a).getTime() - now.getTime() < 10 * 86400000 && placesLeft(a) >= 3)
  return [...soon].filter(a => !nearby.value.some(n => n.id === a.id) && !popular.value.some(p => p.id === a.id)).sort((a, b) => b.capacity - a.capacity)[0]
})
const chips = computed(() => disciplines.filter(d => d.id !== 'autre'))
function search() { navigate('rechercher', { q: query.value.trim() }) }
</script>

<template>
  <div class="page page--discover">
    <h1 class="sr-only">Découvrir les activités</h1>
    <form class="search-row" role="search" @submit.prevent="search">
      <label class="search-field"><Search aria-hidden="true" /><span class="sr-only">Rechercher</span>
        <input v-model="query" type="search" placeholder="Rechercher une activité, un lieu, une discipline…" enterkeyhint="search" />
      </label>
      <a href="#/rechercher?filtres=1" class="icon-button" aria-label="Ouvrir les filtres"><SlidersHorizontal aria-hidden="true" /></a>
    </form>
    <div class="chip-scroller" role="group" aria-label="Filtrer par discipline">
      <button type="button" class="pill" :class="{ 'is-selected': !discipline }" :aria-pressed="!discipline" @click="discipline = ''">Tous</button>
      <button v-for="d in chips" :key="d.id" type="button" class="pill" :class="{ 'is-selected': discipline === d.id }" :aria-pressed="discipline === d.id" @click="discipline = discipline === d.id ? '' : d.id"><DisciplineIcon :discipline="d.id" />{{ d.label }}</button>
    </div>

    <p v-if="store.activitiesStatus === 'loading' || store.activitiesStatus === 'idle'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement des activités…</p>
    <MascotState v-else-if="store.activitiesStatus === 'error'" title="Oups, pas de connexion" text="Impossible de charger les activités. Vérifie ta connexion puis réessaie.">
      <button type="button" class="btn btn--primary" @click="loadActivities(true)">Réessayer</button>
    </MascotState>
    <MascotState v-else-if="!upcoming.length" title="Aucune activité pour le moment" :text="discipline ? 'Aucune activité à venir dans cette discipline.' : 'Sois la première personne à proposer une rencontre artistique !'">
      <a href="#/creer" class="btn btn--primary">Créer une activité</a>
    </MascotState>
    <template v-else>
      <section v-if="nearby.length" class="feed-section" aria-labelledby="nearby-title">
        <header class="section-header"><h2 id="nearby-title" class="section-title">Autour de toi</h2><a href="#/rechercher?vue=carte" class="section-link"><MapPin aria-hidden="true" />Voir la carte<ChevronRight aria-hidden="true" /></a></header>
        <div class="card-scroller card-scroller--nearby"><ActivityCard v-for="a in nearby" :key="a.id" :activity="a" /></div>
      </section>
      <section class="feed-section" aria-labelledby="popular-title">
        <header class="section-header"><h2 id="popular-title" class="section-title">Activités populaires</h2><a href="#/rechercher?tri=popularite" class="section-link">Voir tout<ChevronRight aria-hidden="true" /></a></header>
        <div class="card-scroller card-scroller--compact card-scroller--popular"><ActivityCard v-for="a in popular" :key="a.id" :activity="a" /></div>
      </section>
      <section v-if="highlight" class="feed-section" aria-labelledby="highlight-title">
        <header class="section-header"><h2 id="highlight-title" class="section-title">À ne pas manquer</h2><a href="#/rechercher?tri=date" class="section-link">Voir tout<ChevronRight aria-hidden="true" /></a></header>
        <ActivityCard :activity="highlight" variant="feature" />
      </section>
    </template>
  </div>
</template>
