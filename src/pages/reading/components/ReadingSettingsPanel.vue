<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

type SettingsSection = 'table-style' | 'chars-per-line' | 'fonts' | 'auto-page'

interface SettingsItem {
  id: SettingsSection
  name: string
}

const emit = defineEmits<{
  (event: 'close'): void
}>()

const sections: SettingsItem[] = [
  { id: 'table-style', name: '表格样式' },
  { id: 'chars-per-line', name: '每行字数' },
  { id: 'fonts', name: '字体设置' },
  { id: 'auto-page', name: '自动翻页' },
]
const expandedSection = ref<SettingsSection | null>(null)
let previousFocus: HTMLElement | null = null

onMounted(() => {
  if (typeof document === 'undefined') return
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.getElementById('reading-settings-close')?.focus()
})

onBeforeUnmount(() => {
  previousFocus?.focus()
})

function handleSectionToggle(section: SettingsSection): void {
  expandedSection.value = expandedSection.value === section ? null : section
}

function collapseSection(): void {
  const section = expandedSection.value
  expandedSection.value = null
  if (section && typeof document !== 'undefined') {
    document.getElementById(`reading-settings-${section}`)?.focus()
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (expandedSection.value) collapseSection()
    else emit('close')
    return
  }
  if (event.key !== 'Tab' || typeof document === 'undefined') return
  const controls = Array.from(document.querySelectorAll<HTMLElement>(
    '#reading-settings-panel button, #reading-settings-panel input, #reading-settings-panel [tabindex]',
  )).filter((element) => element.tabIndex >= 0 && !element.matches('[disabled]') && element.getClientRects().length > 0)
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
</script>

<template>
  <view class="reader-settings-mask" @click="emit('close')" @keydown.stop="handleKeydown">
    <view
      id="reading-settings-panel"
      class="reader-settings-panel"
      role="dialog"
      aria-modal="true"
      aria-label="阅读设置"
      @click.stop
    >
      <view class="panel-handle" aria-hidden="true" />
      <view class="panel-head">
        <text class="panel-title">阅读设置</text>
        <button
          id="reading-settings-close"
          class="panel-close"
          role="button"
          tabindex="0"
          aria-label="关闭设置"
          @click="emit('close')"
          @keydown.enter="emit('close')"
          @keydown.space.prevent="emit('close')"
        >×</button>
      </view>
      <scroll-view
        class="settings-scroll"
        scroll-y
        :show-scrollbar="false"
        :bounces="false"
        :scroll-into-view="expandedSection ? `reading-settings-${expandedSection}` : ''"
      >
        <view v-for="section in sections" :key="section.id" class="settings-section">
          <button
            :id="`reading-settings-${section.id}`"
            class="settings-section-trigger"
            role="button"
            tabindex="0"
            :class="{ 'is-expanded': expandedSection === section.id }"
            :aria-expanded="expandedSection === section.id"
            :aria-controls="`reading-settings-content-${section.id}`"
            @click="handleSectionToggle(section.id)"
            @keydown.enter="handleSectionToggle(section.id)"
            @keydown.space.prevent="handleSectionToggle(section.id)"
          >
            <text>{{ section.name }}</text>
            <text class="section-chevron" aria-hidden="true">⌄</text>
          </button>
          <view
            v-if="expandedSection === section.id"
            :id="`reading-settings-content-${section.id}`"
            class="settings-section-content"
            role="region"
            :aria-labelledby="`reading-settings-${section.id}`"
          >
            <slot :name="section.id" :collapse="collapseSection" />
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.reader-settings-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(32 36 45 / 42%);
  animation: settingsMaskIn 180ms ease-out;
}

.reader-settings-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 760px;
  max-height: calc(100% - var(--app-top-safe-area) - 16px);
  max-height: min(76vh, calc(100% - var(--app-top-safe-area) - 16px));
  padding: 10px 0 calc(8px + env(safe-area-inset-bottom));
  overflow: hidden;
  border-radius: 20px 20px 0 0;
  background: var(--color-surface);
  box-shadow: 0 -8px 32px var(--color-shadow);
  animation: settingsPanelIn 220ms ease-out;
}

.panel-handle {
  flex: none;
  width: 36px;
  height: 4px;
  margin: 0 auto 4px;
  border-radius: 999px;
  background: var(--color-border);
}

.panel-head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px 8px;
  border-bottom: 1px solid var(--color-border);
}

.panel-title { color: var(--color-text); font-size: 15px; font-weight: 800; }
.panel-close {
  flex: none;
  width: 44px;
  height: 44px;
  margin: 0;
  padding: 0;
  border-radius: 50%;
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  font-size: 22px;
  line-height: 44px;
}

.settings-scroll { flex: 0 1 auto; min-height: 0; height: auto; overflow: hidden; }
.settings-section + .settings-section { border-top: 1px solid var(--color-border); }
.settings-section-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  margin: 0;
  padding: 12px 20px;
  border-radius: 0;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 24px;
  text-align: left;
}
.settings-section-trigger.is-expanded { color: var(--color-primary); background: var(--color-primary-soft); }
.section-chevron { color: var(--color-text-muted); font-size: 18px; line-height: 1; }
.is-expanded .section-chevron { transform: rotate(180deg); color: var(--color-primary); }
.settings-section-content { padding: 14px 16px; }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -3px; }
button::after { border: 0; }

@keyframes settingsMaskIn {
  from { background: transparent; }
  to { background: rgb(32 36 45 / 42%); }
}
@keyframes settingsPanelIn {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .reader-settings-mask, .reader-settings-panel { animation: none; }
}
</style>
