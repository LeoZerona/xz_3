import type { StudyCharacterEntry } from './types'
import { categoryCounts, getCharacters, initializeCatalog } from '../database/catalog'
import { getDatabase } from '../database/connection'

export type LevelCategory = 'radical' | 'level1' | 'level2' | 'level3'
export interface LevelCategoryMeta { key: LevelCategory; label: string; shortLabel: string; description: string; icon: string; stageSize: number }
export interface LevelStage { id: string; category: LevelCategory; index: number; title: string; characters: StudyCharacterEntry[]; isPlaceholder: boolean }
export const LEVEL_CATEGORIES: LevelCategoryMeta[] = [
  { key: 'radical', label: '偏旁部首', shortLabel: '部首', description: '', icon: 'apps-o', stageSize: 10 },
  { key: 'level1', label: '一级汉字', shortLabel: '一级', description: '', icon: 'records', stageSize: 10 },
  { key: 'level2', label: '二级汉字', shortLabel: '二级', description: '', icon: 'column', stageSize: 10 },
  { key: 'level3', label: '三级汉字', shortLabel: '三级', description: '', icon: 'diamond', stageSize: 10 },
]
export const STAGES_BY_CATEGORY: Record<LevelCategory, LevelStage[]> = { radical: [], level1: [], level2: [], level3: [] }
export function getCategoryMeta(key: LevelCategory): LevelCategoryMeta | undefined { return LEVEL_CATEGORIES.find((category) => category.key === key) }
export function getCategoryStageCount(category: LevelCategory): number { return categoryCounts.value[category] ?? 0 }
export function getStage(category: LevelCategory, stageId: string): LevelStage | null { return STAGES_BY_CATEGORY[category].find((stage) => stage.id === stageId) ?? null }

async function queryStages(category: LevelCategory, options: { count?: number; stageId?: string }): Promise<LevelStage[]> {
  await initializeCatalog()
  const db = await getDatabase()
  const levels = await db.query('levels', { where: { category, ...(options.stageId ? { id: options.stageId } : {}) }, orderBy: 'position', limit: options.count })
  const members = await db.query('level_characters', { whereIn: { levelId: levels.map((row) => row.id) }, orderBy: 'position' })
  const characters = await getCharacters([...new Set(members.map((row) => String(row.characterId)))])
  const byId = new Map(characters.map((entry) => [entry.id, entry]))
  const stages = levels.map((level): LevelStage => ({ id: level.id, category, index: Number(level.position), title: String(level.title), isPlaceholder: level.placeholder === 1,
    characters: members.filter((row) => row.levelId === level.id).flatMap((row) => { const entry = byId.get(String(row.characterId)); return entry ? [entry] : [] }) }))
  for (const stage of stages) {
    const cached = STAGES_BY_CATEGORY[category]
    const index = cached.findIndex((entry) => entry.id === stage.id)
    if (index < 0) cached.push(stage)
    else cached[index] = stage
  }
  return stages
}
export function loadLevelStages(category: LevelCategory, count: number): Promise<LevelStage[]> { return queryStages(category, { count: Math.max(0, Math.trunc(count)) }) }
export async function loadStage(category: LevelCategory, stageId: string): Promise<LevelStage | undefined> { return (await queryStages(category, { stageId }))[0] }
