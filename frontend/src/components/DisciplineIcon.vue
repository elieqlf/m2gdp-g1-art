<script setup lang="ts">
import { computed } from 'vue'
import { Camera, Drama, Ellipsis, Music, Mic, Palette, PenLine, Pencil, PersonStanding, Scissors, Shapes, SprayCan } from '@lucide/vue'
const props = defineProps<{ discipline: string }>()
const icons = { peinture: Palette, dessin: Pencil, musique: Music, chant: Mic, danse: PersonStanding, theatre: Drama, photo: Camera, 'street-art': SprayCan, artisanat: Scissors, ecriture: PenLine, 'arts-plastiques': Shapes, autre: Ellipsis } as const
const component = computed(() => icons[props.discipline as keyof typeof icons] ?? Ellipsis)
</script>
<template><component :is="component" aria-hidden="true" /></template>
