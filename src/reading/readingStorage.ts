import type { ReadingProgress, RowsPerPage, TableStyleId } from './types'
import { isTableStyleId } from './tableStyles'

export const READING_PROGRESS_KEY = 'reading:progress'
export const READING_PREFERENCES_KEY = 'reading:preferences'

export interface ReadingPreferences {
  tableStyleId: TableStyleId
  rowsPerPage: RowsPerPage
  autoPageSeconds: number
  readingFontSize: number
  charsPerLine: number
  hideReferenceText: boolean
}

const DEFAULT_PREFS: ReadingPreferences = {
  tableStyleId: 'light-grid',
  rowsPerPage: 10,
  autoPageSeconds: 30,
  readingFontSize: 18,
  charsPerLine: 14,
  hideReferenceText: false,
}

export const MIN_AUTO_PAGE_SECONDS = 1
export const MAX_AUTO_PAGE_SECONDS = 3600
export const MIN_READING_FONT_SIZE = 12
export const MAX_READING_FONT_SIZE = 32
export const READING_FONT_SIZE_STEP = 1
export const READING_FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 28, 32] as const

export const MIN_CHARS_PER_LINE = 8
export const MAX_CHARS_PER_LINE = 20
export const CHARS_PER_LINE_STEP = 1
export const DEFAULT_CHARS_PER_LINE = 14
export const CHARS_PER_LINE_PRESETS = [10, 12, 14, 16, 18] as const

export function normalizeAutoPageSeconds(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_PREFS.autoPageSeconds
  return Math.min(MAX_AUTO_PAGE_SECONDS, Math.max(MIN_AUTO_PAGE_SECONDS, Math.trunc(parsed)))
}

export function normalizeReadingFontSize(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_PREFS.readingFontSize
  const rounded = Math.round(parsed)
  return Math.min(MAX_READING_FONT_SIZE, Math.max(MIN_READING_FONT_SIZE, rounded))
}

export function normalizeCharsPerLine(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_PREFS.charsPerLine
  const rounded = Math.round(parsed)
  return Math.min(MAX_CHARS_PER_LINE, Math.max(MIN_CHARS_PER_LINE, rounded))
}

function migrateFontSizeToCharsPerLine(fontSize: unknown): number | null {
  const v = typeof fontSize === 'number' ? fontSize : Number(fontSize)
  if (!Number.isFinite(v)) return null
  // 逆映射：字号越大 => 每行字数越少
  if (v <= 12) return 20
  if (v <= 14) return 18
  if (v <= 16) return 16
  if (v <= 18) return 14
  if (v <= 20) return 12
  if (v <= 24) return 10
  return 8
}

function isRowsPerPage(value: unknown): value is RowsPerPage {
  return value === 8 || value === 10 || value === 12 || value === 16
}

export function readPreferences(): ReadingPreferences {
  try {
    const raw = uni.getStorageSync(READING_PREFERENCES_KEY) as unknown
    if (raw && typeof raw === 'object') {
      const data = raw as Partial<ReadingPreferences> & Record<string, unknown>
      const hasChars = typeof data.charsPerLine !== 'undefined'
      let charsPerLine: number
      if (hasChars) {
        charsPerLine = normalizeCharsPerLine(data.charsPerLine)
      } else {
        const migrated = migrateFontSizeToCharsPerLine(data.readingFontSize)
        charsPerLine = migrated !== null ? migrated : DEFAULT_PREFS.charsPerLine
      }
      return {
        tableStyleId: isTableStyleId(data.tableStyleId) ? data.tableStyleId : DEFAULT_PREFS.tableStyleId,
        rowsPerPage: isRowsPerPage(data.rowsPerPage) ? data.rowsPerPage : DEFAULT_PREFS.rowsPerPage,
        autoPageSeconds: normalizeAutoPageSeconds(data.autoPageSeconds),
        readingFontSize: normalizeReadingFontSize((data as Record<string, unknown>).readingFontSize),
        charsPerLine,
        hideReferenceText: data.hideReferenceText === true,
      }
    }
  } catch {}
  return { ...DEFAULT_PREFS }
}

export function writePreferences(prefs: ReadingPreferences): void {
  try {
    uni.setStorageSync(READING_PREFERENCES_KEY, prefs)
  } catch {}
}

export function readProgress(): ReadingProgress | null {
  try {
    const raw = uni.getStorageSync(READING_PROGRESS_KEY) as unknown
    if (raw && typeof raw === 'object') {
      const data = raw as Partial<ReadingProgress>
      if (typeof data.bookId === 'string' && typeof data.page === 'number') {
        return {
          bookId: data.bookId,
          page: Math.max(1, Math.trunc(data.page)),
          rowsPerPage: isRowsPerPage(data.rowsPerPage) ? data.rowsPerPage : DEFAULT_PREFS.rowsPerPage,
          tableStyleId: isTableStyleId(data.tableStyleId) ? data.tableStyleId : DEFAULT_PREFS.tableStyleId,
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
        }
      }
    }
  } catch {}
  return null
}

export function writeProgress(progress: ReadingProgress): void {
  try {
    uni.setStorageSync(READING_PROGRESS_KEY, progress)
  } catch {}
}
