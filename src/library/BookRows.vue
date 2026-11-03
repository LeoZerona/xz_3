<script setup lang="ts">
import type { BookSummary } from './types'
defineProps<{books:BookSummary[]}>()
const emit=defineEmits<{(event:'item-click',id:string):void}>()
const labels={unread:'未读',reading:'在读',finished:'已读完'}
</script>
<template><button v-for="book in books" :key="book.id" role="button" class="feature-row" @click="emit('item-click',book.id)"><span class="book-file" aria-hidden="true">{{ book.ext.toUpperCase() }}</span><span class="feature-row-copy"><strong>{{ book.name }}</strong><p class="feature-muted">{{ book.source==='custom'?'我的导入':'内置资料' }} · {{ labels[book.status] }} · {{ book.annotationCount }} 条书签笔记</p><p v-if="book.progress" class="feature-muted">上次阅读：{{ new Date(book.progress.updatedAt).toLocaleString() }}</p></span><span aria-hidden="true">→</span></button></template>
<style scoped>.book-file { display:grid;place-items:center;width:44px;min-height:54px;flex:none;border:1px solid var(--color-border);border-radius:4px;color:var(--color-primary);font-size:11px; }</style>
