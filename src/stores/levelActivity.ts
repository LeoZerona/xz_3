import { ref } from 'vue'
import { defineStore } from 'pinia'
import { loadStage } from '../study/levelData'
import type { LevelStage } from '../study/levelData'
import { LAST_LEVEL_STUDY_KEY, readLastLevelStudy } from '../study/levelActivity'
import type { LastLevelStudy } from '../study/levelActivity'
import { readStored, reportPersistenceError, saveStored } from '../database/persistence'

export const useLevelActivityStore = defineStore('levelActivity', () => {
  const lastStudiedStage = ref<LastLevelStudy | null>(null)

  async function hydrate(): Promise<void> {
    const stored = readLastLevelStudy(readStored(LAST_LEVEL_STUDY_KEY))
    if (!stored) { lastStudiedStage.value = null; return }
    const stage = await loadStage(stored.category, stored.stageId)
    lastStudiedStage.value = stage && !stage.isPlaceholder && stage.characters.length > 0
      ? { ...stored, index: stage.index, title: stage.title } : null
  }
  function recordSelection(stage: LevelStage): boolean {
    if (stage.isPlaceholder || !stage.characters.length) return false
    if (lastStudiedStage.value?.stageId === stage.id) return true
    // 沿用旧存储键和时间字段，已有学习位置直接作为最近选择恢复。
    const next: LastLevelStudy = { category: stage.category, stageId: stage.id, index: stage.index, title: stage.title, studiedAt: new Date().toISOString() }
    try {
      saveStored(LAST_LEVEL_STUDY_KEY, next)
      lastStudiedStage.value = next
      return true
    } catch (error) {
      reportPersistenceError(error)
      return false
    }
  }
  return { lastStudiedStage, hydrate, recordSelection }
})
