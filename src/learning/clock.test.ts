import { describe, expect, it } from 'vitest'
import { createActivityClock } from './clock'

describe('有效学习计时', () => {
  it('跨午夜分别记录两天的秒数，后台不累计', () => {
    let tick = 0
    const origin = new Date(2026, 10, 3, 23, 59, 50).getTime()
    const segments: Array<{ dateKey: string; seconds: number }> = []
    const clock = createActivityClock({ now: () => tick, wallNow: () => new Date(origin + tick),
      onTime: (segment) => segments.push(segment) })
    clock.start(); tick = 20_000; clock.pause()
    tick += 60_000; clock.flush()
    expect(segments.map(({ dateKey, seconds }) => ({ dateKey, seconds }))).toEqual([
      { dateKey: '2026-11-3', seconds: 10 }, { dateKey: '2026-11-4', seconds: 10 },
    ])
  })

  it('空闲超过 120 秒停止累计，交互后继续，系统时间回拨不产生负时长', () => {
    let tick = 0
    let wall = new Date(2026, 10, 3, 12).getTime()
    const segments: number[] = []
    const clock = createActivityClock({ now: () => tick, wallNow: () => new Date(wall), onTime: (part) => segments.push(part.seconds) })
    clock.start(); tick = 150_000; wall -= 60_000; clock.flush()
    expect(segments.reduce((sum, value) => sum + value, 0)).toBe(120)
    clock.touch(); tick += 10_000; clock.pause()
    expect(segments.reduce((sum, value) => sum + value, 0)).toBe(130)
  })
})
