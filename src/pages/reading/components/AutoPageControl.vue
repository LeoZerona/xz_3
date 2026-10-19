<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  (event: 'close'): void
}>()

const durationPresets = [5, 10, 20, 30, 60] as const
const draftSeconds = ref(String(props.seconds))
const isActive = computed(() => props.isRunning || props.isPaused)
watch(() => props.seconds, (seconds) => { draftSeconds.value = String(seconds) })

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
  draftSeconds.value = String(value)
}

function commitSeconds() {
  const seconds = normalizeAutoPageSeconds(draftSeconds.value)
  draftSeconds.value = String(seconds)
  emit('update:seconds', seconds)
}

function handlePreset(seconds: number) {
  draftSeconds.value = String(seconds)
  commitSeconds()
}

function handleStep(delta: number) {
  handlePreset(normalizeAutoPageSeconds(Number(draftSeconds.value) + delta))
}

function handleToggleKeydown() {
  if (!props.disabled) emit('toggle')
}
</script>

<template>
  <view class="auto-page-control" role="region" aria-label="自动翻页设置">
    <view class="control-head">
      <view class="control-copy">
        <text class="control-title">倒计时自动翻页</text>
        <text class="control-description">按你的节奏，读完一页再翻页</text>
      </view>
      <button class="panel-close" role="button" tabindex="0" aria-label="收起自动翻页" @click="emit('close')" @keydown.enter="emit('close')" @keydown.space.prevent="emit('close')">×</button>
    </view>

    <view class="duration-row">
      <text class="duration-label">每页停留</text>
      <view class="duration-field">
        <button class="step-button" role="button" tabindex="0" aria-label="减少五秒" :disabled="seconds <= MIN_AUTO_PAGE_SECONDS" @click="handleStep(-5)" @keydown.enter="handleStep(-5)" @keydown.space.prevent="handleStep(-5)">−</button>
        <input
          class="duration-input"
          type="number"
          inputmode="numeric"
          :min="MIN_AUTO_PAGE_SECONDS"
          :max="MAX_AUTO_PAGE_SECONDS"
          :value="draftSeconds"
          aria-label="每页阅读秒数"
          @input="handleSecondsInput"
          @blur="commitSeconds"
          @confirm="commitSeconds"
        />
        <text class="duration-unit">秒</text>
        <button class="step-button" role="button" tabindex="0" aria-label="增加五秒" :disabled="seconds >= MAX_AUTO_PAGE_SECONDS" @click="handleStep(5)" @keydown.enter="handleStep(5)" @keydown.space.prevent="handleStep(5)">+</button>
      </view>
    </view>

    <view class="duration-presets" aria-label="常用翻页间隔">
      <button v-for="preset in durationPresets" :key="preset" class="preset-button" role="button" tabindex="0" :class="{ 'is-selected': seconds === preset }" :aria-pressed="seconds === preset" @click="handlePreset(preset)" @keydown.enter="handlePreset(preset)" @keydown.space.prevent="handlePreset(preset)">{{ preset }} 秒</button>
    </view>

    <view class="control-actions">
      <view class="countdown-copy">
        <text class="countdown-value">{{ isActive ? remainingSeconds : seconds }}<text class="countdown-unit"> 秒</text></text>
        <text class="control-status" aria-live="polite">{{ statusLabel }}</text>
      </view>
      <button
        class="toggle-button"
        role="button"
        tabindex="0"
        :class="{ 'is-running': isRunning, 'is-paused': isPaused }"
        :disabled="disabled"
        :aria-pressed="isActive"
        @click="emit('toggle')"
        @keydown.enter="handleToggleKeydown"
        @keydown.space.prevent="handleToggleKeydown"
      >
        {{ toggleLabel }}
      </button>
      <button v-if="isActive" class="stop-button" role="button" tabindex="0" aria-label="停止自动阅读" @click="emit('stop')" @keydown.enter="emit('stop')" @keydown.space.prevent="emit('stop')">停止</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.auto-page-control {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface-muted);
}
.control-head, .duration-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.panel-close { flex: none; width: 36px; height: 36px; margin: 0; border-radius: 50%; background: var(--color-surface); color: var(--color-text-secondary); font-size: 22px; line-height: 36px; }
.control-description { font-size: 11px; color: var(--color-text-secondary); }
.duration-label { font-size: 12px; color: var(--color-text-secondary); }
.duration-presets { display: flex; gap: 6px; }
.preset-button { flex: 1; min-width: 0; height: 34px; margin: 0; padding: 0 2px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); font-size: 11px; line-height: 32px; color: var(--color-text-secondary); }
.preset-button.is-selected { border-color: var(--color-primary); background: var(--color-primary-soft); color: var(--color-primary); font-weight: 700; }
.step-button { flex: none; width: 36px; height: 38px; margin: 0; padding: 0; font-size: 20px; line-height: 38px; color: var(--color-text); background: var(--color-surface); }
button:focus-visible, input:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.control-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.control-title { color: var(--color-text); font-size: 14px; font-weight: 700; }
.control-status { color: var(--color-text-muted); font-size: 10px; }

.duration-field {
  flex: none;
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.duration-input {
  width: 52px;
  height: 38px;
  padding: 0 4px;
  color: var(--color-text);
  background: transparent;
  font-size: 16px;
  font-weight: 700;
  text-align: right;
}

.duration-unit {
  padding-right: 10px;
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

.control-actions { display: flex; align-items: center; gap: 8px; padding-top: 12px; border-top: 1px solid var(--color-border); }
.countdown-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.countdown-value { color: var(--color-text); font-size: 22px; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; }
.countdown-unit { color: var(--color-text-secondary); font-size: 11px; font-weight: 400; }
.stop-button { height: 36px; margin: 0; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 9px; background: var(--color-surface-muted); color: var(--color-text-secondary); font-size: 11px; font-weight: 700; line-height: 34px; }
.stop-button::after { border: 0; }

</style>
