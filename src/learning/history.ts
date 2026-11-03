import { getDatabase } from '../database/connection'
import { readActivities } from './activity'
import { summarizeActivities } from './summary'
import type { LearningSummary, LegacyLearningDay } from './types'

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
