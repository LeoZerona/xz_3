export interface DeviceBattery {
  level: number
  isCharging: boolean
}

export interface BrowserBattery extends EventTarget {
  level: number
  charging: boolean
}

export interface BatteryNavigator {
  getBattery?: () => Promise<unknown>
}

// Native.js 的对象为桥接句柄，只能交给 invoke 调用，不能当作普通 JS 对象读取。
export interface AndroidBatteryBridge {
  runtimeMainActivity: () => unknown
  newObject: (className: string, ...args: unknown[]) => unknown
  invoke: (object: unknown, method: string, ...args: unknown[]) => unknown
}

declare const plus: { os: { name: string }; android?: AndroidBatteryBridge } | undefined

type BatteryListener = (battery: DeviceBattery | null) => void

function normalizeBattery(level: unknown, isCharging: boolean): DeviceBattery | null {
  if (typeof level !== 'number' || !Number.isFinite(level) || level < 0 || level > 100) return null
  return { level: Math.round(level), isCharging }
}

function isBrowserBattery(value: unknown): value is BrowserBattery {
  return typeof value === 'object' && value !== null
    && 'level' in value && typeof value.level === 'number'
    && 'charging' in value && typeof value.charging === 'boolean'
    && 'addEventListener' in value && typeof value.addEventListener === 'function'
    && 'removeEventListener' in value && typeof value.removeEventListener === 'function'
    && 'dispatchEvent' in value && typeof value.dispatchEvent === 'function'
}

export function observeBrowserBattery(source: BatteryNavigator, onChange: BatteryListener): () => void {
  let isDisposed = false
  let manager: BrowserBattery | null = null
  const update = () => {
    if (!isDisposed && manager) onChange(normalizeBattery(manager.level * 100, manager.charging))
  }
  const getBattery = source.getBattery
  if (typeof getBattery !== 'function') {
    onChange(null)
    return () => { isDisposed = true }
  }
  // 某些浏览器或非安全来源禁止电量 API，降级为未知电量，阅读仍可继续。
  void Promise.resolve().then(() => getBattery.call(source)).then((battery) => {
    if (isDisposed) return
    // 部分 WebView/垫片返回不完整对象，先校验事件接口，避免订阅或清理时抛错。
    if (!isBrowserBattery(battery)) {
      onChange(null)
      return
    }
    manager = battery
    update()
    manager.addEventListener('levelchange', update)
    manager.addEventListener('chargingchange', update)
  }).catch((error: unknown) => {
    if (isDisposed) return
    console.warn('读取浏览器电量失败', error)
    onChange(null)
  })
  return () => {
    isDisposed = true
    manager?.removeEventListener('levelchange', update)
    manager?.removeEventListener('chargingchange', update)
  }
}

export function observeAndroidBattery(bridge: AndroidBatteryBridge, onChange: BatteryListener): () => void {
  let hasReportedError = false
  const update = () => {
    try {
      const activity = bridge.runtimeMainActivity()
      const filter = bridge.newObject('android.content.IntentFilter', 'android.intent.action.BATTERY_CHANGED')
      // null 接收器只读取系统保留的电池状态，不注册常驻广播接收器。
      const intent = bridge.invoke(activity, 'registerReceiver', null, filter)
      if (!intent) {
        onChange(null)
        return
      }
      const level = bridge.invoke(intent, 'getIntExtra', 'level', -1)
      const scale = bridge.invoke(intent, 'getIntExtra', 'scale', -1)
      const status = bridge.invoke(intent, 'getIntExtra', 'status', -1)
      onChange(normalizeBattery(
        typeof level === 'number' && typeof scale === 'number' && scale > 0 ? level / scale * 100 : null,
        status === 2 || status === 5,
      ))
    } catch (error: unknown) {
      // 基座缺少 Native.js 或设备不开放电池信息时，不影响阅读。
      if (!hasReportedError) console.warn('读取 Android 电量失败', error)
      hasReportedError = true
      onChange(null)
    }
  }
  update()
  const timer = setInterval(update, 30_000)
  return () => clearInterval(timer)
}

export function observeDeviceBattery(onChange: BatteryListener): () => void {
  // #ifdef APP-PLUS
  if (typeof plus !== 'undefined' && plus.os.name === 'Android' && plus.android) {
    return observeAndroidBattery(plus.android, onChange)
  }
  // #endif
  // #ifdef H5
  if (typeof navigator !== 'undefined') return observeBrowserBattery(navigator as BatteryNavigator, onChange)
  // #endif
  onChange(null)
  return () => {}
}
