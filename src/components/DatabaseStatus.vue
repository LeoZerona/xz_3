<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { databaseTaskKey } from '../database/useDatabaseTask'
import { applicationError, applicationReady, prepareApplication } from '../database/application'
import { flushPersistence, persistenceError } from '../database/persistence'
const pageTask = inject(databaseTaskKey, undefined)
const loadError = computed(() => applicationError.value || pageTask?.error.value || '')
const isLoading = computed(() => !applicationReady.value || pageTask?.loading.value)
const isRetrying = ref(false)

async function handleRetry() {
  if (isRetrying.value) return
  isRetrying.value = true
  try {
    if (!applicationReady.value) await prepareApplication()
    else if (pageTask?.error.value) await pageTask.retry()
    else await flushPersistence()
  } catch (error) { console.error('重试本地数据操作失败', error) }
  finally { isRetrying.value = false }
}
</script>

<template>
  <view class="app-safe-mask" aria-hidden="true" />
  <view v-if="isLoading || loadError" class="database-overlay" role="status" aria-live="polite">
    <text>{{ loadError ? '本地数据暂时无法读取' : '正在准备本地数据…' }}</text>
    <text v-if="loadError" class="database-error">{{ loadError }}</text>
    <button v-if="loadError" role="button" aria-label="重试" :disabled="isRetrying" @click="handleRetry">{{ isRetrying ? '重试中…' : '重试' }}</button>
  </view>
  <view v-else-if="persistenceError" class="database-banner" role="alert">
    <text>数据尚未保存，请重试保存后再退出。</text>
    <text class="database-error">{{ persistenceError }}</text>
    <button role="button" aria-label="重试保存" :disabled="isRetrying" @click="handleRetry">{{ isRetrying ? '正在保存…' : '重试保存' }}</button>
  </view>
</template>

<style scoped>
.database-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 24px; background: var(--color-page, #fff); color: var(--color-text, #222); }
.database-error { display: block; max-width: 100%; margin-top: 6px; color: var(--color-text-secondary); font-size: 12px; overflow-wrap: anywhere; }
.database-banner { position: fixed; left: 8px; right: 8px; bottom: calc(8px + env(safe-area-inset-bottom)); z-index: 9999; padding: 12px; background: var(--color-surface, #fff); color: var(--color-text, #222); border: 1px solid var(--color-border, #ccc); }
button { min-height: 44px; margin-top: 8px; padding: 8px 16px; border-radius: var(--control-radius); color: var(--color-primary, #333); }
</style>
