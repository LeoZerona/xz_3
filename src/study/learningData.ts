import { STUDY_MODES } from './modes'
import type { StudyMode } from './modes'

export const CHARACTER_LEARNING_DATA_VERSION = 2 as const

export type CharacterLearningStatus = 'not-started' | 'learning' | 'completed'
export type SlashAction = 'slash' | 'restore'

export interface StudyModeProgress {
  attempts: number
  mistakes: number
  firstAttemptAt: string | null
  lastAttemptAt: string | null
  completedAt: string | null
}

export interface CharacterLearningRecord {
  characterId: string
  status: CharacterLearningStatus
  firstStartedAt: string | null
  lastStudiedAt: string | null
  completedAt: string | null
  favorite: { active: boolean; changedAt: string | null }
  slash: {
    active: boolean
    changedAt: string | null
    history: Array<{ action: SlashAction; at: string }>
  }
  modes: Record<StudyMode, StudyModeProgress>
}

export interface CharacterLearningData {
  version: typeof CHARACTER_LEARNING_DATA_VERSION
  updatedAt: string
  characters: Record<string, CharacterLearningRecord>
}

interface LegacyCharacterPreferences {
  favoriteIds?: unknown
  excludedIds?: unknown
}

function emptyModeProgress(): StudyModeProgress {
  return { attempts: 0, mistakes: 0, firstAttemptAt: null, lastAttemptAt: null, completedAt: null }
}

export function createCharacterLearningRecord(characterId: string): CharacterLearningRecord {
  return {
    characterId,
    status: 'not-started',
    firstStartedAt: null,
    lastStudiedAt: null,
    completedAt: null,
    favorite: { active: false, changedAt: null },
    slash: { active: false, changedAt: null, history: [] },
    modes: {
      'seal-to-reference-choice': emptyModeProgress(),
      'reference-to-seal-choice': emptyModeProgress(),
      'seal-to-reference-input': emptyModeProgress(),
    },
  }
}

export function createCharacterLearningData(updatedAt = new Date().toISOString()): CharacterLearningData {
  return { version: CHARACTER_LEARNING_DATA_VERSION, updatedAt, characters: {} }
}

function normalizeTimestamp(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}

function normalizeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

function normalizeModeProgress(value: unknown): StudyModeProgress {
  const source = typeof value === 'object' && value !== null ? value as Partial<StudyModeProgress> : {}
  return {
    attempts: normalizeCount(source.attempts),
    mistakes: normalizeCount(source.mistakes),
    firstAttemptAt: normalizeTimestamp(source.firstAttemptAt),
    lastAttemptAt: normalizeTimestamp(source.lastAttemptAt),
    completedAt: normalizeTimestamp(source.completedAt),
  }
}

function normalizeSlashHistory(value: unknown): Array<{ action: SlashAction; at: string }> {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const entry = item as { action?: unknown; at?: unknown }
    const at = normalizeTimestamp(entry.at)
    if ((entry.action !== 'slash' && entry.action !== 'restore') || !at) return []
    return [{ action: entry.action, at }]
  })
}

function deriveStatus(modes: Record<StudyMode, StudyModeProgress>): CharacterLearningStatus {
  if (STUDY_MODES.every((mode) => Boolean(modes[mode].completedAt))) return 'completed'
  if (STUDY_MODES.some((mode) => modes[mode].attempts > 0)) return 'learning'
  return 'not-started'
}

function normalizeRecord(characterId: string, value: unknown): CharacterLearningRecord {
  const source = typeof value === 'object' && value !== null ? value as Partial<CharacterLearningRecord> : {}
  const favorite = typeof source.favorite === 'object' && source.favorite !== null
    ? source.favorite
    : { active: false, changedAt: null }
  const slash = typeof source.slash === 'object' && source.slash !== null
    ? source.slash
    : { active: false, changedAt: null, history: [] }
  const sourceModes: Partial<Record<StudyMode, unknown>> = (
    typeof source.modes === 'object' && source.modes !== null ? source.modes : {}
  )
  const modes = Object.fromEntries(
    STUDY_MODES.map((mode) => [mode, normalizeModeProgress(sourceModes[mode])]),
  ) as Record<StudyMode, StudyModeProgress>
  const status = deriveStatus(modes)
  const modeCompletions = STUDY_MODES
    .map((mode) => modes[mode].completedAt)
    .filter((at): at is string => Boolean(at))
    .sort()
  const latestModeCompletion = modeCompletions[modeCompletions.length - 1] ?? null

  return {
    characterId,
    status,
    firstStartedAt: normalizeTimestamp(source.firstStartedAt),
    lastStudiedAt: normalizeTimestamp(source.lastStudiedAt),
    completedAt: status === 'completed' ? normalizeTimestamp(source.completedAt) ?? latestModeCompletion : null,
    favorite: { active: favorite.active === true, changedAt: normalizeTimestamp(favorite.changedAt) },
    slash: {
      active: slash.active === true,
      changedAt: normalizeTimestamp(slash.changedAt),
      history: normalizeSlashHistory(slash.history),
    },
    modes,
  }
}

export function normalizeCharacterLearningData(value: unknown, updatedAt = new Date().toISOString()): CharacterLearningData {
  if (typeof value !== 'object' || value === null) return createCharacterLearningData(updatedAt)
  const source = value as Partial<CharacterLearningData>
  const sourceCharacters = typeof source.characters === 'object' && source.characters !== null ? source.characters : {}
  const characters = Object.fromEntries(
    Object.entries(sourceCharacters).flatMap(([characterId, record]) => (
      characterId ? [[characterId, normalizeRecord(characterId, record)]] : []
    )),
  )
  return {
    version: CHARACTER_LEARNING_DATA_VERSION,
    updatedAt: normalizeTimestamp(source.updatedAt) ?? updatedAt,
    characters,
  }
}

function normalizeLegacyIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
}

export function migrateLegacyPreferences(value: unknown, at = new Date().toISOString()): CharacterLearningData {
  const data = createCharacterLearningData(at)
  if (typeof value !== 'object' || value === null) return data
  const legacy = value as LegacyCharacterPreferences
  for (const characterId of normalizeLegacyIds(legacy.favoriteIds)) {
    const record = data.characters[characterId] ?? createCharacterLearningRecord(characterId)
    record.favorite = { active: true, changedAt: at }
    data.characters[characterId] = record
  }
  for (const characterId of normalizeLegacyIds(legacy.excludedIds)) {
    const record = data.characters[characterId] ?? createCharacterLearningRecord(characterId)
    record.slash = { active: true, changedAt: at, history: [{ action: 'slash', at }] }
    data.characters[characterId] = record
  }
  return data
}

export function isModeCompleted(record: CharacterLearningRecord | undefined, mode: StudyMode): boolean {
  return Boolean(record?.modes[mode].completedAt)
}

export function isCharacterCompleted(record: CharacterLearningRecord | undefined): boolean {
  return record?.status === 'completed'
}
