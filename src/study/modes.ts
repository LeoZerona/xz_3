export const STUDY_MODES = [
  'seal-to-reference-choice',
  'reference-to-seal-choice',
  'seal-to-reference-input',
] as const

export type StudyMode = (typeof STUDY_MODES)[number]

export const INPUT_STUDY_MODE: StudyMode = 'seal-to-reference-input'

export const STUDY_MODE_LABELS: Record<StudyMode, string> = {
  'seal-to-reference-choice': '查看学习字体选择对照字体',
  'reference-to-seal-choice': '查看对照字体选择学习字体',
  'seal-to-reference-input': '查看学习字体输入对照字体',
}

const LEGACY_MODE_IDS = Object.fromEntries(
  STUDY_MODES.map((mode) => [STUDY_MODE_LABELS[mode], mode]),
) as Record<string, StudyMode>

export function getStudyModeLabel(mode: StudyMode): string {
  return STUDY_MODE_LABELS[mode]
}

export function isStudyMode(value: unknown): value is StudyMode {
  return typeof value === 'string' && STUDY_MODES.some((mode) => mode === value)
}

export function normalizeStudyModes(value: unknown): StudyMode[] {
  if (!Array.isArray(value)) return []
  const modes = value.flatMap((item) => {
    if (isStudyMode(item)) return [item]
    if (typeof item === 'string' && LEGACY_MODE_IDS[item]) return [LEGACY_MODE_IDS[item]]
    return []
  })
  return [...new Set(modes)]
}


export function getEffectiveStudyModes() {
  try {
    const saved = uni.getStorageSync("font-learning-plan");
    const normalized = normalizeStudyModes(saved && saved.modes);
    return normalized.length>0?normalized:[...STUDY_MODES];
  } catch(e){ return [...STUDY_MODES]; }
}
