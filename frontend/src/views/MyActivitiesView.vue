<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Search } from '@lucide/vue'
import ActivityCard from '@/components/ActivityCard.vue'
import MascotState from '@/components/MascotState.vue'
import { isPast, startsAt, type Activity } from '@/lib/activity'
import { loadActivities, store, uid } from '@/lib/store'

// US-13 : retrouver les activités auxquelles je participe et celles que j'organise (maquette 17).
const tab = ref<'avenir' | 'passees'>('avenir')
const now = new Date()
const byDate = (direction: 1 | -1) => (a: Activity, b: Activity) => direction * (startsAt(a).getTime() - startsAt(b).getTime())
const scoped = computed(() => store.activities.filter(a => (tab.value === 'avenir') !== isPast(a, now)).sort(byDate(tab.value === 'avenir' ? 1 : -1)))
const joined = computed(() => scoped.value.filter(a => a.participantIds.includes(uid.value)))
const organized = computed(() => scoped.value.filter(a => a.organizerId === uid.value))
const counts = computed(() => {
  const mine = store.activities.filter(a => a.organizerId === uid.value || a.participantIds.includes(uid.value))
  return { avenir: mine.filter(a => !isPast(a, now)).length, passees: mine.filter(a => isPast(a, now)).length }
})
</script>

<template>
  <div class="page">
    <div class="topbar topbar--end"><a href="#/rechercher" class="icon-button icon-button--plain" aria-label="Rechercher une activité"><Search aria-hidden="true" /></a><a href="#/creer" class="icon-button icon-button--primary" aria-label="Créer une activité"><Plus aria-hidden="true" /></a></div>
    <header class="page-header"><h1 class="display-title">Mes activités</h1><p class="lead">Retrouve ici les activités auxquelles tu participes et celles que tu organises.</p></header>
    <div class="tabs" role="tablist" aria-label="Période">
      <button type="button" role="tab" :aria-selected="tab === 'avenir'" :class="{ 'is-selected': tab === 'avenir' }" @click="tab = 'avenir'">À venir ({{ counts.avenir }})</button>
      <button type="button" role="tab" :aria-selected="tab === 'passees'" :class="{ 'is-selected': tab === 'passees' }" @click="tab = 'passees'">Passées ({{ counts.passees }})</button>
    </div>
    <p v-if="store.activitiesStatus === 'idle' || store.activitiesStatus === 'loading'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement de tes activités…</p>
    <MascotState v-else-if="store.activitiesStatus === 'error'" title="Tes activités ne se chargent pas" text="Vérifie ta connexion puis réessaie."><button type="button" class="btn btn--primary" @click="loadActivities(true)">Réessayer</button></MascotState>
    <MascotState v-else-if="!joined.length && !organized.length" :title="tab === 'avenir' ? 'Rien de prévu pour l’instant' : 'Pas encore d’activité passée'" text="Trouve une activité près de chez toi ou propose la tienne.">
      <a href="#/rechercher" class="btn btn--primary">Trouver une activité</a><a href="#/creer" class="btn btn--soft">Créer une activité</a>
    </MascotState>
    <template v-else>
      <section v-if="joined.length" class="feed-section" aria-labelledby="joined-title"><h2 id="joined-title" class="subheading">J’y participe <span class="muted">({{ joined.length }})</span></h2>
        <div class="agenda-list"><ActivityCard v-for="a in joined" :key="a.id" :activity="a" variant="agenda" /></div></section>
      <section v-if="organized.length" class="feed-section" aria-labelledby="organized-title"><h2 id="organized-title" class="subheading">J’organise <span class="muted">({{ organized.length }})</span></h2>
        <div class="agenda-list"><ActivityCard v-for="a in organized" :key="a.id" :activity="a" variant="agenda" show-capacity /></div></section>
    </template>
  </div>
</template>
