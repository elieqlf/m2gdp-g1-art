<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ name?: string; photo?: string; size?: 'xs' | 'sm' | 'md' | 'lg' }>()
const initials = computed(() => (props.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?')
// Teinte stable par personne, choisie dans la palette de la charte.
const tone = computed(() => [...(props.name || '')].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 3)
const validPhoto = computed(() => !!props.photo && /^https?:\/\//i.test(props.photo))
</script>
<template>
  <img v-if="validPhoto" :src="photo" alt="" class="user-avatar" :class="`user-avatar--${size || 'sm'}`" referrerpolicy="no-referrer" />
  <span v-else class="user-avatar user-avatar--initials" :class="[`user-avatar--${size || 'sm'}`, `user-avatar--tone-${tone}`]" aria-hidden="true">{{ initials }}</span>
</template>
