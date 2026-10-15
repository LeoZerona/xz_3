<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";

import AppBottomNavigation from "../../components/AppBottomNavigation.vue";
import { LEVEL_CATEGORIES, STAGES_BY_CATEGORY, type LevelCategory } from "../../study/levelData";
import { useLevelProgressStore } from "../../stores/levelProgress";
import { useCharacterLearningStore } from "../../stores/characterLearning";

const levelProgressStore = useLevelProgressStore();
const characterStore = useCharacterLearningStore();

const activeCategory = ref<LevelCategory>("level1");

onShow(() => {
  levelProgressStore.hydrate();
});

const currentMeta = computed(() => LEVEL_CATEGORIES.find((c) => c.key === activeCategory.value)!);
const currentStages = computed(() => STAGES_BY_CATEGORY[activeCategory.value] ?? []);

const completedCount = computed(() => {
  const stages = currentStages.value;
  return stages.filter((s) => levelProgressStore.isStageCompleted(s.id)).length;
});
const totalCount = computed(() => currentStages.value.length);
const progressPercent = computed(() => (totalCount.value === 0 ? 0 : Math.round((completedCount.value / totalCount.value) * 100)));

const categoryTabs = LEVEL_CATEGORIES;

function switchCategory(key: LevelCategory) {
  activeCategory.value = key;
}

function stageCompletedChars(stageId: string): number {
  const stage = currentStages.value.find((s) => s.id === stageId);
  if (!stage || stage.isPlaceholder) return 0;
  const tracked = levelProgressStore.getStageCompletedCount(stageId);
  let fallback = 0;
  for (const ch of stage.characters) {
    if (characterStore.isCharacterComplete(ch.id)) fallback += 1;
  }
  // 取较大值，保证每次答对都能及时反映；若已完成关卡直接满额
  if (levelProgressStore.isStageCompleted(stageId)) return stage.characters.length;
  return Math.max(tracked, fallback);
}

function stageProgress(stageId: string, total: number): number {
  if (total === 0) return 0;
  const stage = currentStages.value.find((s) => s.id === stageId);
  if (!stage) return 0;
  if (levelProgressStore.isStageCompleted(stageId)) return 1;
  return Math.min(1, stageCompletedChars(stageId) / total);
}

function isStageDone(stageId: string): boolean {
  return levelProgressStore.isStageCompleted(stageId);
}

function handleStageTap(stageId: string, isPlaceholder: boolean) {
  if (isPlaceholder) {
    uni.showToast({ title: "该关卡敬请期待", icon: "none" });
    return;
  }
  const cat = activeCategory.value;
  uni.navigateTo({
    url: "/pages/level-study/index?category=" + cat + "&stageId=" + stageId,
    animationType: "slide-in-right",
    animationDuration: 220,
    fail: () => uni.showToast({ title: "暂时无法进入学习", icon: "none" }),
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
        <text class="header-subtitle">固定 10 字一关 · 循序渐进</text>
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
          <text class="summary-desc">{{ currentMeta.description }} · 已完成 {{ completedCount }}/{{ totalCount }}</text>
          <view class="summary-progress-track" aria-hidden="true">
            <view class="summary-progress-fill" :style="{ width: progressPercent + '%' }" />
          </view>
        </view>
        <text class="summary-percent">{{ progressPercent }}%</text>
      </view>
      <text v-if="activeCategory === 'level2' || activeCategory === 'level3'" class="summary-tip">二三级字表接入中，当前为占位演示，可先体验一级关卡</text>
      <text v-else-if="activeCategory === 'radical'" class="summary-tip">以高频部首为线索，每关 10 个部首代表字，识部首更快记字形</text>
    </view>

    <scroll-view class="levels-scroll" scroll-y :show-scrollbar="false" :bounces="false" :enhanced="false">
      <view class="stage-grid">
        <view
          v-for="stage in currentStages"
          :key="stage.id"
          class="stage-card"
          :class="{ 'is-done': isStageDone(stage.id), 'is-placeholder': stage.isPlaceholder }"
          role="button"
          tabindex="0"
          :aria-label="stage.title + (stage.isPlaceholder ? ' 敬请期待' : ' ' + stage.characters.length + '字')"
          @click="handleStageTap(stage.id, stage.isPlaceholder)"
          @keydown.enter="handleStageTap(stage.id, stage.isPlaceholder)"
          @keydown.space.prevent="handleStageTap(stage.id, stage.isPlaceholder)"
        >
          <view class="stage-card-header">
            <text class="stage-index">{{ String(stage.index).padStart(2, "0") }}</text>
            <text class="stage-title">{{ stage.title }}</text>
            <view v-if="!stage.isPlaceholder" class="stage-badge" :class="isStageDone(stage.id) ? 'badge-done' : stageCompletedChars(stage.id) > 0 ? 'badge-progress' : 'badge-ready'">
              <van-icon v-if="isStageDone(stage.id)" name="success" size="12" />
              <text>{{ isStageDone(stage.id) ? "已完成" : stageCompletedChars(stage.id) > 0 ? "进行中" : "去学习" }}</text>
            </view>
            <view v-else class="stage-badge badge-lock">
              <van-icon name="lock" size="12" />
              <text>待上线</text>
            </view>
          </view>

          <view v-if="!stage.isPlaceholder" class="stage-chars" aria-hidden="true">
            <text v-for="ch in previewChars(stage.characters)" :key="ch" class="stage-char">{{ ch }}</text>
          </view>
          <view v-else class="stage-chars is-empty" aria-hidden="true">
            <text v-for="i in 10" :key="i" class="stage-char is-placeholder-char">·</text>
          </view>

          <view class="stage-footer">
            <view class="stage-progress">
              <view class="stage-progress-track">
                <view class="stage-progress-fill" :style="{ width: (stageProgress(stage.id, stage.characters.length) * 100) + '%' }" />
              </view>
              <text class="stage-progress-text">{{ stage.isPlaceholder ? "0/10" : stageCompletedChars(stage.id) + "/" + stage.characters.length }}</text>
            </view>
            <view class="stage-action" :class="stage.isPlaceholder ? 'is-disabled' : isStageDone(stage.id) ? 'is-done' : ''">
              <text>{{ stage.isPlaceholder ? "敬请期待" : isStageDone(stage.id) ? "复习" : stageCompletedChars(stage.id) > 0 ? "继续" : "开始" }}</text>
              <van-icon name="arrow" size="10" />
            </view>
          </view>
        </view>
      </view>
      <view class="levels-foot-hint">
        <text>左右滑动可切换底部导航 · 点击关卡进入固定 10 字学习</text>
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
.header-subtitle {
  color: var(--color-text-muted);
  font-size: 9px;
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
.levels-foot-hint {
  margin-top: 10px;
  color: var(--color-text-muted);
  font-size: 7px;
  text-align: center;
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


