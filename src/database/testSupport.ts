import { afterEach, vi } from 'vitest'
import { setDatabaseForTests } from './connection'
import { changeSql, schemaSql, selectSql } from './sqlite'
import { flushPersistence, hasPendingWrites, initializePersistence, resetPersistenceForTests } from './persistence'
import type { Row } from './schema'
import type { Database } from './types'

interface SqliteConnection { exec(sql: string): void; prepare(sql: string): { all(): unknown[] }; close(): void }
// Node 24 自带 SQLite；按本地接口加载，生产应用不依赖 Node 类型或运行时。
const nodeRuntime = globalThis as unknown as { process: { getBuiltinModule(name: string): unknown } }
const { DatabaseSync } = nodeRuntime.process.getBuiltinModule('node:sqlite') as { DatabaseSync: new (path: string) => SqliteConnection }
const connections: SqliteConnection[] = []
afterEach(async () => { if (hasPendingWrites()) await flushPersistence(); resetPersistenceForTests(); for (const connection of connections.splice(0)) connection.close() })

export function createTestDatabase(): Database & { native: SqliteConnection; failNextCommit: boolean } {
  const native = new DatabaseSync(':memory:')
  connections.push(native)
  for (const sql of schemaSql()) native.exec(sql)
  const db = {
    native, failNextCommit: false,
    async query(table, query) { return native.prepare(selectSql(table, query)).all() as Row[] },
    async commit(changes) {
      if (db.failNextCommit) { db.failNextCommit = false; throw new Error('模拟磁盘写入失败') }
      native.exec('BEGIN')
      try { for (const change of changes) native.exec(changeSql(change)); native.exec('COMMIT') }
      catch (error) { native.exec('ROLLBACK'); throw error }
    },
    close() { /* 统一在 afterEach 释放连接，避免测试重复关闭。 */ },
  } satisfies Database & { native: SqliteConnection; failNextCommit: boolean }
  return db
}
export async function setupTestDatabase(storage = new Map<string, unknown>()) {
  resetPersistenceForTests()
  const current = typeof uni === 'undefined' ? {} : uni
  vi.stubGlobal('uni', { ...current, getStorageSync: (key: string) => storage.get(key), getStorageInfoSync: () => ({ keys: [...storage.keys()] }) })
  const db = createTestDatabase()
  setDatabaseForTests(db)
  await initializePersistence()
  return db
}
