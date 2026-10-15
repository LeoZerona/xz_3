import { describe, expect, it } from 'vitest'
import { buildDailyAssignment, normalizeProgress } from './dailyProgress'

describe('daily study session', () => {
  it('keeps the saved assignment stable and fills only missing slots', () => {
    expect(buildDailyAssignment(
      ['char-0003', 'char-0004'],
      ['char-0001', 'char-0003', 'char-0005'],
      4,
    )).toEqual(['char-0003', 'char-0004', 'char-0001', 'char-0005'])
  })

  it('migrates the old daily progress shape without losing completed ids', () => {
    expect(normalizeProgress({
      learnedIds: ['char-0001'],
      reviewedCount: 2,
      studySeconds: 65,
    }, '2026-10-15')).toEqual({
      dateKey: '2026-10-15',
      assignedIds: ['char-0001'],
      learnedIds: ['char-0001'],
      currentCharacterId: null,
      reviewedCount: 2,
      studySeconds: 65,
      startedAt: null,
      completedAt: null,
    })
  })
})
