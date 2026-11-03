<script setup lang="ts">
import type { LevelLayoutId } from '../../../study/levelLayouts'
defineProps<{ layout: LevelLayoutId }>()
const characters = ['一', '乙', '二', '十', '丁', '厂', '七', '卜', '八', '人']
</script>

<template>
  <view class="layout-preview" :class="'preview-' + layout" aria-hidden="true">
    <text class="mini-title">关卡学习</text>
    <view v-if="layout === 'cards'" class="mini-cards">
      <view v-for="number in 4" :key="number" class="mini-card"><text>关卡 {{ number }}</text><text>{{ characters.slice((number - 1) * 2, number * 2).join(' ') }}</text></view>
    </view>
    <template v-else-if="layout === 'notebook'">
      <view class="mini-book"><text class="mini-big">一</text><view><text>关卡 01</text><text>乙 二 十<br />丁 厂 七</text></view></view>
      <text class="mini-directory">入　关卡 02</text><text class="mini-directory">又　关卡 03</text>
    </template>
    <template v-else-if="layout === 'flashcards'">
      <view class="mini-stack"><text>关卡 01</text><text class="mini-ten">一 乙 二 十 丁<br />厂 七 卜 八 人</text><view class="mini-action" /></view>
    </template>
    <view v-else class="mini-board"><view v-for="character in characters.slice(0, 9)" :key="character">{{ character }}</view></view>
  </view>
</template>

<style scoped lang="scss">
.layout-preview { width: 112px; height: 146px; flex: none; overflow: hidden; padding: 12px 8px; border-radius: 14px; background: var(--color-page); color: var(--color-text); font-size: 9px; line-height: 1.4; }
.mini-title { display: block; margin-bottom: 10px; font-size: 11px; font-weight: 650; }
.mini-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.mini-card { display: flex; flex-direction: column; gap: 7px; height: 43px; padding: 6px; border-radius: 8px; background: var(--color-surface-muted); }
.mini-card:first-child { background: var(--color-primary-soft); }
.mini-card > text:first-child { font-size: 7px; }
.mini-card > text + text { font-size: 12px; }
.mini-book { display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 6px; background: var(--color-surface-muted); }
.mini-big { font-family: 'LevelNotebook', serif; font-size: 34px; }
.mini-book > view { display: flex; flex-direction: column; gap: 5px; font-size: 8px; }
.mini-directory { display: block; padding: 7px 3px 0; font-size: 10px; }
.preview-flashcards { background: var(--color-primary-soft); }
.mini-stack { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 10px 6px; border-radius: 12px; background: var(--color-surface); }
.mini-ten { font-size: 13px; text-align: center; line-height: 1.7; }
.mini-action { width: 100%; height: 12px; border-radius: 10px; background: var(--color-primary-strong); }
.preview-board { background: var(--color-surface-muted); }
.mini-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
.mini-board > view { display: grid; place-items: center; height: 27px; border-radius: 7px; background: var(--color-surface); font-size: 16px; }
.mini-board > view:first-child { background: var(--color-primary-strong); color: var(--color-on-primary); }
@media (max-width: 360px) { .layout-preview { width: 100px; } }
</style>
