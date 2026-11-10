<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, LogOut, MapPin, MessageCircleMore, Pencil, Share2, SignalHigh, Snowflake, Sun, Users, Wrench } from '@lucide/vue'
import ActivityMap from '@/components/ActivityMap.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DisciplineBadge from '@/components/DisciplineBadge.vue'
import FavoriteButton from '@/components/FavoriteButton.vue'
import MascotState from '@/components/MascotState.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { activityDistance, clockRange, formatDistance, isFull, isPast, levelLabel, longDay, placesLeft, toIsoDay, type Activity } from '@/lib/activity'
import { ensureActivity, loadMembers, memberName, notify, origin, store, uid, upsertActivity } from '@/lib/store'
import { goBack, navigate } from '@/lib/router'
import { shareActivity } from '@/lib/share'
import { ActivityFullError, joinActivity, leaveActivity } from '@/services/activities'
import { dayForecast, type Forecast } from '@/services/weather'

// US-06 (fiche), US-09 (s'inscrire), US-10 (se désinscrire).
const props = defineProps<{ id: string }>()
const status = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
const busy = ref(false)
const error = ref('')
const confirmLeave = ref(false)
const forecast = ref<Forecast | null>(null)
const activity = computed(() => store.activities.find(a => a.id === props.id))
const organizer = computed(() => activity.value?.organizerId === uid.value)
const participant = computed(() => !!activity.value?.participantIds.includes(uid.value))
const past = computed(() => !!activity.value && isPast(activity.value))
const distance = computed(() => activity.value ? formatDistance(activityDistance(activity.value, origin.value)) : '')
const organizerProfile = computed(() => store.members[activity.value?.organizerId ?? ''])
const people = computed(() => activity.value ? [activity.value.organizerId, ...activity.value.participantIds] : [])
const point = computed(() => activity.value ? [{ id: activity.value.id, lat: activity.value.lat, lng: activity.value.lng, title: activity.value.placeName }] : [])
const weatherIcon = computed(() => ({ sun: Sun, 'cloud-sun': CloudSun, cloud: Cloud, rain: CloudRain, snow: Snowflake, storm: CloudLightning, fog: CloudFog })[forecast.value?.icon ?? 'cloud'])
let weatherController: AbortController | undefined

async function load() {
  status.value = 'loading'
  try { status.value = (await ensureActivity(props.id)) ? 'ready' : 'missing' }
  catch { status.value = 'error' }
  void loadMembers()
}
async function loadWeather(a: Activity | undefined) {
  weatherController?.abort(); forecast.value = null
  if (!a || a.lat === null || a.lng === null || isPast(a)) return
  const limit = new Date(); limit.setDate(limit.getDate() + 14)
  if (a.date > toIsoDay(limit)) return
  weatherController = new AbortController()
  try { forecast.value = await dayForecast(a.lat, a.lng, a.date, weatherController.signal) } catch { forecast.value = null }
}
watch(() => props.id, load, { immediate: true })
watch(() => activity.value?.id, () => loadWeather(activity.value), { immediate: true })
onBeforeUnmount(() => weatherController?.abort())

async function join() {
  if (!activity.value) return
  busy.value = true; error.value = ''
  try {
    upsertActivity(await joinActivity(activity.value.id, uid.value))
    navigate(`activite/${encodeURIComponent(activity.value.id)}/participation`, { celebrate: '1' })
  } catch (cause) {
    error.value = cause instanceof ActivityFullError ? 'Trop tard, la dernière place vient d’être prise. Cette activité est complète.' : 'Inscription impossible pour le moment. Vérifie ta connexion et réessaie.'
  } finally { busy.value = false }
}
async function leave() {
  if (!activity.value) return
  busy.value = true; error.value = ''
  try {
    await leaveActivity(activity.value.id, uid.value)
    upsertActivity({ ...activity.value, participantIds: activity.value.participantIds.filter(id => id !== uid.value) })
    confirmLeave.value = false
    notify('Tu ne participes plus à cette activité.')
  } catch { error.value = 'Désinscription impossible pour le moment. Réessaie.' }
  finally { busy.value = false }
}
async function share() { if (activity.value) { const message = await shareActivity(activity.value); if (message) notify(message) } }
</script>

<template>
  <div class="page page--detail">
    <div class="topbar">
      <button type="button" class="icon-button icon-button--plain" aria-label="Retour" @click="goBack()"><ChevronLeft aria-hidden="true" /></button>
      <div v-if="activity" class="topbar__actions">
        <button type="button" class="icon-button icon-button--plain" aria-label="Partager l’activité" @click="share"><Share2 aria-hidden="true" /></button>
        <FavoriteButton :activity-id="activity.id" :title="activity.title" soft />
      </div>
    </div>
    <p v-if="status === 'loading' && !activity" class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>Chargement de l’activité…</p>
    <MascotState v-else-if="status === 'missing'" title="Activité introuvable" text="Elle a peut-être été supprimée par son organisateur."><a href="#/rechercher" class="btn btn--primary">Voir les activités</a></MascotState>
    <MascotState v-else-if="status === 'error' && !activity" title="Oups, pas de connexion" text="Impossible de charger cette activité."><button type="button" class="btn btn--primary" @click="load">Réessayer</button></MascotState>
    <article v-else-if="activity" class="detail">
      <img :src="activity.coverUrl" alt="" class="detail__cover" />
      <h1 class="detail__title">{{ activity.title }}</h1>
      <div class="detail__badges"><DisciplineBadge :discipline="activity.discipline" /><span v-if="activity.subDiscipline" class="soft-tag">{{ activity.subDiscipline }}</span><span v-if="past" class="soft-tag soft-tag--grey">Terminée</span><span v-else-if="isFull(activity)" class="soft-tag soft-tag--dark">Complet</span></div>

      <ul class="fact-list">
        <li><CalendarDays aria-hidden="true" /><span><strong>{{ longDay(activity.date) }}</strong><small>{{ clockRange(activity) }}</small></span></li>
        <li><MapPin aria-hidden="true" /><span><strong>{{ activity.placeName }}</strong><small>{{ activity.address }}<template v-if="distance"> · {{ distance }}</template></small></span></li>
        <li><Users aria-hidden="true" /><span><strong>{{ activity.participantIds.length }} participant{{ activity.participantIds.length > 1 ? 's' : '' }} sur {{ activity.capacity }} places</strong><small>{{ isFull(activity) ? 'Complet' : `${placesLeft(activity)} place${placesLeft(activity) > 1 ? 's' : ''} disponible${placesLeft(activity) > 1 ? 's' : ''}` }}</small></span></li>
        <li><SignalHigh aria-hidden="true" /><span><strong>Niveau</strong><small>{{ levelLabel(activity.level) }}</small></span></li>
        <li v-if="activity.equipment"><Wrench aria-hidden="true" /><span><strong>Matériel à prévoir</strong><small>{{ activity.equipment }}</small></span></li>
        <li v-if="forecast"><component :is="weatherIcon" aria-hidden="true" /><span><strong>Météo prévue : {{ forecast.label }}</strong><small>{{ forecast.min }} °C à {{ forecast.max }} °C · risque de pluie {{ forecast.rain }} % (Open-Meteo)</small></span></li>
      </ul>

      <section class="detail__section"><h2 class="subheading">À propos</h2><p class="detail__description">{{ activity.description }}</p></section>

      <section class="organizer-card" aria-label="Organisation">
        <UserAvatar :name="activity.organizerName" :photo="activity.organizerPhoto || organizerProfile?.photoUrl" :user-id="activity.organizerId" size="lg" />
        <div><p class="muted">Organisé par</p><p class="organizer-card__name">{{ organizer ? 'Toi' : activity.organizerName }}</p><p v-if="organizerProfile?.bio" class="muted">{{ organizerProfile.bio }}</p></div>
      </section>

      <div v-if="activity.lat !== null" class="detail__map"><ActivityMap :points="point" :zoom="15" label="Lieu de l’activité" /></div>

      <section class="detail__section" aria-labelledby="participants-title">
        <h2 id="participants-title" class="subheading">Participants <span class="muted">({{ activity.participantIds.length }})</span></h2>
        <ul class="people-list">
          <li v-for="(id, index) in people" :key="id" class="person-row">
            <UserAvatar :name="index === 0 ? activity.organizerName : memberName(id)" :photo="store.members[id]?.photoUrl" :user-id="id" />
            <span class="person-row__name">{{ id === uid ? 'Toi' : index === 0 ? activity.organizerName : memberName(id) }}</span>
            <span v-if="index === 0" class="soft-tag">Organisation</span>
          </li>
        </ul>
      </section>

      <p v-if="error" class="form-alert" role="alert">{{ error }}</p>
      <div class="action-bar">
        <template v-if="organizer">
          <a :href="`#/activite/${encodeURIComponent(activity.id)}/modifier`" class="btn btn--outline"><Pencil aria-hidden="true" />Modifier</a>
          <a :href="`#/conversations/${encodeURIComponent(activity.id)}`" class="btn btn--primary"><MessageCircleMore aria-hidden="true" />Groupe de discussion</a>
        </template>
        <template v-else-if="participant">
          <button v-if="!past" type="button" class="btn btn--soft" @click="confirmLeave = true"><LogOut aria-hidden="true" />Quitter l’activité</button>
          <a :href="`#/conversations/${encodeURIComponent(activity.id)}`" class="btn btn--primary"><MessageCircleMore aria-hidden="true" />Groupe de discussion<ChevronRight aria-hidden="true" /></a>
        </template>
        <button v-else-if="past" type="button" class="btn btn--primary" disabled>Activité terminée</button>
        <button v-else-if="isFull(activity)" type="button" class="btn btn--primary" disabled>Complet</button>
        <button v-else type="button" class="btn btn--primary btn--wide" :disabled="busy" @click="join">{{ busy ? 'Inscription…' : 'Participer' }}</button>
      </div>
    </article>
    <ConfirmDialog v-if="confirmLeave && activity" title="Quitter l’activité ?" :text="`Ta place pour « ${activity.title} » sera libérée et tu quitteras le groupe de discussion.`" confirm-label="Quitter l’activité" :busy="busy" @confirm="leave" @cancel="confirmLeave = false" />
  </div>
</template>
