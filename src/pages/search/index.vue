<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { onBackPress, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import DatabaseStatus from '../../components/DatabaseStatus.vue'
import CharacterComparisonTray from '../../components/CharacterComparisonTray.vue'
import CharacterSearchResults from './components/CharacterSearchResults.vue'
import { useThemeStore } from '../../stores/theme'
import { useCharacterComparisonStore } from '../../stores/characterComparison'
import { comparisonAdditionMessage } from '../../comparison/characterComparison'
import { SEARCH_MODES as modes, useCharacterSearch } from './useCharacterSearch'
import type { CharacterEntry } from '../../search/characterSearch'
import ContentSearchPanel from '../../library/ContentSearchPanel.vue'
import { consumeSearchReturnUrl } from '../../search/navigation'

const { themeStyle } = storeToRefs(useThemeStore())
const comparisonStore = useCharacterComparisonStore()
const { selectedIds } = storeToRefs(comparisonStore)
const { query, activeMode, searchHistory, results, totalResults, isSearching, searchError, missingCharacters, trimmedQuery, isCharacterMode, batchCharacters, resultSummary, loadResults, saveSearch, clearHistory } = useCharacterSearch()
const contentMode = computed(() => activeMode.value === 'character' ? 'word' : activeMode.value)
const returnDetailUrl = ref<string | null>(null)
let previousSearchQuery = ''
let previousSearchMode: typeof activeMode.value = 'character'
onShow(() => {
  const previousDetail = consumeSearchReturnUrl()
  if (!previousDetail) return
  previousSearchQuery = query.value
  previousSearchMode = activeMode.value
  query.value = ''
  activeMode.value = 'character'
  returnDetailUrl.value = previousDetail
})
// 搜索随输入执行；新查询开始后，旧详情不再是本次搜索的返回目标。
watch(trimmedQuery, value => { if (value) returnDetailUrl.value = null }, { flush: 'sync' })
function handleContentOpen(url: string): void { void saveSearch(); uni.navigateTo({url,fail:()=>uni.showToast({title:'内容页面打开失败，请重试',icon:'none'})}) }

function goBack(): void {
  if (returnDetailUrl.value) {
    uni.navigateTo({
      url: returnDetailUrl.value,
      success: () => {
        query.value = previousSearchQuery
        activeMode.value = previousSearchMode
        returnDetailUrl.value = null
      },
      fail: () => uni.showToast({ title: '暂时无法返回文字详情，请重试', icon: 'none' }),
    })
    return
  }
  if (getCurrentPages().length > 1) uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/index/index' }) })
  else uni.reLaunch({ url: '/pages/index/index' })
}
onBackPress((event) => {
  if (event.from === 'navigateBack') return false
  goBack()
  return true
})
function handleResultClick(entry: CharacterEntry): void {
  void saveSearch()
  uni.navigateTo({ url: '/pages/character-detail/index?id=' + encodeURIComponent(entry.id), fail: () => uni.showToast({ title: '文字详情打开失败', icon: 'none' }) })
}
function handleComparisonAdd(entry: CharacterEntry): void {
  const result = comparisonStore.addCharacters([entry])
  uni.showToast({ title: comparisonAdditionMessage(result), icon: 'none' })
}
function handleBatchAdd(): void {
  if (isSearching.value) return
  const result = comparisonStore.addCharacters(results.value)
  uni.showToast({ title: comparisonAdditionMessage(result, missingCharacters.value), icon: 'none' })
  void saveSearch()
}
onMounted(async () => {
  // #ifdef H5
  await nextTick()
  document.querySelector<HTMLInputElement>('.search-page .search-input input')?.setAttribute('aria-label', '搜索汉字或拼音')
  // #endif
})
</script>

<template>
  <view class="search-page" :style="themeStyle">
    <DatabaseStatus />
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
        <button v-if="query" class="clear-button" role="button" tabindex="0" aria-label="清空搜索" @click="query = ''" @keydown.enter.prevent="query = ''" @keydown.space.prevent="query = ''">
          <van-icon name="clear" size="17" aria-hidden="true" />
        </button>
      </view>
      <button class="cancel-button" role="button" tabindex="0" aria-label="取消搜索" @click="goBack" @keydown.enter.prevent="goBack" @keydown.space.prevent="goBack">取消</button>
    </view>

    <view class="mode-tabs" role="tablist" aria-label="搜索范围">
      <button
        v-for="mode in modes"
        :key="mode.id"
        class="mode-tab"
        :class="{ 'is-active': activeMode === mode.id }"
        role="tab"
        tabindex="0"
        :aria-selected="activeMode === mode.id"
        @click="activeMode = mode.id"
        @keydown.enter.prevent="activeMode = mode.id"
        @keydown.space.prevent="activeMode = mode.id"
      >{{ mode.label }}模式</button>
    </view>

    <CharacterComparisonTray />

    <view v-if="searchHistory.length && !trimmedQuery" class="history-section">
      <view class="section-heading">
        <text class="section-title">搜索记录</text>
        <button class="text-button" role="button" tabindex="0" aria-label="清空搜索记录" @click="clearHistory" @keydown.enter.prevent="clearHistory" @keydown.space.prevent="clearHistory">清空</button>
      </view>
      <scroll-view class="history-scroll" scroll-x :show-scrollbar="false">
        <view class="history-track">
          <button
            v-for="item in searchHistory"
            :key="item"
            class="history-chip"
            role="button"
            tabindex="0"
            :aria-label="`搜索 ${item}`"
            @click="query = item"
            @keydown.enter.prevent="query = item"
            @keydown.space.prevent="query = item"
          >{{ item }}</button>
        </view>
      </scroll-view>
    </view>

    <ContentSearchPanel v-if="!isCharacterMode" :query="trimmedQuery" :mode="contentMode" @open="handleContentOpen" />

    <template v-else-if="trimmedQuery">
      <view class="result-heading" aria-live="polite">{{ resultSummary }}</view>
      <text v-if="missingCharacters.length" class="search-notice" role="status">字库暂未收录：{{ missingCharacters.join('、') }}</text>
      <button v-if="batchCharacters.length" class="batch-add-button" role="button" :tabindex="isSearching || !results.length ? -1 : 0" aria-label="将搜索文字加入比较" :disabled="isSearching || !results.length" @click="handleBatchAdd" @keydown.enter.prevent="handleBatchAdd" @keydown.space.prevent="handleBatchAdd">将这些字加入比较</button>
      <button v-if="searchError" class="batch-add-button" role="button" tabindex="0" @click="loadResults()" @keydown.enter.prevent="loadResults()" @keydown.space.prevent="loadResults()">重试搜索</button>
      <CharacterSearchResults
        v-if="results.length"
        :entries="results"
        :selected-ids="selectedIds"
        :has-more="results.length < totalResults"
        :is-searching="isSearching"
        @character-open="handleResultClick"
        @comparison-add="handleComparisonAdd"
        @load-more="loadResults(true)"
      />
      <view v-else-if="!isSearching && !searchError" class="empty-state" role="status">
        <text class="empty-title">没有找到相关单字</text>
        <text class="empty-description">试试其他汉字，或不带声调的拼音。</text>
      </view>
    </template>

    <view v-else-if="!searchHistory.length" class="empty-state empty-initial">
      <van-icon name="search" size="34" color="var(--color-text-muted)" aria-hidden="true" />
      <text class="empty-title">搜索想学习的汉字</text>
      <text class="empty-description">支持汉字、拼音或多个汉字，例如“未末”或“shi”。</text>
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
.clear-button, .cancel-button, .mode-tab, .text-button, .history-chip { margin: 0; padding: 0; border: 0; background: transparent; color: inherit; line-height: normal; }
.clear-button::after, .cancel-button::after, .mode-tab::after, .text-button::after, .history-chip::after { border: 0; }
.clear-button { width: 44px; height: 44px; flex: none; display: grid; place-items: center; border-radius: var(--control-radius); color: var(--color-text-secondary); }
.cancel-button { width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; border-radius: var(--control-radius); font-size: 13px; line-height: 1; }
.mode-tabs { padding: 7px 16px 10px; display: flex; align-items: center; justify-content: space-around; border-bottom: 1px solid var(--color-border); background: var(--color-topbar); }
.mode-tab { position: relative; min-width: 58px; min-height: 44px; color: var(--color-text-secondary); font-size: 12px; white-space: nowrap; }
.mode-tab.is-active { color: var(--color-primary); font-weight: 600; }
.mode-tab.is-active::before { content: ''; position: absolute; right: 16px; bottom: 1px; left: 16px; height: 2px; border-radius: 2px; background: currentColor; }
.history-section { padding: 20px 0 16px; }
.section-heading { padding: 0 16px 12px; display: flex; align-items: center; justify-content: space-between; }
.section-title { font-size: 13px; font-weight: 700; }
.text-button { min-width: 44px; min-height: 44px; color: var(--color-text-secondary); font-size: 12px; }
.history-scroll { width: 100%; white-space: nowrap; }
.history-track { width: max-content; padding: 0 16px 6px; display: flex; gap: 9px; }
.history-chip { min-width: 54px; min-height: 44px; padding: 0 14px; border-radius: 17px; background: var(--color-surface-muted); color: var(--color-text-secondary); font-size: 12px; }
.result-heading { flex: none; min-height: 40px; padding: 0 16px; display: flex; align-items: center; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: 12px; }
.empty-state { min-height: 0; padding: 42px 24px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; }
.empty-initial { justify-content: flex-start; padding-top: 20vh; }
.empty-title { font-size: 14px; font-weight: 600; }
.empty-description { max-width: 300px; color: var(--color-text-muted); font-size: 11px; line-height: 1.6; }
.search-notice { padding: 8px 16px; color: var(--color-text-secondary); font-size: 12px; }
.batch-add-button { flex: none; display: grid; place-items: center; min-height: 44px; margin: 4px 16px 8px; padding: 0 12px; border-radius: 12px; background: var(--color-primary-soft); color: var(--color-primary-strong); font-size: 13px; }
.batch-add-button[disabled] { opacity: .5; }
.batch-add-button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
@media (max-width: 360px) { .search-header { padding-right: 10px; padding-left: 10px; } .mode-tabs { padding-right: 8px; padding-left: 8px; } .mode-tab { min-width: 54px; } }
@media (prefers-reduced-motion: reduce) { .search-page * { scroll-behavior: auto; } }
</style>
