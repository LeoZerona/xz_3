import { describe, expect, it } from 'vitest'
import { __testing, parseTextToRows } from './bookLoader'

describe('bookLoader', () => {
  it('splits lines and ignores empty', () => {
    const text = 'hello\n\nworld\n  \nfoo'
    const lines = __testing.splitIntoLines(text)
    expect(lines).toEqual(['hello', 'world', 'foo'])
  })

  it('splits long line by punctuation', () => {
    const long = '这是一个很长的句子，'.repeat(20) + '结束。'
    const segments = __testing.splitLongLine(long, 90)
    expect(segments.length).toBeGreaterThan(1)
    expect(segments.join('')).toBe(long)
  })

  it('parses to rows', () => {
    const rows = parseTextToRows('a\nb\nc', 'book-1')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ index: 1, text: 'a' })
    expect(rows[2].id).toBe('book-1-3')
  })

  it('handles empty text', () => {
    const rows = parseTextToRows('', 'empty')
    expect(rows).toHaveLength(0)
  })
})
