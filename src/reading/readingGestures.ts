export interface ReadingGesture {
  deltaX: number
  deltaY: number
  durationMs: number
  maxDistance: number
  isMultiTouch: boolean
}

export type ReadingGestureAction = 'tap' | 'next-page' | 'previous-page' | 'ignore'

export function getReadingGestureAction(gesture: ReadingGesture): ReadingGestureAction {
  if (gesture.isMultiTouch) return 'ignore'
  const horizontalDistance = Math.abs(gesture.deltaX)
  const verticalDistance = Math.abs(gesture.deltaY)
  if (horizontalDistance >= 50 && verticalDistance <= 60) {
    return gesture.deltaX < 0 ? 'next-page' : 'previous-page'
  }
  const distance = Math.max(horizontalDistance, verticalDistance, gesture.maxDistance)
  // 长按选字、纵向滑动和移动后回到原位都不应揭示答案。
  return gesture.durationMs < 500 && distance <= 10 ? 'tap' : 'ignore'
}
