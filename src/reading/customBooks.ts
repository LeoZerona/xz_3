import type { BookMeta } from './types'
import { getDatabase } from '../database/connection'
import { forgetBookProgress, initializePersistence, readStored } from '../database/persistence'
import { bookRows } from '../database/records'
import type { Change } from '../database/types'

export const CUSTOM_BOOKS_KEY = 'reading:customBooks'
export interface CustomBookRecord extends BookMeta { source: 'custom'; createdAt: number; text?: string }

/** 书架只读取元信息，不加载正文。 */
export async function readCustomBooks(): Promise<CustomBookRecord[]> {
  await initializePersistence()
  const db = await getDatabase()
  return (await db.query('books', { where: { source: 'custom' }, orderBy: 'position' })).map((row) => ({ id: row.id, name: String(row.name), fileName: String(row.fileName), ext: row.ext === 'pdf' ? 'pdf' : 'txt', url: String(row.url), source: 'custom', createdAt: Number(row.createdAt) }))
}
export async function getCustomBookById(id: string): Promise<CustomBookRecord | undefined> {
  await initializePersistence()
  const db = await getDatabase()
  const row = (await db.query('books', { where: { id } }))[0]
  return row ? { id: row.id, name: String(row.name), fileName: String(row.fileName), ext: row.ext === 'pdf' ? 'pdf' : 'txt', url: String(row.url), source: 'custom', createdAt: Number(row.createdAt) } : undefined
}
export async function readBookChunks(bookId: string, offset = 0, limit = 8): Promise<{ text: string; hasMore: boolean }> {
  await initializePersistence()
  const db = await getDatabase()
  const rows = await db.query('book_chunks', { where: { bookId }, orderBy: 'position', offset, limit: limit + 1 })
  return { text: rows.slice(0, limit).map((row) => String(row.text)).join(''), hasMore: rows.length > limit }
}
export async function readCustomBookText(id: string): Promise<string> {
  let text = ''
  // 现有阅读器按全文测量分页；数据库分批读取，书架和其他书籍不承担正文开销。
  for (let offset = 0; ; offset += 8) { const chunk = await readBookChunks(id, offset); text += chunk.text; if (!chunk.hasMore) return text }
}
export async function addCustomBook(record: CustomBookRecord & { text: string }): Promise<void> {
  await initializePersistence()
  const db = await getDatabase()
  const previous = await db.query('book_chunks', { where: { bookId: record.id } })
  const deletions: Change[] = previous.map((row) => ({ table: 'book_chunks', deleteId: row.id }))
  await db.commit([...deletions, ...bookRows(record)])
}
export async function removeCustomBook(id: string): Promise<void> {
  await initializePersistence()
  const db = await getDatabase()
  const chunks = await db.query('book_chunks', { where: { bookId: id } })
  const annotations = await db.query('annotations', { where: { bookId: id } })
  const changes: Change[] = [{ table: 'books', deleteId: id }, { table: 'reading_progress', deleteId: id }, { table: 'library_books', deleteId: id }, ...chunks.map((row): Change => ({ table: 'book_chunks', deleteId: row.id })), ...annotations.map((row): Change => ({ table: 'annotations', deleteId: row.id }))]
  if (readStored('reading:recentBookId') === id) changes.push({ table: 'settings', deleteId: 'reading:recentBookId' })
  await db.commit(changes)
  forgetBookProgress(id)
}
export function generateCustomId(fileName: string): string {
  const base = fileName.toLowerCase().replace(/\.(txt|pdf)$/i, '').replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '') || 'custom'
  return `${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
export function createCustomRecord(fileName: string, text: string, ext: 'txt' | 'pdf'): CustomBookRecord & { text: string } {
  return { id: generateCustomId(fileName), name: fileName.replace(/\.(txt|pdf)$/i, ''), fileName, ext, url: '', source: 'custom', createdAt: Date.now(), text }
}
