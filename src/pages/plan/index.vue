<template>
  <div class="plan-page" :style="themeStyle">
    <DatabaseStatus />
    <div class="nav-bar">
      <div class="back-button" role="button" tabindex="0" aria-label="返回" @click="handleBack" @keydown.enter="handleBack" @keydown.space.prevent="handleBack">‹</div>
      <div v-if="activeSection !== 'catalog'" class="nav-tabs" role="tablist" aria-label="计划设置">
        <div
          class="nav-tab"
          :class="{ 'is-active': activeSection === 'plan' }"
          role="tab"
          tabindex="0"
          :aria-selected="activeSection === 'plan'"
          @click="showSection('plan')"
          @keydown.enter="showSection('plan')"
          @keydown.space.prevent="showSection('plan')"
        >修改计划</div>
        <div
          class="nav-tab"
          :class="{ 'is-active': activeSection === 'fonts' }"
          role="tab"
          tabindex="0"
          :aria-selected="activeSection === 'fonts'"
          @click="showSection('fonts')"
          @keydown.enter="showSection('fonts')"
          @keydown.space.prevent="showSection('fonts')"
        >修改字体</div>
      </div>
      <div v-else aria-hidden="true" />
      <div class="nav-space" />
    </div>

    <div v-if="activeSection === 'plan'" class="plan-content">
      <div class="font-summary">
        <FontCover :font="currentFont" size="large" />
        <div class="font-copy">
          <span class="font-name">学习字体：{{ currentFont.name }}</span>
          <span class="font-description">{{ currentFont.description }}</span>
          <span class="font-meta">每日学习 {{ initialPlan.count }} 个，完成 {{ initialPlan.days }} 天</span>
        </div>
      </div>

      <view class="schedule">
        <view class="schedule-summary">
          <text>完成日期：<text class="accent">{{ planEstimate.dateLabel }}</text></text>
          <text>预计每天 {{ estimatedMinutes }} 分钟</text>
        </view>

        <view class="plan-picker">
          <view class="picker-head">
            <text>每日学习</text>
            <text>完成天数</text>
          </view>
          <div class="wheel-stage">
            <!-- #ifdef H5 -->
            <div class="wheel-highlight" aria-hidden="true" />
            <div ref="planWheelRef" class="plan-wheel" role="listbox" aria-label="每日学习计划" @scroll.passive="handlePlanScroll">
              <div class="wheel-spacer" aria-hidden="true" />
              <div v-for="(item, index) in planOptions" :key="item.count" class="picker-row" role="option" :aria-selected="initialPlanIndex === index">
                <span>{{ item.count }} 个</span>
                <span>{{ item.days }} 天</span>
              </div>
              <div class="wheel-spacer" aria-hidden="true" />
            </div>
            <!-- #endif -->
            <!-- #ifdef APP-PLUS -->
            <picker-view class="native-plan-wheel" :value="[initialPlanIndex]" indicator-style="height:42px" aria-label="每日学习计划" @change="handleNativePlanChange">
              <picker-view-column>
                <view v-for="item in planOptions" :key="item.count" class="picker-row">
                  <text>{{ item.count }} 个</text>
                  <text>{{ item.days }} 天</text>
                </view>
              </picker-view-column>
            </picker-view>
            <!-- #endif -->
          </div>
        </view>

        <view class="mode-header" style="display:flex;flex-direction:column;gap:4px;margin:24px 0 12px;">
          <text class="mode-title" style="margin:0;">选择必修学习方式</text>
          <text style="font-size:10px;color:var(--color-text-muted);">勾选的学习方式将在学习时出现，至少选择 1 种</text>
        </view>
        <view class="mode-list" aria-label="选择必修学习方式">
          <view v-for="mode in modeOptions" :key="mode" class="mode-card" :class="{ 'is-selected': selectedModes.includes(mode) }" role="checkbox" tabindex="0" :aria-checked="selectedModes.includes(mode)" @click="toggleMode(mode)" @keydown.enter="toggleMode(mode)" @keydown.space.prevent="toggleMode(mode)">
            <view class="mode-info" style="flex:1;display:flex;flex-direction:column;gap:2px;"><text class="mode-label">{{ getStudyModeLabel(mode) }}</text></view>
            <view class="mode-check" :class="{ 'is-checked': selectedModes.includes(mode) }" aria-hidden="true" style="width:22px;height:22px;border:1.5px solid var(--color-border);border-radius:6px;display:grid;place-items:center;flex:none;background:var(--color-surface);"><text v-if="selectedModes.includes(mode)" style="color:var(--color-primary);font-weight:700;font-size:14px;">✓</text></view>
          </view>
        </view>
      </view>
    </div>

    <FontManager v-else-if="activeSection === 'fonts'" @browse="showSection('catalog')" />
    <FontCatalog v-else />

    <div v-if="activeSection === 'plan'" class="save-wrap">
      <div class="save-button plan-action" role="button" tabindex="0" @click="savePlan" @keydown.enter="savePlan" @keydown.space.prevent="savePlan">保存计划</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DatabaseStatus from '../../components/DatabaseStatus.vue'

import { readPlanConfig } from '../../study/planConfig'
import { saveDailyPlan } from '../../learning/settings'

import { onBackPress } from '@dcloudio/uni-app'
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import FontCover from '../../components/FontCover.vue'
import { getDailyCharacterIds } from '../../database/catalog'
import { useDatabaseTask } from '../../database/useDatabaseTask'
import { useFontStore } from '../../stores/fonts'
import { useThemeStore } from '../../stores/theme'
import { getStudyModeLabel, normalizeStudyModes, STUDY_MODES } from '../../study/modes'
import { readLearningSettings } from '../../learning/settings'
import { estimatePlan } from '../../learning/plan'
import { useCharacterLearningStore } from '../../stores/characterLearning'
import FontCatalog from './components/FontCatalog.vue'
import FontManager from './components/FontManager.vue'

const { currentFont } = storeToRefs(useFontStore())
const learningStore = useCharacterLearningStore()
const { themeStyle } = storeToRefs(useThemeStore())

const ROW_HEIGHT = 42
type Section = 'plan' | 'fonts' | 'catalog'

const activeSection = ref<Section>('plan')
const totalCharCount = ref(0)
const planOptions = computed(() => Array.from({ length: 19 }, (_, index) => {
  const count = 10 + index * 5
  return { count, days: Math.ceil(totalCharCount.value / count) }
}))
const saved = readPlanConfig(new Date(), true) as { dailyCount?: number; modes?: string[] }
const modeOptions = STUDY_MODES
const savedModes = normalizeStudyModes(saved?.modes)
const selectedModes = ref<import('../../study/modes').StudyMode[]>(savedModes.length ? savedModes : [...STUDY_MODES])
function toggleMode(mode: import('../../study/modes').StudyMode) {
  const idx = selectedModes.value.indexOf(mode)
  if (idx >= 0) {
    if (selectedModes.value.length <= 1) { uni.showToast({ title: '至少保留一种学习方式', icon: 'none' }); return }
    selectedModes.value = selectedModes.value.filter(m=>m!==mode)
  } else {
    selectedModes.value = STUDY_MODES.filter(m=> selectedModes.value.includes(m) || m===mode)
  }
}

const initialDailyCount = saved?.dailyCount && planOptions.value.some((item) => item.count === saved.dailyCount) ? saved.dailyCount : 15
const dailyCount = ref(initialDailyCount)
const planEstimate = computed(() => estimatePlan(totalCharCount.value, dailyCount.value))
const planWheelRef = ref<HTMLElement | null>(null)
const initialPlan = computed(() => planOptions.value.find((item) => item.count === dailyCount.value) ?? planOptions.value[1]!)
const initialPlanIndex = computed(() => Math.max(0, planOptions.value.findIndex((item) => item.count === dailyCount.value)))
useDatabaseTask(async () => {
  totalCharCount.value = (await getDailyCharacterIds()).filter((id) => !learningStore.isCharacterComplete(id) && !learningStore.isExcluded(id)).length
  const plan = readPlanConfig(new Date(), true) as { dailyCount?: number; modes?: string[] }
  const restoredDailyCount = plan?.dailyCount && planOptions.value.some((item) => item.count === plan.dailyCount) ? plan.dailyCount : 15
  dailyCount.value = restoredDailyCount
  const modes = normalizeStudyModes(plan?.modes)
  selectedModes.value = modes.length ? modes : [...STUDY_MODES]
  await nextTick()
  await initialiseWheel(restoredDailyCount)
})
const estimatedMinutes = computed(() => {
  const modeCount = selectedModes.value.length || 1
  const count = dailyCount.value
  // 每字每种必修约 24 秒，新学 15字*3种 ≈ 18 分钟；复习 20字约 4 分钟，+1 分钟基础开销，向上取整
  const newMinutes = count * modeCount * 0.4
  const reviewMinutes = readLearningSettings().reviewTarget * 0.2
  return Math.max(3, Math.ceil(newMinutes + reviewMinutes + 1))
})

function syncWheelSelection(element: HTMLElement) {
  const index = Math.max(0, Math.min(planOptions.value.length - 1, Math.round(element.scrollTop / ROW_HEIGHT)))
  const selected = planOptions.value[index]
  if (!selected) return
  dailyCount.value = selected.count
  element.dataset.selectedCount = String(selected.count)
  element.querySelectorAll<HTMLElement>('.picker-row').forEach((row, rowIndex) => {
    const active = rowIndex === index
    row.classList.toggle('is-selected', active)
    row.setAttribute('aria-selected', String(active))
  })
}

function handlePlanScroll(event: Event) {
  syncWheelSelection(event.currentTarget as HTMLElement)
}
function handleNativePlanChange(event: { detail: { value: Array<number | string> } }) {
  const index = Number(event.detail.value[0])
  const selected = planOptions.value[index]
  if (selected) dailyCount.value = selected.count
}

let wheelFrame: number | null = null
let completeWheel: (() => void) | null = null
function cancelWheelInitialization() {
  if (wheelFrame !== null) cancelAnimationFrame(wheelFrame)
  wheelFrame = null
  const complete = completeWheel
  completeWheel = null
  complete?.()
}
function initialiseWheel(targetCount = dailyCount.value): Promise<void> {
  // App 使用原生 picker-view；H5 的滚轮在布局完成后才开放交互。
  if (typeof document === 'undefined' || typeof requestAnimationFrame !== 'function') return Promise.resolve()
  // 在等待布局前固定目标，避免初始 scroll 事件改变即将恢复的选择。
  const targetIndex = Math.max(0, planOptions.value.findIndex((item) => item.count === targetCount))
  cancelWheelInitialization()
  return new Promise((resolve) => {
    completeWheel = resolve
    wheelFrame = requestAnimationFrame(() => {
      const wheel = planWheelRef.value
      if (!wheel) { cancelWheelInitialization(); return }
      wheel.scrollTop = targetIndex * ROW_HEIGHT
      syncWheelSelection(wheel)
      wheelFrame = requestAnimationFrame(() => {
        wheelFrame = null
        completeWheel = null
        resolve()
      })
    })
  })
}

function showSection(section: Section) {
  const targetCount = dailyCount.value
  activeSection.value = section
  if (section === 'plan') void nextTick(() => initialiseWheel(targetCount)).catch((error: unknown) => console.error('计划选项初始化失败', error))
}

function returnToPrevious() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({
      delta: 1,
      fail: () => uni.reLaunch({ url: '/pages/index/index' }),
    })
    return
  }
  uni.reLaunch({ url: '/pages/index/index' })
}

function handleBack() {
  if (activeSection.value === 'catalog') {
    activeSection.value = 'fonts'
    return
  }
  returnToPrevious()
}

async function savePlan() {
  if (selectedModes.value.length===0){ uni.showToast({title:'请选择至少一种学习方式',icon:'none'});return }
  try {
    await saveDailyPlan({ dailyCount: dailyCount.value, modes: [...selectedModes.value] })
    returnToPrevious()
  } catch (error) { console.error('保存计划失败', error); uni.showToast({ title: '保存计划失败，请重试', icon: 'none' }) }
}

onBeforeUnmount(cancelWheelInitialization)

onBackPress((event) => {
  if (event.from === 'navigateBack') return false
  if (activeSection.value === 'catalog') {
    activeSection.value = 'fonts'
    return true
  }
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
    return true
  }
  uni.reLaunch({ url: '/pages/index/index' })
  return true
})
</script>

<style scoped>
.plan-page { width: min(100%, 560px); height: 100vh; height: 100dvh; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; background: var(--color-page); color: var(--color-text); }
.plan-content { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; touch-action: pan-y; padding-bottom: calc(76px + env(safe-area-inset-bottom)); }
.nav-bar { flex: none; height: calc(58px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 12px 0; display: grid; grid-template-columns: 46px 1fr 46px; align-items: stretch; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.back-button { width: 44px; height: 44px; margin: 0; padding: 0; color: var(--color-text); background: transparent; font-size: 40px; font-weight: 300; line-height: 38px; }
.back-button { align-self: center; }
.back-button::after, .nav-tab::after, .save-button::after { border: 0; }
.nav-tabs { min-width: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; }
.nav-tab { position: relative; min-width: 0; height: 100%; margin: 0; padding: 0 10px; display: flex; align-items: center; justify-content: center; border-radius: 0; color: var(--color-text); background: transparent; font-size: 14px; font-weight: 600; line-height: 1; white-space: nowrap; }
.nav-tab.is-active { color: var(--color-primary); }
.nav-tab.is-active::before { content: ''; position: absolute; right: 18px; bottom: 0; left: 18px; height: 3px; border-radius: 3px 3px 0 0; background: var(--color-primary); }
.font-summary { min-height: 112px; padding: 20px 18px; display: flex; align-items: center; gap: 20px; }
.font-copy { min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.font-name { font-size: 15px; font-weight: 700; }
.font-description { color: var(--color-text-secondary); font-size: 9px; line-height: 1.45; }
.font-meta { color: var(--color-text-secondary); font-size: 10px; }
.schedule { padding: 12px 18px 10px; background: var(--color-surface-muted); }
.schedule-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--color-text-secondary); font-size: 10px; white-space: nowrap; }
.accent { color: var(--color-primary); }
.plan-picker { margin-top: 12px; overflow: hidden; border-radius: 6px; background: var(--color-surface); }
.picker-head, .picker-row { display: grid; grid-template-columns: 1fr 1fr; align-items: center; text-align: center; }
.picker-head { height: 42px; border-bottom: 1px solid var(--color-border); font-size: 12px; }
.wheel-stage { position: relative; height: 126px; overflow: hidden; }
.native-plan-wheel { width: 100%; height: 126px; }
.wheel-highlight { position: absolute; z-index: 0; top: 41px; right: 0; left: 0; height: 54px; background: var(--color-selection); pointer-events: none; }
.plan-wheel { position: relative; z-index: 1; width: 100%; height: 126px; overflow-x: hidden; overflow-y: auto; scroll-snap-type: y mandatory; overscroll-behavior: contain; touch-action: pan-y; -webkit-overflow-scrolling: touch; scrollbar-width: none; mask-image: linear-gradient(to bottom, rgba(0,0,0,.38), #000 38%, #000 62%, rgba(0,0,0,.38)); }
.plan-wheel::-webkit-scrollbar { display: none; }
.wheel-spacer { height: 42px; }
.picker-row { position: relative; z-index: 1; width: 100%; height: 42px; display: grid; grid-template-columns: 1fr 1fr; align-items: center; color: var(--color-text-muted); font-size: 12px; line-height: 1; text-align: center; scroll-snap-align: center; scroll-snap-stop: always; }
.picker-row.is-selected { color: var(--color-text); }
.mode-title { display: block; margin: 24px 0 12px; font-size: 15px; font-weight: 700; }
.mode-list { display: flex; flex-direction: column; gap: 8px; }
.mode-card { width: 100%; min-height: 44px; margin: 0; padding: 10px 14px 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1.5px solid var(--color-border); border-radius: 8px; background: var(--color-surface); color: var(--color-text); font-size: 11px; font-weight: 400; line-height: 1.45; text-align: left; cursor: pointer; }
.mode-card.is-selected { border-color: color-mix(in srgb, var(--color-primary) 32%, var(--color-border)); background: var(--color-primary-soft); }
.mode-card.is-selected .mode-check.is-checked { border-color: var(--color-primary); background: var(--color-primary-soft); }
.mode-check { transition: all 0.18s ease; }
.mode-required { flex: none; color: var(--color-primary); font-size: 9px; font-weight: 700; }
.save-wrap { position: fixed; z-index: 2; right: 0; bottom: 0; left: 0; padding: 6px 18px calc(6px + env(safe-area-inset-bottom)); background: var(--color-surface); box-shadow: 0 -5px 18px var(--color-shadow); }
.save-button { width: min(calc(100% - 36px), 524px); height: 44px; margin: 0 auto; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--color-primary); color: var(--color-on-primary); font-size: 14px; line-height: 1; }
@media (max-width: 370px) { .nav-tab { padding: 0 5px; font-size: 12px; } .schedule-summary { align-items: flex-start; flex-direction: column; } .mode-card { font-size: 10px; } }
</style>














