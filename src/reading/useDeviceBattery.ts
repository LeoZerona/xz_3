import { onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { observeDeviceBattery } from './deviceBattery'
import type { DeviceBattery } from './deviceBattery'

export function useDeviceBattery(isEnabled: Readonly<Ref<boolean>>): Ref<DeviceBattery | null> {
  const battery = ref<DeviceBattery | null>(null)
  const isPageVisible = ref(true)
  const isDocumentVisible = ref(typeof document === 'undefined' || document.visibilityState !== 'hidden')
  let stopObserving: (() => void) | undefined

  function handleVisibilityChange(): void {
    isDocumentVisible.value = document.visibilityState !== 'hidden'
  }

  watch([isEnabled, isPageVisible, isDocumentVisible], ([enabled, pageVisible, documentVisible]) => {
    stopObserving?.()
    stopObserving = undefined
    if (enabled && pageVisible && documentVisible) {
      battery.value = null
      stopObserving = observeDeviceBattery((value) => { battery.value = value })
    }
  }, { immediate: true })

  onShow(() => { isPageVisible.value = true })
  onHide(() => { isPageVisible.value = false })
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', handleVisibilityChange)
  onBeforeUnmount(() => {
    stopObserving?.()
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
  return battery
}
