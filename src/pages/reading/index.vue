<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBackPress, onHide } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import AppBottomNavigation from '../../components/AppBottomNavigation.vue'
import { getBooksCatalog } from '../../reading/booksCatalog'
import { addCustomBook, createCustomRecord, readCustomBooks, removeCustomBook } from '../../reading/customBooks'
import type { CustomBookRecord } from '../../reading/customBooks'
import { decodeTextBuffer, extractPdfRawText, loadBook, loadPdfFromBuffer, parseTextToRows } from '../../reading/bookLoader'
import { calculateFittingRows, clampPage } from '../../reading/pagination'
import { normalizeAutoPageSeconds, normalizeCharsPerLine, normalizeReadingFontSize, readPreferences, readProgress, writePreferences, writeProgress } from '../../reading/readingStorage'
import type { BookMeta, ReadingRow, TableStyleId } from '../../reading/types'
import { useFontStore } from '../../stores/fonts'
import { useThemeStore } from '../../stores/theme'
import AutoPageControl from './components/AutoPageControl.vue'
import AutoReadingProgress from './components/AutoReadingProgress.vue'
import BookCatalogPanel from './components/BookCatalogPanel.vue'
import ReadingTable from './components/ReadingTable.vue'
import ReadingSettingsPanel from './components/ReadingSettingsPanel.vue'
import TableStyleSwitcher from './components/TableStyleSwitcher.vue'
import FontSizeControl from './components/FontSizeControl.vue'
import PdfTextBridge from './components/PdfTextBridge.vue'
import type { PdfTextBridgeApi } from '../../reading/pdfTextBridge'

const pdfTextBridgeRef = ref<PdfTextBridgeApi | null>(null)
function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  if (!pdfTextBridgeRef.value) return Promise.reject(new Error('PDF 文字提取器尚未就绪，请重试'))
  return pdfTextBridgeRef.value.extract(buffer)
}

// 状态
const builtinBooks = ref<BookMeta[]>([])
const customBooks = ref<CustomBookRecord[]>([])
const books = computed<BookMeta[]>(() => [...builtinBooks.value, ...customBooks.value])
const builtinCount = computed(() => builtinBooks.value.length)
const customCount = computed(() => customBooks.value.length)
type LibraryTab = 'builtin' | 'custom'
const libraryTab = ref<LibraryTab>('builtin')
const searchQuery = ref('')
// 最近阅读（检索上方可点击入口）
const recentProgressVersion = ref(0)
const recentProgress = computed<import("../../reading/types").ReadingProgress | null>(() => {
  void recentProgressVersion.value
  void books.value.length
  return readProgress()
})
const recentBook = computed<BookMeta | undefined>(() => {
  const prog = recentProgress.value
  if (!prog) return undefined
  return books.value.find((b) => b.id === prog.bookId)
})
const recentBookDisplayName = computed(() => recentBook.value?.name ?? '暂无最近阅读')
const recentProgressLabel = computed(() => {
  const prog = recentProgress.value
  const book = recentBook.value
  if (!prog || !book) return '暂无阅读记录 · 选择一本书开始阅读'
  const total = (() => {
    try {
      const r = readProgress()
      if (r && r.bookId === book.id) return "已读 " + String(r.page) + " 页"
      return getBookProgressLabel(book)
    } catch { return getBookProgressLabel(book) }
  })()
  return total + " · " + book.fileName
})
function refreshRecentProgress(): void {
  recentProgressVersion.value++
}
function handleContinueRecent(): void {
  const book = recentBook.value
  const prog = recentProgress.value
  if (book && prog) {
    handleEnterReader(book.id)
    return
  }
  if (books.value.length > 0) {
    uni.showToast({ title: '暂无最近阅读记录', icon: 'none' })
  }
}
const filteredBuiltinBooks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return builtinBooks.value
  return builtinBooks.value.filter((b) => b.name.toLowerCase().includes(q) || b.fileName.toLowerCase().includes(q))
})
const filteredCustomBooks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return customBooks.value
  return customBooks.value.filter((b) => b.name.toLowerCase().includes(q) || b.fileName.toLowerCase().includes(q))
})
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const activeBookId = ref('')
const rows = ref<ReadingRow[]>([])
const totalChars = ref(0)
const loading = ref(false)
const loadError = ref('')
const rawTextRef = ref('')
let lastPdfBufferRef: ArrayBuffer | null = null

const prefs = ref(readPreferences())
const tableStyleId = computed<TableStyleId>(() => prefs.value.tableStyleId)
const charsPerLine = computed(() => prefs.value.charsPerLine)
const readingFontSize = computed(() => prefs.value.readingFontSize)

const currentPage = ref(1)
type ViewMode = 'library' | 'reader'
const viewMode = ref<ViewMode>('library')
const showReaderChrome = ref(false)
const showReaderCatalog = ref(false)
const showReaderSettings = ref(false)
const showCatalog = ref(true)
const showStylePanel = ref(false)
const isMobileViewport = ref(false)
type AutoReadingState = 'idle' | 'running' | 'paused'
const autoReadingState = ref<AutoReadingState>('idle')
const isAutoReading = computed(() => autoReadingState.value === 'running')
const isAutoReadingPaused = computed(() => autoReadingState.value === 'paused')
const isAutoReadingActive = computed(() => autoReadingState.value !== 'idle')
const autoProgress = ref(0)
const autoAnimationProgress = ref(0)
const autoAnimationSequence = ref(0)
const effectiveRowsPerPage = ref<number>(prefs.value.rowsPerPage)
const isPaginationReady = ref(false)
type PageTurnDirection = 'next' | 'previous' | 'none'
const pageTurnDirection = ref<PageTurnDirection>('none')
const pageTurnSequence = ref(0)
let autoPageTimer: ReturnType<typeof setTimeout> | null = null
let paginationRemeasureTimer: ReturnType<typeof setTimeout> | null = null
let isRecalculating = false
let pendingRecalc = false
let autoPageStartedAt = 0
let currentAutoProgress = 0
const AUTO_UI_UPDATE_INTERVAL = 200

interface LayoutRect {
  top: number
  bottom: number
  height: number
}

// 字体
const fontStore = useFontStore()
const { currentFont, referenceFont } = storeToRefs(fontStore)
const themeStore = useThemeStore()
const { currentThemeId, themeStyle } = storeToRefs(themeStore)
const daytimeThemeId = ref(currentThemeId.value === 'ink-night' ? 'ocean-blue' : currentThemeId.value)
const referenceToggleLabel = computed(() => prefs.value.hideReferenceText ? '显示对照文字' : '隐藏对照文字')

const activeBook = computed<BookMeta | undefined>(() => books.value.find((b) => b.id === activeBookId.value))

const totalPages = computed(() => {
  const per = Math.max(1, effectiveRowsPerPage.value)
  if (rows.value.length === 0) return 1
  return Math.max(1, Math.ceil(rows.value.length / per))
})
const pageRows = computed(() => {
  const per = Math.max(1, effectiveRowsPerPage.value)
  const safePage = clampPage(currentPage.value, totalPages.value)
  const start = (safePage - 1) * per
  return rows.value.slice(start, start + per)
})
const rangeLabel = computed(() => {
  if (rows.value.length === 0) return '0 行'
  const per = Math.max(1, effectiveRowsPerPage.value)
  const start = (currentPage.value - 1) * per + 1
  const end = Math.min(currentPage.value * per, rows.value.length)
  return '第 ' + String(start) + '-' + String(end) + ' 行 / 共 ' + String(rows.value.length) + ' 行 · ' + String(totalChars.value) + ' 字'
})

const autoPageSeconds = computed(() => prefs.value.autoPageSeconds)
const canPrevPage = computed(() => currentPage.value > 1)
const canNextPage = computed(() => currentPage.value < totalPages.value)
const progressPercent = computed(() => totalPages.value <= 1 ? 100 : Math.round((currentPage.value / totalPages.value) * 100))
const pageTurnClass = computed(() => ({
  'is-turning-next': pageTurnDirection.value === 'next',
  'is-turning-previous': pageTurnDirection.value === 'previous',
}))

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
    rowsPerPage: prefs.value.rowsPerPage,
    tableStyleId: tableStyleId.value,
    updatedAt: new Date().toISOString(),
  })
  writePreferences(prefs.value)
  refreshRecentProgress() // sync recent
}

function resetAutoCountdown() {
  autoPageStartedAt = getAnimationTime()
  currentAutoProgress = 0
  autoProgress.value = 0
  syncAutoAnimation()
}

function syncAutoAnimation() {
  autoAnimationProgress.value = currentAutoProgress
  autoAnimationSequence.value += 1
}

function getAnimationTime() {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

function scheduleAutoPageTick() {
  if (!isAutoReading.value || autoPageTimer !== null) return
  const remaining = autoPageSeconds.value * 1000 - (getAnimationTime() - autoPageStartedAt)
  autoPageTimer = setTimeout(tickAutoPage, Math.max(0, Math.min(AUTO_UI_UPDATE_INTERVAL, remaining)))
}

function cancelAutoPageTick() {
  if (autoPageTimer === null) return
  clearTimeout(autoPageTimer)
  autoPageTimer = null
}

function scheduleRecalcVisibleRows() {
  if (viewMode.value !== 'reader' || loading.value || loadError.value || rows.value.length === 0) return
  isPaginationReady.value = false
  if (paginationRemeasureTimer) clearTimeout(paginationRemeasureTimer)
  paginationRemeasureTimer = setTimeout(() => {
    paginationRemeasureTimer = null
    void recalcVisibleRows()
  }, 32)
}

function toLayoutRect(value: unknown): LayoutRect | null {
  if (!value || typeof value !== 'object') return null
  const rect = value as Record<string, unknown>
  const top = Number(rect.top)
  const height = Number(rect.height)
  const bottomValue = Number(rect.bottom)
  if (!Number.isFinite(top) || !Number.isFinite(height) || height <= 0) return null
  return {
    top,
    height,
    bottom: Number.isFinite(bottomValue) ? bottomValue : top + height,
  }
}

function measureReadingPage(): Promise<{ stage: LayoutRect | null; table: LayoutRect | null; rowRects: LayoutRect[] }> {
  if (typeof document !== 'undefined') {
    const stageElement = document.querySelector<HTMLElement>('#reading-page-stage')
    const tableElement = document.querySelector<HTMLElement>('#reading-page-stage .reading-table-wrap')
    const rowElements = Array.from(document.querySelectorAll<HTMLElement>('#reading-page-stage .reading-row'))
    return Promise.resolve({
      stage: toLayoutRect(stageElement?.getBoundingClientRect()),
      table: toLayoutRect(tableElement?.getBoundingClientRect()),
      rowRects: rowElements.map((element) => toLayoutRect(element.getBoundingClientRect())).filter((rect): rect is LayoutRect => rect !== null),
    })
  }

  return new Promise((resolve) => {
    let isSettled = false
    const finish = (value: { stage: LayoutRect | null; table: LayoutRect | null; rowRects: LayoutRect[] }) => {
      if (isSettled) return
      isSettled = true
      clearTimeout(fallbackTimer)
      resolve(value)
    }
    const fallbackTimer = setTimeout(() => finish({ stage: null, table: null, rowRects: [] }), 300)
    const query = uni.createSelectorQuery()
    query.select('#reading-page-stage').boundingClientRect()
    query.select('#reading-page-stage .reading-table-wrap').boundingClientRect()
    query.selectAll('#reading-page-stage .reading-row').boundingClientRect()
    query.exec((result) => {
      const values = Array.isArray(result) ? result as unknown[] : []
      const rowsResult = Array.isArray(values[2]) ? values[2] : []
      finish({
        stage: toLayoutRect(values[0]),
        table: toLayoutRect(values[1]),
        rowRects: rowsResult.map(toLayoutRect).filter((rect): rect is LayoutRect => rect !== null),
      })
    })
  })
}

function getFallbackRowGap(): number {
  return tableStyleId.value === 'manuscript-grid' || tableStyleId.value === 'borderless' ? 10 : 0
}

async function recalcVisibleRows(): Promise<void> {
  if (isRecalculating) {
    pendingRecalc = true
    return
  }
  if (viewMode.value !== 'reader' || loading.value || loadError.value || rows.value.length === 0) return

  isRecalculating = true
  try {
    await nextTick()
    const { stage, table, rowRects } = await measureReadingPage()
    if (!stage || !table || rowRects.length === 0) return

    const rowHeight = Math.max(...rowRects.map((rect) => rect.height))
    const measuredGaps = rowRects.slice(1).map((rect, index) => Math.max(0, rect.top - rowRects[index]!.bottom))
    const rowGap = measuredGaps.length > 0 ? Math.max(...measuredGaps) : getFallbackRowGap()
    const renderedRowsHeight = rowRects.reduce((total, rect) => total + rect.height, 0)
    const renderedGapsHeight = measuredGaps.reduce((total, gap) => total + gap, 0)
    const tableOverhead = Math.max(0, table.height - renderedRowsHeight - renderedGapsHeight)
    const nextRowsPerPage = calculateFittingRows({
      availableHeight: stage.height,
      rowHeight,
      rowGap,
      tableOverhead,
    }, rows.value.length)

    if (nextRowsPerPage !== effectiveRowsPerPage.value) {
      const firstVisibleRowIndex = (currentPage.value - 1) * effectiveRowsPerPage.value
      effectiveRowsPerPage.value = nextRowsPerPage
      currentPage.value = clampPage(Math.floor(firstVisibleRowIndex / nextRowsPerPage) + 1, totalPages.value)
      await nextTick()
    }
  } finally {
    isRecalculating = false
    isPaginationReady.value = true
    if (pendingRecalc) {
      pendingRecalc = false
      scheduleRecalcVisibleRows()
    }
  }
}

function handleReadingScrollIntent() {
  if (isAutoReading.value) pauseAutoReading()
}

function pauseAutoReading() {
  if (!isAutoReading.value) return
  cancelAutoPageTick()
  currentAutoProgress = Math.min(1, (getAnimationTime() - autoPageStartedAt) / (autoPageSeconds.value * 1000))
  autoProgress.value = currentAutoProgress
  autoReadingState.value = 'paused'
  syncAutoAnimation()
}

function resumeAutoReading() {
  if (!isAutoReadingPaused.value) return
  autoPageStartedAt = getAnimationTime() - currentAutoProgress * autoPageSeconds.value * 1000
  autoReadingState.value = 'running'
  syncAutoAnimation()
  scheduleAutoPageTick()
}

function stopAutoReading() {
  cancelAutoPageTick()
  autoReadingState.value = 'idle'
  currentAutoProgress = 0
  autoProgress.value = 0
  syncAutoAnimation()
}

function setPageWithAnimation(page: number, direction: PageTurnDirection): boolean {
  const nextPage = clampPage(page, totalPages.value)
  if (nextPage === currentPage.value) return false
  pageTurnDirection.value = direction
  pageTurnSequence.value += 1
  currentPage.value = nextPage
  return true
}

function tickAutoPage() {
  autoPageTimer = null
  if (!isAutoReading.value) return
  const now = getAnimationTime()
  const durationMs = autoPageSeconds.value * 1000
  currentAutoProgress = Math.min(1, (now - autoPageStartedAt) / durationMs)
  autoProgress.value = currentAutoProgress
  if (currentAutoProgress < 1) {
    scheduleAutoPageTick()
    return
  }
  if (currentPage.value >= totalPages.value) {
    stopAutoReading()
    uni.showToast({ title: '已读到最后一页', icon: 'none' })
    return
  }
  setPageWithAnimation(currentPage.value + 1, 'next')
  persistProgress()
  resetAutoCountdown()
  scheduleAutoPageTick()
}

function startAutoReading() {
  if (loading.value || loadError.value || rows.value.length === 0) return
  if (currentPage.value >= totalPages.value && totalPages.value > 1) setPageWithAnimation(1, 'none')
  autoReadingState.value = 'running'
  resetAutoCountdown()
  scheduleAutoPageTick()
}

function handleToggleAutoReading() {
  if (isAutoReading.value) pauseAutoReading()
  else if (isAutoReadingPaused.value) resumeAutoReading()
  else startAutoReading()
}

function handleAutoPageSecondsChange(value: number) {
  const seconds = normalizeAutoPageSeconds(value)
  if (seconds === autoPageSeconds.value) return
  if (isAutoReading.value) {
    currentAutoProgress = Math.min(1, (getAnimationTime() - autoPageStartedAt) / (autoPageSeconds.value * 1000))
  }
  prefs.value = { ...prefs.value, autoPageSeconds: seconds }
  writePreferences(prefs.value)
  if (isAutoReadingActive.value) {
    autoPageStartedAt = getAnimationTime() - currentAutoProgress * autoPageSeconds.value * 1000
    autoProgress.value = currentAutoProgress
    syncAutoAnimation()
    cancelAutoPageTick()
    scheduleAutoPageTick()
  }
}

function handleViewportChange() {
  if (typeof window === 'undefined') return
  const wasMobile = isMobileViewport.value
  isMobileViewport.value = window.innerWidth < 900
  if (wasMobile !== isMobileViewport.value) showCatalog.value = !isMobileViewport.value
  if (viewMode.value === 'reader') scheduleRecalcVisibleRows()
}

function handleToggleCatalog() {
  showCatalog.value = !showCatalog.value
}

function handleCloseCatalog() {
  showCatalog.value = false
}

function handleCatalogToggle() {
  showReaderSettings.value = false
  showReaderCatalog.value = !showReaderCatalog.value
}

function handleOpenSettings() {
  showReaderCatalog.value = false
  showReaderSettings.value = true
}

function handleNightToggle() {
  if (currentThemeId.value === 'ink-night') {
    themeStore.selectTheme(daytimeThemeId.value)
  } else {
    daytimeThemeId.value = currentThemeId.value
    themeStore.selectTheme('ink-night')
  }
}

function handleReferenceToggle() {
  prefs.value = { ...prefs.value, hideReferenceText: !prefs.value.hideReferenceText }
  writePreferences(prefs.value)
}

function handleReaderTap() {
  showReaderChrome.value = !showReaderChrome.value
  if (!showReaderChrome.value) {
    showReaderCatalog.value = false
    showReaderSettings.value = false
  }
}

function handleSelectBook(bookId: string) {
  showReaderChrome.value = false
  showReaderCatalog.value = false
  showReaderSettings.value = false
  if (bookId === activeBookId.value) {
    showCatalog.value = false
    return
  }
  pageTurnDirection.value = 'none'
  activeBookId.value = bookId
  currentPage.value = 1
  showCatalog.value = false
  stopAutoReading()
  void fetchBook()
}

function handleStyleChange(id: TableStyleId) {
  prefs.value = { ...prefs.value, tableStyleId: id }
  persistProgress()
  scheduleRecalcVisibleRows()
}

function charsToFontSize(chars: number): number {
  if (chars >= 20) return 12
  if (chars >= 18) return 14
  if (chars >= 16) return 16
  if (chars >= 14) return 18
  if (chars >= 12) return 20
  if (chars >= 10) return 24
  return 28
}

function getCurrentCharacterOffset(): number {
  const firstVisibleRowIndex = (currentPage.value - 1) * effectiveRowsPerPage.value
  return rows.value.slice(0, firstVisibleRowIndex).reduce((total, row) => total + row.text.length, 0)
}

function getRowIndexAtCharacterOffset(nextRows: ReadingRow[], characterOffset: number): number {
  let traversedCharacters = 0
  for (let index = 0; index < nextRows.length; index += 1) {
    traversedCharacters += nextRows[index]!.text.length
    if (traversedCharacters > characterOffset) return index
  }
  return Math.max(0, nextRows.length - 1)
}

async function applyReparsedRows(nextRows: ReadingRow[], characterOffset: number): Promise<void> {
  rows.value = nextRows
  const targetRowIndex = getRowIndexAtCharacterOffset(nextRows, characterOffset)
  currentPage.value = clampPage(Math.floor(targetRowIndex / Math.max(1, effectiveRowsPerPage.value)) + 1, totalPages.value)
  if (nextRows.length === 0) loadError.value = '该书籍未解析到可显示的文本行'
  else loadError.value = ''
  persistProgress()
  await nextTick()
  scheduleRecalcVisibleRows()
}

async function reparseWithCharsPerLine(chars: number, characterOffset: number): Promise<void> {
  const book = activeBook.value
  if (!book) return
  if (rawTextRef.value) {
    try {
      const reparsed = parseTextToRows(rawTextRef.value, book.id, chars)
      totalChars.value = rawTextRef.value.length
      await applyReparsedRows(reparsed, characterOffset)
      return
    } catch {
      // 缓存文本失效时继续尝试从原文件重新加载。
    }
  }
  if (lastPdfBufferRef) {
    try {
      const result = await loadPdfFromBuffer(lastPdfBufferRef.slice(0), book.id, chars, extractPdfText)
      rawTextRef.value = result.rawText ?? result.rows.map((r) => r.text).join('\n')
      totalChars.value = result.totalChars
      await applyReparsedRows(result.rows, characterOffset)
      return
    } catch {
      // 二进制缓存不可用时交给完整加载流程处理并展示错误。
    }
  }
  await fetchBook()
}

function handleCharsPerLineChange(value: number): void {
  const normalized = normalizeCharsPerLine(value)
  if (normalized === prefs.value.charsPerLine) return
  const characterOffset = getCurrentCharacterOffset()
  const nextFont = charsToFontSize(normalized)
  prefs.value = { ...prefs.value, charsPerLine: normalized, readingFontSize: nextFont }
  writePreferences(prefs.value)
  persistProgress()
  void reparseWithCharsPerLine(normalized, characterOffset)
}

function handleReadingFontSizeChange(value: number): void {
  const normalized = normalizeReadingFontSize(value)
  const map: Record<number, number> = { 12: 20, 14: 18, 16: 16, 18: 14, 20: 12, 24: 10, 28: 8, 32: 8 }
  const mapped = map[normalized] ?? 14
  handleCharsPerLineChange(mapped)
}

function handlePageChange(page: number) {
  const nextPage = clampPage(page, totalPages.value)
  const direction: PageTurnDirection = nextPage > currentPage.value ? 'next' : 'previous'
  if (!setPageWithAnimation(nextPage, direction)) return
  persistProgress()
  if (isAutoReadingActive.value) resetAutoCountdown()
}

function handlePrevPage() {
  if (setPageWithAnimation(currentPage.value - 1, 'previous')) {
    persistProgress()
    if (isAutoReadingActive.value) resetAutoCountdown()
  }
}

function handleNextPage() {
  if (setPageWithAnimation(currentPage.value + 1, 'next')) {
    persistProgress()
    if (isAutoReadingActive.value) resetAutoCountdown()
  }
}

function handleSwapFonts() {
  fontStore.swapFonts()
  void nextTick(() => scheduleRecalcVisibleRows())
  uni.showToast({ title: '已交换学习/对照字体', icon: 'none' })
}

async function fetchBook() {
  const book = activeBook.value
  if (!book) return
  isPaginationReady.value = false
  // 自定义文件优先从本地存储读取文本
  const custom = customBooks.value.find((b) => b.id === book.id) as CustomBookRecord | undefined
  if (custom && custom.text) {
    try {
      loading.value = true
      loadError.value = ''
      const parsed = parseTextToRows(custom.text, book.id, prefs.value.charsPerLine)
      rawTextRef.value = custom.text
      lastPdfBufferRef = null
      rows.value = parsed
      totalChars.value = custom.text.length
      const saved = readProgress()
      if (saved && saved.bookId === book.id) currentPage.value = Math.min(saved.page, totalPages.value || 1)
      else currentPage.value = 1
      if (rows.value.length === 0) loadError.value = '该书籍未解析到可显示的文本行'
    } catch (err) {
      rows.value = []
      totalChars.value = 0
      loadError.value = err instanceof Error ? err.message : '加载失败'
    } finally {
      loading.value = false
      persistProgress()
      await nextTick()
      scheduleRecalcVisibleRows()
    }
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const result = await loadBook(book, prefs.value.charsPerLine, extractPdfText)
    rows.value = result.rows
    totalChars.value = result.totalChars
    rawTextRef.value = result.rawText ?? result.rows.map((r) => r.text).join('\n')
    lastPdfBufferRef = null
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
    await nextTick()
    scheduleRecalcVisibleRows()
  }
}

function handleUnavailable(label: string) {
  uni.showToast({ title: label + '功能开发中', icon: 'none' })
}

function getBookProgressLabel(book: BookMeta): string {
  const saved = readProgress()
  if (saved && saved.bookId === book.id) return '已读 ' + String(saved.page) + ' 页'
  return book.source === 'custom' ? '本地上传' : '内置书籍'
}

function refreshCustomBooks(): void {
  customBooks.value = readCustomBooks()
}
function refreshBuiltinBooks(): void {
  builtinBooks.value = getBooksCatalog()
}
function handlePickFile(): void {
  if (isUploading.value) return
  // #ifdef H5
  // uni-app 的 input 会编译成文本控件，文件选择需要浏览器原生 input。
  if (typeof document !== 'undefined') {
    if (!fileInputRef.value) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.txt,.pdf'
      input.style.display = 'none'
      input.addEventListener('change', handleFileInputChange)
      document.body.appendChild(input)
      fileInputRef.value = input
    }
    fileInputRef.value.click()
    return
  }
  // #endif
  const uniAny = uni as unknown as Record<string, unknown>
  const chooseFile = uniAny.chooseFile as ((opts: unknown) => void) | undefined
  const chooseMessageFile = uniAny.chooseMessageFile as ((opts: unknown) => void) | undefined
  if (typeof chooseMessageFile === 'function') {
    chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['.txt', '.pdf'],
      success: (res: { tempFiles?: Array<{ name: string; path: string; size: number }> }) => {
        const file = res.tempFiles?.[0]
        if (!file) return
        void handleUniFilePicked(file as unknown as { name: string; path: string })
      },
      fail: () => {
        fileInputRef.value?.click()
      },
    })
    return
  }
  if (typeof chooseFile === 'function') {
    chooseFile({
      count: 1,
      type: 'file',
      extension: ['txt', 'pdf'],
      success: (res: { tempFiles?: Array<{ name: string; path: string }> }) => {
        const file = res.tempFiles?.[0]
        if (!file) return
        void handleUniFilePicked(file as unknown as { name: string; path: string })
      },
      fail: () => fileInputRef.value?.click(),
    })
    return
  }
  fileInputRef.value?.click()
}
async function handleUniFilePicked(file: { name: string; path: string }): Promise<void> {
  const fileName = file.name || file.path.split('/').pop() || 'upload.txt'
  const ext = fileName.toLowerCase().endsWith('.pdf') ? 'pdf' as const : fileName.toLowerCase().endsWith('.txt') ? 'txt' as const : null
  if (!ext) {
    uni.showToast({ title: '仅支持 .txt / .pdf', icon: 'none' })
    return
  }
  isUploading.value = true
  try {
    let text = ''
    if (typeof plus !== 'undefined') {
      text = await readPlusFileAsText(file.path, ext)
    } else {
      // H5 fallback: try to fetch via url? Use fileInput
      throw new Error('请使用底部上传按钮选择本地文件')
    }
    const record = createCustomRecord(fileName, text, ext)
    addCustomBook(record)
    refreshCustomBooks()
    uni.showToast({ title: '已加入我的上传', icon: 'none' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    uni.showToast({ title: msg || '读取文件失败', icon: 'none' })
  } finally {
    isUploading.value = false
  }
}
function readPlusArrayBuffer(path: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    try {
      // @ts-ignore plus runtime
      plus.io.resolveLocalFileSystemURL(
        path,
        (entry: unknown) => {
          const fileEntry = entry as { file: (cb: (f: unknown) => void, err?: (e: unknown) => void) => void }
          fileEntry.file(
            (f: unknown) => {
              try {
                // @ts-ignore plus FileReader
                const reader = new plus.io.FileReader()
                // @ts-ignore onloadend
                reader.onloadend = (e: unknown) => {
                  try {
                    const target = e as { target: { result: string } }
                    const dataUrl: string = target.target.result as string
                    const base64 = dataUrl.split(',')[1] || ''
                    resolve(uni.base64ToArrayBuffer(base64))
                  } catch (err) {
                    reject(err as Error)
                  }
                }
                // @ts-ignore onerror
                reader.onerror = (err: unknown) => reject(err as Error)
                // @ts-ignore readAsDataURL
                reader.readAsDataURL(f as never)
              } catch (err) {
                reject(err as Error)
              }
            },
            (err: unknown) => reject(err as Error)
          )
        },
        (err: unknown) => reject(err as Error)
      )
    } catch (err) {
      reject(err as Error)
    }
  })
}

async function readPlusFileAsText(path: string, ext: 'txt' | 'pdf'): Promise<string> {
  const buffer = await readPlusArrayBuffer(path)
  if (ext === 'txt') {
    const text = decodeTextBuffer(buffer)
    if (!text.trim()) throw new Error('文件内容为空')
    return text
  }
  const tmpId = 'plus-pdf-' + String(Date.now())
  const text = await extractPdfRawText(buffer, tmpId, extractPdfText)
  if (!text.trim()) throw new Error('PDF 未提取到可读文本，请确认为文字版 PDF')
  return text
}
function handleRemoveCustomBook(id: string): void {
  uni.showModal({
    title: '确认删除',
    content: '确定删除该文件？',
    success: (res) => {
      if (res.confirm) {
        removeCustomBook(id)
        refreshCustomBooks()
        if (activeBookId.value === id) {
          activeBookId.value = books.value[0]?.id ?? ''
          if (activeBookId.value) void fetchBook()
        }
        uni.showToast({ title: '已删除', icon: 'none' })
      }
    },
  })
}
async function handleFileInputChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const ext = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' as const : file.name.toLowerCase().endsWith('.txt') ? 'txt' as const : null
  if (!ext) {
    uni.showToast({ title: '仅支持 .txt / .pdf', icon: 'none' })
    input.value = ''
    return
  }
  isUploading.value = true
  try {
    const buffer = await file.arrayBuffer()
    let text = ''
    if (ext === 'txt') {
      text = decodeTextBuffer(buffer)
      if (!text.trim()) throw new Error('文件内容为空')
    } else {
      const tmpId = 'h5-pdf-' + String(Date.now())
      text = await extractPdfRawText(buffer, tmpId, extractPdfText)
      if (!text.trim()) throw new Error('PDF 未提取到可读文本，请确认为文字版 PDF')
    }
    const record = createCustomRecord(file.name, text, ext)
    addCustomBook(record)
    refreshCustomBooks()
    uni.showToast({ title: '已加入我的上传', icon: 'none' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    uni.showToast({ title: msg || '读取失败', icon: 'none' })
  } finally {
    isUploading.value = false
    input.value = ''
  }
}
function handleEnterReader(bookId: string): void {
  if (!bookId) return
  const isSame = bookId === activeBookId.value && rows.value.length > 0
  pageTurnDirection.value = 'none'
  activeBookId.value = bookId
  if (!isSame) {
    currentPage.value = 1
    void fetchBook()
  }
  viewMode.value = 'reader'
  showReaderChrome.value = false
  isPaginationReady.value = false
  void nextTick(() => scheduleRecalcVisibleRows())
}
function handleExitReader(): void {
  viewMode.value = 'library'
  showReaderChrome.value = false
  showReaderSettings.value = false
  showReaderCatalog.value = false
  stopAutoReading()
}

onBackPress(() => {
  if (showReaderSettings.value) {
    showReaderSettings.value = false
    return true
  }
  if (showReaderCatalog.value) {
    showReaderCatalog.value = false
    return true
  }
  if (showStylePanel.value) {
    showStylePanel.value = false
    return true
  }
  if (viewMode.value === 'reader') {
    handleExitReader()
    return true
  }
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1 })
    return true
  }
  return false
})

function handleSliderChange(event: unknown): void {
  const raw = event as { detail?: { value?: number }; target?: { value?: number } }
  const val = Number(raw?.detail?.value ?? raw?.target?.value ?? currentPage.value)
  if (!Number.isNaN(val)) handlePageChange(val)
}

onMounted(() => {
  refreshBuiltinBooks()
  refreshCustomBooks()
  const saved = readProgress()
  const prefsStored = readPreferences()
  prefs.value = prefsStored
  effectiveRowsPerPage.value = prefsStored.rowsPerPage
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
  refreshRecentProgress() // init
  void fetchBook()
})

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') pauseAutoReading()
}

onHide(pauseAutoReading)

onBeforeUnmount(() => {
  stopAutoReading()
  // #ifdef H5
  fileInputRef.value?.removeEventListener('change', handleFileInputChange)
  fileInputRef.value?.remove()
  // #endif
  if (paginationRemeasureTimer) clearTimeout(paginationRemeasureTimer)
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleViewportChange)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
})

watch(totalPages, (next) => {
  if (currentPage.value > next) currentPage.value = next
})

watch(effectiveRowsPerPage, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
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
  <view class="reading-page" :style="themeStyle" @keydown="handleKeydown" tabindex="0">
    <PdfTextBridge ref="pdfTextBridgeRef" />
    <view v-if="viewMode === 'library'" class="library-view">
      <view class="library-header">
        <view class="library-header-top">
          <text class="library-title">阅读书库</text>
          <text class="library-count">{{ books.length }} 本</text>
        </view>
        <text class="library-sub">选择书籍开始对照阅读，支持内置与本地上传</text>
      </view>
      <view class="library-body">
        <view class="library-tab-wrap">
          <view
            class="recent-entry-card"
            role="button"
            tabindex="0"
            aria-label="最近阅读入口，点击继续阅读"
            @click="handleContinueRecent"
            @keydown.enter="handleContinueRecent"
            @keydown.space.prevent="handleContinueRecent"
          >
            <view class="recent-entry-left" aria-hidden="true">
              <view class="recent-entry-icon" :class="{ 'is-empty': !recentBook }">
                <text class="recent-entry-icon-text">{{ recentBook ? recentBook.ext.toUpperCase() : '◷' }}</text>
              </view>
            </view>
            <view class="recent-entry-center">
              <view class="recent-entry-head">
                <text class="recent-entry-label">最近阅读</text>
                <text v-if="recentBook" class="recent-entry-badge">继续阅读</text>
                <text v-else class="recent-entry-badge recent-entry-badge--muted">去浏览</text>
              </view>
              <text class="recent-entry-title">{{ recentBookDisplayName }}</text>
              <text class="recent-entry-meta">{{ recentProgressLabel }}</text>
            </view>
            <view class="recent-entry-right" aria-hidden="true">
              <text class="recent-entry-arrow">›</text>
            </view>
          </view>
          <view class="library-search">
            <view class="search-field">
              <text class="search-icon">⌕</text>
              <input class="search-input" type="text" :value="searchQuery" placeholder="检索文件名称" placeholder-class="search-placeholder" @input="searchQuery = (($event as any).detail ? ($event as any).detail.value : ($event as any).target.value)" />
              <view v-if="searchQuery" class="search-clear" role="button" tabindex="0" aria-label="清除搜索" @click="searchQuery = ''" @keydown.enter="searchQuery = ''" @keydown.space.prevent="searchQuery = ''">
                <text class="search-clear-text">×</text>
              </view>
            </view>
          </view>
          <view class="library-tabs" role="tablist" aria-label="文件分类">
            <view class="library-tab" :class="{ 'is-active': libraryTab === 'builtin' }" role="tab" :aria-selected="libraryTab === 'builtin'" tabindex="0" @click="libraryTab = 'builtin'" @keydown.enter="libraryTab = 'builtin'" @keydown.space.prevent="libraryTab = 'builtin'">
              <text class="tab-label">内置文件</text>
              <text class="tab-count">{{ builtinCount }} 本</text>
            </view>
            <view class="library-tab" :class="{ 'is-active': libraryTab === 'custom' }" role="tab" :aria-selected="libraryTab === 'custom'" tabindex="0" @click="libraryTab = 'custom'" @keydown.enter="libraryTab = 'custom'" @keydown.space.prevent="libraryTab = 'custom'">
              <text class="tab-label">我的上传</text>
              <text class="tab-count">{{ customCount }} 本</text>
            </view>
          </view>
          <view class="library-tab-panel">
            <template v-if="libraryTab === 'builtin'">
              <view v-if="builtinBooks.length === 0" class="section-empty">
                <text class="section-empty-text">暂无内置文件</text>
              </view>
              <view v-else-if="filteredBuiltinBooks.length === 0" class="section-empty">
                <text class="section-empty-text">未找到匹配 "{{ searchQuery }}" 的文件</text>
              </view>
              <scroll-view v-else class="column-scroll" scroll-y :show-scrollbar="true" :enhanced="true" :bounces="false">
                <view class="book-grid">
                  <view
                    v-for="book in filteredBuiltinBooks"
                    :key="book.id"
                    class="book-card"
                    :class="{ 'is-active': book.id === activeBookId }"
                    role="button"
                    tabindex="0"
                    :aria-label="book.name"
                    @click="handleEnterReader(book.id)"
                    @keydown.enter="handleEnterReader(book.id)"
                    @keydown.space.prevent="handleEnterReader(book.id)"
                  >
                    <view class="book-cover" :data-ext="book.ext">
                      <text class="cover-ext">{{ book.ext.toUpperCase() }}</text>
                      <text class="cover-icon">{{ book.ext === 'pdf' ? '◰' : '≡' }}</text>
                    </view>
                    <view class="book-info">
                      <text class="book-name">{{ book.name }}</text>
                      <text class="book-file">{{ book.fileName }}</text>
                      <text class="book-meta">{{ getBookProgressLabel(book) }}</text>
                    </view>
                    <view class="book-action">
                      <text class="action-text">{{ book.id === activeBookId && rows.length > 0 ? '继续阅读' : '开始阅读' }}</text>
                      <text class="action-arrow">›</text>
                    </view>
                    <view v-if="book.id === activeBookId" class="book-active-bar" aria-hidden="true" />
                  </view>
                </view>
              </scroll-view>
            </template>
            <template v-else>
              <view v-if="customBooks.length === 0" class="section-empty">
                <text class="section-empty-text">暂未上传文件，点击底部按钮上传 .txt / .pdf</text>
              </view>
              <view v-else-if="filteredCustomBooks.length === 0" class="section-empty">
                <text class="section-empty-text">未找到匹配 "{{ searchQuery }}" 的文件</text>
              </view>
              <scroll-view v-else class="column-scroll" scroll-y :show-scrollbar="true" :enhanced="true" :bounces="false">
                <view class="book-grid">
                  <view
                    v-for="book in filteredCustomBooks"
                    :key="book.id"
                    class="book-card book-card--custom"
                    :class="{ 'is-active': book.id === activeBookId }"
                    role="button"
                    tabindex="0"
                    :aria-label="book.name"
                    @click="handleEnterReader(book.id)"
                    @keydown.enter="handleEnterReader(book.id)"
                    @keydown.space.prevent="handleEnterReader(book.id)"
                  >
                    <view class="book-cover" :data-ext="book.ext">
                      <text class="cover-ext">{{ book.ext.toUpperCase() }}</text>
                      <text class="cover-icon">{{ book.ext === 'pdf' ? '◰' : '≡' }}</text>
                    </view>
                    <view class="book-info">
                      <text class="book-name">{{ book.name }}</text>
                      <text class="book-file">{{ book.fileName }}</text>
                      <text class="book-meta">{{ getBookProgressLabel(book) }}</text>
                    </view>
                    <view class="book-actions">
                      <view class="book-delete" role="button" tabindex="0" aria-label="删除文件" @click.stop="handleRemoveCustomBook(book.id)" @keydown.enter.stop="handleRemoveCustomBook(book.id)" @keydown.space.prevent.stop="handleRemoveCustomBook(book.id)">
                        <text class="delete-text">删除</text>
                      </view>
                      <view class="book-action">
                        <text class="action-text">{{ book.id === activeBookId && rows.length > 0 ? '继续阅读' : '开始阅读' }}</text>
                        <text class="action-arrow">›</text>
                      </view>
                    </view>
                    <view v-if="book.id === activeBookId" class="book-active-bar" aria-hidden="true" />
                  </view>
                </view>
              </scroll-view>
            </template>
          </view>
        </view>
        <view v-if="books.length > 0" class="library-tip"><text class="tip-text">共 {{ books.length }} 本 · 点击卡片开始阅读</text></view>
      </view>
      <view class="library-upload-bar">
        <view class="upload-main" :class="{ 'is-disabled': isUploading }" role="button" tabindex="0" aria-label="上传文件" @click="handlePickFile" @keydown.enter="handlePickFile" @keydown.space.prevent="handlePickFile">
          <text class="upload-icon">＋</text>
          <text class="upload-text">{{ isUploading ? '上传中...' : '上传本地文件 .txt / .pdf' }}</text>
        </view>
        <text class="upload-hint">支持 .txt / .pdf，已上传文件仅保存在本地</text>
      </view>
    </view>

    <!-- 阅读器 -->
    <view v-else class="reader-view-wrap reader-immersive" :data-theme="currentThemeId">
      <view class="reader-status-cover" aria-hidden="true" />

      <view v-if="showReaderChrome" class="reader-top-overlay" @click.stop>
        <view class="top-overlay-left">
          <view class="top-back-btn" role="button" tabindex="0" aria-label="返回书库" @click="handleExitReader" @keydown.enter="handleExitReader" @keydown.space.prevent="handleExitReader">
            <text class="top-back-icon">‹</text>
          </view>
          <view class="top-title-wrap">
            <text class="top-title">{{ activeBook?.name ?? "对照阅读" }}</text>
            <text v-if="activeBook?.fileName" class="top-subtitle">{{ activeBook.fileName }}</text>
          </view>
        </view>
        <view class="top-overlay-actions">
          <view class="top-icon-btn" role="button" tabindex="0" aria-label="目录" @click="handleCatalogToggle" @keydown.enter="handleCatalogToggle" @keydown.space.prevent="handleCatalogToggle"><text class="top-icon-text">≡</text></view>
          <view class="top-icon-btn" role="button" tabindex="0" aria-label="交换字体" @click="handleSwapFonts" @keydown.enter="handleSwapFonts" @keydown.space.prevent="handleSwapFonts"><text class="top-icon-text">⇄</text></view>
          <view class="top-icon-btn top-icon-btn--more" role="button" tabindex="0" aria-label="更多设置" @click="handleOpenSettings" @keydown.enter="handleOpenSettings" @keydown.space.prevent="handleOpenSettings"><text class="top-icon-text">⋯</text></view>
        </view>
      </view>

      <view
        id="reading-scroll"
        class="reader-body immersive-reader-body reader-body--paged"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
        @touchmove.passive="handleReadingScrollIntent"
        @wheel.passive="handleReadingScrollIntent"
        @click="handleReaderTap"
      >
        <view class="reader-content-inner">
          <text v-if="activeBook?.fileName" class="reader-file-name">{{ activeBook.fileName }}</text>

          <view id="reading-page-stage" class="reading-page-stage" :class="{ 'is-ready': isPaginationReady }">
            <view :key="activeBookId + '-' + String(pageTurnSequence)" class="reading-page-surface" :class="pageTurnClass">
              <view v-if="loading" class="state-card">
                <text class="state-title">正在加载书籍…</text>
                <text class="state-desc">正在解析文本，请稍候</text>
              </view>

              <view v-else-if="loadError" class="state-card state-card--error">
                <text class="state-title">加载失败</text>
                <text class="state-desc">{{ loadError }}</text>
                <view class="retry-btn" role="button" tabindex="0" @click="fetchBook" @keydown.enter="fetchBook" @keydown.space.prevent="fetchBook"><text class="retry-text">重试</text></view>
                <text v-if="activeBook?.ext === 'pdf'" class="state-hint">支持提取文字版 PDF；扫描版文件需先进行文字识别（OCR）</text>
              </view>

              <ReadingTable
                v-else
                :rows="pageRows"
                :table-style-id="tableStyleId"
                :learning-font-family="currentFont.fontFamily"
                :reference-font-family="referenceFont.fontFamily"
                :page="currentPage"
                :total-pages="totalPages"
                :chars-per-line="charsPerLine" :font-size="readingFontSize"
                :hide-reference-text="prefs.hideReferenceText"
              />
              <AutoReadingProgress
                v-if="isAutoReadingActive && !loading && !loadError"
                :key="autoAnimationSequence"
                :seconds="autoPageSeconds"
                :progress="autoAnimationProgress"
                :is-running="isAutoReading"
              />
            </view>
          </view>
        </view>
      </view>

      <view v-if="showReaderChrome" class="reader-bottom-overlay" @click.stop>
        <view class="bottom-slider-row">
          <view class="slider-label" :class="{ 'is-disabled': !canPrevPage }" role="button" tabindex="0" aria-label="上一页" @click="handlePrevPage" @keydown.enter="handlePrevPage" @keydown.space.prevent="handlePrevPage"><text class="slider-label-text">上一页</text></view>
          <slider class="page-slider" :value="currentPage" :min="1" :max="totalPages" :activeColor="currentThemeId === 'ink-night' ? '#7da2ff' : 'var(--color-primary)'" backgroundColor="var(--color-border)" block-size="18" @change="handleSliderChange" />
          <view class="slider-label" :class="{ 'is-disabled': !canNextPage }" role="button" tabindex="0" aria-label="下一页" @click="handleNextPage" @keydown.enter="handleNextPage" @keydown.space.prevent="handleNextPage"><text class="slider-label-text">下一页</text></view>
        </view>
        <view class="bottom-actions-row">
          <view class="bottom-action" role="button" tabindex="0" aria-label="目录" @click="handleCatalogToggle" @keydown.enter="handleCatalogToggle" @keydown.space.prevent="handleCatalogToggle">
            <text class="bottom-action-icon">☰</text>
            <text class="bottom-action-label">目录</text>
          </view>
          <view class="bottom-action" role="button" tabindex="0" :aria-label="currentThemeId === 'ink-night' ? '日间模式' : '夜间模式'" @click="handleNightToggle" @keydown.enter="handleNightToggle" @keydown.space.prevent="handleNightToggle">
            <text class="bottom-action-icon">{{ currentThemeId === "ink-night" ? "☀" : "☾" }}</text>
            <text class="bottom-action-label">{{ currentThemeId === 'ink-night' ? '日间' : '夜间' }}</text>
          </view>
          <button class="bottom-action" role="button" tabindex="0" :class="{ 'is-active': prefs.hideReferenceText }" :aria-label="referenceToggleLabel" :aria-pressed="prefs.hideReferenceText" @click="handleReferenceToggle" @keydown.enter="handleReferenceToggle" @keydown.space.prevent="handleReferenceToggle">
            <text class="bottom-action-icon" aria-hidden="true">Aa</text>
            <text class="bottom-action-label">{{ prefs.hideReferenceText ? '显示对照' : '隐藏对照' }}</text>
          </button>
          <view class="bottom-action" role="button" tabindex="0" aria-label="设置" @click="handleOpenSettings" @keydown.enter="handleOpenSettings" @keydown.space.prevent="handleOpenSettings">
            <text class="bottom-action-icon" aria-hidden="true">⚙</text>
            <text class="bottom-action-label">设置</text>
          </view>
        </view>
      </view>

      <view v-if="showReaderCatalog" class="reader-drawer-mask" @click="showReaderCatalog = false">
        <view class="reader-drawer" @click.stop>
          <BookCatalogPanel
            :books="books"
            :active-book-id="activeBookId"
            :total-rows="rows.length"
            :loading="loading"
            :closable="true"
            @select="handleSelectBook"
            @close="showReaderCatalog = false"
          />
        </view>
      </view>

      <ReadingSettingsPanel v-if="showReaderSettings" @close="showReaderSettings = false">
        <template #table-style>
          <TableStyleSwitcher
            :model-value="tableStyleId"
            :effective-rows-per-page="effectiveRowsPerPage"
            @update:modelValue="handleStyleChange"
          />
        </template>
        <template #chars-per-line>
          <FontSizeControl :model-value="charsPerLine" @update:modelValue="handleCharsPerLineChange" />
        </template>
        <template #fonts>
          <view class="swap-row">
            <text class="swap-label">学习：{{ currentFont.name }} / 对照：{{ referenceFont.name }}</text>
            <view class="swap-btn" role="button" tabindex="0" aria-label="交换字体" @click="handleSwapFonts" @keydown.enter="handleSwapFonts" @keydown.space.prevent="handleSwapFonts"><text class="swap-btn-text">交换字体</text></view>
          </view>
        </template>
        <template #auto-page="{ collapse }">
          <AutoPageControl
            :seconds="autoPageSeconds"
            :progress="autoProgress"
            :is-running="isAutoReading"
            :is-paused="isAutoReadingPaused"
            :disabled="loading || Boolean(loadError) || rows.length === 0"
            @update:seconds="handleAutoPageSecondsChange"
            @toggle="handleToggleAutoReading"
            @stop="stopAutoReading"
            @close="collapse"
          />
        </template>
      </ReadingSettingsPanel>

      <view v-if="isAutoReadingActive && !showReaderChrome && !showReaderSettings && !showReaderCatalog" class="auto-reading-actions" aria-label="自动阅读操作">
        <view
          class="auto-reading-action auto-reading-action--primary"
          role="button"
          tabindex="0"
          :aria-label="isAutoReadingPaused ? '继续自动阅读' : '暂停自动阅读'"
          @click="handleToggleAutoReading"
          @keydown.enter="handleToggleAutoReading"
          @keydown.space.prevent="handleToggleAutoReading"
        >
          <text>{{ isAutoReadingPaused ? '继续自动阅读' : '暂停自动阅读' }}</text>
        </view>
        <view
          class="auto-reading-action auto-reading-action--stop"
          role="button"
          tabindex="0"
          aria-label="停止自动阅读"
          @click="stopAutoReading"
          @keydown.enter="stopAutoReading"
          @keydown.space.prevent="stopAutoReading"
        >
          <text>停止</text>
        </view>
      </view>
    </view>

    <!-- 底部导航只在书库视图显示，且只出现一次 -->
    <AppBottomNavigation v-if="viewMode === 'library'" active-tab="reading" @unavailable="handleUnavailable" />
  </view>
</template>

<style scoped lang="scss">
/* 样式保持不变 */
.reading-page {
  position: relative;
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
.library-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-page);
}
.library-header {
  flex: none;
  padding: calc(var(--app-top-safe-area) + 10px) 16px 14px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.library-header-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.library-title { font-size: 17px; font-weight: 800; color: var(--color-text); letter-spacing: 0.02em; }
.library-count { font-size: 11px; color: var(--color-text-muted); background: var(--color-surface-muted); border: 1px solid var(--color-border); padding: 3px 10px; border-radius: 999px; }
.library-sub { margin-top: 6px; font-size: 11px; color: var(--color-text-muted); }
.library-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  box-sizing: border-box;
  overflow: hidden;
}
.library-tab-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}
.recent-entry-card {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  box-sizing: border-box;
}
.recent-entry-card:active {
  transform: scale(0.99);
  filter: brightness(0.99);
}
.recent-entry-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.recent-entry-left {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.recent-entry-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary);
  box-sizing: border-box;
}
.recent-entry-icon.is-empty {
  background: var(--color-surface-muted);
  border-color: var(--color-border);
}
.recent-entry-icon-text {
  font-size: 10px;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: 0.04em;
}
.recent-entry-icon.is-empty .recent-entry-icon-text {
  font-size: 16px;
  color: var(--color-text-muted);
}
.recent-entry-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.recent-entry-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.recent-entry-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--color-text-muted);
  letter-spacing: 0.06em;
}
.recent-entry-badge {
  font-size: 10px;
  font-weight: 800;
  color: var(--color-primary);
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary);
  padding: 1px 7px;
  border-radius: 999px;
  white-space: nowrap;
}
.recent-entry-badge--muted {
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border-color: var(--color-border);
}
.recent-entry-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-entry-meta {
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-entry-right {
  flex: none;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
}
.recent-entry-arrow {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1;
}
.library-search {
  flex: none;
}
.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-sizing: border-box;
}
.search-icon {
  flex: none;
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1;
}
.search-input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--color-text);
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  margin: 0;
}
.search-placeholder {
  color: var(--color-text-muted);
}
.search-clear {
  flex: none;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  cursor: pointer;
}
.search-clear-text {
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1;
}
.library-tabs {
  flex: none;
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-sizing: border-box;
}
.library-tab {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.library-tab.is-active {
  background: var(--color-surface);
  border-color: var(--color-border);
  box-shadow: 0 2px 10px var(--color-shadow);
}
.library-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
.tab-label {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.library-tab.is-active .tab-label {
  color: var(--color-text);
}
.tab-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
}
.library-tab.is-active .tab-count {
  color: var(--color-primary);
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}
.library-tab-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 12px;
  box-sizing: border-box;
}
.column-scroll {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.library-continue {
  flex: none;
  margin-bottom: 0;
}
.library-tip {
  flex: none;
  margin-top: 0;
  text-align: center;
}
.tip-text { font-size: 11px; color: var(--color-text-muted); }
.library-upload-bar {
  flex: none;
  padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.upload-main { height: 42px; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--color-primary); border-radius: 12px; cursor: pointer; transition: opacity 0.15s; }
.upload-main.is-disabled { opacity: 0.55; pointer-events: none; }
.upload-main:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.upload-icon { font-size: 16px; font-weight: 800; color: #fff; line-height: 1; }
.upload-text { font-size: 13px; font-weight: 800; color: #fff; }
.upload-hint { font-size: 10px; color: var(--color-text-muted); text-align: center; }
.reader-view-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.book-grid { display: flex; flex-direction: column; gap: 10px; }
.book-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  overflow: hidden;
}
.book-card:hover { border-color: #cbd5e1; transform: translateY(-1px); box-shadow: 0 6px 18px var(--color-shadow); }
.book-card.is-active { border-color: var(--color-primary); background: var(--color-primary-soft); }
.book-card:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }
.book-cover {
  flex: none;
  width: 46px; height: 56px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  border-radius: 8px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
}
.book-cover[data-ext='pdf'] { background: #fff0f0; border-color: #fecaca; }
.book-cover[data-ext='txt'] { background: #eef2ff; border-color: #c7d2fe; }
.cover-ext { font-size: 10px; font-weight: 800; color: var(--color-text-muted); letter-spacing: 0.04em; }
.cover-icon { font-size: 16px; color: var(--color-text-secondary); }
.book-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
.book-name { font-size: 13px; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.book-file { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.book-meta { font-size: 11px; color: var(--color-primary); font-weight: 600; }
.book-action { flex: none; display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 999px; background: var(--color-text); }
.book-card.is-active .book-action { background: var(--color-primary); }
.action-text { font-size: 11px; font-weight: 700; color: #fff; }
.action-arrow { font-size: 14px; color: #fff; line-height: 1; }
.book-active-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--color-primary); }
.book-actions { flex: none; display: flex; align-items: center; gap: 8px; }
.book-delete { padding: 6px 10px; border-radius: 999px; background: #fff1f2; border: 1px solid #fecdd3; cursor: pointer; }
.book-delete:focus-visible { outline: 2px solid #f43f5e; outline-offset: 1px; }
.delete-text { font-size: 11px; font-weight: 700; color: #e11d48; }
.book-card--custom { border-style: dashed; }
.section-empty { padding: 28px 12px; display: flex; align-items: center; justify-content: center; }
.section-empty-text { font-size: 12px; color: var(--color-text-muted); text-align: center; }

.auto-reading-actions {
  position: absolute;
  z-index: 20;
  right: 16px;
  bottom: calc(84px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 8px;
}

.auto-reading-action {
  height: 42px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  box-shadow: 0 6px 18px var(--color-shadow);
  font-size: 12px;
  font-weight: 700;
  line-height: 42px;
  cursor: pointer;
}

.auto-reading-action--primary { min-width: 112px; background: var(--color-primary); color: var(--color-on-primary); }
.auto-reading-action--stop { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); }
.auto-reading-action:focus-visible { outline: 2px solid var(--color-text); outline-offset: 2px; }

.reading-body :deep(.uni-scroll-view-scrollbar-hidden) { scroll-behavior: auto !important; }

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
  width: 100%;
  overflow: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.reading-body-content {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.reading-body-content.is-catalog-hidden { grid-template-columns: minmax(0, 1fr); }

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
  .reading-body-content { display: block; padding: 12px; }
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

/* ===== 沉浸式对照阅读 ===== */
.reader-immersive {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-page);
}
.reader-status-cover {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--app-top-safe-area);
  height: var(--app-safe-mask-height);
  background: var(--color-page);
  background: var(--color-surface);
  z-index: 21;
  pointer-events: none;
}
.reader-top-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 22;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: var(--app-top-safe-area) 12px 10px;
  padding-top: var(--app-top-safe-area);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  box-sizing: border-box;
}
.top-overlay-left {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}
.top-back-btn {
  flex: none;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
}
.top-back-btn:active { filter: brightness(0.92); transform: scale(0.98); }
.top-back-icon { font-size: 22px; color: var(--color-text); line-height: 1; font-weight: 800; }
.top-title-wrap { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.top-title { font-size: 14px; font-weight: 800; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top-subtitle { font-size: 10px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top-overlay-actions { flex: none; display: flex; gap: 8px; align-items: center; }
.top-icon-btn {
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  cursor: pointer;
}
.top-icon-btn:active { filter: brightness(0.92); transform: scale(0.98); }
.top-icon-text { font-size: 14px; color: var(--color-text); font-weight: 700; line-height: 1; }
.immersive-reader-body {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}
.reader-body--paged {
  overflow: hidden !important;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.reader-body--paged::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
/* 全局隐藏滚动条，保证对照阅读无滚动条 */
.reader-body--paged *::-webkit-scrollbar {
  display: none;
}
.reader-body--paged * {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.reader-content-inner {
  height: 100%;
  padding: calc(var(--app-top-safe-area) + 4px) 14px calc(20px + env(safe-area-inset-bottom));
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}
.reader-file-name {
  min-width: 0;
  margin: 0 2px;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reading-page-stage {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  perspective: 900px;
}
.reading-page-stage:not(.is-ready) :deep(.reading-table-wrap) { visibility: hidden; }
.reading-page-surface { position: relative; width: 100%; transform-origin: center center; }
.reading-page-surface.is-turning-next { animation: readerPageTurnNext 260ms cubic-bezier(0.22, 0.72, 0.24, 1) both; }
.reading-page-surface.is-turning-previous { animation: readerPageTurnPrevious 260ms cubic-bezier(0.22, 0.72, 0.24, 1) both; }

@keyframes readerPageTurnNext {
  from { opacity: 0.35; transform: translate3d(8%, 0, 0) rotateY(-3deg); }
  to { opacity: 1; transform: translate3d(0, 0, 0) rotateY(0); }
}

@keyframes readerPageTurnPrevious {
  from { opacity: 0.35; transform: translate3d(-8%, 0, 0) rotateY(3deg); }
  to { opacity: 1; transform: translate3d(0, 0, 0) rotateY(0); }
}
.reader-bottom-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 760px;
  max-height: calc(100% - var(--app-top-safe-area));
  margin: 0 auto;
  overflow-y: auto;
  z-index: 22;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-radius: 16px 16px 0 0;
  box-sizing: border-box;
}
.bottom-slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.slider-label {
  flex: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  white-space: nowrap;
  padding: 4px 2px;
}
.slider-label.is-disabled { opacity: 0.35; pointer-events: none; }
.page-slider { flex: 1; margin: 0 2px; }
.bottom-actions-row {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
}
.bottom-action {
  flex: 1;
  min-width: 0;
  margin: 0;
  background: transparent;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 0;
  border-radius: 8px;
}
.bottom-action.is-active { background: var(--color-primary-soft); }
.bottom-action.is-active .bottom-action-icon,
.bottom-action.is-active .bottom-action-label { color: var(--color-primary); }
.bottom-action:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.bottom-action:active { background: var(--color-surface-muted); transform: scale(0.98); }
.bottom-action-icon { font-size: 16px; color: var(--color-text); line-height: 1; }
.bottom-action-label { font-size: 10px; color: var(--color-text-muted); font-weight: 600; }
.bottom-progress-hint { text-align: center; }
.hint-text { font-size: 10px; color: var(--color-text-muted); }
.reader-drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgb(32 36 45 / 42%);
  display: flex;
}
.reader-drawer {
  width: min(88%, 360px);
  height: 100%;
  padding-top: var(--app-top-safe-area);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-sizing: border-box;
  background: var(--color-surface);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgb(32 36 45 / 18%);
}
.swap-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.swap-label { font-size: 11px; color: var(--color-text-muted); flex: 1; min-width: 0; line-height: 1.4; }
.swap-btn {
  flex: none;
  height: 30px;
  padding: 0 12px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-primary);
  border-radius: 999px;
  cursor: pointer;
}
.swap-btn:active { filter: brightness(0.92); transform: scale(0.98); }
.swap-btn-text { font-size: 11px; font-weight: 700; color: #fff; white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  .reader-top-overlay, .reader-bottom-overlay, .reader-drawer { transition: none; }
  .reading-page-surface.is-turning-next,
  .reading-page-surface.is-turning-previous { animation: none; }
}
</style>



