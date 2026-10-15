import { describe, expect, it } from 'vitest'
import { clampPage, computeTotalPages, getPageSlice } from './pagination'

describe('reading pagination', () => {
  it('computes total pages', () => {
    expect(computeTotalPages(0, 10)).toBe(1)
    expect(computeTotalPages(25, 10)).toBe(3)
    expect(computeTotalPages(10, 10)).toBe(1)
  })

  it('clamps page', () => {
    expect(clampPage(0, 3)).toBe(1)
    expect(clampPage(5, 3)).toBe(3)
    expect(clampPage(2, 3)).toBe(2)
  })

  it('slices page rows', () => {
    const rows = Array.from({ length: 25 }, (_, i) => i + 1)
    expect(getPageSlice(rows, 1, 10)).toEqual([1,2,3,4,5,6,7,8,9,10])
    expect(getPageSlice(rows, 3, 10)).toEqual([21,22,23,24,25])
    expect(getPageSlice(rows, 99, 10)).toEqual([21,22,23,24,25])
  })
})
