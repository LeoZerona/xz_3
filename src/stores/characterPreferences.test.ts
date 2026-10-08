import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { CHARACTER_PREFERENCES_STORAGE_KEY, useCharacterPreferencesStore } from './characterPreferences'

describe('character preferences store', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('restores and persists favorite and excluded characters', () => {
    const storage = new Map<string, unknown>([[CHARACTER_PREFERENCES_STORAGE_KEY, {
      version: 1,
      favoriteIds: ['char-0001'],
      excludedIds: ['char-0002'],
    }]])
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    })
    setActivePinia(createPinia())
    const store = useCharacterPreferencesStore()

    store.toggleFavorite('char-0001')
    store.toggleFavorite('char-0003')
    store.toggleExcluded('char-0004')

    expect(store.favoriteIds).toEqual(['char-0003'])
    expect(store.excludedIds).toEqual(['char-0002', 'char-0004'])
    expect(storage.get(CHARACTER_PREFERENCES_STORAGE_KEY)).toEqual({
      version: 1,
      favoriteIds: ['char-0003'],
      excludedIds: ['char-0002', 'char-0004'],
    })
  })
})
