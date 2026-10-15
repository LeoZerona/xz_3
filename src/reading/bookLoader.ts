import type { BookMeta, LoadResult, ReadingRow } from './types'
import { getRawContent } from './booksCatalog'

function normalizeLine(raw: string): string {
  return raw.replace(/\uFEFF/g, '').replace(/\s+$/g, '').trim()
}

function splitIntoLines(text: string): string[] {
  const rawLines = text.split(/\r?\n/)
  const lines: string[] = []
  let emptyStreak = 0
  for (const raw of rawLines) {
    const line = normalizeLine(raw)
    if (line.length === 0) {
      emptyStreak += 1
      if (emptyStreak === 1) {
        continue
      }
      continue
    }
    emptyStreak = 0
    if (line.length > 120) {
      const segments = splitLongLine(line, 90)
      for (const seg of segments) lines.push(seg)
    } else {
      lines.push(line)
    }
  }
  return lines
}

function splitLongLine(line: string, maxLen: number): string[] {
  const result: string[] = []
  let cursor = 0
  const punct = /[，。！？；：,.!?;:]/ 
  while (cursor < line.length) {
    let end = Math.min(cursor + maxLen, line.length)
    if (end < line.length) {
      let pivot = -1
      for (let idx = end; idx > cursor + maxLen * 0.6; idx -= 1) {
        if (punct.test(line[idx] ?? '')) {
          pivot = idx + 1
          break
        }
      }
      if (pivot !== -1) end = pivot
    }
    result.push(line.slice(cursor, end).trim())
    cursor = end
  }
  return result.filter(Boolean)
}

export function parseTextToRows(text: string, bookId: string): ReadingRow[] {
  const lines = splitIntoLines(text)
  return lines.map((line, idx) => ({
    id: bookId + '-' + String(idx + 1),
    index: idx + 1,
    text: line,
  }))
}

export async function loadTxtBook(book: BookMeta): Promise<LoadResult> {
  // 优先使用构建时内联的 raw 内容，避免 H5 静态资源拷贝或中文路径编码导致的 404
  const inline = getRawContent(book.fileName)
  if (inline !== undefined) {
    const rows = parseTextToRows(inline, book.id)
    return { rows, totalChars: inline.length }
  }
  const response = await fetch(book.url)
  if (!response.ok) throw new Error('加载文本失败：' + String(response.status))
  let text = ''
  try {
    text = await response.text()
  } catch {
    const buf = await response.arrayBuffer()
    try {
      text = new TextDecoder('utf-8').decode(buf)
    } catch {
      text = new TextDecoder('gbk').decode(buf)
    }
  }
  if (text.includes('\uFFFD') && text.length > 0) {
    try {
      const buf = await (await fetch(book.url)).arrayBuffer()
      const gbkText = new TextDecoder('gbk').decode(buf)
      if (gbkText.length > text.length * 0.8) text = gbkText
    } catch {}
  }
  const rows = parseTextToRows(text, book.id)
  return { rows, totalChars: text.length }
}

export async function loadPdfBook(book: BookMeta): Promise<LoadResult> {
  let pdfjs: unknown
  try {
    // @ts-ignore - optional dependency, lazy loaded at runtime
    pdfjs = await import('pdfjs-dist')
  } catch {
    throw new Error('PDF 解析依赖未安装，请在项目中执行 pnpm add pdfjs-dist 后重试，或将 PDF 转为 TXT 使用')
  }
  const pdfModule = pdfjs as Record<string, unknown>
  const getDocument = (pdfModule['getDocument'] ?? (pdfModule['default'] as Record<string, unknown>)?.['getDocument']) as
    | ((src: unknown) => { promise: Promise<unknown> })
    | undefined
  if (!getDocument) throw new Error('PDF 解析器初始化失败')

  const version = (pdfModule['version'] as string | undefined) ?? (pdfModule['default'] as Record<string, unknown>)?.['version'] as string | undefined
  const GlobalWorkerOptions = (pdfModule['GlobalWorkerOptions'] as { workerSrc?: string } | undefined)
    ?? ((pdfModule['default'] as Record<string, unknown>)?.['GlobalWorkerOptions'] as { workerSrc?: string } | undefined)
  if (GlobalWorkerOptions && !GlobalWorkerOptions.workerSrc) {
    try {
      // @ts-ignore - optional worker url
      const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url')
      GlobalWorkerOptions.workerSrc = (worker as { default: string }).default
    } catch {
      if (version) GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + version + '/build/pdf.worker.mjs'
    }
  }

  const data = await (await fetch(book.url)).arrayBuffer()
  const doc = await getDocument({ data }).promise as {
    numPages: number
    getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string }> }> }>
  }
  const lines: string[] = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const texts = content.items.map((it) => it.str).filter(Boolean)
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

export const __testing = { splitIntoLines, splitLongLine, normalizeLine }
