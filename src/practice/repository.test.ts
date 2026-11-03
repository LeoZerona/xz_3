import { beforeEach, expect, it } from 'vitest'
import { setupTestDatabase } from '../database/testSupport'
import { getDatabase } from '../database/connection'
import { readActivities } from '../learning/activity'
import { advancePractice, answerPractice, createPractice, readPractice } from './repository'

beforeEach(async () => {
  const db = await setupTestDatabase()
  await db.commit(['未', '末', '木', '本'].map((text, position) => ({ table: 'characters', row: { id: `c${position}`, simplified: text, traditional: text, position } })))
})
it('题单和题型固定，重复提交幂等，练习不改变正式学习及复习', async () => {
  const id = await createPractice({ name: '易混字', source: 'custom', characterIds: ['c0', 'c1'], modes: ['seal-to-reference-choice'], count: 2 })
  const original = await readPractice(id)
  expect(original.questions).toHaveLength(2)
  expect((await readPractice(id)).questions).toEqual(original.questions)
  const question = original.questions[0]!
  await Promise.all([answerPractice(id, question.id, 'c0'), answerPractice(id, question.id, 'c0')])
  expect((await readActivities({ sessionId: id })).filter((event) => event.kind === 'answer')).toHaveLength(1)
  let session = await advancePractice(id)
  await answerPractice(id, session.questions[session.cursor]!.id, 'c1')
  session = await advancePractice(id)
  expect(session.status).toBe('completed')
  const db = await getDatabase()
  expect(await db.query('character_progress')).toEqual([])
  expect(await db.query('level_review')).toEqual([])
})
it('错误不完成题目，继续时保留错误次数，结果统计真实首答', async () => {
  const id = await createPractice({ name: '练习', source: 'custom', characterIds: ['c0'], modes: ['seal-to-reference-choice'], count: 1 })
  const question = (await readPractice(id)).questions[0]!
  await answerPractice(id, question.id, 'c1')
  let session = await readPractice(id)
  expect(session.questions[0]).toMatchObject({ attempts: 1, mistakes: 1, completedAt: null })
  await answerPractice(id, question.id, 'c0')
  session = await advancePractice(id)
  expect(session.status).toBe('completed')
  expect(session.questions[0]).toMatchObject({ firstCorrect: false, attempts: 2 })
})
it('空范围、未知文字和题型不能创建半份练习', async () => {
  await expect(createPractice({ name: '空', source: 'custom', characterIds: [], modes: ['seal-to-reference-choice'], count: 10 })).rejects.toThrow('文字')
  await expect(createPractice({ name: '未知', source: 'custom', characterIds: ['missing'], modes: ['seal-to-reference-choice'], count: 1 })).rejects.toThrow('未收录')
  expect(await (await getDatabase()).query('practice_sessions')).toEqual([])
})

