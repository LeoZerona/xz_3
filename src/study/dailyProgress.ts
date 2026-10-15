export const PLAN_STORAGE_KEY = 'font-learning-plan'
export const DEFAULT_DAILY_COUNT = 15
export const REVIEW_TARGET = 20
/** 超过该时长无答题相关交互即暂停计时，默认 2 分钟。 */
export const IDLE_TIMEOUT_MS = 2 * 60 * 1000

export interface DailyProgress {
  dateKey: string
  assignedIds: string[]
  learnedIds: string[]
  currentCharacterId: string | null
  reviewedCount: number
  studySeconds: number
  startedAt: string | null
  completedAt: string | null
}

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export function progressStorageKey(dateKey: string): string {
  return `font-learning-daily-progress:${dateKey}`
}

export function normalizeDailyCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_DAILY_COUNT
  const count = Math.trunc(value)
  if (count < 1) return 1
  return count
}

/** 读取用户在修改计划页保存的每日新学数，存储不可用时回退默认值。 */
export function readPlanDailyCount(): number {
  try {
    const saved = uni.getStorageSync(PLAN_STORAGE_KEY) as { dailyCount?: unknown } | undefined
    if (saved && typeof saved.dailyCount !== 'undefined') return normalizeDailyCount(saved.dailyCount)
  } catch {
    // 存储不可用时使用默认计划。
  }
  return DEFAULT_DAILY_COUNT
}

function normalizeIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
}

export function normalizeProgress(value: unknown, dateKey: string): DailyProgress {
  if (typeof value !== 'object' || value === null) {
    return {
      dateKey,
      assignedIds: [],
      learnedIds: [],
      currentCharacterId: null,
      reviewedCount: 0,
      studySeconds: 0,
      startedAt: null,
      completedAt: null,
    }
  }
  const stored = value as Partial<DailyProgress>
  const studySeconds = typeof stored.studySeconds === 'number' && Number.isFinite(stored.studySeconds)
    ? Math.max(0, Math.trunc(stored.studySeconds))
    : 0
  const reviewedCount = typeof stored.reviewedCount === 'number' && Number.isFinite(stored.reviewedCount)
    ? Math.max(0, Math.trunc(stored.reviewedCount))
    : 0
  const learnedIds = normalizeIdList(stored.learnedIds)
  const assignedIds = normalizeIdList(stored.assignedIds)
  return {
    dateKey,
    assignedIds: assignedIds.length > 0 ? assignedIds : learnedIds,
    learnedIds,
    currentCharacterId: typeof stored.currentCharacterId === 'string' ? stored.currentCharacterId : null,
    reviewedCount,
    studySeconds,
    startedAt: typeof stored.startedAt === 'string' ? stored.startedAt : null,
    completedAt: typeof stored.completedAt === 'string' ? stored.completedAt : null,
  }
}

/** 保留今日已有字单，并从尚未学完、未斩的候选字中补足目标数量。 */
export function buildDailyAssignment(existingIds: string[], candidateIds: string[], targetCount: number): string[] {
  const target = normalizeDailyCount(targetCount)
  const result = normalizeIdList(existingIds)
  for (const characterId of normalizeIdList(candidateIds)) {
    if (result.length >= target) break
    if (!result.includes(characterId)) result.push(characterId)
  }
  return result
}

/** 展示用分钟数：内部按秒累计，每满 60 秒 +1，向下取整。 */
export function studyMinutes(studySeconds: number): number {
  if (!Number.isFinite(studySeconds) || studySeconds <= 0) return 0
  return Math.floor(studySeconds / 60)
}

/** 距上次有效交互超过阈值即视为空闲，调用方应暂停计时。 */
export function isIdle(lastActiveAt: number, now: number, timeoutMs = IDLE_TIMEOUT_MS): boolean {
  return now - lastActiveAt > timeoutMs
}
