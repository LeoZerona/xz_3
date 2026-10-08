export type CharacterEntry = {
  id: string
  script_forms: {
    simplified: string
    traditional: string
  }
  phonetics: {
    pinyin: string
  }
  structure: {
    total_strokes: number
    layout: string
  }
  semantics: {
    definition: string
    words: string[]
  }
}

const PINYIN_UMLAUTS: Record<string, string> = {
  ü: 'v',
  ǖ: 'v',
  ǘ: 'v',
  ǚ: 'v',
  ǜ: 'v',
}

export function normalizePinyin(value: string): string {
  return value
    .toLowerCase()
    .replace(/u:/g, 'v')
    .replace(/[üǖǘǚǜ]/g, (character) => PINYIN_UMLAUTS[character] ?? character)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zv]/g, '')
}

function getMatchScore(entry: CharacterEntry, rawQuery: string, pinyinQuery: string): number | null {
  const simplified = entry.script_forms.simplified
  const traditional = entry.script_forms.traditional
  const pinyin = normalizePinyin(entry.phonetics.pinyin)

  if (simplified === rawQuery || traditional === rawQuery || (pinyinQuery && pinyin === pinyinQuery)) return 0
  if (simplified.startsWith(rawQuery) || traditional.startsWith(rawQuery) || (pinyinQuery && pinyin.startsWith(pinyinQuery))) return 1
  if (simplified.includes(rawQuery) || traditional.includes(rawQuery) || (pinyinQuery && pinyin.includes(pinyinQuery))) return 2
  if (entry.semantics.words.some((word) => word.includes(rawQuery))) return 3
  if (entry.semantics.definition.includes(rawQuery)) return 4
  return null
}

export function searchCharacters(entries: CharacterEntry[], query: string): CharacterEntry[] {
  const rawQuery = query.trim().toLowerCase()
  if (!rawQuery) return []

  const pinyinQuery = normalizePinyin(rawQuery)
  return entries
    .map((entry, index) => ({ entry, index, score: getMatchScore(entry, rawQuery, pinyinQuery) }))
    .filter((match): match is { entry: CharacterEntry; index: number; score: number } => match.score !== null)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map(({ entry }) => entry)
}
