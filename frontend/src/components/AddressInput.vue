<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { suggestAddresses, resolveAddress, type Prediction, type AddressSelection } from '@/services/places'
const props = withDefaults(defineProps<{ modelValue: string; inputId?: string; placeholder?: string }>(), { inputId: 'address', placeholder: 'Commence à saisir ton adresse' })
const emit = defineEmits<{ 'update:modelValue': [value: string]; select: [value: AddressSelection | null] }>()
const predictions = ref<Prediction[]>([])
const active = ref(-1)
const hint = ref('')
const loading = ref(false)
let session = crypto.randomUUID()
let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
let revision = 0
function cancel() {
  clearTimeout(timer)
  controller?.abort()
  revision++
  loading.value = false
}
function close() { cancel(); predictions.value = []; active.value = -1 }
function input(value: string | number) {
  const query = String(value)
  cancel()
  emit('update:modelValue', query)
  emit('select', null)
  predictions.value = []
  active.value = -1
  hint.value = ''
  if (query.trim().length < 3) return
  const requestRevision = revision
  timer = setTimeout(async () => {
    controller = new AbortController()
    loading.value = true
    try {
      const results = await suggestAddresses(query.trim(), session, controller.signal)
      if (requestRevision === revision) predictions.value = results
    } catch {
      if (requestRevision === revision) hint.value = 'Suggestions indisponibles. Tu peux saisir ton adresse manuellement.'
    } finally {
      if (requestRevision === revision) loading.value = false
    }
  }, 300)
}
async function choose(prediction: Prediction) {
  close()
  const selectedRevision = revision
  const usedSession = session
  session = crypto.randomUUID()
  emit('update:modelValue', prediction.text.text)
  emit('select', null)
  const selected = await resolveAddress(prediction, usedSession)
  if (selectedRevision === revision) emit('select', selected)
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
  if (!predictions.value.length) return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = (active.value + (event.key === 'ArrowDown' ? 1 : -1) + predictions.value.length) % predictions.value.length
  }
  if (event.key === 'Enter' && active.value >= 0) {
    event.preventDefault()
    const prediction = predictions.value[active.value]
    if (prediction) void choose(prediction)
  }
}
// A parent may reset the form while a request is pending.
watch(() => props.modelValue, value => { if (!value) close() })
onBeforeUnmount(cancel)
</script>

<template>
  <div @focusout="event => { if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) close() }">
    <div class="relative">
      <Input :id="inputId" :model-value="modelValue" :placeholder="placeholder" autocomplete="off" role="combobox" aria-autocomplete="list" :aria-controls="`${inputId}-options`" :aria-expanded="predictions.length > 0" :aria-activedescendant="active >= 0 ? `${inputId}-option-${active}` : undefined" :aria-describedby="`${inputId}-hint`" @update:model-value="input" @keydown="keydown" />
      <div v-if="predictions.length" class="absolute z-20 mt-1 w-full rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
        <ul :id="`${inputId}-options`" role="listbox" aria-label="Suggestions d’adresse" class="max-h-56 overflow-auto">
          <li v-for="(prediction, index) in predictions" :id="`${inputId}-option-${index}`" :key="prediction.placeId" role="option" :aria-selected="active === index" class="cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-accent" :class="{ 'bg-accent': active === index }" @mousedown.prevent @click="choose(prediction)">{{ prediction.text.text }}</li>
        </ul>
        <p class="border-t px-3 py-2 text-right text-xs text-muted-foreground">Powered by Google</p>
      </div>
    </div>
    <p :id="`${inputId}-hint`" class="mt-2 text-xs text-muted-foreground" aria-live="polite">{{ loading ? 'Recherche d’adresses…' : hint || 'Choisis une suggestion ou saisis ton adresse.' }}</p>
  </div>
</template>
