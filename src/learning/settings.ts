import { flushPersistence, readStored, saveStored } from '../database/persistence'
import { object } from '../database/records'
import { getEffectiveStudyModes, normalizeStudyModes } from '../study/modes'
import { localDateKey } from './activity'
import type { StudyMode } from '../study/modes'
import { readPlanConfig } from '../study/planConfig'
import { readPlanDailyCount } from '../study/dailyProgress'

export type LearningCourse = 'daily' | 'level1' | 'level2' | 'level3'
export interface LearningSettings { course: LearningCourse; reviewTarget: number }
const KEY = 'font-learning-settings'
function parse(value: unknown): LearningSettings {
  const raw = object(value)
  const course = ['daily', 'level1', 'level2', 'level3'].includes(String(raw.course)) ? raw.course as LearningCourse : 'daily'
  return { course, reviewTarget: typeof raw.reviewTarget === 'number' && Number.isInteger(raw.reviewTarget) && raw.reviewTarget > 0 ? raw.reviewTarget : 20 }
}
export function readLearningSettings(now = new Date()): LearningSettings {
  const raw = object(readStored(KEY)); const pending = object(raw.pending)
  return typeof pending.applyAt === 'string' && now.getTime() >= Date.parse(pending.applyAt) ? parse(pending) : parse(raw)
}
export function pendingLearningSettings(): { values: LearningSettings; applyAt: string } | null {
  const pending = object(object(readStored(KEY)).pending)
  return typeof pending.applyAt === 'string' && Date.parse(pending.applyAt) > Date.now() ? { values: parse(pending), applyAt: pending.applyAt } : null
}
export async function saveLearningSettings(input: LearningSettings, now = new Date()): Promise<void> {
  if (!['daily', 'level1', 'level2', 'level3'].includes(input.course) || !Number.isInteger(input.reviewTarget) || input.reviewTarget < 1 || input.reviewTarget > 500) throw new Error('请选择有效课程和 1–500 的复习目标')
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  saveStored(KEY, { ...readLearningSettings(now), pending: { ...input, applyAt: tomorrow.toISOString() } })
  await flushPersistence()
}
export function readDailySessionModes(dateKey = localDateKey(new Date())): StudyMode[] {
  const key = `font-learning-daily-modes:${dateKey}`
  const saved = normalizeStudyModes(readStored(key))
  if (saved.length) return saved
  const modes = getEffectiveStudyModes(); saveStored(key, modes); return modes
}
export async function saveDailyPlan(input: { dailyCount: number; modes: StudyMode[] }, now = new Date()): Promise<void> {
  const modes = normalizeStudyModes(input.modes)
  if (!Number.isInteger(input.dailyCount) || input.dailyCount < 1 || input.dailyCount > 200 || !modes.length) throw new Error('请选择有效的新学量和至少一种题型')
  const current = readPlanConfig(now)
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  saveStored('font-learning-plan', { ...current, dailyCount: readPlanDailyCount(now), modes: getEffectiveStudyModes(now), pending: { dailyCount: input.dailyCount, modes, applyAt: tomorrow.toISOString() } })
  await flushPersistence()
}
