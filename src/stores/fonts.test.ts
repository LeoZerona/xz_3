import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_ADDED_FONT_IDS, fontCatalog } from '../fonts/catalog'
import { FONT_STATE_STORAGE_KEY, useFontStore } from './fonts'

const [firstFontId, secondFontId] = DEFAULT_ADDED_FONT_IDS
const thirdFont = fontCatalog[2]!

describe('字体管理 store', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('添加、设置学习与对照字体后持久化有效状态', () => {
    const storage = new Map<string, unknown>()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    })
    setActivePinia(createPinia())
    const store = useFontStore()

    store.addFont(thirdFont.id)
    store.selectLearningFont(thirdFont.id)
    store.selectReferenceFont(firstFontId!)
    store.removeFont(secondFontId!)

    expect(store.addedFontIds).toEqual([firstFontId, thirdFont.id])
    expect(store.currentFont.name).toBe(thirdFont.name)
    expect(store.referenceFont.id).toBe(firstFontId)
    expect(storage.get(FONT_STATE_STORAGE_KEY)).toEqual({
      version: 2,
      addedIds: [firstFontId, thirdFont.id],
      currentId: thirdFont.id,
      referenceId: firstFontId,
    })
  })

  it('不允许删除正在使用的学习字体或对照字体', () => {
    vi.stubGlobal('uni', { getStorageSync: () => undefined, setStorageSync: vi.fn() })
    setActivePinia(createPinia())
    const store = useFontStore()

    store.removeFont(firstFontId!)
    store.removeFont(secondFontId!)

    expect(store.addedFontIds).toContain(firstFontId)
    expect(store.addedFontIds).toContain(secondFontId)
  })

  it('将对照字体设为学习字体时交换两种字体角色', () => {
    const storage = new Map<string, unknown>()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    })
    setActivePinia(createPinia())
    const store = useFontStore()

    store.selectLearningFont(secondFontId!)

    expect(store.currentFontId).toBe(secondFontId)
    expect(store.referenceFontId).toBe(firstFontId)
  })

  it('从旧版状态恢复时自动补齐对照字体', () => {
    const storage = new Map<string, unknown>([[FONT_STATE_STORAGE_KEY, {
      version: 1,
      addedIds: [firstFontId, secondFontId],
      currentId: secondFontId,
    }]])
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    })
    setActivePinia(createPinia())
    const store = useFontStore()

    expect(store.currentFontId).toBe(secondFontId)
    expect(store.referenceFontId).toBe(firstFontId)
  })
})
