<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  page: number
  totalPages: number
  totalRows: number
  rowsPerPage: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:page', value: number): void
}>()

const canPrev = computed(() => props.page > 1)
const canNext = computed(() => props.page < props.totalPages)
const progress = computed(() => (props.totalPages <= 1 ? 1 : props.page / props.totalPages))

function goPrev() {
  if (!canPrev.value) return
  emit('update:page', props.page - 1)
}

function goNext() {
  if (!canNext.value) return
  emit('update:page', props.page + 1)
}

function goFirst() {
  emit('update:page', 1)
}

function goLast() {
  emit('update:page', props.totalPages)
}
</script>

<template>
  <view class="pagination">
    <view class="progress-track" aria-hidden="true">
      <view class="progress-fill" :style="{ width: (progress * 100) + '%' }" />
    </view>

    <view class="pagination-row">
      <view class="page-info">
        <text class="page-text">第 {{ page }} / {{ totalPages }} 页</text>
        <text class="row-text">共 {{ totalRows }} 行 · 每页 {{ rowsPerPage }} 行</text>
      </view>

      <view class="actions">
        <view class="btn btn-ghost" :class="{ 'is-disabled': !canPrev }" role="button" tabindex="0" aria-label="首页" @click="goFirst" @keydown.enter="goFirst" @keydown.space.prevent="goFirst"><text class="btn-text">首页</text></view>
        <view class="btn" :class="{ 'is-disabled': !canPrev }" role="button" tabindex="0" aria-label="上一页" @click="goPrev" @keydown.enter="goPrev" @keydown.space.prevent="goPrev"><text class="btn-text">‹ 上一页</text></view>
        <view class="btn btn-primary" :class="{ 'is-disabled': !canNext }" role="button" tabindex="0" aria-label="下一页" @click="goNext" @keydown.enter="goNext" @keydown.space.prevent="goNext"><text class="btn-text">下一页 ›</text></view>
        <view class="btn btn-ghost" :class="{ 'is-disabled': !canNext }" role="button" tabindex="0" aria-label="末页" @click="goLast" @keydown.enter="goLast" @keydown.space.prevent="goLast"><text class="btn-text">末页</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.pagination {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.progress-track {
  height: 3px;
  background: var(--color-surface-muted);
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.25s ease;
}

.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  flex-wrap: wrap;
}

.page-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.page-text { font-size: 12px; font-weight: 700; color: var(--color-text); }
.row-text { font-size: 11px; color: var(--color-text-muted); }

.actions { display: flex; gap: 6px; flex-wrap: wrap; }

.btn {
  min-width: 56px;
  height: 32px;
  padding: 0 10px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  cursor: pointer;
  user-select: none;
}

.btn-primary { background: var(--color-primary); border-color: var(--color-primary); .btn-text { color: #fff; } }
.btn-ghost { background: var(--color-surface-muted); }
.btn.is-disabled { opacity: 0.45; pointer-events: none; }
.btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }
.btn-text { font-size: 11px; font-weight: 600; color: var(--color-text); white-space: nowrap; }
.btn-primary .btn-text { color: #fff; }

@media (prefers-reduced-motion: reduce) {
  .progress-fill { transition: none; }
}
</style>
