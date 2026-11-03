export interface PlanEstimate { days: number; dateLabel: string }

export function estimatePlan(remaining: number, dailyCount: number, from = new Date()): PlanEstimate {
  const count = Number.isFinite(remaining) ? Math.max(0, Math.trunc(remaining)) : 0
  const daily = Number.isFinite(dailyCount) && dailyCount > 0 ? Math.trunc(dailyCount) || 1 : 15
  const days = Math.ceil(count / daily)
  if (!days) return { days: 0, dateLabel: '本范围已完成' }
  const end = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days - 1)
  return { days, dateLabel: `${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日` }
}
