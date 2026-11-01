<script setup lang="ts">
import DatabaseStatus from '../../components/DatabaseStatus.vue'

import { computed, onBeforeUnmount, ref } from "vue";
import { applicationReady } from '../../database/application';
import { useDatabaseTask } from '../../database/useDatabaseTask';
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useThemeStore } from "../../stores/theme";

import LevelCategoryTabs from './components/LevelCategoryTabs.vue';
import LevelOverview from './components/LevelOverview.vue';
import LevelStageCard from './components/LevelStageCard.vue';
import AppBottomNavigation from "../../components/AppBottomNavigation.vue";
import { getCategoryStageCount, LEVEL_CATEGORIES, loadLevelStages, type LevelCategory, type LevelStage } from "../../study/levelData";
import { useLevelProgressStore } from "../../stores/levelProgress";
import { useCharacterLearningStore } from "../../stores/characterLearning";

const levelProgressStore = useLevelProgressStore();
const { themeStyle, currentTheme } = storeToRefs(useThemeStore());
const characterStore = useCharacterLearningStore();

const activeCategory = ref<LevelCategory>("level1");
const STAGE_BATCH_SIZE = 24;
const visibleStageCount = ref(STAGE_BATCH_SIZE);
const isNavigating = ref(false);
const currentStages = ref<LevelStage[]>([]);
const isLoadingStages = ref(false);
const stageLoadError = ref("");
let stageLoadRequestId = 0;

onShow(() => {
  isNavigating.value = false;
  levelProgressStore.hydrate();
  if (applicationReady.value) void loadCurrentStages(false);
});
useDatabaseTask(() => loadCurrentStages(true));

const currentMeta = computed(() => LEVEL_CATEGORIES.find((c) => c.key === activeCategory.value)!);

const completedCount = computed(() => levelProgressStore.completedCountByCategory[activeCategory.value] ?? 0);
const totalCount = computed(() => getCategoryStageCount(activeCategory.value));
const hasMoreStages = computed(() => currentStages.value.length < totalCount.value);
const completedCharacterIds = computed(() => new Set(characterStore.completedIds));

interface StageView {
  stage: LevelStage;
  completedChars: number;
  isDone: boolean;
  progress: number;
}

const visibleStages = computed<StageView[]>(() => currentStages.value.map((stage) => {
    const isDone = levelProgressStore.isStageCompleted(stage.id);
    if (stage.isPlaceholder) return { stage, completedChars: 0, isDone: false, progress: 0 };
    const tracked = levelProgressStore.getStageCompletedCount(stage.id);
    let learned = 0;
    for (const character of stage.characters) {
      if (completedCharacterIds.value.has(character.id)) learned += 1;
    }
    const completedChars = isDone ? stage.characters.length : Math.max(tracked, learned);
    const progress = stage.characters.length === 0 ? 0 : Math.min(1, completedChars / stage.characters.length);
    return { stage, completedChars, isDone, progress };
  }));

const featuredStage = computed(() => visibleStages.value.find((item) => !item.stage.isPlaceholder && !item.isDone && item.completedChars > 0)
  ?? visibleStages.value.find((item) => !item.stage.isPlaceholder && !item.isDone)
  ?? visibleStages.value.find((item) => !item.stage.isPlaceholder));
const displayStages = computed(() => {
  const current = featuredStage.value;
  if (!current) return visibleStages.value;
  return [current, ...visibleStages.value.filter((item) => item.stage.id !== current.stage.id)];
});
const featuredActionLabel = computed(() => {
  if (featuredStage.value?.isDone) return '复习关卡';
  return featuredStage.value && featuredStage.value.completedChars > 0 ? '继续学习' : '开始学习';
});
function handleFeaturedStart() {
  const current = featuredStage.value;
  if (current) handleStageTap(current.stage.id, false);
}
const pageThemeStyle = computed(() => ({
  ...themeStyle.value,
  '--level-action-fill': currentTheme.value.tokens.primaryStrong,
  '--level-accent-ink': currentTheme.value.tokens.primaryStrong,
}));

onBeforeUnmount(() => { stageLoadRequestId += 1; });

function switchCategory(key: LevelCategory) {
  if (key === activeCategory.value) return;
  activeCategory.value = key;
  visibleStageCount.value = STAGE_BATCH_SIZE;
  currentStages.value = [];
  void loadCurrentStages(true);
}

function loadMoreStages() {
  if (!hasMoreStages.value || isLoadingStages.value) return;
  visibleStageCount.value = Math.min(totalCount.value, visibleStageCount.value + STAGE_BATCH_SIZE);
  void loadCurrentStages(false);
}

async function loadCurrentStages(reset: boolean) {
  const category = activeCategory.value;
  if (reset) visibleStageCount.value = Math.min(STAGE_BATCH_SIZE, getCategoryStageCount(category));
  const requestId = ++stageLoadRequestId;
  isLoadingStages.value = true;
  stageLoadError.value = "";
  try {
    const stages = await loadLevelStages(category, visibleStageCount.value);
    if (requestId !== stageLoadRequestId || category !== activeCategory.value) return;
    currentStages.value = stages;
  } catch (error) {
    if (requestId !== stageLoadRequestId || category !== activeCategory.value) return;
    stageLoadError.value = error instanceof Error ? error.message : "关卡数据加载失败";
  } finally {
    if (requestId === stageLoadRequestId) isLoadingStages.value = false;
  }
}

function handleStageTap(stageId: string, isPlaceholder: boolean) {
  if (isPlaceholder) {
    uni.showToast({ title: "该关卡敬请期待", icon: "none" });
    return;
  }
  if (isNavigating.value) return;
  isNavigating.value = true;
  const cat = activeCategory.value;
  uni.navigateTo({
    url: "/pages/level-study/index?category=" + cat + "&stageId=" + stageId,
    animationType: "slide-in-right",
    animationDuration: 220,
    fail: () => {
      isNavigating.value = false;
      uni.showToast({ title: "暂时无法进入学习", icon: "none" });
    },
  });
}

function showPlaceholder(label: string) {
  uni.showToast({ title: label + "功能开发中", icon: "none" });
}

</script>

<template>
  <view class="levels-page" :style="pageThemeStyle">
    <DatabaseStatus />
    <view class="levels-layout">
      <view class="levels-header">
        <view class="header-top">
          <view class="header-copy">
            <h1 class="header-title">关卡学习</h1>
            <text class="header-description">每次十个字，慢慢积累。</text>
          </view>
          <button
            v-if="featuredStage"
            class="overview-start"
            role="button"
            tabindex="0"
            :aria-label="featuredActionLabel + '，' + featuredStage.stage.title"
            @click="handleFeaturedStart"
            @keydown.enter="handleFeaturedStart"
            @keydown.space.prevent="handleFeaturedStart"
          >{{ featuredActionLabel }}<van-icon name="arrow" size="14" aria-hidden="true" /></button>
        </view>
        <LevelCategoryTabs :model-value="activeCategory" @update:model-value="switchCategory" />
      </view>

      <scroll-view
        :key="activeCategory"
        id="level-stage-panel"
        class="levels-scroll"
        role="tabpanel"
        :aria-labelledby="'category-' + activeCategory"
        scroll-y
        :show-scrollbar="false"
        :bounces="false"
        :enhanced="false"
        :lower-threshold="160"
        @scrolltolower="loadMoreStages"
      >
        <view class="levels-content">
          <LevelOverview
            :category="currentMeta"
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
          <view class="stage-grid" :aria-busy="isLoadingStages">
            <LevelStageCard
              v-for="item in displayStages"
              :key="item.stage.id"
              :stage="item.stage"
              :completed-chars="item.completedChars"
              :is-done="item.isDone"
              :progress="item.progress"
              :is-current="item.stage.id === featuredStage?.stage.id"
              @stage-select="handleStageTap"
            />
          </view>
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
            {{ isLoadingStages ? '正在加载…' : '继续加载关卡' }}（已显示 {{ visibleStages.length }}/{{ totalCount }}）
            <van-icon name="arrow-down" size="12" aria-hidden="true" />
          </button>
          <text v-else-if="visibleStages.length" class="directory-end">已显示全部 {{ totalCount }} 关</text>
        </view>
      </scroll-view>
    </view>

    <AppBottomNavigation active-tab="character" @unavailable="showPlaceholder" />
  </view>
</template>

<style scoped lang="scss">
.levels-page {
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
}
.levels-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 32px;
}
.levels-header {
  flex: none;
  padding-top: calc(20px + var(--app-top-safe-area));
}
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.header-title {
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.03em;
}
.header-description {
  display: block;
  margin-top: 7px;
  color: var(--color-text-secondary);
  font-size: 14px;
}
.overview-start {
  flex: none;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 0;
  padding: 0 20px;
  border-radius: 999px;
  background: var(--level-action-fill);
  color: var(--color-on-primary);
  font-size: 14px;
  font-weight: 600;
}
.levels-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
}
.levels-content {
  padding: 28px 0 32px;
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
.overview-start:focus-visible,
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
  .levels-layout {
    padding: 0 24px;
  }
  .stage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .levels-layout {
    padding: 0 20px;
  }
  .levels-header {
    padding-top: calc(14px + var(--app-top-safe-area));
  }
  .header-title {
    font-size: 24px;
  }
  .header-description {
    font-size: 12px;
  }
  .header-top {
    margin-bottom: 22px;
    gap: 8px;
  }
  .overview-start {
    gap: 8px;
    padding: 0 14px;
    font-size: 13px;
  }
  .levels-content {
    padding-top: 24px;
  }
  .stage-grid {
    gap: 12px;
  }
}
@media (max-width: 360px) {
  .levels-layout {
    padding: 0 16px;
  }
  .header-description {
    max-width: 145px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .overview-start {
    transition: none;
  }
}
</style>
