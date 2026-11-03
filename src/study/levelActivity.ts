import type { LevelCategory } from './levelData'

export const LAST_LEVEL_STUDY_KEY = 'morning-pages:last-level-study'
export interface LastLevelStudy {
  category: LevelCategory
  stageId: string
  index: number
  title: string
  studiedAt: string
}
export function readLastLevelStudy(value: unknown): LastLevelStudy | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  const category = data.category
  if (category !== 'radical' && category !== 'level1' && category !== 'level2' && category !== 'level3') return null
  if (typeof data.stageId !== 'string') return null
  const match = data.stageId.match(new RegExp('^' + category + '-stage-(\\d+)$'))
  const index = Number(match?.[1])
  if (!match || !Number.isSafeInteger(index) || index < 1 || index !== data.index) return null
  if (typeof data.title !== 'string' || !data.title.trim() || typeof data.studiedAt !== 'string' || !Number.isFinite(Date.parse(data.studiedAt))) return null
  return { category, stageId: data.stageId, index, title: data.title, studiedAt: data.studiedAt }
}
