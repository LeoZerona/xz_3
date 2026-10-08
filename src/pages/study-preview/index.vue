<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { fontCatalog } from '../../fonts/catalog'
import characterTable from '../../static/character_table/first-level.json'
import { useFontStore } from '../../stores/fonts'

type CoveredFont = 'learning' | 'reference'

const PLAN_STORAGE_KEY = 'font-learning-plan'
const DEFAULT_DAILY_COUNT = 15
const fontStore = useFontStore()
const { addedFonts, currentFont } = storeToRefs(fontStore)
const savedPlan = uni.getStorageSync(PLAN_STORAGE_KEY) as { dailyCount?: number } | undefined
const configuredDailyCount = typeof savedPlan?.dailyCount === 'number' ? savedPlan.dailyCount : DEFAULT_DAILY_COUNT
const dailyCount = Math.min(characterTable.chars.length, Math.max(1, Math.trunc(configuredDailyCount)))

const coveredFont = ref<CoveredFont>('reference')
const revealedCharacterIds = ref<string[]>([])
const dailyCharacters = characterTable.chars.slice(0, dailyCount)
const referenceFont = computed(() => (
  addedFonts.value.find((font) => font.id !== currentFont.value.id)
  ?? fontCatalog.find((font) => font.id !== currentFont.value.id)
  ?? currentFont.value
))
const coveredFontName = computed(() => (
  coveredFont.value === 'learning' ? currentFont.value.name : referenceFont.value.name
))
const areAllCharactersRevealed = computed(() => (
  dailyCharacters.every((entry) => revealedCharacterIds.value.includes(entry.id))
))
const coverToggleLabel = computed(() => (
  areAllCharactersRevealed.value ? '全部遮盖' : '取消全部遮盖'
))

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
}

function swapCoveredFont() {
  coveredFont.value = coveredFont.value === 'learning' ? 'reference' : 'learning'
  revealedCharacterIds.value = []
}

function isRevealed(characterId: string): boolean {
  return revealedCharacterIds.value.includes(characterId)
}

function revealCharacter(characterId: string) {
  if (isRevealed(characterId)) return
  revealedCharacterIds.value = [...revealedCharacterIds.value, characterId]
}

function toggleAllCovers() {
  revealedCharacterIds.value = areAllCharactersRevealed.value
    ? []
    : dailyCharacters.map((entry) => entry.id)
}

function openCharacterDetail(characterId: string) {
  uni.navigateTo({ url: `/pages/character-detail/index?id=${encodeURIComponent(characterId)}` })
}

function startLearning() {
  uni.redirectTo({ url: '/pages/study/index' })
}
</script>

<template>
  <view class="preview-page">
    <view class="preview-header">
      <button class="header-button" role="button" aria-label="返回" @click="goBack">
        <text class="back-icon" aria-hidden="true">‹</text>
      </button>
      <view class="header-title-wrap">
        <text class="header-title">今日文字预览</text>
        <text class="header-subtitle">先认一遍，再开始学习</text>
      </view>
      <view class="header-space" />
    </view>

    <view class="preview-summary">
      <view class="summary-copy">
        <text class="summary-title">今日要学 {{ dailyCharacters.length }} 个文字</text>
        <text class="summary-description">点击遮罩即可查看 {{ coveredFontName }} 中的文字</text>
      </view>
      <view class="summary-actions">
        <button class="swap-button" role="button" aria-label="交换遮盖字体" @click="swapCoveredFont">
          <van-icon name="exchange" size="16" aria-hidden="true" />
          <text>交换遮盖</text>
        </button>
        <button class="cover-toggle-button" role="button" :aria-label="coverToggleLabel" @click="toggleAllCovers">
          <van-icon :name="areAllCharactersRevealed ? 'closed-eye' : 'eye-o'" size="19" aria-hidden="true" />
        </button>
      </view>
    </view>

    <view class="font-heading" aria-label="字体对照顺序">
      <view class="font-heading-item" :class="{ 'is-covered': coveredFont === 'learning' }">
        <text class="font-kind">学习字体</text>
        <text class="font-name">{{ currentFont.name }}</text>
      </view>
      <view class="font-heading-item" :class="{ 'is-covered': coveredFont === 'reference' }">
        <text class="font-kind">对照字体</text>
        <text class="font-name">{{ referenceFont.name }}</text>
      </view>
      <view class="detail-heading">详情</view>
    </view>

    <scroll-view class="character-scroll" scroll-y :show-scrollbar="false">
      <view class="character-list">
        <view v-for="entry in dailyCharacters" :key="entry.id" class="character-row">
          <button
            v-if="coveredFont === 'learning' && !isRevealed(entry.id)"
            class="character-cell cover-cell"
            role="button"
            :aria-label="`显示${entry.script_forms.simplified}的${currentFont.name}字形`"
            @click="revealCharacter(entry.id)"
          >
            <text class="cover-hint">点击显示</text>
          </button>
          <view v-else class="character-cell">
            <text class="character" :style="{ fontFamily: currentFont.fontFamily }">{{ entry.script_forms.simplified }}</text>
          </view>

          <button
            v-if="coveredFont === 'reference' && !isRevealed(entry.id)"
            class="character-cell cover-cell"
            role="button"
            :aria-label="`显示${entry.script_forms.simplified}的${referenceFont.name}字形`"
            @click="revealCharacter(entry.id)"
          >
            <text class="cover-hint">点击显示</text>
          </button>
          <view v-else class="character-cell">
            <text class="character" :style="{ fontFamily: referenceFont.fontFamily }">{{ entry.script_forms.simplified }}</text>
          </view>

          <button
            class="detail-button"
            role="button"
            :aria-label="`查看${entry.script_forms.simplified}的文字详情`"
            @click="openCharacterDetail(entry.id)"
          >
            <van-icon name="search" size="21" aria-hidden="true" />
          </button>
        </view>
      </view>
    </scroll-view>

    <view class="start-wrap">
      <button class="start-button" role="button" aria-label="开始今日学习" @click="startLearning">开始今日学习</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.preview-page { width: min(100%, 560px); height: 100vh; height: 100dvh; margin: 0 auto; overflow: hidden; display: flex; flex-direction: column; background: var(--color-page); color: var(--color-text); }
.preview-header { min-height: calc(66px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 14px 8px; display: grid; grid-template-columns: 48px 1fr 48px; align-items: center; background: var(--color-topbar); }
.header-button, .swap-button, .cover-toggle-button, .character-cell, .detail-button, .start-button { margin: 0; padding: 0; border: 0; color: inherit; line-height: normal; }
.header-button::after, .swap-button::after, .cover-toggle-button::after, .character-cell::after, .detail-button::after, .start-button::after { border: 0; }
.header-button { width: 44px; height: 44px; display: grid; place-items: center; background: transparent; }
.back-icon { font-size: 38px; font-weight: 300; line-height: 1; }
.header-title-wrap { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.header-title { font-size: 18px; font-weight: 700; }
.header-subtitle { color: var(--color-text-muted); font-size: 11px; }
.preview-summary { min-height: 88px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.summary-copy { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.summary-title { font-size: 16px; font-weight: 700; }
.summary-description { overflow: hidden; color: var(--color-text-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.summary-actions { flex: none; display: flex; align-items: center; gap: 7px; }
.swap-button { height: 38px; padding: 0 11px; display: flex; align-items: center; justify-content: center; gap: 5px; border-radius: 8px; background: var(--color-primary-soft); color: var(--color-primary); font-size: 12px; white-space: nowrap; }
.cover-toggle-button { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent); border-radius: 50%; background: var(--color-surface); color: var(--color-primary); box-shadow: 0 3px 10px var(--color-shadow); }
.font-heading { min-height: 52px; padding: 0 10px 0 16px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 46px; align-items: center; gap: 10px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-muted); }
.font-heading-item { min-width: 0; display: flex; align-items: baseline; gap: 5px; }
.font-heading-item.is-covered .font-name::after { content: ' · 遮盖'; color: var(--color-primary); font-size: 10px; font-weight: 500; }
.font-kind { flex: none; color: var(--color-text-muted); font-size: 10px; }
.font-name { overflow: hidden; font-size: 12px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.detail-heading { color: var(--color-text-muted); font-size: 10px; text-align: center; }
.character-scroll { min-height: 0; flex: 1; background: var(--color-surface); }
.character-list { padding-bottom: 6px; }
.character-row { min-height: 74px; padding: 10px 10px 10px 16px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 46px; align-items: stretch; gap: 10px; border-bottom: 1px solid var(--color-border); }
.character-cell { min-width: 0; min-height: 54px; display: grid; place-items: center; border-radius: 7px; background: var(--color-surface-muted); }
.character { font-size: 32px; font-weight: 600; line-height: 1; }
.cover-cell { position: relative; overflow: hidden; background: color-mix(in srgb, var(--color-text-muted) 18%, var(--color-surface)); cursor: pointer; }
.cover-cell::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(135deg, transparent 0 8px, color-mix(in srgb, var(--color-text-muted) 8%, transparent) 8px 16px); }
.cover-hint { position: relative; z-index: 1; color: var(--color-text-muted); font-size: 10px; }
.detail-button { width: 46px; min-height: 54px; display: grid; place-items: center; background: transparent; color: var(--color-text-muted); }
.start-wrap { padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); border-top: 1px solid var(--color-border); background: var(--color-surface); box-shadow: 0 -5px 18px var(--color-shadow); }
.start-button { width: 100%; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 9px; background: var(--color-primary); color: var(--color-on-primary); font-size: 16px; font-weight: 600; line-height: 1; }
@media (max-width: 360px) {
  .preview-summary { padding-right: 12px; padding-left: 12px; }
  .swap-button { padding: 0 8px; font-size: 11px; }
  .cover-toggle-button { width: 36px; height: 36px; }
  .font-heading, .character-row { padding-left: 12px; gap: 7px; }
  .character { font-size: 29px; }
}
@media (prefers-reduced-motion: reduce) { .preview-page * { scroll-behavior: auto; } }
</style>
