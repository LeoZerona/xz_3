import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestDatabase } from './testSupport'
import { openSqlite } from './sqlite'
import { DATABASE_VERSION } from './schema'

afterEach(() => vi.unstubAllGlobals())
function nativeBridge(initiallyOpen = false) {
  const backing = createTestDatabase()
  let isOpen = initiallyOpen
  const isOpenDatabase = vi.fn((options: PlusSqliteIsOpenDatabaseOptions) =>
    isOpen && options.name === 'font-learning' && options.path === '_doc/font-learning.db')
  const openDatabase = vi.fn((options: PlusSqliteOpenDatabaseOptions) => {
    queueMicrotask(() => {
      if (isOpen) { options.fail?.({ code: -1402, message: 'Same Name Already Open,https://ask.dcloud.net.cn/article/282' }); return }
      isOpen = true
      options.success?.(undefined)
    })
  })
  const closeDatabase = vi.fn((options: PlusSqliteCloseDatabaseOptions) => {
    queueMicrotask(() => { isOpen = false; options.success?.(undefined) })
  })
  vi.stubGlobal('plus', { sqlite: {
    isOpenDatabase,
    openDatabase,
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
  return { backing, isOpenDatabase, openDatabase, closeDatabase }
}
describe('App SQLite 桥接', () => {
  it('从版本 1 升级时新增训练与复习表并保留原关卡进度', async () => {
    const { backing } = nativeBridge()
    backing.native.exec('DROP TABLE stage_training; DROP TABLE stage_training_modes; DROP TABLE level_review; PRAGMA user_version=1')
    await backing.commit([{ table: 'stage_progress', row: { id: 'level1-stage-01', completed: 1, updatedAt: null } }])
    const db = await openSqlite()
    expect(await db.query('stage_progress')).toMatchObject([{ id: 'level1-stage-01', completed: 1 }])
    expect(await db.query('stage_training')).toEqual([])
    expect(await db.query('stage_training_modes')).toEqual([])
    expect(await db.query('level_review')).toEqual([])
  })
  it('复用热重载前已打开的原生连接，保留原有数据', async () => {
    const { backing, openDatabase, closeDatabase } = nativeBridge(true)
    await backing.commit([{ table: 'settings', row: { id: 'saved', value: '学习进度' } }])
    const db = await openSqlite()
    expect(await db.query('settings')).toEqual([{ id: 'saved', value: '学习进度' }])
    await db.commit([{ table: 'settings', row: { id: 'next', value: '继续学习' } }])
    expect(await db.query('settings')).toHaveLength(2)
    expect(openDatabase).not.toHaveBeenCalled()
    expect(closeDatabase).not.toHaveBeenCalled()
  })
  it('重新初始化连接时不重复打开同名数据库', async () => {
    const { openDatabase } = nativeBridge()
    const first = await openSqlite()
    await first.commit([{ table: 'settings', row: { id: 'saved', value: '学习进度' } }])
    const second = await openSqlite()
    expect(await second.query('settings')).toEqual([{ id: 'saved', value: '学习进度' }])
    expect(openDatabase).toHaveBeenCalledTimes(1)
  })
  it('检查后连接已被打开时，重新确认名称和路径并继续初始化', async () => {
    const { isOpenDatabase, openDatabase } = nativeBridge(true)
    isOpenDatabase.mockReturnValueOnce(false)
    const db = await openSqlite()
    expect(await db.query('settings')).toEqual([])
    expect(openDatabase).toHaveBeenCalledTimes(1)
    expect(isOpenDatabase).toHaveBeenLastCalledWith({ name: 'font-learning', path: '_doc/font-learning.db' })
  })
  it('打开失败且目标连接不存在时保留错误，并允许重试', async () => {
    const { openDatabase, closeDatabase } = nativeBridge()
    openDatabase.mockImplementationOnce((options) => options.fail?.({ code: -1404, message: '模拟磁盘不可写' }))
    await expect(openSqlite()).rejects.toThrow('模拟磁盘不可写')
    expect(closeDatabase).not.toHaveBeenCalled()
    const db = await openSqlite()
    expect(await db.query('settings')).toEqual([])
    expect(openDatabase).toHaveBeenCalledTimes(2)
  })
  it('同名连接并非目标路径时，不把重名错误当作成功', async () => {
    const { isOpenDatabase } = nativeBridge(true)
    isOpenDatabase.mockReturnValue(false)
    await expect(openSqlite()).rejects.toThrow('Same Name Already Open')
  })
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
    backing.native.exec(`PRAGMA user_version=${DATABASE_VERSION + 1}`)
    await expect(openSqlite()).rejects.toThrow('请升级应用')
    expect(closeDatabase).toHaveBeenCalled()
  })
  it('初始化失败等待原生连接关闭后才返回，随后可以重试', async () => {
    const { backing, openDatabase, closeDatabase } = nativeBridge()
    backing.native.exec(`PRAGMA user_version=${DATABASE_VERSION + 1}`)
    const close = closeDatabase.getMockImplementation()!
    let finishClose: (() => void) | undefined
    closeDatabase.mockImplementationOnce((options) => { finishClose = () => close(options) })
    const settled = vi.fn()
    const opening = openSqlite().catch((error: unknown) => { settled(); throw error })
    const rejection = expect(opening).rejects.toThrow('请升级应用')
    await vi.waitFor(() => expect(closeDatabase).toHaveBeenCalledTimes(1))
    try { expect(settled).not.toHaveBeenCalled() }
    finally { finishClose!(); await rejection }
    backing.native.exec('PRAGMA user_version=1')
    const db = await openSqlite()
    expect(await db.query('settings')).toEqual([])
    expect(openDatabase).toHaveBeenCalledTimes(2)
  })
  it('未打包 SQLite 模块时给出可诊断错误', async () => {
    vi.stubGlobal('plus', {})
    await expect(openSqlite()).rejects.toThrow('未包含 SQLite 模块')
  })
})
