import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { applicationReady } from '../../database/application'
import { findCharactersByText, searchCatalog } from '../../database/catalog'
import { readStored } from '../../database/persistence'
import { useDatabaseTask } from '../../database/useDatabaseTask'
import { writeLocal } from '../../utils/storage'
import { parseCharacterInput } from '../../comparison/characterComparison'
import type { CharacterEntry } from '../../search/characterSearch'

type SearchMode = 'character' | 'word' | 'sentence' | 'article'
const SEARCH_HISTORY_KEY = 'font-learning-search-history'
const MAX_HISTORY_COUNT = 20
export const SEARCH_MODES: { id: SearchMode; label: string }[] = [
  { id: 'character', label: '单字' }, { id: 'word', label: '词语' },
  { id: 'sentence', label: '句子' }, { id: 'article', label: '文章' },
]

export function useCharacterSearch() {
  const query = ref('')
  const activeMode = ref<SearchMode>('character')
  const searchHistory = ref<string[]>([])
  const results = ref<CharacterEntry[]>([])
  const totalResults = ref(0)
  const isSearching = ref(false)
  const searchError = ref('')
  const missingCharacters = ref<string[]>([])
  const trimmedQuery = computed(() => query.value.trim())
  const isCharacterMode = computed(() => activeMode.value === 'character')
  const activeModeLabel = computed(() => SEARCH_MODES.find((mode) => mode.id === activeMode.value)?.label ?? '')
  const batchCharacters = computed(() => {
    const parsed = parseCharacterInput(trimmedQuery.value)
    return parsed && parsed.length > 1 ? parsed : []
  })
  const resultSummary = computed(() => searchError.value || (isSearching.value ? '正在搜索…' : `找到 ${totalResults.value} 个单字`))
  let searchRequest = 0

  async function loadResults(append = false): Promise<void> {
    const request = ++searchRequest
    if (!append) { results.value = []; totalResults.value = 0 }
    missingCharacters.value = []
    searchError.value = ''
    if (!applicationReady.value || !isCharacterMode.value || !trimmedQuery.value) { isSearching.value = false; return }
    isSearching.value = true
    try {
      if (batchCharacters.value.length) {
        const result = await findCharactersByText(batchCharacters.value)
        if (request !== searchRequest) return
        results.value = [...new Map(result.entries.map((entry) => [entry.id, entry])).values()]
        totalResults.value = results.value.length
        missingCharacters.value = result.missing
      } else {
        const result = await searchCatalog(trimmedQuery.value, 50, append ? results.value.length : 0, 'all')
        if (request !== searchRequest) return
        results.value = append ? [...results.value, ...result.entries] : result.entries
        totalResults.value = result.total
      }
    } catch (error) {
      if (request === searchRequest) searchError.value = error instanceof Error ? error.message : '搜索失败，请重试'
    } finally { if (request === searchRequest) isSearching.value = false }
  }
  watch([trimmedQuery, isCharacterMode, applicationReady], () => { void loadResults() })
  onBeforeUnmount(() => { searchRequest++ })
  useDatabaseTask(() => {
    const stored = readStored(SEARCH_HISTORY_KEY)
    searchHistory.value = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string').slice(0, MAX_HISTORY_COUNT) : []
  })

  async function persistHistory(): Promise<void> {
    try { await writeLocal(SEARCH_HISTORY_KEY, searchHistory.value) }
    catch (error) {
      console.warn('搜索记录保存失败', error)
      uni.showToast({ title: '搜索记录保存失败', icon: 'none' })
    }
  }
  async function saveSearch(): Promise<void> {
    const value = trimmedQuery.value
    if (!value || !isCharacterMode.value) return
    searchHistory.value = [value, ...searchHistory.value.filter((item) => item !== value)].slice(0, MAX_HISTORY_COUNT)
    await persistHistory()
  }
  async function clearHistory(): Promise<void> { searchHistory.value = []; await persistHistory() }

  return { query, activeMode, searchHistory, results, totalResults, isSearching, searchError, missingCharacters, trimmedQuery, isCharacterMode, activeModeLabel, batchCharacters, resultSummary, loadResults, saveSearch, clearHistory }
}
