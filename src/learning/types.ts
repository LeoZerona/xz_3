import type { StudyMode } from '../study/modes'

export type ActivitySource = 'daily' | 'level' | 'review' | 'practice' | 'reading'
export type ActivityKind = 'answer' | 'completed' | 'time'
export interface ActivityEvent {
  id: string
  sessionId: string
  source: ActivitySource
  kind: ActivityKind
  characterId: string | null
  mode: StudyMode | null
  correct: boolean | null
  at: string
  dateKey: string
  seconds: number
  timezoneOffset: number
}
export interface LegacyLearningDay {
  dateKey: string
  learnedIds: string[]
  reviewedCount: number
  studySeconds: number
}
export interface LearningDay {
  dateKey: string
  newIds: string[]
  newCount: number
  reviewCount: number
  practiceCount: number
  answerCount: number
  correctCount: number
  studySeconds: number
  readingSeconds: number
  hasActivity: boolean
}
export interface LearningSummary {
  learnedCount: number
  studySeconds: number
  reviewCount: number
  currentStreak: number
  longestStreak: number
  activeDates: string[]
  days: LearningDay[]
  today: LearningDay
}
export interface TimeSegment {
  at: string
  dateKey: string
  seconds: number
  timezoneOffset: number
}
