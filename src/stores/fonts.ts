import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_ADDED_FONT_IDS,
  DEFAULT_FONT_ID,
  fontCatalog,
  getFont,
} from '../fonts/catalog'
import type { LearningFont } from '../fonts/types'

export const FONT_STATE_STORAGE_KEY = 'font-learning-fonts'
export const CUSTOM_FONTS_STORAGE_KEY = 'font-learning-custom-fonts'
const LEGACY_CURRENT_FONT_STORAGE_KEY = 'font-learning-current'

interface StoredFontState {
  version: 1 | 2
  addedIds: string[]
  currentId: string
  referenceId?: string
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
      const referenceId = typeof stored?.referenceId === 'string' && addedIds.includes(stored.referenceId)
        ? stored.referenceId
        : (addedIds.find((id) => id !== currentId) ?? currentId)
      return { version: 2, addedIds, currentId, referenceId }
    }

    const legacyCurrentId = uni.getStorageSync(LEGACY_CURRENT_FONT_STORAGE_KEY)
    const currentId = typeof legacyCurrentId === 'string' && DEFAULT_ADDED_FONT_IDS.includes(legacyCurrentId)
      ? legacyCurrentId
      : DEFAULT_FONT_ID
    const referenceId = DEFAULT_ADDED_FONT_IDS.find((id) => id !== currentId) ?? currentId
    return { version: 2, addedIds: [...DEFAULT_ADDED_FONT_IDS], currentId, referenceId }
  } catch {
    const referenceId = DEFAULT_ADDED_FONT_IDS.find((id) => id !== DEFAULT_FONT_ID) ?? DEFAULT_FONT_ID
    return { version: 2, addedIds: [...DEFAULT_ADDED_FONT_IDS], currentId: DEFAULT_FONT_ID, referenceId }
  }
}

export const useFontStore = defineStore('fonts', () => {
  const customFonts = ref<PersistedCustomFont[]>(readCustomFonts())
  // 本地方案：启动时立即注册持久化的自定义字体，确保刷新后仍可显示
  registerAllCustomFonts(customFonts.value)
  const storedState = readStoredState(customFonts.value)
  const addedFontIds = ref(storedState.addedIds)
  const currentFontId = ref(storedState.currentId)
  const referenceFontId = ref(storedState.referenceId ?? storedState.currentId)

  function getAnyFont(fontId: string): LearningFont | undefined {
    return getBuiltinFont(fontId) ?? customFonts.value.find((font) => font.id === fontId)
  }

  const addedFonts = computed(() => addedFontIds.value.map(getAnyFont).filter((font): font is LearningFont => font !== undefined))
  const currentFont = computed(() => getAnyFont(currentFontId.value) ?? fontCatalog[0]!)
  const referenceFont = computed(() => getAnyFont(referenceFontId.value) ?? currentFont.value)

  function persist() {
    const state: StoredFontState = {
      version: 2,
      addedIds: [...addedFontIds.value],
      currentId: currentFontId.value,
      referenceId: referenceFontId.value,
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
    if (fontId === currentFontId.value || fontId === referenceFontId.value) return
    addedFontIds.value = addedFontIds.value.filter((id) => id !== fontId)
    persist()
  }

  function selectLearningFont(fontId: string) {
    if (!addedFontIds.value.includes(fontId)) return
    if (fontId === referenceFontId.value && currentFontId.value !== fontId) {
      referenceFontId.value = currentFontId.value
    }
    currentFontId.value = fontId
    persist()
  }

  function selectReferenceFont(fontId: string) {
    if (!addedFontIds.value.includes(fontId)) return
    if (fontId === currentFontId.value && referenceFontId.value !== fontId) {
      currentFontId.value = referenceFontId.value
    }
    referenceFontId.value = fontId
    persist()
  }

  function swapFonts() {
    const learningId = currentFontId.value
    currentFontId.value = referenceFontId.value
    referenceFontId.value = learningId
    persist()
  }

  // 保留原有调用名称，避免已有页面或外部调用失效。
  const selectFont = selectLearningFont

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
    // 同步从已添加列表移除，并为受影响的字体角色选择可用回退项。
    if (addedFontIds.value.includes(fontId)) {
      addedFontIds.value = addedFontIds.value.filter((id) => id !== fontId)
      if (currentFontId.value === fontId) {
        const fallback = addedFontIds.value[0] ?? DEFAULT_FONT_ID
        currentFontId.value = fallback
      }
      if (referenceFontId.value === fontId) {
        referenceFontId.value = addedFontIds.value.find((id) => id !== currentFontId.value)
          ?? currentFontId.value
      }
      persist()
    }
  }

  return {
    addedFontIds,
    addedFonts,
    currentFontId,
    currentFont,
    referenceFontId,
    referenceFont,
    customFonts,
    getAnyFont,
    addFont,
    removeFont,
    selectFont,
    selectLearningFont,
    selectReferenceFont,
    swapFonts,
    isAdded,
    addCustomFont,
    removeCustomFont,
  }
})
