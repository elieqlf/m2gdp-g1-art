<script setup lang="ts">
import { House, Search, CirclePlus, MessageCircleMore, User } from '@lucide/vue'
import { unreadChats } from '@/lib/store'
defineProps<{ active: string }>()
const tabs = [
  { id: 'decouvrir', label: 'Découvrir', icon: House },
  { id: 'rechercher', label: 'Rechercher', icon: Search },
  { id: 'creer', label: 'Créer', icon: CirclePlus },
  { id: 'conversations', label: 'Conversations', icon: MessageCircleMore },
  { id: 'profil', label: 'Profil', icon: User },
]
</script>
<template>
  <nav class="bottom-nav" aria-label="Navigation principale">
    <a v-for="tab in tabs" :key="tab.id" :href="`#/${tab.id}`" class="bottom-nav__item" :class="{ 'is-active': active === tab.id }" :aria-current="active === tab.id ? 'page' : undefined">
      <component :is="tab.icon" aria-hidden="true" :fill="active === tab.id && tab.id !== 'creer' && tab.id !== 'rechercher' ? 'currentColor' : 'none'" :stroke-width="active === tab.id ? 2.2 : 1.8" />
      <span>{{ tab.label }}</span>
      <span v-if="tab.id === 'conversations' && unreadChats" class="bottom-nav__badge">{{ unreadChats > 9 ? '9+' : unreadChats }}<span class="sr-only"> message{{ unreadChats > 1 ? 's' : '' }} privé{{ unreadChats > 1 ? 's' : '' }} non lu{{ unreadChats > 1 ? 's' : '' }}</span></span>
    </a>
  </nav>
</template>
