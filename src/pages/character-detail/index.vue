<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import characterTable from '../../static/character_table/first-level.json'
import { useFontStore } from '../../stores/fonts'

const characterId = ref('')
const { currentFont } = storeToRefs(useFontStore())
const character = computed(() => characterTable.chars.find((entry) => entry.id === characterId.value))

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/study-preview/index' }) })
}

onLoad((options) => {
  characterId.value = typeof options?.id === 'string' ? options.id : ''
})
</script>

<template>
  <view class="detail-page">
    <view class="detail-header">
      <button class="back-button" role="button" aria-label="返回" @click="goBack">
        <text aria-hidden="true">‹</text>
      </button>
      <text class="page-title">文字详情</text>
      <view class="header-space" />
    </view>

    <template v-if="character">
      <view class="character-hero">
        <text class="hero-label">{{ currentFont.name }}</text>
        <text class="hero-character" :style="{ fontFamily: currentFont.fontFamily }">{{ character.script_forms.simplified }}</text>
        <view class="hero-reading">
          <text>{{ character.phonetics.pinyin }}</text>
          <text>{{ character.structure.total_strokes }} 画</text>
          <text>{{ character.structure.layout }}</text>
        </view>
      </view>

      <view class="detail-content">
        <view class="info-card">
          <text class="card-title">基本释义</text>
          <text class="definition">{{ character.semantics.definition }}</text>
          <view class="word-list" aria-label="常用词语">
            <text v-for="word in character.semantics.words" :key="word" class="word-chip">{{ word }}</text>
          </view>
        </view>

        <view class="info-card structure-card">
          <view class="structure-item">
            <text class="meta-label">字形结构</text>
            <text class="meta-value">{{ character.structure.layout }}</text>
          </view>
          <view class="structure-item">
            <text class="meta-label">造字法</text>
            <text class="meta-value">{{ character.structure.liushu }}</text>
          </view>
          <view class="structure-item structure-wide">
            <text class="meta-label">字形说明</text>
            <text class="meta-value">{{ character.structure.liushu_detail }}</text>
          </view>
        </view>

        <view class="info-card">
          <text class="card-title">《说文解字》</text>
          <text class="source-version">{{ character.shuowen.source_version }}</text>
          <text class="classical-text">{{ character.shuowen.original }}</text>
          <text class="translation">{{ character.shuowen.translation }}</text>
        </view>

        <view v-if="character.study.tags.length" class="tag-list" aria-label="文字标签">
          <text v-for="tag in character.study.tags" :key="tag" class="tag">{{ tag }}</text>
        </view>
      </view>
    </template>

    <view v-else class="empty-state" role="status">
      <van-icon name="warning-o" size="34" color="var(--color-text-muted)" aria-hidden="true" />
      <text class="empty-title">没有找到这个文字</text>
      <button class="return-button" role="button" @click="goBack">返回今日预览</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page { width: min(100%, 560px); min-height: 100vh; min-height: 100dvh; margin: 0 auto; background: var(--color-page); color: var(--color-text); }
.detail-header { min-height: calc(58px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 12px 0; display: grid; grid-template-columns: 48px 1fr 48px; align-items: center; border-bottom: 1px solid var(--color-border); background: var(--color-topbar); }
.back-button, .return-button { margin: 0; padding: 0; border: 0; color: inherit; line-height: normal; }
.back-button::after, .return-button::after { border: 0; }
.back-button { width: 44px; height: 44px; display: grid; place-items: center; background: transparent; font-size: 38px; font-weight: 300; }
.page-title { font-size: 18px; font-weight: 700; text-align: center; }
.character-hero { padding: 24px 18px 28px; display: flex; flex-direction: column; align-items: center; background: linear-gradient(180deg, var(--color-topbar), var(--color-primary-soft)); }
.hero-label { align-self: flex-end; color: var(--color-primary); font-size: 11px; }
.hero-character { margin-top: 2px; font-size: 92px; font-weight: 600; line-height: 1.2; }
.hero-reading { margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 14px; color: var(--color-text-secondary); font-size: 13px; }
.hero-reading text + text { position: relative; }
.hero-reading text + text::before { content: ''; position: absolute; top: 50%; left: -8px; width: 2px; height: 2px; border-radius: 50%; background: currentColor; }
.detail-content { padding: 16px 14px calc(24px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 12px; }
.info-card { padding: 17px 16px; display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface); box-shadow: 0 6px 20px var(--color-shadow); }
.card-title { font-size: 15px; font-weight: 700; }
.definition { color: var(--color-text-secondary); font-size: 15px; line-height: 1.65; }
.word-list, .tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
.word-chip, .tag { padding: 6px 10px; border-radius: 14px; background: var(--color-primary-soft); color: var(--color-primary); font-size: 12px; }
.structure-card { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 12px; }
.structure-item { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.structure-wide { grid-column: 1 / -1; }
.meta-label, .source-version { color: var(--color-text-muted); font-size: 11px; }
.meta-value { font-size: 14px; line-height: 1.55; }
.classical-text, .translation { font-size: 14px; line-height: 1.75; }
.classical-text { color: var(--color-text); }
.translation { padding-top: 10px; border-top: 1px solid var(--color-border); color: var(--color-text-secondary); }
.tag-list { padding: 2px; }
.tag { background: var(--color-surface-muted); color: var(--color-text-secondary); }
.empty-state { min-height: calc(100vh - 100px); padding: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.empty-title { font-size: 16px; font-weight: 600; }
.return-button { height: 42px; padding: 0 18px; border-radius: 8px; background: var(--color-primary); color: var(--color-on-primary); font-size: 14px; }
</style>
