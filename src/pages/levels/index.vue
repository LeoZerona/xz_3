<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import DatabaseStatus from '../../components/DatabaseStatus.vue'
import AppBottomNavigation from '../../components/AppBottomNavigation.vue'
import CharacterSearchButton from '../../components/CharacterSearchButton.vue'
import { useThemeStore } from '../../stores/theme'
import { useLevelLayoutStore } from '../../stores/levelLayout'
import { useLevelStages } from './useLevelStages'
import LevelCategoryTabs from './components/LevelCategoryTabs.vue'
import LevelOverview from './components/LevelOverview.vue'
import LevelStageCard from './components/LevelStageCard.vue'
import LevelNotebookLayout from './components/LevelNotebookLayout.vue'
import LevelFlashcardLayout from './components/LevelFlashcardLayout.vue'
import LevelBoardLayout from './components/LevelBoardLayout.vue'
import LevelBoardDock from './components/LevelBoardDock.vue'

const { themeStyle, currentTheme } = storeToRefs(useThemeStore())
const { currentLayoutId } = storeToRefs(useLevelLayoutStore())
const { activeCategory, currentMeta, visibleStages, displayStages, featuredStage, completedCount, totalCount, hasMoreStages, isLoadingStages, stageLoadError, lastStudiedStage, lastStudyCategoryLabel, isLocating, scrollTargetId, locationRequest, switchCategory, loadMoreStages, loadCurrentStages, handleStageTap, handleStageSelection, handleLocateLastStage } = useLevelStages()
const boardStageId = ref<string>()
const selectedBoardStage = computed(() => visibleStages.value.find((item) => item.stage.id === boardStageId.value) ?? featuredStage.value ?? visibleStages.value[0])
const isDirectoryLayout = computed(() => currentLayoutId.value === 'cards' || currentLayoutId.value === 'notebook')
const pageThemeStyle = computed(() => ({
  ...themeStyle.value,
  '--level-action-fill': currentTheme.value.tokens.primaryStrong,
  '--level-accent-ink': currentTheme.value.tokens.primaryStrong,
}))
watch(activeCategory, () => { boardStageId.value = undefined })
watch(locationRequest, () => { boardStageId.value = lastStudiedStage.value?.stageId })
function handleScrollLower() {
  if (isDirectoryLayout.value) loadMoreStages()
}
function showPlaceholder(label: string) {
  uni.showToast({ title: label + '功能开发中', icon: 'none' })
}
</script>

<template>
  <view class="levels-page" :class="'layout-' + currentLayoutId" :data-level-layout="currentLayoutId" :style="pageThemeStyle">
    <DatabaseStatus />
    <view class="levels-layout">
      <view class="levels-header">
        <view class="header-top">
          <LevelCategoryTabs :model-value="activeCategory" :appearance="currentLayoutId" @update:model-value="switchCategory" />
          <CharacterSearchButton />
        </view>
        <view v-if="lastStudiedStage" class="last-study-bar">
          <button
            class="locate-last-study"
            role="button"
            :tabindex="isLocating ? -1 : 0"
            :aria-label="'回到上次选择的' + lastStudyCategoryLabel + lastStudiedStage.title"
            :aria-busy="isLocating"
            :aria-disabled="isLocating"
            :disabled="isLocating"
            @click="handleLocateLastStage"
            @keydown.enter.prevent="handleLocateLastStage"
            @keydown.space.prevent="handleLocateLastStage"
          >
            <view class="last-study-copy">
              <text class="last-study-label">最近选择</text>
              <text class="last-study-title">{{ lastStudyCategoryLabel }} · {{ lastStudiedStage.title }}</text>
            </view>
            <text class="last-study-action">{{ isLocating ? '定位中…' : '回到该关' }}</text>
            <van-icon name="arrow" size="14" aria-hidden="true" />
          </button>
        </view>
      </view>

      <navigator class="review-entry" url="/pages/level-review/index" hover-class="none" role="button" aria-label="关卡复习">
        <text>关卡复习</text><text>复习已学文字 <van-icon name="arrow" size="12" aria-hidden="true" /></text>
      </navigator>
      <scroll-view
        :key="activeCategory + currentLayoutId"
        id="level-stage-panel"
        class="levels-scroll"
        role="tabpanel"
        :aria-labelledby="'category-' + activeCategory"
        scroll-y
        :show-scrollbar="false"
        :bounces="false"
        :enhanced="false"
        :lower-threshold="160"
        :scroll-into-view="scrollTargetId"
        :scroll-with-animation="false"
        @scrolltolower="handleScrollLower"
      >
        <view class="levels-content">
          <LevelOverview
            :category="currentMeta"
            :appearance="currentLayoutId"
            :total-count="totalCount"
            :completed-count="completedCount"
          />
          <view v-if="isLoadingStages && visibleStages.length === 0" class="stage-load-state" role="status">
            <text class="stage-load-title">正在加载关卡…</text>
          </view>
          <view v-else-if="stageLoadError && visibleStages.length === 0" class="stage-load-state" role="alert">
            <text class="stage-load-title">{{ stageLoadError }}</text>
            <button class="stage-retry" role="button" tabindex="0" @click="loadCurrentStages(false)" @keydown.enter="loadCurrentStages(false)" @keydown.space.prevent="loadCurrentStages(false)">重试</button>
          </view>
          <view v-else-if="!isLoadingStages && visibleStages.length === 0" class="stage-load-state" role="status">
            <text class="stage-load-title">当前分类暂无关卡</text>
            <text>可以先从其他分类开始学习。</text>
          </view>
          <view v-if="currentLayoutId === 'cards'" class="stage-grid" :aria-busy="isLoadingStages">
            <LevelStageCard
              v-for="item in displayStages"
              :key="item.stage.id"
              :stage="item.stage"
              :completed-chars="item.completedChars"
              :is-done="item.isDone"
              :progress="item.progress"
              :training-count="item.trainingCount"
              :is-current="item.stage.id === lastStudiedStage?.stageId"
              @stage-select="handleStageTap"
            />
          </view>
          <LevelNotebookLayout
            v-else-if="currentLayoutId === 'notebook'"
            :stages="visibleStages"
            :featured-stage="featuredStage"
            :last-studied-stage-id="lastStudiedStage?.stageId"
            @stage-select="handleStageTap"
          />
          <LevelFlashcardLayout
            v-else-if="currentLayoutId === 'flashcards'"
            :key="activeCategory + ':' + locationRequest"
            :stages="visibleStages"
            :initial-stage-id="featuredStage?.stage.id"
            :last-studied-stage-id="lastStudiedStage?.stageId"
            :has-more="hasMoreStages"
            :is-loading="isLoadingStages || isLocating"
            :total-count="totalCount"
            @load-more="loadMoreStages"
            @stage-select="handleStageTap"
            @stage-highlight="handleStageSelection"
          />
          <LevelBoardLayout
            v-else
            :key="activeCategory + ':' + locationRequest"
            v-model="boardStageId"
            :initial-stage-id="featuredStage?.stage.id"
            :last-studied-stage-id="lastStudiedStage?.stageId"
            :stages="visibleStages"
            :has-more="hasMoreStages"
            :is-loading="isLoadingStages || isLocating"
            @load-more="loadMoreStages"
            @stage-highlight="handleStageSelection"
          />
          <view v-if="stageLoadError && visibleStages.length > 0" class="stage-inline-error" role="alert">
            <text>{{ stageLoadError }}</text>
            <button class="stage-retry" role="button" tabindex="0" @click="loadCurrentStages(false)" @keydown.enter="loadCurrentStages(false)" @keydown.space.prevent="loadCurrentStages(false)">重试</button>
          </view>
          <button
            v-if="hasMoreStages"
            class="load-more-stages"
            role="button"
            tabindex="0"
            :disabled="isLoadingStages"
            :aria-disabled="isLoadingStages"
            @click="loadMoreStages"
            @keydown.enter="loadMoreStages"
            @keydown.space.prevent="loadMoreStages"
          >
            {{ isLoadingStages ? '正在加载…' : '继续加载关卡' }}（{{ isDirectoryLayout ? '已显示' : '已载入' }} {{ visibleStages.length }}/{{ totalCount }}）
            <van-icon name="arrow-down" size="12" aria-hidden="true" />
          </button>
          <text v-else-if="visibleStages.length" class="directory-end">{{ isDirectoryLayout ? '已显示全部' : '已载入全部' }} {{ totalCount }} 关</text>
        </view>
      </scroll-view>
      <LevelBoardDock
        v-if="currentLayoutId === 'board' && selectedBoardStage"
        :item="selectedBoardStage"
        :is-last-studied="selectedBoardStage.stage.id === lastStudiedStage?.stageId"
        @stage-select="handleStageTap"
      />
    </view>

    <AppBottomNavigation active-tab="character" @unavailable="showPlaceholder" />
  </view>
</template>

<style scoped lang="scss">
.levels-page {
  --levels-gutter: 32px;
  width: min(100%, 1100px);
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  overflow: hidden;
  background: var(--color-page);
  color: var(--color-text);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.levels-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 var(--levels-gutter);
}
.levels-header {
  flex: none;
  padding-top: calc(20px + var(--app-top-safe-area));
  // 间距留在固定头部，目录滚动或定位后也不会贴住分类标签。
  padding-bottom: 20px;
}
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.header-top :deep(.category-tabs) { min-width: 0; }
.last-study-bar { margin-top: 8px; }
.last-study-copy { display: flex; align-items: center; flex: 1; min-width: 0; gap: 8px; }
.last-study-label { flex: none; color: var(--color-text-secondary); font-size: 12px; }
.last-study-title { overflow: hidden; color: var(--color-text); font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.locate-last-study { display: flex; align-items: center; gap: 6px; width: 100%; min-height: 44px; margin: 0; padding: 0; border-radius: 0; background: transparent; color: var(--level-accent-ink); text-align: left; }
.last-study-action { flex: none; font-size: 12px; }
.locate-last-study[disabled] .last-study-action { color: var(--color-text-secondary); }
.levels-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
}
.review-entry { display: flex; justify-content: space-between; align-items: center; flex: none; min-height: 44px; margin-bottom: 12px; color: var(--color-text); font-size: 14px; }
.review-entry > :last-child { color: var(--color-text-secondary); font-size: 12px; }
.review-entry:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
.levels-content {
  padding: 4px 0 32px;
}
.stage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.stage-load-state {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.stage-load-title {
  color: var(--color-text);
  font-size: 14px;
}
.stage-retry {
  min-width: 64px;
  min-height: 44px;
  color: var(--level-accent-ink);
  font-size: 14px;
}
.stage-inline-error {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.load-more-stages {
  min-height: 48px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  border-radius: 16px;
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.load-more-stages[disabled] {
  color: var(--color-text-secondary);
}
.locate-last-study:focus-visible,
.stage-retry:focus-visible,
.load-more-stages:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.directory-end {
  display: block;
  margin-top: 24px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.levels-page :deep(.bottom-navigation) {
  flex: none;
  box-shadow: none;
}
.levels-page :deep(.navigation-item) {
  color: var(--color-text-secondary);
  font-size: 11px;
}
.levels-page :deep(.navigation-item.is-active) {
  color: var(--level-accent-ink);
}
.levels-page :deep(.navigation-content) {
  min-height: 64px;
}
.layout-cards {
  background: var(--color-surface-muted);
}
.layout-flashcards {
  background: var(--color-primary-soft);
}
.layout-flashcards :deep(.load-more-stages) {
  background: var(--color-surface);
}
.layout-flashcards :deep(.category-tab),
.layout-flashcards :deep(.overview-description),
.layout-flashcards :deep(.overview-caption) {
  color: var(--color-text);
}
.layout-board {
  background: var(--color-surface-muted);
}
.layout-notebook .levels-content {
  padding-top: 6px;
}
@media (min-width: 901px) {
  .levels-page :deep(.bottom-navigation) {
    padding: 0 max(32px, calc((100% - 640px) / 2));
  }
  .levels-page :deep(.navigation-content) {
    display: flex;
    justify-content: center;
    gap: 10px;
  }
  .levels-page :deep(.navigation-label) {
    font-size: 13px;
  }
}
@media (max-width: 900px) {
  .levels-page { --levels-gutter: 24px; }
  .stage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .levels-page { --levels-gutter: 20px; }
  .levels-header {
    padding-top: calc(14px + var(--app-top-safe-area));
  }
  .header-top {
    gap: 8px;
  }
  .header-top :deep(.category-tabs) { flex: 1; }
  .stage-grid {
    gap: 12px;
  }
}
@media (max-width: 360px) {
  .levels-page { --levels-gutter: 16px; }
}
</style>
