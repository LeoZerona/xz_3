<script setup lang="ts">
import { computed } from 'vue'
import type { ReadingRow, TableStyleId } from '../../../reading/types'
import { normalizeCharsPerLine } from '../../../reading/readingStorage'

interface Props {
  rows: ReadingRow[]
  tableStyleId: TableStyleId
  learningFontFamily: string
  referenceFontFamily: string
  page: number
  totalPages: number
  fontSize?: number
  charsPerLine?: number
  autoProgress?: number
  isAutoReading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  rows: () => [],
  fontSize: 18,
  charsPerLine: undefined,
  autoProgress: 0,
  isAutoReading: false,
})

const safeAutoProgress = computed(() => Math.min(1, Math.max(0, props.autoProgress)))
const progressStyle = computed(() => ({ transform: `scaleY(${safeAutoProgress.value})` }))

function migrateFontSizeToChars(v: number): number {
  if (!Number.isFinite(v)) return 14
  const s = Math.round(v)
  if (s <= 12) return 20
  if (s <= 14) return 18
  if (s <= 16) return 16
  if (s <= 18) return 14
  if (s <= 20) return 12
  if (s <= 24) return 10
  return 8
}

const normalizedCharsPerLine = computed(() => {
  if (typeof props.charsPerLine === 'number' && Number.isFinite(props.charsPerLine)) {
    return normalizeCharsPerLine(props.charsPerLine)
  }
  if (typeof props.fontSize === 'number' && Number.isFinite(props.fontSize)) {
    return migrateFontSizeToChars(props.fontSize)
  }
  return 14
})

const gridCellSize = computed(() => {
  const n = normalizedCharsPerLine.value
  // 纯按 N 计算格宽，去除 ResizeObserver 测量以消除首帧闪烁；
  // 需沾满时由 CSS grid 的 1fr 均分实现精准占满，而非 JS 测量
  const fallback = Math.round((22 * 14) / n)
  return Math.min(30, Math.max(18, fallback))
})
const gridRefCellSize = computed(() => Math.max(16, gridCellSize.value - 3))
const gridFontSize = computed(() => Math.max(12, gridCellSize.value - 4))
const gridRefFontSize = computed(() => Math.max(11, gridRefCellSize.value - 3))

// 非稿纸格样式的行内字号同样跟 N 联动，保证切换表格样式时视觉一致
const learningFontSize = computed(() => gridFontSize.value)
const referenceFontSize = computed(() => gridRefFontSize.value)
const manuscriptLineHeight = computed(() => `${gridCellSize.value + 6}px`)
const manuscriptRefLineHeight = computed(() => `${gridRefCellSize.value + 6}px`)

function splitChars(text: string): string[] {
  return [...text]
}
</script>
<template>
  <view class="reading-table-wrap"
    :class="{ 'is-auto-reading': isAutoReading }"
    :data-table-style="tableStyleId"
    :style="{ '--reading-font-size': gridFontSize + 'px', '--chars-per-line': String(normalizedCharsPerLine) }"
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

.cell-content { padding: 1px; background: transparent; }
.cell-line { word-break: break-all; white-space: pre-wrap; }
.cell-learning { font-weight: 600; color: var(--color-text); }
.cell-reference { color: var(--color-text-secondary); opacity: 0.92; }
.cell-divider { height: 1px; background: var(--color-border); margin: 2px 0; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 16px; }
.empty-title { color: var(--color-text); font-size: 14px; font-weight: 600; }
.empty-desc { color: var(--color-text-muted); font-size: 12px; }
.table-caption { padding: 6px 10px; border-top: 1px solid var(--color-border); background: var(--color-surface-muted); text-align: center; }
.caption-text { color: var(--color-text-muted); font-size: 11px; }

.reading-table-wrap[data-table-style='light-shading'] {
  .reading-row { border-bottom-color: var(--color-border); }
  .reading-row:nth-child(odd) { background: var(--color-surface-muted); }
  .reading-row:nth-child(even) { background: var(--color-surface); }
  .cell-content { padding: 7px 10px; }
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
  .cell-content { padding: 8px 10px; }
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
  .cell-content { padding: 1px; background: transparent; }
  .manuscript-line { display: grid; grid-template-columns: repeat(var(--chars-per-line, 14), 1fr); gap: 0; align-content: start; padding: 0; border: 1px solid var(--color-border); border-radius: 1px; background: var(--color-page); }
  .manuscript-line--learn { min-height: 22px; }
  .manuscript-line--ref { min-height: 19px; opacity: 0.92; }
  .grid-cell {
    width: auto;
    min-width: 0;
    max-width: none;
    height: auto;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .grid-char { display: block; color: var(--color-text); font-size: 18px; line-height: 1; white-space: nowrap; font-weight: 500; }
  .ref-cell { aspect-ratio: 1; border-color: var(--color-border); background: var(--color-surface); }
  .ref-char { color: var(--color-text-secondary); font-size: 13px; }
  .manuscript-divider { height: 4px; margin: 0; border-right: 1px solid var(--color-primary); border-left: 1px solid var(--color-primary); background: var(--color-page); }
  .table-caption { margin-top: 8px; border-top-color: var(--color-primary); background: var(--color-primary-soft); }
}

.reading-table-wrap[data-table-style='manuscript-line'] {
  border: 1.6px solid var(--color-primary);
  border-radius: 4px;
  background: var(--color-page);
  .reading-table { background: var(--color-page); }
  .reading-row { border-bottom: 0; background: transparent; }
  .cell-content { min-height: 54px; padding: 4px 8px; background: repeating-linear-gradient(to bottom, transparent 0, transparent 23px, color-mix(in srgb, var(--color-primary) 18%, transparent) 23px, color-mix(in srgb, var(--color-primary) 18%, transparent) 24px); }
  .cell-learning { min-height: 24px; padding-top: 0; color: var(--color-text); font-size: 17px; line-height: 24px; }
  .cell-reference { min-height: 20px; color: var(--color-text-secondary); font-size: 14px; line-height: 22px; opacity: 0.92; }
  .cell-divider { height: 2px; margin: 0; background: transparent; }
  .reading-row + .reading-row { border-top: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent); }
  .table-caption { border-top: 1.2px solid var(--color-primary); background: var(--color-primary-soft); }
}

@supports not (color: color-mix(in srgb, black, white)) {
  .reading-table-wrap[data-table-style='manuscript-line'] .cell-content { background: repeating-linear-gradient(to bottom, transparent 0, transparent 23px, var(--color-border) 23px, var(--color-border) 24px); }
}
@media (prefers-reduced-motion: reduce) {
  .reading-progress, .reading-row { transition: none; }
}
</style>
