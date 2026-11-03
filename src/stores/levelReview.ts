import { ref } from 'vue'
import { defineStore } from 'pinia'
import { readStored, saveStored, saveLevelReviewRecords } from '../database/persistence'
import { object } from '../database/records'
import { getDatabase } from '../database/connection'
import { createReviewRecord, LEVEL_REVIEW_KEY, REVIEW_SESSION_KEY, reviewAnswer } from '../study/levelReview'
import type { LevelReviewRecord, ReviewFilter } from '../study/levelReview'
import { useLevelProgressStore } from './levelProgress'
import { activityRevision, activityRow, localDateKey } from '../learning/activity'
import { readReviewSources, REVIEW_SOURCES_KEY } from '../review/sources'
import type { ReviewSource } from '../review/sources'

interface ReviewSession { filter: ReviewFilter; currentIds: Partial<Record<ReviewFilter, string>>; currentReviewCounts: Partial<Record<ReviewFilter, number>> }
function readRecords(): Record<string, LevelReviewRecord> {
  const records: Record<string, LevelReviewRecord> = {}
  for (const [id, value] of Object.entries(object(readStored(LEVEL_REVIEW_KEY)))) {
    const raw = object(value)
    if (typeof raw.firstLearnedAt !== 'string' || !Number.isFinite(Date.parse(raw.firstLearnedAt)) || typeof raw.dueAt !== 'string' || !Number.isFinite(Date.parse(raw.dueAt))) continue
    const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
    records[id] = { firstLearnedAt: raw.firstLearnedAt, dueAt: raw.dueAt, lastReviewedAt: typeof raw.lastReviewedAt === 'string' ? raw.lastReviewedAt : null,
      step: Math.min(8, count(raw.step)), reviewCount: count(raw.reviewCount), forgottenCount: count(raw.forgottenCount) }
  }
  return records
}
export const useLevelReviewStore = defineStore('levelReview', () => {
  const records = ref<Record<string, LevelReviewRecord>>(readRecords())
  const sources = ref(readReviewSources())
  const session = ref<ReviewSession>({ filter: 'all', currentIds: {}, currentReviewCounts: {} })
  function hydrate(): void {
    records.value = readRecords()
    sources.value = readReviewSources()
    const stored = object(readStored(REVIEW_SESSION_KEY))
    const filter = stored.filter === 'slashed' || stored.filter === 'favorites' ? stored.filter : 'all'
    const ids = object(stored.currentIds)
    const counts = object(stored.currentReviewCounts)
    session.value = { filter,
      currentIds: Object.fromEntries(['all', 'slashed', 'favorites'].flatMap((key) => typeof ids[key] === 'string' ? [[key, ids[key]]] : [])),
      currentReviewCounts: Object.fromEntries(['all', 'slashed', 'favorites'].flatMap((key) => typeof counts[key] === 'number' ? [[key, counts[key]]] : [])),
    }
  }
  function hasSource(id: string, source: ReviewSource): boolean { return (sources.value[id] ?? (records.value[id] ? ['level'] : [])).includes(source) }
  function registerCharacters(ids: readonly string[], at = new Date().toISOString(), source: ReviewSource = 'level'): void {
    const additions: Record<string, LevelReviewRecord> = {}
    let changed = false
    for (const id of ids) {
      if (!id) continue
      const previous = sources.value[id] ?? (records.value[id] ? ['level'] : [])
      if (!previous.includes(source)) { sources.value[id] = [...previous, source]; changed = true }
      if (!records.value[id]) additions[id] = createReviewRecord(at)
    }
    if (changed) saveStored(REVIEW_SOURCES_KEY, sources.value)
    if (Object.keys(additions).length) { saveLevelReviewRecords(additions); records.value = { ...records.value, ...additions } }
  }
  async function migrateLearnedCharacters(): Promise<void> {
    const levels = useLevelProgressStore()
    const db = await getDatabase()
    const ids = new Set(levels.learnedCharacterIds)
    // 历史整关完成可能没有逐字标记；通过关卡成员补齐，不纳入仅日常学习的文字。
    const members = await db.query('level_characters', { whereIn: { levelId: levels.completedStageIds } })
    for (const row of members) ids.add(String(row.characterId))
    const progress = await db.query('character_progress', { whereIn: { id: [...ids] } })
    const learnedAt = new Map(progress.map((row) => [row.id, row.completedAt ?? row.lastStudiedAt ?? row.firstStartedAt]))
    const additions: Record<string, LevelReviewRecord> = {}
    for (const id of ids) if (!records.value[id]) {
      const at = learnedAt.get(id)
      additions[id] = createReviewRecord(typeof at === 'string' && Number.isFinite(Date.parse(at)) ? at : new Date(0).toISOString())
    }
    if (Object.keys(additions).length) { saveLevelReviewRecords(additions); records.value = { ...records.value, ...additions } }
    registerCharacters([...ids], new Date(0).toISOString(), 'level')
  }
  function setCurrent(filter: ReviewFilter, characterId: string | undefined): void {
    session.value.filter = filter
    if (characterId) {
      session.value.currentIds[filter] = characterId
      session.value.currentReviewCounts[filter] = records.value[characterId]?.reviewCount ?? 0
    } else {
      delete session.value.currentIds[filter]
      delete session.value.currentReviewCounts[filter]
    }
    saveStored(REVIEW_SESSION_KEY, session.value)
  }
  function answer(characterId: string, known: boolean, at = new Date().toISOString()): void {
    const record = records.value[characterId]
    if (!record) return
    const next = reviewAnswer(record, known, at)
    const date = new Date(at)
    saveLevelReviewRecords({ [characterId]: next }, [{ table: 'activity_events', ifAbsent: true, row: activityRow({
      id: `review:${characterId}:${next.reviewCount}`, sessionId: `review:${localDateKey(date)}`, source: 'review', kind: 'answer',
      characterId, mode: null, correct: known, at, dateKey: localDateKey(date), seconds: 0, timezoneOffset: date.getTimezoneOffset(),
    }) }])
    records.value[characterId] = next
    activityRevision.value++
  }
  return { records, sources, hasSource, session, hydrate, registerCharacters, migrateLearnedCharacters, setCurrent, answer }
})
