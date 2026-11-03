export type ReviewFilter = 'all' | 'slashed' | 'favorites'
export interface LevelReviewRecord {
  firstLearnedAt: string
  lastReviewedAt: string | null
  dueAt: string
  step: number
  reviewCount: number
  forgottenCount: number
}
export const LEVEL_REVIEW_KEY = 'font-learning-level-review'
export const REVIEW_SESSION_KEY = 'morning-pages:level-review-session'
// 以遗忘曲线为依据的间隔复习策略；并非对每个人都精确相同的记忆预测。
export const REVIEW_INTERVALS_MS = [5 * 60_000, 30 * 60_000, 12 * 3_600_000, 86400_000, 2 * 86400_000, 4 * 86400_000, 7 * 86400_000, 15 * 86400_000, 30 * 86400_000] as const
export function createReviewRecord(at: string): LevelReviewRecord {
  return { firstLearnedAt: at, lastReviewedAt: null, dueAt: new Date(Date.parse(at) + REVIEW_INTERVALS_MS[0]).toISOString(), step: 0, reviewCount: 0, forgottenCount: 0 }
}
export function reviewAnswer(record: LevelReviewRecord, known: boolean, at: string): LevelReviewRecord {
  const step = known ? Math.min(record.step + 1, REVIEW_INTERVALS_MS.length - 1) : 0
  return { ...record, step, dueAt: new Date(Date.parse(at) + REVIEW_INTERVALS_MS[step]!).toISOString(), lastReviewedAt: at,
    reviewCount: record.reviewCount + 1, forgottenCount: record.forgottenCount + Number(!known) }
}
export function orderReviewIds(records: Record<string, LevelReviewRecord>, ids: readonly string[], now: number, includeFuture = false): string[] {
  return ids.filter((id) => records[id] && (includeFuture || Date.parse(records[id]!.dueAt) <= now)).sort((a, b) => {
    const left = records[a]!, right = records[b]!
    return Date.parse(left.dueAt) - Date.parse(right.dueAt)
      || Date.parse(left.lastReviewedAt ?? left.firstLearnedAt) - Date.parse(right.lastReviewedAt ?? right.firstLearnedAt)
      || a.localeCompare(b)
  })
}
