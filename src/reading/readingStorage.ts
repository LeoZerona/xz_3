import type { ReadingProgress, RowsPerPage, TableStyleId } from './types'
import { isTableStyleId } from './tableStyles'

export const READING_PROGRESS_KEY = 'reading:progress'
export const READING_PREFERENCES_KEY = 'reading:preferences'

export interface ReadingPreferences {
  tableStyleId: TableStyleId
  rowsPerPage: RowsPerPage
  autoPageSeconds: number
  readingFontSize: number
}

const DEFAULT_PREFS: ReadingPreferences = {
  tableStyleId: 'light-grid',
  rowsPerPage: 10,
  autoPageSeconds: 30,
  readingFontSize: 16,
}

export const MIN_AUTO_PAGE_SECONDS = 1
export const MAX_AUTO_PAGE_SECONDS = 3600
export const MIN_READING_FONT_SIZE = 12
export const MAX_READING_FONT_SIZE = 28
export const READING_FONT_SIZE_STEP = 1
export const READING_FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 28] as const

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

function isRowsPerPage(value: unknown): value is RowsPerPage {
  return value === 8 || value === 10 || value === 12 || value === 16
}

export function readPreferences(): ReadingPreferences {
  try {
    const raw = uni.getStorageSync(READING_PREFERENCES_KEY) as unknown
    if (raw && typeof raw === 'object') {
      const data = raw as Partial<ReadingPreferences>
      return {
        tableStyleId: isTableStyleId(data.tableStyleId) ? data.tableStyleId : DEFAULT_PREFS.tableStyleId,
        rowsPerPage: isRowsPerPage(data.rowsPerPage) ? data.rowsPerPage : DEFAULT_PREFS.rowsPerPage,
        autoPageSeconds: normalizeAutoPageSeconds(data.autoPageSeconds),
        readingFontSize: normalizeReadingFontSize((data as Record<string, unknown>).readingFontSize),
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
