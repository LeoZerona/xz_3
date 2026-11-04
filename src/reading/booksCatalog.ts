import type { BookFileType, BookMeta } from "./types"

// 资源路径使用 ASCII；保留原始文件名以延续书籍 ID、阅读进度和书签关联。
const BUILTIN_BOOK_FILE_NAMES: Readonly<Record<string, string>> = {
  'a-jin-gu-niang-1.txt': '(阿)(槿)(姑)(娘)1.txt',
  'a-man-1.txt': '(阿)(满)1.txt',
  'a-ming-a-ming-1.txt': '(阿)(茗)(阿)(茗)1.txt',
  'a-wan-a-wan-1.txt': '(阿)(婉)(阿)(婉)1.txt',
  'zeng-guofan-family-letters.pdf': '《曾国藩家书》全集.pdf',
}

function getFileName(path: string): string {
  const fileName = path.split("/").pop() ?? path
  return BUILTIN_BOOK_FILE_NAMES[fileName] ?? fileName
}

function getExt(fileName: string): BookFileType | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".txt")) return "txt"
  if (lower.endsWith(".pdf")) return "pdf"
  return null
}

function toBookId(fileName: string): string {
  return fileName.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "") || "book"
}

function createMeta(fileName: string, url: string): BookMeta | null {
  const ext = getExt(fileName)
  if (!ext) return null
  const name = fileName.replace(/\.(txt|pdf)$/i, "")
  return {
    id: toBookId(fileName),
    name,
    fileName,
    ext,
    url,
    source: "builtin",
  }
}

// 只聚合资源 URL，不内联文本，保留原始字节供加载器识别 UTF-8 / GB18030。
const bookModules = import.meta.glob<string>("../static/books/*.{txt,pdf}", {
  eager: true,
  import: "default",
  query: "?url",
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
  entries.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
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
  return getBooksCatalog()[0]?.id ?? ""
}
