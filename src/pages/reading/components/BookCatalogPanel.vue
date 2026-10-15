<script setup lang="ts">
import type { BookMeta } from '../../../reading/types'

interface Props {
  books: BookMeta[]
  activeBookId: string
  totalRows?: number
  loading?: boolean
  closable?: boolean
}

withDefaults(defineProps<Props>(), {
  totalRows: 0,
  loading: false,
  closable: false,
})

const emit = defineEmits<{
  (event: 'select', bookId: string): void
  (event: 'close'): void
}>()

function handleSelect(bookId: string) {
  emit('select', bookId)
}
</script>

<template>
  <view class="catalog-panel">
    <view class="catalog-head">
      <text class="catalog-title">目录</text>
      <view class="catalog-head-actions">
        <text class="catalog-count">{{ books.length }} 本</text>
        <button v-if="closable" class="catalog-close" aria-label="关闭目录" @click="emit('close')">×</button>
      </view>
    </view>

    <view v-if="books.length === 0" class="catalog-empty">
      <text class="empty-text">暂无书籍</text>
      <text class="empty-hint">请将 .txt / .pdf 放入 src/static/books/</text>
    </view>

    <view v-else class="catalog-list" role="list">
      <view
        v-for="book in books"
        :key="book.id"
        class="catalog-item"
        :class="{ 'is-active': book.id === activeBookId }"
        role="listitem"
        tabindex="0"
        :aria-current="book.id === activeBookId ? 'true' : undefined"
        :aria-label="book.name"
        @click.stop="handleSelect(book.id)"
        @keydown.enter="handleSelect(book.id)"
        @keydown.space.prevent="handleSelect(book.id)"
      >
        <view class="item-main">
          <text class="item-name">{{ book.name }}</text>
          <text class="item-file">{{ book.fileName }}</text>
        </view>
        <view class="item-meta">
          <text class="type-badge" :class="'type-' + book.ext">{{ book.ext.toUpperCase() }}</text>
          <text v-if="book.id === activeBookId && !loading" class="row-hint">{{ totalRows }} 行</text>
          <text v-if="book.id === activeBookId && loading" class="row-hint is-loading">加载中…</text>
        </view>
        <view v-if="book.id === activeBookId" class="active-bar" aria-hidden="true" />
      </view>
    </view>

    <view class="catalog-foot">
      <text class="foot-text">支持 .txt / .pdf · 上行学习字体 / 下行对照字体</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.catalog-panel {
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.catalog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.catalog-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.04em;
}

.catalog-count {
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 2px 8px;
  border-radius: 999px;
}

.catalog-head-actions { display: flex; align-items: center; gap: 8px; }
.catalog-close {
  width: 32px;
  height: 32px;
  margin: -6px -6px -6px 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--color-text);
  background: var(--color-surface);
  font-size: 22px;
  line-height: 1;
}
.catalog-close::after { border: 0; }
.catalog-close:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }

.catalog-list {
  display: flex;
  flex-direction: column;
}

.catalog-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s ease;
  user-select: none;
}

.catalog-item:last-child { border-bottom: none; }
.catalog-item:hover { background: var(--color-surface-muted); }
.catalog-item.is-active { background: var(--color-primary-soft); }
.catalog-item:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.catalog-item:active { opacity: 0.9; }

.item-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
.item-name { font-size: 13px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-file { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.type-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; letter-spacing: 0.04em; }
.type-txt { background: #e7edff; color: #1755e9; }
.type-pdf { background: #ffe8e8; color: #c92d32; }
.row-hint { font-size: 11px; color: var(--color-text-muted); }
.row-hint.is-loading { color: var(--color-primary); }
.active-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--color-primary); }
.catalog-empty { padding: 28px 16px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.empty-text { font-size: 13px; color: var(--color-text); font-weight: 600; }
.empty-hint { font-size: 11px; color: var(--color-text-muted); text-align: center; }
.catalog-foot { padding: 8px 12px; border-top: 1px solid var(--color-border); background: var(--color-surface-muted); }
.foot-text { font-size: 10px; color: var(--color-text-muted); }
</style>
