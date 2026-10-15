import { describe, expect, it } from 'vitest'
import { normalizeStudyModes, STUDY_MODES } from './modes'

describe('study modes', () => {
  it('migrates saved display labels to stable mode ids', () => {
    expect(normalizeStudyModes([
      '查看学习字体选择对照字体',
      '查看学习字体输入对照字体',
    ])).toEqual([STUDY_MODES[0], STUDY_MODES[2]])
  })
})
