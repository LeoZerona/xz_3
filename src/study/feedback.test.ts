import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWrongAttemptQueue } from './feedback'
import type { WrongStudyAttempt } from './feedback'

const firstAttempt: WrongStudyAttempt = {
  characterId: 'char-0001',
  mode: 'seal-to-reference-choice',
  attemptedAt: '2026-10-30T08:00:00.000Z',
  shouldResetModes: false,
}

describe('wrong answer feedback', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keeps synchronous storage out of the 360ms feedback animation', () => {
    const commit = vi.fn()
    const queue = createWrongAttemptQueue(commit)

    queue.enqueue(firstAttempt)
    vi.advanceTimersByTime(359)
    expect(commit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith(firstAttempt)
  })

  it('lets the latest feedback finish and preserves every attempt in order', () => {
    const committed: WrongStudyAttempt[] = []
    const queue = createWrongAttemptQueue((attempt) => committed.push(attempt))
    const secondAttempt: WrongStudyAttempt = {
      ...firstAttempt,
      attemptedAt: '2026-10-30T08:00:00.200Z',
      shouldResetModes: true,
    }

    queue.enqueue(firstAttempt)
    vi.advanceTimersByTime(200)
    queue.enqueue(secondAttempt)
    vi.advanceTimersByTime(359)
    expect(committed).toEqual([])
    vi.advanceTimersByTime(1)
    expect(committed).toEqual([firstAttempt, secondAttempt])
  })

  it('flushes once before correction or exit and leaves no pending timer', () => {
    const commit = vi.fn()
    const queue = createWrongAttemptQueue(commit)

    queue.enqueue(firstAttempt)
    queue.flush()
    queue.flush()
    vi.runAllTimers()
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith(firstAttempt)
    expect(vi.getTimerCount()).toBe(0)
  })
})
