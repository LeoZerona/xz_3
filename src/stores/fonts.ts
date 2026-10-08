import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_ADDED_FONT_IDS, DEFAULT_FONT_ID, fontCatalog, getFont } from '../fonts/catalog'

export const FONT_STATE_STORAGE_KEY = 'font-learning-fonts'
const LEGACY_CURRENT_FONT_STORAGE_KEY = 'font-learning-current'

interface StoredFontState {
  version: 1
  addedIds: string[]
  currentId: string
}

function uniqueValidIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && Boolean(getFont(id))))]
}

function readStoredState(): StoredFontState {
  try {
    const stored = uni.getStorageSync(FONT_STATE_STORAGE_KEY) as Partial<StoredFontState> | undefined
    const addedIds = uniqueValidIds(stored?.addedIds)
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
  const storedState = readStoredState()
  const addedFontIds = ref(storedState.addedIds)
  const currentFontId = ref(storedState.currentId)

  const addedFonts = computed(() => addedFontIds.value.map(getFont).filter((font) => font !== undefined))
  const currentFont = computed(() => getFont(currentFontId.value) ?? fontCatalog[0]!)

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

  function addFont(fontId: string) {
    if (!getFont(fontId) || addedFontIds.value.includes(fontId)) return
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

  return {
    addedFontIds,
    addedFonts,
    currentFontId,
    currentFont,
    addFont,
    removeFont,
    selectFont,
    isAdded,
  }
})
