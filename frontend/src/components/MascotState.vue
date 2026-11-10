<script setup lang="ts">
// État vide ou d'erreur illustré avec les visuels haute définition déjà utilisés dans l’onboarding.
defineProps<{ title: string; text?: string; mascot?: 'joy' | 'welcome' }>()
</script>
<template>
  <section class="mascot-state" role="status">
    <img :src="mascot === 'welcome' ? '/images/novart-mascot-login.webp' : '/images/novart-onboarding-complete-hd.webp'" alt="" class="mascot-state__image" :class="{ 'mascot-state__image--wide': mascot === 'welcome' }" :width="mascot === 'welcome' ? 1520 : 1536" :height="mascot === 'welcome' ? 1035 : 1024" decoding="async" />
    <h2>{{ title }}</h2>
    <p v-if="text">{{ text }}</p>
    <div class="mascot-state__actions"><slot /></div>
  </section>
</template>
