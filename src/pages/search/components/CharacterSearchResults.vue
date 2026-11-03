<script setup lang="ts">
import type { CharacterEntry } from '../../../search/characterSearch'
const props = defineProps<{ entries: CharacterEntry[]; selectedIds: string[]; hasMore: boolean; isSearching: boolean }>()
const emit = defineEmits<{
  (event: 'character-open', entry: CharacterEntry): void
  (event: 'comparison-add', entry: CharacterEntry): void
  (event: 'load-more'): void
}>()
function handleCompareAdd(entry: CharacterEntry): void {
  if (!props.selectedIds.includes(entry.id)) emit('comparison-add', entry)
}
function handleLoadMore(): void { if (!props.isSearching) emit('load-more') }
</script>

<template>
  <scroll-view class="result-scroll" scroll-y :show-scrollbar="false">
    <view v-for="entry in entries" :key="entry.id" class="result-item">
      <button class="result-detail" role="button" tabindex="0" :aria-label="`${entry.script_forms.simplified}，${entry.phonetics.pinyin}，${entry.semantics.definition}`" @click="emit('character-open', entry)" @keydown.enter.prevent="emit('character-open', entry)" @keydown.space.prevent="emit('character-open', entry)">
        <text class="result-character">{{ entry.script_forms.simplified }}</text>
        <view class="result-content">
          <view class="result-title-row"><text class="result-title">{{ entry.script_forms.simplified }}</text><text class="result-pinyin">{{ entry.phonetics.pinyin }}</text></view>
          <text class="result-definition">{{ entry.semantics.definition }}</text>
          <text class="result-meta">{{ entry.structure.total_strokes }}画 · {{ entry.structure.layout }} · {{ entry.semantics.words.join('、') }}</text>
        </view>
      </button>
      <button class="result-compare" :class="{ 'is-selected': selectedIds.includes(entry.id) }" role="button" :tabindex="selectedIds.includes(entry.id) ? -1 : 0" :aria-label="(selectedIds.includes(entry.id) ? '已加入比较：' : '加入比较：') + entry.script_forms.simplified" :aria-pressed="selectedIds.includes(entry.id)" :disabled="selectedIds.includes(entry.id)" @click="handleCompareAdd(entry)" @keydown.enter.prevent="handleCompareAdd(entry)" @keydown.space.prevent="handleCompareAdd(entry)">{{ selectedIds.includes(entry.id) ? '已加入' : '比较' }}</button>
    </view>
    <button v-if="hasMore" class="result-load-more" role="button" :tabindex="isSearching ? -1 : 0" aria-label="加载更多搜索结果" :disabled="isSearching" @click="handleLoadMore" @keydown.enter.prevent="handleLoadMore" @keydown.space.prevent="handleLoadMore">{{ isSearching ? '正在加载…' : '加载更多' }}</button>
  </scroll-view>
</template>

<style scoped lang="scss">
.result-scroll { min-height: 0; flex: 1; height: 100%; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; }
.result-item { display: flex; align-items: center; gap: 8px; margin: 0 14px; border-bottom: 1px solid var(--color-border); }
.result-detail { min-width: 0; flex: 1; display: flex; align-items: center; gap: 12px; min-height: 98px; margin: 0; padding: 12px 0; border-radius: 0; background: transparent; color: var(--color-text); text-align: left; line-height: 1.5; }
.result-character { width: 42px; flex: none; color: var(--color-primary-strong); font-size: 33px; text-align: center; }
.result-content { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.result-title-row { display: flex; align-items: baseline; gap: 8px; }
.result-title { font-size: 15px; font-weight: 650; }
.result-pinyin, .result-meta { color: var(--color-text-secondary); font-size: 12px; }
.result-definition, .result-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result-definition { color: var(--color-text-secondary); font-size: 13px; }
.result-compare { min-width: 56px; min-height: 44px; flex: none; display: grid; place-items: center; margin: 0; padding: 0 8px; border-radius: 12px; background: var(--color-primary-soft); color: var(--color-primary-strong); font-size: 13px; }
.result-compare.is-selected { background: var(--color-surface-muted); color: var(--color-text-secondary); }
.result-load-more { min-height: 48px; margin: 16px auto; padding: 0 20px; border-radius: 12px; background: var(--color-surface-muted); color: var(--color-text); font-size: 14px; }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@media (max-width: 360px) { .result-character { width: 34px; font-size: 29px; } .result-detail { gap: 8px; } }
</style>
