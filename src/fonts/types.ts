export type FontCoverTone = 'green' | 'blue' | 'orange' | 'rose' | 'teal'

export interface LearningFont {
  id: string
  name: string
  description: string
  sample: string
  fontFamily: string
  coverTone: FontCoverTone
  dailyCount: number
  remainingDays: number
  learned: number
  total: number
  progress: number
}
