import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FONT_STATE_STORAGE_KEY, useFontStore } from './fonts'

describe('字体管理 store', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('添加、切换和删除字体后持久化有效状态', () => {
    const storage = new Map<string, unknown>()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    })
    setActivePinia(createPinia())
    const store = useFontStore()

    store.addFont('regular-script')
    store.selectFont('regular-script')
    store.removeFont('font-two')

    expect(store.addedFontIds).toEqual(['font-one', 'regular-script'])
    expect(store.currentFont.name).toBe('楷书')
    expect(storage.get(FONT_STATE_STORAGE_KEY)).toEqual({
      version: 1,
      addedIds: ['font-one', 'regular-script'],
      currentId: 'regular-script',
    })
  })

  it('不允许删除当前在学字体', () => {
    vi.stubGlobal('uni', { getStorageSync: () => undefined, setStorageSync: vi.fn() })
    setActivePinia(createPinia())
    const store = useFontStore()

    store.removeFont('font-one')

    expect(store.addedFontIds).toContain('font-one')
  })
})
