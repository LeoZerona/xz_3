import { describe, expect, it } from 'vitest'
import characterTable from '../static/character_table/first-level.json'
import { normalizePinyin, searchCharacters } from './characterSearch'

describe('character search', () => {
  it('removes tones and supports pinyin umlaut input', () => {
    expect(normalizePinyin('shí')).toBe('shi')
    expect(normalizePinyin('lǜ')).toBe('lv')
    expect(normalizePinyin('nu:')).toBe('nv')
  })

  it('fuzzy matches tone-free pinyin', () => {
    const results = searchCharacters(characterTable.chars, 'shi')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((entry) => entry.phonetics.pinyin === 'shí')).toBe(true)
  })

  it('matches Chinese characters and related words', () => {
    expect(searchCharacters(characterTable.chars, '一')[0]?.script_forms.simplified).toBe('一')
    expect(searchCharacters(characterTable.chars, '一起').some((entry) => entry.script_forms.simplified === '一')).toBe(true)
  })
})
