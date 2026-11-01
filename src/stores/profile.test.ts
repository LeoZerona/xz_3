import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProfileStore } from './profile'
import { setupTestDatabase } from '../database/testSupport'
import { readStored, saveStored } from '../database/persistence'
import { PROFILE_STORAGE_KEY } from '../profile/types'

describe('profile store', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('updates the reactive profile after local persistence succeeds', async () => {
    let stored: unknown = null
    vi.stubGlobal('uni', {
      getStorageSync: () => stored,
      setStorageSync: (_key: string, value: unknown) => { stored = value },
    })
    setActivePinia(createPinia())
    await setupTestDatabase()
    const store = useProfileStore()

    await store.updateProfile({ nickname: '林同学' })

    expect(store.profile.nickname).toBe('林同学')
    expect(readStored(PROFILE_STORAGE_KEY)).toMatchObject({ nickname: '林同学', version: 1 })
  })

  it('rehydrates an initialized profile after data restoration', async () => {
    await setupTestDatabase()
    setActivePinia(createPinia())
    const store = useProfileStore()
    await store.updateProfile({ nickname: '恢复前' })
    saveStored(PROFILE_STORAGE_KEY, { ...store.profile, nickname: '已恢复的资料' })
    store.hydrate()
    expect(store.profile.nickname).toBe('已恢复的资料')
    expect(store.isInitialized).toBe(true)
  })
})
