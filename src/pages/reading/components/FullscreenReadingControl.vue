<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ReferenceRevealMode } from '../../../reading/types'

interface Props {
  hideReferenceText: boolean
  mode: ReferenceRevealMode
  revealedCount: number
  totalCount: number
  disabled: boolean
  pageLabel: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (event: 'mode-change', mode: ReferenceRevealMode): void
  (event: 'reveal-next'): void
  (event: 'reset'): void
  (event: 'toggle-reference'): void
  (event: 'open-menu'): void
}>()

const isCollapsed = ref(false)
const collapseLabel = computed(() => isCollapsed.value ? '展开底部快捷栏' : '收起底部快捷栏')
const isComplete = computed(() => props.totalCount > 0 && props.revealedCount >= props.totalCount)
const canReveal = computed(() => !props.disabled && props.revealedCount < props.totalCount)
const canReset = computed(() => !props.disabled && props.revealedCount > 0)
const nextMode = computed<ReferenceRevealMode>(() => props.mode === 'row' ? 'character' : 'row')
const modeLabel = computed(() => props.mode === 'row' ? '逐行' : '逐字')
const modeSwitchLabel = computed(() => props.mode === 'row' ? '切换为逐字展示' : '切换为逐行展示')
const nextLabel = computed(() => props.mode === 'row' ? '全屏显示下一行' : '全屏显示下一个字')
const nextText = computed(() => {
  if (isComplete.value) return '本页完成'
  return props.mode === 'row' ? '下一行' : '下一个字'
})

function handleKeydown(event: KeyboardEvent): void {
  event.stopPropagation()
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('open-menu')
  }
}

function handleRevealNext(): void {
  if (canReveal.value) emit('reveal-next')
}

function handleReset(): void {
  if (canReset.value) emit('reset')
}

function handleReferenceToggle(): void {
  if (!props.disabled) emit('toggle-reference')
}

function handleCollapseToggle(): void {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <view
    class="fullscreen-reading-control"
    :class="{ 'is-collapsed': isCollapsed }"
    role="group"
    aria-label="全屏阅读快捷操作"
    @click.stop
    @touchstart.stop
    @touchmove.stop
    @touchend.stop
    @touchcancel.stop
    @keydown="handleKeydown"
  >
    <template v-if="!isCollapsed && hideReferenceText">
      <button
        class="fullscreen-mode"
        role="button"
        tabindex="0"
        :aria-label="modeSwitchLabel"
        @click="emit('mode-change', nextMode)"
        @keydown.enter.prevent="emit('mode-change', nextMode)"
        @keydown.space.prevent
        @keyup.space.prevent="emit('mode-change', nextMode)"
      >{{ modeLabel }}<text class="mode-switch-icon" aria-hidden="true">⇄</text></button>
      <button
        class="fullscreen-next"
        role="button"
        :tabindex="canReveal ? 0 : -1"
        :disabled="!canReveal"
        :aria-disabled="!canReveal"
        :aria-label="nextLabel"
        @click="handleRevealNext"
        @keydown.enter.prevent="handleRevealNext"
        @keydown.space.prevent
        @keyup.space.prevent="handleRevealNext"
      >
        <text>{{ nextText }}</text>
        <text class="fullscreen-reveal-progress" role="status" aria-live="polite">{{ revealedCount }} / {{ totalCount }}</text>
      </button>
      <button
        class="fullscreen-reset"
        role="button"
        :tabindex="canReset ? 0 : -1"
        :disabled="!canReset"
        :aria-disabled="!canReset"
        aria-label="全屏重新隐藏"
        @click="handleReset"
        @keydown.enter.prevent="handleReset"
        @keydown.space.prevent
        @keyup.space.prevent="handleReset"
      ><text aria-hidden="true">↺</text></button>
    </template>
    <template v-else-if="!isCollapsed">
      <text class="fullscreen-page-label">{{ pageLabel }}</text>
      <button
        class="fullscreen-hide"
        role="button"
        :tabindex="disabled ? -1 : 0"
        :disabled="disabled"
        :aria-disabled="disabled"
        aria-label="全屏隐藏对照文字"
        @click="handleReferenceToggle"
        @keydown.enter.prevent="handleReferenceToggle"
        @keydown.space.prevent
        @keyup.space.prevent="handleReferenceToggle"
      >隐藏对照</button>
    </template>
    <button
      v-if="!isCollapsed"
      class="fullscreen-menu"
      role="button"
      tabindex="0"
      aria-label="打开阅读菜单"
      @click="emit('open-menu')"
      @keydown.enter.prevent="emit('open-menu')"
      @keydown.space.prevent
      @keyup.space.prevent="emit('open-menu')"
    ><text aria-hidden="true">☰</text></button>
    <button
      class="fullscreen-collapse"
      role="button"
      tabindex="0"
      :aria-label="collapseLabel"
      :aria-expanded="!isCollapsed"
      :title="collapseLabel"
      @click="handleCollapseToggle"
      @keydown.enter.prevent="handleCollapseToggle"
      @keydown.space.prevent
      @keyup.space.prevent="handleCollapseToggle"
    ><text aria-hidden="true">{{ isCollapsed ? '⌃' : '⌄' }}</text></button>
  </view>
</template>

<style scoped lang="scss">
.fullscreen-reading-control { flex: none; display: flex; align-items: center; gap: 6px; height: 44px; }
// 保留原有占位，收起时不改变分页和已经展示的文字。
.fullscreen-reading-control.is-collapsed { justify-content: flex-end; }
button { display: flex; align-items: center; justify-content: center; flex: none; min-width: 44px; height: 44px; margin: 0; padding: 0 8px; border-radius: 10px; background: var(--color-surface-muted); color: var(--color-text-secondary); font-size: 12px; line-height: 1.3; }
button::after { border: 0; }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
button[aria-disabled='true'] { opacity: 0.45; background: var(--color-surface-muted); color: var(--color-text-secondary); }
.fullscreen-mode { gap: 4px; }
.mode-switch-icon { font-size: 11px; color: var(--color-text-muted); }
.fullscreen-next { flex: 1; min-width: 0; gap: 8px; background: var(--color-primary-soft); color: var(--color-primary); font-weight: 600; }
.fullscreen-reveal-progress { font-size: 10px; font-weight: 400; white-space: nowrap; }
.fullscreen-reset { font-size: 22px; }
.fullscreen-menu { font-size: 18px; }
.fullscreen-collapse { font-size: 20px; }
.fullscreen-page-label { flex: 1; min-width: 0; color: var(--color-text-muted); font-size: 11px; }
.fullscreen-hide { color: var(--color-primary); background: var(--color-primary-soft); }
@media (max-width: 480px) {
  .fullscreen-next { flex-direction: column; gap: 0; }
}
</style>
