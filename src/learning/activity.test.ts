import { describe, expect, it } from 'vitest'
import { setupTestDatabase } from '../database/testSupport'
import { exportBackup, restoreBackup } from '../database/backup'
import { recordActivity, readActivities } from './activity'
import type { ActivityEvent } from './types'

const answer: ActivityEvent = {
  id: 'answer-once', sessionId: 'session-1', source: 'review', kind: 'answer',
  characterId: 'char-0001', mode: null, correct: false,
  at: '2026-11-03T12:00:00.000Z', dateKey: '2026-11-3', seconds: 0, timezoneOffset: -480,
}

describe('学习活动事实', () => {
  it('重复提交同一事件只保存一条，专项不写正式学习或排期', async () => {
    const db = await setupTestDatabase()
    recordActivity(answer)
    recordActivity(answer)
    recordActivity({ ...answer, id: 'practice-1', source: 'practice', correct: true })
    expect(await readActivities({ dateKey: '2026-11-3' })).toHaveLength(2)
    expect(await db.query('character_progress')).toEqual([])
    expect(await db.query('level_review')).toEqual([])
  })

  it('写入失败后保留待提交事件，重试不会丢失或重复', async () => {
    const db = await setupTestDatabase()
    db.failNextCommit = true
    recordActivity(answer)
    await expect(readActivities({})).rejects.toThrow('模拟磁盘写入失败')
    expect(await readActivities({})).toEqual([answer])
  })

  it('重发相同事件 ID 不覆盖首次事实，包括首次完成所在的日期', async () => {
    await setupTestDatabase()
    recordActivity(answer)
    recordActivity({ ...answer, at: '2026-11-04T12:00:00.000Z', dateKey: '2026-11-4', correct: true })
    expect(await readActivities({})).toEqual([answer])
  })

  it('备份恢复活动事实，v1 备份缺少活动表仍可恢复', async () => {
    await setupTestDatabase()
    recordActivity(answer)
    const text = await exportBackup()
    recordActivity({ ...answer, id: 'later' })
    await restoreBackup(text)
    expect(await readActivities({})).toEqual([answer])
    const legacy = JSON.parse(text) as { data: Record<string, unknown> }
    delete legacy.data.activity_events
    await restoreBackup(JSON.stringify(legacy))
    expect(await readActivities({})).toEqual([])
  })

  it('拒绝无效时间、日期归属和负时长', async () => {
    await setupTestDatabase()
    expect(() => recordActivity({ ...answer, at: 'invalid' })).toThrow()
    expect(() => recordActivity({ ...answer, seconds: -1 })).toThrow()
    expect(() => recordActivity({ ...answer, dateKey: '2026-11-2' })).toThrow()
  })
})
