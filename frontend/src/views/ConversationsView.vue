<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, Search } from '@lucide/vue'
import DisciplineBadge from '@/components/DisciplineBadge.vue'
import MascotState from '@/components/MascotState.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { isMember, isPast, relativeTime } from '@/lib/activity'
import { loadActivities, memberName, store, uid } from '@/lib/store'

// Liste des groupes de discussion des activités où je participe ou que j'organise (maquette 14).
const tab = ref<'actives' | 'archivees'>('actives')
const query = ref('')
const mine = computed(() => store.activities.filter(a => isMember(a, uid.value)))
const lastAt = (a: { lastMessage?: { sentAtMs: number } | null; createdAtMs: number }) => a.lastMessage?.sentAtMs ?? a.createdAtMs
const groups = computed(() => ({
  actives: mine.value.filter(a => !isPast(a)).sort((a, b) => lastAt(b) - lastAt(a)),
  archivees: mine.value.filter(a => isPast(a)).sort((a, b) => lastAt(b) - lastAt(a)),
}))
const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return groups.value[tab.value].filter(a => !q || a.title.toLowerCase().includes(q) || a.lastMessage?.text.toLowerCase().includes(q))
})
</script>

<template>
  <div class="page">
    <header class="page-header"><h1 class="display-title">Conversations</h1><p class="lead">Échange avec les participants de tes activités.</p></header>
    <label class="search-field search-field--muted"><Search aria-hidden="true" /><span class="sr-only">Rechercher une conversation</span><input v-model="query" type="search" placeholder="Rechercher une conversation…" /></label>
    <div class="tabs" role="tablist" aria-label="Conversations">
      <button type="button" role="tab" :aria-selected="tab === 'actives'" :class="{ 'is-selected': tab === 'actives' }" @click="tab = 'actives'">Actives ({{ groups.actives.length }})</button>
      <button type="button" role="tab" :aria-selected="tab === 'archivees'" :class="{ 'is-selected': tab === 'archivees' }" @click="tab = 'archivees'">Archivées ({{ groups.archivees.length }})</button>
    </div>
    <p v-if="store.activitiesStatus !== 'ready' && store.activitiesStatus !== 'error'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement des conversations…</p>
    <MascotState v-else-if="store.activitiesStatus === 'error'" title="Oups, pas de connexion" text="Impossible de charger tes conversations."><button type="button" class="btn btn--primary" @click="loadActivities(true)">Réessayer</button></MascotState>
    <MascotState v-else-if="!visible.length" :title="query ? 'Aucune conversation trouvée' : tab === 'actives' ? 'Pas encore de conversation' : 'Aucune conversation archivée'" :text="tab === 'actives' && !query ? 'Inscris-toi à une activité pour rejoindre son groupe de discussion.' : undefined">
      <a v-if="tab === 'actives' && !query" href="#/rechercher" class="btn btn--primary">Trouver une activité</a>
    </MascotState>
    <ul v-else class="conversation-list">
      <li v-for="a in visible" :key="a.id">
        <a :href="`#/conversations/${encodeURIComponent(a.id)}`" class="conversation-item">
          <img :src="a.coverUrl" alt="" class="conversation-item__thumb" />
          <span class="conversation-item__body">
            <span class="conversation-item__top"><strong>{{ a.title }}</strong><time>{{ relativeTime(a.lastMessage?.sentAtMs ?? a.createdAtMs) }}</time></span>
            <DisciplineBadge :discipline="a.discipline" />
            <span class="conversation-item__last">{{ a.lastMessage ? `${a.lastMessage.authorName} : ${a.lastMessage.text}` : 'Aucun message pour l’instant. Lance la discussion !' }}</span>
            <span class="conversation-item__people"><span class="avatar-stack"><UserAvatar v-for="id in [a.organizerId, ...a.participantIds].slice(0, 3)" :key="id" :name="id === a.organizerId ? a.organizerName : memberName(id)" :photo="a.organizerId === id ? a.organizerPhoto || store.members[id]?.photoUrl : store.members[id]?.photoUrl" :user-id="id" size="xs" /></span>{{ a.participantIds.length + 1 }} membres</span>
          </span>
          <ChevronRight aria-hidden="true" class="conversation-item__chevron" />
        </a>
      </li>
    </ul>
  </div>
</template>
