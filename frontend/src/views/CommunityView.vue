<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ChevronLeft, MapPin } from '@lucide/vue'
import UsersMap from '@/components/UsersMap.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { loadMembers, store } from '@/lib/store'
import { goBack } from '@/lib/router'

// Communauté : écran « Utilisateurs inscrits » de la première version, conservé.
const members = computed(() => Object.values(store.members).sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '', 'fr')))
onMounted(() => loadMembers())
</script>
<template>
  <div class="page page--wide">
    <div class="topbar"><button type="button" class="icon-button icon-button--plain" aria-label="Retour" @click="goBack('profil')"><ChevronLeft aria-hidden="true" /></button></div>
    <header class="page-header page-header--row"><div><p class="eyebrow">Notre communauté</p><h1 class="display-title">Utilisateurs inscrits</h1><p class="lead">Découvre les participants et les organisateurs de Novart.</p></div><span class="soft-tag">{{ members.length }} membre{{ members.length > 1 ? 's' : '' }}</span></header>
    <p v-if="store.membersStatus === 'loading'" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement des utilisateurs…</p>
    <div v-else-if="store.membersStatus === 'error'" class="form-alert" role="alert">Impossible de charger les utilisateurs. <button type="button" class="link-button" @click="loadMembers(true)">Réessayer</button></div>
    <template v-else>
      <UsersMap :users="members" />
      <p v-if="!members.length" class="muted">Aucun utilisateur pour le moment.</p>
      <ul v-else class="member-list">
        <li v-for="m in members" :key="m.uid" class="member-tile">
          <UserAvatar :name="[m.firstName, m.lastName].filter(Boolean).join(' ') || m.email" :photo="m.photoUrl" size="md" />
          <div><h2>{{ m.firstName ? `${m.firstName} ${m.lastName || ''}` : m.email || 'Membre' }}</h2><span class="soft-tag">{{ m.userType === 'organisateur' ? 'Organisateur' : m.userType === 'participant' ? 'Participant' : 'Profil à compléter' }}</span>
            <p v-if="m.address" class="member-tile__address"><MapPin aria-hidden="true" />{{ m.address.split(',').slice(-2).join(',').trim() }}</p></div>
        </li>
      </ul>
    </template>
  </div>
</template>
