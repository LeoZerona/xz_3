import type { BookFileType, BookMeta } from './types'

function getFileName(path: string): string {
  return path.split('/').pop() ?? path
}

function getExt(fileName: string): BookFileType | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.txt')) return 'txt'
  if (lower.endsWith('.pdf')) return 'pdf'
  return null
}

function toBookId(fileName: string): string {
  return fileName.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '') || 'book'
}

function createMeta(fileName: string, url: string): BookMeta | null {
  const ext = getExt(fileName)
  if (!ext) return null
  const name = fileName.replace(/\.(txt|pdf)$/i, '')
  return {
    id: toBookId(fileName),
    name,
    fileName,
    ext,
    url,
  }
}

// 只聚合资源 URL，不内联文本，保留原始字节供加载器识别 UTF-8 / GB18030。
const bookModules = import.meta.glob<string>('../static/books/*.{txt,pdf}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

function buildFromGlob(): BookMeta[] {
  const entries: BookMeta[] = []
  const seen = new Set<string>()
  for (const [path, url] of Object.entries(bookModules)) {
    const fileName = getFileName(path)
    const meta = createMeta(fileName, url)
    if (meta && !seen.has(meta.fileName)) {
      seen.add(meta.fileName)
      entries.push(meta)
    }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return entries
}

let cachedCatalog: BookMeta[] | null = null

export function getBooksCatalog(): BookMeta[] {
  if (cachedCatalog) return cachedCatalog
  cachedCatalog = buildFromGlob()
  return cachedCatalog
}

export function getBookById(bookId: string): BookMeta | undefined {
  return getBooksCatalog().find((book) => book.id === bookId)
}

export function getDefaultBookId(): string {
  return getBooksCatalog()[0]?.id ?? ''
}
