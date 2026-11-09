<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, Search } from '@lucide/vue'
import DisciplineBadge from '@/components/DisciplineBadge.vue'
import MascotState from '@/components/MascotState.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { isMember, isPast, relativeTime } from '@/lib/activity'
import { loadActivities, memberName, store, uid } from '@/lib/store'
import { useRoute } from '@/lib/router'
import { isUnread, otherMember } from '@/services/messages'

// Groupes des activités où je participe ou que j'organise (maquette 14) et conversations privées.
const route = useRoute()
const tab = ref<'actives' | 'privees' | 'archivees'>(route.value.query.onglet === 'privees' ? 'privees' : 'actives')
const query = ref('')
const mine = computed(() => store.activities.filter(a => isMember(a, uid.value)))
const lastAt = (a: { lastMessage?: { sentAtMs: number } | null; createdAtMs: number }) => a.lastMessage?.sentAtMs ?? a.createdAtMs
const groups = computed(() => ({
  actives: mine.value.filter(a => !isPast(a)).sort((a, b) => lastAt(b) - lastAt(a)),
  archivees: mine.value.filter(a => isPast(a)).sort((a, b) => lastAt(b) - lastAt(a)),
}))
const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return tab.value === 'privees' ? [] : groups.value[tab.value].filter(a => !q || a.title.toLowerCase().includes(q) || a.lastMessage?.text.toLowerCase().includes(q))
})
const privates = computed(() => {
  const q = query.value.trim().toLowerCase()
  return store.chats.map(c => ({ ...c, otherId: otherMember(c, uid.value), name: memberName(otherMember(c, uid.value)), unread: isUnread(c, uid.value) }))
    .filter(c => !q || c.name.toLowerCase().includes(q) || c.lastMessage?.text.toLowerCase().includes(q) || c.activityTitle?.toLowerCase().includes(q))
})
const unreadPrivate = computed(() => privates.value.filter(c => c.unread).length)
</script>

<template>
  <div class="page">
    <header class="page-header"><h1 class="display-title">Conversations</h1><p class="lead">Échange avec les participants de tes activités, ou en privé avec un membre.</p></header>
    <label class="search-field search-field--muted"><Search aria-hidden="true" /><span class="sr-only">Rechercher une conversation</span><input v-model="query" type="search" placeholder="Rechercher une conversation…" /></label>
    <div class="tabs" role="tablist" aria-label="Conversations">
      <button type="button" role="tab" :aria-selected="tab === 'actives'" :class="{ 'is-selected': tab === 'actives' }" @click="tab = 'actives'">Groupes ({{ groups.actives.length }})</button>
      <button type="button" role="tab" :aria-selected="tab === 'privees'" :class="{ 'is-selected': tab === 'privees' }" @click="tab = 'privees'">Privées<template v-if="unreadPrivate"> ({{ unreadPrivate }})</template></button>
      <button type="button" role="tab" :aria-selected="tab === 'archivees'" :class="{ 'is-selected': tab === 'archivees' }" @click="tab = 'archivees'">Archivés ({{ groups.archivees.length }})</button>
    </div>
    <template v-if="tab === 'privees'">
      <MascotState v-if="!privates.length" :title="query ? 'Aucune conversation trouvée' : 'Pas encore de message privé'" :text="query ? undefined : 'Depuis une fiche activité, écris à l’organisateur pour lui poser une question avant de t’inscrire.'">
        <a v-if="!query" href="#/communaute" class="btn btn--primary">Voir la communauté</a>
      </MascotState>
      <ul v-else class="conversation-list" aria-label="Conversations privées">
        <li v-for="c in privates" :key="c.id">
          <a :href="`#/messages/${encodeURIComponent(c.otherId)}`" class="conversation-item" :class="{ 'is-unread': c.unread }">
            <UserAvatar :name="c.name" :photo="store.members[c.otherId]?.photoUrl" size="lg" />
            <span class="conversation-item__body">
              <span class="conversation-item__top"><strong>{{ c.name }}</strong><time v-if="c.lastMessage">{{ relativeTime(c.lastMessage.sentAtMs) }}</time></span>
              <span v-if="c.activityTitle" class="conversation-item__people">À propos de «&nbsp;{{ c.activityTitle }}&nbsp;»</span>
              <span class="conversation-item__last">{{ c.lastMessage ? `${c.lastMessage.authorId === uid ? 'Toi : ' : ''}${c.lastMessage.text}` : '' }}</span>
            </span>
            <span v-if="c.unread" class="unread-dot"><span class="sr-only">Non lu</span></span>
            <ChevronRight v-else aria-hidden="true" class="conversation-item__chevron" />
          </a>
        </li>
      </ul>
    </template>
    <p v-else-if="store.activitiesStatus !== 'ready' && store.activitiesStatus !== 'error'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement des conversations…</p>
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
            <span class="conversation-item__people"><span class="avatar-stack"><UserAvatar v-for="id in [a.organizerId, ...a.participantIds].slice(0, 3)" :key="id" :name="id === a.organizerId ? a.organizerName : memberName(id)" size="xs" /></span>{{ a.participantIds.length + 1 }} membres</span>
          </span>
          <ChevronRight aria-hidden="true" class="conversation-item__chevron" />
        </a>
      </li>
    </ul>
  </div>
</template>
