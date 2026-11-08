<script setup lang="ts">
import DisciplineIcon from './DisciplineIcon.vue'
import { disciplineLabel } from '@/lib/activity'
defineProps<{ discipline: string; overlay?: boolean }>()
</script>
<template>
  <span class="discipline-badge" :class="{ 'discipline-badge--overlay': overlay }"><DisciplineIcon :discipline="discipline" />{{ disciplineLabel(discipline) }}</span>
</template>
