import { effectScope, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { LevelStageView } from '../../study/levelLayouts'
import { useStagePager } from './useStagePager'

function stages(count: number): LevelStageView[] {
  return Array.from({ length: count }, (_, index) => ({
    stage: { id: `stage-${index}`, category: 'level1', index: index + 1, title: `关卡 ${index + 1}`, characters: [], isPlaceholder: false },
    completedChars: 0, isDone: false, progress: 0,
  }))
}
function setup(pageSize: number, initialStageId = 'stage-0') {
  const items = ref(stages(24))
  const loading = ref(false)
  const hasMore = ref(true)
  const requestMore = vi.fn(() => { loading.value = true })
  const scope = effectScope()
  const pager = scope.run(() => useStagePager({ items: () => items.value, initialStageId: () => initialStageId, hasMore: () => hasMore.value, isLoading: () => loading.value, requestMore, pageSize }))!
  return { items, loading, hasMore, requestMore, scope, pager }
}

describe('关卡翻页', () => {
  it('闪卡从正在学习的关卡开始，已加载范围内可直接前后切换', () => {
    const { pager, scope, requestMore } = setup(1, 'stage-5')
    expect(pager.currentItem.value?.stage.id).toBe('stage-5')
    pager.previous()
    expect(pager.currentItem.value?.stage.id).toBe('stage-4')
    pager.next()
    expect(pager.currentItem.value?.stage.id).toBe('stage-5')
    expect(requestMore).not.toHaveBeenCalled()
    scope.stop()
  })

  it.each([1, 12])('每页 %i 关时，跨越首批 24 关只请求一次并等待数据到达', async (pageSize) => {
    const { pager, items, loading, scope, requestMore } = setup(pageSize)
    pager.goTo(24 - pageSize)
    pager.next()
    pager.next()
    expect(requestMore).toHaveBeenCalledTimes(1)
    expect(pager.start.value).toBe(24 - pageSize)
    expect(pager.isPending.value).toBe(true)
    items.value = stages(48)
    loading.value = false
    await nextTick()
    expect(pager.start.value).toBe(24)
    expect(pager.pageItems.value).toHaveLength(pageSize)
    expect(pager.isPending.value).toBe(false)
    scope.stop()
  })

  it('加载失败后保留当前组并允许重试，最后一组不足 12 关时正确收尾', async () => {
    const { pager, items, loading, hasMore, scope, requestMore } = setup(12)
    pager.next()
    pager.next()
    await nextTick()
    loading.value = false
    await nextTick()
    expect(pager.start.value).toBe(12)
    expect(pager.isPending.value).toBe(false)
    pager.next()
    expect(requestMore).toHaveBeenCalledTimes(2)
    items.value = stages(27)
    hasMore.value = false
    loading.value = false
    await nextTick()
    expect(pager.pageItems.value).toHaveLength(3)
    expect(pager.canNext.value).toBe(false)
    pager.previous()
    expect(pager.start.value).toBe(12)
    scope.stop()
  })
})
