import { describe, expect, it } from 'vitest'
import { normalizeAutoPageSeconds } from './readingStorage'

describe('reading preferences', () => {
  it('normalizes the automatic page duration', () => {
    expect(normalizeAutoPageSeconds('45')).toBe(45)
    expect(normalizeAutoPageSeconds(0)).toBe(1)
    expect(normalizeAutoPageSeconds(9999)).toBe(3600)
    expect(normalizeAutoPageSeconds('invalid')).toBe(30)
  })
})
