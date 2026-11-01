import { afterEach, describe, expect, it, vi } from 'vitest'
import dailySource from '../data/character-table/first-level.json'
import type { StudyCharacterEntry } from '../study/types'
import { buildCatalogSeed } from '../../build/catalogSeed'
import { setupTestDatabase } from './testSupport'
import { categoryCounts, getCharacter, getDailyCharacters, initializeCatalog, resetCatalogForTests, searchCatalog } from './catalog'
import { loadStage } from '../study/levelData'
import { searchCharacters } from '../search/characterSearch'

const sources = import.meta.glob<{ chars: StudyCharacterEntry[] }>('../data/character-table/firstLevel/*.json', { eager: true, import: 'default' })
const shards = Object.entries(sources).sort(([a], [b]) => Number(a.match(/(\d+)\.json$/)?.[1]) - Number(b.match(/(\d+)\.json$/)?.[1])).map(([, data]) => data.chars)
afterEach(() => { resetCatalogForTests(); vi.unstubAllGlobals() })
function mockSeed(version: string) {
  const changes = buildCatalogSeed(dailySource.chars, shards)
  const fetcher = vi.fn(async (url: string) => new Response(url.endsWith('.txt') ? version : JSON.stringify({ version, changes })))
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
describe('数据库字库与页面查询', () => {
  it('保存完整字库、独立每日范围和关卡顺序，详情与原字表一致', async () => {
    const db = await setupTestDatabase()
    const fetcher = mockSeed('v1')
    await initializeCatalog()
    expect(await db.query('characters')).toHaveLength(2557)
    const daily = await getDailyCharacters()
    expect(daily.map((entry) => entry.id)).toEqual(dailySource.chars.map((entry) => entry.id))
    expect(daily[0]).toMatchObject(dailySource.chars[0]!)
    expect(categoryCounts.value.level1).toBe(256)
    const lastStage = await loadStage('level1', 'level1-stage-256')
    expect(lastStage?.characters.map((entry) => entry.id)).toEqual(shards.flat().slice(2550).map((entry) => entry.id))
    expect(await getCharacter(shards.flat()[2500]!.id)).not.toBeNull()
    await initializeCatalog()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('搜索保持汉字、拼音、组词和释义的匹配顺序，并提供分页', async () => {
    await setupTestDatabase()
    mockSeed('v1')
    for (const query of ['一', 'shi', 'yi', '表示', '常用']) {
      const expected = searchCharacters(dailySource.chars, query)
      const result = await searchCatalog(query, 3)
      expect(result.total).toBe(expected.length)
      expect(result.entries.map((entry) => entry.id)).toEqual(expected.slice(0, 3).map((entry) => entry.id))
      expect((await searchCatalog(query, 3, 3)).entries.map((entry) => entry.id)).toEqual(expected.slice(3, 6).map((entry) => entry.id))
    }
  })
  it('内容版本更新只替换基础数据，保留用户数据', async () => {
    const db = await setupTestDatabase()
    mockSeed('v1'); await initializeCatalog()
    await db.commit([{ table: 'reading_progress', row: { id: 'book', page: 3 } }])
    resetCatalogForTests(); mockSeed('v2'); await initializeCatalog()
    expect((await db.query('reading_progress'))[0]).toMatchObject({ id: 'book', page: 3 })
    expect(await db.query('characters')).toHaveLength(2557)
    expect((await db.query('meta', { where: { id: 'catalog-version' } }))[0]?.value).toBe('v2')
  })
})
