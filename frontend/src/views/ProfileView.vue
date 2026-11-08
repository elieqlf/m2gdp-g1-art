<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, ChevronRight, FileText, Heart, LogOut, MessageCircleMore, Pencil, Settings, Shield, Sparkles, User, Users } from '@lucide/vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { disciplineLabel, isPast } from '@/lib/activity'
import { displayName, store, uid } from '@/lib/store'

// US-13 : consulter son profil (maquette 24).
const emit = defineEmits<{ logout: [] }>()
const busy = ref(false)
const mine = computed(() => store.activities.filter(a => a.organizerId === uid.value || a.participantIds.includes(uid.value)))
const stats = computed(() => {
  const done = mine.value.filter(a => isPast(a))
  const met = new Set(done.flatMap(a => [a.organizerId, ...a.participantIds]).filter(id => id !== uid.value))
  return { done: done.length, upcoming: mine.value.length - done.length, met: met.size }
})
const LANDING = 'https://novart-109bf.web.app'
const groups = [
  [{ label: 'Mes informations', href: '#/profil/modifier', icon: User }, { label: 'Mes centres d’intérêt', href: '#/profil/modifier?section=interets', icon: Sparkles }, { label: 'Mes favoris', href: '#/favoris', icon: Heart }],
  [{ label: 'Mes activités', href: '#/mes-activites', icon: CalendarDays }, { label: 'Mes conversations', href: '#/conversations', icon: MessageCircleMore }, { label: 'Communauté', href: '#/communaute', icon: Users }],
  [{ label: 'Confidentialité', href: `${LANDING}/legal.html#confidentialite`, icon: Shield, external: true }, { label: 'Conditions d’utilisation', href: `${LANDING}/legal.html#cgu`, icon: FileText, external: true }],
]
function logout() { busy.value = true; emit('logout') }
</script>

<template>
  <div class="page">
    <div class="topbar topbar--end"><a href="#/profil/modifier" class="icon-button icon-button--plain" aria-label="Paramètres du profil"><Settings aria-hidden="true" /></a></div>
    <header class="profile-head">
      <div class="profile-head__avatar"><UserAvatar :name="displayName" :photo="store.profile.photoUrl" size="lg" /><a href="#/profil/modifier" class="profile-head__edit" aria-label="Modifier ma photo"><Pencil aria-hidden="true" /></a></div>
      <div class="profile-head__text">
        <h1 class="profile-head__name">{{ store.profile.firstName || displayName }}</h1>
        <p class="muted">{{ store.profile.bio || 'Ajoute une courte description pour te présenter à la communauté.' }}</p>
        <p v-if="store.profile.interests?.length" class="profile-head__interests">{{ store.profile.interests.map(disciplineLabel).join(' · ') }}</p>
      </div>
      <dl class="profile-stats">
        <div><dt>Activités réalisées</dt><dd>{{ stats.done }}</dd></div>
        <div><dt>Activités à venir</dt><dd>{{ stats.upcoming }}</dd></div>
        <div><dt>Rencontres artistiques</dt><dd>{{ stats.met }}</dd></div>
      </dl>
    </header>
    <nav v-for="(group, index) in groups" :key="index" class="menu-card" :aria-label="['Mon compte', 'Mon activité', 'Informations'][index]">
      <a v-for="item in group" :key="item.label" :href="item.href" class="menu-row" :target="'external' in item ? '_blank' : undefined" :rel="'external' in item ? 'noopener' : undefined"><component :is="item.icon" aria-hidden="true" /><span>{{ item.label }}</span><ChevronRight aria-hidden="true" /></a>
    </nav>
    <button type="button" class="logout-row" :disabled="busy" @click="logout"><LogOut aria-hidden="true" />Se déconnecter</button>
  </div>
</template>
