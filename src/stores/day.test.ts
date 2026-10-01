import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { tasks, useDayStore } from './day'
import { readLocal, writeLocal } from '../utils/storage'

vi.mock('../utils/storage', () => ({ readLocal: vi.fn(), writeLocal: vi.fn() }))

describe('今日计划', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(readLocal).mockReset()
    vi.mocked(writeLocal).mockReset()
  })

  it('从本地记录恢复完成状态', async () => {
    vi.mocked(readLocal).mockResolvedValue(['plan', 'unknown'])
    const store = useDayStore()
    await store.hydrate()
    expect(store.completed).toEqual(['plan'])
    expect(store.progress).toBe(Math.round(100 / tasks.length))
  })

  it('切换任务并保存完成状态', async () => {
    const store = useDayStore()
    await store.toggle('focus')
    expect(store.completed).toEqual(['focus'])
    expect(writeLocal).toHaveBeenCalledWith(expect.stringMatching(/^morning-pages:done:/), ['focus'])
    await store.toggle('focus')
    expect(store.completed).toEqual([])
  })
})
