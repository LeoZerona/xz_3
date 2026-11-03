import { getDatabase } from '../database/connection'
import { flushPersistence, readStored, saveStored } from '../database/persistence'
import { createActivityId } from './activity'
import { object } from '../database/records'

export interface AssessmentQuestion { id: string; characterId: string; optionIds: string[]; answer: string | null; correct: boolean | null }
export interface AssessmentSession { id: string; level: number; questions: AssessmentQuestion[]; cursor: number; createdAt: string; completedAt: string | null }
const KEY = 'font-learning-assessments'
let mutations: Promise<unknown> = Promise.resolve()
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const pending = mutations.then(work, work)
  mutations = pending.catch(() => undefined)
  return pending
}
function all(): Record<string, AssessmentSession> { return object(readStored(KEY)) as Record<string, AssessmentSession> }
function shuffled<T>(values: T[]): T[] {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index--) { const target = Math.floor(Math.random() * (index + 1)); [copy[index], copy[target]] = [copy[target]!, copy[index]!] }
  return copy
}
export function readAssessment(id: string): AssessmentSession { const session = all()[id]; if (!session) throw new Error('测评不存在，请重新开始'); return JSON.parse(JSON.stringify(session)) as AssessmentSession }
export function listAssessments(): AssessmentSession[] { return Object.values(all()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
export async function startAssessment(input: { level: number }): Promise<string> {
  if (![1, 2, 3].includes(input.level)) throw new Error('请选择一级、二级或三级课程')
  const rows = await (await getDatabase()).query('characters', { where: { level: input.level }, orderBy: 'position' })
  if (!rows.length) throw new Error('该级字库尚未准备，请检查资源状态')
  const ids = rows.map(row => row.id); const sample = shuffled(ids).slice(0, 30)
  const id = createActivityId('assessment')
  const session: AssessmentSession = { id, level: input.level, cursor: 0, createdAt: new Date().toISOString(), completedAt: null,
    questions: sample.map(characterId => ({ id: createActivityId('sample'), characterId, optionIds: shuffled([characterId, ...shuffled(ids.filter(item => item !== characterId)).slice(0, 3)]), answer: null, correct: null })) }
  saveStored(KEY, { ...all(), [id]: session }); await flushPersistence(); return id
}
export function answerAssessment(id: string, questionId: string, value: string): Promise<AssessmentSession> {
  return serialize(async () => {
  const session = readAssessment(id); const question = session.questions[session.cursor]
  if (!question || question.id !== questionId || question.answer !== null) return session
  const row = (await (await getDatabase()).query('characters', { where: { id: question.characterId } }))[0]
  if (!row || !value.trim()) throw new Error('请先选择一个答案')
  question.answer = value; question.correct = [row.id, row.simplified, row.traditional].includes(value)
  saveStored(KEY, { ...all(), [id]: session }); await flushPersistence(); return session
  })
}
export function advanceAssessment(id: string): Promise<AssessmentSession> {
  return serialize(async () => {
  const session = readAssessment(id)
  if (session.questions[session.cursor]?.answer === null) return session
  session.cursor = Math.min(session.questions.length, session.cursor + 1)
  if (session.cursor === session.questions.length) session.completedAt ??= new Date().toISOString()
  saveStored(KEY, { ...all(), [id]: session }); await flushPersistence(); return session
  })
}
