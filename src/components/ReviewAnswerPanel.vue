<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import CharacterDetailContent from '../pages/character-detail/components/CharacterDetailContent.vue'
import { useFontStore } from '../stores/fonts'
import { useCharacterLearningStore } from '../stores/characterLearning'
import { reportPersistenceError } from '../database/persistence'
import type { StudyCharacterEntry } from '../study/types'

interface Props {
  character: StudyCharacterEntry
  known: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), { disabled: false })
const emit = defineEmits<{
  (event: 'correct-answer', known: boolean): void
  (event: 'next'): void
}>()
const { currentFont, referenceFont } = storeToRefs(useFontStore())
const learning = useCharacterLearningStore()
const feedback = computed(() => `已选择：${props.known ? '认识' : '不认识'}`)
const correctionLabel = computed(() => props.known ? '改为不认识' : '改为认识')
const correctionAriaLabel = computed(() => `记错了，${correctionLabel.value}`)

function handleCorrection(): void {
  if (!props.disabled) emit('correct-answer', !props.known)
}
function handleNext(): void {
  if (!props.disabled) emit('next')
}
function handleToggleFavorite(): void {
  try { learning.toggleFavorite(props.character.id) }
  catch (error) { reportPersistenceError(error) }
}
</script>

<template>
  <view class="review-answer-panel">
    <view class="review-feedback" role="status" aria-live="polite">{{ feedback }}</view>
    <scroll-view :key="character.id" class="review-answer-details" scroll-y :bounces="false">
      <view class="review-detail-body" role="region" tabindex="0" aria-label="本字详情">
        <CharacterDetailContent :character="character" :learning-font="currentFont" :reference-font="referenceFont"
          can-favorite :is-favorite="learning.isFavorite(character.id)" @toggle-favorite="handleToggleFavorite" />
      </view>
    </scroll-view>
    <view class="review-detail-actions">
      <button class="review-detail-button correction-button" role="button" :aria-label="correctionAriaLabel" :tabindex="disabled ? -1 : 0" :disabled="disabled" @click="handleCorrection" @keydown.enter.prevent="handleCorrection" @keydown.space.prevent="handleCorrection">{{ correctionLabel }}</button>
      <button class="review-detail-button next-button" role="button" :tabindex="disabled ? -1 : 0" :disabled="disabled" @click="handleNext" @keydown.enter.prevent="handleNext" @keydown.space.prevent="handleNext">下一字</button>
    </view>
  </view>
</template>

<style scoped>
.review-answer-panel { flex: 1; min-height: 0; display: flex; flex-direction: column; color: var(--color-text); text-align: left; }
.review-feedback { flex: none; padding: 4px 20px 8px; font-size: 14px; font-weight: 600; line-height: 1.6; }
.review-answer-details { flex: 1; min-height: 0; overflow: hidden; }
.review-detail-actions { flex: none; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 20px calc(24px + env(safe-area-inset-bottom)); background: var(--color-page); }
.review-detail-button { min-width: 0; min-height: 56px; width: 100%; display: flex; align-items: center; justify-content: center; margin: 0; padding: 10px 12px; border-radius: 12px; font-size: 14px; line-height: 1.5; }
.review-detail-button::after { border: 0; }
.correction-button { background: var(--color-surface-muted); color: var(--color-text); }
.next-button { background: var(--color-primary); color: var(--color-on-primary); font-weight: 600; }
.review-detail-button:focus-visible, .review-detail-body:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -3px; }
.review-detail-button:active { opacity: .8; }
.review-detail-button[disabled] { opacity: .55; }
</style>
