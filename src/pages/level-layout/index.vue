<script setup lang="ts">
import { nextTick } from 'vue'
import { onBackPress } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import DatabaseStatus from '../../components/DatabaseStatus.vue'
import LevelLayoutPreview from './components/LevelLayoutPreview.vue'
import { useThemeStore } from '../../stores/theme'
import { useLevelLayoutStore } from '../../stores/levelLayout'
import { applicationReady } from '../../database/application'
import { DEFAULT_LEVEL_LAYOUT, LEVEL_LAYOUTS } from '../../study/levelLayouts'
import type { LevelLayoutId } from '../../study/levelLayouts'

const layoutStore = useLevelLayoutStore()
const { currentLayoutId, currentLayout } = storeToRefs(layoutStore)
const { themeStyle } = storeToRefs(useThemeStore())

function handleChoose(layoutId: LevelLayoutId): void {
  if (applicationReady.value) layoutStore.selectLayout(layoutId)
}
async function handleKeydown(event: KeyboardEvent): Promise<void> {
  const index = LEVEL_LAYOUTS.findIndex((layout) => layout.id === currentLayoutId.value)
  let nextIndex: number
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % LEVEL_LAYOUTS.length
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index + LEVEL_LAYOUTS.length - 1) % LEVEL_LAYOUTS.length
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = LEVEL_LAYOUTS.length - 1
  else return
  event.preventDefault()
  const option = LEVEL_LAYOUTS[nextIndex]
  if (!option) return
  handleChoose(option.id)
  // #ifdef H5
  await nextTick()
  document.getElementById('layout-option-' + option.id)?.focus()
  // #endif
}
function goToProfile(): void { uni.reLaunch({ url: '/pages/profile/index' }) }
function goBack(): void {
  if (getCurrentPages().length > 1) uni.navigateBack({ delta: 1, fail: goToProfile })
  else goToProfile()
}
function handleViewLevels(): void {
  const pages = getCurrentPages()
  const existing = pages.findIndex((page) => page.route === 'pages/levels/index')
  const fail = () => uni.showToast({ title: '暂时无法打开关卡学习', icon: 'none' })
  if (existing >= 0) uni.navigateBack({ delta: pages.length - 1 - existing, fail })
  else uni.navigateTo({ url: '/pages/levels/index', fail })
}
onBackPress((event) => {
  if (event.from === 'navigateBack') return false
  goBack()
  return true
})
</script>

<template>
  <view class="layout-settings-page" :style="themeStyle">
    <DatabaseStatus />
    <view class="layout-settings-nav">
      <button class="layout-back" role="button" aria-label="返回" @click="goBack"><van-icon name="arrow-left" size="22" aria-hidden="true" /></button>
      <h1>关卡布局</h1>
    </view>
    <view class="layout-settings-content">
      <p class="layout-settings-description">选一种喜欢的学习方式。配色跟随你的主题，学习进度保持同步。</p>
      <view class="layout-options" role="radiogroup" aria-label="关卡布局" :aria-busy="!applicationReady">
        <view
          v-for="option in LEVEL_LAYOUTS"
          :id="'layout-option-' + option.id"
          :key="option.id"
          class="layout-option"
          :class="{ 'is-selected': currentLayoutId === option.id }"
          role="radio"
          :aria-label="option.name"
          :aria-checked="currentLayoutId === option.id"
          :aria-disabled="!applicationReady"
          :tabindex="currentLayoutId === option.id ? 0 : -1"
          @click="handleChoose(option.id)"
          @keydown.enter="handleChoose(option.id)"
          @keydown.space.prevent="handleChoose(option.id)"
          @keydown="handleKeydown"
        >
          <LevelLayoutPreview :layout="option.id" />
          <view class="layout-option-copy">
            <view class="layout-option-heading"><h2>{{ option.name }}</h2><text v-if="option.id === DEFAULT_LEVEL_LAYOUT" class="layout-default">默认</text></view>
            <p>{{ option.description }}</p>
            <text class="layout-choice-status"><van-icon :name="currentLayoutId === option.id ? 'checked' : 'circle'" size="18" aria-hidden="true" />{{ currentLayoutId === option.id ? '已选择' : '选择此布局' }}</text>
          </view>
        </view>
      </view>
      <text class="layout-saved" role="status">当前使用：{{ currentLayout.name }}。选择会自动保存。</text>
      <button class="layout-view-levels" role="button" :disabled="!applicationReady" @click="handleViewLevels">查看关卡学习<van-icon name="arrow" size="16" aria-hidden="true" /></button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.layout-settings-page { width: min(100%, 880px); min-height: 100vh; min-height: 100dvh; margin: 0 auto; background: var(--color-page); color: var(--color-text); }
.layout-settings-nav { position: sticky; z-index: 2; top: 0; display: flex; align-items: center; gap: 12px; min-height: calc(58px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 16px 0; background: var(--color-page); }
.layout-settings-nav h1 { margin: 0; font-size: 22px; font-weight: 650; }
.layout-back { width: 44px; min-height: 44px; flex: none; display: grid; place-items: center; margin: 0; padding: 0; border-radius: 50%; color: var(--color-text); background: transparent; }
.layout-settings-content { padding: 18px 20px calc(32px + env(safe-area-inset-bottom)); }
.layout-settings-description { margin: 0 0 22px; max-width: 36em; color: var(--color-text-secondary); font-size: 14px; line-height: 1.7; }
.layout-options { display: grid; grid-template-columns: 1fr; gap: 14px; }
.layout-option { display: flex; align-items: center; gap: 18px; padding: 16px; border: 2px solid transparent; border-radius: 22px; background: var(--color-surface-muted); cursor: pointer; }
.layout-option.is-selected { border-color: var(--color-primary); background: var(--color-primary-soft); }
.layout-option-copy { min-width: 0; flex: 1; }
.layout-option-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.layout-option h2 { margin: 0; font-size: 17px; font-weight: 650; }
.layout-default { color: var(--color-text-secondary); font-size: 12px; }
.layout-option p { margin: 10px 0 16px; color: var(--color-text-secondary); font-size: 13px; line-height: 1.65; }
.layout-option.is-selected p, .layout-option.is-selected .layout-default { color: var(--color-text); }
.layout-choice-status { display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: 12px; }
.is-selected .layout-choice-status { color: var(--color-primary-strong); }
.layout-saved { display: block; margin-top: 24px; color: var(--color-text-secondary); font-size: 13px; line-height: 1.6; }
.layout-view-levels { min-height: 48px; display: flex; justify-content: center; align-items: center; gap: 12px; width: 100%; margin: 16px 0 0; padding: 0 16px; border-radius: 999px; background: var(--color-primary-strong); color: var(--color-on-primary); font-size: 14px; font-weight: 600; }
.layout-view-levels[disabled] { opacity: .5; }
.layout-option:focus-visible, button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
@media (min-width: 701px) { .layout-options { grid-template-columns: repeat(2, minmax(0, 1fr)); } .layout-view-levels { max-width: 320px; } }
@media (max-width: 360px) { .layout-settings-content { padding-right: 16px; padding-left: 16px; } .layout-option { gap: 12px; padding: 12px; } .layout-option h2 { font-size: 16px; } }
</style>
