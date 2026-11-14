<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
// Confirmation dans l'interface (pas de fenêtre native) pour les actions irréversibles.
const props = defineProps<{ title: string; text: string; confirmLabel: string; busy?: boolean; confirmDisabled?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const cancelButton = ref<HTMLButtonElement | null>(null)
let previousFocus: HTMLElement | null = null
const panel = ref<HTMLElement | null>(null)
const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && !props.busy) { emit('cancel'); return }
  if (event.key !== 'Tab' || !panel.value) return
  const focusable = [...panel.value.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
  if (!focusable.length) { event.preventDefault(); return }
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
onMounted(async () => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.addEventListener('keydown', onKey)
  await nextTick()
  cancelButton.value?.focus()
})
watch(() => props.busy, async busy => { if (busy) { await nextTick(); panel.value?.focus() } })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); previousFocus?.focus() })
</script>
<template>
  <div class="sheet-backdrop sheet-backdrop--center" @click.self="!busy && emit('cancel')">
    <section ref="panel" class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text" tabindex="-1">
      <h2 id="confirm-title">{{ title }}</h2>
      <p id="confirm-text">{{ text }}</p>
      <slot />
      <div class="dialog__actions">
        <button ref="cancelButton" type="button" class="btn btn--outline" :disabled="busy" @click="emit('cancel')">Annuler</button>
        <button type="button" class="btn btn--danger" :disabled="busy || confirmDisabled" @click="emit('confirm')">{{ busy ? 'Un instant…' : confirmLabel }}</button>
      </div>
    </section>
  </div>
</template>
