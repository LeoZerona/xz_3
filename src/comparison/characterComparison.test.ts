import { describe, expect, it } from 'vitest'
import { appendComparisonCharacters, comparisonAdditionMessage, MAX_COMPARISON_CHARACTERS, normalizeComparisonIds, parseCharacterInput } from './characterComparison'
import type { CharacterEntry } from '../search/characterSearch'

function entry(character: string, id = character): CharacterEntry {
  return { id, script_forms: { simplified: character, traditional: character }, phonetics: { pinyin: '' }, structure: { total_strokes: 0, layout: '' }, semantics: { definition: '', words: [] } }
}
describe('多字比较', () => {
  it('解析连续或带分隔符的汉字，按输入顺序去重，并支持扩展汉字', () => {
    expect(parseCharacterInput(' 己，已、巳 己\n未/末 ')).toEqual(['己', '已', '巳', '未', '末'])
    expect(parseCharacterInput('𠮷 土')).toEqual(['𠮷', '土'])
  })
  it.each(['', 'shi', '土 abc', '123', '☰', '土🙂'])('不将无效输入 %s 当成汉字组', (value) => { expect(parseCharacterInput(value)).toBeNull() })
  it('恢复时只接受有效 ID，去重并遵守比较数量上限', () => {
    expect(normalizeComparisonIds({ id: 'a' })).toEqual([])
    expect(normalizeComparisonIds([' a ', 'a', null, '', 1, 'b'])).toEqual(['a', 'b'])
    expect(normalizeComparisonIds(Array.from({ length: 20 }, (_, index) => String(index)))).toHaveLength(MAX_COMPARISON_CHARACTERS)
  })
  it('追加不会修改原列表，同字不同 ID 不重复，超过容量时提供明确反馈', () => {
    const initial = [entry('己')]
    const result = appendComparisonCharacters(initial, [entry('己', 'another-id'), ...Array.from('已巳未末土士').map((character) => entry(character))])
    expect(initial).toHaveLength(1)
    expect(result.characters.map((item) => item.script_forms.simplified)).toEqual(Array.from('己已巳未末土'))
    expect(result).toMatchObject({ addedCount: 5, duplicateCount: 1, overflowCount: 1 })
    expect(comparisonAdditionMessage(result, ['𠮷'])).toContain('最多比较 6 个字')
    expect(comparisonAdditionMessage(result, ['𠮷'])).toContain('字库暂未收录：𠮷')
  })
})
