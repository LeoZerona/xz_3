import { beforeEach, expect, it } from 'vitest'
import { setupTestDatabase } from '../database/testSupport'
import { recordActivity } from './activity'
import { readLearningHistory } from './history'
beforeEach(async () => { await setupTestDatabase() })
it('日期范围含空日期，正式完成去重，专项不混入新学', async () => {
  const base = { sessionId: 'a', source: 'daily' as const, kind: 'completed' as const, characterId: 'one', mode: null, correct: null, at: '2026-11-03T01:00:00Z', dateKey: '2026-11-3', seconds: 0, timezoneOffset: 0 }
  recordActivity({ ...base, id: 'formal' }); recordActivity({ ...base, id: 'practice', source: 'practice', kind: 'answer', correct: true })
  const history = await readLearningHistory({ from: '2026-11-2', to: '2026-11-3' })
  expect(history.days).toHaveLength(2)
  expect(history.days[0]?.hasActivity).toBe(false)
  expect(history.days[1]).toMatchObject({ newCount: 1, practiceCount: 1 })
})
