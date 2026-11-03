import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setupTestDatabase } from '../database/testSupport'
import { flushPersistence, readStored } from '../database/persistence'
import { useDailyProgressStore } from './dailyProgress'

afterEach(() => vi.useRealTimers())
describe('每日会话跨日保护', () => {
  it('旧页面直接保存时不把昨日字单写入今日', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 3, 23, 59))
    await setupTestDatabase()
    setActivePinia(createPinia())
    const store = useDailyProgressStore()
    store.hydrate(); store.ensureSession(['char-0001'], 1)
    vi.setSystemTime(new Date(2026, 10, 4, 0, 1))
    store.persist()
    await flushPersistence()
    expect(readStored('font-learning-daily-progress:2026-11-4')).toBeUndefined()
    expect(readStored('font-learning-daily-progress:2026-11-3')).toMatchObject({ assignedIds: ['char-0001'] })
  })
})
