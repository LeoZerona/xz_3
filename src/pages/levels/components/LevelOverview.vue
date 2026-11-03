<script setup lang="ts">
import { computed } from 'vue'
import type { LevelCategoryMeta } from '../../../study/levelData'
import type { LevelLayoutId } from '../../../study/levelLayouts'

const props = defineProps<{
  category: LevelCategoryMeta
  appearance: LevelLayoutId
  totalCount: number
  completedCount: number
}>()
const isPending = computed(() => props.category.key === 'level2' || props.category.key === 'level3')
const completionRatio = computed(() => props.totalCount > 0 ? props.completedCount / props.totalCount : 0)
</script>

<template>
  <view class="level-overview" :class="'overview-' + appearance">
    <view class="overview-heading">
      <h1 class="overview-title">{{ category.label }}</h1>
      <text class="overview-description">每关 {{ category.stageSize }} 字</text>
    </view>
    <text class="overview-caption">已完成 <text class="overview-count">{{ completedCount }}</text> / {{ totalCount }} 关</text>
    <view
      v-if="appearance === 'cards'"
      class="overview-progress"
      role="progressbar"
      :aria-label="category.label + '已完成关卡'"
      :aria-valuenow="completedCount"
      :aria-valuemax="totalCount"
      :aria-valuemin="0"
    >
      <view class="overview-progress-fill" :style="{ width: completionRatio * 100 + '%' }" />
    </view>
    <text v-if="isPending" class="overview-pending" role="status">字表正在准备，可以先从一级汉字开始。</text>
  </view>
</template>

<style scoped lang="scss">
.level-overview {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
  font-variant-numeric: tabular-nums;
}
.overview-heading {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.overview-title {
  font-size: 18px;
  font-weight: 650;
}
.overview-description,
.overview-caption {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.overview-pending {
  width: 100%;
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}
.overview-cards {
  gap: 12px 8px;
  padding: 16px 18px;
  border-radius: 16px;
  background: var(--color-primary-soft);
}
.overview-cards .overview-description,
.overview-cards .overview-caption {
  color: var(--color-text);
}
.overview-cards .overview-count {
  color: var(--level-accent-ink);
  font-weight: 700;
}
.overview-progress {
  width: 100%;
  height: 4px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--color-surface);
}
.overview-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}
@media (max-width: 600px) {
  .overview-cards { padding: 14px; }
  .overview-heading {
    gap: 8px;
  }
  .overview-description,
  .overview-caption {
    font-size: 13px;
  }
}
</style>

