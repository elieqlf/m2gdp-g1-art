<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { CalendarDays, MapPin, Search, X } from '@lucide/vue'
import DisciplineIcon from '@/components/DisciplineIcon.vue'
import { groupOf, highlight, MIN_CHARS, suggest, type Suggestion } from '@/lib/suggest'
import { store } from '@/lib/store'

// Champ de recherche avec autocomplétion (modèle « combobox » WAI-ARIA) : activités à venir,
// disciplines et pratiques, lieux et quartiers. Flèches pour parcourir, Entrée pour choisir,
// Échap pour fermer. Sans choix, Entrée lance la recherche telle quelle.
const props = withDefaults(defineProps<{ modelValue: string; placeholder?: string; floating?: boolean; clearable?: boolean }>(), { placeholder: 'Rechercher une activité, un lieu…' })
const emit = defineEmits<{ 'update:modelValue': [value: string]; submit: [value: string]; pick: [suggestion: Suggestion] }>()
const id = useId()
const input = ref<HTMLInputElement | null>(null)
const focused = ref(false)
const dismissed = ref(false)
const active = ref(-1)

const suggestions = computed(() => suggest(store.activities, props.modelValue))
const open = computed(() => focused.value && !dismissed.value && props.modelValue.trim().length >= MIN_CHARS && suggestions.value.length > 0)
const optionId = (index: number) => `${id}-option-${index}`
// Titres de groupes : affichés avant la première suggestion de chaque groupe.
const rows = computed(() => suggestions.value.map((s, index) => ({ s, index, group: index === 0 || groupOf(suggestions.value[index - 1]!) !== groupOf(s) ? groupOf(s) : '' })))
const status = computed(() => !focused.value || props.modelValue.trim().length < MIN_CHARS ? '' : suggestions.value.length ? `${suggestions.value.length} suggestion${suggestions.value.length > 1 ? 's' : ''}, flèches pour parcourir` : 'Aucune suggestion')

watch(() => props.modelValue, () => { active.value = -1; dismissed.value = false })

function update(event: Event) { emit('update:modelValue', (event.target as HTMLInputElement).value) }
function choose(s: Suggestion) {
  dismissed.value = true
  active.value = -1
  emit('pick', s)
  input.value?.blur()
}
function onKeydown(event: KeyboardEvent) {
  const count = suggestions.value.length
  if (event.key === 'ArrowDown' && count) { event.preventDefault(); dismissed.value = false; active.value = (active.value + 1) % count }
  else if (event.key === 'ArrowUp' && count) { event.preventDefault(); dismissed.value = false; active.value = active.value <= 0 ? count - 1 : active.value - 1 }
  else if (event.key === 'Escape') { if (open.value) { event.preventDefault(); dismissed.value = true; active.value = -1 } }
  else if (event.key === 'Enter') {
    event.preventDefault()
    const picked = open.value ? suggestions.value[active.value] : undefined
    if (picked) choose(picked)
    else { dismissed.value = true; emit('submit', props.modelValue.trim()); input.value?.blur() }
  }
}
function clear() { emit('update:modelValue', ''); input.value?.focus() }
</script>

<template>
  <div class="search-box">
    <label class="search-field" :class="{ 'search-field--floating': floating }">
      <Search aria-hidden="true" /><span class="sr-only">Rechercher</span>
      <input ref="input" :value="modelValue" type="search" role="combobox" :placeholder="placeholder" enterkeyhint="search" autocomplete="off" spellcheck="false"
        aria-autocomplete="list" :aria-expanded="open" :aria-controls="`${id}-list`" :aria-activedescendant="open && active >= 0 ? optionId(active) : undefined"
        @input="update" @keydown="onKeydown" @focus="focused = true; dismissed = false" @blur="focused = false" />
      <button v-if="clearable && modelValue" type="button" class="search-field__clear" aria-label="Effacer la recherche" @click="clear"><X aria-hidden="true" /></button>
    </label>
    <ul v-show="open" :id="`${id}-list`" class="search-suggest" role="listbox" aria-label="Suggestions de recherche">
      <template v-for="row in rows" :key="row.s.key">
        <li v-if="row.group" class="search-suggest__group" role="presentation">{{ row.group }}</li>
        <!-- pointerdown : choisir avant que le champ ne perde le focus (sinon la liste se ferme). -->
        <li :id="optionId(row.index)" class="search-suggest__option" :class="{ 'is-active': row.index === active }" role="option" :aria-selected="row.index === active"
          @pointerdown.prevent="choose(row.s)" @pointermove="active = row.index">
          <span class="search-suggest__icon" aria-hidden="true">
            <MapPin v-if="row.s.kind === 'place'" />
            <CalendarDays v-else-if="row.s.kind === 'title'" />
            <DisciplineIcon v-else :discipline="row.s.discipline" />
          </span>
          <span class="search-suggest__text">
            <span class="search-suggest__label"><template v-for="(part, k) in highlight(row.s.label, row.s.ranges)" :key="k"><mark v-if="part.hit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
            <small>{{ row.s.detail }}</small>
          </span>
        </li>
      </template>
    </ul>
    <p class="sr-only" role="status" aria-live="polite">{{ status }}</p>
  </div>
</template>
