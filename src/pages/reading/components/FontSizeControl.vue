<script setup lang="ts">
import { computed } from 'vue'
import { MAX_READING_FONT_SIZE, MIN_READING_FONT_SIZE, READING_FONT_SIZE_PRESETS, normalizeReadingFontSize } from '../../../reading/readingStorage'

interface Props {
  modelValue: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void
}>()

const presets = READING_FONT_SIZE_PRESETS as unknown as number[]
const displaySize = computed(() => normalizeReadingFontSize(props.modelValue))
const canDecrease = computed(() => displaySize.value > MIN_READING_FONT_SIZE)
const canIncrease = computed(() => displaySize.value < MAX_READING_FONT_SIZE)
const sliderProgress = computed(() => ((displaySize.value - MIN_READING_FONT_SIZE) / (MAX_READING_FONT_SIZE - MIN_READING_FONT_SIZE)) * 100)

function emitSize(val: number) {
  emit('update:modelValue', normalizeReadingFontSize(val))
}
function decrease() {
  if (!canDecrease.value) return
  emitSize(displaySize.value - 1)
}
function increase() {
  if (!canIncrease.value) return
  emitSize(displaySize.value + 1)
}
function selectPreset(v: number) {
  emitSize(v)
}
function onSliderInput(e: Event) {
  const target = e.target as HTMLInputElement | null
  const detail = (e as unknown as { detail?: { value?: number | string } }).detail
  const raw = detail?.value ?? target?.value ?? displaySize.value
  emitSize(Number(raw))
}
function onSliderChange(e: Event) {
  onSliderInput(e)
}
</script>

<template>
  <view class="font-size-control" role="group" aria-label="字体大小调节">
    <view class="control-head">
      <text class="control-title">字体大小</text>
      <text class="control-hint">对照阅读 · 12 - 28px</text>
    </view>

    <view class="control-main">
      <view
        class="step-btn step-btn--minus"
        role="button"
        tabindex="0"
        :aria-disabled="!canDecrease"
        :class="{ 'is-disabled': !canDecrease }"
        aria-label="减小字号"
        @click="decrease"
        @keydown.enter="decrease"
        @keydown.space.prevent="decrease"
      >
        <text class="step-text">A-</text>
      </view>

      <view class="slider-wrap">
        <view class="slider-track-bg" aria-hidden="true">
          <view class="slider-track-fill" :style="{ width: sliderProgress + '%' }" />
        </view>
        <slider
          class="font-slider"
          :min="MIN_READING_FONT_SIZE"
          :max="MAX_READING_FONT_SIZE"
          :step="1"
          :value="displaySize"
          :show-value="false"
          activeColor="#6BBE6B"
          backgroundColor="#e8e8ea"
          block-size="20"
          @change="onSliderChange"
          @changing="onSliderInput"
        />
        <input
          class="font-range-fallback"
          type="range"
          :min="MIN_READING_FONT_SIZE"
          :max="MAX_READING_FONT_SIZE"
          step="1"
          :value="String(displaySize)"
          aria-label="字体大小滑块"
          @input="onSliderInput"
          @change="onSliderChange"
        />
      </view>

      <view
        class="step-btn step-btn--plus"
        role="button"
        tabindex="0"
        :aria-disabled="!canIncrease"
        :class="{ 'is-disabled': !canIncrease }"
        aria-label="增大字号"
        @click="increase"
        @keydown.enter="increase"
        @keydown.space.prevent="increase"
      >
        <text class="step-text">A+</text>
      </view>

      <view class="size-badge" aria-live="polite" aria-atomic="true">
        <text class="badge-text">{{ displaySize }}px</text>
      </view>
    </view>

    <view class="preset-row" role="radiogroup" aria-label="预设字号">
      <view
        v-for="preset in presets"
        :key="preset"
        class="preset-chip"
        :class="{ 'is-active': preset === displaySize }"
        role="radio"
        :aria-checked="preset === displaySize"
        tabindex="0"
        @click="selectPreset(preset)"
        @keydown.enter="selectPreset(preset)"
        @keydown.space.prevent="selectPreset(preset)"
      >
        <text class="preset-text">{{ preset }}</text>
      </view>
    </view>

    <view class="preview-row" aria-hidden="true">
      <text class="preview-learn" :style="{ fontSize: displaySize + 'px' }">学习字体预览</text>
      <text class="preview-divider">/</text>
      <text class="preview-ref" :style="{ fontSize: Math.max(11, Math.round(displaySize * 0.875)) + 'px' }">对照字体预览</text>
    </view>
  </view>
</template>
<style scoped lang="scss">
.font-size-control {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 0;
}
.control-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.control-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.02em;
}
.control-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.control-main {
  display: flex;
  align-items: center;
  gap: 10px;
}
.step-btn {
  flex: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
  transition: background 0.18s, transform 0.12s, opacity 0.18s;
  outline: none;
}
.step-btn:active { transform: scale(0.96); filter: brightness(0.96); }
.step-btn:focus-visible { box-shadow: 0 0 0 2px var(--color-primary-soft), 0 0 0 4px var(--color-primary); }
.step-btn.is-disabled { opacity: 0.38; pointer-events: none; }
.step-text { font-size: 13px; font-weight: 800; color: var(--color-text); line-height: 1; }
.slider-wrap {
  flex: 1;
  min-width: 0;
  position: relative;
  display: flex;
  align-items: center;
  height: 36px;
}
.slider-track-bg {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  height: 6px;
  border-radius: 999px;
  background: #e8e8ea;
  overflow: hidden;
  pointer-events: none;
}
.slider-track-fill {
  height: 100%;
  border-radius: 999px;
  background: #6bbe6b;
  transition: width 0.18s ease;
}
.font-slider { flex: 1; width: 100%; margin: 0; position: relative; z-index: 1; }
.font-range-fallback { display: none; flex: 1; width: 100%; accent-color: #6bbe6b; position: relative; z-index: 1; }
.size-badge {
  flex: none;
  min-width: 52px;
  height: 28px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--color-primary-soft);
  border: 1px solid color-mix(in srgb, var(--color-primary) 16%, transparent);
}
.badge-text { font-size: 12px; font-weight: 700; color: var(--color-primary); line-height: 1; }
.preset-row { display: flex; flex-wrap: wrap; gap: 8px; }
.preset-chip {
  min-width: 36px;
  height: 30px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
  transition: background 0.18s, border-color 0.18s, color 0.18s, transform 0.12s;
  outline: none;
}
.preset-chip:active { transform: scale(0.97); }
.preset-chip:focus-visible { box-shadow: 0 0 0 2px var(--color-primary-soft), 0 0 0 4px var(--color-primary); }
.preset-chip.is-active { background: var(--color-primary); border-color: var(--color-primary); }
.preset-chip.is-active .preset-text { color: #fff; }
.preset-text { font-size: 12px; font-weight: 700; color: var(--color-text); line-height: 1; }
.preview-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
}
.preview-learn { font-weight: 600; color: var(--color-text); line-height: 1.4; }
.preview-ref { color: var(--color-text-secondary); line-height: 1.4; }
.preview-divider { color: var(--color-text-muted); font-size: 12px; }
@media (max-width: 430px) {
  .font-slider { display: none; }
  .font-range-fallback { display: block; }
  .control-main { gap: 8px; }
  .step-btn { width: 34px; height: 34px; }
}
@media (prefers-reduced-motion: reduce) {
  .step-btn, .preset-chip, .slider-track-fill { transition: none; }
}
</style>
