<script setup lang="ts">
import { TABLE_STYLES } from '../../../reading/tableStyles'
import type { TableStyleId } from '../../../reading/types'

interface Props {
  modelValue: TableStyleId
  effectiveRowsPerPage: number
}

defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: TableStyleId): void
}>()

function selectStyle(id: TableStyleId) {
  emit('update:modelValue', id)
}

</script>

<template>
  <view class="style-switcher">
    <view class="switcher-head">
      <text class="switcher-title">表格样式</text>
      <text class="switcher-hint">含方格、横线稿纸与 Word 表格样式</text>
    </view>

    <view class="style-grid" role="radiogroup" aria-label="表格样式">
      <view
        v-for="style in TABLE_STYLES"
        :key="style.id"
        class="style-card"
        :class="{ 'is-active': style.id === modelValue }"
        role="radio"
        :aria-checked="style.id === modelValue"
        tabindex="0"
        @click="selectStyle(style.id)"
        @keydown.enter="selectStyle(style.id)"
        @keydown.space.prevent="selectStyle(style.id)"
      >
        <view class="mini-table" :data-mini-style="style.id" aria-hidden="true">
          <view class="mini-row" v-for="i in 3" :key="i"><view class="mini-cell" /><view class="mini-cell" /></view>
        </view>
        <text class="style-name">{{ style.name }}</text>
        <text class="style-desc">{{ style.description }}</text>
        <text class="style-badge">{{ style.badge }}</text>
      </view>
    </view>

    <view class="auto-pagination-note">
      <view class="auto-pagination-copy">
        <text class="auto-pagination-title">自动适配整页</text>
        <text class="auto-pagination-desc">根据屏幕、表格样式和每行字数重新分页</text>
      </view>
      <text class="auto-pagination-value">{{ effectiveRowsPerPage }} 行/页</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.style-switcher {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.switcher-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.switcher-title { font-size: 13px; font-weight: 700; color: var(--color-text); }
.switcher-hint { font-size: 11px; color: var(--color-text-muted); }

.style-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
}

@media (max-width: 560px) {
  .style-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 860px) {
  .style-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

.style-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px 8px;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  background: var(--color-surface);
  transition: all 0.15s ease;
}

.style-card.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  box-shadow: 0 2px 8px var(--color-shadow);
}

.style-card:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }

.mini-table {
  width: 56px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.mini-row { display: grid; grid-template-columns: 1fr 1fr; }
.mini-row + .mini-row { border-top: 1px solid var(--color-border); }
.mini-cell { height: 8px; }
.mini-cell + .mini-cell { border-left: 1px solid var(--color-border); }

/* 迷你预览与真实样式呼应 */
.mini-table[data-mini-style='light-shading'] .mini-row:nth-child(even) { background: #f2f3f5; }
.mini-table[data-mini-style='medium-grid'] { border-width: 2px; }
.mini-table[data-mini-style='accent-stripe'] .mini-row:nth-child(odd) { background: var(--color-primary-soft); }
.mini-table[data-mini-style='borderless'] { border: none; gap: 2px; background: transparent; .mini-row { border: 1px solid var(--color-border); border-radius: 3px; } }
.mini-table[data-mini-style='dark-header'] .mini-row:first-child { background: var(--color-text); }
.mini-table[data-mini-style='manuscript-grid'] {
  border: 1.5px solid #6BBE6B;
  background: #FFFEF7;
  .mini-row { border-top: 1px solid #A9D8A6; }
  .mini-row:first-child { border-top: none; }
  .mini-cell { border-left-color: #A9D8A6; background: #FFFFFF; }
  .mini-cell:nth-child(2) { background: #FAFFFA; }
}
.mini-table[data-mini-style='manuscript-line'] {
  border: 1.5px solid #6BBE6B;
  background: repeating-linear-gradient(to bottom, #FFFEF7 0 7px, #A8D8A6 7px 8px);
  .mini-row { border-top: 1px solid transparent; }
  .mini-cell { border-left: 1px solid #E87A7A; background: transparent; }
  .mini-cell:first-child { border-left: none; }
}

.style-name { font-size: 11px; font-weight: 600; color: var(--color-text); text-align: center; }
.style-desc { font-size: 9px; color: var(--color-text-muted); text-align: center; line-height: 1.3; }
.style-badge { position: absolute; top: 6px; right: 6px; font-size: 8px; font-weight: 700; padding: 1px 4px; border-radius: 999px; background: var(--color-text); color: #fff; }
.style-card.is-active .style-badge { background: var(--color-primary); }

.auto-pagination-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.auto-pagination-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.auto-pagination-title { font-size: 11px; font-weight: 700; color: var(--color-text); }
.auto-pagination-desc { font-size: 9px; line-height: 1.35; color: var(--color-text-muted); }
.auto-pagination-value { flex: none; font-size: 11px; font-weight: 700; color: var(--color-primary); }
</style>
