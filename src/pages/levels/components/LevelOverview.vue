<script setup lang="ts">
import { computed } from 'vue'
import type { LevelCategoryMeta } from '../../../study/levelData'

const props = defineProps<{
  category: LevelCategoryMeta
  totalCount: number
  completedCount: number
}>()
const isPending = computed(() => props.category.key === 'level2' || props.category.key === 'level3')
</script>

<template>
  <view class="level-overview">
    <view class="overview-heading">
      <h2 class="overview-title">{{ category.label }}</h2>
      <text class="overview-description">每关 {{ category.stageSize }} 字</text>
    </view>
    <text class="overview-caption">已完成 {{ completedCount }} / {{ totalCount }} 关</text>
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
@media (max-width: 600px) {
  .overview-heading {
    gap: 8px;
  }
  .overview-description,
  .overview-caption {
    font-size: 13px;
  }
}
</style>

