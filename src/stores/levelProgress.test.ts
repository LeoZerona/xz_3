import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setupTestDatabase } from '../database/testSupport'
import { flushPersistence, initializePersistence, resetPersistenceForTests } from '../database/persistence'
import { STUDY_MODES } from '../study/modes'
import { useLevelProgressStore, LEVEL_PROGRESS_STORAGE_KEY } from './levelProgress'
import { useCharacterLearningStore } from './characterLearning'

const stageId = 'level1-stage-01'
describe('关卡重复训练与独立进度', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('历史已完成算一次，新轮需要实际答题；结束重复调用不重复计数', async () => {
    await setupTestDatabase(new Map([[LEVEL_PROGRESS_STORAGE_KEY, { completedStageIds: [stageId], stageCharacterCompleted: { [stageId]: ['char-0001'] } }]]))
    const store = useLevelProgressStore()
    expect(store.getTrainingCount(stageId)).toBe(1)
    store.beginTraining(stageId)
    expect(store.isCharacterComplete(stageId, 'char-0001', STUDY_MODES)).toBe(false)
    for (const mode of STUDY_MODES) store.recordModeCompleted(stageId, 'char-0001', mode)
    expect(store.isCharacterComplete(stageId, 'char-0001', STUDY_MODES)).toBe(true)
    store.markStageCompleted(stageId)
    store.markStageCompleted(stageId)
    expect(store.getTrainingCount(stageId)).toBe(2)
    store.beginTraining(stageId)
    expect(store.isModeComplete(stageId, 'char-0001', STUDY_MODES[0])).toBe(false)
    expect(store.completedStageIds).toEqual([stageId])
  })
  it('中途退出恢复本轮，重练不清除长期完成、收藏和斩字', async () => {
    await setupTestDatabase()
    const learning = useCharacterLearningStore()
    learning.toggleFavorite('char-0001'); learning.toggleExcluded('char-0001')
    learning.recordModeAttempt('char-0001', STUDY_MODES[0], true)
    const store = useLevelProgressStore()
    store.beginTraining(stageId)
    store.recordModeCompleted(stageId, 'char-0001', STUDY_MODES[0])
    await flushPersistence(); resetPersistenceForTests(); await initializePersistence(); setActivePinia(createPinia())
    const reopened = useLevelProgressStore()
    reopened.beginTraining(stageId)
    expect(reopened.isModeComplete(stageId, 'char-0001', STUDY_MODES[0])).toBe(true)
    expect(reopened.getTrainingCount(stageId)).toBe(0)
    reopened.resetStage(stageId)
    expect(reopened.isModeComplete(stageId, 'char-0001', STUDY_MODES[0])).toBe(false)
    const persisted = useCharacterLearningStore()
    expect(persisted.isFavorite('char-0001')).toBe(true)
    expect(persisted.isExcluded('char-0001')).toBe(true)
    expect(persisted.isModeComplete('char-0001', STUDY_MODES[0])).toBe(true)
  })
})
