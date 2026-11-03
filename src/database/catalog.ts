import { ref } from 'vue'
import { loadAssetBuffer } from '../utils/assetLoader'
import { decodeUtf8 } from '../utils/textEncoding'
import { searchCharacters, type CharacterEntry } from '../search/characterSearch'
import type { StudyCharacterEntry } from '../study/types'
import { getDatabase } from './connection'
import type { Change } from './types'
import { tables, type Row, type Table } from './schema'
import { object } from './records'

export const categoryCounts = ref<Record<string, number>>({})
let initialization: Promise<void> | undefined
let dailyCharacters: Promise<StudyCharacterEntry[]> | undefined
let dailyIds: Promise<string[]> | undefined
let searchEntries: Promise<CharacterEntry[]> | undefined
let allSearchEntries: Promise<CharacterEntry[]> | undefined
const CONTENT_TABLES: Table[] = ['characters', 'character_details', 'character_words', 'character_sets', 'levels', 'level_characters']
async function loadText(url: string): Promise<string> { return decodeUtf8(new Uint8Array(await loadAssetBuffer(url))) }
export function initializeCatalog(): Promise<void> {
  initialization ??= (async () => {
    const db = await getDatabase()
    const version = (await loadText('/static/database/catalog-version.txt')).trim()
    const stored = await db.query('meta', { where: { id: 'catalog-version' } })
    if (stored[0]?.value !== version) {
      const raw = object(JSON.parse(await loadText('/static/database/catalog-seed.json')) as unknown)
      if (raw.version !== version || !Array.isArray(raw.changes)) throw new Error('内置字库版本不一致，请重新打开应用')
      const changes = raw.changes as Change[]
      if (changes.some((change) => !CONTENT_TABLES.includes(change.table) || !('row' in change) || typeof change.row.id !== 'string' || !tables.includes(change.table))) throw new Error('内置字库数据无效')
      const replacement: Change[] = []
      for (const table of CONTENT_TABLES) for (const row of await db.query(table)) replacement.push({ table, deleteId: row.id })
      await db.commit([...replacement, ...changes, { table: 'meta', row: { id: 'catalog-version', value: version } }])
    }
    const levels = await db.query('levels')
    const counts: Record<string, number> = {}
    for (const row of levels) { const category = String(row.category); counts[category] = (counts[category] ?? 0) + 1 }
    categoryCounts.value = counts
  })().catch((error: unknown) => { initialization = undefined; throw error })
  return initialization
}

function summary(row: Row, words: string[] = []): CharacterEntry {
  return { id: row.id, script_forms: { simplified: String(row.simplified), traditional: String(row.traditional) }, phonetics: { pinyin: String(row.pinyin) }, structure: { total_strokes: Number(row.strokes), layout: String(row.layout) }, semantics: { definition: String(row.definition), words } }
}
export async function getCharacter(id: string): Promise<StudyCharacterEntry | null> {
  return (await getCharacters([id]))[0] ?? null
}
export async function getCharacters(ids: string[]): Promise<StudyCharacterEntry[]> {
  await initializeCatalog()
  if (!ids.length) return []
  const db = await getDatabase()
  const [rows, details, words] = await Promise.all([db.query('characters', { whereIn: { id: ids } }), db.query('character_details', { whereIn: { id: ids } }), db.query('character_words', { whereIn: { characterId: ids }, orderBy: 'position' })])
  const byId = new Map(rows.map((row) => [row.id, row]))
  const detailById = new Map(details.map((row) => [row.id, row]))
  return ids.flatMap((id) => {
    const row = byId.get(id); const detail = detailById.get(id)
    if (!row || !detail) return []
    const base = summary(row, words.filter((word) => word.characterId === id).map((word) => String(word.word)))
    const extra = object(JSON.parse(String(detail.extras)) as unknown)
    const character: StudyCharacterEntry = { ...base, level: Number(row.level),
      script_forms: { ...object(extra.script_forms), ...base.script_forms }, phonetics: { ...object(extra.phonetics), ...base.phonetics },
      structure: { ...object(extra.structure), ...base.structure, liushu: String(detail.liushu), liushu_detail: String(detail.liushuDetail) },
      semantics: { ...object(extra.semantics), ...base.semantics },
      shuowen: { source_version: String(detail.sourceVersion), original: String(detail.original), translation: String(detail.translation) },
      study: object(extra.study) as StudyCharacterEntry['study'],
    }
    return [character]
  })
}
export async function getDailyCharacters(): Promise<StudyCharacterEntry[]> {
  dailyCharacters ??= loadDailyCharacters().catch((error: unknown) => { dailyCharacters = undefined; throw error })
  return dailyCharacters
}
async function loadDailyCharacters(): Promise<StudyCharacterEntry[]> {
  return getCharacters(await getDailyCharacterIds())
}
export function getDailyCharacterIds(): Promise<string[]> {
  dailyIds ??= (async () => {
    await initializeCatalog()
    const db = await getDatabase()
    return (await db.query('character_sets', { where: { setId: 'daily' }, orderBy: 'position' })).map((row) => String(row.characterId))
  })().catch((error: unknown) => { dailyIds = undefined; throw error })
  return dailyIds
}
export async function searchCatalog(query: string, limit = 50, offset = 0, scope: 'daily' | 'all' = 'daily'): Promise<{ entries: CharacterEntry[]; total: number }> {
  await initializeCatalog()
  if (!query.trim()) return { entries: [], total: 0 }
  let entries: CharacterEntry[]
  if (scope === 'all') {
    allSearchEntries ??= loadAllSearchEntries().catch((error: unknown) => { allSearchEntries = undefined; throw error })
    entries = await allSearchEntries
  } else {
    searchEntries ??= loadSearchEntries().catch((error: unknown) => { searchEntries = undefined; throw error })
    entries = await searchEntries
  }
  const matches = searchCharacters(entries, query)
  return { entries: matches.slice(offset, offset + limit), total: matches.length }
}
async function loadSearchEntries(): Promise<CharacterEntry[]> {
  const db = await getDatabase()
  const ids = await getDailyCharacterIds()
  // 从数据库按主键取检索字段并缓存；输入变化只检索这一小份数据，长详情不参与。
  const [characters, words] = await Promise.all([db.query('characters', { whereIn: { id: ids } }), db.query('character_words', { whereIn: { characterId: ids } })])
  const wordsById = new Map<string, string[]>()
  for (const word of words) { const id = String(word.characterId); const list = wordsById.get(id) ?? []; list.push(String(word.word)); wordsById.set(id, list) }
  const byId = new Map(characters.map((row) => [row.id, row]))
  return ids.flatMap((id) => { const row = byId.get(id); return row ? [summary(row, wordsById.get(row.id))] : [] })
}
async function loadAllSearchEntries(): Promise<CharacterEntry[]> {
  const db = await getDatabase()
  const [rows, words] = await Promise.all([db.query('characters', { orderBy: 'position' }), db.query('character_words', { orderBy: 'position' })])
  const wordsById = new Map<string, string[]>()
  for (const word of words) {
    const id = String(word.characterId)
    const list = wordsById.get(id) ?? []
    list.push(String(word.word))
    wordsById.set(id, list)
  }
  return rows.map((row) => summary(row, wordsById.get(row.id)))
}

export async function findCharactersByText(texts: readonly string[]): Promise<{ entries: StudyCharacterEntry[]; missing: string[] }> {
  await initializeCatalog()
  if (!texts.length) return { entries: [], missing: [] }
  const db = await getDatabase()
  const [simplified, traditional] = await Promise.all([
    db.query('characters', { whereIn: { simplified: [...texts] }, orderBy: 'position' }),
    db.query('characters', { whereIn: { traditional: [...texts] }, orderBy: 'position' }),
  ])
  const rows = texts.map((text) => simplified.find((row) => row.simplified === text) ?? traditional.find((row) => row.traditional === text))
  const entries = await getCharacters(rows.flatMap((row) => row ? [row.id] : []))
  const missing = texts.filter((_, index) => !rows[index])
  return { entries, missing }
}
export function resetCatalogForTests(): void { initialization = undefined; dailyCharacters = undefined; dailyIds = undefined; searchEntries = undefined; allSearchEntries = undefined; categoryCounts.value = {} }
