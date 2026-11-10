<script setup lang="ts">
import { computed } from 'vue'
import { demoProfilePhoto, isValidProfilePhoto } from '@/lib/member-photos'
const props = defineProps<{ name?: string; photo?: string; userId?: string; size?: 'xs' | 'sm' | 'md' | 'lg' }>()
const initials = computed(() => (props.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?')
// Teinte stable par personne, choisie dans la palette de la charte.
const tone = computed(() => [...(props.name || '')].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 3)
const resolvedPhoto = computed(() => {
  const demoPhoto = demoProfilePhoto(props.userId)
  if (demoPhoto) return demoPhoto
  if (props.photo && isValidProfilePhoto(props.photo)) return props.photo
  return ''
})
</script>
<template>
  <img v-if="resolvedPhoto" :src="resolvedPhoto" alt="" class="user-avatar" :class="`user-avatar--${size || 'sm'}`" referrerpolicy="no-referrer" loading="lazy" decoding="async" />
  <span v-else class="user-avatar user-avatar--initials" :class="[`user-avatar--${size || 'sm'}`, `user-avatar--tone-${tone}`]" aria-hidden="true">{{ initials }}</span>
</template>
