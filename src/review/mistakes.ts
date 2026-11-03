import { getDatabase } from '../database/connection'
import { readActivities } from '../learning/activity'
import { isStudyMode } from '../study/modes'
import type { ActivityEvent } from '../learning/types'
import type { StudyMode } from '../study/modes'
import { flushPersistence, readStored, saveStored } from '../database/persistence'
import { object } from '../database/records'

export interface MistakeFilter { source?: string; mode?: StudyMode; consolidated?: boolean; characterId?: string }
export interface MistakeItem {
  characterId: string
  mode: StudyMode | null
  mistakes: number
  consolidated: boolean
  lastMistakeAt: string | null
  legacyMistakes: number
  sources: string[]
  events: ActivityEvent[]
}
export async function listMistakes(filter: MistakeFilter): Promise<MistakeItem[]> {
  const resets = object(readStored('font-learning-mistake-resets'))
  const events = (await readActivities()).filter((event) => event.kind === 'answer' && event.characterId)
  const groups = new Map<string, MistakeItem>()
  for (const event of events) {
    const key = `${event.characterId}:${event.mode ?? 'review'}`
    let item = groups.get(key)
    if (!item) { item = { characterId: event.characterId!, mode: event.mode, mistakes: 0, consolidated: false, lastMistakeAt: null, legacyMistakes: 0, sources: [], events: [] }; groups.set(key, item) }
    item.events.push(event)
    if (!item.sources.includes(event.source)) item.sources.push(event.source)
    if (event.correct === false) { item.mistakes++; item.lastMistakeAt = event.at }
  }
  const db = await getDatabase()
  for (const row of await db.query('character_mode_progress')) {
    if (!isStudyMode(row.mode) || Number(row.mistakes) <= 0) continue
    const key = `${row.characterId}:${row.mode}`
    const item = groups.get(key) ?? { characterId: String(row.characterId), mode: row.mode, mistakes: 0, consolidated: false, lastMistakeAt: null, legacyMistakes: 0, sources: [], events: [] }
    const formalErrors = item.events.filter((event) => (event.source === 'daily' || event.source === 'level') && event.correct === false).length
    item.legacyMistakes = Math.max(0, Number(row.mistakes) - formalErrors)
    item.mistakes += item.legacyMistakes
    if (item.legacyMistakes > 0 && !item.sources.includes('legacy')) item.sources.push('legacy')
    groups.set(key, item)
  }
  return [...groups.values()].filter((item) => item.mistakes > 0).map((item) => {
    const latest = item.events.slice(-2)
    const resetAt = resets[`${item.characterId}:${item.mode ?? 'review'}`]
    item.consolidated = latest.length === 2 && latest.every((event) => event.correct === true && (typeof resetAt !== 'string' || event.at > resetAt))
    return item
  }).filter((item) => (!filter.source || item.sources.includes(filter.source)) && (!filter.mode || item.mode === filter.mode)
    && (filter.consolidated === undefined || item.consolidated === filter.consolidated) && (!filter.characterId || item.characterId === filter.characterId))
    .sort((a, b) => (b.lastMistakeAt ?? '').localeCompare(a.lastMistakeAt ?? '') || b.mistakes - a.mistakes)
}
export async function markMistakePending(characterId: string, mode: StudyMode | null): Promise<void> {
  saveStored('font-learning-mistake-resets', { ...object(readStored('font-learning-mistake-resets')), [`${characterId}:${mode ?? 'review'}`]: new Date().toISOString() })
  await flushPersistence()
}
