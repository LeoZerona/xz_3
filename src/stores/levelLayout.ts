import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { readStored, reportPersistenceError, saveStored } from '../database/persistence'
import { DEFAULT_LEVEL_LAYOUT, getLevelLayout, LEVEL_LAYOUT_STORAGE_KEY } from '../study/levelLayouts'
import type { LevelLayoutId } from '../study/levelLayouts'

export const useLevelLayoutStore = defineStore('levelLayout', () => {
  const currentLayoutId = ref<LevelLayoutId>(DEFAULT_LEVEL_LAYOUT)
  const currentLayout = computed(() => getLevelLayout(currentLayoutId.value))

  function hydrate(): void {
    try {
      currentLayoutId.value = getLevelLayout(readStored(LEVEL_LAYOUT_STORAGE_KEY)).id
    } catch (error) {
      currentLayoutId.value = DEFAULT_LEVEL_LAYOUT
      reportPersistenceError(error)
    }
  }
  function selectLayout(layoutId: LevelLayoutId): void {
    try {
      saveStored(LEVEL_LAYOUT_STORAGE_KEY, layoutId)
      currentLayoutId.value = layoutId
    } catch (error) {
      reportPersistenceError(error)
    }
  }

  return { currentLayoutId, currentLayout, hydrate, selectLayout }
})
