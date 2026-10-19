<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  seconds: number
  progress: number
  isRunning: boolean
}

const props = defineProps<Props>()
const progressStyle = computed(() => {
  const progress = Math.min(1, Math.max(0, props.progress))
  return {
    transform: `scaleY(${progress})`,
    animationDuration: `${props.seconds}s`,
    animationDelay: `${-progress * props.seconds}s`,
  }
})
</script>

<template>
  <view class="reading-progress" :class="{ 'is-running': isRunning }" :style="progressStyle" aria-hidden="true" />
</template>

<style scoped>
.reading-progress {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  background: var(--color-selection);
  background: color-mix(in srgb, var(--color-progress) 16%, transparent);
  border-bottom: 2px solid var(--color-progress);
  transform-origin: top;
  will-change: transform;
}
/* 动画在视图层连续运行；逻辑层只负责倒计时和翻页，不逐帧传输整页状态。 */
.is-running { animation: autoReadingFill linear forwards; }
@keyframes autoReadingFill {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}
@media (prefers-reduced-motion: reduce) {
  .reading-progress { background: transparent; border-bottom: 0; animation: none; }
}
</style>
