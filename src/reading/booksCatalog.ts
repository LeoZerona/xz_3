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

// glob 兜底：仍保留，但不再强依赖资源哈希路径
const bookModules = import.meta.glob<string>('../static/books/*.{txt,pdf}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

// 内联文本：txt 直接内联，避免 fetch 在 H5 静态拷贝失败时 404
const txtRawModules = import.meta.glob<string>('../static/books/*.txt', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

const rawContentByFileName = new Map<string, string>()
for (const [path, content] of Object.entries(txtRawModules)) {
  const fileName = getFileName(path)
  rawContentByFileName.set(fileName, content)
}

export function getRawContent(fileName: string): string | undefined {
  return rawContentByFileName.get(fileName)
}

// H5 静态基路径：src/static 会被 uni 拷贝至 /static
const STATIC_BASE = '/static/books/'
const FALLBACK_FILES: Array<{ fileName: string; url: string }> = [
  { fileName: '对照阅读示例.txt', url: STATIC_BASE + encodeURI('对照阅读示例.txt') },
  { fileName: '失了老师说她全家搬去了国外再次见.txt', url: STATIC_BASE + encodeURI('失了老师说她全家搬去了国外再次见.txt') },
  { fileName: 'sample-english.pdf', url: STATIC_BASE + 'sample-english.pdf' },
]

function buildFromGlob(): BookMeta[] {
  const entries: BookMeta[] = []
  const seen = new Set<string>()
  for (const [path, url] of Object.entries(bookModules)) {
    const fileName = getFileName(path)
    const meta = createMeta(fileName, url as unknown as string)
    if (meta && !seen.has(meta.fileName)) {
      seen.add(meta.fileName)
      entries.push(meta)
    }
  }
  for (const f of FALLBACK_FILES) {
    if (seen.has(f.fileName)) continue
    const meta = createMeta(f.fileName, f.url)
    if (meta) {
      seen.add(f.fileName)
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
  return getBooksCatalog().find((b) => b.id === bookId)
}

export function getDefaultBookId(): string {
  return getBooksCatalog()[0]?.id ?? ''
}
