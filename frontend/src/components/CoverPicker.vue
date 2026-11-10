<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, Upload, X } from '@lucide/vue'
import { imageUploadError, prepareImageUpload } from '@/lib/image-upload'

const props = defineProps<{ modelValue: string; invalid?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const input = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const error = ref('')

async function chooseImage(event: Event) {
  const picker = event.target as HTMLInputElement
  const file = picker.files?.[0]
  picker.value = ''
  error.value = ''
  if (!file) return
  busy.value = true
  try {
    emit('update:modelValue', await prepareImageUpload(file, 'activity'))
  } catch (cause) {
    error.value = imageUploadError(cause, 'activity')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="cover-picker">
    <div class="cover-picker__preview" :class="{ 'is-empty': !props.modelValue, 'is-invalid': invalid }">
      <img v-if="props.modelValue" :src="props.modelValue" alt="Aperçu de la photo de l’activité" />
      <div v-else class="cover-picker__empty"><ImagePlus aria-hidden="true" /><span>Aucune photo ajoutée</span></div>
      <button v-if="props.modelValue" type="button" class="cover-picker__clear" aria-label="Retirer la photo" @click="emit('update:modelValue', '')"><X aria-hidden="true" /></button>
    </div>
    <input ref="input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" @change="chooseImage" />
    <button type="button" class="cover-picker__upload" :disabled="busy" :aria-busy="busy" @click="input?.click()">
      <Upload aria-hidden="true" />
      <span>{{ busy ? 'Préparation de la photo…' : props.modelValue ? 'Choisir une autre photo' : 'Choisir dans la galerie ou les fichiers' }}</span>
    </button>
    <p class="cover-picker__hint">JPG, PNG, WebP ou AVIF · 15 Mo maximum. L’image est optimisée avant l’enregistrement. Choisis une photo que tu as le droit de partager.</p>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
  </div>
</template>
