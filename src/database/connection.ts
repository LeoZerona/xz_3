import { openIndexedDb } from './indexedDb'
import { openSqlite } from './sqlite'
import type { Database } from './types'

let connection: Promise<Database> | undefined
export function getDatabase(): Promise<Database> {
  connection ??= (typeof plus !== 'undefined' ? openSqlite() : typeof indexedDB !== 'undefined' ? openIndexedDb() : Promise.reject(new Error('当前环境不支持本地数据库')))
    .catch((error: unknown) => { connection = undefined; throw error })
  return connection
}

/** 测试注入真实 SQLite 内存连接，不改变生产平台选择。 */
export function setDatabaseForTests(database: Database): void { connection = Promise.resolve(database) }
