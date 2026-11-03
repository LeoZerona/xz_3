import { describe, expect, it } from 'vitest'
import { summarizeActivities } from './summary'
import type { ActivityEvent } from './types'

function event(id: string, values: Partial<ActivityEvent>): ActivityEvent {
  return { id, sessionId: 'session', source: 'daily', kind: 'answer', characterId: 'char-0001',
    mode: 'seal-to-reference-choice', correct: true, at: '2026-11-03T12:00:00.000Z',
    dateKey: '2026-11-3', seconds: 0, timezoneOffset: -480, ...values }
}

describe('真实学习汇总', () => {
  it('正式新学按字去重，正式复习按次数，专项与测评不冒充已学', () => {
    const result = summarizeActivities([
      event('complete-a', { kind: 'completed' }),
      event('complete-again', { kind: 'completed', source: 'level' }),
      event('review-a', { source: 'review' }), event('review-b', { source: 'review', correct: false }),
      event('practice', { source: 'practice', kind: 'completed', characterId: 'char-0002' }),
      event('time', { source: 'level', kind: 'time', seconds: 80 }),
    ], [], new Date(2026, 10, 3))
    expect(result.learnedCount).toBe(1)
    expect(result.today.newCount).toBe(1)
    expect(result.today.reviewCount).toBe(2)
    expect(result.today.studySeconds).toBe(80)
    expect(result.today.practiceCount).toBe(1)
  })

  it('保留有据可查的历史总量而不与新事件重复累计', () => {
    const result = summarizeActivities([event('new-time', { kind: 'time', seconds: 30 })], [
      { dateKey: '2026-11-3', learnedIds: ['char-0001'], reviewedCount: 4, studySeconds: 80 },
      { dateKey: '2026-11-2', learnedIds: ['char-0002'], reviewedCount: 1, studySeconds: 60 },
    ], new Date(2026, 10, 3))
    expect(result.today.studySeconds).toBe(110)
    expect(result.today.reviewCount).toBe(4)
    expect(result.learnedCount).toBe(2)
    expect(result.currentStreak).toBe(2)
  })

  it('阅读满 60 秒才算学习日，空日期不补造，连续天数可截止昨天', () => {
    const result = summarizeActivities([
      event('old', { kind: 'time', source: 'reading', dateKey: '2026-10-31', at: '2026-10-31T12:00:00.000Z', seconds: 59 }),
      event('day1', { dateKey: '2026-11-1', at: '2026-11-01T12:00:00.000Z' }),
      event('day2', { kind: 'time', source: 'reading', dateKey: '2026-11-2', at: '2026-11-02T12:00:00.000Z', seconds: 60 }),
    ], [], new Date(2026, 10, 3))
    expect(result.activeDates).toEqual(['2026-11-1', '2026-11-2'])
    expect(result.currentStreak).toBe(2)
    expect(result.today.studySeconds).toBe(0)
    expect(result.longestStreak).toBe(2)
  })
})
