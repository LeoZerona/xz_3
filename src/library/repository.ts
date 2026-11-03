import { getDatabase } from '../database/connection'
import { flushPersistence } from '../database/persistence'
import { getBooksCatalog } from '../reading/booksCatalog'
import { readCustomBooks, removeCustomBook } from '../reading/customBooks'
import { readProgress } from '../reading/readingStorage'
import { loadBook } from '../reading/bookLoader'
import type { PdfTextExtractor } from '../reading/pdfTextBridge'
import type { BookStatus, BookSummary } from './types'

export async function listLibrary(filter: { query?: string; source?: string; status?: string; sort?: 'name' | 'recent'; limit?: number; offset?: number } = {}): Promise<BookSummary[]> {
  await flushPersistence()
  const db = await getDatabase()
  const [custom, states, annotations, storedBooks] = await Promise.all([readCustomBooks(), db.query('library_books'), db.query('annotations'), db.query('books')])
  const entries = [...getBooksCatalog(), ...custom].map((book): BookSummary => {
    const progress = readProgress(book.id); const state = states.find(row => row.id === book.id)
    return { ...book, status: state?.status === 'finished' ? 'finished' : state?.status === 'unread' ? 'unread' : progress || state?.status === 'reading' ? 'reading' : 'unread',
      textLength: Number(storedBooks.find(row => row.id === book.id)?.textLength) || 0, annotationCount: annotations.filter(row => row.bookId === book.id).length, progress }
  }).filter(book => (!filter.query || book.name.toLocaleLowerCase().includes(filter.query.trim().toLocaleLowerCase())) && (!filter.source || book.source === filter.source) && (!filter.status || book.status === filter.status))
    .sort((a,b) => filter.sort === 'name' ? a.name.localeCompare(b.name,'zh-CN') : (b.progress?.updatedAt ?? '').localeCompare(a.progress?.updatedAt ?? '') || (b.createdAt ?? 0)-(a.createdAt ?? 0))
  return entries.slice(filter.offset ?? 0, (filter.offset ?? 0)+(filter.limit ?? 50))
}
export async function readLibraryBook(id: string): Promise<BookSummary> { const books = await listLibrary({limit:10000}); const book = books.find(entry => entry.id===id); if(!book)throw new Error('图书不存在，请返回书库'); return book }
export async function readLibraryText(id: string, extractText?: PdfTextExtractor): Promise<string> {
  const book = await readLibraryBook(id)
  const result = await loadBook(book,14,extractText)
  return result.rawText ?? result.rows.map(row=>row.text).join('\n')
}
export async function setBookStatus(id: string, status: BookStatus): Promise<void> { await readLibraryBook(id); if(!['unread','reading','finished'].includes(status))throw new Error('阅读状态无效'); await (await getDatabase()).commit([{table:'library_books',row:{id,status,updatedAt:new Date().toISOString()}}]) }
export async function renameBook(id: string, name: string): Promise<void> {
  const book=await readLibraryBook(id);if(book.source!=='custom')throw new Error('内置资料名称固定，可为自定义图书重命名')
  const title=name.trim();if(!title||Array.from(title).length>80)throw new Error('书名需为 1–80 字')
  const db=await getDatabase();const row=(await db.query('books',{where:{id}}))[0]!
  await db.commit([{table:'books',row:{...row,name:title}}])
}
export async function deleteBookWithRelations(id: string): Promise<void> { const book=await readLibraryBook(id);if(book.source!=='custom')throw new Error('内置资料保留在应用资源中');await removeCustomBook(id) }
