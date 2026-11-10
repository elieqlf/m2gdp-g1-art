<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const palette = ['#ff0000', '#ff6b7a', '#ffb24d', '#ffd85a', '#78c9a4', '#7eb7f2']
const pieces = Array.from({ length: 30 }, (_, index) => ({
  color: palette[index % palette.length],
  left: `${18 + ((index * 29) % 64)}%`,
  drift: `${((index * 47) % 280) - 140}px`,
  fall: `${230 + ((index * 31) % 150)}px`,
  spin: `${((index * 71) % 700) - 350}deg`,
  delay: `${(index % 8) * 28}ms`,
  duration: `${1500 + ((index * 23) % 500)}ms`,
}))

const active = ref(false)
let timeout: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  requestAnimationFrame(() => { active.value = true })
  timeout = setTimeout(() => { active.value = false }, 2400)
})

onBeforeUnmount(() => clearTimeout(timeout))
</script>

<template>
  <div class="confetti-burst" :class="{ 'is-active': active }" aria-hidden="true">
    <span v-for="(piece, index) in pieces" :key="index" :style="{ '--piece-color': piece.color, '--piece-left': piece.left, '--piece-drift': piece.drift, '--piece-fall': piece.fall, '--piece-spin': piece.spin, '--piece-delay': piece.delay, '--piece-duration': piece.duration }"></span>
  </div>
</template>
