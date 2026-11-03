import { computed, ref, watch } from 'vue'
import type { LevelStageView } from '../../study/levelLayouts'

interface StagePagerOptions {
  items: () => readonly LevelStageView[]
  initialStageId: () => string | undefined
  hasMore: () => boolean
  isLoading: () => boolean
  requestMore: () => void
  pageSize: number
}

/** 保留浏览位置；跨越已加载批次时，等数据到达后再翻页。 */
export function useStagePager(options: StagePagerOptions) {
  const start = ref(0)
  const pendingTarget = ref<number | null>(null)
  let initialized = false
  const pageItems = computed(() => options.items().slice(start.value, start.value + options.pageSize))
  const currentItem = computed(() => options.items()[start.value])
  const canPrevious = computed(() => start.value > 0)
  const canNext = computed(() => start.value + options.pageSize < options.items().length || options.hasMore())
  const isPending = computed(() => pendingTarget.value !== null)

  watch([() => options.items().length, options.isLoading], ([length, loading]) => {
    if (!initialized && length > 0) {
      const index = options.items().findIndex((item) => item.stage.id === options.initialStageId())
      start.value = Math.floor(Math.max(0, index) / options.pageSize) * options.pageSize
      initialized = true
    }
    if (pendingTarget.value === null) return
    if (length > pendingTarget.value) {
      start.value = pendingTarget.value
      pendingTarget.value = null
    } else if (!loading) {
      // 加载失败时保留当前页，交由页面显示错误与重试入口。
      pendingTarget.value = null
    }
  }, { immediate: true })

  function goTo(index: number): void {
    if (index < 0 || isPending.value) return
    if (index < options.items().length) {
      start.value = Math.floor(index / options.pageSize) * options.pageSize
    } else if (options.hasMore() && !options.isLoading()) {
      pendingTarget.value = index
      options.requestMore()
    }
  }
  function previous(): void { goTo(start.value - options.pageSize) }
  function next(): void { goTo(start.value + options.pageSize) }

  return { start, pageItems, currentItem, canPrevious, canNext, isPending, goTo, previous, next }
}
