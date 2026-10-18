import type { BookMeta, LoadResult, ReadingRow } from './types'

import { loadAssetBuffer } from '../utils/assetLoader'
import { decodeGb18030, decodeUtf16, decodeUtf8 } from '../utils/textEncoding'
import { getCustomBookById } from './customBooks'

function normalizeLine(raw: string): string {
  return raw.replace(/\uFEFF/g, '').trim()
}

// \u4e00\u884c\u4e00\u884c\u7684\u5bf9\u7167\uff1a\u4e25\u683c\u6309\u539f\u6587\u6362\u884c\u5207\u5206\uff0c\u4e0d\u6309\u6807\u70b9\u4e8c\u6b21\u5207\u53e5\uff0c\u4e0d\u5bf9\u957f\u884c\u505a\u5206\u6bb5
// \u6bcf\u4e00\u4e2a\u975e\u7a7a\u539f\u6587\u884c\u5373\u4e3a\u4e00\u4e2a ReadingRow\uff0c\u4fdd\u6301\u539f\u6587\u884c\u53f7\u5bf9\u5e94
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
 * \u4e66\u7c4d\u6765\u6e90\u4e2d\u65e2\u6709 UTF-8 \u4e5f\u6709 GB18030\u3002\u5148\u7528 fatal UTF-8 \u89e3\u7801\u907f\u514d\u9759\u9ed8\u4ea7\u751f\u4e71\u7801\uff0c
 * \u5931\u8d25\u540e\u518d\u56de\u9000\u5230 GB18030\uff1bBOM \u6587\u4ef6\u5219\u6309 BOM \u660e\u786e\u5904\u7406\u3002
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
      throw new Error('\u6587\u672c\u7f16\u7801\u65e0\u6cd5\u8bc6\u522b\uff0c\u8bf7\u5c06\u4e66\u7c4d\u8f6c\u6362\u4e3a UTF-8 \u6216 GB18030 \u540e\u91cd\u8bd5')
    }
  }
}

export async function loadTxtBook(book: BookMeta): Promise<LoadResult> {
  const text = decodeTextBuffer(await loadAssetBuffer(book.url))
  const rows = parseTextToRows(text, book.id)
  return { rows, totalChars: text.length }
}

function isPlusEnv(): boolean {
  return typeof (globalThis as unknown as { plus?: unknown }).plus !== 'undefined'
}

async function getPdfModule(): Promise<typeof import('./pdfjsAdapter')> {
  try {
    const mod = await import('./pdfjsAdapter')
    return mod
  } catch {
    throw new Error('PDF \u89e3\u6790\u4f9d\u8d56\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u5c06 PDF \u8f6c\u4e3a TXT \u540e\u91cd\u8bd5')
  }
}

/**
 * \u5c06 PDF \u4e8c\u8fdb\u5236\u6570\u636e\u89e3\u6790\u4e3a\u884c\uff0c\u5185\u90e8\u517c\u5bb9 Worker \u5931\u8d25\u540e\u9000\u3002
 * \u79fb\u52a8\u7aef H5 \u82e5 Worker \u52a0\u8f7d\u5931\u8d25\uff08\u7f51\u7edc\u3001MIME\u3001CSP\u3001iOS \u517c\u5bb9\u7b49\uff09\uff0c\u81ea\u52a8\u91cd\u8bd5 disableWorker \u6a21\u5f0f\uff0c\u786e\u4fdd\u624b\u673a\u7aef\u53ef\u67e5\u9605\u3002
 * App-plus \u73af\u5883\u9ed8\u8ba4\u4f7f\u7528 disableWorker\uff0c\u907f\u514d\u901a\u8fc7 URL \u52a0\u8f7d Worker \u5931\u8d25\u3002
 */
export async function parsePdfBuffer(buffer: ArrayBuffer, bookId: string): Promise<LoadResult> {
  const pdfjs = await getPdfModule()
  const { getDocument } = pdfjs
  // \u5c1d\u8bd5\u914d\u7f6e Worker\uff0cApp-plus \u4e0b\u4f1a\u8df3\u8fc7
  try {
    pdfjs.configurePdfWorker()
  } catch {}

  const data = new Uint8Array(buffer)
  const plusEnv = isPlusEnv()

  // \u83b7\u53d6\u6587\u6863\u7684\u516c\u5171\u903b\u8f91\uff1a\u4f18\u5148\u4f7f\u7528 Worker\uff0c\u5931\u8d25\u540e\u9000\u5230 disableWorker
  async function tryLoad(disableWorker: boolean) {
    const opts: Record<string, unknown> = { data, disableWorker }
    // \u7981\u7528 Worker \u65f6\u540c\u65f6\u7981\u7528 eval\uff0c\u63d0\u9ad8 App \u517c\u5bb9\u6027
    if (disableWorker) {
      ;(opts as { isEvalSupported?: boolean }).isEvalSupported = false
      ;(opts as { useWorkerFetch?: boolean }).useWorkerFetch = false
    }
    // getDocument \u5728 pdfjs-dist 4.x \u8fd4\u56de { promise: Promise<PDFDocument> }
    const task = getDocument(opts as never)
    return task.promise
  }

  let doc: Awaited<ReturnType<typeof getDocument>>['promise'] extends Promise<infer T> ? T : never
  // \u7b56\u7565\uff1aH5 \u5148\u5c1d\u8bd5\u542f\u7528 Worker\uff0cApp \u76f4\u63a5 disableWorker
  if (!plusEnv) {
    try {
      doc = await tryLoad(false) as never
    } catch (e) {
      // Worker \u52a0\u8f7d\u53ef\u80fd\u5931\u8d25\uff08\u624b\u673a\u7aef 404\u3001CSP\u3001Blob URL \u9650\u5236\u7b49\uff09\uff0c\u91cd\u8bd5\u65e0 Worker \u6a21\u5f0f
      try {
        doc = await tryLoad(true) as never
      } catch (e2) {
        const msg = e2 instanceof Error ? e2.message : String(e2)
        // \u533a\u5206\u53ef\u8bca\u65ad\u4fe1\u606f
        throw new Error('\u624b\u673a\u7aef PDF \u89e3\u6790\u5931\u8d25\uff1a' + msg + '\uff0c\u53ef\u5c1d\u8bd5\u8f6c\u4e3a TXT \u540e\u91cd\u8bd5')
      }
    }
  } else {
    try {
      doc = await tryLoad(true) as never
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error('PDF \u89e3\u6790\u5931\u8d25\uff1a' + msg)
    }
  }

  const lines: string[] = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const texts = content.items
      .filter((item): item is Extract<typeof item, { str: string }> => 'str' in item)
      .map((item) => item.str)
      .filter(Boolean)
    // pdfjs \u63d0\u53d6\u7684\u6587\u672c\u4e22\u5931\u6362\u884c\uff0c\u7528\u6362\u884c\u8fde\u63a5\u540e\u6309\u884c\u5207\u5206\uff0c\u4fdd\u6301\u4e0e TXT \u4e00\u81f4\u7684\u4e00\u884c\u4e00\u5bf9\u7167
    const pageText = texts.join('\n')
    const pageLines = splitIntoLines(pageText)
    for (const l of pageLines) lines.push(l)
  }
  // \u517c\u5bb9\u626b\u63cf\u7248 PDF\uff08\u65e0\u53ef\u63d0\u53d6\u6587\u672c\uff09
  if (lines.length === 0) {
    throw new Error('PDF \u672a\u89e3\u6790\u5230\u6587\u672c\u884c\uff0c\u53ef\u80fd\u662f\u626b\u63cf\u7248 PDF\uff0c\u8bf7\u8f6c\u4e3a TXT \u540e\u91cd\u8bd5')
  }
  const rows: ReadingRow[] = lines.map((line, idx) => ({
    id: bookId + '-' + String(idx + 1),
    index: idx + 1,
    text: line,
  }))
  return { rows, totalChars: lines.join('').length }
}

/**
 * \u4f9b H5 \u4e0a\u4f20\u5165\u53e3\u8c03\u7528\uff1a\u76f4\u63a5\u4f20\u5165 File \u7684 ArrayBuffer\uff0c\u8fd4\u56de\u53ef\u5b58\u50a8\u7684\u884c\u6570\u636e\u3002
 */
export async function loadPdfFromBuffer(buffer: ArrayBuffer, bookId: string): Promise<LoadResult> {
  return parsePdfBuffer(buffer, bookId)
}

export async function loadPdfBook(book: BookMeta): Promise<LoadResult> {
  const data = await loadAssetBuffer(book.url)
  return parsePdfBuffer(data, book.id)
}

async function loadCustomBook(book: BookMeta): Promise<LoadResult> {
  const custom = getCustomBookById(book.id)
  const rawText = (custom?.text ?? (book as unknown as { text?: string }).text ?? '') as string
  if (!rawText) throw new Error('\u81ea\u5b9a\u4e49\u6587\u4ef6\u5185\u5bb9\u4e22\u5931\uff0c\u8bf7\u91cd\u65b0\u4e0a\u4f20')
  // \u81ea\u5b9a\u4e49 PDF \u5df2\u5728\u4e0a\u4f20\u65f6\u63d0\u53d6\u4e3a\u6587\u672c\uff0c\u76f4\u63a5\u6309\u884c\u5207\u5206
  const rows = parseTextToRows(rawText, book.id)
  if (rows.length === 0) throw new Error('\u81ea\u5b9a\u4e49\u6587\u4ef6\u672a\u89e3\u6790\u5230\u53ef\u663e\u793a\u7684\u6587\u672c\u884c')
  return { rows, totalChars: rawText.length }
}

export async function loadBook(book: BookMeta): Promise<LoadResult> {
  if (book.source === 'custom') return loadCustomBook(book)
  const maybeCustom = getCustomBookById(book.id)
  if (maybeCustom) return loadCustomBook(maybeCustom)
  if (book.ext === 'pdf') return loadPdfBook(book)
  return loadTxtBook(book)
}

export const __testing = { splitIntoLines, normalizeLine }
