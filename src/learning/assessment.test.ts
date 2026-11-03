import { beforeEach, expect, it } from 'vitest'
import { setupTestDatabase } from '../database/testSupport'
import { getDatabase } from '../database/connection'
import { startAssessment, readAssessment, answerAssessment } from './assessment'
beforeEach(async () => { const db = await setupTestDatabase(); await db.commit(Array.from({ length: 35 }, (_, position) => ({ table: 'characters', row: { id: `c${position}`, simplified: String.fromCodePoint(0x4e00 + position), level: 1, position } }))) })
it('测评固定抽样30字，答案仅记录首答，不写正式学习数据', async () => {
  const id = await startAssessment({ level: 1 })
  const initial = readAssessment(id)
  expect(initial.questions).toHaveLength(30)
  await answerAssessment(id, initial.questions[0]!.id, initial.questions[0]!.characterId)
  await answerAssessment(id, initial.questions[0]!.id, 'wrong')
  expect(readAssessment(id).questions[0]?.correct).toBe(true)
  expect(readAssessment(id).questions.map(question => question.characterId)).toEqual(initial.questions.map(question => question.characterId))
  const db = await getDatabase()
  expect(await db.query('character_progress')).toEqual([])
  expect(await db.query('activity_events')).toEqual([])
})
it('快速连续提交时第一份答案不可被后一次覆盖', async () => {
  const id = await startAssessment({ level: 1 })
  const question = readAssessment(id).questions[0]!
  await Promise.all([answerAssessment(id, question.id, question.characterId), answerAssessment(id, question.id, 'wrong')])
  expect(readAssessment(id).questions[0]?.correct).toBe(true)
})
