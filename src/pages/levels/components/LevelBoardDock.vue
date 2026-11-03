<script setup lang="ts">
import { stageActionLabel, stageProgressLabel } from '../../../study/levelLayouts'
import type { LevelStageView } from '../../../study/levelLayouts'

defineProps<{ item: LevelStageView; isLastStudied?: boolean }>()
const emit = defineEmits<{
  (event: 'stage-select', stageId: string, isPlaceholder: boolean): void
}>()
</script>

<template>
  <view class="board-dock" aria-label="所选关卡预览">
    <view class="dock-copy" aria-live="polite">
      <view class="dock-title"><text>{{ item.stage.title }}</text><text>{{ stageProgressLabel(item) }}</text></view>
      <view v-if="!item.stage.isPlaceholder" class="dock-glyphs" aria-label="本关汉字">
        <text v-for="character in item.stage.characters.slice(0, 10)" :key="character.id">{{ character.script_forms.simplified }}</text>
      </view>
      <text v-else class="dock-pending">字表准备中</text>
    </view>
    <button class="dock-start" role="button" :aria-label="stageActionLabel(item, isLastStudied) + '，' + item.stage.title" @click="emit('stage-select', item.stage.id, item.stage.isPlaceholder)">
      <van-icon name="arrow" size="20" aria-hidden="true" />
    </button>
  </view>
</template>

<style scoped lang="scss">
.board-dock { flex: none; display: grid; grid-template-columns: minmax(0, 1fr) 48px; align-items: center; gap: 14px; min-height: 96px; margin: 0 calc(-1 * var(--levels-gutter)); padding: 14px var(--levels-gutter); border-top: 1px solid var(--color-border); background: var(--color-surface); }
.dock-copy { min-width: 0; }
.dock-title { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; font-weight: 600; }
.dock-title text + text { color: var(--color-text-secondary); font-size: 12px; font-weight: 400; }
.dock-glyphs { display: flex; justify-content: space-between; margin-top: 10px; font-size: 18px; line-height: 1.3; }
.dock-pending { display: block; margin-top: 10px; color: var(--color-text-secondary); font-size: 13px; }
.dock-start { display: grid; place-items: center; width: 48px; min-height: 48px; margin: 0; padding: 0; border-radius: 16px; background: var(--level-action-fill); color: var(--color-on-primary); }
.dock-start:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
@media (min-width: 901px) { .board-dock { grid-template-columns: minmax(0, 540px) 48px; justify-content: center; gap: 24px; } .dock-glyphs { font-size: 24px; } }
@media (max-width: 360px) { .board-dock { gap: 10px; } .dock-glyphs { font-size: 17px; } }
</style>
