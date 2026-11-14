<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bell, CalendarDays, ChevronRight, CirclePlus, FileText, Heart, LogOut, MessageCircleMore, Pencil, Settings, Shield, Sparkles, Trash2, User, Users } from '@lucide/vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { disciplineLabel, isPast } from '@/lib/activity'
import { displayName, loadActivities, store, uid, unreadNotifications } from '@/lib/store'
import { idToken } from '@/services/firebase'
import { AccountDeletionError, deleteAccount, deletionErrorMessage } from '@/services/account'

// US-13 : consulter son profil (maquette 24).
const emit = defineEmits<{ logout: []; 'account-deleted': [] }>()
const busy = ref(false)
const mine = computed(() => store.activities.filter(a => a.organizerId === uid.value || a.participantIds.includes(uid.value)))
const stats = computed(() => {
  const done = mine.value.filter(a => isPast(a))
  const met = new Set(done.flatMap(a => [a.organizerId, ...a.participantIds]).filter(id => id !== uid.value))
  return { done: done.length, upcoming: mine.value.length - done.length, met: met.size }
})
const statsReady = computed(() => store.activitiesStatus === 'ready')
const LANDING = 'https://novart-109bf.web.app'
const groups = [
  [{ label: 'Mes informations', href: '#/profil/modifier', icon: User }, { label: 'Mes centres d’intérêt', href: '#/profil/modifier?section=interets', icon: Sparkles }, { label: 'Mes favoris', href: '#/favoris', icon: Heart }],
  [{ label: 'Notifications', href: '#/notifications', icon: Bell, badge: true }, { label: 'Mes activités', href: '#/mes-activites', icon: CalendarDays }, { label: 'Créer une activité', href: '#/creer', icon: CirclePlus }, { label: 'Mes conversations', href: '#/conversations', icon: MessageCircleMore }, { label: 'Communauté', href: '#/communaute', icon: Users }],
  [{ label: 'Confidentialité', href: `${LANDING}/legal.html#confidentialite`, icon: Shield, external: true }, { label: 'Conditions d’utilisation', href: `${LANDING}/legal.html#cgu`, icon: FileText, external: true }],
]
function logout() { busy.value = true; emit('logout') }

// US-23 : supprimer son compte (définitif, après confirmation).
const confirmDelete = ref(false)
const understood = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const organized = computed(() => store.activities.filter(a => a.organizerId === uid.value && !isPast(a)).length)
const deleteText = computed(() => `Ton profil, tes messages, tes conversations privées et tes inscriptions seront effacés${organized.value ? `, et ${organized.value === 1 ? 'l’activité à venir que tu organises sera annulée' : `les ${organized.value} activités à venir que tu organises seront annulées`}` : ''}. Cette action est définitive.`)
function openDelete() { understood.value = false; deleteError.value = ''; confirmDelete.value = true }
async function removeAccount() {
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteAccount(await idToken())
    emit('account-deleted')
  } catch (error) {
    deleteError.value = deletionErrorMessage(error instanceof AccountDeletionError ? error.code : 'internal')
    deleting.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="topbar topbar--end"><a href="#/profil/modifier" class="icon-button icon-button--plain" aria-label="Paramètres du profil"><Settings aria-hidden="true" /></a></div>
    <header class="profile-head">
      <div class="profile-head__avatar"><UserAvatar :name="displayName" :photo="store.profile.photoUrl" :user-id="uid" size="lg" /><a href="#/profil/modifier" class="profile-head__edit" aria-label="Modifier ma photo"><Pencil aria-hidden="true" /></a></div>
      <div class="profile-head__text">
        <h1 class="profile-head__name">{{ store.profile.firstName || displayName }}</h1>
        <p class="muted">{{ store.profile.bio || 'Ajoute une courte description pour te présenter à la communauté.' }}</p>
        <p v-if="store.profile.interests?.length" class="profile-head__interests">{{ store.profile.interests.map(disciplineLabel).join(' · ') }}</p>
      </div>
      <dl class="profile-stats">
        <div><dt>Activités réalisées</dt><dd>{{ statsReady ? stats.done : '—' }}</dd></div>
        <div><dt>Activités à venir</dt><dd>{{ statsReady ? stats.upcoming : '—' }}</dd></div>
        <div><dt>Rencontres artistiques</dt><dd>{{ statsReady ? stats.met : '—' }}</dd></div>
      </dl>
      <p v-if="store.activitiesStatus === 'idle' || store.activitiesStatus === 'loading'" class="profile-stats__status" role="status">Chargement de tes statistiques…</p>
      <p v-else-if="store.activitiesStatus === 'error'" class="profile-stats__status" role="alert">Statistiques indisponibles. <button type="button" class="link-button" @click="loadActivities(true)">Réessayer</button></p>
    </header>
    <nav v-for="(group, index) in groups" :key="index" class="menu-card" :aria-label="['Mon compte', 'Mon activité', 'Informations'][index]">
      <a v-for="item in group" :key="item.label" :href="item.href" class="menu-row" :target="'external' in item ? '_blank' : undefined" :rel="'external' in item ? 'noopener' : undefined"><component :is="item.icon" aria-hidden="true" /><span>{{ item.label }}</span><span v-if="'badge' in item && unreadNotifications" class="count-badge count-badge--inline">{{ unreadNotifications }}<span class="sr-only"> nouvelles</span></span><ChevronRight aria-hidden="true" /></a>
    </nav>
    <button type="button" class="logout-row" :disabled="busy" @click="logout"><LogOut aria-hidden="true" />Se déconnecter</button>
    <button type="button" class="delete-account-row" :disabled="busy || deleting" @click="openDelete"><Trash2 aria-hidden="true" />Supprimer mon compte</button>
    <ConfirmDialog v-if="confirmDelete" title="Supprimer ton compte ?" :text="deleteText" confirm-label="Supprimer définitivement" :busy="deleting" :confirm-disabled="!understood" @confirm="removeAccount" @cancel="confirmDelete = false">
      <label class="dialog__check"><input v-model="understood" type="checkbox" :disabled="deleting" /><span>J’ai compris : mon compte et mes données ne pourront pas être récupérés.</span></label>
      <p v-if="deleteError" class="dialog__error" role="alert">{{ deleteError }}</p>
    </ConfirmDialog>
  </div>
</template>
