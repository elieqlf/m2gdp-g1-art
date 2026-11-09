<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BellRing, CalendarClock, ChevronLeft, ChevronRight, Clock3, MessageCircleMore } from '@lucide/vue'
import MascotState from '@/components/MascotState.vue'
import { activeOffer, agoLabel, deadlineLabel, startsInLabel, waitlistPosition } from '@/lib/activity'
import { markNotificationsSeen, notifications, store, uid, type AppNotification } from '@/lib/store'
import { goBack } from '@/lib/router'

// Maquette 13 : places libérées (liste d'attente), rappels d'activité et nouveaux messages.
const tab = ref<'toutes' | 'activites' | 'messages'>('toutes')
// Les pastilles « non lu » restent visibles pendant toute la consultation de l'écran,
// y compris pour les notifications arrivées après l'ouverture (chargement, temps réel).
const unseen = ref(new Set<string>())
watch(notifications, list => {
  const fresh = list.filter(n => !store.seenNotifications.includes(n.id))
  if (!fresh.length) return
  unseen.value = new Set([...unseen.value, ...fresh.map(n => n.id)])
  markNotificationsSeen()
}, { immediate: true })
const visible = computed(() => notifications.value.filter(n => tab.value === 'toutes' || n.group === tab.value))
const icons = { offer: BellRing, waitlist: Clock3, reminder: CalendarClock, message: MessageCircleMore }

function title(n: AppNotification) {
  return { offer: 'Une place s’est libérée', waitlist: 'Liste d’attente', reminder: 'Rappel d’activité', message: 'Nouveau message' }[n.kind]
}
function text(n: AppNotification) {
  const a = n.activity
  if (n.kind === 'offer') return `«\u00a0${a.title}\u00a0» : confirme ta place avant ${deadlineLabel(activeOffer(a)?.expiresAtMs ?? 0)}.`
  if (n.kind === 'waitlist') return `Tu es n°${waitlistPosition(a, uid.value)} pour «\u00a0${a.title}\u00a0». On te prévient si une place se libère.`
  if (n.kind === 'reminder') return `Ton activité «\u00a0${a.title}\u00a0» ${startsInLabel(a)}.`
  return `${a.lastMessage?.authorName ?? 'Quelqu’un'} a écrit dans «\u00a0${a.title}\u00a0» : ${a.lastMessage?.text ?? ''}`
}
const href = (n: AppNotification) => n.kind === 'message' ? `#/conversations/${encodeURIComponent(n.activity.id)}` : `#/activite/${encodeURIComponent(n.activity.id)}`
</script>

<template>
  <div class="page">
    <div class="topbar"><button type="button" class="icon-button icon-button--plain" aria-label="Retour" @click="goBack()"><ChevronLeft aria-hidden="true" /></button></div>
    <header class="page-header"><h1 class="display-title">Notifications</h1></header>
    <div class="tabs" role="tablist" aria-label="Type de notifications">
      <button type="button" role="tab" :aria-selected="tab === 'toutes'" :class="{ 'is-selected': tab === 'toutes' }" @click="tab = 'toutes'">Toutes</button>
      <button type="button" role="tab" :aria-selected="tab === 'activites'" :class="{ 'is-selected': tab === 'activites' }" @click="tab = 'activites'">Activités</button>
      <button type="button" role="tab" :aria-selected="tab === 'messages'" :class="{ 'is-selected': tab === 'messages' }" @click="tab = 'messages'">Messages</button>
    </div>
    <p v-if="store.activitiesStatus === 'loading' && !visible.length" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement des notifications…</p>
    <MascotState v-else-if="!visible.length" title="Rien de neuf pour l’instant" text="Tu seras prévenu ici quand une place se libère, avant tes activités et quand on t’écrit." />
    <ul v-else class="notification-list">
      <li v-for="n in visible" :key="n.id">
        <a :href="href(n)" class="notification" :class="{ 'is-unread': unseen.has(n.id) && n.kind !== 'waitlist' }">
          <img v-if="n.kind === 'offer'" :src="n.activity.coverUrl" alt="" class="notification__thumb" />
          <span v-else class="notification__icon"><component :is="icons[n.kind]" aria-hidden="true" /></span>
          <span class="notification__body">
            <span class="notification__top"><strong>{{ title(n) }}<span v-if="unseen.has(n.id) && n.kind !== 'waitlist'" class="notification__dot"><span class="sr-only">(nouveau)</span></span></strong><time v-if="n.atMs">{{ agoLabel(n.atMs) }}</time></span>
            <span class="notification__text">{{ text(n) }}</span>
          </span>
          <ChevronRight aria-hidden="true" class="notification__chevron" />
        </a>
      </li>
    </ul>
  </div>
</template>
