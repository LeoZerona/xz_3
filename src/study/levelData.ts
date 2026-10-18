import type { StudyCharacterEntry } from './types'

import { loadAssetBuffer } from '../utils/assetLoader'
import { decodeUtf8 } from '../utils/textEncoding'

export type LevelCategory = 'radical' | 'level1' | 'level2' | 'level3'

export interface LevelCategoryMeta {
  key: LevelCategory
  label: string
  shortLabel: string
  description: string
  icon: string
  stageSize: number
}

export const LEVEL_CATEGORIES: LevelCategoryMeta[] = [
  { key: 'radical', label: '偏旁部首', shortLabel: '部首', description: '', icon: 'apps-o', stageSize: 10 },
  { key: 'level1', label: '一级汉字', shortLabel: '一级', description: '', icon: 'records', stageSize: 10 },
  { key: 'level2', label: '二级汉字', shortLabel: '二级', description: '', icon: 'column', stageSize: 10 },
  { key: 'level3', label: '三级汉字', shortLabel: '三级', description: '', icon: 'diamond', stageSize: 10 },
]

export interface LevelStage {
  id: string
  category: LevelCategory
  index: number
  title: string
  characters: StudyCharacterEntry[]
  isPlaceholder: boolean
}

interface CharacterSource {
  index: number
  url: string
}

const LEVEL1_STAGE_SIZE = 10
// 当前 1.json..12.json 去重后共 2557 字。后续替换字表时只需同步这个轻量总数。
const LEVEL1_TOTAL_CHARACTERS = 2557
const LEVEL1_TOTAL_STAGES = Math.ceil(LEVEL1_TOTAL_CHARACTERS / LEVEL1_STAGE_SIZE)
const RADICAL_STAGE_COUNT = 3

// static 目录会被 uni-app 原样复制；使用资源路径可避免 JSON 进入 app-service.js 主包。
const level1Sources: CharacterSource[] = Array.from({ length: 13 }, (_, index) => ({
  index: index + 1,
  url: `/static/character_table/firstLevel/${index + 1}.json`,
}))

function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < array.length; index += size) result.push(array.slice(index, index + size))
  return result
}

function buildPlaceholderStages(category: LevelCategory, count: number): LevelStage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${category}-stage-${String(index + 1).padStart(2, '0')}`,
    category,
    index: index + 1,
    title: `关卡 ${String(index + 1).padStart(2, '0')}`,
    characters: [],
    isPlaceholder: true,
  }))
}

const LEVEL2_STAGES = buildPlaceholderStages('level2', 15)
const LEVEL3_STAGES = buildPlaceholderStages('level3', 12)

let loadedSourceCount = 0
let level1Characters: StudyCharacterEntry[] = []
let level1Stages: LevelStage[] = []
let radicalStages: LevelStage[] | null = null
let loadChain: Promise<void> = Promise.resolve()
const seenCharacterIds = new Set<string>()

function isStudyCharacterEntry(value: unknown): value is StudyCharacterEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Partial<StudyCharacterEntry>
  return typeof entry.id === 'string' && typeof entry.script_forms?.simplified === 'string'
}

function syncStagesByCategory() {
  STAGES_BY_CATEGORY.level1.splice(0, STAGES_BY_CATEGORY.level1.length, ...level1Stages)
  const currentRadical = radicalStages ?? []
  STAGES_BY_CATEGORY.radical.splice(0, STAGES_BY_CATEGORY.radical.length, ...currentRadical)
}

function rebuildLevel1Stages() {
  level1Stages = chunk(level1Characters, LEVEL1_STAGE_SIZE).map((characters, index) => ({
    id: `level1-stage-${String(index + 1).padStart(2, '0')}`,
    category: 'level1',
    index: index + 1,
    title: `关卡 ${String(index + 1).padStart(2, '0')}`,
    characters,
    isPlaceholder: false,
  }))
  radicalStages = null
  syncStagesByCategory()
}

async function loadNextSource(): Promise<void> {
  const source = level1Sources[loadedSourceCount]
  if (!source) return
  let raw: unknown
  try {
    const buffer = await loadAssetBuffer(source.url)
    raw = JSON.parse(decodeUtf8(new Uint8Array(buffer))) as unknown
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`字表分片加载失败：${source.index}（${message}）`)
  }
  const values = typeof raw === 'object' && raw !== null && Array.isArray((raw as { chars?: unknown }).chars)
    ? (raw as { chars: unknown[] }).chars
    : []
  const nextCharacters: StudyCharacterEntry[] = []
  for (const value of values) {
    if (!isStudyCharacterEntry(value) || seenCharacterIds.has(value.id)) continue
    seenCharacterIds.add(value.id)
    nextCharacters.push(value)
  }
  level1Characters = [...level1Characters, ...nextCharacters]
  loadedSourceCount += 1
  rebuildLevel1Stages()
}

async function ensureCharacters(targetCount: number): Promise<void> {
  const safeTarget = Math.min(Math.max(0, targetCount), LEVEL1_TOTAL_CHARACTERS)
  loadChain = loadChain
    .catch(() => undefined)
    .then(async () => {
      while (level1Characters.length < safeTarget && loadedSourceCount < level1Sources.length) {
        await loadNextSource()
      }
    })
  await loadChain
}

function buildRadicalStages(): LevelStage[] {
  if (radicalStages) return radicalStages
  const groups = new Map<string, StudyCharacterEntry[]>()
  for (const character of level1Characters) {
    const key = (character.structure as StudyCharacterEntry['structure'] & { radical_id?: string }).radical_id ?? 'unknown'
    const group = groups.get(key) ?? []
    group.push(character)
    groups.set(key, group)
  }
  const representatives = [...groups.values()]
    .sort((a, b) => b.length - a.length)
    .slice(0, RADICAL_STAGE_COUNT * LEVEL1_STAGE_SIZE)
    .map((characters) => characters[0]!)
  radicalStages = chunk(representatives, LEVEL1_STAGE_SIZE).map((characters, index) => ({
    id: `radical-stage-${String(index + 1).padStart(2, '0')}`,
    category: 'radical',
    index: index + 1,
    title: `关卡 ${String(index + 1).padStart(2, '0')}`,
    characters,
    isPlaceholder: false,
  }))
  syncStagesByCategory()
  return radicalStages
}

export function getCategoryMeta(key: LevelCategory): LevelCategoryMeta | undefined {
  return LEVEL_CATEGORIES.find((category) => category.key === key)
}

export function getCategoryStageCount(category: LevelCategory): number {
  if (category === 'level1') return LEVEL1_TOTAL_STAGES
  if (category === 'radical') return RADICAL_STAGE_COUNT
  if (category === 'level2') return LEVEL2_STAGES.length
  return LEVEL3_STAGES.length
}

export async function loadLevelStages(category: LevelCategory, count: number): Promise<LevelStage[]> {
  const safeCount = Math.max(0, Math.trunc(count))
  if (category === 'level1') {
    await ensureCharacters(safeCount * LEVEL1_STAGE_SIZE)
    return level1Stages.slice(0, safeCount)
  }
  if (category === 'radical') {
    await ensureCharacters(LEVEL1_TOTAL_CHARACTERS)
    return buildRadicalStages().slice(0, safeCount)
  }
  return (category === 'level2' ? LEVEL2_STAGES : LEVEL3_STAGES).slice(0, safeCount)
}

export async function loadStage(category: LevelCategory, stageId: string): Promise<LevelStage | undefined> {
  const stageIndex = Number.parseInt(stageId.match(/-stage-(\d+)$/)?.[1] ?? '0', 10)
  if (stageIndex <= 0) return undefined
  const stages = await loadLevelStages(category, stageIndex)
  return stages.find((stage) => stage.id === stageId)
}

// 同步查询：仅在已加载缓存中查找
export function getStage(category: LevelCategory, stageId: string): LevelStage | null {
  if (category === "level1") {
    const found = level1Stages.find((s) => s.id === stageId)
    if (found) return found
    return null
  }
  if (category === "radical") {
    if (radicalStages) {
      const found = radicalStages.find((s) => s.id === stageId)
      if (found) return found
    }
    return null
  }
  if (category === "level2") return LEVEL2_STAGES.find((s) => s.id === stageId) ?? null
  if (category === "level3") return LEVEL3_STAGES.find((s) => s.id === stageId) ?? null
  return null
}

export const STAGES_BY_CATEGORY: Record<LevelCategory, LevelStage[]> = {
  radical: [],
  level1: [],
  level2: LEVEL2_STAGES,
  level3: LEVEL3_STAGES,
}
