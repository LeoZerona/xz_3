import { normalizePinyin } from '../src/search/characterSearch'
import { compound } from '../src/database/keys'
import type { Change } from '../src/database/types'
import type { StudyCharacterEntry } from '../src/study/types'

type SourceEntry = StudyCharacterEntry & { level?: number; script_forms: StudyCharacterEntry['script_forms'] & { seal?: string }; structure: StudyCharacterEntry['structure'] & { radical_id?: string } }
export function buildCatalogSeed(daily: SourceEntry[], sources: SourceEntry[][], higherLevels: SourceEntry[][] = []): Change[] {
  const entries = new Map<string, SourceEntry>()
  for (const source of [...sources, ...higherLevels]) for (const entry of source) if (!entries.has(entry.id)) entries.set(entry.id, entry)
  const ordered = [...entries.values()]
  // 日常字单的成员与顺序保持原样；统一字段优先使用原每日字表的内容。
  for (const entry of daily) entries.set(entry.id, entry)
  const changes: Change[] = []
  for (const [position, original] of [...entries.values()].entries()) {
    const entry = entries.get(original.id)!
    changes.push({ table: 'characters', row: { id: entry.id, simplified: entry.script_forms.simplified, traditional: entry.script_forms.traditional, pinyin: entry.phonetics.pinyin, pinyinSearch: normalizePinyin(entry.phonetics.pinyin), strokes: entry.structure.total_strokes, radical: entry.structure.radical_id ?? '', layout: entry.structure.layout, definition: entry.semantics.definition, level: entry.level ?? 1, position } },
      { table: 'character_details', row: { id: entry.id, liushu: entry.structure.liushu, liushuDetail: entry.structure.liushu_detail, sourceVersion: entry.shuowen.source_version, original: entry.shuowen.original, translation: entry.shuowen.translation,
        extras: JSON.stringify({ script_forms: entry.script_forms, structure: entry.structure, semantics: { ...entry.semantics, definition: undefined, words: undefined }, phonetics: entry.phonetics, study: entry.study }) } })
    entry.semantics.words.forEach((word, index) => changes.push({ table: 'character_words', row: { id: compound(entry.id, index), characterId: entry.id, word, position: index } }))
  }
  daily.forEach((entry, position) => changes.push({ table: 'character_sets', row: { id: compound('daily', entry.id), setId: 'daily', characterId: entry.id, position } }))
  function addStages(category: string, characters: SourceEntry[], placeholderCount = 0, startPosition = 0) {
    const count = placeholderCount || Math.ceil(characters.length / 10)
    for (let position = 0; position < count; position++) {
      const stageIndex = startPosition + position + 1
      const id = `${category}-stage-${String(stageIndex).padStart(2, '0')}`
      changes.push({ table: 'levels', row: { id, category, position: stageIndex, title: `关卡 ${String(stageIndex).padStart(2, '0')}`, placeholder: Number(placeholderCount > 0) } })
      characters.slice(position * 10, position * 10 + 10).forEach((entry, index) => changes.push({ table: 'level_characters', row: { id: compound(id, entry.id), levelId: id, characterId: entry.id, position: index } }))
    }
  }
  const legacy = ordered.filter((entry) => (entry.level ?? 1) === 1 && !entry.id.startsWith('char-l1-'))
  const supplement = ordered.filter((entry) => entry.id.startsWith('char-l1-'))
  // 原末关仅 7 字，继续保留其完整成员，防止旧完成标记误覆盖新增字。
  addStages('level1', legacy)
  addStages('level1', supplement, 0, Math.ceil(legacy.length / 10))
  const groups = new Map<string, SourceEntry[]>()
  // 部首关卡沿用旧字库，补齐一级字表不改变已有部首关卡的成员。
  for (const entry of legacy) { const key = entry.structure.radical_id ?? 'unknown'; const group = groups.get(key) ?? []; group.push(entry); groups.set(key, group) }
  addStages('radical', [...groups.values()].sort((a, b) => b.length - a.length).slice(0, 30).map((group) => group[0]!))
  addStages('level2', ordered.filter(entry => entry.level === 2), higherLevels.length ? 0 : 15)
  addStages('level3', ordered.filter(entry => entry.level === 3), higherLevels.length ? 0 : 12)
  return changes
}
