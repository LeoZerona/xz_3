import type { BookMeta, LoadResult, ReadingRow } from './types'

import { loadAssetBuffer } from '../utils/assetLoader'
import { decodeGb18030, decodeUtf16, decodeUtf8 } from '../utils/textEncoding'

function normalizeLine(raw: string): string {
  return raw.replace(/\uFEFF/g, '').trim()
}

// 一行一行的对照：严格按原文换行切分，不按标点二次切句，不对长行做分段
// 每一个非空原文行即为一个 ReadingRow，保持原文行号对应
function splitIntoLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((raw) => normalizeLine(raw))
    .filter((line) => line.length > 0)
}

export function parseTextToRows(text: string, bookId: string): ReadingRow[] {
  const lines = splitIntoLines(text)
  return lines.map((line, idx) => ({
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

export async function loadTxtBook(book: BookMeta): Promise<LoadResult> {
  const text = decodeTextBuffer(await loadAssetBuffer(book.url))
  const rows = parseTextToRows(text, book.id)
  return { rows, totalChars: text.length }
}

export async function loadPdfBook(book: BookMeta): Promise<LoadResult> {
  let pdfjs: typeof import('./pdfjsAdapter')
  try {
    pdfjs = await import('./pdfjsAdapter')
  } catch {
    throw new Error('PDF 解析依赖加载失败，请将 PDF 转为 TXT 后重试')
  }
  const { GlobalWorkerOptions, getDocument, workerSrc } = pdfjs

  if (!GlobalWorkerOptions.workerSrc) {
    GlobalWorkerOptions.workerSrc = workerSrc
  }

  const data = await loadAssetBuffer(book.url)
  const doc = await getDocument({ data }).promise
  const lines: string[] = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const texts = content.items
      .filter((item): item is Extract<typeof item, { str: string }> => 'str' in item)
      .map((item) => item.str)
      .filter(Boolean)
    const pageText = texts.join('\n')
    const pageLines = splitIntoLines(pageText)
    for (const l of pageLines) lines.push(l)
  }
  const rows: ReadingRow[] = lines.map((line, idx) => ({
    id: book.id + '-' + String(idx + 1),
    index: idx + 1,
    text: line,
  }))
  return { rows, totalChars: lines.join('').length }
}

export async function loadBook(book: BookMeta): Promise<LoadResult> {
  if (book.ext === 'pdf') return loadPdfBook(book)
  return loadTxtBook(book)
}

export const __testing = { splitIntoLines, normalizeLine }
