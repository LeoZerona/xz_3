import { describe, expect, it } from 'vitest'
import { matchesCharacterQuery, parseCollectionText } from './model'

describe('字单文本输入', () => {
  it('支持汉字扩展区、去重和常见分隔符', () => {
    expect(parseCollectionText('未，末 未\n𠮷')).toEqual({ characters: ['未', '末', '𠮷'], invalid: [] })
  })
  it('非汉字输入不被悄悄当作成功导入', () => {
    expect(parseCollectionText('未abc末').invalid).toEqual(['a', 'b', 'c'])
  })
  it('汉字查询不能被拼音标准化清空，声调拼音仍然可查', () => {
    const entry = { id: 'a', script_forms: { simplified: '未', traditional: '未' }, phonetics: { pinyin: 'wèi' },
      structure: { total_strokes: 5, layout: '独体' }, semantics: { definition: '没有', words: [] } }
    expect(matchesCharacterQuery(entry, '末')).toBe(false)
    expect(matchesCharacterQuery(entry, '未')).toBe(true)
    expect(matchesCharacterQuery(entry, 'WEI')).toBe(true)
    expect(matchesCharacterQuery(entry, 'wèi')).toBe(true)
    expect(matchesCharacterQuery(entry, '?')).toBe(false)
  })
})
