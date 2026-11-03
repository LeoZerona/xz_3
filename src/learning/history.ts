import { getDatabase } from '../database/connection'
import { readActivities } from './activity'
import { summarizeActivities } from './summary'
import type { LearningSummary, LegacyLearningDay } from './types'
import { localDateKey } from './activity'
import type { ActivityEvent, LearningDay } from './types'

export interface LearningHistory { days: LearningDay[]; events: ActivityEvent[]; summary: LearningSummary; coverage: Array<{ level: number; total: number; learned: number }> }
export function parseLocalDay(value: string): Date {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value)
  if (!match) throw new Error('日期格式无效')
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (localDateKey(date) !== `${Number(match[1])}-${Number(match[2])}-${Number(match[3])}`) throw new Error('日期无效')
  return date
}
export async function readLearningHistory(range: { from: string; to: string }): Promise<LearningHistory> {
  const from = parseLocalDay(range.from); const to = parseLocalDay(range.to)
  if (from > to || to.getTime() - from.getTime() > 366 * 86400000) throw new Error('请选择一年以内的日期范围')
  const summary = await readLearningSummary()
  const events = (await readActivities()).filter(event => { const day = parseLocalDay(event.dateKey); return day >= from && day <= to })
  const days: LearningDay[] = []
  for (const date = new Date(from); date <= to; date.setDate(date.getDate() + 1)) {
    const key = localDateKey(date)
    days.push(summary.days.find(day => day.dateKey === key) ?? { dateKey: key, newIds: [], newCount: 0, reviewCount: 0, practiceCount: 0, answerCount: 0, correctCount: 0, studySeconds: 0, readingSeconds: 0, hasActivity: false })
  }
  const db = await getDatabase(); const characters = await db.query('characters'); const progress = await db.query('character_progress')
  const completed = new Set(progress.filter(row => row.status === 'completed' || row.completedAt).map(row => row.id))
  const coverage = [1, 2, 3].map(level => ({ level, total: characters.filter(row => row.level === level).length, learned: characters.filter(row => row.level === level && completed.has(row.id)).length }))
  return { days, events, summary, coverage }
}

export async function readLearningSummary(now = new Date()): Promise<LearningSummary> {
  const events = await readActivities()
  const db = await getDatabase()
  const [sessions, items, progress] = await Promise.all([
    db.query('daily_sessions'), db.query('daily_session_items'), db.query('character_progress'),
  ])
  const legacy = sessions.map((row): LegacyLearningDay => ({ dateKey: row.id,
    learnedIds: items.filter((item) => item.dateKey === row.id && item.learned === 1).map((item) => String(item.characterId)),
    reviewedCount: Number(row.reviewedCount) || 0, studySeconds: Number(row.studySeconds) || 0 }))
  const summary = summarizeActivities(events, legacy, now)
  const completed = progress.filter((row) => row.status === 'completed' || typeof row.completedAt === 'string').map((row) => row.id)
  summary.learnedCount = new Set([...completed, ...summary.days.flatMap((day) => day.newIds)]).size
  return summary
}
