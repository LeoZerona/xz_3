<script setup lang="ts">
import { computed, watch } from 'vue'
import { stageProgressLabel, stageStatusLabel } from '../../../study/levelLayouts'
import type { LevelStageView } from '../../../study/levelLayouts'
import { useStagePager } from '../useStagePager'

const props = defineProps<{
  modelValue?: string
  initialStageId?: string
  lastStudiedStageId?: string
  stages: LevelStageView[]
  hasMore: boolean
  isLoading: boolean
}>()
const emit = defineEmits<{
  (event: 'update:modelValue', stageId: string): void
  (event: 'stage-highlight', stageId: string): void
  (event: 'load-more'): void
}>()
const { start, pageItems, canPrevious, canNext, isPending, previous, next } = useStagePager({
  items: () => props.stages, initialStageId: () => props.initialStageId,
  hasMore: () => props.hasMore, isLoading: () => props.isLoading,
  requestMore: () => emit('load-more'), pageSize: 12,
})
const rangeLabel = computed(() => `${start.value + 1}—${start.value + pageItems.value.length} 关`)
watch(pageItems, (items) => {
  if (!items.length || items.some((item) => item.stage.id === props.modelValue)) return
  const initial = items.find((item) => item.stage.id === props.initialStageId)
  emit('update:modelValue', (props.modelValue ? items[0] : initial ?? items[0])!.stage.id)
}, { immediate: true })
function handleSelect(stageId: string): void {
  emit('update:modelValue', stageId)
  emit('stage-highlight', stageId)
}
</script>

<template>
  <view v-if="pageItems.length" class="board-layout">
    <view class="board-pagination">
      <text aria-live="polite">{{ isPending ? '正在加载…' : rangeLabel }}</text>
      <button role="button" aria-label="上一组关卡" :disabled="!canPrevious || isPending" @click="previous"><van-icon name="arrow-left" size="16" aria-hidden="true" /></button>
      <button role="button" aria-label="下一组关卡" :disabled="!canNext || isPending" @click="next"><van-icon name="arrow" size="16" aria-hidden="true" /></button>
    </view>
    <view class="board-grid" :aria-busy="isPending">
      <button
        v-for="item in pageItems"
        :key="item.stage.id"
        :id="'stage-' + item.stage.id"
        class="board-tile"
        :class="{ 'is-active': modelValue === item.stage.id, 'is-done': item.isDone, 'is-recent': lastStudiedStageId === item.stage.id }"
        role="button"
        tabindex="0"
        :aria-label="'选择' + item.stage.title + '，' + stageProgressLabel(item) + '，' + stageStatusLabel(item) + (lastStudiedStageId === item.stage.id ? '，上次选择' : '')"
        :aria-current="lastStudiedStageId === item.stage.id ? 'step' : undefined"
        :aria-pressed="modelValue === item.stage.id"
        :disabled="isLoading"
        @click="handleSelect(item.stage.id)"
        @keydown.enter.prevent="handleSelect(item.stage.id)"
        @keydown.space.prevent="handleSelect(item.stage.id)"
      >
        <view class="board-number"><text>{{ item.stage.title }}</text><van-icon v-if="lastStudiedStageId === item.stage.id" name="bookmark-o" size="13" aria-hidden="true" /><van-icon v-else-if="item.isDone" name="success" size="12" aria-hidden="true" /></view>
        <text class="board-glyph" aria-hidden="true">{{ item.stage.characters[0]?.script_forms.simplified || '待' }}</text>
        <text class="board-progress">{{ item.stage.isPlaceholder ? '待上线' : item.completedChars + ' / ' + item.stage.characters.length }}</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.board-pagination { display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-top: -10px; margin-bottom: 10px; font-size: 13px; }
.board-pagination > text { margin-right: 4px; }
.board-pagination button { display: grid; place-items: center; width: 44px; min-height: 44px; margin: 0; padding: 0; border-radius: 50%; background: transparent; color: var(--color-text); }
.board-pagination button[disabled] { opacity: .4; }
.board-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.board-tile { min-width: 0; height: 103px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; gap: 2px; margin: 0; padding: 10px 6px 8px; border-radius: 17px; background: var(--color-surface); color: var(--color-text); }
.board-number, .board-progress { color: var(--color-text-secondary); font-size: 13px; line-height: 1.3; }
.board-number { display: flex; align-items: center; justify-content: center; gap: 2px; }
.board-glyph { font-size: 35px; line-height: 1.2; }
.board-tile.is-active { background: var(--color-primary-soft); }
.board-tile.is-recent { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.board-tile.is-active .board-number, .board-tile.is-active .board-progress { color: var(--level-accent-ink); }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
@media (min-width: 901px) { .board-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px; } .board-tile { height: 150px; padding: 16px; } .board-glyph { font-size: 48px; } }
@media (max-width: 360px) { .board-number, .board-progress { font-size: 12px; } }
</style>
