<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";

import AppBottomNavigation from "../../components/AppBottomNavigation.vue";
import { getCategoryStageCount, LEVEL_CATEGORIES, loadLevelStages, type LevelCategory, type LevelStage } from "../../study/levelData";
import { useLevelProgressStore } from "../../stores/levelProgress";
import { useCharacterLearningStore } from "../../stores/characterLearning";

const levelProgressStore = useLevelProgressStore();
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
  void loadCurrentStages(false);
});

const currentMeta = computed(() => LEVEL_CATEGORIES.find((c) => c.key === activeCategory.value)!);

const completedCount = computed(() => levelProgressStore.completedCountByCategory[activeCategory.value] ?? 0);
const totalCount = computed(() => getCategoryStageCount(activeCategory.value));
const progressPercent = computed(() => (totalCount.value === 0 ? 0 : Math.round((completedCount.value / totalCount.value) * 100)));
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

const categoryTabs = LEVEL_CATEGORIES;

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

function previewChars(chars: { script_forms: { simplified: string } }[]): string[] {
  return chars.slice(0, 10).map((c) => c.script_forms.simplified);
}
</script>

<template>
  <view class="levels-page">
    <view class="levels-header">
      <view class="header-top">
        <text class="header-title">关卡学习</text>
      </view>
      <view class="category-tabs" role="tablist" aria-label="关卡分类">
        <view
          v-for="tab in categoryTabs"
          :key="tab.key"
          class="category-tab"
          :class="{ 'is-active': activeCategory === tab.key }"
          role="tab"
          :aria-selected="activeCategory === tab.key"
          :aria-label="tab.label"
          tabindex="0"
          @click="switchCategory(tab.key)"
          @keydown.enter="switchCategory(tab.key)"
          @keydown.space.prevent="switchCategory(tab.key)"
        >
          <van-icon :name="tab.icon" size="16" aria-hidden="true" />
          <text class="tab-label">{{ tab.shortLabel }}</text>
          <text class="tab-full">{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <view class="summary-card">
      <view class="summary-main">
        <view class="summary-icon" aria-hidden="true">
          <van-icon :name="currentMeta.icon" size="22" />
        </view>
        <view class="summary-copy">
          <text class="summary-title">{{ currentMeta.label }} · {{ totalCount }} 关</text>
          <text class="summary-desc">已完成 {{ completedCount }}/{{ totalCount }}</text>
          <view class="summary-progress-track" aria-hidden="true">
            <view class="summary-progress-fill" :style="{ width: progressPercent + '%' }" />
          </view>
        </view>
        <text class="summary-percent">{{ progressPercent }}%</text>
      </view>
      <text v-if="activeCategory === 'level2' || activeCategory === 'level3'" class="summary-tip">二三级字表接入中，当前为占位演示，可先体验一级关卡</text>
    </view>

    <scroll-view
      class="levels-scroll"
      scroll-y
      :show-scrollbar="false"
      :bounces="false"
      :enhanced="false"
      :lower-threshold="160"
      @scrolltolower="loadMoreStages"
    >
      <view v-if="isLoadingStages && visibleStages.length === 0" class="stage-load-state" role="status">
        <text class="stage-load-title">正在加载关卡…</text>
        <text class="stage-load-desc">仅加载当前屏需要的字表分片</text>
      </view>
      <view v-else-if="stageLoadError && visibleStages.length === 0" class="stage-load-state is-error" role="alert">
        <text class="stage-load-title">{{ stageLoadError }}</text>
        <view class="stage-retry" role="button" tabindex="0" @click="loadCurrentStages(false)" @keydown.enter="loadCurrentStages(false)">重试</view>
      </view>
      <view class="stage-grid">
        <view
          v-for="item in visibleStages"
          :key="item.stage.id"
          class="stage-card"
          :class="{ 'is-done': item.isDone, 'is-placeholder': item.stage.isPlaceholder }"
          role="button"
          tabindex="0"
          :aria-label="item.stage.title + (item.stage.isPlaceholder ? ' 敬请期待' : ' ' + item.stage.characters.length + '字')"
          @click="handleStageTap(item.stage.id, item.stage.isPlaceholder)"
          @keydown.enter="handleStageTap(item.stage.id, item.stage.isPlaceholder)"
          @keydown.space.prevent="handleStageTap(item.stage.id, item.stage.isPlaceholder)"
        >
          <view class="stage-card-header">
            <text class="stage-index">{{ String(item.stage.index).padStart(2, "0") }}</text>
            <text class="stage-title">{{ item.stage.title }}</text>
            <view v-if="!item.stage.isPlaceholder" class="stage-badge" :class="item.isDone ? 'badge-done' : item.completedChars > 0 ? 'badge-progress' : 'badge-ready'">
              <van-icon v-if="item.isDone" name="success" size="12" />
              <text>{{ item.isDone ? "已完成" : item.completedChars > 0 ? "进行中" : "去学习" }}</text>
            </view>
            <view v-else class="stage-badge badge-lock">
              <van-icon name="lock" size="12" />
              <text>待上线</text>
            </view>
          </view>

          <view v-if="!item.stage.isPlaceholder" class="stage-chars" aria-hidden="true">
            <text v-for="ch in previewChars(item.stage.characters)" :key="ch" class="stage-char">{{ ch }}</text>
          </view>
          <view v-else class="stage-chars is-empty" aria-hidden="true">
            <text v-for="i in 10" :key="i" class="stage-char is-placeholder-char">·</text>
          </view>

          <view class="stage-footer">
            <view class="stage-progress">
              <view class="stage-progress-track">
                <view class="stage-progress-fill" :style="{ width: (item.progress * 100) + '%' }" />
              </view>
              <text class="stage-progress-text">{{ item.stage.isPlaceholder ? "0/10" : item.completedChars + "/" + item.stage.characters.length }}</text>
            </view>
            <view class="stage-action" :class="item.stage.isPlaceholder ? 'is-disabled' : item.isDone ? 'is-done' : ''">
              <text>{{ item.stage.isPlaceholder ? "敬请期待" : item.isDone ? "复习" : item.completedChars > 0 ? "继续" : "开始" }}</text>
              <van-icon name="arrow" size="10" />
            </view>
          </view>
        </view>
      </view>
      <view
        v-if="hasMoreStages"
        class="load-more-stages"
        role="button"
        tabindex="0"
        @click="loadMoreStages"
        @keydown.enter="loadMoreStages"
        @keydown.space.prevent="loadMoreStages"
      >
        <text>{{ isLoadingStages ? "正在加载…" : "继续加载关卡" }}（已显示 {{ visibleStages.length }}/{{ totalCount }}）</text>
      </view>
    </scroll-view>

    <AppBottomNavigation active-tab="character" @unavailable="showPlaceholder" />
  </view>
</template>

<style scoped lang="scss">
.levels-page {
  width: min(100%, 560px);
  height: 100vh;
  height: 100dvh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overscroll-behavior: none;
  background: var(--color-page);
  color: var(--color-text);
}

.levels-header {
  flex: none;
  padding: calc(10px + var(--app-top-safe-area)) 16px 12px;
  background: var(--color-topbar);
  border-bottom: 1px solid var(--color-border);
}
.header-top {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.header-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.category-tabs {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.category-tab {
  min-height: 52px;
  padding: 7px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
}
.category-tab.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--color-primary) 22%, transparent);
}
.category-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.tab-label {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}
.tab-full {
  font-size: 7px;
  opacity: 0.85;
}
.category-tab.is-active .tab-full {
  opacity: 0.95;
}

.summary-card {
  flex: none;
  margin: 10px 12px 0;
  padding: 12px 14px 10px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: 0 6px 18px var(--color-shadow);
}
.summary-main {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  align-items: center;
  gap: 10px;
}
.summary-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.summary-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.summary-title {
  font-size: 13px;
  font-weight: 700;
}
.summary-desc {
  color: var(--color-text-muted);
  font-size: 8px;
}
.summary-progress-track {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-surface-muted);
}
.summary-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--color-primary);
  transition: width 0.28s ease;
}
.summary-percent {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-primary);
}
.summary-tip {
  margin-top: 8px;
  display: block;
  color: var(--color-text-muted);
  font-size: 7px;
  line-height: 1.5;
}

.levels-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  padding: 10px 12px calc(88px + env(safe-area-inset-bottom));
}
.stage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.stage-load-state {
  min-height: 160px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}
.stage-load-title { color: var(--color-text); font-size: 13px; font-weight: 700; }
.stage-load-desc { color: var(--color-text-muted); font-size: 9px; }
.stage-load-state.is-error { color: #c92d32; }
.stage-retry {
  min-width: 82px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 10px;
  font-weight: 700;
}
.load-more-stages {
  min-height: 42px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 700;
}
.load-more-stages:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.stage-card {
  padding: 10px 10px 9px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: 0 4px 14px var(--color-shadow);
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}
.stage-card:active {
  transform: translateY(1px);
  box-shadow: 0 2px 10px var(--color-shadow);
}
.stage-card.is-done {
  border-color: color-mix(in srgb, var(--color-primary) 18%, var(--color-border));
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-primary-soft) 55%, var(--color-surface)) 0, var(--color-surface) 66%);
}
.stage-card.is-placeholder {
  opacity: 0.92;
  background: var(--color-surface-muted);
}
.stage-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.stage-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
}
.stage-index {
  min-width: 26px;
  height: 20px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--color-text);
  color: var(--color-surface);
  font-size: 8px;
  font-weight: 800;
}
.stage-card.is-done .stage-index {
  background: var(--color-primary);
}
.stage-card.is-placeholder .stage-index {
  background: var(--color-text-muted);
}
.stage-title {
  flex: 1;
  font-size: 11px;
  font-weight: 700;
}
.stage-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 7px;
  font-weight: 600;
}
.badge-ready {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.badge-progress {
  background: #fff7e6;
  color: #b77900;
  border: 1px solid #ffe2a8;
}
.badge-done {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}
.badge-lock {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}
.stage-chars {
  margin-top: 8px;
  min-height: 46px;
  padding: 6px 6px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  border-radius: 10px;
  background: var(--color-surface-muted);
}
.stage-chars.is-empty {
  background: repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, var(--color-border) 55%, transparent) 6px 12px);
}
.stage-char {
  height: 19px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: var(--color-surface);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}
.stage-char.is-placeholder-char {
  background: transparent;
  color: var(--color-text-muted);
}
.stage-footer {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.stage-progress {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.stage-progress-track {
  flex: 1;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-border);
}
.stage-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--color-primary);
  transition: width 0.28s ease;
}
.stage-card.is-done .stage-progress-fill {
  background: #2e7d32;
}
.stage-progress-text {
  color: var(--color-text-muted);
  font-size: 7px;
  white-space: nowrap;
}
.stage-action {
  flex: none;
  min-width: 54px;
  height: 24px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 8px;
  font-weight: 700;
}
.stage-action.is-done {
  background: var(--color-surface);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}
.stage-action.is-disabled {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}
@media (max-width: 360px) {
  .levels-header {
    padding-right: 12px;
    padding-left: 12px;
  }
  .category-tabs {
    gap: 6px;
  }
  .stage-grid {
    gap: 8px;
  }
  .stage-chars {
    gap: 3px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .summary-progress-fill, .stage-progress-fill, .stage-card {
    transition: none;
  }
}
</style>


