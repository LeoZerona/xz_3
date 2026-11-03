<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCharacterComparisonStore } from '../stores/characterComparison'
import { MAX_COMPARISON_CHARACTERS } from '../comparison/characterComparison'
import { openCharacterComparison } from '../comparison/navigation'

const comparisonStore = useCharacterComparisonStore()
const { characters } = storeToRefs(comparisonStore)
function handleRemove(id: string): void {
  if (!comparisonStore.removeCharacter(id)) uni.showToast({ title: '移除失败，请重试', icon: 'none' })
}
</script>

<template>
  <view class="comparison-tray" aria-label="已选比较文字">
    <view class="tray-heading"><h2>字形比较 <text>{{ characters.length }}/{{ MAX_COMPARISON_CHARACTERS }}</text></h2><button class="tray-open" role="button" tabindex="0" aria-label="打开字形比较" @click="openCharacterComparison" @keydown.enter.prevent="openCharacterComparison" @keydown.space.prevent="openCharacterComparison">{{ characters.length > 1 ? '开始比较' : '添加文字' }}<van-icon name="arrow" size="14" aria-hidden="true" /></button></view>
    <view v-if="characters.length" class="tray-characters">
      <button v-for="entry in characters" :key="entry.id" class="tray-character" role="button" tabindex="0" :aria-label="'移除比较文字' + entry.script_forms.simplified" @click="handleRemove(entry.id)" @keydown.enter.prevent="handleRemove(entry.id)" @keydown.space.prevent="handleRemove(entry.id)">{{ entry.script_forms.simplified }}<van-icon name="cross" size="13" aria-hidden="true" /></button>
    </view>
    <text v-else class="tray-description">把形近字放在一起，比较字形与含义。</text>
  </view>
</template>

<style scoped lang="scss">
.comparison-tray { flex: none; padding: 10px 16px 14px; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
.tray-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.tray-heading h2 { margin: 0; font-size: 15px; font-weight: 650; }
.tray-heading h2 text { margin-left: 4px; color: var(--color-text-secondary); font-size: 12px; font-weight: 400; font-variant-numeric: tabular-nums; }
.tray-open { display: flex; align-items: center; gap: 6px; min-height: 44px; margin: 0; padding: 0 4px; border-radius: 0; background: transparent; color: var(--color-primary-strong); font-size: 13px; }
.tray-description { color: var(--color-text-secondary); font-size: 12px; }
.tray-characters { display: flex; flex-wrap: wrap; gap: 6px; }
.tray-character { display: flex; align-items: center; gap: 10px; min-width: 52px; min-height: 44px; margin: 0; padding: 0 12px; border-radius: 12px; background: var(--color-primary-soft); color: var(--color-text); font-size: 20px; }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
