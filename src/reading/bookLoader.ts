import type { BookMeta, LoadResult, ReadingRow } from './types'

import { loadAssetBuffer } from '../utils/assetLoader'
import { decodeGb18030, decodeUtf16, decodeUtf8 } from '../utils/textEncoding'
import { getCustomBookById } from './customBooks'

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

function isPlusEnv(): boolean {
  return typeof (globalThis as unknown as { plus?: unknown }).plus !== 'undefined'
}

async function getPdfModule(): Promise<typeof import('./pdfjsAdapter')> {
  try {
    const mod = await import('./pdfjsAdapter')
    return mod
  } catch {
    throw new Error('PDF 解析依赖加载失败，请将 PDF 转为 TXT 后重试')
  }
}

/**
 * 将 PDF 二进制数据解析为行，内部兼容 Worker 失败后退。
 * 移动端 H5 若 Worker 加载失败（网络、MIME、CSP、iOS 兼容等），自动重试 disableWorker 模式，确保手机端可查阅。
 * App-plus 环境默认使用 disableWorker，避免通过 URL 加载 Worker 失败。
 */
export async function parsePdfBuffer(buffer: ArrayBuffer, bookId: string): Promise<LoadResult> {
  const pdfjs = await getPdfModule()
  const { getDocument } = pdfjs
  try {
    pdfjs.configurePdfWorker()
  } catch {}

  const data = new Uint8Array(buffer)
  const plusEnv = isPlusEnv()

  async function tryLoad(disableWorker: boolean) {
    const opts: Record<string, unknown> = { data, disableWorker }
    if (disableWorker) {
      ;(opts as { isEvalSupported?: boolean }).isEvalSupported = false
      ;(opts as { useWorkerFetch?: boolean }).useWorkerFetch = false
    }
    const task = getDocument(opts as never)
    return task.promise
  }

  let doc: Awaited<ReturnType<typeof getDocument>>['promise'] extends Promise<infer T> ? T : never
  if (!plusEnv) {
    try {
      doc = (await tryLoad(false)) as never
    } catch (e) {
      try {
        doc = (await tryLoad(true)) as never
      } catch (e2) {
        const msg = e2 instanceof Error ? e2.message : String(e2)
        throw new Error('手机端 PDF 解析失败：' + msg + '，可尝试转为 TXT 后重试')
      }
    }
  } else {
    try {
      doc = (await tryLoad(true)) as never
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error('PDF 解析失败：' + msg)
    }
  }

  const lines: string[] = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    // 一行一对照：严格按原始换行还原，不按标点切句、不分段长行
    // pdfjs 的 TextContent 每个 item 可能是行内片段，hasEOL 标记行末；没有 hasEOL 时用 transform[5] (y) 分组作为兜底
    type PdfTextItem = Extract<(typeof content.items)[number], { str: string }> & { hasEOL?: boolean; transform?: number[] }
    const rawItems = content.items.filter((item): item is PdfTextItem => 'str' in (item as Record<string, unknown>)) as PdfTextItem[]
    const textItems = rawItems.filter((it) => typeof it.str === 'string')
    if (textItems.length === 0) continue
    const hasAnyEOL = textItems.some((it) => it.hasEOL === true)
    if (hasAnyEOL) {
      let buffer = ''
      for (const it of textItems) {
        buffer += it.str
        if (it.hasEOL) {
          const line = normalizeLine(buffer)
          if (line.length > 0) lines.push(line)
          buffer = ''
        }
      }
      const tail = normalizeLine(buffer)
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
    throw new Error('PDF 未解析到文本行，可能是扫描版 PDF，请转为 TXT 后重试')
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
  if (!rawText) throw new Error('自定义文件内容丢失，请重新上传')
  const rows = parseTextToRows(rawText, book.id)
  if (rows.length === 0) throw new Error('自定义文件未解析到可显示的文本行')
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