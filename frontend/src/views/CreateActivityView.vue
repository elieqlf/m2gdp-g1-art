<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowRight, CalendarDays, Clock, Eye, Lightbulb, MapPin, Pencil, Send, SignalHigh, SignalLow, SignalMedium, Sparkles, Star, Users, Wrench, X } from '@lucide/vue'
import CapacityStepper from '@/components/CapacityStepper.vue'
import CoverPicker from '@/components/CoverPicker.vue'
import DisciplineBadge from '@/components/DisciplineBadge.vue'
import DisciplineIcon from '@/components/DisciplineIcon.vue'
import PlacePicker from '@/components/PlacePicker.vue'
import StepIndicator from '@/components/StepIndicator.vue'
import { clockRange, defaultCover, disciplines, levelLabel, levels, longDay, templates, toIsoDay, validateDraft, type ActivityDraft, type DraftErrors } from '@/lib/activity'
import { me, notify, upsertActivity } from '@/lib/store'
import { navigate } from '@/lib/router'
import { createActivity } from '@/services/activities'

// US-07 : créer une activité en quatre étapes. Le brouillon est conservé sur l'appareil.
const DRAFT_KEY = 'novart_activity_draft'
const steps = ['Informations', 'Médias', 'Lieu, date & places', 'Aperçu']
const levelIcons = { debutant: SignalLow, intermediaire: SignalMedium, avance: SignalHigh, tous: Star }
const nextSaturday = () => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return toIsoDay(d) }
const blank = (): ActivityDraft => ({ title: '', discipline: '', subDiscipline: '', description: '', level: 'tous', equipment: '', coverUrl: '', placeName: '', address: '', district: '', lat: null, lng: null, date: nextSaturday(), startTime: '14:00', endTime: '17:00', capacity: 8 })
function restore(): ActivityDraft | null {
  try { const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); return saved?.title || saved?.discipline ? { ...blank(), ...saved } : null } catch { return null }
}
const saved = restore()
const draft = reactive<ActivityDraft>(saved ?? blank())
const restored = ref(!!saved)
const step = ref(1)
const errors = ref<DraftErrors>({})
const busy = ref(false)
const publishError = ref('')
const subs = computed(() => disciplines.find(d => d.id === draft.discipline)?.subs ?? [])
watch(draft, value => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(value)) } catch { /* stockage indisponible */ } }, { deep: true })
watch(() => draft.discipline, (value, previous) => {
  // L'illustration suit la discipline tant qu'aucune photo personnelle n'est choisie.
  if (!draft.coverUrl || (previous && draft.coverUrl.startsWith(`/images/activities/${previous}-`))) draft.coverUrl = value ? defaultCover(value) : ''
  if (draft.subDiscipline && !subs.value.includes(draft.subDiscipline)) draft.subDiscipline = ''
})

function useTemplate(id: string) {
  const t = templates.find(item => item.id === id)
  if (!t) return
  const [h = 14] = draft.startTime.split(':').map(Number)
  Object.assign(draft, { title: t.title, discipline: t.discipline, subDiscipline: t.sub, description: t.description, level: t.level, equipment: t.equipment, capacity: t.capacity, endTime: `${String(Math.min(23, h + t.duration)).padStart(2, '0')}:00` })
  errors.value = {}
}
function startOver() { Object.assign(draft, blank()); restored.value = false; step.value = 1; errors.value = {} }
function next() {
  errors.value = validateDraft(draft, step.value as 1 | 2 | 3)
  if (Object.keys(errors.value).length) { document.querySelector<HTMLElement>('[aria-invalid="true"], .is-invalid button, .is-invalid input')?.focus(); return }
  step.value++
  window.scrollTo({ top: 0 })
}
function goTo(target: number) { if (target < step.value) { step.value = target; errors.value = {} } }
async function publish() {
  errors.value = validateDraft(draft, 'all')
  if (Object.keys(errors.value).length) { step.value = errors.value.title || errors.value.discipline || errors.value.description ? 1 : errors.value.coverUrl ? 2 : 3; return }
  busy.value = true; publishError.value = ''
  try {
    const created = await createActivity({ ...draft, title: draft.title.trim(), description: draft.description.trim(), equipment: draft.equipment?.trim() ?? '', placeName: draft.placeName.trim() || draft.address.split(',')[0] || '' }, me.value)
    upsertActivity(created)
    localStorage.removeItem(DRAFT_KEY)
    notify('Ton activité est publiée !')
    navigate(`activite/${encodeURIComponent(created.id)}`)
  } catch { publishError.value = 'Publication impossible pour le moment. Ton brouillon est conservé, réessaie dans un instant.' }
  finally { busy.value = false }
}
function close() { navigate('decouvrir') }
</script>

<template>
  <div class="page page--form">
    <div class="topbar topbar--end"><button type="button" class="icon-button icon-button--plain" aria-label="Fermer la création (le brouillon est conservé)" @click="close"><X aria-hidden="true" /></button></div>
    <StepIndicator :steps="steps" :current="step" @go="goTo" />

    <form v-if="step === 1" class="form-step" novalidate @submit.prevent="next">
      <h1 class="display-title">Créer une activité</h1>
      <p class="lead">Partage ton idée et rassemble une communauté autour de ta passion.</p>
      <div v-if="restored" class="info-banner" role="status"><span>Ton brouillon a été retrouvé.</span><button type="button" class="link-button" @click="startOver">Recommencer</button></div>
      <div class="template-box">
        <p class="field-label"><Sparkles aria-hidden="true" />Partir d’un modèle <span class="optional">(optionnel)</span></p>
        <div class="chip-scroller chip-scroller--tight" role="group" aria-label="Modèles d’activités">
          <button v-for="t in templates" :key="t.id" type="button" class="pill pill--small" @click="useTemplate(t.id)"><DisciplineIcon :discipline="t.discipline" />{{ t.title }}</button>
        </div>
      </div>
      <label for="title" class="field-label">Titre de l’activité <span class="required" aria-hidden="true">*</span></label>
      <div class="counter-field"><input id="title" v-model="draft.title" class="text-field" maxlength="60" placeholder="Ex. : Atelier peinture libre" :aria-invalid="!!errors.title" aria-describedby="title-error" required /><span class="counter">{{ draft.title.length }}/60</span></div>
      <p v-if="errors.title" id="title-error" class="field-error">{{ errors.title }}</p>
      <fieldset class="field-group" :class="{ 'is-invalid': errors.discipline }"><legend class="field-label">Discipline artistique <span class="required" aria-hidden="true">*</span></legend>
        <div class="discipline-grid">
          <button v-for="d in disciplines" :key="d.id" type="button" class="discipline-option" :class="{ 'is-selected': draft.discipline === d.id }" :aria-pressed="draft.discipline === d.id" @click="draft.discipline = d.id"><DisciplineIcon :discipline="d.id" /><span>{{ d.label }}</span></button>
        </div>
        <p v-if="errors.discipline" class="field-error">{{ errors.discipline }}</p>
      </fieldset>
      <fieldset v-if="subs.length" class="field-group"><legend class="field-label">Précise la pratique <span class="optional">(optionnel)</span></legend>
        <div class="chip-row"><button v-for="s in subs" :key="s" type="button" class="choice-chip" :class="{ 'is-selected': draft.subDiscipline === s }" :aria-pressed="draft.subDiscipline === s" @click="draft.subDiscipline = draft.subDiscipline === s ? '' : s">{{ s }}</button></div>
      </fieldset>
      <label for="description" class="field-label">Description <span class="required" aria-hidden="true">*</span></label>
      <div class="counter-field"><textarea id="description" v-model="draft.description" class="text-field text-area" maxlength="500" rows="4" placeholder="Décris ton activité : objectifs, déroulement, ambiance…" :aria-invalid="!!errors.description" aria-describedby="description-error"></textarea><span class="counter">{{ draft.description.length }}/500</span></div>
      <p v-if="errors.description" id="description-error" class="field-error">{{ errors.description }}</p>
      <fieldset class="field-group"><legend class="field-label">Niveau <span class="optional">(optionnel)</span></legend>
        <div class="chip-row"><button v-for="l in levels" :key="l.id" type="button" class="choice-chip" :class="{ 'is-selected': draft.level === l.id }" :aria-pressed="draft.level === l.id" @click="draft.level = l.id"><component :is="levelIcons[l.id]" aria-hidden="true" />{{ l.label }}</button></div>
      </fieldset>
      <label for="equipment" class="field-label">Matériel à prévoir <span class="optional">(optionnel)</span></label>
      <div class="counter-field"><textarea id="equipment" v-model="draft.equipment" class="text-field text-area" maxlength="300" rows="2" placeholder="Ex. : apporter son carnet, matériel fourni sur place…"></textarea><span class="counter">{{ draft.equipment?.length ?? 0 }}/300</span></div>
      <button type="submit" class="btn btn--primary btn--wide btn--big">Continuer<ArrowRight aria-hidden="true" /></button>
    </form>

    <form v-else-if="step === 2" class="form-step" novalidate @submit.prevent="next">
      <h1 class="display-title">Ajouter des médias</h1>
      <p class="lead">Une belle image donne envie de participer !</p>
      <p class="field-label">Photo principale <span class="required" aria-hidden="true">*</span></p>
      <CoverPicker v-model="draft.coverUrl" :discipline="draft.discipline" :invalid="!!errors.coverUrl" />
      <p v-if="errors.coverUrl" class="field-error" role="alert">{{ errors.coverUrl }}</p>
      <aside class="tips-box">
        <p class="tips-box__title"><Lightbulb aria-hidden="true" />Astuces pour de belles photos</p>
        <p>Choisis une image qui montre concrètement ton activité : le lieu, le matériel, l’ambiance ou des réalisations.</p>
      </aside>
      <button type="submit" class="btn btn--primary btn--wide btn--big">Continuer<ArrowRight aria-hidden="true" /></button>
    </form>

    <form v-else-if="step === 3" class="form-step" novalidate @submit.prevent="next">
      <h1 class="display-title">Lieu, date et places</h1>
      <p class="lead">Indique où et quand se déroule ton activité.</p>
      <p class="field-label">Lieu de l’activité <span class="required" aria-hidden="true">*</span></p>
      <PlacePicker :draft="draft" :error="errors.place" />
      <label for="date" class="field-label mt-5">Date <span class="required" aria-hidden="true">*</span></label>
      <div class="input-with-icon"><CalendarDays aria-hidden="true" /><input id="date" v-model="draft.date" type="date" class="text-field" :min="toIsoDay(new Date())" :aria-invalid="!!errors.date" /></div>
      <p v-if="errors.date" class="field-error">{{ errors.date }}</p>
      <div class="two-columns">
        <div><label for="start" class="field-label">Heure de début <span class="required" aria-hidden="true">*</span></label><div class="input-with-icon"><Clock aria-hidden="true" /><input id="start" v-model="draft.startTime" type="time" class="text-field" step="900" :aria-invalid="!!errors.startTime" /></div><p v-if="errors.startTime" class="field-error">{{ errors.startTime }}</p></div>
        <div><label for="end" class="field-label">Heure de fin <span class="required" aria-hidden="true">*</span></label><div class="input-with-icon"><Clock aria-hidden="true" /><input id="end" v-model="draft.endTime" type="time" class="text-field" step="900" :aria-invalid="!!errors.endTime" /></div><p v-if="errors.endTime" class="field-error">{{ errors.endTime }}</p></div>
      </div>
      <label for="capacity" class="field-label mt-5">Nombre de places <span class="required" aria-hidden="true">*</span></label>
      <CapacityStepper v-model="draft.capacity" :invalid="!!errors.capacity" describedby="capacity-hint" />
      <p id="capacity-hint" class="hint">{{ errors.capacity || 'Tu pourras modifier ce nombre plus tard si besoin.' }}</p>
      <button type="submit" class="btn btn--primary btn--wide btn--big">Continuer<ArrowRight aria-hidden="true" /></button>
    </form>

    <section v-else class="form-step" aria-labelledby="preview-title">
      <h1 id="preview-title" class="display-title">Aperçu de ton activité</h1>
      <p class="lead">Vérifie les informations avant de publier.</p>
      <article class="preview-card">
        <div class="preview-card__media"><img :src="draft.coverUrl" alt="" /><button type="button" class="preview-card__edit" @click="goTo(1)"><Pencil aria-hidden="true" />Modifier</button></div>
        <div class="preview-card__body">
          <h2>{{ draft.title }}</h2>
          <DisciplineBadge :discipline="draft.discipline" />
          <p class="detail__description">{{ draft.description }}</p>
          <ul class="fact-list fact-list--compact">
            <li><button type="button" @click="goTo(3)"><CalendarDays aria-hidden="true" /><span><strong>{{ longDay(draft.date) }}</strong><small>{{ clockRange(draft) }}</small></span></button></li>
            <li><button type="button" @click="goTo(3)"><MapPin aria-hidden="true" /><span><strong>{{ draft.placeName || draft.address }}</strong><small>{{ draft.address }}</small></span></button></li>
            <li><button type="button" @click="goTo(3)"><Users aria-hidden="true" /><span><strong>{{ draft.capacity }} places</strong><small>Aucune place prise pour l’instant</small></span></button></li>
            <li><button type="button" @click="goTo(1)"><SignalHigh aria-hidden="true" /><span><strong>Niveau</strong><small>{{ levelLabel(draft.level) }}</small></span></button></li>
            <li v-if="draft.equipment"><button type="button" @click="goTo(1)"><Wrench aria-hidden="true" /><span><strong>Matériel à prévoir</strong><small>{{ draft.equipment }}</small></span></button></li>
          </ul>
        </div>
      </article>
      <p class="info-banner info-banner--strong"><Users aria-hidden="true" /><span><strong>Une fois publiée,</strong> ton activité sera visible sur la carte et dans la liste.</span></p>
      <p v-if="publishError" class="form-alert" role="alert">{{ publishError }}</p>
      <button type="button" class="btn btn--primary btn--wide btn--big" :disabled="busy" @click="publish"><Send aria-hidden="true" />{{ busy ? 'Publication…' : 'Publier l’activité' }}</button>
      <button type="button" class="btn btn--outline btn--wide" @click="goTo(1)"><Eye aria-hidden="true" />Revoir les informations</button>
    </section>
  </div>
</template>
