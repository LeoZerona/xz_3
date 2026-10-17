import { describe, expect, it } from 'vitest'
import { __testing, decodeTextBuffer, parseTextToRows } from './bookLoader'

describe('bookLoader', () => {
  it('splits lines and ignores empty', () => {
    const text = 'hello\n\nworld\n  \nfoo'
    const lines = __testing.splitIntoLines(text)
    expect(lines).toEqual(['hello', 'world', 'foo'])
  })

  it('keeps long line as single row (line-by-line, not sentence-by-sentence)', () => {
    const long = '这是一个很长的句子，'.repeat(20) + '结束。'
    const lines = __testing.splitIntoLines(long)
    // 一行一对照：长行不应按标点二次切分，保持为1行
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe(long)
    const rows = parseTextToRows(long, 'book-1')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.text).toBe(long)
  })

  it('preserves original line breaks one-to-one', () => {
    const text = '第一行内容。\n第二行内容，包含标点；还有更多。\n第三行'
    const lines = __testing.splitIntoLines(text)
    expect(lines).toEqual(['第一行内容。', '第二行内容，包含标点；还有更多。', '第三行'])
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

  it('decodes GB18030 text without replacement characters', () => {
    const bytes = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4])
    expect(decodeTextBuffer(bytes.buffer)).toBe('中文')
  })

  it('decodes GB18030 four-byte supplementary characters', () => {
    const bytes = new Uint8Array([0x94, 0x39, 0xfc, 0x36])
    expect(decodeTextBuffer(bytes.buffer)).toBe('😀')
  })

  it('decodes UTF-8 text', () => {
    const bytes = new TextEncoder().encode('对照阅读')
    expect(decodeTextBuffer(bytes.buffer)).toBe('对照阅读')
  })
})
