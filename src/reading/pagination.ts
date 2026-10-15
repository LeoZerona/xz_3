import type { RowsPerPage } from './types'

export function computeTotalPages(totalRows: number, rowsPerPage: RowsPerPage): number {
  if (totalRows <= 0) return 1
  return Math.max(1, Math.ceil(totalRows / rowsPerPage))
}

export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1
  return Math.min(Math.max(1, Math.trunc(page)), totalPages)
}

export function getPageSlice<T>(rows: T[], page: number, rowsPerPage: RowsPerPage): T[] {
  const totalPages = computeTotalPages(rows.length, rowsPerPage)
  const safePage = clampPage(page, totalPages)
  const start = (safePage - 1) * rowsPerPage
  return rows.slice(start, start + rowsPerPage)
}

export function getPageRangeLabel(page: number, rowsPerPage: RowsPerPage, totalRows: number): string {
  if (totalRows === 0) return '0 行'
  const totalPages = computeTotalPages(totalRows, rowsPerPage)
  const safePage = clampPage(page, totalPages)
  const start = (safePage - 1) * rowsPerPage + 1
  const end = Math.min(safePage * rowsPerPage, totalRows)
  return '第 ' + String(start) + '-' + String(end) + ' 行 / 共 ' + String(totalRows) + ' 行'
}

export const ROWS_PER_PAGE_OPTIONS: RowsPerPage[] = [8, 10, 12, 16]
