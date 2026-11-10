<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ChevronLeft, LockKeyhole, SendHorizontal } from '@lucide/vue'
import MascotState from '@/components/MascotState.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { longDay, toIsoDay } from '@/lib/activity'
import { activityById, loadMembers, memberName, setOpenChat, store, uid } from '@/lib/store'
import { goBack, useRoute } from '@/lib/router'
import { chatIdFor, isUnread, markChatRead, sendPrivateMessage, watchPrivateMessages, type PrivateMessage } from '@/services/messages'

// Messagerie privée (« Contact » du sujet ART) : écrire à un membre, par exemple à
// l'organisateur avant de s'inscrire. Lisible uniquement par les deux membres.
const props = defineProps<{ id: string }>()
const route = useRoute()
const messages = ref<PrivateMessage[]>([])
const text = ref('')
const sending = ref(false)
const failure = ref('')
const list = ref<HTMLElement | null>(null)
const otherId = computed(() => props.id)
const chatId = computed(() => chatIdFor(uid.value, otherId.value))
const chat = computed(() => store.chats.find(c => c.id === chatId.value))
const other = computed(() => store.members[otherId.value])
const name = computed(() => memberName(otherId.value))
// Contexte : activité depuis laquelle on écrit (lien « Contacter l'organisateur »), sinon celle de la conversation.
const contextId = computed(() => route.value.query.activite || chat.value?.activityId || '')
const contextTitle = computed(() => activityById(contextId.value)?.title || (chat.value?.activityId === contextId.value ? chat.value?.activityTitle : '') || '')
const self = computed(() => otherId.value === uid.value)
let stop: (() => void) | undefined
let watching = ''

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
async function scrollDown() { await nextTick(); list.value?.lastElementChild?.scrollIntoView({ block: 'end' }) }

// Une conversation n'est lisible qu'une fois enregistrée par le serveur (premier message) :
// avant, les règles refusent la lecture et Firestore arrête l'écoute. On attend donc la
// confirmation du serveur, et on réessaie quelques fois si la lecture est refusée malgré tout.
const RETRIES = [800, 2000, 5000]
let attempt = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined
function listen(id: string) {
  stop?.(); watching = id
  stop = watchPrivateMessages(id, data => { attempt = 0; failure.value = ''; messages.value = data; void scrollDown() }, () => {
    stop = undefined; watching = ''
    const delay = RETRIES[attempt++]
    if (delay === undefined) { failure.value = 'Messages indisponibles pour le moment.'; return }
    retryTimer = setTimeout(() => { if (chatId.value === id && !watching) listen(id) }, delay)
  })
}
watch(() => [chatId.value, !!chat.value && !chat.value.pending] as const, ([id, ready]) => {
  setOpenChat(id)
  if (!ready || watching === id) return
  attempt = 0
  listen(id)
}, { immediate: true })
// Marquer comme lu à l'ouverture et à chaque message reçu pendant la lecture.
watch(() => chat.value && isUnread(chat.value, uid.value), unread => { if (unread) void markChatRead(chatId.value, uid.value).catch(() => {}) }, { immediate: true })
watch(otherId, () => { clearTimeout(retryTimer); stop?.(); stop = undefined; watching = ''; messages.value = [] })
void loadMembers()
onBeforeUnmount(() => { clearTimeout(retryTimer); stop?.(); setOpenChat('') })

async function send() {
  const content = text.value.trim()
  if (!content || self.value) return
  sending.value = true; failure.value = ''
  try {
    const id = await sendPrivateMessage(uid.value, otherId.value, content, contextId.value && contextTitle.value ? { activityId: contextId.value, activityTitle: contextTitle.value } : undefined)
    text.value = ''
    // Le message est enregistré : si l'écoute s'était arrêtée, on la relance.
    if (!watching) { clearTimeout(retryTimer); attempt = 0; listen(id) }
  } catch { failure.value = 'Message non envoyé. Vérifie ta connexion et réessaie.' }
  finally { sending.value = false }
}
</script>

<template>
  <div class="page page--chat">
    <div class="topbar topbar--chat">
      <button type="button" class="icon-button icon-button--plain" aria-label="Retour" @click="goBack('conversations?onglet=privees')"><ChevronLeft aria-hidden="true" /></button>
      <span class="chat-person"><UserAvatar :name="name" :photo="other?.photoUrl" size="md" /><span><h1>{{ name }}</h1><small v-if="other?.userType === 'organisateur'">Organise des activités</small></span></span>
    </div>
    <MascotState v-if="self" title="C’est toi !" text="Tu ne peux pas t’écrire à toi-même."><a href="#/conversations" class="btn btn--primary">Mes conversations</a></MascotState>
    <template v-else>
      <p class="private-note"><LockKeyhole aria-hidden="true" />Conversation privée : seuls {{ name.split(' ')[0] }} et toi pouvez la lire.</p>
      <a v-if="contextId && contextTitle" :href="`#/activite/${encodeURIComponent(contextId)}`" class="private-context">À propos de «&nbsp;{{ contextTitle }}&nbsp;»</a>
      <ol ref="list" class="messages" :aria-label="`Messages avec ${name}`" aria-live="polite">
        <li v-if="!rows.length" class="messages__empty">{{ contextTitle ? `Pose ta question à ${name.split(' ')[0]} avant de t’inscrire, ou présente-toi.` : `Écris le premier message à ${name.split(' ')[0]}.` }}</li>
        <template v-for="m in rows" :key="m.id">
          <li v-if="m.separator" class="messages__day"><span>{{ m.separator }}</span></li>
          <li class="message" :class="{ 'message--mine': m.mine }">
            <UserAvatar v-if="!m.mine" :name="name" :photo="other?.photoUrl" size="md" />
            <div class="message__content">
              <p class="message__meta"><time>{{ hour(m.sentAtMs) }}</time></p>
              <p class="message__bubble">{{ m.text }}</p>
            </div>
          </li>
        </template>
      </ol>
      <form class="composer" @submit.prevent="send">
        <label for="private-message" class="sr-only">Écrire à {{ name }}</label>
        <input id="private-message" v-model="text" class="composer__input" :placeholder="`Écrire à ${name.split(' ')[0]}…`" maxlength="1000" autocomplete="off" />
        <button type="submit" class="composer__send" :disabled="sending || !text.trim()" aria-label="Envoyer le message"><SendHorizontal aria-hidden="true" /></button>
      </form>
      <p v-if="failure" class="form-alert" role="alert">{{ failure }}</p>
    </template>
  </div>
</template>
