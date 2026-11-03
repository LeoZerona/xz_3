import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { readStored, saveStored, saveCharacter } from '../database/persistence'
import {
  createCharacterLearningRecord,
  isModeCompleted,
  migrateLegacyPreferences,
  normalizeCharacterLearningData,
} from '../study/learningData'
import type { CharacterLearningData, CharacterLearningRecord, SlashAction } from '../study/learningData'
import { getEffectiveStudyModes, STUDY_MODES } from '../study/modes'
import type { StudyMode } from '../study/modes'
import { activityRevision, activityRow, localDateKey } from '../learning/activity'
import type { ActivityEvent } from '../learning/types'
import type { Change } from '../database/types'
import { useLevelReviewStore } from './levelReview'

interface AttemptContext { source: 'daily' | 'level'; sessionId: string; modes?: StudyMode[] }

export const CHARACTER_LEARNING_STORAGE_KEY = 'font-learning-character-data'
export const LEGACY_CHARACTER_PREFERENCES_STORAGE_KEY = 'font-learning-character-preferences'

function readStoredData(): CharacterLearningData {
  try {
    const stored = readStored(CHARACTER_LEARNING_STORAGE_KEY)
    if (stored) return normalizeCharacterLearningData(stored)
    const legacy = readStored(LEGACY_CHARACTER_PREFERENCES_STORAGE_KEY)
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
  function hydrate() { data.value = readStoredData() }

  const favoriteIds = computed(() => Object.values(data.value.characters)
    .filter((record) => record.favorite.active)
    .map((record) => record.characterId))
  const excludedIds = computed(() => Object.values(data.value.characters)
    .filter((record) => record.slash.active)
    .map((record) => record.characterId))
  const completedIds = computed(() => Object.values(data.value.characters)
    .filter((record) => record.status === 'completed' || Boolean(record.completedAt))
    .map((record) => record.characterId))

  function persist(at = new Date().toISOString()) {
    data.value.updatedAt = at
    saveStored(CHARACTER_LEARNING_STORAGE_KEY, data.value)
  }

  function getRecord(characterId: string): CharacterLearningRecord | undefined {
    return data.value.characters[characterId]
  }

  function updateRecord(characterId: string, update: (record: CharacterLearningRecord) => void, at: string, relatedChanges: Change[] = []) {
    if (!characterId) return
    const record = cloneRecord(data.value.characters[characterId] ?? createCharacterLearningRecord(characterId))
    update(record)
    data.value.characters = { ...data.value.characters, [characterId]: record }
    data.value.updatedAt = at
    saveCharacter(record, at, relatedChanges)
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

  function recordModeAttempt(characterId: string, mode: StudyMode, isCorrect: boolean, at = new Date().toISOString(), context?: AttemptContext) {
    const date = new Date(at)
    const source = context?.source ?? 'daily'
    const sessionId = context?.sessionId ?? `daily:${localDateKey(date)}`
    const previous = getRecord(characterId)
    const activity: ActivityEvent = { id: `${sessionId}:${characterId}:${mode}:${(previous?.modes[mode].attempts ?? 0) + 1}`,
      sessionId, source, kind: 'answer', characterId, mode, correct: isCorrect, at, dateKey: localDateKey(date),
      seconds: 0, timezoneOffset: date.getTimezoneOffset() }
    const relatedChanges: Change[] = [{ table: 'activity_events', row: activityRow(activity), ifAbsent: true }]
    updateRecord(characterId, (record) => {
      const progress = record.modes[mode]
      progress.attempts += 1
      if (!isCorrect) progress.mistakes += 1
      progress.firstAttemptAt ??= at
      progress.lastAttemptAt = at
      if (isCorrect) progress.completedAt ??= at
      record.firstStartedAt ??= at
      record.lastStudiedAt = at
      const effective = context?.modes ?? getEffectiveStudyModes();
      const isComplete = effective.every((studyMode) => Boolean(record.modes[studyMode].completedAt))
      record.status = record.completedAt || record.status === 'completed' || isComplete ? 'completed' : 'learning'
      if (isComplete) record.completedAt ??= at
      if (record.status === 'completed' && previous?.status !== 'completed' && !previous?.completedAt) {
        relatedChanges.push({ table: 'activity_events', row: activityRow({ ...activity,
          id: `learned:${characterId}`, kind: 'completed', correct: null }), ifAbsent: true })
      }
    }, at, relatedChanges)
    if (source === 'daily') useLevelReviewStore().registerCharacters([characterId], at, 'daily')
    activityRevision.value++
  }

  function isModeComplete(characterId: string, mode: StudyMode): boolean {
    return isModeCompleted(getRecord(characterId), mode)
  }

  function isCharacterComplete(characterId: string): boolean {
    const record = getRecord(characterId)
    return Boolean(record && (record.status === 'completed' || record.completedAt))
  }

  function nextIncompleteMode(characterId: string): StudyMode | null {
    const effective = getEffectiveStudyModes();
    return effective.find((mode) => !isModeComplete(characterId, mode)) ?? null
  }

  function resetCharacterModes(characterId: string, at = new Date().toISOString()) {
    resetCharacters([characterId], at)
  }

  function resetCharacters(characterIds: string[], at = new Date().toISOString()) {
    let changed = false
    for (const characterId of characterIds) {
      if (!characterId) continue
      const existing = data.value.characters[characterId]
      if (!existing) continue
      const next = cloneRecord(existing)
      for (const mode of STUDY_MODES) {
        next.modes[mode] = { attempts: 0, mistakes: 0, firstAttemptAt: null, lastAttemptAt: null, completedAt: null }
      }
      next.status = 'not-started'
      next.firstStartedAt = null
      next.lastStudiedAt = null
      next.completedAt = null
      data.value.characters = { ...data.value.characters, [characterId]: next }
      changed = true
    }
    if (changed) {
      data.value.updatedAt = at
      for (const id of characterIds) { const record = data.value.characters[id]; if (record) saveCharacter(record, at) }
    }
  }

  return {
    hydrate,
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
    resetCharacterModes,
    resetCharacters,
  }
})

