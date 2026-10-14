<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import FontCover from '../../../components/FontCover.vue'
import { fontCatalog } from '../../../fonts/catalog'
import { useFontStore } from '../../../stores/fonts'
import type { FontCoverTone, LearningFont } from '../../../fonts/types'
import type { PersistedCustomFont } from '../../../stores/fonts'

const fontStore = useFontStore()
const { addedFontIds, customFonts } = storeToRefs(fontStore)

const isUploading = ref(false)
const activeTab = ref<'builtin' | 'custom'>('builtin')

const builtinCount = computed(() => fontCatalog.length)
const customCount = computed(() => customFonts.value.length)

function isTtfFile(fileName: string): boolean {
  return /\.ttf$/i.test(fileName.trim())
}

function handleAdd(fontId: string) {
  if (fontStore.isAdded(fontId)) return
  fontStore.addFont(fontId)
  uni.showToast({ title: '字体已添加', icon: 'success' })
}

function handleRemoveCustom(fontId: string) {
  uni.showModal({
    title: '删除确认',
    content: '确定删除该自定义字体吗？',
    success: (result) => {
      if (result.confirm) {
        fontStore.removeCustomFont(fontId)
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    },
    fail: () => {
      fontStore.removeCustomFont(fontId)
      uni.showToast({ title: '已删除', icon: 'success' })
    },
  })
}

function createCustomFontEntry(fileName: string, fontFamily: string): PersistedCustomFont {
  const rawName = fileName.replace(/\.ttf$/i, '').trim() || '自定义字体'
  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const tones: FontCoverTone[] = ['green', 'blue', 'orange', 'rose', 'teal']
  const coverTone = tones[customFonts.value.length % tones.length]!
  return {
    id,
    name: rawName,
    description: '自定义上传的字体资源（已本地保存）',
    sample: rawName.slice(0, 1) || '永',
    fontFamily,
    coverTone,
    dailyCount: 15,
    remainingDays: 30,
    learned: 0,
    total: 350,
    progress: 0,
  }
}

async function handleH5FileUpload(file: File) {
  if (isUploading.value) return
  isUploading.value = true
  uni.showLoading({ title: '处理中...' })
  try {
    // 本地方案：FileReader 转 base64 持久化
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

    const baseName = file.name.replace(/\.ttf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '-') || 'custom-font'
    const fontFamily = `custom-${baseName}-${Date.now()}`
    const entry = createCustomFontEntry(file.name, fontFamily)
    entry.dataUrl = dataUrl
    // 立即注册由 store 完成，此处仅持久化
    fontStore.addCustomFont(entry)
    activeTab.value = 'custom'
    uni.showToast({ title: `已添加 ${entry.name}`, icon: 'success' })
  } catch {
    uni.showToast({ title: '处理失败，请重试', icon: 'none' })
  } finally {
    uni.hideLoading()
    isUploading.value = false
  }
}

function handleUniFileUpload(filePath: string, fileName: string) {
  if (!isTtfFile(fileName)) {
    uni.showToast({ title: '请选择 .ttf 格式的字体文件', icon: 'none' })
    return
  }
  if (isUploading.value) return
  isUploading.value = true
  uni.showLoading({ title: '保存中...' })

  const uniAny = uni as unknown as {
    saveFile?: (options: { tempFilePath: string; success: (res: { savedFilePath: string }) => void; fail: (err: unknown) => void }) => void
    getFileSystemManager?: () => unknown
  }

  const finalizeWithSavedPath = (savedFilePath: string) => {
    const baseName = fileName.replace(/\.ttf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '-') || 'custom-font'
    const fontFamily = `custom-${baseName}-${Date.now()}`
    const entry = createCustomFontEntry(fileName, fontFamily)
    entry.savedFilePath = savedFilePath
    fontStore.addCustomFont(entry)
    activeTab.value = 'custom'
    uni.hideLoading()
    isUploading.value = false
    uni.showToast({ title: `已添加 ${entry.name}`, icon: 'success' })
  }

  const fallbackToDataUrl = () => {
    // H5 环境下 saveFile 不可用，尝试 fetch blob 转 base64
    if (typeof fetch !== 'undefined' && typeof FileReader !== 'undefined') {
      fetch(filePath)
        .then((res) => res.blob())
        .then((blob) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(blob)
        }))
        .then((dataUrl) => {
          const baseName = fileName.replace(/\.ttf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '-') || 'custom-font'
          const fontFamily = `custom-${baseName}-${Date.now()}`
          const entry = createCustomFontEntry(fileName, fontFamily)
          entry.dataUrl = dataUrl
          fontStore.addCustomFont(entry)
          activeTab.value = 'custom'
          uni.hideLoading()
          isUploading.value = false
          uni.showToast({ title: `已添加 ${entry.name}`, icon: 'success' })
        })
        .catch(() => {
          uni.hideLoading()
          isUploading.value = false
          uni.showToast({ title: '保存失败，请重试', icon: 'none' })
        })
    } else {
      uni.hideLoading()
      isUploading.value = false
      uni.showToast({ title: '保存失败，当前环境不支持', icon: 'none' })
    }
  }

  if (typeof uniAny.saveFile === 'function') {
    // 本地方案：复制到持久目录，而非直接使用临时路径
    uniAny.saveFile({
      tempFilePath: filePath,
      success: (res) => finalizeWithSavedPath(res.savedFilePath),
      fail: () => {
        // saveFile 失败时尝试用临时路径兜底（仍可当次使用，但重启可能失效）
        // 若为 H5，尝试 base64 持久化
        if (typeof document !== 'undefined') {
          fallbackToDataUrl()
        } else {
          uni.hideLoading()
          isUploading.value = false
          uni.showToast({ title: '保存失败，请重试', icon: 'none' })
        }
      },
    })
  } else {
    fallbackToDataUrl()
  }
}

function openUniFilePicker() {
  const uniAny = uni as unknown as {
    chooseFile?: (options: Record<string, unknown>) => void
    chooseMessageFile?: (options: Record<string, unknown>) => void
  }

  if (typeof uniAny.chooseFile === 'function') {
    uniAny.chooseFile({
      count: 1,
      extension: ['.ttf'],
      type: 'all',
      success: (result: unknown) => {
        const res = result as { tempFiles?: Array<{ name: string; path?: string; tempFilePath?: string; size?: number }> }
        const file = res.tempFiles?.[0]
        const fileName = file?.name ?? ''
        const filePath = file?.path ?? file?.tempFilePath ?? ''
        if (!fileName || !filePath) {
          uni.showToast({ title: '未选择有效文件', icon: 'none' })
          return
        }
        handleUniFileUpload(filePath, fileName)
      },
      fail: (error: unknown) => {
        const errMsg = (error as { errMsg?: string })?.errMsg ?? ''
        if (errMsg.includes('cancel')) return
        if (typeof uniAny.chooseMessageFile === 'function') {
          openMessageFilePicker()
        } else {
          uni.showToast({ title: '选择文件失败', icon: 'none' })
        }
      },
    })
    return
  }

  if (typeof uniAny.chooseMessageFile === 'function') {
    openMessageFilePicker()
    return
  }

  uni.showToast({ title: '当前环境不支持文件选择', icon: 'none' })
}

function openMessageFilePicker() {
  const uniAny = uni as unknown as { chooseMessageFile?: (options: Record<string, unknown>) => void }
  uniAny.chooseMessageFile?.({
    count: 1,
    extension: ['ttf'],
    type: 'all',
    success: (result: unknown) => {
      const res = result as { tempFiles?: Array<{ name: string; path: string }> }
      const file = res.tempFiles?.[0]
      if (!file?.path || !file?.name) {
        uni.showToast({ title: '未选择有效文件', icon: 'none' })
        return
      }
      handleUniFileUpload(file.path, file.name)
    },
    fail: (error: unknown) => {
      const errMsg = (error as { errMsg?: string })?.errMsg ?? ''
      if (errMsg.includes('cancel')) return
      uni.showToast({ title: '选择文件失败', icon: 'none' })
    },
  })
}

function triggerH5FilePicker() {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ttf'
    input.style.display = 'none'
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        if (input.parentNode) input.parentNode.removeChild(input)
        return
      }
      if (!isTtfFile(file.name)) {
        uni.showToast({ title: '请选择 .ttf 格式的字体文件', icon: 'none' })
        if (input.parentNode) input.parentNode.removeChild(input)
        return
      }
      handleH5FileUpload(file)
      setTimeout(() => {
        if (input.parentNode) input.parentNode.removeChild(input)
      }, 200)
    })
    document.body.appendChild(input)
    input.click()
  } catch {
    openUniFilePicker()
  }
}

function handleAddFontResource() {
  if (isUploading.value) return

  if (typeof document !== 'undefined' && typeof window !== 'undefined' && typeof document.createElement === 'function' && document.body) {
    triggerH5FilePicker()
    return
  }

  openUniFilePicker()
}

function setActiveTab(tab: 'builtin' | 'custom') {
  activeTab.value = tab
}
</script>

<template>
  <main class="catalog-page">
    <view class="catalog-intro">
      <text class="catalog-title">选择练习字体</text>
      <text class="catalog-description">添加后可在“修改字体”中切换，并用于首页展示、学习计划和练习内容。</text>
    </view>

    <view class="font-tabs" role="tablist" aria-label="字体类型">
      <view
        class="font-tab"
        :class="{ 'is-active': activeTab === 'builtin' }"
        role="tab"
        tabindex="0"
        :aria-selected="activeTab === 'builtin'"
        @click="setActiveTab('builtin')"
        @keydown.enter="setActiveTab('builtin')"
        @keydown.space.prevent="setActiveTab('builtin')"
      >
        内置字体
        <text v-if="builtinCount" class="tab-count">{{ builtinCount }}</text>
      </view>
      <view
        class="font-tab"
        :class="{ 'is-active': activeTab === 'custom' }"
        role="tab"
        tabindex="0"
        :aria-selected="activeTab === 'custom'"
        @click="setActiveTab('custom')"
        @keydown.enter="setActiveTab('custom')"
        @keydown.space.prevent="setActiveTab('custom')"
      >
        自定义字体
        <text v-if="customCount" class="tab-count">{{ customCount }}</text>
      </view>
    </view>

    <view v-if="activeTab === 'builtin'" class="catalog-list" aria-label="内置字体">
      <div
        v-for="font in fontCatalog"
        :key="font.id"
        class="catalog-item"
        :class="{ 'is-added': addedFontIds.includes(font.id) }"
        role="button"
        tabindex="0"
        :aria-label="addedFontIds.includes(font.id) ? `${font.name}已添加` : `添加${font.name}`"
        @click="handleAdd(font.id)"
        @keydown.enter="handleAdd(font.id)"
        @keydown.space.prevent="handleAdd(font.id)"
      >
        <FontCover :font="font" />
        <view class="catalog-copy">
          <view class="catalog-heading">
            <text class="font-name">{{ font.name }}</text>
            <text v-if="addedFontIds.includes(font.id)" class="added-label">已添加</text>
            <text v-else class="add-label">添加</text>
          </view>
          <text class="font-description">{{ font.description }}</text>
          <text class="font-total">共 {{ font.total }} 字</text>
        </view>
      </div>
    </view>

    <view v-else class="catalog-list" aria-label="自定义字体">
      <view v-if="customFonts.length === 0" class="empty-state">
        <text class="empty-title">暂无自定义字体</text>
        <text class="empty-hint">点击下方“新增字体资源”上传 .ttf 文件，文件将复制到本地持久保存，刷新后仍可用</text>
      </view>
      <div
        v-else
        v-for="font in customFonts"
        :key="font.id"
        class="catalog-item"
        :class="{ 'is-added': addedFontIds.includes(font.id) }"
        role="button"
        tabindex="0"
        :aria-label="addedFontIds.includes(font.id) ? `${font.name}已添加` : `添加${font.name}`"
        @click="handleAdd(font.id)"
        @keydown.enter="handleAdd(font.id)"
        @keydown.space.prevent="handleAdd(font.id)"
      >
        <FontCover :font="font" />
        <view class="catalog-copy">
          <view class="catalog-heading">
            <text class="font-name">{{ font.name }}</text>
            <view class="heading-actions">
              <text v-if="addedFontIds.includes(font.id)" class="added-label">已添加</text>
              <text v-else class="add-label">添加</text>
              <view
                class="remove-label"
                role="button"
                tabindex="0"
                :aria-label="`删除${font.name}`"
                @click.stop="handleRemoveCustom(font.id)"
                @keydown.enter.stop="handleRemoveCustom(font.id)"
                @keydown.space.stop.prevent="handleRemoveCustom(font.id)"
              >删除</view>
            </view>
          </view>
          <text class="font-description">{{ font.description }}</text>
          <text class="font-total">共 {{ font.total }} 字</text>
        </view>
      </div>
    </view>

    <view class="add-font-footer">
      <view
        class="add-font-button"
        :class="{ 'is-disabled': isUploading }"
        role="button"
        tabindex="0"
        :aria-label="isUploading ? '字体处理中' : '新增字体资源'"
        :aria-busy="isUploading"
        @click="handleAddFontResource"
        @keydown.enter="handleAddFontResource"
        @keydown.space.prevent="handleAddFontResource"
      >
        <text aria-hidden="true">＋</text>
        <text>{{ isUploading ? '处理中...' : '新增字体资源' }}</text>
      </view>
    </view>
  </main>
</template>

<style scoped>
.catalog-page { height: calc(100vh - 58px - var(--app-top-safe-area)); height: calc(100dvh - 58px - var(--app-top-safe-area)); padding-bottom: calc(92px + env(safe-area-inset-bottom)); overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; background: var(--color-page); -webkit-overflow-scrolling: touch; }
.catalog-intro { padding: 22px 18px 16px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.catalog-title { display: block; font-size: 16px; font-weight: 700; }
.catalog-description { display: block; max-width: 430px; margin-top: 7px; color: var(--color-text-secondary); font-size: 10px; line-height: 1.55; }
.font-tabs { display: flex; align-items: stretch; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.font-tab { flex: 1; position: relative; height: 44px; display: flex; align-items: center; justify-content: center; gap: 6px; background: transparent; color: var(--color-text-secondary); font-size: 13px; font-weight: 600; cursor: pointer; }
.font-tab.is-active { color: var(--color-primary); }
.font-tab.is-active::after { content: ''; position: absolute; left: 22%; right: 22%; bottom: 0; height: 3px; border-radius: 3px 3px 0 0; background: var(--color-primary); }
.tab-count { min-width: 18px; height: 18px; padding: 0 5px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; background: var(--color-border); color: var(--color-text-secondary); font-size: 10px; line-height: 1; }
.font-tab.is-active .tab-count { background: var(--color-primary-soft, #eef6ff); color: var(--color-primary); }
.catalog-list { padding: 4px 16px 0; }
.catalog-item { min-height: 112px; display: flex; align-items: center; gap: 18px; border-bottom: 1px solid var(--color-border); cursor: pointer; }
.catalog-item.is-added { opacity: .58; }
.catalog-copy { min-width: 0; flex: 1; }
.catalog-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.heading-actions { display: flex; align-items: center; gap: 8px; flex: none; }
.font-name { font-size: 14px; font-weight: 700; }
.added-label, .add-label, .remove-label { flex: none; font-size: 9px; }
.added-label { color: var(--color-text-muted); }
.add-label { color: var(--color-primary); }
.remove-label { padding: 4px 0 4px 8px; color: var(--color-text-muted); }
.font-description { display: block; margin-top: 7px; color: var(--color-text-secondary); font-size: 10px; line-height: 1.45; }
.font-total { display: block; margin-top: 6px; color: var(--color-text-muted); font-size: 9px; }
.empty-state { padding: 36px 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.empty-title { color: var(--color-text); font-size: 13px; font-weight: 600; }
.empty-hint { color: var(--color-text-secondary); font-size: 10px; line-height: 1.5; }
.add-font-footer { position: fixed; z-index: 3; right: 0; bottom: 0; left: 0; padding: 10px 18px calc(10px + env(safe-area-inset-bottom)); background: var(--color-surface); box-shadow: 0 -5px 18px var(--color-shadow); }
.add-font-button { width: min(calc(100% - 36px), 524px); height: 52px; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 5px; overflow: hidden; border: 1px solid var(--color-primary); border-radius: 8px; background: var(--color-primary); color: var(--color-on-primary); font-size: 13px; font-weight: 600; cursor: pointer; }
.add-font-button.is-disabled { opacity: .6; pointer-events: none; }
@media (max-width: 360px) { .catalog-list { padding-right: 12px; padding-left: 12px; } .catalog-item { gap: 14px; } }
</style>
