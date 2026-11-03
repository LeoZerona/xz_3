import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLevelLayoutStore } from './levelLayout'
import { LEVEL_LAYOUTS, LEVEL_LAYOUT_STORAGE_KEY } from '../study/levelLayouts'
import { setupTestDatabase } from '../database/testSupport'
import { flushPersistence, initializePersistence, persistenceError, readStored, resetPersistenceForTests } from '../database/persistence'

describe('关卡布局偏好', () => {
  beforeEach(() => { setActivePinia(createPinia()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it.each([undefined, '', 'removed-layout', { id: 'board' }])('没有有效配置时保留当前经典卡片布局：%j', async (value) => {
    await setupTestDatabase(new Map([[LEVEL_LAYOUT_STORAGE_KEY, value]]))
    const store = useLevelLayoutStore()
    store.hydrate()
    expect(store.currentLayoutId).toBe('cards')
    expect(store.currentLayout.name).toBe('经典卡片')
  })

  it.each(LEVEL_LAYOUTS)('选择 $name 后保存，并在重新启动后恢复', async ({ id }) => {
    await setupTestDatabase(new Map([['morning-pages:theme', 'jade-green']]))
    const store = useLevelLayoutStore()
    store.hydrate()
    store.selectLayout(id)
    expect(store.currentLayoutId).toBe(id)
    expect(readStored(LEVEL_LAYOUT_STORAGE_KEY)).toBe(id)
    expect(readStored('morning-pages:theme')).toBe('jade-green')
    await flushPersistence()
    resetPersistenceForTests()
    await initializePersistence()
    setActivePinia(createPinia())
    const restarted = useLevelLayoutStore()
    restarted.hydrate()
    expect(restarted.currentLayoutId).toBe(id)
  })

  it('数据库未就绪时不虚报保存成功，保持之前的选择并显示错误', () => {
    resetPersistenceForTests()
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = useLevelLayoutStore()
    store.selectLayout('board')
    expect(store.currentLayoutId).toBe('cards')
    expect(persistenceError.value).toContain('数据库尚未就绪')
    expect(diagnostic).toHaveBeenCalled()
    diagnostic.mockRestore()
  })
})
