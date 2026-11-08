<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ArrowRight, Bell, CalendarDays, Check, ChevronRight, MapPin, MessageCircleMore, Share2, Users, X } from '@lucide/vue'
import DisciplineBadge from '@/components/DisciplineBadge.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { shortDay, timeRange } from '@/lib/activity'
import { ensureActivity, loadMembers, memberName, notify, store, uid } from '@/lib/store'
import { downloadReminder, shareActivity } from '@/lib/share'

// Confirmation après l'inscription (maquette 11).
const props = defineProps<{ id: string }>()
const activity = computed(() => store.activities.find(a => a.id === props.id))
const others = computed(() => activity.value ? [activity.value.organizerId, ...activity.value.participantIds.filter(id => id !== uid.value)] : [])
const organizerProfile = computed(() => store.members[activity.value?.organizerId ?? ''])
const detailHref = computed(() => `#/activite/${encodeURIComponent(props.id)}`)
const groupHref = computed(() => `#/conversations/${encodeURIComponent(props.id)}`)
onMounted(() => { void ensureActivity(props.id); void loadMembers() })
function remind() { if (activity.value) { downloadReminder(activity.value); notify('Rappel téléchargé : ouvre le fichier pour l’ajouter à ton agenda.') } }
async function share() { if (activity.value) { const message = await shareActivity(activity.value); if (message) notify(message) } }
</script>

<template>
  <div class="page page--confirm">
    <a :href="detailHref" class="icon-button icon-button--plain confirm-close" aria-label="Fermer et revenir à l’activité"><X aria-hidden="true" /></a>
    <p v-if="!activity" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement…</p>
    <template v-else>
      <header class="confirm-hero">
        <span class="confirm-hero__badge" aria-hidden="true"><Check /></span>
        <h1 class="display-title">Tu participes !</h1>
        <p class="lead">Ta place est confirmée pour cette activité.</p>
      </header>
      <article class="confirm-card">
        <div class="confirm-card__media"><img :src="activity.coverUrl" alt="" /><DisciplineBadge :discipline="activity.discipline" overlay /></div>
        <div class="confirm-card__body">
          <h2>{{ activity.title }}</h2>
          <ul class="confirm-card__facts">
            <li><CalendarDays aria-hidden="true" /><span>{{ shortDay(activity.date) }}<br />{{ timeRange(activity) }}</span></li>
            <li><MapPin aria-hidden="true" /><span>{{ activity.placeName }}</span></li>
            <li><Users aria-hidden="true" /><span>{{ activity.participantIds.length }} / {{ activity.capacity }}<br />places</span></li>
          </ul>
        </div>
      </article>
      <section class="organizer-card" aria-label="Organisation">
        <UserAvatar :name="activity.organizerName" :photo="activity.organizerPhoto || organizerProfile?.photoUrl" size="lg" />
        <div><p class="muted">Organisé par</p><p class="organizer-card__name">{{ activity.organizerName }}</p><p v-if="organizerProfile?.bio" class="muted">{{ organizerProfile.bio }}</p></div>
      </section>
      <a :href="groupHref" class="group-invite">
        <Users class="group-invite__icon" aria-hidden="true" />
        <span><strong>Rejoins le groupe de discussion !</strong><small>Échange avec l’organisation et les autres participants pour préparer l’activité.</small>
          <span class="avatar-stack"><UserAvatar v-for="id in others.slice(0, 3)" :key="id" :name="id === activity.organizerId ? activity.organizerName : memberName(id)" size="sm" /><span v-if="others.length > 3" class="avatar-stack__more">+{{ others.length - 3 }}</span></span>
        </span>
        <ChevronRight aria-hidden="true" />
      </a>
      <h2 class="section-title mt-6">Et maintenant ?</h2>
      <div class="next-steps">
        <a :href="detailHref" class="next-step"><CalendarDays aria-hidden="true" />Voir les détails de l’activité</a>
        <button type="button" class="next-step" @click="remind"><Bell aria-hidden="true" />Ajouter un rappel</button>
        <button type="button" class="next-step" @click="share"><Share2 aria-hidden="true" />Partager l’activité</button>
      </div>
      <div class="stack-actions">
        <a :href="groupHref" class="btn btn--primary btn--wide"><MessageCircleMore aria-hidden="true" />Rejoindre le groupe de discussion<ArrowRight aria-hidden="true" /></a>
        <a href="#/mes-activites" class="btn btn--outline btn--wide"><CalendarDays aria-hidden="true" />Voir toutes mes activités<ArrowRight aria-hidden="true" /></a>
      </div>
    </template>
  </div>
</template>
