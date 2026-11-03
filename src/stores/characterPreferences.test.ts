import { setupTestDatabase } from '../database/testSupport'
import { flushPersistence, initializePersistence, readStored, resetPersistenceForTests, saveStored } from '../database/persistence'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  CHARACTER_LEARNING_STORAGE_KEY,
  LEGACY_CHARACTER_PREFERENCES_STORAGE_KEY,
  useCharacterLearningStore,
} from './characterLearning'

describe('character preferences store', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('增加必修题型并重载数据后，首次正式完成仍然保留', async () => {
    await setupTestDatabase()
    setActivePinia(createPinia())
    saveStored('font-learning-plan', { dailyCount: 15, modes: ['seal-to-reference-choice'] })
    const store = useCharacterLearningStore()
    store.recordModeAttempt('char-0001', 'seal-to-reference-choice', true, '2026-11-03T09:00:00.000Z')
    expect(store.isCharacterComplete('char-0001')).toBe(true)
    saveStored('font-learning-plan', { dailyCount: 15, modes: ['seal-to-reference-choice', 'seal-to-reference-input'] })
    expect(store.isCharacterComplete('char-0001')).toBe(true)
    await flushPersistence()
    resetPersistenceForTests()
    await initializePersistence()
    setActivePinia(createPinia())
    const restored = useCharacterLearningStore()
    expect(restored.completedIds).toEqual(['char-0001'])
    expect(restored.getRecord('char-0001')?.completedAt).toBe('2026-11-03T09:00:00.000Z')
  })

  it('migrates legacy favorites and slash state into versioned character records', async () => {
    const storage = new Map<string, unknown>([[LEGACY_CHARACTER_PREFERENCES_STORAGE_KEY, {
      version: 1,
      favoriteIds: ['char-0001'],
      excludedIds: ['char-0002'],
    }]])
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    })
    await setupTestDatabase(storage)
    setActivePinia(createPinia())
    const store = useCharacterLearningStore()

    store.toggleFavorite('char-0001', '2026-10-15T08:00:00.000Z')
    store.toggleFavorite('char-0003', '2026-10-15T08:01:00.000Z')
    store.toggleExcluded('char-0004', '2026-10-15T08:02:00.000Z')

    expect(store.favoriteIds).toEqual(['char-0003'])
    expect(store.excludedIds).toEqual(['char-0002', 'char-0004'])
    expect(readStored(CHARACTER_LEARNING_STORAGE_KEY)).toEqual(expect.objectContaining({
      version: 2,
      updatedAt: '2026-10-15T08:02:00.000Z',
      characters: expect.objectContaining({
        'char-0003': expect.objectContaining({
          favorite: { active: true, changedAt: '2026-10-15T08:01:00.000Z' },
        }),
        'char-0004': expect.objectContaining({
          slash: {
            active: true,
            changedAt: '2026-10-15T08:02:00.000Z',
            history: [{ action: 'slash', at: '2026-10-15T08:02:00.000Z' }],
          },
        }),
      }),
    }))
  })

  it('marks a character complete only after all three study modes pass', async () => {
    const storage = new Map<string, unknown>()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    })
    await setupTestDatabase(storage)
    setActivePinia(createPinia())
    const store = useCharacterLearningStore()

    store.recordModeAttempt('char-0001', 'seal-to-reference-choice', false, '2026-10-15T09:00:00.000Z')
    store.recordModeAttempt('char-0001', 'seal-to-reference-choice', true, '2026-10-15T09:01:00.000Z')
    store.recordModeAttempt('char-0001', 'reference-to-seal-choice', true, '2026-10-15T09:02:00.000Z')

    expect(store.isCharacterComplete('char-0001')).toBe(false)
    expect(store.getRecord('char-0001')?.modes['seal-to-reference-choice']).toEqual({
      attempts: 2,
      mistakes: 1,
      firstAttemptAt: '2026-10-15T09:00:00.000Z',
      lastAttemptAt: '2026-10-15T09:01:00.000Z',
      completedAt: '2026-10-15T09:01:00.000Z',
    })

    store.recordModeAttempt('char-0001', 'seal-to-reference-input', true, '2026-10-15T09:03:00.000Z')

    expect(store.isCharacterComplete('char-0001')).toBe(true)
    expect(store.completedIds).toEqual(['char-0001'])
    expect(store.getRecord('char-0001')?.completedAt).toBe('2026-10-15T09:03:00.000Z')
  })

  it('persists slash toggles while preserving the existing learning progress', async () => {
    const storage = new Map<string, unknown>()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => storage.set(key, JSON.parse(JSON.stringify(value))),
    })
    await setupTestDatabase(storage)
    setActivePinia(createPinia())
    const store = useCharacterLearningStore()
    store.recordModeAttempt('char-0001', 'seal-to-reference-choice', true, '2026-10-29T09:00:00.000Z')
    const progress = { ...store.getRecord('char-0001')!.modes['seal-to-reference-choice'] }

    store.toggleExcluded('char-0001', '2026-10-29T09:01:00.000Z')
    expect(store.isExcluded('char-0001')).toBe(true)
    store.toggleExcluded('char-0001', '2026-10-29T09:02:00.000Z')
    expect(store.isExcluded('char-0001')).toBe(false)
    expect(store.getRecord('char-0001')?.modes['seal-to-reference-choice']).toEqual(progress)
    expect(store.nextIncompleteMode('char-0001')).toBe('reference-to-seal-choice')

    await flushPersistence()
    resetPersistenceForTests()
    await initializePersistence()
    setActivePinia(createPinia())
    const restoredStore = useCharacterLearningStore()
    expect(restoredStore.isExcluded('char-0001')).toBe(false)
    expect(restoredStore.getRecord('char-0001')?.status).toBe('learning')
    expect(restoredStore.getRecord('char-0001')?.modes['seal-to-reference-choice']).toEqual(progress)
    expect(restoredStore.getRecord('char-0001')?.slash.history).toEqual([
      { action: 'slash', at: '2026-10-29T09:01:00.000Z' },
      { action: 'restore', at: '2026-10-29T09:02:00.000Z' },
    ])
  })
})
