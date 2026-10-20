<script setup lang="ts">
import { computed } from 'vue'
import type { ReferenceRevealMode } from '../../../reading/types'

interface Props {
  mode: ReferenceRevealMode
  revealedCount: number
  totalCount: number
  disabled: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (event: 'mode-change', mode: ReferenceRevealMode): void
  (event: 'reveal-next'): void
  (event: 'reset'): void
}>()

const isComplete = computed(() => props.totalCount > 0 && props.revealedCount >= props.totalCount)
const canReveal = computed(() => !props.disabled && props.revealedCount < props.totalCount)
const canReset = computed(() => !props.disabled && props.revealedCount > 0)
const nextLabel = computed(() => props.mode === 'row' ? '显示下一行' : '显示下一个字')
const progressLabel = computed(() => isComplete.value
  ? `本页已全部展示 · ${props.totalCount} 字`
  : `已显示 ${props.revealedCount} / ${props.totalCount} 字`)

function handleRevealNext(): void {
  if (canReveal.value) emit('reveal-next')
}

function handleReset(): void {
  if (canReset.value) emit('reset')
}
</script>

<template>
  <view class="reference-reveal-control" role="group" aria-label="逐步显示对照文字" @click.stop @keydown.stop>
    <view class="reveal-head">
      <view class="reveal-modes" role="group" aria-label="展示方式">
        <button
          class="mode-button"
          role="button"
          tabindex="0"
          :aria-pressed="mode === 'row'"
          @click="emit('mode-change', 'row')"
          @keydown.enter.prevent="emit('mode-change', 'row')"
          @keydown.space.prevent="emit('mode-change', 'row')"
        >逐行</button>
        <button
          class="mode-button"
          role="button"
          tabindex="0"
          :aria-pressed="mode === 'character'"
          @click="emit('mode-change', 'character')"
          @keydown.enter.prevent="emit('mode-change', 'character')"
          @keydown.space.prevent="emit('mode-change', 'character')"
        >逐字</button>
      </view>
      <text class="reveal-progress" role="status" aria-live="polite">{{ progressLabel }}</text>
    </view>
    <view class="reveal-actions">
      <button
        class="reveal-next"
        role="button"
        :tabindex="canReveal ? 0 : -1"
        :disabled="!canReveal"
        :aria-disabled="!canReveal"
        :aria-label="nextLabel"
        @click="handleRevealNext"
        @keydown.enter.prevent="handleRevealNext"
        @keydown.space.prevent="handleRevealNext"
      >{{ isComplete ? '本页展示完毕' : nextLabel }}</button>
      <button
        class="reveal-reset"
        role="button"
        :tabindex="canReset ? 0 : -1"
        :disabled="!canReset"
        :aria-disabled="!canReset"
        @click="handleReset"
        @keydown.enter.prevent="handleReset"
        @keydown.space.prevent="handleReset"
      >重新隐藏</button>
    </view>
    <text class="reveal-hint">按阅读顺序展示 · 翻页后重新隐藏</text>
  </view>
</template>

<style scoped lang="scss">
.reference-reveal-control { display: flex; flex-direction: column; gap: 6px; }
.reveal-head, .reveal-actions { display: flex; align-items: center; gap: 8px; }
.reveal-head { justify-content: space-between; }
.reveal-modes { flex: none; display: flex; padding: 2px; border-radius: 10px; background: var(--color-surface-muted); }
button { min-height: 44px; margin: 0; padding: 0 12px; font-size: 12px; font-weight: 600; line-height: 44px; border-radius: 8px; }
button::after { border: 0; }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -3px; }
button[disabled] { opacity: 0.45; }
.mode-button { color: var(--color-text-secondary); background: transparent; }
.mode-button[aria-pressed='true'] { color: var(--color-primary); background: var(--color-primary-soft); }
.reveal-progress { min-width: 0; color: var(--color-text-secondary); font-size: 11px; text-align: right; }
.reveal-next { flex: 1; color: var(--color-on-primary); background: var(--color-primary); }
.reveal-next[disabled] { color: var(--color-text-secondary); background: var(--color-surface-muted); }
.reveal-reset { flex: none; color: var(--color-text-secondary); background: var(--color-surface-muted); }
.reveal-hint { color: var(--color-text-muted); font-size: 10px; line-height: 16px; text-align: center; }

// 矮屏横屏中减少菜单高度，让首行对照文字留在操作条上方。
@media (max-height: 480px) and (min-width: 560px) {
  .reference-reveal-control { flex-direction: row; align-items: center; gap: 12px; }
  .reveal-head { flex: none; }
  .reveal-actions { flex: 1; min-width: 0; }
  .reveal-hint { display: none; }
}
</style>
