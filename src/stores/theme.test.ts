import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import { DEFAULT_THEME_ID, THEME_STORAGE_KEY } from '../theme/themes'
import { useThemeStore } from './theme'

describe('App 无 DOM 环境的主题状态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('document', undefined)
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('切换时更新已绑定的页面样式，并在重新启动时恢复', () => {
    const storage = new Map<string, unknown>([[THEME_STORAGE_KEY, 'jade-green']])
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    })
    const store = useThemeStore()
    store.initialize()
    const { themeStyle } = storeToRefs(store)
    expect(themeStyle.value['--color-primary']).toBe('#16856b')

    store.selectTheme('ink-night')
    expect(themeStyle.value['--color-page']).toBe('#151922')
    expect(themeStyle.value['--color-text']).toBe('#f1f4fa')
    expect(themeStyle.value.colorScheme).toBe('dark')
    expect(storage.get(THEME_STORAGE_KEY)).toBe('ink-night')

    setActivePinia(createPinia())
    const restarted = useThemeStore()
    restarted.initialize()
    expect(restarted.currentThemeId).toBe('ink-night')
    expect(restarted.themeStyle).toEqual(themeStyle.value)
  })

  it('存储失效或主题不存在时回退，写入失败仍能在当前会话切换', () => {
    vi.stubGlobal('uni', {
      getStorageSync: () => { throw new Error('storage unavailable') },
      setStorageSync: () => { throw new Error('storage unavailable') },
    })
    const store = useThemeStore()
    store.initialize()
    expect(store.currentThemeId).toBe(DEFAULT_THEME_ID)
    store.selectTheme('sunset-orange')
    expect(store.themeStyle['--color-primary']).toBe('#e7652b')
    store.selectTheme('unknown-theme')
    expect(store.currentThemeId).toBe(DEFAULT_THEME_ID)
  })
})
