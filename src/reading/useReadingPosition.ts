import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { clampPage, computeTotalPages, getPageSlice } from './pagination'
import type { ReadingProgress, ReadingRow } from './types'

interface ReadingPosition {
  currentPage: Ref<number>
  effectiveRowsPerPage: Ref<number>
  characterOffset: Ref<number>
  totalPages: ComputedRef<number>
  pageRows: ComputedRef<ReadingRow[]>
  restoreProgress: (progress: ReadingProgress | null) => void
  restoreCharacterOffset: (offset: number) => void
  reflow: (rowsPerPage: number) => void
  setPage: (page: number) => boolean
}

export function useReadingPosition(rows: Ref<ReadingRow[]>, initialRowsPerPage: number): ReadingPosition {
  const currentPage = ref(1)
  const effectiveRowsPerPage = ref(initialRowsPerPage)
  let legacyPage: number | null = null
  // 排版变化只换算页码，保留正文锚点，避免反复取整使阅读位置不断向前漂移。
  const characterOffset = ref(0)
  const rowOffsets = computed(() => {
    const offsets = [0]
    for (const row of rows.value) offsets.push(offsets[offsets.length - 1]! + row.text.length)
    return offsets
  })
  const totalPages = computed(() => computeTotalPages(rows.value.length, effectiveRowsPerPage.value))
  const pageRows = computed(() => getPageSlice(rows.value, currentPage.value, effectiveRowsPerPage.value))

  function pageAtOffset(offset: number): number {
    const offsets = rowOffsets.value
    let low = 0
    let high = rows.value.length
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (offsets[middle + 1]! <= offset) low = middle + 1
      else high = middle
    }
    return clampPage(Math.floor(low / effectiveRowsPerPage.value) + 1, totalPages.value)
  }

  function restoreCharacterOffset(offset: number): void {
    legacyPage = null
    const lastOffset = rowOffsets.value[rowOffsets.value.length - 1] ?? 0
    characterOffset.value = Math.max(0, Math.min(Math.trunc(offset), lastOffset - 1))
    currentPage.value = pageAtOffset(characterOffset.value)
  }

  function restoreProgress(progress: ReadingProgress | null): void {
    effectiveRowsPerPage.value = progress?.rowsPerPage ?? initialRowsPerPage
    const firstRowIndex = Math.min(rows.value.length - 1, ((progress?.page ?? 1) - 1) * effectiveRowsPerPage.value)
    restoreCharacterOffset(progress?.characterOffset ?? rowOffsets.value[firstRowIndex] ?? 0)
    // 旧版保存的是配置行数而非实际容量，只能在首次测量后按原页码迁移。
    if (progress && progress.characterOffset === undefined) legacyPage = progress.page
  }

  function reflow(rowsPerPage: number): void {
    effectiveRowsPerPage.value = Math.max(1, Math.trunc(rowsPerPage))
    if (legacyPage !== null) {
      currentPage.value = clampPage(legacyPage, totalPages.value)
      characterOffset.value = rowOffsets.value[(currentPage.value - 1) * effectiveRowsPerPage.value] ?? 0
      legacyPage = null
    } else {
      currentPage.value = pageAtOffset(characterOffset.value)
    }
  }

  function setPage(page: number): boolean {
    const nextPage = clampPage(page, totalPages.value)
    if (nextPage === currentPage.value) return false
    currentPage.value = nextPage
    characterOffset.value = rowOffsets.value[(nextPage - 1) * effectiveRowsPerPage.value] ?? 0
    return true
  }

  return { currentPage, effectiveRowsPerPage, characterOffset, totalPages, pageRows, restoreProgress, restoreCharacterOffset, reflow, setPage }
}
