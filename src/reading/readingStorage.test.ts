import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeAutoPageSeconds, readPreferences, writePreferences } from './readingStorage'

afterEach(() => vi.unstubAllGlobals())

describe('reading preferences', () => {
  it('normalizes the automatic page duration', () => {
    expect(normalizeAutoPageSeconds('45')).toBe(45)
    expect(normalizeAutoPageSeconds(0)).toBe(1)
    expect(normalizeAutoPageSeconds(9999)).toBe(3600)
    expect(normalizeAutoPageSeconds('invalid')).toBe(30)
  })

  it('keeps reference text visible for existing preferences and rejects malformed flags', () => {
    for (const hideReferenceText of [undefined, 'true', 1, null]) {
      vi.stubGlobal('uni', { getStorageSync: () => ({ hideReferenceText }) })
      expect(readPreferences().hideReferenceText).toBe(false)
    }
  })

  it('remembers the hidden reference text preference', () => {
    let stored: unknown
    vi.stubGlobal('uni', {
      getStorageSync: () => stored,
      setStorageSync: (_key: string, value: unknown) => { stored = value },
    })
    writePreferences({ ...readPreferences(), hideReferenceText: true })
    expect(readPreferences().hideReferenceText).toBe(true)
  })
})
