export type BookFileType = "txt" | "pdf"

export type BookSource = "builtin" | "custom"

export interface BookMeta {
  id: string
  name: string
  fileName: string
  ext: BookFileType
  url: string
  source?: BookSource
  createdAt?: number
}

export interface ReadingRow {
  id: string
  index: number
  text: string
}

export type ReferenceRevealMode = 'row' | 'character'

export type TableStyleId =
  | "light-grid"
  | "light-shading"
  | "medium-grid"
  | "accent-stripe"
  | "borderless"
  | "dark-header"
  | "manuscript-grid"
  | "manuscript-line"

export type RowsPerPage = 8 | 10 | 12 | 16

export interface ReadingProgress {
  bookId: string
  page: number
  rowsPerPage: RowsPerPage
  tableStyleId: TableStyleId
  updatedAt: string
}

export interface LoadResult {
  rows: ReadingRow[]
  totalChars: number
  rawText?: string
}
