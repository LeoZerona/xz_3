import { ref } from 'vue'
import { getDatabase } from '../database/connection'
import { enqueueDatabaseChanges, flushPersistence } from '../database/persistence'
import { isStudyMode } from '../study/modes'
import type { Row } from '../database/schema'
import type { ActivityEvent, ActivitySource, ActivityKind } from './types'

export const activityRevision = ref(0)
const SOURCES: readonly ActivitySource[] = ['daily', 'level', 'review', 'practice', 'reading']
const KINDS: readonly ActivityKind[] = ['answer', 'completed', 'time']

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function validateEvent(event: ActivityEvent): void {
  const timestamp = Date.parse(event.at)
  if (!event.id || !event.sessionId || event.id.length > 256 || !SOURCES.includes(event.source) || !KINDS.includes(event.kind)
    || !Number.isFinite(timestamp) || !Number.isInteger(event.timezoneOffset) || Math.abs(event.timezoneOffset) > 14 * 60
    || !Number.isInteger(event.seconds) || event.seconds < 0 || event.mode !== null && !isStudyMode(event.mode)
    || event.correct !== null && typeof event.correct !== 'boolean') throw new Error('学习事件格式无效')
  const local = new Date(timestamp - event.timezoneOffset * 60_000)
  const dateKey = `${local.getUTCFullYear()}-${local.getUTCMonth() + 1}-${local.getUTCDate()}`
  if (dateKey !== event.dateKey) throw new Error('学习事件日期归属无效')
}

export function activityRow(event: ActivityEvent): Row {
  validateEvent(event)
  return { ...event, correct: event.correct === null ? null : Number(event.correct) }
}

export function recordActivity(event: ActivityEvent): void {
  enqueueDatabaseChanges([{ table: 'activity_events', row: activityRow(event), ifAbsent: true }])
  activityRevision.value++
}

export async function readActivities(options: { dateKey?: string; sessionId?: string; kind?: ActivityKind; limit?: number; offset?: number } = {}): Promise<ActivityEvent[]> {
  await flushPersistence()
  const db = await getDatabase()
  const rows = await db.query('activity_events', { where: { ...(options.dateKey ? { dateKey: options.dateKey } : {}),
    ...(options.sessionId ? { sessionId: options.sessionId } : {}), ...(options.kind ? {kind:options.kind}: {}) }, orderBy: 'at', limit: options.limit, offset: options.offset })
  return rows.map((row): ActivityEvent => ({ id: row.id, sessionId: String(row.sessionId), source: row.source as ActivitySource,
    kind: row.kind as ActivityKind, characterId: row.characterId === null ? null : String(row.characterId),
    mode: isStudyMode(row.mode) ? row.mode : null, correct: row.correct === null ? null : row.correct === 1,
    at: String(row.at), dateKey: String(row.dateKey), seconds: Number(row.seconds), timezoneOffset: Number(row.timezoneOffset) }))
}

export function createActivityId(prefix = 'activity'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `${prefix}:${crypto.randomUUID()}`
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}:${++fallbackSequence}`
}
let fallbackSequence = 0
