<script setup lang="ts">
import { computed } from 'vue'
import type { LevelStage } from '../../../study/levelData'

const props = withDefaults(defineProps<{
  stage: LevelStage
  completedChars: number
  isDone: boolean
  progress: number
  isCurrent?: boolean
}>(), { isCurrent: false })
const emit = defineEmits<{
  (event: 'stage-select', stageId: string, isPlaceholder: boolean): void
}>()

const previewCharacters = computed(() => props.stage.characters.slice(0, 10))
const statusLabel = computed(() => {
  if (props.stage.isPlaceholder) return '待上线'
  if (props.isCurrent) return props.isDone ? '上次选择 · 已完成' : '上次选择'
  if (props.isDone) return '已完成'
  if (props.completedChars > 0) return '进行中'
  return ''
})
const actionLabel = computed(() => {
  if (props.stage.isPlaceholder) return '敬请期待'
  if (props.isDone) return '复习关卡'
  if (props.isCurrent) return '继续学习'
  return props.completedChars > 0 ? '继续学习' : '开始学习'
})
const progressLabel = computed(() => props.stage.isPlaceholder
  ? '字表准备中'
  : props.completedChars + ' / ' + props.stage.characters.length + ' 字')
const accessibleLabel = computed(() => props.stage.title + '，' + progressLabel.value + (props.isCurrent ? '，上次选择' : '') + '，' + actionLabel.value)

function handleSelect() {
  emit('stage-select', props.stage.id, props.stage.isPlaceholder)
}
</script>

<template>
  <view
    :id="'stage-' + stage.id"
    class="stage-card"
    :class="{ 'is-current': isCurrent, 'is-done': isDone, 'is-placeholder': stage.isPlaceholder }"
    role="button"
    tabindex="0"
    :aria-label="accessibleLabel"
    :aria-current="isCurrent ? 'step' : undefined"
    @click="handleSelect"
    @keydown.enter="handleSelect"
    @keydown.space.prevent="handleSelect"
  >
    <view class="stage-card-header">
      <text class="stage-title">{{ stage.title }}</text>
      <van-icon v-if="isDone" name="success" size="16" aria-hidden="true" />
      <van-icon v-else-if="stage.isPlaceholder" name="lock" size="15" aria-hidden="true" />
    </view>
    <view v-if="!stage.isPlaceholder" class="stage-chars" aria-hidden="true">
      <text v-for="character in previewCharacters" :key="character.id" class="stage-char">
        {{ character.script_forms.simplified }}
      </text>
    </view>
    <view v-else class="stage-pending">
      <text>字表准备中</text>
      <text>准备好后在这里见</text>
    </view>
    <view class="stage-footer">
      <text class="stage-progress-text">{{ progressLabel }}</text>
      <van-icon name="arrow" size="15" aria-hidden="true" />
    </view>
    <text v-if="statusLabel" class="stage-status">{{ statusLabel }}</text>
    <view v-if="progress > 0 && !stage.isPlaceholder" class="stage-progress-track" aria-hidden="true">
      <view class="stage-progress-fill" :style="{ width: progress * 100 + '%' }" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.stage-card {
  position: relative;
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  transition: transform 140ms ease, border-color 140ms ease;
}
.stage-card-header,
.stage-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.stage-card-header { color: var(--level-accent-ink); }
.stage-title {
  font-size: 15px;
  font-weight: 650;
}
.stage-chars {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px 4px;
  margin: 22px 0;
}
.stage-char {
  font-size: 28px;
  line-height: 1.35;
  text-align: center;
}
.stage-pending {
  min-height: 128px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 14px;
}
.stage-pending text + text {
  font-size: 12px;
}
.stage-footer {
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}
.stage-footer :deep(.van-icon) { color: var(--level-accent-ink); }
.stage-progress-text {
  font-size: 13px;
  white-space: nowrap;
}
.stage-status {
  display: block;
  min-height: 18px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.stage-progress-track {
  height: 3px;
  overflow: hidden;
  margin-top: 10px;
  border-radius: 4px;
  background: var(--color-border);
}
.stage-progress-fill {
  height: 100%;
  background: var(--color-primary);
}
.is-current {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}
.is-current .stage-card-header,
.is-current .stage-title,
.is-current .stage-footer :deep(.van-icon),
.is-current .stage-status {
  color: var(--level-accent-ink);
}
.is-current .stage-footer {
  color: var(--color-text);
}
.is-current .stage-status { font-weight: 600; }
.is-placeholder {
  color: var(--color-text-secondary);
}
.is-placeholder .stage-card-header,
.is-placeholder .stage-footer :deep(.van-icon) { color: var(--color-text-secondary); }
.stage-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
@media (hover: hover) {
  .stage-card:hover {
    transform: translateY(-3px);
    border-color: var(--color-primary);
  }
}
@media (max-width: 600px) {
  .stage-card {
    padding: 16px;
  }
  .stage-title {
    font-size: 14px;
  }
  .stage-chars {
    margin: 20px 0;
    gap: 8px 2px;
  }
  .stage-char {
    font-size: 23px;
  }
  .stage-progress-text {
    font-size: 13px;
  }
  .stage-pending {
    min-height: 110px;
    font-size: 13px;
  }
}
@media (max-width: 360px) {
  .stage-card {
    padding: 14px 12px;
  }
  .stage-char {
    font-size: 21px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .stage-card {
    transition: none;
  }
}
</style>

