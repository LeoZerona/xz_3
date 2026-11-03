<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onBackPress } from '@dcloudio/uni-app'
import DatabaseStatus from '../../components/DatabaseStatus.vue'
import { useFontStore } from '../../stores/fonts'
import { useThemeStore } from '../../stores/theme'
import type { ReviewFilter } from '../../study/levelReview'
import { useLevelReview } from './useLevelReview'

const { currentFont } = storeToRefs(useFontStore())
const { themeStyle } = storeToRefs(useThemeStore())
const { filter, character, isLoading, loadError, dueCount, totalCount, nextDueLabel, switchFilter, handleAnswer, startEarlyReview, retry } = useLevelReview()
const filters: Array<{ id: ReviewFilter; label: string }> = [
  { id: 'all', label: '全部' }, { id: 'slashed', label: '斩列表' }, { id: 'favorites', label: '收藏列表' },
]
function handleBack(): void {
  if (getCurrentPages().length > 1) uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/levels/index' }) })
  else uni.reLaunch({ url: '/pages/levels/index' })
}
onBackPress((event) => { if (event.from === 'navigateBack') return false; handleBack(); return true })
</script>

<template>
  <view class="review-page" :style="themeStyle">
    <DatabaseStatus />
    <view class="review-header">
      <button class="back-button review-control" role="button" tabindex="0" aria-label="返回" @click="handleBack" @keydown.enter.prevent="handleBack" @keydown.space.prevent="handleBack"><van-icon name="arrow-left" size="22" aria-hidden="true" /></button>
      <h1>关卡复习</h1>
      <text class="review-total">{{ totalCount }} 字</text>
    </view>
    <view class="review-filters" role="tablist" aria-label="复习范围">
      <button v-for="item in filters" :id="'review-filter-' + item.id" :key="item.id" class="filter-button review-control" role="tab" tabindex="0" :aria-selected="filter === item.id" aria-controls="review-content" :class="{ 'is-active': filter === item.id }" :disabled="isLoading" @click="switchFilter(item.id)" @keydown.enter.prevent="switchFilter(item.id)" @keydown.space.prevent="switchFilter(item.id)">{{ item.label }}</button>
    </view>
    <view class="review-summary"><text>间隔复习 · 最早到期优先</text><text>待复习 {{ dueCount }} 字</text></view>
    <view id="review-content" class="review-content" role="tabpanel" :aria-labelledby="'review-filter-' + filter" :aria-busy="isLoading">
      <view v-if="loadError" class="review-state" role="alert"><text>{{ loadError }}</text><button class="state-button review-control" role="button" tabindex="0" @click="retry" @keydown.enter.prevent="retry" @keydown.space.prevent="retry">重试</button></view>
      <view v-else-if="isLoading" class="review-state" role="status"><text>正在准备复习…</text></view>
      <template v-else-if="character">
        <view class="review-glyph" :style="{ fontFamily: currentFont.fontFamily }" aria-label="待复习字形">{{ character.script_forms.simplified }}</view>
        <view class="review-actions">
          <button class="answer-button answer-unknown review-control" role="button" tabindex="0" @click="handleAnswer(false)" @keydown.enter.prevent="handleAnswer(false)" @keydown.space.prevent="handleAnswer(false)">不认识</button>
          <button class="answer-button answer-known review-control" role="button" tabindex="0" @click="handleAnswer(true)" @keydown.enter.prevent="handleAnswer(true)" @keydown.space.prevent="handleAnswer(true)">认识</button>
        </view>
      </template>
      <view v-else class="review-state" role="status">
        <h2>{{ totalCount ? '本轮复习完成' : '这里还没有文字' }}</h2>
        <text v-if="totalCount">下次复习约在 {{ nextDueLabel }}，也可以提前温习。</text>
        <text v-else-if="filter === 'all'">在关卡中学习文字后，会自动加入这里。</text>
        <text v-else>学习过的文字加入对应列表后，会出现在这里。</text>
        <button v-if="totalCount" class="state-button review-control" role="button" tabindex="0" @click="startEarlyReview" @keydown.enter.prevent="startEarlyReview" @keydown.space.prevent="startEarlyReview">提前复习全部 {{ totalCount }} 字</button>
        <button v-else class="state-button review-control" role="button" tabindex="0" @click="handleBack" @keydown.enter.prevent="handleBack" @keydown.space.prevent="handleBack">返回学习</button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.review-page { width: min(100%, 560px); height: 100vh; height: 100dvh; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; color: var(--color-text); background: var(--color-page); font-variant-numeric: tabular-nums; }
.review-header { display: flex; align-items: center; gap: 12px; padding: calc(12px + var(--app-top-safe-area)) 20px 12px; }
.review-header h1 { flex: 1; margin: 0; font-size: 22px; font-weight: 600; }
.back-button { display: grid; place-items: center; width: 44px; height: 44px; margin: 0 0 0 -8px; padding: 0; background: transparent; color: var(--color-text); }
.review-total { font-size: 14px; color: var(--color-text-secondary); }
.review-filters { display: flex; gap: 4px; margin: 0 20px; padding: 4px; border-radius: 12px; background: var(--color-surface-muted); }
.filter-button { flex: 1; min-width: 0; min-height: 44px; display: flex; align-items: center; justify-content: center; margin: 0; padding: 0 8px; border-radius: 8px; background: transparent; color: var(--color-text-secondary); font-size: 14px; line-height: 1.4; }
.review-filters .is-active { background: var(--color-surface); color: var(--color-text); font-weight: 600; }
.review-summary { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; padding: 16px 20px; color: var(--color-text-secondary); font-size: 13px; }
.review-content { min-height: 0; flex: 1; display: flex; flex-direction: column; }
.review-glyph { flex: 1; min-height: 0; display: grid; place-items: center; margin: 0 20px; font-size: clamp(100px, 36vw, 190px); line-height: 1.2; user-select: none; }
.review-actions { flex: none; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 20px 20px calc(24px + env(safe-area-inset-bottom)); }
.answer-button { width: 100%; min-height: 56px; display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; border-radius: 12px; font-size: 17px; font-weight: 600; line-height: 1.4; }
.answer-unknown { background: var(--color-surface-muted); color: var(--color-text); }
.answer-known { background: var(--color-primary); color: var(--color-on-primary); }
.review-state { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 16px; padding: 24px; text-align: center; color: var(--color-text-secondary); font-size: 14px; line-height: 1.6; }
.review-state h2 { margin: 0; font-size: 22px; font-weight: 600; color: var(--color-text); }
.state-button { min-height: 48px; display: flex; align-items: center; justify-content: center; margin: 8px 0 0; padding: 0 20px; border-radius: 12px; background: var(--color-primary); color: var(--color-on-primary); font-size: 14px; line-height: 1.4; }
.review-control::after { border: 0; }
.review-control:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
.review-control:active { opacity: .8; }
</style>
