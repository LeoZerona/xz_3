import { onBeforeUnmount, onMounted, watch } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { applicationReady } from '../database/application'
import { reportPersistenceError } from '../database/persistence'
import { createActivityClock } from './clock'
import { createActivityId, recordActivity } from './activity'
import type { ActivitySource } from './types'

let pauseActiveClock: (() => void) | undefined

export function useActivityClock(source: ActivitySource, enabled: () => boolean, sessionId: () => string) {
  let isVisible = true
  let interval: ReturnType<typeof setInterval> | undefined
  const clock = createActivityClock({ onTime: (segment) => {
    recordActivity({ ...segment, id: createActivityId('time'), sessionId: sessionId(), source,
      kind: 'time', characterId: null, mode: null, correct: null })
  } })
  function flush(): void {
    try { clock.flush() } catch (cause) { reportPersistenceError(cause) }
  }
  function pause(): void {
    if (interval) clearInterval(interval)
    interval = undefined
    try { clock.pause() } catch (cause) { reportPersistenceError(cause) }
    if (pauseActiveClock === pause) pauseActiveClock = undefined
  }
  function sync(): void {
    if (!isVisible || !applicationReady.value || !enabled() || typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      pause(); return
    }
    if (interval) return
    if (pauseActiveClock && pauseActiveClock !== pause) pauseActiveClock()
    pauseActiveClock = pause
    clock.start()
    interval = setInterval(flush, 15_000)
  }
  function touch(): void {
    if (!isVisible || !applicationReady.value || !enabled()) return
    sync()
    try { clock.touch() } catch (cause) { reportPersistenceError(cause) }
  }
  const events = ['pointerdown', 'touchstart', 'keydown', 'scroll'] as const
  watch([applicationReady, enabled], sync)
  onShow(() => { isVisible = true; sync() })
  onHide(() => { isVisible = false; pause() })
  onMounted(() => {
    if (typeof document !== 'undefined') {
      for (const name of events) document.addEventListener(name, touch, { passive: true, capture: true })
      document.addEventListener('visibilitychange', sync)
    }
    sync()
  })
  onBeforeUnmount(() => {
    pause()
    if (typeof document !== 'undefined') {
      for (const name of events) document.removeEventListener(name, touch, true)
      document.removeEventListener('visibilitychange', sync)
    }
  })
  return { touch, pause, flush }
}
