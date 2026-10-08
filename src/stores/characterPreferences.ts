import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const CHARACTER_PREFERENCES_STORAGE_KEY = 'font-learning-character-preferences'

interface StoredCharacterPreferences {
  version: 1
  favoriteIds: string[]
  excludedIds: string[]
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
}

function readStoredPreferences(): StoredCharacterPreferences {
  try {
    const stored = uni.getStorageSync(CHARACTER_PREFERENCES_STORAGE_KEY) as Partial<StoredCharacterPreferences> | undefined
    return {
      version: 1,
      favoriteIds: normalizeIds(stored?.favoriteIds),
      excludedIds: normalizeIds(stored?.excludedIds),
    }
  } catch {
    return { version: 1, favoriteIds: [], excludedIds: [] }
  }
}

export const useCharacterPreferencesStore = defineStore('characterPreferences', () => {
  const storedPreferences = readStoredPreferences()
  const favoriteIds = ref(storedPreferences.favoriteIds)
  const excludedIds = ref(storedPreferences.excludedIds)

  const favoriteIdSet = computed(() => new Set(favoriteIds.value))
  const excludedIdSet = computed(() => new Set(excludedIds.value))

  function persist() {
    const state: StoredCharacterPreferences = {
      version: 1,
      favoriteIds: [...favoriteIds.value],
      excludedIds: [...excludedIds.value],
    }
    try {
      uni.setStorageSync(CHARACTER_PREFERENCES_STORAGE_KEY, state)
    } catch {
      // 存储不可用时仍保留当前会话中的收藏和排除状态。
    }
  }

  function isFavorite(characterId: string): boolean {
    return favoriteIdSet.value.has(characterId)
  }

  function isExcluded(characterId: string): boolean {
    return excludedIdSet.value.has(characterId)
  }

  function toggleFavorite(characterId: string) {
    if (!characterId) return
    favoriteIds.value = isFavorite(characterId)
      ? favoriteIds.value.filter((id) => id !== characterId)
      : [...favoriteIds.value, characterId]
    persist()
  }

  function toggleExcluded(characterId: string) {
    if (!characterId) return
    excludedIds.value = isExcluded(characterId)
      ? excludedIds.value.filter((id) => id !== characterId)
      : [...excludedIds.value, characterId]
    persist()
  }

  return {
    favoriteIds,
    excludedIds,
    isFavorite,
    isExcluded,
    toggleFavorite,
    toggleExcluded,
  }
})
