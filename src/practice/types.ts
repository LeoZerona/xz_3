import type { StudyMode } from '../study/modes'

export type PracticeSource = 'collection' | 'favorites' | 'slashed' | 'mistakes' | 'custom'
export interface PracticeInput {
  name: string
  source: PracticeSource
  sourceId?: string
  characterIds: string[]
  modes: StudyMode[]
  count: number
}
export interface PracticeQuestion {
  id: string
  characterId: string
  mode: StudyMode
  position: number
  optionIds: string[]
  attempts: number
  mistakes: number
  completedAt: string | null
  firstCorrect: boolean | null
}
export interface PracticeSession {
  id: string
  name: string
  source: PracticeSource
  sourceId: string | null
  status: 'active' | 'completed'
  cursor: number
  modes: StudyMode[]
  questions: PracticeQuestion[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
}
