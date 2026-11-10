<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ChevronLeft } from '@lucide/vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { disciplineLabel } from '@/lib/activity'
import { loadMembers, store } from '@/lib/store'
import { goBack } from '@/lib/router'

// Communauté : seuls les champs explicitement publics sont chargés ici.
const members = computed(() => Object.values(store.members).sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '', 'fr')))
onMounted(() => loadMembers())
</script>
<template>
  <div class="page page--wide">
    <div class="topbar"><button type="button" class="icon-button icon-button--plain" aria-label="Retour" @click="goBack('profil')"><ChevronLeft aria-hidden="true" /></button></div>
    <header class="page-header page-header--row"><div><p class="eyebrow">Notre communauté</p><h1 class="display-title">Les membres NOVART</h1><p class="lead">Découvre les personnes avec qui tu pourrais créer.</p></div><span class="soft-tag">{{ members.length }} membre{{ members.length > 1 ? 's' : '' }}</span></header>
    <p v-if="store.membersStatus === 'loading'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement des utilisateurs…</p>
    <div v-else-if="store.membersStatus === 'error'" class="form-alert" role="alert">Impossible de charger les utilisateurs. <button type="button" class="link-button" @click="loadMembers(true)">Réessayer</button></div>
    <template v-else>
      <p v-if="!members.length" class="muted">Les profils des membres apparaîtront ici une fois leur inscription terminée.</p>
      <ul v-else class="member-list">
        <li v-for="m in members" :key="m.uid" class="member-tile">
          <UserAvatar :name="[m.firstName, m.lastName].filter(Boolean).join(' ') || 'Membre'" :photo="m.photoUrl" :user-id="m.uid" size="md" />
          <div class="member-tile__content"><h2>{{ m.firstName ? `${m.firstName} ${m.lastName || ''}` : 'Membre' }}</h2><p v-if="m.bio" class="member-tile__bio">{{ m.bio }}</p>
            <div v-if="m.interests?.length" class="member-tile__interests" aria-label="Centres d’intérêt"><span v-for="interest in m.interests.slice(0, 3)" :key="interest">{{ disciplineLabel(interest) }}</span></div></div>
        </li>
      </ul>
    </template>
  </div>
</template>
