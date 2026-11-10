<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft } from '@lucide/vue'
import ActivityCard from '@/components/ActivityCard.vue'
import MascotState from '@/components/MascotState.vue'
import { isPast, startsAt } from '@/lib/activity'
import { favorites, loadActivities, store } from '@/lib/store'
import { goBack } from '@/lib/router'

// Annonces favorites (maquette 12) : les activités passées restent consultables en fin de liste.
const list = computed(() => store.activities.filter(a => favorites.value.includes(a.id))
  .sort((a, b) => Number(isPast(a)) - Number(isPast(b)) || startsAt(a).getTime() - startsAt(b).getTime()))
</script>
<template>
  <div class="page">
    <div class="topbar"><button type="button" class="icon-button icon-button--plain" aria-label="Retour" @click="goBack('profil')"><ChevronLeft aria-hidden="true" /></button></div>
    <header class="page-header"><h1 class="display-title">Mes favoris</h1><p class="lead">Les activités que tu as mises de côté.</p></header>
    <p v-if="store.activitiesStatus === 'idle' || store.activitiesStatus === 'loading'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement de tes favoris…</p>
    <MascotState v-else-if="store.activitiesStatus === 'error'" title="Tes favoris ne se chargent pas" text="Vérifie ta connexion puis réessaie."><button type="button" class="btn btn--primary" @click="loadActivities(true)">Réessayer</button></MascotState>
    <MascotState v-else-if="!list.length" title="Aucun favori pour l’instant" text="Touche le cœur d’une activité pour la retrouver ici."><a href="#/rechercher" class="btn btn--primary">Explorer les activités</a></MascotState>
    <div v-else class="result-list"><ActivityCard v-for="a in list" :key="a.id" :activity="a" variant="row" /></div>
  </div>
</template>
