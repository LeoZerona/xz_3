import { describe, expect, it } from 'vitest'
import { __testing, CHARS_PER_VISUAL_LINE, decodeTextBuffer, parseTextToRows } from './bookLoader'

describe('bookLoader', () => {
  it('splits lines and ignores empty', () => {
    const text = 'hello\n\nworld\n  \nfoo'
    const lines = __testing.splitIntoLines(text)
    expect(lines).toEqual(['hello', 'world', 'foo'])
  })

  it('keeps raw splitIntoLines single but chunks visual rows (14 chars per visual line)', () => {
    const long = '这是一个很长的句子，'.repeat(20) + '结束。'
    const lines = __testing.splitIntoLines(long)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe(long)
    const rows = parseTextToRows(long, 'book-1')
    const expectedChunks = Math.ceil([...long].length / CHARS_PER_VISUAL_LINE)
    expect(rows).toHaveLength(expectedChunks)
    expect(rows.map((r) => r.text).join('')).toBe(long)
    for (const r of rows) expect([...r.text].length).toBeLessThanOrEqual(CHARS_PER_VISUAL_LINE)
  })

  it('chunks sample long line 45 chars into visual rows (one visual line per 对照)', () => {
    const sample = '阿婉，阿婉许绥一遇知己赠美人，酒宴上，他与一书生相谈甚欢，转手就将怀中美人推进了书生怀里。'
    const len = [...sample].length
    expect(len).toBeGreaterThan(CHARS_PER_VISUAL_LINE)
    const rows = parseTextToRows(sample, 'demo')
    expect(rows.length).toBe(Math.ceil(len / CHARS_PER_VISUAL_LINE))
    expect(rows.map((r) => r.text).join('')).toBe(sample)
  })

  it('preserves original line breaks one-to-one (chunked)', () => {
    const text = '第一行内容。\n第二行内容，包含标点；还有更多。\n第三行'
    const rows = parseTextToRows(text, 'x')
    // 第二行 17 字 > 14 ，会被按 14 切段为 2 段
    expect(rows.map((r) => r.text).join('|')).toBe('第一行内容。|第二行内容，包含标点；还有更|多。|第三行')
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
