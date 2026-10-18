import type { BookMeta, LoadResult, ReadingRow } from './types'

import { loadAssetBuffer } from '../utils/assetLoader'
import { decodeGb18030, decodeUtf16, decodeUtf8 } from '../utils/textEncoding'
import { getCustomBookById } from './customBooks'

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

function isPlusEnv(): boolean {
  return typeof (globalThis as unknown as { plus?: unknown }).plus !== 'undefined'
}

async function getPdfModule(): Promise<typeof import('./pdfjsAdapter')> {
  try {
    const mod = await import('./pdfjsAdapter')
    try {
      mod.ensurePdfGlobalPolyfill()
    } catch {}
    return mod
  } catch {
    throw new Error('PDF 解析依赖加载失败，请将 PDF 转为 TXT 后重试')
  }
}

/**
 * 将 PDF 二进制数据解析为行，内部兼容 Worker 失败后退。
 */
export async function parsePdfBuffer(buffer: ArrayBuffer, bookId: string, charsPerLine: number = CHARS_PER_VISUAL_LINE): Promise<LoadResult> {
  const n = clampCharsPerLine(charsPerLine)
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
    const task = getDocument({ data } as never)
    return (await task.promise) as never
  }

  async function loadWithFakeWorker(): Promise<Awaited<ReturnType<typeof getDocument>> extends { promise: Promise<infer T> } ? T : never> {
    const pdfAny = pdfjs as unknown as Record<string, unknown>
    const prevWorkerSrc = pdfAny['workerSrc'] as unknown
    try {
      const g = globalThis as unknown as Record<string, unknown>
      const fakeWorker = { Worker: class {} as unknown }
      ;(g['pdfjsWorker'] as unknown) = fakeWorker
    } catch {}
    const task = getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true } as never)
    void prevWorkerSrc
    return (await task.promise) as never
  }

  let doc: { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> }
  if (!plusEnv) {
    try {
      doc = (await loadWithWorker()) as never
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const isWorkerError = /worker|fetch|importScripts|Failed to fetch|NetworkError|SecurityError|AbortError/i.test(msg)
      if (isWorkerError) {
        try {
          doc = (await loadWithFakeWorker()) as never
        } catch (e2) {
          const msg2 = e2 instanceof Error ? e2.message : String(e2)
          throw new Error('手机端 PDF 解析失败：' + msg2 + '，可尝试转为 TXT 后重试')
        }
      } else {
        try {
          doc = (await loadWithFakeWorker()) as never
        } catch (e2) {
          const msg2 = e2 instanceof Error ? e2.message : String(e2)
          throw new Error('手机端 PDF 解析失败：' + msg2 + '，可尝试转为 TXT 后重试')
        }
      }
    }
  } else {
    try {
      doc = (await loadWithFakeWorker()) as never
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error('PDF 解析失败：' + msg)
    }
  }

  const lines: string[] = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    type PdfTextItem = { str: string; hasEOL?: boolean; transform?: number[] }
    const rawItems = (content.items as unknown[]).filter((item: unknown): item is PdfTextItem => 'str' in (item as Record<string, unknown>)) as PdfTextItem[]
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
    throw new Error('PDF 未解析到文本行，可能是扫描版 PDF，请转为 TXT 后重试')
  }
  const chunkedPdfLines: string[] = []
  for (const line of lines) {
    const parts = chunkLine(line, n)
    for (const p of parts) chunkedPdfLines.push(p)
  }
  const rows: ReadingRow[] = chunkedPdfLines.map((line, idx) => ({
    id: bookId + '-' + String(idx + 1),
    index: idx + 1,
    text: line,
  }))
  return { rows, totalChars: lines.join('').length, rawText: lines.join('\n') }
}

export async function extractPdfRawText(buffer: ArrayBuffer, bookId: string): Promise<string> {
  // 复用 parsePdfBuffer 的文本提取但跳过按 N 切段，返回原始行以便后续按当前每行字数动态切段
  // 为避免重复实现，直接调用一次不切段的内部逻辑：提取 lines 后直接返回
  const pdfjs = await getPdfModule()
  const { getDocument } = pdfjs
  try { pdfjs.configurePdfWorker() } catch {}
  try { pdfjs.ensurePdfGlobalPolyfill() } catch {}
  const data = new Uint8Array(buffer)
  const plusEnv = isPlusEnv()
  async function loadWithWorkerInner(): Promise<any> {
    const task = getDocument({ data } as never)
    return (await task.promise) as never
  }
  async function loadWithFakeWorkerInner(): Promise<any> {
    const task = getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true } as never)
    return (await task.promise) as never
  }
  let doc: any
  if (!plusEnv) {
    try { doc = await loadWithWorkerInner() } catch (e) {
      try { doc = await loadWithFakeWorkerInner() } catch (e2) { throw new Error('PDF 解析失败：' + (e2 instanceof Error ? e2.message : String(e2))) }
    }
  } else {
    doc = await loadWithFakeWorkerInner()
  }
  const lines: string[] = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    type PdfTextItem2 = { str: string; hasEOL?: boolean; transform?: number[] }
    const rawItems = (content.items as unknown[]).filter((item: unknown): item is PdfTextItem2 => 'str' in (item as Record<string, unknown>)) as PdfTextItem2[]
    const textItems = rawItems.filter((it: PdfTextItem2) => typeof it.str === 'string')
    if (textItems.length === 0) continue
    const hasAnyEOL = textItems.some((it: PdfTextItem2) => it.hasEOL === true)
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
  if (lines.length === 0) throw new Error('PDF 未解析到文本行，可能是扫描版 PDF，请转为 TXT 后重试')
  return lines.join('\n')
}

export async function loadPdfFromBuffer(buffer: ArrayBuffer, bookId: string, charsPerLine: number = CHARS_PER_VISUAL_LINE): Promise<LoadResult> {
  return parsePdfBuffer(buffer, bookId, charsPerLine)
}

export async function loadPdfBook(book: BookMeta, charsPerLine: number = CHARS_PER_VISUAL_LINE): Promise<LoadResult> {
  const data = await loadAssetBuffer(book.url)
  return parsePdfBuffer(data, book.id, charsPerLine)
}

async function loadCustomBook(book: BookMeta, charsPerLine: number = CHARS_PER_VISUAL_LINE): Promise<LoadResult> {
  const custom = getCustomBookById(book.id)
  const rawText = (custom?.text ?? (book as unknown as { text?: string }).text ?? '') as string
  if (!rawText) throw new Error('自定义文件内容丢失，请重新上传')
  const rows = parseTextToRows(rawText, book.id, charsPerLine)
  if (rows.length === 0) throw new Error('自定义文件未解析到可显示的文本行')
  return { rows, totalChars: rawText.length, rawText }
}

export async function loadBook(book: BookMeta, charsPerLine: number = CHARS_PER_VISUAL_LINE): Promise<LoadResult> {
  const n = clampCharsPerLine(charsPerLine)
  if (book.source === 'custom') return loadCustomBook(book, n)
  const maybeCustom = getCustomBookById(book.id)
  if (maybeCustom) return loadCustomBook(maybeCustom, n)
  if (book.ext === 'pdf') return loadPdfBook(book, n)
  return loadTxtBook(book, n)
}

export const __testing = { splitIntoLines, normalizeLine, chunkLine, CHARS_PER_VISUAL_LINE }
