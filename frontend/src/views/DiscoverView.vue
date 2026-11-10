<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { Bell, ChevronDown, ChevronRight, ChevronUp, LocateFixed, SlidersHorizontal } from '@lucide/vue'
import ActivityCard from '@/components/ActivityCard.vue'
import ActivityMap from '@/components/ActivityMap.vue'
import DisciplineIcon from '@/components/DisciplineIcon.vue'
import MascotState from '@/components/MascotState.vue'
import SearchBox from '@/components/SearchBox.vue'
import type { Suggestion } from '@/lib/suggest'
import { disciplines, isFull, isMember, isPast, placesLeft, sortActivities, startsAt } from '@/lib/activity'
import { loadActivities, notifyPositionFallback, origin, originLabel, requestPosition, store, uid, unreadNotifications } from '@/lib/store'
import { navigate } from '@/lib/router'

// US-03 : accueil « Découvrir ». La carte s'affiche dès l'ouverture (à la manière
// des applications de transport) ; le panneau du bas reprend le flux de la maquette 05.
const query = ref('')
const discipline = ref('')
// Panneau du bas : replié (seulement la poignée et le titre), aperçu, ou ouvert en grand.
type SheetState = 'closed' | 'peek' | 'open'
const sheet = ref<SheetState>('closed')
const sheetOpen = computed(() => sheet.value === 'open')
const LEVELS: SheetState[] = ['closed', 'peek', 'open']
const step = (direction: 1 | -1) => { sheet.value = LEVELS[Math.min(2, Math.max(0, LEVELS.indexOf(sheet.value) + direction))]! }
const selectedId = ref('')
const locating = ref(false)
const map = ref<InstanceType<typeof ActivityMap> | null>(null)
const now = new Date()
const upcoming = computed(() => store.activities.filter(a => !isPast(a, now) && (!discipline.value || a.discipline === discipline.value)))
/** Une seule carte par photo : les photos par défaut sont communes à une discipline. */
function uniqueCovers<T extends { coverUrl: string }>(activities: T[], limit: number): T[] {
  const covers = new Set<string>()
  return activities.filter(activity => {
    if (covers.has(activity.coverUrl)) return false
    covers.add(activity.coverUrl)
    return true
  }).slice(0, limit)
}
const byDistance = computed(() => sortActivities(upcoming.value, 'proximite', origin.value))
const nearby = computed(() => byDistance.value.filter(a => !isFull(a)).slice(0, 10))
const peek = computed(() => {
  const selected = upcoming.value.find(a => a.id === selectedId.value)
  return selected ? [selected, ...nearby.value.filter(a => a.id !== selected.id)] : nearby.value
})
// Les sections suivantes ne répètent ni les activités ni les photos déjà visibles plus haut.
const shownNearby = computed(() => nearby.value.slice(0, 5))
const forYou = computed(() => {
  const interests = store.profile.interests ?? []
  if (discipline.value || !interests.length) return []
  const usedIds = new Set(shownNearby.value.map(a => a.id))
  return uniqueCovers(sortActivities(upcoming.value.filter(a => interests.includes(a.discipline) && !isFull(a) && !usedIds.has(a.id)), 'popularite', origin.value), 6)
})
const popular = computed(() => {
  const usedIds = new Set([...shownNearby.value, ...forYou.value].map(a => a.id))
  const usedCovers = new Set(forYou.value.map(a => a.coverUrl))
  return uniqueCovers(sortActivities(upcoming.value.filter(a => !isFull(a) && !usedIds.has(a.id) && !usedCovers.has(a.coverUrl)), 'popularite', origin.value), 6)
})
const highlight = computed(() => {
  const soon = upcoming.value.filter(a => startsAt(a).getTime() - now.getTime() < 10 * 86400000 && placesLeft(a) >= 3)
  const usedIds = new Set([...shownNearby.value, ...forYou.value, ...popular.value].map(a => a.id))
  const usedCovers = new Set([...forYou.value, ...popular.value].map(a => a.coverUrl))
  return [...soon].filter(a => !usedIds.has(a.id) && !usedCovers.has(a.coverUrl)).sort((a, b) => b.capacity - a.capacity)[0]
})
// Repères par discipline, regroupés quand ils se chevauchent ; la distance est sur la carte de l'activité.
const points = computed(() => byDistance.value.slice(0, 200).map(a => ({ id: a.id, lat: a.lat, lng: a.lng, title: a.title, discipline: a.discipline })))
// Mes prochaines activités (inscrit ou organisateur), en tête du panneau ouvert.
const myNext = computed(() => store.activities.filter(a => !isPast(a, now) && (isMember(a, uid.value) || a.organizerId === uid.value)).sort((a, b) => startsAt(a).getTime() - startsAt(b).getTime()).slice(0, 3))
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
  sheet.value = 'peek'
  await nextTick()
  document.querySelector('.discover-sheet__peek')?.scrollTo({ left: 0, behavior: 'smooth' })
}
async function locate() {
  locating.value = true
  const ok = await requestPosition()
  locating.value = false
  if (origin.value) map.value?.recenter(origin.value)
  if (!ok) notifyPositionFallback()
}
// Glisser le panneau avec le doigt (comme les boutons) : il suit le doigt, puis se cale sur la
// position la plus proche dans le sens du geste. En aperçu ou replié, tout le panneau se tire
// (les cartes défilent toujours de côté) ; ouvert, on le tire par la poignée et le titre.
const sheetEl = ref<HTMLElement | null>(null)
let drag: { id: number; y: number; height: number; moved: boolean } | null = null
const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
function heights() {
  const container = sheetEl.value?.parentElement?.clientHeight ?? window.innerHeight
  return { closed: 4.3 * rem(), peek: 16.5 * rem(), open: container - 7.2 * rem() }
}
function dragStart(event: PointerEvent) {
  if (!sheetEl.value || (event.pointerType === 'mouse' && event.button !== 0)) return
  const target = event.target as HTMLElement
  if (sheet.value === 'open' && !target.closest('.discover-sheet__handle')) return
  drag = { id: event.pointerId, y: event.clientY, height: sheetEl.value.getBoundingClientRect().height, moved: false }
  // Suivi sur toute la fenêtre : le doigt (ou la souris) sort vite du panneau en le tirant.
  window.addEventListener('pointermove', dragMove)
  window.addEventListener('pointerup', dragEnd)
  window.addEventListener('pointercancel', dragEnd)
}
function stopListening() {
  window.removeEventListener('pointermove', dragMove)
  window.removeEventListener('pointerup', dragEnd)
  window.removeEventListener('pointercancel', dragEnd)
}
onBeforeUnmount(stopListening)
function dragMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id || !sheetEl.value) return
  const dy = event.clientY - drag.y
  if (!drag.moved) {
    if (Math.abs(dy) < 8) return
    drag.moved = true
    sheetEl.value.classList.add('is-dragging')
  }
  const { closed, open } = heights()
  sheetEl.value.style.height = `${Math.min(open, Math.max(closed, drag.height - dy))}px`
}
function dragEnd(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const { moved, y, height } = drag
  drag = null
  stopListening()
  if (!sheetEl.value || !moved) return
  sheetEl.value.dataset.dragged = '1'
  setTimeout(() => { if (sheetEl.value) delete sheetEl.value.dataset.dragged }, 350)
  sheetEl.value.classList.remove('is-dragging')
  sheetEl.value.style.height = ''
  const dy = event.clientY - y
  const h = heights()
  const final = height - dy
  const levels: [SheetState, number][] = [['closed', h.closed], ['peek', h.peek], ['open', h.open]]
  // Position la plus proche, mais au moins un cran dans le sens du geste (dès 40 px).
  let target = levels.reduce((best, level) => Math.abs(level[1] - final) < Math.abs(best[1] - final) ? level : best)[0]
  const current = LEVELS.indexOf(sheet.value)
  if (dy > 40 && LEVELS.indexOf(target) >= current) target = LEVELS[Math.max(0, current - 1)]!
  if (dy < -40 && LEVELS.indexOf(target) <= current) target = LEVELS[Math.min(2, current + 1)]!
  sheet.value = target
}
// Un clic juste après un glissement ne doit pas ouvrir une activité ou basculer un bouton.
function swallowClickAfterDrag(event: MouseEvent) { if (sheetEl.value?.dataset.dragged === '1') { event.stopPropagation(); event.preventDefault(); delete sheetEl.value.dataset.dragged } }
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

    <section ref="sheetEl" class="discover-sheet" :class="{ 'is-open': sheet === 'open', 'is-closed': sheet === 'closed' }" aria-labelledby="nearby-title"
      @pointerdown="dragStart" @click.capture="swallowClickAfterDrag">
      <div class="discover-sheet__handle">
        <span class="sheet__grip" aria-hidden="true"></span>
        <div class="discover-sheet__header">
          <h2 id="nearby-title" class="section-title">Autour de toi</h2>
          <div class="discover-sheet__actions">
            <button v-if="sheet === 'peek'" type="button" class="icon-button icon-button--plain discover-sheet__hide" aria-label="Replier le panneau" aria-controls="discover-feed" @click="sheet = 'closed'"><ChevronDown aria-hidden="true" /></button>
            <button type="button" class="section-link discover-sheet__toggle" :aria-expanded="sheet !== 'closed'" aria-controls="discover-feed" @click="sheet = sheet === 'open' ? 'peek' : sheet === 'closed' ? 'peek' : 'open'">
              <template v-if="sheet === 'open'">Voir la carte<ChevronDown aria-hidden="true" /></template>
              <template v-else-if="sheet === 'closed'">Afficher<ChevronUp aria-hidden="true" /></template>
              <template v-else>Tout voir<ChevronUp aria-hidden="true" /></template>
            </button>
          </div>
        </div>
      </div>

      <div v-show="sheet !== 'closed'" id="discover-feed" class="discover-sheet__body">
        <p v-if="store.activitiesStatus === 'loading' || store.activitiesStatus === 'idle'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement des activités…</p>
        <MascotState v-else-if="store.activitiesStatus === 'error'" title="Oups, pas de connexion" text="Impossible de charger les activités. Vérifie ta connexion puis réessaie.">
          <button type="button" class="btn btn--primary" @click="loadActivities(true)">Réessayer</button>
        </MascotState>
        <MascotState v-else-if="!upcoming.length" title="Aucune activité pour le moment" :text="discipline ? 'Aucune activité à venir dans cette discipline.' : 'Sois la première personne à proposer une rencontre artistique !'">
          <a href="#/creer" class="btn btn--primary">Créer une activité</a>
        </MascotState>
        <template v-else>
          <p v-if="store.gpsStatus === 'pending'" class="results-count" role="status">Recherche de ta position…</p>
          <p v-else-if="origin" class="results-count">Distances depuis {{ originLabel }}</p>
          <p v-else class="results-count">Active ta position ou indique ta ville dans ton profil pour voir les activités les plus proches.</p>
          <div v-if="!sheetOpen" class="discover-sheet__peek">
            <ActivityCard v-for="a in peek" :key="a.id" :activity="a" variant="row" :class="{ 'is-highlighted': a.id === selectedId }" />
          </div>
          <template v-else>
            <section v-if="myNext.length" class="feed-section feed-section--first" aria-labelledby="my-next-title">
              <header class="section-header"><h2 id="my-next-title" class="section-title">Tes prochaines activités</h2><a href="#/mes-activites" class="section-link">Tout voir<ChevronRight aria-hidden="true" /></a></header>
              <div class="agenda-list"><ActivityCard v-for="a in myNext" :key="a.id" :activity="a" variant="agenda" /></div>
            </section>
            <h2 v-if="myNext.length" class="section-title discover-sheet__subtitle">Autour de toi</h2>
            <div class="result-list"><ActivityCard v-for="a in nearby.slice(0, 5)" :key="a.id" :activity="a" variant="row" :class="{ 'is-highlighted': a.id === selectedId }" /></div>
            <a href="#/rechercher" class="section-link discover-sheet__more">Voir toutes les activités<ChevronRight aria-hidden="true" /></a>
            <section v-if="forYou.length" class="feed-section" aria-labelledby="for-you-title">
              <header class="section-header"><h2 id="for-you-title" class="section-title">Selon tes envies</h2><a href="#/rechercher" class="section-link">Voir tout<ChevronRight aria-hidden="true" /></a></header>
              <div class="card-scroller card-scroller--compact"><ActivityCard v-for="a in forYou" :key="a.id" :activity="a" /></div>
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
        </template>
      </div>
    </section>
  </div>
</template>
