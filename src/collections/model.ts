import { normalizePinyin } from '../search/characterSearch'
import type { CharacterEntry } from '../search/characterSearch'

export function matchesCharacterQuery(entry: CharacterEntry, query: string): boolean {
  const text = query.trim().normalize('NFC')
  if (!text) return true
  if (/\p{Script=Han}/u.test(text)) return Array.from(text).some((character) => character === entry.script_forms.simplified || character === entry.script_forms.traditional)
  const pinyin = normalizePinyin(text)
  return Boolean(pinyin) && normalizePinyin(entry.phonetics.pinyin).includes(pinyin)
}

export function parseCollectionText(input: string): { characters: string[]; invalid: string[] } {
  const characters: string[] = []
  const invalid: string[] = []
  for (const value of Array.from(input.normalize('NFC'))) {
    if (/\p{Script=Han}/u.test(value)) { if (!characters.includes(value)) characters.push(value) }
    else if (!/[\s,，、;；。|/]/u.test(value) && !invalid.includes(value)) invalid.push(value)
  }
  return { characters, invalid }
}
