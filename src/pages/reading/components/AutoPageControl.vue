<script setup lang="ts">
import { computed } from 'vue'
import { MAX_AUTO_PAGE_SECONDS, MIN_AUTO_PAGE_SECONDS, normalizeAutoPageSeconds } from '../../../reading/readingStorage'

interface Props {
  seconds: number
  progress: number
  isRunning: boolean
  isPaused?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPaused: false,
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:seconds', value: number): void
  (event: 'toggle'): void
  (event: 'stop'): void
}>()

const isActive = computed(() => props.isRunning || props.isPaused)

const remainingSeconds = computed(() => {
  const remaining = props.seconds * (1 - Math.min(1, Math.max(0, props.progress)))
  return Math.max(0, Math.ceil(remaining))
})

const statusLabel = computed(() => {
  if (props.isPaused) return `已暂停 · 剩余 ${remainingSeconds.value} 秒`
  if (!props.isRunning) return '自动翻页未开启'
  return `${remainingSeconds.value} 秒后翻页`
})

const toggleLabel = computed(() => {
  if (props.isPaused) return '继续'
  return props.isRunning ? '暂停' : '开始'
})

function handleSecondsInput(event: Event) {
  const inputEvent = event as Event & { detail?: { value?: string | number } }
  const input = event.target as HTMLInputElement | null
  const value = inputEvent.detail?.value ?? input?.value ?? props.seconds
  emit('update:seconds', normalizeAutoPageSeconds(value))
}
</script>

<template>
  <view class="auto-page-control" aria-label="自动翻页设置">
    <view class="control-copy">
      <text class="control-title">倒计时自动翻页</text>
      <text class="control-status" aria-live="polite">{{ statusLabel }}</text>
    </view>

    <view class="duration-field">
      <input
        class="duration-input"
        type="number"
        inputmode="numeric"
        :min="MIN_AUTO_PAGE_SECONDS"
        :max="MAX_AUTO_PAGE_SECONDS"
        :value="String(seconds)"
        aria-label="每页阅读秒数"
        @change="handleSecondsInput"
        @blur="handleSecondsInput"
      />
      <text class="duration-unit">秒/页</text>
    </view>

    <view class="control-actions">
      <button
        class="toggle-button"
        :class="{ 'is-running': isRunning, 'is-paused': isPaused }"
        :disabled="disabled"
        :aria-pressed="isActive"
        @click="emit('toggle')"
      >
        {{ toggleLabel }}
      </button>
      <button v-if="isActive" class="stop-button" aria-label="停止自动阅读" @click="emit('stop')">停止</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.auto-page-control {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.control-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.control-title { color: var(--color-text); font-size: 12px; font-weight: 700; }
.control-status { color: var(--color-text-muted); font-size: 10px; }

.duration-field {
  flex: none;
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-muted);
}

.duration-input {
  width: 58px;
  height: 34px;
  padding: 0 6px 0 10px;
  color: var(--color-text);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}

.duration-unit {
  padding-right: 9px;
  color: var(--color-text-muted);
  font-size: 10px;
  white-space: nowrap;
}

.toggle-button {
  min-width: 66px;
  height: 36px;
  margin: 0;
  padding: 0 14px;
  border-radius: 9px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 11px;
  font-weight: 700;
  line-height: 36px;
}

.toggle-button.is-running { background: var(--color-text-secondary); }
.toggle-button.is-paused { background: var(--color-primary); }
.toggle-button[disabled] { opacity: 0.45; cursor: not-allowed; }
.toggle-button::after { border: 0; }

.control-actions { flex: none; display: flex; align-items: center; gap: 6px; }
.stop-button { height: 36px; margin: 0; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 9px; background: var(--color-surface-muted); color: var(--color-text-secondary); font-size: 11px; font-weight: 700; line-height: 34px; }
.stop-button::after { border: 0; }

@media (max-width: 430px) {
  .auto-page-control { flex-wrap: wrap; gap: 8px; }
  .control-copy { flex-basis: 100%; }
  .duration-field { flex: 1; }
  .duration-input { flex: 1; width: 48px; }
  .control-actions { flex: none; }
}
</style>
