<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
// Confirmation dans l'interface (pas de fenêtre native) pour les actions irréversibles.
defineProps<{ title: string; text: string; confirmLabel: string; busy?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const cancelButton = ref<HTMLButtonElement | null>(null)
const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') emit('cancel') }
onMounted(async () => { document.addEventListener('keydown', onKey); await nextTick(); cancelButton.value?.focus() })
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>
<template>
  <div class="sheet-backdrop sheet-backdrop--center" @click.self="emit('cancel')">
    <section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text">
      <h2 id="confirm-title">{{ title }}</h2>
      <p id="confirm-text">{{ text }}</p>
      <div class="dialog__actions">
        <button ref="cancelButton" type="button" class="btn btn--outline" @click="emit('cancel')">Annuler</button>
        <button type="button" class="btn btn--danger" :disabled="busy" @click="emit('confirm')">{{ busy ? 'Un instant…' : confirmLabel }}</button>
      </div>
    </section>
  </div>
</template>
