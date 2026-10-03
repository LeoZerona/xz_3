import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProfileStore } from './profile'

describe('profile store', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('updates the reactive profile after local persistence succeeds', async () => {
    let stored: unknown = null
    vi.stubGlobal('uni', {
      getStorageSync: () => stored,
      setStorageSync: (_key: string, value: unknown) => { stored = value },
    })
    setActivePinia(createPinia())
    const store = useProfileStore()

    await store.updateProfile({ nickname: '林同学' })

    expect(store.profile.nickname).toBe('林同学')
    expect(stored).toMatchObject({ nickname: '林同学', version: 1 })
  })
})
