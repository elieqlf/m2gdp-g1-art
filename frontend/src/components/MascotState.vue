<script setup lang="ts">
// État vide ou d'erreur illustré par la mascotte officielle (maquettes 10 et 26).
defineProps<{ title: string; text?: string; mascot?: 'joy' | 'welcome' }>()
</script>
<template>
  <section class="mascot-state" role="status">
    <img :src="mascot === 'welcome' ? '/images/novart-mascot-welcome.webp' : '/images/novart-mascot-joy.webp'" alt="" class="mascot-state__image" :class="{ 'mascot-state__image--wide': mascot === 'welcome' }" />
    <h2>{{ title }}</h2>
    <p v-if="text">{{ text }}</p>
    <div class="mascot-state__actions"><slot /></div>
  </section>
</template>
