<script setup lang="ts">
import { Minus, Plus, Users } from '@lucide/vue'
const props = withDefaults(defineProps<{ modelValue: number; min?: number; max?: number; id?: string; invalid?: boolean; describedby?: string }>(), { min: 2, max: 100, id: 'capacity' })
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const set = (value: number) => emit('update:modelValue', Math.min(props.max, Math.max(props.min, Math.round(value) || props.min)))
</script>
<template>
  <div class="stepper" :class="{ 'is-invalid': invalid }">
    <Users class="stepper__icon" aria-hidden="true" />
    <input :id="id" type="number" inputmode="numeric" :min="min" :max="max" :value="modelValue" :aria-invalid="invalid" :aria-describedby="describedby" @change="set(Number(($event.target as HTMLInputElement).value))" />
    <button type="button" class="stepper__button" :disabled="modelValue <= min" aria-label="Retirer une place" @click="set(modelValue - 1)"><Minus aria-hidden="true" /></button>
    <button type="button" class="stepper__button" :disabled="modelValue >= max" aria-label="Ajouter une place" @click="set(modelValue + 1)"><Plus aria-hidden="true" /></button>
  </div>
</template>
