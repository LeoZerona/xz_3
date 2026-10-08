<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useFontStore } from '../../stores/fonts'

type ChoiceOption = {
  id: string
  label: string
}

type WordQuestion = {
  id: string
  word: string
  accent: string
  pronunciation: string
  example: string
  correctOptionId: string
  options: ChoiceOption[]
}

const PLAN_STORAGE_KEY = 'font-learning-plan'
const REVIEW_TARGET = 20
const { currentFont } = storeToRefs(useFontStore())
const CURRENT_QUESTION: WordQuestion = {
  id: 'property',
  word: 'property',
  accent: '美',
  pronunciation: '/ˈprɑːpərti/',
  example: 'Glitter is one of the properties of gold.',
  correctOptionId: 'property',
  options: [
    { id: 'property', label: 'n. 特性；财产；房产' },
    { id: 'preference', label: 'n. 嗜好；习性；倾向' },
    { id: 'poverty', label: 'n. 贫困；贫穷；贫乏' },
    { id: 'properly', label: 'adv. 正确地；适当地' },
  ],
}

const savedPlan = uni.getStorageSync(PLAN_STORAGE_KEY) as { dailyCount?: number } | undefined
const dailyTarget = savedPlan?.dailyCount ?? 15

const learnedCount = ref(0)
const reviewedCount = ref(0)
const selectedOptionId = ref<string | null>(null)
const hasAnswered = ref(false)

const currentQuestion = CURRENT_QUESTION
const studyProgress = computed(() => Math.min(learnedCount.value, dailyTarget))
const isCorrect = computed(() => selectedOptionId.value === currentQuestion.correctOptionId)

function selectOption(optionId: string) {
  selectedOptionId.value = optionId
  if (optionId === currentQuestion.correctOptionId && !hasAnswered.value) {
    hasAnswered.value = true
    learnedCount.value += 1
  }
}

function openSearch() {
  uni.navigateTo({ url: '/pages/search/index' })
}

onMounted(() => {
  uni.pageScrollTo({ scrollTop: 0, duration: 0 })
})
</script>

<template>
  <view class="study-page">
    <view class="study-topbar">
      <navigator class="topbar-button" url="/pages/index/index" open-type="reLaunch" hover-class="none" role="button" aria-label="返回">
        <span class="back-icon" aria-hidden="true">←</span>
      </navigator>
      <view class="mode-label">选择模式</view>
      <view class="topbar-actions">
        <div class="topbar-button" role="button" tabindex="0" aria-label="搜索" @click="openSearch" @keydown.enter="openSearch" @keydown.space.prevent="openSearch">
          <span class="search-icon" aria-hidden="true" />
        </div>
        <div class="topbar-button" role="button" tabindex="0" aria-label="收藏">
          <span class="favorite-icon" aria-hidden="true">☆</span>
        </div>
      </view>
    </view>

    <view class="progress-card" aria-label="今日学习进度">
      <view class="progress-item">
        <text class="progress-label">今日新学</text>
        <text class="progress-value">{{ studyProgress }}/{{ dailyTarget }}</text>
      </view>
      <view class="progress-item">
        <text class="progress-label">今日复习</text>
        <text class="progress-value">{{ reviewedCount }}/{{ REVIEW_TARGET }}</text>
      </view>
      <view class="progress-item">
        <text class="progress-label">学习时间</text>
        <text class="progress-value">0<small>min</small></text>
      </view>
    </view>

    <view class="choice-study" role="main" aria-live="polite">
      <view class="word-summary">
        <text class="current-font-label">当前字体：{{ currentFont.name }}</text>
        <text class="word" :style="{ fontFamily: currentFont.fontFamily }">{{ currentQuestion.word }}</text>
        <view class="pronunciation">
          <text class="accent">{{ currentQuestion.accent }}</text>
          <text>{{ currentQuestion.pronunciation }}</text>
          <van-icon name="volume-o" size="18" color="var(--color-primary)" aria-hidden="true" />
        </view>
        <text class="example">{{ currentQuestion.example }}</text>
      </view>

      <view class="option-list" role="group" aria-label="请选择正确释义">
        <div
          v-for="option in currentQuestion.options"
          :key="option.id"
          class="option-card"
          :class="{
            'is-selected': selectedOptionId === option.id,
            'is-correct': selectedOptionId === option.id && option.id === currentQuestion.correctOptionId,
            'is-wrong': selectedOptionId === option.id && option.id !== currentQuestion.correctOptionId,
          }"
          role="button"
          tabindex="0"
          :aria-label="option.label"
          :aria-pressed="selectedOptionId === option.id"
          @click="selectOption(option.id)"
          @keydown.enter="selectOption(option.id)"
          @keydown.space.prevent="selectOption(option.id)"
        >
          <text>{{ option.label }}</text>
        </div>
      </view>

      <view v-if="selectedOptionId" class="answer-feedback" :class="{ 'is-correct': isCorrect }">
        <text>{{ isCorrect ? '回答正确' : '再想想，重新选择' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.study-page {
  width: min(100%, 560px);
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: var(--color-text);
  background:
    radial-gradient(circle at 90% 0, var(--color-primary-soft) 0, transparent 34%),
    linear-gradient(180deg, var(--color-topbar) 0, var(--color-page) 48%, var(--color-surface-muted) 100%);
}

.study-topbar {
  min-height: calc(68px + var(--app-top-safe-area));
  padding: var(--app-top-safe-area) 14px 8px;
  display: grid;
  grid-template-columns: 88px 1fr 88px;
  align-items: center;
}

.mode-label { color: var(--color-text-secondary); font-size: 13px; text-align: center; }
.topbar-actions { display: flex; justify-content: flex-end; gap: 6px; }
.topbar-button { width: 40px; height: 40px; margin: 0; padding: 0; display: grid; place-items: center; color: var(--color-text); line-height: 1; }
.back-icon, .favorite-icon, .search-icon { pointer-events: none; }
.back-icon { font-size: 27px; font-weight: 300; }
.favorite-icon { font-size: 31px; line-height: 1; }
.search-icon { position: relative; width: 21px; height: 21px; border: 2px solid currentColor; border-radius: 50%; }
.search-icon::after { content: ''; position: absolute; right: -5px; bottom: -3px; width: 8px; height: 2px; border-radius: 2px; background: currentColor; transform: rotate(48deg); transform-origin: left center; }
.topbar-button::after { border: 0; }

.progress-card { margin: 4px 16px 0; padding: 18px 12px 16px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--color-surface) 86%, transparent); box-shadow: 0 8px 24px var(--color-shadow); }
.progress-item { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.progress-label { color: var(--color-text-muted); font-size: 12px; }
.progress-value { font-size: 20px; font-weight: 700; letter-spacing: -.04em; }
.progress-value small { margin-left: 2px; font-size: 12px; font-weight: 600; }

.choice-study { min-height: 0; padding: clamp(28px, 5vh, 48px) 16px calc(24px + env(safe-area-inset-bottom)); flex: 1; display: flex; flex-direction: column; }
.word-summary { padding: 0 2px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.current-font-label { margin-bottom: 8px; color: var(--color-text-muted); font-size: 11px; }
.word { font-size: clamp(34px, 9vw, 46px); font-weight: 800; line-height: 1.1; letter-spacing: -.03em; }
.pronunciation { margin-top: 12px; display: flex; align-items: center; gap: 7px; color: var(--color-text-muted); font-size: 15px; }
.accent { padding: 2px 5px; border-radius: 3px; background: var(--color-surface-muted); font-size: 11px; }
.example { margin-top: 18px; color: var(--color-text); font-size: 16px; line-height: 1.5; }
.option-list { margin-top: clamp(42px, 7vh, 70px); display: flex; flex-direction: column; gap: 12px; }
.option-card { min-height: 68px; padding: 16px 20px; display: flex; align-items: center; border: 1.5px solid transparent; border-radius: 10px; background: var(--color-surface); box-shadow: 0 8px 24px var(--color-shadow); color: var(--color-text); font-size: 16px; line-height: 1.45; cursor: pointer; }
.option-card.is-selected { border-color: var(--color-primary); background: var(--color-primary-soft); }
.option-card.is-wrong { border-color: #e88455; background: color-mix(in srgb, #e88455 10%, var(--color-surface)); }
.option-card.is-correct { color: var(--color-primary-strong); }
.answer-feedback { min-height: 44px; margin-top: 12px; padding: 0 4px; display: flex; align-items: center; color: #d16d3c; font-size: 13px; }
.answer-feedback.is-correct { color: var(--color-primary); }

@media (max-height: 720px) {
  .study-topbar { min-height: calc(58px + var(--app-top-safe-area)); }
  .progress-card { padding-top: 13px; padding-bottom: 12px; }
  .choice-study { padding-top: 20px; }
  .word { font-size: 32px; }
  .example { margin-top: 12px; font-size: 14px; }
  .option-list { margin-top: 28px; gap: 9px; }
  .option-card { min-height: 56px; padding: 12px 16px; font-size: 14px; }
}

@media (max-width: 360px) {
  .study-topbar { grid-template-columns: 82px 1fr 82px; padding-right: 10px; padding-left: 10px; }
  .progress-card { margin-right: 12px; margin-left: 12px; }
  .progress-label { font-size: 11px; }
  .option-card { padding-right: 14px; padding-left: 14px; }
}
</style>
