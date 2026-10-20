import type { ReadingRow, ReferenceRevealMode } from './types'

interface ReferenceCharacter {
  text: string
  isVisible: boolean
}

export interface ReferenceRevealRow extends ReadingRow {
  characters: ReferenceCharacter[]
  isReferenceHidden: boolean
}

function countCharacters(text: string): number {
  return [...text].filter((character) => character.trim().length > 0).length
}

export function getReferenceCharacterCount(rows: ReadingRow[]): number {
  return rows.reduce((total, row) => total + countCharacters(row.text), 0)
}

export function getNextReferenceRevealCount(rows: ReadingRow[], count: number, mode: ReferenceRevealMode): number {
  const total = getReferenceCharacterCount(rows)
  const current = Math.max(0, Math.min(total, Math.trunc(count)))
  if (mode === 'character') return Math.min(total, current + 1)

  let rowEnd = 0
  for (const row of rows) {
    rowEnd += countCharacters(row.text)
    // 从逐字切换为逐行时，先展示当前行剩下的文字。
    if (rowEnd > current) return rowEnd
  }
  return total
}

export function getReferenceRevealRows(rows: ReadingRow[], count: number): ReferenceRevealRow[] {
  let position = 0
  return rows.map((row) => {
    const characters = [...row.text].map((text) => {
      // 空白保留排版，但不消耗一次“显示下一个字”的操作。
      const isWhitespace = text.trim().length === 0
      const isVisible = isWhitespace || position < count
      if (!isWhitespace) position += 1
      return { text, isVisible }
    })
    const isReferenceHidden = !characters.some((character) => character.text.trim() && character.isVisible)
    return { ...row, characters, isReferenceHidden }
  })
}
