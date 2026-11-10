<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Link } from '@lucide/vue'
import { defaultCover, disciplineLabel, disciplines } from '@/lib/activity'

// Photo principale : photographie libre par discipline ou lien vers une photo en ligne.
const props = defineProps<{ modelValue: string; discipline: string; invalid?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const showAll = ref(false)
const isLink = computed(() => /^https?:\/\//i.test(props.modelValue))
const link = ref(isLink.value ? props.modelValue : '')
const suggestions = computed(() => {
  const own = [defaultCover(props.discipline)]
  if (!showAll.value) return own
  return [...own, ...disciplines.filter(d => d.id !== props.discipline).map(d => defaultCover(d.id))]
})
const labelOf = (url: string) => `Photo ${disciplineLabel(url.split('/').pop()?.replace(/\.webp$/, '') || '')}`
</script>
<template>
  <div class="cover-picker">
    <div class="cover-picker__preview" :class="{ 'is-empty': !modelValue, 'is-invalid': invalid }">
      <img v-if="modelValue" :src="modelValue" alt="Aperçu de la photo principale" />
      <p v-else>Choisis une photo ci-dessous</p>
    </div>
    <div class="cover-picker__grid" role="radiogroup" aria-label="Photos disponibles">
      <button v-for="url in suggestions" :key="url" type="button" role="radio" class="cover-picker__option" :class="{ 'is-selected': modelValue === url }" :aria-checked="modelValue === url" :aria-label="labelOf(url)" @click="emit('update:modelValue', url)">
        <img :src="url" alt="" loading="lazy" /><Check v-if="modelValue === url" aria-hidden="true" />
      </button>
      <button v-if="!showAll" type="button" class="cover-picker__more" @click="showAll = true">Voir les autres photos</button>
    </div>
    <label for="cover-link" class="field-label mt-4">Ou colle le lien d’une photo <span class="optional">(optionnel)</span></label>
    <div class="input-with-icon">
      <Link aria-hidden="true" />
      <input id="cover-link" v-model.trim="link" type="url" class="text-field" placeholder="https://…" @change="link && emit('update:modelValue', link)" />
    </div>
  </div>
</template>
