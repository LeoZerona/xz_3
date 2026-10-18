<script setup lang="ts">
import { computed } from 'vue'
import type { ReadingRow, TableStyleId } from '../../../reading/types'

interface Props {
  rows: ReadingRow[]
  tableStyleId: TableStyleId
  learningFontFamily: string
  referenceFontFamily: string
  page: number
  totalPages: number
  fontSize?: number
  autoProgress?: number
  isAutoReading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  rows: () => [],
  fontSize: 16,
  autoProgress: 0,
  isAutoReading: false,
})

const safeAutoProgress = computed(() => Math.min(1, Math.max(0, props.autoProgress)))
const progressStyle = computed(() => ({ transform: `scaleY(${safeAutoProgress.value})` }))

const normalizedFontSize = computed(() => {
  const v = props.fontSize
  if (!Number.isFinite(v)) return 16
  return Math.min(28, Math.max(12, Math.round(v)))
})
const learningFontSize = computed(() => normalizedFontSize.value)
const referenceFontSize = computed(() => Math.max(11, Math.round(normalizedFontSize.value * 0.875)))
const gridFontSize = computed(() => normalizedFontSize.value)
const gridRefFontSize = computed(() => Math.max(11, Math.round(normalizedFontSize.value * 0.8125)))
const gridCellSize = computed(() => normalizedFontSize.value + 14)
const gridRefCellSize = computed(() => gridRefFontSize.value + 13)
const manuscriptLineHeight = computed(() => `${normalizedFontSize.value + 16}px`)
const manuscriptRefLineHeight = computed(() => `${gridRefFontSize.value + 15}px`)

function splitChars(text: string): string[] {
  return [...text]
}
</script>
<template>
  <view
    class="reading-table-wrap"
    :class="{ 'is-auto-reading': isAutoReading }"
    :data-table-style="tableStyleId"
    :style="{ '--reading-font-size': normalizedFontSize + 'px' }"
    role="table"
    :aria-rowcount="rows.length"
    aria-label="对照阅读表格"
  >
    <view v-if="rows.length === 0" class="empty-state">
      <text class="empty-title">暂无可显示的行</text>
      <text class="empty-desc">请选择书籍或等待文本加载完成</text>
    </view>

    <view v-else class="reading-table" role="rowgroup">
      <view v-if="isAutoReading" class="reading-progress" :style="progressStyle" aria-hidden="true" />

      <view class="table-header" role="row" aria-hidden="true">
        <text class="header-text">学习字体 / 对照字体</text>
      </view>

      <view
        v-for="row in rows"
        :key="row.id"
        class="reading-row"
        role="row"
        :aria-rowindex="row.index"
        :aria-label="`第 ${row.index} 行`"
      >
        <view class="cell-content">
          <template v-if="tableStyleId === 'manuscript-grid'">
            <view class="manuscript-line manuscript-line--learn">
              <view
                v-for="(character, characterIndex) in splitChars(row.text)"
                :key="characterIndex"
                class="grid-cell learn-cell"
                :style="{ width: gridCellSize + 'px', height: gridCellSize + 'px', minWidth: gridCellSize + 'px', maxWidth: gridCellSize + 'px', flexBasis: gridCellSize + 'px' }"
              >
                <text selectable class="grid-char learn-char" :style="{ fontFamily: learningFontFamily, fontSize: gridFontSize + 'px' }">{{ character }}</text>
              </view>
            </view>
            <view class="cell-divider manuscript-divider" aria-hidden="true" />
            <view class="manuscript-line manuscript-line--ref">
              <view
                v-for="(character, characterIndex) in splitChars(row.text)"
                :key="characterIndex"
                class="grid-cell ref-cell"
                :style="{ width: gridRefCellSize + 'px', height: gridRefCellSize + 'px', minWidth: gridRefCellSize + 'px', maxWidth: gridRefCellSize + 'px', flexBasis: gridRefCellSize + 'px' }"
              >
                <text selectable class="grid-char ref-char" :style="{ fontFamily: referenceFontFamily, fontSize: gridRefFontSize + 'px' }">{{ character }}</text>
              </view>
            </view>
          </template>

          <template v-else-if="tableStyleId === 'manuscript-line'">
            <view class="cell-line cell-learning selectable-view" :style="{ fontFamily: learningFontFamily, fontSize: learningFontSize + 'px', lineHeight: manuscriptLineHeight, minHeight: manuscriptLineHeight }">{{ row.text }}</view>
            <view class="cell-divider" aria-hidden="true" />
            <view class="cell-line cell-reference selectable-view" :style="{ fontFamily: referenceFontFamily, fontSize: referenceFontSize + 'px', lineHeight: manuscriptRefLineHeight, minHeight: manuscriptRefLineHeight }">{{ row.text }}</view>
          </template>

          <template v-else>
            <view class="cell-line cell-learning selectable-view" :style="{ fontFamily: learningFontFamily, fontSize: learningFontSize + 'px' }">{{ row.text }}</view>
            <view class="cell-divider" aria-hidden="true" />
            <view class="cell-line cell-reference selectable-view" :style="{ fontFamily: referenceFontFamily, fontSize: referenceFontSize + 'px' }">{{ row.text }}</view>
          </template>
        </view>
      </view>
    </view>

    <view class="table-caption" aria-hidden="true">
      <text class="caption-text">第 {{ page }} / {{ totalPages }} 页 · 长按可选取文字 · 上下为学习/对照字体</text>
    </view>
  </view>
</template>
<style scoped lang="scss">
.reading-table-wrap {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.reading-table { position: relative; width: 100%; }
.table-header { display: none; }

.reading-progress {
  position: absolute;
  z-index: 2;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
  background: color-mix(in srgb, var(--color-progress) 20%, transparent);
  border-bottom: 2px solid var(--color-progress);
  transform-origin: top;
  will-change: transform;
}

.reading-row {
  position: relative;
  z-index: 1;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.15s ease;
}

.reading-row:last-child { border-bottom: 0; }
.reading-row:hover { background: var(--color-surface-muted); }
.selectable-view { user-select: text; -webkit-user-select: text; }
.cell-content { min-width: 0; padding: 10px 14px; }
.cell-line, .grid-char {
  user-select: text;
  -webkit-user-select: text;
  -webkit-touch-callout: default;
}
.cell-line { line-height: 1.7; word-break: break-word; white-space: pre-wrap; }
.cell-line::selection, .grid-char::selection {
  background: var(--color-selection);
}
.cell-learning { color: var(--color-text); font-size: var(--reading-font-size, 16px); font-weight: 500; letter-spacing: 0.02em; }
.cell-reference { color: var(--color-text-secondary); font-size: calc(var(--reading-font-size, 16px) * 0.875); letter-spacing: 0.01em; }

.cell-divider {
  height: 1px;
  margin: 7px 0;
  background: repeating-linear-gradient(to right, var(--color-border) 0 6px, transparent 6px 10px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 16px;
  text-align: center;
}
.empty-title { color: var(--color-text); font-size: 14px; font-weight: 600; }
.empty-desc { color: var(--color-text-muted); font-size: 12px; }
.table-caption { padding: 8px 12px; border-top: 1px solid var(--color-border); background: var(--color-surface-muted); text-align: center; }
.caption-text { color: var(--color-text-muted); font-size: 11px; }

.reading-table-wrap[data-table-style='light-shading'] {
  .reading-row { border-bottom-color: var(--color-border); }
  .reading-row:nth-child(odd) { background: var(--color-surface-muted); }
  .reading-row:nth-child(even) { background: var(--color-surface); }
  .cell-content { padding: 12px 16px; }
  .cell-divider { opacity: 0.6; }
}

.reading-table-wrap[data-table-style='medium-grid'] {
  border: 2px solid var(--color-text-muted);
  .reading-row { border-bottom: 1.5px solid var(--color-border); }
}

.reading-table-wrap[data-table-style='accent-stripe'] {
  .reading-row:nth-child(odd) { background: var(--color-primary-soft); }
  .cell-divider { height: 1px; background: var(--color-primary); opacity: 0.25; }
}

.reading-table-wrap[data-table-style='borderless'] {
  border: 0;
  background: transparent;
  .reading-table { display: flex; flex-direction: column; gap: 10px; }
  .reading-row { border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); box-shadow: 0 2px 10px var(--color-shadow); }
  .cell-content { padding: 14px 16px; }
  .table-caption { border-top: 0; background: transparent; }
}

.reading-table-wrap[data-table-style='dark-header'] {
  .table-header { position: relative; z-index: 1; display: flex; padding: 8px 14px; background: var(--color-text); }
  .header-text { color: var(--color-surface); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; }
}

.reading-table-wrap[data-table-style='manuscript-grid'] {
  border: 1.6px solid var(--color-primary);
  border-radius: 4px;
  background: var(--color-page);
  .reading-table { background: var(--color-page); }
  .reading-row { border-bottom: 0; background: transparent; }
  .reading-row + .reading-row { margin-top: 10px; }
  .cell-content { padding: 2px; background: transparent; }
  .manuscript-line { display: flex; flex-wrap: wrap; align-content: flex-start; padding: 1px 0 0 1px; border: 1px solid var(--color-border); border-radius: 1px; background: var(--color-page); }
  .manuscript-line--learn { min-height: 30px; }
  .manuscript-line--ref { min-height: 26px; opacity: 0.92; }
  .grid-cell {
    flex: 0 0 30px;
    width: 30px;
    min-width: 30px;
    max-width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .grid-char { display: block; color: var(--color-text); font-size: 16px; line-height: 1; white-space: nowrap; }
  .ref-cell { flex-basis: 26px; width: 26px; min-width: 26px; max-width: 26px; height: 26px; border-color: var(--color-border); background: var(--color-surface); }
  .ref-char { color: var(--color-text-secondary); font-size: 13px; }
  .manuscript-divider { height: 6px; margin: 0; border-right: 1px solid var(--color-primary); border-left: 1px solid var(--color-primary); background: var(--color-page); }
  .table-caption { margin-top: 8px; border-top-color: var(--color-primary); background: var(--color-primary-soft); }
}

.reading-table-wrap[data-table-style='manuscript-line'] {
  border: 1.6px solid var(--color-primary);
  border-radius: 4px;
  background: var(--color-page);
  .reading-table { background: var(--color-page); }
  .reading-row { border-bottom: 0; background: transparent; }
  .cell-content { min-height: 64px; padding: 6px 10px; background: repeating-linear-gradient(to bottom, transparent 0, transparent 31px, color-mix(in srgb, var(--color-primary) 18%, transparent) 31px, color-mix(in srgb, var(--color-primary) 18%, transparent) 32px); }
  .cell-learning { min-height: 32px; padding-top: 1px; color: var(--color-text); font-size: 16px; line-height: 32px; }
  .cell-reference { min-height: 28px; color: var(--color-text-secondary); font-size: 13.5px; line-height: 28px; opacity: 0.92; }
  .cell-divider { height: 4px; margin: 0; background: transparent; }
  .reading-row + .reading-row { border-top: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent); }
  .table-caption { border-top: 1.2px solid var(--color-primary); background: var(--color-primary-soft); }
}

@supports not (color: color-mix(in srgb, black, white)) {
  .reading-table-wrap[data-table-style='manuscript-line'] .cell-content { background: repeating-linear-gradient(to bottom, transparent 0, transparent 31px, var(--color-border) 31px, var(--color-border) 32px); }
}
@media (prefers-reduced-motion: reduce) {
  .reading-progress, .reading-row { transition: none; }
}
</style>
