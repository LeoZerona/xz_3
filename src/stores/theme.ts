import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { applyTheme } from '../theme/applyTheme'
import { DEFAULT_THEME_ID, getTheme, THEME_STORAGE_KEY, themes } from '../theme/themes'

function readStoredThemeId() {
  try {
    const stored = uni.getStorageSync(THEME_STORAGE_KEY)
    return getTheme(stored).id
  } catch {
    return DEFAULT_THEME_ID
  }
}

export const useThemeStore = defineStore('theme', () => {
  const currentThemeId = ref(DEFAULT_THEME_ID)
  const currentTheme = computed(() => getTheme(currentThemeId.value))

  function initialize() {
    currentThemeId.value = readStoredThemeId()
    applyTheme(currentTheme.value)
  }

  function selectTheme(themeId: string) {
    const selected = getTheme(themeId)
    currentThemeId.value = selected.id
    applyTheme(selected)
    try { uni.setStorageSync(THEME_STORAGE_KEY, selected.id) } catch { /* 浏览器隐私模式下仍保持当前会话主题 */ }
  }

  return { themes, currentThemeId, currentTheme, initialize, selectTheme }
})
