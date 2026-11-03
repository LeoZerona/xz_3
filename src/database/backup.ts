import { getDatabase } from './connection'
import { flushPersistence, initializePersistence, reloadPersistence } from './persistence'
import { columns, schema, type Row, type Table } from './schema'
import { ADDITIONAL_USER_TABLES, object, USER_TABLES } from './records'
import type { Change } from './types'

const BACKUP_TABLES: Table[] = [...USER_TABLES, 'books', 'book_chunks']
interface Backup { format: 'font-learning-backup'; version: 1; createdAt: string; data: Record<string, Row[]> }
export async function exportBackup(): Promise<string> {
  await initializePersistence()
  await flushPersistence()
  const db = await getDatabase()
  const data: Record<string, Row[]> = {}
  for (const table of BACKUP_TABLES) data[table] = await db.query(table)
  const backup: Backup = { format: 'font-learning-backup', version: 1, createdAt: new Date().toISOString(), data }
  return JSON.stringify(backup)
}
function validateBackup(text: string): Map<Table, Row[]> {
  const backup = object(JSON.parse(text) as unknown)
  if (backup.format !== 'font-learning-backup' || backup.version !== 1) throw new Error('备份格式或版本不支持')
  const data = object(backup.data)
  if (Object.keys(data).some((table) => !BACKUP_TABLES.includes(table as Table))) throw new Error('备份包含未知数据表')
  const result = new Map<Table, Row[]>()
  for (const table of BACKUP_TABLES) {
    // v1 备份没有训练轮次及复习表；恢复后由历史关卡记录补齐。
    const values = data[table] ?? (['stage_training', 'stage_training_modes', 'level_review'].includes(table) || ADDITIONAL_USER_TABLES.includes(table) ? [] : undefined)
    if (!Array.isArray(values)) throw new Error(`备份缺少数据表：${table}`)
    const ids = new Set<string>()
    const rows: Row[] = []
    for (const value of values) {
      const row = object(value)
      if (typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error(`备份记录标识无效：${table}`)
      ids.add(row.id)
      if (Object.keys(row).some((name) => !columns(table).includes(name))) throw new Error(`备份字段无效：${table}`)
      for (const [name, type] of Object.entries(schema[table].columns)) {
        const cell = row[name]
        if (cell === null) continue
        if (type === 'TEXT' ? typeof cell !== 'string' : typeof cell !== 'number' || !Number.isFinite(cell) || type === 'INTEGER' && !Number.isInteger(cell)) throw new Error(`备份字段类型无效：${table}.${name}`)
      }
      if (table === 'settings') JSON.parse(String(row.value))
      rows.push(row as Row)
    }
    result.set(table, rows)
  }
  const books = new Set(result.get('books')!.map((row) => row.id))
  if (result.get('book_chunks')!.some((row) => !books.has(String(row.bookId)))) throw new Error('备份正文缺少对应书籍')
  return result
}

export async function restoreBackup(text: string): Promise<void> {
  const incoming = validateBackup(text)
  // 校验完成再执行写入；保留恢复前快照，并在同一事务内替换全部用户数据。
  const previous = await exportBackup()
  const db = await getDatabase()
  const changes: Change[] = [{ table: 'meta', row: { id: 'before-restore-backup', value: previous } }]
  for (const table of BACKUP_TABLES) {
    for (const row of await db.query(table)) changes.push({ table, deleteId: row.id })
    for (const row of incoming.get(table)!) changes.push({ table, row })
  }
  await db.commit(changes)
  await reloadPersistence()
}
