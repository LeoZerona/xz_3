import { DATABASE_NAME, DATABASE_VERSION, columns, createTableSql, indexName, indexes, tables, type Cell, type Row, type Table } from './schema'
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
  return `INSERT OR ${change.ifAbsent ? 'IGNORE' : 'REPLACE'} INTO "${change.table}" (${names.map((name) => field(change.table, name)).join(',')}) VALUES (${names.map((name) => sqlValue(change.row[name] ?? null)).join(',')})`
}
export function schemaSql(): string[] {
  return tables.flatMap((table) => [createTableSql(table), ...indexes(table).map((fields) =>
    `CREATE INDEX IF NOT EXISTS "idx_${table}_${indexName(fields)}" ON "${table}" (${fields.map((name) => `"${name}"`).join(',')})`)])
}

export async function openSqlite(): Promise<Database> {
  if (!plus.sqlite) throw new Error('当前 App 未包含 SQLite 模块，请在 HBuilderX 配置 SQLite 并重新打包运行基座')
  const name = DATABASE_NAME
  const path = '_doc/font-learning.db'
  const isOpen = () => plus.sqlite.isOpenDatabase({ name, path })
  const failure = (value: unknown) => new Error(`SQLite 操作失败：${value instanceof Error ? value.message : typeof value === 'object' && value !== null && 'message' in value ? String(value.message) : String(value)}`)
  // HBuilderX 重载会重置 JS 连接缓存，原生连接可能仍打开，按名称和路径确认后复用。
  if (!isOpen()) {
    try {
      await new Promise<void>((resolve, reject) => plus.sqlite.openDatabase({ name, path, success: () => resolve(), fail: (error: unknown) => reject(failure(error)) }))
    } catch (error) {
      // 检查与打开之间连接可能已就绪；只有原生确认目标连接已打开才继续。
      if (!isOpen()) throw error
    }
  }
  const execute = (sql: string[]) => new Promise<void>((resolve, reject) => plus.sqlite.executeSql({ name, sql, success: () => resolve(), fail: (error: unknown) => reject(failure(error)) }))
  // 原生桥接通过专用接口管理事务，不能假定 executeSql 的原始事务语句具有相同语义。
  const transaction = (operation: 'begin' | 'commit' | 'rollback') => new Promise<void>((resolve, reject) => plus.sqlite.transaction({ name, operation, success: () => resolve(), fail: (error: unknown) => reject(failure(error)) }))
  try {
    const version = await new Promise<number>((resolve, reject) => plus.sqlite.selectSql({ name, sql: 'PRAGMA user_version', success: (rows: unknown) => resolve(Array.isArray(rows) ? Number((rows[0] as { user_version?: unknown } | undefined)?.user_version ?? 0) : 0), fail: (error: unknown) => reject(failure(error)) }))
    if (version > DATABASE_VERSION) throw new Error('数据库来自更新版本的应用，请升级应用后重试')
    await transaction('begin')
    try {
      await execute([...schemaSql(), `PRAGMA user_version=${DATABASE_VERSION}`])
      await transaction('commit')
    } catch (error) {
      try { await transaction('rollback') } catch (rollbackError) { console.error('SQLite 初始化回滚失败', rollbackError) }
      throw error
    }
  } catch (error) {
    // 关闭也是异步操作；先等清理完成，避免立即重试时复用正在关闭的连接。
    await new Promise<void>((resolve) => plus.sqlite.closeDatabase({
      name,
      success: () => resolve(),
      fail: (closeError: unknown) => { console.error('SQLite 初始化失败后关闭连接失败', closeError); resolve() },
    }))
    throw error
  }
  let chain = Promise.resolve()
  function serialize<T>(work:()=>Promise<T>):Promise<T>{const operation=chain.then(work);chain=operation.then(()=>undefined,()=>undefined);return operation}
  const select=(table:Table,query?:Query)=>new Promise<Row[]>((resolve,reject)=>plus.sqlite.selectSql({name,sql:selectSql(table,query),success:(rows:unknown)=>{if(!Array.isArray(rows)){reject(new Error('SQLite 查询结果无效'));return}resolve(rows as Row[])},fail:(error:unknown)=>reject(failure(error))}))
  return {
    snapshot(requestedTables){return serialize(async()=>{
      await transaction('begin')
      try{const result=new Map<Table,Row[]>();for(const table of requestedTables)result.set(table,await select(table));await transaction('commit');return result}
      catch(error){try{await transaction('rollback')}catch(rollbackError){console.error('SQLite 快照回滚失败',rollbackError)}throw error}
    })},
    query(table, query) {
      return serialize(()=>select(table,query))
    },
    commit(changes) {
      if (!changes.length) return Promise.resolve()
      return serialize(async () => {
        await transaction('begin')
        try {
          for (let start = 0; start < changes.length; start += 200) await execute(changes.slice(start, start + 200).map(changeSql))
          await transaction('commit')
        } catch (error) {
          try { await transaction('rollback') } catch (rollbackError) { console.error('SQLite 回滚失败', rollbackError) }
          throw error
        }
      })
    },
    close() { plus.sqlite.closeDatabase({ name, fail: (error: unknown) => console.error('SQLite 关闭失败', error) }) },
  }
}
