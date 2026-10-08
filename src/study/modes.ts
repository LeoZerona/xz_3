export const STUDY_MODES = [
  '查看学习字体选择对照字体',
  '查看对照字体选择学习字体',
  '查看学习字体输入对照字体',
] as const

export type StudyMode = (typeof STUDY_MODES)[number]

export const INPUT_STUDY_MODE: StudyMode = '查看学习字体输入对照字体'

export function isStudyMode(value: unknown): value is StudyMode {
  return typeof value === 'string' && STUDY_MODES.some((mode) => mode === value)
}

export function normalizeStudyModes(value: unknown): StudyMode[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(isStudyMode))]
}
