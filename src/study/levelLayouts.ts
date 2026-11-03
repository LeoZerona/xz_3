import type { LevelStage } from './levelData'

export type LevelLayoutId = 'cards' | 'notebook' | 'flashcards' | 'board'
export interface LevelLayoutOption {
  id: LevelLayoutId
  name: string
  description: string
}
export interface LevelStageView {
  stage: LevelStage
  completedChars: number
  isDone: boolean
  progress: number
  trainingCount?: number
}

export const DEFAULT_LEVEL_LAYOUT: LevelLayoutId = 'cards'
export const LEVEL_LAYOUT_STORAGE_KEY = 'morning-pages:level-layout'
export const LEVEL_LAYOUTS: readonly LevelLayoutOption[] = [
  { id: 'cards', name: '经典卡片', description: '双列浏览，每关十字一目了然' },
  { id: 'notebook', name: '手帐字帖', description: '大字字帖搭配目录，慢慢读、慢慢记' },
  { id: 'flashcards', name: '口袋闪卡', description: '一次专注一关，像翻一叠卡片' },
  { id: 'board', name: '闯关棋盘', description: '点字选关，底部预览本关汉字' },
]

export function getLevelLayout(value: unknown): LevelLayoutOption {
  return LEVEL_LAYOUTS.find((layout) => layout.id === value) ?? LEVEL_LAYOUTS[0]!
}
export function stageProgressLabel(item: LevelStageView): string {
  if (item.stage.isPlaceholder) return '字表准备中'
  return item.trainingCount ? `已训练 ${item.trainingCount} 次` : `${item.completedChars} / ${item.stage.characters.length} 字`
}
export function stageActionLabel(item: LevelStageView, isLastStudied = false): string {
  if (item.stage.isPlaceholder) return '敬请期待'
  if (item.isDone) return '复习关卡'
  return isLastStudied || item.completedChars > 0 ? '继续学习' : '开始学习'
}
export function stageStatusLabel(item: LevelStageView, isLastStudied = false): string {
  if (item.stage.isPlaceholder) return '字表准备中'
  if (isLastStudied) return item.isDone ? '上次选择 · 已完成' : '上次选择'
  if (item.isDone) return '已完成'
  return item.completedChars > 0 ? '进行中' : '未开始'
}
