import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import source from '../data/character-table/first-level.json'
import type { LevelStage } from '../study/levelData'
import { useLevelActivityStore } from './levelActivity'
import { LAST_LEVEL_STUDY_KEY, readLastLevelStudy } from '../study/levelActivity'
import { setupTestDatabase } from '../database/testSupport'
import { flushPersistence, initializePersistence, readStored, resetPersistenceForTests } from '../database/persistence'

const stages: LevelStage[] = [
  { id: 'level1-stage-87', category: 'level1', index: 87, title: '关卡 87', characters: source.chars.slice(0, 10), isPlaceholder: false },
  { id: 'radical-stage-02', category: 'radical', index: 2, title: '关卡 02', characters: source.chars.slice(10, 20), isPlaceholder: false },
  { id: 'level2-stage-01', category: 'level2', index: 1, title: '关卡 01', characters: [], isPlaceholder: true },
]
vi.mock('../study/levelData', () => ({ loadStage: vi.fn(async (category: string, id: string) => stages.find((stage) => stage.category === category && stage.id === id)) }))
const record = { category: 'level1', stageId: 'level1-stage-87', index: 87, title: '关卡 87', studiedAt: '2026-11-01T01:00:00.000Z' }

describe('上次关卡选择记录', () => {
  beforeEach(() => { setActivePinia(createPinia()) })
  it.each([null, {}, { ...record, category: 'unknown' }, { ...record, stageId: 'radical-stage-87' }, { ...record, index: 1 }, { ...record, studiedAt: 'invalid' }])('拒绝失效或不一致的记录 %j', (value) => {
    expect(readLastLevelStudy(value)).toBeNull()
  })
  it('没有历史时保持空记录，不根据未完成或完成记录猜测上次关卡', async () => {
    await setupTestDatabase()
    const store = useLevelActivityStore()
    await store.hydrate()
    expect(store.lastStudiedStage).toBeNull()
  })
  it('选择即保存，跨分类更新，重启后保持且不写入学习进度', async () => {
    const db = await setupTestDatabase()
    const store = useLevelActivityStore()
    expect(store.recordSelection(stages[0]!)).toBe(true)
    expect(store.lastStudiedStage?.stageId).toBe('level1-stage-87')
    expect(store.recordSelection(stages[1]!)).toBe(true)
    expect(store.lastStudiedStage?.category).toBe('radical')
    await flushPersistence(); resetPersistenceForTests(); await initializePersistence()
    setActivePinia(createPinia())
    const restarted = useLevelActivityStore()
    await restarted.hydrate()
    expect(restarted.lastStudiedStage).toMatchObject({ stageId: 'radical-stage-02', index: 2 })
    expect(readStored(LAST_LEVEL_STUDY_KEY)).toMatchObject({ stageId: 'radical-stage-02' })
    expect(await db.query('stage_progress')).toEqual([])
    expect(await db.query('character_progress')).toEqual([])
  })
  it('兼容旧学习记录，重复打开同一预览不重复保存', async () => {
    const db = await setupTestDatabase(new Map([[LAST_LEVEL_STUDY_KEY, record]]))
    const store = useLevelActivityStore()
    await store.hydrate()
    const commit = vi.spyOn(db, 'commit')
    expect(store.recordSelection(stages[0]!)).toBe(true)
    await flushPersistence()
    expect(store.lastStudiedStage).toEqual(record)
    expect(commit).not.toHaveBeenCalled()
  })
  it('待上线、已删除关卡不成为可定位历史；显示名称从真实关卡恢复', async () => {
    await setupTestDatabase(new Map([[LAST_LEVEL_STUDY_KEY, { ...record, title: '旧名称' }]]))
    const store = useLevelActivityStore()
    await store.hydrate()
    expect(store.lastStudiedStage?.title).toBe('关卡 87')
    expect(store.recordSelection(stages[2]!)).toBe(false)
    expect(store.lastStudiedStage?.stageId).toBe('level1-stage-87')
    await setupTestDatabase(new Map([[LAST_LEVEL_STUDY_KEY, { ...record, stageId: 'level1-stage-999', index: 999 }]]))
    await store.hydrate()
    expect(store.lastStudiedStage).toBeNull()
  })
  it('保存失败不更新为未能保存的高亮记录', () => {
    resetPersistenceForTests()
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = useLevelActivityStore()
    expect(store.recordSelection(stages[0]!)).toBe(false)
    expect(store.lastStudiedStage).toBeNull()
    expect(diagnostic).toHaveBeenCalled()
    diagnostic.mockRestore()
  })
})
