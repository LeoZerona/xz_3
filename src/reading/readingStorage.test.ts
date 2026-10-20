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

  it('uses row steps for older preferences and rejects invalid reveal modes', () => {
    for (const referenceRevealMode of [undefined, 'invalid', true, 1, null]) {
      vi.stubGlobal('uni', { getStorageSync: () => ({ referenceRevealMode }) })
      expect(readPreferences().referenceRevealMode).toBe('row')
    }
  })

  it('remembers the reveal mode without persisting the current page reveal count', () => {
    let stored: unknown
    vi.stubGlobal('uni', {
      getStorageSync: () => stored,
      setStorageSync: (_key: string, value: unknown) => { stored = value },
    })
    writePreferences({ ...readPreferences(), referenceRevealMode: 'character' })
    expect(readPreferences().referenceRevealMode).toBe('character')
    expect(stored).not.toHaveProperty('revealedReferenceCount')
  })
})
