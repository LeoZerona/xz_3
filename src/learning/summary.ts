import { localDateKey } from './activity'
import type { ActivityEvent, LearningDay, LearningSummary, LegacyLearningDay } from './types'

export function emptyLearningDay(dateKey: string): LearningDay {
  return { dateKey, newIds: [], newCount: 0, reviewCount: 0, practiceCount: 0, answerCount: 0,
    correctCount: 0, studySeconds: 0, readingSeconds: 0, hasActivity: false }
}
function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number)
  return Date.UTC(year!, month! - 1, day!) / 86_400_000
}

export function summarizeActivities(events: readonly ActivityEvent[], legacy: readonly LegacyLearningDay[] = [], now = new Date()): LearningSummary {
  const days = new Map<string, LearningDay>()
  const getDay = (key: string) => {
    if (!days.has(key)) days.set(key, emptyLearningDay(key))
    return days.get(key)!
  }
  for (const entry of legacy) {
    const day = getDay(entry.dateKey)
    day.newIds = [...new Set([...day.newIds, ...entry.learnedIds])]
    day.reviewCount = Math.max(0, entry.reviewedCount)
    day.studySeconds = Math.max(0, entry.studySeconds)
    day.hasActivity = day.newIds.length > 0 || day.reviewCount > 0 || day.studySeconds >= 60
  }
  const seen = new Set<string>()
  for (const event of events) {
    if (seen.has(event.id)) continue
    seen.add(event.id)
    const day = getDay(event.dateKey)
    if (event.kind === 'completed' && (event.source === 'daily' || event.source === 'level') && event.characterId) {
      if (!day.newIds.includes(event.characterId)) day.newIds.push(event.characterId)
      day.hasActivity = true
    }
    if (event.source === 'review' && event.kind === 'answer') day.reviewCount++
    if (event.source === 'practice' && event.kind !== 'time') day.practiceCount++
    if (event.kind === 'answer') {
      day.answerCount++
      if (event.correct) day.correctCount++
      if (event.source !== 'reading') day.hasActivity = true
    }
    if (event.kind === 'time') {
      day.studySeconds += event.seconds
      if (event.source === 'reading') day.readingSeconds += event.seconds
    }
  }
  const sorted = [...days.values()].sort((a, b) => dayNumber(a.dateKey) - dayNumber(b.dateKey))
  for (const day of sorted) {
    day.newCount = day.newIds.length
    if (day.readingSeconds >= 60) day.hasActivity = true
  }
  const active = sorted.filter((day) => day.hasActivity)
  let longestStreak = 0
  let streak = 0
  let previous = -Infinity
  for (const day of active) {
    const number = dayNumber(day.dateKey)
    streak = number === previous + 1 ? streak + 1 : 1
    longestStreak = Math.max(longestStreak, streak)
    previous = number
  }
  const todayNumber = dayNumber(localDateKey(now))
  const activeNumbers = new Set(active.map((day) => dayNumber(day.dateKey)))
  let cursor = activeNumbers.has(todayNumber) ? todayNumber : todayNumber - 1
  let currentStreak = 0
  while (activeNumbers.has(cursor)) { currentStreak++; cursor-- }
  return { learnedCount: new Set(sorted.flatMap((day) => day.newIds)).size,
    studySeconds: sorted.reduce((sum, day) => sum + day.studySeconds, 0),
    reviewCount: sorted.reduce((sum, day) => sum + day.reviewCount, 0), currentStreak, longestStreak,
    activeDates: active.map((day) => day.dateKey), days: sorted, today: getDay(localDateKey(now)) }
}
