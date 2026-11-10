<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ImagePlus, Link } from '@lucide/vue'
import { defaultCover, disciplineLabel, disciplines } from '@/lib/activity'
import { toCoverImage } from '@/lib/image'
import { idToken } from '@/services/firebase'
import { isUploadedFile, uploadCover, UploadError, uploadsEnabled } from '@/services/uploads'

// Photo principale : photo de l'organisateur (stockée dans Cloudflare R2), illustrations
// NOVART par discipline, ou lien vers une photo en ligne.
const props = defineProps<{ modelValue: string; discipline: string; invalid?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const showAll = ref(false)
const isLink = computed(() => /^https?:\/\//i.test(props.modelValue) && !isUploadedFile(props.modelValue))
const uploaded = computed(() => isUploadedFile(props.modelValue))
const canUpload = uploadsEnabled()
const uploading = ref(false)
const uploadError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const UPLOAD_ERRORS: Record<string, string> = {
  'unsupported-type': 'Ce fichier n’est pas une image prise en charge (JPEG, PNG ou WebP).',
  'too-large': 'Cette photo est trop lourde, même réduite. Essaie avec une autre.',
  'too-many-requests': 'Tu as envoyé beaucoup de photos d’affilée. Réessaie dans un moment.',
  unauthenticated: 'Ta session a expiré. Reconnecte-toi puis réessaie.',
  network: 'Envoi impossible : vérifie ta connexion et réessaie.',
}
async function choosePhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploadError.value = ''
  if (!file.type.startsWith('image/')) { uploadError.value = UPLOAD_ERRORS['unsupported-type']!; return }
  uploading.value = true
  try {
    const image = await toCoverImage(file)
    emit('update:modelValue', await uploadCover(image, await idToken()))
  } catch (cause) {
    const code = cause instanceof UploadError ? cause.code : cause instanceof Error && cause.message === 'invalid-image' ? 'unsupported-type' : ''
    uploadError.value = UPLOAD_ERRORS[code] ?? 'La photo n’a pas pu être envoyée. Réessaie, ou choisis une illustration.'
  } finally { uploading.value = false }
}
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
      <span v-if="uploading" class="cover-picker__busy" role="status"><span class="spinner" aria-hidden="true"></span>Envoi de ta photo…</span>
    </div>
    <template v-if="canUpload">
      <input id="cover-file" ref="fileInput" class="sr-only" type="file" accept="image/*" :disabled="uploading" @change="choosePhoto" />
      <button type="button" class="btn btn--outline btn--wide cover-picker__upload" :class="{ 'is-selected': uploaded }" :disabled="uploading" @click="fileInput?.click()">
        <ImagePlus aria-hidden="true" />{{ uploading ? 'Envoi en cours…' : uploaded ? 'Changer ma photo' : 'Importer ma photo' }}
      </button>
      <p v-if="uploadError" class="form-alert" role="alert">{{ uploadError }}</p>
      <p class="field-hint">Ta photo est recadrée au format de la carte (16:10). Ou choisis une illustration NOVART :</p>
    </template>
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
