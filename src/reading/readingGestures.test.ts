import { describe, expect, it } from 'vitest'
import { getReadingGestureAction } from './readingGestures'
import type { ReadingGesture } from './readingGestures'

const tap: ReadingGesture = { deltaX: 0, deltaY: 0, durationMs: 100, maxDistance: 0, isMultiTouch: false }

describe('reading gestures', () => {
  it('recognizes a tap with small finger movement', () => {
    expect(getReadingGestureAction(tap)).toBe('tap')
    expect(getReadingGestureAction({ ...tap, deltaX: 6, deltaY: -8, maxDistance: 8 })).toBe('tap')
  })

  it('keeps horizontal page swipes separate from taps', () => {
    expect(getReadingGestureAction({ ...tap, deltaX: -80 })).toBe('next-page')
    expect(getReadingGestureAction({ ...tap, deltaX: 80 })).toBe('previous-page')
    expect(getReadingGestureAction({ ...tap, deltaX: -80, durationMs: 800 })).toBe('next-page')
  })

  it('ignores long presses, vertical movement and incomplete swipes', () => {
    expect(getReadingGestureAction({ ...tap, durationMs: 500 })).toBe('ignore')
    expect(getReadingGestureAction({ ...tap, deltaY: 70 })).toBe('ignore')
    expect(getReadingGestureAction({ ...tap, deltaX: 30 })).toBe('ignore')
    expect(getReadingGestureAction({ ...tap, deltaX: 80, deltaY: 70 })).toBe('ignore')
  })

  it('ignores movement returning to the starting point and multiple fingers', () => {
    expect(getReadingGestureAction({ ...tap, maxDistance: 30 })).toBe('ignore')
    expect(getReadingGestureAction({ ...tap, isMultiTouch: true })).toBe('ignore')
    expect(getReadingGestureAction({ ...tap, deltaX: -100, isMultiTouch: true })).toBe('ignore')
  })
})
