<script setup lang="ts">
import { computed } from 'vue'
import type { CharacterEntry } from '../../../search/characterSearch'
import type { LearningFont } from '../../../fonts/types'

const props = defineProps<{ characters: CharacterEntry[]; learningFont: LearningFont; referenceFont: LearningFont }>()
const emit = defineEmits<{ (event: 'character-open', entry: CharacterEntry): void }>()
const matrixStyle = computed(() => ({ '--comparison-columns': String(Math.max(1, props.characters.length)) }))
const fonts = computed(() => [
  { role: '学习字体', font: props.learningFont },
  { role: '对照字体', font: props.referenceFont },
])
</script>

<template>
  <scroll-view class="comparison-matrix-scroll" scroll-x :show-scrollbar="true" aria-label="字形比较表">
    <view class="comparison-matrix" :style="matrixStyle">
      <view class="matrix-grid matrix-headings">
        <button v-for="entry in characters" :key="entry.id" class="matrix-character-link" role="button" tabindex="0" :aria-label="'查看' + entry.script_forms.simplified + '的文字详情'" @click="emit('character-open', entry)" @keydown.enter.prevent="emit('character-open', entry)" @keydown.space.prevent="emit('character-open', entry)">{{ entry.script_forms.simplified }}<van-icon name="arrow" size="13" aria-hidden="true" /></button>
      </view>
      <view v-for="item in fonts" :key="item.role" class="matrix-font-section" role="group" :aria-label="item.role + '：' + item.font.name">
        <view class="matrix-section-label"><text>{{ item.role }}</text><text>{{ item.font.name }}</text></view>
        <view class="matrix-grid matrix-font-row">
          <text v-for="entry in characters" :key="entry.id" class="comparison-glyph" :style="{ fontFamily: item.font.fontFamily }" :aria-label="item.font.name + '中的' + entry.script_forms.simplified">{{ entry.script_forms.simplified }}</text>
        </view>
      </view>
      <view class="matrix-section-label"><text>读音与字义</text></view>
      <view class="matrix-grid matrix-details">
        <view v-for="entry in characters" :key="entry.id" class="comparison-detail">
          <text class="comparison-pinyin">{{ entry.phonetics.pinyin }}</text>
          <text class="comparison-structure">{{ entry.structure.total_strokes }} 画 · {{ entry.structure.layout }}</text>
          <text class="comparison-definition">{{ entry.semantics.definition }}</text>
          <text v-if="entry.semantics.words.length" class="comparison-words">{{ entry.semantics.words.slice(0, 3).join('、') }}</text>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<style scoped lang="scss">
.comparison-matrix-scroll { width: 100%; height: auto; border-radius: 18px; background: var(--color-surface); }
.comparison-matrix { width: calc(var(--comparison-columns) * 112px); min-width: 100%; padding-bottom: 18px; }
.matrix-grid { display: grid; grid-template-columns: repeat(var(--comparison-columns), minmax(0, 1fr)); }
.matrix-headings { background: var(--color-primary-soft); }
.matrix-character-link { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; margin: 0; padding: 0 10px; border-radius: 0; background: transparent; color: var(--color-text); font-size: 20px; font-weight: 600; }
.matrix-character-link:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -3px; }
.matrix-section-label { position: sticky; left: 0; display: flex; align-items: baseline; gap: 10px; width: fit-content; max-width: 100vw; min-height: 42px; padding: 14px 16px 8px; color: var(--color-text-secondary); font-size: 13px; }
.matrix-section-label text + text { font-size: 12px; }
.matrix-font-row { padding: 8px 0 18px; border-bottom: 1px solid var(--color-border); }
.comparison-glyph { min-width: 0; padding: 4px 12px; color: var(--color-text); font-size: 76px; font-weight: 400; line-height: 1.2; text-align: center; }
.comparison-detail { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 14px; text-align: center; }
.comparison-pinyin { font-size: 16px; }
.comparison-structure, .comparison-words { color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; }
.comparison-definition { align-self: stretch; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
@media (min-width: 901px) { .comparison-matrix { width: calc(var(--comparison-columns) * 150px); } .comparison-glyph { font-size: 90px; } }
@media (max-width: 360px) { .comparison-matrix { width: calc(var(--comparison-columns) * 96px); } .comparison-glyph { padding-right: 10px; padding-left: 10px; font-size: 64px; } }
</style>
