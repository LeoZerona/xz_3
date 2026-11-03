import type { StudyCharacterEntry } from '../study/types'

export function matchesPracticeAnswer(character: StudyCharacterEntry, value: string): boolean {
  const answer = value.trim().normalize('NFC')
  return answer === character.id || answer === character.script_forms.simplified || answer === character.script_forms.traditional
}
export function practiceResult(questions: ReadonlyArray<{ attempts: number; mistakes: number; firstCorrect: boolean | null; completedAt: string | null; characterId: string }>) {
  const attempted = questions.filter((question) => question.attempts > 0)
  return { total: questions.length, completed: questions.filter((question) => question.completedAt).length,
    attempts: questions.reduce((sum, question) => sum + question.attempts, 0),
    firstAccuracy: attempted.length ? Math.round(attempted.filter((question) => question.firstCorrect).length / attempted.length * 100) : 0,
    mistakeIds: [...new Set(questions.filter((question) => question.mistakes > 0).map((question) => question.characterId))] }
}
