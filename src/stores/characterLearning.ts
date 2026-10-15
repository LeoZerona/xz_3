import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createCharacterLearningRecord,
  isCharacterCompleted,
  isModeCompleted,
  migrateLegacyPreferences,
  normalizeCharacterLearningData,
} from '../study/learningData'
import type { CharacterLearningData, CharacterLearningRecord, SlashAction } from '../study/learningData'
import { STUDY_MODES } from '../study/modes'
import type { StudyMode } from '../study/modes'

export const CHARACTER_LEARNING_STORAGE_KEY = 'font-learning-character-data'
export const LEGACY_CHARACTER_PREFERENCES_STORAGE_KEY = 'font-learning-character-preferences'

function readStoredData(): CharacterLearningData {
  try {
    const stored = uni.getStorageSync(CHARACTER_LEARNING_STORAGE_KEY) as unknown
    if (stored) return normalizeCharacterLearningData(stored)
    const legacy = uni.getStorageSync(LEGACY_CHARACTER_PREFERENCES_STORAGE_KEY) as unknown
    return migrateLegacyPreferences(legacy)
  } catch {
    return normalizeCharacterLearningData(null)
  }
}

function cloneRecord(record: CharacterLearningRecord): CharacterLearningRecord {
  return {
    ...record,
    favorite: { ...record.favorite },
    slash: { ...record.slash, history: record.slash.history.map((entry) => ({ ...entry })) },
    modes: {
      'seal-to-reference-choice': { ...record.modes['seal-to-reference-choice'] },
      'reference-to-seal-choice': { ...record.modes['reference-to-seal-choice'] },
      'seal-to-reference-input': { ...record.modes['seal-to-reference-input'] },
    },
  }
}

export const useCharacterLearningStore = defineStore('characterLearning', () => {
  const data = ref<CharacterLearningData>(readStoredData())

  const favoriteIds = computed(() => Object.values(data.value.characters)
    .filter((record) => record.favorite.active)
    .map((record) => record.characterId))
  const excludedIds = computed(() => Object.values(data.value.characters)
    .filter((record) => record.slash.active)
    .map((record) => record.characterId))
  const completedIds = computed(() => Object.values(data.value.characters)
    .filter(isCharacterCompleted)
    .map((record) => record.characterId))

  function persist(at = new Date().toISOString()) {
    data.value.updatedAt = at
    try {
      uni.setStorageSync(CHARACTER_LEARNING_STORAGE_KEY, data.value)
    } catch {
      // 存储不可用时保留当前会话中的学习数据。
    }
  }

  function getRecord(characterId: string): CharacterLearningRecord | undefined {
    return data.value.characters[characterId]
  }

  function updateRecord(characterId: string, update: (record: CharacterLearningRecord) => void, at: string) {
    if (!characterId) return
    const record = cloneRecord(data.value.characters[characterId] ?? createCharacterLearningRecord(characterId))
    update(record)
    data.value.characters = { ...data.value.characters, [characterId]: record }
    persist(at)
  }

  function isFavorite(characterId: string): boolean {
    return Boolean(getRecord(characterId)?.favorite.active)
  }

  function isExcluded(characterId: string): boolean {
    return Boolean(getRecord(characterId)?.slash.active)
  }

  function toggleFavorite(characterId: string, at = new Date().toISOString()) {
    updateRecord(characterId, (record) => {
      record.favorite = { active: !record.favorite.active, changedAt: at }
    }, at)
  }

  function setSlashState(characterId: string, active: boolean, at = new Date().toISOString()) {
    if (getRecord(characterId)?.slash.active === active) return
    updateRecord(characterId, (record) => {
      const action: SlashAction = active ? 'slash' : 'restore'
      record.slash = {
        active,
        changedAt: at,
        history: [...record.slash.history, { action, at }],
      }
    }, at)
  }

  function toggleExcluded(characterId: string, at = new Date().toISOString()) {
    setSlashState(characterId, !isExcluded(characterId), at)
  }

  function recordModeAttempt(characterId: string, mode: StudyMode, isCorrect: boolean, at = new Date().toISOString()) {
    updateRecord(characterId, (record) => {
      const progress = record.modes[mode]
      progress.attempts += 1
      if (!isCorrect) progress.mistakes += 1
      progress.firstAttemptAt ??= at
      progress.lastAttemptAt = at
      if (isCorrect) progress.completedAt ??= at
      record.firstStartedAt ??= at
      record.lastStudiedAt = at
      const isComplete = STUDY_MODES.every((studyMode) => Boolean(record.modes[studyMode].completedAt))
      record.status = isComplete ? 'completed' : 'learning'
      if (isComplete) record.completedAt ??= at
    }, at)
  }

  function isModeComplete(characterId: string, mode: StudyMode): boolean {
    return isModeCompleted(getRecord(characterId), mode)
  }

  function isCharacterComplete(characterId: string): boolean {
    return isCharacterCompleted(getRecord(characterId))
  }

  function nextIncompleteMode(characterId: string): StudyMode | null {
    return STUDY_MODES.find((mode) => !isModeComplete(characterId, mode)) ?? null
  }

  return {
    data,
    favoriteIds,
    excludedIds,
    completedIds,
    persist,
    getRecord,
    isFavorite,
    isExcluded,
    toggleFavorite,
    setSlashState,
    toggleExcluded,
    recordModeAttempt,
    isModeComplete,
    isCharacterComplete,
    nextIncompleteMode,
  }
})
