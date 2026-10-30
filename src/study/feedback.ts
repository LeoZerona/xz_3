import type { StudyMode } from './modes'

export const WRONG_ANSWER_FEEDBACK_MS = 360

export interface WrongStudyAttempt {
  characterId: string
  mode: StudyMode
  attemptedAt: string
  shouldResetModes: boolean
}

// 先完成错误反馈，再写入学习记录；离开页面或提交正确答案前可立即提交积压记录。
export function createWrongAttemptQueue(commit: (attempt: WrongStudyAttempt) => void) {
  const pending: WrongStudyAttempt[] = []
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
    for (const attempt of pending.splice(0)) commit(attempt)
  }

  function enqueue(attempt: WrongStudyAttempt): void {
    pending.push(attempt)
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(flush, WRONG_ANSWER_FEEDBACK_MS)
  }

  return { enqueue, flush }
}
