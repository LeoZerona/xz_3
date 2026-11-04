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
const completionRatio = computed(() => props.totalCount > 0 ? props.completedCount / props.totalCount : 0)
</script>

<template>
  <view class="level-overview" :class="'overview-' + appearance">
    <view
      class="overview-progress"
      role="progressbar"
      :aria-label="category.label + '已完成关卡'"
      :aria-valuenow="completedCount"
      :aria-valuemax="totalCount"
      :aria-valuemin="0"
    >
      <view class="overview-progress-fill" :style="{ width: completionRatio * 100 + '%' }" />
    </view>
    <text class="overview-caption">已完成 <text class="overview-count">{{ completedCount }}</text> / {{ totalCount }} 关</text>
  </view>
</template>

<style scoped lang="scss">
.level-overview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  min-height: 42px;
  padding: 12px 14px;
  border-radius: 16px;
  font-variant-numeric: tabular-nums;
}
.overview-caption {
  flex: none;
  color: var(--color-text-secondary);
  font-size: 12px;
  white-space: nowrap;
}
.overview-cards {
  background: var(--color-primary-soft);
}
.overview-cards .overview-caption {
  color: var(--color-text);
}
.overview-cards .overview-count {
  color: var(--level-accent-ink);
  font-weight: 700;
}
.overview-progress {
  flex: 1;
  min-width: 0;
  height: 4px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--color-border);
}
.overview-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}
</style>

