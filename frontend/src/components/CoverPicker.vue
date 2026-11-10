<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, Upload, X } from '@lucide/vue'
import { imageUploadError, prepareImageUpload } from '@/lib/image-upload'
import { defaultCover, disciplineLabel } from '@/lib/activity'
import { toCoverImage } from '@/lib/image'
import { idToken } from '@/services/firebase'
import { uploadCover, UploadError, uploadsEnabled } from '@/services/uploads'

// Photo principale choisie par l'organisateur (facultative : sans photo, l'illustration
// NOVART de la discipline est affichée). Avec l'API NOVART (Worker), la photo est
// recadrée en 16:10 et stockée dans Cloudflare R2 : le document Firestore ne garde que son
// lien. Sans API configurée, elle est compressée et enregistrée dans le document.
const props = defineProps<{ modelValue: string; discipline?: string; invalid?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const input = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const error = ref('')
const SUPPORTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const MAX_INPUT_BYTES = 15 * 1024 * 1024
const UPLOAD_ERRORS: Record<string, string> = {
  'unsupported-type': 'Utilise une image JPG, PNG, WebP ou AVIF.',
  'too-large': 'Cette photo est trop lourde, même réduite. Essaie avec une autre.',
  'too-many-requests': 'Tu as envoyé beaucoup de photos d’affilée. Réessaie dans un moment.',
  unauthenticated: 'Ta session a expiré. Reconnecte-toi puis réessaie.',
  network: 'Envoi impossible : vérifie ta connexion et réessaie.',
}

async function sendToApi(file: File) {
  if (!SUPPORTED.has(file.type)) throw new UploadError('unsupported-type')
  if (file.size > MAX_INPUT_BYTES) throw new Error('input-too-large')
  return uploadCover(await toCoverImage(file), await idToken())
}

async function chooseImage(event: Event) {
  const picker = event.target as HTMLInputElement
  const file = picker.files?.[0]
  picker.value = ''
  error.value = ''
  if (!file) return
  busy.value = true
  try {
    emit('update:modelValue', uploadsEnabled() ? await sendToApi(file) : await prepareImageUpload(file, 'activity'))
  } catch (cause) {
    const code = cause instanceof UploadError ? cause.code : cause instanceof Error && cause.message === 'invalid-image' ? 'unsupported-type' : ''
    error.value = UPLOAD_ERRORS[code] ?? imageUploadError(cause, 'activity')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="cover-picker">
    <div class="cover-picker__preview" :class="{ 'is-empty': !props.modelValue, 'is-invalid': invalid }">
      <img v-if="props.modelValue" :src="props.modelValue" alt="Aperçu de la photo de l’activité" />
      <template v-else-if="props.discipline">
        <img :src="defaultCover(props.discipline)" :alt="`Illustration NOVART ${disciplineLabel(props.discipline)}`" />
        <span class="cover-picker__default">Illustration utilisée sans photo</span>
      </template>
      <div v-else class="cover-picker__empty"><ImagePlus aria-hidden="true" /><span>Aucune photo ajoutée</span></div>
      <span v-if="busy" class="cover-picker__busy" role="status"><span class="spinner" aria-hidden="true"></span>Envoi de ta photo…</span>
      <button v-if="props.modelValue && !busy" type="button" class="cover-picker__clear" aria-label="Retirer la photo" @click="emit('update:modelValue', '')"><X aria-hidden="true" /></button>
    </div>
    <input ref="input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" @change="chooseImage" />
    <button type="button" class="cover-picker__upload" :disabled="busy" :aria-busy="busy" @click="input?.click()">
      <Upload aria-hidden="true" />
      <span>{{ busy ? 'Préparation de la photo…' : props.modelValue ? 'Choisir une autre photo' : 'Choisir dans la galerie ou les fichiers' }}</span>
    </button>
    <p class="cover-picker__hint">JPG, PNG, WebP ou AVIF · 15 Mo maximum. L’image est recadrée au format de la carte (16:10) et optimisée avant l’enregistrement. Choisis une photo que tu as le droit de partager.</p>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
  </div>
</template>
