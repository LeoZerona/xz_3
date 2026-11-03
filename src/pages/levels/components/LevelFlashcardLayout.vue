<script setup lang="ts">
import { computed, watch } from 'vue'
import { stageActionLabel, stageProgressLabel, stageStatusLabel } from '../../../study/levelLayouts'
import type { LevelStageView } from '../../../study/levelLayouts'
import { useStagePager } from '../useStagePager'

const props = defineProps<{
  stages: LevelStageView[]
  initialStageId?: string
  lastStudiedStageId?: string
  hasMore: boolean
  isLoading: boolean
  totalCount: number
}>()
const emit = defineEmits<{
  (event: 'stage-select', stageId: string, isPlaceholder: boolean): void
  (event: 'stage-highlight', stageId: string): void
  (event: 'load-more'): void
}>()
const { start, currentItem, canPrevious, canNext, isPending, goTo } = useStagePager({
  items: () => props.stages, initialStageId: () => props.initialStageId,
  hasMore: () => props.hasMore, isLoading: () => props.isLoading,
  requestMore: () => emit('load-more'), pageSize: 1,
})
const jumpStages = computed(() => {
  const first = Math.floor(start.value / 8) * 8
  return props.stages.slice(first, first + 8).map((item, index) => ({ item, index: first + index }))
})
const isLastStudied = computed(() => currentItem.value?.stage.id === props.lastStudiedStageId)
let hasPendingSelection = false
function rememberSelection(): void {
  if (!hasPendingSelection || isPending.value || !currentItem.value) return
  hasPendingSelection = false
  emit('stage-highlight', currentItem.value.stage.id)
}
watch([currentItem, isPending], rememberSelection)
function handlePick(index: number): void {
  hasPendingSelection = true
  goTo(index)
  rememberSelection()
}
function handleStart(): void {
  const item = currentItem.value
  if (item) emit('stage-select', item.stage.id, item.stage.isPlaceholder)
}
</script>

<template>
  <view v-if="currentItem" :id="'stage-' + currentItem.stage.id" class="flash-layout" tabindex="-1">
    <view class="deck-stage">
      <view class="deck-back deck-back-two" aria-hidden="true" />
      <view class="deck-back deck-back-one" aria-hidden="true" />
      <view id="level-flash-card" class="flash-card" :class="{ 'is-recent': isLastStudied }" :aria-busy="isPending || isLoading">
        <view class="flash-card-header"><h2>{{ currentItem.stage.title }}</h2><text>{{ stageProgressLabel(currentItem) }}</text></view>
        <view v-if="!currentItem.stage.isPlaceholder" class="flash-glyphs" aria-label="本关汉字">
          <text v-for="character in currentItem.stage.characters.slice(0, 10)" :key="character.id">{{ character.script_forms.simplified }}</text>
        </view>
        <view v-else class="flash-pending"><text>字表准备中</text><text>准备好后在这里见</text></view>
        <button class="flash-start" role="button" :aria-label="stageActionLabel(currentItem, isLastStudied) + '，' + currentItem.stage.title" @click="handleStart">
          {{ stageActionLabel(currentItem, isLastStudied) }}<van-icon name="arrow" size="16" aria-hidden="true" />
        </button>
        <text class="flash-status">{{ stageStatusLabel(currentItem, isLastStudied) }}</text>
      </view>
    </view>
    <view class="flash-stepper">
      <button role="button" class="flash-control" aria-label="上一关" aria-controls="level-flash-card" :disabled="!canPrevious || isPending || isLoading" @click="handlePick(start - 1)"><van-icon name="arrow-left" size="18" aria-hidden="true" /></button>
      <text aria-live="polite">{{ isPending ? '正在加载…' : (start + 1) + ' / ' + totalCount + ' 关' }}</text>
      <button role="button" class="flash-control" aria-label="下一关" aria-controls="level-flash-card" :disabled="!canNext || isPending || isLoading" @click="handlePick(start + 1)"><van-icon name="arrow" size="18" aria-hidden="true" /></button>
    </view>
    <view class="flash-jump">
      <view class="flash-jump-heading"><h2>想换一关？</h2><text>自由选择</text></view>
      <view class="flash-picks">
        <button v-for="entry in jumpStages" :key="entry.item.stage.id" role="button" class="flash-pick" :class="{ 'is-active': start === entry.index }" :aria-label="'选择' + entry.item.stage.title" :aria-pressed="start === entry.index" :disabled="isPending || isLoading" @click="handlePick(entry.index)">{{ entry.item.stage.index.toString().padStart(2, '0') }}</button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.flash-layout { max-width: 480px; margin: 0 auto; }
.deck-stage { position: relative; margin: 22px 8px 0; padding-top: 14px; }
.deck-back { position: absolute; inset: 14px 11px 0; border: 1px solid var(--color-border); border-radius: 24px; background: var(--color-surface); }
.deck-back-one { transform: rotate(-5deg); }
.deck-back-two { transform: rotate(6deg); }
.flash-card { position: relative; z-index: 1; min-height: 313px; margin: 0 9px; padding: 24px; border: 1px solid var(--color-border); border-radius: 24px; background: var(--color-surface); }
.flash-card.is-recent { border-color: var(--color-primary); background: var(--color-primary-soft); }
.flash-card-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.flash-card-header h2 { margin: 0; font-size: 19px; font-weight: 650; }
.flash-card-header > text { color: var(--color-text-secondary); font-size: 12px; }
.flash-glyphs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 13px 4px; margin: 30px 0; font-size: 33px; text-align: center; line-height: 1.35; }
.flash-pending { min-height: 150px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 14px; }
.flash-start { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; min-height: 46px; margin: 0; padding: 0 16px; border-radius: 999px; background: var(--level-action-fill); color: var(--color-on-primary); font-size: 14px; font-weight: 600; }
.flash-status { display: block; margin-top: 12px; color: var(--color-text-secondary); font-size: 12px; text-align: center; }
.flash-stepper { display: flex; justify-content: center; align-items: center; gap: 24px; margin-top: 28px; font-size: 14px; }
.flash-control { display: grid; place-items: center; flex: none; width: 44px; height: 44px; min-height: 44px; margin: 0; padding: 0; border-radius: 50%; background: var(--color-surface); color: var(--color-text); }
.flash-jump { margin-top: 22px; }
.flash-jump-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.flash-jump-heading h2 { margin: 0; font-size: 16px; font-weight: 600; }
.flash-jump-heading > text { font-size: 12px; }
.flash-picks { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.flash-pick { display: grid; place-items: center; min-height: 44px; margin: 0; padding: 0; border-radius: 12px; background: var(--color-surface); color: var(--color-text); font-size: 14px; }
.flash-pick.is-active { outline: 1px solid var(--color-primary); outline-offset: -1px; background: var(--color-primary-soft); color: var(--level-accent-ink); }
button[disabled] { opacity: .45; }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
@media (max-width: 360px) {
  .deck-stage { margin-right: 2px; margin-left: 2px; }
  .flash-card { padding: 20px 16px; }
  .flash-glyphs { margin-top: 24px; margin-bottom: 24px; font-size: 30px; }
}
</style>
