import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setupTestDatabase } from '../database/testSupport'
import { flushPersistence, initializePersistence, resetPersistenceForTests } from '../database/persistence'
import { createReviewRecord, orderReviewIds, reviewAnswer, REVIEW_INTERVALS_MS } from '../study/levelReview'
import { useLevelReviewStore } from './levelReview'
import { LEVEL_PROGRESS_STORAGE_KEY } from './levelProgress'
import { listMistakes } from '../review/mistakes'

const at = '2026-11-01T01:00:00.000Z'
describe('关卡复习排期与恢复', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('认识延长间隔，不认识回到五分钟；多次学习不重置排期', async () => {
    await setupTestDatabase()
    const store = useLevelReviewStore()
    store.registerCharacters(['one'], at)
    store.answer('one', true, at)
    expect(store.records.one?.step).toBe(1)
    expect(Date.parse(store.records.one!.dueAt) - Date.parse(at)).toBe(REVIEW_INTERVALS_MS[1])
    store.registerCharacters(['one'], new Date().toISOString())
    expect(store.records.one?.reviewCount).toBe(1)
    store.answer('one', false, at)
    expect(store.records.one).toMatchObject({ step: 0, reviewCount: 2, forgottenCount: 1 })
    expect(Date.parse(store.records.one!.dueAt) - Date.parse(at)).toBe(REVIEW_INTERVALS_MS[0])
  })
  it('大量新字和反复遗忘的字不会挤掉更早到期的旧字', () => {
    const old = createReviewRecord('2026-10-01T00:00:00.000Z')
    const forgotten = reviewAnswer(createReviewRecord(at), false, at)
    const records = { old, forgotten, ...Object.fromEntries(Array.from({ length: 3500 }, (_, i) => [`new-${i}`, createReviewRecord(at)])) }
    const queue = orderReviewIds(records, Object.keys(records), Date.parse(at) + 10 * 60_000)
    expect(queue[0]).toBe('old')
    expect(new Set(queue).size).toBe(3502)
    expect(orderReviewIds(records, ['old', 'forgotten'], Date.parse(at))).toEqual(['old'])
  })
  it('更正本次认识判断时从作答前排期计算，并覆盖原事件而非新增次数', async () => {
    const db = await setupTestDatabase()
    const store = useLevelReviewStore()
    store.registerCharacters(['one'], at)
    store.answer('one', false, at)
    store.answer('one', true, at)
    const before = { ...store.records.one! }
    const receipt = store.answer('one', true, at)!
    const corrected = store.correctAnswer(receipt, false)
    expect(store.records.one).toEqual(reviewAnswer(before, false, at))
    expect(store.records.one).toMatchObject({ reviewCount: 3, forgottenCount: 2, step: 0 })
    const restored = store.correctAnswer(corrected, true)
    expect(store.records.one).toEqual(reviewAnswer(before, true, at))
    store.correctAnswer(restored, false)
    await flushPersistence()
    const events = await db.query('activity_events', { where: { characterId: 'one', kind: 'answer' } })
    expect(events).toHaveLength(3)
    expect(events.find(event => event.id === 'review:one:3')?.correct).toBe(0)
    expect((await listMistakes({ characterId: 'one' }))[0]?.mistakes).toBe(2)
    resetPersistenceForTests(); await initializePersistence(); setActivePinia(createPinia())
    expect(useLevelReviewStore().records.one).toEqual(reviewAnswer(before, false, at))
  })
  it('不认识更正为认识时移除本次遗忘与错题，但不覆盖之后的作答', async () => {
    const db = await setupTestDatabase()
    const store = useLevelReviewStore()
    store.registerCharacters(['one'], at)
    const receipt = store.answer('one', false, at)!
    store.correctAnswer(receipt, true)
    await flushPersistence()
    expect(store.records.one).toMatchObject({ reviewCount: 1, forgottenCount: 0, step: 1 })
    expect(await listMistakes({ characterId: 'one' })).toEqual([])
    expect((await db.query('activity_events', { where: { characterId: 'one' } }))[0]?.correct).toBe(1)
    store.answer('one', false, at)
    const latest = { ...store.records.one! }
    expect(() => store.correctAnswer(receipt, false)).toThrow('本次答案已过期')
    expect(store.records.one).toEqual(latest)
  })
  it('逐范围保存当前字，重启后恢复并保留复习次数', async () => {
    const db = await setupTestDatabase()
    const store = useLevelReviewStore()
    store.registerCharacters(['one', 'two'], at)
    store.answer('one', true, at)
    store.setCurrent('all', 'two'); store.setCurrent('favorites', 'one')
    await flushPersistence(); resetPersistenceForTests(); await initializePersistence(); setActivePinia(createPinia())
    const reopened = useLevelReviewStore(); reopened.hydrate()
    expect(reopened.session).toMatchObject({ filter: 'favorites', currentIds: { all: 'two', favorites: 'one' }, currentReviewCounts: { all: 0, favorites: 1 } })
    expect(reopened.records.one?.reviewCount).toBe(1)
    expect(await db.query('level_review')).toHaveLength(2)
  })
  it('复习只更新作答字的数据库记录，不重写整个字表', async () => {
    const db = await setupTestDatabase()
    const store = useLevelReviewStore()
    store.registerCharacters(['one', 'two', 'three'], at)
    await flushPersistence()
    const writes: string[] = []
    const original = db.commit.bind(db)
    db.commit = async (changes) => {
      for (const change of changes) if (change.table === 'level_review' && 'row' in change) writes.push(change.row.id)
      await original(changes)
    }
    store.answer('two', true, at)
    await flushPersistence()
    expect(writes).toEqual(['two'])
  })
  it('历史关卡逐字完成会加入复习，重复迁移不改排期', async () => {
    await setupTestDatabase(new Map([[LEVEL_PROGRESS_STORAGE_KEY, { completedStageIds: [], stageCharacterCompleted: { 'level1-stage-01': ['char-0001'] } }]]))
    const store = useLevelReviewStore()
    await store.migrateLearnedCharacters()
    expect(Object.keys(store.records)).toEqual(['char-0001'])
    store.answer('char-0001', true, at)
    await store.migrateLearnedCharacters()
    expect(store.records['char-0001']?.reviewCount).toBe(1)
  })
})
