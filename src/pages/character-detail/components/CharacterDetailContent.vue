<script setup lang="ts">
import CharacterFontComparison from '../../../components/CharacterFontComparison.vue'
import type { LearningFont } from '../../../fonts/types'
import type { StudyCharacterEntry } from '../../../study/types'

interface Props {
  character: StudyCharacterEntry
  learningFont: LearningFont
  referenceFont: LearningFont
}

defineProps<Props>()
</script>

<template>
  <view class="character-summary">
    <CharacterFontComparison
      :character="character.script_forms.simplified"
      :learning-font="learningFont"
      :reference-font="referenceFont"
    />
    <view class="reading">
      <text>{{ character.phonetics.pinyin }}</text>
      <text>{{ character.structure.total_strokes }} 画</text>
      <text>{{ character.structure.layout }}</text>
    </view>
  </view>

  <view class="detail-content">
    <view class="info-card">
      <text class="card-title">基本释义</text>
      <text class="definition">{{ character.semantics.definition }}</text>
      <view class="word-list" aria-label="常用词语">
        <text v-for="word in character.semantics.words" :key="word" class="word-chip">{{ word }}</text>
      </view>
    </view>

    <view class="info-card structure-card">
      <view class="structure-item">
        <text class="meta-label">字形结构</text>
        <text class="meta-value">{{ character.structure.layout }}</text>
      </view>
      <view class="structure-item">
        <text class="meta-label">造字法</text>
        <text class="meta-value">{{ character.structure.liushu }}</text>
      </view>
      <view class="structure-item structure-wide">
        <text class="meta-label">字形说明</text>
        <text class="meta-value">{{ character.structure.liushu_detail }}</text>
      </view>
    </view>

    <view class="info-card">
      <text class="card-title">《说文解字》</text>
      <text class="source-version">{{ character.shuowen.source_version }}</text>
      <text class="classical-text">{{ character.shuowen.original }}</text>
      <text class="translation">{{ character.shuowen.translation }}</text>
    </view>

    <view v-if="character.study.tags.length" class="tag-list" aria-label="文字标签">
      <text v-for="tag in character.study.tags" :key="tag" class="tag">{{ tag }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.character-summary { padding: 16px 14px 6px; }
.reading { width: fit-content; margin: 12px auto 0; padding: 6px 11px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; border-radius: 999px; background: var(--color-surface-muted); color: var(--color-text-secondary); font-size: 10px; }
.reading text + text { position: relative; }
.reading text + text::before { content: ''; position: absolute; top: 50%; left: -7px; width: 2px; height: 2px; border-radius: 50%; background: currentColor; }
.detail-content { padding: 10px 14px calc(24px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 12px; }
.info-card { padding: 17px 16px; display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--color-border); border-radius: 12px; background: color-mix(in srgb, var(--color-surface) 90%, transparent); box-shadow: 0 6px 20px var(--color-shadow); }
.card-title { font-size: 13px; font-weight: 700; }
.definition { color: var(--color-text-secondary); font-size: 13px; line-height: 1.65; }
.word-list, .tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
.word-chip, .tag { padding: 6px 10px; border-radius: 14px; background: var(--color-primary-soft); color: var(--color-primary); font-size: 10px; }
.structure-card { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 12px; }
.structure-item { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.structure-wide { grid-column: 1 / -1; }
.meta-label, .source-version { color: var(--color-text-muted); font-size: 9px; }
.meta-value, .classical-text, .translation { font-size: 12px; line-height: 1.7; }
.translation { padding-top: 10px; border-top: 1px solid var(--color-border); color: var(--color-text-secondary); }
.tag-list { padding: 2px; }
.tag { background: var(--color-surface-muted); color: var(--color-text-secondary); }
@supports not (color: color-mix(in srgb, black, white)) { .info-card { background: var(--color-surface); } }
</style>
