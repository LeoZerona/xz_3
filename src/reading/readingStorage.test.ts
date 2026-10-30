import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeAutoPageSeconds, readPreferences, readProgress, writePreferences, writeProgress, READING_PROGRESS_KEY } from './readingStorage'
import type { ReadingProgress } from './types'

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

describe('reading progress', () => {
  function setupStorage() {
    const stored = new Map<string, unknown>()
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => stored.get(key),
      setStorageSync: (key: string, value: unknown) => stored.set(key, value),
    })
    return stored
  }

  const progress: ReadingProgress = {
    bookId: 'first', page: 23, rowsPerPage: 7, characterOffset: 2100, charsPerLine: 18,
    tableStyleId: 'light-grid', updatedAt: '2026-10-29T00:00:00.000Z',
  }

  it('stores each book independently while remembering the most recent book', () => {
    setupStorage()
    expect(writeProgress(progress)).toBe(true)
    const second = { ...progress, bookId: 'second', page: 2, characterOffset: 98 }
    writeProgress(second)
    expect(readProgress('first')).toEqual(progress)
    expect(readProgress('second')).toEqual(second)
    expect(readProgress()).toEqual(second)
    expect(readProgress('unread')).toBeNull()
  })

  it('preserves the legacy last book before writing a different book', () => {
    const stored = setupStorage()
    const legacy = { bookId: 'legacy', page: 8, rowsPerPage: 12, tableStyleId: 'light-grid', updatedAt: '' }
    stored.set(READING_PROGRESS_KEY, legacy)
    expect(readProgress('legacy')).toEqual(legacy)
    writeProgress(progress)
    expect(readProgress('legacy')).toEqual(legacy)
    expect(readProgress()).toEqual(progress)
  })

  it('rejects invalid pages and discards invalid anchors and capacities', () => {
    const stored = setupStorage()
    for (const page of [NaN, Infinity, '3']) {
      stored.set(READING_PROGRESS_KEY, { ...progress, page })
      expect(readProgress()).toBeNull()
    }
    for (const invalid of [NaN, Infinity, -1, '7']) {
      stored.set(READING_PROGRESS_KEY, { ...progress, characterOffset: invalid, rowsPerPage: invalid })
      expect(readProgress()).toMatchObject({ rowsPerPage: 10 })
      expect(readProgress()).not.toHaveProperty('characterOffset')
    }
  })

  it('reports storage failures so the reader can show feedback', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('uni', {
      getStorageSync: () => undefined,
      setStorageSync: () => { throw new Error('storage full') },
    })
    expect(writeProgress(progress)).toBe(false)
    expect(warn).toHaveBeenCalledWith('保存阅读进度失败', expect.any(Error))
    warn.mockRestore()
  })
})
