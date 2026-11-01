import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestDatabase } from './testSupport'
import { openSqlite } from './sqlite'

afterEach(() => vi.unstubAllGlobals())
function nativeBridge() {
  const backing = createTestDatabase()
  const closeDatabase = vi.fn()
  vi.stubGlobal('plus', { sqlite: {
    openDatabase(options: PlusSqliteOpenDatabaseOptions) { options.success?.(undefined) },
    executeSql(options: PlusSqliteExecuteSqlOptions) {
      queueMicrotask(() => {
        try { for (const sql of options.sql ?? []) backing.native.exec(sql); options.success?.(undefined) }
        catch (error) { options.fail?.(error) }
      })
    },
    selectSql(options: PlusSqliteSelectSqlOptions) {
      try { options.success?.(backing.native.prepare(options.sql!).all()) } catch (error) { options.fail?.(error) }
    },
    closeDatabase,
  } })
  return { backing, closeDatabase }
}
describe('App SQLite 桥接', () => {
  it('串行提交事务，查询等待提交完成，并保留特殊文本', async () => {
    nativeBridge()
    const db = await openSqlite()
    const first = db.commit([{ table: 'settings', row: { id: 'value', value: "一\u0000O'Reilly" } }])
    const second = db.commit([{ table: 'settings', row: { id: 'second', value: '二' } }])
    expect(await db.query('settings', { where: { id: 'value' } })).toEqual([{ id: 'value', value: "一\u0000O'Reilly" }])
    await Promise.all([first, second])
    expect(await db.query('settings')).toHaveLength(2)
    await expect(db.commit([{ table: 'settings', row: { id: 'bad', value: NaN } }])).rejects.toThrow('数据库数值无效')
    expect(await db.query('settings', { where: { id: 'bad' } })).toHaveLength(0)
  })
  it('拒绝比应用更新的数据库，并释放连接', async () => {
    const { backing, closeDatabase } = nativeBridge()
    backing.native.exec('PRAGMA user_version=2')
    await expect(openSqlite()).rejects.toThrow('请升级应用')
    expect(closeDatabase).toHaveBeenCalled()
  })
  it('未打包 SQLite 模块时给出可诊断错误', async () => {
    vi.stubGlobal('plus', {})
    await expect(openSqlite()).rejects.toThrow('未包含 SQLite 模块')
  })
})
