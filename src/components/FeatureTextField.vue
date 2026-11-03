<script setup lang="ts">
import { Field as VantField } from 'vant'

withDefaults(defineProps<{
  modelValue: string
  label: string
  placeholder?: string
  maxlength?: number
  multiline?: boolean
  hideLabel?: boolean
  disabled?: boolean
  type?: 'text' | 'number'
}>(), { placeholder: '', maxlength: 500, multiline: false, hideLabel: false, disabled: false, type: 'text' })
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()
function handleUpdate(value: string | number): void { emit('update:modelValue', String(value)) }
</script>

<template>
  <div class="feature-text-field" :class="{ 'hide-label': hideLabel }">
    <VantField :model-value="modelValue" :label="label" :placeholder="placeholder || (hideLabel ? label : '')" :maxlength="maxlength"
      :type="multiline ? 'textarea' : type" :rows="multiline ? 4 : undefined" :disabled="disabled" :border="false"
      @update:model-value="handleUpdate" />
  </div>
</template>

<style scoped>
.feature-text-field { margin-bottom: 18px; }
.feature-text-field :deep(.van-cell) { display: block; padding: 0; background: transparent; color: var(--color-text); }
.feature-text-field :deep(.van-cell::after) { display: none; }
.feature-text-field :deep(.van-field__label) { width: auto; margin: 0 0 9px; font-size: 13px; color: var(--color-text); }
.feature-text-field :deep(.van-field__body) { min-height: 44px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-surface-muted); }
.feature-text-field :deep(.van-field__control) { color: var(--color-text); font-size: 14px; line-height: 1.6; }
.feature-text-field :deep(textarea.van-field__control) { min-height: 90px; }
.feature-text-field :deep(.van-field__control:focus-visible) { outline: 2px solid var(--color-primary); outline-offset: 3px; }
.feature-text-field.hide-label :deep(.van-field__label) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
