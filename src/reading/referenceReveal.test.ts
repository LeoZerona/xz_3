import { describe, expect, it } from 'vitest'
import { getNextReferenceRevealCount, getReferenceCharacterCount, getReferenceRevealRows } from './referenceReveal'
import type { ReadingRow } from './types'

const rows: ReadingRow[] = [
  { id: 'one', index: 1, text: '天地玄黄' },
  { id: 'two', index: 2, text: '宇宙洪荒。' },
]

function visibleText(count: number, source = rows): string[] {
  return getReferenceRevealRows(source, count).map((row) => row.characters
    .filter((character) => character.isVisible).map((character) => character.text).join(''))
}

describe('progressive reference reveal', () => {
  it('hides all reference glyphs while retaining their text and row positions', () => {
    const hidden = getReferenceRevealRows(rows, 0)
    expect(hidden.map((row) => [row.id, row.index, row.text])).toEqual(rows.map((row) => [row.id, row.index, row.text]))
    expect(hidden.every((row) => row.isReferenceHidden)).toBe(true)
    expect(visibleText(0)).toEqual(['', ''])
  })

  it('reveals one complete row on each step and stops at the page boundary', () => {
    const first = getNextReferenceRevealCount(rows, 0, 'row')
    expect(visibleText(first)).toEqual(['天地玄黄', ''])
    const last = getNextReferenceRevealCount(rows, first, 'row')
    expect(visibleText(last)).toEqual(['天地玄黄', '宇宙洪荒。'])
    expect(getNextReferenceRevealCount(rows, last, 'row')).toBe(last)
  })

  it('reveals one character per step and continues into the next row', () => {
    expect(visibleText(getNextReferenceRevealCount(rows, 0, 'character'))).toEqual(['天', ''])
    expect(visibleText(getNextReferenceRevealCount(rows, 4, 'character'))).toEqual(['天地玄黄', '宇'])
    expect(getNextReferenceRevealCount(rows, 9, 'character')).toBe(9)
  })

  it('keeps revealed text when switching between row and character steps', () => {
    expect(visibleText(getNextReferenceRevealCount(rows, 2, 'row'))).toEqual(['天地玄黄', ''])
    expect(visibleText(getNextReferenceRevealCount(rows, 4, 'character'))).toEqual(['天地玄黄', '宇'])
  })

  it('counts supplementary Chinese characters and emoji once, without splitting them', () => {
    const unicodeRows = [{ id: 'unicode', index: 1, text: '𠮷天😀。' }]
    expect(getReferenceCharacterCount(unicodeRows)).toBe(4)
    expect(visibleText(1, unicodeRows)).toEqual(['𠮷'])
    expect(visibleText(3, unicodeRows)).toEqual(['𠮷天😀'])
  })

  it('keeps whitespace for layout without consuming a reveal step', () => {
    const spacedRows = [{ id: 'spaced', index: 1, text: ' 天 地\t' }]
    expect(getReferenceCharacterCount(spacedRows)).toBe(2)
    expect(visibleText(1, spacedRows)).toEqual([' 天 \t'])
    expect(getNextReferenceRevealCount(spacedRows, 1, 'character')).toBe(2)
  })

  it('supports whole-page display and resetting to fully hidden', () => {
    expect(visibleText(Number.POSITIVE_INFINITY)).toEqual(rows.map((row) => row.text))
    expect(visibleText(0)).toEqual(['', ''])
    expect(getReferenceRevealRows(rows, 1).map((row) => row.isReferenceHidden)).toEqual([false, true])
  })

  it('handles empty pages and out-of-range counts', () => {
    expect(getReferenceCharacterCount([])).toBe(0)
    expect(getReferenceRevealRows([], 0)).toEqual([])
    expect(getNextReferenceRevealCount([], 0, 'row')).toBe(0)
    expect(getNextReferenceRevealCount([], 0, 'character')).toBe(0)
    expect(getNextReferenceRevealCount(rows, -3, 'row')).toBe(4)
    expect(getNextReferenceRevealCount(rows, 50, 'character')).toBe(9)
  })
})
