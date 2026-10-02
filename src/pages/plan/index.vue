<template>
  <div class="plan-page" :class="`show-${activeSection}`">
    <div class="nav-bar">
      <div class="back-button" role="button" tabindex="0" aria-label="返回" @click="returnToPrevious" @keydown.enter="returnToPrevious" @keydown.space.prevent="returnToPrevious">‹</div>
      <div class="nav-tabs" role="tablist" aria-label="计划设置">
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
      <div class="nav-space" />
    </div>

    <div class="plan-content">
      <div class="font-summary">
        <div class="font-cover" :class="currentFont.coverClass" aria-hidden="true"><span>{{ currentFont.shortName }}</span></div>
        <div class="font-copy">
          <span class="font-name">学习字体：{{ currentFont.name }}</span>
          <span class="font-meta">每日学习 {{ initialPlan.count }} 个，完成 {{ initialPlan.days }} 天</span>
        </div>
      </div>

      <view class="schedule">
        <view class="schedule-summary">
          <text>完成日期：<text class="accent">2026年10月25日</text></text>
          <text>预计每天 xxx 分钟</text>
        </view>

        <view class="plan-picker">
          <view class="picker-head">
            <text>每日学习</text>
            <text>完成天数</text>
          </view>
          <div class="wheel-stage">
            <div class="wheel-highlight" aria-hidden="true" />
            <div class="plan-wheel" role="listbox" aria-label="每日学习计划" @scroll.passive="handlePlanScroll">
              <div class="wheel-spacer" aria-hidden="true" />
              <div v-for="(item, index) in planOptions" :key="item.count" class="picker-row" role="option" :aria-selected="initialPlanIndex === index">
                <span>{{ item.count }} 个</span>
                <span>{{ item.days }} 天</span>
              </div>
              <div class="wheel-spacer" aria-hidden="true" />
            </div>
          </div>
        </view>

        <text class="mode-title">选择学习模式（支持多选）</text>
        <checkbox-group class="mode-list" @change="changeModes">
          <label v-for="mode in modeOptions" :key="mode" class="mode-card">
            <text>{{ mode }}</text>
            <checkbox class="choice-control" :value="mode" :checked="initialModes.includes(mode)" :color="currentTheme.tokens.primary" />
          </label>
        </checkbox-group>
      </view>
    </div>

    <div class="font-library">
      <div
        v-for="font in fontItems"
        :key="font.id"
        class="font-card"
        :class="{ 'is-current': font.id === currentFontId }"
        role="button"
        :aria-label="`选择${font.name}`"
        @click="selectFont(font.id)"
      >
        <div class="font-card-cover" :class="font.coverClass" aria-hidden="true">
          <span class="font-card-mark">{{ font.shortName }}</span>
          <span class="font-card-sample">永</span>
        </div>
        <div class="font-card-body">
          <div class="font-card-head">
            <span class="font-card-title">{{ font.name }}</span>
            <span v-if="font.id === currentFontId" class="current-label">当前在学</span>
            <div v-else class="delete-button" role="button" tabindex="0" :aria-label="`删除${font.name}`" @click.stop="deleteFont(font.id)" @keydown.enter.stop="deleteFont(font.id)" @keydown.space.stop.prevent="deleteFont(font.id)">删除</div>
          </div>
          <span class="font-card-meta">每日 {{ font.dailyCount }} 个，剩余 {{ font.remainingDays }} 天</span>
          <div class="font-progress" aria-hidden="true"><div class="font-progress-value" :style="{ width: `${font.progress}%` }" /></div>
          <div class="font-card-foot">
            <span><span class="progress-dot">•</span> 已学 {{ font.learned }}</span>
            <span>{{ font.total }}字</span>
          </div>
        </div>
      </div>
      <div v-if="fontItems.length === 0" class="empty-fonts">还没有添加字体</div>
    </div>

    <div class="save-wrap">
      <div class="save-button plan-action" role="button" tabindex="0" @click="savePlan" @keydown.enter="savePlan" @keydown.space.prevent="savePlan">保存计划</div>
      <div class="save-button font-action" role="button" tabindex="0" @click="addFont" @keydown.enter="addFont" @keydown.space.prevent="addFont">添加字体</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '../../stores/theme'

const { currentTheme } = storeToRefs(useThemeStore())

const STORAGE_KEY = 'font-learning-plan'
const FONT_STORAGE_KEY = 'font-learning-current'
const ROW_HEIGHT = 58
type Section = 'plan' | 'fonts'
type FontItem = {
  id: string
  name: string
  shortName: string
  dailyCount: number
  remainingDays: number
  learned: number
  total: number
  progress: number
  coverClass: string
}

const activeSection = ref<Section>('plan')
const fontItems = ref<FontItem[]>([
  { id: 'font-one', name: '字体一', shortName: '字一', dailyCount: 15, remainingDays: 20, learned: 45, total: 345, progress: 13, coverClass: 'cover-green' },
  { id: 'font-two', name: '字体二', shortName: '字二', dailyCount: 15, remainingDays: 30, learned: 0, total: 450, progress: 0, coverClass: 'cover-blue' },
])
const storedFontId = uni.getStorageSync(FONT_STORAGE_KEY) as string | undefined
const currentFontId = ref(fontItems.value.some((font) => font.id === storedFontId) ? storedFontId! : 'font-one')
const currentFont = computed(() => fontItems.value.find((font) => font.id === currentFontId.value) ?? fontItems.value[0])
const planOptions = Array.from({ length: 19 }, (_, index) => {
  const count = 10 + index * 5
  return { count, days: Math.ceil(300 / count) }
})
const modeOptions = [
  '查看学习字体选择对照字体',
  '查看对照字体选择学习字体',
  '查看学习字体输入对照字体',
]

const saved = uni.getStorageSync(STORAGE_KEY) as { dailyCount?: number; modes?: string[] } | undefined
const initialDailyCount = saved?.dailyCount && planOptions.some((item) => item.count === saved.dailyCount) ? saved.dailyCount : 15
const initialModes = Array.isArray(saved?.modes) ? saved.modes.filter((mode) => modeOptions.includes(mode)) : []
const initialPlan = planOptions.find((item) => item.count === initialDailyCount) ?? planOptions[1]
const initialPlanIndex = Math.max(0, planOptions.findIndex((item) => item.count === initialDailyCount))
let dailyCount = initialDailyCount
let selectedModes = [...initialModes]

function syncWheelSelection(element: HTMLElement) {
  const index = Math.max(0, Math.min(planOptions.length - 1, Math.round(element.scrollTop / ROW_HEIGHT)))
  const selected = planOptions[index]
  if (!selected) return
  dailyCount = selected.count
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

function initialiseWheel() {
  requestAnimationFrame(() => {
    const wheel = document.querySelector<HTMLElement>('.plan-wheel')
    if (!wheel) return
    wheel.scrollTop = initialPlanIndex * ROW_HEIGHT
    syncWheelSelection(wheel)
  })
}

function showSection(section: Section) {
  activeSection.value = section
  if (section === 'plan') nextTick(initialiseWheel)
}

function selectFont(id: string) {
  currentFontId.value = id
  uni.setStorageSync(FONT_STORAGE_KEY, id)
}

function deleteFont(id: string) {
  fontItems.value = fontItems.value.filter((font) => font.id !== id)
}

function addFont() {
  uni.showToast({ title: '更多字体即将上线', icon: 'none' })
}

function changeModes(event: { detail: { value: string[] } }) {
  selectedModes = event.detail.value
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

function savePlan() {
  uni.setStorageSync(STORAGE_KEY, { dailyCount, modes: selectedModes })
  returnToPrevious()
}

onMounted(() => {
  initialiseWheel()
})
</script>

<style scoped>
.plan-page { width: min(100%, 560px); min-height: 100vh; min-height: 100dvh; margin: 0 auto; padding-bottom: calc(98px + env(safe-area-inset-bottom)); background: var(--color-page); color: var(--color-text); }
.plan-page.show-plan .font-library, .plan-page.show-plan .font-action { display: none; }
.plan-page.show-fonts .plan-content, .plan-page.show-fonts .plan-action { display: none; }
.nav-bar { height: calc(64px + env(safe-area-inset-top)); padding: env(safe-area-inset-top) 12px 0; display: grid; grid-template-columns: 46px 1fr 46px; align-items: stretch; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.back-button { width: 44px; height: 44px; margin: 0; padding: 0; color: var(--color-text); background: transparent; font-size: 42px; font-weight: 300; line-height: 38px; }
.back-button { align-self: center; }
.back-button::after, .nav-tab::after, .delete-button::after, .save-button::after { border: 0; }
.nav-tabs { min-width: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; }
.nav-tab { position: relative; min-width: 0; height: 100%; margin: 0; padding: 0 10px; display: flex; align-items: center; justify-content: center; border-radius: 0; color: var(--color-text); background: transparent; font-size: 18px; font-weight: 600; line-height: 1; white-space: nowrap; }
.nav-tab.is-active { color: var(--color-primary); }
.nav-tab.is-active::before { content: ''; position: absolute; right: 18px; bottom: 0; left: 18px; height: 3px; border-radius: 3px 3px 0 0; background: var(--color-primary); }
.font-summary { min-height: 145px; padding: 24px 18px; display: flex; align-items: center; gap: 20px; }
.font-cover { flex: none; width: 74px; height: 96px; border-radius: 4px; display: flex; align-items: flex-start; padding: 9px 8px; box-shadow: inset 5px 0 0 #ffffff50, 0 2px 4px #00000014; color: #ffffffd9; font-size: 12px; font-weight: 700; }
.font-copy { min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.font-name { font-size: 19px; font-weight: 700; }
.font-meta { color: var(--color-text-secondary); font-size: 14px; }
.schedule { padding: 24px 18px 16px; background: var(--color-surface-muted); }
.schedule-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--color-text-secondary); font-size: 14px; white-space: nowrap; }
.accent { color: var(--color-primary); }
.plan-picker { margin-top: 22px; overflow: hidden; border-radius: 6px; background: var(--color-surface); }
.picker-head, .picker-row { display: grid; grid-template-columns: 1fr 1fr; align-items: center; text-align: center; }
.picker-head { height: 58px; border-bottom: 1px solid var(--color-border); font-size: 16px; }
.wheel-stage { position: relative; height: 174px; overflow: hidden; }
.wheel-highlight { position: absolute; z-index: 0; top: 58px; right: 0; left: 0; height: 58px; background: var(--color-selection); pointer-events: none; }
.plan-wheel { position: relative; z-index: 1; width: 100%; height: 174px; overflow-x: hidden; overflow-y: auto; scroll-snap-type: y mandatory; overscroll-behavior: contain; touch-action: pan-y; -webkit-overflow-scrolling: touch; scrollbar-width: none; mask-image: linear-gradient(to bottom, rgba(0,0,0,.38), #000 38%, #000 62%, rgba(0,0,0,.38)); }
.plan-wheel::-webkit-scrollbar { display: none; }
.wheel-spacer { height: 58px; }
.picker-row { position: relative; z-index: 1; width: 100%; height: 58px; display: grid; grid-template-columns: 1fr 1fr; align-items: center; color: var(--color-text-muted); font-size: 16px; line-height: 1; text-align: center; scroll-snap-align: center; scroll-snap-stop: always; }
.picker-row.is-selected { color: var(--color-text); }
.choice-control { transform: scale(.82); }
.mode-title { display: block; margin: 30px 0 16px; font-size: 19px; font-weight: 700; }
.mode-list { display: flex; flex-direction: column; gap: 12px; }
.mode-card { width: 100%; min-height: 62px; margin: 0; padding: 12px 14px 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1.5px solid var(--color-border); border-radius: 8px; background: var(--color-surface); color: var(--color-text); font-size: 15px; font-weight: 400; line-height: 1.45; text-align: left; cursor: pointer; }
.mode-card:has(.uni-checkbox-input svg) { border-color: var(--color-primary); background: var(--color-primary-soft); color: var(--color-primary); }
.font-library { min-height: calc(100vh - 64px); min-height: calc(100dvh - 64px); padding: 20px 12px 110px; background: var(--color-surface-muted); }
.font-card { min-height: 156px; padding: 20px; display: flex; gap: 18px; border: 1px solid transparent; border-radius: 8px; background: var(--color-surface); box-shadow: 0 3px 12px var(--color-shadow); cursor: pointer; }
.font-card + .font-card { margin-top: 16px; }
.font-card.is-current { border-color: var(--color-border); }
.font-card-cover { position: relative; flex: none; width: 64px; height: 96px; padding: 10px 8px; overflow: hidden; border-radius: 3px; box-shadow: inset 4px 0 0 #ffffff50, 0 2px 4px #00000016; color: #ffffffdf; }
.cover-green { background: var(--color-cover-one); }
.cover-blue { background: var(--color-cover-two); }
.font-card-mark { position: relative; z-index: 1; display: block; font-size: 11px; font-weight: 700; }
.font-card-sample { position: absolute; right: -2px; bottom: -15px; color: #073d3340; font-family: serif; font-size: 67px; font-weight: 700; line-height: 1; }
.font-card-body { min-width: 0; flex: 1; padding-top: 1px; }
.font-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.font-card-title { overflow: hidden; font-size: 18px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.current-label { flex: none; color: var(--color-primary); font-size: 14px; }
.delete-button { flex: none; min-width: auto; height: auto; margin: 0; padding: 4px 0 4px 10px; border-radius: 0; background: transparent; color: var(--color-text-muted); font-size: 14px; line-height: 1; }
.font-card-meta { display: block; margin-top: 9px; color: var(--color-text-secondary); font-size: 14px; }
.font-progress { height: 4px; margin-top: 15px; overflow: hidden; border-radius: 4px; background: var(--color-border); }
.font-progress-value { height: 100%; border-radius: inherit; background: var(--color-progress); }
.font-card-foot { margin-top: 8px; display: flex; align-items: center; justify-content: space-between; color: var(--color-text-muted); font-size: 12px; }
.progress-dot { color: var(--color-progress); font-size: 17px; line-height: 0; }
.empty-fonts { padding: 80px 0; color: var(--color-text-muted); text-align: center; }
.save-wrap { position: fixed; z-index: 2; right: 0; bottom: 0; left: 0; padding: 12px 18px calc(12px + env(safe-area-inset-bottom)); background: var(--color-surface); box-shadow: 0 -5px 18px var(--color-shadow); }
.save-button { width: min(calc(100% - 36px), 524px); height: 56px; margin: 0 auto; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--color-primary); color: var(--color-on-primary); font-size: 18px; line-height: 1; }
@media (max-width: 370px) { .nav-tab { padding: 0 5px; font-size: 16px; } .schedule-summary { align-items: flex-start; flex-direction: column; } .mode-card { font-size: 14px; } .font-card { padding: 16px; gap: 14px; } }
</style>
