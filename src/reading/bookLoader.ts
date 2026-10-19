import type { BookMeta, LoadResult, ReadingRow } from './types'

import { loadAssetBuffer } from '../utils/assetLoader'
import { decodeGb18030, decodeUtf16, decodeUtf8 } from '../utils/textEncoding'
import { getCustomBookById } from './customBooks'
import type { PdfTextExtractor } from './pdfTextBridge'

function normalizeLine(raw: string): string {
  return raw.replace(/\uFEFF/g, '').trim()
}

function splitIntoLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((raw) => normalizeLine(raw))
    .filter((line) => line.length > 0)
}

// 视觉一行一对照：将文件行超过 CHARS_PER_VISUAL_LINE 的长行按定长切段
// 使稿纸格模式下每格行即为一个对照块
// CHARS_PER_VISUAL_LINE 为默认值，实际切段长度由每行字数 N (charsPerLine) 动态决定
export const CHARS_PER_VISUAL_LINE = 14
export const DEFAULT_CHARS_PER_LINE = 14

function clampCharsPerLine(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return DEFAULT_CHARS_PER_LINE
  return Math.min(20, Math.max(8, Math.round(n)))
}

function chunkLine(line: string, maxChars: number): string[] {
  const chars = [...line]
  if (chars.length <= maxChars) return [line]
  const out: string[] = []
  for (let i = 0; i < chars.length; i += maxChars) {
    out.push(chars.slice(i, i + maxChars).join(''))
  }
  return out
}

export function parseTextToRows(text: string, bookId: string, charsPerLine: number = CHARS_PER_VISUAL_LINE): ReadingRow[] {
  const n = clampCharsPerLine(charsPerLine)
  const lines = splitIntoLines(text)
  const chunked: string[] = []
  for (const line of lines) {
    const parts = chunkLine(line, n)
    for (const p of parts) chunked.push(p)
  }
  return chunked.map((line, idx) => ({
    id: bookId + '-' + String(idx + 1),
    index: idx + 1,
    text: line,
  }))
}

function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value)
}

/**
 * 书籍来源中既有 UTF-8 也有 GB18030。先用 fatal UTF-8 解码避免静默产生乱码，
 * 失败后再回退到 GB18030；BOM 文件则按 BOM 明确处理。
 */
export function decodeTextBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (hasPrefix(bytes, [0xef, 0xbb, 0xbf])) {
    return decodeUtf8(bytes.subarray(3))
  }
  if (hasPrefix(bytes, [0xff, 0xfe])) {
    return decodeUtf16(bytes.subarray(2), true)
  }
  if (hasPrefix(bytes, [0xfe, 0xff])) {
    return decodeUtf16(bytes.subarray(2), false)
  }
  try {
    return decodeUtf8(bytes)
  } catch {
    try {
      return decodeGb18030(bytes)
    } catch {
      throw new Error('文本编码无法识别，请将书籍转换为 UTF-8 或 GB18030 后重试')
    }
  }
}

export async function loadTxtBook(book: BookMeta, charsPerLine: number = CHARS_PER_VISUAL_LINE): Promise<LoadResult> {
  const text = decodeTextBuffer(await loadAssetBuffer(book.url))
  const rows = parseTextToRows(text, book.id, charsPerLine)
  return { rows, totalChars: text.length, rawText: text }
}

/** 逻辑层只接收文本；PDF 引擎由页面的 WebView 桥接组件提供。 */
export async function extractPdfRawText(buffer: ArrayBuffer, _bookId: string, extractText?: PdfTextExtractor): Promise<string> {
  if (!extractText) throw new Error('PDF 文字提取器尚未就绪，请返回书库重试')
  const text = await extractText(buffer)
  if (!text.trim()) throw new Error('PDF 未提取到文字，扫描版 PDF 需要先进行文字识别（OCR）')
  return text
}

export async function parsePdfBuffer(buffer: ArrayBuffer, bookId: string, charsPerLine: number = CHARS_PER_VISUAL_LINE, extractText?: PdfTextExtractor): Promise<LoadResult> {
  const rawText = await extractPdfRawText(buffer, bookId, extractText)
  return { rows: parseTextToRows(rawText, bookId, charsPerLine), totalChars: splitIntoLines(rawText).join('').length, rawText }
}

export async function loadPdfFromBuffer(buffer: ArrayBuffer, bookId: string, charsPerLine: number = CHARS_PER_VISUAL_LINE, extractText?: PdfTextExtractor): Promise<LoadResult> {
  return parsePdfBuffer(buffer, bookId, charsPerLine, extractText)
}

export async function loadPdfBook(book: BookMeta, charsPerLine: number = CHARS_PER_VISUAL_LINE, extractText?: PdfTextExtractor): Promise<LoadResult> {
  const data = await loadAssetBuffer(book.url)
  return parsePdfBuffer(data, book.id, charsPerLine, extractText)
}

async function loadCustomBook(book: BookMeta, charsPerLine: number = CHARS_PER_VISUAL_LINE): Promise<LoadResult> {
  const custom = getCustomBookById(book.id)
  const rawText = (custom?.text ?? (book as unknown as { text?: string }).text ?? '') as string
  if (!rawText) throw new Error('自定义文件内容丢失，请重新上传')
  const rows = parseTextToRows(rawText, book.id, charsPerLine)
  if (rows.length === 0) throw new Error('自定义文件未解析到可显示的文本行')
  return { rows, totalChars: rawText.length, rawText }
}

export async function loadBook(book: BookMeta, charsPerLine: number = CHARS_PER_VISUAL_LINE, extractText?: PdfTextExtractor): Promise<LoadResult> {
  const n = clampCharsPerLine(charsPerLine)
  if (book.source === 'custom') return loadCustomBook(book, n)
  const maybeCustom = getCustomBookById(book.id)
  if (maybeCustom) return loadCustomBook(maybeCustom, n)
  if (book.ext === 'pdf') return loadPdfBook(book, n, extractText)
  return loadTxtBook(book, n)
}

export const __testing = { splitIntoLines, normalizeLine, chunkLine, CHARS_PER_VISUAL_LINE }
