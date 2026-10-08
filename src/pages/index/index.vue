<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppBottomNavigation from '../../components/AppBottomNavigation.vue'
import FontCover from '../../components/FontCover.vue'
import { fontCatalog } from '../../fonts/catalog'
import { useFontStore } from '../../stores/fonts'

const { addedFonts, currentFont } = storeToRefs(useFontStore())
const referenceFont = computed(() => (
  addedFonts.value.find((font) => font.id !== currentFont.value.id)
  ?? fontCatalog.find((font) => font.id !== currentFont.value.id)
  ?? currentFont.value
))
const displayedFonts = computed(() => [
  { role: '学习字体', font: currentFont.value },
  { role: '对照字体', font: referenceFont.value },
])

function showPlaceholder(label: string) {
  uni.showToast({ title: `${label}功能开发中`, icon: 'none' })
}

function openSearch() {
  uni.navigateTo({ url: '/pages/search/index' })
}
</script>

<template>
  <view class="home">
    <view class="topbar">
      <button class="icon-button" role="button" aria-label="搜索" @click="openSearch"><van-icon name="search" size="24" aria-hidden="true" /></button>
      <button class="icon-button" role="button" aria-label="消息提示"><van-icon name="envelop-o" size="24" aria-hidden="true" /></button>
    </view>

    <view class="font-list">
      <view v-for="item in displayedFonts" :key="item.role" class="font-row">
        <FontCover :font="item.font" sample-only />
        <view class="font-detail">
          <text class="font-title">{{ item.role }}：{{ item.font.name }}</text>
          <text class="font-description">{{ item.font.description }}</text>
        </view>
      </view>
    </view>

    <view class="plan">
      <view class="section-heading">
        <text class="section-title">今日计划</text>
        <navigator class="edit-plan" url="/pages/plan/index" hover-class="none" role="button" aria-label="修改">修改</navigator>
      </view>
      <view class="plan-stats">
        <view class="stat"><text class="stat-label">已新学</text><text class="stat-value">x/y</text></view>
        <view class="stat"><text class="stat-label">已复习</text><text class="stat-value">x/y</text></view>
        <view class="stat"><text class="stat-label">已学习时长</text><text class="stat-value stat-time">xxx min</text></view>
      </view>
      <view class="plan-actions">
        <navigator
          class="action-button action-primary"
          url="/pages/study-preview/index"
          hover-class="none"
          role="button"
          aria-label="开始学习"
        >开始学习</navigator>
        <button class="action-button action-secondary" role="button">复习</button>
      </view>
    </view>

    <AppBottomNavigation active-tab="study" @unavailable="showPlaceholder" />
  </view>
</template>

<style scoped lang="scss">
.home { width: min(100%, 560px); min-height: 100vh; min-height: 100dvh; margin: 0 auto; display: flex; flex-direction: column; background: var(--color-page); color: var(--color-text); }
.topbar { height: calc(58px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 20px 0; display: flex; align-items: center; justify-content: flex-end; gap: 10px; background: var(--color-topbar); }
.icon-button { width: 38px; height: 38px; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; color: var(--color-text); }
.icon-button::after, .action-button::after { border: 0; }
.font-list { padding: 8px 16px 0; }
.font-row { min-height: 102px; display: flex; align-items: center; gap: 18px; border-bottom: 1px solid var(--color-border); }
.font-detail { min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.font-title { font-size: 14px; font-weight: 600; }
.font-description { color: var(--color-text-secondary); font-size: 10px; line-height: 1.45; }
.plan { padding: 22px 16px 28px; }
.section-title { display: block; font-size: 15px; font-weight: 700; }
.section-heading { display: flex; align-items: center; justify-content: space-between; }
.edit-plan { height: 34px; padding: 0 4px; display: flex; align-items: center; color: var(--color-primary); font-size: 10px; }
.plan-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 24px; }
.stat { min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.stat-label { color: var(--color-text-secondary); font-size: 10px; white-space: nowrap; }
.stat-value { font-size: 24px; line-height: 1.2; font-weight: 700; letter-spacing: -.03em; }
.stat-time { font-size: 20px; white-space: nowrap; }
.plan-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 28px; }
.action-button { width: 100%; min-width: 0; height: 58px; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 9px; font-size: 17px; font-weight: 600; line-height: 1; }
.action-primary { background: var(--color-primary); color: var(--color-on-primary); }
.action-secondary { background: var(--color-primary-soft); color: var(--color-primary); }
@media (max-width: 360px) { .font-row { min-height: 98px; gap: 14px; } .stat-label { font-size: 8px; } .stat-value { font-size: 20px; } .stat-time { font-size: 15px; } }
</style>
