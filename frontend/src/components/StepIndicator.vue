<script setup lang="ts">
import { Check } from '@lucide/vue'
defineProps<{ steps: string[]; current: number }>()
const emit = defineEmits<{ go: [step: number] }>()
</script>
<template>
  <ol class="steps" aria-label="Étapes de création">
    <li v-for="(label, index) in steps" :key="label" class="steps__item" :class="{ 'is-done': index + 1 < current, 'is-current': index + 1 === current }" :aria-current="index + 1 === current ? 'step' : undefined">
      <button type="button" class="steps__dot" :disabled="index + 1 >= current" :aria-label="`Étape ${index + 1} : ${label}${index + 1 < current ? ' (terminée, revenir)' : ''}`" @click="emit('go', index + 1)">
        <Check v-if="index + 1 < current" aria-hidden="true" /><span v-else aria-hidden="true">{{ index + 1 }}</span>
      </button>
      <span class="steps__label">{{ label }}</span>
    </li>
  </ol>
</template>
