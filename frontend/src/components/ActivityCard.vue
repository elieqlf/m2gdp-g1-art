<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays, ChevronRight, Clock, MapPin, Users } from '@lucide/vue'
import DisciplineBadge from './DisciplineBadge.vue'
import DisciplineIcon from './DisciplineIcon.vue'
import FavoriteButton from './FavoriteButton.vue'
import UserAvatar from './UserAvatar.vue'
import { activityDistance, clockRange, dateBlock, disciplineLabel, formatDistance, hasOfferFor, isFull, shortDay, timeRange, waitlistPosition, type Activity } from '@/lib/activity'
import { memberName, origin, uid } from '@/lib/store'

// Variantes reprises des maquettes : tile (Découvrir), row (Rechercher),
// feature (« À ne pas manquer ») et agenda (Mes activités).
const props = withDefaults(defineProps<{ activity: Activity; variant?: 'tile' | 'row' | 'feature' | 'agenda'; showCapacity?: boolean }>(), { variant: 'tile' })
const distance = computed(() => formatDistance(activityDistance(props.activity, origin.value)))
const href = computed(() => `#/activite/${encodeURIComponent(props.activity.id)}`)
const block = computed(() => dateBlock(props.activity.date))
const places = computed(() => `${props.activity.participantIds.length} / ${props.activity.capacity} places`)
// Liste d'attente (Mes activités) : place à confirmer ou rang dans la file.
const queueTag = computed(() => props.variant !== 'agenda' ? '' : hasOfferFor(props.activity, uid.value) ? 'Place à confirmer' : waitlistPosition(props.activity, uid.value) ? `N°${waitlistPosition(props.activity, uid.value)} en liste d’attente` : '')
const place = computed(() => [props.activity.placeName, props.activity.district?.split(',')[0]].filter(Boolean).join(', '))
</script>

<template>
  <article class="activity-card" :class="`activity-card--${variant}`">
    <div class="activity-card__media">
      <img :src="activity.coverUrl" alt="" loading="lazy" />
      <template v-if="variant === 'tile'">
        <DisciplineBadge :discipline="activity.discipline" overlay class="activity-card__badge" />
        <span v-if="distance" class="activity-card__distance"><MapPin aria-hidden="true" />{{ distance }}</span>
      </template>
      <span v-else-if="variant === 'row' && distance" class="activity-card__distance activity-card__distance--start"><MapPin aria-hidden="true" />{{ distance }}</span>
      <span v-else-if="variant === 'agenda'" class="activity-card__dateblock" aria-hidden="true"><small>{{ block.weekday }}</small><strong>{{ block.day }}</strong><small>{{ block.month }}</small></span>
      <span v-if="isFull(activity) && variant !== 'agenda'" class="activity-card__full">Complet</span>
    </div>
    <div class="activity-card__body">
      <span v-if="variant === 'feature'" class="discipline-badge discipline-badge--overlay"><DisciplineIcon :discipline="activity.discipline" />{{ disciplineLabel(activity.discipline) }}</span>
      <h3 class="activity-card__title"><a :href="href" class="stretched-link">{{ activity.title }}</a></h3>
      <p v-if="variant === 'row'" class="activity-card__discipline"><DisciplineIcon :discipline="activity.discipline" />{{ disciplineLabel(activity.discipline) }}</p>
      <span v-if="variant === 'agenda'" class="activity-card__tags"><DisciplineBadge :discipline="activity.discipline" /><span v-if="queueTag" class="soft-tag" :class="{ 'soft-tag--dark': queueTag.startsWith('Place') }">{{ queueTag }}</span></span>
      <ul class="activity-card__facts">
        <li v-if="variant === 'agenda'"><Clock aria-hidden="true" />{{ clockRange(activity) }}</li>
        <li v-else><CalendarDays aria-hidden="true" />{{ shortDay(activity.date) }} · {{ timeRange(activity) }}</li>
        <li v-if="variant !== 'feature'"><MapPin aria-hidden="true" /><span class="truncate">{{ place }}</span></li>
        <li v-if="variant === 'agenda'" class="activity-card__people">
          <Users aria-hidden="true" />
          <span class="avatar-stack"><UserAvatar v-for="id in activity.participantIds.slice(0, 3)" :key="id" :name="memberName(id)" size="xs" /></span>
          {{ activity.participantIds.length }} participant{{ activity.participantIds.length > 1 ? 's' : '' }}<template v-if="showCapacity"> / {{ activity.capacity }} places</template>
        </li>
        <li v-else><Users aria-hidden="true" />{{ places }}</li>
      </ul>
    </div>
    <FavoriteButton v-if="variant !== 'agenda'" :activity-id="activity.id" :title="activity.title" :soft="variant === 'row'" class="activity-card__favorite" />
    <ChevronRight v-else class="activity-card__chevron" aria-hidden="true" />
  </article>
</template>
