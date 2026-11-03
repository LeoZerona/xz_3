import type { CharacterEntry } from '../search/characterSearch'

export const COMPARISON_STORAGE_KEY = 'morning-pages:character-comparison'
export const MAX_COMPARISON_CHARACTERS = 6
const HAN_CHARACTER = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u{20000}-\u{323af}]$/u

/** 接受连续汉字或常见分隔符；保留输入顺序，不把拼音误当成字组。 */
export function parseCharacterInput(value: string): string[] | null {
  const characters = Array.from(value.replace(/[\s,，、;；/|]+/g, ''))
  if (!characters.length || characters.some((character) => !HAN_CHARACTER.test(character))) return null
  return [...new Set(characters)]
}
export function normalizeComparisonIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string').map((id) => id.trim()).filter(Boolean))].slice(0, MAX_COMPARISON_CHARACTERS)
}
export interface ComparisonAddition {
  characters: CharacterEntry[]
  addedCount: number
  duplicateCount: number
  overflowCount: number
  saved: boolean
}
export function appendComparisonCharacters(current: readonly CharacterEntry[], incoming: readonly CharacterEntry[]): ComparisonAddition {
  const characters = [...current]
  let addedCount = 0
  let duplicateCount = 0
  let overflowCount = 0
  for (const entry of incoming) {
    if (characters.some((item) => item.id === entry.id || item.script_forms.simplified === entry.script_forms.simplified)) duplicateCount++
    else if (characters.length >= MAX_COMPARISON_CHARACTERS) overflowCount++
    else { characters.push(entry); addedCount++ }
  }
  return { characters, addedCount, duplicateCount, overflowCount, saved: true }
}
export function comparisonAdditionMessage(result: ComparisonAddition, missing: readonly string[] = []): string {
  if (!result.saved) return '比较列表保存失败，请重试'
  const messages: string[] = []
  if (result.addedCount) messages.push(`已加入 ${result.addedCount} 个字`)
  if (result.duplicateCount) messages.push(`${result.duplicateCount} 个字已在比较中`)
  if (result.overflowCount) messages.push(`最多比较 ${MAX_COMPARISON_CHARACTERS} 个字，请先移除部分文字`)
  if (missing.length) messages.push(`字库暂未收录：${missing.join('、')}`)
  return messages.join('；') || '没有可加入的文字'
}
