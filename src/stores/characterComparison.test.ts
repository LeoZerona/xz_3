import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCharacterComparisonStore } from './characterComparison'
import { COMPARISON_STORAGE_KEY } from '../comparison/characterComparison'
import { setupTestDatabase } from '../database/testSupport'
import { flushPersistence, initializePersistence, readStored, resetPersistenceForTests } from '../database/persistence'
import type { CharacterEntry } from '../search/characterSearch'

const entries: CharacterEntry[] = Array.from('己已巳未末土士').map((text) => ({ id: text, script_forms: { simplified: text, traditional: text }, phonetics: { pinyin: '' }, structure: { total_strokes: 0, layout: '' }, semantics: { definition: '', words: [] } }))
vi.mock('../database/catalog', () => ({ getCharacters: vi.fn(async (ids: string[]) => ids.flatMap((id) => entries.find((entry) => entry.id === id) ?? [])) }))

describe('比较列表持久化', () => {
  beforeEach(() => { setActivePinia(createPinia()) })
  it('跨搜索保持所选文字，重新启动后按原顺序恢复，并保持字体和主题设置', async () => {
    await setupTestDatabase(new Map([['morning-pages:theme', 'jade-green']]))
    const store = useCharacterComparisonStore()
    await store.hydrate()
    store.addCharacters(entries.slice(0, 3))
    expect(store.selectedIds).toEqual(['己', '已', '巳'])
    expect(readStored(COMPARISON_STORAGE_KEY)).toEqual(store.selectedIds)
    expect(readStored('morning-pages:theme')).toBe('jade-green')
    await flushPersistence(); resetPersistenceForTests(); await initializePersistence()
    setActivePinia(createPinia())
    const restored = useCharacterComparisonStore()
    await restored.hydrate()
    expect(restored.selectedIds).toEqual(['己', '已', '巳'])
    expect(restored.removeCharacter('已')).toBe(true)
    expect(readStored(COMPARISON_STORAGE_KEY)).toEqual(['己', '巳'])
    expect(restored.clearCharacters()).toBe(true)
    expect(readStored(COMPARISON_STORAGE_KEY)).toEqual([])
  })
  it('过滤失效的存储 ID，并在连续批量加入时执行去重和容量限制', async () => {
    await setupTestDatabase(new Map<string, unknown>([[COMPARISON_STORAGE_KEY, ['己', null, 'unknown', '己']]]))
    const store = useCharacterComparisonStore()
    await store.hydrate()
    expect(store.selectedIds).toEqual(['己'])
    expect(store.addCharacters(entries)).toMatchObject({ addedCount: 5, duplicateCount: 1, overflowCount: 1, saved: true })
    expect(store.characters).toHaveLength(6)
  })
  it('写入失败保留原列表，并返回可反馈的失败状态', () => {
    resetPersistenceForTests()
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = useCharacterComparisonStore()
    expect(store.addCharacters(entries.slice(0, 2)).saved).toBe(false)
    expect(store.characters).toEqual([])
    expect(diagnostic).toHaveBeenCalled()
    diagnostic.mockRestore()
  })
})
