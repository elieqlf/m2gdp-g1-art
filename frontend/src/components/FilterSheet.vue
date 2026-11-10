<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ArrowRight, Check, MapPin, X } from '@lucide/vue'
import DisciplineIcon from './DisciplineIcon.vue'
import { defaultFilters, disciplines, levels, type DatePreset, type Filters, type PlacesPreset } from '@/lib/activity'

// Pop-up « Filtres » (maquette 08) : les choix ne s'appliquent qu'à la validation.
const props = defineProps<{ filters: Filters; count: (filters: Filters) => number }>()
const emit = defineEmits<{ apply: [filters: Filters]; close: [] }>()
const draft = reactive<Filters>({ ...props.filters, disciplines: [...props.filters.disciplines] })
const panel = ref<HTMLElement | null>(null)
const results = computed(() => props.count(draft))
let previousFocus: HTMLElement | null = null
let previousOverflow = ''
const dates: { id: DatePreset; label: string }[] = [{ id: 'toutes', label: 'Toutes' }, { id: 'aujourdhui', label: 'Aujourd’hui' }, { id: 'semaine', label: 'Cette semaine' }, { id: 'weekend', label: 'Ce week-end' }]
const places: { id: PlacesPreset; label: string }[] = [{ id: 'tous', label: 'Peu importe' }, { id: '1-5', label: '1 à 5' }, { id: '6-10', label: '6 à 10' }, { id: '10+', label: 'Plus de 10' }]
function toggleDiscipline(id: string) {
  draft.disciplines = draft.disciplines.includes(id) ? draft.disciplines.filter(d => d !== id) : [...draft.disciplines, id]
}
function reset() { Object.assign(draft, { ...defaultFilters(), query: draft.query, sort: draft.sort }) }
const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') { emit('close'); return }
  if (event.key !== 'Tab' || !panel.value) return
  const focusable = [...panel.value.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
  if (!focusable.length) { event.preventDefault(); panel.value.focus(); return }
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
onMounted(async () => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  previousOverflow = document.body.style.overflow
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
  await nextTick()
  panel.value?.focus()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = previousOverflow
  previousFocus?.focus()
})
</script>

<template>
  <div class="sheet-backdrop" @click.self="emit('close')">
    <section ref="panel" class="sheet" role="dialog" aria-modal="true" aria-labelledby="filters-title" aria-describedby="filters-description" tabindex="-1">
      <span class="sheet__grip" aria-hidden="true"></span>
      <header class="sheet__header">
        <div><h2 id="filters-title" class="display-title">Filtres</h2><p id="filters-description" class="lead">Affine ta recherche pour trouver l’activité qui te correspond !</p></div>
        <button type="button" class="icon-button icon-button--plain" aria-label="Fermer les filtres" @click="emit('close')"><X aria-hidden="true" /></button>
      </header>
      <div class="sheet__content">
        <fieldset class="filter-group"><legend>Discipline artistique</legend>
          <div class="chip-grid chip-grid--3">
            <button v-for="d in disciplines" :key="d.id" type="button" class="choice-chip" :class="{ 'is-selected': draft.disciplines.includes(d.id) }" :aria-pressed="draft.disciplines.includes(d.id)" @click="toggleDiscipline(d.id)">
              <DisciplineIcon :discipline="d.id" />{{ d.label }}<Check v-if="draft.disciplines.includes(d.id)" class="choice-chip__check" aria-hidden="true" />
            </button>
          </div>
        </fieldset>
        <fieldset class="filter-group"><legend>Date</legend>
          <div class="chip-row chip-row--filter-presets">
            <button v-for="d in dates" :key="d.id" type="button" class="choice-chip" :class="{ 'is-selected': !draft.day && draft.datePreset === d.id }" :aria-pressed="!draft.day && draft.datePreset === d.id" @click="draft.datePreset = d.id; draft.day = ''">{{ d.label }}<Check v-if="!draft.day && draft.datePreset === d.id" class="choice-chip__check" aria-hidden="true" /></button>
          </div>
          <label class="field-label sr-only" for="filter-day">Choisir une date</label>
          <input id="filter-day" v-model="draft.day" type="date" class="text-field mt-3" />
        </fieldset>
        <fieldset class="filter-group"><legend>Autour de moi</legend>
          <label for="filter-radius" class="radius-label"><MapPin aria-hidden="true" />Rayon : {{ draft.radiusKm >= 50 ? 'sans limite' : `${draft.radiusKm} km` }}</label>
          <input id="filter-radius" v-model.number="draft.radiusKm" type="range" min="1" max="50" step="1" class="range" :style="{ '--fill': `${((draft.radiusKm - 1) / 49) * 100}%` }" />
          <div class="range-scale" aria-hidden="true"><span>1 km</span><span>50 km</span></div>
        </fieldset>
        <fieldset class="filter-group"><legend>Nombre de places disponibles</legend>
          <div class="chip-row chip-row--filter-presets">
            <button v-for="p in places" :key="p.id" type="button" class="choice-chip" :class="{ 'is-selected': draft.places === p.id }" :aria-pressed="draft.places === p.id" @click="draft.places = p.id">{{ p.label }}<Check v-if="draft.places === p.id" class="choice-chip__check" aria-hidden="true" /></button>
          </div>
        </fieldset>
        <fieldset class="filter-group"><legend>Niveau</legend>
          <div class="chip-row chip-row--filter-presets">
            <button v-for="l in levels" :key="l.id" type="button" class="choice-chip" :class="{ 'is-selected': draft.level === l.id }" :aria-pressed="draft.level === l.id" @click="draft.level = l.id">{{ l.label }}<Check v-if="draft.level === l.id" class="choice-chip__check" aria-hidden="true" /></button>
          </div>
        </fieldset>
      </div>
      <footer class="sheet__footer">
        <button type="button" class="btn btn--outline" @click="reset">Réinitialiser</button>
        <button type="button" class="btn btn--primary" @click="emit('apply', { ...draft, disciplines: [...draft.disciplines] })">Afficher {{ results }} résultat{{ results > 1 ? 's' : '' }}<ArrowRight aria-hidden="true" /></button>
      </footer>
    </section>
  </div>
</template>
