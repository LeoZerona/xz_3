import { onBeforeUnmount, onMounted, provide, ref, watch, type InjectionKey, type Ref } from 'vue'
import { applicationReady } from './application'
export const databaseTaskKey: InjectionKey<{ error: Ref<string>; loading: Ref<boolean>; retry: () => Promise<void> }> = Symbol('database-task')

/** 页面任务只在初始化成功后执行；重试初始化成功也会重新触发。 */
export function useDatabaseTask(task: () => Promise<void> | void) {
  const error = ref('')
  const loading = ref(true)
  let active = true
  let mounted = false
  async function run() {
    if (!active || !applicationReady.value) return
    loading.value = true
    error.value = ''
    try { await task() } catch (cause) { if (active) { error.value = cause instanceof Error ? cause.message : String(cause); console.error('页面数据读取失败', cause) } }
    finally { if (active) loading.value = false }
  }
  watch(applicationReady, (ready) => { if (ready && mounted) void run() })
  onMounted(() => { mounted = true; if (applicationReady.value) void run() })
  provide(databaseTaskKey, { error, loading, retry: run })
  onBeforeUnmount(() => { active = false })
  return { databaseLoadError: error, databaseLoading: loading, retryDatabaseTask: run }
}
