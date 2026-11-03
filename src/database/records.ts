import { normalizeCharacterLearningData, migrateLegacyPreferences } from '../study/learningData'
import type { CharacterLearningRecord } from '../study/learningData'
import { STUDY_MODES } from '../study/modes'
import { normalizeProgress } from '../study/dailyProgress'
import type { Change } from './types'
import type { Row, Table } from './schema'
import { compound } from './keys'
export { compound } from './keys'

export const LEARNING_KEY = 'font-learning-character-data'
export const LEVEL_KEY = 'font-learning-level-progress'
export const LEVEL_REVIEW_KEY = 'font-learning-level-review'
export const DAILY_PREFIX = 'font-learning-daily-progress:'
export const READING_KEY = 'reading:progress'
export const BOOKS_KEY = 'reading:customBooks'
export const ADDITIONAL_USER_TABLES: Table[] = ['activity_events', 'collections', 'collection_items', 'practice_sessions', 'practice_questions', 'library_books', 'annotations', 'import_history']
export const USER_TABLES: Table[] = ['settings', 'character_progress', 'character_mode_progress', 'character_actions', 'daily_sessions', 'daily_session_items', 'stage_progress', 'stage_character_progress', 'stage_training', 'stage_training_modes', 'level_review', 'reading_progress', ...ADDITIONAL_USER_TABLES]
export function object(value: unknown): Record<string, unknown> { return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {} }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [] }
function text(value: unknown): string | null { return typeof value === 'string' ? value : null }
function number(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null }
export function setting(id: string, value: unknown): Change { return { table: 'settings', row: { id, value: JSON.stringify(value) } } }

export function characterRows(record: CharacterLearningRecord): Change[] {
  const id = record.characterId
  return [
    { table: 'character_progress', row: { id, status: record.status, firstStartedAt: record.firstStartedAt, lastStudiedAt: record.lastStudiedAt, completedAt: record.completedAt, favorite: Number(record.favorite.active), favoriteChangedAt: record.favorite.changedAt, excluded: Number(record.slash.active), excludedChangedAt: record.slash.changedAt } },
    ...STUDY_MODES.map((mode): Change => ({ table: 'character_mode_progress', row: { id: compound(id, mode), characterId: id, mode, ...record.modes[mode] } })),
    ...record.slash.history.map((entry, position): Change => ({ table: 'character_actions', row: { id: compound(id, position), characterId: id, position, ...entry } })),
  ]
}
export function encodeStored(key: string, value: unknown): Change[] {
  if (value === undefined) return []
  if (key === LEARNING_KEY) {
    const data = normalizeCharacterLearningData(value)
    return [setting(`${key}:meta`, { version: data.version, updatedAt: data.updatedAt }), ...Object.values(data.characters).flatMap(characterRows)]
  }
  if (key.startsWith(DAILY_PREFIX)) {
    const dateKey = key.slice(DAILY_PREFIX.length)
    const data = normalizeProgress(value, dateKey)
    const ids = [...new Set([...data.assignedIds, ...data.learnedIds])]
    return [{ table: 'daily_sessions', row: { id: dateKey, currentCharacterId: data.currentCharacterId, reviewedCount: data.reviewedCount, studySeconds: data.studySeconds, startedAt: data.startedAt, completedAt: data.completedAt } },
      ...ids.map((characterId, position): Change => ({ table: 'daily_session_items', row: { id: compound(dateKey, characterId), dateKey, characterId, position, learnedPosition: data.learnedIds.indexOf(characterId), assigned: Number(data.assignedIds.includes(characterId)), learned: Number(data.learnedIds.includes(characterId)) } }))]
  }
  if (key === LEVEL_KEY) {
    const data = object(value)
    const completed = strings(data.completedStageIds)
    const map = object(data.stageCharacterCompleted)
    const ids = [...new Set([...completed, ...Object.keys(map)])]
    const training = object(data.training)
    const modeProgress = object(data.modeProgress)
    return [setting(`${key}:meta`, { updatedAt: text(data.updatedAt) }),
      ...Object.entries(training).map(([id, value]): Change => ({ table: 'stage_training', row: { id, completionCount: number(object(value).completionCount) ?? 0, active: Number(object(value).active === true) } })),
      ...Object.entries(modeProgress).flatMap(([stageId, value]) => Object.entries(object(value)).flatMap(([characterId, modes]) => Object.entries(object(modes)).flatMap(([mode, at]): Change[] => typeof at === 'string' ? [{ table: 'stage_training_modes', row: { id: compound(stageId, characterId, mode), stageId, characterId, mode, completedAt: at } }] : []))),
      ...ids.flatMap((id): Change[] => [
      { table: 'stage_progress', row: { id, completed: Number(completed.includes(id)), updatedAt: text(data.updatedAt) } },
      ...strings(map[id]).map((characterId, position): Change => ({ table: 'stage_character_progress', row: { id: compound(id, characterId), stageId: id, characterId, position } })),
    ])]
  }
  if (key === LEVEL_REVIEW_KEY) {
    return Object.entries(object(value)).map(([id, record]): Change => ({ table: 'level_review', row: { id, ...object(record) } as Row }))
  }
  if (key === READING_KEY || key.startsWith(`${READING_KEY}:`)) {
    const data = object(value)
    if (typeof data.bookId !== 'string' || typeof data.page !== 'number' || !Number.isFinite(data.page)) return []
    const changes: Change[] = [{ table: 'reading_progress', row: { id: data.bookId, page: data.page, rowsPerPage: number(data.rowsPerPage), characterOffset: number(data.characterOffset), charsPerLine: number(data.charsPerLine), tableStyleId: text(data.tableStyleId), updatedAt: text(data.updatedAt) } }]
    if (key === READING_KEY) changes.push(setting('reading:recentBookId', data.bookId))
    return changes
  }
  return [setting(key, value)]
}

export function decodeStored(data: Map<Table, Row[]>): Map<string, unknown> {
  const result = new Map<string, unknown>()
  for (const row of data.get('settings') ?? []) result.set(row.id, JSON.parse(String(row.value)) as unknown)
  const meta = object(result.get(`${LEARNING_KEY}:meta`))
  const characters: Record<string, unknown> = {}
  const modes = new Map<string, Record<string, unknown>>()
  for (const row of data.get('character_mode_progress') ?? []) {
    const id = String(row.characterId)
    const entry = modes.get(id) ?? {}
    entry[String(row.mode)] = { attempts: row.attempts, mistakes: row.mistakes, firstAttemptAt: row.firstAttemptAt, lastAttemptAt: row.lastAttemptAt, completedAt: row.completedAt }
    modes.set(id, entry)
  }
  const histories = new Map<string, Row[]>()
  for (const row of data.get('character_actions') ?? []) {
    const id = String(row.characterId); const entries = histories.get(id) ?? []
    entries.push(row); histories.set(id, entries)
  }
  for (const row of data.get('character_progress') ?? []) characters[row.id] = {
    characterId: row.id, status: row.status, firstStartedAt: row.firstStartedAt, lastStudiedAt: row.lastStudiedAt, completedAt: row.completedAt,
    favorite: { active: row.favorite === 1, changedAt: row.favoriteChangedAt },
    slash: { active: row.excluded === 1, changedAt: row.excludedChangedAt, history: (histories.get(row.id) ?? []).sort((a, b) => Number(a.position) - Number(b.position)).map((entry) => ({ action: entry.action, at: entry.at })) },
    modes: modes.get(row.id),
  }
  result.set(LEARNING_KEY, normalizeCharacterLearningData({ ...meta, characters }))
  for (const session of data.get('daily_sessions') ?? []) {
    const items = (data.get('daily_session_items') ?? []).filter((row) => row.dateKey === session.id).sort((a, b) => Number(a.position) - Number(b.position))
    result.set(`${DAILY_PREFIX}${session.id}`, { dateKey: session.id, currentCharacterId: session.currentCharacterId, reviewedCount: session.reviewedCount, studySeconds: session.studySeconds, startedAt: session.startedAt, completedAt: session.completedAt,
      assignedIds: items.filter((row) => row.assigned === 1).map((row) => row.characterId), learnedIds: items.filter((row) => row.learned === 1).sort((a, b) => Number(a.learnedPosition) - Number(b.learnedPosition)).map((row) => row.characterId) })
  }
  const stages = data.get('stage_progress') ?? []
  const stageCharacterCompleted: Record<string, string[]> = {}
  for (const row of (data.get('stage_character_progress') ?? []).sort((a, b) => Number(a.position) - Number(b.position))) {
    const id = String(row.stageId); (stageCharacterCompleted[id] ??= []).push(String(row.characterId))
  }
  const training = Object.fromEntries((data.get('stage_training') ?? []).map((row) => [row.id, { completionCount: row.completionCount, active: row.active === 1 }]))
  const modeProgress: Record<string, Record<string, Record<string, string>>> = {}
  for (const row of data.get('stage_training_modes') ?? []) ((modeProgress[String(row.stageId)] ??= {})[String(row.characterId)] ??= {})[String(row.mode)] = String(row.completedAt)
  result.set(LEVEL_KEY, { completedStageIds: stages.filter((row) => row.completed === 1).map((row) => row.id), stageCharacterCompleted, training, modeProgress, updatedAt: object(result.get(`${LEVEL_KEY}:meta`)).updatedAt })
  result.set(LEVEL_REVIEW_KEY, Object.fromEntries((data.get('level_review') ?? []).map(({ id, ...record }) => [id, record])))
  for (const row of data.get('reading_progress') ?? []) {
    const progress = { bookId: row.id, page: row.page, rowsPerPage: row.rowsPerPage, tableStyleId: row.tableStyleId, updatedAt: row.updatedAt,
      ...(row.characterOffset !== null ? { characterOffset: row.characterOffset } : {}), ...(row.charsPerLine !== null ? { charsPerLine: row.charsPerLine } : {}) }
    result.set(`${READING_KEY}:${encodeURIComponent(row.id)}`, progress)
    if (result.get('reading:recentBookId') === row.id) result.set(READING_KEY, progress)
  }
  return result
}

export function bookRows(value: unknown): Change[] {
  const book = object(value)
  if (typeof book.id !== 'string' || typeof book.text !== 'string' || typeof book.name !== 'string' || typeof book.fileName !== 'string' || book.ext !== 'txt' && book.ext !== 'pdf') throw new Error('书籍数据格式无效')
  const changes: Change[] = [{ table: 'books', row: { id: book.id, name: book.name, fileName: book.fileName, ext: book.ext, url: text(book.url) ?? '', source: 'custom', createdAt: number(book.createdAt) ?? Date.now(), position: -(number(book.createdAt) ?? Date.now()), textLength: book.text.length } }]
  // 使用 UTF-16 偏移，与现有阅读定位一致；不在代理对中间切块。
  for (let start = 0, position = 0; start < book.text.length; position++) {
    let end = Math.min(start + 16384, book.text.length)
    const code = book.text.charCodeAt(end - 1)
    if (end < book.text.length && code >= 0xd800 && code <= 0xdbff) end--
    changes.push({ table: 'book_chunks', row: { id: compound(book.id, position), bookId: book.id, position, startOffset: start, text: book.text.slice(start, end) } })
    start = end
  }
  return changes
}

export function legacyLearning(value: unknown, legacy: unknown): unknown { return value ? normalizeCharacterLearningData(value) : migrateLegacyPreferences(legacy) }
