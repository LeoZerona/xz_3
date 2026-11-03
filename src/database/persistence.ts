import { ref } from 'vue'
import { getDatabase } from './connection'
import { BOOKS_KEY, LEARNING_KEY, USER_TABLES, bookRows, characterRows, decodeStored, encodeStored, legacyLearning, object, setting } from './records'
import type { CharacterLearningRecord } from '../study/learningData'
import type { LevelReviewRecord } from '../study/levelReview'
import { LEVEL_REVIEW_KEY } from '../study/levelReview'
import type { Change } from './types'
import type { Row, Table } from './schema'

let initialized = false
let initialization: Promise<void> | undefined
let cache = new Map<string, unknown>()
const pending: Change[][] = []
let flushing: Promise<void> | undefined
export const persistenceError = ref('')

export function reportPersistenceError(error: unknown): void {
  persistenceError.value = error instanceof Error ? error.message : String(error)
  console.error('本地数据库操作失败', error)
}
export function readStored(key: string): unknown {
  if (initialized) return cache.get(key)
  // 初始化前只读取旧值用于初始展示，写操作必须等待数据库迁移成功。
  return typeof uni !== 'undefined' ? uni.getStorageSync(key) as unknown : undefined
}
async function legacyIndexedSettings(): Promise<Map<string, unknown>> {
  const result = new Map<string, unknown>()
  if (typeof indexedDB === 'undefined') return result
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('morning-pages', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('settings')
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('旧数据库被其他窗口占用'))
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('settings')) { db.close(); resolve(); return }
      const transaction = db.transaction('settings', 'readonly')
      const cursor = transaction.objectStore('settings').openCursor()
      cursor.onsuccess = () => { const item = cursor.result; if (item) { result.set(String(item.key), item.value as unknown); item.continue() } }
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
    }
  })
  return result
}

export function initializePersistence(): Promise<void> {
  if (initialized) return Promise.resolve()
  initialization ??= (async () => {
    const db = await getDatabase()
    const migrated = await db.query('meta', { where: { id: 'legacy-v1' } })
    if (!migrated.length) {
      const values = await legacyIndexedSettings()
      const keys = new Set<string>(typeof uni !== 'undefined' ? uni.getStorageInfoSync().keys : [])
      for (const key of keys) {
        if (!/^(font-learning|reading:|morning-pages:)/.test(key)) continue
        if (!values.has(key)) values.set(key, uni.getStorageSync(key) as unknown)
      }
      const changes: Change[] = []
      const learning = legacyLearning(values.get(LEARNING_KEY), values.get('font-learning-character-preferences'))
      values.set(LEARNING_KEY, learning)
      for (const [key, value] of values) {
        if (key === BOOKS_KEY) {
          if (!Array.isArray(value)) throw new Error('旧书籍列表格式无效，已保留原数据')
          for (const book of value) changes.push(...bookRows(book))
        } else if (value !== undefined && value !== '') changes.push(...encodeStored(key, value))
      }
      changes.push({ table: 'meta', row: { id: 'legacy-v1', value: 'complete' } })
      await db.commit(changes)
    }
    const data = new Map<Table, Row[]>()
    for (const table of USER_TABLES) data.set(table, await db.query(table))
    cache = decodeStored(data)
    initialized = true
    persistenceError.value = ''
  })().catch((error: unknown) => { initialization = undefined; reportPersistenceError(error); throw error })
  return initialization
}

function queue(changes: Change[]): void {
  pending.push(changes)
  void flushPersistence().catch(reportPersistenceError)
}
export function saveStored(key: string, value: unknown): void {
  if (!initialized) throw new Error('数据库尚未就绪，请稍后重试')
  const next = JSON.parse(JSON.stringify(value)) as unknown
  const old = encodeStored(key, cache.get(key))
  const changes = encodeStored(key, next)
  const nextIds = new Set(changes.map((change) => `${change.table}:${'row' in change ? change.row.id : change.deleteId}`))
  const previous = new Map(old.filter((change) => 'row' in change).map((change) => [`${change.table}:${change.row.id}`, JSON.stringify(change.row)]))
  const writes = changes.filter((change) => 'row' in change && previous.get(`${change.table}:${change.row.id}`) !== JSON.stringify(change.row))
  for (const change of old) if ('row' in change && change.table !== 'reading_progress' && !nextIds.has(`${change.table}:${change.row.id}`)) writes.push({ table: change.table, deleteId: change.row.id })
  cache.set(key, next)
  queue(writes)
}
export function saveCharacter(record: CharacterLearningRecord, at: string): void {
  if (!initialized) throw new Error('数据库尚未就绪，请稍后重试')
  const data = object(cache.get(LEARNING_KEY))
  const characters = object(data.characters)
  const next = JSON.parse(JSON.stringify(record)) as CharacterLearningRecord
  const old = characters[record.characterId] as CharacterLearningRecord | undefined
  const previousRows = new Map(old ? characterRows(old).flatMap((change) => 'row' in change ? [[`${change.table}:${change.row.id}`, JSON.stringify(change.row)] as const] : []) : [])
  const changes = characterRows(next).filter((change) => 'row' in change && previousRows.get(`${change.table}:${change.row.id}`) !== JSON.stringify(change.row))
  const newIds = new Set(characterRows(next).map((change) => 'row' in change ? `${change.table}:${change.row.id}` : ''))
  if (old) for (const change of characterRows(old)) if ('row' in change && !newIds.has(`${change.table}:${change.row.id}`)) changes.push({ table: change.table, deleteId: change.row.id })
  characters[record.characterId] = next
  cache.set(LEARNING_KEY, { ...data, characters, updatedAt: at })
  changes.push(setting(`${LEARNING_KEY}:meta`, { version: 2, updatedAt: at }))
  queue(changes)
}
export function saveLevelReviewRecords(records: Record<string, LevelReviewRecord>): void {
  if (!initialized) throw new Error('数据库尚未就绪，请稍后重试')
  const previous = object(cache.get(LEVEL_REVIEW_KEY))
  const changes: Change[] = []
  for (const [id, record] of Object.entries(records)) {
    const next = { ...record }
    previous[id] = next
    changes.push({ table: 'level_review', row: { id, ...next } })
  }
  cache.set(LEVEL_REVIEW_KEY, previous)
  queue(changes)
}
export function flushPersistence(): Promise<void> {
  if (flushing) return flushing
  flushing = (async () => {
    await initializePersistence()
    const db = await getDatabase()
    while (pending.length) {
      const count = pending.length
      await db.commit(pending.slice(0, count).flat())
      pending.splice(0, count)
    }
    persistenceError.value = ''
  })().finally(() => { flushing = undefined })
  return flushing
}

export function resetPersistenceForTests(): void {
  initialized = false; initialization = undefined; cache = new Map(); pending.splice(0); flushing = undefined; persistenceError.value = ''
}
export function hasPendingWrites(): boolean { return pending.length > 0 }
export function forgetBookProgress(id: string): void {
  cache.delete(`reading:progress:${encodeURIComponent(id)}`)
  if (object(cache.get('reading:progress')).bookId === id) { cache.delete('reading:progress'); cache.delete('reading:recentBookId') }
}
export async function reloadPersistence(): Promise<void> {
  await flushPersistence()
  initialized = false; initialization = undefined
  await initializePersistence()
}
