import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { parseTextToRows } from './bookLoader'
import type { ReadingProgress } from './types'
import { useReadingPosition } from './useReadingPosition'

function fixture() {
  const text = Array.from({ length: 120 }, (_, index) => `${String(index).padStart(3, '0')}天地玄黄宇宙洪荒日月盈昃`).join('\n')
  const rows = ref(parseTextToRows(text, 'book'))
  return { text, rows, position: useReadingPosition(rows, 10) }
}

function snapshot(position: ReturnType<typeof useReadingPosition>): ReadingProgress {
  return {
    bookId: 'book', page: position.currentPage.value, rowsPerPage: position.effectiveRowsPerPage.value,
    characterOffset: position.characterOffset.value, charsPerLine: 14, tableStyleId: 'light-grid', updatedAt: '',
  }
}

describe('reading position', () => {
  it('restores actual automatic page capacity before measuring, including later pages', () => {
    const { position } = fixture()
    position.reflow(7)
    position.setPage(23)
    const saved = snapshot(position)
    const restarted = fixture().position
    restarted.restoreProgress(saved)
    restarted.reflow(7)
    expect(restarted.currentPage.value).toBe(23)
    expect(restarted.pageRows.value).toEqual(position.pageRows.value)
  })

  it('keeps an anchor through repeated layout changes without rounding it backwards', () => {
    const { position } = fixture()
    position.reflow(7)
    position.setPage(23)
    const saved = snapshot(position)
    for (const capacity of [10, 3, 9, 5, 10, 7]) position.reflow(capacity)
    expect(snapshot(position)).toEqual(saved)
  })

  it('migrates an old page using measured capacity because old records stored the default capacity', () => {
    const { position } = fixture()
    position.restoreProgress({ bookId: 'book', page: 23, rowsPerPage: 10, tableStyleId: 'light-grid', updatedAt: '' })
    position.reflow(7)
    expect(position.currentPage.value).toBe(23)
    expect(position.pageRows.value[0]!.index).toBe(155)
    const saved = snapshot(position)
    position.reflow(10)
    position.reflow(7)
    expect(snapshot(position)).toEqual(saved)
  })

  it('turns to adjacent rows and returns to the same page after restoration', () => {
    const { position } = fixture()
    position.reflow(7)
    position.setPage(23)
    const original = position.pageRows.value
    position.restoreProgress(snapshot(position))
    position.setPage(24)
    expect(position.pageRows.value[0]!.index).toBe(original[original.length - 1]!.index + 1)
    position.setPage(23)
    expect(position.pageRows.value).toEqual(original)
  })

  it('preserves the same content when characters per line changes and the book is reopened', () => {
    const { position, rows, text } = fixture()
    position.reflow(7)
    position.setPage(23)
    const offset = position.characterOffset.value
    rows.value = parseTextToRows(text, 'book', 18)
    position.restoreCharacterOffset(offset)
    position.reflow(9)
    const saved = snapshot(position)
    const restarted = useReadingPosition(ref(parseTextToRows(text, 'book', 18)), 10)
    restarted.restoreProgress(saved)
    restarted.reflow(9)
    expect(restarted.pageRows.value).toEqual(position.pageRows.value)
    expect(restarted.characterOffset.value).toBe(offset)
  })

  it('migrates page-only records, resets a new book, and clamps short or empty content', () => {
    const { position, rows } = fixture()
    position.restoreProgress({ bookId: 'book', page: 8, rowsPerPage: 10, tableStyleId: 'light-grid', updatedAt: '' })
    expect(position.currentPage.value).toBe(8)
    expect(position.pageRows.value[0]!.index).toBe(71)
    position.restoreProgress(null)
    expect(position.currentPage.value).toBe(1)
    expect(position.characterOffset.value).toBe(0)
    rows.value = rows.value.slice(0, 3)
    position.restoreProgress({ ...snapshot(position), page: 100, characterOffset: 99999 })
    expect(position.currentPage.value).toBe(1)
    rows.value = []
    position.restoreProgress(null)
    position.reflow(5)
    expect(position.pageRows.value).toEqual([])
    expect(position.currentPage.value).toBe(1)
    expect(position.characterOffset.value).toBe(0)
  })
})
