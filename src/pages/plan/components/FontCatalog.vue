<script setup lang="ts">
import { storeToRefs } from 'pinia'
import FontCover from '../../../components/FontCover.vue'
import { fontCatalog } from '../../../fonts/catalog'
import { useFontStore } from '../../../stores/fonts'

const fontStore = useFontStore()
const { addedFontIds } = storeToRefs(fontStore)

function handleAdd(fontId: string) {
  if (fontStore.isAdded(fontId)) return
  fontStore.addFont(fontId)
  uni.showToast({ title: '字体已添加', icon: 'success' })
}
</script>

<template>
  <main class="catalog-page">
    <view class="catalog-intro">
      <text class="catalog-title">选择练习字体</text>
      <text class="catalog-description">添加后可在“修改字体”中切换，并用于首页展示、学习计划和练习内容。</text>
    </view>

    <view class="catalog-list" aria-label="可选字体">
      <div
        v-for="font in fontCatalog"
        :key="font.id"
        class="catalog-item"
        :class="{ 'is-added': addedFontIds.includes(font.id) }"
        role="button"
        tabindex="0"
        :aria-label="addedFontIds.includes(font.id) ? `${font.name}已添加` : `添加${font.name}`"
        @click="handleAdd(font.id)"
        @keydown.enter="handleAdd(font.id)"
        @keydown.space.prevent="handleAdd(font.id)"
      >
        <FontCover :font="font" />
        <view class="catalog-copy">
          <view class="catalog-heading">
            <text class="font-name">{{ font.name }}</text>
            <text v-if="addedFontIds.includes(font.id)" class="added-label">已添加</text>
            <text v-else class="add-label">添加</text>
          </view>
          <text class="font-description">{{ font.description }}</text>
          <text class="font-total">共 {{ font.total }} 字</text>
        </view>
      </div>
    </view>
  </main>
</template>

<style scoped>
.catalog-page { height: calc(100vh - 58px - var(--app-top-safe-area)); height: calc(100dvh - 58px - var(--app-top-safe-area)); padding-bottom: calc(28px + env(safe-area-inset-bottom)); overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; background: var(--color-page); -webkit-overflow-scrolling: touch; }
.catalog-intro { padding: 22px 18px 16px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.catalog-title { display: block; font-size: 18px; font-weight: 700; }
.catalog-description { display: block; max-width: 430px; margin-top: 7px; color: var(--color-text-secondary); font-size: 12px; line-height: 1.55; }
.catalog-list { padding: 4px 16px 0; }
.catalog-item { min-height: 112px; display: flex; align-items: center; gap: 18px; border-bottom: 1px solid var(--color-border); cursor: pointer; }
.catalog-item.is-added { opacity: .58; }
.catalog-copy { min-width: 0; flex: 1; }
.catalog-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.font-name { font-size: 16px; font-weight: 700; }
.added-label, .add-label { flex: none; font-size: 11px; }
.added-label { color: var(--color-text-muted); }
.add-label { color: var(--color-primary); }
.font-description { display: block; margin-top: 7px; color: var(--color-text-secondary); font-size: 12px; line-height: 1.45; }
.font-total { display: block; margin-top: 6px; color: var(--color-text-muted); font-size: 11px; }
@media (max-width: 360px) { .catalog-list { padding-right: 12px; padding-left: 12px; } .catalog-item { gap: 14px; } }
</style>
