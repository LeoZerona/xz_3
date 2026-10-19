import { describe, expect, it } from 'vitest'
import { calculateFittingRows, clampPage, computeTotalPages, getPageSlice } from './pagination'

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

  it('uses only the rows that fully fit in the available page height', () => {
    expect(calculateFittingRows({ availableHeight: 850, rowHeight: 90, rowGap: 10, tableOverhead: 2 }, 100)).toBe(8)
    expect(calculateFittingRows({ availableHeight: 902, rowHeight: 90, rowGap: 10, tableOverhead: 2 }, 100)).toBe(9)
  })

  it('keeps pagination valid for empty or undersized layouts', () => {
    expect(calculateFittingRows({ availableHeight: 0, rowHeight: 0, rowGap: -1, tableOverhead: 20 }, 0)).toBe(1)
    expect(calculateFittingRows({ availableHeight: 20, rowHeight: 50, rowGap: 0, tableOverhead: 0 }, 4)).toBe(1)
  })
})
