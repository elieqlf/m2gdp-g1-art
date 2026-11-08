<script setup lang="ts">
import { computed, ref } from 'vue'
import { Heart } from '@lucide/vue'
import { favorites, toggleFavorite } from '@/lib/store'
const props = defineProps<{ activityId: string; title: string; soft?: boolean }>()
const active = computed(() => favorites.value.includes(props.activityId))
const failed = ref(false)
async function toggle() {
  failed.value = false
  try { await toggleFavorite(props.activityId) } catch { failed.value = true }
}
</script>
<template>
  <button type="button" class="favorite-button" :class="{ 'is-active': active, 'favorite-button--soft': soft }" :aria-pressed="active" :aria-label="active ? `Retirer « ${title} » des favoris` : `Ajouter « ${title} » aux favoris`" :title="failed ? 'Favori non enregistré, réessaie.' : undefined" @click.stop.prevent="toggle">
    <Heart :fill="active ? 'currentColor' : 'none'" aria-hidden="true" />
  </button>
</template>
