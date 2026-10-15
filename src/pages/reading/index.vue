<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onHide } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import AppBottomNavigation from '../../components/AppBottomNavigation.vue'
import { getBooksCatalog } from '../../reading/booksCatalog'
import { loadBook } from '../../reading/bookLoader'
import { clampPage, computeTotalPages, getPageSlice } from '../../reading/pagination'
import { normalizeAutoPageSeconds, readPreferences, readProgress, writePreferences, writeProgress } from '../../reading/readingStorage'
import type { BookMeta, ReadingRow, RowsPerPage, TableStyleId } from '../../reading/types'
import { useFontStore } from '../../stores/fonts'
import AutoPageControl from './components/AutoPageControl.vue'
import BookCatalogPanel from './components/BookCatalogPanel.vue'
import ReadingPagination from './components/ReadingPagination.vue'
import ReadingTable from './components/ReadingTable.vue'
import TableStyleSwitcher from './components/TableStyleSwitcher.vue'

// 状态
const books = ref<BookMeta[]>([])
const activeBookId = ref('')
const rows = ref<ReadingRow[]>([])
const totalChars = ref(0)
const loading = ref(false)
const loadError = ref('')

const prefs = ref(readPreferences())
const tableStyleId = computed<TableStyleId>(() => prefs.value.tableStyleId)
const rowsPerPage = computed<RowsPerPage>(() => prefs.value.rowsPerPage)

const currentPage = ref(1)
const showCatalog = ref(true)
const showStylePanel = ref(false)
const isMobileViewport = ref(false)
const isAutoReading = ref(false)
const autoProgress = ref(0)
let autoPageTimer: ReturnType<typeof setInterval> | null = null
let autoPageStartedAt = 0

// 字体
const fontStore = useFontStore()
const { currentFont, referenceFont } = storeToRefs(fontStore)

const activeBook = computed<BookMeta | undefined>(() => books.value.find((b) => b.id === activeBookId.value))

const totalPages = computed(() => computeTotalPages(rows.value.length, rowsPerPage.value))
const pageRows = computed(() => getPageSlice(rows.value, currentPage.value, rowsPerPage.value))
const rangeLabel = computed(() => {
  if (rows.value.length === 0) return '0 行'
  const start = (currentPage.value - 1) * rowsPerPage.value + 1
  const end = Math.min(currentPage.value * rowsPerPage.value, rows.value.length)
  return '第 ' + String(start) + '-' + String(end) + ' 行 / 共 ' + String(rows.value.length) + ' 行 · ' + String(totalChars.value) + ' 字'
})

const autoPageSeconds = computed(() => prefs.value.autoPageSeconds)

// 触摸翻页
const touchStartX = ref(0)
const touchStartY = ref(0)
function handleTouchStart(e: TouchEvent) {
  const t = e.touches[0]
  if (!t) return
  touchStartX.value = t.clientX
  touchStartY.value = t.clientY
}
function handleTouchEnd(e: TouchEvent) {
  const t = e.changedTouches[0]
  if (!t) return
  const dx = t.clientX - touchStartX.value
  const dy = Math.abs(t.clientY - touchStartY.value)
  if (dy > 60) return
  if (Math.abs(dx) < 50) return
  if (dx < 0) handleNextPage()
  else handlePrevPage()
}

function persistProgress() {
  if (!activeBookId.value) return
  writeProgress({
    bookId: activeBookId.value,
    page: currentPage.value,
    rowsPerPage: rowsPerPage.value,
    tableStyleId: tableStyleId.value,
    updatedAt: new Date().toISOString(),
  })
  writePreferences(prefs.value)
}

function resetAutoCountdown() {
  autoPageStartedAt = Date.now()
  autoProgress.value = 0
}

function stopAutoReading() {
  if (autoPageTimer) {
    clearInterval(autoPageTimer)
    autoPageTimer = null
  }
  isAutoReading.value = false
  autoProgress.value = 0
}

function tickAutoPage() {
  const durationMs = autoPageSeconds.value * 1000
  autoProgress.value = Math.min(1, (Date.now() - autoPageStartedAt) / durationMs)
  if (autoProgress.value < 1) return
  if (currentPage.value >= totalPages.value) {
    stopAutoReading()
    uni.showToast({ title: '已读到最后一页', icon: 'none' })
    return
  }
  currentPage.value += 1
  persistProgress()
  resetAutoCountdown()
}

function startAutoReading() {
  if (loading.value || loadError.value || rows.value.length === 0) return
  if (currentPage.value >= totalPages.value && totalPages.value > 1) currentPage.value = 1
  isAutoReading.value = true
  resetAutoCountdown()
  autoPageTimer = setInterval(tickAutoPage, 100)
}

function handleToggleAutoReading() {
  if (isAutoReading.value) stopAutoReading()
  else startAutoReading()
}

function handleAutoPageSecondsChange(value: number) {
  prefs.value = { ...prefs.value, autoPageSeconds: normalizeAutoPageSeconds(value) }
  writePreferences(prefs.value)
  if (isAutoReading.value) resetAutoCountdown()
}

function handleViewportChange() {
  if (typeof window === 'undefined') return
  const wasMobile = isMobileViewport.value
  isMobileViewport.value = window.innerWidth < 900
  if (wasMobile !== isMobileViewport.value) showCatalog.value = !isMobileViewport.value
}

function handleToggleCatalog() {
  showCatalog.value = !showCatalog.value
}

function handleCloseCatalog() {
  showCatalog.value = false
}

function handleSelectBook(bookId: string) {
  if (bookId === activeBookId.value) {
    showCatalog.value = false
    return
  }
  activeBookId.value = bookId
  currentPage.value = 1
  showCatalog.value = false
  stopAutoReading()
  void fetchBook()
}

function handleStyleChange(id: TableStyleId) {
  prefs.value = { ...prefs.value, tableStyleId: id }
  persistProgress()
}

function handleRowsPerPageChange(value: RowsPerPage) {
  // 保持当前阅读位置近似不变
  const firstRowIndex = (currentPage.value - 1) * rowsPerPage.value
  prefs.value = { ...prefs.value, rowsPerPage: value }
  currentPage.value = Math.floor(firstRowIndex / value) + 1
  persistProgress()
  if (isAutoReading.value) resetAutoCountdown()
}

function handlePageChange(page: number) {
  currentPage.value = clampPage(page, totalPages.value)
  persistProgress()
  if (isAutoReading.value) resetAutoCountdown()
}

function handlePrevPage() {
  if (currentPage.value > 1) {
    currentPage.value -= 1
    persistProgress()
    if (isAutoReading.value) resetAutoCountdown()
  }
}

function handleNextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value += 1
    persistProgress()
    if (isAutoReading.value) resetAutoCountdown()
  }
}

function handleCopyRow(row: ReadingRow) {
  const text = row.text
  // 优先使用 uni 剪贴板，H5 降级到 navigator.clipboard
  try {
    // #ifdef H5
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text)
        .then(() => uni.showToast({ title: '已复制第 ' + String(row.index) + ' 行', icon: 'none' }))
        .catch(() => uni.showToast({ title: '复制失败', icon: 'none' }))
      return
    }
    // #endif
    uni.setClipboardData({
      data: text,
      success: () => uni.showToast({ title: '已复制第 ' + String(row.index) + ' 行', icon: 'none' }),
    })
  } catch {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
}

function handleSwapFonts() {
  fontStore.swapFonts()
  uni.showToast({ title: '已交换学习/对照字体', icon: 'none' })
}

async function fetchBook() {
  const book = activeBook.value
  if (!book) return
  loading.value = true
  loadError.value = ''
  try {
    const result = await loadBook(book)
    rows.value = result.rows
    totalChars.value = result.totalChars
    // 恢复进度或校正页码
    const saved = readProgress()
    if (saved && saved.bookId === book.id) {
      // 若每页行数变化，以保存的为准（已在 prefs 初始化时读取）
      currentPage.value = Math.min(saved.page, totalPages.value || 1)
    } else {
      currentPage.value = 1
    }
    if (rows.value.length === 0) loadError.value = '该书籍未解析到可显示的文本行'
  } catch (err) {
    rows.value = []
    totalChars.value = 0
    loadError.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
    persistProgress()
  }
}

function handleUnavailable(label: string) {
  uni.showToast({ title: label + '功能开发中', icon: 'none' })
}

onMounted(() => {
  books.value = getBooksCatalog()
  const saved = readProgress()
  const prefsStored = readPreferences()
  prefs.value = prefsStored
  if (books.value.length === 0) {
    loadError.value = '未在 src/static/books/ 发现书籍'
    return
  }
  if (saved && books.value.some((b) => b.id === saved.bookId)) {
    activeBookId.value = saved.bookId
    currentPage.value = saved.page
  } else {
    activeBookId.value = books.value[0]!.id
    currentPage.value = 1
  }
  handleViewportChange()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleViewportChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
  void fetchBook()
})

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') stopAutoReading()
}

onHide(stopAutoReading)

onBeforeUnmount(() => {
  stopAutoReading()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleViewportChange)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
})

watch(totalPages, (next) => {
  if (currentPage.value > next) currentPage.value = next
})

// 键盘翻页
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    handlePrevPage()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    handleNextPage()
  }
}
</script>

<template>
  <view class="reading-page" @keydown="handleKeydown" tabindex="0">
    <!-- 顶部栏 -->
    <view class="reading-topbar">
      <view class="topbar-left">
        <text class="topbar-title">对照阅读</text>
        <text class="topbar-sub">{{ activeBook?.name ?? '未选择书籍' }}</text>
      </view>
      <view class="topbar-actions">
        <view
          class="topbar-btn"
          role="button"
          tabindex="0"
          aria-label="目录"
          :aria-expanded="showCatalog"
          @click="handleToggleCatalog"
          @keydown.enter="handleToggleCatalog"
          @keydown.space.prevent="handleToggleCatalog"
        >
          <text class="btn-label">{{ showCatalog ? '收起目录' : '目录' }}</text>
        </view>
        <view
          class="topbar-btn topbar-btn--ghost"
          role="button"
          tabindex="0"
          aria-label="交换字体"
          @click="handleSwapFonts"
          @keydown.enter="handleSwapFonts"
          @keydown.space.prevent="handleSwapFonts"
        >
          <text class="btn-label">交换字体</text>
        </view>
        <view
          class="topbar-btn topbar-btn--primary"
          role="button"
          tabindex="0"
          aria-label="表格样式"
          @click="showStylePanel = !showStylePanel"
          @keydown.enter="showStylePanel = !showStylePanel"
          @keydown.space.prevent="showStylePanel = !showStylePanel"
        >
          <text class="btn-label">{{ showStylePanel ? '收起样式' : '表格样式' }}</text>
        </view>
      </view>
    </view>

    <view class="reading-body" :class="{ 'is-catalog-hidden': !showCatalog }">
      <!-- 目录侧栏 -->
      <view v-if="showCatalog" class="catalog-column" @click.self="handleCloseCatalog">
        <view class="catalog-sheet">
          <BookCatalogPanel
            :books="books"
            :active-book-id="activeBookId"
            :total-rows="rows.length"
            :loading="loading"
            :closable="isMobileViewport"
            @select="handleSelectBook"
            @close="handleCloseCatalog"
          />
        </view>
      </view>

      <!-- 主阅读区 -->
      <view class="main-column" @touchstart.passive="handleTouchStart" @touchend.passive="handleTouchEnd">
        <!-- 书籍信息条 -->
        <view class="book-meta-bar">
          <view class="meta-left">
            <text class="meta-name">{{ activeBook?.name ?? '—' }}</text>
            <text class="meta-file">{{ activeBook?.fileName ?? '' }}</text>
          </view>
          <view class="meta-right">
            <text class="meta-range">{{ rangeLabel }}</text>
            <text class="meta-fonts">学习：{{ currentFont.name }} / 对照：{{ referenceFont.name }}</text>
          </view>
        </view>

        <!-- 样式切换面板 -->
        <view v-if="showStylePanel" class="style-panel-wrap">
          <TableStyleSwitcher
            :model-value="tableStyleId"
            :rows-per-page="rowsPerPage"
            @update:modelValue="handleStyleChange"
            @update:rowsPerPage="handleRowsPerPageChange"
          />
        </view>

        <AutoPageControl
          :seconds="autoPageSeconds"
          :progress="autoProgress"
          :is-running="isAutoReading"
          :disabled="loading || Boolean(loadError) || rows.length === 0"
          @update:seconds="handleAutoPageSecondsChange"
          @toggle="handleToggleAutoReading"
        />

        <!-- 加载 / 错误 -->
        <view v-if="loading" class="state-card">
          <text class="state-title">正在加载书籍…</text>
          <text class="state-desc">正在解析文本，请稍候</text>
        </view>

        <view v-else-if="loadError" class="state-card state-card--error">
          <text class="state-title">加载失败</text>
          <text class="state-desc">{{ loadError }}</text>
          <view class="retry-btn" role="button" tabindex="0" @click="fetchBook" @keydown.enter="fetchBook" @keydown.space.prevent="fetchBook"><text class="retry-text">重试</text></view>
          <text v-if="activeBook?.ext === 'pdf'" class="state-hint">PDF 需要 pdfjs-dist 支持，或转为 TXT 后放入 books 目录</text>
        </view>

        <!-- 表格 -->
        <ReadingTable
          v-else
          :rows="pageRows"
          :table-style-id="tableStyleId"
          :learning-font-family="currentFont.fontFamily"
          :reference-font-family="referenceFont.fontFamily"
          :page="currentPage"
          :total-pages="totalPages"
          :auto-progress="autoProgress"
          :is-auto-reading="isAutoReading"
          @copy-row="handleCopyRow"
        />

        <!-- 分页 -->
        <ReadingPagination
          v-if="!loading && !loadError"
          :page="currentPage"
          :total-pages="totalPages"
          :total-rows="rows.length"
          :rows-per-page="rowsPerPage"
          @update:page="handlePageChange"
        />

        <!-- 底部说明 -->
        <view class="reading-foot">
          <text class="foot-text">左右滑动或键盘 ← → 翻页 · 点击行复制 · 自动翻页进度会在文字背景中向下移动</text>
        </view>
      </view>
    </view>

    <AppBottomNavigation active-tab="reading" @unavailable="handleUnavailable" />
  </view>
</template>

<style scoped lang="scss">
.reading-page {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-page);
  outline: none;
  overscroll-behavior: none;
}

.reading-topbar {
  flex: none;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: calc(var(--app-top-safe-area) + 8px) 16px 10px;
  background: var(--color-topbar);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(8px);
}

.topbar-left { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.topbar-title { font-size: 15px; font-weight: 800; color: var(--color-text); letter-spacing: 0.04em; }
.topbar-sub { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.topbar-actions { display: flex; gap: 8px; flex-shrink: 0; }

.topbar-btn {
  height: 30px;
  padding: 0 12px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  cursor: pointer;
}

.topbar-btn--ghost { background: var(--color-surface-muted); }
.topbar-btn--primary { background: var(--color-primary); border-color: var(--color-primary); .btn-label { color: #fff; } }
.topbar-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }
.btn-label { font-size: 11px; font-weight: 700; color: var(--color-text); white-space: nowrap; }

.reading-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.reading-body.is-catalog-hidden { grid-template-columns: minmax(0, 1fr); }

.catalog-column { min-width: 0; }
.catalog-sheet { width: 100%; }
.main-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.book-meta-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.meta-left { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.meta-name { font-size: 13px; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta-file { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; text-align: right; }
.meta-range { font-size: 11px; color: var(--color-text); font-weight: 600; }
.meta-fonts { font-size: 10px; color: var(--color-text-muted); }

.style-panel-wrap { animation: fadeIn 0.2s ease; }

.state-card {
  padding: 36px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.state-card--error { border-color: #f0c0c0; background: #fffafb; }
.state-title { font-size: 14px; font-weight: 700; color: var(--color-text); }
.state-desc { font-size: 12px; color: var(--color-text-muted); text-align: center; }
.state-hint { font-size: 11px; color: #c45; text-align: center; margin-top: 4px; }

.retry-btn {
  margin-top: 8px;
  height: 32px;
  padding: 0 16px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-primary);
  border-radius: 999px;
  cursor: pointer;
}
.retry-text { font-size: 12px; font-weight: 700; color: #fff; }

.reading-foot {
  padding: 8px 4px 16px;
  text-align: center;
}

.foot-text { font-size: 10px; color: var(--color-text-muted); }

@media (max-width: 900px) {
  .reading-body { display: block; padding: 12px; }
  .catalog-column {
    position: fixed;
    z-index: 30;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: calc(var(--app-top-safe-area) + 52px) 12px calc(82px + env(safe-area-inset-bottom));
    background: rgb(32 36 45 / 42%);
  }
  .catalog-sheet {
    max-width: 520px;
    max-height: 100%;
    overflow-y: auto;
    border-radius: 12px;
    box-shadow: 0 14px 40px rgb(32 36 45 / 22%);
  }
}

@media (max-width: 560px) {
  .reading-topbar { gap: 6px; padding-right: 10px; padding-left: 12px; }
  .topbar-left { max-width: 92px; }
  .topbar-actions { gap: 4px; }
  .topbar-btn { height: 34px; padding: 0 8px; }
  .btn-label { font-size: 10px; }
  .meta-file, .meta-fonts { display: none; }
  .book-meta-bar { align-items: center; }
}

@media (max-width: 360px) {
  .topbar-sub { display: none; }
  .topbar-left { max-width: 60px; }
  .topbar-btn { padding: 0 6px; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .style-panel-wrap { animation: none; }
}
</style>
