import { getDatabase } from '../database/connection'
import { flushPersistence } from '../database/persistence'
import { activityRevision, activityRow, createActivityId, localDateKey } from '../learning/activity'
import { isStudyMode, normalizeStudyModes } from '../study/modes'
import type { Row } from '../database/schema'
import type { Change } from '../database/types'
import type { PracticeInput, PracticeQuestion, PracticeSession, PracticeSource } from './types'

// Serialize reads and writes together so rapid taps cannot both read an old attempt counter.
let writeQueue: Promise<unknown> = Promise.resolve()
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const pending = writeQueue.then(work, work)
  writeQueue = pending.catch(() => undefined)
  return pending
}
function questionFromRow(row: Row): PracticeQuestion {
  if (!isStudyMode(row.mode)) throw new Error('练习题型损坏，请重新创建练习')
  return { id: row.id, characterId: String(row.characterId), mode: row.mode, position: Number(row.position),
    optionIds: JSON.parse(String(row.optionIds)) as string[], attempts: Number(row.attempts), mistakes: Number(row.mistakes),
    completedAt: row.completedAt ? String(row.completedAt) : null, firstCorrect: row.firstCorrect === null ? null : row.firstCorrect === 1 }
}
function questionRow(sessionId: string, question: PracticeQuestion): Row {
  return { ...question, sessionId, optionIds: JSON.stringify(question.optionIds), firstCorrect: question.firstCorrect === null ? null : Number(question.firstCorrect) }
}
export async function readPractice(id: string): Promise<PracticeSession> {
  await flushPersistence()
  const db = await getDatabase()
  const row = (await db.query('practice_sessions', { where: { id } }))[0]
  if (!row) throw new Error('练习不存在，请返回重新配置')
  return { id, name: String(row.name), source: row.source as PracticeSource, sourceId: row.sourceId ? String(row.sourceId) : null,
    status: row.completedAt ? 'completed' : 'active', cursor: Number(row.cursor), modes: normalizeStudyModes(JSON.parse(String(row.modes))),
    questions: (await db.query('practice_questions', { where: { sessionId: id }, orderBy: 'position' })).map(questionFromRow),
    createdAt: String(row.createdAt), updatedAt: String(row.updatedAt), completedAt: row.completedAt ? String(row.completedAt) : null }
}
export async function listPractices(limit = 20): Promise<PracticeSession[]> {
  await flushPersistence()
  const rows = await (await getDatabase()).query('practice_sessions', { orderBy: 'updatedAt', descending: true, limit })
  return Promise.all(rows.map((row) => readPractice(row.id)))
}
export function createPractice(input: PracticeInput): Promise<string> {
  return serialize(async () => {
    const ids = [...new Set(input.characterIds)]
    const modes = normalizeStudyModes(input.modes)
    if (!ids.length || !modes.length) throw new Error('请选择文字和至少一种题型')
    if (!Number.isInteger(input.count) || input.count < 1 || input.count > 200) throw new Error('每次练习请选择 1–200 字')
    if (!input.name.trim() || input.name.length > 100 || !['collection', 'favorites', 'slashed', 'mistakes', 'custom'].includes(input.source)) throw new Error('练习配置无效')
    await flushPersistence()
    const db = await getDatabase()
    const found = await db.query('characters', { whereIn: { id: ids } })
    if (found.length !== ids.length) throw new Error('练习含未收录的文字，请重新选择')
    const pool = (await db.query('characters', { orderBy: 'position', limit: 100 })).map((row) => row.id)
    const id = createActivityId('practice'); const at = new Date().toISOString()
    const questions: PracticeQuestion[] = ids.slice(0, input.count).flatMap((characterId) => modes.map((mode) => ({
      id: createActivityId('question'), characterId, mode, position: 0,
      optionIds: [characterId, ...pool.filter((entry) => entry !== characterId).slice(0, 3)].sort(() => Math.random() - 0.5),
      attempts: 0, mistakes: 0, completedAt: null, firstCorrect: null,
    })))
    questions.forEach((question, position) => { question.position = position })
    await db.commit([{ table: 'practice_sessions', row: { id, name: input.name.trim(), source: input.source, sourceId: input.sourceId ?? null,
      modes: JSON.stringify(modes), cursor: 0, createdAt: at, updatedAt: at, completedAt: null } },
    ...questions.map((question): Change => ({ table: 'practice_questions', row: questionRow(id, question) }))])
    return id
  })
}
export function answerPractice(id: string, questionId: string, value: string): Promise<PracticeSession> {
  return serialize(async () => {
    const session = await readPractice(id)
    const question = session.questions[session.cursor]
    if (!question || question.id !== questionId || question.completedAt || session.status === 'completed') return session
    const db = await getDatabase()
    const character = (await db.query('characters', { where: { id: question.characterId } }))[0]
    if (!character) throw new Error('这道题的文字已不存在')
    const answer = value.trim().normalize('NFC')
    if (!answer) throw new Error('请先作答')
    const correct = [character.id, character.simplified, character.traditional].includes(answer)
    const now = new Date(); const at = now.toISOString()
    const next = { ...question, attempts: question.attempts + 1, mistakes: question.mistakes + Number(!correct),
      firstCorrect: question.firstCorrect ?? correct, completedAt: correct ? at : null }
    await db.commit([{ table: 'practice_questions', row: questionRow(id, next) },
      { table: 'practice_sessions', row: { ...(await db.query('practice_sessions', { where: { id } }))[0]!, updatedAt: at } },
      { table: 'activity_events', ifAbsent: true, row: activityRow({ id: `${question.id}:answer:${next.attempts}`, sessionId: id,
        source: 'practice', kind: 'answer', characterId: question.characterId, mode: question.mode, correct, at,
        dateKey: localDateKey(now), seconds: 0, timezoneOffset: now.getTimezoneOffset() }) }])
    activityRevision.value++
    return readPractice(id)
  })
}
export function advancePractice(id: string): Promise<PracticeSession> {
  return serialize(async () => {
    const session = await readPractice(id)
    if (session.status === 'completed') return session
    const question = session.questions[session.cursor]
    if (question && !question.completedAt) return session
    const next = session.questions.findIndex((entry, position) => position > session.cursor && !entry.completedAt)
    const remaining = next >= 0 ? next : session.questions.findIndex((entry) => !entry.completedAt)
    const db = await getDatabase(); const at = new Date().toISOString()
    const row = (await db.query('practice_sessions', { where: { id } }))[0]!
    await db.commit([{ table: 'practice_sessions', row: { ...row, cursor: remaining < 0 ? session.questions.length : remaining, updatedAt: at, completedAt: remaining < 0 ? at : null } }])
    return readPractice(id)
  })
}
