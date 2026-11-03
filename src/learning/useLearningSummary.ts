import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { applicationReady } from '../database/application'
import { activityRevision } from './activity'
import { readLearningSummary } from './history'
import { summarizeActivities } from './summary'

export function useLearningSummary() {
  const summary = ref(summarizeActivities([], []))
  const isLoading = ref(false)
  const loadError = ref('')
  let sequence = 0
  let active = true
  async function refresh(): Promise<void> {
    if (!applicationReady.value || !active) return
    const request = ++sequence
    isLoading.value = true
    try {
      const next = await readLearningSummary()
      if (active && request === sequence) { summary.value = next; loadError.value = '' }
    } catch (cause) {
      if (active && request === sequence) {
        loadError.value = cause instanceof Error ? cause.message : '学习记录读取失败'
        console.error('学习记录读取失败', cause)
      }
    } finally { if (active && request === sequence) isLoading.value = false }
  }
  watch([activityRevision, applicationReady], () => { void refresh() })
  onMounted(() => { void refresh() })
  onShow(() => { void refresh() })
  onBeforeUnmount(() => { active = false; sequence++ })
  return { summary, isLoading, loadError, refresh }
}
