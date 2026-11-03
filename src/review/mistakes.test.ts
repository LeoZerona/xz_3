import { beforeEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setupTestDatabase } from '../database/testSupport'
import { recordActivity } from '../learning/activity'
import { useLevelReviewStore } from '../stores/levelReview'
import { listMistakes } from './mistakes'
import { getDatabase } from '../database/connection'

beforeEach(async () => { setActivePinia(createPinia()); await setupTestDatabase() })
it('同模式连续两次正确才巩固错题，历史累计不伪造日期', async () => {
  const base = { sessionId: 'p', source: 'practice' as const, kind: 'answer' as const, characterId: 'one', mode: 'seal-to-reference-choice' as const, seconds: 0, timezoneOffset: 0, dateKey: '2026-11-3' }
  recordActivity({ ...base, id: 'e1', at: '2026-11-03T01:00:00Z', correct: false })
  recordActivity({ ...base, id: 'e2', at: '2026-11-03T01:01:00Z', correct: true })
  expect((await listMistakes({}))[0]).toMatchObject({ characterId: 'one', consolidated: false, mistakes: 1 })
  recordActivity({ ...base, id: 'e3', at: '2026-11-03T01:02:00Z', correct: true })
  expect((await listMistakes({}))[0]?.consolidated).toBe(true)
})
it('日常与关卡共享一份排期，重复登记不回退，旧关卡范围排除仅日常', async () => {
  const store = useLevelReviewStore()
  store.registerCharacters(['one', 'two'], '2026-11-01T00:00:00Z', 'daily')
  store.answer('one', true, '2026-11-01T01:00:00Z')
  store.registerCharacters(['one'], '2026-11-03T01:00:00Z', 'level')
  expect(store.records.one?.reviewCount).toBe(1)
  expect(store.hasSource('one', 'level')).toBe(true)
  expect(store.hasSource('two', 'level')).toBe(false)
  expect(store.hasSource('one', 'daily')).toBe(true)
})
it('只有历史错误累计时不生成虚假的逐题时间', async () => {
  const db = await getDatabase()
  await db.commit([{ table: 'character_mode_progress', row: { id: 'legacy', characterId: 'old', mode: 'seal-to-reference-choice', mistakes: 5 } }])
  expect((await listMistakes({}))[0]).toMatchObject({ characterId: 'old', legacyMistakes: 5, mistakes: 5, lastMistakeAt: null, events: [] })
})
