<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, SendHorizontal } from '@lucide/vue'
import DisciplineBadge from '@/components/DisciplineBadge.vue'
import MascotState from '@/components/MascotState.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { clockRange, isMember, longDay, toIsoDay } from '@/lib/activity'
import { ensureActivity, loadMembers, me, store, uid, upsertActivity } from '@/lib/store'
import { goBack } from '@/lib/router'
import { sendMessage, watchMessages, type Message } from '@/services/activities'

// US-11 / US-12 : groupe de discussion de l'activité, en temps réel (maquette 15).
const props = defineProps<{ id: string }>()
const status = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
const messages = ref<Message[]>([])
const text = ref('')
const sending = ref(false)
const failure = ref('')
const list = ref<HTMLElement | null>(null)
const unreadMessages = ref(0)
const followNextMessage = ref(false)
const activity = computed(() => store.activities.find(a => a.id === props.id))
const member = computed(() => !!activity.value && isMember(activity.value, uid.value))
let stop: (() => void) | undefined

const dayLabel = (ms: number) => {
  const day = toIsoDay(new Date(ms))
  const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (day === toIsoDay(today)) return 'Aujourd’hui'
  if (day === toIsoDay(yesterday)) return 'Hier'
  return longDay(day)
}
const hour = (ms: number) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const rows = computed(() => messages.value.map((m, index) => {
  const previous = messages.value[index - 1]
  return { ...m, mine: m.authorId === uid.value, separator: !previous || dayLabel(previous.sentAtMs) !== dayLabel(m.sentAtMs) ? dayLabel(m.sentAtMs) : '' }
}))
function isNearBottom() {
  if (!list.value) return true
  return list.value.scrollHeight - list.value.scrollTop - list.value.clientHeight < 120
}
async function scrollDown() {
  await nextTick()
  if (list.value) list.value.scrollTo({ top: list.value.scrollHeight, behavior: 'smooth' })
  unreadMessages.value = 0
  followNextMessage.value = false
}
function handleMessageScroll() { if (isNearBottom()) unreadMessages.value = 0 }

watch(() => props.id, async id => {
  stop?.(); messages.value = []; status.value = 'loading'
  try { if (!(await ensureActivity(id))) { status.value = 'missing'; return } } catch { status.value = 'error'; return }
  status.value = 'ready'
  void loadMembers()
  if (!member.value) return
  stop = watchMessages(id, data => {
    const previousCount = messages.value.length
    const shouldFollow = previousCount === 0 || followNextMessage.value || isNearBottom()
    messages.value = data
    if (shouldFollow) void scrollDown()
    else if (data.length > previousCount) unreadMessages.value += data.length - previousCount
  }, () => { failure.value = 'Messages indisponibles pour le moment.' })
}, { immediate: true })
onBeforeUnmount(() => stop?.())

async function send() {
  const content = text.value.trim()
  if (!content || !activity.value) return
  sending.value = true; failure.value = ''
  followNextMessage.value = true
  try {
    await sendMessage(props.id, me.value, content)
    text.value = ''
    upsertActivity({ ...activity.value, lastMessage: { text: content, authorName: me.value.name, sentAtMs: Date.now() } })
  } catch { followNextMessage.value = false; failure.value = 'Message non envoyé. Vérifie ta connexion et réessaie.' }
  finally { sending.value = false }
}
</script>

<template>
  <div class="page page--chat">
    <div class="topbar"><button type="button" class="icon-button icon-button--plain" aria-label="Retour" @click="goBack('conversations')"><ChevronLeft aria-hidden="true" /></button><h1 class="sr-only">Groupe de discussion{{ activity ? ` : ${activity.title}` : '' }}</h1></div>
    <p v-if="status === 'loading'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement…</p>
    <MascotState v-else-if="status !== 'ready' || !activity" title="Conversation introuvable" text="L’activité a peut-être été supprimée."><a href="#/conversations" class="btn btn--primary">Mes conversations</a></MascotState>
    <template v-else>
      <a :href="`#/activite/${encodeURIComponent(activity.id)}`" class="chat-activity">
        <img :src="activity.coverUrl" alt="" />
        <span><strong>{{ activity.title }}</strong><DisciplineBadge :discipline="activity.discipline" /><small><CalendarDays aria-hidden="true" />{{ longDay(activity.date) }} · {{ clockRange(activity) }}</small><small><MapPin aria-hidden="true" />{{ activity.placeName }}</small></span>
        <ChevronRight aria-hidden="true" />
      </a>
      <MascotState v-if="!member" title="Groupe réservé aux participants" text="Inscris-toi à l’activité pour échanger avec le groupe."><a :href="`#/activite/${encodeURIComponent(activity.id)}`" class="btn btn--primary">Voir l’activité</a></MascotState>
      <template v-else>
        <div class="messages-region">
          <button v-if="unreadMessages" type="button" class="messages-jump" @click="scrollDown">{{ unreadMessages }} nouveau{{ unreadMessages > 1 ? 'x' : '' }} message{{ unreadMessages > 1 ? 's' : '' }} ↓</button>
          <ol ref="list" class="messages" aria-label="Messages du groupe" aria-live="polite" aria-relevant="additions" @scroll="handleMessageScroll">
            <li v-if="!rows.length" class="messages__empty">Aucun message pour l’instant. Dis bonjour au groupe !</li>
            <template v-for="m in rows" :key="m.id">
              <li v-if="m.separator" class="messages__day"><span>{{ m.separator }}</span></li>
              <li class="message" :class="{ 'message--mine': m.mine }">
                <UserAvatar v-if="!m.mine" :name="m.authorName" :photo="m.authorPhoto || store.members[m.authorId]?.photoUrl" :user-id="m.authorId" size="md" />
                <div class="message__content">
                  <p class="message__meta"><span v-if="!m.mine" class="message__author">{{ m.authorName }}</span><time>{{ hour(m.sentAtMs) }}</time></p>
                  <p class="message__bubble">{{ m.text }}</p>
                </div>
              </li>
            </template>
          </ol>
        </div>
        <form class="composer" @submit.prevent="send">
          <label for="message" class="sr-only">Écrire un message</label>
          <input id="message" v-model="text" class="composer__input" placeholder="Écrire un message…" maxlength="1000" autocomplete="off" />
          <button type="submit" class="composer__send" :disabled="sending || !text.trim()" aria-label="Envoyer le message"><SendHorizontal aria-hidden="true" /></button>
        </form>
        <p v-if="failure" class="form-alert" role="alert">{{ failure }}</p>
      </template>
    </template>
  </div>
</template>
