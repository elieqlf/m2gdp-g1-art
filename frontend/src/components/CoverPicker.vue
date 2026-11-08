<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Link } from '@lucide/vue'
import { defaultCover, disciplineLabel, disciplines } from '@/lib/activity'

// Photo principale : illustrations NOVART par discipline ou lien vers une photo en ligne.
const props = defineProps<{ modelValue: string; discipline: string; invalid?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const showAll = ref(false)
const isLink = computed(() => /^https?:\/\//i.test(props.modelValue))
const link = ref(isLink.value ? props.modelValue : '')
const suggestions = computed(() => {
  const own = [defaultCover(props.discipline, 1), defaultCover(props.discipline, 2)]
  if (!showAll.value) return own
  return [...own, ...disciplines.filter(d => d.id !== props.discipline).flatMap(d => [defaultCover(d.id, 1), defaultCover(d.id, 2)])]
})
const labelOf = (url: string) => `Illustration ${disciplineLabel(url.split('/').pop()?.replace(/-\d\.svg$/, '') || '')}, variante ${url.endsWith('2.svg') ? 2 : 1}`
</script>
<template>
  <div class="cover-picker">
    <div class="cover-picker__preview" :class="{ 'is-empty': !modelValue, 'is-invalid': invalid }">
      <img v-if="modelValue" :src="modelValue" alt="Aperçu de la photo principale" />
      <p v-else>Choisis une illustration ci-dessous</p>
    </div>
    <div class="cover-picker__grid" role="radiogroup" aria-label="Illustrations disponibles">
      <button v-for="url in suggestions" :key="url" type="button" role="radio" class="cover-picker__option" :class="{ 'is-selected': modelValue === url }" :aria-checked="modelValue === url" :aria-label="labelOf(url)" @click="emit('update:modelValue', url)">
        <img :src="url" alt="" loading="lazy" /><Check v-if="modelValue === url" aria-hidden="true" />
      </button>
      <button v-if="!showAll" type="button" class="cover-picker__more" @click="showAll = true">Voir toutes les illustrations</button>
    </div>
    <label for="cover-link" class="field-label mt-4">Ou colle le lien d’une photo <span class="optional">(optionnel)</span></label>
    <div class="input-with-icon">
      <Link aria-hidden="true" />
      <input id="cover-link" v-model.trim="link" type="url" class="text-field" placeholder="https://…" @change="link && emit('update:modelValue', link)" />
    </div>
  </div>
</template>
