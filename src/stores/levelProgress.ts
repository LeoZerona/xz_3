import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { readStored, saveStored } from '../database/persistence'
import { object } from '../database/records'
import { STUDY_MODES } from '../study/modes'
import type { StudyMode } from '../study/modes'

export const LEVEL_PROGRESS_STORAGE_KEY = 'font-learning-level-progress'
type CompletedModes = Partial<Record<StudyMode, string>>
interface StageTraining { completionCount: number; active: boolean }
interface LevelProgressState {
  completedStageIds: string[]
  stageCharacterCompleted: Record<string, string[]>
  training: Record<string, StageTraining>
  modeProgress: Record<string, Record<string, CompletedModes>>
  updatedAt: string
}
function strings(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [] }
function readState(): LevelProgressState {
  const data = object(readStored(LEVEL_PROGRESS_STORAGE_KEY))
  const training: Record<string, StageTraining> = {}
  for (const [id, raw] of Object.entries(object(data.training))) {
    const entry = object(raw)
    training[id] = { completionCount: typeof entry.completionCount === 'number' && Number.isFinite(entry.completionCount) ? Math.max(0, Math.trunc(entry.completionCount)) : 0, active: entry.active === true }
  }
  const modeProgress: LevelProgressState['modeProgress'] = {}
  for (const [id, characters] of Object.entries(object(data.modeProgress))) {
    modeProgress[id] = {}
    for (const [characterId, raw] of Object.entries(object(characters))) {
      const modes = object(raw)
      modeProgress[id]![characterId] = Object.fromEntries(STUDY_MODES.flatMap((mode) => typeof modes[mode] === 'string' ? [[mode, modes[mode]]] : []))
    }
  }
  return { completedStageIds: strings(data.completedStageIds),
    stageCharacterCompleted: Object.fromEntries(Object.entries(object(data.stageCharacterCompleted)).map(([id, value]) => [id, strings(value)])),
    training, modeProgress, updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString() }
}

export const useLevelProgressStore = defineStore('levelProgress', () => {
  const state = ref<LevelProgressState>(readState())
  const completedStageIds = computed(() => state.value.completedStageIds)
  const learnedCharacterIds = computed(() => [...new Set(Object.values(state.value.stageCharacterCompleted).flat())])
  const completedCountByCategory = computed(() => {
    const counts: Record<string, number> = {}
    for (const id of state.value.completedStageIds) { const key = id.split('-stage-')[0]!; counts[key] = (counts[key] ?? 0) + 1 }
    return counts
  })
  function persist(): void { state.value.updatedAt = new Date().toISOString(); saveStored(LEVEL_PROGRESS_STORAGE_KEY, state.value) }
  function hydrate(): void { state.value = readState() }
  function isStageCompleted(id: string): boolean { return state.value.completedStageIds.includes(id) }
  function getTrainingCount(id: string): number { return state.value.training[id]?.completionCount ?? Number(isStageCompleted(id)) }
  function isTrainingActive(id: string): boolean { return state.value.training[id]?.active === true }
  function getStageCompletedCount(id: string): number { return state.value.stageCharacterCompleted[id]?.length ?? 0 }
  function isCharacterCompletedInStage(id: string, characterId: string): boolean { return state.value.stageCharacterCompleted[id]?.includes(characterId) === true }
  function isModeComplete(id: string, characterId: string, mode: StudyMode): boolean { return Boolean(state.value.modeProgress[id]?.[characterId]?.[mode]) }
  function isCharacterComplete(id: string, characterId: string, modes: readonly StudyMode[]): boolean { return modes.length > 0 && modes.every((mode) => isModeComplete(id, characterId, mode)) }
  function beginTraining(id: string, legacyModes: Record<string, CompletedModes> = {}): void {
    if (isTrainingActive(id)) return
    // 历史已完成关卡记为一次；新轮次不清除长期单字及旧关卡完成记录。
    const isLegacyPartial = !state.value.training[id] && !isStageCompleted(id)
    state.value.training[id] = { completionCount: getTrainingCount(id), active: true }
    state.value.modeProgress[id] = isLegacyPartial ? legacyModes : {}
    persist()
  }
  function recordModeCompleted(id: string, characterId: string, mode: StudyMode, at = new Date().toISOString()): void {
    if (!isTrainingActive(id) || isModeComplete(id, characterId, mode)) return
    ((state.value.modeProgress[id] ??= {})[characterId] ??= {})[mode] = at
    persist()
  }
  function resetCharacterModes(id: string, characterId: string): void {
    if (!state.value.modeProgress[id]?.[characterId]) return
    delete state.value.modeProgress[id]![characterId]
    persist()
  }
  function markCharacterCompleted(id: string, characterId: string): void {
    if (!id || !characterId || isCharacterCompletedInStage(id, characterId)) return
    (state.value.stageCharacterCompleted[id] ??= []).push(characterId)
    persist()
  }
  function markStageCompleted(id: string): void {
    const training = state.value.training[id]
    if (!training?.active) return
    training.active = false
    training.completionCount++
    if (!isStageCompleted(id)) state.value.completedStageIds.push(id)
    persist()
  }
  function getStageProgress(id: string, total: number): number { return total <= 0 ? 0 : isStageCompleted(id) ? 1 : Math.min(1, getStageCompletedCount(id) / total) }
  function resetStage(id: string): void {
    state.value.training[id] = { completionCount: getTrainingCount(id), active: true }
    state.value.modeProgress[id] = {}
    persist()
  }
  return { completedStageIds, learnedCharacterIds, completedCountByCategory, hydrate, isStageCompleted, getTrainingCount, isTrainingActive,
    getStageCompletedCount, isCharacterCompletedInStage, isModeComplete, isCharacterComplete, beginTraining, recordModeCompleted,
    resetCharacterModes, markCharacterCompleted, markStageCompleted, getStageProgress, resetStage }
})
