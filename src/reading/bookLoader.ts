import type { BookMeta, LoadResult, ReadingRow } from './types'

import { loadAssetBuffer } from '../utils/assetLoader'
import { decodeGb18030, decodeUtf16, decodeUtf8 } from '../utils/textEncoding'
import { getCustomBookById } from './customBooks'

function normalizeLine(raw: string): string {
  return raw.replace(/\uFEFF/g, '').trim()
}

// \u4E00\u884C\u4E00\u884C\u7684\u5BF9\u7167\uFF1A\u4E25\u683C\u6309\u539F\u6587\u6362\u884C\u5207\u5206\uFF0C\u4E0D\u6309\u6807\u70B9\u4E8C\u6B21\u5207\u53E5\uFF0C\u4E0D\u5BF9\u957F\u884C\u505A\u5206\u6BB5
// \u6BCF\u4E00\u4E2A\u975E\u7A7A\u539F\u6587\u884C\u5373\u4E3A\u4E00\u4E2A ReadingRow\uFF0C\u4FDD\u6301\u539F\u6587\u884C\u53F7\u5BF9\u5E94
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
 * \u4E66\u7C4D\u6765\u6E90\u4E2D\u65E2\u6709 UTF-8 \u4E5F\u6709 GB18030\u3002\u5148\u7528 fatal UTF-8 \u89E3\u7801\u907F\u514D\u9759\u9ED8\u4EA7\u751F\u4E71\u7801\uFF0C
 * \u5931\u8D25\u540E\u518D\u56DE\u9000\u5230 GB18030\uFF1BBOM \u6587\u4EF6\u5219\u6309 BOM \u660E\u786E\u5904\u7406\u3002
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
      throw new Error('\u6587\u672C\u7F16\u7801\u65E0\u6CD5\u8BC6\u522B\uFF0C\u8BF7\u5C06\u4E66\u7C4D\u8F6C\u6362\u4E3A UTF-8 \u6216 GB18030 \u540E\u91CD\u8BD5')
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
    // \u786E\u4FDD URL/Blob \u7B49\u5168\u5C40\u517C\u5BB9\uFF08\u79FB\u52A8\u7AEF WebView \u4E2D globalThis.URL \u53EF\u80FD\u672A\u5B9A\u4E49\uFF09
    try {
      mod.ensurePdfGlobalPolyfill()
    } catch {}
    return mod
  } catch {
    throw new Error('PDF \u89E3\u6790\u4F9D\u8D56\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u5C06 PDF \u8F6C\u4E3A TXT \u540E\u91CD\u8BD5')
  }
}

/**
 * \u5C06 PDF \u4E8C\u8FDB\u5236\u6570\u636E\u89E3\u6790\u4E3A\u884C\uFF0C\u5185\u90E8\u517C\u5BB9 Worker \u5931\u8D25\u540E\u9000\u3002
 * \u79FB\u52A8\u7AEF H5 \u82E5 Worker \u52A0\u8F7D\u5931\u8D25\uFF08\u7F51\u7EDC\u3001MIME\u3001CSP\u3001iOS \u517C\u5BB9\u7B49\uFF09\uFF0C\u81EA\u52A8\u91CD\u8BD5 fake worker \u6A21\u5F0F\uFF0C\u786E\u4FDD\u624B\u673A\u7AEF\u53EF\u67E5\u9605\u3002
 * App-plus \u73AF\u5883\u9ED8\u8BA4\u4F7F\u7528 fake worker\uFF0C\u907F\u514D\u901A\u8FC7 URL \u52A0\u8F7D Worker \u5931\u8D25\u3002
 * pdfjs-dist 4.x \u5DF2\u79FB\u9664 disableWorker\uFF0C\u672C\u51FD\u6570\u901A\u8FC7\u517C\u5BB9\u53C2\u6570\u4E0E Worker \u5B58\u6839\u4F2A\u88C5\u5B9E\u73B0\u540C\u6837\u7684\u540E\u9000\u3002
 */
export async function parsePdfBuffer(buffer: ArrayBuffer, bookId: string): Promise<LoadResult> {
  const pdfjs = await getPdfModule()
  const { getDocument } = pdfjs
  try {
    pdfjs.configurePdfWorker()
  } catch {}
  try {
    pdfjs.ensurePdfGlobalPolyfill()
  } catch {}

  const data = new Uint8Array(buffer)
  const plusEnv = isPlusEnv()

  async function loadWithWorker(): Promise<Awaited<ReturnType<typeof getDocument>> extends { promise: Promise<infer T> } ? T : never> {
    // pdfjs-dist 4.x \u6CA1\u6709 disableWorker\uFF0C\u4F20\u5165\u672A\u77E5\u9009\u9879\u4F1A\u88AB\u5FFD\u7565\uFF0C\u6240\u4EE5\u76F4\u63A5\u4F20 data\uFF0C\u8BA9\u5185\u90E8\u81EA\u52A8\u56DE\u9000\u5230 fake worker
    const task = getDocument({ data } as never)
    return (await task.promise) as never
  }

  async function loadWithFakeWorker(): Promise<Awaited<ReturnType<typeof getDocument>> extends { promise: Promise<infer T> } ? T : never> {
    // \u5F3A\u5236\u8D70 fake worker\uFF1A\u6682\u65F6\u5C4F\u853D\u5168\u5C40 Worker\uFF0C\u8BA9 PDFWorker \u81EA\u52A8\u9009\u62E9 LoopbackPort
    const g = globalThis as unknown as { Worker?: unknown }
    const originalWorker = g.Worker
    const hadWorker = typeof g.Worker !== 'undefined'
    try {
      // @ts-ignore
      g.Worker = undefined
      const task = getDocument({
        data,
        useWorkerFetch: false,
        isEvalSupported: false,
        isOffscreenCanvasSupported: false,
      } as never)
      return (await task.promise) as never
    } finally {
      if (hadWorker) g.Worker = originalWorker
      else {
        try {
          // @ts-ignore
          delete (globalThis as unknown as { Worker?: unknown }).Worker
          if (typeof originalWorker !== 'undefined') g.Worker = originalWorker
        } catch {}
      }
    }
  }

  let doc: Awaited<ReturnType<typeof getDocument>> extends { promise: Promise<infer T> } ? T : never
  // \u9996\u5148\u5C1D\u8BD5\u6B63\u5E38 worker\uFF08\u6709\u6548\u65F6\u6027\u80FD\u66F4\u597D\uFF09\uFF0C\u5931\u8D25\u5219\u56DE\u9000\u5230 fake worker
  // App-plus \u76F4\u63A5\u8D70 fake\uFF0C\u907F\u514D URL/Worker \u52A0\u8F7D\u95EE\u9898
  if (!plusEnv) {
    try {
      doc = (await loadWithWorker()) as never
    } catch (e) {
      const msg0 = e instanceof Error ? e.message : String(e)
      // URL is not defined \u7B49\u73AF\u5883\u517C\u5BB9\u95EE\u9898\u7ACB\u5373\u91CD\u8BD5 fake worker
      if (/URL is not defined|Worker|createObjectURL|import/i.test(msg0)) {
        try {
          doc = (await loadWithFakeWorker()) as never
        } catch (e2) {
          const msg = e2 instanceof Error ? e2.message : String(e2)
          throw new Error('\u624B\u673A\u7AEF PDF \u89E3\u6790\u5931\u8D25\uFF1A' + msg + '\uFF0C\u53EF\u5C1D\u8BD5\u8F6C\u4E3A TXT \u540E\u91CD\u8BD5')
        }
      } else {
        // \u5176\u4ED6\u9519\u8BEF\u4E5F\u5C1D\u8BD5\u4E00\u6B21 fake worker\uFF0C\u517C\u5BB9 CSP/MIME \u7B49\u95EE\u9898
        try {
          doc = (await loadWithFakeWorker()) as never
        } catch (e2) {
          const msg = e2 instanceof Error ? e2.message : String(e2)
          throw new Error('\u624B\u673A\u7AEF PDF \u89E3\u6790\u5931\u8D25\uFF1A' + msg + '\uFF0C\u53EF\u5C1D\u8BD5\u8F6C\u4E3A TXT \u540E\u91CD\u8BD5')
        }
      }
    }
  } else {
    try {
      doc = (await loadWithFakeWorker()) as never
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error('PDF \u89E3\u6790\u5931\u8D25\uFF1A' + msg)
    }
  }

  const lines: string[] = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    // \u4E00\u884C\u4E00\u5BF9\u7167\uFF1A\u4E25\u683C\u6309\u539F\u59CB\u6362\u884C\u8FD8\u539F\uFF0C\u4E0D\u6309\u6807\u70B9\u5207\u53E5\u3001\u4E0D\u5206\u6BB5\u957F\u884C
    // pdfjs \u7684 TextContent \u6BCF\u4E2A item \u53EF\u80FD\u662F\u884C\u5185\u7247\u6BB5\uFF0ChasEOL \u6807\u8BB0\u884C\u672B\uFF1B\u6CA1\u6709 hasEOL \u65F6\u7528 transform[5] (y) \u5206\u7EC4\u4F5C\u4E3A\u515C\u5E95
    type PdfTextItem = Extract<(typeof content.items)[number], { str: string }> & { hasEOL?: boolean; transform?: number[] }
    const rawItems = content.items.filter((item): item is PdfTextItem => 'str' in (item as Record<string, unknown>)) as PdfTextItem[]
    const textItems = rawItems.filter((it: PdfTextItem) => typeof it.str === 'string')
    if (textItems.length === 0) continue
    const hasAnyEOL = textItems.some((it: PdfTextItem) => it.hasEOL === true)
    if (hasAnyEOL) {
      let buf = ''
      for (const it of textItems) {
        buf += it.str
        if (it.hasEOL) {
          const line = normalizeLine(buf)
          if (line.length > 0) lines.push(line)
          buf = ''
        }
      }
      const tail = normalizeLine(buf)
      if (tail.length > 0) lines.push(tail)
    } else {
      const groups: Array<{ y: number; parts: string[] }> = []
      for (const it of textItems) {
        const yRaw = it.transform?.[5]
        const y = typeof yRaw === 'number' ? yRaw : Number.NaN
        if (Number.isNaN(y)) {
          if (groups.length === 0) groups.push({ y: 0, parts: [it.str] })
          else groups[groups.length - 1]!.parts.push(it.str)
          continue
        }
        const last = groups[groups.length - 1]
        if (!last || Math.abs(last.y - y) > 2) groups.push({ y, parts: [it.str] })
        else last.parts.push(it.str)
      }
      for (const g of groups) {
        const raw = g.parts.join('')
        const line = normalizeLine(raw)
        if (line.length > 0) lines.push(line)
      }
    }
  }
  if (lines.length === 0) {
    throw new Error('PDF \u672A\u89E3\u6790\u5230\u6587\u672C\u884C\uFF0C\u53EF\u80FD\u662F\u626B\u63CF\u7248 PDF\uFF0C\u8BF7\u8F6C\u4E3A TXT \u540E\u91CD\u8BD5')
  }
  const rows: ReadingRow[] = lines.map((line, idx) => ({
    id: bookId + '-' + String(idx + 1),
    index: idx + 1,
    text: line,
  }))
  return { rows, totalChars: lines.join('').length }
}

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
  if (!rawText) throw new Error('\u81EA\u5B9A\u4E49\u6587\u4EF6\u5185\u5BB9\u4E22\u5931\uFF0C\u8BF7\u91CD\u65B0\u4E0A\u4F20')
  const rows = parseTextToRows(rawText, book.id)
  if (rows.length === 0) throw new Error('\u81EA\u5B9A\u4E49\u6587\u4EF6\u672A\u89E3\u6790\u5230\u53EF\u663E\u793A\u7684\u6587\u672C\u884C')
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

