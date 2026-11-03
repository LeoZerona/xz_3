import { describe, expect, it } from 'vitest'
import { estimatePlan } from './plan'

describe('计划预计完成日期', () => {
  it('按剩余字数和每日数量计算，以当天为第一天', () => {
    const result = estimatePlan(31, 15, new Date(2026, 10, 3))
    expect(result.days).toBe(3)
    expect(result.dateLabel).toBe('2026年11月5日')
  })
  it('空范围显示已完成，跨月正确且无非法除数', () => {
    expect(estimatePlan(0, 15, new Date(2026, 10, 3)).dateLabel).toBe('本范围已完成')
    expect(estimatePlan(20, 10, new Date(2026, 11, 31)).dateLabel).toBe('2027年1月1日')
    expect(estimatePlan(5, 0, new Date(2026, 10, 3)).days).toBe(1)
  })
})
