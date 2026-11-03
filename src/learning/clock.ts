import { localDateKey } from './activity'
import type { TimeSegment } from './types'

interface ClockOptions {
  now?: () => number
  wallNow?: () => Date
  idleMs?: number
  onTime: (segment: TimeSegment) => void
}
export interface ActivityClock {
  start: () => void
  touch: () => void
  flush: () => void
  pause: () => void
}

export function createActivityClock(options: ClockOptions): ActivityClock {
  const now = options.now ?? (() => typeof performance === 'undefined' ? Date.now() : performance.now())
  const wallNow = options.wallNow ?? (() => new Date())
  const idleMs = options.idleMs ?? 120_000
  const carries = new Map<string, number>()
  let running = false
  let lastTick = 0
  let lastInteraction = 0
  let lastWall = 0

  function emit(start: number, milliseconds: number): void {
    const finish = start + milliseconds
    for (let cursor = start; cursor < finish;) {
      const date = new Date(cursor)
      const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime()
      const end = Math.min(midnight, finish)
      const key = localDateKey(date)
      const total = end - cursor + (carries.get(key) ?? 0)
      const seconds = Math.floor(total / 1000)
      carries.set(key, total - seconds * 1000)
      if (seconds > 0) options.onTime({ at: new Date(end - 1).toISOString(), dateKey: key, seconds, timezoneOffset: date.getTimezoneOffset() })
      cursor = end
    }
  }
  function flush(): void {
    if (!running) return
    const tick = now()
    const validEnd = Math.min(tick, lastInteraction + idleMs)
    const delta = Math.max(0, validEnd - lastTick)
    if (delta > 0) emit(lastWall, delta)
    lastTick = tick
    lastWall = wallNow().getTime()
  }
  return {
    start() { if (running) return; running = true; lastTick = now(); lastInteraction = lastTick; lastWall = wallNow().getTime() },
    touch() { flush(); lastInteraction = now() },
    flush,
    pause() { flush(); running = false },
  }
}
