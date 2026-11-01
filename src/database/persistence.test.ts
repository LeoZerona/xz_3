import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createTestDatabase, setupTestDatabase } from './testSupport'
import { setDatabaseForTests } from './connection'
import { flushPersistence, initializePersistence, readStored, resetPersistenceForTests, saveStored } from './persistence'
import { useCharacterLearningStore } from '../stores/characterLearning'
import { addCustomBook, readBookChunks, readCustomBooks, readCustomBookText, removeCustomBook } from '../reading/customBooks'
import { changeSql, selectSql, sqlValue } from './sqlite'
import { compound } from './records'

afterEach(() => vi.unstubAllGlobals())
describe('本地数据库迁移与持久化', () => {
  it('迁移旧数据后按记录保存，重启不再读取旧 Storage', async () => {
    const legacy = new Map<string, unknown>([
      ['font-learning-character-preferences', { favoriteIds: ['char-0001'], excludedIds: ['char-0002'] }],
      ['font-learning-daily-progress:2026-10-31', { assignedIds: ['char-0002', 'char-0001'], learnedIds: ['char-0001'], studySeconds: 65 }],
      ['font-learning-level-progress', { completedStageIds: ['level1-stage-01'], stageCharacterCompleted: { 'level1-stage-01': ['char-0001'] } }],
      ['reading:progress', { bookId: 'book', page: 7, rowsPerPage: 10, characterOffset: 123, tableStyleId: 'light-grid', updatedAt: '2026-10-31T00:00:00.000Z' }],
    ])
    const original = JSON.stringify([...legacy])
    const db = await setupTestDatabase(legacy)
    expect(await db.query('character_progress')).toHaveLength(2)
    expect(await db.query('character_mode_progress')).toHaveLength(6)
    expect(readStored('font-learning-daily-progress:2026-10-31')).toMatchObject({ assignedIds: ['char-0002', 'char-0001'], learnedIds: ['char-0001'], studySeconds: 65 })
    expect((await db.query('reading_progress'))[0]).toMatchObject({ id: 'book', characterOffset: 123 })
    setActivePinia(createPinia())
    const store = useCharacterLearningStore()
    const commit = vi.spyOn(db, 'commit')
    store.recordModeAttempt('char-0001', 'seal-to-reference-choice', true)
    await flushPersistence()
    expect(commit.mock.calls.flatMap(([changes]) => changes).filter((change) => change.table === 'character_progress')).toEqual([expect.objectContaining({ row: expect.objectContaining({ id: 'char-0001' }) })])
    expect(JSON.stringify([...legacy])).toBe(original)
    resetPersistenceForTests()
    await initializePersistence()
    setActivePinia(createPinia())
    expect(useCharacterLearningStore().getRecord('char-0001')?.modes['seal-to-reference-choice'].attempts).toBe(1)
    expect(await db.query('character_actions')).toHaveLength(1)
  })

  it('迁移失败不写完成标记，保留旧数据并允许重试', async () => {
    const legacy = { favoriteIds: ['char-0001'] }
    vi.stubGlobal('uni', { getStorageInfoSync: () => ({ keys: ['font-learning-character-preferences'] }), getStorageSync: () => legacy })
    resetPersistenceForTests()
    const db = createTestDatabase()
    setDatabaseForTests(db)
    db.failNextCommit = true
    await expect(initializePersistence()).rejects.toThrow('模拟磁盘写入失败')
    expect(await db.query('meta', { where: { id: 'legacy-v1' } })).toHaveLength(0)
    expect(await db.query('character_progress')).toHaveLength(0)
    expect(legacy.favoriteIds).toEqual(['char-0001'])
    await initializePersistence()
    expect(await db.query('character_progress')).toHaveLength(1)
    resetPersistenceForTests()
    await initializePersistence()
    expect(await db.query('character_progress')).toHaveLength(1)
  })

  it('重置关卡删除关联字记录，但保留长期学习记录', async () => {
    const db = await setupTestDatabase()
    saveStored('font-learning-level-progress', { completedStageIds: ['level1-stage-01'], stageCharacterCompleted: { 'level1-stage-01': ['char-0001'] } })
    await flushPersistence()
    saveStored('font-learning-level-progress', { completedStageIds: [], stageCharacterCompleted: {} })
    await flushPersistence()
    expect(await db.query('stage_progress')).toHaveLength(0)
    expect(await db.query('stage_character_progress')).toHaveLength(0)
  })

  it('书架不读取正文，分块保存可完整恢复代理对并删除关联数据', async () => {
    const db = await setupTestDatabase()
    const text = '一'.repeat(16383) + '𠮷' + '乙'.repeat(20000)
    await addCustomBook({ id: 'book', name: '书籍', fileName: '书籍.txt', ext: 'txt', url: '', source: 'custom', createdAt: 1, text })
    expect((await readCustomBooks())[0]).not.toHaveProperty('text')
    expect(await db.query('book_chunks')).toHaveLength(3)
    expect(await readCustomBookText('book')).toBe(text)
    expect(await readBookChunks('book', 0, 1)).toEqual({ text: '一'.repeat(16383), hasMore: true })
    await addCustomBook({ id: 'book', name: '新版', fileName: '书籍.txt', ext: 'txt', url: '', source: 'custom', createdAt: 1, text: '短文' })
    expect(await db.query('book_chunks')).toHaveLength(1)
    expect(await readCustomBookText('book')).toBe('短文')
    await removeCustomBook('book')
    expect(await db.query('books')).toHaveLength(0)
    expect(await db.query('book_chunks')).toHaveLength(0)
  })

  it('SQL 值转义保留引号，组合键不会碰撞，失败事务完整回滚', async () => {
    const db = await setupTestDatabase()
    saveStored('font-learning-test', "O'Reilly'); DROP TABLE characters; --")
    await flushPersistence()
    resetPersistenceForTests(); await initializePersistence()
    expect(readStored('font-learning-test')).toBe("O'Reilly'); DROP TABLE characters; --")
    expect(compound('a:b', 'c')).not.toBe(compound('a', 'b:c'))
    expect(sqlValue("' OR 1=1")).toBe("''' OR 1=1'")
    expect(() => selectSql('characters', { orderBy: 'id; DROP TABLE meta' })).toThrow('未知数据库字段')
    await expect(db.commit([{ table: 'settings', row: { id: 'rollback', value: 'first' } }, { table: 'settings', row: { id: 'invalid', value: NaN } }])).rejects.toThrow('数据库数值无效')
    expect(await db.query('settings', { where: { id: 'rollback' } })).toHaveLength(0)
    expect(changeSql({ table: 'settings', deleteId: 'not-found' })).toContain('DELETE FROM')
  })

  it('关卡和书籍查询使用过滤与排序的组合索引', async () => {
    const db = await setupTestDatabase()
    for (const [table, query] of [['level_characters', { where: { levelId: 'level1-stage-01' }, orderBy: 'position' }], ['book_chunks', { where: { bookId: 'book' }, orderBy: 'position' }]] as const) {
      const plan = db.native.prepare(`EXPLAIN QUERY PLAN ${selectSql(table, query)}`).all()
      expect(JSON.stringify(plan)).toContain(`idx_${table}`)
      expect(JSON.stringify(plan)).not.toContain('USE TEMP B-TREE')
    }
  })
})
