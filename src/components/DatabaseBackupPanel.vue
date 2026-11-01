<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { exportBackup, restoreBackup } from '../database/backup'
import { readNativeBackup, writeNativeBackup } from '../database/backupFiles'
import { applicationReady, refreshApplication } from '../database/application'
import { readStored, saveStored } from '../database/persistence'

const isBusy = ref(false)
const message = ref('')
const restorePath = ref(String(readStored('font-learning:last-backup') ?? ''))
watch(applicationReady, (ready) => { if (ready) restorePath.value = String(readStored('font-learning:last-backup') ?? '') })
let picker: HTMLInputElement | undefined
const downloads = new Set<string>()
const timers = new Set<ReturnType<typeof setTimeout>>()
function showError(error: unknown) { message.value = error instanceof Error ? error.message : String(error); console.error('备份操作失败', error) }
async function handleExport() {
  isBusy.value = true
  try {
    const text = await exportBackup()
    if (typeof plus !== 'undefined') {
      restorePath.value = await writeNativeBackup(text)
      saveStored('font-learning:last-backup', restorePath.value)
      message.value = '备份已保存到下方路径；请另行保留副本，以便换机或卸载后恢复。'
    } else {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
      downloads.add(url)
      const link = document.createElement('a')
      link.href = url; link.download = `font-learning-backup-${Date.now()}.json`
      document.body.appendChild(link); link.click(); link.remove()
      const timer = setTimeout(() => { URL.revokeObjectURL(url); downloads.delete(url); timers.delete(timer) }, 1000)
      timers.add(timer)
      message.value = '备份已导出。'
    }
  } catch (error) { showError(error) }
  finally { isBusy.value = false }
}
async function confirmRestore(text: string) {
  const confirmed = await new Promise<boolean>((resolve) => uni.showModal({ title: '恢复数据备份', content: '将用此备份替换现有学习记录、阅读进度、上传书籍和设置。恢复前的数据会在数据库内保留一份快照。', confirmText: '恢复', cancelText: '取消', success: (result) => resolve(result.confirm), fail: () => resolve(false) }))
  if (!confirmed) return
  await restoreBackup(text)
  await refreshApplication()
  // 清空仍缓存旧书籍正文和排版的页面，恢复后重新从数据库进入业务流程。
  await new Promise<void>((resolve, reject) => uni.reLaunch({ url: '/pages/settings/index', success: () => resolve(), fail: reject }))
  uni.showToast({ title: '备份已恢复', icon: 'success' })
}
async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  isBusy.value = true
  try { await confirmRestore(await file.text()) } catch (error) { showError(error) }
  finally { isBusy.value = false; input.value = '' }
}
async function handleRestore() {
  if (typeof plus !== 'undefined') {
    if (!restorePath.value.trim()) { message.value = '请填写备份文件路径。'; return }
    isBusy.value = true
    try { await confirmRestore(await readNativeBackup(restorePath.value.trim())) } catch (error) { showError(error) }
    finally { isBusy.value = false }
  } else {
    if (!picker) {
      picker = document.createElement('input'); picker.type = 'file'; picker.accept = '.json,application/json'; picker.style.display = 'none'
      picker.addEventListener('change', handleFileChange); document.body.appendChild(picker)
    }
    picker.click()
  }
}
onBeforeUnmount(() => {
  picker?.removeEventListener('change', handleFileChange); picker?.remove()
  for (const timer of timers) clearTimeout(timer)
  for (const url of downloads) URL.revokeObjectURL(url)
})
</script>

<template>
  <view class="backup-panel">
    <text class="backup-title">数据备份</text>
    <view class="backup-actions">
      <button role="button" aria-label="导出数据备份" :disabled="isBusy" @click="handleExport">导出数据备份</button>
      <button role="button" aria-label="恢复数据备份" :disabled="isBusy" @click="handleRestore">恢复数据备份</button>
    </view>
    <text class="backup-message">备份包含学习记录、阅读位置、设置和上传书籍正文；字体文件请另行保留。</text>
    <!-- #ifdef APP-PLUS -->
    <label for="backup-file-path">备份文件路径</label>
    <input id="backup-file-path" v-model="restorePath" class="backup-path" aria-label="备份文件路径" />
    <!-- #endif -->
    <text v-if="message" class="backup-message" role="status">{{ message }}</text>
  </view>
</template>

<style scoped>
.backup-panel { padding: 16px; color: var(--color-text); }
.backup-title { font-weight: 600; }
.backup-actions { display: flex; gap: 12px; margin: 12px 0; }
button { flex: 1; padding: 10px 8px; font-size: 14px; color: var(--color-primary); background: var(--color-primary-soft); border-radius: 8px; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.backup-path { margin: 8px 0; padding: 8px; border: 1px solid var(--color-border); font-size: 12px; }
.backup-message { display: block; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
</style>
