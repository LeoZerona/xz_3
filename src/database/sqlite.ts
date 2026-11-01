import { DATABASE_VERSION, columns, createTableSql, indexName, indexes, tables, type Cell, type Row, type Table } from './schema'
import type { Change, Database, Query } from './types'

export function sqlValue(value: Cell): string {
  if (value === null) return 'NULL'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('数据库数值无效')
    return String(value)
  }
  // plus.sqlite 没有绑定参数接口；所有值在这一处转义，列名仅允许来自固定 schema。
  return value.split('\u0000').map((part) => `'${part.replace(/'/g, "''")}'`).join('||char(0)||')
}
function field(table: Table, name: string): string {
  if (!columns(table).includes(name)) throw new Error(`未知数据库字段：${name}`)
  return `"${name}"`
}
export function selectSql(table: Table, query: Query = {}): string {
  let sql = `SELECT * FROM "${table}"`
  const conditions = Object.entries(query.where ?? {}).map(([name, value]) => `${field(table, name)} IS ${sqlValue(value)}`)
  for (const [name, values] of Object.entries(query.whereIn ?? {})) conditions.push(values.length ? `${field(table, name)} IN (${values.map(sqlValue).join(',')})` : '0')
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`
  if (query.orderBy) sql += ` ORDER BY ${field(table, query.orderBy)} ${query.descending ? 'DESC' : 'ASC'}`
  if (query.limit !== undefined || query.offset !== undefined) sql += ` LIMIT ${Math.max(-1, Math.trunc(query.limit ?? -1))} OFFSET ${Math.max(0, Math.trunc(query.offset ?? 0))}`
  return sql
}
export function changeSql(change: Change): string {
  if ('deleteId' in change) return `DELETE FROM "${change.table}" WHERE id=${sqlValue(change.deleteId)}`
  const names = columns(change.table)
  return `INSERT OR REPLACE INTO "${change.table}" (${names.map((name) => field(change.table, name)).join(',')}) VALUES (${names.map((name) => sqlValue(change.row[name] ?? null)).join(',')})`
}
export function schemaSql(): string[] {
  return tables.flatMap((table) => [createTableSql(table), ...indexes(table).map((fields) =>
    `CREATE INDEX IF NOT EXISTS "idx_${table}_${indexName(fields)}" ON "${table}" (${fields.map((name) => `"${name}"`).join(',')})`)])
}

export async function openSqlite(): Promise<Database> {
  if (!plus.sqlite) throw new Error('当前 App 未包含 SQLite 模块，请在 HBuilderX 配置 SQLite 并重新打包运行基座')
  const name = 'font-learning'
  const failure = (value: unknown) => new Error(`SQLite 操作失败：${value instanceof Error ? value.message : typeof value === 'object' && value !== null && 'message' in value ? String(value.message) : String(value)}`)
  await new Promise<void>((resolve, reject) => plus.sqlite.openDatabase({ name, path: '_doc/font-learning.db', success: () => resolve(), fail: (error: unknown) => reject(failure(error)) }))
  const execute = (sql: string[]) => new Promise<void>((resolve, reject) => plus.sqlite.executeSql({ name, sql, success: () => resolve(), fail: (error: unknown) => reject(failure(error)) }))
  try {
    const version = await new Promise<number>((resolve, reject) => plus.sqlite.selectSql({ name, sql: 'PRAGMA user_version', success: (rows: unknown) => resolve(Array.isArray(rows) ? Number((rows[0] as { user_version?: unknown } | undefined)?.user_version ?? 0) : 0), fail: (error: unknown) => reject(failure(error)) }))
    if (version > DATABASE_VERSION) throw new Error('数据库来自更新版本的应用，请升级应用后重试')
    await execute(['BEGIN IMMEDIATE', ...schemaSql(), `PRAGMA user_version=${DATABASE_VERSION}`, 'COMMIT'])
  } catch (error) { plus.sqlite.closeDatabase({ name }); throw error }
  let chain = Promise.resolve()
  return {
    query(table, query) {
      return chain.then(() => new Promise<Row[]>((resolve, reject) => plus.sqlite.selectSql({ name, sql: selectSql(table, query), success: (rows: unknown) => {
        if (!Array.isArray(rows)) { reject(new Error('SQLite 查询结果无效')); return }
        resolve(rows as Row[])
      }, fail: (error: unknown) => reject(failure(error)) })))
    },
    commit(changes) {
      const operation = chain.then(async () => {
        await execute(['BEGIN IMMEDIATE'])
        try {
          for (let start = 0; start < changes.length; start += 200) await execute(changes.slice(start, start + 200).map(changeSql))
          await execute(['COMMIT'])
        } catch (error) {
          try { await execute(['ROLLBACK']) } catch (rollbackError) { console.error('SQLite 回滚失败', rollbackError) }
          throw error
        }
      })
      chain = operation.catch(() => { /* 单次失败交给调用方，连接队列仍可接受重试。 */ })
      return operation
    },
    close() { plus.sqlite.closeDatabase({ name, fail: (error: unknown) => console.error('SQLite 关闭失败', error) }) },
  }
}
