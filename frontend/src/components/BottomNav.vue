<script setup lang="ts">
import { CalendarDays, ChevronDown, ChevronUp, House, MessageCircleMore, Search, User } from '@lucide/vue'
import { navCollapsed, setNavCollapsed, store, unreadConversations } from '@/lib/store'
defineProps<{ active: string }>()
// « Créer » n'est plus dans la barre : on y accède depuis « Mes activités » et le profil.
// « Mes activités » y prend sa place, pour retrouver ses inscriptions en un geste.
const tabs = [
  { id: 'decouvrir', label: 'Découvrir', icon: House },
  { id: 'rechercher', label: 'Rechercher', icon: Search },
  { id: 'mes-activites', label: 'Mes activités', icon: CalendarDays },
  { id: 'conversations', label: 'Conversations', icon: MessageCircleMore },
  { id: 'profil', label: 'Profil', icon: User },
]
const badge = (id: string) => id === 'conversations' ? unreadConversations.value : id === 'mes-activites' ? store.offers.length : 0
const badgeLabel = (id: string, n: number) => id === 'conversations'
  ? `${n} conversation${n > 1 ? 's' : ''} non lue${n > 1 ? 's' : ''}`
  : `${n} place${n > 1 ? 's' : ''} à confirmer`
</script>
<template>
  <!-- Barre rétractable : repliée, il ne reste qu'une petite poignée pour la rouvrir. -->
  <button v-if="navCollapsed" type="button" class="nav-handle" aria-label="Afficher le menu" @click="setNavCollapsed(false)">
    <ChevronUp aria-hidden="true" /><span>Menu</span>
    <span v-if="unreadConversations || store.offers.length" class="nav-handle__dot" aria-hidden="true"></span>
  </button>
  <nav v-else class="bottom-nav" aria-label="Navigation principale">
    <button type="button" class="bottom-nav__collapse" aria-label="Masquer le menu" @click="setNavCollapsed(true)"><ChevronDown aria-hidden="true" /></button>
    <a v-for="tab in tabs" :key="tab.id" :href="`#/${tab.id}`" class="bottom-nav__item" :class="{ 'is-active': active === tab.id }" :aria-current="active === tab.id ? 'page' : undefined">
      <component :is="tab.icon" aria-hidden="true" :fill="active === tab.id && !['rechercher', 'mes-activites'].includes(tab.id) ? 'currentColor' : 'none'" :stroke-width="active === tab.id ? 2.2 : 1.8" />
      <span>{{ tab.label }}</span>
      <span v-if="badge(tab.id)" class="bottom-nav__badge">{{ badge(tab.id) > 9 ? '9+' : badge(tab.id) }}<span class="sr-only"> {{ badgeLabel(tab.id, badge(tab.id)) }}</span></span>
    </a>
  </nav>
</template>
