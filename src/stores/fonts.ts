import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_ADDED_FONT_IDS, DEFAULT_FONT_ID, fontCatalog, getFont } from '../fonts/catalog'
import type { LearningFont } from '../fonts/types'

export const FONT_STATE_STORAGE_KEY = 'font-learning-fonts'
export const CUSTOM_FONTS_STORAGE_KEY = 'font-learning-custom-fonts'
const LEGACY_CURRENT_FONT_STORAGE_KEY = 'font-learning-current'

interface StoredFontState {
  version: 1
  addedIds: string[]
  currentId: string
}

export interface PersistedCustomFont extends LearningFont {
  dataUrl?: string
  savedFilePath?: string
}

function readCustomFonts(): PersistedCustomFont[] {
  try {
    const stored = uni.getStorageSync(CUSTOM_FONTS_STORAGE_KEY) as unknown
    if (!Array.isArray(stored)) return []
    return stored.filter((item): item is PersistedCustomFont => {
      if (typeof item !== 'object' || item === null) return false
      const font = item as Partial<PersistedCustomFont>
      return typeof font.id === 'string' && typeof font.name === 'string' && typeof font.fontFamily === 'string'
    })
  } catch {
    return []
  }
}

function registerCustomFontFace(font: PersistedCustomFont) {
  const src = font.dataUrl || font.savedFilePath
  if (!src) return
  // App 端优先使用 uni.loadFontFace，能正确处理本地文件路径
  const uniAny = uni as unknown as { loadFontFace?: (options: { family: string; source: string; success?: () => void; fail?: (err: unknown) => void }) => void }
  if (font.savedFilePath && typeof uniAny.loadFontFace === 'function') {
    try {
      if (typeof document !== 'undefined' && document.querySelector?.(`style[data-custom-font="${font.fontFamily}"]`)) return
      // 避免重复加载：用全局标记
      const loadedKey = `__font_loaded_${font.fontFamily}`
      if ((globalThis as unknown as Record<string, unknown>)[loadedKey]) return
      ;(globalThis as unknown as Record<string, unknown>)[loadedKey] = true
      uniAny.loadFontFace({
        family: font.fontFamily,
        source: `url("${font.savedFilePath}")`,
        success: () => {},
        fail: () => {
          // 回退到 style 注入
          injectFontFaceStyle(font.fontFamily, src)
        },
      })
      return
    } catch {
      // 回退
    }
  }
  injectFontFaceStyle(font.fontFamily, src)
}

function injectFontFaceStyle(family: string, src: string) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function' || !document.head) return
  try {
    if (document.querySelector(`style[data-custom-font="${family}"]`)) return
    const style = document.createElement('style')
    style.setAttribute('data-custom-font', family)
    style.textContent = `@font-face{font-family:"${family}";src:url("${src}") format("truetype");font-display:swap;}`
    document.head.appendChild(style)
  } catch {
    // 忽略注册失败
  }
}

function registerAllCustomFonts(fonts: PersistedCustomFont[]) {
  for (const font of fonts) registerCustomFontFace(font)
}

function getBuiltinFont(fontId: string): LearningFont | undefined {
  return getFont(fontId)
}

function uniqueValidIds(value: unknown, customFonts: LearningFont[]): string[] {
  if (!Array.isArray(value)) return []
  const isValid = (id: string) => Boolean(getBuiltinFont(id) || customFonts.find((font) => font.id === id))
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && isValid(id)))]
}

function readStoredState(customFonts: LearningFont[]): StoredFontState {
  try {
    const stored = uni.getStorageSync(FONT_STATE_STORAGE_KEY) as Partial<StoredFontState> | undefined
    const addedIds = uniqueValidIds(stored?.addedIds, customFonts)
    if (addedIds.length > 0) {
      const currentId = typeof stored?.currentId === 'string' && addedIds.includes(stored.currentId)
        ? stored.currentId
        : addedIds[0]!
      return { version: 1, addedIds, currentId }
    }

    const legacyCurrentId = uni.getStorageSync(LEGACY_CURRENT_FONT_STORAGE_KEY)
    const currentId = typeof legacyCurrentId === 'string' && DEFAULT_ADDED_FONT_IDS.includes(legacyCurrentId)
      ? legacyCurrentId
      : DEFAULT_FONT_ID
    return { version: 1, addedIds: [...DEFAULT_ADDED_FONT_IDS], currentId }
  } catch {
    return { version: 1, addedIds: [...DEFAULT_ADDED_FONT_IDS], currentId: DEFAULT_FONT_ID }
  }
}

export const useFontStore = defineStore('fonts', () => {
  const customFonts = ref<PersistedCustomFont[]>(readCustomFonts())
  // 本地方案：启动时立即注册持久化的自定义字体，确保刷新后仍可显示
  registerAllCustomFonts(customFonts.value)
  const storedState = readStoredState(customFonts.value)
  const addedFontIds = ref(storedState.addedIds)
  const currentFontId = ref(storedState.currentId)

  function getAnyFont(fontId: string): LearningFont | undefined {
    return getBuiltinFont(fontId) ?? customFonts.value.find((font) => font.id === fontId)
  }

  const addedFonts = computed(() => addedFontIds.value.map(getAnyFont).filter((font): font is LearningFont => font !== undefined))
  const currentFont = computed(() => getAnyFont(currentFontId.value) ?? fontCatalog[0]!)

  function persist() {
    const state: StoredFontState = {
      version: 1,
      addedIds: [...addedFontIds.value],
      currentId: currentFontId.value,
    }
    try {
      uni.setStorageSync(FONT_STATE_STORAGE_KEY, state)
      uni.setStorageSync(LEGACY_CURRENT_FONT_STORAGE_KEY, state.currentId)
    } catch { /* 存储不可用时仍保留当前会话内的字体状态 */ }
  }

  function persistCustomFonts() {
    try {
      uni.setStorageSync(CUSTOM_FONTS_STORAGE_KEY, customFonts.value)
    } catch { /* 自定义字体持久化失败时仍保留内存状态 */ }
  }

  function addFont(fontId: string) {
    if (!getAnyFont(fontId) || addedFontIds.value.includes(fontId)) return
    addedFontIds.value = [...addedFontIds.value, fontId]
    persist()
  }

  function removeFont(fontId: string) {
    if (fontId === currentFontId.value) return
    addedFontIds.value = addedFontIds.value.filter((id) => id !== fontId)
    persist()
  }

  function selectFont(fontId: string) {
    if (!addedFontIds.value.includes(fontId)) return
    currentFontId.value = fontId
    persist()
  }

  function isAdded(fontId: string) {
    return addedFontIds.value.includes(fontId)
  }

  function addCustomFont(font: PersistedCustomFont) {
    if (customFonts.value.some((item) => item.id === font.id)) return
    customFonts.value = [...customFonts.value, font]
    persistCustomFonts()
    // 立即注册新字体，保证当前会话可预览
    registerCustomFontFace(font)
  }

  function removeCustomFont(fontId: string) {
    const exists = customFonts.value.some((font) => font.id === fontId)
    if (!exists) return
    customFonts.value = customFonts.value.filter((font) => font.id !== fontId)
    persistCustomFonts()
    // 同步从已添加列表移除，避免残留无效 id
    if (addedFontIds.value.includes(fontId)) {
      addedFontIds.value = addedFontIds.value.filter((id) => id !== fontId)
      // 若当前字体被删除，自动切换到首个可用字体
      if (currentFontId.value === fontId) {
        const fallback = addedFontIds.value[0] ?? DEFAULT_FONT_ID
        currentFontId.value = fallback
      }
      persist()
    }
  }

  return {
    addedFontIds,
    addedFonts,
    currentFontId,
    currentFont,
    customFonts,
    getAnyFont,
    addFont,
    removeFont,
    selectFont,
    isAdded,
    addCustomFont,
    removeCustomFont,
  }
})
