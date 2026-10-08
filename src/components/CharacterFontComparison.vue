<script setup lang="ts">
import type { LearningFont } from '../fonts/types'

interface Props {
  character: string
  learningFont: LearningFont
  referenceFont: LearningFont
}

defineProps<Props>()
</script>

<template>
  <view class="font-comparison" role="group" aria-label="学习字体与对照字体字形对比">
    <view
      class="font-sample-card is-learning"
      :aria-label="`学习字体${learningFont.name}中的${character}`"
    >
      <view class="font-sample-heading">
        <text class="font-role">学习字体</text>
        <text class="font-name">{{ learningFont.name }}</text>
      </view>
      <text class="font-character" :style="{ fontFamily: learningFont.fontFamily }">{{ character }}</text>
    </view>

    <view
      class="font-sample-card is-reference"
      :aria-label="`对照字体${referenceFont.name}中的${character}`"
    >
      <view class="font-sample-heading">
        <text class="font-role">对照字体</text>
        <text class="font-name">{{ referenceFont.name }}</text>
      </view>
      <text class="font-character" :style="{ fontFamily: referenceFont.fontFamily }">{{ character }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.font-comparison { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.font-sample-card { min-width: 0; min-height: 150px; padding: 12px; display: flex; flex-direction: column; border: 1px solid var(--color-border); border-radius: 18px; background: var(--color-surface); box-shadow: 0 8px 24px color-mix(in srgb, var(--color-shadow) 86%, transparent); }
.font-sample-card.is-learning { border-color: color-mix(in srgb, var(--color-primary) 22%, var(--color-border)); background: linear-gradient(180deg, var(--color-primary-soft), var(--color-surface) 72%); }
.font-sample-heading { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.font-role { flex: none; padding: 4px 7px; border-radius: 999px; background: var(--color-surface-muted); color: var(--color-text-muted); font-size: 8px; line-height: 1; }
.is-learning .font-role { background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface)); color: var(--color-primary); }
.font-name { min-width: 0; overflow: hidden; color: var(--color-text-secondary); font-size: 9px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.font-character { margin: auto 0; color: var(--color-text); font-size: clamp(54px, 16vw, 72px); font-weight: 500; line-height: 1; text-align: center; }

@media (max-width: 360px) {
  .font-sample-card { min-height: 138px; padding: 10px; }
  .font-role { padding-right: 6px; padding-left: 6px; font-size: 7px; }
  .font-name { font-size: 8px; }
}
</style>
