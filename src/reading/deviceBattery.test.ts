import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeAndroidBattery, observeBrowserBattery } from './deviceBattery'
import type { AndroidBatteryBridge, BrowserBattery } from './deviceBattery'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('browser battery observation', () => {
  it('reports battery and charging changes and removes listeners on disposal', async () => {
    const manager: BrowserBattery = Object.assign(new EventTarget(), { level: 0.72, charging: false })
    const onChange = vi.fn()
    const stop = observeBrowserBattery({ getBattery: async () => manager }, onChange)
    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ level: 72, isCharging: false }))
    manager.level = 0.15
    manager.dispatchEvent(new Event('levelchange'))
    expect(onChange).toHaveBeenLastCalledWith({ level: 15, isCharging: false })
    manager.charging = true
    manager.dispatchEvent(new Event('chargingchange'))
    expect(onChange).toHaveBeenLastCalledWith({ level: 15, isCharging: true })
    stop()
    onChange.mockClear()
    manager.dispatchEvent(new Event('levelchange'))
    manager.dispatchEvent(new Event('chargingchange'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not subscribe or update when a pending battery request resolves after disposal', async () => {
    const manager: BrowserBattery = Object.assign(new EventTarget(), { level: 1, charging: true })
    const addListener = vi.spyOn(manager, 'addEventListener')
    let resolveBattery!: (value: BrowserBattery) => void
    const pending = new Promise<BrowserBattery>((resolve) => { resolveBattery = resolve })
    const onChange = vi.fn()
    const stop = observeBrowserBattery({ getBattery: () => pending }, onChange)
    stop()
    resolveBattery(manager)
    await pending
    await Promise.resolve()
    expect(onChange).not.toHaveBeenCalled()
    expect(addListener).not.toHaveBeenCalled()
  })

  it('reports unknown for unavailable or rejected APIs without an unhandled rejection', async () => {
    const onChange = vi.fn()
    observeBrowserBattery({}, onChange)()
    expect(onChange).toHaveBeenLastCalledWith(null)
    onChange.mockClear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stop = observeBrowserBattery({ getBattery: () => Promise.reject(new Error('blocked')) }, onChange)
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(null))
    stop()
  })

  it.each([
    { name: 'missing event methods', battery: { level: 0.72, charging: false } },
    { name: 'missing addEventListener', battery: { level: 0.72, charging: false, removeEventListener: vi.fn() } },
    { name: 'missing removeEventListener', battery: { level: 0.72, charging: false, addEventListener: vi.fn() } },
    { name: 'non-callable event methods', battery: { level: 0.72, charging: false, addEventListener: true, removeEventListener: true } },
    { name: 'null result', battery: null },
    { name: 'non-object result', battery: 72 },
  ])('reports unknown and disposes safely for $name', async ({ battery }) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onChange = vi.fn()
    const stop = observeBrowserBattery({ getBattery: async () => battery }, onChange)

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(() => stop()).not.toThrow()
    expect(() => stop()).not.toThrow()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(null)
    if (battery && typeof battery === 'object' && typeof battery.addEventListener === 'function') {
      expect(battery.addEventListener).not.toHaveBeenCalled()
    }
  })

  it('does not turn invalid battery values into fabricated percentages', async () => {
    const manager: BrowserBattery = Object.assign(new EventTarget(), { level: -1, charging: false })
    const onChange = vi.fn()
    const stop = observeBrowserBattery({ getBattery: async () => manager }, onChange)
    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null))
    for (const value of [Number.NaN, 1.1, Number.POSITIVE_INFINITY]) {
      manager.level = value
      manager.dispatchEvent(new Event('levelchange'))
      expect(onChange).toHaveBeenLastCalledWith(null)
    }
    manager.level = 0
    manager.dispatchEvent(new Event('levelchange'))
    expect(onChange).toHaveBeenLastCalledWith({ level: 0, isCharging: false })
    stop()
  })
})

describe('Android battery observation', () => {
  function createBridge(values: { level: number; scale: number; status: number }): AndroidBatteryBridge {
    return {
      runtimeMainActivity: () => 'activity',
      newObject: vi.fn(() => 'filter'),
      invoke: vi.fn((_object, method, ...args) => {
        if (method === 'registerReceiver') return 'intent'
        return values[args[0] as keyof typeof values]
      }),
    }
  }

  it('reads the sticky broadcast, refreshes and stops polling on disposal', () => {
    vi.useFakeTimers()
    const values = { level: 144, scale: 200, status: 3 }
    const bridge = createBridge(values)
    const onChange = vi.fn()
    const stop = observeAndroidBattery(bridge, onChange)
    expect(bridge.invoke).toHaveBeenCalledWith('activity', 'registerReceiver', null, 'filter')
    expect(onChange).toHaveBeenLastCalledWith({ level: 72, isCharging: false })
    values.level = 160
    values.status = 2
    vi.advanceTimersByTime(30_000)
    expect(onChange).toHaveBeenLastCalledWith({ level: 80, isCharging: true })
    values.level = 200
    values.status = 5
    vi.advanceTimersByTime(30_000)
    expect(onChange).toHaveBeenLastCalledWith({ level: 100, isCharging: true })
    stop()
    onChange.mockClear()
    vi.advanceTimersByTime(60_000)
    expect(onChange).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports unknown if the battery scale is invalid or the native bridge fails', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const bridge = createBridge({ level: 72, scale: 0, status: 3 })
    const stop = observeAndroidBattery(bridge, onChange)
    expect(onChange).toHaveBeenLastCalledWith(null)
    stop()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    bridge.invoke = () => { throw new Error('unavailable') }
    const stopFailed = observeAndroidBattery(bridge, onChange)
    expect(onChange).toHaveBeenLastCalledWith(null)
    stopFailed()
  })
})
