<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import characterTable from '../../static/character_table/first-level.json'
import { searchCharacters } from '../../search/characterSearch'
import type { CharacterEntry } from '../../search/characterSearch'
import { readLocal, writeLocal } from '../../utils/storage'

type SearchMode = 'character' | 'word' | 'sentence' | 'article'

type SearchModeOption = {
  id: SearchMode
  label: string
}

const SEARCH_HISTORY_KEY = 'font-learning-search-history'
const MAX_HISTORY_COUNT = 20
const modes: SearchModeOption[] = [
  { id: 'character', label: '单字' },
  { id: 'word', label: '词语' },
  { id: 'sentence', label: '句子' },
  { id: 'article', label: '文章' },
]

const query = ref('')
const activeMode = ref<SearchMode>('character')
const searchHistory = ref<string[]>([])

const trimmedQuery = computed(() => query.value.trim())
const isCharacterMode = computed(() => activeMode.value === 'character')
const results = computed<CharacterEntry[]>(() => (
  isCharacterMode.value ? searchCharacters(characterTable.chars, trimmedQuery.value) : []
))
const resultSummary = computed(() => `找到 ${results.value.length} 个单字`)
const activeModeLabel = computed(() => modes.find((mode) => mode.id === activeMode.value)?.label ?? '')

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
}

function clearQuery() {
  query.value = ''
}

function selectMode(mode: SearchMode) {
  activeMode.value = mode
}

function useHistoryItem(value: string) {
  query.value = value
}

async function saveSearch() {
  const value = trimmedQuery.value
  if (!value || !isCharacterMode.value) return
  searchHistory.value = [value, ...searchHistory.value.filter((item) => item !== value)].slice(0, MAX_HISTORY_COUNT)
  await persistHistory()
}

async function clearHistory() {
  searchHistory.value = []
  await persistHistory()
}

async function persistHistory() {
  try {
    await writeLocal(SEARCH_HISTORY_KEY, searchHistory.value)
  } catch (error) {
    console.warn('搜索记录保存失败', error)
    uni.showToast({ title: '搜索记录保存失败', icon: 'none' })
  }
}

function handleResultClick(entry: CharacterEntry) {
  void saveSearch()
  uni.navigateTo({
    url: `/pages/character-detail/index?id=${encodeURIComponent(entry.id)}`,
    fail: (error) => {
      console.error('文字详情打开失败', error)
      uni.showToast({ title: '文字详情打开失败', icon: 'none' })
    },
  })
}

onMounted(async () => {
  searchHistory.value = (await readLocal<string[]>(SEARCH_HISTORY_KEY)) ?? []
  await nextTick()
  if (typeof document !== 'undefined') {
    document.querySelector<HTMLInputElement>('.search-input input')?.setAttribute('aria-label', '搜索汉字或拼音')
  }
})
</script>

<template>
  <view class="search-page">
    <view class="search-header">
      <view class="search-field">
        <van-icon name="search" size="18" aria-hidden="true" />
        <label class="search-control">
          <text class="sr-only">搜索汉字或拼音</text>
          <input
            v-model="query"
            class="search-input"
            type="text"
            confirm-type="search"
            :focus="true"
            placeholder="输入汉字或拼音"
            @confirm="saveSearch"
          >
        </label>
        <button v-if="query" class="clear-button" role="button" aria-label="清空搜索" @click="clearQuery">
          <van-icon name="clear" size="17" aria-hidden="true" />
        </button>
      </view>
      <button class="cancel-button" role="button" aria-label="取消搜索" @click="goBack">取消</button>
    </view>

    <view class="mode-tabs" role="tablist" aria-label="搜索范围">
      <button
        v-for="mode in modes"
        :key="mode.id"
        class="mode-tab"
        :class="{ 'is-active': activeMode === mode.id }"
        role="tab"
        :aria-selected="activeMode === mode.id"
        @click="selectMode(mode.id)"
      >{{ mode.label }}模式</button>
    </view>

    <view v-if="searchHistory.length && !trimmedQuery" class="history-section">
      <view class="section-heading">
        <text class="section-title">搜索记录</text>
        <button class="text-button" role="button" aria-label="清空搜索记录" @click="clearHistory">清空</button>
      </view>
      <scroll-view class="history-scroll" scroll-x :show-scrollbar="false">
        <view class="history-track">
          <button
            v-for="item in searchHistory"
            :key="item"
            class="history-chip"
            role="button"
            :aria-label="`搜索 ${item}`"
            @click="useHistoryItem(item)"
          >{{ item }}</button>
        </view>
      </scroll-view>
    </view>

    <view v-if="trimmedQuery && !isCharacterMode" class="empty-state" role="status">
      <text class="empty-title">{{ activeModeLabel }}模式暂未开放</text>
      <text class="empty-description">当前仅支持单字模式查询，请切换到单字模式。</text>
    </view>

    <template v-else-if="trimmedQuery">
      <view class="result-heading" aria-live="polite">{{ resultSummary }}</view>
      <scroll-view v-if="results.length" class="result-scroll" scroll-y :show-scrollbar="false">
        <div
          v-for="entry in results"
          :key="entry.id"
          class="result-item"
          role="button"
          tabindex="0"
          :aria-label="`${entry.script_forms.simplified}，${entry.phonetics.pinyin}，${entry.semantics.definition}`"
          @click="handleResultClick(entry)"
          @keydown.enter="handleResultClick(entry)"
          @keydown.space.prevent="handleResultClick(entry)"
        >
          <text class="result-character">{{ entry.script_forms.simplified }}</text>
          <view class="result-content">
            <view class="result-title-row">
              <text class="result-title">{{ entry.script_forms.simplified }}</text>
              <text class="result-pinyin">{{ entry.phonetics.pinyin }}</text>
            </view>
            <text class="result-definition">{{ entry.semantics.definition }}</text>
            <text class="result-meta">{{ entry.structure.total_strokes }}画 · {{ entry.structure.layout }} · {{ entry.semantics.words.join('、') }}</text>
          </view>
          <van-icon name="arrow" size="15" class="result-arrow" aria-hidden="true" />
        </div>
      </scroll-view>
      <view v-else class="empty-state" role="status">
        <text class="empty-title">没有找到相关单字</text>
        <text class="empty-description">试试输入单个汉字，或不带声调的拼音。</text>
      </view>
    </template>

    <view v-else-if="!searchHistory.length" class="empty-state empty-initial">
      <van-icon name="search" size="34" color="var(--color-text-muted)" aria-hidden="true" />
      <text class="empty-title">搜索想学习的汉字</text>
      <text class="empty-description">支持汉字与拼音模糊搜索，例如“一”或“shi”。</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.search-page { width: min(100%, 560px); height: 100vh; height: 100dvh; margin: 0 auto; overflow: hidden; display: flex; flex-direction: column; background: var(--color-page); color: var(--color-text); }
.search-header { padding: calc(var(--app-top-safe-area) + 8px) 14px 8px; display: flex; align-items: center; gap: 9px; background: var(--color-topbar); }
.search-field { min-width: 0; height: 42px; padding: 0 12px; flex: 1; display: flex; align-items: center; gap: 8px; border: 1px solid var(--color-border); border-radius: 11px; background: var(--color-surface); color: var(--color-text-muted); }
.search-control { min-width: 0; height: 100%; flex: 1; display: flex; align-items: center; }
.search-input { min-width: 0; height: 100%; flex: 1; color: var(--color-text); font-size: 13px; }
.search-input::placeholder { color: var(--color-text-muted); }
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
.clear-button, .cancel-button, .mode-tab, .text-button, .history-chip, .result-item { margin: 0; padding: 0; border: 0; background: transparent; color: inherit; line-height: normal; }
.clear-button::after, .cancel-button::after, .mode-tab::after, .text-button::after, .history-chip::after, .result-item::after { border: 0; }
.clear-button { width: 28px; height: 32px; display: grid; place-items: center; color: var(--color-text-muted); }
.cancel-button { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; font-size: 13px; line-height: 1; }
.mode-tabs { padding: 7px 16px 10px; display: flex; align-items: center; justify-content: space-around; border-bottom: 1px solid var(--color-border); background: var(--color-topbar); }
.mode-tab { position: relative; min-width: 58px; height: 38px; color: var(--color-text-secondary); font-size: 11px; white-space: nowrap; }
.mode-tab.is-active { color: var(--color-primary); font-weight: 600; }
.mode-tab.is-active::before { content: ''; position: absolute; right: 16px; bottom: 1px; left: 16px; height: 2px; border-radius: 2px; background: currentColor; }
.history-section { padding: 20px 0 16px; }
.section-heading { padding: 0 16px 12px; display: flex; align-items: center; justify-content: space-between; }
.section-title { font-size: 13px; font-weight: 700; }
.text-button { min-width: 42px; height: 32px; color: var(--color-text-muted); font-size: 10px; }
.history-scroll { width: 100%; white-space: nowrap; }
.history-track { width: max-content; padding: 0 16px 6px; display: flex; gap: 9px; }
.history-chip { min-width: 54px; height: 34px; padding: 0 14px; border-radius: 17px; background: var(--color-surface-muted); color: var(--color-text-secondary); font-size: 11px; }
.result-heading { height: 40px; padding: 0 16px; display: flex; align-items: center; border-bottom: 1px solid var(--color-border); color: var(--color-text-muted); font-size: 10px; }
.result-scroll { min-height: 0; flex: 1; }
.result-item { width: calc(100% - 28px); min-height: 92px; margin: 0 14px; padding: 13px 2px; display: flex; align-items: center; gap: 13px; border-bottom: 1px solid var(--color-border); text-align: left; }
.result-character { width: 52px; flex: 0 0 52px; color: var(--color-primary-strong); font-size: 33px; font-weight: 600; text-align: center; }
.result-content { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 5px; }
.result-title-row { display: flex; align-items: baseline; gap: 8px; }
.result-title { font-size: 15px; font-weight: 700; }
.result-pinyin { color: var(--color-text-muted); font-size: 11px; }
.result-definition, .result-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result-definition { color: var(--color-text-secondary); font-size: 11px; }
.result-meta { color: var(--color-text-muted); font-size: 9px; }
.result-arrow { flex: 0 0 auto; color: var(--color-text-muted); }
.empty-state { min-height: 0; padding: 42px 24px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; }
.empty-initial { justify-content: flex-start; padding-top: 20vh; }
.empty-title { font-size: 14px; font-weight: 600; }
.empty-description { max-width: 300px; color: var(--color-text-muted); font-size: 11px; line-height: 1.6; }
@media (max-width: 360px) { .search-header { padding-right: 10px; padding-left: 10px; } .mode-tabs { padding-right: 8px; padding-left: 8px; } .mode-tab { min-width: 54px; font-size: 10px; } .result-character { width: 45px; flex-basis: 45px; font-size: 29px; } }
@media (prefers-reduced-motion: reduce) { .search-page * { scroll-behavior: auto; } }
</style>
