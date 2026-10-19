import type { RowsPerPage } from './types'

export interface PageLayoutMeasurement {
  availableHeight: number
  rowHeight: number
  rowGap: number
  tableOverhead: number
}

export function calculateFittingRows(measurement: PageLayoutMeasurement, totalRows: number): number {
  const availableHeight = Number.isFinite(measurement.availableHeight) ? Math.max(0, measurement.availableHeight) : 0
  const rowHeight = Number.isFinite(measurement.rowHeight) ? Math.max(1, measurement.rowHeight) : 1
  const rowGap = Number.isFinite(measurement.rowGap) ? Math.max(0, measurement.rowGap) : 0
  const tableOverhead = Number.isFinite(measurement.tableOverhead) ? Math.max(0, measurement.tableOverhead) : 0
  const availableForRows = Math.max(0, availableHeight - tableOverhead)
  const fittingRows = Math.max(1, Math.floor((availableForRows + rowGap) / (rowHeight + rowGap)))
  return totalRows > 0 ? Math.min(totalRows, fittingRows) : 1
}

export function computeTotalPages(totalRows: number, rowsPerPage: number): number {
  if (totalRows <= 0) return 1
  return Math.max(1, Math.ceil(totalRows / Math.max(1, Math.trunc(rowsPerPage))))
}

export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1
  return Math.min(Math.max(1, Math.trunc(page)), totalPages)
}

export function getPageSlice<T>(rows: T[], page: number, rowsPerPage: number): T[] {
  const totalPages = computeTotalPages(rows.length, rowsPerPage)
  const safePage = clampPage(page, totalPages)
  const safeRowsPerPage = Math.max(1, Math.trunc(rowsPerPage))
  const start = (safePage - 1) * safeRowsPerPage
  return rows.slice(start, start + safeRowsPerPage)
}

export function getPageRangeLabel(page: number, rowsPerPage: number, totalRows: number): string {
  if (totalRows === 0) return '0 行'
  const safeRowsPerPage = Math.max(1, Math.trunc(rowsPerPage))
  const totalPages = computeTotalPages(totalRows, safeRowsPerPage)
  const safePage = clampPage(page, totalPages)
  const start = (safePage - 1) * safeRowsPerPage + 1
  const end = Math.min(safePage * safeRowsPerPage, totalRows)
  return '第 ' + String(start) + '-' + String(end) + ' 行 / 共 ' + String(totalRows) + ' 行'
}

export const ROWS_PER_PAGE_OPTIONS: RowsPerPage[] = [8, 10, 12, 16]
