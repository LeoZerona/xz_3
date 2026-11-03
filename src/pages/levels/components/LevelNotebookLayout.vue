<script setup lang="ts">
import { computed } from 'vue'
import { stageActionLabel, stageProgressLabel, stageStatusLabel } from '../../../study/levelLayouts'
import type { LevelStageView } from '../../../study/levelLayouts'

const props = defineProps<{ stages: LevelStageView[]; featuredStage?: LevelStageView; lastStudiedStageId?: string }>()
const emit = defineEmits<{
  (event: 'stage-select', stageId: string, isPlaceholder: boolean): void
}>()
const firstCharacter = computed(() => props.featuredStage?.stage.characters[0]?.script_forms.simplified)
const nextCharacters = computed(() => props.featuredStage?.stage.characters.slice(1, 10) ?? [])
const remainingStages = computed(() => props.stages.filter((item) => item.stage.id !== props.featuredStage?.stage.id))
const isLastStudied = computed(() => props.featuredStage?.stage.id === props.lastStudiedStageId)
function handleSelect(item: LevelStageView): void { emit('stage-select', item.stage.id, item.stage.isPlaceholder) }
</script>

<template>
  <view class="notebook-layout">
    <view v-if="featuredStage" :id="'stage-' + featuredStage.stage.id" class="notebook-feature" tabindex="-1">
      <h2 class="notebook-heading">{{ isLastStudied ? '上次选择' : '关卡预览' }}</h2>
      <view class="notebook-page" :class="{ 'is-recent': isLastStudied }">
        <view class="notebook-top">
          <view class="copy-page" aria-hidden="true"><text>{{ firstCharacter }}</text></view>
          <view class="notebook-copy">
            <h3>{{ featuredStage.stage.title }}</h3>
            <text class="notebook-status">{{ stageStatusLabel(featuredStage, isLastStudied) }} · {{ featuredStage.stage.characters.length }} 个字</text>
            <view class="notebook-nine" aria-label="本关其余汉字">
              <text v-for="character in nextCharacters" :key="character.id">{{ character.script_forms.simplified }}</text>
            </view>
          </view>
        </view>
        <view class="notebook-foot">
          <text>{{ stageProgressLabel(featuredStage) }}</text>
          <button class="notebook-start" role="button" :aria-label="stageActionLabel(featuredStage, isLastStudied) + '，' + featuredStage.stage.title" @click="handleSelect(featuredStage)">
            {{ stageActionLabel(featuredStage, isLastStudied) }}<van-icon name="arrow" size="16" aria-hidden="true" />
          </button>
        </view>
      </view>
    </view>
    <view v-if="remainingStages.length" class="notebook-directory">
      <h2 class="notebook-heading">接下来学什么</h2>
      <button
        v-for="item in remainingStages"
        :key="item.stage.id"
        :id="'stage-' + item.stage.id"
        class="notebook-lesson"
        role="button"
        :aria-label="item.stage.title + '，' + stageProgressLabel(item) + '，' + stageActionLabel(item)"
        @click="handleSelect(item)"
      >
        <text class="lesson-glyph" aria-hidden="true">{{ item.stage.characters[0]?.script_forms.simplified || '待' }}</text>
        <view class="lesson-copy">
          <view class="lesson-meta"><text>{{ item.stage.title }}</text><text>{{ item.isDone ? '已完成' : stageProgressLabel(item) }}</text></view>
          <view v-if="!item.stage.isPlaceholder" class="lesson-glyphs" aria-hidden="true">
            <text v-for="character in item.stage.characters.slice(0, 10)" :key="character.id">{{ character.script_forms.simplified }}</text>
          </view>
          <text v-else class="lesson-pending">字表准备好后在这里见</text>
        </view>
        <van-icon name="arrow" size="15" aria-hidden="true" />
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.notebook-heading { margin: 0 0 16px; font-size: 16px; font-weight: 600; }
.notebook-page { padding: 18px 18px 0; border-radius: 14px; background: var(--color-surface-muted); }
.notebook-page.is-recent { background: var(--color-primary-soft); }
.notebook-top { display: grid; grid-template-columns: 116px minmax(0, 1fr); gap: 16px; }
.copy-page { display: grid; place-items: center; min-height: 144px; border-radius: 6px; background: var(--color-surface); }
.copy-page text, .notebook-nine, .lesson-glyph, .lesson-glyphs { font-family: 'LevelNotebook', serif; }
.copy-page text { font-size: 92px; line-height: 1; }
.notebook-copy { min-width: 0; }
.notebook-copy h3 { margin: 2px 0 5px; font-size: 16px; font-weight: 600; }
.notebook-status { font-size: 12px; color: var(--color-text-secondary); }
.notebook-nine { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px 6px; margin-top: 14px; font-size: 23px; line-height: 1.15; text-align: center; }
.notebook-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; min-height: 60px; font-size: 12px; color: var(--color-text-secondary); }
.notebook-start { display: flex; align-items: center; gap: 8px; min-height: 44px; margin: 0; padding: 0; background: transparent; color: var(--level-accent-ink); font-size: 14px; font-weight: 600; }
.notebook-directory { margin-top: 28px; }
.notebook-directory .notebook-heading { margin-bottom: 8px; }
.notebook-lesson { display: grid; grid-template-columns: 42px minmax(0, 1fr) 15px; align-items: center; gap: 12px; width: 100%; min-height: 83px; margin: 0; padding: 12px 0; border-bottom: 1px solid var(--color-border); border-radius: 0; background: transparent; color: var(--color-text); text-align: left; }
.lesson-glyph { font-size: 37px; text-align: center; }
.lesson-copy { min-width: 0; }
.lesson-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; font-size: 13px; font-weight: 600; }
.lesson-meta text + text { color: var(--color-text-secondary); font-size: 12px; font-weight: 400; }
.lesson-glyphs { display: flex; justify-content: space-between; margin-top: 9px; font-size: 17px; }
.lesson-pending { color: var(--color-text-secondary); font-size: 13px; }
.notebook-lesson :deep(.van-icon) { color: var(--color-text-secondary); }
button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@media (min-width: 901px) {
  .notebook-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: 40px; }
  .notebook-directory { margin-top: 0; }
  .notebook-top { grid-template-columns: minmax(120px, 1fr) minmax(0, 1fr); }
  .copy-page { min-height: 200px; }
}
@media (max-width: 360px) {
  .notebook-page { padding: 16px 14px 0; }
  .notebook-top { grid-template-columns: 100px minmax(0, 1fr); gap: 12px; }
  .notebook-nine { font-size: 21px; }
  .lesson-glyphs { font-size: 15px; }
}
</style>
