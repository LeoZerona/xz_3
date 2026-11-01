<script setup lang="ts">
import { computed, inject } from 'vue'
import { databaseTaskKey } from '../database/useDatabaseTask'
import { applicationError, applicationReady, prepareApplication } from '../database/application'
import { flushPersistence, persistenceError } from '../database/persistence'
const pageTask = inject(databaseTaskKey, undefined)
const loadError = computed(() => applicationError.value || pageTask?.error.value || '')
const isLoading = computed(() => !applicationReady.value || pageTask?.loading.value)

async function handleRetry() {
  try {
    if (!applicationReady.value) await prepareApplication()
    else if (pageTask?.error.value) await pageTask.retry()
    else await flushPersistence()
  } catch (error) { console.error('重试本地数据操作失败', error) }
}
</script>

<template>
  <view v-if="isLoading || loadError" class="database-overlay" role="status" aria-live="polite">
    <text>{{ loadError ? '本地数据暂时无法读取' : '正在准备本地数据…' }}</text>
    <text v-if="loadError" class="database-error">{{ loadError }}</text>
    <button v-if="loadError" role="button" aria-label="重试" @click="handleRetry">重试</button>
  </view>
  <view v-else-if="persistenceError" class="database-banner" role="alert">
    <text>数据尚未保存，请重试保存后再退出。</text>
    <button role="button" aria-label="重试保存" @click="handleRetry">重试保存</button>
  </view>
</template>

<style scoped>
.database-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 24px; background: var(--color-page, #fff); color: var(--color-text, #222); }
.database-error { max-width: 90%; font-size: 14px; overflow-wrap: anywhere; }
.database-banner { position: fixed; left: 8px; right: 8px; bottom: calc(8px + env(safe-area-inset-bottom)); z-index: 9999; padding: 12px; background: var(--color-surface, #fff); color: var(--color-text, #222); border: 1px solid var(--color-border, #ccc); }
button { margin-top: 8px; padding: 8px 16px; color: var(--color-primary, #333); }
</style>
