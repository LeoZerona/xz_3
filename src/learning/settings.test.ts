import { beforeEach, expect, it } from 'vitest'
import { setupTestDatabase } from '../database/testSupport'
import { readDailySessionModes, readLearningSettings, saveDailyPlan, saveLearningSettings } from './settings'
import { readPlanDailyCount } from '../study/dailyProgress'
import { getEffectiveStudyModes } from '../study/modes'
import { saveStored } from '../database/persistence'
beforeEach(async () => { await setupTestDatabase() })
it('课程改动次日生效，当天题型快照保留，拒绝无效目标', async () => {
  saveStored('font-learning-settings', { course: 'level1', reviewTarget: 20 })
  const today = new Date(2026, 10, 3, 12)
  expect(readDailySessionModes('2026-11-3')).toHaveLength(3)
  await saveLearningSettings({ course: 'level2', reviewTarget: 30 }, today)
  expect(readLearningSettings(today).course).toBe('level1')
  expect(readLearningSettings(new Date(2026, 10, 4)).course).toBe('level2')
  saveStored('font-learning-plan', { modes: ['seal-to-reference-input'] })
  expect(readDailySessionModes('2026-11-3')).toHaveLength(3)
  expect(readDailySessionModes('2026-11-4')).toEqual(['seal-to-reference-input'])
  await expect(saveLearningSettings({ course: 'level1', reviewTarget: 0 })).rejects.toThrow('目标')
})
it('新用户默认一级课程，带有历史计划的用户保留原课程', async () => {
  expect(readLearningSettings().course).toBe('level1')
  await setupTestDatabase(new Map([['font-learning-plan', { dailyCount: 15 }]]))
  expect(readLearningSettings().course).toBe('daily')
})
it('新学量和必修题型也在次日生效', async () => {
  const now = new Date(2026, 10, 3, 12)
  await saveDailyPlan({ dailyCount: 30, modes: ['seal-to-reference-input'] }, now)
  expect(readPlanDailyCount(now)).toBe(15)
  expect(getEffectiveStudyModes(now)).toHaveLength(3)
  expect(readPlanDailyCount(new Date(2026, 10, 4))).toBe(30)
  expect(getEffectiveStudyModes(new Date(2026, 10, 4))).toEqual(['seal-to-reference-input'])
})
